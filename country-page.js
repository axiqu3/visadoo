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

  function renderCountry(country,visas){
    var image=photos[country.slug]||country.image_url||country.social_image||'';
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
    var summary=shortText(country.summary,'Apply online with clear prices and simple tracking.',120);

    document.title=(country.seo_title||country.name+' Visas — Apply Online | Visa Doo');
    var meta=document.querySelector('meta[name="description"]');
    if(meta) meta.content=country.seo_description||summary;

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
      '<section class="section sky country-options" id="visa-info"><div class="container">'+
        '<div class="country-section-heading"><span class="eyebrow">Choose a visa</span><h2>Visa options</h2></div>'+
        '<div class="cards">'+cards+'</div>'+
      '</div></section>'+
      '<section class="section country-documents" id="documents"><div class="container country-documents-grid">'+
        '<div><span class="eyebrow">Documents</span><h2>Keep these ready</h2></div>'+
        '<div class="country-doc-list">'+
          '<div>'+CHECK+'<span><b>Passport</b></span></div>'+
          '<div>'+CHECK+'<span><b>Photo</b></span></div>'+
          '<div>'+CHECK+'<span><b>Travel details</b></span></div>'+
          '<div>'+CHECK+'<span><b>Extra documents, if needed</b></span></div>'+
        '</div>'+
      '</div></section>'+
      '<section class="section country-process" id="visa-process"><div class="container">'+
        '<div class="country-process-heading"><span class="eyebrow">Visa Process</span><h2>What to do next</h2><p>Choose your visa, upload the documents and track every update online.</p></div>'+
        '<div class="country-process-flow" role="list" aria-label="Visa application steps">'+
          '<div class="country-process-step" role="listitem"><i aria-hidden="true">&#10003;</i><b>Choose visa</b><small>Pick the right option</small></div>'+
          '<div class="country-process-step" role="listitem"><i aria-hidden="true">&#8593;</i><b>Upload files</b><small>Add passport and photo</small></div>'+
          '<div class="country-process-step" role="listitem"><i aria-hidden="true">&#9678;</i><b>Track status</b><small>See updates online</small></div>'+
        '</div>'+
      '</div></section>';
  }

  function renderError(title,message){
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
