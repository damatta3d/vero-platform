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
import { randomUUID } from 'node:crypto';
import { DATABASE_CLIENT } from '../catalog/catalog.tokens.js';
import { priceCheckout } from './checkout-pricing.js';
import type { CheckoutDraft } from './checkout.types.js';
import { validateCheckoutDraft } from './checkout.validation.js';
import {
  findPaymentByCheckout,
  findPaymentById,
  publicPaymentResult,
  type PaymentDatabase
} from './payment-attempt.repository.js';
import {
  paymentAttemptId,
  paymentCheckoutHash,
  paymentExternalReference,
  paymentRequestHash
} from './payment-integrity.js';
import { MercadoPagoPaymentGateway } from './mercado-pago-payment.gateway.js';
import type { PaymentGateway, PaymentMethod } from './payment.types.js';
import { loadStoreAvailability } from './store-availability.repository.js';

type PaymentInput = CheckoutDraft & {
  checkoutId: string;
  method: PaymentMethod;
};

const validCheckoutId = /^[A-Za-z0-9_-]{32,160}$/;
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller('v1/payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: PaymentDatabase) {}

  @Post()
  async create(@Body() request: PaymentInput) {
    const fields = validateCheckoutDraft(request);
    if (fields.length) {
      throw new BadRequestException({ message: 'Revise os dados do pagamento.', fields });
    }
    if (!validCheckoutId.test(request.checkoutId?.trim() || '')) {
      throw new BadRequestException('A identificação do checkout não é válida.');
    }
    if (request.method !== 'PIX' && request.method !== 'PAY_ON_DELIVERY') {
      throw new BadRequestException('A forma de pagamento não é válida.');
    }
    const customerEmail = request.customer.email?.trim().toLowerCase() || '';
    if (request.method === 'PIX' && !validEmail.test(customerEmail)) {
      throw new BadRequestException('Informe um e-mail válido para gerar o PIX.');
    }

    const pricing = await priceCheckout(this.db, request);
    const availability = await loadStoreAvailability(this.db, pricing.tenantId);
    if (!availability.canAcceptOrders) {
      throw new ConflictException({ code: 'STORE_CLOSED', message: availability.statusMessage });
    }
    if (!Number.isSafeInteger(pricing.totalCents) || pricing.totalCents <= 0) {
      throw new BadRequestException('O valor do pagamento não é válido.');
    }

    const checkoutId = request.checkoutId.trim();
    const checkoutHash = paymentCheckoutHash(checkoutId);
    const attemptId = paymentAttemptId(pricing.tenantId, checkoutHash);
    const externalReference = paymentExternalReference(attemptId);
    const requestHash = paymentRequestHash({
      tenantId: pricing.tenantId,
      menuSlug: request.menuSlug,
      method: request.method,
      customer: request.customer,
      fulfillment: request.fulfillment,
      address: request.address,
      orderNote: request.orderNote,
      pricing
    });
    const gateway = request.method === 'PIX' ? this.mercadoPagoGateway() : null;

    try {
      return await this.db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          `${pricing.tenantId}:${checkoutHash}`
        );
        const transactionalAvailability = await loadStoreAvailability(tx, pricing.tenantId, true);
        if (!transactionalAvailability.canAcceptOrders) {
          throw new ConflictException({
            code: 'STORE_CLOSED',
            message: transactionalAvailability.statusMessage
          });
        }
        const existing = await findPaymentByCheckout(tx, pricing.tenantId, checkoutHash, true);
        if (existing) {
          if (
            existing.requestHash !== requestHash ||
            existing.method !== request.method ||
            existing.amountCents !== pricing.totalCents ||
            existing.currency !== 'BRL'
          ) {
            throw new ConflictException(
              'Esta identificação de checkout já pertence a outra tentativa de pagamento.'
            );
          }
          return publicPaymentResult(existing);
        }

        await tx.$executeRawUnsafe(
          `INSERT INTO commerce_payment_attempts (
             id,tenant_id,checkout_key_hash,request_hash,provider,external_reference,
             method,amount_cents,currency,status,created_at,updated_at
           ) VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,'BRL','PENDING',NOW(),NOW())`,
          attemptId,
          pricing.tenantId,
          checkoutHash,
          requestHash,
          request.method === 'PIX' ? 'MERCADO_PAGO' : 'VERO',
          externalReference,
          request.method,
          pricing.totalCents
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO commerce_payment_status_history
             (id,payment_id,from_status,to_status,source,occurred_at)
           VALUES ($1::uuid,$2::uuid,NULL,'PENDING','CREATED',NOW())`,
          randomUUID(),
          attemptId
        );

        if (request.method === 'PIX' && gateway) {
          const provider = await gateway.createPixPayment({
            idempotencyKey: attemptId,
            externalReference,
            amountCents: pricing.totalCents,
            customerName: request.customer.name.trim(),
            customerEmail
          });
          if (
            provider.externalReference !== externalReference ||
            provider.amountCents !== pricing.totalCents
          ) {
            throw new Error('MERCADO_PAGO_INTEGRITY_MISMATCH');
          }
          await tx.$executeRawUnsafe(
            `UPDATE commerce_payment_attempts
                SET provider_order_id=$2,provider_payment_id=$3,status=$4,
                    provider_status=$5,provider_status_detail=$6,pix_copy_paste=$7,
                    qr_code_base64=$8,pix_ticket_url=$9,expires_at=$10::timestamptz,
                    updated_at=NOW()
              WHERE id=$1::uuid`,
            attemptId,
            provider.providerOrderId,
            provider.providerPaymentId,
            provider.status,
            provider.providerStatus,
            provider.providerStatusDetail,
            provider.pixCopyPaste,
            provider.qrCodeBase64,
            provider.pixTicketUrl,
            provider.expiresAt
          );
          await tx.$executeRawUnsafe(
            `INSERT INTO commerce_payment_status_history
               (id,payment_id,from_status,to_status,provider_status,provider_status_detail,
                source,occurred_at)
             VALUES ($1::uuid,$2::uuid,'PENDING',$3,$4,$5,'PROVIDER_CREATE',NOW())`,
            randomUUID(),
            attemptId,
            provider.status,
            provider.providerStatus,
            provider.providerStatusDetail
          );
        }

        const created = await findPaymentById(tx, pricing.tenantId, attemptId);
        if (!created) throw new Error('PAYMENT_ATTEMPT_NOT_FOUND_AFTER_CREATE');
        this.logger.log(
          `Payment created tenant=${pricing.tenantId} payment=${attemptId} method=${request.method} status=${created.status}`
        );
        return publicPaymentResult(created);
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) throw error;
      this.logger.warn(
        `Payment creation failed payment=${attemptId} reason=${
          error instanceof Error ? error.message : 'unknown'
        }`
      );
      throw new ServiceUnavailableException(
        'Não foi possível iniciar o pagamento agora. Tente novamente.'
      );
    }
  }

  protected mercadoPagoGateway(): PaymentGateway {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      throw new BadRequestException('O pagamento por PIX não está configurado.');
    }
    return new MercadoPagoPaymentGateway(
      accessToken,
      process.env.MERCADO_PAGO_NOTIFICATION_URL?.trim()
    );
  }
}
