// Signed-in customers: show their previous UAE applications on the UAE destination page.
(function(){
  'use strict';

  var started=false;
  function startWhenReady(){
    if(started||!document.body.classList.contains('uae-country-page')) return;
    started=true;
    boot();
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
    [['Explore Dubai','#uae-attractions'],['FAQs','#uae-faq']].forEach(function(item){
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
    var stages=['Submitted','Documents Verified','Under Review','Payment Confirmed','Approved','Visa Issued'];
    if(status==='Action Needed') return {value:25,label:'Action needed',index:0};
    var index=stages.indexOf(status);
    if(index<0) index=0;
    return {value:Math.round(((index+1)/stages.length)*100),label:status||'Submitted',index:index};
  }

  function progressSteps(app){
    var progress=progressData(app.status);
    var labels=['Submitted','Documents checked','Under review','Visa issued'];
    var active=app.status==='Visa Issued'?3:(app.status==='Approved'||app.status==='Payment Confirmed'?2:(app.status==='Documents Verified'||app.status==='Under Review'?1:0));
    return '<div class="uae-account-progress"><div class="uae-account-progress-head"><div><span>Application progress</span><b>'+esc(progress.label)+'</b></div><strong>'+progress.value+'%</strong></div><div class="uae-account-progress-line" style="--uae-progress:'+progress.value+'%"><i></i></div><ol>'+labels.map(function(label,index){return '<li class="'+(index<active?'done':(index===active?'current':''))+'"><i>'+(index<active?'&#10003;':index+1)+'</i><span>'+label+'</span></li>';}).join('')+'</ol></div>';
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
      return '<article class="uae-account-visa-option"><header><div><span>'+esc(visa.category)+'</span><h3>'+esc(visa.name)+'</h3></div><strong>'+esc(visa.price)+'<small>per applicant</small></strong></header><div class="uae-account-visa-facts"><div><small>Stay</small><b>'+esc(visa.stay)+'</b></div><div><small>Entry</small><b>'+esc(visa.entry)+'</b></div><div><small>Processing</small><b>'+esc(visa.processing)+'</b></div></div><a href="/app.html?visa='+encodeURIComponent(visa.slug)+'">Choose this visa <span aria-hidden="true">&#8594;</span></a></article>';
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

  function uaeTravelInformation(){
    var attractions=[
      {name:'Burj Khalifa',image:'https://images.unsplash.com/photo-1556011882-b21d3312ea8d?auto=format&fit=crop&q=86&w=1200'},
      {name:'The Dubai Mall',image:'https://images.unsplash.com/photo-1748373448914-1d7f882700e2?auto=format&fit=crop&q=86&w=1200'},
      {name:'The Dubai Fountain',image:'https://images.unsplash.com/photo-1550686164-6f282d49c63c?auto=format&fit=crop&q=86&w=1200'},
      {name:'Palm Jumeirah',image:'https://images.unsplash.com/photo-1682410601904-24ec1d9858e6?auto=format&fit=crop&q=86&w=1200'},
      {name:'Dubai Marina',image:'https://images.unsplash.com/photo-1679682598283-a1b88b136ed8?auto=format&fit=crop&q=86&w=1200'},
      {name:'Museum of the Future',image:'https://images.unsplash.com/photo-1569669568747-df222c4e8d4c?auto=format&fit=crop&q=86&w=1200'},
      {name:'Al Fahidi Historical Neighbourhood',image:'https://images.unsplash.com/photo-1465414829459-d228b58caf6e?auto=format&fit=crop&q=86&w=1200'},
      {name:'Dubai Frame',image:'https://images.unsplash.com/photo-1718564257683-1e4caf9b049a?auto=format&fit=crop&q=86&w=1200'}
    ];
    var faqs=[
      ['How can I track my UAE visa?','Select Track your visa on this page to see your current status, timeline and any action requested by our team.'],
      ['Which documents are attached to my application?','This page shows your passport front and personal photo. Your passport back page remains securely stored with the application.'],
      ['Do my uploaded photos need to be high resolution?','No. The personal photo must show one person clearly, and the passport image must be clear enough for the text to be read.'],
      ['How long does a UAE visa take?','Processing time depends on the visa type and the authorities. Check the estimate shown for your selected visa and follow live updates in Track visa.'],
      ['Can I apply for another UAE visa?','Yes. Select Add another visa to return to the UAE visa options without changing your current application.'],
      ['What passport validity is normally expected?','Travellers are commonly asked for at least 6 months of passport validity. Requirements can change, so confirm the latest rule before travel.']
    ];
    return '<section class="uae-account-information">'+
      '<section class="uae-attractions" id="uae-attractions"><header><span>Explore Dubai</span><h2>Dubai Tourist Attractions</h2></header><ol>'+attractions.map(function(place,index){return '<li><div class="uae-attraction-photo"><img src="'+place.image+'" alt="'+place.name+' in Dubai" loading="lazy" decoding="async"></div><div class="uae-attraction-copy"><b>'+String(index+1).padStart(2,'0')+'</b><span>'+place.name+'</span></div></li>';}).join('')+'</ol></section>'+
      '<section class="uae-account-faq" id="uae-faq"><header><span>FAQ</span><h2>Frequently asked questions</h2></header><div>'+faqs.map(function(item,index){return '<details'+(index===0?' open':'')+'><summary>'+item[0]+'<span aria-hidden="true">+</span></summary><p>'+item[1]+'</p></details>';}).join('')+'</div></section>'+
    '</section>';
  }

  function showPublicTravelGuide(){
    var page=document.getElementById('countryPage')||document.querySelector('main');
    if(!page||page.querySelector('.uae-public-travel-guide')) return;
    var section=document.createElement('section');
    section.className='uae-public-guide-section';
    section.innerHTML='<div class="container">'+uaeTravelInformation().replace('uae-account-information','uae-account-information uae-public-travel-guide')+'</div>';
    page.appendChild(section);
  }

  function wirePreviews(scope){
    scope.querySelectorAll('[data-uae-history-path]').forEach(function(card){
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

  function showApplications(apps,names,customerName,choices){
    var page=document.getElementById('countryPage')||document.querySelector('main');
    if(!page||!apps.length) return;
    var latest=apps[0];
    var date=new Date(latest.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    var passport=documentOf(latest,'passport'), photo=documentOf(latest,'photo');
    var attached=(passport?1:0)+(photo?1:0);
    var firstName=String(customerName||'').trim().split(/\s+/)[0];
    var greeting=firstName?'Welcome back, '+esc(firstName)+'.':'Welcome back.';
    var otherApps=apps.slice(1);
    document.body.classList.add('uae-account-page');
    page.innerHTML=
      '<section class="uae-account-hero"><div class="container">'+
        '<a class="uae-account-back" href="/#destinations"><span aria-hidden="true">&#8592;</span> All destinations</a>'+
        '<div class="uae-account-hero-grid"><div class="uae-account-hero-copy"><div class="uae-account-flag"><img src="https://flagcdn.com/w80/ae.png" alt="United Arab Emirates flag"><span>Your UAE visa</span></div><p>'+greeting+'</p><h1>Everything about your application, in one place.</h1><span class="uae-account-hero-lead">Track the latest status, check the files you attached or start another UAE visa.</span><div class="uae-account-actions"><a class="uae-account-primary" href="/app.html#track">Track your visa <span aria-hidden="true">&#8594;</span></a><a class="uae-account-secondary" href="#uae-other-visa-types" data-uae-open-section>Add another visa <span aria-hidden="true">+</span></a></div></div>'+
        '<aside class="uae-account-hero-summary"><span>Latest application</span><h2>'+esc(names[latest.visa_type]||latest.visa_type||'UAE visa')+'</h2><div class="uae-account-hero-meta"><div><small>Status</small><b>'+esc(latest.status||'Submitted')+'</b></div><div><small>Reference</small><b>'+esc(latest.reference_code||'—')+'</b></div><div><small>Submitted</small><b>'+esc(date)+'</b></div><div><small>Attached</small><b>'+attached+' of 2 files</b></div></div></aside></div>'+
      '</div></section>'+
      '<section class="uae-account-content"><div class="container"><div class="uae-account-grid">'+
        '<div class="uae-account-main"><section class="uae-account-current" id="uae-current-visa"><header><div><span>Current visa</span><h2>'+esc(names[latest.visa_type]||latest.visa_type||'UAE visa')+'</h2><p>Reference '+esc(latest.reference_code||'—')+'</p></div><b class="uae-history-status '+statusClass(latest.status)+'">'+esc(latest.status||'Submitted')+'</b></header><div class="uae-account-current-detail">'+
          progressSteps(latest)+
          '<section class="uae-account-documents"><header><div><span>Attached documents</span><h2>Passport &amp; personal photo</h2><p>Only the passport front and personal photo are shown here.</p></div><b>Secure</b></header><div class="uae-history-documents">'+documentTile(latest,'passport','Passport front')+documentTile(latest,'photo','Personal photo')+'</div></section>'+
        '</div></section></div>'+
        '<aside class="uae-account-side"><section><span>Next step</span><h2>Follow every update</h2><p>Open Track visa to view the full timeline and respond if our team needs anything.</p><a href="/app.html#track">Open visa tracking <span aria-hidden="true">&#8594;</span></a></section>'+
          '<section class="uae-account-other"><header><div><span>Your UAE visas</span><h2>'+(otherApps.length?'Other applications':'Start another visa')+'</h2></div></header>'+(otherApps.length?'<div>'+otherApps.map(function(app){return compactApplication(app,names);}).join('')+'</div>':'<p>You can start another UAE visa without changing this application.</p>')+'<a class="uae-account-add" href="#uae-other-visa-types" data-uae-open-section>Add another visa <span aria-hidden="true">+</span></a></section>'+
        '</aside></div><section class="uae-account-extras" aria-label="More UAE visa help">'+
          '<section class="uae-account-disclosure uae-account-static" id="uae-other-visa-types"><header><div><span>Plan another trip</span><h2>Other UAE visa types</h2><p>Compare the available options before starting another application.</p></div></header><div class="uae-account-disclosure-body">'+otherVisaTypes(latest.visa_type,choices||[])+'</div></section>'+
          '<section class="uae-account-disclosure uae-account-static" id="uae-contact-help"><header><div><span>We are here to help</span><h2>Contact our visa team</h2><p>WhatsApp, call or email — choose what works for you.</p></div></header><div class="uae-account-disclosure-body uae-account-contact-body">'+contactHelp(latest.reference_code)+'</div></section>'+
        '</section></div></section>';
    wirePreviews(page);
    wireAccountSections(page);
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
