import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Inject,
  Post
} from '@nestjs/common';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { priceCheckout } from './checkout-pricing.js';
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
  couponCode?: string;
  items: Array<{ menuItemId: string; quantity: number }>;
};

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

    const pricing = await priceCheckout(this.db, request);
    const availability = await loadStoreAvailability(this.db, pricing.tenantId);
    if (!availability.canAcceptOrders) {
      throw new ConflictException({ code: 'STORE_CLOSED', message: availability.statusMessage });
    }

    const amountCents = pricing.totalCents;
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
