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
    var logo = "/assets/logo_transparent.png", name = (s.brand_name || "").trim();
    if (!logo && !name) return;
    var brands = document.querySelectorAll(".brand");
    for (var i = 0; i < brands.length; i++) {
      var el = brands[i];
      if (logo) {
        el.innerHTML = '<img src="' + logo + '" alt="' + (name || "logo") + '" style="height:42px;width:auto;max-width:200px;display:block">';
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
      if (f.classList.contains("wa-float")) {
        f.setAttribute("href", href);
      } else {
        f.setAttribute("href", href);
        var parentCard = f.closest(".ai-wa-card");
        if (parentCard) parentCard.style.display = "flex";
      }
      
      if (f.classList.contains("wa-float") && s.whatsapp_label && !f.querySelector(".wa-label")) {
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

  window.initLanguageSelectorIn = function(actions) {
    if (window.location.pathname.indexOf('app.html') !== -1) return;
    if (!actions || actions.querySelector('.site-language-header-selector')) return;
    
    var container = document.createElement('div');
    container.className = 'site-language-header-selector';
    container.innerHTML =
      '<button class="site-language-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" class="globe-icon" style="margin-right: 4px; display: inline-block; vertical-align: middle;">'+
          '<circle cx="12" cy="12" r="10"/>'+
          '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'+
          '<path d="M2 12h20"/>'+
        '</svg>'+
        '<b data-language-header-name>EN</b>'+
      '</button>'+
      '<div class="site-language-menu header-menu" role="listbox" aria-label="Languages" style="display: none;">'+
        '<button type="button" role="option" data-language-option="en"><img src="https://flagcdn.com/w40/gb.png" alt="UK flag"><span>English</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>'+
        '<button type="button" role="option" data-language-option="ml"><img src="https://flagcdn.com/w40/in.png" alt="Indian flag"><span>Malayalam</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>'+
        '<button type="button" role="option" data-language-option="hi"><img src="https://flagcdn.com/w40/in.png" alt="Indian flag"><span>Hindi</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>'+
        '<button type="button" role="option" data-language-option="ar"><img src="https://flagcdn.com/w40/sa.png" alt="Arabic flag"><span>Arabic</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>'+
        '<button type="button" role="option" data-language-option="fr"><img src="https://flagcdn.com/w40/fr.png" alt="French flag"><span>French</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>'+
        '<button type="button" role="option" data-language-option="es"><img src="https://flagcdn.com/w40/es.png" alt="Spanish flag"><span>Spanish</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>'+
      '</div>';
      
    actions.insertBefore(container, actions.firstChild);
    
    var trigger = container.querySelector('.site-language-trigger');
    var menu = container.querySelector('.site-language-menu');
    var nameLabel = container.querySelector('[data-language-header-name]');
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
    
    var options = container.querySelectorAll('[data-language-option]');
    
    function applyGlobalTranslations(lang) {
      var dict = {
        en: {
          explore: 'Explore', events: 'Events', articles: 'Articles', track: 'Track visa',
          assistant: 'AI travel assistant', online: 'Online now', hello: 'Hi! I am VisaDoo AI. How can I help with your visa options, documents, processing times, or application tracking today?',
          placeholder: 'Ask about your visa…', send: 'Send', askAi: 'Ask AI',
          waTitle: 'Need human support?', waDesc: 'Chat with a visa specialist on WhatsApp.', waBtn: 'Chat with us'
        },
        ml: {
          explore: 'തിരയുക', events: 'ഇവന്റുകൾ', articles: 'ലേഖനങ്ങൾ', track: 'വിസ ട്രാക്ക്',
          assistant: 'AI യാത്രാ സഹായി', online: 'ഇപ്പോൾ ഓൺലൈൻ', hello: 'ഹായ്! വിസ ഓപ്ഷനുകൾ, രേഖകൾ, ഫീസ്, ട്രാക്കിംഗ് എന്നിവയിൽ ഞാൻ സഹായിക്കാം.',
          placeholder: 'വിസയെക്കുറിച്ച് ചോദിക്കൂ…', send: 'അയക്കുക', askAi: 'ചോദിക്കൂ',
          waTitle: 'സഹായം ആവശ്യമുണ്ടോ?', waDesc: 'WhatsApp-ൽ ഞങ്ങളോട് സംസാരിക്കൂ.', waBtn: 'ചാറ്റ് ചെയ്യുക'
        },
        hi: {
          explore: 'एक्सप्लोर', events: 'इवेंट्स', articles: 'लेख', track: 'वीज़ा ट्रैक करें',
          assistant: 'AI यात्रा सहायक', online: 'अभी ऑनलाइन', hello: 'नमस्ते! मैं वीज़ा विकल्प, दस्तावेज़, शुल्क और ट्रैकिंग में मदद कर सकता हूँ।',
          placeholder: 'वीज़ा के बारे में पूछें…', send: 'भेजें', askAi: 'पूछें',
          waTitle: 'मानवीय सहायता चाहिए?', waDesc: 'WhatsApp पर वीज़ा विशेषज्ञ से चैट करें।', waBtn: 'हमसे चैट करें'
        },
        ar: {
          explore: 'استكشف', events: 'الفعاليات', articles: 'المقالات', track: 'تتبع التأشيرة',
          assistant: 'مساعد السفر الذكي', online: 'متصل الآن', hello: 'مرحباً! يمكنني المساعدة في خيارات التأشيرة والمستندات والرسوم والتتبع.',
          placeholder: 'اسأل عن تأشيرتك…', send: 'إرسال', askAi: 'اسأل الذكاء',
          waTitle: 'هل تحتاج إلى مساعدة؟', waDesc: 'تحدث مع خبير التأشيرات عبر واتساب.', waBtn: 'تواصل معنا'
        },
        fr: {
          explore: 'Explorer', events: 'Événements', articles: 'Articles', track: 'Suivi visa',
          assistant: 'Assistant IA', online: 'En ligne', hello: 'Bonjour ! Je peux vous aider avec les visas, documents et suivi.',
          placeholder: 'Posez votre question…', send: 'Envoyer', askAi: 'Demander',
          waTitle: 'Besoin d\'aide humaine ?', waDesc: 'Discutez avec un expert sur WhatsApp.', waBtn: 'Discuter'
        },
        es: {
          explore: 'Explorar', events: 'Eventos', articles: 'Artículos', track: 'Seguimiento',
          assistant: 'Asistente IA', online: 'En línea', hello: '¡Hola! Puedo ayudarte con visados, documentos y seguimiento.',
          placeholder: 'Haz una pregunta…', send: 'Enviar', askAi: 'Preguntar',
          waTitle: '¿Necesitas ayuda?', waDesc: 'Chatea con un experto en WhatsApp.', waBtn: 'Chatear'
        }
      };
      var copy = dict[lang] || dict.en;
      
      var expLink = document.querySelector('.nav-links a[href*="destinations"]');
      if (expLink) expLink.textContent = copy.explore;
      
      var evsLink = document.querySelector('.nav-links a[href*="events"]');
      if (evsLink) evsLink.textContent = copy.events;
      
      var artLink = document.querySelector('.nav-links a[href*="articles"]');
      if (artLink) artLink.textContent = copy.articles;
      
      var trkLink = document.querySelector('.nav-track, .nav-actions a[href*="track"]');
      if (trkLink) {
        var span = trkLink.querySelector('span') || trkLink;
        if (span.childNodes.length === 1) {
          span.textContent = copy.track;
        }
      }
      
      var aiTriggerSpan = document.querySelector('.ai-assistant-trigger span');
      if (aiTriggerSpan) aiTriggerSpan.textContent = copy.askAi || 'Ask AI';
      
      var aiPanelTitle = document.querySelector('.ai-assistant-panel header b');
      if (aiPanelTitle) aiPanelTitle.textContent = copy.assistant;
      
      var aiOnlineSpan = document.querySelector('.ai-assistant-panel header small span');
      if (aiOnlineSpan) aiOnlineSpan.textContent = copy.online;
      
      var firstMsg = document.querySelector('.ai-conversation .ai-message-bot');
      if (firstMsg) {
        var txt = firstMsg.textContent;
        if (txt.indexOf('Hi!') === 0 || txt.indexOf('ഹായ്!') === 0 || txt.indexOf('नमस्ते!') === 0 || txt.indexOf('مرحباً!') === 0 || txt.indexOf('Bonjour !') === 0 || txt.indexOf('¡Hola!') === 0 || txt.indexOf('Hello!') === 0) {
          firstMsg.textContent = copy.hello;
        }
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

    function updateActiveLanguage(lang) {
      if (nameLabel) nameLabel.textContent = lang.toUpperCase();
      options.forEach(function(btn) {
        var optCode = btn.getAttribute('data-language-option');
        var tick = btn.querySelector('i');
        if (tick) tick.style.display = (optCode === lang) ? 'inline-block' : 'none';
      });
      var nativeSelector = document.getElementById('siteLanguage');
      if (nativeSelector && nativeSelector.value !== lang) {
        nativeSelector.value = lang;
        nativeSelector.dispatchEvent(new Event('change', { bubbles: true }));
      }
      applyGlobalTranslations(lang);
    }
    
    options.forEach(function(btn) {
      btn.onclick = function(e) {
        e.stopPropagation();
        var code = btn.getAttribute('data-language-option');
        try { localStorage.setItem('visadoo-language', code); } catch(err) {}
        updateActiveLanguage(code);
        closeMenu();
        document.dispatchEvent(new CustomEvent('languagechanged', { detail: code }));
        if (typeof window.applyLanguage === 'function') {
          window.applyLanguage(code);
        }
      };
    });
    
    var saved = 'en';
    try { saved = localStorage.getItem('visadoo-language') || 'en'; } catch(err) {}
    updateActiveLanguage(saved);
  };

  var dropdownsInitialized = false;
  var showAllInDropdown = false;
  var dropdownSearchQuery = '';
  var dbCountries = [];
  var eligibleSlugs = ['spain', 'denmark', 'south-korea', 'germany', 'france', 'switzerland', 'ireland', 'japan'];
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
    if (params.has('slug')) return params.get('slug');
    var path = window.location.pathname;
    if (path.indexOf('/country/') > -1) {
      return path.split('/country/')[1].replace(/\/$/, '');
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
      var val=parseInt(v.processing_time_value,10); if(isNaN(val)) return;
      var unit=(v.processing_time_unit||'').toLowerCase();
      var hrs=val;
      if(unit.indexOf('day')>-1) hrs=val*24;
      else if(unit.indexOf('week')>-1) hrs=val*24*7;
      else if(unit.indexOf('month')>-1) hrs=val*24*30;
      if(hrs<bestHrs){ bestHrs=hrs; best={value:val, unit:v.processing_time_unit, hours:hrs}; }
    });
    return best;
  }
  
  function etaLabel(eta){
    if(!eta) return '';
    var unit=eta.unit.toLowerCase();
    if(unit.indexOf('hour')>-1) return eta.value + (eta.value===1?' hr':' hrs');
    if(unit.indexOf('day')>-1) return eta.value + (eta.value===1?' day':' days');
    return eta.value + ' ' + eta.unit;
  }

  function loadDropdownDestinations() {
    var url = SUPABASE_URL + "/rest/v1/countries?select=*&order=sort_order";
    var visaUrl = SUPABASE_URL + "/rest/v1/visa_types?active=eq.true&select=slug,country_slug,processing_time_value,processing_time_unit";
    
    Promise.all([
      fetch(url, { headers: { apikey: ANON, authorization: "Bearer " + ANON } }).then(function(r){return r.json();}),
      fetch(visaUrl, { headers: { apikey: ANON, authorization: "Bearer " + ANON } }).then(function(r){return r.json();})
    ]).then(function(res) {
      var allowedSlugs = [
        'japan', 'spain', 'denmark', 'france', 'germany', 'switzerland', 
        'china', 'greece', 'azerbaijan', 'south-korea', 'ireland',
        'thailand', 'turkey', 'indonesia', 'russia', 'vietnam', 'india', 
        'sri-lanka', 'kenya', 'morocco'
      ];
      
      var allDbCountries = res[0] || [];
      var dbSlugs = allDbCountries.map(function(c) { return c.slug.toLowerCase(); });

      var countries = allDbCountries.filter(function(c) {
        return c.active;
      });
      
      var missingSlugs = allowedSlugs.filter(function(slug) {
        return dbSlugs.indexOf(slug) === -1;
      });
      
      var countryMetadata = {
        'japan': { name: 'Japan', iso2: 'JP' },
        'spain': { name: 'Spain', iso2: 'ES' },
        'denmark': { name: 'Denmark', iso2: 'DK' },
        'france': { name: 'France', iso2: 'FR' },
        'germany': { name: 'Germany', iso2: 'DE' },
        'switzerland': { name: 'Switzerland', iso2: 'CH' },
        'china': { name: 'China', iso2: 'CN' },
        'greece': { name: 'Greece', iso2: 'GR' },
        'azerbaijan': { name: 'Azerbaijan', iso2: 'AZ' },
        'south-korea': { name: 'South Korea', iso2: 'KR' },
        'ireland': { name: 'Ireland', iso2: 'IE' },
        'thailand': { name: 'Thailand', iso2: 'TH' },
        'turkey': { name: 'Türkiye', iso2: 'TR' },
        'indonesia': { name: 'Indonesia', iso2: 'ID' },
        'russia': { name: 'Russia', iso2: 'RU' },
        'vietnam': { name: 'Vietnam', iso2: 'VN' },
        'india': { name: 'India', iso2: 'IN' },
        'sri-lanka': { name: 'Sri Lanka', iso2: 'LK' },
        'kenya': { name: 'Kenya', iso2: 'KE' },
        'morocco': { name: 'Morocco', iso2: 'MA' }
      };

      missingSlugs.forEach(function(slug) {
        var meta = countryMetadata[slug];
        if (meta) {
          countries.push({
            id: 'mock-' + slug,
            name: meta.name,
            slug: slug,
            iso2: meta.iso2,
            active: true,
            eta: null
          });
        }
      });
      
      var visas = res[1] || [];
      
      countries.forEach(function(c) {
        var cv = visas.filter(function(v){ return v.country_slug === c.slug; });
        c.eta = fastestEta(cv);
      });
      
      dbCountries = countries;
      renderDropdownGrid();
    }).catch(function(err){ console.error(err); });
  }

  function renderDropdownGrid() {
    var grid = document.getElementById('destDropdownGrid');
    if (!grid) return;

    var filtered = dbCountries;
    if (!showAllInDropdown) {
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

  function closeAllDropdowns() {
    if (natDropdown && destDropdown) {
      natDropdown.classList.remove('open');
      destDropdown.classList.remove('open');
    }
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
    if (!natDropdown || !destDropdown) return;
    dropdownsInitialized = true;

    var natTrigger = natDropdown.querySelector('.header-dropdown-trigger');
    var destTrigger = destDropdown.querySelector('.header-dropdown-trigger');

    var natSearch = document.getElementById('nationalitySearchInput');
    var destSearch = document.getElementById('destinationSearchInput');

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
      var q = query.toLowerCase().trim();
      var options = dropdown.querySelectorAll('.dropdown-options-list button');
      for (var i = 0; i < options.length; i++) {
        var val = options[i].getAttribute('data-value').toLowerCase();
        if (val.indexOf(q) > -1) {
          options[i].style.display = 'flex';
        } else {
          options[i].style.display = 'none';
        }
      }
    }

    // Setup options clicks
    var selectedNat = localStorage.getItem('visadoo_nationality');
    if (!selectedNat) {
      selectedNat = 'India';
      localStorage.setItem('visadoo_nationality', 'India');
    }
    updateNationalityUI(selectedNat);

    var natOptions = natDropdown.querySelectorAll('.dropdown-options-list button[data-value]');
    for (var i = 0; i < natOptions.length; i++) {
      (function(btn) {
        btn.onclick = function(e) {
          e.stopPropagation();
          var val = btn.getAttribute('data-value');
          localStorage.setItem('visadoo_nationality', val);
          updateNationalityUI(val);
          closeAllDropdowns();
          document.dispatchEvent(new CustomEvent('nationalitychanged', { detail: val }));
          checkAndRedirect();
        };
      })(natOptions[i]);
    }

    function updateNationalityUI(val) {
      var flagUrl = val === 'India' ? 'https://flagcdn.com/w40/in.png' : 'https://flagcdn.com/w40/qa.png';
      var flagImg = document.getElementById('selectedNationalityFlag');
      if (flagImg) flagImg.src = flagUrl;
      var textSpan = document.getElementById('selectedNationalityText');
      if (textSpan) textSpan.textContent = val;
    }

    loadDropdownDestinations();
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
    if (actions) {
      window.initLanguageSelectorIn(actions);
    }
    
    initHeaderDropdowns();
    
    window.__brand = s;
    document.dispatchEvent(new Event("brandloaded"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { initHeaderDropdowns(); });
  } else {
    initHeaderDropdowns();
  }

  fetch(SUPABASE_URL + "/rest/v1/site_settings?id=eq.global&select=*", { headers: { apikey: ANON, authorization: "Bearer " + ANON } })
    .then(function (r) { return r.json(); })
    .then(function (rows) { var s = rows && rows[0]; if (s) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { apply(s); }); else apply(s); } })
    .catch(function () {});
})();
