import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Inject,
  Post
} from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { MercadoPagoPaymentGateway } from './mercado-pago-payment.gateway.js';
import { PaymentService } from './payment.service.js';
import type { PaymentMethod } from './payment.types.js';
import { loadStoreAvailability } from './store-availability.repository.js';

type Db = { $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T> };
type PaymentInput = {
  checkoutId?: string;
  menuSlug: string;
  method: PaymentMethod;
  customerName: string;
  customerPhone: string;
  items: Array<{ menuItemId: string; quantity: number }>;
};
type Row = { tenantId: string; menuItemId: string; priceCents: number; available: boolean };

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
      throw new BadRequestException('Preencha os dados necessários para o pagamento.');
    if (request.items.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0))
      throw new BadRequestException('A quantidade de um dos itens não é válida.');
    if (request.checkoutId && request.checkoutId.trim().length < 32)
      throw new BadRequestException('A identificação do checkout não é válida.');

    const ids = request.items.map((item) => item.menuItemId);
    const rows = await this.db.$queryRawUnsafe<Row[]>(
      `SELECT i.tenant_id AS "tenantId",i.id AS "menuItemId",COALESCE(i.sale_price_cents,p."salePriceCents") AS "priceCents",i.available FROM commerce_menu_items i JOIN commerce_menus m ON m.tenant_id=i.tenant_id AND m.id=i.menu_id JOIN catalog_products p ON p."tenantId"=i.tenant_id AND p.id=i.catalog_product_id WHERE m.slug=$1 AND m.published=true AND i.active=true AND i.id=ANY($2::uuid[])`,
      request.menuSlug,
      ids
    );
    if (rows.length !== ids.length || rows.some((row) => !row.available))
      throw new BadRequestException('Um ou mais itens não estão disponíveis.');
    const tenantId = rows[0]?.tenantId;
    if (!tenantId || rows.some((row) => row.tenantId !== tenantId))
      throw new BadRequestException('O cardápio informado não é válido.');
    const availability = await loadStoreAvailability(this.db, tenantId);
    if (!availability.canAcceptOrders) {
      throw new ConflictException({ code: 'STORE_CLOSED', message: availability.statusMessage });
    }

    const prices = new Map(rows.map((row) => [row.menuItemId, row.priceCents]));
    const amountCents = request.items.reduce(
      (sum, item) => sum + (prices.get(item.menuItemId) ?? 0) * item.quantity,
      0
    );
    if (amountCents <= 0) throw new BadRequestException('O valor do pagamento não é válido.');

    const checkoutId = request.checkoutId?.trim();
    const trusted = {
      ...(checkoutId ? { checkoutId } : {}),
      menuSlug: request.menuSlug,
      method: request.method,
      amountCents,
      customerName: request.customerName.trim(),
      customerPhone: request.customerPhone.trim()
    };
    if (request.method === 'PAY_ON_DELIVERY') return new PaymentService().create(trusted);

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) throw new BadRequestException('O pagamento por PIX não está configurado.');
    return new MercadoPagoPaymentGateway(
      accessToken,
      process.env.MERCADO_PAGO_NOTIFICATION_URL?.trim()
    ).createPayment(trusted);
  }
}
