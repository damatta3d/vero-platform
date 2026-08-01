import 'reflect-metadata';

import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { loadConfiguration } from '@vero/core-configuration';
import {
  executionContextStore,
  initializeTelemetry,
  shutdownTelemetry
} from '@vero/platform-observability';
import { AppModule } from './app.module.js';

const externalIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const mvpWebPaths = new Set(['/', '/inicio', '/mvp', '/operacao', '/financeiro']);
const defaultContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https: data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' https: 'unsafe-inline'",
  'upgrade-insecure-requests'
].join(';');
const mvpWebContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https: data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-attr 'unsafe-inline'",
  "style-src 'self' https: 'unsafe-inline'"
].join(';');

async function bootstrap(): Promise<void> {
  const config = loadConfiguration();
  const telemetry = initializeTelemetry(config);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(config),
    new FastifyAdapter({ trustProxy: false }),
    { bufferLogs: true }
  );

  app.useLogger(app.get(Logger));
  await app.register(helmet, { contentSecurityPolicy: false });
  app.enableShutdownHooks();

  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (request, _reply, done) => {
      const received = request.headers['x-correlation-id'];
      const correlationId =
        typeof received === 'string' && externalIdPattern.test(received)
          ? received
          : crypto.randomUUID();
      executionContextStore.run(
        Object.freeze({ correlationId, requestId: request.id, operation: request.method }),
        done
      );
    });

  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onSend', (request, reply, _payload, done) => {
      const correlationId = executionContextStore.get()?.correlationId;
      if (correlationId) reply.header('x-correlation-id', correlationId);
      const path = request.url.split('?')[0] ?? '';
      reply.header(
        'content-security-policy',
        mvpWebPaths.has(path) ? mvpWebContentSecurityPolicy : defaultContentSecurityPolicy
      );
      done();
    });

  await app.listen(config.http.port, config.http.host);
  app
    .get(Logger)
    .log({ service: config.serviceName, version: config.serviceVersion }, 'VERO API started');

  const shutdown = async (): Promise<void> => {
    await app.close();
    await shutdownTelemetry(telemetry);
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
}

void bootstrap();
