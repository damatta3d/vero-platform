import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { portalPageCss, portalPageHtml, portalPageJavaScript } from './portal-page.assets.js';

@Controller()
export class PortalPageController {
  @Get(['', 'inicio'])
  @Header('content-type', 'text/html; charset=utf-8')
  page(@Res() reply: FastifyReply): void {
    void reply.send(portalPageHtml);
  }

  @Get('portal.css')
  @Header('content-type', 'text/css; charset=utf-8')
  stylesheet(@Res() reply: FastifyReply): void {
    void reply.send(portalPageCss);
  }

  @Get('portal.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  script(@Res() reply: FastifyReply): void {
    void reply.send(portalPageJavaScript);
  }
}
