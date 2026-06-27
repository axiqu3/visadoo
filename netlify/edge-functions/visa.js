// Visa Doo — server-rendered visa landing pages (SEO-friendly)
// Serves /visa/<slug> with proper meta tags read live from Supabase.

const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";
const WHATSAPP = "919895226697";

function esc(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { apikey: ANON, authorization: "Bearer " + ANON } });
  if (!r.ok) return null;
  return await r.json();
}

// Brand colour palette — must match branding.js applyColor() so first paint is the saved colour (no flash).
function shade(hex,p){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex.split("").map(function(c){return c+c;}).join(""); if(hex.length!==6) return "#"+hex; var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16); var t=p<0?0:255,a=Math.abs(p)/100; r=Math.round((t-r)*a+r); g=Math.round((t-g)*a+g); b=Math.round((t-b)*a+b); return "#"+[r,g,b].map(function(v){return ("0"+v.toString(16)).slice(-2);}).join(""); }
function brandVars(p){ if(!p) return ""; return '<style id="brand-vars">:root{--blue-600:'+p+';--blue-700:'+shade(p,-14)+';--blue-900:'+shade(p,-34)+';--blue-500:'+shade(p,8)+';--blue-400:'+shade(p,24)+';--blue-100:'+shade(p,82)+';--sky-50:'+shade(p,93)+';}</style>'; }
// Logo / favicon — same site-wide for every request; matches branding.js so first paint is correct (no flash).
var LOGO="", FAVICON="", APPICON="", BNAME="Visa Doo";
function brandMark(){ return LOGO ? ('<img src="'+esc(LOGO)+'" alt="'+esc(BNAME||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">') : ('<span class="logo">'+PLANE+'</span>Visa<b>Doo</b>'); }
function iconTags(){ var t = FAVICON ? ('<link rel="icon" href="'+esc(FAVICON)+'">') : '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'; if(APPICON||LOGO) t += '<link rel="apple-touch-icon" href="'+esc(APPICON||LOGO)+'">'; return t; }

// Expected processing time as a friendly estimate, e.g. "about 5 days" (blank if not set).
function etaStr(v) {
  const n = v && v.processing_time_value, u = v && v.processing_time_unit;
  if (n == null || n === "" || !u) return "";
  const unit = u === "hours" ? ("hour" + (Number(n) === 1 ? "" : "s")) : ("day" + (Number(n) === 1 ? "" : "s"));
  return "about " + n + " " + unit;
}

// ---- currency (single active currency chosen in the backend) ----
// Currency: INR only (₹, Indian grouping). Args kept for caller compatibility but ignored.
function resolveActive() { return { code: "INR", symbol: "₹" }; }
function fmtMoney(n) { if (n == null || n === "" || isNaN(Number(n))) return ""; return "₹" + Number(n).toLocaleString("en-IN"); }
function priceNum(row) {
  const p = (row.prices && row.prices.INR != null && row.prices.INR !== "") ? row.prices.INR : row.price_aed;
  return (p == null || p === "" || isNaN(Number(p)) || Number(p) <= 0) ? null : Number(p);
}
function priceText(row) { const p = priceNum(row); return p == null ? "Price on request" : fmtMoney(p); }

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLANE = '<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';

function pageHtml(v, others, defaultImg, active, brandColor) {
  const name = v.name || "UAE Tourist Visa";
  const title = (v.seo_title && v.seo_title.trim()) || (name + " — Apply Online | Visa Doo");
  const desc = (v.seo_description && v.seo_description.trim()) ||
    (v.blurb || ("Apply online for your " + name + " with Visa Doo. Fast, secure and 100% online.")).slice(0, 160);
  const canonical = SITE + "/visa/" + v.slug;
  const ogImage = v.social_image || defaultImg || "";
  const feats = (v.features || []);
  const wa = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Hi Visa Doo, I'd like to apply for the " + name + ".");

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "serviceType": "UAE Tourist Visa",
    "description": desc,
    "areaServed": "AE",
    "provider": { "@type": "Organization", "name": "Visa Doo", "url": SITE },
    "offers": { "@type": "Offer", "price": String(priceNum(v, active)), "priceCurrency": active.code, "url": canonical }
  };

  const related = others.map(function (o) {
    return '<a class="vcard" href="/visa/' + esc(o.slug) + '" style="text-decoration:none">' +
      (o.popular ? '<span class="tag">Most popular</span>' : '') +
      '<h3>' + esc(o.name) + '</h3>' +
      '<div class="vsub">' + esc(o.sub || '') + '</div>' +
      '<div class="price">' + esc(priceText(o, active)) + ' <small>/ visa</small></div>' +
      '<p class="blurb">' + esc(o.blurb || '') + '</p>' +
      '<span class="btn btn-ghost btn-block">View details</span>' +
      '</a>';
  }).join('');

  return '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + esc(title) + '</title>' +
    '<meta name="description" content="' + esc(desc) + '">' +
    '<link rel="canonical" href="' + esc(canonical) + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:site_name" content="Visa Doo">' +
    '<meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(desc) + '">' +
    '<meta property="og:url" content="' + esc(canonical) + '">' +
    (ogImage ? '<meta property="og:image" content="' + esc(ogImage) + '">' : '') +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(desc) + '">' +
    (ogImage ? '<meta name="twitter:image" content="' + esc(ogImage) + '">' : '') +
    iconTags() +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">' +
    '<link rel="stylesheet" href="/styles.css">' +
    brandVars(brandColor) +
    '<script src="/branding.js"></scr' + 'ipt>' +
    '<script type="application/ld+json">' + JSON.stringify(jsonld) + '</scr' + 'ipt>' +
    '</head><body>' +

    '<header class="header"><div class="container nav">' +
      '<a href="/" class="brand">' + brandMark() + '</a>' +
      '<div class="nav-actions">' +
        '<a href="/app.html#track" class="btn btn-ghost">Track application</a>' +
        '<a href="/app.html?visa=' + esc(v.slug) + '" class="btn btn-primary">Apply now</a>' +
      '</div>' +
    '</div></header>' +

    '<section class="hero sky"><div class="container hero-grid">' +
      '<div class="hero-copy">' +
        '<span class="eyebrow">UAE Tourist Visa</span>' +
        '<h1>' + esc(name) + '</h1>' +
        '<p class="sub">' + esc(v.blurb || '') + '</p>' +
        '<div class="hero-cta">' +
          '<a href="/app.html?visa=' + esc(v.slug) + '" class="btn btn-primary btn-lg">Apply now — ' + esc(priceText(v, active)) + '</a>' +
          '<a href="' + esc(wa) + '" target="_blank" rel="noopener" class="btn btn-ghost btn-lg">Ask a question</a>' +
        '</div>' +
      '</div>' +
      '<div class="hero-art"><div class="hero-blob"></div>' +
        '<div class="passport-card">' +
          '<div class="passport-head"><span class="flag">' + PLANE + '</span><div><h4>' + esc(name) + '</h4><span>United Arab Emirates</span></div></div>' +
          '<div class="passport-row"><span>Price</span><b>' + esc(priceText(v, active)) + '</b></div>' +
          (v.days ? '<div class="passport-row"><span>Length of stay</span><b>Up to ' + esc(v.days) + ' days</b></div>' : '') +
          (v.sub ? '<div class="passport-row"><span>Entry</span><b>' + esc(v.sub) + '</b></div>' : '') +
          (etaStr(v) ? '<div class="passport-row"><span>Est. processing</span><b>' + esc(etaStr(v)) + '</b></div>' : '') +
        '</div>' +
        (etaStr(v) ? '<p style="font-size:12px;color:#94a3b8;margin:10px 2px 0;text-align:center">Estimated processing time — not a guaranteed approval time.</p>' : '') +
      '</div>' +
    '</div></section>' +

    (feats.length ? ('<section class="section"><div class="container center">' +
      '<span class="eyebrow">What\'s included</span><h2>Your ' + esc(name) + '</h2>' +
      '<div class="req-wrap" style="grid-template-columns:1fr;max-width:640px;margin:34px auto 0">' +
        '<div class="req-list">' + feats.map(function (f) {
          return '<div class="req-item"><div class="ic" style="color:var(--green)">' + CHECK + '</div><div><h4>' + esc(f) + '</h4></div></div>';
        }).join('') + '</div>' +
      '</div>' +
      '<a href="/app.html?visa=' + esc(v.slug) + '" class="btn btn-primary btn-lg" style="margin-top:32px">Start my application</a>' +
    '</div></section>') : '') +

    (related ? ('<section class="section sky"><div class="container center">' +
      '<span class="eyebrow">Other visas</span><h2>Compare other options</h2>' +
      '<div class="cards" style="margin-top:34px">' + related + '</div>' +
    '</div></section>') : '') +

    '<footer class="footer"><div class="container footer-bottom">© ' + new Date().getFullYear() + ' Visa Doo. All rights reserved. · <a href="/">Home</a></div></footer>' +

    '<a class="wa-float" id="waFloat" href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' +
      '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.66 4.84 1.82 6.84L3 29l6.66-2.08a12.6 12.6 0 0 0 6.34 1.62h.01c7 0 12.69-5.7 12.69-12.69C28.7 8.7 23 3 16 3zm0 23.07h-.01a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.95 1.04 1.05-3.85-.25-.4a10.39 10.39 0 0 1-1.59-5.53c0-5.74 4.68-10.42 10.43-10.42 2.78 0 5.4 1.09 7.37 3.06a10.36 10.36 0 0 1 3.05 7.37c0 5.75-4.68 10.43-10.42 10.43zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-1 1.23-.18.21-.37.23-.68.08-.31-.16-1.32-.49-2.52-1.55-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55l-.61-.01c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.76.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37z"/></svg>' +
    '</a>' +
    '</body></html>';
}

function notFound() {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Visa not found — Visa Doo</title>' +
    '<link rel="stylesheet" href="/styles.css"></head><body>' +
    '<div style="min-height:80vh;display:grid;place-items:center;text-align:center;padding:40px">' +
    '<div><h1 style="font-size:30px">Visa not found</h1><p style="color:#5b6b85;margin:12px 0 22px">That visa page doesn\'t exist or is no longer offered.</p>' +
    '<a href="/" class="btn btn-primary btn-lg">Back to home</a></div></div></body></html>',
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export default async (request) => {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean); // ["visa", "<slug>"]
  const slug = parts[1] ? decodeURIComponent(parts[1]) : "";
  if (!slug) return notFound();

  const rows = await fetchJson(SUPABASE_URL + "/rest/v1/visa_types?active=eq.true&order=sort_order&select=*");
  if (!rows) return notFound();
  const v = rows.find(function (x) { return x.slug === slug; });
  if (!v) return notFound();
  const others = rows.filter(function (x) { return x.slug !== slug && x.country_slug === v.country_slug; });

  const settings = await fetchJson(SUPABASE_URL + "/rest/v1/site_settings?id=eq.global&select=default_social_image,active_currency,currencies,brand_color,logo_url,favicon_url,app_icon_url,brand_name");
  const defaultImg = (settings && settings[0] && settings[0].default_social_image) || "";
  const active = resolveActive(settings);
  const brandColor = (settings && settings[0] && settings[0].brand_color) || "";
  const ss0 = (settings && settings[0]) || {};
  LOGO = ss0.logo_url || ""; FAVICON = ss0.favicon_url || ""; APPICON = ss0.app_icon_url || ""; BNAME = ss0.brand_name || "Visa Doo";

  return new Response(pageHtml(v, others, defaultImg, active, brandColor), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" }
  });
};

export const config = { path: "/visa/:slug" };
