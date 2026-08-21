import { Script } from 'node:vm';
import { publicMenuPage } from './public-menu-page.assets';

type EventListener = (...args: unknown[]) => unknown;

interface TestElement {
  addEventListener: (event: string, listener: EventListener) => void;
  classList: { add: jest.Mock; remove: jest.Mock; toggle: jest.Mock };
  className: string;
  disabled: boolean;
  innerHTML: string;
  listeners: Map<string, EventListener>;
  onchange?: EventListener;
  onclick?: EventListener;
  options: unknown[];
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
    classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
    className: '',
    disabled: false,
    innerHTML: '',
    listeners,
    options: [],
    scrollIntoView: jest.fn(),
    src: '',
    textContent: '',
    value
  };
}

function successResponse(payload: unknown) {
  return { ok: true, json: () => Promise.resolve(payload) };
}

async function executeCheckout(
  crypto: { getRandomValues?: (values: Uint8Array) => Uint8Array },
  shouldFinish = true,
  checkoutOverrides: Record<string, unknown> = {},
  paymentPayload: Record<string, unknown> = {
    method: 'PAY_ON_DELIVERY',
    paymentId: 'payment-1',
    status: 'PENDING'
  }
) {
  const elements = Object.fromEntries(
    [
      'back',
      'address',
      'apply-coupon',
      'cart-items',
      'cart-availability',
      'cart-discount',
      'cart-discount-label',
      'cart-subtotal',
      'cart-total',
      'catalog',
      'checkout',
      'checkout-message',
      'continue',
      'customer-name',
      'customer-email',
      'customer-phone',
      'complement',
      'coupon-code',
      'coupon-message',
      'district',
      'finish',
      'fulfillment',
      'logo',
      'menu-description',
      'menu-name',
      'method',
      'number',
      'order-note',
      'postal-code',
      'reference',
      'remove-coupon',
      'street',
      'store-status',
      'success'
    ].map((id) => [id, testElement()])
  ) as Record<string, TestElement>;
  elements['customer-name']!.value = 'Cliente Homologação';
  elements['customer-email']!.value = 'cliente@example.com';
  elements['customer-phone']!.value = '63999999999';
  elements['fulfillment']!.value = 'DELIVERY';
  elements['fulfillment']!.options = [{}];
  elements['method']!.value = 'PAY_ON_DELIVERY';
  elements['method']!.options = [{}];
  elements['order-note']!.value = 'Entregar talheres';
  elements['street']!.value = 'Rua das Flores';
  elements['number']!.value = '123';
  elements['district']!.value = 'Centro';

  const documentListeners = new Map<string, EventListener>();

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
          checkout: {
            canAcceptOrders: true,
            deliveryEnabled: true,
            minimumOrderCents: 0,
            operationallyOpen: true,
            paymentOnDeliveryEnabled: true,
            pickupEnabled: true,
            pixEnabled: true,
            statusMessage: 'Aberto agora',
            ...checkoutOverrides
          },
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
          itemsTotalCents: 4900,
          amountDueCents: 4410
        })
      );
    }
    if (url === '/v1/payments') {
      return Promise.resolve(successResponse(paymentPayload));
    }
    return Promise.resolve(
      successResponse({
        orderId: 'order-12345678',
        orderNumber: '00427',
        trackingToken: 'tracking-token'
      })
    );
  });
  const page = publicMenuPage('santo-parma-homolog');
  const script = page.match(/<script>([\s\S]*)<\/script>/)?.[1] ?? '';
  const localStorage = {
    getItem: jest.fn(() => JSON.stringify([{ id: 'item-1', note: 'Bem passado', quantity: 1 }])),
    setItem: jest.fn()
  };

  new Script(script).runInNewContext({
    crypto,
    document: {
      addEventListener: (event: string, listener: EventListener) =>
        documentListeners.set(event, listener),
      getElementById: (id: string) => elements[id]
    },
    fetch: fetchMock,
    localStorage
  });
  await new Promise((resolve) => setImmediate(resolve));

  const continueCheckout = elements['continue']!.onclick;
  expect(continueCheckout).toBeDefined();
  continueCheckout?.();

  const finish = elements['finish']!.onclick;
  expect(finish).toBeDefined();
  if (shouldFinish) await finish?.();

  return { documentListeners, elements, fetchMock, localStorage };
}

describe('publicMenuPage', () => {
  it('uses the current cart controls and removes a line when its quantity reaches zero', async () => {
    const { documentListeners, elements, localStorage } = await executeCheckout(
      {
        getRandomValues: (values) => values
      },
      false
    );
    const click = documentListeners.get('click');
    const target = (control: 'inc' | 'dec') => ({
      closest: (selector: string) =>
        selector === `[data-${control}]` ? { dataset: { [control]: 'item-1' } } : null
    });

    expect(elements['cart-items']!.innerHTML).toContain('data-inc="item-1"');
    expect(elements['cart-items']!.innerHTML).toContain('data-dec="item-1"');
    expect(elements['cart-items']!.innerHTML).toContain('data-note="item-1"');
    expect(elements['cart-items']!.innerHTML).not.toContain('data-remove');

    click?.({ target: target('inc') });
    expect(elements['cart-items']!.innerHTML).toContain('<span>2</span>');
    click?.({ target: target('dec') });
    expect(elements['cart-items']!.innerHTML).toContain('<span>1</span>');
    click?.({ target: target('dec') });
    expect(elements['cart-items']!.innerHTML).toBe('Carrinho vazio.');
    expect(localStorage.setItem).toHaveBeenLastCalledWith('vero_cart_santo-parma-homolog', '[]');
  });

  it('generates syntactically valid JavaScript and escapes the slug', () => {
    const page = publicMenuPage('</script><script>alert(1)</script>');
    const script = page.match(/<script>([\s\S]*)<\/script>/)?.[1];

    expect(script).toBeDefined();
    expect(page.match(/<script>/g)).toHaveLength(1);
    expect(page.match(/<\/script>/g)).toHaveLength(1);
    expect(script).not.toContain('<script>');
    expect(script).not.toContain('</script>');
    expect(() => new Script(script ?? '')).not.toThrow();

    const serializedSlug = script?.match(/^const slug=(.*?);\s*let menu=/)?.[1] ?? '';
    const context: { slug?: string } = {};
    new Script(`globalThis.slug=${serializedSlug}`).runInNewContext(context);
    expect(context.slug).toBe('</script><script>alert(1)</script>');
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
    const checkoutBody = JSON.parse(checkoutRequest?.[1]?.body ?? '') as {
      address: { district: string; number: string; street: string };
      fulfillment: string;
      items: Array<{ note?: string }>;
      orderNote?: string;
    };
    const orderBody = JSON.parse(orderRequest?.[1]?.body ?? '') as {
      idempotencyKey: string;
      items: Array<{ note?: string }>;
      orderNote?: string;
      payment: { method: string; paymentId: string; status?: string };
    };
    expect(paymentBody.checkoutId).toMatch(/^[0-9a-f]{64}$/);
    expect(orderBody.idempotencyKey).toBe(paymentBody.checkoutId);
    expect(checkoutBody.fulfillment).toBe('DELIVERY');
    expect(checkoutBody.address).toMatchObject({
      district: 'Centro',
      number: '123',
      street: 'Rua das Flores'
    });
    expect(checkoutBody.orderNote).toBe('Entregar talheres');
    expect(checkoutBody.items[0]?.note).toBe('Bem passado');
    expect(orderBody.orderNote).toBe('Entregar talheres');
    expect(orderBody.items[0]?.note).toBe('Bem passado');
    expect(orderBody.payment).toEqual({
      method: 'PAY_ON_DELIVERY',
      paymentId: 'payment-1'
    });
    expect(orderBody.payment).not.toHaveProperty('status');
    expect(elements['fulfillment']!.innerHTML).toContain('value="PICKUP"');
    expect(elements['fulfillment']!.innerHTML).toContain('value="DELIVERY"');
    expect(elements['method']!.innerHTML).toContain('value="PAY_ON_DELIVERY"');
    expect(elements['method']!.innerHTML).toContain('value="PIX"');
    expect(elements['address']!.classList.toggle).toHaveBeenCalledWith('hidden', false);
    expect(elements['finish']!.disabled).toBe(false);
    expect(elements['success']!.classList.remove).toHaveBeenCalledWith('hidden');
    expect(elements['success']!.innerHTML).toContain('<h2>Pedido #00427</h2>');
    expect(elements['store-status']!.textContent).toBe('Aberto agora');
  });

  it('applies, revalidates and removes a coupon while sending only its code as intent', async () => {
    const { documentListeners, elements, fetchMock } = await executeCheckout(
      {
        getRandomValues: (values) => {
          values.forEach((_, index) => (values[index] = index + 1));
          return values;
        }
      },
      false
    );
    elements['coupon-code']!.value = ' santo10 ';

    await elements['apply-coupon']!.onclick?.();
    expect(elements['coupon-code']!.value).toBe('SANTO10');
    expect(elements['coupon-message']!.textContent).toBe('Cupom SANTO10 aplicado.');
    expect(elements['cart-discount']!.textContent).toContain('4,90');

    const click = documentListeners.get('click');
    click?.({
      target: {
        closest: (selector: string) =>
          selector === '[data-inc]' ? { dataset: { inc: 'item-1' } } : null
      }
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(fetchMock.mock.calls.filter(([url]) => url === '/v1/checkout/price')).toHaveLength(2);

    await elements['finish']!.onclick?.();
    for (const endpoint of ['/v1/checkout/validate', '/v1/payments', '/v1/orders/native']) {
      const request = fetchMock.mock.calls.find(([url]) => url === endpoint);
      expect(JSON.parse(request?.[1]?.body ?? '')).toMatchObject({ couponCode: 'SANTO10' });
    }

    elements['remove-coupon']!.onclick?.();
    expect(elements['coupon-code']!.value).toBe('');
    expect(elements['coupon-message']!.textContent).toBe('Cupom removido.');
  });

  it('shows a pending PIX QR Code and never lets the browser claim payment approval', async () => {
    const { elements, fetchMock } = await executeCheckout(
      {
        getRandomValues: (values) => values
      },
      false,
      {},
      {
        amountCents: 4900,
        method: 'PIX',
        paymentId: 'payment-attempt-1',
        pixCopyPaste: '000201PIX-SEGURO',
        qrCodeUrl: 'data:image/png;base64,cXItY29kZQ==',
        status: 'AWAITING_PAYMENT'
      }
    );
    elements['method']!.value = 'PIX';
    elements['method']!.onchange?.();

    await elements['finish']!.onclick?.();

    expect(elements['success']!.innerHTML).toContain('Aguardando pagamento');
    expect(elements['success']!.innerHTML).toContain('QR Code PIX');
    expect(elements['success']!.innerHTML).toContain('000201PIX-SEGURO');
    expect(elements['success']!.innerHTML).not.toContain('Pagamento aprovado');
    const orderRequest = fetchMock.mock.calls.find(([url]) => url === '/v1/orders/native');
    const orderBody = JSON.parse(orderRequest?.[1]?.body ?? '') as {
      payment: Record<string, unknown>;
    };
    expect(orderBody.payment).toEqual({ method: 'PIX', paymentId: 'payment-attempt-1' });
  });

  it('shows a friendly invalid-coupon response without trusting a browser discount', async () => {
    const { elements, fetchMock } = await executeCheckout(
      { getRandomValues: (values) => values },
      false
    );
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'Cupom inválido ou expirado.' })
      })
    );
    elements['coupon-code']!.value = 'INEXISTENTE';

    await elements['apply-coupon']!.onclick?.();

    expect(elements['coupon-message']!.textContent).toBe('Cupom inválido ou expirado.');
    expect(elements['coupon-message']!.className).toBe('coupon-message error');
    expect(elements['cart-total']!.textContent).toBe(elements['cart-subtotal']!.textContent);
  });

  it('blocks checkout and explains when the store is outside its operational window', async () => {
    const { elements, fetchMock } = await executeCheckout(
      { getRandomValues: (values) => values },
      false,
      {
        canAcceptOrders: false,
        operationallyOpen: true,
        statusMessage: 'Fechado agora. Abre hoje às 18:00.'
      }
    );

    expect(elements['store-status']!.textContent).toBe('Fechado agora. Abre hoje às 18:00.');
    expect(elements['cart-availability']!.textContent).toBe('Fechado agora. Abre hoje às 18:00.');
    expect(elements['continue']!.disabled).toBe(true);
    expect(elements['checkout']!.classList.remove).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports secure key preparation errors and always re-enables checkout', async () => {
    const { elements, fetchMock } = await executeCheckout({});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(elements['checkout-message']!.textContent).toBe(
      'Seu navegador não oferece geração segura para finalizar o pedido.'
    );
    expect(elements['checkout-message']!.className).toBe('error');
    expect(elements['finish']!.disabled).toBe(false);
  });
});
