import { randomUUID } from 'node:crypto';
import { findPaymentByProviderOrder, type PaymentDatabase } from './payment-attempt.repository.js';
import { canTransitionPaymentStatus } from './payment-status.js';
import type { ProviderPaymentSnapshot } from './payment.types.js';

export type PaymentReconciliationResult = {
  matched: boolean;
  changed: boolean;
  paymentId: string | null;
  orderId: string | null;
  tenantId: string | null;
  paymentStatus: string;
  shouldConfirmAutomatically: boolean;
};

export async function storeWebhookSnapshot(
  database: PaymentDatabase,
  snapshot: ProviderPaymentSnapshot,
  requestId: string
): Promise<void> {
  await database.$executeRawUnsafe(
    `INSERT INTO commerce_payment_webhook_inbox (
       provider_order_id,provider_payment_id,external_reference,amount_cents,status,
       provider_status,provider_status_detail,request_id,received_at,processed_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NULL)
     ON CONFLICT (provider_order_id) DO UPDATE SET
       provider_payment_id=EXCLUDED.provider_payment_id,
       external_reference=EXCLUDED.external_reference,
       amount_cents=EXCLUDED.amount_cents,
       status=EXCLUDED.status,
       provider_status=EXCLUDED.provider_status,
       provider_status_detail=EXCLUDED.provider_status_detail,
       request_id=EXCLUDED.request_id,
       received_at=NOW(),processed_at=NULL`,
    snapshot.providerOrderId,
    snapshot.providerPaymentId,
    snapshot.externalReference,
    snapshot.amountCents,
    snapshot.status,
    snapshot.providerStatus,
    snapshot.providerStatusDetail,
    requestId
  );
}

export async function reconcileProviderPayment(
  database: PaymentDatabase,
  snapshot: ProviderPaymentSnapshot,
  requestId: string
): Promise<PaymentReconciliationResult> {
  return database.$transaction(async (tx) => {
    const payment = await findPaymentByProviderOrder(tx, snapshot.providerOrderId, true);
    if (!payment) {
      return {
        matched: false,
        changed: false,
        paymentId: null,
        orderId: null,
        tenantId: null,
        paymentStatus: snapshot.status,
        shouldConfirmAutomatically: false
      };
    }
    if (
      payment.providerPaymentId !== snapshot.providerPaymentId ||
      payment.externalReference !== snapshot.externalReference ||
      payment.amountCents !== snapshot.amountCents ||
      payment.currency !== 'BRL' ||
      payment.method !== 'PIX'
    ) {
      throw new Error('PAYMENT_RECONCILIATION_INTEGRITY_MISMATCH');
    }

    const changed = payment.status !== snapshot.status;
    const allowed = canTransitionPaymentStatus(payment.status, snapshot.status);
    if (changed && allowed) {
      await tx.$executeRawUnsafe(
        `UPDATE commerce_payment_attempts
            SET status=$2,provider_status=$3,provider_status_detail=$4,
                pix_copy_paste=COALESCE($5,pix_copy_paste),
                qr_code_base64=COALESCE($6,qr_code_base64),
                pix_ticket_url=COALESCE($7,pix_ticket_url),
                expires_at=COALESCE($8::timestamptz,expires_at),updated_at=NOW()
          WHERE id=$1::uuid AND status=$9`,
        payment.id,
        snapshot.status,
        snapshot.providerStatus,
        snapshot.providerStatusDetail,
        snapshot.pixCopyPaste,
        snapshot.qrCodeBase64,
        snapshot.pixTicketUrl,
        snapshot.expiresAt,
        payment.status
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO commerce_payment_status_history
           (id,payment_id,from_status,to_status,provider_status,provider_status_detail,
            source,request_id,occurred_at)
         VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,'WEBHOOK',$7,NOW())
         ON CONFLICT (payment_id,request_id) WHERE request_id IS NOT NULL DO NOTHING`,
        randomUUID(),
        payment.id,
        payment.status,
        snapshot.status,
        snapshot.providerStatus,
        snapshot.providerStatusDetail,
        requestId
      );
      if (payment.orderId) {
        await tx.$executeRawUnsafe(
          `UPDATE commerce_native_orders SET payment_status=$2,updated_at=NOW()
            WHERE id=$1::uuid AND tenant_id=$3 AND payment_id=$4::uuid
              AND payment_status=$5`,
          payment.orderId,
          snapshot.status,
          payment.tenantId,
          payment.id,
          payment.status
        );
      }
    }
    await tx.$executeRawUnsafe(
      `UPDATE commerce_payment_webhook_inbox SET processed_at=NOW()
        WHERE provider_order_id=$1`,
      snapshot.providerOrderId
    );
    const effectiveStatus = changed && allowed ? snapshot.status : payment.status;
    let shouldConfirmAutomatically = false;
    if (payment.orderId && effectiveStatus === 'PAID') {
      const rows = await tx.$queryRawUnsafe<Array<{ orderStatus: string; receiptMode: string }>>(
        `SELECT o.status AS "orderStatus",s.order_receipt_mode AS "receiptMode"
           FROM commerce_native_orders o
           JOIN store_settings s ON s.tenant_id=o.tenant_id
          WHERE o.id=$1::uuid AND o.tenant_id=$2 AND o.payment_id=$3::uuid`,
        payment.orderId,
        payment.tenantId,
        payment.id
      );
      shouldConfirmAutomatically =
        rows[0]?.orderStatus === 'RECEIVED' && rows[0]?.receiptMode === 'AUTOMATIC';
    }
    return {
      matched: true,
      changed: changed && allowed,
      paymentId: payment.id,
      orderId: payment.orderId,
      tenantId: payment.tenantId,
      paymentStatus: effectiveStatus,
      shouldConfirmAutomatically
    };
  });
}
