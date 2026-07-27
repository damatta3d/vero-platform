import { z } from 'zod';

const booleanFromEnvironment = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const environmentSchema = z
  .object({
    VERO_ENVIRONMENT: z
      .enum(['development', 'test', 'staging', 'production'])
      .default('development'),
    VERO_SERVICE_NAME: z.string().min(1).default('vero-api'),
    VERO_SERVICE_VERSION: z.string().min(1).default('0.1.0'),
    VERO_HTTP_HOST: z.string().min(1).default('0.0.0.0'),
    VERO_HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    VERO_LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    VERO_POSTGRES_ENABLED: booleanFromEnvironment,
    VERO_DATABASE_URL: z.string().url().optional(),
    VERO_REDIS_ENABLED: booleanFromEnvironment,
    VERO_REDIS_URL: z.string().url().optional(),
    VERO_RABBITMQ_ENABLED: booleanFromEnvironment,
    VERO_RABBITMQ_URL: z.string().url().optional(),
    VERO_OTEL_ENABLED: booleanFromEnvironment,
    VERO_OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional()
  })
  .superRefine((value, context) => {
    const required: Array<[boolean, string | undefined, keyof typeof value]> = [
      [value.VERO_POSTGRES_ENABLED, value.VERO_DATABASE_URL, 'VERO_DATABASE_URL'],
      [value.VERO_REDIS_ENABLED, value.VERO_REDIS_URL, 'VERO_REDIS_URL'],
      [value.VERO_RABBITMQ_ENABLED, value.VERO_RABBITMQ_URL, 'VERO_RABBITMQ_URL'],
      [
        value.VERO_OTEL_ENABLED,
        value.VERO_OTEL_EXPORTER_OTLP_ENDPOINT,
        'VERO_OTEL_EXPORTER_OTLP_ENDPOINT'
      ]
    ];
    for (const [enabled, configured, path] of required) {
      if (enabled && !configured) {
        context.addIssue({
          code: 'custom',
          path: [path],
          message: `${path} is required when its capability is enabled`
        });
      }
    }
  });

export interface AppConfig {
  readonly environment: 'development' | 'test' | 'staging' | 'production';
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  readonly http: { readonly host: string; readonly port: number };
  readonly postgres: { readonly enabled: boolean; readonly url: string };
  readonly redis: { readonly enabled: boolean; readonly url: string };
  readonly rabbitmq: { readonly enabled: boolean; readonly url: string };
  readonly telemetry: { readonly enabled: boolean; readonly endpoint: string };
}

export class ConfigurationError extends Error {
  constructor(readonly keys: readonly string[]) {
    super(`Invalid VERO configuration: ${keys.join(', ')}`);
    this.name = 'ConfigurationError';
  }
}

export function parseConfiguration(
  source: Readonly<Record<string, string | undefined>>
): AppConfig {
  const result = environmentSchema.safeParse(source);
  if (!result.success) {
    throw new ConfigurationError(
      result.error.issues.map((issue) => issue.path.join('.')).filter(Boolean)
    );
  }
  const value = result.data;
  return Object.freeze({
    environment: value.VERO_ENVIRONMENT,
    serviceName: value.VERO_SERVICE_NAME,
    serviceVersion: value.VERO_SERVICE_VERSION,
    logLevel: value.VERO_LOG_LEVEL,
    http: Object.freeze({ host: value.VERO_HTTP_HOST, port: value.VERO_HTTP_PORT }),
    postgres: Object.freeze({
      enabled: value.VERO_POSTGRES_ENABLED,
      url: value.VERO_DATABASE_URL ?? ''
    }),
    redis: Object.freeze({
      enabled: value.VERO_REDIS_ENABLED,
      url: value.VERO_REDIS_URL ?? ''
    }),
    rabbitmq: Object.freeze({
      enabled: value.VERO_RABBITMQ_ENABLED,
      url: value.VERO_RABBITMQ_URL ?? ''
    }),
    telemetry: Object.freeze({
      enabled: value.VERO_OTEL_ENABLED,
      endpoint: value.VERO_OTEL_EXPORTER_OTLP_ENDPOINT ?? ''
    })
  });
}

export function loadConfiguration(): AppConfig {
  return parseConfiguration(process.env);
}
