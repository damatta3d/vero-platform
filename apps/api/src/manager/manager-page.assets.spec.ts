import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';

const managerSource = readFileSync(resolve('apps/manager/src/main.js'), 'utf8');
const managerHtml = readFileSync(resolve('apps/manager/src/index.html'), 'utf8');
const orderAlertsSource = readFileSync(resolve('apps/manager/src/order-alerts.js'), 'utf8');

function extractHelper(name: string): string {
  const helper = managerSource.match(
    new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm')
  );
  if (!helper) throw new Error(`Manager helper not found: ${name}`);
  return helper[0];
}

function extractAlertHelper(name: string): string {
  const helper = orderAlertsSource.match(
    new RegExp(`(?:async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?^\\}`, 'm')
  );
  if (!helper) throw new Error(`Order alert helper not found: ${name}`);
  return helper[0];
}

function evaluate(
  expression: string,
  helpers = ['paymentMethodLabel', 'transitionsForOrder']
): unknown {
  const context: Record<string, unknown> = {};
  new Script(
    `${helpers.map(extractHelper).join('\n')}\nglobalThis.result=${expression};`
  ).runInNewContext(context);
  return context['result'];
}

describe('Manager order presentation', () => {
  it('presents pay on delivery according to fulfillment', () => {
    expect(
      evaluate(`paymentMethodLabel({paymentMethod:'PAY_ON_DELIVERY',fulfillment:'PICKUP'})`)
    ).toBe('Pagamento na retirada');
    expect(
      evaluate(`paymentMethodLabel({paymentMethod:'PAY_ON_DELIVERY',fulfillment:'DELIVERY'})`)
    ).toBe('Pagamento na entrega');
  });

  it('keeps access management inside settings instead of the operational header', () => {
    const header = managerHtml.match(/<header class="topbar">[\s\S]*?<\/header>/)?.[0];
    expect(header).not.toContain('change-access');
    expect(managerHtml).toContain('<h2>Acesso</h2>');
    expect(managerHtml).toContain('id="change-access"');
  });

  it('exposes the persisted automatic order receipt switch', () => {
    expect(managerHtml).toContain('name="automaticOrderReceipt"');
    expect(managerSource).toContain("operation.orderReceiptMode === 'AUTOMATIC'");
    expect(managerSource).toContain("? 'AUTOMATIC' : 'MANUAL'");
  });

  it('exposes tenant coupon management inside settings without replacing homologated assets', () => {
    expect(managerHtml).toContain('<h2>Cupons</h2>');
    expect(managerHtml).toContain('id="coupon-dialog"');
    expect(managerSource).toContain("api('/v1/coupons')");
    expect(managerSource).toContain('discountType');
    expect(managerSource).toContain('order.discountCents');
    expect(managerSource).toContain('order.couponCode');
  });

  it('provides tenant-scoped configurable order sound alerts', () => {
    expect(() => new Script(`(() => {${orderAlertsSource}})();`)).not.toThrow();
    expect(orderAlertsSource).toContain('vero_order_alerts:${tenantId()}');
    expect(orderAlertsSource).toContain("columnCards('Recebidos')");
    expect(orderAlertsSource).toContain("columnCards('Confirmados')");
    expect(orderAlertsSource).toContain("manualSound: 'PHONE'");
    expect(orderAlertsSource).toContain("automaticSound: 'CHIME'");
    expect(orderAlertsSource).toContain('setInterval(() =>');
    expect(orderAlertsSource).toContain('900 * 1024');
    expect(orderAlertsSource).toContain("indexedDB.open('vero_order_alerts'");
    expect(orderAlertsSource).toContain("mime === 'audio/mpeg'");
    expect(orderAlertsSource).toContain("'audio/x-wav'");
    expect(orderAlertsSource).toContain('URL.createObjectURL(blob)');
    expect(orderAlertsSource).toContain('URL.revokeObjectURL(objectUrl)');
    expect(orderAlertsSource).not.toContain('FileReader');
    expect(orderAlertsSource).not.toContain('manualCustom:');
    expect(orderAlertsSource).not.toContain('automaticCustom:');
  });

  it.each([
    { name: 'aviso.mp3', type: 'audio/mpeg', size: 120_000 },
    { name: 'aviso.wav', type: 'audio/wav', size: 120_000 }
  ])('accepts a valid $name custom sound', (file) => {
    const context: Record<string, unknown> = { file };
    new Script(
      `${extractAlertHelper('validateAudioFile')}\nglobalThis.result=validateAudioFile(file);`
    ).runInNewContext(context);
    expect(context['result']).toBe(file);
  });

  it('rejects mismatched audio type and the configured size limit in Portuguese', () => {
    const run = (file: { name: string; size: number; type: string }) => {
      const context: Record<string, unknown> = { file };
      expect(() => {
        new Script(
          `${extractAlertHelper('validateAudioFile')}\nglobalThis.result=validateAudioFile(file);`
        ).runInNewContext(context);
      }).toThrow();
    };

    run({ name: 'aviso.mp3', type: 'video/mp4', size: 120_000 });
    run({ name: 'aviso.wav', type: 'audio/wav', size: 901 * 1024 });
  });

  it('persists and reloads a custom audio Blob through IndexedDB', async () => {
    const stored = new Map<string, unknown>();
    const database = {
      close: jest.fn(),
      objectStoreNames: { contains: () => true },
      transaction: () => {
        const transaction: Record<string, unknown> = {};
        const objectStore = {
          get: (key: string) => {
            const request: Record<string, unknown> = {};
            setImmediate(() => {
              request['result'] = stored.get(key);
              (request['onsuccess'] as (() => void) | undefined)?.();
            });
            return request;
          },
          put: (value: unknown, key: string) => {
            stored.set(key, value);
            setImmediate(() => (transaction['oncomplete'] as (() => void) | undefined)?.());
          }
        };
        transaction['objectStore'] = () => objectStore;
        return transaction;
      }
    };
    const indexedDB = {
      open: () => {
        const request: Record<string, unknown> = { result: database };
        setImmediate(() => (request['onsuccess'] as (() => void) | undefined)?.());
        return request;
      }
    };
    const blob = { size: 120_000, type: 'audio/mpeg' };
    const context: Record<string, unknown> = {
      audioStorageKey: (mode: string) => `tenant:${mode}`,
      blob,
      indexedDB
    };
    new Script(
      `${extractAlertHelper('openAudioDatabase')}\n${extractAlertHelper('storeAudioBlob')}\n${extractAlertHelper('loadAudioBlob')}\nglobalThis.result=(async()=>{await storeAudioBlob('manual',blob);return loadAudioBlob('manual')})();`
    ).runInNewContext(context);

    await expect(context['result']).resolves.toBe(blob);
    expect(stored.get('tenant:manual')).toBe(blob);
    expect(database.close).toHaveBeenCalledTimes(2);
  });

  it('revokes the custom audio object URL after playback and on browser rejection', async () => {
    const listeners: Record<string, () => void> = {};
    const revokeObjectURL = jest.fn();
    class SuccessfulAudio {
      addEventListener(event: string, listener: () => void) {
        listeners[event] = listener;
      }
      play() {
        return Promise.resolve();
      }
    }
    const successContext: Record<string, unknown> = {
      Audio: SuccessfulAudio,
      URL: { createObjectURL: () => 'blob:custom-audio', revokeObjectURL },
      blob: { type: 'audio/wav' }
    };
    new Script(
      `${extractAlertHelper('playAudioBlob')}\nglobalThis.result=playAudioBlob(blob);`
    ).runInNewContext(successContext);
    await expect(successContext['result']).resolves.toBe(true);
    listeners['ended']?.();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:custom-audio');

    class RejectedAudio extends SuccessfulAudio {
      override play() {
        return Promise.reject(new Error('Failed to load because no supported source was found.'));
      }
    }
    const rejectedContext: Record<string, unknown> = {
      Audio: RejectedAudio,
      URL: { createObjectURL: () => 'blob:rejected-audio', revokeObjectURL },
      blob: { type: 'audio/mpeg' }
    };
    new Script(
      `${extractAlertHelper('playAudioBlob')}\nglobalThis.result=playAudioBlob(blob);`
    ).runInNewContext(rejectedContext);
    await expect(rejectedContext['result']).rejects.toThrow(
      'Não foi possível reproduzir o arquivo. Verifique se o MP3 ou WAV é válido.'
    );
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:rejected-audio');
  });

  it('renders persistent order numbers and Portuguese operational labels at the source', () => {
    expect(evaluate(`orderNumberLabel({orderNumber:'00427'})`, ['orderNumberLabel'])).toBe(
      '#00427'
    );
    expect(evaluate(`orderNumberLabel({orderNumber:null})`, ['orderNumberLabel'])).toBe(
      'Pedido antigo'
    );
    expect(evaluate(`paymentStatusLabel('PENDING')`, ['paymentStatusLabel'])).toBe(
      'Aguardando pagamento'
    );
    expect(evaluate(`paymentStatusLabel('REFUNDED')`, ['paymentStatusLabel'])).toBe('Estornado');
    expect(evaluate(`fulfillmentLabel('DELIVERY')`, ['fulfillmentLabel'])).toBe('Entrega');
    expect(evaluate(`orderStatusLabel('PREPARING')`, ['orderStatusLabel'])).toBe('Em preparo');
    expect(managerSource).not.toContain('orderId.slice');
    expect(managerSource).not.toContain('MutationObserver');
    expect(managerHtml).not.toContain('order-display.js');
  });

  it('renders item notes, general notes and delivery address in distinct safe sections', () => {
    expect(managerSource).toContain('class="order-item-note"');
    expect(managerSource).toContain('class="order-note-section"');
    expect(managerSource).toContain('deliveryAddressLabel(order.deliveryAddress)');
    expect(managerSource).toContain('escapeHtml(item.note)');
    expect(managerSource).toContain('escapeHtml(order.orderNote)');
  });

  it('does not expose technical API errors in English to the operator', () => {
    expect(
      evaluate(`operatorErrorMessage({message:'Internal Server Error'},500)`, [
        'operatorErrorMessage'
      ])
    ).toBe('Serviço temporariamente indisponível. Tente novamente.');
    expect(
      evaluate(`operatorErrorMessage({message:'INVALID_ORDER_TRANSITION:READY->RECEIVED'},400)`, [
        'operatorErrorMessage'
      ])
    ).toBe('Esta mudança de status não é permitida.');
    expect(
      evaluate(
        `operatorErrorMessage({code:'STORE_CLOSED',message:'Loja temporariamente fechada'},409)`,
        ['operatorErrorMessage']
      )
    ).toBe('Loja temporariamente fechada');
  });

  it('hides dispatch for pickup and preserves it for delivery', () => {
    const order = `{allowedTransitions:['DISPATCHED','COMPLETED','CANCELLED']`;
    expect(evaluate(`transitionsForOrder(${order},fulfillment:'PICKUP'})`)).toEqual([
      'COMPLETED',
      'CANCELLED'
    ]);
    expect(evaluate(`transitionsForOrder(${order},fulfillment:'DELIVERY'})`)).toEqual([
      'DISPATCHED',
      'COMPLETED',
      'CANCELLED'
    ]);
  });
});
