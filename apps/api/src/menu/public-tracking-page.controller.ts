import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

const statuses = ['RECEIVED', 'CONFIRMED', 'PREPARING', 'READY'] as const;
const labels: Record<(typeof statuses)[number], string> = {
  RECEIVED: 'Recebido',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto para retirada'
};

function safeJson(value: unknown): string {
  return (JSON.stringify(value) ?? 'null').replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function publicTrackingPage(orderId: string, token: string): string {
  const steps = statuses
    .map((status) => `<li data-status="${status}"><span></span>${labels[status]}</li>`)
    .join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#742a23"><title>Acompanhar pedido · Santo Parma</title><style>:root{--red:#873028;--ink:#2d211d;--muted:#766a63;--paper:#f6f0e8;--line:#dfd3c8;--green:#3e7155}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;display:grid;place-items:center;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.card{width:min(560px,100%);padding:28px;background:#fffdfa;border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 44px #422b1b12}.eyebrow{margin:0 0 6px;color:var(--red);font-size:11px;font-weight:850;letter-spacing:.13em}h1{margin:0 0 8px;font:750 30px Georgia,serif}.muted{color:var(--muted)}ol{display:grid;gap:0;margin:26px 0;padding:0;list-style:none}li{position:relative;display:flex;gap:13px;align-items:center;min-height:54px;color:var(--muted);font-weight:750}li span{z-index:1;width:18px;height:18px;background:#fff;border:3px solid var(--line);border-radius:50%}li:not(:last-child)::after{position:absolute;top:35px;bottom:-18px;left:8px;width:3px;content:"";background:var(--line)}li.done,li.current{color:var(--ink)}li.done span,li.current span{border-color:var(--green);background:var(--green)}li.done:not(:last-child)::after{background:var(--green)}.status{padding:13px;border-radius:10px;background:#eee7df}.error{color:#842b23;background:#f8e2df}.hidden{display:none!important}@media(max-width:480px){body{padding:12px}.card{padding:22px}}</style></head><body><main class="card"><p class="eyebrow">ACOMPANHAMENTO</p><h1>Pedido #${escapeHtml(orderId.slice(0, 8))}</h1><p class="muted">Esta tela atualiza automaticamente.</p><ol>${steps}</ol><div id="status" class="status">Consultando pedido…</div></main><script>const orderId=${safeJson(orderId)},token=${safeJson(token)},ordered=${safeJson([...statuses])};const labels=${safeJson(labels)};function render(payload){const current=ordered.indexOf(payload.status);document.querySelectorAll('[data-status]').forEach((step,index)=>{step.classList.toggle('done',index<current);step.classList.toggle('current',index===current);});const status=document.getElementById('status');status.textContent=labels[payload.status]||'Pedido em atualização';status.className='status';}async function refresh(){try{const response=await fetch('/v1/orders/'+encodeURIComponent(orderId)+'/status?token='+encodeURIComponent(token),{cache:'no-store'});if(!response.ok)throw new Error();render(await response.json());}catch{const status=document.getElementById('status');status.textContent='Não foi possível localizar ou atualizar este pedido.';status.className='status error';}}refresh();setInterval(refresh,5000);</script></body></html>`;
}

@Controller('pedido')
export class PublicTrackingPageController {
  @Get(':orderId')
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  show(
    @Param('orderId') orderId: string,
    @Query('token') token: string | undefined,
    @Res() reply: FastifyReply
  ): void {
    void reply.send(publicTrackingPage(orderId, token ?? ''));
  }
}
