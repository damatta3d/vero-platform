import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { financePageHtml } from './finance-page.assets.js';

@Controller()
export class FinancePageController {
  @Get('financeiro')
  @Header('content-type', 'text/html; charset=utf-8')
  page(@Res() reply: FastifyReply): void {
    void reply.send(financePageHtml);
  }
}
