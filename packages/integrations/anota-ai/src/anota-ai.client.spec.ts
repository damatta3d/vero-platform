import { AnotaAiClient } from './anota-ai.client.js';
import { AnotaAiError } from './anota-ai.error.js';
import type { AnotaAiFetch, AnotaAiClientOptions } from './contracts.js';

interface RecordedCall {
  readonly url: string;
  readonly init?: RequestInit;
}

const TOKEN = {
  accessToken: 'oauth-token-one',
  tokenType: 'Bearer',
  expiresIn: 3600
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function createClient(
  fetch: AnotaAiFetch,
  overrides: Partial<AnotaAiClientOptions> = {}
): AnotaAiClient {
  return new AnotaAiClient({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    serviceVersion: '0.1.0',
    environment: 'test',
    runtimeVersion: '24.0.0',
    fetch,
    ...overrides
  });
}

function headersOf(call: RecordedCall): Record<string, string> {
  return call.init?.headers as Record<string, string>;
}

describe('AnotaAiClient', () => {
  it('reuses one OAuth token and scopes every order call by page', async () => {
    const calls: RecordedCall[] = [];
    const fetch: AnotaAiFetch = async (url, init) => {
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      if (url.includes('/oauth-client/token')) return json(TOKEN);
      if (url.includes('/ping/list')) {
        return json({
          success: true,
          info: { docs: [{ _id: 'order-1', check: 0 }], count: 1, limit: 100, currentpage: 1 }
        });
      }
      return json({ success: true, info: { _id: 'order-1', items: [] } });
    };
    const client = createClient(fetch);

    await expect(client.listOrders('page-1', { excludeIfood: false })).resolves.toMatchObject({
      info: { count: 1 }
    });
    await expect(client.getOrder('page-1', 'order/1')).resolves.toMatchObject({ success: true });

    expect(calls).toHaveLength(3);
    expect(calls[0]?.url).toContain('/oauth-client/token');
    expect(calls[1]?.url).toContain('/ping/list?excludeIfood=0');
    expect(calls[2]?.url).toContain('/ping/get/order%2F1');
    expect(headersOf(calls[1] ?? { url: '' })).toMatchObject({
      authorization: 'Bearer oauth-token-one',
      'x-page-id': 'page-1',
      'user-agent': 'vero-anota-ai-connector/0.1.0 (test; Node.js/24.0.0)'
    });
  });

  it('deduplicates concurrent token requests', async () => {
    const calls: RecordedCall[] = [];
    let releaseToken: ((response: Response) => void) | undefined;
    const tokenResponse = new Promise<Response>((resolve) => {
      releaseToken = resolve;
    });
    const fetch: AnotaAiFetch = async (url, init) => {
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      if (url.includes('/oauth-client/token')) return tokenResponse;
      return json({
        success: true,
        info: { docs: [], count: 0, limit: 100, currentpage: 1 }
      });
    };
    const client = createClient(fetch);

    const first = client.listOrders('page-1');
    const second = client.listOrders('page-2');
    await Promise.resolve();
    expect(calls.filter((call) => call.url.includes('/oauth-client/token'))).toHaveLength(1);
    releaseToken?.(json(TOKEN));
    await Promise.all([first, second]);
    expect(calls.filter((call) => call.url.includes('/oauth-client/token'))).toHaveLength(1);
  });

  it('refreshes the token once after a protected endpoint returns 401', async () => {
    const responses = [
      json(TOKEN),
      json({ message: 'expired' }, 401),
      json({ ...TOKEN, accessToken: 'oauth-token-two' }),
      json({ success: true, info: { docs: [], count: 0, limit: 100, currentpage: 1 } })
    ];
    const calls: RecordedCall[] = [];
    const client = createClient(async (url, init) => {
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      const response = responses.shift();
      if (!response) throw new Error('unexpected call');
      return response;
    });

    await expect(client.listOrders('page-1')).resolves.toMatchObject({ success: true });
    expect(calls).toHaveLength(4);
    expect(headersOf(calls[3] ?? { url: '' }).authorization).toBe('Bearer oauth-token-two');
  });

  it('supports the documented order lifecycle and cancellation body', async () => {
    const calls: RecordedCall[] = [];
    const client = createClient(async (url, init) => {
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      if (url.includes('/oauth-client/token')) return json(TOKEN);
      return json({ success: true, message: 'ok', info: { check: 1 } });
    });

    await client.acceptOrder('page-1', 'order-1');
    await client.cancelOrder('page-1', 'order-1', 'Cliente solicitou');
    await client.markOrderReady('page-1', 'order-1');
    await client.finalizeOrder('page-1', 'order-1');

    expect(calls.slice(1).map((call) => call.url)).toEqual([
      expect.stringContaining('/order/accept/order-1'),
      expect.stringContaining('/order/cancel/order-1'),
      expect.stringContaining('/order/ready/order-1'),
      expect.stringContaining('/order/finalize/order-1')
    ]);
    expect(calls[2]?.init?.body).toBe(JSON.stringify({ justification: 'Cliente solicitou' }));
  });

  it('exports the menu and assigns the VERO external item id', async () => {
    const calls: RecordedCall[] = [];
    const client = createClient(async (url, init) => {
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      if (url.includes('/oauth-client/token')) return json(TOKEN);
      if (url.endsWith('/export')) {
        return json({ success: true, message: 'ok', categories: [{ id: 'category-1' }] });
      }
      return json({ success: true, message: 'updated' });
    });

    await expect(client.exportMenu('page-1')).resolves.toMatchObject({
      categories: [{ id: 'category-1' }]
    });
    await client.setItemExternalId('page-1', 'item/1', 'vero-product-1');

    expect(calls[2]?.url).toContain('/menu/item/external-id/item%2F1');
    expect(calls[2]?.init?.method).toBe('PUT');
    expect(calls[2]?.init?.body).toBe(
      JSON.stringify({ document: { external_id: 'vero-product-1' } })
    );
  });

  it.each([
    [{ success: true, message: 'ok', data: [{ id: 'category-1' }] }],
    [{ success: true, message: 'ok', data: { categories: [{ id: 'category-1' }] } }]
  ])('normalizes the provider menu export envelope', async (payload) => {
    const client = createClient(async (url) =>
      url.includes('/oauth-client/token') ? json(TOKEN) : json(payload)
    );

    await expect(client.exportMenu('page-1')).resolves.toMatchObject({
      success: true,
      message: 'ok',
      categories: [{ id: 'category-1' }]
    });
  });

  it('rejects malformed menu export envelopes', async () => {
    const client = createClient(async (url) =>
      url.includes('/oauth-client/token')
        ? json(TOKEN)
        : json({ success: true, data: { categories: [null] } })
    );

    await expect(client.exportMenu('page-1')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE'
    });
  });

  it('links a page with HTTPS webhooks without exposing the page token in headers', async () => {
    const calls: RecordedCall[] = [];
    const client = createClient(async (url, init) => {
      calls.push({ url, ...(init === undefined ? {} : { init }) });
      if (url.includes('/oauth-client/token')) return json(TOKEN);
      return json({ success: true, message: 'Page vinculada', info: { token: 'linked' } });
    });

    await client.linkPage({
      pageToken: 'page-secret',
      externalId: 'vero-tenant-1',
      active: true,
      orderUpdated: { url: 'https://vero.example/webhooks/anota-ai', method: 'POST' }
    });

    expect(headersOf(calls[1] ?? { url: '' })['x-page-id']).toBeUndefined();
    expect(headersOf(calls[1] ?? { url: '' }).authorization).toBe('Bearer oauth-token-one');
    expect(calls[1]?.init?.body).toContain('"pageToken":"page-secret"');
  });

  it('treats HTTP 200 with success false as a provider business rejection', async () => {
    const client = createClient(async (url) =>
      url.includes('/oauth-client/token')
        ? json(TOKEN)
        : json({ success: false, message: 'Failed to link page by token', info: null })
    );

    await expect(client.linkPage({ pageToken: 'invalid-page-token' })).rejects.toMatchObject({
      code: 'PROVIDER_REJECTED',
      status: 200,
      retryable: false
    });
  });

  it.each([
    [429, 'RATE_LIMITED', true],
    [403, 'AUTHENTICATION_FAILED', false],
    [500, 'PROVIDER_REJECTED', true]
  ])('classifies provider HTTP %s without leaking credentials', async (status, code, retryable) => {
    const client = createClient(async (url) =>
      url.includes('/oauth-client/token') ? json(TOKEN) : json({ clientSecret: 'leak' }, status)
    );

    const rejection = client.listOrders('page-1');
    await expect(rejection).rejects.toMatchObject({ code, status, retryable });
    await expect(rejection).rejects.not.toThrow(/client-secret|leak/);
  });

  it('classifies OAuth rate limits and transport failures as retryable', async () => {
    const rateLimited = createClient(async () => json({}, 429));
    await expect(rateLimited.listOrders('page-1')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryable: true
    });

    const unavailable = createClient(async () => {
      throw new Error('network down with client-secret');
    });
    await expect(unavailable.listOrders('page-1')).rejects.toMatchObject({
      code: 'TRANSPORT_FAILED',
      retryable: true
    });
    await expect(unavailable.listOrders('page-1')).rejects.not.toThrow(/client-secret/);
  });

  it('aborts provider requests at the configured timeout without leaking credentials', async () => {
    const blocked: AnotaAiFetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('client-secret timeout')));
      });
    const client = createClient(blocked, { requestTimeoutMs: 10 });

    const rejection = client.listOrders('page-1');
    await expect(rejection).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
      retryable: true
    });
    await expect(rejection).rejects.not.toThrow(/client-secret/);
  });

  it('rejects malformed provider responses', async () => {
    const invalidToken = createClient(async () => json({ accessToken: '', expiresIn: 0 }));
    await expect(invalidToken.listOrders('page-1')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE'
    });

    const invalidOrders = createClient(async (url) =>
      url.includes('/oauth-client/token') ? json(TOKEN) : json({ success: true, info: {} })
    );
    await expect(invalidOrders.listOrders('page-1')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE'
    });

    const invalidProtectedJson = createClient(async (url) =>
      url.includes('/oauth-client/token') ? json(TOKEN) : new Response('not-json', { status: 200 })
    );
    await expect(invalidProtectedJson.listOrders('page-1')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE'
    });

    const invalidOAuthJson = createClient(async () => new Response('not-json', { status: 200 }));
    await expect(invalidOAuthJson.listOrders('page-1')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE'
    });
  });

  it('validates configuration, identifiers and webhook transport', async () => {
    expect(() => createClient(jest.fn(), { clientSecret: ' ' })).toThrow(AnotaAiError);
    expect(() => createClient(jest.fn(), { serviceName: 'invalid\nservice' })).toThrow(
      /userAgent|serviceName/
    );

    const client = createClient(async (url) =>
      url.includes('/oauth-client/token') ? json(TOKEN) : json({ success: true })
    );
    await expect(client.getOrder('page-1', ' ')).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION'
    });
    await expect(
      client.linkPage({
        pageToken: 'page-token',
        orderUpdated: { url: 'http://insecure.example/webhook', method: 'POST' }
      })
    ).rejects.toMatchObject({ code: 'INVALID_CONFIGURATION' });
    await expect(client.cancelOrder('page-1', 'order-1', ' ')).rejects.toMatchObject({
      code: 'INVALID_CONFIGURATION'
    });
  });

  it('validates optional settings and less common provider branches', async () => {
    expect(() =>
      createClient(jest.fn(), {
        environment: 'invalid' as AnotaAiClientOptions['environment']
      })
    ).toThrow(/environment/);
    expect(() => createClient(jest.fn(), { tokenExpirySkewSeconds: 301 })).toThrow(
      /tokenExpirySkewSeconds/
    );
    expect(() => createClient(jest.fn(), { requestTimeoutMs: 0 })).toThrow(/requestTimeoutMs/);

    const grouped = createClient(async (url) =>
      url.includes('/oauth-client/token')
        ? json(TOKEN)
        : json({
            success: true,
            info: { docs: [], count: 0, limit: 100, currentpage: 1 }
          })
    );
    await grouped.listOrders('page-1', { groupOrdersByTable: true });

    const blankRejection = createClient(async (url) =>
      url.includes('/oauth-client/token') ? json(TOKEN) : json({ success: false, message: '   ' })
    );
    await expect(blankRejection.listOrders('page-1')).rejects.toThrow(
      'A Anota AI recusou a operação solicitada.'
    );

    let authenticated = false;
    const protectedTransportFailure = createClient(async (url) => {
      if (!authenticated) {
        authenticated = true;
        return json(TOKEN);
      }
      throw new Error(`unavailable: ${url}`);
    });
    await expect(protectedTransportFailure.listOrders('page-1')).rejects.toMatchObject({
      code: 'TRANSPORT_FAILED'
    });

    const invalidCount = createClient(async (url) =>
      url.includes('/oauth-client/token')
        ? json(TOKEN)
        : json({
            success: true,
            info: { docs: [], count: -1, limit: 100, currentpage: 1 }
          })
    );
    await expect(invalidCount.listOrders('page-1')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE'
    });
  });
});
