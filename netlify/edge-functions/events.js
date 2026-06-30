// Visa Doo — server-rendered Events page (/events): browse international events by month,
// filter by category, each card links to that country's visas. (Step 1: cards link to /country/<slug>.)
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
async function fetchJson(url){ const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}}); if(!r.ok) return null; return await r.json(); }
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';

function shade(hex,p){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex.split("").map(function(c){return c+c;}).join(""); if(hex.length!==6) return "#"+hex; var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16); var t=p<0?0:255,a=Math.abs(p)/100; r=Math.round((t-r)*a+r); g=Math.round((t-g)*a+g); b=Math.round((t-b)*a+b); return "#"+[r,g,b].map(function(v){return ("0"+v.toString(16)).slice(-2);}).join(""); }
function brandVars(p){ if(!p) return ""; return '<style id="brand-vars">:root{--blue-600:'+p+';--blue-700:'+shade(p,-14)+';--blue-900:'+shade(p,-34)+';--blue-500:'+shade(p,8)+';--blue-400:'+shade(p,24)+';--blue-100:'+shade(p,82)+';--sky-50:'+shade(p,93)+';}</style>'; }
var LOGO="", FAVICON="", APPICON="", BNAME="Visa Doo";
function brandMark(){ return LOGO ? ('<img src="'+esc(LOGO)+'" alt="'+esc(BNAME||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">') : ('<span class="logo">'+PLANE+'</span>Visa<b>Doo</b>'); }
function iconTags(){ var t = FAVICON ? ('<link rel="icon" href="'+esc(FAVICON)+'">') : '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'; if(APPICON||LOGO) t += '<link rel="apple-touch-icon" href="'+esc(APPICON||LOGO)+'">'; return t; }

var MONTHS=["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
function monthKey(d){ return d.slice(0,7); }                 // "2026-07"
function monthLabel(key){ var p=key.split("-"); return MONTHS[parseInt(p[1],10)-1]+" "+p[0]; }

function card(e){
  var img=e.image_url||"";
  var bg = img
    ? 'background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.78)),url('+esc(img)+')'
    : 'background:linear-gradient(160deg,var(--blue-600),var(--blue-900))';
  return '<a class="ev-card" href="/country/'+encodeURIComponent(e.country_slug)+'" data-cat="'+esc(e.category||'')+'" style="'+bg+'">'+
    '<div class="ev-name">'+esc(e.name||'')+'</div>'+
  '</a>';
}

function pageHtml(events, cats, brandColor){
  var title="International Events — Get Your Visa On Time | Visa Doo";
  var desc="Browse major international events — festivals, sports, culture and business — and get the right visa, on time, with Visa Doo.";
  var canonical=SITE+"/events";

  var tabs='<button data-tab="all" class="ev-tab active">All Events</button>'+
    cats.map(function(c){ return '<button data-tab="'+esc(c)+'" class="ev-tab">'+esc(c)+'</button>'; }).join('');

  // group by month
  var groups={}, order=[];
  events.forEach(function(e){ if(!e.event_date) return; var k=monthKey(e.event_date); if(!groups[k]){ groups[k]=[]; order.push(k); } groups[k].push(e); });
  order.sort();
  var body = order.length ? order.map(function(k){
    return '<section class="ev-month" data-month="'+esc(k)+'"><div class="ev-month-label">'+esc(monthLabel(k))+'</div>'+
      '<div class="ev-grid">'+groups[k].map(card).join('')+'</div></section>';
  }).join('') : '<div class="empty-state"><p>New events are coming soon. <a href="/#destinations" style="color:var(--blue-600);font-weight:700">Browse destinations</a> in the meantime.</p></div>';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    '<meta name="twitter:card" content="summary_large_image">'+
    iconTags()+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css">'+
    brandVars(brandColor)+
    '<style>'+
      '.ev-wrap{max-width:1100px;margin:0 auto;padding:0 22px 70px}'+
      '.ev-tabs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:0 0 30px}'+
      '.ev-tab{border:1.5px solid var(--line);background:#fff;color:var(--muted);font-family:inherit;font-weight:700;font-size:14px;padding:9px 18px;border-radius:999px;cursor:pointer;transition:.15s}'+
      '.ev-tab:hover{border-color:var(--blue-400);color:var(--blue-700)}'+
      '.ev-tab.active{background:var(--blue-600);color:#fff;border-color:var(--blue-600)}'+
      '.ev-month{margin-bottom:34px}'+
      '.ev-month-label{font-size:13px;font-weight:800;letter-spacing:1.5px;color:var(--blue-700);background:var(--sky-50);display:inline-block;padding:6px 14px;border-radius:999px;margin-bottom:16px}'+
      '.ev-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}'+
      '.ev-card{position:relative;display:flex;align-items:flex-end;min-height:300px;border-radius:18px;background-size:cover;background-position:center;text-decoration:none;overflow:hidden;box-shadow:var(--shadow-sm);transition:transform .18s,box-shadow .18s}'+
      '.ev-card:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(2,12,27,.18)}'+
      '.ev-name{color:#fff;font-weight:800;font-size:20px;line-height:1.25;padding:20px;text-shadow:0 1px 10px rgba(0,0,0,.5)}'+
      '@media(max-width:880px){.ev-grid{grid-template-columns:repeat(2,1fr)}}'+
      '@media(max-width:560px){.ev-grid{grid-template-columns:1fr}.ev-card{min-height:240px}}'+
    '</style>'+
    '<script src="/branding.js"></scr'+'ipt>'+
    '</head><body>'+
    '<header class="header"><div class="container nav">'+
      '<a href="/" class="brand">'+brandMark()+'</a>'+
      '<div class="nav-actions"><a href="/app.html#track" class="btn btn-ghost">Track application</a><a href="/app.html" class="btn btn-primary">Sign in</a></div>'+
    '</div></header>'+
    '<section class="hero sky"><div class="container" style="text-align:center;padding:54px 0 26px;max-width:760px">'+
      '<h1 style="font-size:clamp(30px,4.6vw,46px);font-weight:800">International Events</h1>'+
      '<p class="sub" style="font-size:18px;color:var(--muted);margin:16px auto 0;max-width:560px">Festivals, sports, culture and business events around the world — and the visa to get you there, on time.</p>'+
    '</div></section>'+
    '<section class="section" style="padding-top:34px"><div class="ev-wrap">'+
      '<div class="ev-tabs">'+tabs+'</div>'+body+
    '</div></section>'+
    '<footer class="footer"><div class="container footer-bottom">© '+new Date().getFullYear()+' Visa Doo. All rights reserved. · <a href="/">Home</a> · <a href="/articles">Articles</a></div></footer>'+
    '<script>(function(){var tabs=[].slice.call(document.querySelectorAll(".ev-tab"));function apply(cat){[].forEach.call(document.querySelectorAll(".ev-card"),function(c){c.style.display=(cat==="all"||c.getAttribute("data-cat")===cat)?"":"none";});[].forEach.call(document.querySelectorAll(".ev-month"),function(m){var vis=0;[].forEach.call(m.querySelectorAll(".ev-card"),function(c){if(c.style.display!=="none")vis++;});m.style.display=vis?"":"none";});tabs.forEach(function(t){t.classList.toggle("active",t.getAttribute("data-tab")===cat);});}tabs.forEach(function(t){t.addEventListener("click",function(){apply(t.getAttribute("data-tab"));});});})();</scr'+'ipt>'+
    '</body></html>';
}

export default async (request) => {
  const events=await fetchJson(SUPABASE_URL+"/rest/v1/events?active=eq.true&order=event_date.asc&select=*")||[];
  const settings=await fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=brand_color,logo_url,favicon_url,app_icon_url,brand_name");
  const ss0=(settings&&settings[0])||{};
  const brandColor=ss0.brand_color||"";
  LOGO=ss0.logo_url||""; FAVICON=ss0.favicon_url||""; APPICON=ss0.app_icon_url||""; BNAME=ss0.brand_name||"Visa Doo";

  // distinct categories in date order of appearance, with the standard ones first
  const STD=["Music","Sports","Art & Culture","Business & Science"];
  const present={}; events.forEach(function(e){ if(e.category) present[e.category]=true; });
  const cats=STD.filter(function(c){return present[c];}).concat(Object.keys(present).filter(function(c){return STD.indexOf(c)===-1;}));

  return new Response(pageHtml(events, cats, brandColor), {
    headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
  });
};

export const config = { path: "/events" };
