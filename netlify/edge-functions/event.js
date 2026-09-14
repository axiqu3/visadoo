// Visa Doo — server-rendered event page (/event/<slug>): event details + that country's visas
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
async function fetchJson(url){ const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}}); if(!r.ok) return null; return await r.json(); }
function fmtMoney(n){ if(n==null||n===""||isNaN(Number(n))) return ""; return "₹"+Number(n).toLocaleString("en-IN"); }
function priceText(row){ const p=(row.prices&&row.prices.INR!=null&&row.prices.INR!=="")?row.prices.INR:row.price_aed; return (p==null||p===""||isNaN(Number(p))||Number(p)<=0)?"Price on request":fmtMoney(p); }
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function flag(iso2){ return iso2 ? ('https://flagcdn.com/w320/'+iso2.toLowerCase()+'.png') : ''; }

const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d){ if(!d) return ""; var p=d.split("-"); return parseInt(p[2],10)+" "+MON[parseInt(p[1],10)-1]+" "+p[0]; }
function dateRange(s,e){ if(!s) return ""; if(e && e!==s){ var ps=s.split("-"),pe=e.split("-"); if(ps[0]===pe[0]&&ps[1]===pe[1]) return parseInt(ps[2],10)+"–"+parseInt(pe[2],10)+" "+MON[parseInt(ps[1],10)-1]+" "+ps[0]; return fmtDate(s)+" – "+fmtDate(e); } return fmtDate(s); }

// Recommended lead time: event's own value, else the longest visa processing time (in days) for that country.
function leadDays(ev, visas){
  if(ev.lead_time_days!=null && ev.lead_time_days!=="" && !isNaN(Number(ev.lead_time_days))) return Number(ev.lead_time_days);
  var max=0; (visas||[]).forEach(function(v){ var n=v.processing_time_value, u=v.processing_time_unit; if(n==null||n===""||!u) return; n=Number(n); var d=(u==="hours")?Math.max(1,Math.ceil(n/24)):n; if(d>max) max=d; });
  return max||0;
}
function etaBadge(v){ var n=v.processing_time_value,u=v.processing_time_unit; if(n==null||n===""||!u) return ''; var unit=u==="hours"?("hour"+(Number(n)===1?"":"s")):("day"+(Number(n)===1?"":"s")); return '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--sky-50);color:var(--blue-700);border:1px solid var(--blue-100);border-radius:999px;padding:6px 13px;font-size:13px;font-weight:700;margin:0 0 12px;line-height:1.2"><span aria-hidden="true">⚡</span>Get your visa in about '+esc(n)+' '+unit+'</div>'; }
function visaCard(v){ var feats=(v.features||[]).slice(0,4).map(function(f){return '<li>'+CHECK+esc(f)+'</li>';}).join(''); var cat=v.category?'<div class="vsub">'+esc(v.category)+'</div>':''; return '<div class="vcard">'+etaBadge(v)+'<h3>'+esc(v.name)+'</h3>'+cat+'<div class="price">'+esc(priceText(v))+' <small>/ visa</small></div>'+(v.blurb?'<p class="blurb">'+esc(v.blurb)+'</p>':'')+'<ul>'+feats+'</ul>'+'<a href="/app.html?visa='+encodeURIComponent(v.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+'<a href="/visa/'+encodeURIComponent(v.slug)+'" style="display:block;text-align:center;margin-top:12px;font-weight:600;font-size:14px;color:var(--blue-600)">View details &amp; requirements →</a></div>'; }

function shade(hex,p){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex.split("").map(function(c){return c+c;}).join(""); if(hex.length!==6) return "#"+hex; var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16); var t=p<0?0:255,a=Math.abs(p)/100; r=Math.round((t-r)*a+r); g=Math.round((t-g)*a+g); b=Math.round((t-b)*a+b); return "#"+[r,g,b].map(function(v){return ("0"+v.toString(16)).slice(-2);}).join(""); }
function brandVars(p){ if(!p) return ""; return '<style id="brand-vars">:root{--blue-600:'+p+';--blue-700:'+shade(p,-14)+';--blue-900:'+shade(p,-34)+';--blue-500:'+shade(p,8)+';--blue-400:'+shade(p,24)+';--blue-100:'+shade(p,82)+';--sky-50:'+shade(p,93)+';}</style>'; }
var LOGO="/assets/logo_transparent.png", FAVICON="", APPICON="", BNAME="Visa Doo";
function brandMark(){ return LOGO ? ('<img src="'+esc(LOGO)+'" alt="'+esc(BNAME||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">') : ('<span class="logo">'+PLANE+'</span>Visa<b>Doo</b>'); }
function iconTags(){ var t = FAVICON ? ('<link rel="icon" href="'+esc(FAVICON)+'">') : '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'; if(APPICON||LOGO) t += '<link rel="apple-touch-icon" href="'+esc(APPICON||LOGO)+'">'; return t; }
function navActions(){ return '<div class="nav-actions"><a href="/events" class="btn btn-ghost">Events</a><a href="/#contact" class="btn btn-ghost">Contact us</a><a href="/app.html#track" class="btn btn-ghost">Track application</a><a href="/app.html" class="btn btn-primary">Sign in</a></div>'; }

function scriptJson(value){
  return JSON.stringify(value)
    .replace(/</g,"\\u003c")
    .replace(/\u2028/g,"\\u2028")
    .replace(/\u2029/g,"\\u2029");
}

function pageHtml(ev, c, visas, brandColor){
  var cname=(c&&c.name)||"";
  var title=(ev.seo_title&&ev.seo_title.trim())||(ev.name+(cname?(' — '+cname+' Visa'):'')+' | Visa Doo');
  var desc=(ev.seo_description&&ev.seo_description.trim())||((ev.blurb||('Get your '+cname+' visa for '+ev.name+' with Visa Doo — apply online, upload documents and track every step.')).slice(0,160));
  var canonical=SITE+'/event/'+ev.slug;
  var ogImage=ev.social_image||ev.image_url||'';
  var preload=scriptJson({event:ev,country:c||{name:cname},visas:visas||[]});

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    (ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">'+'<meta property="og:image:alt" content="'+esc(ev.image_alt||ev.name||'')+'">':'')+
    '<meta name="twitter:card" content="summary_large_image">'+
    iconTags()+
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css?v=20260801-back-text">'+
    '<link rel="stylesheet" href="/events/event-detail.css?v=20260801-event-nav-tight">'+
    brandVars(brandColor)+
    '<script src="/branding.js"></scr'+'ipt>'+
    '</head><body class="home-page events-page event-page event-detail-page" id="top">'+
    '<header class="header discover-header"><div class="container nav">'+
      '<div class="nav-brand-cluster"><a href="/" class="brand">'+brandMark()+'</a></div>'+
      '<nav class="nav-links" id="navLinks"><a href="/#destinations">Home</a><a href="/events" class="active" aria-current="page">Activities</a></nav>'+
      '<div class="nav-actions"><a href="/app.html#track" class="nav-track">Track visa</a><a href="/app.html#profile" class="nav-profile" aria-label="Profile" title="Profile"></a><button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg></button></div>'+
    '</div></header>'+
    '<main id="eventPage" aria-live="polite"><section class="country-page-loading"><div class="country-loading-card"><span class="country-spinner" aria-hidden="true"></span><h1>Loading event&hellip;</h1><p>Fetching event information and available visas.</p></div></section></main>'+
    '<footer class="footer home-footer"><div class="container">'+
      '<div class="footer-grid footer-grid--expanded">'+
        '<div class="footer-intro"><a href="/" class="brand">'+brandMark()+'</a><p>Tourist &amp; business visas for destinations worldwide &mdash; applied for and tracked entirely online. We handle the paperwork so you can plan the trip.</p><div class="footer-social-links" id="socialLinks" aria-label="Social media links"><a href="https://instagram.com/visadoo" target="_blank" rel="noopener" aria-label="Instagram" class="social-ico social-instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a><a href="mailto:hello@visadoo.com" target="_blank" rel="noopener" aria-label="Email" class="social-ico social-email"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></a><a href="https://wa.me/919895226697" target="_blank" rel="noopener" aria-label="WhatsApp" class="social-ico social-whatsapp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></a></div><div class="footer-assurances"><span>100% online</span><span>Secure &amp; tracked</span></div></div>'+
        '<div><h5>Explore</h5><ul><li><a href="/">Home</a></li><li><a href="/events">Activities</a></li><li><a href="/app.html#track">Track application</a></li></ul></div>'+
        '<div><h5>Company</h5><ul id="footerCompany"><li><a href="/p/about">About Visa Doo</a></li><li><a href="/p/privacy-policy">Privacy Policy</a></li><li><a href="/p/terms">Terms &amp; Conditions</a></li><li><a href="/contact.html">Contact Us</a></li></ul></div>'+
        '<div class="footer-contact"><h5>Contact</h5><ul><li><a id="footWa" href="https://wa.me/919895226697?text=Hi%20Visa%20Doo%2C%20I%20have%20a%20question%20about%20a%20visa." target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#25d366" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="contact-ico ico-wa"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.4A10 10 0 1 0 12 2z"/><path d="M15.5 14.2c-.3-.15-1.7-.85-2-.95-.3-.1-.5-.15-.7.15-.2.3-.75 1-.9 1.15-.15.15-.3.2-.6.1-.3-.15-1.25-.45-2.4-1.5-.9-.8-1.5-1.75-1.7-2.05-.15-.3 0-.45.15-.6.15-.15.3-.35.45-.5.15-.15.2-.3.3-.5.1-.2.05-.35 0-.5-.05-.15-.7-1.65-.95-2.2-.25-.6-.5-.5-.7-.5h-.6c-.2 0-.55.05-.85.35s-1.1 1.05-1.1 2.55 1.1 2.95 1.25 3.15c.15.2 2.1 3.25 5.1 4.55.7.3 1.25.5 1.7.65.7.25 1.4.2 1.9.1.6-.1 1.8-.75 2-1.45.25-.7.25-1.3.15-1.45-.1-.15-.3-.2-.6-.35z" fill="#25d366" stroke="none"/></svg><div class="contact-text-block"><span>WhatsApp</span><small>Chat with our visa team</small></div></a></li><li><a id="footEmail" href="mailto:hello@visadoo.com"><svg class="contact-ico ico-email" viewBox="0 0 24 24" width="22" height="22"><path fill="#4285F4" d="M22.5 8.1v11.4c0 .8-.7 1.5-1.5 1.5h-3.5V12l-5.5 4.1L6.5 12V21H3c-.8 0-1.5-.7-1.5-1.5V8.1l5.5 4.1 5-3.8 5 3.8 5.5-4.1z"/><path fill="#34A853" d="M1.5 8.1V5.5C1.5 4.7 2.2 4 3 4h.9l8.1 6.1L20.1 4H21c.8 0 1.5.7 1.5 1.5v2.6l-10.5 7.9L1.5 8.1z"/><path fill="#EA4335" d="M1.5 5.5l10.5 7.9L22.5 5.5V5.5c0-.8-.7-1.5-1.5-1.5h-18c-.8 0-1.5.7-1.5 1.5v0z"/><path fill="#FBBC05" d="M17.5 4L12 8.1 6.5 4h11z"/></svg><div class="contact-text-block"><span>Gmail</span><small>Chat with our visa team</small></div></a></li></ul></div>'+
      '</div>'+
      '<div class="footer-bottom"><span>&copy; <span id="year"></span> Visa Doo. All rights reserved.</span><span>Plan simply. Travel confidently.</span></div>'+
    '</div></footer>'+
    '<script src="/config.js"></scr'+'ipt><script src="/destination-images.js"></scr'+'ipt>'+
    '<script>window.__VISADOO_EVENT_DATA__='+preload+';</scr'+'ipt>'+
    '<script src="/events/event-page.js?v=20260914-active-check-v2"></scr'+'ipt>'+
    '<script>(function(){var button=document.getElementById("menuBtn"),links=document.getElementById("navLinks");if(!button||!links)return;button.addEventListener("click",function(){var open=links.classList.toggle("open");button.setAttribute("aria-expanded",String(open));});links.querySelectorAll("a").forEach(function(link){link.addEventListener("click",function(){links.classList.remove("open");button.setAttribute("aria-expanded","false");});});})();</scr'+'ipt>'+
    '</body></html>';
}

function notFound(){
  return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Event not found | Visa Doo</title><link rel="stylesheet" href="/styles.css"></head><body>'+
    '<div style="min-height:70vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">Event not found</h1>'+
    '<p style="color:#5b6b85;margin:12px 0 22px">This event isn\'t available.</p><a href="/events" class="btn btn-primary btn-lg">Browse events</a></div></div></body></html>',
    { status:404, headers:{ "content-type":"text/html; charset=utf-8" } });
}

export default async (request) => {
  try {
    const url=new URL(request.url);
    const parts=url.pathname.split("/").filter(Boolean); // ["event","<slug>"]
    const slug=parts[1]?decodeURIComponent(parts[1]):"";
    if(!slug) return notFound();

    const events=await fetchJson(SUPABASE_URL+"/rest/v1/events?slug=eq."+encodeURIComponent(slug)+"&active=eq.true&select=*");
    if(!events||!events.length) return notFound();
    const ev=events[0];
    const countries=await fetchJson(SUPABASE_URL+"/rest/v1/countries?slug=eq."+encodeURIComponent(ev.country_slug)+"&select=*");
    const c=(countries&&countries[0])||{ name:"", iso2:"" };
    const visas=await fetchJson(SUPABASE_URL+"/rest/v1/visa_types?country_slug=eq."+encodeURIComponent(ev.country_slug)+"&active=eq.true&order=sort_order&select=*")||[];
    const settings=await fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=brand_color,logo_url,favicon_url,app_icon_url,brand_name");
    const ss0=(settings&&settings[0])||{};
    const brandColor=ss0.brand_color||"";
    LOGO=ss0.logo_url||""; FAVICON=ss0.favicon_url||""; APPICON=ss0.app_icon_url||""; BNAME=ss0.brand_name||"Visa Doo";

    return new Response(pageHtml(ev, c, visas, brandColor), {
      headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
    });
  } catch (err) {
    console.error("Event Edge Function Error:", err);
    return notFound();
  }
};

export const config = { path: "/event/:slug" };
