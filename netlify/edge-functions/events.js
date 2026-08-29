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

function fmtDate(d){ if(!d) return ""; var p=d.split("-"); return parseInt(p[2],10)+" "+MONTHS[parseInt(p[1],10)-1].slice(0,3)+" "+p[0]; }

function card(e){
  var img=e.image_url||"";
  var bg = img
    ? 'background-image:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.82)),url('+esc(img)+')'
    : 'background:linear-gradient(160deg,var(--blue-600),var(--blue-900))';
  var catBadge = e.category ? '<span class="ev-category">'+esc(e.category)+'</span>' : '';
  var meta = [e.city, e.event_date ? fmtDate(e.event_date) : ''].filter(Boolean).map(esc).join(' · ');
  var searchable=[e.name,e.category,e.city,e.country_name||e.country,e.event_date?fmtDate(e.event_date):''].filter(Boolean).join(' ').toLowerCase();
  return '<a class="ev-card" href="/event/'+encodeURIComponent(e.slug)+'" data-cat="'+esc(e.category||'')+'" data-search="'+esc(searchable)+'" style="'+bg+'">'+
    '<div class="ev-card-content">'+
      catBadge+
      '<div class="ev-name">'+esc(e.name||'')+'</div>'+
      (meta?'<div class="ev-meta">'+meta+'</div>':'')+
      '<span class="ev-card-link">Plan my trip <b>→</b></span>'+
    '</div>'+
  '</a>';
}

function pageHtml(events, cats, brandColor){
  var title="International Events — Get Your Visa On Time | Visa Doo";
  var desc="Browse major international events — festivals, sports, culture and business — and get the right visa, on time, with Visa Doo.";
  var canonical=SITE+"/events";

  var tabs='<button type="button" data-tab="all" class="ev-tab active" aria-pressed="true">All Events</button>'+
    cats.map(function(c){ return '<button type="button" data-tab="'+esc(c)+'" class="ev-tab" aria-pressed="false">'+esc(c)+'</button>'; }).join('');

  var quick=[],seen={};
  events.forEach(function(e){ var label=(e.name||'').trim(),key=label.toLowerCase(); if(label&&!seen[key]&&quick.length<4){seen[key]=true;quick.push(label);} });
  cats.forEach(function(c){ var key=c.toLowerCase(); if(!seen[key]&&quick.length<6){seen[key]=true;quick.push(c);} });
  var quickHtml=quick.length?'<div class="event-quick-suggestions">'+quick.map(function(label){return '<button type="button" data-suggestion="'+esc(label)+'"><i>✦</i>'+esc(label)+'</button>';}).join('')+'</div>':'';
  var resultOptions=events.map(function(e){
    var place=[e.city,e.country_name||e.country].filter(Boolean).join(', ');
    var details=[e.category,place,e.event_date?fmtDate(e.event_date):''].filter(Boolean).join(' · ');
    var searchable=[e.name,e.category,place,details].filter(Boolean).join(' ').toLowerCase();
    return '<a class="event-search-result" role="option" href="/event/'+encodeURIComponent(e.slug)+'" data-search="'+esc(searchable)+'"><span class="event-result-mark">'+esc((e.category||'Event').charAt(0))+'</span><span><b>'+esc(e.name||'Event')+'</b><small>'+esc(details)+'</small></span><i>→</i></a>';
  }).join('');

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
    '<link rel="stylesheet" href="/styles.css?v=20260801-header-compact">'+
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
      '.ev-name{color:#fff;font-weight:800;font-size:20px;line-height:1.25;text-shadow:0 1px 10px rgba(0,0,0,.5)}'+
      '.event-search-area{position:relative;z-index:5;max-width:820px;margin:-29px auto 34px;padding:0 10px}'+
      '.event-search-dock{position:relative;overflow:visible;border:1px solid #dfe7ed;border-radius:16px;background:#fff;box-shadow:0 14px 38px rgba(12,42,67,.13)}'+
      '.event-search-row{position:relative;min-height:58px;display:flex;align-items:center;gap:7px;padding:7px 7px 7px 48px}'+
      '.event-search-icon{position:absolute;left:20px;width:16px;height:16px;border:2px solid #718294;border-radius:50%}.event-search-icon:after{content:"";position:absolute;right:-6px;bottom:-3px;width:7px;height:2px;background:#718294;transform:rotate(45deg)}'+
      '.event-search-row input{min-width:0;flex:1;padding:11px 8px;border:0;outline:0;background:#fff;color:#18324a;font:inherit;font-size:15px}#eventSearchButton{width:42px;height:42px;flex:0 0 42px;border:1px solid #d8e0e6;border-radius:50%;background:#fff;cursor:pointer}'+
      '.event-search-results{position:absolute;z-index:10;top:calc(100% + 9px);right:0;left:0;max-height:390px;overflow-y:auto;padding:8px;border:1px solid #dce5eb;border-radius:16px;background:#fff;box-shadow:0 22px 55px rgba(8,42,68,.18)}.event-search-results[hidden]{display:none}'+
      '.event-search-result{display:grid;grid-template-columns:38px minmax(0,1fr) 24px;align-items:center;gap:12px;padding:10px 12px;border-radius:11px;color:#17344d}.event-search-result:hover{background:#f0f7fb}.event-search-result[hidden]{display:none}'+
      '.event-result-mark{width:38px;height:38px;display:grid;place-items:center;border-radius:11px;background:#e8f4fb;color:#176fc1;font-size:12px;font-weight:850}.event-search-result>span:nth-child(2){min-width:0;display:flex;flex-direction:column}.event-search-result b,.event-search-result small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.event-search-result b{font-size:12px}.event-search-result small{margin-top:3px;color:#7b8c99;font-size:9.5px}.event-search-result i{color:#2c7fbb;font-style:normal}'+
      '.event-quick-suggestions{display:flex;align-items:center;justify-content:flex-start;gap:7px;margin:0 7px;padding:11px 2px 12px;overflow-x:auto;border-top:1px solid #e8edf1}.event-quick-suggestions button{max-width:205px;flex:none;display:inline-flex;align-items:center;gap:7px;overflow:hidden;padding:6px 10px 6px 7px;border:1px solid #dde7ed;border-radius:999px;background:#fff;color:#506a7f;font:700 9.5px inherit;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}.event-quick-suggestions button i{width:18px;height:18px;flex:none;display:grid;place-items:center;border-radius:5px;background:#e8f4fb;color:#176fc1;font-size:9px;font-style:normal}'+
      '@media(max-width:880px){.ev-grid{grid-template-columns:repeat(2,1fr)}}'+
      '@media(max-width:560px){.events-page .ev-wrap{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.events-page .ev-tabs{grid-column:1/-1}.events-page .ev-month,.events-page .ev-grid{display:contents}.events-page .ev-month-label{display:none}.events-page .empty-state{grid-column:1/-1}.events-page .ev-card{min-width:0;min-height:230px;border-radius:14px}.events-page .ev-name{font-size:15px}.events-page .ev-card-content{padding:12px}.events-page .ev-meta{font-size:10px}.events-page .ev-date{top:9px;right:9px;padding:5px 7px;font-size:8px}.event-search-area{margin-top:-27px;padding:0 18px}.event-search-row{min-height:54px;padding:6px 6px 6px 44px}.event-quick-suggestions{padding:10px 0 11px}}'+
    '</style>'+
    '<script src="/branding.js"></scr'+'ipt>'+
    '</head><body class="events-page">'+
    '<header class="header"><div class="container nav">'+
      '<a href="/" class="brand">'+brandMark()+'</a>'+
      '<div class="nav-actions"><a href="/events" class="btn btn-ghost">Events</a><a href="/#contact" class="btn btn-ghost">Contact us</a><a href="/app.html#track" class="btn btn-ghost">Track application</a><a href="/app.html" class="btn btn-primary">Sign in</a></div>'+
    '</div></header>'+
    '<section class="events-hero"><div class="container events-hero-grid">'+
      '<div class="events-hero-copy"><span class="eyebrow">Plan around what excites you</span>'+
        '<h1>Go where the world is <span>happening.</span></h1>'+
        '<p>From music festivals and global sports to culture and business, discover the events worth travelling for—and get your visa ready on time.</p>'+
        '<a href="#events-list" class="btn btn-primary btn-lg">Explore upcoming events</a>'+
      '</div>'+
      '<div class="events-hero-visual" aria-label="International event categories">'+
        '<div class="event-orbit event-orbit-one" aria-hidden="true"></div><div class="event-orbit event-orbit-two" aria-hidden="true"></div>'+
        '<div class="events-calendar"><div class="events-calendar-top"><span>Worldwide calendar</span><b>2026</b></div>'+
          '<div class="events-calendar-feature"><small>Your next experience</small><strong>Something unforgettable</strong><span>is happening somewhere</span></div>'+
          '<div class="events-calendar-types"><span>♫<b>Music</b></span><span>●<b>Sports</b></span><span>✦<b>Culture</b></span><span>↗<b>Business</b></span></div>'+
        '</div><div class="events-pass"><small>Travel ready</small><b>Visa planned ✓</b></div>'+
      '</div>'+
    '</div></section>'+
    '<section class="events-list-section" id="events-list"><div class="event-search-area"><div class="event-search-dock"><div class="event-search-row"><span class="event-search-icon" aria-hidden="true"></span><input id="eventSearch" type="text" placeholder="Search events, cities or categories" autocomplete="off" aria-label="Search events, cities or categories" aria-controls="eventSearchResults" aria-expanded="false"><button type="button" id="eventSearchButton" aria-label="Search events">⌕</button></div>'+quickHtml+'<div class="event-search-results" id="eventSearchResults" role="listbox" hidden>'+resultOptions+'</div></div></div><div class="ev-wrap">'+
      '<div class="ev-tabs">'+tabs+'</div>'+body+
    '</div></section>'+
    '<footer class="footer"><div class="container footer-bottom">© '+new Date().getFullYear()+' Visa Doo. All rights reserved. · <a href="/">Home</a> · <a href="/articles">Articles</a></div></footer>'+
    '<script>(function(){var tabs=[].slice.call(document.querySelectorAll(".ev-tab")),input=document.getElementById("eventSearch"),panel=document.getElementById("eventSearchResults"),button=document.getElementById("eventSearchButton"),cat="all";function apply(){var q=(input.value||"").trim().toLowerCase();[].forEach.call(document.querySelectorAll(".ev-card"),function(c){var ok=(cat==="all"||c.getAttribute("data-cat")===cat)&&(!q||(c.getAttribute("data-search")||"").indexOf(q)>-1);c.style.display=ok?"":"none";});[].forEach.call(document.querySelectorAll(".ev-month"),function(m){var vis=0;[].forEach.call(m.querySelectorAll(".ev-card"),function(c){if(c.style.display!=="none")vis++;});m.style.display=vis?"":"none";});tabs.forEach(function(t){var active=t.getAttribute("data-tab")===cat;t.classList.toggle("active",active);t.setAttribute("aria-pressed",active?"true":"false");});}function suggest(){var q=(input.value||"").trim().toLowerCase(),shown=0;if(!q){panel.hidden=true;input.setAttribute("aria-expanded","false");return;}[].forEach.call(panel.querySelectorAll(".event-search-result"),function(r){var show=shown<6&&(r.getAttribute("data-search")||"").indexOf(q)>-1;r.hidden=!show;if(show)shown++;});panel.hidden=false;input.setAttribute("aria-expanded","true");}tabs.forEach(function(t){t.addEventListener("click",function(){cat=t.getAttribute("data-tab")||"all";apply();});});input.addEventListener("input",function(){apply();suggest();});input.addEventListener("keydown",function(e){if(e.key==="Escape"){panel.hidden=true;input.setAttribute("aria-expanded","false");}});button.addEventListener("click",function(){apply();suggest();input.focus();});[].forEach.call(document.querySelectorAll("[data-suggestion]"),function(b){b.addEventListener("click",function(){input.value=b.getAttribute("data-suggestion")||"";cat="all";panel.hidden=true;apply();input.focus();});});document.addEventListener("click",function(e){if(!e.target.closest(".event-search-dock")){panel.hidden=true;input.setAttribute("aria-expanded","false");}});})();</scr'+'ipt>'+
    '</body></html>';
}

export default async (request) => {
  try {
    const eventsRes=await fetchJson(SUPABASE_URL+"/rest/v1/events?active=eq.true&order=event_date.asc&select=*");
    const events=Array.isArray(eventsRes)?eventsRes:[];
    const settings=await fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=brand_color,logo_url,favicon_url,app_icon_url,brand_name");
    const ss0=(Array.isArray(settings)&&settings[0])||{};
    const brandColor=ss0.brand_color||"";
    LOGO=ss0.logo_url||""; FAVICON=ss0.favicon_url||""; APPICON=ss0.app_icon_url||""; BNAME=ss0.brand_name||"Visa Doo";

    // distinct categories in date order of appearance, with the standard ones first
    const STD=["Music","Sports","Art & Culture","Business & Science"];
    const present={}; events.forEach(function(e){ if(e.category) present[e.category]=true; });
    const cats=STD.filter(function(c){return present[c];}).concat(Object.keys(present).filter(function(c){return STD.indexOf(c)===-1;}));

    return new Response(pageHtml(events, cats, brandColor), {
      headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
    });
  } catch (err) {
    console.error("Events Edge Function Error:", err);
    return new Response(pageHtml([], [], ""), {
      headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
    });
  }
};

export const config = { path: ["/events", "/events.html"] };
