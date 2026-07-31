export const operationsPageHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VERO · Operação Santo Parma</title>
  <style>
    :root{--bg:#f5f0e8;--card:#fffdf9;--ink:#29241f;--muted:#746a61;--line:#ded4c8;--red:#9f352b;--green:#37664d;--gold:#bd8437}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,sans-serif}
    header{background:#211d19;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}
    header h1{font:700 26px Georgia,serif;margin:0}header small{color:#cfc3b8}
    main{max-width:1180px;margin:24px auto;padding:0 18px 48px}.grid{display:grid;gap:16px}.access{grid-template-columns:1fr 1fr 1fr;align-items:end}
    .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 6px 24px #4f402914}
    label{display:block;font-size:13px;font-weight:700;margin-bottom:6px;color:#554d46}input,select,textarea,button{font:inherit}
    input,select,textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:10px 12px;background:#fff;color:var(--ink)}textarea{min-height:80px;resize:vertical}
    button{border:0;border-radius:9px;background:var(--red);color:#fff;padding:11px 16px;font-weight:700;cursor:pointer}button.secondary{background:#4f473f}
    .metrics{grid-template-columns:repeat(5,minmax(140px,1fr));margin:16px 0}.metric small{display:block;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}.metric strong{display:block;font:700 26px Georgia,serif;margin-top:7px}.metric.balance{background:#2d4f3d;color:#fff}.metric.balance small{color:#d7e7dd}
    .content{grid-template-columns:1.05fr 1.35fr}.form{grid-template-columns:1fr 1fr}.wide{grid-column:1/-1}h2{font:700 22px Georgia,serif;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-size:12px;text-transform:uppercase}.income{color:var(--green);font-weight:700}.outflow{color:var(--red);font-weight:700}.neutral{color:var(--muted);font-weight:700}.status{font-size:12px;padding:3px 8px;border-radius:99px;background:#eee}.empty{color:var(--muted);padding:16px 0}.message{margin-top:12px;font-weight:700}.error{color:var(--red)}.success{color:var(--green)}
    @media(max-width:850px){.access,.metrics,.content,.form{grid-template-columns:1fr}.wide{grid-column:auto}header{align-items:flex-start;gap:12px;flex-direction:column}.table-wrap{overflow:auto}}
  </style>
</head>
<body>
<header><div><h1>VERO · Santo Parma</h1><small>Operação diária de agosto</small></div><button id="refresh" class="secondary">Atualizar</button></header>
<main>
  <section class="card grid access">
    <div><label>Chave de acesso</label><input id="apiKey" type="password" placeholder="Chave do MVP"></div>
    <div><label>Empresa</label><input id="tenantId" value="santo-parma"></div>
    <div><label>Período</label><div class="grid" style="grid-template-columns:1fr 1fr"><input id="from" type="date"><input id="to" type="date"></div></div>
  </section>

  <section class="grid metrics">
    <article class="card metric"><small>Entradas pagas</small><strong id="income">R$ 0,00</strong></article>
    <article class="card metric"><small>Saídas pagas</small><strong id="outflow">R$ 0,00</strong></article>
    <article class="card metric"><small>Pendências</small><strong id="pending">R$ 0,00</strong></article>
    <article class="card metric"><small>Pedidos</small><strong id="orders">0</strong></article>
    <article class="card metric balance"><small>Saldo preliminar</small><strong id="balance">R$ 0,00</strong></article>
  </section>

  <section class="grid content">
    <article class="card">
      <h2>Novo lançamento</h2>
      <form id="entryForm" class="grid form">
        <div><label>Tipo</label><select name="type"><option value="INCOME">Receita</option><option value="EXPENSE">Despesa</option><option value="PURCHASE">Compra</option><option value="WITHDRAWAL">Retirada</option><option value="ADJUSTMENT">Ajuste neutro</option></select></div>
        <div><label>Status</label><select name="status"><option value="PAID">Pago/recebido</option><option value="PENDING">Pendente</option></select></div>
        <div><label>Canal</label><select name="channel"><option value="">Não se aplica</option><option value="IFOOD">iFood</option><option value="ANOTA_AI">Anota AI</option><option value="PIX">Pix</option><option value="CASH">Dinheiro</option><option value="OTHER">Outro</option></select></div>
        <div><label>Valor (R$)</label><input name="amount" type="number" min="0.01" step="0.01" required></div>
        <div><label>Categoria</label><input name="category" required placeholder="Ex.: Faturamento iFood"></div>
        <div><label>Pedidos</label><input name="orderCount" type="number" min="0" step="1" value="0"></div>
        <div class="wide"><label>Descrição</label><input name="description" required placeholder="Ex.: Fechamento diário do iFood"></div>
        <div><label>Fornecedor/contraparte</label><input name="counterparty" placeholder="Ex.: Assaí"></div>
        <div><label>Forma de pagamento</label><input name="paymentMethod" placeholder="Ex.: Pix, cartão"></div>
        <div><label>Data do lançamento</label><input name="occurredAt" type="date" required></div>
        <div><label>Competência</label><input name="competenceDate" type="date" required></div>
        <div class="wide"><label>Observações</label><textarea name="notes" placeholder="Estoque para mês seguinte, número da nota etc."></textarea></div>
        <button type="submit" class="wide">Salvar lançamento</button>
      </form>
      <div id="message" class="message"></div>
    </article>

    <article class="card">
      <h2>Lançamentos do período</h2>
      <div class="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Status</th><th>Valor</th></tr></thead><tbody id="entries"><tr><td colspan="5" class="empty">Nenhum lançamento carregado.</td></tr></tbody></table></div>
    </article>
  </section>
</main>
<script>
const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const today=new Date();const start=new Date(today.getFullYear(),today.getMonth(),1);const end=new Date(today.getFullYear(),today.getMonth()+1,1);
const iso=(d)=>d.toISOString().slice(0,10);document.querySelector('#from').value=iso(start);document.querySelector('#to').value=iso(end);
document.querySelector('[name=occurredAt]').value=iso(today);document.querySelector('[name=competenceDate]').value=iso(today);
const headers=()=>({'content-type':'application/json','authorization':'Bearer '+document.querySelector('#apiKey').value,'x-tenant-id':document.querySelector('#tenantId').value});
const range=()=>{const from=document.querySelector('#from').value;const to=document.querySelector('#to').value;return '?from='+encodeURIComponent(from+'T00:00:00.000Z')+'&to='+encodeURIComponent(to+'T00:00:00.000Z')};
const appendCell=(row,value,className)=>{const cell=document.createElement('td');if(className)cell.className=className;cell.textContent=String(value);row.appendChild(cell);return cell};
const renderEmpty=(body,message)=>{body.replaceChildren();const row=document.createElement('tr');const cell=document.createElement('td');cell.colSpan=5;cell.className='empty';cell.textContent=message;row.appendChild(cell);body.appendChild(row)};
const renderEntries=(body,list)=>{body.replaceChildren();for(const entry of list){const row=document.createElement('tr');appendCell(row,new Date(entry.occurredAt).toLocaleDateString('pt-BR'));appendCell(row,entry.type);const descriptionCell=document.createElement('td');const strong=document.createElement('strong');strong.textContent=entry.description;const details=document.createElement('small');details.textContent=entry.category+(entry.channel?' · '+entry.channel:'');descriptionCell.append(strong,document.createElement('br'),details);row.appendChild(descriptionCell);const statusCell=document.createElement('td');const status=document.createElement('span');status.className='status';status.textContent=entry.status;statusCell.appendChild(status);row.appendChild(statusCell);const isIncome=entry.type==='INCOME';const isNeutral=entry.type==='ADJUSTMENT';appendCell(row,(isIncome?'+ ':isNeutral?'':'- ')+money(entry.amountCents),isNeutral?'neutral':isIncome?'income':'outflow');body.appendChild(row)}};
async function load(){const message=document.querySelector('#message');message.textContent='';try{const [summaryRes,listRes]=await Promise.all([fetch('/v1/operations/summary'+range(),{headers:headers()}),fetch('/v1/operations'+range()+'&limit=200',{headers:headers()})]);if(!summaryRes.ok||!listRes.ok)throw new Error('Confira a chave de acesso e o período.');const summary=await summaryRes.json();const list=await listRes.json();document.querySelector('#income').textContent=money(summary.incomeCents);document.querySelector('#outflow').textContent=money(summary.outflowCents);document.querySelector('#pending').textContent=money(summary.pendingCents);document.querySelector('#orders').textContent=summary.orderCount;document.querySelector('#balance').textContent=money(summary.balanceCents);const body=document.querySelector('#entries');if(list.length)renderEntries(body,list);else renderEmpty(body,'Nenhum lançamento no período.');}catch(error){message.className='message error';message.textContent=error instanceof Error?error.message:'Erro ao carregar dados.'}}
document.querySelector('#refresh').addEventListener('click',load);
document.querySelector('#entryForm').addEventListener('submit',async(event)=>{event.preventDefault();const form=new FormData(event.currentTarget);const payload={type:form.get('type'),status:form.get('status'),channel:form.get('channel')||null,category:form.get('category'),description:form.get('description'),counterparty:form.get('counterparty')||null,paymentMethod:form.get('paymentMethod')||null,amountCents:Math.round(Number(form.get('amount'))*100),orderCount:Number(form.get('orderCount')||0),occurredAt:String(form.get('occurredAt'))+'T12:00:00.000Z',competenceDate:String(form.get('competenceDate'))+'T12:00:00.000Z',notes:form.get('notes')||null};const message=document.querySelector('#message');try{const response=await fetch('/v1/operations',{method:'POST',headers:headers(),body:JSON.stringify(payload)});if(!response.ok)throw new Error('Não foi possível salvar. Revise os campos.');message.className='message success';message.textContent='Lançamento salvo com sucesso.';event.currentTarget.reset();document.querySelector('[name=occurredAt]').value=iso(today);document.querySelector('[name=competenceDate]').value=iso(today);document.querySelector('[name=orderCount]').value='0';await load();}catch(error){message.className='message error';message.textContent=error instanceof Error?error.message:'Erro ao salvar.'}});
</script>
</body>
</html>`;
