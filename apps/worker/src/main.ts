import 'reflect-metadata';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { loadConfiguration } from '@vero/core-configuration';
import { initializeTelemetry, shutdownTelemetry } from '@vero/platform-observability';

@Module({})
class WorkerModule {}

async function bootstrap(): Promise<void> {
  const config = loadConfiguration();
  const telemetry = initializeTelemetry({ ...config, serviceName: 'vero-worker' });
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error']
  });
  app.enableShutdownHooks();

  const shutdown = async (): Promise<void> => {
    await app.close();
    await shutdownTelemetry(telemetry);
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
}

void bootstrap();
