import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { mvpPageCss, mvpPageHtml, mvpPageJavaScript } from './mvp-page.assets.js';

const inlineMvpPageHtml = mvpPageHtml
  .replace('<link rel="stylesheet" href="/mvp.css">', `<style>${mvpPageCss}</style>`)
  .replace('<script src="/mvp.js" defer></script>', `<script>${mvpPageJavaScript}</script>`);

@Controller()
export class MvpPageController {
  @Get('mvp')
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  page(@Res() reply: FastifyReply): void {
    void reply.send(inlineMvpPageHtml);
  }

  @Get('mvp.css')
  @Header('content-type', 'text/css; charset=utf-8')
  @Header('cache-control', 'no-store')
  stylesheet(@Res() reply: FastifyReply): void {
    void reply.send(mvpPageCss);
  }

  @Get('mvp.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  @Header('cache-control', 'no-store')
  script(@Res() reply: FastifyReply): void {
    void reply.send(mvpPageJavaScript);
  }
}
