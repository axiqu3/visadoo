// Visa Doo — server-rendered country pages (/country/<slug>): lists that country's visas
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
async function fetchJson(url){ const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}}); if(!r.ok) return null; return await r.json(); }
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function flag(iso2){ return iso2 ? ('https://flagcdn.com/w320/'+iso2.toLowerCase()+'.png') : ''; }

function visaCard(v){
  var feats=(v.features||[]).slice(0,4).map(function(f){return '<li>'+CHECK+esc(f)+'</li>';}).join('');
  var cat = v.category ? '<div class="vsub">'+esc(v.category)+'</div>' : '';
  return '<div class="vcard">'+
    '<h3>'+esc(v.name)+'</h3>'+cat+
    '<div class="price">AED '+esc(v.price_aed)+' <small>/ visa</small></div>'+
    (v.blurb?'<p class="blurb">'+esc(v.blurb)+'</p>':'')+
    '<ul>'+feats+'</ul>'+
    '<a href="/app.html?visa='+encodeURIComponent(v.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+
    '<a href="/visa/'+encodeURIComponent(v.slug)+'" style="display:block;text-align:center;margin-top:12px;font-weight:600;font-size:14px;color:var(--blue-600)">View details &amp; requirements →</a>'+
  '</div>';
}

function pageHtml(c, visas, defaultImg){
  var title=(c.seo_title&&c.seo_title.trim())||(c.name+' Visas — Apply Online | Visa Doo');
  var desc=(c.seo_description&&c.seo_description.trim())||(c.summary||('Apply online for your '+c.name+' visa with Visa Doo. Tourist and business visas, document upload and live tracking.')).slice(0,160);
  var canonical=SITE+'/country/'+c.slug;
  var ogImage=c.social_image||defaultImg||'';
  var cards = visas.length ? visas.map(visaCard).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>Visa options for '+esc(c.name)+' are coming soon. <a href="/#contact" style="color:var(--blue-600);font-weight:700">Contact us</a> and we\'ll help.</p></div>';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    (ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">':'')+
    '<meta name="twitter:card" content="summary_large_image">'+
    '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css">'+
    '<script src="/branding.js"></scr'+'ipt>'+
    '</head><body>'+
    '<header class="header"><div class="container nav">'+
      '<a href="/" class="brand"><span class="logo">'+PLANE+'</span>Visa<b>Doo</b></a>'+
      '<div class="nav-actions"><a href="/app.html#track" class="btn btn-ghost">Track application</a><a href="/app.html" class="btn btn-primary">Sign in</a></div>'+
    '</div></header>'+
    '<section class="hero sky"><div class="container" style="text-align:center;padding:54px 0 30px;max-width:760px">'+
      (c.iso2?'<img src="'+flag(c.iso2)+'" alt="'+esc(c.name)+' flag" style="width:84px;height:56px;object-fit:cover;border-radius:8px;box-shadow:var(--shadow-sm);margin-bottom:18px">':'')+
      '<a href="/#destinations" style="display:block;color:var(--blue-600);font-weight:600;font-size:14px;margin-bottom:10px">← All destinations</a>'+
      '<h1 style="font-size:clamp(30px,4.6vw,46px);font-weight:800">'+esc(c.name)+' Visas</h1>'+
      '<p class="sub" style="font-size:18px;color:var(--muted);margin:16px auto 0;max-width:560px">'+esc(c.summary||('Apply online for your '+c.name+' visa — tourist and business options, document upload and live tracking.'))+'</p>'+
    '</div></section>'+
    '<section class="section" style="padding-top:40px"><div class="container">'+
      '<div class="cards">'+cards+'</div>'+
    '</div></section>'+
    '<footer class="footer"><div class="container footer-bottom">© '+new Date().getFullYear()+' Visa Doo. All rights reserved. · <a href="/">Home</a> · <a href="/articles">Articles</a></div></footer>'+
    '</body></html>';
}

function notFound(){
  return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Destination not found | Visa Doo</title><link rel="stylesheet" href="/styles.css"></head><body>'+
    '<div style="min-height:70vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">Destination not found</h1>'+
    '<p style="color:#5b6b85;margin:12px 0 22px">We don\'t have this destination yet.</p><a href="/" class="btn btn-primary btn-lg">Browse destinations</a></div></div></body></html>',
    { status:404, headers:{ "content-type":"text/html; charset=utf-8" } });
}

export default async (request) => {
  const url=new URL(request.url);
  const parts=url.pathname.split("/").filter(Boolean); // ["country","<slug>"]
  const slug=parts[1]?decodeURIComponent(parts[1]):"";
  if(!slug) return notFound();

  const countries=await fetchJson(SUPABASE_URL+"/rest/v1/countries?slug=eq."+encodeURIComponent(slug)+"&active=eq.true&select=*");
  if(!countries||!countries.length) return notFound();
  const c=countries[0];
  const visas=await fetchJson(SUPABASE_URL+"/rest/v1/visa_types?country_slug=eq."+encodeURIComponent(slug)+"&active=eq.true&order=sort_order&select=*")||[];
  const settings=await fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=default_social_image");
  const defaultImg=(settings&&settings[0]&&settings[0].default_social_image)||"";

  return new Response(pageHtml(c, visas, defaultImg), {
    headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
  });
};

export const config = { path: "/country/:slug" };
