// Visa Doo — server-rendered custom pages at /p/<slug>
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";
function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
async function fetchJson(url){ const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}}); if(!r.ok) return null; return await r.json(); }
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';

function shell(title, desc, canonical, body){
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'"><link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/styles.css">'+
    '<script src="/branding.js"></scr'+'ipt></head><body>'+
    '<header class="header"><div class="container nav"><a href="/" class="brand"><span class="logo">'+PLANE+'</span>Visa<b>Doo</b></a>'+
      '<div class="nav-actions"><a href="/app.html#track" class="btn btn-ghost">Track application</a><a href="/app.html" class="btn btn-primary">Sign in</a></div></div></header>'+
    body+
    '<footer class="footer"><div class="container footer-bottom">© '+new Date().getFullYear()+' Visa Doo. All rights reserved. · <a href="/">Home</a> · <a href="/articles">Articles</a></div></footer></body></html>';
}

export default async (request) => {
  const url=new URL(request.url);
  const parts=url.pathname.split("/").filter(Boolean); // ["p","<slug>"]
  const slug=parts[1]?decodeURIComponent(parts[1]):"";
  const rows = slug ? await fetchJson(SUPABASE_URL+"/rest/v1/pages?slug=eq."+encodeURIComponent(slug)+"&status=eq.published&select=*") : null;
  if(!rows || !rows.length){
    return new Response(shell("Page not found | Visa Doo","",SITE,
      '<div style="min-height:60vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">Page not found</h1><p style="color:#5b6b85;margin:12px 0 22px">This page doesn\'t exist.</p><a href="/" class="btn btn-primary btn-lg">Back to home</a></div></div>'),
      { status:404, headers:{ "content-type":"text/html; charset=utf-8" } });
  }
  const p=rows[0];
  const title=(p.seo_title&&p.seo_title.trim())||(p.title+' | Visa Doo');
  const desc=(p.seo_description&&p.seo_description.trim())||(p.title);
  const body='<article class="article-wrap"><div class="container article-inner">'+
    '<h1 class="article-title">'+esc(p.title)+'</h1>'+
    '<div class="article-body" style="margin-top:24px">'+(p.content||'')+'</div></div></article>';
  return new Response(shell(title, desc, SITE+"/p/"+p.slug, body), {
    headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
  });
};

export const config = { path: "/p/:slug" };
