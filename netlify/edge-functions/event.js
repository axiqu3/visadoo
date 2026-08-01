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
var LOGO="", FAVICON="", APPICON="", BNAME="Visa Doo";
function brandMark(){ return LOGO ? ('<img src="'+esc(LOGO)+'" alt="'+esc(BNAME||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">') : ('<span class="logo">'+PLANE+'</span>Visa<b>Doo</b>'); }
function iconTags(){ var t = FAVICON ? ('<link rel="icon" href="'+esc(FAVICON)+'">') : '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'; if(APPICON||LOGO) t += '<link rel="apple-touch-icon" href="'+esc(APPICON||LOGO)+'">'; return t; }
function navActions(){ return '<div class="nav-actions"><a href="/events" class="btn btn-ghost">Events</a><a href="/#contact" class="btn btn-ghost">Contact us</a><a href="/app.html#track" class="btn btn-ghost">Track application</a><a href="/app.html" class="btn btn-primary">Sign in</a></div>'; }

function pageHtml(ev, c, visas, brandColor){
  var cname=(c&&c.name)||"";
  var title=(ev.seo_title&&ev.seo_title.trim())||(ev.name+(cname?(' — '+cname+' Visa'):'')+' | Visa Doo');
  var desc=(ev.seo_description&&ev.seo_description.trim())||((ev.blurb||('Get your '+cname+' visa for '+ev.name+' with Visa Doo — apply online, upload documents and track every step.')).slice(0,160));
  var canonical=SITE+'/event/'+ev.slug;
  var ogImage=ev.social_image||ev.image_url||'';
  var when=dateRange(ev.event_date, ev.end_date);
  var lead=leadDays(ev, visas);
  var heroImage=ev.image_url||(c&&c.image_url)||(c&&c.social_image)||'';
  var about=ev.blurb||('Plan your trip to '+ev.name+' with the right '+cname+' visa, clear timelines and everything ready before you travel.');

  var cards = (visas&&visas.length) ? visas.map(visaCard).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>Visa options for '+esc(cname)+' are coming soon. <a href="/#contact" style="color:var(--blue-600);font-weight:700">Contact us</a> and we\'ll help.</p></div>';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    (ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">'+'<meta property="og:image:alt" content="'+esc(ev.image_alt||ev.name||'')+'">':'')+
    '<meta name="twitter:card" content="summary_large_image">'+
    iconTags()+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css?v=20260801-back-text">'+
    brandVars(brandColor)+
    '<script src="/branding.js"></scr'+'ipt>'+
    '</head><body class="event-page">'+
    '<header class="header"><div class="container nav">'+
      '<a href="/" class="brand">'+brandMark()+'</a>'+navActions()+
    '</div></header>'+
    '<section class="event-detail-hero"><div class="container event-detail-grid">'+
      '<div class="event-detail-copy">'+
        '<a href="/events#events-list" class="event-back"><span aria-hidden="true">&#8592;</span> All events</a>'+
        '<div class="event-detail-badges">'+
          (c&&c.iso2?'<img src="'+flag(c.iso2)+'" alt="'+esc(cname)+' flag">':'')+
          (ev.category?'<span class="event-category">'+esc(ev.category)+'</span>':'')+
        '</div>'+
        '<h1>'+esc(ev.name)+'</h1>'+
        '<div class="event-meta-line">'+
          (when?'<span><small>Date</small><b>'+esc(when)+'</b></span>':'')+
          (ev.city?'<span><small>Location</small><b>'+esc(ev.city)+', '+esc(cname)+'</b></span>':'')+
        '</div>'+
        (lead?'<div class="event-lead"><span>⚡</span><div><small>Plan ahead</small><b>Apply at least '+lead+' day'+(lead===1?'':'s')+' before the event</b></div></div>':'')+
        '<div class="event-actions"><a href="#visas" class="btn btn-primary btn-lg">Get your '+esc(cname)+' visa</a><a href="/country/'+encodeURIComponent(ev.country_slug)+'" class="btn btn-light btn-lg">View destination</a><a href="/#contact" class="btn btn-contact btn-lg">Contact us</a></div>'+
      '</div>'+
      '<figure class="event-detail-visual">'+
        (heroImage?'<img src="'+esc(heroImage)+'" alt="'+esc(ev.image_alt||ev.name)+'" fetchpriority="high">':'<div class="event-detail-placeholder">✦</div>')+
        '<figcaption><small>Mark your calendar</small><strong>'+esc(when||ev.name)+'</strong><span>'+esc(ev.city||cname)+'</span></figcaption>'+
      '</figure>'+
    '</div></section>'+
    '<section class="section event-about"><div class="container event-about-grid">'+
      '<div><span class="eyebrow">About the event</span><h2>'+esc(ev.name)+'</h2><p>'+esc(about)+'</p></div>'+
      '<div class="event-plan-card">'+
        '<span class="event-plan-number">01</span><div><b>Choose the right visa</b><small>Compare the available '+esc(cname)+' visa options for your trip.</small></div>'+
        '<span class="event-plan-number">02</span><div><b>Prepare ahead</b><small>'+(lead?'Start at least '+lead+' day'+(lead===1?'':'s')+' early to stay comfortable.':'Apply early to leave time for processing.')+'</small></div>'+
        '<span class="event-plan-number">03</span><div><b>Travel with confidence</b><small>Upload securely and track every step online.</small></div>'+
      '</div>'+
    '</div></section>'+
    '<section class="section sky country-options" id="visas"><div class="container">'+
      '<div class="center"><span class="eyebrow">Travel ready</span><h2>'+esc(cname)+' visas for '+esc(ev.name)+'</h2><p class="lead">Choose a visa, apply online and track every step before your event.</p></div>'+
      '<div class="cards">'+cards+'</div>'+
    '</div></section>'+
    '<footer class="footer"><div class="container footer-bottom">© '+new Date().getFullYear()+' Visa Doo. All rights reserved. · <a href="/">Home</a> · <a href="/events">Events</a> · <a href="/articles">Articles</a></div></footer>'+
    '</body></html>';
}

function notFound(){
  return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Event not found | Visa Doo</title><link rel="stylesheet" href="/styles.css"></head><body>'+
    '<div style="min-height:70vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">Event not found</h1>'+
    '<p style="color:#5b6b85;margin:12px 0 22px">This event isn\'t available.</p><a href="/events" class="btn btn-primary btn-lg">Browse events</a></div></div></body></html>',
    { status:404, headers:{ "content-type":"text/html; charset=utf-8" } });
}

export default async (request) => {
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
};

export const config = { path: "/event/:slug" };
