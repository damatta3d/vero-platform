import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { financePageCss, financePageHtml, financePageJavaScript } from './finance-page.assets.js';

@Controller()
export class FinancePageController {
  @Get('financeiro')
  @Header('content-type', 'text/html; charset=utf-8')
  page(@Res() reply: FastifyReply): void {
    void reply.send(financePageHtml);
  }

  @Get('financeiro.css')
  @Header('content-type', 'text/css; charset=utf-8')
  stylesheet(@Res() reply: FastifyReply): void {
    void reply.send(financePageCss);
  }

  @Get('financeiro.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  script(@Res() reply: FastifyReply): void {
    void reply.send(financePageJavaScript);
  }
}
