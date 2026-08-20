import { Controller, Get, Header, Param, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

const progressStatuses = [
  'RECEIVED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'COMPLETED'
] as const;

const statusLabels = {
  RECEIVED: 'Pedido recebido',
  CONFIRMED: 'Pedido confirmado',
  PREPARING: 'Em preparo',
  READY: 'Pronto',
  DISPATCHED: 'Saiu para entrega',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado'
};

const paymentLabels = {
  PENDING: 'Aguardando pagamento',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  FAILED: 'Pagamento não aprovado',
  CANCELLED: 'Pagamento cancelado',
  REFUNDED: 'Estornado'
};

function safeJson(value: unknown): string {
  return (JSON.stringify(value) ?? 'null').replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}

export function publicTrackingPage(orderId: string, token: string): string {
  const steps = progressStatuses
    .map(
      (status) =>
        `<li data-status="${status}"><span></span><strong>${statusLabels[status]}</strong></li>`
    )
    .join('');
  const javascript = `const orderId=${safeJson(orderId)},token=${safeJson(token)},ordered=${safeJson([...progressStatuses])},statusLabels=${safeJson(statusLabels)},paymentLabels=${safeJson(paymentLabels)};const byId=id=>document.getElementById(id),money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);function statusLabel(payload){if(payload.status==='READY')return payload.fulfillment==='DELIVERY'?'Pronto para entrega':'Pronto para retirada';return statusLabels[payload.status]||'Status do pedido atualizado';}function renderItems(payload){const list=byId('order-items');list.textContent='';for(const item of payload.items||[]){const row=document.createElement('li'),product=document.createElement('span');product.textContent=item.quantity+'× '+item.name;row.append(product);if(item.note){const note=document.createElement('small');note.className='item-note';note.textContent='Observações: '+item.note;row.append(note)}list.append(row)}byId('items-section').classList.toggle('hidden',!list.children.length);const note=byId('order-note');note.textContent=payload.orderNote||'';byId('order-note-section').classList.toggle('hidden',!payload.orderNote)}function renderPricing(payload){byId('items-total').textContent=money(payload.itemsTotalCents);byId('discount').textContent=payload.discountCents?'− '+money(payload.discountCents):money(0);byId('discount-label').textContent=payload.couponCode?'Desconto ('+payload.couponCode+')':'Desconto';byId('discount-row').classList.toggle('hidden',!payload.discountCents);byId('discount').classList.toggle('hidden',!payload.discountCents);byId('total').textContent=money(payload.totalCents)}function render(payload){byId('order-heading').textContent=payload.orderNumber?'Pedido #'+payload.orderNumber:'Pedido antigo';const current=ordered.indexOf(payload.status);document.querySelectorAll('[data-status]').forEach((step,index)=>{step.classList.toggle('done',index<current);step.classList.toggle('current',index===current)});const ready=document.querySelector('[data-status="READY"] strong');ready.textContent=payload.fulfillment==='DELIVERY'?'Pronto para entrega':'Pronto para retirada';document.querySelector('[data-status="DISPATCHED"]').classList.toggle('hidden',payload.fulfillment!=='DELIVERY');byId('status').textContent=statusLabel(payload);byId('status').className='status';byId('fulfillment').textContent=payload.fulfillment==='DELIVERY'?'Entrega':'Retirada no local';byId('payment').textContent=paymentLabels[payload.paymentStatus]||'Situação do pagamento atualizada';renderItems(payload);renderPricing(payload)}async function refresh(){try{const response=await fetch('/v1/orders/'+encodeURIComponent(orderId)+'/status?token='+encodeURIComponent(token),{cache:'no-store'});if(!response.ok)throw new Error();render(await response.json())}catch{const status=byId('status');status.textContent='Não foi possível localizar ou atualizar este pedido.';status.className='status error'}}refresh();setInterval(refresh,5000);`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#742a23"><title>Acompanhar pedido · Santo Parma</title><style>:root{--red:#873028;--ink:#2d211d;--muted:#766a63;--paper:#f6f0e8;--line:#dfd3c8;--green:#3e7155}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;display:grid;place-items:center;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.card{width:min(560px,100%);padding:28px;background:#fffdfa;border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 44px #422b1b12}.eyebrow{margin:0 0 6px;color:var(--red);font-size:11px;font-weight:850;letter-spacing:.13em}h1{margin:0 0 8px;font:750 30px Georgia,serif}.muted{color:var(--muted)}ol{display:grid;gap:0;margin:26px 0;padding:0;list-style:none}ol li{position:relative;display:flex;gap:13px;align-items:center;min-height:54px;color:var(--muted);font-weight:750}ol li span{z-index:1;width:18px;height:18px;background:#fff;border:3px solid var(--line);border-radius:50%}ol li:not(:last-child)::after{position:absolute;top:35px;bottom:-18px;left:8px;width:3px;content:"";background:var(--line)}ol li.done,ol li.current{color:var(--ink)}ol li.done span,ol li.current span{border-color:var(--green);background:var(--green)}ol li.done:not(:last-child)::after{background:var(--green)}.status{padding:13px;border-radius:10px;background:#eee7df}.error{color:#842b23;background:#f8e2df}.summary{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0;color:var(--muted)}.details{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}.details ul{display:grid;gap:12px;padding-left:20px}.item-note{display:block;margin-top:5px;padding:7px 9px;border-left:3px solid #d7942f;background:#fff5dc;color:#6d4510}.pricing{display:grid;grid-template-columns:1fr auto;gap:8px}.pricing strong{font-size:18px}.hidden{display:none!important}@media(max-width:480px){body{padding:12px}.card{padding:22px}}</style></head><body><main class="card"><p class="eyebrow">ACOMPANHAMENTO</p><h1 id="order-heading">Pedido</h1><p class="muted">Esta tela atualiza automaticamente.</p><div class="summary"><span id="fulfillment"></span><span id="payment"></span></div><ol>${steps}</ol><div id="status" class="status">Consultando pedido…</div><section id="items-section" class="details hidden"><h2>Itens</h2><ul id="order-items"></ul></section><section id="order-note-section" class="details hidden"><h2>Observações do pedido</h2><p id="order-note"></p></section><section class="details pricing"><span>Subtotal</span><span id="items-total"></span><span id="discount-row" class="hidden"><span id="discount-label">Desconto</span></span><span id="discount"></span><strong>Total</strong><strong id="total"></strong></section></main><script>${javascript}</script></body></html>`;
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
