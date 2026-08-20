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
import type { PaymentMethod, PaymentStatus } from './payment.types.js';
import { transitionPersistedOrder } from './order-workflow.js';
import { formatOperationalOrderNumber } from './order-number.js';
import { loadStoreAvailability } from './store-availability.repository.js';
import type { CheckoutAddress } from './checkout.types.js';

type Db = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(callback: (tx: Db) => Promise<T>): Promise<T>;
};
type Row = {
  tenantId: string;
  menuItemId: string;
  name: string;
  priceCents: number;
  available: boolean;
};
type ExistingOrder = {
  orderId: string;
  operationalNumber: number;
  fulfillment: 'DELIVERY' | 'PICKUP';
  itemsTotalCents: number;
  totalCents: number;
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
  address?: CheckoutAddress | null;
  orderNote?: string;
  items: Array<{ menuItemId: string; quantity: number; note?: string }>;
  payment: { method: PaymentMethod; status: PaymentStatus; paymentId?: string | null };
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
    if (request.payment.method === 'PIX' && !request.payment.paymentId?.trim())
      throw new BadRequestException('A identificação do pagamento PIX é obrigatória.');
    if (request.payment.method === 'PAY_ON_DELIVERY' && request.payment.status !== 'PENDING')
      throw new BadRequestException('A situação do pagamento ao receber não é válida.');
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

    const ids = request.items.map((item) => item.menuItemId);
    const rows = await this.db.$queryRawUnsafe<Row[]>(
      `SELECT i.tenant_id AS "tenantId",i.id AS "menuItemId",COALESCE(i.display_name,p.name) AS name,COALESCE(i.sale_price_cents,p."salePriceCents") AS "priceCents",i.available FROM commerce_menu_items i JOIN commerce_menus m ON m.tenant_id=i.tenant_id AND m.id=i.menu_id JOIN catalog_products p ON p."tenantId"=i.tenant_id AND p.id=i.catalog_product_id WHERE m.slug=$1 AND m.published=true AND i.active=true AND i.id=ANY($2::uuid[])`,
      request.menuSlug,
      ids
    );
    if (rows.length !== ids.length || rows.some((row) => !row.available))
      throw new BadRequestException('Um ou mais itens não estão disponíveis.');
    const tenantId = rows[0]?.tenantId;
    if (!tenantId || rows.some((row) => row.tenantId !== tenantId))
      throw new BadRequestException('O cardápio informado não é válido.');

    const idempotencyKey = request.idempotencyKey.trim();
    const idempotencyHash = createHash('sha256').update(idempotencyKey).digest('hex');
    const existing = await this.findExisting(tenantId, idempotencyHash);
    if (existing) return { ...existing, trackingToken: idempotencyKey, provider: 'VERO_NATIVE' };

    const current = new Map(rows.map((row) => [row.menuItemId, row]));
    const items = request.items.map((line) => {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0)
        throw new BadRequestException('A quantidade de um dos itens não é válida.');
      const item = current.get(line.menuItemId)!;
      return {
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: line.quantity,
        unitPriceCents: item.priceCents,
        totalCents: item.priceCents * line.quantity,
        note: line.note?.trim() || null
      };
    });
    const itemsTotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
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
    try {
      await this.db.$transaction(async (tx) => {
        const availability = await loadStoreAvailability(tx, tenantId, true);
        if (!availability.canAcceptOrders) {
          throw new ConflictException({
            code: 'STORE_CLOSED',
            message: availability.statusMessage
          });
        }
        const inserted = await tx.$queryRawUnsafe<Array<{ operationalNumber: number }>>(
          `INSERT INTO commerce_native_orders (id,tenant_id,menu_slug,provider,customer_name,customer_phone,fulfillment,items_total_cents,delivery_fee_cents,total_cents,payment_method,payment_status,provider_payment_id,status,order_note,delivery_address,tracking_token_hash,idempotency_key_hash,created_at,updated_at) VALUES ($1::uuid,$2,$3,'VERO_NATIVE',$4,$5,$6,$7,0,$7,$8,$9,$10,'RECEIVED',$11,$12::jsonb,$13,$14,$15::timestamptz,$15::timestamptz) RETURNING operational_number AS "operationalNumber"`,
          orderId,
          tenantId,
          request.menuSlug,
          request.customer.name.trim(),
          request.customer.phone.trim(),
          request.fulfillment,
          itemsTotalCents,
          request.payment.method,
          request.payment.status,
          request.payment.paymentId || null,
          request.orderNote?.trim() || null,
          request.fulfillment === 'DELIVERY' ? JSON.stringify(request.address) : null,
          trackingTokenHash,
          idempotencyHash,
          createdAt
        );
        operationalNumber = inserted[0]?.operationalNumber ?? null;
        for (const item of items)
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
      items,
      itemsTotalCents,
      deliveryFeeCents: 0,
      totalCents: itemsTotalCents,
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
      `SELECT id AS "orderId",operational_number AS "operationalNumber",fulfillment,items_total_cents AS "itemsTotalCents",total_cents AS "totalCents",payment_method AS "paymentMethod",payment_status AS "paymentStatus",status,created_at AS "createdAt" FROM commerce_native_orders WHERE tenant_id=$1 AND idempotency_key_hash=$2 LIMIT 1`,
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
      deliveryFeeCents: 0,
      totalCents: order.totalCents,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      createdAt: new Date(order.createdAt).toISOString()
    };
  }
}
