(function () {
  'use strict';

  var MAX_SLIDES=4;

  function wikipediaImages(titles){
    if(!titles||!titles.length) return Promise.resolve([]);
    var endpoint='https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=1400&redirects=1&format=json&origin=*&titles='+encodeURIComponent(titles.join('|'));
    return fetch(endpoint).then(function(response){
      if(!response.ok) throw new Error('Image request failed');
      return response.json();
    }).then(function(data){
      var pages=data&&data.query&&data.query.pages?Object.keys(data.query.pages).map(function(key){return data.query.pages[key];}):[];
      return pages.filter(function(page){return page.thumbnail&&page.thumbnail.source;}).map(function(page){
        return {src:page.thumbnail.source,label:page.title||''};
      });
    }).catch(function(){ return []; });
  }

  function initGallery(box){
    if(!box||box.getAttribute('data-carousel-ready')==='true') return;
    box.setAttribute('data-carousel-ready','true');

    var slug=box.getAttribute('data-country-slug')||'';
    var countryName=box.getAttribute('data-country-name')||'Destination';
    var placeMap=window.VISADOO_DESTINATION_SLIDES||{};
    var photoMap=window.VISADOO_DESTINATION_PHOTOS||{};
    var places=placeMap[slug]||[];
    var existing=box.querySelector('img');
    var initialSrc=photoMap[slug+'-banner']||photoMap[slug]||box.getAttribute('data-initial-image')||(existing&&existing.getAttribute('src'))||'';
    if (!initialSrc) {
      var fallbacks = {
        'thailand': 'https://images.unsplash.com/photo-1528181304800-2f19024b321d?auto=format&fit=crop&w=1200&q=84',
        'indonesia': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=84',
        'russia': 'https://images.unsplash.com/photo-1520106212299-d99c443e4568?auto=format&fit=crop&w=1200&q=84',
        'kenya': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=84'
      };
      initialSrc = fallbacks[slug.toLowerCase()] || '';
    }
    if(/flagcdn\.com|flagsapi\.com|\/flags?\//i.test(initialSrc)) initialSrc='';
    var hero=box.closest?box.closest('.country-detail-hero'):null;
    if(hero&&initialSrc){
      hero.style.setProperty('--country-hero-image','url("'+String(initialSrc).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'")');
    }
    var slides=initialSrc?[{src:initialSrc,label:places[0]||countryName}]:[];
    var active=0;

    var main=document.createElement('div');
    main.className='country-gallery-main';
    var stage=document.createElement('div');
    stage.className='country-carousel-stage';
    var shade=document.createElement('div');
    shade.className='country-carousel-shade';
    var caption=document.createElement('div');
    caption.className='country-image-caption';
    var captionSmall=document.createElement('small');
    captionSmall.textContent='Featured place';
    var captionStrong=document.createElement('strong');
    captionStrong.textContent=slides.length?slides[0].label:countryName;
    caption.appendChild(captionSmall);
    caption.appendChild(captionStrong);
    main.appendChild(stage);
    main.appendChild(shade);
    main.appendChild(caption);

    var placeList=document.createElement('aside');
    placeList.className='country-place-list';
    var listHeading=document.createElement('div');
    listHeading.className='country-place-list-heading';
    var listTitle=document.createElement('strong');
    listTitle.textContent='Must-see places';
    var listCountry=document.createElement('small');
    listCountry.textContent=countryName;
    listHeading.appendChild(listTitle);
    listHeading.appendChild(listCountry);
    var thumbs=document.createElement('div');
    thumbs.className='country-place-thumbs';
    placeList.appendChild(listHeading);
    placeList.appendChild(thumbs);

    box.innerHTML='';
    box.appendChild(main);
    box.appendChild(placeList);
    box.setAttribute('role','region');
    box.setAttribute('aria-label',countryName+' must-see places');

    function uniqueSlides(items){
      var seenSources={};
      var seenLabels={};
      return items.filter(function(item){
        if(!item||!item.src||seenSources[item.src]) return false;
        var labelKey=String(item.label||'').toLowerCase()
          .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
          .replace(/\([^)]*\)/g,'').replace(/[^a-z0-9]+/g,' ').trim();
        if(labelKey&&seenLabels[labelKey]) return false;
        seenSources[item.src]=true;
        if(labelKey) seenLabels[labelKey]=true;
        return true;
      }).slice(0,MAX_SLIDES);
    }

    function setActive(index){
      var images=stage.querySelectorAll('.country-carousel-slide');
      var cards=thumbs.querySelectorAll('.country-place-card');
      if(!images.length) return;
      active=(index+images.length)%images.length;
      Array.prototype.forEach.call(images,function(image,i){
        image.classList.toggle('active',i===active);
        image.setAttribute('aria-hidden',i===active?'false':'true');
      });
      Array.prototype.forEach.call(cards,function(card,i){
        card.classList.toggle('active',i===active);
        card.setAttribute('aria-current',i===active?'true':'false');
      });
      captionStrong.textContent=slides[active].label||countryName;
    }

    function render(){
      slides=uniqueSlides(slides);
      stage.innerHTML='';
      thumbs.innerHTML='';
      slides.forEach(function(slide,index){
        var image=document.createElement('img');
        image.className='country-carousel-slide'+(index===active?' active':'');
        image.src=slide.src;
        image.alt=slide.label+', '+countryName;
        image.loading=index===0?'eager':'lazy';
        image.decoding='async';
        image.setAttribute('aria-hidden',index===active?'false':'true');
        image.addEventListener('error',function(){image.classList.add('failed');});
        stage.appendChild(image);

        var card=document.createElement('button');
        card.type='button';
        card.className='country-place-card'+(index===active?' active':'');
        card.setAttribute('aria-label','Show '+slide.label);
        var thumb=document.createElement('img');
        thumb.src=slide.src;
        thumb.alt='';
        thumb.loading='lazy';
        thumb.decoding='async';
        var title=document.createElement('strong');
        title.textContent=slide.label||countryName;
        card.appendChild(thumb);
        card.appendChild(title);
        card.addEventListener('click',function(){setActive(index);});
        thumbs.appendChild(card);
      });
      if(active>=slides.length) active=0;
      placeList.hidden=slides.length<2;
      box.classList.toggle('single-place',slides.length<2);
      caption.hidden=!slides.length;
      setActive(active);
    }

    render();
    wikipediaImages(places).then(function(items){
      if(!items.length) return;
      slides=slides.concat(items);
      render();
    });
  }

  function init(root){
    var scope=root&&root.querySelectorAll?root:document;
    Array.prototype.forEach.call(scope.querySelectorAll('[data-country-carousel]'),initGallery);
  }

  window.VisaDooCountryCarousel={init:init,holdTime:0,fadeTime:250};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){init(document);});
  else init(document);
})();
