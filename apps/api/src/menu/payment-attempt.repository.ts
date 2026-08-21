import type { PaymentMethod, PaymentResult, PaymentStatus } from './payment.types.js';

export type PaymentDatabase = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(callback: (transaction: PaymentDatabase) => Promise<T>): Promise<T>;
};

export type PaymentAttempt = {
  id: string;
  tenantId: string;
  checkoutKeyHash: string;
  requestHash: string;
  orderId: string | null;
  provider: 'MERCADO_PAGO' | 'VERO';
  providerOrderId: string | null;
  providerPaymentId: string | null;
  externalReference: string;
  method: PaymentMethod;
  amountCents: number;
  currency: 'BRL';
  status: PaymentStatus;
  providerStatus: string | null;
  providerStatusDetail: string | null;
  pixCopyPaste: string | null;
  qrCodeBase64: string | null;
  pixTicketUrl: string | null;
  expiresAt: Date | null;
};

const selectAttempt = `SELECT id, tenant_id AS "tenantId", checkout_key_hash AS "checkoutKeyHash",
       request_hash AS "requestHash", order_id AS "orderId", provider,
       provider_order_id AS "providerOrderId", provider_payment_id AS "providerPaymentId",
       external_reference AS "externalReference", method, amount_cents AS "amountCents",
       currency, status, provider_status AS "providerStatus",
       provider_status_detail AS "providerStatusDetail", pix_copy_paste AS "pixCopyPaste",
       qr_code_base64 AS "qrCodeBase64", pix_ticket_url AS "pixTicketUrl",
       expires_at AS "expiresAt"
  FROM commerce_payment_attempts`;

export async function findPaymentByCheckout(
  database: PaymentDatabase,
  tenantId: string,
  checkoutHash: string,
  lock = false
): Promise<PaymentAttempt | null> {
  const rows = await database.$queryRawUnsafe<PaymentAttempt[]>(
    `${selectAttempt} WHERE tenant_id=$1 AND checkout_key_hash=$2 LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    tenantId,
    checkoutHash
  );
  return rows[0] ?? null;
}

export async function findPaymentById(
  database: PaymentDatabase,
  tenantId: string,
  paymentId: string,
  lock = false
): Promise<PaymentAttempt | null> {
  const rows = await database.$queryRawUnsafe<PaymentAttempt[]>(
    `${selectAttempt} WHERE tenant_id=$1 AND id=$2::uuid LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    tenantId,
    paymentId
  );
  return rows[0] ?? null;
}

export async function findPaymentByProviderOrder(
  database: PaymentDatabase,
  providerOrderId: string,
  lock = false
): Promise<PaymentAttempt | null> {
  const rows = await database.$queryRawUnsafe<PaymentAttempt[]>(
    `${selectAttempt} WHERE provider='MERCADO_PAGO' AND provider_order_id=$1 LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
    providerOrderId
  );
  return rows[0] ?? null;
}

export function publicPaymentResult(payment: PaymentAttempt): PaymentResult {
  return {
    paymentId: payment.id,
    method: payment.method,
    status: payment.status,
    amountCents: payment.amountCents,
    pixCopyPaste: payment.pixCopyPaste,
    qrCodeUrl: payment.qrCodeBase64 ? `data:image/png;base64,${payment.qrCodeBase64}` : null,
    pixTicketUrl: payment.pixTicketUrl,
    expiresAt: payment.expiresAt ? new Date(payment.expiresAt).toISOString() : null
  };
}
