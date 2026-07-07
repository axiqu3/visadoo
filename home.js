// ===== Visa Doo homepage — global destinations =====
(function () {
  var cfg = window.VISADOO_CONFIG;
  function flag(iso2){ return iso2 ? ('https://flagcdn.com/w160/'+iso2.toLowerCase()+'.png') : ''; }

  // ---- currency: INR only (₹, Indian grouping) ----
  function money(n){ if(n==null||n===''||isNaN(Number(n))) return ''; return '₹'+Number(n).toLocaleString('en-IN'); }
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
  // Brand-adaptive "Get your visa in as little as X" pill (honest; hidden when no ETA).
  function etaPill(eta){
    if(!eta) return '';
    var unit = eta.unit==='hours' ? ('hour'+(Number(eta.value)===1?'':'s')) : ('day'+(Number(eta.value)===1?'':'s'));
    return '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--sky-50);color:var(--blue-700);border:1px solid var(--blue-100);border-radius:999px;padding:5px 11px;font-size:12.5px;font-weight:700;margin:8px 0 0;line-height:1.2">⚡ Get your visa in as little as '+eta.value+' '+unit+'</div>';
  }

  function countryCard(c){
    var price = (c.minPrice!=null) ? ('<div class="from">from '+money(c.minPrice)+' <span>/ visa</span></div>') : '';
    var n = c.visaCount||0;
    return '<a class="dest-card" href="/country/'+encodeURIComponent(c.slug)+'">'+
      '<img class="dest-flag" src="'+(c.image_url||flag(c.iso2))+'" alt="'+ ((c.image_url && c.image_alt) || c.name || '') +'" loading="lazy">'+
      '<div class="dest-body"><h3>'+(c.name||'')+'</h3>'+
      '<div class="meta">'+n+' visa option'+(n===1?'':'s')+'</div>'+etaPill(c.eta)+price+'</div></a>';
  }

  function render(countries, groups){
    // popular chips (first 6 featured)
    var featured = countries.filter(function(c){return c.featured;});
    var chips = (featured.length?featured:countries).slice(0,6).map(function(c){
      return '<a href="/country/'+encodeURIComponent(c.slug)+'" class="btn btn-ghost" style="padding:8px 16px;font-size:14px"><img src="'+flag(c.iso2)+'" style="width:22px;height:15px;border-radius:2px;object-fit:cover;margin-right:8px" alt="">'+ (c.name||'') +'</a>';
    }).join('');
    var chipBox=document.getElementById('popularChips'); if(chipBox) chipBox.innerHTML=chips;

    // featured grid
    var grid=document.getElementById('destGrid');
    if(grid) grid.innerHTML=(featured.length?featured:countries).map(countryCard).join('');

    // groups
    var ga=document.getElementById('groupsArea');
    if(ga){
      ga.innerHTML = groups.map(function(g){
        var members = countries.filter(function(c){return c.group_slug===g.slug;});
        if(!members.length) return '';
        return '<div class="group-block">'+
          '<div class="group-head"><h3>'+ (g.name||'') +'</h3><span class="gpill">'+members.length+' countries</span></div>'+
          (g.description?'<p class="gdesc">'+g.description+'</p>':'')+
          '<div class="dest-grid">'+members.map(countryCard).join('')+'</div>'+
        '</div>';
      }).join('');
    }

    // search over ALL countries
    var input=document.getElementById('destSearch'), results=document.getElementById('destResults');
    function doSearch(){
      var q=(input.value||'').trim().toLowerCase();
      if(!q){ results.classList.remove('show'); results.innerHTML=''; return; }
      var matches=countries.filter(function(c){return (c.name||'').toLowerCase().indexOf(q)>-1;}).slice(0,8);
      if(!matches.length){ results.innerHTML='<div class="none">No destination found. Try another country, or contact us.</div>'; }
      else { results.innerHTML=matches.map(function(c){
        return '<a href="/country/'+encodeURIComponent(c.slug)+'"><img class="flag" src="'+flag(c.iso2)+'" alt="">'+(c.name||'')+'<span style="margin-left:auto;color:var(--muted);font-weight:600;font-size:13px">'+(c.visaCount||0)+' visas</span></a>';
      }).join(''); }
      results.classList.add('show');
    }
    if(input){ input.addEventListener('input',doSearch); input.addEventListener('focus',doSearch);
      document.addEventListener('click',function(e){ if(!results.contains(e.target)&&e.target!==input) results.classList.remove('show'); }); }
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
      if(fc){ var li=pages.map(function(p){ return '<li><a href="/p/'+encodeURIComponent(p.slug)+'">'+p.title+'</a></li>'; }).join('');
        fc.insertAdjacentHTML('afterbegin', li); }
    }
  }
})();
