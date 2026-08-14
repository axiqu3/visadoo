// Signed-in customers: show their previous UAE applications on the UAE destination page.
(function(){
  'use strict';

  var started=false;
  function startWhenReady(){
    return; // Disabled customer history view on the destination page
  }
  document.addEventListener('visadoo:country-rendered',startWhenReady);
  startWhenReady();

  function boot(){
  if(!window.supabase||!window.VISADOO_CONFIG) return;

  var cfg=window.VISADOO_CONFIG;
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY) return;
  var sb=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);

  function esc(value){
    return (value==null?'':String(value)).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function visaNames(){
    var names={};
    document.querySelectorAll('[data-uae-choice]').forEach(function(choice){
      names[choice.value]=choice.getAttribute('data-name')||choice.value;
    });
    return names;
  }

  function visaChoices(){
    return Array.prototype.map.call(document.querySelectorAll('[data-uae-choice]'),function(choice){
      return {
        slug:choice.value,
        name:choice.getAttribute('data-name')||choice.value||'UAE visa',
        category:choice.getAttribute('data-category')||'Tourist',
        stay:choice.getAttribute('data-stay')||'See details',
        entry:choice.getAttribute('data-entry')||'Single entry',
        processing:choice.getAttribute('data-processing')||'To be confirmed',
        price:choice.getAttribute('data-price')||'Price on request'
      };
    });
  }

  function statusClass(status){
    if(status==='Visa Issued') return 'issued';
    if(status==='Action Needed') return 'action';
    return 'progress';
  }

  function documentOf(app,type){
    var docs=app.documents||[];
    for(var i=0;i<docs.length;i++) if(docs[i].doc_type===type) return docs[i];
    return null;
  }

  function documentTile(app,type,label){
    var doc=documentOf(app,type);
    if(!doc) return '<div class="uae-history-document missing"><div class="uae-history-media"><span>Not available</span></div><div><b>'+esc(label)+'</b><small>Not uploaded</small></div></div>';
    return '<button class="uae-history-document" type="button" data-uae-history-path="'+esc(doc.file_path)+'" data-uae-history-label="'+esc(label)+'"><div class="uae-history-media"><span class="uae-history-spinner"></span></div><div><b>'+esc(label)+'</b><small>View attachment <span aria-hidden="true">&rarr;</span></small></div></button>';
  }

  function applicationCard(app,names){
    var date=new Date(app.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    return '<article class="uae-history-card"><header><div><span>Previous application</span><h3>'+esc(names[app.visa_type]||app.visa_type||'UAE visa')+'</h3><p>Ref '+esc(app.reference_code||'—')+' &middot; '+esc(date)+'</p></div><b class="uae-history-status '+statusClass(app.status)+'">'+esc(app.status||'Submitted')+'</b></header><div class="uae-history-documents">'+
      documentTile(app,'passport','Passport front')+documentTile(app,'photo','Personal photo')+
    '</div></article>';
  }

  function newVisaUrl(){
    var url=new URL(window.location.href);
    url.searchParams.set('new','1');
    url.hash='visa-info';
    return url.pathname+url.search+url.hash;
  }

  function ensureGuideNav(){
    var nav=document.querySelector('.country-info-nav .container');
    if(!nav||nav.querySelector('[data-uae-guide-nav]')) return;
    var items=[];
    if(!document.getElementById('country-faq')) items.push(['FAQs','#uae-faq']);
    items.forEach(function(item){
      var link=document.createElement('a');
      link.setAttribute('data-uae-guide-nav','');
      link.href=item[1];
      link.textContent=item[0];
      link.addEventListener('click',function(){
        nav.querySelectorAll('a').forEach(function(other){other.classList.toggle('active',other===link);});
      });
      nav.appendChild(link);
    });
  }

  function progressData(status){
    var stages=['Submitted','Under Review','Payment Pending','Payment Received','Application In Process','Approved','Rejected','Visa Issued'];
    if(status==='Action Needed') return {value:25,label:'Action needed',index:0};
    var index=stages.indexOf(status);
    if(index<0) index=0;
    return {value:Math.round(((index+1)/stages.length)*100),label:status||'Submitted',index:index};
  }

  function progressSteps(app){
    var progress=progressData(app.status);
    var labels=['Submitted','Under review','In process','Visa issued'];
    var active=app.status==='Visa Issued'?3:((app.status==='Approved'||app.status==='Rejected'||app.status==='Application In Process'||app.status==='Payment Received'||app.status==='Payment Pending')?2:(app.status==='Under Review'?1:0));
    return '<div class="uae-account-progress" id="uae-visa-process"><div class="uae-account-progress-head"><div><span>Application progress</span><b>'+esc(progress.label)+'</b></div><strong>'+progress.value+'%</strong></div><div class="uae-account-progress-line" style="--uae-progress:'+progress.value+'%"><i></i></div><ol>'+labels.map(function(label,index){return '<li class="'+(index<active?'done':(index===active?'current':''))+'"><i>'+(index<active?'&#10003;':index+1)+'</i><span>'+label+'</span></li>';}).join('')+'</ol></div>';
  }

  function compactApplication(app,names){
    var date=new Date(app.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    return '<details class="uae-account-application-card"><summary><div><span>'+esc(app.status||'Submitted')+'</span><h3>'+esc(names[app.visa_type]||app.visa_type||'UAE visa')+'</h3><p>'+esc(app.reference_code||'—')+' &middot; '+esc(date)+'</p></div><i aria-hidden="true">+</i></summary><div class="uae-account-application-detail"><dl><div><dt>Reference</dt><dd>'+esc(app.reference_code||'—')+'</dd></div><div><dt>Submitted</dt><dd>'+esc(date)+'</dd></div></dl><div class="uae-history-documents">'+documentTile(app,'passport','Passport front')+documentTile(app,'photo','Personal photo')+'</div><a href="/app.html#track">View full tracking <span aria-hidden="true">&#8594;</span></a></div></details>';
  }

  function otherVisaTypes(currentSlug,choices){
    var available=choices.filter(function(visa){return visa.slug!==currentSlug;});
    if(!available.length){
      return '<p class="uae-account-empty-copy">View the latest UAE visa options and choose the one that fits your next trip.</p><a class="uae-account-inline-link" href="'+esc(newVisaUrl())+'">View UAE visa options <span aria-hidden="true">&#8594;</span></a>';
    }
    return '<div class="uae-account-visa-list">'+available.map(function(visa){
      return '<article class="uae-account-visa-option"><header><div><span>'+esc(visa.category)+'</span><h3>'+esc(visa.name)+'</h3></div><strong>'+esc(visa.price)+'<small>per applicant</small></strong></header><div class="uae-account-visa-facts"><div><small>Stay</small><b>'+esc(visa.stay)+'</b></div><div><small>Entry</small><b>'+esc(visa.entry)+'</b></div><div><small>Processing Time</small><b>'+esc(visa.processing)+'</b></div></div><a href="/app.html?visa='+encodeURIComponent(visa.slug)+'">Choose this visa <span aria-hidden="true">&#8594;</span></a></article>';
    }).join('')+'</div>';
  }

  function contactHelp(reference){
    var waNumber=String(cfg.WHATSAPP||'919895226697').replace(/[^0-9]/g,'');
    var display=cfg.PHONE_DISPLAY||'+91 98952 26697';
    var phone=cfg.PHONE_TEL||('+'+waNumber);
    var email=cfg.EMAIL||'hello@visadoo.com';
    var message=encodeURIComponent('Hi Visa Doo, I need help with my UAE visa application '+(reference||'')+'.');
    return '<div class="uae-account-contact-intro"><h3>Talk to a real person</h3><p>Ask about your application, documents or another UAE visa. Our team will help you directly.</p></div><div class="uae-account-contact-options"><a href="https://wa.me/'+esc(waNumber)+'?text='+message+'" target="_blank" rel="noopener"><i aria-hidden="true">WA</i><span><small>WhatsApp</small><b>'+esc(display)+'</b></span><em aria-hidden="true">&#8594;</em></a><a href="tel:'+esc(phone)+'"><i aria-hidden="true">CALL</i><span><small>Call us</small><b>'+esc(display)+'</b></span><em aria-hidden="true">&#8594;</em></a><a href="mailto:'+esc(email)+'?subject='+encodeURIComponent('Help with UAE visa '+(reference||''))+'"><i aria-hidden="true">@</i><span><small>Email</small><b>'+esc(email)+'</b></span><em aria-hidden="true">&#8594;</em></a></div>';
  }

  function uaeTravelInformation(showAttractions,showFaq){
    var attractions=[
      {name:'Burj Khalifa',image:'/assets/dubai-attractions/burj-khalifa.jpg'},
      {name:'The Dubai Mall',image:'/assets/dubai-attractions/dubai-mall.jpg'},
      {name:'The Dubai Fountain',image:'/assets/dubai-attractions/dubai-fountain.jpg'},
      {name:'Palm Jumeirah',image:'/assets/dubai-attractions/palm-jumeirah.jpg'},
      {name:'Dubai Marina',image:'/assets/dubai-attractions/dubai-marina.jpg'},
      {name:'Museum of the Future',image:'/assets/dubai-attractions/museum-of-the-future.jpg'},
      {name:'Al Fahidi Historical Neighbourhood',image:'/assets/dubai-attractions/al-fahidi.jpg'},
      {name:'Dubai Frame',image:'/assets/dubai-attractions/dubai-frame.jpg'}
    ];
    var faqs=[
      ['How can I track my UAE visa?','Select Track your visa on this page to see your current status, timeline and any action requested by our team.'],
      ['What happens after I submit my application?','Our team checks your application and documents first. The status will then move through document verification, review, approval and visa issuance.'],
      ['What should I do if a document needs to be replaced?','Open Track your visa and follow the action shown there. Upload the requested replacement clearly so our team can continue processing your application.'],
      ['Can I correct my details after submission?','Contact our visa team as soon as possible. Some details can be corrected before processing advances, while authority-submitted details may require a new application.'],
      ['How will I receive my approved visa?','When the visa is issued, we will update your application and send the available visa document through your registered contact details.'],
      ['When should I contact the visa team?','Contact us if your status requests action, your travel date is approaching, or you need to correct important information in the submitted application.']
    ];
    var reviewsSection = '';
    var reviews = window.UAE_REVIEWS || [];
    if(reviews.length){
      var tickerList = [].concat(reviews);
      while(tickerList.length > 0 && tickerList.length < 5){
        tickerList = tickerList.concat(reviews);
      }
      var cardsHtml = tickerList.map(function(r){
        var stars = '';
        for(var i=1; i<=5; i++){
          stars += '<span style="color:' + (i <= r.rating ? '#f5a623' : '#d0dbd9') + '">★</span>';
        }
        return '<div class="uae-review-item-card">' +
          '<div class="uae-review-item-stars">' + stars + '</div>' +
          '<p class="uae-review-item-body">"' + esc(r.body) + '"</p>' +
          '<div class="uae-review-item-author"><b>' + esc(r.name) + '</b>' + (r.location ? '<span> · ' + esc(r.location) + '</span>' : '') + '</div>' +
        '</div>';
      }).join('');
      reviewsSection = '<section class="uae-account-faq uae-reviews-layout-section" id="reviews-section"><header><span>Reviews</span><h2>What our travellers say</h2></header><div class="uae-reviews-list-container">' + cardsHtml + '</div></section>';
    }
    var attractionsSection='<section class="uae-attractions" id="uae-attractions"><header><span>Explore Dubai</span><h2>Dubai Tourist Attractions</h2></header><ol>'+attractions.map(function(place,index){return '<li><div class="uae-attraction-photo"><img src="'+place.image+'" alt="'+place.name+' in Dubai" loading="lazy" decoding="async"></div><div class="uae-attraction-copy"><b>'+String(index+1).padStart(2,'0')+'</b><span>'+place.name+'</span></div></li>';}).join('')+'</ol></section>';
    return '<section class="uae-account-information'+(showAttractions===false?' uae-information-faq-only':'')+'">'+
      (showAttractions===false?'':attractionsSection)+
      reviewsSection+
      (showFaq===false?'':'<section class="uae-account-faq" id="uae-faq"><header><span>FAQ</span><h2>Frequently asked questions</h2></header><div>'+faqs.map(function(item,index){return '<details><summary>'+item[0]+'<span aria-hidden="true">+</span></summary><p>'+item[1]+'</p></details>';}).join('')+'</div></section>')+
    '</section>';
  }

  function showPublicTravelGuide(){
    return;
  }

  function wirePreviews(scope){
    function loadPreview(card){
      if(card.getAttribute('data-uae-preview-loading')==='1') return;
      card.setAttribute('data-uae-preview-loading','1');
      var path=card.getAttribute('data-uae-history-path');
      var media=card.querySelector('.uae-history-media');
      sb.storage.from('visa-documents').createSignedUrl(path,3600).then(function(result){
        if(!card.isConnected) return;
        if(result.error||!result.data||!result.data.signedUrl){
          card.disabled=true; card.classList.add('missing'); media.innerHTML='<span>Preview unavailable</span>'; return;
        }
        var url=result.data.signedUrl;
        var label=card.getAttribute('data-uae-history-label')||'Uploaded document';
        media.innerHTML='<img src="'+esc(url)+'" alt="'+esc(label)+' preview">';
        card.onclick=function(){window.open(url,'_blank','noopener');};
      }).catch(function(){
        if(!card.isConnected) return;
        card.disabled=true; card.classList.add('missing'); media.innerHTML='<span>Preview unavailable</span>';
      });
    }
    scope.querySelectorAll('[data-uae-history-path]').forEach(function(card){
      var disclosure=card.closest('details');
      if(!disclosure||disclosure.open){ loadPreview(card); return; }
      function loadWhenOpened(){
        if(!disclosure.open) return;
        disclosure.removeEventListener('toggle',loadWhenOpened);
        loadPreview(card);
      }
      disclosure.addEventListener('toggle',loadWhenOpened);
    });
  }

  function wireAccountSections(scope){
    scope.querySelectorAll('[data-uae-open-section]').forEach(function(link){
      link.addEventListener('click',function(event){
        var selector=link.getAttribute('href');
        var section=selector&&selector.charAt(0)==='#'?scope.querySelector(selector):null;
        if(!section) return;
        event.preventDefault();
        section.open=true;
        section.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  }

  function wireAccountInfoNav(scope){
    var nav=scope.querySelector('.uae-account-info-nav');
    if(!nav) return;
    var items=Array.prototype.map.call(nav.querySelectorAll('a[href^="#"]'),function(link){
      return {link:link,section:scope.querySelector(link.getAttribute('href'))};
    }).filter(function(item){return !!item.section;});
    function setActive(active){
      items.forEach(function(item){
        var selected=item===active;
        item.link.classList.toggle('active',selected);
        if(selected) item.link.setAttribute('aria-current','page'); else item.link.removeAttribute('aria-current');
      });
    }
    items.forEach(function(item){item.link.addEventListener('click',function(){setActive(item);});});
    var scheduled=false;
    function update(){
      scheduled=false;
      var active=items[0], threshold=nav.offsetHeight+28, closestTop=-Infinity;
      items.forEach(function(item){
        var top=item.section.getBoundingClientRect().top;
        if(top<=threshold&&top>closestTop){ closestTop=top; active=item; }
      });
      if(active) setActive(active);
    }
    window.addEventListener('scroll',function(){
      if(scheduled) return;
      scheduled=true; window.requestAnimationFrame(update);
    },{passive:true});
    update();
  }

  function showApplications(apps,names,customerName,choices){
    var page=document.getElementById('countryPage')||document.querySelector('main');
    if(!page||!apps.length) return;
    var latest=apps[0];
    var firstName=String(customerName||'').trim().split(/\s+/)[0];
    var greeting=firstName?'Welcome back, '+esc(firstName)+'.':'Welcome back.';
    var otherApps=apps.slice(1);
    document.body.classList.add('uae-account-page');
    page.innerHTML=
      '<section class="uae-account-hero"><div class="container">'+
        '<a class="uae-account-back" href="/#destinations"><span aria-hidden="true">&#8592;</span> All destinations</a>'+
        '<div class="uae-account-hero-grid"><div class="uae-account-hero-copy"><div class="uae-account-flag"><img src="https://flagcdn.com/w80/ae.png" alt="United Arab Emirates flag"><span>Your UAE visa</span></div><p>'+greeting+'</p><h1>Everything about your application, in one place.</h1><span class="uae-account-hero-lead">Track the latest status and check the files attached to your application.</span><div class="uae-account-actions"><a class="uae-account-primary" href="/app.html#track">Track your visa <span aria-hidden="true">&#8594;</span></a></div></div></div>'+
      '</div></section>'+
      '<nav class="country-info-nav uae-account-info-nav" aria-label="UAE application information"><div class="container">'+
        '<a class="active" href="#uae-current-visa">Visa Info</a>'+
        '<a href="requirements.html?slug=united-arab-emirates">Visa Requirements</a>'+
      '</div></nav>'+
      '<section class="uae-account-content"><div class="container"><div class="uae-account-grid">'+
        '<div class="uae-account-main"><section class="uae-account-current" id="uae-current-visa"><header><div><span>Visa information</span><h2>'+esc(names[latest.visa_type]||latest.visa_type||'UAE visa')+'</h2><p>Reference '+esc(latest.reference_code||'—')+'</p></div><b class="uae-history-status '+statusClass(latest.status)+'">'+esc(latest.status||'Submitted')+'</b></header><div class="uae-account-current-detail">'+
          progressSteps(latest)+
          '<section class="uae-account-documents" id="uae-account-documents"><header><div><span>Attached documents</span><h2>Passport &amp; personal photo</h2><p>Your files stay hidden until you choose to view them.</p></div><b>Secure</b></header><details class="uae-account-document-disclosure"><summary><span>View attached files</span><i aria-hidden="true">+</i></summary><div class="uae-history-documents">'+documentTile(latest,'passport','Passport front')+documentTile(latest,'photo','Personal photo')+'</div></details></section>'+
        '</div></section></div>'+
        '<aside class="uae-account-side"><section><span>Next step</span><h2>Follow every update</h2><p>Open Track visa to view the full timeline and respond if our team needs anything.</p><a href="/app.html#track">Open visa tracking <span aria-hidden="true">&#8594;</span></a></section>'+
          '<section class="uae-account-other"><header><div><span>Your UAE visas</span><h2>'+(otherApps.length?'Other applications':'Start another visa')+'</h2></div></header>'+(otherApps.length?'<div>'+otherApps.map(function(app){return compactApplication(app,names);}).join('')+'</div>':'<p>You can start another UAE visa without changing this application.</p>')+'<a class="uae-account-add" href="#uae-other-visa-types" data-uae-open-section>Add another visa <span aria-hidden="true">+</span></a></section>'+
        '</aside></div><section class="uae-account-extras" aria-label="More UAE visa help">'+
          '<section class="uae-account-disclosure uae-account-static" id="uae-other-visa-types"><header><div><span>Choose a visa</span><h2>Other UAE visa types</h2><p>Compare the available options before starting another application.</p></div></header><div class="uae-account-disclosure-body">'+otherVisaTypes(latest.visa_type,choices||[])+'</div></section>'+
          '<section class="uae-account-disclosure uae-account-static" id="uae-contact-help"><header><div><span>Contact us</span><h2>Contact our visa team</h2><p>WhatsApp, call or email — choose what works for you.</p></div></header><div class="uae-account-disclosure-body uae-account-contact-body">'+contactHelp(latest.reference_code)+'</div></section>'+
        '</section></div></section>'+
      '<section class="uae-public-guide-section"><div class="container">'+uaeTravelInformation(false).replace('uae-account-information','uae-account-information uae-public-travel-guide')+'</div></section>';
    wirePreviews(page);
    wireAccountSections(page);
    wireAccountInfoNav(page);
    if(window.initReviewsTicker) window.initReviewsTicker();
    if(window.wireUaeFaqAccordion) window.wireUaeFaqAccordion();
  }

  var names=visaNames();
  var choices=visaChoices();
  var visaSlugs=Object.keys(names);
  if(!visaSlugs.length) return;
  ensureGuideNav();
  showPublicTravelGuide();
  var customerName='';
  if(new URLSearchParams(window.location.search).get('new')==='1') return;
  sb.auth.getSession().then(function(sessionResult){
    if(!sessionResult.data||!sessionResult.data.session) return null;
    var user=sessionResult.data.session.user||{};
    var meta=user.user_metadata||{};
    customerName=meta.full_name||meta.name||(user.email||'').split('@')[0]||'';
    return sb.from('applications')
      .select('id,reference_code,visa_type,status,created_at,documents(doc_type,file_path,file_name)')
      .in('visa_type',visaSlugs)
      .order('created_at',{ascending:false})
      .limit(3);
  }).then(function(result){
    if(!result||result.error||!result.data||!result.data.length) return;
    showApplications(result.data,names,customerName,choices);
  }).catch(function(){ /* Keep the public destination page unchanged if account data cannot load. */ });
  }
})();
