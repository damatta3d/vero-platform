export type AnotaAiErrorCode =
  | 'INVALID_CONFIGURATION'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'PROVIDER_REJECTED'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'TRANSPORT_FAILED';

export class AnotaAiError extends Error {
  constructor(
    readonly code: AnotaAiErrorCode,
    message: string,
    readonly status?: number,
    readonly retryable = false
  ) {
    super(message);
    this.name = 'AnotaAiError';
  }
}
