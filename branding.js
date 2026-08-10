// Visa Doo — shared branding layer. Applies logo, favicon, app icon, brand colour,
// brand name, contact and social links from site_settings on ANY page (homepage,
// app area, and server-rendered country/visa/article pages). No dependencies.
(function () {
  var SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
  var ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
  var PLANE = '<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';

  function shade(hex, p) {
    hex = (hex || "").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    if (hex.length !== 6) return "#" + hex;
    var r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
    var t = p < 0 ? 0 : 255, a = Math.abs(p) / 100;
    r = Math.round((t - r) * a + r); g = Math.round((t - g) * a + g); b = Math.round((t - b) * a + b);
    return "#" + [r, g, b].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
  }

  function applyColor(p) {
    if (!p) return;
    var css = ":root{--blue-600:" + p + ";--blue-700:" + shade(p, -14) + ";--blue-900:" + shade(p, -34) +
      ";--blue-500:" + shade(p, 8) + ";--blue-400:" + shade(p, 24) + ";--blue-100:" + shade(p, 82) +
      ";--sky-50:" + shade(p, 93) + ";}";
    var st = document.getElementById("brand-vars");
    if (!st) { st = document.createElement("style"); st.id = "brand-vars"; document.head.appendChild(st); }
    st.textContent = css;
  }

  function setIcon(rel, url) {
    if (!url) return;
    var links = document.querySelectorAll('link[rel="' + rel + '"]');
    for (var i = 0; i < links.length; i++) links[i].parentNode.removeChild(links[i]);
    var l = document.createElement("link"); l.rel = rel; l.href = url; document.head.appendChild(l);
  }

  function applyBrand(s) {
    var logo = s.logo_url, name = (s.brand_name || "").trim();
    if (!logo && !name) return;
    var brands = document.querySelectorAll(".brand");
    for (var i = 0; i < brands.length; i++) {
      var el = brands[i];
      if (logo) {
        el.innerHTML = '<img src="' + logo + '" alt="' + (name || "logo") + '" style="height:34px;width:auto;max-width:180px;display:block">';
      } else {
        el.innerHTML = '<span class="logo">' + PLANE + '</span>' + name;
      }
    }
    if (name) {
      try { document.title = document.title.replace(/Visa Doo/g, name); } catch (e) {}
    }
  }

  function waLink(num) { return "https://wa.me/" + (num || "").replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Hi, I have a question about a visa."); }

  function applyContact(s) {
    var cfg = window.VISADOO_CONFIG || {};
    var wa = s.contact_whatsapp, ph = s.contact_phone, em = s.contact_email;
    if (wa) { cfg.WHATSAPP = wa.replace(/[^0-9]/g, ""); cfg.PHONE_DISPLAY = wa; }
    if (ph) { cfg.PHONE_TEL = ph.replace(/[^0-9+]/g, ""); cfg.PHONE_DISPLAY = ph; }
    if (em) cfg.EMAIL = em;
    function setHref(id, href) { var e = document.getElementById(id); if (e && href) e.setAttribute("href", href); }
    function setText(id, t) { var e = document.getElementById(id); if (e && t) { var sp = e.querySelector("span") || e; sp.textContent = t; } }
    if (wa) { var w = waLink(wa); setHref("waFloat", w); setHref("cmWhatsapp", w); setHref("footWa", w); }
    if (ph) { setHref("cmPhone", "tel:" + ph.replace(/[^0-9+]/g, "")); setText("phoneText", ph); }
    if (em) { setHref("cmEmail", "mailto:" + em); setText("emailText", em); setHref("footEmail", "mailto:" + em); var fe = document.getElementById("footEmail"); if (fe) { var sp = fe.querySelector("span"); if (sp) sp.textContent = em; } }
  }

  var SOCIAL_ICONS = {
    email: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 3.3.15 4.8 1.7 5 5 .06 1.3.07 1.6.07 4.7s0 3.5-.07 4.7c-.15 3.3-1.7 4.8-5 5-1.3.06-1.6.07-4.9.07s-3.6 0-4.9-.07c-3.3-.15-4.8-1.7-5-5C2.2 15.6 2.2 15.3 2.2 12s0-3.5.07-4.7c.15-3.3 1.7-4.8 5-5C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 12 18.6 6.6 6.6 0 0 0 12 5.4zm0 10.9A4.3 4.3 0 1 1 12 7.7a4.3 4.3 0 0 1 0 8.6zm6.8-11.2a1.54 1.54 0 1 1-3.08 0 1.54 1.54 0 0 1 3.08 0z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>',
    whatsapp: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.66 4.84 1.82 6.84L3 29l6.66-2.08a12.6 12.6 0 0 0 6.34 1.62h.01c7 0 12.69-5.7 12.69-12.69C28.7 8.7 23 3 16 3zm0 23.07h-.01a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.95 1.04 1.05-3.85-.25-.4a10.39 10.39 0 0 1-1.59-5.53c0-5.74 4.68-10.42 10.43-10.42 2.78 0 5.4 1.09 7.37 3.06a10.36 10.36 0 0 1 3.05 7.37c0 5.75-4.68 10.43-10.42 10.43zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-1 1.23-.18.21-.37.23-.68.08-.31-.16-1.32-.49-2.52-1.55-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55l-.61-.01c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.76.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-7-6.1 7H1.7l8.1-9.3L1 2h7l4.8 6.4L18.9 2zm-1.2 18h1.7L7.2 3.8H5.4L17.7 20z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.9 8.2H3.6V21h3.3V8.2zM5.2 3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM21 21h-3.3v-6.7c0-1.6-.6-2.7-2-2.7-1.1 0-1.7.7-2 1.4-.1.3-.1.6-.1 1V21H10.3V8.2h3.2v1.8c.4-.7 1.3-1.7 3.1-1.7 2.3 0 4 1.5 4 4.7V21z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12zM9.8 15.1V8.9l5.3 3.1-5.3 3.1z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.8v2.5c-1.2.1-2.3-.3-3.5-1v5.9c0 4-2.9 6.3-6 6.3a5.7 5.7 0 0 1-1-11.3v2.7a3 3 0 1 0 2.1 2.9V3h2.9z"/></svg>'
  };
  function applySocials(s) {
    var box = document.getElementById("socialLinks");
    if (!box) return;
    var cfg = window.VISADOO_CONFIG || {};
    var whatsappNumber = String(s.contact_whatsapp || cfg.WHATSAPP || WA_FALLBACK || "").replace(/[^0-9]/g, "");
    var emailAddr = String(s.contact_email || cfg.EMAIL || "hello@visadoo.com").trim();
    var order = ["instagram", "email", "whatsapp"];
    var labels = { instagram: "Instagram", email: "Email", whatsapp: "WhatsApp" };
    var keys = {
      instagram: s.social_instagram,
      email: emailAddr ? "mailto:" + emailAddr : "",
      whatsapp: whatsappNumber ? "https://wa.me/" + whatsappNumber : ""
    };
    var html = order.map(function (k) {
      if (!keys[k]) return '<span class="social-ico is-disabled" aria-label="' + labels[k] + ' link not configured" aria-disabled="true">' + SOCIAL_ICONS[k] + '</span>';
      return '<a href="' + keys[k] + '" target="_blank" rel="noopener" aria-label="' + labels[k] + '" class="social-ico social-' + k + '">' + SOCIAL_ICONS[k] + '</a>';
    }).join("");
    box.innerHTML = html;
    box.style.display = html ? "flex" : "none";
  }

  // Last-resort WhatsApp number so the float works on pages that don't load config.js
  // (e.g. the server-rendered country/visa/article/events pages). Mirrors config.js.
  // Brand & Settings (site_settings.contact_whatsapp) and config.js both override it.
  var WA_FALLBACK = "919895226697";
  // WhatsApp float icon — must match the homepage button (index.html) exactly.
  var WA_ICON = '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.66 4.84 1.82 6.84L3 29l6.66-2.08a12.6 12.6 0 0 0 6.34 1.62h.01c7 0 12.69-5.7 12.69-12.69C28.7 8.7 23 3 16 3zm0 23.07h-.01a10.4 10.4 0 0 1-5.3-1.45l-.38-.23-3.95 1.04 1.05-3.85-.25-.4a10.39 10.39 0 0 1-1.59-5.53c0-5.74 4.68-10.42 10.43-10.42 2.78 0 5.4 1.09 7.37 3.06a10.36 10.36 0 0 1 3.05 7.37c0 5.75-4.68 10.43-10.42 10.43zm5.72-7.8c-.31-.16-1.85-.91-2.14-1.02-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-1 1.23-.18.21-.37.23-.68.08-.31-.16-1.32-.49-2.52-1.55-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.54-.71-.55l-.61-.01c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.76.75.32 1.34.52 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.6-.37z"/></svg>';
  // Global "Chat with us" button: any customer-facing page that loads branding.js
  // inherits the exact homepage button. Pages that hard-code one (homepage, visa)
  // are skipped so it never duplicates. It's hidden on the admin console via CSS
  // (body.has-admin-side .wa-float). New frontend pages get it automatically.
  function ensureFloat() {
    if (!document.body || document.querySelector(".wa-float")) return;
    var a = document.createElement("a");
    a.className = "wa-float";
    a.id = "waFloat";
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Chat on WhatsApp");
    a.innerHTML = WA_ICON;
    document.body.appendChild(a);
  }

  function applyWhatsApp(s) {
    ensureFloat();
    var floats = document.querySelectorAll(".wa-float");
    if (!floats.length) return;
    var cfg = window.VISADOO_CONFIG || {};
    var num = (s.contact_whatsapp || cfg.WHATSAPP || WA_FALLBACK || "").replace(/[^0-9]/g, "");
    if (s.whatsapp_enabled === false || !num) {
      for (var i = 0; i < floats.length; i++) floats[i].style.display = "none";
      return;
    }
    var msg = s.whatsapp_message || "Hi, I have a question about a visa.";
    var href = "https://wa.me/" + num + "?text=" + encodeURIComponent(msg);
    for (var j = 0; j < floats.length; j++) {
      var f = floats[j];
      f.style.display = "";
      f.setAttribute("href", href);
      if (s.whatsapp_label && !f.querySelector(".wa-label")) {
        var lab = document.createElement("span");
        lab.className = "wa-label";
        lab.textContent = s.whatsapp_label;
        f.appendChild(lab);
        f.classList.add("has-label");
      }
    }
  }

  function announcementBar(s) {
    if (!s.announcement_active || !s.announcement_text) return;
    var key = "vd_ann_" + hashStr(s.announcement_text);
    try { if (localStorage.getItem(key)) return; } catch (e) {}
    var bar = document.createElement("div");
    bar.className = "ann-bar";
    var inner = s.announcement_link
      ? '<a href="' + s.announcement_link + '">' + escHtml(s.announcement_text) + "</a>"
      : escHtml(s.announcement_text);
    bar.innerHTML = '<div class="ann-inner">' + inner + '<button class="ann-x" aria-label="Dismiss">&times;</button></div>';
    document.body.insertBefore(bar, document.body.firstChild);
    bar.querySelector(".ann-x").onclick = function () { bar.remove(); try { localStorage.setItem(key, "1"); } catch (e) {} };
  }

  function cookieBanner(s) {
    if (s.cookie_enabled === false) return;
    try { if (localStorage.getItem("vd_cookie")) return; } catch (e) {}
    var txt = s.cookie_text || "We use essential cookies to run this site and keep you signed in.";
    var bar = document.createElement("div");
    bar.className = "cookie-bar";
    bar.innerHTML = '<span>' + escHtml(txt) + '</span><span class="cookie-btns"><button class="cookie-ok">Accept</button><button class="cookie-no">Decline</button></span>';
    document.body.appendChild(bar);
    function close() { bar.remove(); try { localStorage.setItem("vd_cookie", "1"); } catch (e) {} }
    bar.querySelector(".cookie-ok").onclick = close;
    bar.querySelector(".cookie-no").onclick = close;
  }

  function analytics(s) {
    if (!s.analytics_ga_id || window.__gaLoaded) return;
    window.__gaLoaded = true;
    var id = s.analytics_ga_id.trim();
    var sc = document.createElement("script"); sc.async = true; sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(sc);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag; gtag("js", new Date()); gtag("config", id);
  }

  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h); }
  function escHtml(s) { return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function apply(s) {
    applyColor(s.brand_color);
    setIcon("icon", s.favicon_url);
    setIcon("apple-touch-icon", s.app_icon_url || s.logo_url);
    applyBrand(s);
    applyContact(s);
    applySocials(s);
    applyWhatsApp(s);
    announcementBar(s);
    cookieBanner(s);
    analytics(s);
    window.__brand = s;
    document.dispatchEvent(new Event("brandloaded"));
  }

  fetch(SUPABASE_URL + "/rest/v1/site_settings?id=eq.global&select=*", { headers: { apikey: ANON, authorization: "Bearer " + ANON } })
    .then(function (r) { return r.json(); })
    .then(function (rows) { var s = rows && rows[0]; if (s) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { apply(s); }); else apply(s); } })
    .catch(function () {});
})();
