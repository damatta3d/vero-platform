export interface ContextMetadata {
  readonly correlationId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly requestId?: string;
  readonly causationId?: string;
  readonly tenantId?: string;
  readonly workspaceId?: string;
  readonly userId?: string;
  readonly module?: string;
  readonly operation?: string;
}
