import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { operationsPageHtml } from './operations-page.assets.js';

const mobileOperationsPageHtml = operationsPageHtml
  .replace(
    '</style>',
    '.period-grid{grid-template-columns:1fr 1fr}.home-link{color:#fff;text-decoration:none;font-weight:700}@media(max-width:850px){.period-grid{grid-template-columns:1fr}}\n  </style>'
  )
  .replace(
    '<header><div><h1>VERO · Santo Parma</h1>',
    '<header><div><a class="home-link" href="/">← Central VERO</a><h1>VERO · Santo Parma</h1>'
  )
  .replace(
    '<div class="grid" style="grid-template-columns:1fr 1fr">',
    '<div class="grid period-grid">'
  )
  .replace(
    "const money=(cents)=>",
    "const apiKeyInput=document.querySelector('#apiKey');const tenantInput=document.querySelector('#tenantId');apiKeyInput.value=localStorage.getItem('vero_token')||'';tenantInput.value=localStorage.getItem('vero_tenant')||'santo-parma';apiKeyInput.addEventListener('change',()=>localStorage.setItem('vero_token',apiKeyInput.value.trim()));tenantInput.addEventListener('change',()=>localStorage.setItem('vero_tenant',tenantInput.value.trim()||'santo-parma'));const money=(cents)=>"
  );

@Controller()
export class OperationsPageController {
  @Get('operacao')
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  page(@Res() reply: FastifyReply): void {
    void reply.send(mobileOperationsPageHtml);
  }
}
