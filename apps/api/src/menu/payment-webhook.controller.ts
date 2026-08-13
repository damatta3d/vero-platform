import { Body, Controller, Headers, Post } from '@nestjs/common';

type MercadoPagoWebhook = {
  action?: string;
  type?: string;
  data?: { id?: string | number };
};

@Controller('v1/payments/webhooks')
export class PaymentWebhookController {
  @Post('mercado-pago')
  receive(
    @Body() event: MercadoPagoWebhook,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string
  ) {
    return {
      received: true,
      provider: 'MERCADO_PAGO',
      eventType: event.type || event.action || null,
      providerPaymentId: event.data?.id ? String(event.data.id) : null,
      signaturePresent: Boolean(signature),
      requestId: requestId || null
    };
  }
}
