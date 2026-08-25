import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Inject,
  Logger,
  Post,
  ServiceUnavailableException
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { priceCheckout, type CouponSnapshot } from './checkout-pricing.js';
import { findPaymentById, type PaymentDatabase } from './payment-attempt.repository.js';
import { paymentRequestHash } from './payment-integrity.js';
import { isOrderCreatablePaymentStatus } from './payment-status.js';
import type { PaymentMethod, PaymentStatus } from './payment.types.js';
import { transitionPersistedOrder } from './order-workflow.js';
import { formatOperationalOrderNumber } from './order-number.js';
import { loadStoreAvailability } from './store-availability.repository.js';
import type { CheckoutAddress } from './checkout.types.js';

type Db = PaymentDatabase;
type ExistingOrder = {
  orderId: string;
  operationalNumber: number;
  fulfillment: 'DELIVERY' | 'PICKUP';
  itemsTotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
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
  customer: { name: string; phone: string; email?: string };
  fulfillment: 'DELIVERY' | 'PICKUP';
  couponCode?: string;
  address?: CheckoutAddress | null;
  orderNote?: string;
  items: Array<{ menuItemId: string; quantity: number; note?: string }>;
  payment: { method: PaymentMethod; paymentId: string; status?: unknown };
};

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { code?: string; meta?: { code?: string } };
  return candidate.meta?.code ?? candidate.code;
}

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
      throw new BadRequestException('Revise os dados do pedido.');
    if (!request.payment?.paymentId?.trim())
      throw new BadRequestException('A identificação do pagamento é obrigatória.');
    if (Object.prototype.hasOwnProperty.call(request.payment, 'status')) {
      throw new BadRequestException(
        'A situação do pagamento é definida exclusivamente pelo servidor.'
      );
    }
    if (
      request.fulfillment === 'DELIVERY' &&
      (!request.address?.street?.trim() ||
        !request.address.number?.trim() ||
        !request.address.district?.trim())
    ) {
      throw new BadRequestException('Informe o endereço para entrega.');
    }
    if (request.orderNote && request.orderNote.trim().length > 2000)
      throw new BadRequestException('A observação geral deve ter no máximo 2000 caracteres.');

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

    let operationalNumber: number | null = null;
    let finalPricing = basePricing;
    let finalPaymentStatus: PaymentStatus = 'PENDING';
    try {
      await this.db.$transaction(async (tx) => {
        const availability = await loadStoreAvailability(tx, tenantId, true);
        if (!availability.canAcceptOrders) {
          throw new ConflictException({
            code: 'STORE_CLOSED',
            message: availability.statusMessage
          });
        }
        finalPricing = await priceCheckout(tx, request, { lockCoupon: true });
        const payment = await findPaymentById(tx, tenantId, request.payment.paymentId.trim(), true);
        const expectedPaymentHash = paymentRequestHash({
          tenantId,
          menuSlug: request.menuSlug,
          method: request.payment.method,
          customer: request.customer,
          fulfillment: request.fulfillment,
          address: request.address,
          orderNote: request.orderNote,
          pricing: finalPricing
        });
        if (
          !payment ||
          payment.checkoutKeyHash !== idempotencyHash ||
          payment.requestHash !== expectedPaymentHash ||
          payment.method !== request.payment.method ||
          payment.amountCents !== finalPricing.totalCents ||
          payment.currency !== 'BRL' ||
          (payment.orderId && payment.orderId !== orderId) ||
          !isOrderCreatablePaymentStatus(payment.method, payment.status) ||
          (payment.method === 'PIX' && (!payment.providerOrderId || !payment.providerPaymentId))
        ) {
          throw new BadRequestException(
            'O pagamento não pertence a este checkout ou ainda não pode ser utilizado.'
          );
        }
        finalPaymentStatus = payment.status;
        const inserted = await tx.$queryRawUnsafe<Array<{ operationalNumber: number }>>(
          `INSERT INTO commerce_native_orders (
             id,tenant_id,menu_slug,provider,customer_name,customer_phone,fulfillment,
             items_total_cents,discount_cents,delivery_fee_cents,total_cents,
             coupon_id,coupon_code,coupon_name,coupon_source,coupon_discount_type,coupon_discount_value,
             payment_id,payment_method,payment_status,provider_payment_id,status,order_note,
             delivery_address,tracking_token_hash,idempotency_key_hash,created_at,updated_at
           ) VALUES (
             $1::uuid,$2,$3,'VERO_NATIVE',$4,$5,$6,$7,$8,$9,$10,
             $11::uuid,$12,$13,$14,$15,$16,$17::uuid,$18,$19,$20,'RECEIVED',$21,
             $22::jsonb,$23,$24,$25::timestamptz,$25::timestamptz
           ) RETURNING operational_number AS "operationalNumber"`,
          orderId,
          tenantId,
          request.menuSlug,
          request.customer.name.trim(),
          request.customer.phone.trim(),
          request.fulfillment,
          finalPricing.itemsTotalCents,
          finalPricing.discountCents,
          finalPricing.deliveryFeeCents,
          finalPricing.totalCents,
          finalPricing.coupon?.id ?? null,
          finalPricing.coupon?.code ?? null,
          finalPricing.coupon?.name ?? null,
          finalPricing.coupon?.source ?? null,
          finalPricing.coupon?.discountType ?? null,
          finalPricing.coupon?.discountValue ?? null,
          payment.id,
          payment.method,
          payment.status,
          payment.providerPaymentId,
          request.orderNote?.trim() || null,
          request.fulfillment === 'DELIVERY' ? JSON.stringify(request.address) : null,
          trackingTokenHash,
          idempotencyHash,
          createdAt
        );
        const linked = await tx.$executeRawUnsafe(
          `UPDATE commerce_payment_attempts SET order_id=$2::uuid,updated_at=NOW()
            WHERE id=$1::uuid AND tenant_id=$3 AND (order_id IS NULL OR order_id=$2::uuid)`,
          payment.id,
          orderId,
          tenantId
        );
        if (linked !== 1) {
          throw new BadRequestException('O pagamento já está vinculado a outro pedido.');
        }
        operationalNumber = inserted[0]?.operationalNumber ?? null;
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
              WHERE tenant_id=$1 AND id=$2::uuid AND active=true
                AND (max_uses IS NULL OR uses_count<max_uses)`,
            tenantId,
            finalPricing.coupon.id
          );
          if (consumed !== 1) {
            throw new BadRequestException({
              code: 'INVALID_COUPON',
              message: 'Cupom inválido ou expirado.'
            });
          }
        }
        await tx.$executeRawUnsafe(
          `INSERT INTO commerce_native_order_status_history (id,order_id,from_status,to_status,occurred_at) VALUES ($1::uuid,$2::uuid,NULL,'RECEIVED',$3::timestamptz)`,
          randomUUID(),
          orderId,
          createdAt
        );
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      const duplicate = await this.findExisting(tenantId, idempotencyHash);
      if (duplicate) return { ...duplicate, trackingToken, provider: 'VERO_NATIVE' };
      if (error instanceof BadRequestException) throw error;
      if (databaseErrorCode(error) === '2200H') {
        throw new ServiceUnavailableException(
          'A numeração operacional atingiu o limite de 99999 pedidos.'
        );
      }
      throw new BadRequestException('Não foi possível registrar o pedido.');
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
      orderNumber: formatOperationalOrderNumber(operationalNumber),
      trackingToken,
      provider: 'VERO_NATIVE',
      menuSlug: request.menuSlug,
      fulfillment: request.fulfillment,
      items: finalPricing.items,
      itemsTotalCents: finalPricing.itemsTotalCents,
      discountCents: finalPricing.discountCents,
      deliveryFeeCents: finalPricing.deliveryFeeCents,
      totalCents: finalPricing.totalCents,
      coupon: finalPricing.coupon,
      paymentMethod: request.payment.method,
      paymentStatus: finalPaymentStatus,
      status,
      createdAt
    };
  }

  protected confirmAutomatically(tenantId: string, orderId: string) {
    return transitionPersistedOrder(this.db, tenantId, orderId, 'CONFIRMED', 'AUTO');
  }

  private async findExisting(tenantId: string, idempotencyHash: string) {
    const rows = await this.db.$queryRawUnsafe<ExistingOrder[]>(
      `SELECT id AS "orderId",operational_number AS "operationalNumber",fulfillment,
              items_total_cents AS "itemsTotalCents",discount_cents AS "discountCents",
              delivery_fee_cents AS "deliveryFeeCents",
              total_cents AS "totalCents",coupon_id AS "couponId",coupon_code AS "couponCode",
              coupon_name AS "couponName",coupon_source AS "couponSource",
              coupon_discount_type AS "couponDiscountType",
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
      orderNumber: formatOperationalOrderNumber(order.operationalNumber),
      fulfillment: order.fulfillment,
      itemsTotalCents: order.itemsTotalCents,
      discountCents: order.discountCents,
      deliveryFeeCents: order.deliveryFeeCents,
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
      !order.couponId ||
      !order.couponCode ||
      !order.couponName ||
      !order.couponDiscountType ||
      order.couponDiscountValue === null
    ) {
      return null;
    }
    return {
      id: order.couponId,
      code: order.couponCode,
      name: order.couponName,
      source: order.couponSource,
      discountType: order.couponDiscountType,
      discountValue: order.couponDiscountValue
    };
  }
}
