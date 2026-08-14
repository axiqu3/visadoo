// Static country detail page for Live Server/local previews.
(function () {
  'use strict';

  var cfg=window.VISADOO_CONFIG||{};
  var photos=window.VISADOO_DESTINATION_PHOTOS||{};
  var root=document.getElementById('countryPage');
  var year=document.getElementById('year');
  if(year) year.textContent=new Date().getFullYear();
  var menuBtn=document.getElementById('menuBtn');
  var navLinks=document.getElementById('navLinks');
  if(menuBtn&&navLinks){
    menuBtn.addEventListener('click',function(){
      var open=navLinks.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded',String(open));
    });
    navLinks.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click',function(){
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded','false');
      });
    });
  }

  function esc(value){
    return (value==null?'':String(value)).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function shortText(value,fallback,limit){
    var text=String(value||fallback||'').replace(/\s+/g,' ').trim();
    if(text.length<=limit) return text;
    var cut=text.slice(0,limit+1).lastIndexOf(' ');
    return text.slice(0,cut>limit*.65?cut:limit).replace(/[.,;:\s]+$/,'')+'…';
  }

  function getSlug(){
    var query=new URLSearchParams(window.location.search).get('slug');
    if(query) return query;
    var parts=window.location.pathname.split('/').filter(Boolean);
    var countryIndex=parts.indexOf('country');
    return countryIndex>-1&&parts[countryIndex+1]?decodeURIComponent(parts[countryIndex+1]):'';
  }

  function fetchJson(path){
    return fetch(cfg.SUPABASE_URL.replace(/\/$/,'')+path,{
      headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:'Bearer '+cfg.SUPABASE_ANON_KEY}
    }).then(function(response){
      if(!response.ok) throw new Error('Request failed');
      return response.json();
    });
  }

  function priceNumber(visa){
    var value=visa.prices&&visa.prices.INR!=null&&visa.prices.INR!==''?visa.prices.INR:visa.price_aed;
    return value==null||value===''||isNaN(Number(value))||Number(value)<=0?null:Number(value);
  }

  function money(value){
    return value==null?'Price on request':'₹'+Number(value).toLocaleString('en-IN');
  }

  function processingText(visa){
    var value=visa.processing_time_value,unit=visa.processing_time_unit;
    if(value==null||value===''||!unit) return '';
    var label=unit==='hours'?('hour'+(Number(value)===1?'':'s')):('day'+(Number(value)===1?'':'s'));
    return value+' '+label;
  }

  function stayText(visa){
    return visa.days!=null&&visa.days!==''&&Number(visa.days)>0?visa.days+' days':'';
  }

  var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function visaCard(visa){
    var cleanName = (visa.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim();
    var facts=[
      stayText(visa)?'<span><small>Stay</small><b>'+esc(stayText(visa))+'</b></span>':'',
      visa.sub?'<span><small>Entry</small><b>'+esc(visa.sub === 'Single Entry' ? 'Single / Multiple' : visa.sub)+'</b></span>':''
    ].filter(Boolean).join('');
    return '<article class="vcard">'+
      '<h3>'+esc(cleanName||'Visa option')+'</h3>'+
      (visa.category?'<div class="vsub">'+esc(visa.category)+'</div>':'')+
      '<div class="price">'+esc(money(priceNumber(visa)))+' <small>/ visa</small></div>'+
      (facts?'<div class="country-visa-facts">'+facts+'</div>':'')+
      '<a href="app.html?visa='+encodeURIComponent(visa.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+
    '</article>';
  }

  var DUBAI_ATTRACTIONS = [
    {
      name: "Burj Khalifa",
      desc: "The tallest building in the world, the Burj Khalifa of Dubai is truly a global iconic landmark. Out of the 160 floors of the building, take a lift to one of the many observation decks on the 125th floor or 148th floor for a spectacular bird's eye view of Dubai. Purchase your tickets online beforehand to avoid long queues to visit the world's best engineering and architectural marvels.",
      price: "₹ 4063/-",
      image: "/assets/attraction-burj-khalifa.jpg"
    },
    {
      name: "Dubai Miracle Garden",
      desc: "A blooming refreshment in the 'desert city', Dubai's Miracle Garden spans across 72,000 sq. mts. and features over 250 million plants and flowers. It has special attractions like the Emirates A380, Sunflower Field, Heart Tunnel, Floating Lady, Teddy Bear and Flower Parade. To explore the world's largest natural flower garden, plan a trip to Dubai between October and April.",
      price: "₹ 13005/-",
      image: "/assets/attraction-miracle-garden.jpg"
    },
    {
      name: "Dubai Mall",
      desc: "A perfect option to entertain the entire family under one roof is one of the world's largest shopping malls - the Dubai Mall. Shop from local or international luxury brands or simply entertain yourself at the mall's 200+ restaurants, 20+ cine screens, an ice-skating rink, a game zone, indoor skiing, a VR Park, the Dubai Aquarium and much more.",
      price: "₹ 999/-",
      image: "/assets/attraction-dubai-mall.jpg"
    },
    {
      name: "Jumeirah Beach",
      desc: "Long stretches of sandy beaches where you can lounge and enjoy the view. Visitors can splash or sail in the warm waters as the Jumeirah beach is free, however, the park has entry fees. Several luxury hotels and skyscrapers form the beach's backdrop making it an Instagram-worthy location in Dubai.",
      price: "₹ 1330/-",
      image: "/assets/attraction-jumeirah-beach.jpg"
    },
    {
      name: "Burj Al Arab",
      desc: "Made on an artificial island, Dubai's finest architectural marvel and an award-winning luxury hotel is the Burj Al Arab. The hotel's exterior looks like a dhow's sail with amenities like a fleet of luxury cars, a private helipad, a private beach and a range of fine dining options. You can either stay here overnight or opt for a 90-minute guided tour of the Burj Al Arab.",
      price: "₹ 12970/-",
      image: "/assets/attraction-burj-al-arab.jpg"
    },
    {
      name: "Museum of the Future",
      desc: "Unlike ordinary museums, the architecturally beautiful Dubai Museum of Future offers a glimpse into the future. Gear up for an interesting experience filled with cutting-edge innovations, high-tech sciences and some cool immersive experiences. Grab your tickets to the Museum of the Future in advance to learn about Dubai's display of the best in technology and the future.",
      price: "₹ 3473/-",
      image: "/assets/attraction-museum-of-future.jpg"
    },
    {
      name: "Dubai Aquarium and Underwater Zoo",
      desc: "Home to more than 33000 aquatic animals, the Dubai Aquarium and Underwater Zoo is a complete family experience. Spend about 2 to 3 hours here, exploring the wonders of the sea.",
      price: "₹ 2703/-",
      image: "/assets/attraction-dubai-aquarium.jpg"
    },
    {
      name: "Dubai Marina",
      desc: "A posh manmade canal city, also known as 'New Dubai', visitors are in for a treat with an exquisite waterfront, high-end shopping options, upscale dining options and overall a great place for spending time outdoors.",
      price: "₹ 999/-",
      image: "/assets/attraction-dubai-marina.jpg"
    },
    {
      name: "Dubai Frame",
      desc: "Adorning Dubai's iconic skyline, the Dubai Frame offers breathtaking panoramic views of Dubai from its SkyBridge on the 48th floor. Enjoy the views from the Dubai Frame from 9am to 9pm every day.",
      price: "₹ 1976/-",
      image: "/assets/attraction-dubai-frame.jpg"
    },
    {
      name: "Deira Souks",
      desc: "Nestled between the Dubai-Sharjah Border and Dubai Creek, Deira houses the Deira Souk or Dubai Gold Souk. Treat yourself to a day full of shopping for gold, platinum, diamonds and emeralds at this traditional market.",
      price: "₹ 999/-",
      image: "/assets/attraction-deira-souks.jpg"
    },
    {
      name: "Ferrari World",
      desc: "One of its kind Ferrari 'themed' Park offering adrenaline-pumping and state-of-the-art rides, simulators, live performances, electric go-karts and everything Ferrari. Book your day out at Ferrari World to not miss out on specials like Flying Aces, the world's highest ride and Formula Rossa, the world's fastest roller coaster.",
      price: "₹ 7382/-",
      image: "/assets/attraction-ferrari-world.jpg"
    },
    {
      name: "Dubai Desert Safari",
      desc: "A Dubai Tour is incomplete without a sandy adventure with adventurous activities like dune buggies, quad biking, camel riding, sandboarding, etc. Continue your desert adventures with desert camping, a scrumptious dinner, belly dancing performances and much more.",
      price: "₹ 2000/-",
      image: "/assets/attraction-desert-safari.jpg"
    },
    {
      name: "Global Village",
      desc: "Be ready to explore a unique open-air theme Park filled with cultural extravaganza. Made of more than 27 pavilions and up to 175 attractions, make the most of your family's day out at Global Village which only opens up between October and April.",
      price: "₹ 999/-",
      image: "/assets/attraction-global-village.jpg"
    }
  ];

  function getAttractionWaLink(attractionName) {
    var num = (window.VISADOO_CONFIG && window.VISADOO_CONFIG.WHATSAPP) || '919074559868';
    return "https://wa.me/" + num.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Hi, I would like to enquire about tickets for " + attractionName + ".");
  }



  function uaeAttractionsDropdownHtml() {
    var cardsHtml = DUBAI_ATTRACTIONS.map(function(item, index) {
      return '<article class="uae-horizontal-card">' +
        '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '" class="uae-horizontal-card-img" loading="lazy">' +
        '<div class="uae-horizontal-card-info">' +
          '<h3 class="uae-horizontal-card-title">' + (index + 1) + '. ' + esc(item.name) + '</h3>' +
          '<p class="uae-horizontal-card-desc">' + esc(item.desc) + '</p>' +
        '</div>' +
      '</article>';
    }).join('');

    return '<div class="uae-attractions-dropdown" style="display: none;">' +
      '<div class="uae-attractions-wrapper">' +
        '<button class="uae-carousel-arrow uae-carousel-arrow-left" type="button" aria-label="Scroll left">&#8249;</button>' +
        '<div class="uae-horizontal-scroll-container">' +
          cardsHtml +
        '</div>' +
        '<button class="uae-carousel-arrow uae-carousel-arrow-right" type="button" aria-label="Scroll right">&#8250;</button>' +
      '</div>' +
    '</div>';
  }

  function wireUaeAttractionsToggle() {
    var btn = document.querySelector('.uae-attractions-toggle');
    var panel = document.querySelector('.uae-attractions-dropdown');
    if (!btn || !panel) return;
    btn.addEventListener('click', function() {
      var active = btn.classList.toggle('active');
      btn.setAttribute('aria-expanded', String(active));
      panel.style.display = active ? 'block' : 'none';
      panel.classList.toggle('is-open', active);
      if (active) {
        requestAnimationFrame(function(){ window.dispatchEvent(new Event('resize')); });
        setTimeout(function() {
          window.dispatchEvent(new Event('resize'));
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });

    // Also wire up the "Dubai Attractions" navigation link to expand the drawer
    document.querySelectorAll('a[href="#attractions"]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var b = document.querySelector('.uae-attractions-toggle');
        var p = document.querySelector('.uae-attractions-dropdown');
        if (b && p) {
          if (!b.classList.contains('active')) {
            b.click();
          } else {
            p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    });
  }

  function wireUaeCarouselArrows() {
    var panel = document.querySelector('.uae-attractions-dropdown');
    if (!panel) return;
    var container = panel.querySelector('.uae-horizontal-scroll-container');
    var leftArrow = panel.querySelector('.uae-carousel-arrow-left');
    var rightArrow = panel.querySelector('.uae-carousel-arrow-right');
    if (!container || !leftArrow || !rightArrow) return;

    leftArrow.addEventListener('click', function() {
      container.scrollBy({ left: -310, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', function() {
      container.scrollBy({ left: 310, behavior: 'smooth' });
    });

    function toggleArrows() {
      var scrollLeft = container.scrollLeft;
      var maxScroll = container.scrollWidth - container.clientWidth;
      leftArrow.style.opacity = scrollLeft <= 5 ? '0' : '1';
      leftArrow.style.pointerEvents = scrollLeft <= 5 ? 'none' : 'auto';
      rightArrow.style.opacity = scrollLeft >= maxScroll - 5 ? '0' : '1';
      rightArrow.style.pointerEvents = scrollLeft >= maxScroll - 5 ? 'none' : 'auto';
    }

    container.addEventListener('scroll', toggleArrows);
    window.addEventListener('resize', toggleArrows);
    setTimeout(toggleArrows, 200);
  }

  function uaeVisaSelector(visas,countryName,countrySummary){
    if(!visas.length) return '';
    countryName=countryName||'Destination';
    
    // Sort visas by stay duration (days)
    var sortedVisas = [].concat(visas).sort(function(a, b){
      var daysA = a.days != null && a.days !== '' ? Number(a.days) : (a.stay_period_value != null ? Number(a.stay_period_value) : 0);
      var daysB = b.days != null && b.days !== '' ? Number(b.days) : (b.stay_period_value != null ? Number(b.stay_period_value) : 0);
      return daysA - daysB;
    });

    var first=sortedVisas[0];
    var firstCleanName = (first.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim();
    var choices=sortedVisas.map(function(visa,index){
      var visaName = (visa.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim();
      return '<label class="uae-travel-option-card'+(index===0?' selected':'')+'">'+
        '<input class="uae-visa-option-input uae-v2-radio-hidden" type="radio" name="visa" value="'+esc(visa.slug)+'"'+(index===0?' checked':'')+' required'+
        ' data-name="'+esc(visaName||countryName+' visa')+'"'+
        ' data-category="'+esc(visa.category||countryName+' visa')+'"'+
        ' data-stay="'+esc(stayText(visa)||'See visa details')+'"'+
        ' data-entry="'+esc((visa.sub === 'Single Entry' ? 'Single / Multiple' : visa.sub)||visa.category||'See visa details')+'"'+
        ' data-processing="'+esc(processingText(visa)||'To be confirmed')+'"'+
        ' data-raw-price="'+(priceNumber(visa)||0)+'"'+
        ' data-price="'+esc(money(priceNumber(visa)))+'" data-uae-choice>'+
        '<div class="uae-travel-card-header">'+
          '<div class="uae-travel-card-title-group">'+
            '<h3>'+esc(visaName||countryName+' visa')+'</h3>'+
            '<span class="uae-travel-card-cat">'+esc(visa.category||countryName+' tourist visa')+'</span>'+
          '</div>'+
          '<div class="uae-travel-card-price-group">'+
            '<strong>'+esc(money(priceNumber(visa)))+'</strong>'+
            '<small>per applicant</small>'+
          '</div>'+
        '</div>'+
        '<div class="uae-travel-card-specs-panel">'+
          '<div class="uae-travel-spec-item">'+
            '<small>STAY</small>'+
            '<b>'+esc(stayText(visa)||'See details')+'</b>'+
          '</div>'+
          '<div class="uae-travel-spec-item">'+
            '<small>ENTRY</small>'+
            '<b>'+esc((visa.sub === 'Single Entry' ? 'Single / Multiple' : visa.sub)||visa.category||'See details')+'</b>'+
          '</div>'+
          '<div class="uae-travel-spec-item">'+
            '<small>PROCESSING TIME</small>'+
            '<b>'+esc(processingText(visa)||'1-2 days')+'</b>'+
          '</div>'+
        '</div>'+
        '<div class="uae-travel-card-details-expand">'+
          '<ul class="uae-travel-card-benefits">'+
            '<li><span class="uae-benefit-check">✓</span><span>Simple online application</span></li>'+
            '<li><span class="uae-benefit-check">✓</span><span>Secure document upload</span></li>'+
            '<li><span class="uae-benefit-check">✓</span><span>Live status tracking</span></li>'+
          '</ul>'+
          '<div class="uae-travel-card-action-bar">'+
            '<span class="uae-travel-choose-btn">'+
              '<span class="uae-choose-check-circle">✓</span>Choose this visa'+
            '</span>'+
          '</div>'+
        '</div>'+
      '</label>';
    }).join('');

    var summaryText = (countryName === 'United Arab Emirates' || countryName === 'UAE')
      ? 'Fast UAE tourist visas, applied for and tracked online. Choose from 30-day or 60-day tourist visa types with single or multiple entry to visit all seven emirates.'
      : (countrySummary || 'Apply online for your ' + countryName + ' visa with Visa Doo. Tourist and business visas, document upload and live tracking.');

    return '<form class="uae-visa-picker uae-travel-picker-form" action="/app.html" method="get" data-uae-visa-selector>'+
      '<div class="uae-travel-column-left">'+
        '<div class="uae-travel-section">'+
          '<div class="uae-travel-section-header" id="visa-info">'+
            '<h2>Visa Types</h2>'+
            (summaryText ? '<p>'+esc(summaryText)+'</p>' : '')+
          '</div>' +
          '<div class="uae-travel-options-list">'+choices+'</div>'+
        '</div>'+
        uaeRequirementsSection()+
        uaeProcessSection()+
      '</div>'+
      '<aside class="uae-picker-summary uae-travel-column-right" aria-live="polite" aria-atomic="true">'+
        '<div class="uae-travel-info-card">'+
          '<div class="uae-travel-info-body">'+
            '<h3 data-uae-name>'+esc(firstCleanName||countryName+' visa')+'</h3>'+
            '<p data-uae-category class="uae-travel-info-sub">'+esc(first.category||countryName+' visa')+'</p>'+
            '<div class="uae-stepper-card-section">'+
              '<div class="uae-stepper-row">'+
                '<div class="uae-stepper-label">'+
                  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">'+
                    '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'+
                  '</svg>'+
                  '<span>Travellers</span>'+
                '</div>'+
                '<div class="uae-stepper-controls">'+
                  '<button type="button" class="uae-stepper-btn uae-stepper-minus" data-uae-step="-1" aria-label="Decrease travellers" disabled>'+
                    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">'+
                      '<circle cx="12" cy="12" r="9"/>'+
                      '<line x1="8" y1="12" x2="16" y2="12"/>'+
                    '</svg>'+
                  '</button>'+
                  '<span class="uae-stepper-count" data-uae-count-val>1</span>'+
                  '<button type="button" class="uae-stepper-btn uae-stepper-plus" data-uae-step="1" aria-label="Increase travellers">'+
                    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">'+
                      '<circle cx="12" cy="12" r="9"/>'+
                      '<line x1="12" y1="8" x2="12" y2="16"/>'+
                      '<line x1="8" y1="12" x2="16" y2="12"/>'+
                    '</svg>'+
                  '</button>'+
                  '<select class="uae-v2-radio-hidden" data-uae-persons-select aria-label="Number of persons">'+
                    '<option value="1">1</option>'+
                    '<option value="2">2</option>'+
                    '<option value="3">3</option>'+
                    '<option value="4">4</option>'+
                    '<option value="5">5</option>'+
                    '<option value="6">6</option>'+
                    '<option value="7">7</option>'+
                    '<option value="8">8</option>'+
                    '<option value="9">9</option>'+
                    '<option value="10">10</option>'+
                  '</select>'+
                '</div>'+
              '</div>'+
              '<div class="uae-price-hero-section">'+
                '<strong class="uae-hero-price" data-uae-price>'+esc(money(priceNumber(first)))+'</strong>'+
                '<span class="uae-hero-subtitle">TO BE PAID NOW</span>'+
                '<small class="uae-fee-breakdown" data-uae-price-breakdown hidden></small>'+
              '</div>'+
              '<button class="btn btn-primary btn-block uae-picker-submit uae-travel-apply-btn" type="submit">'+
                'Apply Now <span aria-hidden="true">&#8594;</span>'+
              '</button>'+
              '<div class="uae-pay-now-row">'+
                '<span class="uae-pay-now-title">'+
                  '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">'+
                    '<path d="M4 10h16v2H4zm0 4h16v2H4zm8-12L2 6v2h20V6L12 2zM4 18h16v2H4z"/>'+
                  '</svg>'+
                  'Pay Now'+
                '</span>'+
                '<strong class="uae-pay-now-amount" data-uae-price>'+esc(money(priceNumber(first)))+'</strong>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</aside>'+
      '<div class="uae-mobile-sticky-bar" id="uaeStickyBottomBar">'+
        '<div class="uae-sticky-bar-content">'+
          '<div class="uae-sticky-bar-text">Guaranteed by <strong data-uae-delivery-date></strong></div>'+
          '<button type="button" class="btn btn-primary uae-sticky-bar-btn">Start Application</button>'+
        '</div>'+
      '</div>'+
    '</form>';
  }

  function wireUaeVisaSelector(){
    var widget=root.querySelector('[data-uae-visa-selector]');
    if(!widget) return;
    var choices=widget.querySelectorAll('[data-uae-choice]');
    if(!choices.length) return;
    var personsSelect=widget.querySelector('[data-uae-persons-select]');
    var minusBtn=widget.querySelector('.uae-stepper-minus');
    var plusBtn=widget.querySelector('.uae-stepper-plus');
    var countVal=widget.querySelector('[data-uae-count-val]');

    function update(){
      var choice=widget.querySelector('[data-uae-choice]:checked') || choices[0];
      if(!choice) return;
      ['name','category','stay','entry'].forEach(function(key){
        widget.querySelectorAll('[data-uae-'+key+']').forEach(function(node){
          node.textContent=choice.getAttribute('data-'+key)||'';
        });
      });

      var rawPrice=Number(choice.getAttribute('data-raw-price'))||0;
      var numPersons=personsSelect?Math.max(1,parseInt(personsSelect.value,10)||1):1;
      var totalFee=rawPrice*numPersons;

      if(countVal) countVal.textContent=String(numPersons);
      if(minusBtn) minusBtn.disabled=(numPersons<=1);
      if(plusBtn) plusBtn.disabled=(numPersons>=10);

      widget.querySelectorAll('[data-uae-price]').forEach(function(node){
        node.textContent=money(totalFee);
      });

      widget.querySelectorAll('[data-uae-price-breakdown]').forEach(function(node){
        if(numPersons>1 && rawPrice>0){
          node.textContent='('+money(rawPrice)+' × '+numPersons+' persons)';
          node.hidden=false;
        }else{
          node.hidden=true;
          node.textContent='';
        }
      });

      var processingTimeText = choice.getAttribute('data-processing') || '1-2 days';
      var daysToAdd = 2;
      var match = processingTimeText.match(/(\d+)\s*-\s*(\d+)/) || processingTimeText.match(/(\d+)/);
      if (match) {
        daysToAdd = parseInt(match[match.length - 1], 10) || 2;
      }
      window.selectedVisaDays = daysToAdd;
      var d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      var lang = document.documentElement.lang || 'en';
      var dateStr = d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'short' });
      widget.querySelectorAll('[data-uae-delivery-date]').forEach(function(node){
        node.textContent = dateStr;
      });

      choices.forEach(function(item){
        var label=item.closest('.uae-visa-option, .uae-v2-visa-card, .uae-travel-option-card');
        if(label) label.classList.toggle('selected',item===choice);
      });
    }

    if(minusBtn){
      minusBtn.addEventListener('click',function(e){
        e.preventDefault();
        var current=personsSelect?parseInt(personsSelect.value,10)||1:1;
        if(current>1){
          if(personsSelect) personsSelect.value=String(current-1);
          update();
        }
      });
    }

    if(plusBtn){
      plusBtn.addEventListener('click',function(e){
        e.preventDefault();
        var current=personsSelect?parseInt(personsSelect.value,10)||1:1;
        if(current<10){
          if(personsSelect) personsSelect.value=String(current+1);
          update();
        }
      });
    }

    choices.forEach(function(input){
      input.addEventListener('change',update);
    });

    if(personsSelect){
      personsSelect.addEventListener('change',update);
    }

    var stickyBar = widget.querySelector('#uaeStickyBottomBar');
    var stickyBtn = widget.querySelector('.uae-sticky-bar-btn');
    var visaSection = widget.querySelector('.uae-travel-section');

    if(stickyBtn) {
      stickyBtn.addEventListener('click', function(e) {
        e.preventDefault();
        var submitBtn = widget.querySelector('.uae-travel-apply-btn');
        if(submitBtn) submitBtn.click();
      });
    }

    if(stickyBar && visaSection) {
      var ticking = false;
      window.addEventListener('scroll', function() {
        if (!ticking) {
          window.requestAnimationFrame(function() {
            var rect = visaSection.getBoundingClientRect();
            // Show sticky bar once user scrolls past the bottom of the visa types section
            if (rect.bottom < 50) {
              stickyBar.classList.add('is-visible');
            } else {
              stickyBar.classList.remove('is-visible');
            }
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    update();
  }

  function wireCountryInfoNav(){
    var nav=root.querySelector('.country-info-nav');
    if(!nav) return;
    function getItems(){
      return Array.prototype.map.call(nav.querySelectorAll('a[href^="#"]'),function(link){
        return {link:link,section:root.querySelector(link.getAttribute('href'))};
      }).filter(function(item){return !!item.section;});
    }
    function setActive(activeLink){
      var items=getItems();
      items.forEach(function(item){
        var selected=item.link===activeLink;
        item.link.classList.toggle('active',selected);
        if(selected) item.link.setAttribute('aria-current','location');
        else item.link.removeAttribute('aria-current');
      });
    }
    function update(){
      var items=getItems();
      if(!items.length) return;
      var marker=nav.getBoundingClientRect().bottom+24;
      var active=items[0];
      items.forEach(function(item){if(item.section.getBoundingClientRect().top<=marker) active=item;});
      if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4) active=items[items.length-1];
      setActive(active.link);
    }
    var queued=false;
    function schedule(){
      if(queued) return;
      queued=true;
      window.requestAnimationFrame(function(){queued=false;update();});
    }
    nav.addEventListener('click',function(event){
      var link=event.target.closest('a[href^="#"]');
      if(link&&nav.contains(link)) setActive(link);
    });
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    new MutationObserver(schedule).observe(nav,{childList:true,subtree:true});
    update();
  }

  function uaeBenefitsSection() {
    return '<div class="uae-travel-section" id="visa-benefits">'+
      '<div class="uae-travel-section-header">'+
        '<h2>Why you should apply UAE eVisa with us</h2>'+
      '</div>'+
      '<div class="uae-benefits-list">'+
        '<div class="uae-benefit-item">'+
          '<span class="uae-benefit-check">✓</span>'+
          '<div>'+
            '<strong>10,000+ visas issued</strong>'+
            '<p>trusted by travellers worldwide</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-benefit-item">'+
          '<span class="uae-benefit-check">✓</span>'+
          '<div>'+
            '<strong>Checked by a specialist</strong>'+
            '<p>a real visa expert reviews every file</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-benefit-item">'+
          '<span class="uae-benefit-check">✓</span>'+
          '<div>'+
            '<strong>Secure payment</strong>'+
            '<p>pay by Visa, Mastercard or Amex</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-benefit-item">'+
          '<span class="uae-benefit-check">✓</span>'+
          '<div>'+
            '<strong>Licensed US company</strong>'+
            '<p>operated by TravelRox, Inc.</p>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function uaeRequirementsSection(){
    return '<div class="uae-travel-section" id="requirements">'+
      '<div class="uae-travel-section-header">'+
        '<h2>Visa requirements</h2>'+
      '</div>' +
      '<div class="uae-travel-accordions-group">'+
        '<details class="uae-travel-accordion" open>'+
          '<summary class="uae-travel-accordion-summary"><span>Passport photo</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
          '<div class="uae-travel-accordion-body">'+
            '<div class="uae-req-details-content">'+
              '<div class="uae-req-details-text">'+
                '<p>A clear color copy of your passport\'s front and back pages. All four corners must be visible, and the text must be readable.</p>'+
                '<div class="uae-req-box-stat">'+
                  '<strong>07 MIN</strong>'+
                  '<span data-translate-key="avgTime">AVG. TIME TAKEN TO APPLY</span>'+
                '</div>'+
              '</div>'+
              '<div class="uae-req-details-image">'+
                '<img src="/assets/uae-documents/passport-front-back-bw.jpg" alt="Passport front and back example" loading="lazy">'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</details>'+
        '<details class="uae-travel-accordion">'+
          '<summary class="uae-travel-accordion-summary"><span>Personal photo</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
          '<div class="uae-travel-accordion-body">'+
            '<div class="uae-req-details-content">'+
              '<div class="uae-req-details-text">'+
                '<p>A recent color photograph taken against a plain light/white background. The face must be clearly visible and front-facing.</p>'+
                '<div class="uae-req-box-stat">'+
                  '<strong>03 MIN</strong>'+
                  '<span data-translate-key="fastestTime">FASTEST TIME TAKEN TO APPLY</span>'+
                '</div>'+
              '</div>'+
              '<div class="uae-req-details-image">'+
                '<img src="/assets/uae-documents/personal-photo-bw.jpg" alt="Personal photo example" loading="lazy">'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</details>'+
      '</div>'+
    '</div>';
  }

  function uaeProcessSection(){
    return '<div class="uae-travel-section" id="visa-process">'+
      '<div class="uae-travel-section-header">'+
        '<h2>What happens after you apply</h2>'+
      '</div>' +
      '<div class="uae-timeline-process">'+
        '<div class="uae-timeline-item uae-travel-step-item">'+
          '<div class="uae-timeline-badge">✓</div>'+
          '<div class="uae-timeline-content">'+
            '<strong>Apply online</strong>'+
            '<p>Fill in the short form and upload your passport, photo, ticket and accommodation. Pay securely in USD.</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-timeline-item uae-travel-step-item">'+
          '<div class="uae-timeline-badge">✓</div>'+
          '<div class="uae-timeline-content">'+
            '<strong>We verify and submit</strong>'+
            '<p>A specialist checks your file and the UAE security clearance - WhatsApp ping if anything needs fixing.</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-timeline-item uae-travel-step-item">'+
          '<div class="uae-timeline-badge">✓</div>'+
          '<div class="uae-timeline-content">'+
            '<strong>Get your VisaDoo</strong>'+
            '<p>Apply today and get your PDF VisaDoo by <strong data-uae-delivery-date></strong>.</p>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function uaeHeroBanner(country, image, visas) {
    var bgImg = image || 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=2400&q=95';
    var visasArray = visas || [];
    var priced = visasArray.map(function(v){
      var p = v.prices && v.prices.INR != null && v.prices.INR !== '';
      return p ? Number(v.prices.INR) : Number(v.price_aed);
    }).filter(function(x){ return !isNaN(x) && x > 0; });
    var fromPrice = priced.length ? Math.min.apply(Math, priced) : null;
    var fastest = visasArray.reduce(function(acc, v){
      var days = parseFloat(v.processing_time_value || v.processing_time);
      if (!isNaN(days) && (acc == null || days < acc)) return days;
      return acc;
    }, null);
    var currency = visasArray.some(function(v){ return v.prices && v.prices.INR != null; }) ? 'INR' : 'AED';

    var priceTextStr = fromPrice ? (currency === 'INR' ? ('₹' + fromPrice.toLocaleString('en-IN')) : ('AED ' + fromPrice)) : '₹3,200';
    var daysTextStr = fastest ? (fastest + ' business days') : '5 business days';

    var showAttractions = country.slug !== 'japan';
    var attractionsBtn = showAttractions ? 
      ('<button class="uae-attractions-toggle" aria-expanded="false" type="button">' +
        '<span>' + esc(country.name) + ' Tourist Attractions</span>' +
        '<svg class="uae-toggle-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M6 9l6 6 6-6"/></svg>' +
      '</button>') : '';

    return '<section class="uae-travel-banner" style="background-image: url(&quot;' + esc(bgImg) + '&quot;);">' +
      '<div class="uae-banner-bottom-bar">' +
        '<div class="uae-banner-bottom-bg"></div>' +
        '<div class="container uae-banner-bottom-content">' +
          '<a href="index.html#destinations" class="uae-travel-back"><span aria-hidden="true">&#8592;</span> All destinations</a>' +
          '<h1>Apply ' + esc(country.name) + ' eVisa</h1>' +
          '<p>Approved in ' + esc(daysTextStr) + '. From ' + esc(priceTextStr) + ' all-inclusive. No embassy visit, no paperwork.</p>' +
          attractionsBtn +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function uaeCountryInfoStrip(visas, fromPrice, fastest) {
    return '<section class="uae-travel-info-strip">' +
      '<div class="container uae-travel-container">' +
        '<div class="uae-travel-strip-inner">' +
          '<div class="uae-travel-strip-title">' +
            '<h3>UAE</h3>' +
            '<span>Dubai &bull; Abu Dhabi &bull; UAE</span>' +
          '</div>' +
          '<div class="uae-travel-strip-meta">' +
            '<div class="uae-strip-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> <span>Stay: <b>30 / 60 Days</b></span></div>' +
            '<div class="uae-strip-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> <span>Entry: <b>Single / Multiple</b></span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function uaeFaqSection(countryName){
    var faqs = guideFaqs(countryName || 'UAE');
    var accordionHtml = faqs.map(function(item, index){
      return '<details>' +
        '<summary>' + esc(item[0]) + '<span aria-hidden="true">+</span></summary>' +
        '<p>' + esc(item[1]) + '</p>' +
      '</details>';
    }).join('');

    return '<section class="uae-account-faq" id="faq">' +
      '<header>' +
        '<h2>Frequently asked questions</h2>' +
      '</header>' +
      '<div>' + accordionHtml + '</div>' +
    '</section>';
  }

  function uaeReviewsSection(reviews){
    var list = reviews || window.UAE_REVIEWS || FALLBACK_REVIEWS;
    if(!list || !list.length) return '';
    
    // Duplicate reviews to have at least 5 cards for a seamless ticker animation loop
    var tickerList = [].concat(list);
    while (tickerList.length > 0 && tickerList.length < 5) {
      tickerList = tickerList.concat(list);
    }

    var cardsHtml = tickerList.map(function(r){
      var stars = '';
      for(var i=1; i<=5; i++){
        stars += '<span style="color:' + (i <= r.rating ? '#f5a623' : '#d0dbd9') + '">★</span>';
      }
      
      var hash = 0;
      for (var i = 0; i < r.name.length; i++) {
        hash = r.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      var avatarId = Math.abs(hash) % 70;
      var avatarUrl = 'https://i.pravatar.cc/100?img=' + avatarId;
      
      var times = ['1 week ago', '2 weeks ago', '3 weeks ago', '1 month ago', '2 months ago', '3 months ago'];
      var timeStr = times[Math.abs(hash) % times.length];

      return '<div class="uae-review-item-card">' +
        '<div class="uae-review-item-stars">' + stars + '</div>' +
        '<p class="uae-review-item-body">"' + esc(r.body) + '"</p>' +
        '<div class="uae-review-author-wrap" style="display:flex;align-items:center;gap:12px;margin-top:12px;">' +
          '<img src="' + avatarUrl + '" alt="' + esc(r.name) + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">' +
          '<div style="display:flex;flex-direction:column;gap:2px;text-align:left;">' +
            '<div style="display:flex;align-items:center;gap:4px;line-height:1.2;">' +
              '<b style="font-size:13px;color:#0f172a;font-weight:700;">' + esc(r.name) + '</b>' +
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="#22c55e" style="flex-shrink:0;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' +
            '</div>' +
            '<span style="font-size:11px;color:#64748b;font-weight:500;">' + timeStr + (r.location ? ' · ' + esc(r.location) : '') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<section class="uae-account-faq uae-reviews-layout-section" id="reviews-section">' +
      '<header>' +
        '<h2>What our travellers say</h2>' +
      '</header>' +
      '<div class="uae-reviews-list-container">' + cardsHtml + '</div>' +
    '</section>';
  }

  function exploreOtherVisasSection(otherCountries) {
    var list = (otherCountries && otherCountries.length >= 2) ? otherCountries : [
      { name: 'Thailand', slug: 'thailand', iso2: 'TH' },
      { name: 'Maldives', slug: 'maldives', iso2: 'MV' },
      { name: 'Indonesia', slug: 'indonesia', iso2: 'ID' },
      { name: 'Singapore', slug: 'singapore', iso2: 'SG' },
      { name: 'United Kingdom', slug: 'united-kingdom', iso2: 'GB' },
      { name: 'United States', slug: 'united-states', iso2: 'US' },
      { name: 'Egypt', slug: 'egypt', iso2: 'EG' }
    ];

    var currentSlug = getSlug() || 'uae';
    list = list.filter(function(c){ return c.slug !== currentSlug; }).slice(0, 6);

    var tags = {
      'thailand': 'Instant',
      'maldives': 'Instant',
      'singapore': 'Instant',
      'indonesia': 'Within 24 Hours',
      'united-kingdom': '10-15 Days',
      'united-states': '15-20 Days',
      'uae': '1-2 Days',
      'turkey': '1-2 Days',
      'egypt': '1-2 Days',
      'egypt-2': '1-2 Days',
      'france': '10-15 Days',
      'germany': '10-15 Days',
      'italy': '10-15 Days',
      'spain': '10-15 Days'
    };

    var itemsHtml = list.map(function(c){
      var tag = tags[c.slug] || '1-2 Days';
      var flagUrl = c.iso2 ? 'https://flagcdn.com/w40/' + esc(c.iso2.toLowerCase()) + '.png' : '';
      var flagImg = flagUrl ? '<img src="' + flagUrl + '" alt="' + esc(c.name) + ' flag">' : '';
      var localPreview = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
      var href = localPreview ? 'country.html?slug=' + encodeURIComponent(c.slug) : '/country/' + encodeURIComponent(c.slug);
      
      return '<a href="' + href + '" class="uae-explore-card">' +
        '<div class="uae-explore-card-left">' +
          '<div class="uae-explore-flag-circle">' + flagImg + '</div>' +
          '<span>' + esc(c.name) + '</span>' +
        '</div>' +
        '<div class="uae-explore-card-right">' +
          '<span class="uae-explore-badge ' + esc(tag.toLowerCase().replace(/[^a-z0-9]/g, '-')) + '">' + esc(tag) + '</span>' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</div>' +
      '</a>';
    }).join('');

    return '<section class="uae-account-faq uae-explore-section" id="explore-destinations">' +
      '<header>' +
        '<h2>Explore instant visas & arrival cards</h2>' +
      '</header>' +
      '<div class="uae-explore-grid">' + itemsHtml + '</div>' +
    '</section>';
  }

  function initReviewsTicker(){
    var container = document.querySelector('.uae-reviews-list-container');
    if(!container) return;
    
    if(window.reviewsTickerInterval) {
      clearInterval(window.reviewsTickerInterval);
    }
    
    var cards = container.querySelectorAll('.uae-review-item-card');
    if(cards.length < 4) return;

    function updateCardVisibility(){
      var currentCards = container.querySelectorAll('.uae-review-item-card');
      currentCards.forEach(function(card, index){
        if(index < 3) {
          card.style.display = 'block';
          card.style.opacity = '1';
        } else if(index === 3) {
          card.style.display = 'block';
          card.style.opacity = '0';
        } else {
          card.style.display = 'none';
        }
      });
    }

    // Set initial container height based on first 3 cards' heights
    updateCardVisibility();
    var h0 = cards[0].offsetHeight || 120;
    var h1 = cards[1].offsetHeight || 120;
    var h2 = cards[2].offsetHeight || 120;
    container.style.height = (h0 + h1 + h2 + 24) + 'px';

    window.reviewsTickerInterval = setInterval(function(){
      var currentCards = container.querySelectorAll('.uae-review-item-card');
      var firstCard = currentCards[0];
      if(!firstCard) return;

      var height = firstCard.offsetHeight;
      var gap = 12;

      // Calculate new height based on Cards 1, 2, 3 (which will shift into positions 0, 1, 2)
      var h1_new = currentCards[1] ? currentCards[1].offsetHeight : 120;
      var h2_new = currentCards[2] ? currentCards[2].offsetHeight : 120;
      var h3_new = currentCards[3] ? currentCards[3].offsetHeight : 120;
      var nextHeight = h1_new + h2_new + h3_new + 24;

      // Transition container height smoothly alongside card scroll
      container.style.height = nextHeight + 'px';

      firstCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      firstCard.style.marginTop = '-' + (height + gap) + 'px';
      firstCard.style.opacity = '0';
      firstCard.style.transform = 'translateY(-20px)';

      if(currentCards[3]) {
        currentCards[3].style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        currentCards[3].style.opacity = '1';
      }

      setTimeout(function(){
        firstCard.removeAttribute('style');
        container.appendChild(firstCard);
        updateCardVisibility();
      }, 600);
    }, 4000);
  }
  
  function wireUaeFaqAccordion(){
    // Wire FAQs independently
    var faqGroups = document.querySelectorAll('#faq, #uae-faq, #country-faq');
    faqGroups.forEach(function(group){
      var faqDetails = group.querySelectorAll('details');
      faqDetails.forEach(function(details){
        var summary = details.querySelector('summary');
        if (!summary || details.getAttribute('data-accordion-wired') === 'true') return;
        details.setAttribute('data-accordion-wired', 'true');
        summary.addEventListener('click', function(e){
          e.preventDefault();
          var isOpen = details.hasAttribute('open');
          faqDetails.forEach(function(other){
            if(other !== details && other.hasAttribute('open')){
              collapseDetails(other);
            }
          });
          if(isOpen) collapseDetails(details);
          else expandDetails(details);
        });
      });
    });

    // Wire Requirements independently
    var reqGroups = document.querySelectorAll('#requirements');
    reqGroups.forEach(function(group){
      var reqDetails = group.querySelectorAll('details');
      reqDetails.forEach(function(details){
        var summary = details.querySelector('summary');
        if (!summary || details.getAttribute('data-accordion-wired') === 'true') return;
        details.setAttribute('data-accordion-wired', 'true');
        summary.addEventListener('click', function(e){
          e.preventDefault();
          var isOpen = details.hasAttribute('open');
          reqDetails.forEach(function(other){
            if(other !== details && other.hasAttribute('open')){
              collapseDetails(other);
            }
          });
          if(isOpen) collapseDetails(details);
          else expandDetails(details);
        });
      });
    });

    function collapseDetails(details){
      var summary = details.querySelector('summary');
      if(!summary) return;
      
      var startHeight = details.offsetHeight;
      var summaryHeight = summary.offsetHeight;

      details.style.height = startHeight + 'px';
      details.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Force reflow
      details.offsetHeight;
      details.style.height = summaryHeight + 'px';

      setTimeout(function(){
        if (details.style.height === summaryHeight + 'px') {
          details.removeAttribute('open');
          details.removeAttribute('style');
        }
      }, 300);
    }

    function expandDetails(details){
      var summary = details.querySelector('summary');
      var content = details.querySelector('.uae-req-details-content, p, div');
      if(!summary || !content) return;

      var summaryHeight = summary.offsetHeight;
      
      // Open to measure content
      details.setAttribute('open', '');
      var contentHeight = content.offsetHeight;
      var totalHeight = summaryHeight + contentHeight;

      details.style.height = summaryHeight + 'px';
      details.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Force reflow
      details.offsetHeight;
      details.style.height = totalHeight + 'px';

      setTimeout(function(){
        if (details.style.height === totalHeight + 'px') {
          details.removeAttribute('style');
        }
      }, 300);
    }
  }

  window.wireUaeFaqAccordion = wireUaeFaqAccordion;
  window.initReviewsTicker = initReviewsTicker;

  var COUNTRY_GUIDES={
    US:{
      kicker:'Explore USA',
      title:'USA Tourist Attractions',
      places:['Statue of Liberty','Times Square','Grand Canyon','Golden Gate Bridge','White House','Yosemite National Park','Las Vegas Strip','Walt Disney World']
    },
    GB:{
      kicker:'Explore the UK',
      title:'UK Tourist Attractions',
      places:['Big Ben','Tower Bridge','Buckingham Palace','Stonehenge','Edinburgh Castle','Lake District','Windsor Castle','British Museum']
    }
  };

  function guideFaqs(countryName){
    var name = countryName || 'UAE';
    return [
      ['Which ' + name + ' visa should I choose?', 'Choose based on the duration of your stay and entry requirements (single or multiple entry). Compare the visa options above or chat with our team.'],
      ['What documents are required for a ' + name + ' visa?', 'You will need a clear copy of your passport bio page (front and back) and a recent color passport-size photograph with a white background.'],
      ['How long does ' + name + ' visa processing take?', 'The standard processing time is 2 to 3 business days. We recommend applying at least a week before your travel date.'],
      ['Can I apply completely online?', 'Yes, the entire process is 100% online. You can select your visa, upload documents, make the payment, and track the status on your mobile or computer.'],
      ['How will I receive my approved visa?', 'Once approved, your ' + name + ' eVisa will be issued as a PDF document. We will send it to you via email and WhatsApp.'],
      ['Can I get help with my application?', 'Yes, our support team is available 24/7. You can use our AI assistant or click the WhatsApp button to chat with our visa experts.'],
      ['Is my visa fee refundable if rejected?', 'Visa fees are charged by the government for processing and are non-refundable once the application is submitted to the immigration authorities.'],
      ['Do children need a separate visa for ' + name + '?', 'Yes, all travellers including infants and children must have a valid visa to enter the country.'],
      ['Can I extend my ' + name + ' visa while in the country?', 'Yes, tourist visas can be extended inside the country. Please contact our support team at least 5 days before your visa expires to start the extension process.'],
      ['What is the validity of the ' + name + ' eVisa?', 'Once issued, the ' + name + ' eVisa is valid for entry within 60 days from the date of approval.'],
      ['Do I need to print my eVisa?', 'Yes, it is recommended to print a physical color copy of your approved eVisa and carry it with you along with your passport during travel.'],
      ['What happens if there is a spelling mistake on my visa?', 'If you notice any mistakes, contact us immediately. If the visa is already issued, a new application may be required as details cannot be modified after approval.']
    ];
  }

  function countryTravelGuide(country,iso){
    var guide=COUNTRY_GUIDES[iso];
    var faqs=guideFaqs(country.name);
    var attractionsCards=guide ? guide.places.map(function(place,index){
      return '<li><div class="uae-attraction-photo"><img data-country-guide-image="'+esc(place)+'" alt="'+esc(place)+', '+esc(country.name)+'" loading="lazy" decoding="async"></div><div class="uae-attraction-copy"><b>'+String(index+1).padStart(2,'0')+'</b><span>'+esc(place)+'</span></div></li>';
    }).join('') : '';
    var attractionsSection = guide ? '<section class="uae-attractions" id="country-attractions"><header><h2>'+esc(guide.title)+'</h2></header><ol>'+attractionsCards+'</ol></section>' : '';
    return '<section class="uae-public-guide-section"><div class="container"><section class="uae-account-information uae-public-travel-guide'+(guide?'':' uae-information-faq-only')+'">'+
      attractionsSection+
      '<section class="uae-account-faq" id="country-faq"><header><h2>Frequently asked questions</h2></header><div>'+faqs.map(function(item,index){return '<details'+(index===0?' open':'')+'><summary>'+esc(item[0])+'<span aria-hidden="true">+</span></summary><p>'+esc(item[1])+'</p></details>';}).join('')+'</div></section>'+
    '</section></div></section>';
  }

  function loadCountryGuideImages(scope){
    var images=Array.prototype.slice.call(scope.querySelectorAll('[data-country-guide-image]'));
    if(!images.length) return;
    var titles=images.map(function(image){return image.getAttribute('data-country-guide-image');});
    var endpoint='https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=1400&redirects=1&format=json&origin=*&titles='+encodeURIComponent(titles.join('|'));
    fetch(endpoint).then(function(response){
      if(!response.ok) throw new Error('Image request failed');
      return response.json();
    }).then(function(data){
      var pages=data&&data.query&&data.query.pages?Object.keys(data.query.pages).map(function(key){return data.query.pages[key];}):[];
      var byTitle={};
      pages.forEach(function(page){if(page.thumbnail&&page.thumbnail.source) byTitle[String(page.title||'').toLowerCase()]=page.thumbnail.source;});
      images.forEach(function(image){
        var source=byTitle[String(image.getAttribute('data-country-guide-image')||'').toLowerCase()];
        if(source) image.src=source;
        else image.closest('.uae-attraction-photo').classList.add('image-unavailable');
      });
    }).catch(function(){
      images.forEach(function(image){image.closest('.uae-attraction-photo').classList.add('image-unavailable');});
    });
  }

  function renderCountry(country,visas,reviews,otherCountries){
    window.currentCountryName = country.name;
    window.currentCountrySlug = country.slug;
    reviews = reviews || window.UAE_REVIEWS || FALLBACK_REVIEWS;
    var image=photos[country.slug+'-banner']||country.image_url||photos[country.slug]||country.social_image||'';
    var iso=String(country.iso2||'').toUpperCase();
    var isUae=iso==='AE'||country.slug==='uae'||country.slug==='united-arab-emirates';
    var isUaeStyle=isUae||country.slug==='japan';
    var isEnhanced=isUaeStyle||iso==='US'||iso==='GB'||iso==='UK'||country.slug==='united-states'||country.slug==='united-kingdom';
    var guideCode=iso==='UK'?'GB':iso;
    if(country.slug==='united-states') guideCode='US';
    if(country.slug==='united-kingdom') guideCode='GB';
    var visaSectionTitle=isEnhanced?'Visa types':'Visa options';
    var prices=visas.map(priceNumber).filter(function(value){return value!=null;});
    var fromPrice=prices.length?Math.min.apply(null,prices):null;
    var times=visas.map(function(visa){
      if(!processingText(visa)) return null;
      return {
        hours:visa.processing_time_unit==='hours'?Number(visa.processing_time_value):Number(visa.processing_time_value)*24,
        text:processingText(visa)
      };
    }).filter(Boolean).sort(function(a,b){return a.hours-b.hours;});
    var fastest=times.length?times[0].text:'';

    var summary=shortText(country.summary,'Apply online with clear prices and simple tracking.',120);

    document.title=(country.seo_title||country.name+' Visas — Apply Online | Visa Doo');
    var meta=document.querySelector('meta[name="description"]');
    if(meta) meta.content=country.seo_description||summary;

    // Apply uae-country-page class when viewing UAE or Japan style pages
    document.body.classList.toggle('uae-country-page',isUaeStyle);
    document.body.setAttribute('data-country-code',iso);

    if(isUaeStyle) {
      // UAE/Japan Travel & Visa Information Layout
      var visaContent = uaeVisaSelector(visas, country.name, country.summary);
      var showAttractions = country.slug !== 'japan';
      root.innerHTML =
        uaeHeroBanner(country, image, visas) +
        '<div class="uae-travel-body-section">' +
          '<div class="container uae-travel-container">' +
            (showAttractions ? uaeAttractionsDropdownHtml() : '') +
            visaContent +
          '</div>' +
        '</div>' +
        '<section class="uae-public-guide-section">' +
          '<div class="container">' +
            '<section class="uae-account-information uae-public-travel-guide uae-information-faq-only">' +
              uaeReviewsSection(reviews) +
              uaeFaqSection(country.name) +
              exploreOtherVisasSection(otherCountries) +
            '</section>' +
          '</div>' +
        '</section>';
      wireUaeVisaSelector();
      if (showAttractions) {
        wireUaeAttractionsToggle();
        wireUaeCarouselArrows();
      }
      initReviewsTicker();
    } else {
      // Standard / non-UAE rendering (remains unchanged)
      var facts=[
        '<div><strong>'+visas.length+'</strong><span>Options</span></div>',
        fromPrice!=null?'<div><strong>'+esc(money(fromPrice))+'</strong><span>From</span></div>':'',
        fastest?'<div><strong>'+esc(fastest)+'</strong><span>Fastest</span></div>':''
      ].filter(Boolean).join('');
      var cards=visas.length?visas.map(visaCard).join(''):
        '<div class="country-empty"><h3>Options coming soon</h3><a href="index.html#contact" class="btn btn-primary">Contact us</a></div>';
      var visaContentStandard=isEnhanced&&visas.length?uaeVisaSelector(visas,country.name,country.summary):'<div class="cards">'+cards+'</div>';
      var documentsContentStandard=
        '<div class="container country-documents-grid">'+
          '<div><span class="eyebrow">Documents</span><h2>Keep these ready</h2></div>'+
          '<div class="country-doc-list">'+
            '<div>'+CHECK+'<span><b>Passport</b></span></div>'+
            '<div>'+CHECK+'<span><b>Photo</b></span></div>'+
            '<div>'+CHECK+'<span><b>Travel details</b></span></div>'+
            '<div>'+CHECK+'<span><b>Extra documents, if needed</b></span></div>'+
          '</div>'+
        '</div>';
      var heroStyle=image?' style="--country-hero-image:url(&quot;'+esc(image)+'&quot;)"':'';
      var heroMarkup=isEnhanced?
        '<section class="country-detail-hero uae-hero-giant"'+heroStyle+'><div class="container country-detail-grid">'+
          '<div class="country-detail-copy uae-giant-copy">'+
            '<h1 class="uae-giant-title">'+esc(country.name)+'</h1>'+
            '<a href="index.html#destinations" class="country-back uae-giant-back"><span aria-hidden="true">•</span> All destinations</a>'+
          '</div>'+
        '</div></section>':
        '<section class="country-detail-hero"'+heroStyle+'><div class="container country-detail-grid">'+
          '<div class="country-detail-copy">'+
            '<a href="index.html#destinations" class="country-back"><span aria-hidden="true">&#8592;</span> All destinations</a>'+
            '<div class="country-guide-row">'+
              (country.iso2?'<img src="https://flagcdn.com/w80/'+esc(country.iso2.toLowerCase())+'.png" alt="'+esc(country.name)+' flag">':'')+
              '<span class="eyebrow">Visa guide</span>'+
            '</div>'+
            '<h1>'+esc(country.name)+' Visas</h1>'+
            '<p>'+esc(summary)+'</p>'+
            '<div class="country-facts">'+facts+'</div>'+
            '<a href="#visa-info" class="btn btn-primary btn-lg">Choose a visa <span aria-hidden="true">→</span></a>'+
          '</div>'+
        '</div></section>';

      root.innerHTML=
        heroMarkup+
        '<nav class="country-info-nav" aria-label="Country visa information"><div class="container">'+
          '<a href="#visa-info">Visa Info</a>'+
          '<a href="requirements.html?slug='+encodeURIComponent(country.slug)+'">Visa Requirements</a>'+
        '</div></nav>'+
        '<section class="section sky country-options" id="visa-info"><div class="container">'+
          '<div class="country-section-heading"><span class="eyebrow">Choose a visa</span><h2>'+visaSectionTitle+'</h2></div>'+
          visaContentStandard+
        '</div></section>'+
        '<section class="section country-documents" id="documents">'+documentsContentStandard+'</section>'+
        '<section class="section country-process" id="visa-process">'+
          '<div class="container">'+
            '<div class="country-section-heading"><span class="eyebrow">How it works</span><h2>Simple application process</h2></div>'+
            '<div class="country-process-grid">'+
              '<div class="country-process-step"><span>01</span><h3>Select visa</h3><p>Choose your duration and entry type</p></div>'+
              '<div class="country-process-step"><span>02</span><h3>Enter details</h3><p>Fill in applicant details</p></div>'+
              '<div class="country-process-step"><span>03</span><h3>Submit</h3><p>Upload documents & receive updates</p></div>'+
            '</div>'+
          '</div>'+
        '</section>'+
        '<section class="section uae-explore-other-countries" style="border-top:1px solid #edf2f7;padding:48px 0;scroll-margin-top:70px"><div class="container">' +
          exploreOtherVisasSection(otherCountries) +
        '</div></section>' +
        countryTravelGuide(country,guideCode);
      if(isEnhanced&&visas.length) wireUaeVisaSelector();
      loadCountryGuideImages(root);
    }

    wireCountryInfoNav();
    if(window.VisaDooCountryExperience) window.VisaDooCountryExperience.initAssistant(country.name);
    wireUaeFaqAccordion();
    document.dispatchEvent(new Event('visadoo:country-rendered'));
  }

  function renderError(title,message){
    document.body.classList.remove('uae-country-page');
    document.body.removeAttribute('data-country-code');
    root.innerHTML='<section class="country-page-error"><div><div class="country-error-icon">!</div><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a href="index.html#destinations" class="btn btn-primary btn-lg">Browse destinations</a></div></section>';
  }

  var FALLBACK_COUNTRIES = {
    uae: {
      name: 'United Arab Emirates',
      slug: 'uae',
      iso2: 'AE',
      seo_title: 'UAE Visas — Apply Online | Visa Doo',
      seo_description: 'Apply for 30-day and 60-day UAE tourist visas online with quick processing and transparent pricing.',
      summary: 'Explore Dubai, Abu Dhabi, and all seven Emirates with simple online visa processing.'
    }
  };

  var FALLBACK_VISAS = {
    uae: [
      {
        slug: '60-days-uae-visa',
        name: '60 Days UAE Visa',
        category: 'Tourist',
        stay_period_value: 60,
        stay_period_unit: 'days',
        sub: 'Single / Multiple',
        price_aed: 14497,
        processing_time_value: 2,
        processing_time_unit: 'days'
      },
      {
        slug: '30-days-uae-visa',
        name: '30 Days UAE Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Single / Multiple',
        price_aed: 7500,
        processing_time_value: 2,
        processing_time_unit: 'days'
      },
      {
        slug: '120-days-tourist-visa',
        name: '120 Days Tourist Visa',
        category: 'Tourist',
        stay_period_value: 120,
        stay_period_unit: 'days',
        sub: 'Single / Multiple',
        price_aed: 14999,
        processing_time_value: 3,
        processing_time_unit: 'days'
      }
    ],
    japan: [
      {
        slug: 'japan-tourist-visa',
        name: 'Japan Tourist Visa (eVisa)',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 3200,
        processing_time_value: 5,
        processing_time_unit: 'days'
      },
      {
        slug: 'japan-double-entry',
        name: 'Double Entry Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Double Entry',
        price_aed: 4500,
        processing_time_value: 5,
        processing_time_unit: 'days'
      },
      {
        slug: 'japan-multiple-entry',
        name: 'Multiple Entry Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Multiple Entry',
        price_aed: 6500,
        processing_time_value: 5,
        processing_time_unit: 'days'
      }
    ]
  };

  var FALLBACK_REVIEWS = [
    { name: 'Rahul Sharma', location: 'Delhi', rating: 5, body: 'Extremely fast service! Got my UAE visa in less than 2 days. The tracking system is very detailed.' },
    { name: 'Sarah Jenkins', location: 'London', rating: 5, body: 'The team was incredibly helpful on WhatsApp when I had to change a document. Highly recommend!' },
    { name: 'Mohamed Al-Ansari', location: 'Dubai', rating: 5, body: 'Seamless experience. Applied online and received the electronic visa directly in my email. Very professional.' }
  ];

  var slug = getSlug() || 'uae';

  if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){
    var fallbackC = FALLBACK_COUNTRIES[slug] || FALLBACK_COUNTRIES.uae;
    var fallbackV = FALLBACK_VISAS[slug] || FALLBACK_VISAS.uae;
    window.UAE_REVIEWS = FALLBACK_REVIEWS;
    renderCountry(fallbackC, fallbackV, FALLBACK_REVIEWS);
    return;
  }

  Promise.all([
    fetchJson('/rest/v1/countries?slug=eq.'+encodeURIComponent(slug)+'&active=eq.true&select=*'),
    fetchJson('/rest/v1/visa_types?country_slug=eq.'+encodeURIComponent(slug)+'&active=eq.true&order=sort_order&select=*'),
    fetchJson('/rest/v1/reviews?active=eq.true&order=sort_order&select=*').catch(function(){ return []; }),
    fetchJson('/rest/v1/countries?active=eq.true&slug=neq.'+encodeURIComponent(slug)+'&limit=8').catch(function(){ return []; })
  ]).then(function(data){
    var c = (data[0] && data[0].length) ? data[0][0] : (FALLBACK_COUNTRIES[slug] || FALLBACK_COUNTRIES.uae);
    var v = (data[1] && data[1].length) ? data[1] : (FALLBACK_VISAS[slug] || FALLBACK_VISAS.uae);
    var r = (data[2] && data[2].length) ? data[2] : FALLBACK_REVIEWS;
    var others = (data[3] && data[3].length) ? data[3] : [];
    window.UAE_REVIEWS = r;
    if(!c){
      renderError('Destination not found','This destination is not available right now.');
      return;
    }
    renderCountry(c, v, r, others);
  }).catch(function(){
    var fallbackC = FALLBACK_COUNTRIES[slug] || FALLBACK_COUNTRIES.uae;
    var fallbackV = FALLBACK_VISAS[slug] || FALLBACK_VISAS.uae;
    window.UAE_REVIEWS = FALLBACK_REVIEWS;
    if(fallbackC){
      renderCountry(fallbackC, fallbackV, FALLBACK_REVIEWS, []);
    } else {
      renderError('Could not load this destination','Please check your connection and try again.');
    }
  });
})();
