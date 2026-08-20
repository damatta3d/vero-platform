import { Script } from 'node:vm';
import { publicTrackingPage } from './public-tracking-page.controller';

describe('publicTrackingPage', () => {
  it('renders the customer-safe canonical status sequence', () => {
    const page = publicTrackingPage('12345678-1234-1234-1234-123456789012', 'opaque-token');

    expect(page).toContain('Pedido recebido');
    expect(page).toContain('Pedido confirmado');
    expect(page).toContain('Em preparo');
    expect(page).toContain('Pronto para retirada');
    expect(page).toContain('Pronto para entrega');
    expect(page).toContain('Saiu para entrega');
    expect(page).toContain('Concluído');
    expect(page).toContain("payload.orderNumber?'Pedido #'+payload.orderNumber:'Pedido antigo'");
    expect(page).not.toContain('orderId.slice');
    expect(page).not.toContain('customerName');
    expect(page).not.toContain('customerPhone');
  });

  it('renders item and order notes as separate text-only content', () => {
    const page = publicTrackingPage('12345678-1234-1234-1234-123456789012', 'opaque-token');

    expect(page).toContain("note.textContent='Observações: '+item.note");
    expect(page).toContain("note.textContent=payload.orderNote||''");
    expect(page).not.toContain('note.innerHTML');
    expect(page).toContain('Observações do pedido');
  });

  it('renders the server-side subtotal, coupon discount and final total', () => {
    const page = publicTrackingPage('12345678-1234-1234-1234-123456789012', 'opaque-token');

    expect(page).toContain("byId('items-total').textContent=money(payload.itemsTotalCents)");
    expect(page).toContain("payload.couponCode?'Desconto ('+payload.couponCode+')':'Desconto'");
    expect(page).toContain("byId('total').textContent=money(payload.totalCents)");
  });

  it('generates syntactically valid JavaScript without reflecting markup', () => {
    const page = publicTrackingPage('</script>', '</script><script>alert(1)</script>');
    const script = page.match(/<script>([\s\S]*)<\/script>/)?.[1];

    expect(script).toBeDefined();
    expect(page.match(/<script>/g)).toHaveLength(1);
    expect(page.match(/<\/script>/g)).toHaveLength(1);
    expect(script).not.toContain('<script>');
    expect(script).not.toContain('</script>');
    expect(script).toContain('\\u003c/script\\u003e');
    expect(() => new Script(script ?? '')).not.toThrow();
  });
});
