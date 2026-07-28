export type AnotaAiEnvironment = 'development' | 'test' | 'staging' | 'production';

export interface AnotaAiClientOptions {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly serviceVersion: string;
  readonly environment: AnotaAiEnvironment;
  readonly serviceName?: string;
  readonly runtimeVersion?: string;
  readonly tokenExpirySkewSeconds?: number;
  readonly fetch?: AnotaAiFetch;
  readonly now?: () => number;
}

export type AnotaAiFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface AnotaAiToken {
  readonly accessToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
}

export interface AnotaAiOrderListOptions {
  readonly excludeIfood?: boolean;
  readonly groupOrdersByTable?: boolean;
}

export interface AnotaAiOrderList {
  readonly success: true;
  readonly info: {
    readonly docs: readonly Readonly<Record<string, unknown>>[];
    readonly count: number;
    readonly limit: number;
    readonly currentpage: number;
  };
}

export interface AnotaAiOrderDetail {
  readonly success: true;
  readonly info: unknown;
}

export interface AnotaAiOperationResult {
  readonly success: true;
  readonly message?: string;
  readonly info?: unknown;
}

export interface AnotaAiMenuExport {
  readonly success: true;
  readonly message?: string;
  readonly categories: readonly Readonly<Record<string, unknown>>[];
}

export interface AnotaAiWebhookTarget {
  readonly url: string;
  readonly method: 'POST' | 'PUT';
}

export interface LinkAnotaAiPageInput {
  readonly pageToken: string;
  readonly externalId?: string;
  readonly externalToken?: string;
  readonly active?: boolean;
  readonly orderAccept?: AnotaAiWebhookTarget;
  readonly orderCancel?: AnotaAiWebhookTarget;
  readonly orderUpdated?: AnotaAiWebhookTarget;
}
