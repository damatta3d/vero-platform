import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { financePageCss, financePageHtml, financePageJavaScript } from './finance-page.assets.js';

const inlineFinancePageHtml = financePageHtml
  .replace('<link rel="stylesheet" href="/financeiro.css">', `<style>${financePageCss}</style>`)
  .replace(
    '<script src="/financeiro.js" defer></script>',
    `<script>${financePageJavaScript}</script>`
  );

@Controller()
export class FinancePageController {
  @Get('financeiro')
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  page(@Res() reply: FastifyReply): void {
    void reply.send(inlineFinancePageHtml);
  }

  @Get('financeiro.css')
  @Header('content-type', 'text/css; charset=utf-8')
  @Header('cache-control', 'no-store')
  stylesheet(@Res() reply: FastifyReply): void {
    void reply.send(financePageCss);
  }

  @Get('financeiro.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  @Header('cache-control', 'no-store')
  script(@Res() reply: FastifyReply): void {
    void reply.send(financePageJavaScript);
  }
}
