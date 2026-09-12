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
var LOGO="/assets/logo_transparent.png", FAVICON="", APPICON="", BNAME="Visa Doo";
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

function pageHtml(v, others, country, defaultImg, active, brandColor) {
  const countryName = (country && country.name) || "your destination";
  const countryCode = (country && country.iso2) || "";
  const visaCategory = v.category ? (countryName + " " + v.category + " Visa") : (countryName + " Visa");
  const name = v.name || visaCategory;
  const title = (v.seo_title && v.seo_title.trim()) || (name + " — Apply Online | Visa Doo");
  const desc = (v.seo_description && v.seo_description.trim()) ||
    (v.blurb || ("Apply online for your " + name + " with Visa Doo. Fast, secure and 100% online.")).slice(0, 160);
  const canonical = SITE + "/visa/" + v.slug;
  const ogImage = v.social_image || defaultImg || "";
  const feats = (v.features || []);
  const wa = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Hi Visa Doo, I'd like to apply for the " + name + ".");
  const numericPrice = priceNum(v);
  const requirementItems = feats.length ? feats : [
    "Valid passport copy",
    "Recent passport-size photograph",
    "Travel and contact details"
  ];
  const audienceText = "For travellers planning a " + (v.category ? String(v.category).toLowerCase() + " visit" : "visit") +
    " to " + countryName + ". Apply online, upload your details securely and follow every update from one account.";
  const optionRows = [v].concat(others);
  const visaOptions = optionRows.map(function(o){
    return '<option value="/visa/'+encodeURIComponent(o.slug)+'"'+(o.slug===v.slug?' selected':'')+'>'+esc(o.name)+' - '+esc(priceText(o,active))+'</option>';
  }).join('');

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "serviceType": visaCategory,
    "description": desc,
    "areaServed": countryCode,
    "provider": { "@type": "Organization", "name": "Visa Doo", "url": SITE }
  };
  if(numericPrice!=null){
    jsonld.offers={ "@type":"Offer", "price":String(numericPrice), "priceCurrency":active.code, "url":canonical };
  }

  const related = others.map(function (o) {
    return '<a class="vcard" href="/visa/' + encodeURIComponent(o.slug) + '" style="text-decoration:none">' +
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
    '<link rel="stylesheet" href="/styles.css?v=20260731-visa-detail">' +
    brandVars(brandColor) +
    '<script src="/branding.js"></scr' + 'ipt>' +
    '<script type="application/ld+json">' + JSON.stringify(jsonld) + '</scr' + 'ipt>' +
    '</head><body class="visa-page">' +

    '<header class="header"><div class="container nav">' +
      '<a href="/" class="brand">' + brandMark() + '</a>' +
      '<div class="nav-actions">' +
        '<a href="/app.html#track" class="btn btn-ghost">Track application</a>' +
        '<a href="/app.html?visa=' + encodeURIComponent(v.slug) + '" class="btn btn-primary">Apply now</a>' +
      '</div>' +
    '</div></header>' +

    '<main class="visa-detail-page">' +
      '<section class="visa-detail-intro"><div class="container">' +
        '<a href="/country/' + encodeURIComponent(v.country_slug) + '" class="visa-detail-back">&larr; All ' + esc(countryName) + ' visas</a>' +
        '<div class="visa-detail-intro-grid">' +
          '<div>' +
            '<span class="visa-detail-kicker">' + esc(visaCategory) + '</span>' +
            '<h1>' + esc(name) + '</h1>' +
            '<p>' + esc(v.blurb || desc) + '</p>' +
          '</div>' +
          '<div class="visa-detail-quickfacts">' +
            (etaStr(v) ? '<span><small>Processing</small><b>' + esc(etaStr(v)) + '</b></span>' : '') +
            (v.days ? '<span><small>Stay</small><b>Up to ' + esc(v.days) + ' days</b></span>' : '') +
            (v.sub ? '<span><small>Entry</small><b>' + esc(v.sub) + '</b></span>' : '') +
          '</div>' +
        '</div>' +
      '</div></section>' +

      '<section class="visa-detail-content-section"><div class="container visa-detail-layout">' +
        '<div class="visa-detail-main">' +
          '<div class="visa-audience-card">' +
            '<span class="visa-audience-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>' +
            '<div><small>Who this visa is for</small><p>' + esc(audienceText) + '</p></div>' +
          '</div>' +

          '<div class="visa-timeline-heading">' +
            '<span>Simple online process</span><h2>Your visa application timeline</h2>' +
          '</div>' +
          '<div class="visa-timeline">' +
            '<article class="visa-timeline-step">' +
              '<span class="visa-timeline-dot"></span><div><div class="visa-step-meta"><b>Step 1</b><span>Documents</span></div>' +
              '<h3>Prepare your documents</h3><p>' + esc(requirementItems.slice(0,3).join(' | ')) + '</p>' +
              '<div class="visa-requirement-chips">' + requirementItems.map(function(item){return '<span>'+CHECK+esc(item)+'</span>';}).join('') + '</div></div>' +
            '</article>' +
            '<article class="visa-timeline-step">' +
              '<span class="visa-timeline-dot"></span><div><div class="visa-step-meta"><b>Step 2</b><span>Online</span></div>' +
              '<h3>Submit your application</h3><p>Complete the secure online form and upload clear copies of your documents. You can return to your account whenever you need.</p></div>' +
            '</article>' +
            '<article class="visa-timeline-step">' +
              '<span class="visa-timeline-dot"></span><div><div class="visa-step-meta"><b>Step 3</b><span>' + esc(etaStr(v) || 'Processing') + '</span></div>' +
              '<h3>Verification and processing</h3><p>Our team checks your submission and keeps you informed while your visa is processed.</p></div>' +
            '</article>' +
            '<article class="visa-timeline-step">' +
              '<span class="visa-timeline-dot"></span><div><div class="visa-step-meta"><b>Step 4</b><span>Ready to travel</span></div>' +
              '<h3>Receive your visa</h3><p>Your issued visa and important travel guidance will be shared with you securely.</p></div>' +
            '</article>' +
          '</div>' +
        '</div>' +

        '<aside class="visa-apply-panel">' +
          '<div class="visa-apply-price">' +
            '<small>From</small><div><strong>' + esc(priceText(v,active)) + '</strong><span>/visa</span></div>' +
            '<p>Clear pricing for your online application</p>' +
          '</div>' +
          '<div class="visa-apply-body">' +
            '<label for="visaOptionSelect">Select visa type</label>' +
            '<select id="visaOptionSelect" onchange="if(this.value)window.location.href=this.value">' + visaOptions + '</select>' +
            '<span class="visa-apply-label">Your visa details</span>' +
            '<div class="visa-apply-facts">' +
              (etaStr(v) ? '<div class="active"><span class="visa-fact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><span><small>Estimated processing</small><b>' + esc(etaStr(v)) + '</b></span><em>Selected</em></div>' : '') +
              (v.days ? '<div><span class="visa-fact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></span><span><small>Permitted stay</small><b>Up to ' + esc(v.days) + ' days</b></span></div>' : '') +
              (v.sub ? '<div><span class="visa-fact-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3v18M19 3v18M5 7h14M5 17h14"/></svg></span><span><small>Entry type</small><b>' + esc(v.sub) + '</b></span></div>' : '') +
            '</div>' +
            (etaStr(v) ? '<p class="visa-estimate-note">Processing times are estimates and do not guarantee approval by a specific date.</p>' : '') +
            '<a href="/app.html?visa=' + encodeURIComponent(v.slug) + '" class="btn btn-primary btn-block visa-apply-cta">Apply now</a>' +
            '<a href="' + esc(wa) + '" target="_blank" rel="noopener" class="visa-help-link">Have a question? Chat with our team &rarr;</a>' +
            '<div class="visa-safe-note">' + CHECK + '<span><b>Secure application</b><small>Your details stay private and protected.</small></span></div>' +
          '</div>' +
        '</aside>' +
      '</div></section>' +
    '</main>' +

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
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["visa", "<slug>"]
    const slug = parts[1] ? decodeURIComponent(parts[1]) : "";
    if (!slug) return notFound();

    const rows = await fetchJson(SUPABASE_URL + "/rest/v1/visa_types?active=eq.true&order=sort_order&select=*");
    if (!rows) return notFound();
    const v = rows.find(function (x) { return x.slug === slug; });
    if (!v) return notFound();
    const others = rows.filter(function (x) { return x.slug !== slug && x.country_slug === v.country_slug; });
    const countries = await fetchJson(SUPABASE_URL + "/rest/v1/countries?slug=eq." + encodeURIComponent(v.country_slug) + "&active=eq.true&select=name,iso2,slug");
    const country = (countries && countries[0]) || { name: v.country_slug, iso2: "", slug: v.country_slug };

    const settings = await fetchJson(SUPABASE_URL + "/rest/v1/site_settings?id=eq.global&select=default_social_image,active_currency,currencies,brand_color,logo_url,favicon_url,app_icon_url,brand_name");
    const defaultImg = (settings && settings[0] && settings[0].default_social_image) || "";
    const active = resolveActive(settings);
    const brandColor = (settings && settings[0] && settings[0].brand_color) || "";
    const ss0 = (settings && settings[0]) || {};
    LOGO = ss0.logo_url || ""; FAVICON = ss0.favicon_url || ""; APPICON = ss0.app_icon_url || ""; BNAME = ss0.brand_name || "Visa Doo";

    return new Response(pageHtml(v, others, country, defaultImg, active, brandColor), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" }
    });
  } catch (err) {
    console.error("Visa Edge Function Error:", err);
    return notFound();
  }
};

export const config = { path: "/visa/:slug" };
