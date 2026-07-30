export const financePageHtml = `<!doctype html>
<html lang="pt-BR" data-theme="modern">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>VERO Finance · Santo Parma</title>
  <script>try{document.documentElement.dataset.theme=localStorage.getItem('vero-theme')||'modern'}catch{}</script>
  <link rel="stylesheet" href="/finance.css">
</head>
<body>
  <header>
    <div><strong>VERO Finance</strong><small>Santo Parma · Caixa operacional</small></div>
    <div class="header-actions">
      <label class="theme-control">Aparência<select id="themeSelector" aria-label="Escolher aparência"><option value="clean">Clean</option><option value="modern">Modern</option><option value="future">Future</option><option value="brand">Brand</option></select></label>
      <a href="/mvp">Voltar ao painel</a>
    </div>
  </header>
  <main>
    <section class="access card vds-card">
      <label>Chave de acesso<input class="vds-field" id="apiKey" type="password" placeholder="Sua chave segura"></label>
      <label>Empresa<input class="vds-field" id="tenantId" value="santo-parma"></label>
      <button class="vds-button" id="refresh">Atualizar</button>
    </section>
    <section class="metrics">
      <article class="vds-card"><small>Receitas previstas</small><strong class="vds-positive" id="receivable">R$ 0,00</strong></article>
      <article class="vds-card"><small>Despesas previstas</small><strong class="vds-negative" id="payable">R$ 0,00</strong></article>
      <article class="vds-card"><small>Saldo projetado</small><strong id="projected">R$ 0,00</strong></article>
      <article class="vds-card"><small>Saldo realizado</small><strong id="realized">R$ 0,00</strong></article>
      <article class="warning vds-card"><small>Contas vencidas</small><strong class="vds-warning" id="overdue">R$ 0,00</strong></article>
    </section>
    <section class="layout">
      <div class="card vds-card">
        <h1>Novo lançamento</h1>
        <form id="entryForm">
          <label>Tipo<select class="vds-field" name="type"><option value="PAYABLE">Despesa / conta a pagar</option><option value="RECEIVABLE">Receita / conta a receber</option></select></label>
          <label>Descrição<input class="vds-field" name="description" required maxlength="256" placeholder="Ex.: Aluguel agosto"></label>
          <label>Categoria<input class="vds-field" name="category" required maxlength="120" placeholder="Ex.: Aluguel, folha, vendas"></label>
          <label>Fornecedor ou origem<input class="vds-field" name="counterparty" maxlength="256" placeholder="Ex.: Imobiliária ou iFood"></label>
          <label>Valor (R$)<input class="vds-field" name="amount" type="number" min="0.01" step="0.01" required></label>
          <label>Vencimento<input class="vds-field" name="dueAt" type="date" required></label>
          <button class="vds-button" type="submit">Salvar lançamento</button>
        </form>
      </div>
      <div class="card vds-card">
        <div class="title"><h1>Lançamentos</h1><select class="vds-field" id="statusFilter"><option value="">Todos</option><option value="OPEN">Em aberto</option><option value="PAID">Pagos/recebidos</option><option value="CANCELLED">Cancelados</option></select></div>
        <div id="entries" class="empty">Nenhum lançamento encontrado.</div>
      </div>
    </section>
    <div id="toast" role="status" aria-live="polite"></div>
  </main>
  <script src="/finance.js" defer></script>
</body>
</html>`;

export const financePageCss = `
header{min-height:74px;padding:15px max(22px,calc((100% - 1180px)/2));display:flex;align-items:center;justify-content:space-between;gap:18px;background:var(--vds-surface);border-bottom:1px solid var(--vds-border);box-shadow:var(--vds-shadow-soft)}
header strong{display:block;font-family:var(--vds-font-display);font-size:26px;letter-spacing:.04em}header small{display:block;color:var(--vds-text-muted);margin-top:3px}.header-actions{display:flex;align-items:center;gap:14px}.header-actions a{color:var(--vds-primary);font-weight:700;text-decoration:none}.theme-control{display:flex;align-items:center;gap:8px;color:var(--vds-text-muted);font-size:12px}.theme-control select{min-height:38px;border:1px solid var(--vds-border);border-radius:var(--vds-radius-sm);background:var(--vds-surface-subtle);color:var(--vds-text);padding:7px 30px 7px 10px}
main{max-width:1180px;margin:25px auto;padding:0 22px}.card,.metrics article{background:var(--vds-surface);border:1px solid var(--vds-border);border-radius:var(--vds-radius-md);box-shadow:var(--vds-shadow-soft)}.access{display:grid;grid-template-columns:1fr 1fr auto;gap:15px;padding:18px;align-items:end}.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:18px 0}.metrics article{padding:17px}.metrics small{display:block;color:var(--vds-text-muted);text-transform:uppercase;font-size:11px;letter-spacing:.06em}.metrics strong{display:block;margin-top:8px;font-family:var(--vds-font-display);font-size:23px}.metrics .warning{border-color:color-mix(in srgb,var(--vds-warning) 45%,var(--vds-border))}.layout{display:grid;grid-template-columns:420px 1fr;gap:18px}.card{padding:22px}h1{font-family:var(--vds-font-display);font-size:23px;margin:0 0 18px}form{display:grid;gap:13px}label{display:grid;gap:6px;font-size:13px;font-weight:700}.title{display:flex;justify-content:space-between;gap:15px;align-items:start}.title select{min-width:170px}.row{display:grid;grid-template-columns:1fr auto;gap:12px;padding:14px 0;border-bottom:1px solid var(--vds-border)}.row:last-child{border:0}.row strong,.row small{display:block}.row small{color:var(--vds-text-muted);margin-top:4px}.actions{display:flex;gap:7px;align-items:center}.actions button{min-height:34px;border:0;border-radius:var(--vds-radius-sm);background:var(--vds-primary);color:var(--vds-primary-contrast);padding:7px 10px;font-size:12px;font-weight:750;cursor:pointer}.actions .cancel{background:var(--vds-surface-strong);color:var(--vds-text)}.status{font-size:11px;font-weight:800;text-transform:uppercase}.status.OPEN{color:var(--vds-warning)}.status.PAID{color:var(--vds-positive)}.status.CANCELLED{color:var(--vds-text-muted)}.empty{color:var(--vds-text-muted);padding:25px 0}#toast{position:fixed;right:22px;bottom:22px;padding:13px 16px;border-radius:var(--vds-radius-sm);background:var(--vds-positive);color:#fff;opacity:0;transform:translateY(8px);transition:var(--vds-transition);box-shadow:var(--vds-shadow)}#toast.show{opacity:1;transform:none}#toast.error{background:var(--vds-negative)}
[data-theme="future"] body{background-image:radial-gradient(circle at 85% 0%,rgb(50 122 182 / 18%),transparent 32%),radial-gradient(circle at 0% 100%,rgb(37 163 112 / 13%),transparent 28%)}[data-theme="future"] header,[data-theme="future"] .card,[data-theme="future"] .metrics article{backdrop-filter:blur(18px)}
@media(max-width:900px){header{align-items:flex-start}.header-actions{align-items:flex-end;flex-direction:column}.metrics{grid-template-columns:1fr 1fr}.layout{grid-template-columns:1fr}.access{grid-template-columns:1fr}.row{grid-template-columns:1fr}.actions{justify-content:flex-start}}
@media(max-width:560px){header{padding:14px 16px}.header-actions a{display:none}.theme-control{align-items:flex-end;flex-direction:column;gap:4px}main{margin:16px auto;padding:0 14px}.metrics{grid-template-columns:1fr}.title{align-items:stretch;flex-direction:column}.title select{width:100%}.card{padding:17px}}
`;

export const financePageJavaScript = `
const $=(id)=>document.getElementById(id);
const themeSelector=$('themeSelector');
const allowedThemes=new Set(['clean','modern','future','brand']);
function applyTheme(theme){const selected=allowedThemes.has(theme)?theme:'modern';document.documentElement.dataset.theme=selected;themeSelector.value=selected;try{localStorage.setItem('vero-theme',selected);}catch{}}
applyTheme(document.documentElement.dataset.theme||'modern');
themeSelector.addEventListener('change',()=>applyTheme(themeSelector.value));
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
