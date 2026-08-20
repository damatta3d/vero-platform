import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { publicMenuPage } from './public-menu-page.assets.js';
@Controller('menu')
export class PublicMenuPageController {
  @Get(':slug')
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-cache')
  show(@Param('slug') slug: string, @Res() reply: FastifyReply): void {
    void reply.send(publicMenuPage(slug));
  }
}
