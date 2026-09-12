(function () {
  'use strict';

  var cfg=window.VISADOO_CONFIG||{};
  var photos=window.VISADOO_DESTINATION_PHOTOS||{};
  var root=document.getElementById('eventPage');
  var year=document.getElementById('year');
  if(year) year.textContent=new Date().getFullYear();
  function flag(iso2){ return iso2?'https://flagcdn.com/w160/'+String(iso2).toLowerCase()+'.png':''; }

  function isFlagImage(url){
    if(!url) return false;
    return /flagcdn\.com|flagsapi\.com|\/flags?\/|flag|\.svg$/i.test(url) || /\/assets\/flags\//i.test(url);
  }

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
      '<div class="price">'+esc(money(priceNumber(visa)))+' <small>/ visa</small></div>'+
      (visa.blurb?'<p class="blurb">'+esc(visa.blurb)+'</p>':'')+
      '<ul>'+features.map(function(feature){return '<li>'+CHECK+esc(feature)+'</li>';}).join('')+'</ul>'+
      '<a href="/app.html?visa='+encodeURIComponent(visa.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+
    '</article>';
  }
  function renderError(title,message){
    root.innerHTML='<section class="country-page-error"><div><div class="country-error-icon">!</div><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a href="/events/events.html" class="btn btn-primary btn-lg">Browse events</a></div></section>';
  }
  function render(event,country,visas){
    var countryName=country.name||'this destination';
    var baseSlug = (event.country_slug || '').toLowerCase().replace(/-\d+$/, '');
    var image = event.image_url || photos[event.country_slug+'-banner'] || photos[baseSlug+'-banner'] || photos[event.country_slug] || photos[baseSlug] || '';
    if (!image || isFlagImage(image)) {
      if (country.image_url && !isFlagImage(country.image_url)) {
        image = country.image_url;
      } else {
        image = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=2400&q=95';
      }
    }
    var when=dateRange(event.event_date,event.end_date);
    var heroDateStats=dateStats(event.event_date,event.end_date);
    var lead=leadDays(event,visas);
    var about=event.blurb||('Plan your trip to '+event.name+' with the right '+countryName+' visa, clear timelines and everything ready before you travel.');
    var cards=visas.length?visas.map(visaCard).join(''):
      '<div class="country-empty"><h3>Visa options are coming soon</h3><p>Contact us and we will help you plan for this event.</p><a href="/#contact" class="btn btn-primary">Contact us</a></div>';
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
            '<a href="/events/events.html#events-list" class="event-back"><span aria-hidden="true">&#8592;</span> All events</a>'+
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
        '<a href="#visa-process">What happens after you apply</a>'+
      '</div></nav>'+
      '<section class="event-simple-section event-visa-info" id="visa-info"><div class="container">'+
        '<div class="event-section-heading"><span>Visa Info</span><h2>Plan your '+esc(countryName)+' visa</h2><p>'+esc(about)+'</p></div>'+
        '<div class="event-visa-facts">'+
          '<div><small>Visa options</small><strong>'+visas.length+'</strong></div>'+
          '<div><small>Starts from</small><strong>'+esc(fromPrice==null?'Ask us':money(fromPrice))+'</strong></div>'+
          '<div><small>Processing Time</small><strong>'+esc(fastest)+'</strong></div>'+
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
  var preloaded=window.__VISADOO_EVENT_DATA__;
  if(preloaded&&preloaded.event){
    render(preloaded.event,preloaded.country||{name:preloaded.event.country_slug},preloaded.visas||[]);
    return;
  }
  if(!eventSlug){ renderError('Event not selected','Choose an event from the events page to see its details.'); return; }
  var SEED_MAP = {
    'itb-asia-2026': { slug: 'itb-asia-2026', name: 'ITB Asia 2026', country_slug: 'singapore', category: 'Travel Expo', event_date: '2026-09-20', end_date: '2026-09-22', city: 'Singapore', image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80', blurb: "Asia's leading travel trade show connecting the global travel industry." },
    'formula-1-azerbaijan-grand-prix-2026': { slug: 'formula-1-azerbaijan-grand-prix-2026', name: 'F1 Azerbaijan Grand Prix 2026', country_slug: 'azerbaijan', category: 'Sports', event_date: '2026-09-24', end_date: '2026-09-27', city: 'Baku, Azerbaijan', image_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80', blurb: "Experience high-speed action and explore Azerbaijan's rich culture." },
    'dubai-airshow-2026': { slug: 'dubai-airshow-2026', name: 'Dubai Airshow 2026', country_slug: 'united-arab-emirates', category: 'Business', event_date: '2026-09-26', end_date: '2026-09-28', city: 'Dubai, UAE', image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80', blurb: "The world's largest aerospace event showcasing the future of aviation." },
    'ultra-worldwide-music-festival-2026': { slug: 'ultra-worldwide-music-festival-2026', name: 'Ultra Worldwide Music Festival 2026', country_slug: 'indonesia', category: 'Music', event_date: '2026-09-28', end_date: '2026-09-30', city: 'Bali, Indonesia', image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80', blurb: 'Electrifying electronic music festival featuring world-class international headliners and stage production.' },
    'seoul-mid-autumn-lantern-festival-2026': { slug: 'seoul-mid-autumn-lantern-festival-2026', name: 'Seoul Lantern Festival 2026', country_slug: 'south-korea', category: 'Art & Culture', event_date: '2026-09-15', end_date: '2026-09-18', city: 'Seoul, South Korea', image_url: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=80', blurb: 'Hundreds of handcrafted luminous Hanji paper lanterns illuminating ancient palaces and waterways.' },
    'gitex-global-2026': { slug: 'gitex-global-2026', name: 'GITEX Global 2026', country_slug: 'united-arab-emirates', category: 'Business', event_date: '2026-09-10', end_date: '2026-09-12', city: 'Dubai, UAE', image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', blurb: 'Global tech founders and innovators gathering to discover cutting-edge artificial intelligence and computing.' },
    'oktoberfest-munich-2026': { slug: 'oktoberfest-munich-2026', name: 'Oktoberfest Munich 2026', country_slug: 'germany', category: 'Art & Culture', event_date: '2026-09-19', end_date: '2026-10-04', city: 'Munich, Germany', image_url: 'https://images.unsplash.com/photo-1571863533956-01c88e79957e?auto=format&fit=crop&w=1200&q=80', blurb: "The world's biggest Bavarian folk and cultural festival celebrating traditional music, cuisine and camaraderie." },
    'tokyo-game-show-2026': { slug: 'tokyo-game-show-2026', name: 'Tokyo Game Show 2026', country_slug: 'japan', category: 'Business', event_date: '2026-09-24', end_date: '2026-09-27', city: 'Tokyo, Japan', image_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80', blurb: "Asia's premier video game exhibition showcasing the next generation of games, hardware and esports." },
    'paris-fashion-week-ss27': { slug: 'paris-fashion-week-ss27', name: 'Paris Fashion Week SS27', country_slug: 'france', category: 'Art & Culture', event_date: '2026-09-28', end_date: '2026-10-06', city: 'Paris, France', image_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', blurb: 'The pinnacle of international haute couture runways across legendary Parisian landmarks and grand halls.' },
    'singapore-grand-prix-2026': { slug: 'singapore-grand-prix-2026', name: 'Singapore Grand Prix 2026', country_slug: 'singapore', category: 'Sports', event_date: '2026-09-18', end_date: '2026-09-20', city: 'Singapore', image_url: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80', blurb: 'The spectacular night race around Marina Bay Circuit paired with star-studded concerts and entertainment.' },
    'monaco-yacht-show-2026': { slug: 'monaco-yacht-show-2026', name: 'Monaco Yacht Show 2026', country_slug: 'france', category: 'Business', event_date: '2026-09-23', end_date: '2026-09-26', city: 'Port Hercule, Monaco', image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80', blurb: 'The ultimate superyacht luxury showcase attracting yacht builders, owners and nautical enthusiasts globally.' },
    'venice-film-festival-2026': { slug: 'venice-film-festival-2026', name: 'Venice International Film Festival 2026', country_slug: 'italy', category: 'Art & Culture', event_date: '2026-09-02', end_date: '2026-09-12', city: 'Venice, Italy', image_url: 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&w=1200&q=80', blurb: "The world's oldest film festival celebrating cinematic brilliance on the glamorous island of Lido di Venezia." }
  };

  fetchJson('/rest/v1/events?slug=eq.'+encodeURIComponent(eventSlug)+'&active=eq.true&select=*').then(function(events){
    var event = events && events.length ? events[0] : SEED_MAP[eventSlug];
    if(!event){ renderError('Event not found','This event is not available right now.'); return null; }
    return Promise.all([
      Promise.resolve(event),
      fetchJson('/rest/v1/countries?slug=eq.'+encodeURIComponent(event.country_slug)+'&select=*').catch(function(){ return [{ name: event.country_slug }]; }),
      fetchJson('/rest/v1/visa_types?country_slug=eq.'+encodeURIComponent(event.country_slug)+'&active=eq.true&order=sort_order&select=*').catch(function(){ return []; })
    ]);
  }).then(function(data){
    if(!data) return;
    render(data[0],data[1][0]||{name:data[0].country_slug},data[2]||[]);
  }).catch(function(){
    var fallback = SEED_MAP[eventSlug];
    if(fallback){
      render(fallback, { name: fallback.country_slug }, []);
    } else {
      renderError('Could not load this event','Please check your connection and try again.');
    }
  });
})();
