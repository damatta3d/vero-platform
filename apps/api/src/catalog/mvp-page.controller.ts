import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { mvpPageCss, mvpPageHtml, mvpPageJavaScript } from './mvp-page.assets.js';

// prettier-ignore
const enhancedMvpPageCss = `${mvpPageCss}
body,input,select,button{font-family:"Segoe UI",Roboto,Arial,Verdana,sans-serif}h1,h2,h3,.brand span,.metric strong,.result-grid strong{font-family:"Segoe UI",Roboto,Arial,Verdana,sans-serif;letter-spacing:0}.brand span{font-weight:800}.metric strong,.result-grid strong{font-weight:750}.header-actions{display:flex;gap:10px;align-items:center}.access.hidden-access{display:none}.access p{grid-column:1/-1}.money-input{text-align:right;font-variant-numeric:tabular-nums}.item-actions{display:flex;gap:8px;align-items:center}.item-actions button{width:auto;margin:0;padding:8px 11px;font-size:12px}.item-actions .danger{background:#842b23}.item-actions .secondary{background:transparent;color:var(--red);border:1px solid var(--red)}.form-actions{display:flex;gap:10px}.form-actions button{flex:1}.hidden{display:none!important}@media(max-width:760px){.header-actions{width:100%}.header-actions button{flex:1}.item-actions{margin-top:10px}.list .row{align-items:flex-start;flex-direction:column}}
`;

// prettier-ignore
const enhancedMvpPageJavaScript = mvpPageJavaScript
  .replace(
    "const $=(id)=>document.getElementById(id);",
    `const $=(id)=>document.getElementById(id);
const ACCESS_TOKEN_KEY='vero_token';
const ACCESS_TENANT_KEY='vero_tenant';
const accessPanel=$('accessPanel');
const changeAccessButton=$('changeAccess');
const apiKeyInput=$('apiKey');
const tenantInput=$('tenantId');
let editingIngredientId=null;
apiKeyInput.value=localStorage.getItem(ACCESS_TOKEN_KEY)||'';
tenantInput.value=localStorage.getItem(ACCESS_TENANT_KEY)||'santo-parma';
function syncAccessPanel(){const hasAccess=apiKeyInput.value.trim().length>0;accessPanel.classList.toggle('hidden-access',hasAccess);changeAccessButton.textContent=hasAccess?'Alterar acesso':'Informar acesso';}
function persistAccess(){localStorage.setItem(ACCESS_TOKEN_KEY,apiKeyInput.value.trim());localStorage.setItem(ACCESS_TENANT_KEY,tenantInput.value.trim()||'santo-parma');syncAccessPanel();}
function decimalNumber(value){const normalized=String(value??'').trim().replace(/\\./g,'').replace(',','.');const number=Number(normalized);return Number.isFinite(number)?number:NaN;}
function ingredientQuantityMicros(value,unit){const quantity=decimalNumber(value);if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Informe uma quantidade válida.');if(unit==='UNIT'&&!Number.isInteger(quantity))throw new Error('Para unidade, informe somente números inteiros.');return Math.round(quantity*1000000);}
function resetIngredientForm(){editingIngredientId=null;const form=$('ingredientForm');form.reset();$('ingredientSubmit').textContent='Salvar item';$('ingredientCancel').classList.add('hidden');$('ingredientQuantity').placeholder='Ex.: 1,200 kg ou 100 unidades';}`
  )
  .replace(
    "async function api(path,options={}){const response=await fetch(path,{...options,headers:{...headers(),...(options.headers||{})}});if(!response.ok){throw new Error(response.status===401?'Acesso negado. Confira a chave e a empresa.':'Não foi possível concluir a operação.');}return response.json();}",
    "async function api(path,options={}){const response=await fetch(path,{...options,headers:{...headers(),...(options.headers||{})}});if(!response.ok){let detail='';try{detail=(await response.json()).message||'';}catch{}throw new Error(response.status===401?'Acesso negado. Confira a chave e a empresa.':detail||'Não foi possível concluir a operação.');}return response.status===204?null:response.json();}"
  )
  .replace(
    "const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);",
    `const money=(cents)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
const unitLabels={KILOGRAM:'kg',GRAM:'g',LITER:'L',MILLILITER:'mL',UNIT:'un.'};
function unitLabel(unit){return unitLabels[unit]||unit;}
function moneyToCents(value){const raw=String(value??'').trim().replace(/[^\\d,.-]/g,'');const normalized=raw.includes(',')?raw.replace(/\\./g,'').replace(',','.'):raw;const amount=Number(normalized);return Number.isFinite(amount)?Math.round(amount*100):0;}
function formatMoneyInput(input){if(!input.value.trim())return;input.value=(moneyToCents(input.value)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}`
  )
  .replaceAll('escapeHtml(i.unit)', 'unitLabel(i.unit)')
  .replace(
    "function formatQuantity(micros,unit){return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(micros/1000000)+' '+unit;}",
    "function formatQuantity(micros,unit){return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:3}).format(micros/1000000)+' '+unitLabel(unit);}"
  )
  .replace(
    "function formatUnitCost(micros,unit){return money(Math.round(micros/1000000))+'/'+unit;}",
    "function formatUnitCost(micros,unit){return money(Math.round(micros/1000000))+'/'+unitLabel(unit);}"
  )
  .replace(
    "$('ingredientList').innerHTML=state.ingredients.length?state.ingredients.map(i=>'<div class=\"row\"><div><strong>'+escapeHtml(i.name)+'</strong><small>'+(i.kind==='PACKAGING'?'Embalagem':'Insumo')+' · '+unitLabel(i.unit)+'</small></div><strong>'+money(i.packageCostCents)+'</strong></div>').join(''):'Nenhum item cadastrado.';",
    "$('ingredientList').innerHTML=state.ingredients.length?state.ingredients.map(i=>'<div class=\"row\"><div><strong>'+escapeHtml(i.name)+'</strong><small>'+(i.kind==='PACKAGING'?'Embalagem':'Insumo')+' · '+formatQuantity(i.packageQuantityMicros,i.unit)+' · '+money(i.packageCostCents)+'</small></div><div class=\"item-actions\"><button type=\"button\" class=\"secondary\" data-edit-ingredient=\"'+i.id+'\">Editar</button><button type=\"button\" class=\"danger\" data-delete-ingredient=\"'+i.id+'\">Excluir</button></div></div>').join(''):'Nenhum item cadastrado.';"
  )
  .replaceAll("Math.round(Number(data.get('cost'))*100)", "moneyToCents(data.get('cost'))")
  .replace("Math.round(Number(data.get('price'))*100)", "moneyToCents(data.get('price'))")
  .replace(
    "$('ingredientForm').addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);try{await api('/v1/catalog/ingredients',{method:'POST',body:JSON.stringify({name:data.get('name'),kind:data.get('kind'),unit:data.get('unit'),packageQuantityMicros:Math.round(Number(data.get('quantity'))*1000000),packageCostCents:moneyToCents(data.get('cost'))})});event.currentTarget.reset();toast(data.get('kind')==='PACKAGING'?'Embalagem salva.':'Insumo salvo.');await refresh();}catch(error){toast(error.message,true);}});",
    `$('ingredientForm').addEventListener('submit',async(event)=>{event.preventDefault();const data=new FormData(event.currentTarget);const unit=String(data.get('unit'));try{const body={name:data.get('name'),kind:data.get('kind'),unit,packageQuantityMicros:ingredientQuantityMicros(data.get('quantity'),unit),packageCostCents:moneyToCents(data.get('cost'))};await api(editingIngredientId?'/v1/catalog/ingredients/'+editingIngredientId:'/v1/catalog/ingredients',{method:editingIngredientId?'PATCH':'POST',body:JSON.stringify(body)});const wasEditing=Boolean(editingIngredientId);resetIngredientForm();await refresh();toast(wasEditing?'Item atualizado e lista recarregada.':'Item salvo e lista atualizada.');}catch(error){toast(error.message,true);}});
$('ingredientCancel').addEventListener('click',resetIngredientForm);
$('ingredientList').addEventListener('click',async event=>{const editButton=event.target.closest('[data-edit-ingredient]');const deleteButton=event.target.closest('[data-delete-ingredient]');if(editButton){const item=state.ingredients.find(entry=>entry.id===editButton.dataset.editIngredient);if(!item)return;editingIngredientId=item.id;const form=$('ingredientForm');form.elements.name.value=item.name;form.elements.kind.value=item.kind;form.elements.unit.value=item.unit;form.elements.quantity.value=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(item.packageQuantityMicros/1000000);form.elements.cost.value=(item.packageCostCents/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});$('ingredientSubmit').textContent='Salvar alterações';$('ingredientCancel').classList.remove('hidden');form.scrollIntoView({behavior:'smooth',block:'start'});return;}if(deleteButton){const item=state.ingredients.find(entry=>entry.id===deleteButton.dataset.deleteIngredient);if(!item||!confirm('Excluir '+item.name+'? Esta ação só será permitida se o item não tiver histórico ou vínculos.'))return;try{await api('/v1/catalog/ingredients/'+item.id,{method:'DELETE'});if(editingIngredientId===item.id)resetIngredientForm();await refresh();toast('Item excluído e lista atualizada.');}catch(error){toast(error.message,true);}}});`
  )
  .replace(
    "$('refresh').addEventListener('click',refresh);$('apiKey').addEventListener('change',refresh);$('tenantId').addEventListener('change',refresh);",
    `changeAccessButton.addEventListener('click',()=>{const opening=accessPanel.classList.contains('hidden-access');accessPanel.classList.toggle('hidden-access',!opening);changeAccessButton.textContent=opening?'Fechar acesso':'Alterar acesso';if(opening)apiKeyInput.focus();});
$('refresh').addEventListener('click',refresh);
apiKeyInput.addEventListener('change',async()=>{persistAccess();await refresh();});
tenantInput.addEventListener('change',async()=>{persistAccess();await refresh();});
document.querySelectorAll('.money-input').forEach(input=>{input.addEventListener('blur',()=>formatMoneyInput(input));input.addEventListener('focus',()=>input.select());});
syncAccessPanel();
refresh();`
  )
  .replaceAll(
    'type="number" min="0" step="0.001"',
    'type="number" min="0" max="9999" step="0.001"'
  );

// prettier-ignore
const enhancedMvpPageHtml = mvpPageHtml
  .replace(
    '<button id="refresh" class="secondary">Atualizar dados</button>',
    '<div class="header-actions"><button id="changeAccess" class="secondary" type="button">Alterar acesso</button><button id="refresh" class="secondary" type="button">Atualizar dados</button></div>'
  )
  .replace('<section class="access card">', '<section id="accessPanel" class="access card">')
  .replace(
    '<p>A chave fica somente nesta aba e não é gravada no servidor.</p>',
    '<p>Informe a chave uma única vez. Ela fica salva apenas neste navegador e pode ser alterada pelo botão ao lado de “Atualizar dados”.</p>'
  )
  .replace(
    '<div><label>Quantidade no pacote/compra</label><input name="quantity" type="number" min="0.000001" step="0.001" required placeholder="Ex.: 100"></div>',
    '<div><label>Quantidade no pacote/compra</label><input id="ingredientQuantity" name="quantity" type="text" inputmode="decimal" required placeholder="Ex.: 1,200 kg ou 100 unidades"></div>'
  )
  .replace(
    '<button type="submit">Salvar item</button>',
    '<div class="form-actions"><button id="ingredientSubmit" type="submit">Salvar item</button><button id="ingredientCancel" type="button" class="secondary hidden">Cancelar edição</button></div>'
  )
  .replaceAll(
    'name="quantity" type="number" min="0.000001" step="0.001"',
    'name="quantity" type="number" min="0.000001" max="9999" step="0.001" inputmode="decimal"'
  )
  .replaceAll(
    'name="quantity" type="number" min="1" step="1"',
    'name="quantity" type="number" min="1" max="9999" step="1" inputmode="numeric"'
  )
  .replaceAll(
    'name="cost" type="number"',
    'name="cost" type="text" inputmode="decimal" class="money-input"'
  )
  .replace(
    'name="price" type="number"',
    'name="price" type="text" inputmode="decimal" class="money-input"'
  )
  .replace('<link rel="stylesheet" href="/mvp.css">', `<style>${enhancedMvpPageCss}</style>`)
  .replace('<script src="/mvp.js" defer></script>', `<script>${enhancedMvpPageJavaScript}</script>`);

@Controller()
export class MvpPageController {
  @Get('mvp')
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  page(@Res() reply: FastifyReply): void {
    void reply.send(enhancedMvpPageHtml);
  }

  @Get('mvp.css')
  @Header('content-type', 'text/css; charset=utf-8')
  @Header('cache-control', 'no-store')
  stylesheet(@Res() reply: FastifyReply): void {
    void reply.send(enhancedMvpPageCss);
  }

  @Get('mvp.js')
  @Header('content-type', 'application/javascript; charset=utf-8')
  @Header('cache-control', 'no-store')
  script(@Res() reply: FastifyReply): void {
    void reply.send(enhancedMvpPageJavaScript);
  }
}
