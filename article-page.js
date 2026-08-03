(function () {
  'use strict';

  var cfg=window.VISADOO_CONFIG||{};
  var root=document.getElementById('articlePage');
  var year=document.getElementById('year');
  if(year) year.textContent=new Date().getFullYear();

  function setupMenu(){
    var button=document.getElementById('menuBtn'),links=document.getElementById('navLinks');
    if(!button||!links) return;
    button.addEventListener('click',function(){
      var open=links.classList.toggle('open');
      button.setAttribute('aria-expanded',String(open));
    });
    links.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click',function(){ links.classList.remove('open'); button.setAttribute('aria-expanded','false'); });
    });
  }
  setupMenu();

  function esc(value){
    return (value==null?'':String(value)).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function slug(){
    var query=new URLSearchParams(window.location.search).get('slug');
    if(query) return query;
    var parts=window.location.pathname.split('/').filter(Boolean),i=parts.indexOf('article');
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
  function formatDate(value){
    if(!value) return '';
    var date=new Date(value);
    return isNaN(date.getTime())?'':date.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  }
  function readingTime(html){
    var template=document.createElement('template');
    template.innerHTML=html||'';
    var words=(template.content.textContent||'').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1,Math.ceil(words/220));
  }
  function safeContent(html){
    var template=document.createElement('template');
    template.innerHTML=html||'';
    template.content.querySelectorAll('script,iframe,object,embed,style,link,meta').forEach(function(node){node.remove();});
    template.content.querySelectorAll('*').forEach(function(node){
      Array.prototype.slice.call(node.attributes).forEach(function(attribute){
        var name=attribute.name.toLowerCase(),value=attribute.value.trim().toLowerCase();
        if(name.indexOf('on')===0||name==='srcdoc'||((name==='href'||name==='src')&&value.indexOf('javascript:')===0)){
          node.removeAttribute(attribute.name);
        }
      });
      if(node.tagName==='A'){
        node.setAttribute('rel','noopener');
        if(node.getAttribute('href')&&node.getAttribute('href').indexOf('/')===0){
          node.setAttribute('href',node.getAttribute('href').replace(/^\/articles$/,'/articles.html'));
        }
      }
    });
    return template.innerHTML;
  }
  function renderError(title,message){
    root.innerHTML='<section class="country-page-error"><div><div class="country-error-icon">!</div><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a href="/articles.html" class="btn btn-primary btn-lg">See all articles</a></div></section>';
  }
  function enhanceArticle(){
    var body=document.querySelector('.article-body');
    if(!body) return;
    var toc=document.getElementById('articleToc');
    var tocCard=document.querySelector('.article-toc-card');
    var headings=Array.prototype.slice.call(body.querySelectorAll('h2,h3'));
    var used={};
    if(toc&&headings.length){
      toc.innerHTML=headings.map(function(heading,index){
        var base=(heading.textContent||'section').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||('section-'+(index+1));
        var id=base,count=2;
        while(used[id]||document.getElementById(id)){ id=base+'-'+count++; }
        used[id]=true; heading.id=id;
        return '<a href="#'+id+'" class="toc-'+heading.tagName.toLowerCase()+'">'+esc(heading.textContent)+'</a>';
      }).join('');
    }else if(tocCard){ tocCard.hidden=true; }

    var copy=document.getElementById('copyArticleLink');
    if(copy){
      copy.addEventListener('click',function(){
        var done=function(){ var old=copy.innerHTML; copy.innerHTML='<span>✓</span> Link copied'; window.setTimeout(function(){copy.innerHTML=old;},1800); };
        if(navigator.clipboard&&window.isSecureContext){ navigator.clipboard.writeText(window.location.href).then(done).catch(function(){}); }
        else{
          var field=document.createElement('textarea'); field.value=window.location.href; field.setAttribute('readonly',''); field.style.position='fixed'; field.style.opacity='0'; document.body.appendChild(field); field.select();
          try{ document.execCommand('copy'); done(); }catch(ignore){} document.body.removeChild(field);
        }
      });
    }

    var progress=document.querySelector('#readingProgress span');
    if(progress){
      var paintProgress=function(){
        var page=document.documentElement;
        var distance=Math.max(1,page.scrollHeight-window.innerHeight);
        progress.style.width=Math.min(100,Math.max(0,(window.scrollY/distance)*100))+'%';
      };
      paintProgress(); window.addEventListener('scroll',paintProgress,{passive:true}); window.addEventListener('resize',paintProgress);
    }

    if('IntersectionObserver' in window&&toc&&headings.length){
      var links=Array.prototype.slice.call(toc.querySelectorAll('a'));
      var observer=new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(!entry.isIntersecting) return;
          links.forEach(function(link){link.classList.toggle('active',link.getAttribute('href')==='#'+entry.target.id);});
        });
      },{rootMargin:'-22% 0px -68% 0px'});
      headings.forEach(function(heading){observer.observe(heading);});
    }
  }
  function render(article){
    var title=article.seo_title||article.title+' | Visa Doo';
    var description=article.seo_description||article.excerpt||article.title;
    var cover=article.cover_image||article.social_image||'';
    var date=formatDate(article.published_at||article.created_at);
    var minutes=readingTime(article.content||'');
    document.title=title;
    var meta=document.querySelector('meta[name="description"]');
    if(meta) meta.content=description.slice(0,160);

    root.innerHTML=
      '<article class="article-detail">'+
        '<header class="article-hero'+(cover?'':' article-hero--plain')+'">'+
          '<div class="article-hero-orbit article-hero-orbit--one" aria-hidden="true"></div><div class="article-hero-orbit article-hero-orbit--two" aria-hidden="true"></div>'+
          '<div class="container article-hero-copy">'+
            '<a href="/articles.html" class="article-back"><span>←</span> Back to the journal</a>'+
            '<span class="article-kicker"><i></i> Visa Doo Journal</span>'+
            '<h1 class="article-title">'+esc(article.title)+'</h1>'+
            (article.excerpt?'<p class="article-intro">'+esc(article.excerpt)+'</p>':'')+
            '<div class="article-meta">'+
              '<span class="article-author-mark"><svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg></span>'+
              '<span><small>Written by</small><b>Visa Doo editorial team</b></span>'+
              (date?'<span class="article-meta-divider"></span><span><small>Published</small><b>'+esc(date)+'</b></span>':'')+
              '<span class="article-meta-divider"></span><span><small>Reading time</small><b>'+minutes+' min read</b></span>'+
            '</div>'+
          '</div>'+
          (cover?'<div class="container article-hero-media-wrap"><div class="article-cover"><img src="'+esc(cover)+'" alt="'+esc(article.cover_alt||article.title)+'" fetchpriority="high"><span class="article-cover-corner" aria-hidden="true"></span></div></div>':'')+
        '</header>'+
        '<section class="article-content-section"><div class="container article-layout">'+
          '<aside class="article-aside">'+
            '<div class="article-toc-card"><span class="article-side-label">In this guide</span><nav id="articleToc" aria-label="Article contents"></nav></div>'+
            '<div class="article-help-card"><span class="article-help-icon">✓</span><div><b>Expert-checked guidance</b><p>Need help with your route? Our visa team is one message away.</p></div><a href="/#contact">Talk to our team →</a></div>'+
            '<button class="article-copy-link" id="copyArticleLink" type="button"><span>↗</span> Copy article link</button>'+
          '</aside>'+
          '<div class="article-prose-card">'+
            '<div class="article-body">'+safeContent(article.content||'')+'</div>'+
            '<div class="article-cta"><div><span>YOUR NEXT TRIP STARTS HERE</span><h3>Ready to make the visa part simple?</h3><p>Compare destinations, see the requirements clearly and apply online with live tracking.</p></div><a href="/#destinations" class="btn btn-white btn-lg">Explore destinations <b>→</b></a></div>'+
          '</div>'+
        '</div></section>'+
      '</article>';
    enhanceArticle();
  }

  if(root&&root.getAttribute('data-hydrated')==='true'){ enhanceArticle(); return; }

  var articleSlug=slug();
  if(!articleSlug){ renderError('Article not selected','Choose an article from the journal to read the complete guide.'); return; }
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY){ renderError('Connection unavailable','The article service is not configured yet.'); return; }

  fetchJson('/rest/v1/articles?status=eq.published&slug=eq.'+encodeURIComponent(articleSlug)+'&select=*').then(function(rows){
    if(rows.length){ render(rows[0]); return; }
    return fetchJson('/rest/v1/articles?status=eq.published&past_slugs=cs.%7B'+encodeURIComponent(articleSlug)+'%7D&select=slug&limit=1').then(function(moved){
      if(moved.length){
        var local=window.location.protocol==='file:'||window.location.hostname==='127.0.0.1'||window.location.hostname==='localhost';
        window.location.replace(local?('/article.html?slug='+encodeURIComponent(moved[0].slug)):('/article/'+encodeURIComponent(moved[0].slug)));
        return;
      }
      renderError('Article not found','This article does not exist or is no longer published.');
    });
  }).catch(function(){
    renderError('Could not load this article','Please check your connection and try again.');
  });
})();
