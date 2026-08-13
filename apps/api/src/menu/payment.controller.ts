import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { MercadoPagoPaymentGateway } from './mercado-pago-payment.gateway.js';
import { PaymentService } from './payment.service.js';
import type { PaymentRequest } from './payment.types.js';

@Controller('v1/payments')
export class PaymentController {
  @Post()
  async create(@Body() request: PaymentRequest) {
    if (!request.menuSlug?.trim() || !request.customerName?.trim() || !request.customerPhone?.trim()) {
      throw new BadRequestException('Missing payment data.');
    }
    if (!Number.isInteger(request.amountCents) || request.amountCents <= 0) {
      throw new BadRequestException('Invalid payment amount.');
    }

    if (request.method === 'PAY_ON_DELIVERY') {
      return new PaymentService().create(request);
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) throw new BadRequestException('PIX payment is not configured.');

    const gateway = new MercadoPagoPaymentGateway(
      accessToken,
      process.env.MERCADO_PAGO_NOTIFICATION_URL?.trim()
    );
    return gateway.createPayment(request);
  }
}
