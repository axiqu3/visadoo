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
    var isSubdir = location.pathname.indexOf('/events/') !== -1 || location.pathname.indexOf('/articles/') !== -1 || location.pathname.indexOf('/p/') !== -1;
    var defaultLogo = isSubdir ? '../assets/logo_transparent.png' : 'assets/logo_transparent.png';
    var logo = (s && s.logo_url) || defaultLogo;
    var name = (s && s.brand_name) ? s.brand_name.trim() : "Visa Doo";
    var brands = document.querySelectorAll(".brand");
    for (var i = 0; i < brands.length; i++) {
      var el = brands[i];
      var img = el.querySelector("img");
      var isHeader = el.closest(".header, .discover-header");
      if (img) {
        img.alt = name || "Visa Doo";
        if (!img.getAttribute("src")) img.src = logo;
        if (isHeader) {
          img.classList.add("brand-logo-img");
          img.style.removeProperty("height");
          img.style.removeProperty("width");
          img.style.removeProperty("max-width");
        }
      } else {
        if (isHeader) {
          el.innerHTML = '<img src="' + logo + '" alt="' + (name || "Visa Doo") + '" class="brand-logo-img">';
        } else {
          el.innerHTML = '<img src="' + logo + '" alt="' + (name || "Visa Doo") + '" style="height:42px;width:auto;max-width:200px;display:block">';
        }
      }
    }
    if (name) {
      try { document.title = document.title.replace(/Visa Doo/g, name); } catch (e) {}
    }
  }

  function waLink(num) { return "https://wa.me/" + (num || "").replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Hi, I have a question about a visa."); }

  var GMAIL_ICON_SVG = '<svg class="contact-ico ico-email" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="#4285F4" d="M22.5 8.1v11.4c0 .8-.7 1.5-1.5 1.5h-3.5V12l-5.5 4.1L6.5 12V21H3c-.8 0-1.5-.7-1.5-1.5V8.1l5.5 4.1 5-3.8 5 3.8 5.5-4.1z"/><path fill="#34A853" d="M1.5 8.1V5.5C1.5 4.7 2.2 4 3 4h.9l8.1 6.1L20.1 4H21c.8 0 1.5.7 1.5 1.5v2.6l-10.5 7.9L1.5 8.1z"/><path fill="#EA4335" d="M1.5 5.5l10.5 7.9L22.5 5.5V5.5c0-.8-.7-1.5-1.5-1.5h-18c-.8 0-1.5.7-1.5 1.5v0z"/><path fill="#FBBC05" d="M17.5 4L12 8.1 6.5 4h11z"/></svg>';
  var WA_FOOT_ICON_SVG = '<svg class="contact-ico ico-wa" viewBox="0 0 24 24" width="24" height="24" fill="#25d366" aria-hidden="true"><path d="M12.042 2C6.5 2 2 6.5 2 12.042c0 2.213.716 4.261 1.934 5.925L2.5 21.5l3.655-1.402A10.003 10.003 0 0 0 12.042 22C17.5 22 22 17.5 22 12.042 22 6.5 17.5 2 12.042 2zm0 18.2c-1.637 0-3.167-.442-4.49-1.213l-.322-.188-2.658 1.02.99-2.585-.205-.337A8.163 8.163 0 0 1 3.842 12.042C3.842 7.518 7.518 3.842 12.042 3.842c4.524 0 8.2 3.676 8.2 8.2 0 4.524-3.676 8.158-8.2 8.158zm4.512-6.143c-.247-.124-1.463-.723-1.69-.805-.226-.082-.39-.124-.555.124-.165.247-.638.805-.783.97-.144.165-.288.185-.535.062-.247-.124-1.043-.385-1.986-1.226-.734-.655-1.23-1.464-1.374-1.711-.144-.247-.015-.38.109-.503.111-.11.247-.288.371-.432.124-.144.165-.247.247-.412.082-.165.041-.309-.021-.432-.062-.124-.556-1.34-.761-1.833-.2-.481-.404-.416-.555-.424h-.474c-.165 0-.432.062-.659.309s-.866.845-.866 2.061c0 1.216.886 2.391 1.01 2.556.124.165 1.745 2.664 4.228 3.737.59.255 1.05.407 1.41.522.593.188 1.133.161 1.56.097.476-.071 1.463-.598 1.669-1.175.206-.577.206-1.072.144-1.175-.062-.103-.226-.165-.473-.288z"/></svg>';

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
    if (em) { setHref("cmEmail", "mailto:" + em); setText("emailText", em); setHref("footEmail", "mailto:" + em); }
    
    // Ensure contact icons exist in footWa and footEmail
    var fe = document.getElementById("footEmail");
    if (fe) {
      fe.innerHTML = GMAIL_ICON_SVG + '<div class="contact-text-block"><span>Gmail</span><small>Chat with our visa team</small></div>';
      setHref("footEmail", "mailto:" + (em || "hello@visadoo.com"));
    }
    var fw = document.getElementById("footWa");
    if (fw) {
      var wUrl = wa ? waLink(wa) : "https://wa.me/919895226697?text=" + encodeURIComponent("Hi Visa Doo, I have a question about a visa.");
      fw.innerHTML = WA_FOOT_ICON_SVG + '<div class="contact-text-block"><span>WhatsApp</span><small>Chat with our visa team</small></div>';
      fw.setAttribute("href", wUrl);
    }
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
    a.innerHTML = WA_ICON + '<span class="wa-label">Chat with us</span>';
    document.body.appendChild(a);
  }

  function applyWhatsApp(s) {
    ensureFloat();
    var floats = document.querySelectorAll(".wa-float, .ai-wa-btn");
    var cfg = window.VISADOO_CONFIG || {};
    var num = (s.contact_whatsapp || cfg.WHATSAPP || WA_FALLBACK || "").replace(/[^0-9]/g, "");
    if (s.whatsapp_enabled === false || !num) {
      for (var i = 0; i < floats.length; i++) floats[i].style.display = "none";
      var waCards = document.querySelectorAll(".ai-wa-card");
      for (var k = 0; k < waCards.length; k++) waCards[k].style.display = "none";
      return;
    }
    var msg = s.whatsapp_message || "Hi, I have a question about a visa.";
    var href = "https://wa.me/" + num + "?text=" + encodeURIComponent(msg);
    for (var j = 0; j < floats.length; j++) {
      var f = floats[j];
      f.setAttribute("href", href);
      if (f.classList.contains("wa-float")) {
        var lab = f.querySelector(".wa-label");
        if (!lab) {
          lab = document.createElement("span");
          lab.className = "wa-label";
          f.appendChild(lab);
        }
        lab.textContent = s.whatsapp_label || "Chat with us";
        f.classList.add("has-label");
      } else {
        var parentCard = f.closest(".ai-wa-card");
        if (parentCard) parentCard.style.display = "flex";
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

  // ===== Global Multi-Language Translation System =====
  var VISADOO_LANGUAGES = [
    { code: 'en', name: 'English', flag: 'https://flagcdn.com/w40/gb.png', short: 'EN', dir: 'ltr' },
    { code: 'ar', name: 'العربية', flag: 'https://flagcdn.com/w40/sa.png', short: 'AR', dir: 'rtl' },
    { code: 'fr', name: 'Français', flag: 'https://flagcdn.com/w40/fr.png', short: 'FR', dir: 'ltr' },
    { code: 'es', name: 'Español', flag: 'https://flagcdn.com/w40/es.png', short: 'ES', dir: 'ltr' },
    { code: 'de', name: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png', short: 'DE', dir: 'ltr' },
    { code: 'ru', name: 'Русский', flag: 'https://flagcdn.com/w40/ru.png', short: 'RU', dir: 'ltr' }
  ];

  var UI_DICT = {
    en: {
      home: 'Home', explore: 'Explore', visaTypes: 'Visa Types', events: 'Happenings', articles: 'Articles', contact: 'Contact Us', track: 'Track visa',
      heroTitle: 'Get Your<br>Visa Now!', heroSub: 'Find Visa information for all countries and apply today.', heroBtn: 'Get your Visa now!',
      whereFrom: 'Where am I From?', whereTo: 'Where am I Going?', whereToPlaceholder: 'Search country or destination', viewMap: 'View Map',
      popDest: 'Popular destinations', chooseCountry: 'Choose your country',
      assistant: 'AI travel assistant', online: 'Online now', hello: 'Hi! I am VisaDoo AI. How can I help with your visa options, documents, processing times, or application tracking today?',
      placeholder: 'Ask about your visa…', send: 'Send', askAi: 'Ask AI',
      waTitle: 'Need human support?', waDesc: 'Chat with a visa specialist on WhatsApp.', waBtn: 'Chat with us'
    },
    ar: {
      home: 'الرئيسية', explore: 'استكشف', visaTypes: 'أنواع التأشيرات', events: 'الفعاليات', articles: 'المقالات', contact: 'اتصل بنا', track: 'تتبع التأشيرة',
      heroTitle: 'احصل على<br>تأشيرتك الآن!', heroSub: 'ابحث عن معلومات التأشيرة لجميع الدول وقدم طلبك اليوم.', heroBtn: 'احصل على تأشيرتك الآن!',
      whereFrom: 'من أين أنا؟', whereTo: 'إلى أين أنا ذاهب؟', whereToPlaceholder: 'إلى أين أنت ذاهب؟', viewMap: 'عرض الخريطة',
      popDest: 'الوجهات الشهيرة', chooseCountry: 'اختر بلدك',
      assistant: 'مساعد السفر الذكي', online: 'متصل الآن', hello: 'مرحباً! يمكنني المساعدة في خيارات التأشيرة والمستندات والرسوم والتتبع.',
      placeholder: 'اسأل عن تأشيرتك…', send: 'إرسال', askAi: 'اسأل الذكاء',
      waTitle: 'هل تحتاج إلى مساعدة؟', waDesc: 'تحدث مع خبير التأشيرات عبر واتساب.', waBtn: 'تواصل معنا'
    },
    fr: {
      home: 'Accueil', explore: 'Explorer', visaTypes: 'Types de visa', events: 'Événements', articles: 'Articles', contact: 'Contactez-nous', track: 'Suivi visa',
      heroTitle: 'Obtenez votre<br>visa maintenant !', heroSub: 'Trouvez les informations de visa pour tous les pays et postulez dès aujourd’hui.', heroBtn: 'Obtenez votre visa maintenant !',
      whereFrom: 'D\'où venez-vous ?', whereTo: 'Où allez-vous ?', whereToPlaceholder: 'Où allez-vous ?', viewMap: 'Voir la carte',
      popDest: 'Destinations populaires', chooseCountry: 'Choisissez votre pays',
      assistant: 'Assistant IA', online: 'En ligne', hello: 'Bonjour ! Je peux vous aider avec les visas, documents et suivi.',
      placeholder: 'Posez votre question…', send: 'Envoyer', askAi: 'Demander',
      waTitle: 'Besoin d\'aide humaine ?', waDesc: 'Discutez avec un expert sur WhatsApp.', waBtn: 'Discuter'
    },
    es: {
      home: 'Inicio', explore: 'Explorar', visaTypes: 'Tipos de visado', events: 'Eventos', articles: 'Artículos', contact: 'Contacto', track: 'Seguimiento',
      heroTitle: '¡Obtén tu<br>visado ahora!', heroSub: 'Encuentra información de visados para todos los países и solicita hoy.', heroBtn: '¡Obtén tu visado ahora!',
      whereFrom: '¿De dónde soy?', whereTo: '¿A dónde vas?', whereToPlaceholder: '¿A dónde vas?', viewMap: 'Ver mapa',
      popDest: 'Destinos populares', chooseCountry: 'Elige tu país',
      assistant: 'Asistente IA', online: 'En línea', hello: '¡Hola! Puedo ayudarte con visados, documentos y seguimiento.',
      placeholder: 'Haz una pregunta…', send: 'Enviar', askAi: 'Preguntar',
      waTitle: '¿Necesitas ayuda?', waDesc: 'Chatea con un experto en WhatsApp.', waBtn: 'Chatear'
    },
    de: {
      home: 'Startseite', explore: 'Entdecken', visaTypes: 'Visa-Arten', events: 'Veranstaltungen', articles: 'Artikel', contact: 'Kontakt', track: 'Visum verfolgen',
      heroTitle: 'Holen Sie sich Ihr<br>Visum jetzt!', heroSub: 'Finden Sie Visainformationen für alle Länder und beantragen Sie noch heute.', heroBtn: 'Jetzt Visum holen!',
      whereFrom: 'Woher komme ich?', whereTo: 'Wohin reise ich?', whereToPlaceholder: 'Wohin reisen Sie?', viewMap: 'Karte anzeigen',
      popDest: 'Beliebte Reiseziele', chooseCountry: 'Wählen Sie Ihr Land',
      assistant: 'KI-Reiseassistent', online: 'Jetzt online', hello: 'Hallo! Ich bin VisaDoo KI. Wie kann ich Ihnen heute bei Visa, Dokumenten oder Status helfen?',
      placeholder: 'Fragen Sie nach Ihrem Visum…', send: 'Senden', askAi: 'KI fragen',
      waTitle: 'Brauchen Sie Hilfe?', waDesc: 'Chatten Sie mit einem Visa-Spezialisten auf WhatsApp.', waBtn: 'Mit uns chatten'
    },
    ru: {
      home: 'Главная', explore: 'Обзор', visaTypes: 'Типы виз', events: 'События', articles: 'Статьи', contact: 'Контакты', track: 'Статус визы',
      heroTitle: 'Получите визу<br>прямо сейчас!', heroSub: 'Информация о визах во все страны мира. Подайте заявку сегодня.', heroBtn: 'Получить визу прямо сейчас!',
      whereFrom: 'Откуда я?', whereTo: 'Куда я еду?', whereToPlaceholder: 'Куда вы направляетесь?', viewMap: 'Показать карту',
      popDest: 'Популярные направления', chooseCountry: 'Выберите страну',
      assistant: 'ИИ-ассистент', online: 'В сети', hello: 'Здравствуйте! Я VisaDoo ИИ. Чем я могу помочь по визам, документам или статусу заявки?',
      placeholder: 'Задайте вопрос о визе…', send: 'Отправить', askAi: 'Спросить ИИ',
      waTitle: 'Нужна помощь?', waDesc: 'Напишите визовому эксперту в WhatsApp.', waBtn: 'Написать нам'
    }
  };

  function clearAllGoogleTranslateCookies() {
    var host = window.location.hostname;
    var parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 1) {
      domains.push('.' + parts.slice(-2).join('.'));
      domains.push(parts.slice(-2).join('.'));
    }
    var paths = ['/', window.location.pathname, ''];
    domains.forEach(function(d) {
      paths.forEach(function(p) {
        var dStr = d ? '; domain=' + d : '';
        var pStr = p ? '; path=' + p : '';
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC' + dStr + pStr;
        document.cookie = 'googtrans=/en/en; expires=Thu, 01 Jan 1970 00:00:00 UTC' + dStr + pStr;
      });
    });
  }

  // Early cleanup if user saved English
  try {
    var earlyLang = localStorage.getItem('visadoo-language') || 'en';
    if (earlyLang === 'en') {
      clearAllGoogleTranslateCookies();
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
      document.documentElement.classList.remove('visadoo-rtl', 'translated-rtl');
    }
  } catch(e){}

  function ensureGoogleTranslateEngine() {
    var saved = 'en';
    try { saved = localStorage.getItem('visadoo-language') || 'en'; } catch(e){}

    if (!document.getElementById('google_translate_element')) {
      var gtDiv = document.createElement('div');
      gtDiv.id = 'google_translate_element';
      gtDiv.style.display = 'none';
      gtDiv.setAttribute('aria-hidden', 'true');
      gtDiv.className = 'notranslate';
      gtDiv.setAttribute('translate', 'no');
      (document.body || document.documentElement).appendChild(gtDiv);
    }
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = function() {
        try {
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,ar,fr,es,de,ru',
            autoDisplay: false
          }, 'google_translate_element');

          var cur = 'en';
          try { cur = localStorage.getItem('visadoo-language') || 'en'; } catch(e){}
          if (cur && cur !== 'en' && UI_DICT[cur]) {
            setTimeout(function() { triggerGoogleTranslate(cur); }, 150);
          } else {
            clearAllGoogleTranslateCookies();
          }
        } catch(err) {}
      };
    }
    if (!document.getElementById('visadoo-gt-script')) {
      var sc = document.createElement('script');
      sc.id = 'visadoo-gt-script';
      sc.type = 'text/javascript';
      sc.async = true;
      sc.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.head.appendChild(sc);
    }
  }

  function setGoogleTranslateCookie(lang) {
    if (lang === 'en' || !lang) {
      clearAllGoogleTranslateCookies();
      return;
    }
    var host = window.location.hostname;
    var parts = host.split('.');
    var rootDomain = parts.length > 1 ? parts.slice(-2).join('.') : host;
    var val = '/en/' + lang;
    document.cookie = 'googtrans=' + val + '; path=/;';
    document.cookie = 'googtrans=' + val + '; domain=' + host + '; path=/;';
    if (rootDomain && rootDomain !== host) {
      document.cookie = 'googtrans=' + val + '; domain=.' + rootDomain + '; path=/;';
    }
  }

  function triggerGoogleTranslate(lang) {
    if (lang === 'en') {
      clearAllGoogleTranslateCookies();
      return;
    }
    setGoogleTranslateCookie(lang);
    var attempts = 0;
    function tryApply() {
      var combo = document.querySelector('.goog-te-combo');
      if (combo) {
        if (combo.value !== lang) {
          combo.value = lang;
          combo.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      attempts++;
      if (attempts < 25) {
        setTimeout(tryApply, 120);
      }
    }
    tryApply();
  }

  function setDocumentLanguageAndDir(lang) {
    var isRtl = (lang === 'ar');
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    if (isRtl) {
      document.documentElement.classList.add('visadoo-rtl');
    } else {
      document.documentElement.classList.remove('visadoo-rtl', 'translated-rtl');
      if (document.body) {
        document.body.style.top = '0px';
      }
    }
  }

  function applyFastTranslations(lang) {
    var copy = UI_DICT[lang] || UI_DICT.en;

    var homeLink = document.querySelector('.nav-links a[href*="index"], .nav-links a[href="/"], .nav-links a[href="#top"], .nav-links a[href="#destinations"]');
    if (homeLink) homeLink.textContent = copy.home || 'Home';

    var vtLink = document.querySelector('.nav-links a[href*="visa-types"]');
    if (vtLink) vtLink.textContent = copy.visaTypes || 'Visa Types';

    var evsLink = document.querySelector('.nav-links a[href*="events"]');
    if (evsLink) evsLink.textContent = copy.events || 'Happenings';

    var artLink = document.querySelector('.nav-links a[href*="articles"]');
    if (artLink) artLink.textContent = copy.articles;

    var cntLink = document.querySelector('.nav-links a[href*="contact"]');
    if (cntLink) cntLink.textContent = copy.contact || 'Contact Us';

    var trkLink = document.querySelector('.nav-track, .nav-actions a[href*="track"]');
    if (trkLink) {
      var span = trkLink.querySelector('span') || trkLink;
      if (span.childNodes.length === 1) {
        span.textContent = copy.track;
      }
    }

    var heroTitle = document.querySelector('.hero-curved-title');
    if (heroTitle) heroTitle.innerHTML = copy.heroTitle;

    var heroSub = document.querySelector('.hero-curved-sub');
    if (heroSub) heroSub.textContent = copy.heroSub;

    var heroBtn = document.querySelector('.hero-pill-btn span');
    if (heroBtn) heroBtn.textContent = copy.heroBtn;

    var fromLabel = document.querySelector('#heroFromTrigger .dock-field-label');
    if (fromLabel) fromLabel.textContent = copy.whereFrom;

    var toLabel = document.querySelector('#heroToField .dock-field-label');
    if (toLabel) toLabel.textContent = copy.whereTo;

    var toInput = document.querySelector('#destSearch');
    if (toInput) {
      toInput.placeholder = copy.whereToPlaceholder;
      toInput.setAttribute('aria-label', copy.whereToPlaceholder);
    }

    var mapBtnSpan = document.querySelector('#mapToggle span');
    if (mapBtnSpan) mapBtnSpan.textContent = copy.viewMap;

    var kicker = document.querySelector('.board-kicker');
    if (kicker) kicker.textContent = copy.popDest;

    var boardHeading = document.querySelector('.board-heading h2');
    if (boardHeading) boardHeading.textContent = copy.chooseCountry;

    var aiTriggerSpan = document.querySelector('.ai-assistant-trigger span');
    if (aiTriggerSpan) aiTriggerSpan.textContent = copy.askAi || 'Ask AI';

    var aiPanelTitle = document.querySelector('.ai-assistant-panel header b');
    if (aiPanelTitle) aiPanelTitle.textContent = copy.assistant;

    var aiOnlineSpan = document.querySelector('.ai-assistant-panel header small span');
    if (aiOnlineSpan) aiOnlineSpan.textContent = copy.online;

    var firstMsg = document.querySelector('.ai-conversation .ai-message-bot');
    if (firstMsg) {
      firstMsg.textContent = copy.hello;
    }

    var aiWaTitle = document.querySelector('.ai-wa-details h4');
    if (aiWaTitle) aiWaTitle.textContent = copy.waTitle;

    var aiWaDesc = document.querySelector('.ai-wa-details p');
    if (aiWaDesc) aiWaDesc.textContent = copy.waDesc;

    var aiWaBtnSpan = document.querySelector('.ai-wa-btn span');
    if (aiWaBtnSpan) aiWaBtnSpan.textContent = copy.waBtn;

    var aiInput = document.querySelector('.ai-input-row [data-ai-input]');
    if (aiInput) aiInput.placeholder = copy.placeholder;

    var aiSendBtn = document.querySelector('.ai-input-row [data-ai-send]');
    if (aiSendBtn) aiSendBtn.textContent = copy.send;
  }

  function buildLanguageOptionsHTML() {
    return VISADOO_LANGUAGES.map(function(l) {
      return '<button type="button" role="option" data-language-option="' + l.code + '" class="notranslate" translate="no">' +
        '<img src="' + l.flag + '" alt="' + l.name + ' flag" class="flag-icon notranslate" translate="no">' +
        '<span class="notranslate" translate="no">' + l.name + '</span>' +
        '<i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i>' +
      '</button>';
    }).join('');
  }

  window.visadooSetLanguage = function(code, isInitialLoad) {
    if (!UI_DICT[code]) code = 'en';
    var prev = 'en';
    try { prev = localStorage.getItem('visadoo-language') || 'en'; } catch(err) {}
    try { localStorage.setItem('visadoo-language', code); } catch(err) {}
    
    if (code === 'en') {
      clearAllGoogleTranslateCookies();
      setDocumentLanguageAndDir('en');
      applyFastTranslations('en');

      var isTranslated = prev !== 'en' ||
        document.documentElement.classList.contains('translated-rtl') ||
        document.documentElement.classList.contains('translated-ltr') ||
        (document.body && document.body.style.top && document.body.style.top !== '0px') ||
        (document.querySelector('.goog-te-combo') && document.querySelector('.goog-te-combo').value && document.querySelector('.goog-te-combo').value !== 'en');

      if (!isInitialLoad && isTranslated) {
        window.location.reload();
        return;
      }
    } else {
      setDocumentLanguageAndDir(code);
      applyFastTranslations(code);
      triggerGoogleTranslate(code);
    }

    var langObj = VISADOO_LANGUAGES.find(function(l) { return l.code === code; }) || VISADOO_LANGUAGES[0];

    document.querySelectorAll('[data-language-header-name]').forEach(function(el) {
      el.textContent = langObj.short;
    });

    document.querySelectorAll('[data-language-option]').forEach(function(btn) {
      var optCode = btn.getAttribute('data-language-option');
      var isSelected = (optCode === code);
      btn.setAttribute('aria-selected', String(isSelected));
      var tick = btn.querySelector('i');
      if (tick) tick.style.display = isSelected ? 'inline-block' : 'none';
    });

    var nativeSelector = document.getElementById('siteLanguage');
    if (nativeSelector && nativeSelector.value !== code) {
      nativeSelector.value = code;
      nativeSelector.dispatchEvent(new Event('change', { bubbles: true }));
    }

    document.dispatchEvent(new CustomEvent('languagechanged', { detail: code }));
    if (typeof window.applyLanguage === 'function') {
      window.applyLanguage(code);
    }
  };

  window.initLanguageSelectorIn = function(actions) {
    ensureGoogleTranslateEngine();

    var container = actions ? actions.querySelector('.site-language-header-selector') : document.querySelector('.site-language-header-selector');

    if (!container && actions) {
      container = document.createElement('div');
      container.className = 'site-language-header-selector notranslate';
      container.setAttribute('translate', 'no');
      container.innerHTML =
        '<button class="site-language-trigger notranslate" translate="no" type="button" aria-haspopup="listbox" aria-expanded="false">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" class="globe-icon notranslate" style="margin-right: 4px; display: inline-block; vertical-align: middle;">' +
            '<circle cx="12" cy="12" r="10"/>' +
            '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' +
            '<path d="M2 12h20"/>' +
          '</svg>' +
          '<b data-language-header-name class="notranslate" translate="no">EN</b>' +
        '</button>' +
        '<div class="site-language-menu header-menu notranslate" translate="no" role="listbox" aria-label="Languages" style="display: none;">' +
          buildLanguageOptionsHTML() +
        '</div>';
      actions.insertBefore(container, actions.firstChild);
    } else if (container) {
      container.classList.add('notranslate');
      container.setAttribute('translate', 'no');
      var menu = container.querySelector('.site-language-menu');
      if (menu) {
        menu.classList.add('notranslate');
        menu.setAttribute('translate', 'no');
        menu.innerHTML = buildLanguageOptionsHTML();
      }
    }

    if (!container) return;

    var trigger = container.querySelector('.site-language-trigger');
    var menu = container.querySelector('.site-language-menu');
    if (!trigger || !menu) return;

    function openMenu() {
      menu.style.display = 'flex';
      trigger.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      menu.style.display = 'none';
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.onclick = function(e) {
      e.stopPropagation();
      var isOpen = menu.style.display === 'flex';
      if (isOpen) closeMenu();
      else openMenu();
    };

    document.addEventListener('click', function() {
      closeMenu();
    });

    menu.onclick = function(e) {
      e.stopPropagation();
    };

    container.querySelectorAll('[data-language-option]').forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var code = btn.getAttribute('data-language-option');
        window.visadooSetLanguage(code, false);
        closeMenu();
      };
    });

    var saved = 'en';
    try { saved = localStorage.getItem('visadoo-language') || 'en'; } catch(err) {}
    if (!UI_DICT[saved]) saved = 'en';
    window.visadooSetLanguage(saved, true);
  };

  window.visadooHasActiveDraft = function() {
    try {
      var travDraft = sessionStorage.getItem('visadoo-traveller-draft') || localStorage.getItem('visadoo-traveller-draft');
      if (travDraft && travDraft.trim().length > 15 && travDraft !== '{}' && travDraft !== 'null') {
        try {
          var parsed = JSON.parse(travDraft);
          if (parsed && parsed.travellers && parsed.travellers.length > 0) {
            var hasUnsubmitted = parsed.travellers.some(function(t) { return !t.submitted; });
            if (hasUnsubmitted) {
              return true;
            }
          }
        } catch (_e) {}
      }
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('visadoo-draft-') === 0 && k !== 'visadoo-draft-data') {
          var val = localStorage.getItem(k);
          if (val && typeof val === 'string' && val.trim().length > 15 && val !== '{}' && val !== 'null') {
            return true;
          }
        }
      }
    } catch (_e) {}
    return false;
  };

  window.updateDraftResumeButtonVisibility = function() {
    var hasDraft = window.visadooHasActiveDraft();
    var btns = document.querySelectorAll('.site-draft-resume-btn');
    btns.forEach(function(btn) {
      if (hasDraft) {
        btn.classList.add('is-active');
        btn.setAttribute('data-has-draft', 'true');
        btn.removeAttribute('hidden');
        btn.style.setProperty('display', 'inline-flex', 'important');
      } else {
        btn.classList.remove('is-active');
        btn.removeAttribute('data-has-draft');
        btn.setAttribute('hidden', '');
        btn.style.setProperty('display', 'none', 'important');
      }
    });
  };

  window.initDraftResumeButton = function(actions) {
    var parent = actions || document.querySelector('.header .nav-actions') || document.querySelector('.nav-actions');
    if (!parent) return null;

    var btn = parent.querySelector('.site-draft-resume-btn');
    if (!btn) {
      btn = document.createElement('a');
      btn.className = 'site-draft-resume-btn notranslate';
      btn.setAttribute('translate', 'no');
      btn.setAttribute('title', 'Resume Last Visa Application');
      btn.setAttribute('aria-label', 'Resume Last Visa Application');
      btn.href = 'javascript:void(0)';
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' +
          '<polyline points="14 2 14 8 20 8"></polyline>' +
          '<line x1="16" y1="13" x2="8" y2="13"></line>' +
          '<line x1="16" y1="17" x2="8" y2="17"></line>' +
          '<line x1="10" y1="9" x2="8" y2="9"></line>' +
        '</svg>' +
        '<span>Continue</span>';

      btn.onclick = function(e) {
        e.preventDefault();
        var targetUrl = null;
        try {
          var tDraft = null;
          try {
            var sVal = sessionStorage.getItem('visadoo-traveller-draft');
            if (sVal) tDraft = JSON.parse(sVal);
          } catch(_e) {}
          if (!tDraft) {
            try {
              var lVal = localStorage.getItem('visadoo-traveller-draft');
              if (lVal) tDraft = JSON.parse(lVal);
            } catch(_e) {}
          }
          if (tDraft && tDraft.travellers && tDraft.travellers.length > 1) {
            var hasUnsubmitted = tDraft.travellers.some(function(t) { return !t.submitted; });
            if (hasUnsubmitted) {
              var vType = tDraft.visa || 'uae-tourist-visa-30-days';
              targetUrl = 'app.html?visa=' + encodeURIComponent(vType) + '&travellers=' + tDraft.travellers.length + '&view=travellers';
            }
          }
          if (!targetUrl) {
            for (var i = 0; i < localStorage.length; i++) {
              var k = localStorage.key(i);
              if (k && k.indexOf('visadoo-draft-') === 0 && k !== 'visadoo-draft-data') {
                var val = localStorage.getItem(k);
                if (val && typeof val === 'string' && val.trim().length > 15 && val !== '{}' && val !== 'null') {
                  var vId = k.replace('visadoo-draft-', '').replace(/-\d+$/, '');
                  if (vId) {
                    targetUrl = 'app.html?visa=' + encodeURIComponent(vId);
                    break;
                  }
                }
              }
            }
          }
          if (!targetUrl) {
            var lastSavedUrl = localStorage.getItem('visadoo-last-draft-url');
            if (lastSavedUrl) targetUrl = lastSavedUrl;
          }
        } catch (_e) {}

        if (targetUrl) {
          window.location.href = targetUrl;
        } else {
          window.location.href = 'app.html';
        }
      };

      var langSelector = parent.querySelector('.site-language-header-selector');
      if (langSelector && langSelector.nextSibling) {
        parent.insertBefore(btn, langSelector.nextSibling);
      } else {
        parent.appendChild(btn);
      }
    }

    window.updateDraftResumeButtonVisibility();
    return btn;
  };

  window.addEventListener('storage', function(e) {
    if (e && e.key && (e.key.indexOf('visadoo-draft') === 0 || e.key === 'visadoo-last-draft-url' || e.key === 'visadoo_has_submitted_app')) {
      window.updateDraftResumeButtonVisibility();
      if (typeof window.updateNewVisaButtonVisibility === 'function') window.updateNewVisaButtonVisibility();
    }
  });
  document.addEventListener('visadoo:draft-updated', function() {
    window.updateDraftResumeButtonVisibility();
    if (typeof window.updateNewVisaButtonVisibility === 'function') window.updateNewVisaButtonVisibility();
  });
  document.addEventListener('visadoo:app-submitted', function() {
    window.updateDraftResumeButtonVisibility();
    if (typeof window.updateNewVisaButtonVisibility === 'function') window.updateNewVisaButtonVisibility();
  });

  window.visadooHasSubmittedApp = function() {
    try {
      if (localStorage.getItem('visadoo_has_submitted_app') === 'true') return true;
    } catch (_e) {}
    return false;
  };

  window.updateNewVisaButtonVisibility = function() {
    var btns = document.querySelectorAll('.site-new-visa-btn');
    btns.forEach(function(btn) {
      if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    });
  };

  window.initNewVisaButton = function(actions) {
    var parent = actions || document.querySelector('.header .nav-actions') || document.querySelector('.nav-actions');
    if (parent) {
      var btns = parent.querySelectorAll('.site-new-visa-btn');
      btns.forEach(function(btn) {
        if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
      });
    }
    return null;
  };

  var dropdownsInitialized = false;
  var showAllInDropdown = false;
  var dropdownSearchQuery = '';
  var dbCountries = [];
  var dbNationalities = [];
  var nationalityDestinationMap = {};
  var eligibleSlugs = ['spain', 'denmark', 'south-korea', 'germany', 'france', 'switzerland', 'ireland', 'japan', 'thailand', 'bahrain', 'russia', 'indonesia', 'kenya', 'vietnam', 'morocco', 'srilanka', 'sri-lanka', 'turkey', 'united-arab-emirates', 'uae', 'qatar', 'china', 'greece', 'italy', 'egypt', 'egypt-2', 'philippines', 'oman', 'saudi-arabia', 'saudi'];
  var natDropdown = null;
  var destDropdown = null;

  function flagImgUrl(iso2) {
    return iso2 ? 'https://flagcdn.com/w80/' + iso2.toLowerCase() + '.png' : '';
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getPageSlug() {
    var params = new URLSearchParams(window.location.search);
    if (params.has('slug')) {
      return String(params.get('slug') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    }
    var path = window.location.pathname;
    if (path.indexOf('/country/') > -1) {
      return String(path.split('/country/')[1].replace(/\/$/, '')).toLowerCase().replace(/[^a-z0-9-]/g, '');
    }
    return '';
  }

  function dropdownCountryHref(slug) {
    var localPreview = window.location.protocol === 'file:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1';
    return localPreview ? 'country.html?slug=' + encodeURIComponent(slug) : '/country/' + encodeURIComponent(slug);
  }

  function fastestEta(visas){
    if(!visas||!visas.length) return null;
    var best=null, bestHrs=999999;
    visas.forEach(function(v){
      var slug = ((v.slug || '') + ' ' + (v.country_slug || '')).toLowerCase();
      var val = v.processing_time_value;
      var unit = (v.processing_time_unit||'').toLowerCase();
      if (!val || !unit) {
        if (slug.indexOf('super-express') > -1) { val = 12; unit = 'hours'; }
        else if (slug.indexOf('express') > -1) { val = slug.indexOf('uae') > -1 ? 48 : 24; unit = 'hours'; }
        else if (slug.indexOf('united-arab-emirates') > -1 || slug.indexOf('uae') > -1 || slug.indexOf('dubai') > -1) { val='3-5'; unit='working days'; }
        else if (slug.indexOf('vietnam') > -1) { val='3-5'; unit='working days'; }
        else if (slug.indexOf('thailand') > -1) { val=24; unit='hours'; }
        else if (slug.indexOf('morocco') > -1) { val='3-5'; unit='working days'; }
        else if (slug.indexOf('qatar') > -1) { val='5-6'; unit='working days'; }
        else if (slug.indexOf('srilanka') > -1 || slug.indexOf('sri-lanka') > -1) { val='24-48'; unit='hours'; }
        else if (slug.indexOf('kenya') > -1) { val=2; unit='days'; }
        else if (slug.indexOf('russia') > -1) { val='10-12'; unit='days'; }
        else if (slug.indexOf('indonesia') > -1) { val='5-7'; unit='working days'; }
        else if (slug.indexOf('azerbaijan') > -1) { val=3; unit='days'; }
        else if (slug.indexOf('bahrain') > -1) { val='3-5'; unit='working days'; }
        else if (slug.indexOf('egypt') > -1) { val='10-15'; unit='days'; }
        else if (slug.indexOf('philippines') > -1) { val='8-10'; unit='days'; }
        else if (slug.indexOf('saudi') > -1) { val='5'; unit='working days'; }
        else if (slug.indexOf('oman') > -1) { val='5-6'; unit='days'; }
      }

      var numVal = parseInt(String(val).split('-')[0], 10);
      if(isNaN(numVal)) return;
      var hrs=numVal;
      if(unit.indexOf('day')>-1) hrs=numVal*24;
      else if(unit.indexOf('week')>-1) hrs=numVal*24*7;
      else if(unit.indexOf('month')>-1) hrs=numVal*24*30;
      if(hrs<bestHrs){ bestHrs=hrs; best={value:val, unit:unit, hours:hrs}; }
    });
    return best;
  }
  
  function etaLabel(eta){
    if(!eta) return '';
    var unit=String(eta.unit||'').toLowerCase();
    if(unit.indexOf('working')>-1 || unit.indexOf('business')>-1) return eta.value + ' working days';
    if(unit.indexOf('hour')>-1) return eta.value + (eta.value===1?' hr':' hrs');
    if(unit.indexOf('day')>-1) return eta.value + (eta.value===1?' day':' days');
    return eta.value + ' ' + eta.unit;
  }

  function loadDropdownDestinations() {
    var url = SUPABASE_URL + "/rest/v1/countries?select=*&order=sort_order";
    var visaUrl = SUPABASE_URL + "/rest/v1/visa_types?active=eq.true&select=slug,country_slug,processing_time_value,processing_time_unit";
    
    var natUrl = SUPABASE_URL + "/rest/v1/pages?slug=eq.system-nationality-destinations&status=eq.published&select=content&limit=1";
    Promise.all([
      fetch(url, { headers: { apikey: ANON, authorization: "Bearer " + ANON } }).then(function(r){return r.json();}),
      fetch(visaUrl, { headers: { apikey: ANON, authorization: "Bearer " + ANON } }).then(function(r){return r.json();}),
      fetch(natUrl, { headers: { apikey: ANON, authorization: "Bearer " + ANON } }).then(function(r){return r.ok?r.json():[];})
    ]).then(function(res) {
      var allDbCountries = res[0] || [];
      var countries = allDbCountries.filter(function(c) {
        return c.active;
      });
      
      var visas = res[1] || [];
      var cfgRows=Array.isArray(res[2])?res[2]:[]; var parsed=[];
      try{ parsed=JSON.parse((cfgRows[0]&&cfgRows[0].content)||'[]'); }catch(e){ parsed=[]; }
      dbNationalities=(Array.isArray(parsed)?parsed:[]).filter(function(n){return n.active!==false;}).sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0);});
      nationalityDestinationMap = {};
      dbNationalities.forEach(function(n){ nationalityDestinationMap[n.id]=Array.isArray(n.destinations)?n.destinations:[]; });
      window.visadooDbNationalities = dbNationalities;
      window.visadooNationalityDestinationMap = nationalityDestinationMap;
      window.getVisadooAllowedDestinations = function(name) {
        var nName = name || localStorage.getItem('visadoo_nationality') || 'India';
        var nat = dbNationalities.filter(function(n){ return n.name === nName; })[0];
        return nat && Array.isArray(nat.destinations) ? nat.destinations : null;
      };
      renderNationalityOptions();
      
      countries.forEach(function(c) {
        var cv = visas.filter(function(v){ return v.country_slug === c.slug; });
        c.eta = fastestEta(cv);
      });
      
      dbCountries = countries;
      window.visadooDbCountries = dbCountries;
      renderDropdownGrid();
    }).catch(function(err){ console.error(err); });
  }

  function renderDropdownGrid() {
    var grid = document.getElementById('destDropdownGrid');
    if (!grid) return;

    var filtered = dbCountries;
    var selectedNatName = localStorage.getItem('visadoo_nationality') || 'India';
    var selectedNat = dbNationalities.filter(function(n){ return n.name===selectedNatName; })[0];
    var mappedSlugs = selectedNat ? (nationalityDestinationMap[selectedNat.id] || []) : null;
    if (mappedSlugs) {
      filtered = dbCountries.filter(function(c){ return mappedSlugs.indexOf(c.slug) > -1; });
    } else if (!showAllInDropdown) {
      filtered = dbCountries.filter(function(c) {
        return eligibleSlugs.indexOf(c.slug) > -1;
      });
    }

    if (dropdownSearchQuery) {
      var q = dropdownSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(function(c) {
        return (c.name || '').toLowerCase().indexOf(q) > -1;
      });
    }

    var html = filtered.map(function(c) {
      var etaVal = c.eta ? etaLabel(c.eta) : '';
      if (etaVal.toLowerCase() === 'flexible') etaVal = '';
      
      var flagUrl = flagImgUrl(c.iso2);
      var currentSlug = getPageSlug();
      var activeClass = currentSlug === c.slug ? ' active' : '';

      return '<a class="dest-dropdown-card' + activeClass + '" href="' + dropdownCountryHref(c.slug) + '" data-slug="' + c.slug + '" data-value="' + c.name + '">' +
        '<div class="dest-dropdown-card-left">' +
          '<img src="' + flagUrl + '" alt="">' +
          '<span class="dest-card-name">' + escHtml(c.name) + '</span>' +
        '</div>' +
        '<div class="dest-dropdown-card-right">' +
          (etaVal ? '<span class="dest-card-eta' + (etaVal.toLowerCase() === 'instant' ? ' instant' : '') + '">' + etaVal + '</span>' : '') +
          '<span class="dest-card-arrow">&gt;</span>' +
        '</div>' +
      '</a>';
    }).join('');

    grid.innerHTML = html || '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 14px; grid-column: span 3;">No destinations found</div>';

    var cards = grid.querySelectorAll('.dest-dropdown-card');
    for (var i = 0; i < cards.length; i++) {
      (function(card) {
        card.onclick = function(e) {
          e.preventDefault();
          var val = card.getAttribute('data-value');
          var slug = card.getAttribute('data-slug');
          
          var destMenu = document.querySelector('#destinationDropdown .header-dropdown-menu');
          if (destMenu) {
            destMenu.setAttribute('data-selected-slug', slug);
            destMenu.setAttribute('data-selected-name', val);
          }
          var destText = document.getElementById('selectedDestinationText');
          if (destText) destText.textContent = val;
          
          var activeCard = grid.querySelector('.dest-dropdown-card.active');
          if (activeCard) activeCard.classList.remove('active');
          card.classList.add('active');

          closeAllDropdowns();
          checkAndRedirect();
        };
      })(cards[i]);
    }
  }

  var BUILTIN_COUNTRY_PHOTOS = {
    'india': 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80',
    'in': 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80',
    'qatar': 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=600&q=80',
    'qa': 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=600&q=80',
    'united-arab-emirates': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=600&q=80',
    'uae': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=600&q=80',
    'ae': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=600&q=80',
    'dubai': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=600&q=80',
    'saudi-arabia': 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=600&q=80',
    'sa': 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?auto=format&fit=crop&w=600&q=80',
    'oman': 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=600&q=80',
    'om': 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=600&q=80',
    'bahrain': 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?auto=format&fit=crop&w=600&q=80',
    'bh': 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?auto=format&fit=crop&w=600&q=80',
    'kuwait': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
    'kw': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
    'egypt': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=600&q=80',
    'eg': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=600&q=80',
    'pakistan': 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80',
    'pk': 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80',
    'bangladesh': 'https://images.unsplash.com/photo-1608958435020-e8a7109ba809?auto=format&fit=crop&w=600&q=80',
    'bd': 'https://images.unsplash.com/photo-1608958435020-e8a7109ba809?auto=format&fit=crop&w=600&q=80',
    'sri-lanka': 'https://images.unsplash.com/photo-1612862862126-865765df2ded?auto=format&fit=crop&w=600&q=80',
    'srilanka': 'https://images.unsplash.com/photo-1612862862126-865765df2ded?auto=format&fit=crop&w=600&q=80',
    'lk': 'https://images.unsplash.com/photo-1612862862126-865765df2ded?auto=format&fit=crop&w=600&q=80',
    'nepal': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
    'np': 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
    'united-kingdom': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
    'uk': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
    'gb': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
    'united-states': 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=600&q=80',
    'usa': 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=600&q=80',
    'us': 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=600&q=80',
    'canada': 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=600&q=80',
    'ca': 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=600&q=80',
    'france': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
    'fr': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
    'germany': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=600&q=80',
    'de': 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=600&q=80',
    'italy': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
    'it': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80',
    'spain': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=600&q=80',
    'es': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=600&q=80',
    'turkey': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80',
    'turkiye': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80',
    'tr': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80',
    'morocco': 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?auto=format&fit=crop&w=600&q=80',
    'ma': 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?auto=format&fit=crop&w=600&q=80',
    'thailand': 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=600&q=80',
    'th': 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=600&q=80',
    'singapore': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80',
    'sg': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80',
    'malaysia': 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=600&q=80',
    'my': 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=600&q=80',
    'indonesia': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
    'id': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
    'philippines': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80',
    'ph': 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80',
    'vietnam': 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80',
    'vn': 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80',
    'japan': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80',
    'jp': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=600&q=80',
    'china': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80',
    'cn': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=600&q=80',
    'south-korea': 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=600&q=80',
    'korea': 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=600&q=80',
    'kr': 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=600&q=80',
    'australia': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80',
    'au': 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80',
    'new-zealand': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
    'nz': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
    'jordan': 'https://images.unsplash.com/photo-1579606032834-d92237887e45?auto=format&fit=crop&w=600&q=80',
    'jo': 'https://images.unsplash.com/photo-1579606032834-d92237887e45?auto=format&fit=crop&w=600&q=80',
    'lebanon': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
    'lb': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80',
    'kenya': 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?auto=format&fit=crop&w=600&q=80',
    'ke': 'https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?auto=format&fit=crop&w=600&q=80',
    'south-africa': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80',
    'za': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80',
    'brazil': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80',
    'br': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80',
    'russia': 'https://images.unsplash.com/photo-1520106212299-d99c443e4568?auto=format&fit=crop&w=600&q=80',
    'ru': 'https://images.unsplash.com/photo-1520106212299-d99c443e4568?auto=format&fit=crop&w=600&q=80',
    'georgia': 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80',
    'ge': 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80',
    'azerbaijan': 'https://images.unsplash.com/photo-1580837119756-563d608dd119?auto=format&fit=crop&w=600&q=80',
    'az': 'https://images.unsplash.com/photo-1580837119756-563d608dd119?auto=format&fit=crop&w=600&q=80',
    'uzbekistan': 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=600&q=80',
    'uz': 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=600&q=80',
    'armenia': 'https://images.unsplash.com/photo-1577702312706-e23ff063064f?auto=format&fit=crop&w=600&q=80',
    'am': 'https://images.unsplash.com/photo-1577702312706-e23ff063064f?auto=format&fit=crop&w=600&q=80',
    'cambodia': 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=600&q=80',
    'kh': 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=600&q=80',
    'tanzania': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
    'tz': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
    'tajikistan': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    'tj': 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
    'maldives': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80',
    'mv': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80',
    'switzerland': 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=600&q=80',
    'ch': 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=600&q=80',
    'netherlands': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=600&q=80',
    'nl': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=600&q=80',
    'greece': 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
    'gr': 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
    'portugal': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=600&q=80',
    'pt': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=600&q=80',
    'sweden': 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=600&q=80',
    'se': 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=600&q=80',
    'norway': 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80',
    'no': 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80',
    'denmark': 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=600&q=80',
    'dk': 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=600&q=80',
    'finland': 'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&w=600&q=80',
    'fi': 'https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&w=600&q=80',
    'poland': 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=600&q=80',
    'pl': 'https://images.unsplash.com/photo-1519197924294-4ba991a11128?auto=format&fit=crop&w=600&q=80',
    'austria': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=600&q=80',
    'at': 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=600&q=80',
    'belgium': 'https://images.unsplash.com/photo-1491557345352-5929e343eb89?auto=format&fit=crop&w=600&q=80',
    'be': 'https://images.unsplash.com/photo-1491557345352-5929e343eb89?auto=format&fit=crop&w=600&q=80',
    'croatia': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
    'hr': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80',
    'czech-republic': 'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=600&q=80',
    'czechia': 'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=600&q=80',
    'cz': 'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=600&q=80',
    'hungary': 'https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?auto=format&fit=crop&w=600&q=80',
    'hu': 'https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?auto=format&fit=crop&w=600&q=80',
    'iceland': 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=600&q=80',
    'is': 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=600&q=80',
    'ireland': 'https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?auto=format&fit=crop&w=600&q=80',
    'ie': 'https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?auto=format&fit=crop&w=600&q=80',
    'luxembourg': 'https://images.unsplash.com/photo-1569429593410-b498b3fb3387?auto=format&fit=crop&w=600&q=80',
    'lu': 'https://images.unsplash.com/photo-1569429593410-b498b3fb3387?auto=format&fit=crop&w=600&q=80',
    'malta': 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=600&q=80',
    'mt': 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=600&q=80'
  };

  function getCountryPhoto(name, iso) {
    var rawName = (name || '').toLowerCase().trim();
    var slug = rawName.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var isoCode = (iso || '').toLowerCase().trim();
    var photos = window.VISADOO_DESTINATION_PHOTOS || {};

    if (photos[slug]) return photos[slug];
    if (photos[slug + '-card']) return photos[slug + '-card'];
    if (photos[slug + '-banner']) return photos[slug + '-banner'];
    if (isoCode && photos[isoCode]) return photos[isoCode];

    if (BUILTIN_COUNTRY_PHOTOS[slug]) return BUILTIN_COUNTRY_PHOTOS[slug];
    if (BUILTIN_COUNTRY_PHOTOS[slug + '-card']) return BUILTIN_COUNTRY_PHOTOS[slug + '-card'];
    if (BUILTIN_COUNTRY_PHOTOS[slug + '-banner']) return BUILTIN_COUNTRY_PHOTOS[slug + '-banner'];
    if (isoCode && BUILTIN_COUNTRY_PHOTOS[isoCode]) return BUILTIN_COUNTRY_PHOTOS[isoCode];

    // Substring lookup against known photos
    var allKeys = Object.keys(BUILTIN_COUNTRY_PHOTOS);
    for (var i = 0; i < allKeys.length; i++) {
      var k = allKeys[i];
      if (k.length > 3 && (slug.indexOf(k) > -1 || k.indexOf(slug) > -1)) {
        return BUILTIN_COUNTRY_PHOTOS[k];
      }
    }

    return 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=600&q=80';
  }

  var DESTINATION_OPTIONS = [
    { name: 'India', iso: 'in', count: '18+ destinations available' },
    { name: 'Qatar', iso: 'qa', count: '11+ destinations available' }
  ];

  function renderNationalityOptions(){
    if(!natDropdown) return;
    var list=natDropdown.querySelector('.dropdown-options-list');
    if(!list) return;
    var rawSelected = localStorage.getItem('visadoo_nationality') || 'India';
    var selected = rawSelected.toLowerCase().trim();
    if (selected !== 'india' && selected !== 'qatar') {
      selected = 'india';
      localStorage.setItem('visadoo_nationality', 'India');
    }

    var items = [
      { name: 'India', iso: 'in', count: '18+ destinations available' },
      { name: 'Qatar', iso: 'qa', count: '11+ destinations available' }
    ];

    if (dbNationalities && dbNationalities.length) {
      items = items.map(function(item) {
        var dbNat = dbNationalities.filter(function(n) {
          return (n.name || '').toLowerCase() === item.name.toLowerCase();
        })[0];
        if (dbNat && Array.isArray(dbNat.destinations) && dbNat.destinations.length) {
          return {
            name: item.name,
            iso: item.iso,
            count: dbNat.destinations.length + '+ destinations available'
          };
        }
        return item;
      });
    }

    list.innerHTML = items.map(function(d){
      var iso = (d.iso || '').toLowerCase();
      var flagUrl = 'https://flagcdn.com/w160/' + iso + '.png';
      var isSelected = (d.name.toLowerCase() === selected);

      return '<div class="nat-dest-item' + (isSelected ? ' active' : '') + '" data-value="' + escHtml(d.name) + '" data-iso="' + escHtml(iso) + '" role="option" aria-selected="' + (isSelected ? 'true' : 'false') + '">' +
        '<div class="nat-dest-media">' +
          '<img src="' + flagUrl + '" alt="' + escHtml(d.name) + ' flag" class="nat-dest-img nat-dest-flag" loading="lazy" decoding="async">' +
        '</div>' +
        '<div class="nat-dest-info">' +
          '<strong class="nat-dest-name">' + escHtml(d.name) + '</strong>' +
          '<span class="nat-dest-desc">' + escHtml(d.count) + '</span>' +
        '</div>' +
        '<div class="nat-dest-radio" aria-hidden="true">' +
          '<div class="nat-dest-radio-circle">' +
            '<svg class="nat-dest-check-icon" viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M3.5 8.5L6.5 11.5L12.5 4.5"></path>' +
            '</svg>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    wireNationalityOptionClicks();
    var selectedVal = localStorage.getItem('visadoo_nationality') || 'India';
    updateNationalityUI(selectedVal);
    renderDropdownGrid();
  }

  function wireNationalityOptionClicks(){
    if(!natDropdown) return;
    var items = natDropdown.querySelectorAll('.nat-dest-item, .nat-feed-card, .dropdown-options-list button[data-value]');
    for(var i=0; i<items.length; i++){
      (function(item){
        item.onclick = function(e){
          e.stopPropagation();
          var val = item.getAttribute('data-value');
          var iso = item.getAttribute('data-iso') || '';
          localStorage.setItem('visadoo_nationality', val);

          // Dynamically toggle radio checks and active states without full redraw
          for(var j=0; j<items.length; j++){
            var isCurr = (items[j] === item);
            items[j].classList.toggle('active', isCurr);
            items[j].setAttribute('aria-selected', isCurr ? 'true' : 'false');
          }

          updateNationalityUI(val, iso);
          setTimeout(function(){
            closeAllDropdowns();
          }, 150);
          renderDropdownGrid();
          document.dispatchEvent(new CustomEvent('nationalitychanged', { detail: val }));
          checkAndRedirect();
        };
      })(items[i]);
    }
  }

  function updateNationalityUI(val, iso){
    var cleanVal = (val || 'India').trim();
    if (!iso) {
      var match = DESTINATION_OPTIONS.filter(function(d){ return d.name.toLowerCase() === cleanVal.toLowerCase(); })[0];
      if (match) {
        iso = match.iso;
      } else {
        var n = dbNationalities.filter(function(x){ return x.name.toLowerCase() === cleanVal.toLowerCase(); })[0];
        iso = n && n.iso2 ? n.iso2.toLowerCase() : (cleanVal==='Qatar'?'qa':(cleanVal==='Dubai'?'ae':'in'));
      }
    }
    iso = (iso || 'in').toLowerCase();
    var flagUrl = 'https://flagcdn.com/w40/' + iso + '.png';

    var flagImg = document.getElementById('selectedNationalityFlag');
    if (flagImg) flagImg.src = flagUrl;
    var mobileFlag = document.getElementById('mobileSelectedNatFlag');
    if (mobileFlag) mobileFlag.src = flagUrl;
    var heroFlag = document.getElementById('heroSelectedFlag');
    if (heroFlag) heroFlag.src = flagUrl;

    var textSpan = document.getElementById('selectedNationalityText');
    if (textSpan) textSpan.textContent = cleanVal;
    var mobileText = document.getElementById('mobileSelectedNatText');
    if (mobileText) mobileText.textContent = cleanVal;
    var heroText = document.getElementById('heroSelectedNationality');
    if (heroText) heroText.textContent = cleanVal;
    var dockOrigin = document.getElementById('dockOriginDisplay');
    if (dockOrigin) dockOrigin.textContent = cleanVal;
  }

  function closeAllDropdowns() {
    if (natDropdown) natDropdown.classList.remove('open');
    if (destDropdown) destDropdown.classList.remove('open');
  }

  function checkAndRedirect() {
    var selectedNat = localStorage.getItem('visadoo_nationality');
    var destMenu = destDropdown ? destDropdown.querySelector('.header-dropdown-menu') : null;
    var selectedDestSlug = destMenu ? destMenu.getAttribute('data-selected-slug') : null;
    if (!selectedDestSlug) {
      selectedDestSlug = getPageSlug();
    }
    if (selectedNat && selectedDestSlug) {
      var encoded = encodeURIComponent(selectedDestSlug);
      var localPreview = window.location.protocol === 'file:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1';
      
      var targetUrl = localPreview 
        ? 'country.html?slug=' + encoded 
        : '/country/' + encoded;
      
      window.location.href = targetUrl;
    }
  }

  function initHeaderDropdowns() {
    if (dropdownsInitialized) return;
    natDropdown = document.getElementById('nationalityDropdown');
    destDropdown = document.getElementById('destinationDropdown');
    dropdownsInitialized = true;

    var natTrigger = natDropdown ? natDropdown.querySelector('.header-dropdown-trigger') : null;
    var destTrigger = destDropdown ? destDropdown.querySelector('.header-dropdown-trigger') : null;

    var natSearch = document.getElementById('nationalitySearchInput');
    var destSearch = document.getElementById('destinationSearchInput');

    var natClose = document.getElementById('natModalClose');
    if (natClose) {
      natClose.onclick = function(e) {
        e.stopPropagation();
        closeAllDropdowns();
      };
    }

    // Click handler for Nationality trigger
    if (natTrigger) {
      natTrigger.onclick = function(e) {
        e.stopPropagation();
        var isOpen = natDropdown.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
          natDropdown.classList.add('open');
          if (natSearch) {
            natSearch.value = '';
            filterOptions(natDropdown, '');
            setTimeout(function() { natSearch.focus(); }, 100);
          }
        }
      };
    }

    // Click handler for Destination trigger
    if (destTrigger) {
      destTrigger.onclick = function(e) {
        e.stopPropagation();
        var isOpen = destDropdown.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
          destDropdown.classList.add('open');
          if (destSearch) {
            destSearch.value = '';
            dropdownSearchQuery = '';
            renderDropdownGrid();
            setTimeout(function() { destSearch.focus(); }, 100);
          }
        }
      };
    }

    document.addEventListener('click', closeAllDropdowns);

    // Search input handlers
    if (natSearch) {
      natSearch.onclick = function(e) { e.stopPropagation(); };
      natSearch.oninput = function() {
        filterOptions(natDropdown, natSearch.value);
      };
    }

    if (destSearch) {
      destSearch.onclick = function(e) { e.stopPropagation(); };
      destSearch.oninput = function() {
        dropdownSearchQuery = destSearch.value;
        renderDropdownGrid();
      };
    }

    var toggleAllBtn = document.getElementById('destToggleAllBtn');
    if (toggleAllBtn) {
      toggleAllBtn.onclick = function(e) {
        e.stopPropagation();
        showAllInDropdown = !showAllInDropdown;
        toggleAllBtn.textContent = showAllInDropdown ? 'Featured' : 'All Countries';
        toggleAllBtn.style.background = showAllInDropdown ? '#ef4444' : '#f1f5f9';
        toggleAllBtn.style.color = showAllInDropdown ? '#ffffff' : '#1e293b';
        renderDropdownGrid();
      };
    }

    function filterOptions(dropdown, query) {
      if (!dropdown) return;
      var q = query.toLowerCase().trim();
      var natItems = dropdown.querySelectorAll('.nat-dest-item, .nat-feed-card');
      var list = dropdown.querySelector('.dropdown-options-list');
      var noResults = dropdown.querySelector('.nat-no-results');

      if (natItems.length) {
        var matchCount = 0;
        for (var i = 0; i < natItems.length; i++) {
          var val = (natItems[i].getAttribute('data-value') || '').toLowerCase();
          var matches = (!q || val.indexOf(q) > -1);
          natItems[i].style.display = matches ? 'flex' : 'none';
          if (matches) matchCount++;
        }
        if (matchCount === 0) {
          if (!noResults && list) {
            noResults = document.createElement('div');
            noResults.className = 'nat-no-results';
            noResults.textContent = 'No destination found';
            list.appendChild(noResults);
          } else if (noResults) {
            noResults.style.display = 'block';
          }
        } else if (noResults) {
          noResults.style.display = 'none';
        }
        return;
      }
      var options = dropdown.querySelectorAll('.dropdown-options-list button');
      for (var j = 0; j < options.length; j++) {
        var btnVal = (options[j].getAttribute('data-value') || '').toLowerCase();
        options[j].style.display = (!q || btnVal.indexOf(q) > -1) ? 'flex' : 'none';
      }
    }

    // Setup nationality. Static fallback options stay offline; database options replace them when available.
    var selectedNat = localStorage.getItem('visadoo_nationality');
    if (!selectedNat) {
      selectedNat = 'India';
      localStorage.setItem('visadoo_nationality', 'India');
    }
    updateNationalityUI(selectedNat);
    renderNationalityOptions();

    loadDropdownDestinations();
  }

  function initGlobalSmoothScroll() {
    function bootLenis() {
      if (window.__lenisInitialized || typeof window.Lenis === 'undefined') return;
      if (document.body && document.body.classList.contains('has-admin-side')) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      try {
        var lenis = new window.Lenis({
          wrapper: window,
          content: document.documentElement,
          lerp: 0.1, // Matches visadoo.com / uicore smooth momentum
          duration: 1.2,
          easing: function(t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          syncTouch: false, // Keep native 120Hz touch scrolling on mobile
          wheelMultiplier: 1.0,
          touchMultiplier: 1.0,
          autoResize: true,
          prevent: function(node) {
            return !!(
              node && node.closest && (
                node.closest('[data-lenis-prevent]') ||
                node.closest('.lenis-prevent') ||
                node.closest('.header-dropdown-menu') ||
                node.closest('.nat-luxury-modal') ||
                node.closest('.dropdown-options-list') ||
                node.closest('.why-rec-modal') ||
                node.closest('.modal-dialog') ||
                node.closest('.drawer') ||
                node.closest('.tray-scroll') ||
                node.closest('.dialog')
              )
            );
          }
        });

        window.lenis = lenis;
        window.ui_animate_lenis = lenis; // Matches visadoo.com reference

        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
        window.__lenisInitialized = true;

        if (!document.getElementById('lenis-styles')) {
          var style = document.createElement('style');
          style.id = 'lenis-styles';
          style.textContent = [
            'html.lenis, html.lenis body { height: auto; }',
            'html.lenis, html.lenis body, .lenis.lenis-smooth { scroll-behavior: auto !important; }',
            '.lenis.lenis-smooth [data-lenis-prevent], .lenis-prevent { overscroll-behavior: contain; }',
            '.lenis.lenis-stopped { overflow: hidden; }',
            '.lenis.lenis-scrolling iframe { pointer-events: none; }'
          ].join('\n');
          document.head.appendChild(style);
        }

        window.addEventListener('resize', function() { lenis.resize(); });
        document.addEventListener('visadoo:country-rendered', function() {
          setTimeout(function() { lenis.resize(); }, 120);
        });
      } catch (err) {
        console.warn('Lenis init failed', err);
      }
    }

    // Expose global smooth scroll helper
    window.smoothScrollTo = function(target, offset) {
      var off = typeof offset === 'number' ? offset : -70;
      if (window.lenis) {
        window.lenis.scrollTo(target, { offset: off, duration: 1.2 });
      } else if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: 'smooth' });
      } else if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    // Load or boot Lenis
    if (typeof window.Lenis === 'undefined') {
      var script = document.createElement('script');
      script.src = '/vendor/lenis.min.js';
      script.async = true;
      script.onload = function() {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', bootLenis);
        } else {
          bootLenis();
        }
      };
      document.head.appendChild(script);
    } else {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootLenis);
      } else {
        bootLenis();
      }
    }

    // Intercept clicks on hash links starting with #
    document.addEventListener('click', function(e) {
      var target = e.target.closest('a[href^="#"]');
      if (!target) return;
      
      var hash = target.getAttribute('href');
      if (hash === '#' || !hash) return; // Ignore empty hashes
      
      // If it is #top, scroll to the top of the page smoothly
      if (hash === '#top') {
        e.preventDefault();
        if (window.lenis) {
          window.lenis.scrollTo(0, { duration: 1.2 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (window.history && window.history.pushState) {
          window.history.pushState(null, null, ' ');
        } else {
          window.location.hash = '';
        }
        return;
      }
      
      // Attempt to find target element and scroll smoothly to it
      try {
        var el = document.querySelector(hash);
        if (el) {
          e.preventDefault();
          if (window.lenis) {
            window.lenis.scrollTo(el, { offset: -70, duration: 1.2 });
          } else {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          if (window.history && window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }
      } catch (err) {
        // Ignore invalid query selectors
      }
    });

    // Scroll to the current URL hash smoothly if the target element exists
    function scrollToCurrentHash() {
      var h = window.location.hash;
      if (!h || h === '#top' || h === '#') return;
      try {
        var target = document.querySelector(h);
        if (target) {
          if (window.lenis) {
            window.lenis.scrollTo(target, { offset: -70, duration: 1.2 });
          } else {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      } catch (err) {
        // Ignore invalid query selectors
      }
    }

    // Scroll on load if element is already present
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scrollToCurrentHash);
    } else {
      scrollToCurrentHash();
    }

    // Listen for custom post-render event on dynamically rendered country pages
    document.addEventListener('visadoo:country-rendered', scrollToCurrentHash);
  }

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
    
    var actions = document.querySelector('.header .nav-actions');
    window.initLanguageSelectorIn(actions);
    if (typeof window.initDraftResumeButton === 'function') {
      window.initDraftResumeButton(actions);
    }
    
    initHeaderDropdowns();
    
    window.__brand = s;
    document.dispatchEvent(new Event("brandloaded"));
  }

  function ensureMobileMenuNationality() {
    var navLinks = document.getElementById('navLinks');
    var natDropdown = document.getElementById('nationalityDropdown');
    if (!navLinks || !natDropdown) return;
    var existingBtn = navLinks.querySelector('.mobile-menu-nat-btn');
    if (!existingBtn) {
      var selectedNat = localStorage.getItem('visadoo_nationality') || 'India';
      var flagImg = document.getElementById('selectedNationalityFlag');
      var flagSrc = (flagImg && flagImg.src) ? flagImg.src : 'https://flagcdn.com/w40/in.png';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-menu-nat-btn notranslate';
      btn.setAttribute('translate', 'no');
      btn.innerHTML = '<span class="mobile-nat-left"><img src="' + flagSrc + '" class="dropdown-flag mobile-nat-flag" id="mobileSelectedNatFlag" alt=""><span class="mobile-nat-label">Nationality</span></span><span class="mobile-nat-val" id="mobileSelectedNatText">' + selectedNat + '</span><span class="dropdown-chevron"></span>';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        navLinks.classList.remove('open');
        var menuBtn = document.getElementById('menuBtn');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
        var natTrigger = natDropdown.querySelector('.header-dropdown-trigger');
        if (natTrigger) {
          natTrigger.click();
        } else {
          natDropdown.classList.add('open');
        }
      });
      navLinks.insertBefore(btn, navLinks.firstChild);
    }
  }

  function initMobileMenu() {
    var menuBtn = document.getElementById('menuBtn');
    var navLinks = document.getElementById('navLinks');
    ensureMobileMenuNationality();
    if (!menuBtn || !navLinks || menuBtn.getAttribute('data-menu-wired') === 'true') return;
    menuBtn.setAttribute('data-menu-wired', 'true');
    menuBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      ensureMobileMenuNationality();
      var open = navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', function(e) {
      if (!navLinks.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  window.initHeaderDropdowns = initHeaderDropdowns;
  window.initMobileMenu = initMobileMenu;
  window.getCountryPhoto = getCountryPhoto;
  window.BUILTIN_COUNTRY_PHOTOS = BUILTIN_COUNTRY_PHOTOS;

  function initImmediate() {
    applyBrand({ brand_name: "Visa Doo" });
    var actions = document.querySelector('.header .nav-actions');
    window.initLanguageSelectorIn(actions);
    if (typeof window.initDraftResumeButton === 'function') {
      window.initDraftResumeButton(actions);
    }
    initHeaderDropdowns();
    initGlobalSmoothScroll();
    initMobileMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initImmediate);
  } else {
    initImmediate();
  }

  fetch(SUPABASE_URL + "/rest/v1/site_settings?id=eq.global&select=*", { headers: { apikey: ANON, authorization: "Bearer " + ANON } })
    .then(function (r) { return r.json(); })
    .then(function (rows) { var s = rows && rows[0]; if (s) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { apply(s); }); else apply(s); } })
    .catch(function () {});
})();
