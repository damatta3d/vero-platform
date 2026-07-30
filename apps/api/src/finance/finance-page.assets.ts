export const financePageHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VERO Finance · Santo Parma</title>
  <link rel="stylesheet" href="/finance.css">
</head>
<body>
  <header>
    <div><strong>VERO Finance</strong><small>Santo Parma · Caixa operacional</small></div>
    <a href="/mvp">Voltar ao painel</a>
  </header>
  <main>
    <section class="access card">
      <label>Chave de acesso<input id="apiKey" type="password" placeholder="Sua chave segura"></label>
      <label>Empresa<input id="tenantId" value="santo-parma"></label>
      <button id="refresh">Atualizar</button>
    </section>
    <section class="metrics">
      <article><small>Receitas previstas</small><strong id="receivable">R$ 0,00</strong></article>
      <article><small>Despesas previstas</small><strong id="payable">R$ 0,00</strong></article>
      <article><small>Saldo projetado</small><strong id="projected">R$ 0,00</strong></article>
      <article><small>Saldo realizado</small><strong id="realized">R$ 0,00</strong></article>
      <article class="warning"><small>Contas vencidas</small><strong id="overdue">R$ 0,00</strong></article>
    </section>
    <section class="layout">
      <div class="card">
        <h1>Novo lançamento</h1>
        <form id="entryForm">
          <label>Tipo<select name="type"><option value="PAYABLE">Despesa / conta a pagar</option><option value="RECEIVABLE">Receita / conta a receber</option></select></label>
          <label>Descrição<input name="description" required maxlength="256" placeholder="Ex.: Aluguel agosto"></label>
          <label>Categoria<input name="category" required maxlength="120" placeholder="Ex.: Aluguel, folha, vendas"></label>
          <label>Fornecedor ou origem<input name="counterparty" maxlength="256" placeholder="Ex.: Imobiliária ou iFood"></label>
          <label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" required></label>
          <label>Vencimento<input name="dueAt" type="date" required></label>
          <button type="submit">Salvar lançamento</button>
        </form>
      </div>
      <div class="card">
        <div class="title"><h1>Lançamentos</h1><select id="statusFilter"><option value="">Todos</option><option value="OPEN">Em aberto</option><option value="PAID">Pagos/recebidos</option><option value="CANCELLED">Cancelados</option></select></div>
        <div id="entries" class="empty">Nenhum lançamento encontrado.</div>
      </div>
    </section>
    <div id="toast"></div>
  </main>
  <script src="/finance.js" defer></script>
</body>
</html>`;

export const financePageCss = `
:root{--ink:#27231f;--muted:#766d64;--paper:#f5f0e8;--card:#fffdf9;--line:#ded4c8;--red:#a4382d;--green:#37664d;--gold:#c88d3f}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,sans-serif}header{min-height:74px;padding:15px max(22px,calc((100% - 1180px)/2));display:flex;align-items:center;justify-content:space-between;background:#211d19;color:#fff}header strong{display:block;font:700 26px Georgia,serif;letter-spacing:.06em}header small{color:#c9bdb0}header a{color:#fff;text-decoration:none}main{max-width:1180px;margin:25px auto;padding:0 22px}.card,.metrics article{background:var(--card);border:1px solid var(--line);border-radius:15px;box-shadow:0 5px 22px #55452d0b}.access{display:grid;grid-template-columns:1fr 1fr auto;gap:15px;padding:18px;align-items:end}.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:18px 0}.metrics article{padding:17px}.metrics small{display:block;color:var(--muted);text-transform:uppercase;font-size:11px;letter-spacing:.06em}.metrics strong{display:block;margin-top:8px;font:700 23px Georgia,serif}.metrics .warning{border-color:#d9aa5e}.layout{display:grid;grid-template-columns:420px 1fr;gap:18px}.card{padding:22px}h1{font:700 23px Georgia,serif;margin:0 0 18px}form{display:grid;gap:13px}label{display:grid;gap:6px;font-size:13px;font-weight:700}input,select{min-height:43px;border:1px solid var(--line);border-radius:9px;background:#fff;padding:9px 11px;font:inherit}button{min-height:43px;border:0;border-radius:9px;background:var(--red);color:#fff;padding:10px 16px;font-weight:750;cursor:pointer}.title{display:flex;justify-content:space-between;gap:15px;align-items:start}.title select{min-width:170px}.row{display:grid;grid-template-columns:1fr auto;gap:12px;padding:14px 0;border-bottom:1px solid #eee6dd}.row:last-child{border:0}.row strong,.row small{display:block}.row small{color:var(--muted);margin-top:4px}.actions{display:flex;gap:7px;align-items:center}.actions button{min-height:34px;padding:7px 10px;font-size:12px}.actions .cancel{background:#6d625a}.status{font-size:11px;font-weight:800;text-transform:uppercase}.status.OPEN{color:var(--gold)}.status.PAID{color:var(--green)}.status.CANCELLED{color:var(--muted)}.empty{color:var(--muted);padding:25px 0}#toast{position:fixed;right:22px;bottom:22px;padding:13px 16px;border-radius:9px;background:var(--green);color:#fff;opacity:0;transform:translateY(8px);transition:.2s}#toast.show{opacity:1;transform:none}#toast.error{background:var(--red)}
@media(max-width:900px){.metrics{grid-template-columns:1fr 1fr}.layout{grid-template-columns:1fr}.access{grid-template-columns:1fr}.row{grid-template-columns:1fr}.actions{justify-content:flex-start}}
`;

export const financePageJavaScript = `
const $=(id)=>document.getElementById(id);
const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
function headers(){return {'content-type':'application/json','authorization':'Bearer '+$('apiKey').value,'x-tenant-id':$('tenantId').value};}
async function api(path,options={}){const response=await fetch(path,{...options,headers:{...headers(),...(options.headers||{})}});if(!response.ok)throw new Error(response.status===401?'Acesso negado. Confira a chave e a empresa.':'Não foi possível concluir a operação.');return response.json();}
function toast(message,error=false){const element=$('toast');element.textContent=message;element.className=error?'show error':'show';setTimeout(()=>element.className='',2600);}
function escapeHtml(value){const element=document.createElement('div');element.textContent=value??'';return element.innerHTML;}
async function refresh(){if(!$('apiKey').value)return;try{const status=$('statusFilter').value;const query=status?'?status='+status:'';const [summary,entries]=await Promise.all([api('/v1/finance/summary'),api('/v1/finance'+query)]);$('receivable').textContent=money(summary.receivableCents);$('payable').textContent=money(summary.payableCents);$('projected').textContent=money(summary.projectedBalanceCents);$('realized').textContent=money(summary.realizedBalanceCents);$('overdue').textContent=money(summary.overduePayableCents+summary.overdueReceivableCents);render(entries);}catch(error){toast(error.message,true);}}
function render(entries){const container=$('entries');container.className=entries.length?'':'empty';container.innerHTML=entries.length?entries.map((entry)=>'<div class="row"><div><span class="status '+entry.status+'">'+entry.status+'</span><strong>'+escapeHtml(entry.description)+'</strong><small>'+escapeHtml(entry.category)+(entry.counterparty?' · '+escapeHtml(entry.counterparty):'')+' · vence '+new Date(entry.dueAt).toLocaleDateString('pt-BR')+'</small></div><div><strong>'+money(entry.amountCents)+'</strong><div class="actions">'+(entry.status==='OPEN'?'<button data-settle="'+entry.id+'">Quitar</button><button class="cancel" data-cancel="'+entry.id+'">Cancelar</button>':'')+'</div></div></div>').join(''):'Nenhum lançamento encontrado.';document.querySelectorAll('[data-settle]').forEach((button)=>button.addEventListener('click',()=>change(button.dataset.settle,'settle')));document.querySelectorAll('[data-cancel]').forEach((button)=>button.addEventListener('click',()=>change(button.dataset.cancel,'cancel')));}
async function change(id,action){try{await api('/v1/finance/'+id+'/'+action,{method:'PATCH',body:JSON.stringify({})});toast(action==='settle'?'Lançamento quitado.':'Lançamento cancelado.');await refresh();}catch(error){toast(error.message,true);}}
$('entryForm').addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);try{await api('/v1/finance',{method:'POST',body:JSON.stringify({idempotencyKey:crypto.randomUUID(),type:data.get('type'),description:data.get('description'),category:data.get('category'),counterparty:data.get('counterparty')||null,amountCents:Math.round(Number(data.get('amount'))*100),dueAt:new Date(data.get('dueAt')+'T12:00:00').toISOString()})});event.currentTarget.reset();toast('Lançamento salvo.');await refresh();}catch(error){toast(error.message,true);}});
$('refresh').addEventListener('click',refresh);$('statusFilter').addEventListener('change',refresh);$('apiKey').addEventListener('change',refresh);$('tenantId').addEventListener('change',refresh);
`;
