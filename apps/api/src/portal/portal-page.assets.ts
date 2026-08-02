export const portalPageHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VERO · Santo Parma</title>
  <link rel="stylesheet" href="/portal.css">
</head>
<body>
  <header><div><strong>VERO</strong><span>Santo Parma</span></div><button id="clearAccess" class="secondary">Trocar acesso</button></header>
  <main>
    <section class="hero card">
      <div><small>PLATAFORMA DE GESTÃO</small><h1>Central VERO</h1><p>Use este endereço como entrada única. Todos os módulos abrem na mesma aba.</p></div>
      <div id="systemStatus" class="status pending">Verificando sistema…</div>
    </section>

    <section class="card access">
      <h2>Acesso</h2>
      <div class="grid">
        <label>Chave de acesso<input id="apiKey" type="password" autocomplete="current-password" placeholder="Informe a chave VERO"></label>
        <label>Empresa<input id="tenantId" value="santo-parma"></label>
        <button id="saveAccess">Salvar e validar</button>
      </div>
      <p id="accessMessage" class="message">A chave fica armazenada somente neste navegador.</p>
    </section>

    <section class="modules">
      <a href="/pedidos" class="module featured"><small>CENTRAL DE PEDIDOS</small><h2>Pedidos</h2><p>Receba e acompanhe pedidos do Anota AI, iFood e canais próprios em uma única fila.</p><span>Acessar →</span></a>
      <a href="/operacao" class="module"><small>ROTINA DIÁRIA</small><h2>Operação</h2><p>Receitas, despesas, canais e fechamento operacional.</p><span>Acessar →</span></a>
      <a href="/financeiro" class="module"><small>CONTROLE FINANCEIRO</small><h2>Financeiro</h2><p>Contas a pagar, contas a receber, baixas e saldos.</p><span>Acessar →</span></a>
      <a href="/mvp" class="module"><small>CUSTOS E ESTOQUE</small><h2>Gestão do restaurante</h2><p>Insumos, embalagens, fichas técnicas, estoque, produção e vendas.</p><span>Acessar →</span></a>
    </section>
  </main>
  <script src="/portal.js" defer></script>
</body>
</html>`;

export const portalPageCss = `
:root{--ink:#27231f;--muted:#746b62;--paper:#f5f0e8;--card:#fffdf9;--line:#ded4c8;--red:#a4382d;--green:#37664d}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:"Segoe UI",Roboto,Arial,Verdana,sans-serif}header{height:72px;background:#211d19;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 max(24px,calc((100% - 1180px)/2))}header div{display:flex;gap:14px;align-items:baseline}header strong{font-size:28px;font-weight:800;letter-spacing:.12em}header span{color:#cfc4b9}main{max-width:1180px;margin:28px auto;padding:0 22px}.card,.module{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 6px 24px #45351f0c}.hero{padding:28px;display:flex;justify-content:space-between;gap:24px;align-items:center}.hero h1{font-size:38px;font-weight:800;margin:6px 0}.hero p{margin:0;color:var(--muted)}small{color:var(--red);font-weight:800;letter-spacing:.1em}.status{padding:12px 16px;border-radius:999px;font-weight:700}.status.ok{background:#e5f1e9;color:var(--green)}.status.error{background:#f7e4e1;color:var(--red)}.status.pending{background:#eee8df;color:var(--muted)}.access{padding:24px;margin:18px 0}.access h2{margin-top:0}.grid{display:grid;grid-template-columns:2fr 1fr auto;gap:14px;align-items:end}label{font-size:13px;font-weight:700}input,button{width:100%;min-height:44px;margin-top:7px;border:1px solid var(--line);border-radius:9px;padding:10px 12px;font:inherit}button{background:var(--red);border:0;color:#fff;font-weight:800;cursor:pointer}.secondary{width:auto;background:transparent;border:1px solid #6e6258;margin:0}.message{color:var(--muted);margin-bottom:0}.message.ok{color:var(--green)}.message.error{color:var(--red)}.modules{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}.module{display:block;padding:24px;text-decoration:none;color:inherit;transition:.15s}.module.featured{border-color:#bf9b72;background:#fffaf3}.module:hover{transform:translateY(-2px);border-color:#bba99a}.module h2{font-size:24px;font-weight:800;margin:8px 0}.module p{color:var(--muted);min-height:48px}.module span{color:var(--red);font-weight:800}@media(max-width:760px){.hero{align-items:flex-start;flex-direction:column}.grid,.modules{grid-template-columns:1fr}.module p{min-height:auto}header span{display:none}}
`;

export const portalPageJavaScript = `
const tokenInput=document.querySelector('#apiKey');
const tenantInput=document.querySelector('#tenantId');
const accessMessage=document.querySelector('#accessMessage');
const systemStatus=document.querySelector('#systemStatus');

tokenInput.value=localStorage.getItem('vero_token')||'';
tenantInput.value=localStorage.getItem('vero_tenant')||'santo-parma';

function headers(){return {'authorization':'Bearer '+tokenInput.value.trim(),'x-tenant-id':tenantInput.value.trim()||'santo-parma'};}
async function checkSystem(){
  try{const response=await fetch('/health/ready',{cache:'no-store'});if(!response.ok)throw new Error();systemStatus.textContent='Sistema online';systemStatus.className='status ok';}
  catch{systemStatus.textContent='Sistema indisponível';systemStatus.className='status error';}
}
async function validateAccess(){
  const token=tokenInput.value.trim();const tenant=tenantInput.value.trim()||'santo-parma';
  if(!token){accessMessage.textContent='Informe a chave de acesso.';accessMessage.className='message error';return;}
  try{
    const response=await fetch('/v1/finance/summary',{headers:headers(),cache:'no-store'});
    if(!response.ok)throw new Error(response.status===401?'Chave inválida':'Falha '+response.status);
    localStorage.setItem('vero_token',token);localStorage.setItem('vero_tenant',tenant);
    accessMessage.textContent='Acesso validado. Use os módulos abaixo.';accessMessage.className='message ok';
  }catch(error){accessMessage.textContent=error.message||'Não foi possível validar o acesso.';accessMessage.className='message error';}
}
document.querySelector('#saveAccess').addEventListener('click',validateAccess);
document.querySelector('#clearAccess').addEventListener('click',()=>{localStorage.removeItem('vero_token');localStorage.removeItem('vero_tenant');tokenInput.value='';tenantInput.value='santo-parma';accessMessage.textContent='Acesso removido deste navegador.';accessMessage.className='message';tokenInput.focus();});
checkSystem();
if(tokenInput.value)validateAccess();
`;
