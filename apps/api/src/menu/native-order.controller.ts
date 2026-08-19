import { BadRequestException, Body, Controller, Inject, Logger, Post } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { priceCheckout, type CouponSnapshot } from './checkout-pricing.js';
import type { PaymentMethod, PaymentStatus } from './payment.types.js';
import { transitionPersistedOrder } from './order-workflow.js';

type Db = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(callback: (tx: Db) => Promise<T>): Promise<T>;
};
type ExistingOrder = {
  orderId: string;
  fulfillment: 'DELIVERY' | 'PICKUP';
  itemsTotalCents: number;
  discountCents: number;
  totalCents: number;
  couponId: string | null;
  couponCode: string | null;
  couponName: string | null;
  couponSource: string | null;
  couponDiscountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | null;
  couponDiscountValue: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: string;
  createdAt: Date;
};
type Request = {
  idempotencyKey: string;
  menuSlug: string;
  customer: { name: string; phone: string };
  fulfillment: 'DELIVERY' | 'PICKUP';
  couponCode?: string;
  items: Array<{ menuItemId: string; quantity: number; note?: string }>;
  payment: { method: PaymentMethod; status: PaymentStatus; paymentId?: string | null };
};

@Controller('v1/orders/native')
export class NativeOrderController {
  private readonly logger = new Logger(NativeOrderController.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}
  @Post()
  async create(@Body() request: Request) {
    if (
      !request.idempotencyKey?.trim() ||
      request.idempotencyKey.trim().length < 32 ||
      !request.menuSlug?.trim() ||
      !request.customer?.name?.trim() ||
      !request.customer?.phone?.trim() ||
      !request.items?.length
    )
      throw new BadRequestException('Invalid native order.');
    if (request.payment.method === 'PIX' && !request.payment.paymentId?.trim())
      throw new BadRequestException('PIX payment id is required.');
    if (request.payment.method === 'PAY_ON_DELIVERY' && request.payment.status !== 'PENDING')
      throw new BadRequestException('Invalid pay-on-delivery status.');

    const basePricing = await priceCheckout(this.db, {
      menuSlug: request.menuSlug,
      items: request.items
    });
    const tenantId = basePricing.tenantId;

    const idempotencyKey = request.idempotencyKey.trim();
    const idempotencyHash = createHash('sha256').update(idempotencyKey).digest('hex');
    const existing = await this.findExisting(tenantId, idempotencyHash);
    if (existing) return { ...existing, trackingToken: idempotencyKey, provider: 'VERO_NATIVE' };

    const orderId = randomUUID();
    const createdAt = new Date().toISOString();
    const trackingToken = idempotencyKey;
    const trackingTokenHash = idempotencyHash;
    const modes = await this.db.$queryRawUnsafe<Array<{ mode: 'MANUAL' | 'AUTOMATIC' }>>(
      `SELECT order_receipt_mode AS mode FROM store_settings WHERE tenant_id=$1`,
      tenantId
    );
    const receiptMode = modes[0]?.mode ?? 'MANUAL';

    let finalPricing = basePricing;
    try {
      await this.db.$transaction(async (tx) => {
        finalPricing = await priceCheckout(tx, request, { lockCoupon: true });
        await tx.$executeRawUnsafe(
          `INSERT INTO commerce_native_orders (
             id,tenant_id,menu_slug,provider,customer_name,customer_phone,fulfillment,
             items_total_cents,discount_cents,delivery_fee_cents,total_cents,
             coupon_id,coupon_code,coupon_name,coupon_source,coupon_discount_type,coupon_discount_value,
             payment_method,payment_status,provider_payment_id,status,tracking_token_hash,
             idempotency_key_hash,created_at,updated_at
           ) VALUES (
             $1::uuid,$2,$3,'VERO_NATIVE',$4,$5,$6,$7,$8,0,$9,
             $10::uuid,$11,$12,$13,$14,$15,$16,$17,$18,'RECEIVED',$19,$20,
             $21::timestamptz,$21::timestamptz
           )`,
          orderId,
          tenantId,
          request.menuSlug,
          request.customer.name.trim(),
          request.customer.phone.trim(),
          request.fulfillment,
          finalPricing.itemsTotalCents,
          finalPricing.discountCents,
          finalPricing.totalCents,
          finalPricing.coupon?.id ?? null,
          finalPricing.coupon?.code ?? null,
          finalPricing.coupon?.name ?? null,
          finalPricing.coupon?.source ?? null,
          finalPricing.coupon?.discountType ?? null,
          finalPricing.coupon?.discountValue ?? null,
          request.payment.method,
          request.payment.status,
          request.payment.paymentId || null,
          trackingTokenHash,
          idempotencyHash,
          createdAt
        );
        for (const item of finalPricing.items)
          await tx.$executeRawUnsafe(
            `INSERT INTO commerce_native_order_items (id,order_id,menu_item_id,name,quantity,unit_price_cents,total_cents,note) VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8)`,
            randomUUID(),
            orderId,
            item.menuItemId,
            item.name,
            item.quantity,
            item.unitPriceCents,
            item.totalCents,
            item.note
          );
        if (finalPricing.coupon) {
          const consumed = await tx.$executeRawUnsafe(
            `UPDATE commerce_coupons
                SET uses_count=uses_count+1, updated_at=NOW()
              WHERE tenant_id=$1 AND id=$2::uuid`,
            tenantId,
            finalPricing.coupon.id
          );
          if (consumed !== 1) throw new BadRequestException('Could not consume coupon.');
        }
        await tx.$executeRawUnsafe(
          `INSERT INTO commerce_native_order_status_history (id,order_id,from_status,to_status,occurred_at) VALUES ($1::uuid,$2::uuid,NULL,'RECEIVED',$3::timestamptz)`,
          randomUUID(),
          orderId,
          createdAt
        );
      });
    } catch (error) {
      const duplicate = await this.findExisting(tenantId, idempotencyHash);
      if (duplicate) return { ...duplicate, trackingToken, provider: 'VERO_NATIVE' };
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Could not persist native order.');
    }

    let status = 'RECEIVED';
    if (receiptMode === 'AUTOMATIC') {
      try {
        await this.confirmAutomatically(tenantId, orderId);
        status = 'CONFIRMED';
      } catch (error) {
        this.logger.warn(
          `Automatic confirmation failed for order ${orderId}; order remains RECEIVED: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        );
      }
    }

    return {
      orderId,
      trackingToken,
      provider: 'VERO_NATIVE',
      menuSlug: request.menuSlug,
      fulfillment: request.fulfillment,
      items: finalPricing.items,
      itemsTotalCents: finalPricing.itemsTotalCents,
      discountCents: finalPricing.discountCents,
      deliveryFeeCents: 0,
      totalCents: finalPricing.totalCents,
      coupon: finalPricing.coupon,
      paymentMethod: request.payment.method,
      paymentStatus: request.payment.status,
      status,
      createdAt
    };
  }

  protected confirmAutomatically(tenantId: string, orderId: string) {
    return transitionPersistedOrder(this.db, tenantId, orderId, 'CONFIRMED', 'AUTO');
  }

  private async findExisting(tenantId: string, idempotencyHash: string) {
    const rows = await this.db.$queryRawUnsafe<ExistingOrder[]>(
      `SELECT id AS "orderId",fulfillment,items_total_cents AS "itemsTotalCents",
              discount_cents AS "discountCents",total_cents AS "totalCents",
              coupon_id AS "couponId",coupon_code AS "couponCode",coupon_name AS "couponName",
              coupon_source AS "couponSource",coupon_discount_type AS "couponDiscountType",
              coupon_discount_value AS "couponDiscountValue",
              payment_method AS "paymentMethod",payment_status AS "paymentStatus",
              status,created_at AS "createdAt"
         FROM commerce_native_orders
        WHERE tenant_id=$1 AND idempotency_key_hash=$2 LIMIT 1`,
      tenantId,
      idempotencyHash
    );
    const order = rows[0];
    if (!order) return null;
    return {
      orderId: order.orderId,
      fulfillment: order.fulfillment,
      itemsTotalCents: order.itemsTotalCents,
      discountCents: order.discountCents,
      deliveryFeeCents: 0,
      totalCents: order.totalCents,
      coupon: this.existingCoupon(order),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      createdAt: new Date(order.createdAt).toISOString()
    };
  }

  private existingCoupon(order: ExistingOrder): CouponSnapshot | null {
    if (
      !order.couponCode ||
      !order.couponName ||
      !order.couponDiscountType ||
      order.couponDiscountValue === null
    ) {
      return null;
    }
    return {
      id: order.couponId ?? '',
      code: order.couponCode,
      name: order.couponName,
      source: order.couponSource,
      discountType: order.couponDiscountType,
      discountValue: order.couponDiscountValue
    };
  }
}
