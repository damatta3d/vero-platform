import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

const page = (slug: string) => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Cardápio</title>
<style>
:root{--bg:#f7f4ef;--card:#fff;--ink:#201b17;--muted:#756b62;--accent:#7b201d;--line:#e8dfd6}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,"Segoe UI",Arial,sans-serif}.hero{min-height:190px;background:#2c211c center/cover;position:relative}.shade{position:absolute;inset:0;background:linear-gradient(transparent,rgba(0,0,0,.72))}.brand{position:absolute;left:20px;right:20px;bottom:20px;color:white}.brand h1{margin:0;font-size:28px}.brand p{margin:5px 0 0;opacity:.88}.wrap{max-width:820px;margin:auto}.categories{display:flex;gap:8px;overflow:auto;padding:14px 16px;position:sticky;top:0;background:rgba(247,244,239,.96);backdrop-filter:blur(10px);z-index:5;border-bottom:1px solid var(--line)}.categories a{white-space:nowrap;text-decoration:none;color:var(--ink);background:white;border:1px solid var(--line);padding:9px 13px;border-radius:999px;font-size:14px}.content{padding:4px 16px 100px}.category{scroll-margin-top:70px}.category h2{font-size:21px;margin:24px 0 4px}.category>p{margin:0 0 12px;color:var(--muted)}.item{display:grid;grid-template-columns:1fr 112px;gap:14px;padding:16px 0;border-bottom:1px solid var(--line)}.item h3{margin:0 0 6px;font-size:17px}.item p{margin:0 0 10px;color:var(--muted);font-size:14px;line-height:1.4}.price{font-weight:750}.photo{width:112px;height:94px;object-fit:cover;border-radius:13px;background:#e7ded5}.badge{display:inline-block;font-size:11px;background:#f0dfb6;padding:4px 7px;border-radius:8px;margin-bottom:7px}.unavailable{opacity:.52}.empty,.error{padding:48px 20px;text-align:center;color:var(--muted)}@media(min-width:700px){.hero{border-radius:0 0 22px 22px;min-height:260px}.item{grid-template-columns:1fr 160px}.photo{width:160px;height:120px}.content{padding-left:24px;padding-right:24px}}
</style></head><body><main class="wrap"><header id="hero" class="hero"><div class="shade"></div><div class="brand"><h1 id="name">Carregando cardápio…</h1><p id="description"></p></div></header><nav id="categories" class="categories"></nav><section id="content" class="content"><div class="empty">Preparando os pratos…</div></section></main>
<script>
const money=c=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){try{const r=await fetch('/v1/menu/${encodeURIComponent(slug)}');if(!r.ok)throw new Error('Cardápio indisponível');const m=await r.json();document.title=m.name+' · Cardápio';document.getElementById('name').textContent=m.name;document.getElementById('description').textContent=m.description||'Da nossa cozinha para sua mesa.';if(m.coverUrl)document.getElementById('hero').style.backgroundImage='url("'+encodeURI(m.coverUrl)+'")';const nav=document.getElementById('categories');nav.innerHTML=m.categories.map(c=>'<a href="#cat-'+esc(c.id)+'">'+esc(c.name)+'</a>').join('');const content=document.getElementById('content');content.innerHTML=m.categories.map(c=>'<section class="category" id="cat-'+esc(c.id)+'"><h2>'+esc(c.name)+'</h2>'+(c.description?'<p>'+esc(c.description)+'</p>':'')+(c.items.length?c.items.map(i=>'<article class="item '+(i.available?'':'unavailable')+'"><div>'+(i.featured?'<span class="badge">Destaque</span>':'')+'<h3>'+esc(i.name)+'</h3>'+(i.description?'<p>'+esc(i.description)+'</p>':'')+'<span class="price">'+money(i.priceCents)+'</span>'+(i.available?'':' · Esgotado')+'</div>'+(i.imageUrl?'<img class="photo" src="'+esc(i.imageUrl)+'" alt="'+esc(i.name)+'" loading="lazy">':'<div class="photo"></div>')+'</article>').join(''):'<div class="empty">Nenhum item disponível nesta categoria.</div>')+'</section>').join('');}catch(e){document.getElementById('content').innerHTML='<div class="error"><strong>Cardápio indisponível.</strong><br>Tente novamente em instantes.</div>';}}
load();
</script></body></html>`;

@Controller('menu')
export class PublicMenuPageController {
  @Get(':slug')
  @Header('content-type', 'text/html; charset=utf-8')
  @Header('cache-control', 'no-cache')
  show(@Param('slug') slug: string, @Res() reply: FastifyReply): void {
    void reply.send(page(slug));
  }
}
