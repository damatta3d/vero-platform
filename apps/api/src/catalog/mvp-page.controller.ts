import { Controller, Get, Header, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { mvpPageCss, mvpPageHtml, mvpPageJavaScript } from './mvp-page.assets.js';

// prettier-ignore
const enhancedMvpPageCss = `${mvpPageCss}
body,input,select,button{font-family:"Segoe UI",Roboto,Arial,Verdana,sans-serif}h1,h2,h3,.brand span,.metric strong,.result-grid strong{font-family:"Segoe UI",Roboto,Arial,Verdana,sans-serif;letter-spacing:0}.brand span{font-weight:800}.metric strong,.result-grid strong{font-weight:750}.header-actions{display:flex;gap:10px;align-items:center}.access.hidden-access{display:none}.access p{grid-column:1/-1}.money-input{text-align:right;font-variant-numeric:tabular-nums}@media(max-width:760px){.header-actions{width:100%}.header-actions button{flex:1}}
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
apiKeyInput.value=localStorage.getItem(ACCESS_TOKEN_KEY)||'';
tenantInput.value=localStorage.getItem(ACCESS_TENANT_KEY)||'santo-parma';
function syncAccessPanel(){const hasAccess=apiKeyInput.value.trim().length>0;accessPanel.classList.toggle('hidden-access',hasAccess);changeAccessButton.textContent=hasAccess?'Alterar acesso':'Informar acesso';}
function persistAccess(){localStorage.setItem(ACCESS_TOKEN_KEY,apiKeyInput.value.trim());localStorage.setItem(ACCESS_TENANT_KEY,tenantInput.value.trim()||'santo-parma');syncAccessPanel();}`
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
  .replaceAll("Math.round(Number(data.get('cost'))*100)", "moneyToCents(data.get('cost'))")
  .replace("Math.round(Number(data.get('price'))*100)", "moneyToCents(data.get('price'))")
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
