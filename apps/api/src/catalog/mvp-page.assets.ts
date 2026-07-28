export const mvpPageHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VERO · Santo Parma</title>
  <link rel="stylesheet" href="/mvp.css">
</head>
<body>
  <header>
    <div class="brand"><span>VERO</span><small>Santo Parma · Custos & Fichas Técnicas</small></div>
    <button id="refresh" class="secondary">Atualizar dados</button>
  </header>
  <main>
    <section class="access card">
      <div>
        <label for="apiKey">Chave de acesso</label>
        <input id="apiKey" type="password" autocomplete="current-password" placeholder="Sua chave segura">
      </div>
      <div>
        <label for="tenantId">Empresa</label>
        <input id="tenantId" value="santo-parma">
      </div>
      <p>A chave fica somente nesta aba e não é gravada no servidor.</p>
    </section>

    <section class="summary">
      <article class="metric"><small>Insumos</small><strong id="ingredientCount">0</strong></article>
      <article class="metric"><small>Produtos</small><strong id="productCount">0</strong></article>
      <article class="metric accent"><small>Custo do prato</small><strong id="currentCost">—</strong></article>
      <article class="metric"><small>Margem estimada</small><strong id="currentMargin">—</strong></article>
    </section>

    <nav>
      <button data-panel="ingredients" class="active">1. Insumos</button>
      <button data-panel="products">2. Produtos</button>
      <button data-panel="recipe">3. Ficha técnica</button>
    </nav>

    <section id="ingredients" class="panel active">
      <div class="card form-card">
        <div class="section-title"><div><small>PASSO 1</small><h2>Novo insumo</h2></div></div>
        <form id="ingredientForm" class="grid">
          <div class="wide"><label>Nome</label><input name="name" required placeholder="Ex.: Alcatra"></div>
          <div><label>Unidade da embalagem</label><select name="unit"><option value="KILOGRAM">Quilograma</option><option value="GRAM">Grama</option><option value="LITER">Litro</option><option value="MILLILITER">Mililitro</option><option value="UNIT">Unidade</option></select></div>
          <div><label>Quantidade comprada</label><input name="quantity" type="number" min="0.000001" step="0.001" required placeholder="1"></div>
          <div><label>Custo da embalagem (R$)</label><input name="cost" type="number" min="0" step="0.01" required placeholder="53,00"></div>
          <button type="submit">Salvar insumo</button>
        </form>
      </div>
      <div class="card"><h2>Insumos cadastrados</h2><div id="ingredientList" class="list empty">Nenhum insumo cadastrado.</div></div>
    </section>

    <section id="products" class="panel">
      <div class="card form-card">
        <div class="section-title"><div><small>PASSO 2</small><h2>Novo produto</h2></div></div>
        <form id="productForm" class="grid">
          <div class="wide"><label>Nome do prato</label><input name="name" required placeholder="Ex.: Parmegiana de Alcatra"></div>
          <div><label>Preço de venda (R$)</label><input name="price" type="number" min="0" step="0.01" required placeholder="44,90"></div>
          <button type="submit">Salvar produto</button>
        </form>
      </div>
      <div class="card"><h2>Produtos cadastrados</h2><div id="productList" class="list empty">Nenhum produto cadastrado.</div></div>
    </section>

    <section id="recipe" class="panel">
      <div class="card form-card">
        <div class="section-title"><div><small>PASSO 3</small><h2>Montar ficha técnica</h2></div></div>
        <form id="recipeForm">
          <div class="grid recipe-head">
            <div class="wide"><label>Produto</label><select id="recipeProduct" required></select></div>
            <div><label>Rendimento (porções)</label><input id="yieldUnits" type="number" min="1" step="1" value="1" required></div>
          </div>
          <p class="hint">Informe a quantidade de cada insumo usada na receita. Deixe zero para não incluir.</p>
          <div id="recipeLines" class="recipe-lines empty">Cadastre os insumos primeiro.</div>
          <button type="submit">Salvar ficha e calcular</button>
        </form>
      </div>
      <div id="costCard" class="card result hidden">
        <small>RESULTADO ATUAL</small><h2 id="costProduct">Produto</h2>
        <div class="result-grid"><div><span>Custo por porção</span><strong id="costPerUnit">—</strong></div><div><span>Preço de venda</span><strong id="salePrice">—</strong></div><div><span>Margem bruta</span><strong id="marginValue">—</strong></div><div><span>Margem %</span><strong id="marginPercent">—</strong></div></div>
      </div>
    </section>
    <div id="toast" role="status"></div>
  </main>
  <script src="/mvp.js" defer></script>
</body>
</html>`;

export const mvpPageCss = `
:root{--ink:#27231f;--muted:#766d64;--paper:#f5f0e8;--card:#fffdf9;--line:#ded4c8;--red:#a4382d;--red-dark:#74251e;--gold:#c88d3f;--green:#37664d}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}header{height:76px;padding:0 max(24px,calc((100% - 1180px)/2));display:flex;align-items:center;justify-content:space-between;background:#211d19;color:#fff}.brand{display:flex;align-items:center;gap:18px}.brand span{font-family:Georgia,serif;font-size:28px;letter-spacing:.12em}.brand small{color:#c9bdb0;border-left:1px solid #5b5149;padding-left:18px}main{max-width:1180px;margin:28px auto 60px;padding:0 24px}.card,.metric{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 5px 22px #55452d0b}.access{padding:18px;display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:18px;align-items:end}.access p{margin:0;color:var(--muted);font-size:13px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.metric{padding:18px 20px}.metric small{color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.metric strong{display:block;font:700 28px Georgia,serif;margin-top:8px}.metric.accent{background:var(--red);color:white;border-color:var(--red)}.metric.accent small{color:#f5dcd7}nav{display:flex;gap:6px;border-bottom:1px solid var(--line);margin:28px 0 18px}nav button{background:none;color:var(--muted);border:0;border-bottom:3px solid transparent;border-radius:0;padding:13px 18px}nav button.active{color:var(--red);border-color:var(--red)}.panel{display:none;grid-template-columns:1fr 1fr;gap:18px}.panel.active{display:grid}.card{padding:24px}.section-title small,.result>small{color:var(--red);font-weight:800;letter-spacing:.12em}h2{font:700 23px Georgia,serif;margin:5px 0 20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}.wide{grid-column:1/-1}label{display:block;font-size:13px;font-weight:700;margin-bottom:7px;color:#554d46}input,select{width:100%;min-height:44px;border:1px solid var(--line);border-radius:9px;background:white;color:var(--ink);padding:10px 12px;font:inherit}input:focus,select:focus{outline:3px solid #a4382d22;border-color:var(--red)}button{border:0;border-radius:9px;background:var(--red);color:white;min-height:42px;padding:10px 18px;font-weight:750;cursor:pointer}button:hover{background:var(--red-dark)}button.secondary{background:#423a34}.grid button{align-self:end}.list{display:grid;gap:8px}.list.empty,.recipe-lines.empty{color:var(--muted);padding:28px 0}.row{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #eee6dd}.row:last-child{border:0}.row strong{display:block}.row small{color:var(--muted)}.recipe-head{margin-bottom:18px}.hint{color:var(--muted);font-size:13px}.recipe-lines{margin:10px 0 22px;border-top:1px solid var(--line)}.recipe-line{display:grid;grid-template-columns:1fr 150px;align-items:center;gap:15px;padding:10px 0;border-bottom:1px solid #eee6dd}.recipe-line input{min-height:38px}.result{grid-column:1/-1;background:#26211d;color:#fff}.result-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.result-grid div{padding:16px;border:1px solid #554a42;border-radius:12px}.result-grid span{display:block;color:#c9bdb0;font-size:13px}.result-grid strong{display:block;font:700 25px Georgia,serif;margin-top:8px}.hidden{display:none!important}#toast{position:fixed;right:24px;bottom:24px;max-width:360px;padding:14px 18px;border-radius:10px;background:var(--green);color:#fff;box-shadow:0 8px 30px #0003;opacity:0;transform:translateY(10px);transition:.2s;pointer-events:none}#toast.show{opacity:1;transform:none}#toast.error{background:var(--red)}
@media(max-width:760px){header{height:auto;padding:16px 20px}.brand{display:block}.brand small{display:block;border:0;padding:3px 0}.summary{grid-template-columns:1fr 1fr}.access,.panel.active{grid-template-columns:1fr}.access{align-items:stretch}.grid{grid-template-columns:1fr}.wide{grid-column:auto}.result-grid{grid-template-columns:1fr 1fr}nav{overflow-x:auto}nav button{white-space:nowrap}.recipe-line{grid-template-columns:1fr 110px}}
`;

export const mvpPageJavaScript = `
const state={ingredients:[],products:[]};
const $=(id)=>document.getElementById(id);
const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
function headers(){return {'content-type':'application/json','authorization':'Bearer '+$('apiKey').value,'x-tenant-id':$('tenantId').value};}
async function api(path,options={}){const response=await fetch(path,{...options,headers:{...headers(),...(options.headers||{})}});if(!response.ok){throw new Error(response.status===401?'Acesso negado. Confira a chave e a empresa.':'Não foi possível concluir a operação.');}return response.json();}
function toast(message,error=false){const el=$('toast');el.textContent=message;el.className=error?'show error':'show';setTimeout(()=>el.className='',2800);}
function render(){
  $('ingredientCount').textContent=state.ingredients.length;$('productCount').textContent=state.products.length;
  $('ingredientList').className=state.ingredients.length?'list':'list empty';
  $('ingredientList').innerHTML=state.ingredients.length?state.ingredients.map(i=>'<div class="row"><div><strong>'+escapeHtml(i.name)+'</strong><small>'+escapeHtml(i.unit)+'</small></div><strong>'+money(i.packageCostCents)+'</strong></div>').join(''):'Nenhum insumo cadastrado.';
  $('productList').className=state.products.length?'list':'list empty';
  $('productList').innerHTML=state.products.length?state.products.map(p=>'<div class="row"><div><strong>'+escapeHtml(p.name)+'</strong><small>Preço de venda</small></div><strong>'+money(p.salePriceCents)+'</strong></div>').join(''):'Nenhum produto cadastrado.';
  $('recipeProduct').innerHTML=state.products.map(p=>'<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>').join('');
  $('recipeLines').className=state.ingredients.length?'recipe-lines':'recipe-lines empty';
  $('recipeLines').innerHTML=state.ingredients.length?state.ingredients.map(i=>'<div class="recipe-line"><label>'+escapeHtml(i.name)+'<small> · '+escapeHtml(i.unit)+'</small></label><input data-ingredient="'+i.id+'" type="number" min="0" step="0.001" value="0" aria-label="Quantidade usada"></div>').join(''):'Cadastre os insumos primeiro.';
}
function escapeHtml(value){const div=document.createElement('div');div.textContent=value;return div.innerHTML;}
async function refresh(){if(!$('apiKey').value)return;try{[state.ingredients,state.products]=await Promise.all([api('/v1/catalog/ingredients'),api('/v1/catalog/products')]);render();}catch(error){toast(error.message,true);}}
document.querySelectorAll('nav button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('nav button,.panel').forEach(el=>el.classList.remove('active'));button.classList.add('active');$(button.dataset.panel).classList.add('active');}));
$('refresh').addEventListener('click',refresh);$('apiKey').addEventListener('change',refresh);$('tenantId').addEventListener('change',refresh);
$('ingredientForm').addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);try{await api('/v1/catalog/ingredients',{method:'POST',body:JSON.stringify({name:data.get('name'),unit:data.get('unit'),packageQuantityMicros:Math.round(Number(data.get('quantity'))*1000000),packageCostCents:Math.round(Number(data.get('cost'))*100)})});event.currentTarget.reset();toast('Insumo salvo.');await refresh();}catch(error){toast(error.message,true);}});
$('productForm').addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);try{await api('/v1/catalog/products',{method:'POST',body:JSON.stringify({name:data.get('name'),salePriceCents:Math.round(Number(data.get('price'))*100)})});event.currentTarget.reset();toast('Produto salvo.');await refresh();}catch(error){toast(error.message,true);}});
$('recipeForm').addEventListener('submit',async(event)=>{event.preventDefault();const productId=$('recipeProduct').value;const lines=[...document.querySelectorAll('[data-ingredient]')].map(input=>({ingredientId:input.dataset.ingredient,quantityMicros:Math.round(Number(input.value)*1000000)})).filter(line=>line.quantityMicros>0);try{await api('/v1/catalog/products/'+productId+'/recipes',{method:'POST',body:JSON.stringify({yieldUnits:Number($('yieldUnits').value),lines})});const cost=await api('/v1/catalog/products/'+productId+'/cost');const product=state.products.find(item=>item.id===productId);$('costProduct').textContent=product?product.name:'Produto';$('costPerUnit').textContent=money(cost.costPerUnitCents);$('salePrice').textContent=money(cost.salePriceCents);$('marginValue').textContent=money(cost.marginCents);$('marginPercent').textContent=(cost.marginBasisPoints/100).toFixed(2).replace('.',',')+'%';$('currentCost').textContent=money(cost.costPerUnitCents);$('currentMargin').textContent=money(cost.marginCents);$('costCard').classList.remove('hidden');toast('Ficha técnica salva e calculada.');}catch(error){toast(error.message,true);}});
render();
`;
