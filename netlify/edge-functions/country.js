// Visa Doo — server-rendered country pages (/country/<slug>): lists that country's visas
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function shortText(value,fallback,limit){
  var text=String(value||fallback||"").replace(/\s+/g," ").trim();
  if(text.length<=limit) return text;
  var cut=text.slice(0,limit+1).lastIndexOf(" ");
  return text.slice(0,cut>limit*.65?cut:limit).replace(/[.,;:\s]+$/,"")+"…";
}
async function fetchJson(url){
  const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}});
  if(!r.ok) throw new Error("Data request failed: "+r.status);
  return await r.json();
}

// ---- currency (single active currency chosen in the backend) ----
// Currency: INR only (₹, Indian grouping). Args kept for caller compatibility but ignored.
function resolveActive(){ return { code:"INR", symbol:"₹" }; }
function fmtMoney(n){ if(n==null||n===""||isNaN(Number(n))) return ""; return "₹"+Number(n).toLocaleString("en-IN"); }
function priceText(row){
  const p=(row.prices&&row.prices.INR!=null&&row.prices.INR!=="")?row.prices.INR:row.price_aed;
  return (p==null||p===""||isNaN(Number(p))||Number(p)<=0)?"Price on request":fmtMoney(p);
}
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function processingText(v){
  var n=v.processing_time_value, u=v.processing_time_unit;
  if(n==null||n===''||!u) return '';
  var unit=u==='hours'?('hour'+(Number(n)===1?'':'s')):('day'+(Number(n)===1?'':'s'));
  return n+' '+unit;
}

function stayText(v){
  if(v.days==null||v.days===''||Number(v.days)<=0) return '';
  return v.days+' days';
}

// "Get your visa in X" pill — uses the existing per-visa ETA; blank ETA shows nothing.
// Brand-adaptive (var(--blue-*) are set to the saved brand colour), honest wording ("about").
function etaBadge(v){
  var n=v.processing_time_value, u=v.processing_time_unit;
  if(n==null||n===''||!u) return '';
  var unit = u==='hours' ? ('hour'+(Number(n)===1?'':'s')) : ('day'+(Number(n)===1?'':'s'));
  return '<div class="eta-pill">Ready in '+esc(n)+' '+unit+'</div>';
}

function visaCard(v, active){
  var cat = v.category ? '<div class="vsub">'+esc(v.category)+'</div>' : '';
  var facts=[
    stayText(v)?'<span><small>Stay</small><b>'+esc(stayText(v))+'</b></span>':'',
    v.sub?'<span><small>Entry</small><b>'+esc(v.sub)+'</b></span>':'',
    processingText(v)?'<span><small>Processing</small><b>'+esc(processingText(v))+'</b></span>':''
  ].filter(Boolean).join('');
  return '<div class="vcard">'+
    etaBadge(v)+
    '<h3>'+esc(v.name)+'</h3>'+cat+
    '<div class="price">'+esc(priceText(v, active))+' <small>/ visa</small></div>'+
    (facts?'<div class="country-visa-facts">'+facts+'</div>':'')+
    '<a href="/app.html?visa='+encodeURIComponent(v.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+
    '<a href="/visa/'+encodeURIComponent(v.slug)+'" class="country-visa-details">Details →</a>'+
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
  var cards = visas.length ? visas.map(function(v){return visaCard(v, active);}).join('') : '<div class="country-empty"><h3>Options coming soon</h3><a href="/#contact" class="btn btn-primary">Contact us</a></div>';
  var heroImage=c.image_url||c.social_image||defaultImg||'';
  var priced=visas.map(function(v){
    var p=(v.prices&&v.prices.INR!=null&&v.prices.INR!=='')?v.prices.INR:v.price_aed;
    return (p==null||p===''||isNaN(Number(p))||Number(p)<=0)?null:Number(p);
  }).filter(function(p){return p!=null;});
  var fromPrice=priced.length?Math.min.apply(null,priced):null;
  var processing=visas.map(function(v){
    if(v.processing_time_value==null||v.processing_time_value===''||!v.processing_time_unit) return null;
    return {
      hours:v.processing_time_unit==='hours'?Number(v.processing_time_value):Number(v.processing_time_value)*24,
      text:processingText(v)
    };
  }).filter(Boolean).sort(function(a,b){return a.hours-b.hours;});
  var fastest=processing.length?processing[0].text:'';
  var facts=[
    '<div><strong>'+visas.length+'</strong><span>Options</span></div>',
    fromPrice!=null?'<div><strong>'+esc(fmtMoney(fromPrice))+'</strong><span>From</span></div>':'',
    fastest?'<div><strong>'+esc(fastest)+'</strong><span>Fastest</span></div>':''
  ].filter(Boolean).join('');
  var summary=shortText(c.summary,'Apply online with clear prices and simple tracking.',120);
  var heroStyle=heroImage?' style="--country-hero-image:url(&quot;'+esc(heroImage)+'&quot;)"':'';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    (ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">':'')+
    '<meta name="twitter:card" content="summary_large_image">'+
    iconTags()+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css?v=20260801-back-text">'+
    brandVars(brandColor)+
    '<script src="/branding.js"></scr'+'ipt>'+
    '</head><body class="country-page">'+
    '<header class="header discover-header"><div class="container nav">'+
      '<div class="nav-brand-cluster">'+
        '<a href="/#top" class="brand">'+brandMark()+'</a>'+
      '</div>'+
      '<nav class="nav-links" id="navLinks">'+
        '<a href="/#destinations" class="active" aria-current="page">Explore</a>'+
        '<a href="/events">Events</a>'+
        '<a href="/articles">Articles</a>'+
      '</nav>'+
      '<div class="nav-actions">'+
        '<a href="/app.html#track" class="nav-track">Track visa</a>'+
        '<a href="/app.html" class="nav-profile" aria-label="Sign in" title="Sign in"></a>'+
        '<button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg>'+
        '</button>'+
      '</div>'+
    '</div></header>'+
    '<main>'+
    '<section class="country-detail-hero"'+heroStyle+'><div class="container country-detail-grid">'+
      '<div class="country-detail-copy">'+
        '<a href="/#destinations" class="country-back"><span aria-hidden="true">&#8592;</span> All destinations</a>'+
        '<div class="country-guide-row">'+
          (c.iso2?'<img src="https://flagcdn.com/w80/'+esc(c.iso2.toLowerCase())+'.png" alt="'+esc(c.name)+' flag">':'')+
          '<span class="eyebrow">Visa guide</span>'+
        '</div>'+
        '<h1>'+esc(c.name)+' Visas</h1>'+
        '<p>'+esc(summary)+'</p>'+
        '<div class="country-facts">'+facts+'</div>'+
        '<a href="#visa-info" class="btn btn-primary btn-lg">Choose a visa <span aria-hidden="true">→</span></a>'+
      '</div>'+
    '</div></section>'+
    '<nav class="country-info-nav" aria-label="Country visa information"><div class="container">'+
      '<a href="#visa-info">Visa Info</a>'+
      '<a href="#documents">Documents</a>'+
      '<a href="#visa-process">Visa Process</a>'+
    '</div></nav>'+
    '<section class="section sky country-options" id="visa-info"><div class="container">'+
      '<div class="country-section-heading"><span class="eyebrow">Choose a visa</span><h2>Visa options</h2></div>'+
      '<div class="cards">'+cards+'</div>'+
    '</div></section>'+
    '<section class="section country-documents" id="documents"><div class="container country-documents-grid">'+
      '<div><span class="eyebrow">Documents</span><h2>Keep these ready</h2></div>'+
      '<div class="country-doc-list">'+
        '<div>'+CHECK+'<span><b>Passport</b></span></div>'+
        '<div>'+CHECK+'<span><b>Photo</b></span></div>'+
        '<div>'+CHECK+'<span><b>Travel details</b></span></div>'+
        '<div>'+CHECK+'<span><b>Extra documents, if needed</b></span></div>'+
      '</div>'+
    '</div></section>'+
    '<section class="section country-process" id="visa-process"><div class="container">'+
      '<div class="country-process-heading"><span class="eyebrow">Visa Process</span><h2>What to do next</h2><p>Choose your visa, upload the documents and track every update online.</p></div>'+
      '<div class="country-process-flow" role="list" aria-label="Visa application steps">'+
        '<div class="country-process-step" role="listitem"><i aria-hidden="true">&#10003;</i><b>Choose visa</b><small>Pick the right option</small></div>'+
        '<div class="country-process-step" role="listitem"><i aria-hidden="true">&#8593;</i><b>Upload files</b><small>Add passport and photo</small></div>'+
        '<div class="country-process-step" role="listitem"><i aria-hidden="true">&#9678;</i><b>Track status</b><small>See updates online</small></div>'+
      '</div>'+
    '</div></section>'+
    '</main>'+
    '<footer class="footer home-footer"><div class="container">'+
      '<div class="footer-route-line" aria-hidden="true"><span></span></div>'+
      '<div class="footer-grid footer-grid--expanded">'+
        '<div class="footer-intro">'+
          '<a href="/#top" class="brand">'+brandMark()+'</a>'+
          '<p>Tourist &amp; business visas for destinations worldwide — applied for and tracked entirely online. We handle the paperwork so you can plan the trip.</p>'+
          '<div class="footer-assurances"><span>100% online</span><span>Secure &amp; tracked</span></div>'+
        '</div>'+
        '<div><h5>Explore</h5><ul>'+
          '<li><a href="/#destinations">Destinations</a></li>'+
          '<li><a href="/events">Events</a></li>'+
          '<li><a href="/#how">How it works</a></li>'+
          '<li><a href="/articles">Articles</a></li>'+
          '<li><a href="/app.html#track">Track application</a></li>'+
        '</ul></div>'+
        '<div><h5>Company</h5><ul id="footerCompany">'+
          '<li><a href="/p/about">About Visa Doo</a></li>'+
          '<li><a href="/p/privacy-policy">Privacy Policy</a></li>'+
          '<li><a href="/p/terms">Terms &amp; Conditions</a></li>'+
          '<li><a href="/#contact">Contact us</a></li>'+
        '</ul></div>'+
        '<div class="footer-contact"><h5>Contact</h5><ul>'+
          '<li><a id="footWa" href="https://wa.me/919895226697?text=Hi%20Visa%20Doo%2C%20I%20have%20a%20question%20about%20a%20visa." target="_blank" rel="noopener"><span>WhatsApp</span><small>Chat with our visa team</small></a></li>'+
          '<li><a id="footEmail" href="mailto:hello@visadoo.com"><span>hello@visadoo.com</span><small>Send us your questions</small></a></li>'+
        '</ul></div>'+
      '</div>'+
      '<div class="footer-bottom">'+
        '<span>© '+new Date().getFullYear()+' Visa Doo. All rights reserved.</span>'+
        '<span>Plan simply. Travel confidently.</span>'+
        '<div id="socialLinks" hidden></div>'+
      '</div>'+
    '</div></footer>'+
    '<script src="/destination-images.js"></scr'+'ipt>'+
    '<script>(function(){var b=document.getElementById("menuBtn"),n=document.getElementById("navLinks");if(!b||!n)return;b.addEventListener("click",function(){var o=n.classList.toggle("open");b.setAttribute("aria-expanded",String(o))});n.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){n.classList.remove("open");b.setAttribute("aria-expanded","false")})})})();</scr'+'ipt>'+
    '</body></html>';
}

function notFound(){
  return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Destination not found | Visa Doo</title><link rel="stylesheet" href="/styles.css?v=20260801-back-text"></head><body>'+
    '<div style="min-height:70vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">Destination not found</h1>'+
    '<p style="color:#5b6b85;margin:12px 0 22px">We don\'t have this destination yet.</p><a href="/" class="btn btn-primary btn-lg">Browse destinations</a></div></div></body></html>',
    { status:404, headers:{ "content-type":"text/html; charset=utf-8" } });
}

function serviceUnavailable(){
  return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Please try again | Visa Doo</title><link rel="stylesheet" href="/styles.css?v=20260801-back-text"></head><body>'+
    '<div style="min-height:70vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">We could not load this destination</h1>'+
    '<p style="color:#5b6b85;margin:12px auto 22px;max-width:480px">This is usually temporary. Please refresh the page, browse another destination, or contact us if you need help now.</p>'+
    '<a href="" class="btn btn-primary btn-lg">Try again</a> <a href="/#contact" class="btn btn-ghost btn-lg">Contact us</a></div></div></body></html>',
    { status:503, headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"no-store" } });
}

export default async (request) => {
  try{
    const url=new URL(request.url);
    const parts=url.pathname.split("/").filter(Boolean); // ["country","<slug>"]
    const slug=parts[1]?decodeURIComponent(parts[1]):"";
    if(!slug) return notFound();

    const countries=await fetchJson(SUPABASE_URL+"/rest/v1/countries?slug=eq."+encodeURIComponent(slug)+"&active=eq.true&select=*");
    if(!countries.length) return notFound();
    const c=countries[0];
    const data=await Promise.all([
      fetchJson(SUPABASE_URL+"/rest/v1/visa_types?country_slug=eq."+encodeURIComponent(slug)+"&active=eq.true&order=sort_order&select=*"),
      fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=default_social_image,active_currency,currencies,brand_color,logo_url,favicon_url,app_icon_url,brand_name")
    ]);
    const visas=data[0]||[];
    const settings=data[1]||[];
    const defaultImg=(settings[0]&&settings[0].default_social_image)||"";
    const active=resolveActive(settings);
    const brandColor=(settings[0]&&settings[0].brand_color)||"";
    const ss0=settings[0]||{};
    LOGO=ss0.logo_url||""; FAVICON=ss0.favicon_url||""; APPICON=ss0.app_icon_url||""; BNAME=ss0.brand_name||"Visa Doo";

    return new Response(pageHtml(c, visas, defaultImg, active, brandColor), {
      headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
    });
  }catch(e){
    return serviceUnavailable();
  }
};

export const config = { path: "/country/:slug" };
