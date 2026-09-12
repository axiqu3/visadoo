// ===== Visa Doo homepage — global destinations =====
(function () {
  // Initial scroll handling on direct page enter
  function resetInitialScroll(){
    if(window.location.hash && window.location.hash!=='#top') return;
    if(window.scrollY === 0) {
      try {
        var root=document.documentElement;
        var previous=root.style.scrollBehavior;
        root.style.scrollBehavior='auto';
        window.scrollTo(0,0);
        root.style.scrollBehavior=previous;
      } catch(_e) {}
    }
  }
  resetInitialScroll();

  var cfg = window.VISADOO_CONFIG || {
    WHATSAPP: '919895226697',
    PHONE_DISPLAY: '+91 98952 26697',
    PHONE_TEL: '+919895226697',
    EMAIL: 'hello@visadoo.com',
    SUPABASE_URL: 'https://rfueqawvadcvhpmleeoi.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i'
  };
  function flag(iso2){ return iso2 ? ('https://flagcdn.com/w80/'+iso2.toLowerCase()+'.png') : ''; }

  // ---- currency: INR only (₹, Indian grouping) ----
  function money(n){ if(n==null||n===''||isNaN(Number(n))) return ''; return '₹'+Number(n).toLocaleString('en-IN'); }
  function countryHref(slug){
    var encoded=encodeURIComponent(slug||'');
    var localPreview=window.location.protocol==='file:' ||
      window.location.hostname==='localhost' ||
      window.location.hostname==='127.0.0.1' ||
      window.location.hostname==='::1';
    return localPreview ? 'country.html?slug='+encoded : '/country/'+encoded;
  }
  // A visa's INR price, or null when none is set.
  function visaActivePrice(v){
    var p=(v.prices && v.prices.INR!=null && v.prices.INR!=='') ? v.prices.INR : v.price_aed;
    return (p==null || p==='' || isNaN(Number(p)) || Number(p)<=0) ? null : Number(p);
  }

  // Curated starting prices matching the UI mockup
  var DEFAULT_PRICES = {
    'united-arab-emirates': 3499, 'uae': 3499, 'dubai': 3499,
    'bahrain': 4500,
    'vietnam': 2999,
    'morocco': 4149,
    'qatar': 8999,
    'sri-lanka': 999, 'srilanka': 999,
    'egypt': 5999,
    'thailand': 499,
    'philippines': 8499,
    'russia': 4999,
    'saudi-arabia': 5500, 'saudi': 5500,
    'oman': 4499,
    'indonesia': 8999,
    'azerbaijan': 2899,
    'georgia': 2800,
    'singapore': 2500,
    'malaysia': 2200,
    'japan': 4200,
    'turkey': 4500,
    'kenya': 5999,
    'united-kingdom': 14500, 'uk': 14500,
    'united-states': 16500, 'usa': 16500, 'us': 16500,
    'france': 8500, 'germany': 8500, 'italy': 8500, 'spain': 8500, 'switzerland': 8900
  };

  // Top featured countries order matching the reference design
  var TOP_POPULAR_SLUGS = [
    'united-arab-emirates', 'uae',
    'bahrain',
    'vietnam',
    'morocco',
    'qatar',
    'sri-lanka', 'srilanka',
    'egypt',
    'thailand',
    'philippines',
    'russia'
  ];

  // ---- contact links ----
  var waLink = 'https://wa.me/' + cfg.WHATSAPP + '?text=' + encodeURIComponent('Hi Visa Doo, I have a question about a visa.');
  function setHref(id, href){ var el=document.getElementById(id); if(el) el.setAttribute('href',href); }
  function setText(id, txt){ var el=document.getElementById(id); if(el) el.textContent=txt; }
  setHref('waFloat', waLink); setHref('cmWhatsapp', waLink); setHref('footWa', waLink); setText('waText', cfg.PHONE_DISPLAY);
  setHref('cmPhone', 'tel:'+cfg.PHONE_TEL); setText('phoneText', cfg.PHONE_DISPLAY);
  setHref('cmEmail', 'mailto:'+cfg.EMAIL); setText('emailText', cfg.EMAIL);
  setHref('footEmail', 'mailto:'+cfg.EMAIL);

  // Sync saved nationality to hero dock
  var savedNat = localStorage.getItem('visadoo_nationality') || 'India';
  var dockOriginEl = document.getElementById('dockOriginDisplay');
  if (dockOriginEl) dockOriginEl.textContent = savedNat;

  // ---- transparent header on hero -> solid white on scroll ----
  function initHeaderScroll(){
    var header = document.querySelector('.discover-header');
    if(!header) return;
    function handleScroll(){
      if((window.pageYOffset || document.documentElement.scrollTop || 0) > 30){
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }
  initHeaderScroll();

  // ---- mobile menu / year / contact form ----
  var menuBtn=document.getElementById('menuBtn'), navLinks=document.getElementById('navLinks');
  if(menuBtn&&navLinks&&!menuBtn.getAttribute('data-menu-wired')){
    menuBtn.setAttribute('data-menu-wired','true');
    menuBtn.addEventListener('click',function(e){
      e.stopPropagation();
      var open=navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded',String(open));
    });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',function(){
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded','false');
      });
    });
  }
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  var form=document.getElementById('contactForm');
  if(form){
    var okEl=document.getElementById('formOk'); var okText=okEl?okEl.textContent:'';
    function val(n){ var el=form.querySelector('[name="'+n+'"]'); return el?el.value:''; }
    var CONSENT_TEXT='Keep me updated with visa offers, tips and news by email and WhatsApp.';
    function showMsg(text,isErr){ if(!okEl) return; okEl.textContent=text; okEl.style.display='block'; okEl.style.color=isErr?'#b91c1c':''; okEl.style.background=isErr?'#fef2f2':''; okEl.style.borderColor=isErr?'#fecaca':''; }
    form.addEventListener('submit',function(e){ e.preventDefault();
      var btn=form.querySelector('button[type=submit]'); var ot=btn?btn.textContent:'';
      var fName = val('first_name') || val('firstName');
      var lName = val('last_name') || val('lastName');
      var fullName = (fName + ' ' + lName).trim() || val('name');
      var payload = {
        name: fullName,
        email: val('email'),
        message: val('message'),
        'bot-field': val('bot-field'),
        consent: !!(form.querySelector('#cConsent')||{}).checked,
        consent_text: CONSENT_TEXT
      };
      fetch(cfg.SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/send-contact',{
        method:'POST', headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY,'Authorization':'Bearer '+cfg.SUPABASE_ANON_KEY},
        body:JSON.stringify(payload)
      }).then(function(r){
        if(!r.ok) throw new Error('Edge function status '+r.status);
        return r.json().catch(function(){return {};});
      }).then(function(d){
        if(btn){ btn.disabled=false; btn.textContent=ot; }
        if(d && (d.ok || d.success || !d.error)){ showMsg(okText,false); form.reset(); }
        else { throw new Error('Edge function response not ok'); }
      }).catch(function(){
        // Safe fallback attempt via Supabase REST API
        fetch(cfg.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/contact_messages',{
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY,'Authorization':'Bearer '+cfg.SUPABASE_ANON_KEY,'Prefer':'return=minimal'},
          body:JSON.stringify({ name: payload.name, email: payload.email, message: payload.message, created_at: new Date().toISOString() })
        }).then(function(tableRes){
          if(btn){ btn.disabled=false; btn.textContent=ot; }
          if(tableRes.ok){ showMsg(okText,false); form.reset(); }
          else { showMsg('Sorry — that didn’t send. Please email hello@visadoo.com or message us on WhatsApp.',true); }
        }).catch(function(){
          if(btn){ btn.disabled=false; btn.textContent=ot; }
          showMsg('Sorry — that didn’t send. Please email hello@visadoo.com or message us on WhatsApp.',true);
        });
      });
    });
  }

  // ---- destinations photography helper ----
  function isFlagImage(url){
    if(!url) return false;
    return /flagcdn\.com|flagsapi\.com|\/flags?\/|flag|\.svg$/i.test(url) || /\/assets\/flags\//i.test(url);
  }

  function destinationPhoto(c){
    var photos=window.VISADOO_DESTINATION_PHOTOS||{};
    var baseSlug = (c.slug || '').toLowerCase().replace(/-\d+$/, '');
    var src = photos[c.slug+'-card'] || photos[c.slug+'-banner'] || photos[c.slug] || photos[baseSlug+'-card'] || photos[baseSlug+'-banner'] || photos[baseSlug] || '';
    if (!src || isFlagImage(src)) {
      if (c.hero_image_url && !isFlagImage(c.hero_image_url)) {
        src = c.hero_image_url;
      } else if (c.image_url && !isFlagImage(c.image_url)) {
        src = c.image_url;
      } else {
        src = 'assets/hero-visa-travel.jpg';
      }
    }
    if (!src) return '';
    return (/^(\/|https?:\/\/|assets\/)/i.test(src)) ? src : ('/' + src);
  }

  function countryIso(c) {
    var slug = (c.slug || '').toLowerCase();
    if (slug === 'philippines') return 'PH';
    if (slug === 'united-arab-emirates' || slug === 'uae' || slug === 'dubai') return 'AE';
    if (slug === 'bahrain') return 'BH';
    if (slug === 'vietnam') return 'VN';
    if (slug === 'morocco') return 'MA';
    if (slug === 'qatar') return 'QA';
    if (slug === 'sri-lanka' || slug === 'srilanka') return 'LK';
    if (slug === 'egypt') return 'EG';
    if (slug === 'thailand') return 'TH';
    if (slug === 'russia') return 'RU';
    if (slug === 'oman') return 'OM';
    if (slug === 'azerbaijan') return 'AZ';
    if (slug === 'indonesia' || slug === 'bali') return 'ID';
    if (slug === 'singapore') return 'SG';
    if (slug === 'malaysia') return 'MY';
    if (slug === 'georgia') return 'GE';
    if (slug === 'saudi-arabia' || slug === 'saudi') return 'SA';
    if (slug === 'turkey' || slug === 'turkiye') return 'TR';
    if (slug === 'kenya') return 'KE';
    return (c.iso2 || '').toUpperCase();
  }

  var COUNTRY_TAGLINES = {
    'united-arab-emirates': 'Modern Opportunities',
    'uae': 'Modern Opportunities',
    'dubai': 'Modern Opportunities',
    'bahrain': 'Where Tradition Meets Future',
    'vietnam': 'Natural Beauty Awaits',
    'thailand': 'Experience a New Culture',
    'qatar': 'Oasis of Modern Luxury',
    'morocco': 'Kingdom of Wonder',
    'sri-lanka': 'Pearl of the Indian Ocean',
    'srilanka': 'Pearl of the Indian Ocean',
    'egypt': 'Cradle of Civilization',
    'russia': 'Land of Rich Heritage',
    'indonesia': 'Tropical Island Paradise',
    'azerbaijan': 'Land of Fire & Culture',
    'oman': 'Beauty Has An Address',
    'saudi-arabia': 'Kingdom of Heritage & Future',
    'saudi': 'Kingdom of Heritage & Future',
    'singapore': 'Where Possibilities Meet',
    'malaysia': 'Truly Asia',
    'georgia': 'Heart of the Caucasus',
    'turkey': 'Where Continents Meet',
    'kenya': 'Magical Wildlife & Landscapes',
    'japan': 'Land of the Rising Sun',
    'france': 'Gateway to Europe',
    'germany': 'Gateway to Europe',
    'spain': 'Gateway to Europe',
    'switzerland': 'Alpine Wonder & Lakes',
    'italy': 'Art, History & Charm',
    'united-kingdom': 'Historic Royal Heritage',
    'uk': 'Historic Royal Heritage',
    'united-states': 'Land of Endless Possibilities',
    'usa': 'Land of Endless Possibilities'
  };

  var COUNTRY_TAGS = {
    'united-arab-emirates': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'uae': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'dubai': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'bahrain': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'users', label: 'Family Visa' }
    ],
    'vietnam': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'thailand': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'qatar': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'morocco': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'sri-lanka': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'srilanka': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'egypt': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'russia': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'indonesia': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'azerbaijan': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'oman': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'saudi-arabia': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'saudi': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'philippines': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'singapore': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'malaysia': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'georgia': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'turkey': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ],
    'kenya': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'Business Visa' }
    ],
    'japan': [
      { icon: 'building', label: 'Tourist Visa' },
      { icon: 'plane', label: 'E-Visa' }
    ]
  };

  var COUNTRY_PROCESSING_TIMES = {
    'united-arab-emirates': '3-5 working days',
    'uae': '3-5 working days',
    'dubai': '3-5 working days',
    'bahrain': '3-7 working days',
    'vietnam': '3-5 working days',
    'thailand': '3-7 working days',
    'qatar': '5-6 working days',
    'morocco': '3-5 working days',
    'sri-lanka': '24 to 48 hours',
    'srilanka': '24 to 48 hours',
    'egypt': '10 - 15 days',
    'russia': '10 - 12 days',
    'indonesia': '5-7 working days',
    'azerbaijan': 'Upto 3 days',
    'oman': '5-6 working days',
    'saudi-arabia': '5 working days',
    'saudi': '5 working days',
    'philippines': '8 - 10 days',
    'singapore': '3-5 working days',
    'malaysia': '2-3 working days',
    'georgia': '3-5 working days',
    'turkey': '2-3 working days',
    'kenya': 'Upto 2 days',
    'japan': '3-5 working days'
  };

  function esc(s){
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function tagIconSvg(type) {
    if (type === 'users') {
      return '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
    }
    if (type === 'plane') {
      return '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>';
  }

  // ---- Country Card renderer matching media_1788953353275.png Reference ----
  function countryCard(c){
    var photo = destinationPhoto(c);
    var baseSlug = (c.slug || '').toLowerCase();
    var photoStyle = photo ? ' style="background-image:url(&quot;' + photo + '&quot;)"' : '';
    
    var countryDisplayName = c.name || '';
    if (baseSlug === 'united-arab-emirates' || baseSlug === 'uae') countryDisplayName = 'United Arab Emirates';
    else if (baseSlug === 'bahrain') countryDisplayName = 'Bahrain';
    else if (baseSlug === 'vietnam') countryDisplayName = 'Vietnam';
    else if (baseSlug === 'morocco') countryDisplayName = 'Morocco';
    else if (baseSlug === 'qatar') countryDisplayName = 'Qatar';
    else if (baseSlug === 'sri-lanka' || baseSlug === 'srilanka') countryDisplayName = 'Sri Lanka';
    else if (baseSlug === 'egypt') countryDisplayName = 'Egypt';
    else if (baseSlug === 'thailand') countryDisplayName = 'Thailand';
    else if (baseSlug === 'philippines') countryDisplayName = 'Philippines';
    else if (baseSlug === 'russia') countryDisplayName = 'Russia';
    else if (baseSlug === 'oman') countryDisplayName = 'Oman';
    else if (baseSlug === 'azerbaijan') countryDisplayName = 'Azerbaijan';
    else if (baseSlug === 'indonesia') countryDisplayName = 'Indonesia';
    else if (baseSlug === 'singapore') countryDisplayName = 'Singapore';
    else if (baseSlug === 'malaysia') countryDisplayName = 'Malaysia';
    else if (baseSlug === 'georgia') countryDisplayName = 'Georgia';
    else if (baseSlug === 'saudi-arabia' || baseSlug === 'saudi') countryDisplayName = 'Saudi Arabia';
    else if (baseSlug === 'turkey' || baseSlug === 'turkiye') countryDisplayName = 'Turkey';
    else if (baseSlug === 'kenya') countryDisplayName = 'Kenya';

    return '<a class="dest-mockup-card dest-card-item-link" href="' + countryHref(c.slug) + '"' +
      ' data-group="' + (c.group_slug || '') + '" data-types="' + (c.visaTypes || '') + '" data-slug="' + baseSlug + '">' +
      '<div class="dest-photo-box"' + photoStyle + '>' +
        '<div class="dest-card-overlay"></div>' +
        '<span class="dest-card-name-centered">' + esc(countryDisplayName) + '</span>' +
      '</div>' +
      '<div class="dest-card-under-info">' +
        '<span class="dest-under-docs-label">Documents needed:</span>' +
        '<span class="dest-under-docs-val">Passport, Photo</span>' +
      '</div>' +
    '</a>';
  }

  // Top 4 Popular Destination Slugs (1 clean row)
  var TOP_POPULAR_SLUGS = [
    'united-arab-emirates', 'uae', 'dubai',
    'bahrain',
    'vietnam',
    'thailand'
  ];

  // Curated fallback countries for instant hydration
  var FALLBACK_COUNTRIES = [
    { name: 'Morocco', slug: 'morocco', iso2: 'ma', group_slug: 'e-visa', minPrice: 4149 },
    { name: 'Qatar', slug: 'qatar', iso2: 'qa', group_slug: 'e-visa', minPrice: 8999 },
    { name: 'Sri Lanka', slug: 'sri-lanka', iso2: 'lk', group_slug: 'e-visa', minPrice: 999 },
    { name: 'Philippines', slug: 'philippines', iso2: 'ph', group_slug: 'e-visa', minPrice: 8499 },
    { name: 'United Arab Emirates', slug: 'united-arab-emirates', iso2: 'ae', group_slug: 'e-visa', minPrice: 3499 },
    { name: 'Bahrain', slug: 'bahrain', iso2: 'bh', group_slug: 'e-visa', minPrice: 4500 },
    { name: 'Vietnam', slug: 'vietnam', iso2: 'vn', group_slug: 'e-visa', minPrice: 2999 },
    { name: 'Thailand', slug: 'thailand', iso2: 'th', group_slug: 'e-visa', minPrice: 499 },
    { name: 'Egypt', slug: 'egypt', iso2: 'eg', group_slug: 'e-visa', minPrice: 5999 },
    { name: 'Russia', slug: 'russia', iso2: 'ru', group_slug: 'e-visa', minPrice: 4999 },
    { name: 'Oman', slug: 'oman', iso2: 'om', group_slug: 'e-visa', minPrice: 4499 },
    { name: 'Azerbaijan', slug: 'azerbaijan', iso2: 'az', group_slug: 'e-visa', minPrice: 2899 },
    { name: 'Indonesia', slug: 'indonesia', iso2: 'id', group_slug: 'e-visa', minPrice: 8999 },
    { name: 'Singapore', slug: 'singapore', iso2: 'sg', group_slug: 'e-visa', minPrice: 2500 },
    { name: 'Malaysia', slug: 'malaysia', iso2: 'my', group_slug: 'e-visa', minPrice: 2200 },
    { name: 'Georgia', slug: 'georgia', iso2: 'ge', group_slug: 'e-visa', minPrice: 2800 },
    { name: 'Saudi Arabia', slug: 'saudi-arabia', iso2: 'sa', group_slug: 'e-visa', minPrice: 5500 },
    { name: 'Kenya', slug: 'kenya', iso2: 'ke', group_slug: 'e-visa', minPrice: 5999 },
    { name: 'Turkey', slug: 'turkey', iso2: 'tr', group_slug: 'e-visa', minPrice: 4500 },
    { name: 'France', slug: 'france', iso2: 'fr', group_slug: 'schengen', minPrice: 7999 },
    { name: 'Germany', slug: 'germany', iso2: 'de', group_slug: 'schengen', minPrice: 7999 },
    { name: 'Italy', slug: 'italy', iso2: 'it', group_slug: 'schengen', minPrice: 7999 },
    { name: 'Spain', slug: 'spain', iso2: 'es', group_slug: 'schengen', minPrice: 7999 },
    { name: 'Switzerland', slug: 'switzerland', iso2: 'ch', group_slug: 'schengen', minPrice: 8499 },
    { name: 'Greece', slug: 'greece', iso2: 'gr', group_slug: 'schengen', minPrice: 7499 }
  ];

  var SEARCH_ALIASES = {
    'united-arab-emirates': ['uae', 'dubai', 'abu dhabi', 'sharjah', 'emirates', 'united arab emirates', 'dxb', 'ajman', 'ras al khaimah'],
    'united-kingdom': ['uk', 'london', 'england', 'britain', 'great britain', 'united kingdom', 'scotland', 'wales'],
    'united-states': ['usa', 'us', 'america', 'new york', 'california', 'united states', 'washington'],
    'thailand': ['thailand', 'thai', 'bangkok', 'phuket', 'pattaya', 'krabi', 'koh samui'],
    'indonesia': ['indonesia', 'bali', 'jakarta', 'lombok', 'denpasar'],
    'malaysia': ['malaysia', 'kuala lumpur', 'kl', 'penang', 'langkawi'],
    'singapore': ['singapore', 'sg', 'changi'],
    'vietnam': ['vietnam', 'hanoi', 'ho chi minh', 'da nang', 'saigon'],
    'saudi-arabia': ['saudi', 'saudi arabia', 'ksa', 'riyadh', 'jeddah', 'mecca', 'medina', 'umrah'],
    'qatar': ['qatar', 'doha'],
    'bahrain': ['bahrain', 'manama'],
    'oman': ['oman', 'muscat', 'salalah'],
    'egypt': ['egypt', 'cairo', 'giza', 'pyramids', 'hurghada', 'sharm el sheikh'],
    'turkey': ['turkey', 'turkiye', 'istanbul', 'antalya', 'cappadocia', 'ankara'],
    'morocco': ['morocco', 'marrakech', 'casablanca', 'rabat'],
    'sri-lanka': ['sri lanka', 'srilanka', 'colombo', 'kandy'],
    'russia': ['russia', 'moscow', 'st petersburg'],
    'azerbaijan': ['azerbaijan', 'baku'],
    'georgia': ['georgia', 'tbilisi', 'batumi'],
    'philippines': ['philippines', 'manila', 'cebu', 'boracay'],
    'japan': ['japan', 'tokyo', 'osaka', 'kyoto'],
    'france': ['france', 'paris', 'french', 'schengen', 'europe', 'nice'],
    'germany': ['germany', 'berlin', 'frankfurt', 'munich', 'german', 'schengen', 'europe'],
    'italy': ['italy', 'rome', 'milan', 'venice', 'florence', 'italian', 'schengen', 'europe'],
    'spain': ['spain', 'madrid', 'barcelona', 'spanish', 'schengen', 'europe'],
    'switzerland': ['switzerland', 'swiss', 'zurich', 'geneva', 'schengen', 'europe'],
    'greece': ['greece', 'athens', 'santorini', 'mykonos', 'schengen', 'europe'],
    'denmark': ['denmark', 'copenhagen', 'schengen', 'europe'],
    'china': ['china', 'beijing', 'shanghai', 'guangzhou'],
    'south-korea': ['south korea', 'korea', 'seoul', 'busan'],
    'ireland': ['ireland', 'dublin', 'europe'],
    'kenya': ['kenya', 'nairobi', 'mombasa', 'safari']
  };

  var activeSearchCountries = FALLBACK_COUNTRIES;

  function scoreMatch(c, q) {
    if (!q) return -1;
    var name = (c.name || '').toLowerCase();
    var slug = (c.slug || '').toLowerCase();
    var iso = (c.iso2 || countryIso(c) || '').toLowerCase();

    // Exact match
    if (name === q || slug === q || iso === q) return 100;
    // Prefix match
    if (name.indexOf(q) === 0 || slug.indexOf(q) === 0) return 80;
    // Contains match
    if (name.indexOf(q) > -1 || slug.indexOf(q) > -1) return 60;

    // Alias matches
    var aliases = SEARCH_ALIASES[slug] || [];
    for (var i = 0; i < aliases.length; i++) {
      var al = aliases[i];
      if (al === q) return 90;
      if (al.indexOf(q) === 0) return 70;
      if (al.indexOf(q) > -1 || q.indexOf(al) > -1) return 50;
    }

    // Schengen group search
    if (q === 'schengen' && (c.group_slug === 'schengen' || ['france','germany','italy','spain','switzerland','greece','denmark','japan'].indexOf(slug) > -1)) {
      return 65;
    }
    // E-Visa group search
    if ((q === 'evisa' || q === 'e-visa') && (c.group_slug === 'e-visa' || c.group_slug === 'evisa')) {
      return 65;
    }

    return -1;
  }

  var DEFAULT_NATIONALITIES = [
    { name: 'India', iso2: 'in' },
    { name: 'Qatar', iso2: 'qa' }
  ];

  function initHeroNationalityDropdown() {
    var trigger = document.getElementById('heroNationalityTrigger');
    var dropdown = document.getElementById('heroNationalityDropdown');
    var valEl = document.getElementById('heroSelectedNationality');
    var flagEl = document.getElementById('heroSelectedFlag');
    if (!trigger || !dropdown || !valEl) return;

    var currentNat = localStorage.getItem('visadoo_nationality') || 'India';
    if (currentNat.toLowerCase() !== 'india' && currentNat.toLowerCase() !== 'qatar') {
      currentNat = 'India';
      localStorage.setItem('visadoo_nationality', 'India');
    }

    var options = dropdown.querySelectorAll('.viator-nat-opt');

    function syncState() {
      valEl.textContent = currentNat;
      var iso = (currentNat.toLowerCase() === 'qatar') ? 'qa' : 'in';
      if (flagEl) {
        flagEl.src = 'https://flagcdn.com/w40/' + iso + '.png';
        flagEl.alt = currentNat + ' flag';
      }
      options.forEach(function (btn) {
        var name = btn.getAttribute('data-name');
        var isActive = (name && name.toLowerCase() === currentNat.toLowerCase());
        if (isActive) {
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        }
      });
    }
    syncState();

    function openDropdown() {
      // Close other dropdowns
      var visaDropdown = document.getElementById('heroVisaTypeDropdown');
      if (visaDropdown) visaDropdown.classList.remove('show');
      var destResults = document.getElementById('destResults');
      if (destResults) destResults.classList.remove('show');

      dropdown.classList.add('show');
      trigger.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
      dropdown.classList.remove('show');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function (e) {
      if (e.target.closest('.viator-nat-dropdown')) return;
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('show');
      if (isOpen) closeDropdown(); else openDropdown();
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var isOpen = dropdown.classList.contains('show');
        if (isOpen) closeDropdown(); else openDropdown();
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    options.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var name = btn.getAttribute('data-name') || 'India';
        var iso = btn.getAttribute('data-iso') || (name.toLowerCase() === 'qatar' ? 'qa' : 'in');
        currentNat = name;
        localStorage.setItem('visadoo_nationality', name);

        syncState();
        closeDropdown();

        // Sync with header UI
        var headerFlag = document.getElementById('selectedNationalityFlag');
        if (headerFlag && iso) headerFlag.src = 'https://flagcdn.com/w40/' + iso + '.png';
        var headerText = document.getElementById('selectedNationalityText');
        if (headerText) headerText.textContent = name;

        // Dispatch event so Supabase destination filters update
        document.dispatchEvent(new CustomEvent('nationalitychanged', { detail: name }));
      });
    });

    document.addEventListener('click', function (e) {
      if (!trigger.contains(e.target)) {
        closeDropdown();
      }
    });

    document.addEventListener('nationalitychanged', function (e) {
      if (e && e.detail && typeof e.detail === 'string') {
        currentNat = e.detail;
        syncState();
      }
    });
  }
  initHeroNationalityDropdown();

  function initHeroVisaTypeDropdown() {
    var trigger = document.getElementById('heroVisaTypeTrigger');
    var dropdown = document.getElementById('heroVisaTypeDropdown');
    var valEl = document.getElementById('heroSelectedVisaType');
    var destInput = document.getElementById('destSearch');
    if (!trigger || !dropdown || !valEl) return;

    function openDropdown() {
      var natDropdown = document.getElementById('heroNationalityDropdown');
      if (natDropdown) natDropdown.classList.remove('show');
      var destResults = document.getElementById('destResults');
      if (destResults) destResults.classList.remove('show');
      dropdown.classList.add('show');
      trigger.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
      dropdown.classList.remove('show');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function (e) {
      if (e.target.closest('.viator-type-dropdown')) return;
      e.stopPropagation();
      var isOpen = dropdown.classList.contains('show');
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var isOpen = dropdown.classList.contains('show');
        if (isOpen) closeDropdown(); else openDropdown();
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    var options = dropdown.querySelectorAll('.viator-type-opt');
    options.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var type = btn.getAttribute('data-type') || 'all';
        var strongEl = btn.querySelector('strong');
        var labelText = strongEl ? strongEl.textContent.trim() : 'All Visa Types';

        valEl.textContent = labelText;
        valEl.setAttribute('data-value', type);

        options.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        closeDropdown();

        // Sync filter down to destinations
        if (typeof window.setVisaFilter === 'function') {
          window.setVisaFilter(type);
        }

        // If search input has text, trigger search again to update suggestions
        if (destInput && destInput.value.trim()) {
          destInput.dispatchEvent(new Event('input'));
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!trigger.contains(e.target)) {
        closeDropdown();
      }
    });
  }
  initHeroVisaTypeDropdown();

  function initDestinationSearch() {
    var input = document.getElementById('destSearch');
    var results = document.getElementById('destResults');
    var searchButton = document.getElementById('destSearchButton');
    if (!input || !results) return;

    var searchDebounceTimer = null;
    var activeResultIndex = -1;

    var SCHENGEN_SLUGS = [
      'france', 'germany', 'italy', 'spain', 'switzerland',
      'greece', 'denmark', 'austria', 'netherlands', 'belgium',
      'portugal', 'japan'
    ];
    var EVISA_SLUGS = [
      'united-arab-emirates', 'uae', 'vietnam', 'morocco', 'qatar',
      'sri-lanka', 'egypt', 'thailand', 'russia', 'bahrain',
      'indonesia', 'azerbaijan', 'oman', 'singapore', 'malaysia',
      'georgia', 'saudi-arabia', 'turkey', 'kenya'
    ];

    function updateActiveItem(items) {
      items.forEach(function (el, idx) {
        if (idx === activeResultIndex) {
          el.classList.add('active-item');
          el.scrollIntoView({ block: 'nearest' });
        } else {
          el.classList.remove('active-item');
        }
      });
    }

    function doSearch() {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        var rawVal = input.value || '';
        var q = rawVal.trim().toLowerCase();
        activeResultIndex = -1;
        if (!q) {
          results.classList.remove('show');
          results.innerHTML = '';
          return;
        }

        var pool = (activeSearchCountries && activeSearchCountries.length) ? activeSearchCountries : FALLBACK_COUNTRIES;
        var selectedVisaType = 'all';
        var typeEl = document.getElementById('heroSelectedVisaType');
        if (typeEl) {
          selectedVisaType = (typeEl.getAttribute('data-value') || 'all').toLowerCase();
        }

        var scored = [];
        var seen = {};

        pool.forEach(function (c) {
          if (seen[c.slug]) return;
          var slug = (c.slug || '').toLowerCase();
          var group = (c.group_slug || '').toLowerCase();
          var isSchengen = group === 'schengen' || SCHENGEN_SLUGS.indexOf(slug) > -1;
          var isEvisa = group === 'e-visa' || group === 'evisa' || EVISA_SLUGS.indexOf(slug) > -1;

          // If a visa type filter is active, respect it
          if (selectedVisaType === 'schengen' && !isSchengen) return;
          if ((selectedVisaType === 'evisa' || selectedVisaType === 'e-visa') && !isEvisa) return;
          if (selectedVisaType === 'sticker' && !isSchengen && ['united-kingdom','united-states','china','japan','philippines'].indexOf(slug) === -1) return;

          var s = scoreMatch(c, q);
          if (s > 0) {
            scored.push({ country: c, score: s });
            seen[c.slug] = true;
          }
        });

        scored.sort(function (a, b) {
          return b.score - a.score;
        });

        var matches = scored.slice(0, 8).map(function (item) { return item.country; });

        if (!matches.length) {
          var typeHint = selectedVisaType === 'schengen' ? ' Schengen' : (selectedVisaType === 'evisa' ? ' e-Visa' : '');
          results.innerHTML = '<div class="none">' +
            '<div>No' + typeHint + ' destination found for "<strong>' + esc(rawVal.trim()) + '</strong>"</div>' +
            '<span class="none-sub">Try searching another country or explore our full catalog.</span>' +
            '<a href="#destinations" class="none-action-btn" id="searchExploreAllBtn">Explore All Destinations &darr;</a>' +
          '</div>';
          var exploreBtn = results.querySelector('#searchExploreAllBtn');
          if (exploreBtn) {
            exploreBtn.addEventListener('click', function (e) {
              e.preventDefault();
              results.classList.remove('show');
              if (typeof window.setVisaFilter === 'function') {
                window.setVisaFilter('all');
              }
              var destSec = document.getElementById('destinations');
              if (destSec) destSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }
        } else {
          results.innerHTML = matches.map(function (c) {
            var iso = (c.iso2 || countryIso(c) || 'un').toLowerCase();
            var slug = (c.slug || '').toLowerCase();
            var isSchengen = (c.group_slug === 'schengen') || SCHENGEN_SLUGS.indexOf(slug) > -1;
            var badgeText = isSchengen
              ? 'Schengen'
              : ((c.visaCount != null && c.visaCount > 0)
                ? (c.visaCount + (c.visaCount === 1 ? ' Visa' : ' Visas'))
                : 'e-Visa');

            return '<a href="' + countryHref(c.slug) + '" class="dest-search-item" data-slug="' + c.slug + '">' +
              '<img class="flag" src="' + flag(iso) + '" alt="' + esc(c.name || 'Country') + ' flag" loading="lazy">' +
              '<span class="dest-search-name">' + esc(c.name || '') + '</span>' +
              '<span class="dest-search-badge">' + esc(badgeText) + '</span>' +
            '</a>';
          }).join('');
        }

        results.classList.add('show');
      }, 70);
    }

    input.addEventListener('input', doSearch, { passive: true });
    input.addEventListener('focus', function () {
      var natDropdown = document.getElementById('heroNationalityDropdown');
      if (natDropdown) natDropdown.classList.remove('show');
      var visaDropdown = document.getElementById('heroVisaTypeDropdown');
      if (visaDropdown) visaDropdown.classList.remove('show');
      if ((input.value || '').trim()) doSearch();
    }, { passive: true });

    input.addEventListener('keydown', function (e) {
      var items = [].slice.call(results.querySelectorAll('a.dest-search-item'));
      if (e.key === 'ArrowDown') {
        if (!results.classList.contains('show') || !items.length) {
          doSearch();
          return;
        }
        e.preventDefault();
        activeResultIndex = (activeResultIndex + 1) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'ArrowUp') {
        if (!results.classList.contains('show') || !items.length) return;
        e.preventDefault();
        activeResultIndex = (activeResultIndex - 1 + items.length) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeResultIndex >= 0 && items[activeResultIndex]) {
          window.location.href = items[activeResultIndex].href;
        } else if (items.length > 0) {
          window.location.href = items[0].href;
        } else if (!(input.value || '').trim()) {
          var selectedVisaType = 'all';
          var typeEl = document.getElementById('heroSelectedVisaType');
          if (typeEl) selectedVisaType = (typeEl.getAttribute('data-value') || 'all').toLowerCase();
          if (typeof window.setVisaFilter === 'function') {
            window.setVisaFilter(selectedVisaType);
          }
          var destSec = document.getElementById('destinations');
          if (destSec) destSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else if (e.key === 'Escape') {
        results.classList.remove('show');
      }
    });

    if (searchButton) {
      searchButton.addEventListener('click', function () {
        var q = (input.value || '').trim();
        var selectedVisaType = 'all';
        var typeEl = document.getElementById('heroSelectedVisaType');
        if (typeEl) selectedVisaType = (typeEl.getAttribute('data-value') || 'all').toLowerCase();

        if (!q) {
          if (typeof window.setVisaFilter === 'function') {
            window.setVisaFilter(selectedVisaType);
          }
          var destSec = document.getElementById('destinations');
          if (destSec) destSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        var first = results.querySelector('a.dest-search-item');
        if (first) {
          window.location.href = first.href;
        } else {
          doSearch();
        }
      });
    }

    document.addEventListener('click', function (e) {
      if (!results.contains(e.target) && e.target !== input && e.target !== searchButton) {
        results.classList.remove('show');
      }
    });
  }
  initDestinationSearch();

  function render(countries, groups){
    var INITIAL_LIMIT = 8;
    var showAllCountries = false;
    var activeVisaFilter = 'all';

    // Curate order: prioritizes top requested countries (Morocco, Qatar, Sri Lanka, Philippines, UAE, Bahrain, Vietnam, Thailand, etc.)
    var topPrioritySlugs = [
      'morocco', 'qatar', 'sri-lanka', 'philippines',
      'united-arab-emirates', 'bahrain', 'vietnam', 'thailand',
      'egypt', 'russia', 'oman', 'azerbaijan',
      'indonesia', 'singapore', 'malaysia', 'saudi-arabia',
      'georgia', 'turkey', 'kenya'
    ];

    var orderedCountries = [];
    var seenSlugs = {};

    topPrioritySlugs.forEach(function(ts){
      var match = countries.filter(function(c){
        var s = (c.slug||'').toLowerCase();
        return s === ts || (ts === 'united-arab-emirates' && (s === 'uae' || s === 'dubai'));
      })[0];
      if(match && !seenSlugs[match.slug]){
        orderedCountries.push(match);
        seenSlugs[match.slug] = true;
      }
    });

    countries.forEach(function(c){
      if(!seenSlugs[c.slug]){
        orderedCountries.push(c);
        seenSlugs[c.slug] = true;
      }
    });

    var SCHENGEN_SLUGS = [
      'france', 'germany', 'italy', 'spain', 'switzerland',
      'greece', 'denmark', 'austria', 'netherlands', 'belgium',
      'portugal', 'sweden', 'norway', 'finland', 'poland',
      'czech-republic', 'hungary'
    ];

    function isSchengenCountry(c) {
      if (!c) return false;
      var s = (c.slug || '').toLowerCase();
      var g = (c.group_slug || '').toLowerCase();
      return SCHENGEN_SLUGS.indexOf(s) > -1 || (g === 'schengen' && ['japan', 'china', 'south-korea', 'ireland', 'azerbaijan'].indexOf(s) === -1);
    }

    // Top 5 Popular Destinations (Top 5 countries)
    var popularCountries = orderedCountries.slice(0, 5);

    // E-Visas (remaining countries that are not Schengen)
    var evisaCountries = orderedCountries.slice(5).filter(function(c) {
      return !isSchengenCountry(c);
    });

    // Schengen Visas (all Schengen countries)
    var schengenCountries = orderedCountries.filter(function(c) {
      return isSchengenCountry(c);
    });

    // Populate Grids
    var popularGrid = document.getElementById('destPopularGrid');
    var evisaGrid = document.getElementById('destEvisaGrid');
    var schengenGrid = document.getElementById('destSchengenGrid');
    var legacyGrid = document.getElementById('destGrid');

    if(popularGrid) popularGrid.innerHTML = popularCountries.map(countryCard).join('');
    if(evisaGrid) evisaGrid.innerHTML = evisaCountries.map(countryCard).join('');
    if(schengenGrid) schengenGrid.innerHTML = schengenCountries.map(countryCard).join('');
    if(legacyGrid && legacyGrid !== popularGrid && legacyGrid !== evisaGrid && legacyGrid !== schengenGrid) {
      legacyGrid.innerHTML = orderedCountries.map(countryCard).join('');
    }

    var empty = document.getElementById('destinationEmpty');
    var viewAllCountriesBtn = document.getElementById('viewAllCountriesBtn') || document.getElementById('viewAllEvisasBtn');

    var initialHeroTypeEl = document.getElementById('heroSelectedVisaType');
    if (initialHeroTypeEl) {
      var initialTypeVal = (initialHeroTypeEl.getAttribute('data-value') || 'all').toLowerCase();
      if (initialTypeVal && initialTypeVal !== 'all') {
        activeVisaFilter = initialTypeVal;
        if (activeVisaFilter === 'schengen') showAllCountries = true;
      }
    }

    function checkTypeOk(card){
      var cardSlug = (card.getAttribute('data-slug') || '').toLowerCase();
      var cardGroup = (card.getAttribute('data-group') || '').toLowerCase();
      var cardTypes = (card.getAttribute('data-types') || '').toLowerCase();

      if(activeVisaFilter === 'all') return true;
      if(activeVisaFilter === 'evisa' || activeVisaFilter === 'e-visa'){
        return cardGroup.indexOf('evisa') > -1 || cardGroup.indexOf('e-visa') > -1 || cardTypes.indexOf('evisa') > -1 || cardTypes.indexOf('e-visa') > -1 || ['united-arab-emirates','uae','vietnam','morocco','qatar','sri-lanka','egypt','thailand','russia','bahrain','indonesia','azerbaijan','oman','singapore','malaysia','georgia','saudi-arabia','turkey','kenya'].indexOf(cardSlug) > -1;
      } else if(activeVisaFilter === 'schengen'){
        return cardGroup.indexOf('schengen') > -1 || ['france','germany','italy','spain','switzerland','greece','denmark','austria','netherlands','belgium','portugal'].indexOf(cardSlug) > -1;
      } else if(activeVisaFilter === 'sticker'){
        return cardGroup.indexOf('sticker') > -1 || ['france','germany','italy','spain','switzerland','united-kingdom','united-states','china','philippines','japan','greece'].indexOf(cardSlug) > -1;
      } else if(activeVisaFilter === 'business'){
        return cardTypes.indexOf('business') > -1 || true;
      } else if(activeVisaFilter === 'transit'){
        return cardTypes.indexOf('transit') > -1 || ['united-arab-emirates','uae','qatar','bahrain','singapore'].indexOf(cardSlug) > -1;
      } else if(activeVisaFilter === 'student'){
        return cardTypes.indexOf('student') > -1 || ['united-kingdom','united-states','germany','france','canada','australia'].indexOf(cardSlug) > -1;
      } else if(activeVisaFilter === 'work'){
        return cardTypes.indexOf('work') > -1 || ['united-arab-emirates','uae','saudi-arabia','qatar','bahrain','oman'].indexOf(cardSlug) > -1;
      }
      return true;
    }

    function applyFilters(){
      var totalMatched = 0;
      var popSection = document.getElementById('popularSectionBlock');
      var evisaSection = document.getElementById('evisaSectionBlock');
      var schengenSection = document.getElementById('schengenSectionBlock');

      var popMatched = 0;
      if(popularGrid){
        var popCards = [].slice.call(popularGrid.querySelectorAll('.dest-mockup-card'));
        popCards.forEach(function(card){
          var ok = checkTypeOk(card);
          card.hidden = !ok;
          if(ok){
            popMatched++;
            totalMatched++;
          }
        });
      }
      if(popSection) popSection.hidden = (popMatched === 0 && activeVisaFilter !== 'all');

      var evisaMatched = 0;
      if(evisaGrid){
        var evisaCards = [].slice.call(evisaGrid.querySelectorAll('.dest-mockup-card'));
        evisaCards.forEach(function(card){
          var ok = checkTypeOk(card);
          if(ok){
            card.hidden = !showAllCountries && evisaMatched >= INITIAL_LIMIT;
            evisaMatched++;
            totalMatched++;
          } else {
            card.hidden = true;
          }
        });
      }
      if(evisaSection) evisaSection.hidden = (evisaMatched === 0);

      var schengenMatched = 0;
      if(schengenGrid){
        var schengenCards = [].slice.call(schengenGrid.querySelectorAll('.dest-mockup-card'));
        schengenCards.forEach(function(card){
          var ok = checkTypeOk(card);
          if(ok){
            card.hidden = false;
            schengenMatched++;
            totalMatched++;
          } else {
            card.hidden = true;
          }
        });
      }
      if(schengenSection) schengenSection.hidden = (schengenMatched === 0);

      if(empty) empty.hidden = totalMatched > 0;
      if(viewAllCountriesBtn){
        var span = viewAllCountriesBtn.querySelector('span');
        if(span) span.textContent = showAllCountries ? 'Show fewer destinations' : 'View all destinations';
        viewAllCountriesBtn.style.display = (evisaMatched > INITIAL_LIMIT) ? 'inline-flex' : 'none';
      }
      if(window.refreshScrollAnimations) window.refreshScrollAnimations();
    }

    window.setVisaFilter = function(newFilter){
      activeVisaFilter = (newFilter || 'all').toLowerCase();
      if (activeVisaFilter === 'schengen') {
        showAllCountries = true;
      }
      applyFilters();
    };

    if(viewAllCountriesBtn){
      viewAllCountriesBtn.addEventListener('click', function(){
        showAllCountries = !showAllCountries;
        applyFilters();
        if(!showAllCountries){
          var evisaSec = document.getElementById('evisaSectionBlock') || document.getElementById('destinations');
          if(evisaSec) evisaSec.scrollIntoView({behavior:'smooth', block:'start'});
        }
      });
    }

    var destPrevBtn = document.getElementById('destPrevBtn');
    var destNextBtn = document.getElementById('destNextBtn');
    if(destPrevBtn && popularGrid){
      destPrevBtn.addEventListener('click', function(){
        popularGrid.scrollBy({ left: -320, behavior: 'smooth' });
      });
    }
    if(destNextBtn && popularGrid){
      destNextBtn.addEventListener('click', function(){
        popularGrid.scrollBy({ left: 320, behavior: 'smooth' });
      });
    }

    // Hero Visa Category Pills
    var pillsContainer = document.getElementById('heroVisaPills');
    if(pillsContainer){
      var pills = pillsContainer.querySelectorAll('.category-pill');
      pills.forEach(function(pill){
        pill.addEventListener('click', function(){
          pills.forEach(function(p){
            p.classList.remove('active');
            p.setAttribute('aria-selected','false');
          });
          pill.classList.add('active');
          pill.setAttribute('aria-selected','true');
          activeVisaFilter = pill.getAttribute('data-visa-type') || 'all';
          applyFilters();
          var destSec = document.getElementById('destinations');
          if(destSec) destSec.scrollIntoView({behavior:'smooth', block:'start'});
        });
      });
    }

    applyFilters();

    // Update active search pool for instant search
    if (Array.isArray(countries) && countries.length) {
      activeSearchCountries = countries;
    }

    // Reviews Carousel Controls
    var revTrack = document.getElementById('reviewsTrack');
    var revPrev = document.getElementById('revPrevBtn');
    var revNext = document.getElementById('revNextBtn');
    var revDots = document.getElementById('revDots');

    if(revTrack && revPrev && revNext){
      revPrev.addEventListener('click', function(){
        revTrack.scrollBy({ left: -320, behavior: 'smooth' });
      });
      revNext.addEventListener('click', function(){
        revTrack.scrollBy({ left: 320, behavior: 'smooth' });
      });
      if(revDots){
        var dots = revDots.querySelectorAll('.rev-dot');
        dots.forEach(function(dot, idx){
          dot.addEventListener('click', function(){
            dots.forEach(function(d){ d.classList.remove('active'); });
            dot.classList.add('active');
            var cardWidth = (revTrack.querySelector('.review-card-item') || {}).offsetWidth || 300;
            revTrack.scrollTo({ left: idx * (cardWidth + 20), behavior: 'smooth' });
          });
        });
      }
    }
  }

    // Initial render with fallback data for instant display
    render(FALLBACK_COUNTRIES, []);

    // Supabase live database connection
    if(window.supabase && cfg.SUPABASE_URL){
      try{
        var sb=window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      Promise.all([
        sb.from('countries').select('*').order('sort_order'),
        sb.from('visa_types').select('slug,country_slug,price_aed,prices,processing_time_value,processing_time_unit').eq('active',true),
        sb.from('visa_groups').select('*').eq('active',true).order('sort_order'),
        sb.from('site_settings').select('hero_image_url,hero_image_alt,active_currency,currencies').eq('id','global').single(),
        sb.from('pages').select('content').eq('slug','system-nationality-destinations').eq('status','published').maybeSingle()
      ]).then(function(res){
        var allDbCountries = (res[0].data) || [];
        var countries = allDbCountries.filter(function(c) { return c.active; });
        var nationalities=[]; try{nationalities=JSON.parse((res[4]&&res[4].data&&res[4].data.content)||'[]');}catch(e){nationalities=[];}
        nationalities=(Array.isArray(nationalities)?nationalities:[]).filter(function(n){return n.active!==false;}).sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0);});
        var selectedNatName=localStorage.getItem('visadoo_nationality')||'India';
        var selectedNat=nationalities.filter(function(n){return n.name===selectedNatName;})[0];
        if(selectedNat){
          var allowed=Array.isArray(selectedNat.destinations)?selectedNat.destinations:[];
          countries=countries.filter(function(c){return allowed.indexOf(c.slug)>-1;});
        }
        
        countries.forEach(function(c) {
          var slug = c.slug.toLowerCase();
          var schengenSlugs = [
            'japan', 'spain', 'denmark', 'france', 'germany', 
            'switzerland', 'china', 'greece', 'south-korea', 'ireland'
          ];
          if (!c.group_slug) {
            if (schengenSlugs.indexOf(slug) > -1) {
              c.group_slug = 'schengen';
            } else {
              c.group_slug = 'e-visa';
            }
          }
        });

        var visas=(res[1].data)||[], groups=(res[2].data)||[];
        var ss=res[3].data||{};
        
        // compute min price + count per country
        countries.forEach(function(c){
          var cv=visas.filter(function(v){return v.country_slug===c.slug;});
          c.visaCount=cv.length;
          c.visaTypes=cv.map(function(v){return v.slug||'';}).join(' ');
          var cprices=cv.map(visaActivePrice).filter(function(p){return p!=null;});
          c.minPrice=cprices.length?Math.min.apply(null,cprices):null;
        });

        render(countries, groups);

        if(!window.__visadooNationalityHomeBound){
          window.__visadooNationalityHomeBound=true;
          document.addEventListener('nationalitychanged',function(){ window.location.reload(); });
        }
      }).catch(function(err){
        console.error("Error loading home page content:", err);
      });

      // Reviews & footer pages
      Promise.all([
        sb.from('reviews').select('*').eq('active',true).order('sort_order'),
        sb.from('pages').select('slug,title,sort_order').eq('status','published').eq('show_in_footer',true).order('sort_order')
      ]).then(function(res){
        var dbReviews = (res[0].data) || [];
        var pages = (res[1].data) || [];
        var DISTINCT_AVATARS = [
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&h=120&q=80',
          'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&h=120&q=80'
        ];
        if(dbReviews.length >= 6){
          var track = document.getElementById('reviewsTrack');
          if(track){
            track.innerHTML = dbReviews.map(function(r, idx){
              var stars = '★★★★★';
              var avatar = (r.avatar_url && r.avatar_url.indexOf('photo-1534528741775') === -1)
                ? r.avatar_url
                : DISTINCT_AVATARS[idx % DISTINCT_AVATARS.length];
              return '<div class="review-card-item">' +
                '<div class="rev-user-profile">' +
                  '<img src="' + avatar + '" alt="' + (r.name||'User') + '" class="rev-avatar">' +
                  '<div class="rev-user-meta">' +
                    '<strong class="rev-user-name">' + (r.name||'') + '</strong>' +
                    '<span class="rev-user-country">' + (r.location||'Traveller') + '</span>' +
                  '</div>' +
                '</div>' +
                '<div class="rev-stars-gold">' + stars + '</div>' +
                '<p class="rev-feedback-quote">"' + (r.body||'') + '"</p>' +
              '</div>';
            }).join('');
          }
        }
        initReviewsCarousel();
        if(pages.length){
          var fc=document.getElementById('footerCompany');
          if(fc){
            var existing={};
            fc.querySelectorAll('a[href]').forEach(function(a){
              existing[(a.getAttribute('href')||'').replace(/^\/+/, '')]=true;
            });
            var li=pages.filter(function(p){
              return !existing['p/'+encodeURIComponent(p.slug)];
            }).map(function(p){
              return '<li><a href="/p/'+encodeURIComponent(p.slug)+'">'+p.title+'</a></li>';
            }).join('');
            if(li) fc.insertAdjacentHTML('afterbegin', li);
          }
        }
      }).catch(function(err){ 
        console.error("Error loading reviews/pages:", err); 
        initReviewsCarousel();
      });
    }catch(e){ 
      initReviewsCarousel();
    }
  }

  function initReviewsCarousel(){
    var track = document.getElementById('reviewsTrack');
    var prevBtn = document.getElementById('revPrevBtn');
    var nextBtn = document.getElementById('revNextBtn');
    var dotsContainer = document.getElementById('revDots');
    var carouselBox = document.querySelector('.reviews-carousel-container');
    if(!track) return;

    function getScrollStep(){
      var card = track.querySelector('.review-card-item');
      if(!card) return 320;
      return card.offsetWidth + 20;
    }

    // Auto-scroll every 5 seconds (advancing 3 reviews / 1 page batch)
    var autoTimer = null;
    function nextBatch(){
      var maxScroll = track.scrollWidth - track.clientWidth;
      if(track.scrollLeft >= maxScroll - 30){
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        var step = getScrollStep() * 3;
        track.scrollBy({ left: step, behavior: 'smooth' });
      }
    }

    function startAutoScroll(){
      stopAutoScroll();
      autoTimer = setInterval(nextBatch, 5000);
    }

    function stopAutoScroll(){
      if(autoTimer){
        clearInterval(autoTimer);
        autoTimer = null;
      }
    }

    startAutoScroll();

    if(carouselBox && !carouselBox.__hoverBound){
      carouselBox.__hoverBound = true;
      carouselBox.addEventListener('mouseenter', stopAutoScroll);
      carouselBox.addEventListener('mouseleave', startAutoScroll);
      carouselBox.addEventListener('touchstart', stopAutoScroll, { passive: true });
      carouselBox.addEventListener('touchend', startAutoScroll, { passive: true });
    }

    if(prevBtn && !prevBtn.__bound){
      prevBtn.__bound = true;
      prevBtn.addEventListener('click', function(){
        stopAutoScroll();
        track.scrollBy({ left: -getScrollStep() * 3, behavior: 'smooth' });
        startAutoScroll();
      });
    }

    if(nextBtn && !nextBtn.__bound){
      nextBtn.__bound = true;
      nextBtn.addEventListener('click', function(){
        stopAutoScroll();
        nextBatch();
        startAutoScroll();
      });
    }

    function updateDots(){
      if(!dotsContainer) return;
      var dots = dotsContainer.querySelectorAll('.rev-dot');
      if(!dots.length) return;
      var scrollLeft = track.scrollLeft;
      var step = getScrollStep();
      var activeIndex = Math.round(scrollLeft / step);
      if(activeIndex >= dots.length) activeIndex = dots.length - 1;
      if(activeIndex < 0) activeIndex = 0;
      dots.forEach(function(dot, idx){
        dot.classList.toggle('active', idx === activeIndex);
      });
    }

    if(dotsContainer && !dotsContainer.__bound){
      dotsContainer.__bound = true;
      dotsContainer.addEventListener('click', function(e){
        var dot = e.target.closest('.rev-dot');
        if(!dot) return;
        var dots = Array.from(dotsContainer.querySelectorAll('.rev-dot'));
        var idx = dots.indexOf(dot);
        if(idx !== -1){
          stopAutoScroll();
          var step = getScrollStep();
          track.scrollTo({ left: idx * step, behavior: 'smooth' });
          startAutoScroll();
        }
      });
    }

    if(!track.__scrollBound){
      track.__scrollBound = true;
      track.addEventListener('scroll', function(){
        if(track.scrollTop !== 0) track.scrollTop = 0;
        requestAnimationFrame(updateDots);
      }, { passive: true });
    }
  }

  // ---- FAQ Accordion Toggle ----
  function initFaqAccordion() {
    var faqCards = document.querySelectorAll('.faq-card-item');
    if (!faqCards.length) return;
    faqCards.forEach(function(card) {
      var btn = card.querySelector('.faq-question-btn');
      if (!btn || btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', function() {
        var wasActive = card.classList.contains('active');
        // Toggle active on clicked card
        if (wasActive) {
          card.classList.remove('active');
          btn.setAttribute('aria-expanded', 'false');
        } else {
          card.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // ---- Why Recommendations Modal ----
  function initWhyRecommendationsModal() {
    var linkBtn = document.getElementById('whyRecLink');
    var modal = document.getElementById('whyRecModal');
    var closeBtn = document.getElementById('whyRecClose');
    if (!modal) return;

    function openModal() {
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if (linkBtn && !linkBtn.__bound) {
      linkBtn.__bound = true;
      linkBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openModal();
      });
    }

    if (closeBtn && !closeBtn.__bound) {
      closeBtn.__bound = true;
      closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        closeModal();
      }
    });
  }

  // ---- Smooth Count-Up Animation for Trust Metrics ----
  function initCountUpAnimation(){
    var grid = document.getElementById('trustMetricsGrid') || document.querySelector('.trust-metrics-grid');
    if (!grid) return;

    var items = grid.querySelectorAll('.trust-metric-number');
    if (!items.length) return;

    var animated = false;

    function runCountUp(){
      if (animated) return;
      animated = true;

      items.forEach(function(el, idx){
        var target = parseInt(el.getAttribute('data-count'), 10);
        var valueSpan = el.querySelector('.trust-metric-value');
        if (isNaN(target) || !valueSpan) return;

        var duration = 1800; // ms
        var startTime = null;
        valueSpan.textContent = '0';

        function step(timestamp){
          if (!startTime) startTime = timestamp;
          var progress = Math.min((timestamp - startTime) / duration, 1);
          // Smooth easeOutExpo deceleration
          var ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          var current = Math.floor(ease * target);
          valueSpan.textContent = current;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            valueSpan.textContent = target;
          }
        }

        setTimeout(function(){
          requestAnimationFrame(step);
        }, idx * 75);
      });
    }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(function(el){
        var target = el.getAttribute('data-count');
        var val = el.querySelector('.trust-metric-value');
        if (val && target) val.textContent = target;
      });
      return;
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            runCountUp();
            observer.unobserve(grid);
          }
        });
      }, { threshold: 0.25 });
      observer.observe(grid);
    } else {
      runCountUp();
    }
  }

  // =========================================================================
  // SMOOTH SCROLL REVEALS (Wipes In/Out, Fade In/Out, Scale In/Out)
  // =========================================================================
  function initScrollAnimations() {
    // Enable animation classes on root
    document.documentElement.classList.add('has-scroll-animations');

    if (!('IntersectionObserver' in window)) {
      var all = document.querySelectorAll('.scroll-reveal, [data-reveal]');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.add('is-revealed');
      }
      return;
    }

    // Bidirectional observer for entering (in) and leaving (out) viewport
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        } else {
          // Check if element has left viewport to smoothly animate out
          entry.target.classList.remove('is-revealed');
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: [0, 0.15]
    });

    var observedElements = new WeakSet();

    function observeAll() {
      var selector = [
        '.scroll-reveal',
        '[data-reveal]',
        '.board-heading-row',
        '.dest-mockup-card',
        '.trust-proof-banner',
        '.trust-proof-content',
        '.trust-metric-col',
        '.trust-pill-badge',
        '.why-recommendations-divider',
        '.flexible-travel-content',
        '.how-evisas-header',
        '.how-stepper-track-wrap',
        '.how-evisas-col',
        '.faq-header-block',
        '.faq-card-item',
        '.cta-confusion-card',
        '.home-footer .footer-intro',
        '.home-footer .footer-links',
        '.home-footer .footer-contact'
      ].join(', ');

      var items = document.querySelectorAll(selector);
      items.forEach(function(el) {
        if (el.closest('.reviews-carousel-container') || el.classList.contains('review-card-item') || el.closest('.destination-board') || el.classList.contains('dest-mockup-card')) return;
        if (!el.classList.contains('scroll-reveal') && !el.hasAttribute('data-reveal')) {
          el.classList.add('scroll-reveal');
        }
        if (!observedElements.has(el)) {
          observedElements.add(el);
          observer.observe(el);
        }
      });
    }

    observeAll();
    window.refreshScrollAnimations = observeAll;
  }

  function initCtaBannerAction() {
    var ctaBtn = document.getElementById('ctaCheckVisaBtn');
    if (!ctaBtn) return;
    ctaBtn.addEventListener('click', function(e) {
      var dest = document.getElementById('destinations');
      if (dest) {
        e.preventDefault();
        dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var search = document.getElementById('destSearch');
        if (search) {
          setTimeout(function() { search.focus(); }, 600);
        }
      }
    });
  }

  function initGlobalAiAssistant(){
    var old=document.querySelector('.ai-assistant');
    if(old) old.remove();
  }
  window.initGlobalAiAssistant = initGlobalAiAssistant;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ initGlobalAiAssistant(); initReviewsCarousel(); initFaqAccordion(); initWhyRecommendationsModal(); initScrollAnimations(); initCountUpAnimation(); initCtaBannerAction(); });
  else { initGlobalAiAssistant(); initReviewsCarousel(); initFaqAccordion(); initWhyRecommendationsModal(); initScrollAnimations(); initCountUpAnimation(); initCtaBannerAction(); }
  document.addEventListener('visadoo:country-rendered', function(){ initGlobalAiAssistant(); initFaqAccordion(); initWhyRecommendationsModal(); initCountUpAnimation(); initCtaBannerAction(); if(window.refreshScrollAnimations) window.refreshScrollAnimations(); });
})();

