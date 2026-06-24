// Visa Doo — server-rendered country pages (/country/<slug>): lists that country's visas
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
async function fetchJson(url){ const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}}); if(!r.ok) return null; return await r.json(); }

// ---- currency (single active currency chosen in the backend) ----
const CCY_SYMBOLS={AED:"AED",USD:"$",EUR:"€",GBP:"£",INR:"₹",QAR:"QAR"};
function resolveActive(settings){
  const s=(settings&&settings[0])||{};
  const code=(s.active_currency||"AED").toUpperCase();
  let sym=CCY_SYMBOLS[code]||code;
  const list=s.currencies;
  if(Array.isArray(list)) list.forEach(function(c){ if(c&&String(c.code).toUpperCase()===code&&c.symbol) sym=c.symbol; });
  return { code:code, symbol:sym };
}
function fmtMoney(n, sym){ if(n==null||n==="") return ""; const s=Number(n).toLocaleString("en-US"); return sym.length>1?(sym+" "+s):(sym+s); }
function priceText(row, active){ return (row.prices&&row.prices[active.code]!=null&&row.prices[active.code]!=="")?fmtMoney(row.prices[active.code],active.symbol):fmtMoney(row.price_aed,"AED"); }
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function flag(iso2){ return iso2 ? ('https://flagcdn.com/w320/'+iso2.toLowerCase()+'.png') : ''; }

function visaCard(v, active){
  var feats=(v.features||[]).slice(0,4).map(function(f){return '<li>'+CHECK+esc(f)+'</li>';}).join('');
  var cat = v.category ? '<div class="vsub">'+esc(v.category)+'</div>' : '';
  return '<div class="vcard">'+
    '<h3>'+esc(v.name)+'</h3>'+cat+
    '<div class="price">'+esc(priceText(v, active))+' <small>/ visa</small></div>'+
    (v.blurb?'<p class="blurb">'+esc(v.blurb)+'</p>':'')+
    '<ul>'+feats+'</ul>'+
    '<a href="/app.html?visa='+encodeURIComponent(v.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+
    '<a href="/visa/'+encodeURIComponent(v.slug)+'" style="display:block;text-align:center;margin-top:12px;font-weight:600;font-size:14px;color:var(--blue-600)">View details &amp; requirements →</a>'+
  '</div>';
}

// Brand colour palette — must match branding.js applyColor() so first paint is the saved colour (no flash).
function shade(hex,p){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex.split("").map(function(c){return c+c;}).join(""); if(hex.length!==6) return "#"+hex; var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16); var t=p<0?0:255,a=Math.abs(p)/100; r=Math.round((t-r)*a+r); g=Math.round((t-g)*a+g); b=Math.round((t-b)*a+b); return "#"+[r,g,b].map(function(v){return ("0"+v.toString(16)).slice(-2);}).join(""); }
function brandVars(p){ if(!p) return ""; return '<style id="brand-vars">:root{--blue-600:'+p+';--blue-700:'+shade(p,-14)+';--blue-900:'+shade(p,-34)+';--blue-500:'+shade(p,8)+';--blue-400:'+shade(p,24)+';--blue-100:'+shade(p,82)+';--sky-50:'+shade(p,93)+';}</style>'; }
// Logo / favicon — same site-wide for every request; matches branding.js so first paint is correct (no flash).
var LOGO="", FAVICON="", APPICON="", BNAME="Visa Doo";
function brandMark(){ return LOGO ? ('<img src="'+esc(LOGO)+'" alt="'+esc(BNAME||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">') : ('<span class="logo">'+PLANE+'</span>Visa<b>Doo</b>'); }
function iconTags(){ var t = FAVICON ? ('<link rel="icon" href="'+esc(FAVICON)+'">') : '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'; if(APPICON||LOGO) t += '<link rel="apple-touch-icon" href="'+esc(APPICON||LOGO)+'">'; return t; }

function pageHtml(c, visas, defaultImg, active, brandColor){
  var title=(c.seo_title&&c.seo_title.trim())||(c.name+' Visas — Apply Online | Visa Doo');
  var desc=(c.seo_description&&c.seo_description.trim())||(c.summary||('Apply online for your '+c.name+' visa with Visa Doo. Tourist and business visas, document upload and live tracking.')).slice(0,160);
  var canonical=SITE+'/country/'+c.slug;
  var ogImage=c.social_image||defaultImg||'';
  var cards = visas.length ? visas.map(function(v){return visaCard(v, active);}).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>Visa options for '+esc(c.name)+' are coming soon. <a href="/#contact" style="color:var(--blue-600);font-weight:700">Contact us</a> and we\'ll help.</p></div>';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    (ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">':'')+
    '<meta name="twitter:card" content="summary_large_image">'+
    iconTags()+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css">'+
    brandVars(brandColor)+
    '<script src="/branding.js"></scr'+'ipt>'+
    '</head><body>'+
    '<header class="header"><div class="container nav">'+
      '<a href="/" class="brand">'+brandMark()+'</a>'+
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
  const settings=await fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=default_social_image,active_currency,currencies,brand_color,logo_url,favicon_url,app_icon_url,brand_name");
  const defaultImg=(settings&&settings[0]&&settings[0].default_social_image)||"";
  const active=resolveActive(settings);
  const brandColor=(settings&&settings[0]&&settings[0].brand_color)||"";
  const ss0=(settings&&settings[0])||{};
  LOGO=ss0.logo_url||""; FAVICON=ss0.favicon_url||""; APPICON=ss0.app_icon_url||""; BNAME=ss0.brand_name||"Visa Doo";

  return new Response(pageHtml(c, visas, defaultImg, active, brandColor), {
    headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
  });
};

export const config = { path: "/country/:slug" };
