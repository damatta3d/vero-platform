import { AnotaAiError } from './anota-ai.error.js';
import { AnotaAiTokenProvider } from './anota-ai-token.provider.js';
import type {
  AnotaAiClientOptions,
  AnotaAiFetch,
  AnotaAiMenuExport,
  AnotaAiOperationResult,
  AnotaAiOrderDetail,
  AnotaAiOrderList,
  AnotaAiOrderListOptions,
  LinkAnotaAiPageInput
} from './contracts.js';

const ORDER_BASE = 'https://gateway-partners.anota.ai/api-old/partnerauth/v2';
const PUBLIC_BASE = 'https://gateway-partners.anota.ai/integ/integ-public-core/v2';

export class AnotaAiClient {
  private readonly tokenProvider: AnotaAiTokenProvider;
  private readonly userAgent: string;
  private readonly fetch: NonNullable<AnotaAiClientOptions['fetch']>;

  constructor(options: AnotaAiClientOptions) {
    validateOptions(options);
    this.fetch = withRequestTimeout(
      options.fetch ?? ((url, init) => fetch(url, init)),
      options.requestTimeoutMs ?? 10_000
    );
    this.userAgent = buildUserAgent(options);
    this.tokenProvider = new AnotaAiTokenProvider({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      userAgent: this.userAgent,
      fetch: this.fetch,
      now: options.now ?? Date.now,
      expirySkewSeconds: options.tokenExpirySkewSeconds ?? 30
    });
  }

  async listOrders(
    pageId: string,
    options: AnotaAiOrderListOptions = {}
  ): Promise<AnotaAiOrderList> {
    const query = new URLSearchParams();
    if (options.excludeIfood !== undefined) {
      query.set('excludeIfood', options.excludeIfood ? '1' : '0');
    }
    if (options.groupOrdersByTable !== undefined) {
      query.set('groupOrdersByTable', options.groupOrdersByTable ? '1' : '0');
    }
    const suffix = query.size === 0 ? '' : `?${query.toString()}`;
    const payload = await this.authorizedRequest(`${ORDER_BASE}/ping/list${suffix}`, {
      pageId
    });
    return parseOrderList(payload);
  }

  async getOrder(pageId: string, orderId: string): Promise<AnotaAiOrderDetail> {
    const payload = await this.authorizedRequest(
      `${ORDER_BASE}/ping/get/${pathValue(orderId, 'orderId')}`,
      { pageId }
    );
    return parseOrderDetail(payload);
  }

  async acceptOrder(pageId: string, orderId: string): Promise<AnotaAiOperationResult> {
    return this.changeOrderStatus(pageId, orderId, 'accept');
  }

  async cancelOrder(
    pageId: string,
    orderId: string,
    justification: string
  ): Promise<AnotaAiOperationResult> {
    const normalized = requiredText(justification, 'justification', 500);
    const payload = await this.authorizedRequest(
      `${ORDER_BASE}/order/cancel/${pathValue(orderId, 'orderId')}`,
      {
        method: 'POST',
        pageId,
        body: { justification: normalized }
      }
    );
    return parseOperation(payload);
  }

  async markOrderReady(pageId: string, orderId: string): Promise<AnotaAiOperationResult> {
    return this.changeOrderStatus(pageId, orderId, 'ready');
  }

  async finalizeOrder(pageId: string, orderId: string): Promise<AnotaAiOperationResult> {
    return this.changeOrderStatus(pageId, orderId, 'finalize');
  }

  async exportMenu(pageId: string): Promise<AnotaAiMenuExport> {
    const payload = await this.authorizedRequest(
      `${PUBLIC_BASE}/menu/nm-category/simple-item/export`,
      { pageId }
    );
    return parseMenuExport(payload);
  }

  async setItemExternalId(
    pageId: string,
    itemId: string,
    externalId: string
  ): Promise<AnotaAiOperationResult> {
    const payload = await this.authorizedRequest(
      `${PUBLIC_BASE}/menu/item/external-id/${pathValue(itemId, 'itemId')}`,
      {
        method: 'PUT',
        pageId,
        body: { document: { external_id: requiredText(externalId, 'externalId', 256) } }
      }
    );
    return parseOperation(payload);
  }

  async linkPage(input: LinkAnotaAiPageInput): Promise<AnotaAiOperationResult> {
    validateLinkPage(input);
    const payload = await this.authorizedRequest(
      `${PUBLIC_BASE}/integration-partner/linkpage-by-token`,
      {
        method: 'POST',
        body: input
      }
    );
    return parseOperation(payload);
  }

  private async changeOrderStatus(
    pageId: string,
    orderId: string,
    action: 'accept' | 'ready' | 'finalize'
  ): Promise<AnotaAiOperationResult> {
    const payload = await this.authorizedRequest(
      `${ORDER_BASE}/order/${action}/${pathValue(orderId, 'orderId')}`,
      { method: 'POST', pageId }
    );
    return parseOperation(payload);
  }

  private async authorizedRequest(
    url: string,
    options: {
      readonly method?: 'GET' | 'POST' | 'PUT';
      readonly pageId?: string;
      readonly body?: unknown;
    },
    retryUnauthorized = true
  ): Promise<unknown> {
    const token = await this.tokenProvider.getToken();
    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'user-agent': this.userAgent
    };
    if (options.pageId !== undefined) {
      headers['x-page-id'] = requiredText(options.pageId, 'pageId', 128);
    }
    if (options.body !== undefined) headers['content-type'] = 'application/json';

    let response: Response;
    try {
      response = await this.fetch(url, {
        method: options.method ?? 'GET',
        headers,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
      });
    } catch (error) {
      if (error instanceof AnotaAiError) throw error;
      throw new AnotaAiError(
        'TRANSPORT_FAILED',
        'Não foi possível acessar a API da Anota AI.',
        undefined,
        true
      );
    }

    if (response.status === 401 && retryUnauthorized) {
      this.tokenProvider.invalidate();
      return this.authorizedRequest(url, options, false);
    }
    if (!response.ok) {
      throw providerHttpError(response.status);
    }
    try {
      return await response.json();
    } catch {
      throw new AnotaAiError(
        'INVALID_PROVIDER_RESPONSE',
        'A Anota AI retornou uma resposta inválida.',
        response.status
      );
    }
  }
}

function buildUserAgent(options: AnotaAiClientOptions): string {
  const serviceName = requiredText(
    options.serviceName ?? 'vero-anota-ai-connector',
    'serviceName',
    80
  );
  const serviceVersion = requiredText(options.serviceVersion, 'serviceVersion', 40);
  const runtimeVersion = requiredText(
    options.runtimeVersion ?? process.versions.node,
    'runtimeVersion',
    40
  );
  const userAgent = `${serviceName}/${serviceVersion} (${options.environment}; Node.js/${runtimeVersion})`;
  if (userAgent.length > 256 || !/^[\x20-\x7e]+$/.test(userAgent)) {
    invalidConfiguration('userAgent');
  }
  return userAgent;
}

function validateOptions(options: AnotaAiClientOptions): void {
  requiredText(options.clientId, 'clientId', 512);
  requiredText(options.clientSecret, 'clientSecret', 1024);
  if (!['development', 'test', 'staging', 'production'].includes(options.environment)) {
    invalidConfiguration('environment');
  }
  if (
    options.tokenExpirySkewSeconds !== undefined &&
    (!Number.isSafeInteger(options.tokenExpirySkewSeconds) ||
      options.tokenExpirySkewSeconds < 0 ||
      options.tokenExpirySkewSeconds > 300)
  ) {
    invalidConfiguration('tokenExpirySkewSeconds');
  }
  if (
    options.requestTimeoutMs !== undefined &&
    (!Number.isSafeInteger(options.requestTimeoutMs) ||
      options.requestTimeoutMs < 1 ||
      options.requestTimeoutMs > 120_000)
  ) {
    invalidConfiguration('requestTimeoutMs');
  }
}

function withRequestTimeout(fetchImplementation: AnotaAiFetch, timeoutMs: number): AnotaAiFetch {
  return async (url, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchImplementation(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new AnotaAiError(
          'REQUEST_TIMEOUT',
          'A API da Anota AI excedeu o tempo limite da requisição.',
          undefined,
          true
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
}

function validateLinkPage(input: LinkAnotaAiPageInput): void {
  requiredText(input.pageToken, 'pageToken', 4096);
  for (const target of [input.orderAccept, input.orderCancel, input.orderUpdated]) {
    if (!target) continue;
    requiredText(target.url, 'webhook.url', 2048);
    if (!['POST', 'PUT'].includes(target.method)) invalidConfiguration('webhook.method');
    try {
      const url = new URL(target.url);
      if (url.protocol !== 'https:') invalidConfiguration('webhook.url');
    } catch {
      invalidConfiguration('webhook.url');
    }
  }
}

function parseOrderList(value: unknown): AnotaAiOrderList {
  const root = successfulRecord(value);
  const info = root['info'];
  if (!isRecord(info) || !Array.isArray(info['docs'])) invalidProviderResponse();
  const count = safeNumber(info['count'], 'count');
  const limit = safeNumber(info['limit'], 'limit');
  const currentpage = safeNumber(info['currentpage'], 'currentpage');
  const docs = info['docs'].map((document) => {
    if (!isRecord(document)) invalidProviderResponse();
    return Object.freeze({ ...document });
  });
  return Object.freeze({
    success: true,
    info: Object.freeze({ docs: Object.freeze(docs), count, limit, currentpage })
  });
}

function parseOrderDetail(value: unknown): AnotaAiOrderDetail {
  const root = successfulRecord(value);
  return Object.freeze({ success: true, info: root['info'] });
}

function parseOperation(value: unknown): AnotaAiOperationResult {
  const root = successfulRecord(value);
  const message = root['message'];
  if (message !== undefined && typeof message !== 'string') invalidProviderResponse();
  const normalizedMessage = typeof message === 'string' ? message : undefined;
  return Object.freeze({
    success: true,
    ...(normalizedMessage === undefined ? {} : { message: normalizedMessage }),
    ...(root['info'] === undefined ? {} : { info: root['info'] })
  });
}

function parseMenuExport(value: unknown): AnotaAiMenuExport {
  const root = successfulRecord(value);
  const categories = menuCategories(root);
  const normalized = categories.map((category) => {
    if (!isRecord(category)) invalidProviderResponse();
    return Object.freeze({ ...category });
  });
  const message = root['message'];
  if (message !== undefined && typeof message !== 'string') invalidProviderResponse();
  const normalizedMessage = typeof message === 'string' ? message : undefined;
  return Object.freeze({
    success: true,
    ...(normalizedMessage === undefined ? {} : { message: normalizedMessage }),
    categories: Object.freeze(normalized)
  });
}

function menuCategories(root: Record<string, unknown>): unknown[] {
  const direct = root['categories'];
  if (Array.isArray(direct)) return direct;

  const data = root['data'];
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data['categories'])) return data['categories'];

  invalidProviderResponse();
}

function successfulRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) invalidProviderResponse();
  if (value['success'] !== true) {
    throw new AnotaAiError('PROVIDER_REJECTED', providerMessage(value['message']), 200, false);
  }
  return value;
}

function providerMessage(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'A Anota AI recusou a operação solicitada.';
  }
  return `A Anota AI recusou a operação: ${value.trim().slice(0, 300)}`;
}

function providerHttpError(status: number): AnotaAiError {
  const code =
    status === 429
      ? 'RATE_LIMITED'
      : status === 401 || status === 403
        ? 'AUTHENTICATION_FAILED'
        : 'PROVIDER_REJECTED';
  return new AnotaAiError(
    code,
    'A Anota AI recusou a operação solicitada.',
    status,
    status === 429 || status >= 500
  );
}

function requiredText(value: string, field: string, maximum: number): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum || /[\r\n]/.test(normalized)) {
    invalidConfiguration(field);
  }
  return normalized;
}

function pathValue(value: string, field: string): string {
  return encodeURIComponent(requiredText(value, field, 256));
}

function safeNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new AnotaAiError(
      'INVALID_PROVIDER_RESPONSE',
      `A resposta da Anota AI contém ${field} inválido.`
    );
  }
  return value;
}

function invalidConfiguration(field: string): never {
  throw new AnotaAiError(
    'INVALID_CONFIGURATION',
    `Configuração inválida do conector Anota AI: ${field}.`
  );
}

function invalidProviderResponse(): never {
  throw new AnotaAiError(
    'INVALID_PROVIDER_RESPONSE',
    'A Anota AI retornou uma resposta incompatível com o contrato publicado.'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
