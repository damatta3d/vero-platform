import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Controller, Get, Header, Res, ServiceUnavailableException } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

const managerOutput = resolve('dist/apps/manager');

async function readAsset(filename: string): Promise<string> {
  try {
    return await readFile(resolve(managerOutput, filename), 'utf8');
  } catch {
    throw new ServiceUnavailableException('VERO Manager assets are not available.');
  }
}

async function sendAsset(reply: FastifyReply, filename: string): Promise<void> {
  void reply.send(await readAsset(filename));
}

@Controller('manager')
export class ManagerPageController {
  @Get()
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  async page(@Res() reply: FastifyReply): Promise<void> {
    await sendAsset(reply, 'index.html');
  }

  @Get('styles.css')
  @Header('content-type', 'text/css; charset=utf-8')
  @Header('cache-control', 'no-store')
  async stylesheet(@Res() reply: FastifyReply): Promise<void> {
    await sendAsset(reply, 'styles.css');
  }

  @Get('main.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  @Header('cache-control', 'no-store')
  async script(@Res() reply: FastifyReply): Promise<void> {
    const [managerScript, alertScript] = await Promise.all([
      readAsset('main.js'),
      readAsset('order-alerts.js')
    ]);
    void reply.send(`${managerScript}\n\n;(() => {\n${alertScript}\n})();\n`);
  }
}
