// ===== Visa Doo homepage — global destinations =====
(function () {
  // Always enter the homepage at its true top, while preserving section links.
  function resetInitialScroll(){
    if(window.location.hash && window.location.hash!=='#top') return;
    function jumpToTop(){
      var root=document.documentElement;
      var previous=root.style.scrollBehavior;
      root.style.scrollBehavior='auto';
      window.scrollTo(0,0);
      root.style.scrollBehavior=previous;
    }
    jumpToTop();
    window.addEventListener('load',jumpToTop,{once:true});
  }
  resetInitialScroll();

  var cfg = window.VISADOO_CONFIG;
  function flag(iso2){ return iso2 ? ('https://flagcdn.com/w160/'+iso2.toLowerCase()+'.png') : ''; }

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

  // ---- contact links ----
  var waLink = 'https://wa.me/' + cfg.WHATSAPP + '?text=' + encodeURIComponent('Hi Visa Doo, I have a question about a visa.');
  function setHref(id, href){ var el=document.getElementById(id); if(el) el.setAttribute('href',href); }
  function setText(id, txt){ var el=document.getElementById(id); if(el) el.textContent=txt; }
  setHref('waFloat', waLink); setHref('cmWhatsapp', waLink); setHref('footWa', waLink); setText('waText', cfg.PHONE_DISPLAY);
  setHref('cmPhone', 'tel:'+cfg.PHONE_TEL); setText('phoneText', cfg.PHONE_DISPLAY);
  setHref('cmEmail', 'mailto:'+cfg.EMAIL); setText('emailText', cfg.EMAIL);
  setHref('footEmail', 'mailto:'+cfg.EMAIL); setText('footEmail', cfg.EMAIL);

  // ---- mobile menu / year / contact form ----
  var menuBtn=document.getElementById('menuBtn'), navLinks=document.getElementById('navLinks');
  if(menuBtn&&navLinks){ menuBtn.addEventListener('click',function(){navLinks.classList.toggle('open');});
    navLinks.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){navLinks.classList.remove('open');});}); }
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  var form=document.getElementById('contactForm');
  if(form){
    var okEl=document.getElementById('formOk'); var okText=okEl?okEl.textContent:'';
    function val(n){ var el=form.querySelector('[name="'+n+'"]'); return el?el.value:''; }
    var CONSENT_TEXT='Keep me updated with visa offers, tips and news by email and WhatsApp.';
    function showMsg(text,isErr){ if(!okEl) return; okEl.textContent=text; okEl.style.display='block'; okEl.style.color=isErr?'#b91c1c':''; okEl.style.background=isErr?'#fef2f2':''; okEl.style.borderColor=isErr?'#fecaca':''; }
    form.addEventListener('submit',function(e){ e.preventDefault();
      var btn=form.querySelector('button[type=submit]'); var ot=btn?btn.textContent:'';
      if(btn){ btn.disabled=true; btn.textContent='Sending…'; }
      fetch(cfg.SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/send-contact',{
        method:'POST', headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY,'Authorization':'Bearer '+cfg.SUPABASE_ANON_KEY},
        body:JSON.stringify({ name:val('name'), email:val('email'), message:val('message'), 'bot-field':val('bot-field'), consent:!!(form.querySelector('#cConsent')||{}).checked, consent_text:CONSENT_TEXT })
      }).then(function(r){ return r.json().catch(function(){return {};}); }).then(function(d){
        if(btn){ btn.disabled=false; btn.textContent=ot; }
        if(d && d.ok){ showMsg(okText,false); form.reset(); }
        else { showMsg('Sorry — that didn’t send. Please email hello@visadoo.com or message us on WhatsApp.',true); }
      }).catch(function(){ if(btn){ btn.disabled=false; btn.textContent=ot; } showMsg('Sorry — that didn’t send. Please email hello@visadoo.com or message us on WhatsApp.',true); });
    });
  }

  // ---- destinations ----
  // Fastest processing time across a country's visas (compares hours vs days fairly); null if none set.
  function fastestEta(cv){
    var best=null;
    cv.forEach(function(v){
      var n=v.processing_time_value, u=v.processing_time_unit;
      if(n==null||n===''||!u) return;
      var hours = u==='hours' ? Number(n) : Number(n)*24;
      if(best===null || hours<best.hours) best={hours:hours, value:n, unit:u};
    });
    return best;
  }
  function etaLabel(eta){
    if(!eta) return '';
    var unit = eta.unit==='hours' ? ('hr'+(Number(eta.value)===1?'':'s')) : ('day'+(Number(eta.value)===1?'':'s'));
    return eta.value+' '+unit;
  }

  function destinationPhoto(c){
    var photos=window.VISADOO_DESTINATION_PHOTOS||{};
    // Prefer the curated destination scene. Some older country records use a
    // flag image as image_url, which should never become the card background.
    var src=photos[c.slug]||c.hero_image_url||c.image_url||'';
    return /^https?:\/\//i.test(src) ? src : '';
  }

  function countryCard(c,index){
    var n=c.visaCount||0;
    var photo=destinationPhoto(c);
    var eta=c.eta ? etaLabel(c.eta) : 'Flexible';
    var etaHours=c.eta ? c.eta.hours : '';
    var iso=(c.iso2||'').toUpperCase();
    var photoStyle=photo ? ' style="background-image:url(&quot;'+photo+'&quot;)"' : '';
    var price=c.minPrice!=null ? money(c.minPrice) : 'Ask us';
    return '<a class="dest-card-simple destination-tile tile-shape-'+((index%4)+1)+'" href="'+countryHref(c.slug)+'"'+
      ' data-group="'+(c.group_slug||'')+'" data-types="'+(c.visaTypes||'')+'" data-hours="'+etaHours+'" data-price="'+(c.minPrice==null?'':c.minPrice)+'">'+
      '<span class="tile-photo"'+photoStyle+'></span><span class="tile-shade"></span>'+
      '<span class="tile-topline"><span class="dc-flag-badge"><img src="'+flag(c.iso2)+'" alt="" loading="lazy"><b>'+iso+'</b></span>'+
      '<span class="tile-eta">'+eta+'</span></span>'+
      '<span class="tile-copy"><small>VisaDoo destination</small><h3>'+(c.name||'')+'</h3><span class="tile-divider"></span>'+
      '<span class="tile-details"><span><small>Visa options</small><b>'+n+'</b></span><span><small>Starts from</small><b>'+price+'</b></span></span></span>'+
      '<span class="tile-arrow" aria-hidden="true">↗</span></a>';
  }

  function render(countries, groups){
    var featured = countries.filter(function(c){return c.featured;});
    var chips = (featured.length?featured:countries).slice(0,6).map(function(c){
      return '<a href="'+countryHref(c.slug)+'" class="destination-chip"><img src="'+flag(c.iso2)+'" alt="">'+ (c.name||'') +'</a>';
    }).join('');
    var chipBox=document.getElementById('popularChips'); if(chipBox) chipBox.innerHTML=chips;

    var countEl=document.getElementById('countryCount');
    if(countEl) countEl.textContent=countries.length;

    var grid=document.getElementById('destGrid');
    if(grid) grid.innerHTML=countries.map(countryCard).join('');

    var ga=document.getElementById('groupsArea');
    if(ga) ga.innerHTML='';

    var availableGroups=groups.filter(function(g){
      return countries.some(function(c){return c.group_slug===g.slug;});
    });
    var featuredGroups=availableGroups.filter(function(g){
      var key=((g.slug||'')+' '+(g.name||'')).toLowerCase().replace(/[^a-z]/g,'');
      return key.indexOf('schengen')>-1||key.indexOf('evisa')>-1;
    }).sort(function(a,b){
      var aKey=((a.slug||'')+' '+(a.name||'')).toLowerCase();
      var bKey=((b.slug||'')+' '+(b.name||'')).toLowerCase();
      return (aKey.indexOf('schengen')>-1?0:1)-(bKey.indexOf('schengen')>-1?0:1);
    });
    if(ga){
      ga.innerHTML=featuredGroups.map(function(g){
        var groupCountries=countries.filter(function(c){return c.group_slug===g.slug;});
        var key=((g.slug||'')+' '+(g.name||'')).toLowerCase().replace(/[^a-z]/g,'');
        var fallbackDescription=key.indexOf('schengen')>-1
          ? 'One visa can unlock multiple European destinations. Apply through your main destination.'
          : 'Enjoy a simpler travel process with the convenience and flexibility of an electronic visa.';
        var description=g.description||fallbackDescription;
        return '<section class="visa-country-group" aria-labelledby="group-'+g.slug+'">'+
          '<div class="visa-group-heading"><div><span class="board-kicker">Visa collection</span>'+
          '<h3 id="group-'+g.slug+'">'+(g.name||'Visa group')+'</h3></div>'+
          '<span class="visa-group-count">'+groupCountries.length+' countr'+(groupCountries.length===1?'y':'ies')+'</span></div>'+
          '<p class="visa-group-description">'+description+'</p>'+
          '<div class="dest-grid dest-grid--simple">'+groupCountries.map(countryCard).join('')+'</div></section>';
      }).join('');
    }
    var regionBox=document.getElementById('regionPills');
    if(regionBox){
      regionBox.innerHTML='<button type="button" class="active" data-group="all">All places</button>'+
        availableGroups.map(function(g){
          return '<button type="button" data-group="'+g.slug+'">'+(g.name||'Region')+'</button>';
        }).join('');
    }

    var visaTypeFilter=document.getElementById('visaTypeFilter');
    var visaTabs=[].slice.call(document.querySelectorAll('[data-visa-tab]'));
    var deliveryFilter=document.getElementById('deliveryFilter');
    var budgetFilter=document.getElementById('budgetFilter');
    var empty=document.getElementById('destinationEmpty');
    var activeGroup='all';

    function applyDestinationFilters(){
      if(!grid) return;
      var cards=[].slice.call(grid.querySelectorAll('.destination-tile'));
      var visaType=visaTypeFilter?visaTypeFilter.value:'all';
      var delivery=deliveryFilter?deliveryFilter.value:'all';
      var budget=budgetFilter?budgetFilter.value:'all';
      var matched=0;
      cards.forEach(function(card){
        var groupOk=activeGroup==='all'||card.getAttribute('data-group')===activeGroup;
        var typeText=(card.getAttribute('data-types')||'').toLowerCase();
        var typeOk=visaType==='all'||typeText.indexOf(visaType)>-1;
        var hours=Number(card.getAttribute('data-hours'));
        var etaOk=delivery==='all'||(delivery==='fast'&&hours>0&&hours<=72)||(delivery==='week'&&hours>0&&hours<=168);
        var price=Number(card.getAttribute('data-price'));
        var budgetOk=budget==='all'||(price>0&&price<=Number(budget));
        var isMatch=groupOk&&typeOk&&etaOk&&budgetOk;
        card.hidden=!isMatch;
        if(isMatch) matched++;
      });
      if(empty) empty.hidden=matched!==0;
    }

    if(regionBox){
      regionBox.querySelectorAll('button').forEach(function(button){
        button.addEventListener('click',function(){
          activeGroup=button.getAttribute('data-group')||'all';
          regionBox.querySelectorAll('button').forEach(function(item){item.classList.toggle('active',item===button);});
          applyDestinationFilters();
        });
      });
    }
    function syncVisaTabs(value){
      visaTabs.forEach(function(tab){
        var active=tab.getAttribute('data-visa-tab')===value;
        tab.classList.toggle('active',active);
        tab.setAttribute('aria-selected',active?'true':'false');
      });
    }
    visaTabs.forEach(function(tab){
      tab.addEventListener('click',function(){
        var value=tab.getAttribute('data-visa-tab')||'all';
        if(visaTypeFilter) visaTypeFilter.value=value;
        syncVisaTabs(value);
        applyDestinationFilters();
      });
    });
    if(visaTypeFilter) visaTypeFilter.addEventListener('change',function(){
      syncVisaTabs(visaTypeFilter.value);
      applyDestinationFilters();
    });
    if(deliveryFilter) deliveryFilter.addEventListener('change',applyDestinationFilters);
    if(budgetFilter) budgetFilter.addEventListener('change',applyDestinationFilters);
    applyDestinationFilters();

    // search over ALL countries
    var input=document.getElementById('destSearch'), results=document.getElementById('destResults');
    var searchButton=document.getElementById('destSearchButton');
    function doSearch(){
      var q=(input.value||'').trim().toLowerCase();
      if(!q){ results.classList.remove('show'); results.innerHTML=''; return; }
      var matches=countries.filter(function(c){return (c.name||'').toLowerCase().indexOf(q)>-1;}).slice(0,8);
      if(!matches.length){ results.innerHTML='<div class="none">No destination found. Try another country, or contact us.</div>'; }
      else { results.innerHTML=matches.map(function(c){
        return '<a href="'+countryHref(c.slug)+'"><img class="flag" src="'+flag(c.iso2)+'" alt="">'+(c.name||'')+'<span style="margin-left:auto;color:var(--muted);font-weight:600;font-size:13px">'+(c.visaCount||0)+' visas</span></a>';
      }).join(''); }
      results.classList.add('show');
    }
    if(input){ input.addEventListener('input',doSearch); input.addEventListener('focus',doSearch);
      input.addEventListener('keydown',function(e){
        if(e.key==='Enter'){
          var first=results.querySelector('a');
          if(first){ e.preventDefault(); window.location.href=first.href; }
        }
      });
      document.addEventListener('click',function(e){ if(!results.contains(e.target)&&e.target!==input) results.classList.remove('show'); }); }
    if(searchButton){ searchButton.addEventListener('click',function(){
      doSearch();
      var first=results.querySelector('a');
      if(first) window.location.href=first.href;
      else if(input) input.focus();
    }); }

    // interactive map selector
    var mapToggle=document.getElementById('mapToggle');
    var mapPanel=document.getElementById('countryMapPanel');
    var mapClose=document.getElementById('countryMapClose');
    var mapStatus=document.getElementById('countryMapStatus');
    var mapFallback=document.getElementById('mapCountryFallback');
    var countryMap=null;
    var mapStarted=false;

    function showMapFallback(message){
      if(mapStatus){
        mapStatus.textContent=message||'Select a country below.';
        mapStatus.hidden=false;
      }
      if(!mapFallback) return;
      mapFallback.innerHTML=countries.map(function(c){
        return '<button type="button" data-map-country="'+c.slug+'"><img src="'+flag(c.iso2)+'" alt="" loading="lazy"><span>'+(c.name||'')+'</span></button>';
      }).join('');
      mapFallback.hidden=false;
      mapFallback.querySelectorAll('[data-map-country]').forEach(function(button){
        button.addEventListener('click',function(){
          window.location.href=countryHref(button.getAttribute('data-map-country'));
        });
      });
    }

    function initCountryMap(){
      if(mapStarted){
        if(countryMap) setTimeout(function(){countryMap.invalidateSize();},0);
        return;
      }
      mapStarted=true;
      if(!window.L){
        showMapFallback('Map could not load. Select a country below.');
        return;
      }
      countryMap=window.L.map('countryMap',{
        minZoom:1,
        maxZoom:6,
        zoomControl:true,
        worldCopyJump:true,
        maxBounds:[[-85,-180],[85,180]]
      }).setView([22,15],1);
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:6,
        attribution:'&copy; OpenStreetMap contributors'
      }).addTo(countryMap);

      fetch('https://restcountries.com/v3.1/all?fields=cca2,latlng').then(function(response){
        if(!response.ok) throw new Error('Country coordinates unavailable');
        return response.json();
      }).then(function(rows){
        var coordinateByIso={};
        rows.forEach(function(row){
          if(row.cca2&&row.latlng&&row.latlng.length===2) coordinateByIso[String(row.cca2).toUpperCase()]=row.latlng;
        });
        var markerCount=0;
        countries.forEach(function(c){
          var coordinates=coordinateByIso[String(c.iso2||'').toUpperCase()];
          if(!coordinates) return;
          markerCount++;
          window.L.circleMarker(coordinates,{
            radius:7,
            color:'#fff',
            weight:2,
            fillColor:'#176fc1',
            fillOpacity:.95
          }).addTo(countryMap).bindTooltip(c.name||'Destination',{
            direction:'top',
            offset:[0,-7]
          }).on('click',function(){
            window.location.href=countryHref(c.slug);
          });
        });
        if(!markerCount){
          showMapFallback('Select a country below.');
          return;
        }
        if(mapStatus) mapStatus.hidden=true;
        setTimeout(function(){countryMap.invalidateSize();},0);
      }).catch(function(){
        showMapFallback('Map markers could not load. Select a country below.');
      });
    }

    function setMapOpen(open){
      if(!mapPanel||!mapToggle) return;
      mapPanel.hidden=!open;
      mapToggle.setAttribute('aria-expanded',open?'true':'false');
      mapToggle.classList.toggle('active',open);
      if(open) setTimeout(initCountryMap,0);
    }
    if(mapToggle) mapToggle.addEventListener('click',function(){
      setMapOpen(mapToggle.getAttribute('aria-expanded')!=='true');
    });
    if(mapClose) mapClose.addEventListener('click',function(){
      setMapOpen(false);
      mapToggle.focus();
    });
  }

  if(window.supabase && cfg.SUPABASE_URL){
    try{
      var sb=window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      Promise.all([
        sb.from('countries').select('*').eq('active',true).order('sort_order'),
        sb.from('visa_types').select('slug,country_slug,price_aed,prices,processing_time_value,processing_time_unit').eq('active',true),
        sb.from('visa_groups').select('*').eq('active',true).order('sort_order'),
        sb.from('site_settings').select('hero_image_url,hero_image_alt,active_currency,currencies').eq('id','global').single()
      ]).then(function(res){
        var countries=(res[0].data)||[], visas=(res[1].data)||[], groups=(res[2].data)||[];
        var ss=res[3].data||{};
        var heroImg=ss.hero_image_url||null;
        if(heroImg){ var hero=document.querySelector('.hero'); if(hero){ hero.style.backgroundImage='linear-gradient(rgba(244,249,255,.78),rgba(255,255,255,.9)), url('+heroImg+')'; hero.classList.add('has-banner'); if(ss.hero_image_alt){ hero.setAttribute('role','img'); hero.setAttribute('aria-label', ss.hero_image_alt); } } }
        // compute min price + count per country (in the active currency)
        countries.forEach(function(c){
          var cv=visas.filter(function(v){return v.country_slug===c.slug;});
          c.visaCount=cv.length;
          c.visaTypes=cv.map(function(v){return v.slug||'';}).join(' ');
          var cprices=cv.map(visaActivePrice).filter(function(p){return p!=null;});
          c.minPrice=cprices.length?Math.min.apply(null,cprices):null;
          c.eta=fastestEta(cv);
        });
        render(countries, groups);
      });

      // reviews + FAQs + footer pages
      Promise.all([
        sb.from('reviews').select('*').eq('active',true).order('sort_order'),
        sb.from('faqs').select('*').eq('active',true).order('sort_order'),
        sb.from('pages').select('slug,title,sort_order').eq('status','published').eq('show_in_footer',true).order('sort_order')
      ]).then(function(res){ renderExtras((res[0].data)||[], (res[1].data)||[], (res[2].data)||[]); });
    }catch(e){ /* leave empty */ }
  }

  function renderExtras(reviews, faqs, pages){
    // reviews
    if(reviews.length){
      var rg=document.getElementById('reviewGrid');
      rg.innerHTML=reviews.map(function(r){
        var st=''; for(var i=1;i<=5;i++){ st+='<span style="color:'+(i<=r.rating?'#f5a623':'#d8dee9')+'">★</span>'; }
        return '<div class="review-card"><div class="review-stars">'+st+'</div>'+
          '<p class="review-body">"'+(r.body||'')+'"</p>'+
          '<div class="review-name">'+(r.name||'')+(r.location?'<span> · '+r.location+'</span>':'')+'</div></div>';
      }).join('');
      document.getElementById('reviews').style.display='';
    }
    // faqs (accordion)
    if(faqs.length){
      var fl=document.getElementById('faqList');
      fl.innerHTML=faqs.map(function(f){
        return '<div class="faq-item"><button class="faq-q" type="button">'+(f.question||'')+'<span class="faq-ic">+</span></button>'+
          '<div class="faq-a"><p>'+(f.answer||'')+'</p></div></div>';
      }).join('');
      fl.querySelectorAll('.faq-q').forEach(function(b){ b.addEventListener('click',function(){ b.parentNode.classList.toggle('open'); }); });
      document.getElementById('faq').style.display='';
    }
    // footer page links
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
  }
})();
