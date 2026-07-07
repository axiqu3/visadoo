// Visa Doo — server-rendered Articles (list at /articles, single at /article/<slug>)
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
async function fetchJson(url){ const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}}); if(!r.ok) return null; return await r.json(); }
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';

// Brand colour palette — same site-wide for every request; matches branding.js applyColor() to prevent the colour flash.
var BRAND = "";
function shade(hex,p){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex.split("").map(function(c){return c+c;}).join(""); if(hex.length!==6) return "#"+hex; var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16); var t=p<0?0:255,a=Math.abs(p)/100; r=Math.round((t-r)*a+r); g=Math.round((t-g)*a+g); b=Math.round((t-b)*a+b); return "#"+[r,g,b].map(function(v){return ("0"+v.toString(16)).slice(-2);}).join(""); }
function brandVars(p){ if(!p) return ""; return '<style id="brand-vars">:root{--blue-600:'+p+';--blue-700:'+shade(p,-14)+';--blue-900:'+shade(p,-34)+';--blue-500:'+shade(p,8)+';--blue-400:'+shade(p,24)+';--blue-100:'+shade(p,82)+';--sky-50:'+shade(p,93)+';}</style>'; }
var LOGO="", FAVICON="", APPICON="", BNAME="Visa Doo";
function brandMark(){ return LOGO ? ('<img src="'+esc(LOGO)+'" alt="'+esc(BNAME||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">') : ('<span class="logo">'+PLANE+'</span>Visa<b>Doo</b>'); }
function iconTags(){ var t = FAVICON ? ('<link rel="icon" href="'+esc(FAVICON)+'">') : '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'; if(APPICON||LOGO) t += '<link rel="apple-touch-icon" href="'+esc(APPICON||LOGO)+'">'; return t; }

function head(title, desc, canonical, ogImage, jsonld, ogAlt){
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="article"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'">'+
    '<meta property="og:url" content="'+esc(canonical)+'">'+(ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">'+(ogAlt?'<meta property="og:image:alt" content="'+esc(ogAlt)+'">':''):'')+
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'">'+(ogImage?'<meta name="twitter:image" content="'+esc(ogImage)+'">'+(ogAlt?'<meta name="twitter:image:alt" content="'+esc(ogAlt)+'">':''):'')+
    iconTags()+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css">'+
    brandVars(BRAND)+
    '<script src="/branding.js"></scr'+'ipt>'+
    (jsonld?('<script type="application/ld+json">'+JSON.stringify(jsonld)+'</scr'+'ipt>'):'')+
    '</head><body>'+
    '<header class="header"><div class="container nav">'+
      '<a href="/" class="brand">'+brandMark()+'</a>'+
      '<div class="nav-actions"><a href="/articles" class="btn btn-ghost">All articles</a><a href="/app.html" class="btn btn-primary">Apply now</a></div>'+
    '</div></header>';
}
function foot(){
  return '<footer class="footer"><div class="container footer-bottom">© '+new Date().getFullYear()+' Visa Doo. All rights reserved. · <a href="/">Home</a> · <a href="/articles">Articles</a></div></footer></body></html>';
}

function listPage(rows, defaultImg){
  const cards = rows.length ? rows.map(function(a){
    const img = a.cover_image || a.social_image;
    const alt = a.cover_alt || a.title || '';
    return '<a class="art-card" href="/article/'+esc(a.slug)+'">'+
      '<div class="art-cover"'+(img?(' style="background-image:url('+esc(img)+')" role="img" aria-label="'+esc(alt)+'"'):'')+'>'+(img?'':PLANE)+'</div>'+
      '<div class="art-card-body"><h3>'+esc(a.title)+'</h3><p>'+esc(a.excerpt||'')+'</p>'+
      '<span class="art-readmore">Read more →</span></div></a>';
  }).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>No articles published yet. Check back soon.</p></div>';
  return head('UAE Visa Guides & Articles | Visa Doo',
    'Helpful guides and tips on UAE tourist visas — requirements, processing times, and how to apply online with Visa Doo.',
    SITE+'/articles', defaultImg||'', null)+
    '<section class="section"><div class="container">'+
      '<div class="center"><span class="eyebrow">Visa Doo Journal</span><h2>UAE visa guides &amp; articles</h2>'+
      '<p class="lead">Everything you need to know about visiting the UAE — explained simply.</p></div>'+
      '<div class="art-grid">'+cards+'</div>'+
    '</div></section>'+foot();
}

function articlePage(a, defaultImg){
  const title = (a.seo_title && a.seo_title.trim()) || (a.title + ' | Visa Doo');
  const desc = (a.seo_description && a.seo_description.trim()) || (a.excerpt || a.title).slice(0,160);
  const canonical = SITE+'/article/'+a.slug;
  const ogImage = a.social_image || a.cover_image || defaultImg || '';
  const date = a.published_at ? new Date(a.published_at) : new Date(a.created_at);
  const dateStr = date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const jsonld = { "@context":"https://schema.org","@type":"Article","headline":a.title,"description":desc,
    "datePublished":date.toISOString(),"image":ogImage,"author":{"@type":"Organization","name":"Visa Doo"},
    "publisher":{"@type":"Organization","name":"Visa Doo"},"mainEntityOfPage":canonical };
  const coverAlt = a.cover_alt || a.title || '';
  return head(title, desc, canonical, ogImage, jsonld, coverAlt)+
    '<article class="article-wrap"><div class="container article-inner">'+
      '<a href="/articles" class="art-back">← All articles</a>'+
      '<h1 class="article-title">'+esc(a.title)+'</h1>'+
      '<div class="article-meta">'+esc(dateStr)+' · Visa Doo</div>'+
      (a.cover_image?('<div class="article-cover"><img src="'+esc(a.cover_image)+'" alt="'+esc(coverAlt)+'" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"></div>'):'')+
      '<div class="article-body">'+(a.content||'')+'</div>'+
      '<div class="article-cta"><h3>Ready to apply for your UAE visa?</h3>'+
        '<a href="/app.html" class="btn btn-primary btn-lg">Start my application</a></div>'+
    '</div></article>'+foot();
}

function notFound(){
  return new Response(head('Article not found | Visa Doo','', SITE, SITE+'/og-default.png', null)+
    '<div style="min-height:50vh;display:grid;place-items:center;text-align:center;padding:40px"><div>'+
    '<h1 style="font-size:30px">Article not found</h1><p style="color:#5b6b85;margin:12px 0 22px">This article doesn\'t exist or hasn\'t been published.</p>'+
    '<a href="/articles" class="btn btn-primary btn-lg">See all articles</a></div></div>'+foot(),
    { status:404, headers:{ "content-type":"text/html; charset=utf-8" } });
}

export default async (request) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const headers = { "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" };
  const settings = await fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=default_social_image,brand_color,logo_url,favicon_url,app_icon_url,brand_name");
  const ss0 = (settings && settings[0]) || {};
  const defaultImg = ss0.default_social_image || "";
  BRAND = ss0.brand_color || "";
  LOGO = ss0.logo_url || ""; FAVICON = ss0.favicon_url || ""; APPICON = ss0.app_icon_url || ""; BNAME = ss0.brand_name || "Visa Doo";

  if (parts[0] === "articles") {
    const rows = await fetchJson(SUPABASE_URL+"/rest/v1/articles?status=eq.published&order=published_at.desc&select=slug,title,excerpt,cover_image,cover_alt,social_image");
    return new Response(listPage(rows||[], defaultImg), { headers });
  }
  // /article/<slug>
  const slug = parts[1] ? decodeURIComponent(parts[1]) : "";
  if (!slug) return notFound();
  const rows = await fetchJson(SUPABASE_URL+"/rest/v1/articles?status=eq.published&slug=eq."+encodeURIComponent(slug)+"&select=*");
  if (!rows || !rows.length) {
    // Address changed? Forward the old address to the current one (301).
    const moved = await fetchJson(SUPABASE_URL+"/rest/v1/articles?status=eq.published&past_slugs=cs.%7B"+encodeURIComponent(slug)+"%7D&select=slug&limit=1");
    if (moved && moved.length) return Response.redirect(SITE+"/article/"+moved[0].slug, 301);
    return notFound();
  }
  return new Response(articlePage(rows[0], defaultImg), { headers });
};

export const config = { path: ["/articles", "/article/:slug"] };
