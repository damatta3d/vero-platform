const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Cardápio · Santo Parma</title>
    <style>__CSS__</style>
  </head>
  <body>
    <header>
      <h1 id="menu-name">Cardápio</h1>
      <p id="menu-description"></p>
      <p id="store-status" class="store-status">Consultando horário…</p>
    </header>
    <main>
      <section id="catalog">Carregando…</section>
      <aside>
        <h2>Seu pedido</h2>
        <div id="cart-items"></div>
        <div class="coupon-box">
          <label>Cupom<input id="coupon-code" maxlength="64" autocomplete="off"></label>
          <div class="coupon-actions">
            <button id="apply-coupon" type="button">Aplicar</button>
            <button id="remove-coupon" class="secondary hidden" type="button">Remover</button>
          </div>
          <p id="coupon-message" class="coupon-message" aria-live="polite"></p>
        </div>
        <div class="totals">
          <span>Subtotal</span><span id="cart-subtotal">R$ 0,00</span>
          <span id="cart-discount-label" class="hidden">Desconto</span><span id="cart-discount" class="hidden"></span>
          <strong>Total</strong><strong id="cart-total">R$ 0,00</strong>
        </div>
        <p id="cart-availability"></p>
        <button id="continue" disabled>Continuar</button>
      </aside>
      <section id="checkout" class="hidden">
        <h2>Entrega, retirada e pagamento</h2>
        <label>Nome<input id="customer-name"></label>
        <label>Telefone<input id="customer-phone"></label>
        <label>E-mail para o PIX<input id="customer-email" type="email" autocomplete="email"></label>
        <label>Como receber<select id="fulfillment"></select></label>
        <label>Pagamento<select id="method"></select></label>
        <div id="address" class="hidden">
          <label>Rua<input id="street"></label>
          <label>Número<input id="number"></label>
          <label>Bairro<input id="district"></label>
          <label>CEP<input id="postal-code"></label>
          <label>Complemento<input id="complement"></label>
          <label>Referência<input id="reference"></label>
        </div>
        <label>Observações gerais<textarea id="order-note" maxlength="2000"></textarea></label>
        <p id="checkout-message"></p>
        <button id="finish">Finalizar pedido</button>
        <button id="back" class="secondary">Voltar</button>
      </section>
      <section id="success" class="hidden"></section>
    </main>
    <script>__SCRIPT__</script>
  </body>
</html>`;

const css = `
body{margin:0;background:#f6f0e8;color:#2c211d;font:15px system-ui}
header{padding:32px max(20px,calc((100% - 1080px)/2));background:#742a23;color:white}
.store-status{display:inline-block;margin:8px 0 0;padding:7px 10px;border-radius:999px;background:#ffffff20;font-weight:750}
.store-status.open{background:#2f6b48}.store-status.closed{background:#4f1d1d}
main{max-width:1080px;margin:24px auto;padding:0 20px;display:grid;grid-template-columns:1fr 340px;gap:20px}
aside,#checkout,#success,.item{background:#fff;border:1px solid #e2d5ca;border-radius:14px;padding:18px}
.category{margin-bottom:24px}.item{margin:10px 0;display:flex;gap:12px;align-items:center;justify-content:space-between}
.item-copy{flex:1}.item img{width:100px;height:80px;object-fit:cover;border-radius:10px}
button{padding:10px 14px;border:0;border-radius:9px;background:#8b3028;color:white;font-weight:700}
button:disabled{opacity:.45}.secondary,.qty button{background:#eee;color:#742a23}
.cart-line{padding:12px 0;border-bottom:1px solid #eee}.qty{display:flex;gap:8px;align-items:center}
textarea,input,select{width:100%;box-sizing:border-box;padding:10px;margin:5px 0 12px;border:1px solid #ddd;border-radius:8px;font:inherit}
.coupon-box{margin:16px 0;padding:14px;background:#f8f3ed;border-radius:10px}.coupon-actions{display:flex;gap:8px}
.coupon-message{margin:9px 0 0}.coupon-message.success{color:#2f6b48}.coupon-message.error{color:#9b1c1c}
.totals{display:grid;grid-template-columns:1fr auto;gap:8px;margin:16px 0}.totals strong{font-size:17px}
.pix-payment{margin:18px 0;padding:16px;border-radius:12px;background:#f8f3ed}.pix-payment img{display:block;width:min(280px,100%);margin:14px auto}.pix-code{font-family:monospace}
.hidden{display:none!important}#checkout,#success{grid-column:1/-1}.error,#cart-availability{color:#9b1c1c}
@media(max-width:760px){main{grid-template-columns:1fr}}
`;

const javascript = `
let menu=null,cart=[],appliedCoupon=null,couponValidation=0,lastPixCode='';
const key='vero_cart_'+encodeURIComponent(slug);
const $=id=>document.getElementById(id);
const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
function items(){return menu?menu.categories.flatMap(c=>c.items):[]}
function current(){return cart.map(l=>({l,i:items().find(i=>i.id===l.id)})).filter(x=>x.i&&x.l.quantity>0)}
function save(){localStorage.setItem(key,JSON.stringify(cart))}
function subtotal(){return current().reduce((sum,x)=>sum+x.i.priceCents*x.l.quantity,0)}
function orderItems(){return current().map(x=>({menuItemId:x.l.id,quantity:x.l.quantity,note:x.l.note||undefined}))}
function renderAvailability(){const c=menu?.checkout||{},message=c.statusMessage||'Loja temporariamente fechada';$('store-status').textContent=message;$('store-status').className='store-status '+(c.canAcceptOrders?'open':'closed');$('cart-availability').textContent=c.canAcceptOrders?'':message}
function renderTotals(itemsTotal,discount=0){$('cart-subtotal').textContent=money(itemsTotal);$('cart-discount').textContent='− '+money(discount);$('cart-discount').classList.toggle('hidden',!discount);$('cart-discount-label').classList.toggle('hidden',!discount);$('cart-total').textContent=money(itemsTotal-discount)}
function renderCart(){const x=current();$('cart-items').innerHTML=x.length?x.map(({l,i})=>'<div class="cart-line"><strong>'+esc(i.name)+'</strong><div class="qty"><button type="button" data-dec="'+esc(i.id)+'" aria-label="Diminuir quantidade">−</button><span>'+l.quantity+'</span><button type="button" data-inc="'+esc(i.id)+'" aria-label="Aumentar quantidade">+</button><span>'+money(i.priceCents*l.quantity)+'</span></div><textarea data-note="'+esc(i.id)+'" maxlength="1000" placeholder="Observação deste item">'+esc(l.note||'')+'</textarea></div>').join(''):'Carrinho vazio.';const total=subtotal();renderTotals(total,Math.min(total,appliedCoupon?.discountCents||0));$('continue').disabled=!x.length||!menu?.checkout?.canAcceptOrders||total<(menu?.checkout?.minimumOrderCents||0);save();if(appliedCoupon)void validateCoupon(true)}
function render(){$('menu-name').textContent=menu.name;$('menu-description').textContent=menu.description||'';$('catalog').innerHTML=menu.categories.map(c=>'<section class="category"><h2>'+esc(c.name)+'</h2>'+c.items.map(i=>'<article class="item">'+(i.imageUrl?'<img src="'+esc(i.imageUrl)+'" alt="">':'')+'<div class="item-copy"><strong>'+esc(i.name)+'</strong><p>'+esc(i.description||'')+'</p><b>'+money(i.priceCents)+'</b></div><button type="button" data-add="'+esc(i.id)+'">Adicionar</button></article>').join('')+'</section>').join('');renderAvailability();renderCart()}
function configure(){const c=menu.checkout||{};$('fulfillment').innerHTML=(c.pickupEnabled?'<option value="PICKUP">Retirar no restaurante</option>':'')+(c.deliveryEnabled?'<option value="DELIVERY">Receber por entrega</option>':'');$('method').innerHTML=(c.paymentOnDeliveryEnabled?'<option value="PAY_ON_DELIVERY">Pagar ao receber</option>':'')+(c.pixEnabled?'<option value="PIX">PIX</option>':'');$('finish').disabled=!$('fulfillment').options.length||!$('method').options.length;syncAddress();syncPayment()}
function syncAddress(){$('address').classList.toggle('hidden',$('fulfillment').value!=='DELIVERY')}
function syncPayment(){$('customer-email').required=$('method').value==='PIX'}
function secureKey(){if(!globalThis.crypto||typeof globalThis.crypto.getRandomValues!=='function')throw new Error('Seu navegador não oferece geração segura para finalizar o pedido.');const bytes=new Uint8Array(32);globalThis.crypto.getRandomValues(bytes);return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('')}
async function msg(response,fallback){try{const payload=await response.json();return Array.isArray(payload.message)?payload.message.join(', '):payload.message||fallback}catch{return fallback}}
function deliveryAddress(){if($('fulfillment').value!=='DELIVERY')return null;const address={street:$('street').value.trim(),number:$('number').value.trim(),district:$('district').value.trim(),postalCode:$('postal-code').value.trim()||undefined,complement:$('complement').value.trim()||undefined,reference:$('reference').value.trim()||undefined};if(!address.street||!address.number||!address.district)throw new Error('Informe rua, número e bairro.');return address}
function clearCoupon(message=''){appliedCoupon=null;couponValidation+=1;$('coupon-message').textContent=message;$('coupon-message').className='coupon-message';$('remove-coupon').classList.add('hidden');renderTotals(subtotal())}
async function validateCoupon(silent=false){const code=$('coupon-code').value.trim();if(!code){clearCoupon();return false}const validation=++couponValidation;$('apply-coupon').disabled=true;if(!silent){$('coupon-message').textContent='Validando cupom…';$('coupon-message').className='coupon-message'}try{const response=await fetch('/v1/checkout/price',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({menuSlug:slug,couponCode:code,items:orderItems()})});if(!response.ok)throw new Error(await msg(response,'Cupom inválido.'));const pricing=await response.json();if(validation!==couponValidation)return false;if(!pricing.coupon)throw new Error('Cupom inválido.');appliedCoupon={code:pricing.coupon.code,discountCents:pricing.discountCents};$('coupon-code').value=pricing.coupon.code;$('coupon-message').textContent='Cupom '+pricing.coupon.code+' aplicado.';$('coupon-message').className='coupon-message success';$('remove-coupon').classList.remove('hidden');renderTotals(pricing.itemsTotalCents,pricing.discountCents);return true}catch(error){if(validation!==couponValidation)return false;appliedCoupon=null;$('coupon-message').textContent=error instanceof Error?error.message:'Cupom inválido.';$('coupon-message').className='coupon-message error';$('remove-coupon').classList.add('hidden');renderTotals(subtotal());return false}finally{if(validation===couponValidation)$('apply-coupon').disabled=false}}
async function finish(){const button=$('finish'),customer={name:$('customer-name').value.trim(),phone:$('customer-phone').value.trim(),email:$('customer-email').value.trim()||undefined};button.disabled=true;try{if(!menu?.checkout?.canAcceptOrders)throw new Error(menu?.checkout?.statusMessage||'A loja não está aceitando pedidos agora.');if(!customer.name||!customer.phone)throw new Error('Informe nome e telefone.');const fulfillment=$('fulfillment').value,method=$('method').value,address=deliveryAddress(),orderNote=$('order-note').value.trim()||undefined,orderLines=orderItems(),idempotencyKey=secureKey(),couponCode=appliedCoupon?.code;if(method==='PIX'&&!customer.email)throw new Error('Informe um e-mail válido para gerar o PIX.');const draft={menuSlug:slug,couponCode,customer,fulfillment,address,orderNote,items:orderLines};const validation=await fetch('/v1/checkout/validate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(draft)});if(!validation.ok)throw new Error(await msg(validation,'Revise o pedido.'));const paymentResponse=await fetch('/v1/payments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...draft,checkoutId:idempotencyKey,method})});if(!paymentResponse.ok)throw new Error(await msg(paymentResponse,'Pagamento indisponível.'));const payment=await paymentResponse.json();if(['FAILED','CANCELLED','REFUNDED','CHARGED_BACK'].includes(payment.status))throw new Error('O pagamento não foi aprovado. Tente novamente.');const orderResponse=await fetch('/v1/orders/native',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...draft,idempotencyKey,payment:{method:payment.method,paymentId:payment.paymentId}})});if(!orderResponse.ok)throw new Error(await msg(orderResponse,'Não foi possível criar o pedido.'));const order=await orderResponse.json();cart=[];$('coupon-code').value='';clearCoupon();renderCart();$('checkout').classList.add('hidden');lastPixCode=payment.pixCopyPaste||'';const pix=payment.method==='PIX'?'<section class="pix-payment"><h3>Aguardando pagamento</h3><p>Valor: <strong>'+money(payment.amountCents)+'</strong></p>'+(payment.qrCodeUrl?'<img src="'+esc(payment.qrCodeUrl)+'" alt="QR Code PIX">':'')+(lastPixCode?'<label>PIX copia e cola<input class="pix-code" readonly value="'+esc(lastPixCode)+'"></label><button type="button" data-copy-pix>Copiar código PIX</button>':'')+'<p>A confirmação será atualizada automaticamente.</p></section>':'';$('success').innerHTML='<h2>'+(order.orderNumber?'Pedido #'+esc(order.orderNumber):'Pedido recebido')+'</h2><p>Pedido recebido com sucesso.</p>'+pix+'<a href="/pedido/'+encodeURIComponent(order.orderId)+'?token='+encodeURIComponent(order.trackingToken)+'">Acompanhar pedido</a>';$('success').classList.remove('hidden')}catch(error){$('checkout-message').textContent=error instanceof Error?error.message:'Não foi possível finalizar o pedido.';$('checkout-message').className='error'}finally{button.disabled=false}}
document.addEventListener('click',event=>{const add=event.target.closest('[data-add]'),inc=event.target.closest('[data-inc]'),dec=event.target.closest('[data-dec]');if(add){const line=cart.find(x=>x.id===add.dataset.add);line?line.quantity++:cart.push({id:add.dataset.add,quantity:1,note:''});renderCart()}if(inc){const line=cart.find(x=>x.id===inc.dataset.inc);if(line){line.quantity++;renderCart()}}if(dec){const line=cart.find(x=>x.id===dec.dataset.dec);if(line){line.quantity--;if(line.quantity<1)cart=cart.filter(x=>x!==line);renderCart()}}})
document.addEventListener('input',event=>{if(event.target.matches('[data-note]')){const line=cart.find(x=>x.id===event.target.dataset.note);if(line){line.note=event.target.value;save()}}})
$('continue').onclick=()=>{if(!menu?.checkout?.canAcceptOrders){$('checkout-message').textContent=menu?.checkout?.statusMessage||'A loja não está aceitando pedidos agora.';return}configure();$('checkout').classList.remove('hidden')}
$('back').onclick=()=>$('checkout').classList.add('hidden')
$('fulfillment').onchange=syncAddress
$('method').onchange=syncPayment
$('finish').onclick=finish
$('success').onclick=async event=>{const copy=event.target.closest('[data-copy-pix]');if(!copy||!lastPixCode)return;try{await navigator.clipboard.writeText(lastPixCode);copy.textContent='Código copiado'}catch{$('checkout-message').textContent='Não foi possível copiar automaticamente. Selecione o código acima.'}}
$('apply-coupon').onclick=()=>validateCoupon()
$('remove-coupon').onclick=()=>{$('coupon-code').value='';clearCoupon('Cupom removido.')}
$('coupon-code').addEventListener('input',()=>clearCoupon())
try{cart=JSON.parse(localStorage.getItem(key)||'[]')}catch{cart=[]}
fetch('/v1/menu/'+encodeURIComponent(slug),{cache:'no-store'}).then(response=>response.ok?response.json():Promise.reject(new Error('Cardápio indisponível.'))).then(payload=>{menu=payload;render()}).catch(error=>$('catalog').innerHTML='<p class="error">'+esc(error.message)+'</p>')
`;

export function publicMenuPage(slug: string): string {
  const safe = JSON.stringify(slug).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');
  return html.replace('__CSS__', css).replace('__SCRIPT__', `const slug=${safe};${javascript}`);
}
