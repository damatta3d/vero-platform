import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';

const managerSource = readFileSync(resolve('apps/manager/src/main.js'), 'utf8');
const managerHtml = readFileSync(resolve('apps/manager/src/index.html'), 'utf8');

function extractHelper(name: string): string {
  const helper = managerSource.match(
    new RegExp(`function ${name}\\(order\\) \\{[\\s\\S]*?^\\}`, 'm')
  );
  if (!helper) throw new Error(`Manager helper not found: ${name}`);
  return helper[0];
}

function evaluate(expression: string): unknown {
  const context: Record<string, unknown> = {};
  new Script(
    `${extractHelper('paymentMethodLabel')}\n${extractHelper('transitionsForOrder')}\nglobalThis.result=${expression};`
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

  it('exposes tenant coupon management inside settings', () => {
    expect(managerHtml).toContain('<h2>Cupons</h2>');
    expect(managerHtml).toContain('id="coupon-dialog"');
    expect(managerSource).toContain("api('/v1/coupons')");
    expect(managerSource).toContain('discountType');
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
