// Visa Doo — server-rendered Articles (list at /articles, single at /article/<slug>)
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
async function fetchJson(url){ const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}}); if(!r.ok) return null; return await r.json(); }
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';

// Brand colour palette — matches branding.js to prevent a colour flash.
var BRAND = "";
function shade(hex,p){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex.split("").map(function(c){return c+c;}).join(""); if(hex.length!==6) return "#"+hex; var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16); var t=p<0?0:255,a=Math.abs(p)/100; r=Math.round((t-r)*a+r); g=Math.round((t-g)*a+g); b=Math.round((t-b)*a+b); return "#"+[r,g,b].map(function(v){return ("0"+v.toString(16)).slice(-2);}).join(""); }
function brandVars(p){ if(!p) return ""; return '<style id="brand-vars">:root{--blue-600:'+p+';--blue-700:'+shade(p,-14)+';--blue-900:'+shade(p,-34)+';--blue-500:'+shade(p,8)+';--blue-400:'+shade(p,24)+';--blue-100:'+shade(p,82)+';--sky-50:'+shade(p,93)+';}</style>'; }
var LOGO="", FAVICON="", APPICON="", BNAME="Visa Doo";
function brandMark(){ return LOGO ? ('<img src="'+esc(LOGO)+'" alt="'+esc(BNAME||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">') : ('<span class="logo">'+PLANE+'</span>Visa<b>Doo</b>'); }
function iconTags(){ var t = FAVICON ? ('<link rel="icon" href="'+esc(FAVICON)+'">') : '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'; if(APPICON||LOGO) t += '<link rel="apple-touch-icon" href="'+esc(APPICON||LOGO)+'">'; return t; }

function head(title, desc, canonical, ogImage, jsonld, ogAlt, pageClass){
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="article"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'">'+
    '<meta property="og:url" content="'+esc(canonical)+'">'+(ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">'+(ogAlt?'<meta property="og:image:alt" content="'+esc(ogAlt)+'">':''):'')+
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'">'+(ogImage?'<meta name="twitter:image" content="'+esc(ogImage)+'">'+(ogAlt?'<meta name="twitter:image:alt" content="'+esc(ogAlt)+'">':''):'')+
    iconTags()+'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/article-detail.css">'+brandVars(BRAND)+
    '<script src="/branding.js"></scr'+'ipt>'+(jsonld?('<script type="application/ld+json">'+JSON.stringify(jsonld)+'</scr'+'ipt>'):'')+
    '</head><body class="home-page article-page '+esc(pageClass||'')+'" id="top">'+
    (pageClass==='article-detail-page'?'<div class="article-reading-progress" id="readingProgress" aria-hidden="true"><span></span></div>':'')+
    '<header class="header discover-header"><div class="container nav">'+
      '<div class="nav-brand-cluster"><a href="/#top" class="brand">'+brandMark()+'</a></div>'+
      '<nav class="nav-links" id="navLinks"><a href="/#destinations">Explore</a><a href="/events">Events</a><a href="/articles" class="active" aria-current="page">Articles</a></nav>'+
      '<div class="nav-actions"><a href="/app.html#track" class="nav-track">Track visa</a><a href="/app.html" class="nav-profile" aria-label="Sign in" title="Sign in"></a><button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg></button></div>'+
    '</div></header>';
}

function foot(script){
  return '<footer class="footer home-footer"><div class="container"><div class="footer-route-line" aria-hidden="true"><span></span></div><div class="footer-grid footer-grid--expanded">'+
    '<div class="footer-intro"><a href="/#top" class="brand">'+brandMark()+'</a><p>Tourist &amp; business visas for destinations worldwide — applied for and tracked entirely online. We handle the paperwork so you can plan the trip.</p><div class="footer-assurances"><span>100% online</span><span>Secure &amp; tracked</span></div></div>'+
    '<div><h5>Explore</h5><ul><li><a href="/#destinations">Destinations</a></li><li><a href="/events">Events</a></li><li><a href="/#how">How it works</a></li><li><a href="/articles">Articles</a></li><li><a href="/app.html#track">Track application</a></li></ul></div>'+
    '<div><h5>Company</h5><ul><li><a href="/p/about">About Visa Doo</a></li><li><a href="/p/privacy-policy">Privacy Policy</a></li><li><a href="/p/terms">Terms &amp; Conditions</a></li><li><a href="/#contact">Contact us</a></li></ul></div>'+
    '<div class="footer-contact"><h5>Contact</h5><ul><li><a href="https://wa.me/919895226697?text=Hi%20Visa%20Doo%2C%20I%20have%20a%20question%20about%20a%20visa." target="_blank" rel="noopener"><span>WhatsApp</span><small>Chat with our visa team</small></a></li><li><a href="mailto:hello@visadoo.com"><span>hello@visadoo.com</span><small>Send us your questions</small></a></li></ul></div>'+
    '</div><div class="footer-bottom"><span>© '+new Date().getFullYear()+' Visa Doo. All rights reserved.</span><span>Plan simply. Travel confidently.</span><div id="socialLinks" hidden></div></div></div></footer>'+(script||'')+'</body></html>';
}

function menuScript(){
  return '<script>(function(){var b=document.getElementById("menuBtn"),n=document.getElementById("navLinks");if(!b||!n)return;b.addEventListener("click",function(){var o=n.classList.toggle("open");b.setAttribute("aria-expanded",String(o));});n.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){n.classList.remove("open");b.setAttribute("aria-expanded","false");});});})();</scr'+'ipt>';
}

function listPage(rows, defaultImg){
  const cards = rows.length ? rows.map(function(a){
    const img = a.cover_image || a.social_image;
    const alt = a.cover_alt || a.title || '';
    return '<a class="art-card" href="/article/'+esc(a.slug)+'"><div class="art-cover"'+(img?(' style="background-image:url('+esc(img)+')" role="img" aria-label="'+esc(alt)+'"'):'')+'>'+(img?'':PLANE)+'</div><div class="art-card-body"><h3>'+esc(a.title)+'</h3><p>'+esc(a.excerpt||'')+'</p><span class="art-readmore">Read more →</span></div></a>';
  }).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>No articles published yet. Check back soon.</p></div>';
  return head('UAE Visa Guides & Articles | Visa Doo','Helpful guides and tips on UAE tourist visas — requirements, processing times, and how to apply online with Visa Doo.',SITE+'/articles',defaultImg||'',null,'','journal-page')+
    '<section class="journal-hero"><div class="journal-orbit journal-orbit-one" aria-hidden="true"></div><div class="journal-orbit journal-orbit-two" aria-hidden="true"></div><div class="container"><div class="journal-hero-copy"><span class="journal-kicker"><i></i> Visa Doo Journal</span><h1>Travel better with <span>clearer visa guidance.</span></h1><p>Practical destination advice, entry requirements and useful planning notes — written for real trips, not paperwork experts.</p><div class="journal-trust"><span>Expert-checked</span><span>Simple language</span><span>Updated guidance</span></div></div></div></section>'+
    '<section class="journal-library"><div class="container"><div class="journal-library-head"><div><span>Latest stories</span><h2>Guides for your next journey</h2></div><p>Everything worth knowing before you apply, book and fly.</p></div><div class="art-grid">'+cards+'</div></div></section>'+foot(menuScript());
}

function articlePage(a, defaultImg){
  const title = (a.seo_title && a.seo_title.trim()) || (a.title + ' | Visa Doo');
  const desc = (a.seo_description && a.seo_description.trim()) || (a.excerpt || a.title).slice(0,160);
  const canonical = SITE+'/article/'+a.slug;
  const ogImage = a.social_image || a.cover_image || defaultImg || '';
  const date = a.published_at ? new Date(a.published_at) : new Date(a.created_at);
  const dateStr = date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const jsonld = { "@context":"https://schema.org","@type":"Article","headline":a.title,"description":desc,"datePublished":date.toISOString(),"image":ogImage,"author":{"@type":"Organization","name":"Visa Doo"},"publisher":{"@type":"Organization","name":"Visa Doo"},"mainEntityOfPage":canonical };
  const coverAlt = a.cover_alt || a.title || '';
  const words=String(a.content||'').replace(/<[^>]*>/g,' ').trim().split(/\s+/).filter(Boolean).length;
  const minutes=Math.max(1,Math.ceil(words/220));
  return head(title,desc,canonical,ogImage,jsonld,coverAlt,'article-detail-page')+
    '<main id="articlePage" data-hydrated="true"><article class="article-detail"><header class="article-hero'+(a.cover_image?'':' article-hero--plain')+'"><div class="article-hero-orbit article-hero-orbit--one" aria-hidden="true"></div><div class="article-hero-orbit article-hero-orbit--two" aria-hidden="true"></div><div class="container article-hero-copy">'+
      '<a href="/articles" class="article-back"><span>←</span> Back to the journal</a><span class="article-kicker"><i></i> Visa Doo Journal</span><h1 class="article-title">'+esc(a.title)+'</h1>'+(a.excerpt?'<p class="article-intro">'+esc(a.excerpt)+'</p>':'')+
      '<div class="article-meta"><span class="article-author-mark">'+PLANE+'</span><span><small>Written by</small><b>Visa Doo editorial team</b></span><span class="article-meta-divider"></span><span><small>Published</small><b>'+esc(dateStr)+'</b></span><span class="article-meta-divider"></span><span><small>Reading time</small><b>'+minutes+' min read</b></span></div></div>'+
      (a.cover_image?'<div class="container article-hero-media-wrap"><div class="article-cover"><img src="'+esc(a.cover_image)+'" alt="'+esc(coverAlt)+'" fetchpriority="high"><span class="article-cover-corner" aria-hidden="true"></span></div></div>':'')+
    '</header><section class="article-content-section"><div class="container article-layout"><aside class="article-aside"><div class="article-toc-card"><span class="article-side-label">In this guide</span><nav id="articleToc" aria-label="Article contents"></nav></div><div class="article-help-card"><span class="article-help-icon">✓</span><div><b>Expert-checked guidance</b><p>Need help with your route? Our visa team is one message away.</p></div><a href="/#contact">Talk to our team →</a></div><button class="article-copy-link" id="copyArticleLink" type="button"><span>↗</span> Copy article link</button></aside>'+
      '<div class="article-prose-card"><div class="article-body">'+(a.content||'')+'</div><div class="article-cta"><div><span>YOUR NEXT TRIP STARTS HERE</span><h3>Ready to make the visa part simple?</h3><p>Compare destinations, see the requirements clearly and apply online with live tracking.</p></div><a href="/#destinations" class="btn btn-white btn-lg">Explore destinations <b>→</b></a></div></div></div></section></article></main>'+foot('<script src="/article-page.js"></scr'+'ipt>');
}

function notFound(){
  return new Response(head('Article not found | Visa Doo','',SITE,SITE+'/og-default.png',null,'','article-detail-page')+'<div style="min-height:50vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">Article not found</h1><p style="color:#5b6b85;margin:12px 0 22px">This article doesn\'t exist or hasn\'t been published.</p><a href="/articles" class="btn btn-primary btn-lg">See all articles</a></div></div>'+foot(menuScript()),{ status:404, headers:{ "content-type":"text/html; charset=utf-8" } });
}

export default async (request) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const headers = { "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" };
  const settings = await fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=default_social_image,brand_color,logo_url,favicon_url,app_icon_url,brand_name");
  const ss0 = (Array.isArray(settings) && settings[0]) || {};
  const defaultImg = ss0.default_social_image || "";
  BRAND = ss0.brand_color || "";
  LOGO = ss0.logo_url || ""; FAVICON = ss0.favicon_url || ""; APPICON = ss0.app_icon_url || ""; BNAME = ss0.brand_name || "Visa Doo";

  if (parts[0] === "articles" || parts[0] === "articles.html") {
    const rowsRes = await fetchJson(SUPABASE_URL+"/rest/v1/articles?status=eq.published&order=published_at.desc&select=slug,title,excerpt,cover_image,cover_alt,social_image");
    const rows = Array.isArray(rowsRes) ? rowsRes : [];
    return new Response(listPage(rows, defaultImg), { headers });
  }
  const slug = parts[1] ? decodeURIComponent(parts[1]) : "";
  if (!slug) return notFound();
  const rowsRes = await fetchJson(SUPABASE_URL+"/rest/v1/articles?status=eq.published&slug=eq."+encodeURIComponent(slug)+"&select=*");
  const rows = Array.isArray(rowsRes) ? rowsRes : [];
  if (!rows.length) {
    const movedRes = await fetchJson(SUPABASE_URL+"/rest/v1/articles?status=eq.published&past_slugs=cs.%7B"+encodeURIComponent(slug)+"%7D&select=slug&limit=1");
    const moved = Array.isArray(movedRes) ? movedRes : [];
    if (moved.length) return Response.redirect(SITE+"/article/"+moved[0].slug, 301);
    return notFound();
  }
  return new Response(articlePage(rows[0], defaultImg), { headers });
};

export const config = { path: ["/articles", "/articles.html", "/article/:slug"] };
