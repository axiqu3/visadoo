(function () {
  'use strict';

  var cfg=window.VISADOO_CONFIG||{};
  var photos=window.VISADOO_DESTINATION_PHOTOS||{};
  var root=document.getElementById('eventPage');
  var year=document.getElementById('year');
  if(year) year.textContent=new Date().getFullYear();
  function flag(iso2){ return iso2?'https://flagcdn.com/w160/'+String(iso2).toLowerCase()+'.png':''; }

  function esc(value){
    return (value==null?'':String(value)).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function slug(){
    var query=new URLSearchParams(window.location.search).get('slug');
    if(query) return query;
    var parts=window.location.pathname.split('/').filter(Boolean),i=parts.indexOf('event');
    return i>-1&&parts[i+1]?decodeURIComponent(parts[i+1]):'';
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
  function money(value){ return value==null?'Price on request':'₹'+Number(value).toLocaleString('en-IN'); }
  function processingText(visa){
    var value=visa.processing_time_value,unit=visa.processing_time_unit;
    if(value==null||value===''||!unit) return '';
    return 'About '+value+' '+(unit==='hours'?('hour'+(Number(value)===1?'':'s')):('day'+(Number(value)===1?'':'s')));
  }
  function formatDate(value){
    if(!value) return '';
    var parts=value.split('-');
    return new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2])).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  }
  function dateRange(start,end){
    if(!start) return '';
    return end&&end!==start?formatDate(start)+' – '+formatDate(end):formatDate(start);
  }
  function dateStats(start,end){
    if(!start) return [];
    function parse(value){
      var parts=value.split('-');
      return new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2]));
    }
    function dayMonth(date){
      return date.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
    }
    var from=parse(start);
    if(!end||end===start){
      return [
        {label:'Date',value:dayMonth(from)},
        {label:'Year',value:String(from.getFullYear())}
      ];
    }
    var to=parse(end);
    return [
      {label:'Starts',value:dayMonth(from)},
      {label:'Ends',value:dayMonth(to)},
      {label:'Year',value:from.getFullYear()===to.getFullYear()?String(to.getFullYear()):from.getFullYear()+' / '+to.getFullYear()}
    ];
  }
  function leadDays(event,visas){
    if(event.lead_time_days!=null&&event.lead_time_days!==''&&!isNaN(Number(event.lead_time_days))) return Number(event.lead_time_days);
    var max=0;
    visas.forEach(function(visa){
      if(!processingText(visa)) return;
      var days=visa.processing_time_unit==='hours'?Math.max(1,Math.ceil(Number(visa.processing_time_value)/24)):Number(visa.processing_time_value);
      if(days>max) max=days;
    });
    return max;
  }
  var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function visaCard(visa){
    var features=(visa.features||[]).slice(0,4);
    if(!features.length){
      if(visa.days) features.push('Stay up to '+visa.days+' days');
      if(visa.sub) features.push(visa.sub);
      if(processingText(visa)) features.push(processingText(visa)+' processing');
    }
    return '<article class="vcard">'+
      (processingText(visa)?'<div class="eta-pill">⚡ Get your visa in '+esc(processingText(visa).toLowerCase())+'</div>':'')+
      '<h3>'+esc(visa.name||'Visa option')+'</h3>'+
      (visa.category?'<div class="vsub">'+esc(visa.category)+'</div>':'')+
      '<div class="price">'+esc(money(priceNumber(visa)))+' <small>/ visa</small></div>'+
      (visa.blurb?'<p class="blurb">'+esc(visa.blurb)+'</p>':'')+
      '<ul>'+features.map(function(feature){return '<li>'+CHECK+esc(feature)+'</li>';}).join('')+'</ul>'+
      '<a href="app.html?visa='+encodeURIComponent(visa.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+
    '</article>';
  }
  function renderError(title,message){
    root.innerHTML='<section class="country-page-error"><div><div class="country-error-icon">!</div><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a href="events.html" class="btn btn-primary btn-lg">Browse events</a></div></section>';
  }
  function render(event,country,visas){
    var countryName=country.name||'this destination';
    var image=event.image_url||photos[event.country_slug]||country.image_url||'';
    var when=dateRange(event.event_date,event.end_date);
    var heroDateStats=dateStats(event.event_date,event.end_date);
    var lead=leadDays(event,visas);
    var about=event.blurb||('Plan your trip to '+event.name+' with the right '+countryName+' visa, clear timelines and everything ready before you travel.');
    var cards=visas.length?visas.map(visaCard).join(''):
      '<div class="country-empty"><h3>Visa options are coming soon</h3><p>Contact us and we will help you plan for this event.</p><a href="index.html#contact" class="btn btn-primary">Contact us</a></div>';
    var prices=visas.map(priceNumber).filter(function(value){return value!=null;});
    var fromPrice=prices.length?Math.min.apply(null,prices):null;
    var processing=visas.map(function(visa){
      if(!processingText(visa)) return null;
      return {
        hours:visa.processing_time_unit==='hours'?Number(visa.processing_time_value):Number(visa.processing_time_value)*24,
        text:processingText(visa)
      };
    }).filter(Boolean).sort(function(a,b){return a.hours-b.hours;});
    var fastest=processing.length?processing[0].text:'Confirmed during application';
    document.title=(event.seo_title||event.name+' — '+countryName+' Visa | Visa Doo');
    var metaDescription=document.querySelector('meta[name="description"]');
    if(metaDescription) metaDescription.content=event.seo_description||event.blurb||('Plan your visa for '+event.name+'.');

    root.innerHTML=
      '<section class="event-detail-hero">'+
        '<figure class="event-detail-visual">'+
          (image?'<img src="'+esc(image)+'" alt="'+esc(event.image_alt||event.name)+'" fetchpriority="high">':'<div class="event-detail-placeholder">✦</div>')+
        '</figure>'+
        '<div class="event-hero-wordmark" aria-hidden="true">EVENTS</div>'+
        '<div class="container event-detail-grid">'+
          '<div class="event-detail-copy">'+
            '<a href="events.html#events-list" class="event-back"><span aria-hidden="true">&#8592;</span> All events</a>'+
            '<div class="event-detail-badges">'+
              (country.iso2?'<img src="'+flag(country.iso2)+'" alt="'+esc(countryName)+' flag">':'')+
              '<span class="event-category">Visa guide</span>'+
            '</div>'+
            '<p class="event-kicker">'+esc(countryName)+' visa for</p>'+
            '<h1>'+esc(event.name)+'</h1>'+
            (heroDateStats.length?'<div class="event-hero-date">'+heroDateStats.map(function(item){return '<span><small>'+esc(item.label)+'</small><b>'+esc(item.value)+'</b></span>';}).join('')+'</div>':'')+
            '<a href="#event-visas" class="event-hero-cta">Choose a visa <span aria-hidden="true">→</span></a>'+
          '</div>'+
        '</div>'+
      '</section>'+
      '<nav class="event-info-nav" aria-label="Event visa information"><div class="container">'+
        '<a href="#visa-info">Visa Info</a>'+
        '<a href="#documents">Documents</a>'+
        '<a href="#visa-process">Visa Process</a>'+
      '</div></nav>'+
      '<section class="event-simple-section event-visa-info" id="visa-info"><div class="container">'+
        '<div class="event-section-heading"><span>Visa Info</span><h2>Plan your '+esc(countryName)+' visa</h2><p>'+esc(about)+'</p></div>'+
        '<div class="event-visa-facts">'+
          '<div><small>Visa options</small><strong>'+visas.length+'</strong></div>'+
          '<div><small>Starts from</small><strong>'+esc(fromPrice==null?'Ask us':money(fromPrice))+'</strong></div>'+
          '<div><small>Processing</small><strong>'+esc(fastest)+'</strong></div>'+
          '<div><small>Apply before</small><strong>'+esc(lead?lead+' day'+(lead===1?'':'s'):'Apply early')+'</strong></div>'+
        '</div>'+
        '<div class="cards event-visa-cards" id="event-visas">'+cards+'</div>'+
      '</div></section>'+
      '<section class="event-simple-section event-documents" id="documents"><div class="container event-simple-grid">'+
        '<div class="event-section-heading"><span>Documents</span><h2>4 things to keep ready</h2><p>Upload clear copies. We will tell you if anything else is needed.</p></div>'+
        '<div class="event-document-list">'+
          '<div>'+CHECK+'<span><b>Passport</b></span></div>'+
          '<div>'+CHECK+'<span><b>Photo</b></span></div>'+
          '<div>'+CHECK+'<span><b>Travel plan</b></span></div>'+
          '<div>'+CHECK+'<span><b>Extra proof</b></span></div>'+
        '</div>'+
      '</div></section>'+
      '<section class="event-simple-section event-process" id="visa-process"><div class="container">'+
        '<div class="event-section-heading"><span>Next</span><h2>What to do next</h2><p>Start by choosing a visa. We guide you after that.</p></div>'+
        '<div class="event-process-flow" role="list" aria-label="Visa application steps">'+
          '<div class="event-flow-step" role="listitem" aria-label="Step 1: Choose visa"><i aria-hidden="true">✓</i><b>Choose visa</b><small>Pick an option</small></div>'+
          '<div class="event-flow-step" role="listitem" aria-label="Step 2: Upload files"><i aria-hidden="true">↑</i><b>Upload files</b><small>Add passport &amp; photo</small></div>'+
          '<div class="event-flow-step" role="listitem" aria-label="Step 3: Track status"><i aria-hidden="true">◎</i><b>Track status</b><small>See updates online</small></div>'+
        '</div>'+
      '</div></section>';
  }

  var eventSlug=slug();
  if(!eventSlug){ renderError('Event not selected','Choose an event from the events page to see its details.'); return; }
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){ renderError('Connection unavailable','The event service is not configured yet.'); return; }

  fetchJson('/rest/v1/events?slug=eq.'+encodeURIComponent(eventSlug)+'&active=eq.true&select=*').then(function(events){
    if(!events.length){ renderError('Event not found','This event is not available right now.'); return null; }
    var event=events[0];
    return Promise.all([
      Promise.resolve(event),
      fetchJson('/rest/v1/countries?slug=eq.'+encodeURIComponent(event.country_slug)+'&select=*'),
      fetchJson('/rest/v1/visa_types?country_slug=eq.'+encodeURIComponent(event.country_slug)+'&active=eq.true&order=sort_order&select=*')
    ]);
  }).then(function(data){
    if(!data) return;
    render(data[0],data[1][0]||{name:data[0].country_slug},data[2]||[]);
  }).catch(function(){
    renderError('Could not load this event','Please check your connection and try again.');
  });
})();
