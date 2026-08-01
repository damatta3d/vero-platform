import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { portalPageCss, portalPageHtml, portalPageJavaScript } from './portal-page.assets.js';

const inlinePortalPageHtml = portalPageHtml
  .replace('<link rel="stylesheet" href="/portal.css">', `<style>${portalPageCss}</style>`)
  .replace('<script src="/portal.js" defer></script>', `<script>${portalPageJavaScript}</script>`);

@Controller()
export class PortalPageController {
  @Get(['', 'inicio'])
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  page(@Res() reply: FastifyReply): void {
    void reply.send(inlinePortalPageHtml);
  }

  @Get('portal.css')
  @Header('content-type', 'text/css; charset=utf-8')
  @Header('cache-control', 'no-store')
  stylesheet(@Res() reply: FastifyReply): void {
    void reply.send(portalPageCss);
  }

  @Get('portal.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  @Header('cache-control', 'no-store')
  script(@Res() reply: FastifyReply): void {
    void reply.send(portalPageJavaScript);
  }
}
