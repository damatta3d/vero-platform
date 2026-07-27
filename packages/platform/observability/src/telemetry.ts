import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import type { AppConfig } from '@vero/core-configuration';

export function initializeTelemetry(config: AppConfig): NodeSDK | undefined {
  if (!config.telemetry.enabled) return undefined;
  const endpoint = config.telemetry.endpoint.replace(/\/$/, '');
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      'deployment.environment.name': config.environment
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` })
    }),
    instrumentations: [getNodeAutoInstrumentations()]
  });
  sdk.start();
  return sdk;
}

export async function shutdownTelemetry(sdk: NodeSDK | undefined): Promise<void> {
  await sdk?.shutdown();
}
