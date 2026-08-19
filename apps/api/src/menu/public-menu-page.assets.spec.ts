import { Script } from 'node:vm';
import { publicMenuPage } from './public-menu-page.assets';

type EventListener = (...args: unknown[]) => unknown;

interface TestElement {
  addEventListener: (event: string, listener: EventListener) => void;
  classList: { add: jest.Mock; remove: jest.Mock };
  className: string;
  disabled: boolean;
  innerHTML: string;
  listeners: Map<string, EventListener>;
  scrollIntoView: jest.Mock;
  src: string;
  textContent: string;
  value: string;
}

interface TestRequestInit {
  body?: string;
}

function testElement(value = ''): TestElement {
  const listeners = new Map<string, EventListener>();
  return {
    addEventListener: (event, listener) => listeners.set(event, listener),
    classList: { add: jest.fn(), remove: jest.fn() },
    className: '',
    disabled: false,
    innerHTML: '',
    listeners,
    scrollIntoView: jest.fn(),
    src: '',
    textContent: '',
    value
  };
}

function successResponse(payload: unknown) {
  return { ok: true, json: () => Promise.resolve(payload) };
}

async function executeCheckout(crypto: { getRandomValues?: (values: Uint8Array) => Uint8Array }) {
  const elements = Object.fromEntries(
    [
      'back',
      'cart-items',
      'cart-discount',
      'cart-discount-row',
      'cart-subtotal',
      'cart-total',
      'catalog',
      'checkout',
      'checkout-message',
      'continue',
      'coupon-code',
      'coupon-message',
      'customer-name',
      'customer-phone',
      'finish',
      'logo',
      'menu-description',
      'menu-name',
      'success',
      'apply-coupon'
    ].map((id) => [id, testElement()])
  ) as Record<string, TestElement>;
  elements['customer-name']!.value = 'Cliente Homologação';
  elements['customer-phone']!.value = '63999999999';

  const fetchMock = jest.fn((url: string, _options?: TestRequestInit) => {
    void _options;
    if (url.startsWith('/v1/menu/')) {
      return Promise.resolve(
        successResponse({
          categories: [
            {
              description: null,
              items: [
                {
                  available: true,
                  description: null,
                  featured: false,
                  id: 'item-1',
                  imageUrl: null,
                  name: 'Parmegiana',
                  priceCents: 4900
                }
              ],
              name: 'Pratos'
            }
          ],
          description: null,
          logoUrl: null,
          name: 'Santo Parma'
        })
      );
    }
    if (url === '/v1/checkout/validate') {
      return Promise.resolve(successResponse({ valid: true }));
    }
    if (url === '/v1/checkout/price') {
      return Promise.resolve(
        successResponse({
          coupon: { code: 'SANTO10' },
          discountCents: 490,
          itemsTotalCents: 4900
        })
      );
    }
    if (url === '/v1/payments') {
      return Promise.resolve(
        successResponse({
          method: 'PAY_ON_DELIVERY',
          paymentId: 'payment-1',
          status: 'PENDING'
        })
      );
    }
    return Promise.resolve(
      successResponse({ orderId: 'order-12345678', trackingToken: 'tracking-token' })
    );
  });
  const page = publicMenuPage('santo-parma-homolog');
  const script = page.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? '';
  const localStorage = {
    getItem: jest.fn(() => JSON.stringify([{ id: 'item-1', note: '', quantity: 1 }])),
    setItem: jest.fn()
  };

  new Script(script).runInNewContext({
    crypto,
    document: {
      addEventListener: jest.fn(),
      getElementById: (id: string) => elements[id]
    },
    fetch: fetchMock,
    localStorage
  });
  await new Promise((resolve) => setImmediate(resolve));

  const finish = elements['finish']!.listeners.get('click');
  expect(finish).toBeDefined();
  await finish?.();

  return { elements, fetchMock };
}

describe('publicMenuPage', () => {
  it('renders an RC-safe pickup checkout with complete cart controls', () => {
    const page = publicMenuPage('santo-parma-homolog');

    expect(page).toContain('data-increase');
    expect(page).toContain('data-decrease');
    expect(page).toContain('data-remove');
    expect(page).toContain('data-note');
    expect(page).toContain('id="coupon-code"');
    expect(page).toContain("fetch('/v1/checkout/price'");
    expect(page).toContain("method:'PAY_ON_DELIVERY'");
    expect(page).not.toContain('<option value="PIX">');
    expect(page).not.toContain('<option value="DELIVERY">');
    expect(page).toContain("customer,fulfillment:'PICKUP',address:null");
    expect(page).toContain('href="/pedido/');
  });

  it('applies a coupon through trusted server pricing', async () => {
    const { elements, fetchMock } = await executeCheckout({
      getRandomValues: (values) => values
    });
    elements['coupon-code']!.value = 'santo10';
    await elements['apply-coupon']!.listeners.get('click')?.();
    await new Promise((resolve) => setImmediate(resolve));

    const request = fetchMock.mock.calls.find(([url]) => url === '/v1/checkout/price');
    expect(JSON.parse(request?.[1]?.body ?? '')).toMatchObject({
      couponCode: 'santo10',
      menuSlug: 'santo-parma-homolog'
    });
    expect(elements['coupon-message']!.textContent).toBe('Cupom SANTO10 aplicado.');
    expect(elements['cart-total']!.textContent).toBe('R$ 44,10');
  });

  it('generates syntactically valid JavaScript and escapes the slug', () => {
    const page = publicMenuPage('</script><script>alert(1)</script>');
    const script = page.match(/<script>([\s\S]*)<\/script>/)?.[1];

    expect(script).toBeDefined();
    expect(script).toContain('\\u003c/script\\u003e');
    expect(() => new Script(script ?? '')).not.toThrow();
  });

  it('finishes checkout with secure random bytes when crypto.randomUUID is unavailable', async () => {
    const { elements, fetchMock } = await executeCheckout({
      getRandomValues: (values) => {
        values.forEach((_, index) => (values[index] = index + 1));
        return values;
      }
    });

    const checkoutRequest = fetchMock.mock.calls.find(([url]) => url === '/v1/checkout/validate');
    const paymentRequest = fetchMock.mock.calls.find(([url]) => url === '/v1/payments');
    const orderRequest = fetchMock.mock.calls.find(([url]) => url === '/v1/orders/native');

    expect(checkoutRequest).toBeDefined();
    expect(paymentRequest?.[1]?.body).toBeDefined();
    expect(orderRequest?.[1]?.body).toBeDefined();
    const paymentBody = JSON.parse(paymentRequest?.[1]?.body ?? '') as { checkoutId: string };
    const orderBody = JSON.parse(orderRequest?.[1]?.body ?? '') as { idempotencyKey: string };
    expect(paymentBody.checkoutId).toMatch(/^[0-9a-f]{64}$/);
    expect(orderBody.idempotencyKey).toBe(paymentBody.checkoutId);
    expect(elements['finish']!.disabled).toBe(false);
    expect(elements['success']!.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('reports secure key preparation errors and always re-enables checkout', async () => {
    const { elements, fetchMock } = await executeCheckout({});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(elements['checkout-message']!.textContent).toBe(
      'Seu navegador não oferece geração segura para finalizar o pedido.'
    );
    expect(elements['checkout-message']!.className).toBe('message error');
    expect(elements['finish']!.disabled).toBe(false);
  });
});
