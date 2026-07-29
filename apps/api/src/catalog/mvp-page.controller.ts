import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { mvpPageCss, mvpPageHtml, mvpPageJavaScript } from './mvp-page.assets.js';

@Controller()
export class MvpPageController {
  @Get('mvp')
  @Header('content-type', 'text/html; charset=utf-8')
  page(@Res() reply: FastifyReply): void {
    void reply.send(mvpPageHtml);
  }

  @Get('mvp.css')
  @Header('content-type', 'text/css; charset=utf-8')
  stylesheet(@Res() reply: FastifyReply): void {
    void reply.send(mvpPageCss);
  }

  @Get('mvp.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  script(@Res() reply: FastifyReply): void {
    void reply.send(mvpPageJavaScript);
  }
}
