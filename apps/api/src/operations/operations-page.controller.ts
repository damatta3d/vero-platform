import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { operationsPageHtml } from './operations-page.assets.js';

@Controller()
export class OperationsPageController {
  @Get('operacao')
  @Header('content-type', 'text/html; charset=utf-8')
  page(@Res() reply: FastifyReply): void {
    void reply.send(operationsPageHtml);
  }
}
