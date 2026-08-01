export const financePageHtml = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VERO Finance</title>
<style>
body{font-family:Arial,sans-serif;margin:0;background:#f6f3ee;color:#241f1a}.wrap{max-width:980px;margin:auto;padding:24px}.card{background:#fff;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 8px 24px #0001}h1{margin-top:0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.metric{background:#f0ebe3;border-radius:12px;padding:16px}.metric b{display:block;font-size:1.4rem;margin-top:6px}label{display:block;margin:10px 0 4px}input,select,button{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #cfc5b8}button{background:#241f1a;color:#fff;border:0;margin-top:14px;font-weight:700}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #eee}.actions button{width:auto;padding:7px 10px;margin:2px}.muted{color:#776f66;font-size:.9rem}
</style>
</head>
<body><main class="wrap">
<div class="card"><h1>VERO Finance</h1><p class="muted">Contas a pagar e receber do Santo Parma</p><div class="grid" id="summary"></div></div>
<div class="card"><h2>Novo lançamento</h2><form id="form"><div class="row"><div><label>Tipo</label><select name="type"><option value="RECEIVABLE">A receber</option><option value="PAYABLE">A pagar</option></select></div><div><label>Valor</label><input name="amount" type="number" min="0.01" step="0.01" required></div></div><label>Descrição</label><input name="description" required maxlength="256"><div class="row"><div><label>Categoria</label><input name="category" required maxlength="120"></div><div><label>Vencimento</label><input name="dueDate" type="date" required></div></div><label>Contraparte</label><input name="counterparty" maxlength="160"><button type="submit">Salvar lançamento</button></form></div>
<div class="card"><h2>Lançamentos</h2><table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Status</th><th>Vencimento</th><th></th></tr></thead><tbody id="entries"></tbody></table></div>
</main>
<script>
const cfg={token:localStorage.getItem('vero_token')||'',tenant:localStorage.getItem('vero_tenant')||'santo-parma'};
if(!cfg.token){cfg.token=prompt('Chave de acesso VERO')||'';localStorage.setItem('vero_token',cfg.token)}
const headers={'content-type':'application/json','authorization':'Bearer '+cfg.token,'x-tenant-id':cfg.tenant};
const money=v=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
async function api(path,options={}){const r=await fetch(path,{...options,headers});if(!r.ok)throw new Error('Falha '+r.status);return r.json()}
async function load(){const [s,e]=await Promise.all([api('/v1/finance/summary'),api('/v1/finance')]);document.querySelector('#summary').innerHTML=[['A receber',s.receivableOpenInCents],['A pagar',s.payableOpenInCents],['Recebido',s.receivedInCents],['Pago',s.paidInCents],['Saldo projetado',s.projectedBalanceInCents],['Saldo realizado',s.realizedBalanceInCents]].map(x=>'<div class="metric">'+x[0]+'<b>'+money(x[1])+'</b></div>').join('');document.querySelector('#entries').innerHTML=e.map(x=>{const p=x.props||x.snapshot||x;return '<tr><td>'+p.description+'</td><td>'+(p.type==='RECEIVABLE'?'Receber':'Pagar')+'</td><td>'+money(p.amountInCents)+'</td><td>'+p.status+'</td><td>'+new Date(p.dueDate).toLocaleDateString('pt-BR')+'</td><td class="actions">'+(p.status==='OPEN'?'<button onclick="act(\''+p.id+'\',\'settle\')">Baixar</button><button onclick="act(\''+p.id+'\',\'cancel\')">Cancelar</button>':'')+'</td></tr>'}).join('')}
async function act(id,a){await api('/v1/finance/'+id+'/'+a,{method:'PATCH'});await load()}
document.querySelector('#form').addEventListener('submit',async ev=>{ev.preventDefault();const f=new FormData(ev.target);await api('/v1/finance',{method:'POST',body:JSON.stringify({type:f.get('type'),description:f.get('description'),category:f.get('category'),amountInCents:Math.round(Number(f.get('amount'))*100),dueDate:f.get('dueDate'),counterparty:f.get('counterparty')||null})});ev.target.reset();await load()});
load().catch(e=>alert(e.message));
</script></body></html>`;
