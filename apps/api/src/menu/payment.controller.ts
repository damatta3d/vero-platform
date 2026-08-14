import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MercadoPagoPaymentGateway } from './mercado-pago-payment.gateway.js';
import { PaymentService } from './payment.service.js';
import type { PaymentMethod } from './payment.types.js';

type Db = { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> };
type PaymentInput = {
  checkoutId?: string;
  menuSlug: string;
  method: PaymentMethod;
  customerName: string;
  customerPhone: string;
  items: Array<{ menuItemId: string; quantity: number }>;
};
type Row = { menuItemId: string; priceCents: number; available: boolean };

@Controller('v1/payments')
export class PaymentController {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Db) {}

  @Post()
  async create(@Body() request: PaymentInput) {
    if (
      !request.menuSlug?.trim() ||
      !request.customerName?.trim() ||
      !request.customerPhone?.trim() ||
      !request.items?.length
    )
      throw new BadRequestException('Missing payment data.');
    if (request.items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0))
      throw new BadRequestException('Invalid payment items.');
    if (request.checkoutId && request.checkoutId.trim().length < 32)
      throw new BadRequestException('Invalid checkout id.');

    const ids = request.items.map((item) => item.menuItemId);
    const rows = await this.db.$queryRawUnsafe<Row[]>(
      `SELECT i.id AS "menuItemId",COALESCE(i.sale_price_cents,p."salePriceCents") AS "priceCents",i.available FROM commerce_menu_items i JOIN commerce_menus m ON m.tenant_id=i.tenant_id AND m.id=i.menu_id JOIN catalog_products p ON p."tenantId"=i.tenant_id AND p.id=i.catalog_product_id WHERE m.slug=$1 AND m.published=true AND i.active=true AND i.id=ANY($2::uuid[])`,
      request.menuSlug,
      ids
    );
    if (rows.length !== ids.length || rows.some((row) => !row.available))
      throw new BadRequestException('One or more items are unavailable.');

    const prices = new Map(rows.map((row) => [row.menuItemId, row.priceCents]));
    const amountCents = request.items.reduce(
      (sum, item) => sum + (prices.get(item.menuItemId) ?? 0) * item.quantity,
      0
    );
    if (amountCents <= 0) throw new BadRequestException('Invalid payment amount.');

    const trusted = {
      checkoutId: request.checkoutId?.trim(),
      menuSlug: request.menuSlug,
      method: request.method,
      amountCents,
      customerName: request.customerName.trim(),
      customerPhone: request.customerPhone.trim()
    };
    if (request.method === 'PAY_ON_DELIVERY') return new PaymentService().create(trusted);

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) throw new BadRequestException('PIX payment is not configured.');
    return new MercadoPagoPaymentGateway(
      accessToken,
      process.env.MERCADO_PAGO_NOTIFICATION_URL?.trim()
    ).createPayment(trusted);
  }
}
