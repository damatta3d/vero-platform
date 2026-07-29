import { AnotaAiError } from './anota-ai.error.js';
import type { AnotaAiFetch, AnotaAiToken } from './contracts.js';

const OAUTH_URL = 'https://gateway-partners.anota.ai/integ/integ-oauth-api/oauth-client/token';

interface TokenProviderOptions {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly userAgent: string;
  readonly fetch: AnotaAiFetch;
  readonly now: () => number;
  readonly expirySkewSeconds: number;
}

interface CachedToken {
  readonly value: string;
  readonly expiresAt: number;
}

export class AnotaAiTokenProvider {
  private cached: CachedToken | undefined;
  private inFlight: Promise<string> | undefined;

  constructor(private readonly options: TokenProviderOptions) {}

  async getToken(): Promise<string> {
    if (
      this.cached &&
      this.cached.expiresAt - this.options.expirySkewSeconds * 1000 > this.options.now()
    ) {
      return this.cached.value;
    }
    if (this.inFlight) return this.inFlight;

    const request = this.requestToken();
    this.inFlight = request;
    try {
      return await request;
    } finally {
      if (this.inFlight === request) this.inFlight = undefined;
    }
  }

  invalidate(): void {
    this.cached = undefined;
  }

  private async requestToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret
    });
    let response: Response;
    try {
      response = await this.options.fetch(OAUTH_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': this.options.userAgent
        },
        body
      });
    } catch (error) {
      if (error instanceof AnotaAiError) throw error;
      throw new AnotaAiError(
        'TRANSPORT_FAILED',
        'Não foi possível acessar a autenticação da Anota AI.',
        undefined,
        true
      );
    }

    if (!response.ok) {
      const code = response.status === 429 ? 'RATE_LIMITED' : 'AUTHENTICATION_FAILED';
      throw new AnotaAiError(
        code,
        'A Anota AI recusou a autenticação do conector.',
        response.status,
        response.status === 429 || response.status >= 500
      );
    }

    const payload = await parseJson(response);
    const token = parseToken(payload);
    this.cached = Object.freeze({
      value: token.accessToken,
      expiresAt: this.options.now() + token.expiresIn * 1000
    });
    return token.accessToken;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AnotaAiError(
      'INVALID_PROVIDER_RESPONSE',
      'A autenticação da Anota AI retornou uma resposta inválida.',
      response.status
    );
  }
}

function parseToken(value: unknown): AnotaAiToken {
  if (!isRecord(value)) invalidToken();
  const accessToken = value['accessToken'];
  const tokenType = value['tokenType'];
  const expiresIn = value['expiresIn'];
  if (
    typeof accessToken !== 'string' ||
    accessToken.length === 0 ||
    tokenType !== 'Bearer' ||
    !Number.isSafeInteger(expiresIn) ||
    typeof expiresIn !== 'number' ||
    expiresIn <= 0
  ) {
    invalidToken();
  }
  return Object.freeze({ accessToken, tokenType, expiresIn });
}

function invalidToken(): never {
  throw new AnotaAiError(
    'INVALID_PROVIDER_RESPONSE',
    'A autenticação da Anota AI não retornou um token válido.'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
