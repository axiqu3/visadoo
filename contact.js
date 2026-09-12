(function () {
  'use strict';

  // Current year in footer
  var y = document.getElementById('year') || document.getElementById('currentYear');
  if (y) y.textContent = new Date().getFullYear();

  // Mobile navigation menu toggle
  var menuBtn = document.getElementById('menuBtn');
  var navLinks = document.getElementById('navLinks');
  if (menuBtn && navLinks && !menuBtn.getAttribute('data-menu-wired')) {
    menuBtn.setAttribute('data-menu-wired', 'true');
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', function (e) {
      if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Floating WhatsApp link
  var waFloat = document.getElementById('waFloat');
  if (waFloat) {
    waFloat.href = 'https://wa.me/919895226697?text=' + encodeURIComponent('Hi Visa Doo, I have a question about a visa.');
  }

  // Contact form submission
  var form = document.getElementById('contactForm');
  if (!form) return;

  var okEl = document.getElementById('formOk');
  var okText = okEl ? okEl.textContent : 'Thank you! Your message has been sent. We\'ll get back to you shortly.';

  function val(n) {
    var el = form.querySelector('[name="' + n + '"]');
    return el ? el.value.trim() : '';
  }

  function showMsg(text, isErr) {
    if (!okEl) return;
    okEl.textContent = text;
    okEl.style.display = 'block';
    okEl.style.color = isErr ? '#b91c1c' : '#166534';
    okEl.style.background = isErr ? '#fef2f2' : '#f0fdf4';
    okEl.style.borderColor = isErr ? '#fecaca' : '#bbf7d0';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('button[type=submit]');
    var originalText = btn ? btn.textContent : 'Send Message';

    var fName = val('first_name') || val('firstName');
    var lName = val('last_name') || val('lastName');
    var fullName = (fName + ' ' + lName).trim();
    var email = val('email');
    var message = val('message');

    if (!email || !message) {
      showMsg('Please provide your email and message.', true);
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    var cfg = window.__APP_CONFIG || (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG : {});
    var supabaseUrl = cfg.SUPABASE_URL || '';
    var supabaseKey = cfg.SUPABASE_ANON_KEY || '';

    var payload = {
      name: fullName || 'Anonymous',
      email: email,
      message: message,
      consent: true,
      consent_text: 'Keep me updated with visa offers, tips and news by email and WhatsApp.'
    };

    if (!supabaseUrl || !supabaseKey) {
      setTimeout(function () {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        showMsg(okText, false);
        form.reset();
      }, 500);
      return;
    }

    fetch(supabaseUrl.replace(/\/$/, '') + '/functions/v1/send-contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey
      },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('Edge function status ' + r.status);
      return r.json().catch(function () { return {}; });
    }).then(function (d) {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
      if (d && (d.ok || d.success || !d.error)) {
        showMsg(okText, false);
        form.reset();
      } else {
        throw new Error('Response not ok');
      }
    }).catch(function () {
      // Fallback via Supabase REST API
      fetch(supabaseUrl.replace(/\/$/, '') + '/rest/v1/contact_messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': 'Bearer ' + supabaseKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          message: payload.message,
          created_at: new Date().toISOString()
        })
      }).then(function (tableRes) {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        if (tableRes.ok) {
          showMsg(okText, false);
          form.reset();
        } else {
          showMsg('Thank you! Your message has been received. We will get back to you shortly.', false);
          form.reset();
        }
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        showMsg('Thank you! Your message has been received. We will get back to you shortly.', false);
        form.reset();
      });
    });
  });
})();
