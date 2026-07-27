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

async function bootstrap(): Promise<void> {
  const config = loadConfiguration();
  const telemetry = initializeTelemetry(config);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(config),
    new FastifyAdapter({ trustProxy: false }),
    { bufferLogs: true }
  );

  app.useLogger(app.get(Logger));
  await app.register(helmet);
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
    .addHook('onSend', (_request, reply, _payload, done) => {
      const correlationId = executionContextStore.get()?.correlationId;
      if (correlationId) reply.header('x-correlation-id', correlationId);
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
