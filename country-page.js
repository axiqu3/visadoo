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
    var facts=[
      stayText(visa)?'<span><small>Stay</small><b>'+esc(stayText(visa))+'</b></span>':'',
      visa.sub?'<span><small>Entry</small><b>'+esc(visa.sub)+'</b></span>':'',
      processingText(visa)?'<span><small>Processing</small><b>'+esc(processingText(visa))+'</b></span>':''
    ].filter(Boolean).join('');
    return '<article class="vcard">'+
      (processingText(visa)?'<div class="eta-pill">Ready in '+esc(processingText(visa).toLowerCase())+'</div>':'')+
      '<h3>'+esc(visa.name||'Visa option')+'</h3>'+
      (visa.category?'<div class="vsub">'+esc(visa.category)+'</div>':'')+
      '<div class="price">'+esc(money(priceNumber(visa)))+' <small>/ visa</small></div>'+
      (facts?'<div class="country-visa-facts">'+facts+'</div>':'')+
      '<a href="app.html?visa='+encodeURIComponent(visa.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+
    '</article>';
  }

  function uaeVisaSelector(visas){
    if(!visas.length) return '';
    var first=visas[0];
    var choices=visas.map(function(visa,index){
      return '<label class="uae-visa-option'+(index===0?' selected':'')+'">'+
        '<input class="uae-visa-option-input" type="radio" name="visa" value="'+esc(visa.slug)+'"'+(index===0?' checked':'')+' required'+
        ' data-name="'+esc(visa.name||'UAE visa')+'"'+
        ' data-category="'+esc(visa.category||'UAE visa')+'"'+
        ' data-stay="'+esc(stayText(visa)||'See visa details')+'"'+
        ' data-entry="'+esc(visa.sub||visa.category||'See visa details')+'"'+
        ' data-processing="'+esc(processingText(visa)||'To be confirmed')+'"'+
        ' data-price="'+esc(money(priceNumber(visa)))+'" data-uae-choice>'+
        '<span class="uae-option-top"><span><b>'+esc(visa.name||'UAE visa')+'</b><small>'+esc(visa.category||'UAE visa')+'</small></span><strong>'+esc(money(priceNumber(visa)))+'<small>per applicant</small></strong></span>'+
        '<span class="uae-option-facts">'+
          '<span><small>Stay</small><b>'+esc(stayText(visa)||'See details')+'</b></span>'+
          '<span><small>Entry</small><b>'+esc(visa.sub||visa.category||'See details')+'</b></span>'+
          '<span><small>Processing</small><b>'+esc(processingText(visa)||'To be confirmed')+'</b></span>'+
        '</span>'+
        '<span class="uae-option-action"><i aria-hidden="true">&#10003;</i><span>Choose this visa</span></span>'+
      '</label>';
    }).join('');
    return '<form class="uae-visa-picker" action="/app.html" method="get" data-uae-visa-selector>'+
      '<fieldset class="uae-visa-catalogue">'+
        '<legend class="uae-visually-hidden">Choose a UAE visa type</legend>'+
        '<div class="uae-catalogue-heading"><div><span>Available visa types</span><h3>Compare all UAE visas</h3></div><b>'+visas.length+' option'+(visas.length===1?'':'s')+'</b></div>'+
        '<div class="uae-visa-list">'+choices+'</div>'+
      '</fieldset>'+
      '<aside class="uae-picker-summary" aria-live="polite" aria-atomic="true">'+
        '<span class="uae-picker-kicker">Your selection</span>'+
        '<h3 data-uae-name>'+esc(first.name||'UAE visa')+'</h3>'+
        '<p data-uae-category>'+esc(first.category||'UAE visa')+'</p>'+
        '<div class="uae-picker-price"><span>Visa fee</span><strong data-uae-price>'+esc(money(priceNumber(first)))+'</strong><small>per applicant</small></div>'+
        '<div class="uae-picker-facts">'+
          '<div><span>Stay</span><b data-uae-stay>'+esc(stayText(first)||'See visa details')+'</b></div>'+
          '<div><span>Entry</span><b data-uae-entry>'+esc(first.sub||first.category||'See visa details')+'</b></div>'+
          '<div><span>Processing</span><b data-uae-processing>'+esc(processingText(first)||'To be confirmed')+'</b></div>'+
        '</div>'+
        '<div class="uae-picker-assurance"><span aria-hidden="true">&#10003;</span><p><b>Simple and secure</b><small>Review your details before submitting.</small></p></div>'+
        '<button class="btn btn-primary btn-block uae-picker-submit" type="submit">Continue application <span aria-hidden="true">&#8594;</span></button>'+
      '</aside>'+
    '</form>';
  }

  function wireUaeVisaSelector(){
    var widget=root.querySelector('[data-uae-visa-selector]');
    if(!widget) return;
    var choices=widget.querySelectorAll('[data-uae-choice]');
    if(!choices.length) return;
    function update(choice){
      if(!choice) return;
      ['name','category','stay','entry','processing','price'].forEach(function(key){
        widget.querySelectorAll('[data-uae-'+key+']').forEach(function(node){
          node.textContent=choice.getAttribute('data-'+key)||'';
        });
      });
      choices.forEach(function(item){
        var label=item.closest('.uae-visa-option');
        if(label) label.classList.toggle('selected',item===choice);
      });
    }
    choices.forEach(function(choice){
      choice.addEventListener('change',function(){if(choice.checked) update(choice);});
    });
    update(widget.querySelector('[data-uae-choice]:checked'));
  }

  function wireCountryInfoNav(){
    var nav=root.querySelector('.country-info-nav');
    if(!nav) return;
    var items=Array.prototype.map.call(nav.querySelectorAll('a[href^="#"]'),function(link){
      return {link:link,section:root.querySelector(link.getAttribute('href'))};
    }).filter(function(item){return !!item.section;});
    if(!items.length) return;
    function setActive(active){
      items.forEach(function(item){
        var selected=item===active;
        item.link.classList.toggle('active',selected);
        if(selected) item.link.setAttribute('aria-current','location');
        else item.link.removeAttribute('aria-current');
      });
    }
    function update(){
      var marker=nav.getBoundingClientRect().bottom+24;
      var active=items[0];
      items.forEach(function(item){if(item.section.getBoundingClientRect().top<=marker) active=item;});
      if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4) active=items[items.length-1];
      setActive(active);
    }
    var queued=false;
    function schedule(){
      if(queued) return;
      queued=true;
      window.requestAnimationFrame(function(){queued=false;update();});
    }
    items.forEach(function(item){item.link.addEventListener('click',function(){setActive(item);});});
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    update();
  }

  function uaeDocuments(){
    function card(label,title,text,image){
      return '<article class="uae-document-card uae-document-card-simple">'+
        '<div class="uae-document-photo"><img src="'+image+'" alt="" loading="lazy" decoding="async"></div>'+
        '<div class="uae-document-copy"><div><h3>'+title+'</h3><span class="uae-document-status">'+label+'</span></div><p>'+text+'</p></div>'+
      '</article>';
    }
    return '<div class="container uae-documents-simple">'+
      '<div class="uae-documents-overview">'+
        '<div class="uae-documents-heading"><span class="eyebrow">Documents</span><h2>Simple documents to get started</h2><p>Prepare clear copies of the basics. If your selected visa needs anything else, VisaDoo will tell you.</p></div>'+
        '<div class="uae-documents-quick" aria-label="Document preparation summary">'+
          '<div><strong>3</strong><span>essential items</span></div>'+
          '<div><strong>~5 min</strong><span>to prepare</span></div>'+
          '<div><strong>Phone</strong><span>uploads accepted</span></div>'+
        '</div>'+
      '</div>'+
      '<div class="uae-document-grid">'+
        card('Required','Passport bio page','A clear copy of the page with your photo and details.','/assets/uae-documents/passport-bio-page.png')+
        card('Required','Recent photo','A clear, front-facing photo on a plain background.','/assets/uae-documents/recent-photo.png')+
        card('Trip details','Travel information','Your intended travel dates and accommodation details.','/assets/uae-documents/travel-information.png')+
        card('If requested','Supporting document','We will tell you if your selected visa needs this.','/assets/uae-documents/supporting-document.png')+
      '</div>'+
      '<div class="uae-documents-footer">'+
        '<div><span aria-hidden="true">&#8593;</span><p><b>Upload from any device</b><small>Clear phone photos or scans are accepted.</small></p></div>'+
        '<a href="#visa-info" class="btn btn-primary">Choose visa &amp; start <span aria-hidden="true">&#8594;</span></a>'+
      '</div>'+
    '</div>';
  }

  function uaeProcess(){
    return '<div class="container uae-process-simple">'+
      '<div class="uae-process-heading">'+
        '<span class="eyebrow">Visa Process</span>'+
        '<h2>The visa process</h2>'+
        '<p>Choose your visa, upload clear documents and follow every update until your visa is ready.</p>'+
      '</div>'+
      '<div class="uae-process-steps" role="list" aria-label="UAE visa application steps">'+
        '<article class="uae-process-step" role="listitem"><i aria-hidden="true"></i><div><span>1</span><h3>Choose your visa</h3><p>Compare the options and select the one that fits your trip.</p></div></article>'+
        '<article class="uae-process-step" role="listitem"><i aria-hidden="true"></i><div><span>2</span><h3>Upload documents</h3><p>Add clear passport and photo copies from your phone.</p></div></article>'+
        '<article class="uae-process-step" role="listitem"><i aria-hidden="true"></i><div><span>3</span><h3>Track your visa</h3><p>Follow every update online until your visa is ready.</p></div></article>'+
      '</div>'+
    '</div>';
  }

  function renderCountry(country,visas){
    var image=photos[country.slug]||country.image_url||country.social_image||'';
    var isUae=String(country.iso2||'').toUpperCase()==='AE'||country.slug==='uae'||country.slug==='united-arab-emirates';
    var visaSectionTitle=isUae?'Visa types':'Visa options';
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
    var facts=[
      '<div><strong>'+visas.length+'</strong><span>Options</span></div>',
      fromPrice!=null?'<div><strong>'+esc(money(fromPrice))+'</strong><span>From</span></div>':'',
      fastest?'<div><strong>'+esc(fastest)+'</strong><span>Fastest</span></div>':''
    ].filter(Boolean).join('');
    var cards=visas.length?visas.map(visaCard).join(''):
      '<div class="country-empty"><h3>Options coming soon</h3><a href="index.html#contact" class="btn btn-primary">Contact us</a></div>';
    var visaContent=isUae&&visas.length?uaeVisaSelector(visas):'<div class="cards">'+cards+'</div>';
    var documentsContent=isUae?uaeDocuments():
      '<div class="container country-documents-grid">'+
        '<div><span class="eyebrow">Documents</span><h2>Keep these ready</h2></div>'+
        '<div class="country-doc-list">'+
          '<div>'+CHECK+'<span><b>Passport</b></span></div>'+
          '<div>'+CHECK+'<span><b>Photo</b></span></div>'+
          '<div>'+CHECK+'<span><b>Travel details</b></span></div>'+
          '<div>'+CHECK+'<span><b>Extra documents, if needed</b></span></div>'+
        '</div>'+
      '</div>';
    var summary=shortText(country.summary,'Apply online with clear prices and simple tracking.',120);

    document.title=(country.seo_title||country.name+' Visas — Apply Online | Visa Doo');
    var meta=document.querySelector('meta[name="description"]');
    if(meta) meta.content=country.seo_description||summary;
    document.body.classList.toggle('uae-country-page',isUae);

    var heroStyle=image?' style="--country-hero-image:url(&quot;'+esc(image)+'&quot;)"':'';
    root.innerHTML=
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
      '</div></section>'+
      '<nav class="country-info-nav" aria-label="Country visa information"><div class="container">'+
        '<a href="#visa-info">Visa Info</a>'+
        '<a href="#documents">Documents</a>'+
        '<a href="#visa-process">Visa Process</a>'+
      '</div></nav>'+
      '<section class="section sky country-options'+(isUae?' uae-country-options':'')+'" id="visa-info"><div class="container">'+
        '<div class="country-section-heading"><span class="eyebrow">Choose a visa</span><h2>'+visaSectionTitle+'</h2>'+(isUae?'<p>Compare UAE visa types, check the key details and continue with the option that fits your trip.</p>':'')+'</div>'+
        visaContent+
      '</div></section>'+
      '<section class="section country-documents'+(isUae?' uae-documents':'')+'" id="documents">'+documentsContent+'</section>'+
      '<section class="section country-process'+(isUae?' uae-country-process':'')+'" id="visa-process">'+
        (isUae?uaeProcess():'<div class="container"><div class="country-process-heading"><span class="eyebrow">Visa Process</span><h2>What to do next</h2><p>Choose your visa, upload the documents and track every update online.</p></div><div class="country-process-flow" role="list" aria-label="Visa application steps"><div class="country-process-step" role="listitem"><i aria-hidden="true">&#10003;</i><b>Choose visa</b><small>Pick the right option</small></div><div class="country-process-step" role="listitem"><i aria-hidden="true">&#8593;</i><b>Upload files</b><small>Add passport and photo</small></div><div class="country-process-step" role="listitem"><i aria-hidden="true">&#9678;</i><b>Track status</b><small>See updates online</small></div></div></div>')+
      '</section>';
    if(isUae) wireUaeVisaSelector();
    wireCountryInfoNav();
  }

  function renderError(title,message){
    document.body.classList.remove('uae-country-page');
    root.innerHTML='<section class="country-page-error"><div><div class="country-error-icon">!</div><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a href="index.html#destinations" class="btn btn-primary btn-lg">Browse destinations</a></div></section>';
  }

  var slug=getSlug();
  if(!slug){
    renderError('Destination not selected','Choose a country from the homepage to see its visa options.');
    return;
  }
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){
    renderError('Connection unavailable','The destination service is not configured yet.');
    return;
  }

  Promise.all([
    fetchJson('/rest/v1/countries?slug=eq.'+encodeURIComponent(slug)+'&active=eq.true&select=*'),
    fetchJson('/rest/v1/visa_types?country_slug=eq.'+encodeURIComponent(slug)+'&active=eq.true&order=sort_order&select=*')
  ]).then(function(data){
    if(!data[0].length){
      renderError('Destination not found','This destination is not available right now.');
      return;
    }
    renderCountry(data[0][0],data[1]||[]);
  }).catch(function(){
    renderError('Could not load this destination','Please check your connection and try again.');
  });
})();
