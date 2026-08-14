const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#742a23">
  <title>Cardápio · Santo Parma</title>
  <style>__CSS__</style>
</head>
<body>
  <header class="hero">
    <div class="hero-content">
      <img id="logo" class="logo hidden" alt="Logo da loja">
      <div><p class="eyebrow">DA NOSSA COZINHA PRA SUA MESA</p><h1 id="menu-name">Cardápio</h1><p id="menu-description" class="muted"></p></div>
    </div>
  </header>
  <main class="layout">
    <section id="catalog" aria-live="polite"><p class="loading">Carregando cardápio…</p></section>
    <aside class="cart panel" aria-labelledby="cart-title">
      <h2 id="cart-title">Seu pedido</h2>
      <div id="cart-items"></div>
      <div class="cart-total"><span>Total dos itens</span><strong id="cart-total">R$ 0,00</strong></div>
      <button id="continue" class="primary" type="button" disabled>Continuar</button>
    </aside>
    <section id="checkout" class="panel checkout hidden" aria-labelledby="checkout-title">
      <div class="section-heading"><div><p class="eyebrow">FINALIZAÇÃO</p><h2 id="checkout-title">Retirada e pagamento</h2></div><button id="back" class="link-button" type="button">Voltar ao carrinho</button></div>
      <div class="checkout-grid">
        <label>Seu nome<input id="customer-name" autocomplete="name" maxlength="120" required></label>
        <label>Telefone<input id="customer-phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="32" required></label>
        <label>Como receber<select id="fulfillment"><option value="PICKUP">Retirar no restaurante</option></select></label>
        <label>Pagamento<select id="method"><option value="PAY_ON_DELIVERY">Pagar na retirada</option></select></label>
      </div>
      <p class="notice">Entrega e PIX não estão liberados neste ambiente. Nenhuma cobrança externa será criada.</p>
      <div id="checkout-message" class="message" role="status"></div>
      <button id="finish" class="primary" type="button">Finalizar pedido</button>
    </section>
    <section id="success" class="panel success hidden" aria-live="polite"></section>
  </main>
  <script>__SCRIPT__</script>
</body>
</html>`;

const css = `
:root{--ink:#2c211d;--muted:#776b64;--paper:#f6f0e8;--card:#fffdfa;--line:#e2d5ca;--red:#8b3028;--red-dark:#67221d;--gold:#c69245;--green:#38664d}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}.hero{min-height:190px;padding:40px max(22px,calc((100% - 1120px)/2));display:flex;align-items:end;color:#fff;background:linear-gradient(120deg,#381a17,#7b2822)}.hero-content{display:flex;gap:18px;align-items:center}.logo{width:78px;height:78px;object-fit:cover;background:#fff;border:3px solid #ffffffaa;border-radius:50%}.eyebrow{margin:0 0 6px;font-size:11px;font-weight:850;letter-spacing:.12em;color:var(--gold)}h1,h2,h3,p{margin-top:0}h1{margin-bottom:6px;font:750 clamp(30px,6vw,48px) Georgia,serif}.hero .muted{margin:0;color:#eee1d7}.layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;max-width:1120px;margin:24px auto 60px;padding:0 20px}.panel,.item{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 5px 22px #4b33200b}.category{margin-bottom:28px}.category-heading h2{margin-bottom:5px;font:750 26px Georgia,serif}.category-heading p{margin-bottom:14px}.items{display:grid;gap:12px}.item{display:grid;grid-template-columns:112px minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px}.item.no-image{grid-template-columns:minmax(0,1fr) auto}.item-image{width:112px;height:92px;object-fit:cover;border-radius:12px}.item-copy h3{margin-bottom:6px;font-size:17px}.item-copy p{margin-bottom:8px;font-size:14px}.price{font-weight:800}.featured{display:inline-block;margin-bottom:7px;padding:4px 7px;font-size:10px;font-weight:850;color:#6c4210;background:#f8e8c7;border-radius:999px}.sold-out{font-weight:800;color:var(--muted)}button{min-height:44px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer;border:0;border-radius:10px}.primary,.add-button{color:#fff;background:var(--red)}.primary:hover,.add-button:hover{background:var(--red-dark)}button:disabled{cursor:not-allowed;opacity:.5}.cart{position:sticky;top:18px;align-self:start;padding:20px}.cart h2{font:750 23px Georgia,serif}.empty,.muted,.loading{color:var(--muted)}.cart-line{padding:14px 0;border-top:1px solid var(--line)}.cart-line:first-child{border-top:0}.cart-line-head,.cart-total,.section-heading{display:flex;gap:12px;align-items:center;justify-content:space-between}.quantity{display:flex;gap:8px;align-items:center;margin:10px 0}.quantity button,.remove,.link-button{min-height:38px;color:var(--red);background:transparent;border:1px solid var(--line)}.quantity button{width:38px;padding:0}.remove{padding:7px 10px;font-size:12px}.note{width:100%;min-height:42px;padding:9px 10px;resize:vertical;font:inherit;border:1px solid var(--line);border-radius:9px}.cart-total{margin:12px 0 16px;padding-top:15px;border-top:1px solid var(--line)}.cart .primary,.checkout .primary{width:100%}.checkout,.success{grid-column:1/-1;padding:24px}.checkout-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}label{display:grid;gap:7px;font-size:13px;font-weight:750}input,select{width:100%;min-height:46px;padding:10px 12px;font:inherit;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:9px}.notice,.message{margin:18px 0;padding:12px;border-radius:10px;background:#f1e8de;color:var(--muted)}.message:empty{display:none}.message.error{color:#842b23;background:#f8e2df}.success{text-align:center}.success a{display:inline-block;margin-top:12px;color:var(--red);font-weight:850}.hidden{display:none!important}@media(max-width:820px){.layout{grid-template-columns:1fr}.cart{position:static}.item{grid-template-columns:88px minmax(0,1fr)}.item.no-image{grid-template-columns:1fr}.item-image{width:88px;height:82px}.item .add-button,.item .sold-out{grid-column:1/-1;width:100%}.checkout-grid{grid-template-columns:1fr}}@media(max-width:480px){.hero{min-height:155px;padding-top:26px;padding-bottom:26px}.layout{padding:0 12px;margin-top:14px}.item,.cart,.checkout,.success{padding:16px}.section-heading{align-items:flex-start;flex-direction:column}.link-button{width:100%}}
`;

const javascript = `
let menu=null;
let cart=[];
const key='vero_cart_'+encodeURIComponent(slug);
const byId=(id)=>document.getElementById(id);
const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function allItems(){return menu?menu.categories.flatMap((category)=>category.items):[];}
function itemById(id){return allItems().find((item)=>item.id===id);}
function persist(){localStorage.setItem(key,JSON.stringify(cart));}
function restore(){try{const value=JSON.parse(localStorage.getItem(key)||'[]');cart=Array.isArray(value)?value:[];}catch{cart=[];}}
function lines(){return cart.map((line)=>({line,item:itemById(line.id)})).filter(({line,item})=>item&&item.available&&line.quantity>0);}
function renderCart(){cart=lines().map(({line})=>line);persist();const current=lines();byId('cart-items').innerHTML=current.length?current.map(({line,item})=>'<article class="cart-line"><div class="cart-line-head"><strong>'+escapeHtml(item.name)+'</strong><button class="remove" type="button" data-remove="'+escapeHtml(item.id)+'">Remover</button></div><div class="quantity"><button type="button" aria-label="Diminuir quantidade" data-decrease="'+escapeHtml(item.id)+'">−</button><strong>'+line.quantity+'</strong><button type="button" aria-label="Aumentar quantidade" data-increase="'+escapeHtml(item.id)+'">+</button><span>'+money(item.priceCents*line.quantity)+'</span></div><textarea class="note" maxlength="240" placeholder="Observação do item" aria-label="Observação de '+escapeHtml(item.name)+'" data-note="'+escapeHtml(item.id)+'">'+escapeHtml(line.note||'')+'</textarea></article>').join(''):'<p class="empty">Seu carrinho está vazio.</p>';const total=current.reduce((sum,{line,item})=>sum+item.priceCents*line.quantity,0);byId('cart-total').textContent=money(total);byId('continue').disabled=!current.length;}
function renderCatalog(){byId('menu-name').textContent=menu.name;byId('menu-description').textContent=menu.description||'';if(menu.logoUrl){byId('logo').src=menu.logoUrl;byId('logo').classList.remove('hidden');}byId('catalog').innerHTML=menu.categories.map((category)=>'<section class="category"><div class="category-heading"><h2>'+escapeHtml(category.name)+'</h2>'+(category.description?'<p class="muted">'+escapeHtml(category.description)+'</p>':'')+'</div><div class="items">'+category.items.map((item)=>'<article class="item '+(item.imageUrl?'':'no-image')+'">'+(item.imageUrl?'<img class="item-image" src="'+escapeHtml(item.imageUrl)+'" alt="'+escapeHtml(item.name)+'" loading="lazy">':'')+'<div class="item-copy">'+(item.featured?'<span class="featured">DESTAQUE</span>':'')+'<h3>'+escapeHtml(item.name)+'</h3>'+(item.description?'<p class="muted">'+escapeHtml(item.description)+'</p>':'')+'<span class="price">'+money(item.priceCents)+'</span></div>'+(item.available?'<button class="add-button" type="button" data-add="'+escapeHtml(item.id)+'">Adicionar</button>':'<span class="sold-out">Esgotado</span>')+'</article>').join('')+'</div></section>').join('')||'<p class="empty">Nenhum item disponível neste cardápio.</p>';}
function add(id){const item=itemById(id);if(!item||!item.available)return;const line=cart.find((entry)=>entry.id===id);if(line)line.quantity+=1;else cart.push({id,quantity:1,note:''});renderCart();}
function change(id,delta){const line=cart.find((entry)=>entry.id===id);if(!line)return;line.quantity+=delta;if(line.quantity<1)cart=cart.filter((entry)=>entry.id!==id);renderCart();}
function checkoutLines(){return lines().map(({line})=>({menuItemId:line.id,quantity:line.quantity,note:line.note||undefined}));}
async function errorMessage(response,fallback){try{const payload=await response.json();return Array.isArray(payload.message)?payload.message.join(', '):payload.message||fallback;}catch{return fallback;}}
async function finish(){const button=byId('finish');const message=byId('checkout-message');const customer={name:byId('customer-name').value.trim(),phone:byId('customer-phone').value.trim()};if(!customer.name||!customer.phone){message.textContent='Informe seu nome e telefone.';message.className='message error';return;}button.disabled=true;message.textContent='Validando seu pedido…';message.className='message';const idempotencyKey=crypto.randomUUID()+crypto.randomUUID();const orderLines=checkoutLines();try{const checkout=await fetch('/v1/checkout/validate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({menuSlug:slug,customer,fulfillment:'PICKUP',address:null,items:orderLines})});if(!checkout.ok)throw new Error(await errorMessage(checkout,'Revise os itens do pedido.'));const paymentResponse=await fetch('/v1/payments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({checkoutId:idempotencyKey,menuSlug:slug,method:'PAY_ON_DELIVERY',customerName:customer.name,customerPhone:customer.phone,items:orderLines.map((line)=>({menuItemId:line.menuItemId,quantity:line.quantity}))})});if(!paymentResponse.ok)throw new Error(await errorMessage(paymentResponse,'Não foi possível preparar o pagamento.'));const payment=await paymentResponse.json();const orderResponse=await fetch('/v1/orders/native',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idempotencyKey,menuSlug:slug,customer,fulfillment:'PICKUP',items:orderLines,payment:{method:payment.method,status:payment.status,paymentId:payment.paymentId}})});if(!orderResponse.ok)throw new Error(await errorMessage(orderResponse,'Não foi possível criar o pedido.'));const order=await orderResponse.json();cart=[];persist();renderCart();byId('checkout').classList.add('hidden');byId('success').innerHTML='<p class="eyebrow">PEDIDO RECEBIDO</p><h2>Pedido #'+escapeHtml(order.orderId.slice(0,8))+'</h2><p>Acompanhe o preparo sem expor seus dados.</p><a href="/pedido/'+encodeURIComponent(order.orderId)+'?token='+encodeURIComponent(order.trackingToken)+'">Acompanhar pedido</a>';byId('success').classList.remove('hidden');byId('success').scrollIntoView({behavior:'smooth'});}catch(error){message.textContent=error instanceof Error?error.message:'Não foi possível finalizar o pedido.';message.className='message error';}finally{button.disabled=false;}}
document.addEventListener('click',(event)=>{const addButton=event.target.closest('[data-add]');const increase=event.target.closest('[data-increase]');const decrease=event.target.closest('[data-decrease]');const remove=event.target.closest('[data-remove]');if(addButton)add(addButton.dataset.add);if(increase)change(increase.dataset.increase,1);if(decrease)change(decrease.dataset.decrease,-1);if(remove){cart=cart.filter((entry)=>entry.id!==remove.dataset.remove);renderCart();}});
document.addEventListener('input',(event)=>{if(!event.target.matches('[data-note]'))return;const line=cart.find((entry)=>entry.id===event.target.dataset.note);if(line){line.note=event.target.value;persist();}});
byId('continue').addEventListener('click',()=>{byId('checkout').classList.remove('hidden');byId('checkout').scrollIntoView({behavior:'smooth'});});
byId('back').addEventListener('click',()=>{byId('checkout').classList.add('hidden');byId('cart-title').scrollIntoView({behavior:'smooth'});});
byId('finish').addEventListener('click',finish);
restore();
fetch('/v1/menu/'+encodeURIComponent(slug)).then(async(response)=>{if(!response.ok)throw new Error();menu=await response.json();renderCatalog();renderCart();}).catch(()=>{byId('catalog').innerHTML='<p class="message error">Cardápio indisponível no momento.</p>';});
`;

function safeJson(value: string): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
}

export function publicMenuPage(slug: string): string {
  return html
    .replace('__CSS__', css)
    .replace('__SCRIPT__', `const slug=${safeJson(slug)};${javascript}`);
}
