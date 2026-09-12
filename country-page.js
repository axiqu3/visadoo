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
  if(menuBtn&&navLinks&&!menuBtn.getAttribute('data-menu-wired')){
    menuBtn.setAttribute('data-menu-wired','true');
    menuBtn.addEventListener('click',function(e){
      e.stopPropagation();
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

  function isFlagImage(url){
    if(!url) return false;
    return /flagcdn\.com|flagsapi\.com|\/flags?\/|flag|\.svg$/i.test(url) || /\/assets\/flags\//i.test(url);
  }

  function shortText(value,fallback,limit){
    var text=String(value||fallback||'').replace(/\s+/g,' ').trim();
    if(text.length<=limit) return text;
    var cut=text.slice(0,limit+1).lastIndexOf(' ');
    return text.slice(0,cut>limit*.65?cut:limit).replace(/[.,;:\s]+$/,'')+'…';
  }

  function resolveSlug(){
    var rawQuery=new URLSearchParams(window.location.search).get('slug');
    if(rawQuery) {
      var cleanQuery = String(rawQuery).toLowerCase().replace(/[^a-z0-9-]/g, '');
      return Promise.resolve(cleanQuery || 'uae');
    }
    var parts=window.location.pathname.split('/').filter(Boolean);
    var countryIndex=parts.indexOf('country');
    if(countryIndex>-1&&parts[countryIndex+1]) {
      var cSlug = decodeURIComponent(parts[countryIndex+1]).toLowerCase().replace(/[^a-z0-9-]/g, '');
      return Promise.resolve(cSlug || 'uae');
    }
    
    var visaIndex=parts.indexOf('visa');
    if(visaIndex>-1&&parts[visaIndex+1]){
      var visaSlug=decodeURIComponent(parts[visaIndex+1]).toLowerCase().replace(/[^a-z0-9-]/g, '');
      if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){
        return Promise.resolve('uae');
      }
      return fetchJson('/rest/v1/visa_types?slug=eq.'+encodeURIComponent(visaSlug)+'&select=country_slug').then(function(res){
        var cs = res&&res[0]&&res[0].country_slug;
        return cs ? String(cs).toLowerCase().replace(/[^a-z0-9-]/g, '') : 'uae';
      }).catch(function(){ return 'uae'; });
    }
    return Promise.resolve('uae');
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
    if(!visa) return '';
    if(visa.processing && typeof visa.processing === 'string') return visa.processing;
    var slug = ((visa.slug || visa.id || '') + ' ' + (visa.country_slug || '') + ' ' + (window.currentCountrySlug || '')).toLowerCase();
    var name = (visa.name || '').toLowerCase();
    
    // Express / Super express overrides
    if (slug.indexOf('super-express') > -1 || name.indexOf('super express') > -1) {
      return '12 hours';
    }
    if (slug.indexOf('express') > -1 || name.indexOf('express') > -1) {
      if (slug.indexOf('uae') > -1 || slug.indexOf('united-arab-emirates') > -1 || slug.indexOf('dubai') > -1) {
        return 'Upto 48 hours';
      }
      if (slug.indexOf('thailand') > -1) {
        return 'Upto 24 hours';
      }
      return '24 hours';
    }
    if (slug.indexOf('thailand-e-visa') > -1) {
      return '24 hours';
    }
    if (slug.indexOf('thailand') > -1 && (slug.indexOf('stamp') > -1 || name.indexOf('stamp') > -1)) {
      return '3 – 4 days';
    }

    var value = visa.processing_time_value != null && visa.processing_time_value !== '' ? visa.processing_time_value : visa.etaValue;
    var unit = String(visa.processing_time_unit || visa.etaUnit || '').toLowerCase();
    
    if (value != null && value !== '' && unit) {
      if (unit.indexOf('hour') > -1) {
        var hrs = Number(value);
        if (slug.indexOf('uae') > -1 || slug.indexOf('united-arab-emirates') > -1 || slug.indexOf('dubai') > -1) {
          return 'Upto ' + value + ' hour' + (hrs === 1 ? '' : 's');
        }
        return value + ' hour' + (hrs === 1 ? '' : 's');
      }
      if (unit.indexOf('working') > -1 || unit.indexOf('business') > -1) {
        if (String(value).indexOf('working') > -1 || String(value).indexOf('business') > -1) return String(value);
        if (slug.indexOf('uae') > -1 || slug.indexOf('united-arab-emirates') > -1 || slug.indexOf('dubai') > -1) return 'Upto 5 days';
        if (slug.indexOf('vietnam') > -1) return '3–5 working days';
        if (slug.indexOf('thailand') > -1) return '3 – 4 days';
        return value + ' working day' + (String(value) === '1' ? '' : 's');
      }
      if (unit.indexOf('day') > -1) {
        if (slug.indexOf('uae') > -1 || slug.indexOf('united-arab-emirates') > -1 || slug.indexOf('dubai') > -1) return 'Upto 5 days';
        if (slug.indexOf('vietnam') > -1) return '3–5 working days';
        if (slug.indexOf('thailand') > -1) return '3 – 4 days';
        return value + ' day' + (String(value) === '1' ? '' : 's');
      }
    }

    if (slug.indexOf('united-arab-emirates') > -1 || slug.indexOf('uae') > -1 || slug.indexOf('dubai') > -1) return 'Upto 5 days';
    if (slug.indexOf('vietnam') > -1) return '3–5 working days';
    if (slug.indexOf('thailand') > -1) return '24 hours';
    if (slug.indexOf('morocco') > -1 && slug.indexOf('business') > -1) return '5-7 working days';
    if (slug.indexOf('morocco') > -1) return '3-5 working days';
    if (slug.indexOf('qatar') > -1) return '5-6 working days';
    if (slug.indexOf('srilanka') > -1 || slug.indexOf('sri-lanka') > -1) return '24 to 48 hours';
    if (slug.indexOf('kenya') > -1) return 'Upto 2 days';
    if (slug.indexOf('russia') > -1) return '10 - 12 days';
    if (slug.indexOf('indonesia') > -1) return '5-7 working days';
    if (slug.indexOf('azerbaijan') > -1) return 'Upto 3 days';
    if (slug.indexOf('bahrain') > -1) return '3-5 working days';
    if (slug.indexOf('egypt') > -1) return '10 - 15 days';
    if (slug.indexOf('philippines') > -1) return '8 - 10 days';
    if (slug.indexOf('saudi') > -1) return '5 working days';
    if (slug.indexOf('oman') > -1) return '5 - 6 days';

    return '3-5 working days';
  }

  function validityText(visa){
    if(!visa) return '';
    if(visa.validity && typeof visa.validity === 'string') return visa.validity;
    var slug = ((visa.slug || visa.id || '') + ' ' + (visa.country_slug || '') + ' ' + (window.currentCountrySlug || '')).toLowerCase();
    var val = visa.validity_days || visa.validity_period_value;
    if(val != null && val !== '') {
      var num = Number(val);
      if(!isNaN(num) && num > 0) {
        if(slug.indexOf('thailand') > -1) {
          if(num === 90) return '3 Months';
          if(num === 30) return '1 Month';
        }
        if(num === 365) return '1 Year';
        return num + ' days';
      }
      return String(val);
    }
    if(visa.features && Array.isArray(visa.features)){
      for(var i=0; i<visa.features.length; i++){
        var f = String(visa.features[i]);
        var m = f.match(/validity:?\s*(\d+\s*(?:days?|months?|years?))/i) || f.match(/(\d+\s*(?:days?|months?|years?))\s*validity/i);
        if(m) return m[1];
      }
    }
    if(slug.indexOf('thailand') > -1) {
      if(slug.indexOf('stamp') > -1) return '3 Months';
      return '1 Month';
    }
    if(slug.indexOf('vietnam') > -1) return '30 days';
    if(slug.indexOf('48-hours') > -1 || slug.indexOf('96-hours') > -1) return '30 days';
    if(slug.indexOf('united-arab-emirates') > -1 || slug.indexOf('uae') > -1 || slug.indexOf('dubai') > -1) return '58 days';
    if(slug.indexOf('qatar') > -1) return '3 Months';
    if(slug.indexOf('morocco') > -1) return 'Up to 90 days';
    if(slug.indexOf('srilanka') > -1 || slug.indexOf('sri-lanka') > -1) return '6 Months';
    if(slug.indexOf('kenya') > -1) return '3 Months';
    if(slug.indexOf('russia') > -1) return 'As per Embassy';
    if(slug.indexOf('azerbaijan') > -1) return '3 Months';
    if(slug.indexOf('philippines') > -1 && slug.indexOf('multiple') > -1) return '6 Months / 1 Year';
    if(slug.indexOf('philippines') > -1) return '3 Months';
    if(slug.indexOf('oman') > -1) return '3 Months';
    if(slug.indexOf('bahrain') > -1) {
      if(slug.indexOf('one-year') > -1) return '1 year';
      return '30 days';
    }
    if(slug.indexOf('saudi') > -1) {
      if(slug.indexOf('one-year') > -1) return '1 year';
      return '30 days';
    }
    var days = (visa.days != null && visa.days !== '') ? Number(visa.days) : (visa.stay_period_value != null ? Number(visa.stay_period_value) : null);
    if(days) return days + ' days';
    return '30 days';
  }

  function stayText(visa){
    if(!visa) return '';
    if(visa.stay && typeof visa.stay === 'string') return visa.stay;
    var slug = ((visa.slug || visa.id || '') + ' ' + (visa.country_slug || '') + ' ' + (window.currentCountrySlug || '')).toLowerCase();
    if(slug.indexOf('48-hours') > -1) return '2 days';
    if(slug.indexOf('96-hours') > -1) return '4 days';
    if(slug.indexOf('morocco') > -1) return 'Up to 90 days';
    if(slug.indexOf('srilanka') > -1 || slug.indexOf('sri-lanka') > -1) return 'Upto 30 days';
    if(slug.indexOf('kenya') > -1 && slug.indexOf('business') > -1) return '72 Hours';
    if(slug.indexOf('kenya') > -1) return 'As per Embassy';
    if(slug.indexOf('russia') > -1 && slug.indexOf('business') > -1) return '3 Months';
    if(slug.indexOf('russia') > -1) return '30 days';
    if(slug.indexOf('azerbaijan') > -1) return '30 days';
    if(slug.indexOf('philippines') > -1) return 'Upto 59 days';
    var value=(visa.days!=null&&visa.days!=='')?visa.days:visa.stay_period_value;
    if(value!=null&&value!==''&&Number(value)>0){
      var n = Number(value);
      if(slug.indexOf('thailand') > -1){
        if(n === 15) return 'Upto 15 days';
        if(n === 60) return 'Upto 60 days';
        if(n === 90) return 'Upto 90 days';
      }
      return n + ' days';
    }
    return '';
  }

  function entryText(visa){
    var value=String((visa&&visa.sub)||'').trim();
    if(!value) {
      var slug = ((visa&&visa.slug) || (visa&&visa.id) || '').toLowerCase();
      if(slug.indexOf('multiple') > -1) return 'Multiple';
      return 'Single';
    }
    if(/^single\s*entry$/i.test(value)) return 'Single';
    if(/^multiple\s*entry$/i.test(value)) return 'Multiple';
    return value;
  }

  /* ==========================================================================
     Arrival / Travel Date Selection Modal (Exact match to Reference Model)
     ========================================================================== */
  var travelDateModalState = {
    selectedDate: null,
    viewYear: 0,
    viewMonth: 0,
    countryName: '',
    visaVal: '',
    numPersons: 1,
    daysToAdd: 2
  };

  function formatIsoDate(d) {
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1);
    if (month.length < 2) month = '0' + month;
    var day = String(d.getDate());
    if (day.length < 2) day = '0' + day;
    return year + '-' + month + '-' + day;
  }

  function getRecommendedDates(daysToAdd) {
    daysToAdd = daysToAdd || 2;
    var today = new Date();

    var options = [
      { days: daysToAdd + 2, tag: 'Earliest' },
      { days: daysToAdd + 7, tag: 'Recommended', isDefault: true },
      { days: daysToAdd + 14, tag: 'In 2 weeks' },
      { days: daysToAdd + 28, tag: 'Next month' }
    ];

    return options.map(function(opt) {
      var d = new Date(today);
      d.setDate(d.getDate() + opt.days);
      return {
        date: d,
        iso: formatIsoDate(d),
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        tag: opt.tag,
        isDefault: !!opt.isDefault
      };
    });
  }

  function renderRecommendedPills() {
    var modal = ensureTravelDateModalElement();
    var pillsContainer = modal.querySelector('#travelDateRecPills');
    if (!pillsContainer) return;

    var daysToAdd = travelDateModalState.daysToAdd || 2;
    var recs = getRecommendedDates(daysToAdd);
    var selectedIso = travelDateModalState.selectedDate ? formatIsoDate(travelDateModalState.selectedDate) : '';

    var html = '';
    recs.forEach(function(rec) {
      var isActive = (selectedIso === rec.iso);
      html +=
        '<button type="button" class="travel-rec-pill' + (isActive ? ' active' : '') + '" data-date="' + rec.iso + '">' +
          '<div class="travel-rec-pill-left">' +
            '<span class="travel-rec-radio" aria-hidden="true"></span>' +
            '<span class="travel-rec-pill-date">' + rec.label + '</span>' +
            '<span class="travel-rec-pill-weekday">' + rec.weekday + '</span>' +
          '</div>' +
          '<span class="travel-rec-pill-tag">' + rec.tag + '</span>' +
        '</button>';
    });

    pillsContainer.innerHTML = html;
  }

  function ensureTravelDateModalElement() {
    var modal = document.getElementById('travelDateModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'travelDateModal';
    modal.className = 'travel-date-modal';
    modal.setAttribute('hidden', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML =
      '<div class="travel-date-backdrop" data-travel-date-close></div>' +
      '<div class="travel-date-dialog" role="document">' +
        '<button type="button" class="travel-date-close" data-travel-date-close aria-label="Close">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
        '</button>' +

        '<!-- Heading -->' +
        '<h3 class="travel-date-heading">Arrival Date to <span class="travel-date-country-name">Destination</span></h3>' +

        '<!-- Calendar Card -->' +
        '<div class="travel-date-cal-card">' +
          '<div class="travel-date-cal-nav">' +
            '<button type="button" class="travel-date-cal-arrow travel-date-cal-prev" aria-label="Previous month">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
            '</button>' +
            '<div class="travel-date-cal-month-title">--</div>' +
            '<button type="button" class="travel-date-cal-arrow travel-date-cal-next" aria-label="Next month">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
            '</button>' +
          '</div>' +

          '<div class="travel-date-weekdays">' +
            '<span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>' +
          '</div>' +

          '<div class="travel-date-days-grid" id="travelDateDaysGrid"></div>' +
        '</div>' +

        '<!-- Recommended Dates (Collapsible / Hidden until tapped) -->' +
        '<div class="travel-date-rec-section">' +
          '<button type="button" class="travel-date-rec-header" id="travelDateRecToggle" aria-expanded="false" aria-controls="travelDateRecPills">' +
            '<span class="travel-date-rec-header-title">' +
              '<svg class="travel-date-rec-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">' +
                '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
              '</svg>' +
              '<span>Recommended travel dates</span>' +
            '</span>' +
            '<svg class="travel-date-rec-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<polyline points="6 9 12 15 18 9"></polyline>' +
            '</svg>' +
          '</button>' +
          '<div class="travel-date-rec-pills" id="travelDateRecPills" style="display: none;"></div>' +
        '</div>' +

        '<!-- Continue Action -->' +
        '<div class="travel-date-footer">' +
          '<button type="button" class="btn btn-primary travel-date-continue-btn is-disabled" id="travelDateContinueBtn" disabled aria-disabled="true">' +
            'Continue to application <span aria-hidden="true">→</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    modal.querySelectorAll('[data-travel-date-close]').forEach(function(el) {
      el.addEventListener('click', closeTravelDateModal);
    });

    var prevBtn = modal.querySelector('.travel-date-cal-prev');
    var nextBtn = modal.querySelector('.travel-date-cal-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        travelDateModalState.viewMonth--;
        if (travelDateModalState.viewMonth < 0) {
          travelDateModalState.viewMonth = 11;
          travelDateModalState.viewYear--;
        }
        renderTravelCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        travelDateModalState.viewMonth++;
        if (travelDateModalState.viewMonth > 11) {
          travelDateModalState.viewMonth = 0;
          travelDateModalState.viewYear++;
        }
        renderTravelCalendar();
      });
    }

    var recToggle = modal.querySelector('#travelDateRecToggle');
    var recPills = modal.querySelector('#travelDateRecPills');
    if (recToggle && recPills) {
      recToggle.addEventListener('click', function(e) {
        e.preventDefault();
        var isCurrentlyExpanded = recToggle.getAttribute('aria-expanded') === 'true';
        var willExpand = !isCurrentlyExpanded;
        recToggle.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
        recToggle.classList.toggle('active', willExpand);
        recPills.classList.toggle('is-open', willExpand);
        recPills.style.display = willExpand ? 'grid' : 'none';
      });
    }

    var pillsContainer = modal.querySelector('#travelDateRecPills');
    if (pillsContainer) {
      pillsContainer.addEventListener('click', function(e) {
        var pill = e.target.closest('.travel-rec-pill');
        if (!pill) return;
        var dateStr = pill.getAttribute('data-date');
        if (!dateStr) return;

        if (travelDateModalState.selectedDate && formatIsoDate(travelDateModalState.selectedDate) === dateStr) {
          travelDateModalState.selectedDate = null;
        } else {
          var parts = dateStr.split('-');
          var selected = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          travelDateModalState.selectedDate = selected;
          travelDateModalState.viewYear = selected.getFullYear();
          travelDateModalState.viewMonth = selected.getMonth();
        }

        renderRecommendedPills();
        renderTravelCalendar();
        updateTravelDateContinueState();
      });
    }

    var grid = modal.querySelector('#travelDateDaysGrid');
    if (grid) {
      grid.addEventListener('click', function(e) {
        var dayBtn = e.target.closest('.cal-day-selectable');
        if (!dayBtn) return;
        var dateStr = dayBtn.getAttribute('data-date');
        if (!dateStr) return;

        if (travelDateModalState.selectedDate && formatIsoDate(travelDateModalState.selectedDate) === dateStr) {
          travelDateModalState.selectedDate = null;
        } else {
          var parts = dateStr.split('-');
          travelDateModalState.selectedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }

        renderRecommendedPills();
        renderTravelCalendar();
        updateTravelDateContinueState();
      });
    }

    var continueBtn = modal.querySelector('#travelDateContinueBtn');
    if (continueBtn) {
      continueBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!travelDateModalState.selectedDate) return;
        proceedWithSelectedTravelDate();
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
        closeTravelDateModal();
      }
    });

    return modal;
  }

  function updateTravelDateContinueState() {
    var modal = ensureTravelDateModalElement();
    var continueBtn = modal.querySelector('#travelDateContinueBtn');
    if (!continueBtn) return;
    var hasSelected = !!travelDateModalState.selectedDate;
    continueBtn.disabled = !hasSelected;
    continueBtn.classList.toggle('is-disabled', !hasSelected);
    continueBtn.classList.toggle('disabled', !hasSelected);
    if (hasSelected) {
      continueBtn.removeAttribute('aria-disabled');
    } else {
      continueBtn.setAttribute('aria-disabled', 'true');
    }
  }

  function renderTravelCalendar() {
    var modal = ensureTravelDateModalElement();
    var grid = modal.querySelector('#travelDateDaysGrid');
    var monthTitle = modal.querySelector('.travel-date-cal-month-title');
    var prevBtn = modal.querySelector('.travel-date-cal-prev');
    if (!grid || !monthTitle) return;

    var today = new Date();
    var todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    var viewYear = travelDateModalState.viewYear;
    var viewMonth = travelDateModalState.viewMonth;
    var selectedDate = travelDateModalState.selectedDate;

    var dateForTitle = new Date(viewYear, viewMonth, 1);
    var monthName = dateForTitle.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthTitle.textContent = monthName;

    if (prevBtn) {
      var isAtCurrentMonth = (viewYear < today.getFullYear()) || (viewYear === today.getFullYear() && viewMonth <= today.getMonth());
      prevBtn.disabled = isAtCurrentMonth;
      prevBtn.classList.toggle('disabled', isAtCurrentMonth);
    }

    var firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    var daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    var daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    var html = '';

    for (var i = 0; i < firstDayOfWeek; i++) {
      var prevDayNum = daysInPrevMonth - firstDayOfWeek + 1 + i;
      html += '<span class="travel-cal-day cal-day-dimmed">' + prevDayNum + '</span>';
    }

    for (var d = 1; d <= daysInCurrentMonth; d++) {
      var cellDate = new Date(viewYear, viewMonth, d);
      var isToday = (
        cellDate.getFullYear() === todayMidnight.getFullYear() &&
        cellDate.getMonth() === todayMidnight.getMonth() &&
        cellDate.getDate() === todayMidnight.getDate()
      );
      var isPast = cellDate < todayMidnight;
      var iso = formatIsoDate(cellDate);

      var isSelected = selectedDate && (
        selectedDate.getFullYear() === cellDate.getFullYear() &&
        selectedDate.getMonth() === cellDate.getMonth() &&
        selectedDate.getDate() === cellDate.getDate()
      );

      if (isPast) {
        html += '<span class="travel-cal-day cal-day-past cal-day-dimmed">' + d + '</span>';
      } else {
        var cls = 'travel-cal-day cal-day-selectable' + (isToday ? ' cal-day-today' : '') + (isSelected ? ' cal-day-selected' : '');
        html += '<button type="button" class="' + cls + '" data-date="' + iso + '" aria-label="' + iso + '">' + d + '</button>';
      }
    }

    var totalCells = firstDayOfWeek + daysInCurrentMonth;
    var targetCells = totalCells > 35 ? 42 : 35;
    var nextFill = targetCells - totalCells;
    for (var n = 1; n <= nextFill; n++) {
      html += '<span class="travel-cal-day cal-day-dimmed">' + n + '</span>';
    }

    grid.innerHTML = html;
  }

  function showTravelDateModal(opts) {
    opts = opts || {};
    var countryName = opts.countryName || window.currentCountryName || 'Destination';
    var visaVal = opts.visaVal || '';
    var numPersons = opts.numPersons || 1;
    var daysToAdd = opts.daysToAdd || window.selectedVisaDays || 2;

    travelDateModalState.countryName = countryName;
    travelDateModalState.visaVal = visaVal;
    travelDateModalState.numPersons = numPersons;
    travelDateModalState.daysToAdd = daysToAdd;

    // No auto-selection: user selects only if needed
    travelDateModalState.selectedDate = null;

    var today = new Date();
    travelDateModalState.viewYear = today.getFullYear();
    travelDateModalState.viewMonth = today.getMonth();

    var modal = ensureTravelDateModalElement();

    var countryEl = modal.querySelector('.travel-date-country-name');
    if (countryEl) countryEl.textContent = countryName;

    // Reset recommended dates collapse state (hidden by default)
    var recToggle = modal.querySelector('#travelDateRecToggle');
    var recPills = modal.querySelector('#travelDateRecPills');
    if (recToggle && recPills) {
      recToggle.setAttribute('aria-expanded', 'false');
      recToggle.classList.remove('active');
      recPills.classList.remove('is-open');
      recPills.style.display = 'none';
    }

    renderRecommendedPills();
    renderTravelCalendar();
    updateTravelDateContinueState();

    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('travel-date-modal-open');
  }
  window.showTravelDateModal = showTravelDateModal;

  function closeTravelDateModal() {
    var modal = document.getElementById('travelDateModal');
    if (modal) {
      modal.setAttribute('hidden', '');
      modal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('travel-date-modal-open');
  }
  window.closeTravelDateModal = closeTravelDateModal;

  function proceedWithSelectedTravelDate() {
    var s = travelDateModalState;
    if (!s.selectedDate) return;
    var visaVal = s.visaVal;
    var numPersons = s.numPersons || 1;
    var selectedIso = formatIsoDate(s.selectedDate);

    var params = new URLSearchParams();
    params.set('visa', visaVal);
    params.set('travellers', String(numPersons));
    params.set('travel_date', selectedIso);
    try { sessionStorage.setItem('visadoo-selected-travel-date', selectedIso); } catch(_e){}

    if (numPersons > 1) {
      params.set('travellerIndex', '0');
      var people = [];
      for (var i = 0; i < numPersons; i++) {
        people.push({
          name: i === 0 ? 'Primary Applicant' : ('Applicant ' + (i + 1)),
          relation: i === 0 ? 'Self' : 'Traveler',
          submitted: false
        });
      }
      try {
        var draftData = {
          visa: visaVal,
          count: numPersons,
          travellers: people
        };
        if (selectedIso) draftData.travelDate = selectedIso;
        sessionStorage.setItem('visadoo-traveller-draft', JSON.stringify(draftData));
      } catch(_e) {}
    } else {
      try { sessionStorage.removeItem('visadoo-traveller-draft'); } catch(_e) {}
    }

    closeTravelDateModal();
    var localPreview = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
    window.location.href = (localPreview ? 'app.html?' : '/app.html?') + params.toString();
  }

  document.addEventListener('click', function(e){
    var applyBtn = e.target.closest('.visa-card-apply-btn');
    if (applyBtn) {
      e.preventDefault();
      var visaSlug = applyBtn.getAttribute('data-visa-slug') || '';
      if (visaSlug) {
        showTravelDateModal({
          countryName: window.currentCountryName || 'Destination',
          visaVal: visaSlug,
          numPersons: 1,
          daysToAdd: window.selectedVisaDays || 3
        });
      }
    }
  });

  function visaCard(visa){
    var cleanName = (visa.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim();
    var facts=[
      stayText(visa)?'<span><small>Stay</small><b>'+esc(stayText(visa))+'</b></span>':'',
      validityText(visa)?'<span><small>Validity</small><b>'+esc(validityText(visa))+'</b></span>':'',
      visa.sub?'<span><small>Entry</small><b>'+esc(entryText(visa))+'</b></span>':'',
      processingText(visa)?'<span><small>Processing Time</small><b>'+esc(processingText(visa))+'</b></span>':''
    ].filter(Boolean).join('');
    return '<article class="vcard">'+
      '<h3>'+esc(cleanName||'Visa option')+'</h3>'+
      (visa.category?'<div class="vsub">'+esc(visa.category)+'</div>':'')+
      '<div class="price">'+esc(money(priceNumber(visa)))+' <small>/ visa</small></div>'+
      (facts?'<div class="country-visa-facts">'+facts+'</div>':'')+
      '<a href="/app.html?visa='+encodeURIComponent(visa.slug)+'" class="btn btn-primary btn-block visa-card-apply-btn" data-visa-slug="'+encodeURIComponent(visa.slug)+'">Apply now</a>'+
    '</article>';
  }

  var DUBAI_ATTRACTIONS = [
    {
      name: "Burj Khalifa",
      desc: "The tallest building in the world, the Burj Khalifa of Dubai is truly a global iconic landmark. Out of the 160 floors of the building, take a lift to one of the many observation decks on the 125th floor or 148th floor for a spectacular bird's eye view of Dubai. Purchase your tickets online beforehand to avoid long queues to visit the world's best engineering and architectural marvels.",
      price: "₹ 4063/-",
      image: "/assets/attraction-burj-khalifa.jpg"
    },
    {
      name: "Dubai Miracle Garden",
      desc: "A blooming refreshment in the 'desert city', Dubai's Miracle Garden spans across 72,000 sq. mts. and features over 250 million plants and flowers. It has special attractions like the Emirates A380, Sunflower Field, Heart Tunnel, Floating Lady, Teddy Bear and Flower Parade. To explore the world's largest natural flower garden, plan a trip to Dubai between October and April.",
      price: "₹ 13005/-",
      image: "/assets/attraction-miracle-garden.jpg"
    },
    {
      name: "Dubai Mall",
      desc: "A perfect option to entertain the entire family under one roof is one of the world's largest shopping malls - the Dubai Mall. Shop from local or international luxury brands or simply entertain yourself at the mall's 200+ restaurants, 20+ cine screens, an ice-skating rink, a game zone, indoor skiing, a VR Park, the Dubai Aquarium and much more.",
      price: "₹ 999/-",
      image: "/assets/attraction-dubai-mall.jpg"
    },
    {
      name: "Jumeirah Beach",
      desc: "Long stretches of sandy beaches where you can lounge and enjoy the view. Visitors can splash or sail in the warm waters as the Jumeirah beach is free, however, the park has entry fees. Several luxury hotels and skyscrapers form the beach's backdrop making it an Instagram-worthy location in Dubai.",
      price: "₹ 1330/-",
      image: "/assets/attraction-jumeirah-beach.jpg"
    },
    {
      name: "Burj Al Arab",
      desc: "Made on an artificial island, Dubai's finest architectural marvel and an award-winning luxury hotel is the Burj Al Arab. The hotel's exterior looks like a dhow's sail with amenities like a fleet of luxury cars, a private helipad, a private beach and a range of fine dining options. You can either stay here overnight or opt for a 90-minute guided tour of the Burj Al Arab.",
      price: "₹ 12970/-",
      image: "/assets/attraction-burj-al-arab.jpg"
    },
    {
      name: "Museum of the Future",
      desc: "Unlike ordinary museums, the architecturally beautiful Dubai Museum of Future offers a glimpse into the future. Gear up for an interesting experience filled with cutting-edge innovations, high-tech sciences and some cool immersive experiences. Grab your tickets to the Museum of the Future in advance to learn about Dubai's display of the best in technology and the future.",
      price: "₹ 3473/-",
      image: "/assets/attraction-museum-of-future.jpg"
    },
    {
      name: "Dubai Aquarium and Underwater Zoo",
      desc: "Home to more than 33000 aquatic animals, the Dubai Aquarium and Underwater Zoo is a complete family experience. Spend about 2 to 3 hours here, exploring the wonders of the sea.",
      price: "₹ 2703/-",
      image: "/assets/attraction-dubai-aquarium.jpg"
    },
    {
      name: "Dubai Marina",
      desc: "A posh manmade canal city, also known as 'New Dubai', visitors are in for a treat with an exquisite waterfront, high-end shopping options, upscale dining options and overall a great place for spending time outdoors.",
      price: "₹ 999/-",
      image: "/assets/attraction-dubai-marina.jpg"
    },
    {
      name: "Dubai Frame",
      desc: "Adorning Dubai's iconic skyline, the Dubai Frame offers breathtaking panoramic views of Dubai from its SkyBridge on the 48th floor. Enjoy the views from the Dubai Frame from 9am to 9pm every day.",
      price: "₹ 1976/-",
      image: "/assets/attraction-dubai-frame.jpg"
    },
    {
      name: "Deira Souks",
      desc: "Nestled between the Dubai-Sharjah Border and Dubai Creek, Deira houses the Deira Souk or Dubai Gold Souk. Treat yourself to a day full of shopping for gold, platinum, diamonds and emeralds at this traditional market.",
      price: "₹ 999/-",
      image: "/assets/attraction-deira-souks.jpg"
    },
    {
      name: "Ferrari World",
      desc: "One of its kind Ferrari 'themed' Park offering adrenaline-pumping and state-of-the-art rides, simulators, live performances, electric go-karts and everything Ferrari. Book your day out at Ferrari World to not miss out on specials like Flying Aces, the world's highest ride and Formula Rossa, the world's fastest roller coaster.",
      price: "₹ 7382/-",
      image: "/assets/attraction-ferrari-world.jpg"
    },
    {
      name: "Dubai Desert Safari",
      desc: "A Dubai Tour is incomplete without a sandy adventure with adventurous activities like dune buggies, quad biking, camel riding, sandboarding, etc. Continue your desert adventures with desert camping, a scrumptious dinner, belly dancing performances and much more.",
      price: "₹ 2000/-",
      image: "/assets/attraction-desert-safari.jpg"
    },
    {
      name: "Global Village",
      desc: "Be ready to explore a unique open-air theme Park filled with cultural extravaganza. Made of more than 27 pavilions and up to 175 attractions, make the most of your family's day out at Global Village which only opens up between October and April.",
      price: "₹ 999/-",
      image: "/assets/attraction-global-village.jpg"
    }
  ];

  function getAttractionWaLink(attractionName) {
    var num = (window.VISADOO_CONFIG && window.VISADOO_CONFIG.WHATSAPP) || '919074559868';
    return "https://wa.me/" + num.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Hi, I would like to enquire about tickets for " + attractionName + ".");
  }



  function uaeAttractionsDropdownHtml() {
    var cardsHtml = DUBAI_ATTRACTIONS.map(function(item, index) {
      return '<article class="uae-horizontal-card">' +
        '<img src="' + esc(item.image) + '" alt="' + esc(item.name) + '" class="uae-horizontal-card-img" loading="lazy">' +
        '<div class="uae-horizontal-card-info">' +
          '<h3 class="uae-horizontal-card-title">' + (index + 1) + '. ' + esc(item.name) + '</h3>' +
          '<p class="uae-horizontal-card-desc">' + esc(item.desc) + '</p>' +
        '</div>' +
      '</article>';
    }).join('');

    return '<div class="uae-attractions-dropdown" style="display: none;">' +
      '<div class="uae-attractions-wrapper">' +
        '<button class="uae-carousel-arrow uae-carousel-arrow-left" type="button" aria-label="Scroll left">&#8249;</button>' +
        '<div class="uae-horizontal-scroll-container">' +
          cardsHtml +
        '</div>' +
        '<button class="uae-carousel-arrow uae-carousel-arrow-right" type="button" aria-label="Scroll right">&#8250;</button>' +
      '</div>' +
    '</div>';
  }

  function wireUaeAttractionsToggle() {
    var btn = document.querySelector('.uae-attractions-toggle');
    var panel = document.querySelector('.uae-attractions-dropdown');
    if (!btn || !panel) return;
    btn.addEventListener('click', function() {
      var active = btn.classList.toggle('active');
      btn.setAttribute('aria-expanded', String(active));
      panel.style.display = active ? 'block' : 'none';
      panel.classList.toggle('is-open', active);
      if (active) {
        requestAnimationFrame(function(){ window.dispatchEvent(new Event('resize')); });
        setTimeout(function() {
          window.dispatchEvent(new Event('resize'));
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });

    // Also wire up the "Dubai Attractions" navigation link to expand the drawer
    document.querySelectorAll('a[href="#attractions"]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var b = document.querySelector('.uae-attractions-toggle');
        var p = document.querySelector('.uae-attractions-dropdown');
        if (b && p) {
          if (!b.classList.contains('active')) {
            b.click();
          } else {
            p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    });
  }

  function wireUaeCarouselArrows() {
    var panel = document.querySelector('.uae-attractions-dropdown');
    if (!panel) return;
    var container = panel.querySelector('.uae-horizontal-scroll-container');
    var leftArrow = panel.querySelector('.uae-carousel-arrow-left');
    var rightArrow = panel.querySelector('.uae-carousel-arrow-right');
    if (!container || !leftArrow || !rightArrow) return;

    leftArrow.addEventListener('click', function() {
      container.scrollBy({ left: -310, behavior: 'smooth' });
    });

    rightArrow.addEventListener('click', function() {
      container.scrollBy({ left: 310, behavior: 'smooth' });
    });

    var arrowTicking = false;
    function toggleArrows() {
      if (!arrowTicking) {
        window.requestAnimationFrame(function() {
          var scrollLeft = container.scrollLeft;
          var maxScroll = container.scrollWidth - container.clientWidth;
          leftArrow.style.opacity = scrollLeft <= 5 ? '0' : '1';
          leftArrow.style.pointerEvents = scrollLeft <= 5 ? 'none' : 'auto';
          rightArrow.style.opacity = scrollLeft >= maxScroll - 5 ? '0' : '1';
          rightArrow.style.pointerEvents = scrollLeft >= maxScroll - 5 ? 'none' : 'auto';
          arrowTicking = false;
        });
        arrowTicking = true;
      }
    }

    container.addEventListener('scroll', toggleArrows, { passive: true });
    window.addEventListener('resize', toggleArrows, { passive: true });
    setTimeout(toggleArrows, 200);
  }

  function uaeVisaSelector(visas,countryName,countrySummary){
    if(!visas.length) return '';
    countryName=countryName||'Destination';
    var slug = (window.currentCountrySlug || '').toLowerCase();
    var isEvisaModel = slug === 'azerbaijan' || slug === 'azerbaijan-2' || slug === 'kenya' || slug === 'vietnam' || slug === 'morocco' || slug === 'indonesia' || slug === 'thailand' || slug === 'bahrain' || slug === 'russia' || slug === 'turkey' || slug === 'srilanka' || slug === 'sri-lanka' || slug === 'uae' || slug === 'united-arab-emirates' || slug === 'qatar' || slug === 'egypt' || slug === 'egypt-2' || slug === 'philippines' || slug === 'oman' || slug === 'saudi-arabia' || slug === 'saudi';
    
    // Sort visas by stay duration (days)
    var sortedVisas = [].concat(visas).sort(function(a, b){
      var daysA = a.days != null && a.days !== '' ? Number(a.days) : (a.stay_period_value != null ? Number(a.stay_period_value) : 0);
      var daysB = b.days != null && b.days !== '' ? Number(b.days) : (b.stay_period_value != null ? Number(b.stay_period_value) : 0);
      return daysA - daysB;
    });

    var first=sortedVisas[0];
    var isUaeCountry = countryName === 'United Arab Emirates' || countryName === 'UAE';
    var firstCleanName = isUaeCountry ? ((first.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim() || 'Tourist Visa') : (first.name || (countryName + ' Tourist Visa'));
    var choices=sortedVisas.map(function(visa,index){
      var visaName = isUaeCountry ? ((visa.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim() || 'Tourist Visa') : (visa.name || (countryName + ' Tourist Visa'));
      var visaVal = visa.slug || visa.id || (slug ? slug + '-tourist-visa' : 'tourist-visa');
      return '<label class="uae-travel-option-card'+(index===0?' selected':'')+'">'+
        '<input class="uae-visa-option-input uae-v2-radio-hidden" type="radio" name="visa" value="'+esc(visaVal)+'"'+(index===0?' checked':'')+' required'+
        ' data-name="'+esc(visaName||countryName+' visa')+'"'+
        ' data-category="'+esc(visa.category||countryName+' visa')+'"'+
        ' data-stay="'+esc(stayText(visa)||'See visa details')+'"'+
        ' data-validity="'+esc(validityText(visa)||'30 days')+'"'+
        ' data-entry="'+esc(entryText(visa)||visa.category||'See visa details')+'"'+
        ' data-processing="'+esc(processingText(visa)||'3-5 working days')+'"'+
        ' data-raw-price="'+(priceNumber(visa)||0)+'"'+
        ' data-price="'+esc(money(priceNumber(visa)))+'" data-uae-choice>'+
        '<div class="uae-travel-card-header">'+
          '<div class="uae-travel-card-title-group">'+
            '<h3>'+esc(visaName||countryName+' visa')+'</h3>'+
            '<span class="uae-travel-card-cat">'+esc(visa.category||countryName+' tourist visa')+'</span>'+
          '</div>'+
          '<div class="uae-travel-card-price-group">'+
            '<strong>'+esc(money(priceNumber(visa)))+'</strong>'+
            '<small>per applicant</small>'+
          '</div>'+
        '</div>'+
        '<div class="uae-travel-card-specs-panel">'+
          '<div class="uae-travel-spec-item">'+
            '<small>STAY</small>'+
            '<b>'+esc(stayText(visa)||'See details')+'</b>'+
          '</div>'+
          '<div class="uae-travel-spec-item">'+
            '<small>VALIDITY</small>'+
            '<b>'+esc(validityText(visa)||'30 days')+'</b>'+
          '</div>'+
          '<div class="uae-travel-spec-item">'+
            '<small>ENTRY</small>'+
            '<b>'+esc(entryText(visa)||visa.category||'See details')+'</b>'+
          '</div>'+
          '<div class="uae-travel-spec-item">'+
            '<small>PROCESSING TIME</small>'+
            '<b>'+esc(processingText(visa)||'3-5 working days')+'</b>'+
          '</div>'+
        '</div>'+
        '<div class="uae-travel-card-details-expand">'+
          '<ul class="uae-travel-card-benefits">'+
            '<li><span class="uae-benefit-check">✓</span><span>Simple online application</span></li>'+
            '<li><span class="uae-benefit-check">✓</span><span>Secure document upload</span></li>'+
            '<li><span class="uae-benefit-check">✓</span><span>Live status tracking</span></li>'+
          '</ul>'+
          '<div class="uae-travel-card-action-bar">'+
            '<span class="uae-travel-choose-btn">'+
              '<span class="uae-choose-check-circle">✓</span>Choose this visa'+
            '</span>'+
          '</div>'+
        '</div>'+
      '</label>';
    }).join('');

    var summaryText = (countryName === 'United Arab Emirates' || countryName === 'UAE')
      ? 'Fast UAE tourist visas, applied for and tracked online. Choose from 30-day or 60-day tourist visa types with single or multiple entry to visit all seven emirates.'
      : (countrySummary || 'Apply online for your ' + countryName + ' visa with Visa Doo. Tourist and business visas, document upload and live tracking.');

    return '<form class="uae-visa-picker uae-travel-picker-form" action="/app.html" method="get" data-uae-visa-selector>'+
      '<div class="uae-travel-column-left">'+
        '<div class="uae-travel-section">'+
          '<div class="uae-travel-section-header" id="visa-info">'+
            '<h2>Visa Types</h2>'+
            (summaryText ? '<p>'+esc(summaryText)+'</p>' : '')+
          '</div>' +
          '<div class="uae-travel-options-list">'+choices+'</div>'+
        '</div>'+
        uaeRequirementsSection(countryName, slug)+
        uaeProcessSection()+
      '</div>'+
      '<aside class="uae-picker-summary uae-travel-column-right" aria-live="polite" aria-atomic="true">'+
        '<div class="uae-travel-info-card">'+
          '<div class="uae-travel-info-body">'+
            '<h3 data-uae-name>'+esc(firstCleanName||countryName+' visa')+'</h3>'+
            '<p data-uae-category class="uae-travel-info-sub">'+esc(first.category||countryName+' visa')+'</p>'+
            '<div class="uae-stepper-card-section">'+
              '<div class="uae-stepper-row">'+
                '<div class="uae-stepper-label">'+
                  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">'+
                    '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>'+
                  '</svg>'+
                  '<span>Travelers</span>'+
                '</div>'+
                '<div class="uae-stepper-controls">'+
                  '<button type="button" class="uae-stepper-btn uae-stepper-minus" data-uae-step="-1" aria-label="Decrease travelers" disabled>'+
                    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">'+
                      '<circle cx="12" cy="12" r="9"/>'+
                      '<line x1="8" y1="12" x2="16" y2="12"/>'+
                    '</svg>'+
                  '</button>'+
                  '<span class="uae-stepper-count" data-uae-count-val>1</span>'+
                  '<button type="button" class="uae-stepper-btn uae-stepper-plus" data-uae-step="1" aria-label="Increase travelers">'+
                    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">'+
                      '<circle cx="12" cy="12" r="9"/>'+
                      '<line x1="12" y1="8" x2="12" y2="16"/>'+
                      '<line x1="8" y1="12" x2="16" y2="12"/>'+
                    '</svg>'+
                  '</button>'+
                  '<select class="uae-v2-radio-hidden" data-uae-persons-select aria-label="Number of persons">'+
                    '<option value="1">1</option>'+
                    '<option value="2">2</option>'+
                    '<option value="3">3</option>'+
                    '<option value="4">4</option>'+
                    '<option value="5">5</option>'+
                    '<option value="6">6</option>'+
                    '<option value="7">7</option>'+
                    '<option value="8">8</option>'+
                    '<option value="9">9</option>'+
                    '<option value="10">10</option>'+
                  '</select>'+
                '</div>'+
              '</div>'+
              '<div class="uae-price-hero-section">'+
                '<strong class="uae-hero-price" data-uae-price>'+esc(money(priceNumber(first)))+'</strong>'+
                '<span class="uae-hero-subtitle">TO BE PAID NOW</span>'+
                '<small class="uae-fee-breakdown" data-uae-price-breakdown hidden></small>'+
              '</div>'+
              '<button class="btn btn-primary btn-block uae-picker-submit uae-travel-apply-btn" type="submit">'+
                'Apply Now <span aria-hidden="true">&#8594;</span>'+
              '</button>'+
              '<div class="uae-pay-now-row">'+
                '<span class="uae-pay-now-title">'+
                  '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">'+
                    '<path d="M4 10h16v2H4zm0 4h16v2H4zm8-12L2 6v2h20V6L12 2zM4 18h16v2H4z"/>'+
                  '</svg>'+
                  'Total Amount'+
                '</span>'+
                '<strong class="uae-pay-now-amount" data-uae-price>'+esc(money(priceNumber(first)))+'</strong>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</aside>'+
      '<div class="uae-mobile-sticky-bar" id="uaeStickyBottomBar">'+
        '<div class="uae-sticky-bar-content">'+
          '<button type="button" class="btn btn-primary uae-sticky-bar-btn">Apply Now</button>'+
        '</div>'+
      '</div>'+
    '</form>';
  }

  function wireUaeVisaSelector(){
    var widget=root.querySelector('[data-uae-visa-selector]');
    if(!widget) return;
    var choices=widget.querySelectorAll('[data-uae-choice]');
    if(!choices.length) return;
    var personsSelect=widget.querySelector('[data-uae-persons-select]');
    var minusBtn=widget.querySelector('.uae-stepper-minus');
    var plusBtn=widget.querySelector('.uae-stepper-plus');
    var countVal=widget.querySelector('[data-uae-count-val]');

    function update(){
      var choice=widget.querySelector('[data-uae-choice]:checked') || choices[0];
      if(!choice) return;
      ['name','category','stay','validity','entry'].forEach(function(key){
        widget.querySelectorAll('[data-uae-'+key+']').forEach(function(node){
          node.textContent=choice.getAttribute('data-'+key)||'';
        });
      });

      var rawPrice=Number(choice.getAttribute('data-raw-price'))||0;
      var numPersons=personsSelect?Math.max(1,parseInt(personsSelect.value,10)||1):1;
      var totalFee=rawPrice*numPersons;

      if(countVal) countVal.textContent=String(numPersons);
      if(minusBtn) minusBtn.disabled=(numPersons<=1);
      if(plusBtn) plusBtn.disabled=(numPersons>=10);

      widget.querySelectorAll('[data-uae-price]').forEach(function(node){
        node.textContent=money(totalFee);
      });

      widget.querySelectorAll('[data-uae-price-breakdown]').forEach(function(node){
        if(numPersons>1 && rawPrice>0){
          node.textContent='('+money(rawPrice)+' × '+numPersons+' persons)';
          node.hidden=false;
        }else{
          node.hidden=true;
          node.textContent='';
        }
      });

      var processingTimeText = choice.getAttribute('data-processing') || '1-2 days';
      var daysToAdd = 2;
      var match = processingTimeText.match(/(\d+)\s*-\s*(\d+)/) || processingTimeText.match(/(\d+)/);
      if (match) {
        daysToAdd = parseInt(match[match.length - 1], 10) || 2;
      }
      window.selectedVisaDays = daysToAdd;
      var d = new Date();
      d.setDate(d.getDate() + daysToAdd);
      var lang = document.documentElement.lang || 'en';
      var dateStr = d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'short' });
      widget.querySelectorAll('[data-uae-delivery-date]').forEach(function(node){
        node.textContent = dateStr;
      });

      choices.forEach(function(item){
        var label=item.closest('.uae-visa-option, .uae-v2-visa-card, .uae-travel-option-card');
        if(label) label.classList.toggle('selected',item===choice);
      });
    }

    if(minusBtn){
      minusBtn.addEventListener('click',function(e){
        e.preventDefault();
        var current=personsSelect?parseInt(personsSelect.value,10)||1:1;
        if(current>1){
          if(personsSelect) personsSelect.value=String(current-1);
          update();
        }
      });
    }

    if(plusBtn){
      plusBtn.addEventListener('click',function(e){
        e.preventDefault();
        var current=personsSelect?parseInt(personsSelect.value,10)||1:1;
        if(current<10){
          if(personsSelect) personsSelect.value=String(current+1);
          update();
        }
      });
    }

    choices.forEach(function(input){
      input.addEventListener('change', update);
      var label = input.closest('.uae-visa-option, .uae-v2-visa-card, .uae-travel-option-card');
      if(label){
        label.addEventListener('click', function(e){
          if(e.target !== input){
            input.checked = true;
            update();
          }
        });
      }
    });

    if(personsSelect){
      personsSelect.addEventListener('change', update);
    }

    function handleApplySubmit(event){
      if(event) event.preventDefault();
      var selectedVisa = widget.querySelector('[data-uae-choice]:checked') || choices[0];
      if(!selectedVisa) return;
      var visaVal = selectedVisa.value || selectedVisa.getAttribute('value') || '';
      var numPersons = personsSelect ? Math.max(1, parseInt(personsSelect.value, 10) || 1) : 1;

      var processingTimeText = selectedVisa.getAttribute('data-processing') || '1-2 days';
      var daysToAdd = 2;
      var match = processingTimeText.match(/(\d+)\s*-\s*(\d+)/) || processingTimeText.match(/(\d+)/);
      if (match) {
        daysToAdd = parseInt(match[match.length - 1], 10) || 2;
      }

      showTravelDateModal({
        countryName: window.currentCountryName || 'Destination',
        visaVal: visaVal,
        numPersons: numPersons,
        daysToAdd: daysToAdd
      });
    }

    widget.addEventListener('submit', handleApplySubmit);
    var mainApplyBtn = widget.querySelector('.uae-travel-apply-btn, .uae-picker-submit');
    if(mainApplyBtn){
      mainApplyBtn.addEventListener('click', handleApplySubmit);
    }

    var stickyBar = widget.querySelector('#uaeStickyBottomBar');
    var stickyBtn = widget.querySelector('.uae-sticky-bar-btn');
    var visaSection = widget.querySelector('.uae-travel-section');

    if(stickyBtn) {
      stickyBtn.addEventListener('click', function(e) {
        e.preventDefault();
        handleApplySubmit(e);
      });
    }

    if(stickyBar && visaSection) {
      var ticking = false;
      window.addEventListener('scroll', function() {
        if (!ticking) {
          window.requestAnimationFrame(function() {
            var rect = visaSection.getBoundingClientRect();
            // Show sticky bar once user scrolls past the bottom of the visa types section
            if (rect.bottom < 50) {
              stickyBar.classList.add('is-visible');
            } else {
              stickyBar.classList.remove('is-visible');
            }
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }

    update();
  }

  function wireCountryInfoNav(){
    var nav=root.querySelector('.country-info-nav');
    if(!nav) return;
    function getItems(){
      return Array.prototype.map.call(nav.querySelectorAll('a[href^="#"]'),function(link){
        return {link:link,section:root.querySelector(link.getAttribute('href'))};
      }).filter(function(item){return !!item.section;});
    }
    function setActive(activeLink){
      var items=getItems();
      items.forEach(function(item){
        var selected=item.link===activeLink;
        item.link.classList.toggle('active',selected);
        if(selected) item.link.setAttribute('aria-current','location');
        else item.link.removeAttribute('aria-current');
      });
    }
    function update(){
      var items=getItems();
      if(!items.length) return;
      var marker=nav.getBoundingClientRect().bottom+24;
      var active=items[0];
      items.forEach(function(item){if(item.section.getBoundingClientRect().top<=marker) active=item;});
      if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-4) active=items[items.length-1];
      setActive(active.link);
    }
    var queued=false;
    function schedule(){
      if(queued) return;
      queued=true;
      window.requestAnimationFrame(function(){queued=false;update();});
    }
    nav.addEventListener('click',function(event){
      var link=event.target.closest('a[href^="#"]');
      if(link&&nav.contains(link)) setActive(link);
    });
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    new MutationObserver(schedule).observe(nav,{childList:true,subtree:true});
    update();
  }

  function uaeBenefitsSection() {
    return '<div class="uae-travel-section" id="visa-benefits">'+
      '<div class="uae-travel-section-header">'+
        '<h2>Why you should apply UAE eVisa with us</h2>'+
      '</div>'+
      '<div class="uae-benefits-list">'+
        '<div class="uae-benefit-item">'+
          '<span class="uae-benefit-check">✓</span>'+
          '<div>'+
            '<strong>10,000+ visas issued</strong>'+
            '<p>trusted by travellers worldwide</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-benefit-item">'+
          '<span class="uae-benefit-check">✓</span>'+
          '<div>'+
            '<strong>Checked by a specialist</strong>'+
            '<p>a real visa expert reviews every file</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-benefit-item">'+
          '<span class="uae-benefit-check">✓</span>'+
          '<div>'+
            '<strong>Secure payment</strong>'+
            '<p>pay by Visa, Mastercard or Amex</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-benefit-item">'+
          '<span class="uae-benefit-check">✓</span>'+
          '<div>'+
            '<strong>Licensed US company</strong>'+
            '<p>operated by TravelRox, Inc.</p>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function uaeRequirementsSection(countryName, countrySlug){
    var slug = (countrySlug || window.currentCountrySlug || '').toLowerCase();
    if (slug === 'uae' || slug === 'united-arab-emirates' || slug === 'dubai') {
      var uaeReqs = [
        ['Passport (First and last page)', 'Scanned colour copy of first and last page of your valid Passport.'],
        ['Passport size photograph', 'Scanned colour copy of your passport size photograph with white background.'],
        ['Confirmed return flight tickets', 'Confirmed return flight tickets.'],
        ['Hotel booking details', 'Hotel booking details.']
      ];
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header">'+
          '<h2>Visa requirements</h2>'+
          '<p>Prepare these documents before starting your UAE visa application.</p>'+
        '</div>'+
        '<div class="uae-travel-accordions-group">'+uaeReqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+
          '</details>';
        }).join('')+'</div>'+
      '</div>';
    }
    if (slug === 'vietnam') {
      var vietnamReqs = [
        ['Passport Scan Copy', 'Clear, colour scanned copy of your passport\'s first and last page. Your passport must be valid for at least six months from your planned arrival date and have at least two blank pages.'],
        ['Recent Photograph', 'One digital photograph on a plain white background.']
      ];
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header">'+
          '<h2>Documents Required for Vietnam Visa for Indians</h2>'+
          '<p>Prepare these documents before starting your Vietnam visa application.</p>'+
        '</div>'+
        '<div class="uae-travel-accordions-group">'+vietnamReqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+
          '</details>';
        }).join('')+'</div>'+
      '</div>';
    }
    if (slug === 'morocco') {
      var moroccoReqs = [
        ['Original Passport', 'Original Passport with at least 6 months validity and minimum 3 blank pages + all old passports if any.'],
        ['Visa Application Form', 'Completed and signed visa application form.'],
        ['2 Recent Photographs', '2 recent colour photographs with white background and matt finish.'],
        ['Personal Covering Letter', 'Personal covering letter explaining purpose of travel to Morocco.'],
        ['Original Bank Statement', 'Stamped & updated bank statement for last 6 months with bank seal.'],
        ['Air Tickets', 'Proof of return flight tickets from and back to your home country.'],
        ['Hotel Reservation', 'Proof of accommodation for your entire stay.']
      ];
      var supportingDocs = [
        {
          title: '1. If Employed:',
          items: [
            '<strong>Leave Sanctioned Certificate:</strong> With company seal providing approval for leave.',
            '<strong>Salary Slips:</strong> Of last 3 months.'
          ]
        },
        {
          title: '2. If Self Employed:',
          items: [
            '<strong>Business Proof:</strong> Registration License / MOA / Partnership deed.',
            '<strong>Company Bank Statement:</strong> Stamped & updated for last 6 months with bank seal.',
            '<strong>Company’s Income Tax Returns:</strong> Of last 3 years.'
          ]
        },
        {
          title: '3. If Retired:',
          items: [
            '<strong>Retirement Proof:</strong> Pension book, statement etc.'
          ]
        },
        {
          title: '4. If Student:',
          items: [
            '<strong>ID Card:</strong> From school, college or institute.'
          ]
        },
        {
          title: '5. If Minor:',
          items: [
            '<strong>Birth Certificate:</strong> Showing the names of both parents.',
            '<strong>Legalized Letter of Consent (NOC):</strong>' +
              '<ul class="morocco-sub-list">' +
                '<li>If the child is travelling with one parent, the letter of consent authorizing travel must be legalized by the other parent.</li>' +
                '<li>If the child is travelling alone or without either parent, a notarized letter of consent from both parents permitting travel.</li>' +
              '</ul>',
            '<strong>Death Certificate:</strong> In case one or both parents are deceased.',
            '<strong>ID Proof:</strong> Of parents.'
          ]
        },
        {
          title: '6. If Visiting Friend or Relative:',
          items: [
            '<strong>Invitation Letter:</strong> Stating the relationship with the inviter and purpose of visiting the country.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.'
          ]
        },
        {
          title: '7. If Sponsored:',
          items: [
            '<strong>Sponsorship Letter:</strong> Sponsors need to provide the name of the visitors, what the purpose of the visit is, relationship with the visitors, length of stay, dates of travel & any other additional information if necessary.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.',
            '<strong>Proof of Financial Support:</strong> Updated bank statement, pay slips.'
          ]
        },
        {
          title: '8. For Business Visa:',
          items: [
            '<strong>Invitation Letter:</strong> From any Moroccan Company, the signature on the invitation should be legalized by local authorities in Morocco and attested by the bureau of legalization of the Ministry of Foreign Affairs, Morocco, or certified Apostille.',
            '<strong>Business Covering Letter:</strong> From Indian company on company letterhead.'
          ]
        }
      ];

      var supportingHtml = '<div class="morocco-supporting-card">' +
        '<h3>Supporting Documents as per your occupation, type of visit</h3>' +
        '<div class="morocco-supporting-grid">' +
          supportingDocs.map(function(cat) {
            return '<div class="morocco-supporting-item">' +
              '<h4>' + esc(cat.title) + '</h4>' +
              '<ul>' +
                cat.items.map(function(item) {
                  return '<li>' + item + '</li>';
                }).join('') +
              '</ul>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

      return '<div class="uae-travel-section" id="requirements">' +
        '<div class="uae-travel-section-header">' +
          '<h2>Documents Required for Morocco Visa</h2>' +
          '<p>Prepare these primary and supporting documents before submitting your Morocco visa application.</p>' +
        '</div>' +
        '<div class="uae-travel-accordions-group">' + moroccoReqs.map(function(item, index) {
          return '<details class="uae-travel-accordion"' + (index === 0 ? ' open' : '') + '>' +
            '<summary class="uae-travel-accordion-summary"><span>' + esc(item[0]) + '</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>' +
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>' + esc(item[1]) + '</p></div></div></div>' +
          '</details>';
        }).join('') + '</div>' +
        supportingHtml +
      '</div>';
    }
    if (slug === 'qatar') {
      var qatarReqs = [
        ['Original Passport (First & Last Page)', 'Original Passport with at least 6 months validity and minimum 3 blank pages + all old passports if any. Scanned colour copy of first and last page of your Passport.'],
        ['Passport Size Photograph', 'Scanned recent colour copy of your passport size photograph with white background.']
      ];
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header">'+
          '<h2>Documents Required for Qatar Visa</h2>'+
          '<p>Prepare these documents before starting your Qatar visa application.</p>'+
        '</div>'+
        '<div class="uae-travel-accordions-group">'+qatarReqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+
          '</details>';
        }).join('')+'</div>'+
      '</div>';
    }
    if (slug === 'srilanka' || slug === 'sri-lanka') {
      var srilankaReqs = [
        ['Passport (First & Last Page)', 'Scanned copy of first and last page of your Passport. Validity of your passport should be at least 6 months beyond your stay period in Sri Lanka and have minimum 3 blank pages.'],
        ['Confirmed Return Air Ticket', 'Confirmed return flight tickets from and back to your home country.'],
        ['Company Address Details (For Business Visa)', 'Indian company and Sri Lankan company address details (Required for Sri Lanka Business Visa).']
      ];
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header">'+
          '<h2>Documents Required for Sri Lanka e-Visa</h2>'+
          '<p>Prepare these documents before starting your Sri Lanka visa application.</p>'+
        '</div>'+
        '<div class="uae-travel-accordions-group">'+srilankaReqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+
          '</details>';
        }).join('')+'</div>'+
      '</div>';
    }
    if (slug === 'thailand') {
      var thailandReqs = [
        ['Passport Scan Copy', 'Clear, colour scanned copy of your passport\'s first and last page. Your passport must be valid for at least six months from your planned arrival date and have at least two blank pages.'],
        ['Recent Photograph', 'One digital photograph on a plain white background.'],
        ['Return Flight Tickets', 'Confirmed Thailand flight tickets showing your departure from Thailand within the 30-day visa-free period. This proves you do not intend to overstay your visit.'],
        ['Hotel Confirmation', 'Proof of your accommodation for the entire stay, such as Thailand hotel booking vouchers or a letter from a host (if visiting family & friends). It should clearly show your name and the address of your stay in Thailand.']
      ];
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header">'+
          '<h2>Documents Required for Thailand e-Visa</h2>'+
          '<p>Prepare these documents before starting your Thailand visa application.</p>'+
        '</div>'+
        '<div class="uae-travel-accordions-group">'+thailandReqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+
          '</details>';
        }).join('')+'</div>'+
      '</div>';
    }
    if (slug === 'kenya') {
      var kenyaReqs = [
        ['Passport (First & Last Page)', 'Scanned colour copy of first and last page of your Passport.'],
        ['Passport Size Photograph', 'Scanned recent colour passport size photograph with white background.'],
        ['Confirmed Return Flight Ticket', 'Confirmed return flight ticket.'],
        ['Hotel Booking / Proof of Accommodation', 'Hotel booking or Invitation letter, Identity card / Passport / Alien card / Entry permit of the host (If visiting family & friends).'],
        ['Travel Itinerary', 'Travel itinerary (day wise plan).'],
        ['Company Documents (For Business Visa)', 'Invitation letter and Registration Certificate of the company in Kenya (For Business Visa).']
      ];
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header">'+
          '<h2>Documents Required for Kenya Visa</h2>'+
          '<p>Prepare these documents before starting your Kenya visa application.</p>'+
        '</div>'+
        '<div class="uae-travel-accordions-group">'+kenyaReqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+
          '</details>';
        }).join('')+'</div>'+
      '</div>';
    }
    if (slug === 'saudi-arabia' || slug === 'saudi') {
      var saudiReqs = [
        ['Original Passport', 'Original Passport with at least 6 months validity and minimum 3 blank pages + all old passports if any.'],
        ['2 Recent Photographs', '2 Scanned recent colour photograph.'],
        ['Personal Covering Letter', 'Personal Covering letter (For Employed - Plain paper / For Self-Employed – Company Letterhead).'],
        ['Original Bank Statement', 'Stamped & updated for last 6 months with bank seal.'],
        ['Confirmed Flight Tickets', 'Confirmed onward and return flight tickets.'],
        ['Confirmed Hotel Reservations', 'Confirmed hotel reservations.'],
        ['Aadhar Card', 'Aadhar Card.'],
        ['NOC from Employer', 'NOC from the employer.']
      ];
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header">'+
          '<h2>Documents Required for Saudi Arabia Visa</h2>'+
          '<p>Prepare these documents before starting your Saudi Arabia visa application.</p>'+
        '</div>'+
        '<div class="uae-travel-accordions-group">'+saudiReqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+
          '</details>';
        }).join('')+'</div>'+
      '</div>';
    }
    if (slug === 'oman') {
      var omanReqs = [
        ['Passport (First & Last Page)', 'Scanned colour copy of first and last page of your Passport.'],
        ['Passport Size Photograph', 'Scanned recent colour copy of your passport size photograph with blue background.']
      ];
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header">'+
          '<h2>Documents Required for Oman Visa</h2>'+
          '<p>Prepare these documents before starting your Oman visa application.</p>'+
        '</div>'+
        '<div class="uae-travel-accordions-group">'+omanReqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+
          '</details>';
        }).join('')+'</div>'+
      '</div>';
    }
    if (slug === 'philippines') {
      var philippinesReqs = [
        ['Original Passport', 'Original Passport with at least 6 months validity and minimum 3 blank pages + all old passports if any.'],
        ['Visa Application Form', 'Completed visa application form.'],
        ['2 Recent Photographs', '2 recent colour photographs.'],
        ['Personal Covering Letter', 'Personal Covering letter (For Employed - Plain paper / For Self-Employed – Company Letterhead).'],
        ['Original Bank Statement', 'Original updated Bank Statement with sufficient balance (last 6 months).'],
        ['Credit Card Statement / Forex Receipt', 'Credit Card copy and last 3 month’s statement or Foreign exchange receipt.'],
        ['Income Tax Returns / Form 16', 'Income Tax Returns / Form 16 for last 3 years.'],
        ['Confirmed Air Ticket', 'Confirmed return flight tickets.'],
        ['Hotel Confirmation & Payment Receipt', 'Hotel confirmation and payment receipt.'],
        ['Supporting Financial Documents (Optional)', 'Supporting Financial Documents such as Fixed Deposits, Property Investments, Other Investments etc. (Optional).']
      ];
      var supportingDocsPhilippines = [
        {
          title: '1. If Employed:',
          items: [
            '<strong>Original Leave Sanctioned Certificate:</strong> With company seal, signatory’s name and designation.',
            '<strong>Salary Slips:</strong> Last 3 months salary slip with company stamp.'
          ]
        },
        {
          title: '2. If Self Employed:',
          items: [
            '<strong>Business Proof:</strong> Business Registration License / MOA / Partnership deed.',
            '<strong>Company Bank Statement:</strong> Company’s updated bank statement of last 6 months.',
            '<strong>Company’s Income Tax Returns:</strong> Company’s IT returns for last 3 years.'
          ]
        },
        {
          title: '3. If Retired:',
          items: [
            '<strong>Retirement Proof:</strong> Proof of retirement like pension book, statement etc.'
          ]
        },
        {
          title: '4. If Student:',
          items: [
            '<strong>Student ID:</strong> School / College / Institute ID Card.',
            '<strong>Bonafide Certificate:</strong> Official bonafide certificate.'
          ]
        },
        {
          title: '5. If Minor:',
          items: [
            '<strong>Birth Certificate:</strong> Birth Certificate copy.',
            '<strong>Letter of Consent (NOC):</strong> No Objection Certificate from the parents / non-accompanying parent on Rs 100/- stamp paper.',
            '<strong>ID Proof:</strong> ID proof of parent like passport or PAN card.'
          ]
        },
        {
          title: '6. If Visiting Friend or Relative:',
          items: [
            '<strong>Invitation Letter:</strong> Official invitation letter.',
            '<strong>ID Proof of Inviter:</strong> Inviter’s ID proof like Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Address proof like any Electricity bill, any Utility bill etc.'
          ]
        },
        {
          title: '7. If Sponsored:',
          items: [
            '<strong>Sponsorship Letter:</strong> Official sponsorship letter.',
            '<strong>ID Proof of Sponsor:</strong> Sponsor’s national ID proof like Passport, PAN card or Resident permit.',
            '<strong>Bank Statement:</strong> Updated bank statement of last 6 months.',
            '<strong>Income Tax Returns:</strong> Income tax returns of last 3 years.'
          ]
        },
        {
          title: '8. For Business Visa:',
          items: [
            '<strong>Invitation Letter:</strong> From host Company stating purpose of trip, business details etc.',
            '<strong>Business Covering Letter:</strong> From Indian company on company letterhead.'
          ]
        }
      ];

      var supportingHtmlPhilippines = '<div class="morocco-supporting-card">' +
        '<h3>Supporting Documents as per your occupation, type of visit</h3>' +
        '<div class="morocco-supporting-grid">' +
          supportingDocsPhilippines.map(function(cat) {
            return '<div class="morocco-supporting-item">' +
              '<h4>' + esc(cat.title) + '</h4>' +
              '<ul>' +
                cat.items.map(function(item) {
                  return '<li>' + item + '</li>';
                }).join('') +
              '</ul>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

      return '<div class="uae-travel-section" id="requirements">' +
        '<div class="uae-travel-section-header">' +
          '<h2>Documents Required for Philippines Visa</h2>' +
          '<p>Prepare these primary and supporting documents before submitting your Philippines visa application.</p>' +
        '</div>' +
        '<div class="uae-travel-accordions-group">' + philippinesReqs.map(function(item, index) {
          return '<details class="uae-travel-accordion"' + (index === 0 ? ' open' : '') + '>' +
            '<summary class="uae-travel-accordion-summary"><span>' + esc(item[0]) + '</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>' +
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>' + esc(item[1]) + '</p></div></div></div>' +
          '</details>';
        }).join('') + '</div>' +
        supportingHtmlPhilippines +
      '</div>';
    }
    if (slug === 'russia') {
      var russiaReqs = [
        ['Original Passport', 'Original Passport with at least 6 months validity and minimum 3 blank pages + all old passports if any.'],
        ['Visa Application Form', 'Completed and signed visa application form.'],
        ['2 Recent Photographs', '2 recent colour photographs with white background and matt finish.'],
        ['Personal Covering Letter', 'Personal covering letter explaining purpose of travel to Russia.'],
        ['Original Bank Statement', 'Stamped & updated bank statement for last 6 months with bank seal.'],
        ['Air Tickets', 'Proof of return flight tickets from and back to your home country.'],
        ['Tourist Confirmation Letter', 'Issued by a Russian tour operator (registered in the Unified Federal Register of Tour Operators under a unique reference number).']
      ];
      var supportingDocsRussia = [
        {
          title: '1. If Employed:',
          items: [
            '<strong>Leave Sanctioned Certificate:</strong> With company seal providing approval for leave.',
            '<strong>Salary Slips:</strong> Of last 3 months.'
          ]
        },
        {
          title: '2. If Self Employed:',
          items: [
            '<strong>Business Proof:</strong> Registration License / MOA / Partnership deed.',
            '<strong>Company Bank Statement:</strong> Stamped & updated for last 6 months with bank seal.'
          ]
        },
        {
          title: '3. If Retired:',
          items: [
            '<strong>Retirement Proof:</strong> Pension book, statement etc.'
          ]
        },
        {
          title: '4. If Student:',
          items: [
            '<strong>ID Card:</strong> From school, college or institute.'
          ]
        },
        {
          title: '5. If Minor:',
          items: [
            '<strong>Birth Certificate:</strong> Showing the names of both parents.',
            '<strong>Legalized Letter of Consent (NOC):</strong>' +
              '<ul class="morocco-sub-list">' +
                '<li>If the child is travelling with one parent, the letter of consent authorizing travel must be legalized by the other parent.</li>' +
                '<li>If the child is travelling alone or without either parent, a notarized letter of consent from both parents permitting travel.</li>' +
              '</ul>',
            '<strong>Death Certificate:</strong> In case one or both parents are deceased.',
            '<strong>ID Proof:</strong> Of parents.'
          ]
        },
        {
          title: '6. If Visiting Friend or Relative:',
          items: [
            '<strong>Invitation Letter:</strong> Stating the relationship with the inviter and purpose of visiting the country.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.'
          ]
        },
        {
          title: '7. If Sponsored:',
          items: [
            '<strong>Sponsorship Letter:</strong> Sponsors need to provide the name of the visitors, what the purpose of the visit is, relationship with the visitors, length of stay, dates of travel & any other additional information if necessary.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.',
            '<strong>Proof of Financial Support:</strong> Updated bank statement, pay slips.'
          ]
        },
        {
          title: '8. For Business Visa:',
          items: [
            '<strong>Invitation Letter:</strong> From the inviting company in Russia (INN Letter) or a letter of invitation issued by a Main Directorate for Migration Affairs in Russia.',
            '<strong>Business Covering Letter:</strong> From Indian company on company letterhead.'
          ]
        }
      ];

      var supportingHtmlRussia = '<div class="morocco-supporting-card">' +
        '<h3>Supporting Documents as per your occupation, type of visit</h3>' +
        '<div class="morocco-supporting-grid">' +
          supportingDocsRussia.map(function(cat) {
            return '<div class="morocco-supporting-item">' +
              '<h4>' + esc(cat.title) + '</h4>' +
              '<ul>' +
                cat.items.map(function(item) {
                  return '<li>' + item + '</li>';
                }).join('') +
              '</ul>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

      return '<div class="uae-travel-section" id="requirements">' +
        '<div class="uae-travel-section-header">' +
          '<h2>Documents Required for Russia Visa</h2>' +
          '<p>Prepare these primary and supporting documents before submitting your Russia visa application.</p>' +
        '</div>' +
        '<div class="uae-travel-accordions-group">' + russiaReqs.map(function(item, index) {
          return '<details class="uae-travel-accordion"' + (index === 0 ? ' open' : '') + '>' +
            '<summary class="uae-travel-accordion-summary"><span>' + esc(item[0]) + '</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>' +
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>' + esc(item[1]) + '</p></div></div></div>' +
          '</details>';
        }).join('') + '</div>' +
        supportingHtmlRussia +
      '</div>';
    }
    if (slug === 'indonesia') {
      var indonesiaReqs = [
        ['Original Passport', 'Original Passport with at least 6 months validity and minimum 3 blank pages + all old passports if any.'],
        ['2 Recent Photographs', '2 Scanned recent colour photograph.'],
        ['Confirmed Return Flight Ticket', 'Confirmed return flight ticket.'],
        ['Accommodation Proof', 'Accommodation proof (hotel booking or invitation letter if visiting relative/friend).'],
        ['Day-wise Itinerary', 'Day wise itinerary.'],
        ['Financial Funds Proof', 'Sufficient financial funds for the entire trip (cash, debit/credit card etc.).'],
        ['Invitation Letter (For Business Travelers)', 'Invitation letter (for business travelers).']
      ];
      var supportingDocsIndonesia = [
        {
          title: '1. If Employed:',
          items: [
            '<strong>Leave Sanctioned Certificate:</strong> With company seal providing approval for leave.',
            '<strong>Salary Slips:</strong> Of last 3 months.'
          ]
        },
        {
          title: '2. If Self Employed:',
          items: [
            '<strong>Business Proof:</strong> Registration License / MOA / Partnership deed.',
            '<strong>Company Bank Statement:</strong> Stamped & updated for last 6 months with bank seal.',
            '<strong>Company’s Income Tax Returns:</strong> Of last 3 years.'
          ]
        },
        {
          title: '3. If Retired:',
          items: [
            '<strong>Retirement Proof:</strong> Pension book, statement etc.'
          ]
        },
        {
          title: '4. If Student:',
          items: [
            '<strong>ID Card:</strong> From school, college or institute.'
          ]
        },
        {
          title: '5. If Minor:',
          items: [
            '<strong>Birth Certificate:</strong> Showing the names of both parents.',
            '<strong>Legalized Letter of Consent (NOC):</strong>' +
              '<ul class="morocco-sub-list">' +
                '<li>If the child is travelling with one parent, the letter of consent authorizing travel must be legalized by the other parent.</li>' +
                '<li>If the child is travelling alone or without either parent, a notarized letter of consent from both parents permitting travel.</li>' +
              '</ul>',
            '<strong>Death Certificate:</strong> In case one or both parents are deceased.',
            '<strong>ID Proof:</strong> Of parents.'
          ]
        },
        {
          title: '6. If Visiting Friend or Relative:',
          items: [
            '<strong>Invitation Letter:</strong> Stating the relationship with the inviter and purpose of visiting the country & assuring the responsibility for housing and related expenses during the guest\'s stay.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.'
          ]
        },
        {
          title: '7. If Sponsored:',
          items: [
            '<strong>Sponsorship Letter:</strong> Providing the name of the visitors, what the purpose of the visit is, relationship with the visitors, length of stay, dates of travel & any other additional information if necessary.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.',
            '<strong>Proof of Financial Support:</strong> Updated bank statement, pay slips.'
          ]
        },
        {
          title: '8. For Business Visa:',
          items: [
            '<strong>Introduction / Recommendation Letter from:</strong>' +
              '<ul class="morocco-sub-list">' +
                '<li>One of the Chambers of Commerce and Industries, Government of India.</li>' +
                '<li>Ministry of Commerce and Industry of India.</li>' +
                '<li>Export Promotion Council of India, or Reference number from Ministry of Foreign Affairs.</li>' +
              '</ul>',
            '<strong>Registration Certificate of the Company:</strong> From the Ministry of Commerce and Industry of India.',
            '<strong>Income Tax Documents:</strong> Of the last 3 years.',
            '<strong>Company Covering Letter:</strong> Addressed to the embassy introducing the business applicant for visa issuance.',
            '<strong>Local Partner Invitation Letter:</strong> From the local partner or prospective local partner company.',
            '<strong>Partner License (JAWAZ):</strong> Copy of the license of the local partner or prospective local partner company.'
          ]
        }
      ];

      var supportingHtmlIndonesia = '<div class="morocco-supporting-card">' +
        '<h3>Supporting Documents as per your occupation, type of visit</h3>' +
        '<div class="morocco-supporting-grid">' +
          supportingDocsIndonesia.map(function(cat) {
            return '<div class="morocco-supporting-item">' +
              '<h4>' + esc(cat.title) + '</h4>' +
              '<ul>' +
                cat.items.map(function(item) {
                  return '<li>' + item + '</li>';
                }).join('') +
              '</ul>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

      return '<div class="uae-travel-section" id="requirements">' +
        '<div class="uae-travel-section-header">' +
          '<h2>Documents Required for Indonesia Visa</h2>' +
          '<p>Prepare these primary and supporting documents before submitting your Indonesia visa application.</p>' +
        '</div>' +
        '<div class="uae-travel-accordions-group">' + indonesiaReqs.map(function(item, index) {
          return '<details class="uae-travel-accordion"' + (index === 0 ? ' open' : '') + '>' +
            '<summary class="uae-travel-accordion-summary"><span>' + esc(item[0]) + '</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>' +
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>' + esc(item[1]) + '</p></div></div></div>' +
          '</details>';
        }).join('') + '</div>' +
        supportingHtmlIndonesia +
      '</div>';
    }
    if (slug === 'azerbaijan' || slug === 'azerbaijan-2') {
      var azerbaijanReqs = [
        ['Original Passport', 'Original Passport with at least 6 months validity and minimum 3 blank pages + all old passports if any.'],
        ['2 Recent Photographs', '2 Scanned recent colour photograph.'],
        ['Visa Application Form', 'Visa Application forms: completed and signed.'],
        ['Personal Covering Letter', 'Personal Covering letter: explaining purpose of travel to the country.'],
        ['Original Bank Statement', 'Original Bank Statement: stamped & updated for last 3 months with bank seal.'],
        ['Air Tickets', 'Proof of return flight tickets from and back to your home country.'],
        ['Hotel Reservation', 'Proof of accommodation for your entire stay.']
      ];
      var supportingDocsAzerbaijan = [
        {
          title: '1. If Employed:',
          items: [
            '<strong>Leave Sanctioned Certificate:</strong> With company seal providing approval for leave.',
            '<strong>Salary Slips:</strong> Of last 3 months.'
          ]
        },
        {
          title: '2. If Self Employed:',
          items: [
            '<strong>Business Proof:</strong> Registration License / MOA / Partnership deed.',
            '<strong>Company Bank Statement:</strong> Stamped & updated for last 6 months with bank seal.',
            '<strong>Company’s Income Tax Returns:</strong> Of last 3 years.'
          ]
        },
        {
          title: '3. If Retired:',
          items: [
            '<strong>Retirement Proof:</strong> Pension book, statement etc.'
          ]
        },
        {
          title: '4. If Student:',
          items: [
            '<strong>ID Card:</strong> From school, college or institute.'
          ]
        },
        {
          title: '5. If Minor:',
          items: [
            '<strong>Birth Certificate:</strong> Showing the names of both parents.',
            '<strong>Legalized Letter of Consent (NOC):</strong>' +
              '<ul class="morocco-sub-list">' +
                '<li>If the child is travelling with one parent, the letter of consent authorizing travel must be legalized by the other parent.</li>' +
                '<li>If the child is travelling alone or without either parent, a notarized letter of consent from both parents permitting travel.</li>' +
              '</ul>',
            '<strong>Death Certificate:</strong> In case one or both parents are deceased.',
            '<strong>ID Proof:</strong> Of parents.'
          ]
        },
        {
          title: '6. If Visiting Friend or Relative:',
          items: [
            '<strong>Invitation Letter:</strong> Stating the relationship with the inviter and purpose of visiting the country & assuring the responsibility for housing and related expenses during the guest\'s stay in Algeria.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.'
          ]
        },
        {
          title: '7. If Sponsored:',
          items: [
            '<strong>Sponsorship Letter:</strong> Providing the name of the visitors, what the purpose of the visit is, relationship with the visitors, length of stay, dates of travel & any other additional information if necessary.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.',
            '<strong>Proof of Financial Support:</strong> Updated bank statement, pay slips.'
          ]
        },
        {
          title: '8. For Business Visa:',
          items: [
            '<strong>Introduction / Recommendation Letter from:</strong>' +
              '<ul class="morocco-sub-list">' +
                '<li>One of the Chambers of Commerce and Industries, Government of India.</li>' +
                '<li>Ministry of Commerce and Industry of India.</li>' +
                '<li>Export Promotion Council of India, or Reference number from Ministry of Foreign Affairs, Afghanistan.</li>' +
              '</ul>',
            '<strong>Registration Certificate of the Company:</strong> From the Ministry of Commerce and Industry of India.',
            '<strong>Income Tax Documents:</strong> Of the last three years.',
            '<strong>Company Covering Letter:</strong> Addressed to the embassy introducing the business applicant for visa issuance.',
            '<strong>Local Partner Invitation Letter:</strong> From the local partner or prospective local partner company in Afghanistan.',
            '<strong>Partner License (JAWAZ):</strong> Copy of the license of the local partner or prospective local partner company in Afghanistan.'
          ]
        }
      ];

      var supportingHtmlAzerbaijan = '<div class="morocco-supporting-card">' +
        '<h3>Supporting Documents as per your occupation, type of visit</h3>' +
        '<div class="morocco-supporting-grid">' +
          supportingDocsAzerbaijan.map(function(cat) {
            return '<div class="morocco-supporting-item">' +
              '<h4>' + esc(cat.title) + '</h4>' +
              '<ul>' +
                cat.items.map(function(item) {
                  return '<li>' + item + '</li>';
                }).join('') +
              '</ul>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="margin-top:16px;padding:12px 16px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;font-size:12.5px;color:#64748b;line-height:1.5;">' +
          '<strong>*Note:</strong> The Embassy/Consul General has the right to ask for additional information or documents and request a personal interview with the applicant.' +
        '</div>' +
      '</div>';

      return '<div class="uae-travel-section" id="requirements">' +
        '<div class="uae-travel-section-header">' +
          '<h2>Documents Required for Azerbaijan Visa</h2>' +
          '<p>Prepare these primary and supporting documents before submitting your Azerbaijan visa application.</p>' +
        '</div>' +
        '<div class="uae-travel-accordions-group">' + azerbaijanReqs.map(function(item, index) {
          return '<details class="uae-travel-accordion"' + (index === 0 ? ' open' : '') + '>' +
            '<summary class="uae-travel-accordion-summary"><span>' + esc(item[0]) + '</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>' +
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>' + esc(item[1]) + '</p></div></div></div>' +
          '</details>';
        }).join('') + '</div>' +
        supportingHtmlAzerbaijan +
      '</div>';
    }
    if (slug === 'bahrain') {
      var bahrainReqs = [
        ['Passport (First & Last Page)', 'Scanned copy of first and last page of your passport.'],
        ['Recent Photograph', 'Scanned recent colour photograph.'],
        ['Confirmed Return Flight Ticket', 'Confirmed return flight ticket.'],
        ['Host Documents (If Visiting Relative/Friend)', 'Invitation letter, Smart Card & Visa copy of Invitee (If visiting relative or friend in Bahrain).']
      ];
      var supportingDocsBahrain = [
        {
          title: '1. If Employed:',
          items: [
            '<strong>Leave Sanctioned Certificate:</strong> With company seal providing approval for leave.',
            '<strong>Salary Slips:</strong> Of last 3 months.'
          ]
        },
        {
          title: '2. If Self Employed:',
          items: [
            '<strong>Business Proof:</strong> Registration License / MOA / Partnership deed.',
            '<strong>Company Bank Statement:</strong> Stamped & updated for last 6 months with bank seal.',
            '<strong>Company’s Income Tax Returns:</strong> Of last 3 years.'
          ]
        },
        {
          title: '3. If Retired:',
          items: [
            '<strong>Retirement Proof:</strong> Pension book, statement etc.'
          ]
        },
        {
          title: '4. If Student:',
          items: [
            '<strong>ID Card:</strong> From school, college or institute.'
          ]
        },
        {
          title: '5. If Minor:',
          items: [
            '<strong>Birth Certificate:</strong> Showing the names of both parents.',
            '<strong>Legalized Letter of Consent (NOC):</strong>' +
              '<ul class="morocco-sub-list">' +
                '<li>If the child is travelling with one parent, the letter of consent authorizing travel must be legalized by the other parent.</li>' +
                '<li>If the child is travelling alone or without either parent, a notarized letter of consent from both parents permitting travel.</li>' +
              '</ul>',
            '<strong>Death Certificate:</strong> In case one or both parents are deceased.',
            '<strong>ID Proof:</strong> Of parents.'
          ]
        },
        {
          title: '6. If Visiting Friend or Relative:',
          items: [
            '<strong>Invitation Letter:</strong> Stating the relationship with the inviter and purpose of visiting the country & assuring the responsibility for housing and related expenses during the guest\'s stay.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.'
          ]
        },
        {
          title: '7. If Sponsored:',
          items: [
            '<strong>Sponsorship Letter:</strong> Providing the name of the visitors, what the purpose of the visit is, relationship with the visitors, length of stay, dates of travel & any other additional information if necessary.',
            '<strong>ID Proof of Inviter:</strong> Passport or Resident Permit.',
            '<strong>Address Proof of Inviter:</strong> Utility bill.',
            '<strong>Proof of Financial Support:</strong> Updated bank statement, pay slips.'
          ]
        },
        {
          title: '8. For Business Visa:',
          items: [
            '<strong>Introduction / Recommendation Letter from:</strong>' +
              '<ul class="morocco-sub-list">' +
                '<li>One of the Chambers of Commerce and Industries, Government of India.</li>' +
                '<li>Ministry of Commerce and Industry of India.</li>' +
                '<li>Export Promotion Council of India, or Reference number from Ministry of Foreign Affairs.</li>' +
              '</ul>',
            '<strong>Registration Certificate of the Company:</strong> From the Ministry of Commerce and Industry of India.',
            '<strong>Income Tax Documents:</strong> Of the last three years.',
            '<strong>Company Covering Letter:</strong> Addressed to the embassy introducing the business applicant for visa issuance.',
            '<strong>Local Partner Invitation Letter:</strong> From the local partner or prospective local partner company.',
            '<strong>Partner License (JAWAZ):</strong> Copy of the license of the local partner or prospective local partner company.'
          ]
        }
      ];

      var supportingHtmlBahrain = '<div class="morocco-supporting-card">' +
        '<h3>Supporting Documents as per your occupation, type of visit</h3>' +
        '<div class="morocco-supporting-grid">' +
          supportingDocsBahrain.map(function(cat) {
            return '<div class="morocco-supporting-item">' +
              '<h4>' + esc(cat.title) + '</h4>' +
              '<ul>' +
                cat.items.map(function(item) {
                  return '<li>' + item + '</li>';
                }).join('') +
              '</ul>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

      return '<div class="uae-travel-section" id="requirements">' +
        '<div class="uae-travel-section-header">' +
          '<h2>Documents Required for Bahrain Visa</h2>' +
          '<p>Prepare these primary and supporting documents before submitting your Bahrain visa application.</p>' +
        '</div>' +
        '<div class="uae-travel-accordions-group">' + bahrainReqs.map(function(item, index) {
          return '<details class="uae-travel-accordion"' + (index === 0 ? ' open' : '') + '>' +
            '<summary class="uae-travel-accordion-summary"><span>' + esc(item[0]) + '</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>' +
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>' + esc(item[1]) + '</p></div></div></div>' +
          '</details>';
        }).join('') + '</div>' +
        supportingHtmlBahrain +
      '</div>';
    }
    var isEvisaModel = slug === 'azerbaijan' || slug === 'azerbaijan-2' || slug === 'kenya' || slug === 'vietnam' || slug === 'morocco' || slug === 'indonesia' || slug === 'thailand' || slug === 'bahrain' || slug === 'russia' || slug === 'turkey' || slug === 'srilanka' || slug === 'sri-lanka' || slug === 'qatar' || slug === 'egypt' || slug === 'egypt-2' || slug === 'philippines' || slug === 'oman' || slug === 'saudi-arabia' || slug === 'saudi';
    if(!isEvisaModel && (countryName === 'Denmark' || countryName === 'Spain' || countryName === 'South Korea' || countryName === 'Switzerland' || countryName === 'Ireland' || countryName === 'France' || countryName === 'Germany' || countryName === 'Greece' || countryName === 'China' || countryName === 'Sri Lanka')){
      var reqs = [];
      var details = [];
      var detailsHeader = '';
      if(countryName === 'South Korea') {
        reqs = [
          ['Passport','Passport valid.'],
          ['Qatar ID','Qatar ID (valid more than 3 months from the entry date of Korea).'],
          ['Passport size photo','Passport size photo (White background).'],
          ['Employment letter','Recent employment letter from your employer.'],
          ['Residency Permit Certificate','Certificate which is mentioned your Residency Permit details, including first entry (issuance date) and the expiry date; Apply for \'To Whom It May Concern\' certificate through online Metrash and print.'],
          ['Company Establishment & CR Cards','Company’s establishment card (Front and back side printed in one page) and English commercial registration that valid more than 3 months from entry date of Korea.'],
          ['3 Months Bank Statement','Original bank statement showing 3 months salaries.'],
          ['Travel Record Copy','Copy of previous 5 years of travel record such as exit-entry stamp or visa page on the passport, if you have traveled and applicable. The last entry date to Qatar record must be included.']
        ];
        detailsHeader = 'Required details';
        details = [
          'Qatar residence Address',
          'Phone number',
          'Email address',
          'Home country address',
          'Highest education school name',
          'School address',
          'Employer name (Name of the company)',
          'Company address',
          'Company phone number',
          'Date of arrival in Korea',
          'Date of return',
          'Your last 5 year travel history (purpose of travel, period of stay)',
          'Number of children you have',
          'Marital status (including Spouse name, DOB, nationality, contact number, and residence address if married)'
        ];
      } else if(countryName === 'Ireland') {
        reqs = [
          ['Passport','Passport (6 Months validity required).'],
          ['Qatar ID','Qatar ID (3 months validity required from the date of return).'],
          ['Passport size Photo','Recently taken passport-size photo with a white background.'],
          ['Travel records photocopy','Photocopy of your bio page, all visa & immigration stamps for all travel.'],
          ['Last 6 months bank statement','Original bank statement showing latest 6 months transaction history (Sealed and signed).'],
          ['Employment letter & Salary certificate','Recent employment letter and salary certificate from your employer.'],
          ['Application form','We will provide a dummy application form.'],
          ['Hotel booking','Hotel booking will be provided by us.'],
          ['Flight ticket','We will provide a dummy flight ticket.'],
          ['Appointment','Visa appointment will be booked and provided by us.']
        ];
        detailsHeader = 'Required details';
        details = [
          'Mobile number',
          'Email address',
          'Arrival date and return date',
          'Residence address in Qatar',
          'Length of stay in Qatar',
          'Employer name (company name)',
          'Employment joined date',
          'Position',
          'Employer address (company address)',
          'Employer phone number',
          'Employer mail id',
          'Wife’s surname',
          'Wife’s Given name',
          'Wife’s date of birth',
          'Kid’s Surname',
          'Kid’s Given name',
          'Kid’s Gender'
        ];
      } else if(countryName === 'Azerbaijan') {
        reqs = [
          ['Passport','Passport valid for a minimum of 6 months.'],
          ['Passport size photo','Recent passport-size photo with a white background.'],
          ['Qatar ID','Clear copy of your valid Qatar ID.']
        ];
        detailsHeader = 'Required details for Azerbaijan';
        details = [
          'Travel Date',
          'Return Date',
          'Marital Status',
          'Residence Address',
          'Pincode',
          'Phone Number',
          'Mail ID',
          'Current Occupation'
        ];
      } else if(countryName === 'Sri Lanka') {
        reqs = [
          ['Passport','Clear copy of your valid passport.'],
          ['Passport size photo','Recent passport-size photo.']
        ];
        detailsHeader = 'Required details for Sri Lanka';
        details = [
          'Travel Date',
          'Residential Address',
          'Email',
          'Phone Number',
          'Address in Sri Lanka'
        ];
      } else if(countryName === 'China') {
        reqs = [
          ['Passport','Passport valid for a minimum of 6 months.'],
          ['Qatar ID','Clear copy of your valid Qatar ID.'],
          ['Passport size photo','Recent passport-size photo with a white background.'],
          ['Employment letter','Recent employment letter from your employer.']
        ];
        detailsHeader = 'Required details for China';
        details = [
          'Phone Number',
          'Email ID',
          'Travel Date',
          'Return Date',
          'Residential Address in Qatar',
          'Employer Name and Address',
          'Job Position',
          'Employer Contact No',
          'Joining Date',
          'Father Name',
          'Father DOB',
          'Mother\'s Name',
          'Mother DOB',
          'Spouse Name',
          'Spouse DOB',
          'Spouse\'s Place of Birth',
          'Education Details',
          'Last Institution Name',
          'Course of Study',
          'Previous Travel',
          'History for the Last 1 Year'
        ];
      } else if(countryName === 'France' || countryName === 'Germany' || countryName === 'Greece') {
        reqs = [
          ['Passport','Passport valid for a minimum of 6 months.'],
          ['Passport size photo','Recent passport-size photo with a white background.'],
          ['Last 6 months bank statement','Provide your latest 6 months bank statement.'],
          ['Qatar ID','Clear copy of your valid Qatar ID.'],
          ['Employment letter','Recent employment letter from your employer.'],
          ['Previous Schengen visa copy','Upload a previous Schengen visa copy only if you have one.']
        ];
        detailsHeader = 'Required details for Schengen';
        details = [
          'Travel Date',
          'Return Date',
          'Arrival Airport',
          'Departure Airport',
          'Marital Status',
          'Residence Address',
          'Pincode',
          'Phone Number',
          'Mail ID',
          'Employer / School Name',
          'Employer / School Address',
          'Job Position',
          'Employer / School Number',
          'Employer / School Mail ID'
        ];
      } else {
        reqs = [
          ['Passport','Passport valid for a minimum of 6 months.'],
          ['Passport size photo','Recent passport-size photo with a white background.'],
          ['Last 6 months bank statement','Provide your latest 6 months bank statement.'],
          ['Qatar ID','Clear copy of your valid Qatar ID.'],
          ['Employment letter','Recent employment letter from your employer.'],
          ['Previous Schengen visa copy','Upload a previous Schengen visa copy only if you have one.']
        ];
        detailsHeader = 'Required details for Schengen';
        details = [
          'Residence address',
          'Mobile number',
          'Email address',
          'Current Occupation',
          'Employer name',
          'Employer Address',
          'Employer phone number',
          'Date of arrival',
          'Date of return'
        ];
      }
      var processingTime = (countryName === 'Ireland') ? '10–45 Days' : '5–20 working days';
      return '<div class="uae-travel-section" id="requirements">'+
        '<div class="uae-travel-section-header"><h2>Tourist visa requirements</h2><p>Prepare these documents before starting your ' + esc(countryName) + ' visa application.</p></div>'+ 
        '<div class="denmark-processing-note"><strong>Processing time</strong><span>' + esc(processingTime) + '</span></div>'+ 
        '<div class="uae-travel-accordions-group">'+reqs.map(function(item,index){
          return '<details class="uae-travel-accordion"'+(index===0?' open':'')+'>'+ 
            '<summary class="uae-travel-accordion-summary"><span>'+esc(item[0])+'</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+ 
            '<div class="uae-travel-accordion-body"><div class="uae-req-details-content"><div class="uae-req-details-text"><p>'+esc(item[1])+'</p></div></div></div>'+ 
          '</details>';
        }).join('')+'</div>'+ 
        '<div class="schengen-details-note">'+
          '<h3>'+esc(detailsHeader)+'</h3>'+
          '<ul>'+details.map(function(d){return '<li>'+esc(d)+'</li>';}).join('')+'</ul>'+
        '</div>'+
      '</div>';
    }
    var isSaudi = slug === 'saudi-arabia' || slug === 'saudi';
    return '<div class="uae-travel-section" id="requirements">'+
      '<div class="uae-travel-section-header">'+
        '<h2>Visa requirements</h2>'+ 
      '</div>' +
      '<div class="uae-travel-accordions-group">'+
        '<details class="uae-travel-accordion" open>'+ 
          '<summary class="uae-travel-accordion-summary"><span>Passport photo</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+ 
          '<div class="uae-travel-accordion-body">'+
            '<div class="uae-req-details-content">'+
              '<div class="uae-req-details-text">'+
                '<p>A clear color copy of your passport\'s front and back pages. All four corners must be visible, and the text must be readable.</p>'+ 
                '<div class="uae-req-box-stat">'+
                  '<strong>07 MIN</strong>'+ 
                  '<span data-translate-key="avgTime">AVG. TIME TAKEN TO APPLY</span>'+ 
                '</div>'+ 
              '</div>'+ 
              '<div class="uae-req-details-image">'+
                '<img src="/assets/uae-documents/passport-front-back-bw.jpg" alt="Passport front and back example" loading="lazy">'+
              '</div>'+ 
            '</div>'+ 
          '</div>'+ 
        '</details>'+ 
        '<details class="uae-travel-accordion">'+
          '<summary class="uae-travel-accordion-summary"><span>Personal photo</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+ 
          '<div class="uae-travel-accordion-body">'+
            '<div class="uae-req-details-content">'+
              '<div class="uae-req-details-text">'+
                '<p>A recent color photograph taken against a plain light/white background. The face must be clearly visible and front-facing.</p>'+ 
                '<div class="uae-req-box-stat">'+
                  '<strong>03 MIN</strong>'+ 
                  '<span data-translate-key="fastestTime">FASTEST TIME TAKEN TO APPLY</span>'+ 
                '</div>'+ 
              '</div>'+ 
              '<div class="uae-req-details-image">'+
                '<img src="/assets/uae-documents/personal-photo-bw.jpg" alt="Personal photo example" loading="lazy">'+
              '</div>'+ 
            '</div>'+ 
          '</div>'+ 
        '</details>'+ 
        (isSaudi ?
        '<details class="uae-travel-accordion">'+
          '<summary class="uae-travel-accordion-summary"><span>PAN Card</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+ 
          '<div class="uae-travel-accordion-body">'+
            '<div class="uae-req-details-content">'+
              '<div class="uae-req-details-text">'+
                '<p>A clear copy of your valid PAN card. All details including PAN number, name, and photograph must be clearly visible and readable.</p>'+ 
                '<div class="uae-req-box-stat">'+
                  '<strong>02 MIN</strong>'+ 
                  '<span>PAN CARD VERIFICATION</span>'+ 
                '</div>'+ 
              '</div>'+ 
              '<div class="uae-req-details-image">'+
                '<img src="/assets/uae-documents/pan-card.jpg?v=20260904-pan-new" alt="PAN card example" loading="lazy">'+
              '</div>'+ 
            '</div>'+ 
          '</div>'+ 
        '</details>'+
        '<details class="uae-travel-accordion">'+
          '<summary class="uae-travel-accordion-summary"><span>IQAMA</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+ 
          '<div class="uae-travel-accordion-body">'+
            '<div class="uae-req-details-content">'+
              '<div class="uae-req-details-text">'+
                '<p>A clear copy of your valid Iqama (Residence Permit). Must be valid and all details clearly readable.</p>'+ 
                '<div class="uae-req-box-stat">'+
                  '<strong>02 MIN</strong>'+ 
                  '<span>RESIDENCE PERMIT CHECK</span>'+ 
                '</div>'+ 
              '</div>'+ 
              '<div class="uae-req-details-image">'+
                '<img src="/assets/uae-documents/iqama.jpg?v=20260904-iqama-new" alt="Iqama example" loading="lazy">'+
              '</div>'+ 
            '</div>'+ 
          '</div>'+ 
        '</details>' : '')+
        (slug === 'thailand' || slug === 'bahrain' ?
        '<details class="uae-travel-accordion">'+
          '<summary class="uae-travel-accordion-summary"><span>Bank statement</span><i class="uae-accordion-icon" aria-hidden="true"></i></summary>'+ 
          '<div class="uae-travel-accordion-body">'+
            '<div class="uae-req-details-content">'+
              '<div class="uae-req-details-text">'+
                '<p>Original latest 3 months bank statement showing regular transactions and sufficient funds for your trip.</p>'+ 
                '<div class="uae-req-box-stat">'+
                  '<strong>03 MONTHS</strong>'+ 
                  '<span>VALID BANK STATEMENT</span>'+ 
                '</div>'+ 
              '</div>'+ 
              '<div class="uae-req-details-image">'+
                '<img src="/assets/uae-documents/bank-statement-bw.jpg" alt="Bank statement example" loading="lazy">'+
              '</div>'+ 
            '</div>'+ 
          '</div>'+ 
        '</details>' : '')+
      '</div>'+ 
    '</div>';
  }

  function uaeProcessSection(){
    return '<div class="uae-travel-section" id="visa-process">'+
      '<div class="uae-travel-section-header">'+
        '<h2>What happens after you apply</h2>'+
      '</div>' +
      '<div class="uae-timeline-process">'+
        '<div class="uae-timeline-item uae-travel-step-item">'+
          '<div class="uae-timeline-badge">✓</div>'+
          '<div class="uae-timeline-content">'+
            '<strong>Apply online</strong>'+
            '<p>Fill in the short form and upload your passport, photo, ticket and accommodation. Pay securely in USD.</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-timeline-item uae-travel-step-item">'+
          '<div class="uae-timeline-badge">✓</div>'+
          '<div class="uae-timeline-content">'+
            '<strong>We verify and submit</strong>'+
            '<p>A specialist checks your file and the UAE security clearance - WhatsApp ping if anything needs fixing.</p>'+
          '</div>'+
        '</div>'+
        '<div class="uae-timeline-item uae-travel-step-item">'+
          '<div class="uae-timeline-badge">✓</div>'+
          '<div class="uae-timeline-content">'+
            '<strong>Get your VisaDoo</strong>'+
            '<p>Apply today and get your PDF VisaDoo by <strong data-uae-delivery-date></strong>.</p>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function countryHeroTitle(country) {
    if (!country) return 'Apply Visa';
    var slug = (country.slug || '').toLowerCase();
    var name = country.name || '';
    var group = (country.group || country.group_name || '').toLowerCase();

    // If explicitly in e-visa group or slug is an eVisa clone (e.g. azerbaijan-2)
    if (group === 'e-visa' || group === 'evisa' || slug === 'azerbaijan-2' || slug.indexOf('-evisa') > -1) {
      return 'Apply ' + name + ' eVisa';
    }
    if (group === 'schengen' || slug.indexOf('-schengen') > -1) {
      return 'Apply ' + name + ' Schengen Visa';
    }

    // Schengen destinations
    var SCHENGEN_COUNTRIES = [
      'denmark', 'spain', 'switzerland', 'france', 'germany', 'greece', 'azerbaijan',
      'italy', 'netherlands', 'portugal', 'austria', 'belgium', 'sweden',
      'norway', 'finland', 'poland', 'czech-republic', 'hungary', 'estonia',
      'latvia', 'lithuania', 'luxembourg', 'malta', 'slovakia', 'slovenia',
      'iceland', 'croatia'
    ];
    if (SCHENGEN_COUNTRIES.indexOf(slug) > -1) {
      return 'Apply ' + name + ' Schengen Visa';
    }

    // Specific eVisa / ETA destinations
    var EVISA_COUNTRIES = {
      'vietnam': 'Apply Vietnam eVisa',
      'kenya': 'Apply Kenya eVisa',
      'morocco': 'Apply Morocco eVisa',
      'turkey': 'Apply Turkey eVisa',
      'russia': 'Apply Russia eVisa',
      'indonesia': 'Apply Indonesia eVisa',
      'srilanka': 'Apply Sri Lanka eVisa',
      'sri-lanka': 'Apply Sri Lanka eVisa',
      'india': 'Apply India eVisa',
      'egypt': 'Apply Egypt eVisa',
      'cambodia': 'Apply Cambodia eVisa',
      'thailand': 'Apply Thailand eVisa',
      'bahrain': 'Apply Bahrain eVisa',
      'oman': 'Apply Oman eVisa',
      'saudi-arabia': 'Apply Saudi Arabia eVisa',
      'qatar': 'Apply Qatar eVisa',
      'uae': 'Apply UAE eVisa',
      'united-arab-emirates': 'Apply UAE eVisa'
    };
    if (EVISA_COUNTRIES[slug]) {
      return EVISA_COUNTRIES[slug];
    }

    if (slug === 'uae' || slug === 'united-arab-emirates') {
      return 'Apply UAE eVisa';
    }
    if (slug === 'japan') {
      return 'Apply Japan Visa';
    }
    if (slug === 'south-korea') {
      return 'Apply South Korea Visa';
    }
    if (slug === 'ireland') {
      return 'Apply Ireland Visa';
    }
    if (slug === 'china') {
      return 'Apply China Visa';
    }
    if (slug === 'thailand') {
      return 'Apply Thailand eVisa';
    }
    if (slug === 'bahrain') {
      return 'Apply Bahrain eVisa';
    }

    return 'Apply ' + name + ' Visa';
  }

  function countryBannerSubtitle(country) {
    var slug = (country && (country.slug || country.id) || '').toLowerCase().replace(/-\d+$/, '');
    var descs = {
      'bahrain': 'Fast & official Bahrain tourist eVisa. Explore Manama, historic forts, vibrant souqs, and island heritage with 100% online processing.',
      'united-arab-emirates': 'Official UAE & Dubai tourist visas (30 & 60 days). Quick processing, transparent fees, and hassle-free online application.',
      'uae': 'Official UAE & Dubai tourist visas (30 & 60 days). Quick processing, transparent fees, and hassle-free online application.',
      'dubai': 'Official UAE & Dubai tourist visas (30 & 60 days). Quick processing, transparent fees, and hassle-free online application.',
      'qatar': 'Official Qatar tourist eVisa with express processing. Explore Doha’s modern skyline, culture, and coastal luxury.',
      'saudi-arabia': 'Official Saudi tourist eVisa. Explore Riyadh, Jeddah, AlUla, and spiritual destinations with fast digital approval.',
      'oman': 'Official Oman tourist eVisa. Discover Muscat, majestic mountain canyons, wadis, and Arabian heritage with simple online application.',
      'kuwait': 'Official Kuwait tourist eVisa. Simple online application with fast processing for seamless travel to Kuwait.',
      'azerbaijan': 'Official Azerbaijan ASAN eVisa. Explore Baku’s Flame Towers, Old City, and the Caspian Sea with quick 100% online approval.',
      'thailand': 'Official Thailand tourist visa & eVisa. Experience Bangkok, pristine tropical islands, and rich culture with easy online application.',
      'indonesia': 'Official Indonesia (Bali) tourist eVisa. Explore Bali’s beaches, temples, and lush landscapes with fast digital approval.',
      'vietnam': 'Official Vietnam tourist eVisa. Discover Hanoi, Ha Long Bay, and Da Nang with quick 100% digital processing.',
      'malaysia': 'Official Malaysia tourist eVisa / MDAC. Experience Kuala Lumpur, rainforests, and island getaways with fast online processing.',
      'singapore': 'Official Singapore entry visa with expert verification. Discover Marina Bay, Gardens by the Bay, and world-class attractions.',
      'japan': 'Official Japan tourist visa guidance & application. Experience Tokyo, Kyoto, Mount Fuji, and rich Japanese culture.',
      'south-korea': 'Official South Korea tourist visa & K-ETA. Discover Seoul, K-Culture, Jeju Island, and historic palaces with easy online application.',
      'china': 'China tourist and business visa assistance with expert document review, fast submission, and guided processing.',
      'sri-lanka': 'Official Sri Lanka tourist ETA / eVisa. Explore Colombo, Sigiriya, tea plantations, and golden beaches with quick online approval.',
      'srilanka': 'Official Sri Lanka tourist ETA / eVisa. Explore Colombo, Sigiriya, tea plantations, and golden beaches with quick online approval.',
      'kenya': 'Official Kenya electronic travel authorization (eTA). Experience Masai Mara safaris, wildlife, and breathtaking savannah landscapes.',
      'tanzania': 'Official Tanzania tourist eVisa. Discover Serengeti wildlife migrations, Mount Kilimanjaro, and Zanzibar beaches.',
      'egypt': 'Official Egypt tourist eVisa. Explore the Great Pyramids of Giza, Nile River cruises, and ancient history with easy online application.',
      'morocco': 'Official Morocco tourist eVisa. Explore Marrakech, Casablanca, Chefchaouen, and imperial cities with simple 100% online processing.',
      'turkey': 'Official Turkey tourist eVisa. Discover Istanbul, Cappadocia hot air balloons, and Mediterranean coastlines with fast online approval.',
      'armenia': 'Official Armenia tourist eVisa. Discover Yerevan, historic monasteries, and Caucasian mountain landscapes with simple digital processing.',
      'georgia': 'Official Georgia tourist eVisa. Explore Tbilisi, ancient wine regions, and Caucasus peaks with quick online processing.',
      'uzbekistan': 'Official Uzbekistan tourist eVisa. Discover the Silk Road wonders of Samarkand, Bukhara, and Khiva with fast digital approval.',
      'russia': 'Official Russia tourist eVisa. Discover Moscow, St. Petersburg, and iconic landmarks with quick online processing.',
      'france': 'France Schengen tourist visa assistance. Explore Paris, the Eiffel Tower, French Riviera, and world-class art with guided processing.',
      'germany': 'Germany Schengen tourist visa assistance. Discover Berlin, Bavarian castles, Munich, and scenic landscapes with expert guidance.',
      'italy': 'Italy Schengen tourist visa assistance. Explore Rome, Venice canals, Florence, and the Amalfi Coast with guided application.',
      'spain': 'Spain Schengen tourist visa assistance. Discover Barcelona, Madrid, Andalusia, and Mediterranean coastlines with expert document support.',
      'switzerland': 'Switzerland Schengen tourist visa assistance. Experience the Swiss Alps, Zurich, Geneva, and pristine lakes with guided processing.',
      'greece': 'Greece Schengen tourist visa assistance. Explore Athens, Santorini, Mykonos, and Aegean islands with guided document preparation.',
      'denmark': 'Denmark Schengen tourist visa assistance. Experience Copenhagen, Nordic culture, and Scandinavian charm with guided application.',
      'austria': 'Austria Schengen tourist visa assistance. Discover Vienna, Salzburg, Alpine scenery, and imperial palaces with expert guidance.',
      'netherlands': 'Netherlands Schengen tourist visa assistance. Explore Amsterdam canals, tulip gardens, and Dutch culture with guided application.',
      'belgium': 'Belgium Schengen tourist visa assistance. Discover Brussels, Bruges, Ghent, and European heritage with expert document support.',
      'czech-republic': 'Czech Republic Schengen tourist visa assistance. Explore Prague’s historic bridges, castles, and Bohemian beauty with guided processing.',
      'hungary': 'Hungary Schengen tourist visa assistance. Discover Budapest, the Danube River, and thermal baths with guided application support.',
      'portugal': 'Portugal Schengen tourist visa assistance. Explore Lisbon, Porto, Algarve beaches, and coastal wonders with guided support.',
      'united-kingdom': 'Standard UK Visitor Visa assistance. Explore London, Edinburgh, historic castles, and British heritage with complete expert guidance.',
      'uk': 'Standard UK Visitor Visa assistance. Explore London, Edinburgh, historic castles, and British heritage with complete expert guidance.',
      'united-states': 'US B1/B2 Visitor Visa assistance. Expert DS-160 preparation, slot tracking, and embassy interview guidance.',
      'usa': 'US B1/B2 Visitor Visa assistance. Expert DS-160 preparation, slot tracking, and embassy interview guidance.',
      'canada': 'Canada Visitor Visa assistance. Discover Toronto, Vancouver, Banff, and Niagara Falls with comprehensive application support.',
      'australia': 'Australia Visitor Visa assistance. Explore Sydney, the Great Barrier Reef, and Melbourne with guided digital processing.',
      'new-zealand': 'New Zealand Visitor Visa / NZeTA assistance. Explore Auckland, Queenstown, and scenic wonders with guided processing.'
    };
    return descs[slug] || (country && country.seo_description) || ('Official ' + ((country && country.name) || 'visa') + ' application with guided steps, fast review, and 100% secure processing.');
  }

  var COUNTRY_GALLERIES = {
    "morocco": {
        "title": "Explore Morocco: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Chefchaouen-the-blue-city-of-morocco-with-palm-trees-and-the-mountain-view-in-the-backrgound.jpg/1920px-Chefchaouen-the-blue-city-of-morocco-with-palm-trees-and-the-mountain-view-in-the-backrgound.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Chefchaouen Blue Medina",
                "landmark": "Chefchaouen"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Pavillon_Menarag%C3%A4rten.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Historic Marrakech & Menara Gardens",
                "landmark": "Marrakesh"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/c/ce/Hassan_II_mosque%2C_Casablanca_2.jpg/1920px-Hassan_II_mosque%2C_Casablanca_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Hassan II Mosque, Casablanca",
                "landmark": "Hassan II Mosque"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Merzouga_Dunes_2011.jpg/1920px-Merzouga_Dunes_2011.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sahara Desert Golden Dunes, Merzouga",
                "landmark": "Erg Chebbi"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Ksar_A%C3%AFt_Benhaddou%2C_Marocco_%28%D8%A3%D9%8A%D8%AA_%D8%A8%D9%86_%D8%AD%D8%AF%D9%88%D8%8C_%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8%2C_%E2%B4%B0%E2%B5%A2%E2%B5%9C_%E2%B5%83%E2%B4%B0%E2%B4%B7%E2%B4%B7%E2%B5%93%29.jpg/1920px-Ksar_A%C3%AFt_Benhaddou%2C_Marocco_%28%D8%A3%D9%8A%D8%AA_%D8%A8%D9%86_%D8%AD%D8%AF%D9%88%D8%8C_%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8%2C_%E2%B4%B0%E2%B5%A2%E2%B5%9C_%E2%B5%83%E2%B4%B0%E2%B4%B7%E2%B4%B7%E2%B5%93%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Aït Benhaddou UNESCO Clay Fortress",
                "landmark": "Aït Benhaddou"
            }
        ],
        "description": "Experience the enchanting colors, rich imperial heritage, and majestic landscapes of Morocco. From the labyrinthine alleys and spice souks of Marrakech and Fes to the striking cobalt-blue streets of Chefchaouen, the golden dunes of the Sahara, and coastal Essaouira, Morocco offers an unforgettable journey. Apply for your Morocco Tourist or Business eVisa with guided document verification, fast turnaround, and 100% digital submission."
    },
    "united-arab-emirates": {
        "title": "Explore United Arab Emirates: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg/1920px-Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Burj Khalifa & Downtown Dubai",
                "landmark": "Burj Khalifa"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/en/7/7d/Sheikh_Zayed_Mosque_view.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Sheikh Zayed Grand Mosque, Abu Dhabi",
                "landmark": "Sheikh Zayed Grand Mosque"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/8/8c/Museum_of_the_future%2C_Dubai.jpeg/1920px-Museum_of_the_future%2C_Dubai.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Museum of the Future, Dubai",
                "landmark": "Museum of the Future"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/3/30/Artificial_Archipelagos%2C_Dubai%2C_United_Arab_Emirates_ISS022-E-024940_lrg_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Palm Jumeirah Island",
                "landmark": "Palm Jumeirah"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Dubai_Marina_Skyline.jpg/1920px-Dubai_Marina_Skyline.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Dubai Marina Luxury Waterfront",
                "landmark": "Dubai Marina"
            }
        ],
        "description": "Discover the breathtaking fusion of modern luxury and Arabian hospitality across Dubai, Abu Dhabi, and the Northern Emirates. Explore world-record architectural marvels like Burj Khalifa and Museum of the Future, tranquil desert dunes, pristine Arabian Gulf beaches, and world-class shopping. Apply for 30-day or 60-day single and multiple entry UAE eVisas with express 12 to 24-hour options."
    },
    "qatar": {
        "title": "Explore Qatar: Visas",
        "photos": [
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/2/26/The_Pearl_Marina_in_Nov_2013.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Doha West Bay Waterfront Skyline",
                "landmark": "Doha"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/c/c7/Museum_of_Islamic_Art_in_Doha%2C_Qatar_%2832673171432%29.jpg/1920px-Museum_of_Islamic_Art_in_Doha%2C_Qatar_%2832673171432%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Museum of Islamic Art",
                "landmark": "Museum of Islamic Art, Doha"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Souq_Waqif%2C_Doha%2C_Catar%2C_2013-08-05%2C_DD_84.JPG/1920px-Souq_Waqif%2C_Doha%2C_Catar%2C_2013-08-05%2C_DD_84.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Historic Souq Waqif Heritage Market",
                "landmark": "Souq Waqif"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/Building_under_construction_at_Qanat_Quartier_in_The_Pearl-Qatar.jpg/1920px-Building_under_construction_at_Qanat_Quartier_in_The_Pearl-Qatar.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "The Pearl Qatar Island Marina",
                "landmark": "The Pearl Island"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Doha_Qatar_-_Masjid_Katara.jpg/1920px-Doha_Qatar_-_Masjid_Katara.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Katara Cultural Village Amphitheatre",
                "landmark": "Katara Cultural Village"
            }
        ],
        "description": "Qatar combines futuristic architecture, rich heritage, and world-class luxury on the Arabian Gulf. Discover the magnificent Museum of Islamic Art, stroll through the vibrant spice markets of Souq Waqif, and witness the golden desert meeting the sea at Khor Al Adaid. Obtain your Qatar Tourist eVisa or Hayya Entry Permit with fast online verification."
    },
    "bahrain": {
        "title": "Explore Bahrain: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/f/f1/Bahrain_WTC.JPG/1920px-Bahrain_WTC.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Bahrain World Trade Center, Manama",
                "landmark": "Bahrain World Trade Center"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/AlFatehMosque.jpg/1920px-AlFatehMosque.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Al Fateh Grand Mosque",
                "landmark": "Al Fateh Grand Mosque"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Bahrain_Fort_March_2015.JPG/1920px-Bahrain_Fort_March_2015.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Qal'at al-Bahrain Ancient UNESCO Fort",
                "landmark": "Qal'at al-Bahrain"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Bab_Al_Bahrain%2C_Manama%2C_Bar%C3%A9in%2C_2024-08-18%2C_DD_72.jpg/1920px-Bab_Al_Bahrain%2C_Manama%2C_Bar%C3%A9in%2C_2024-08-18%2C_DD_72.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Bab Al Bahrain Historic Gateway",
                "landmark": "Bab Al Bahrain"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Bahrain_International_Circuit--Grand_Prix_Layout.svg/1920px-Bahrain_International_Circuit--Grand_Prix_Layout.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Bahrain International F1 Circuit",
                "landmark": "Bahrain International Circuit"
            }
        ],
        "description": "Known as the Pearl of the Gulf, the Kingdom of Bahrain offers an enticing mix of ancient Dilmun civilization history, Formula 1 racing adrenaline, and welcoming cosmopolitan charm. Stroll through the traditional alleyways of Manama Souq, visit UNESCO World Heritage forts, and relax on island beaches. Apply for your Bahrain Tourist eVisa in minutes."
    },
    "saudi-arabia": {
        "title": "Explore Saudi Arabia: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Al_Ula_%286748577917%29.jpg/1920px-Al_Ula_%286748577917%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "AlUla Ancient Hegra Heritage",
                "landmark": "Al-Ula"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Kingdom_Centre_Riyadh_2024.jpeg/1920px-Kingdom_Centre_Riyadh_2024.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Kingdom Centre Tower, Riyadh",
                "landmark": "Kingdom Centre"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Old_Jeddah_%28Al_Balad%29_architecture_3_Feb_2022.jpg/1920px-Old_Jeddah_%28Al_Balad%29_architecture_3_Feb_2022.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Al-Balad Historic Coral Stone District",
                "landmark": "Al-Balad, Jeddah"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Masmak_Fort_%2812753717253%29.jpg/1920px-Masmak_Fort_%2812753717253%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Historic Masmak Clay Fortress, Riyadh",
                "landmark": "Masmak fort"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Jeddah_Corniche_36.jpg/1920px-Jeddah_Corniche_36.jpg",
                "caption": "Jeddah Waterfront Corniche & Red Sea",
                "landmark": "Jeddah Corniche"
            }
        ],
        "description": "A land of monumental history and transformative visionary ambition, Saudi Arabia welcomes travelers to explore the ancient Nabataean wonders of AlUla, the vibrant UNESCO heritage of Jeddah's Al-Balad, the ultra-modern capital Riyadh, and untouched Red Sea coral reefs. Apply for your Saudi Tourist eVisa or Umrah Visa with fast approval."
    },
    "oman": {
        "title": "Explore Oman: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/5/5b/Sultan_Qaboos_Grand_Mosque_RB.jpg/1920px-Sultan_Qaboos_Grand_Mosque_RB.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sultan Qaboos Grand Mosque, Muscat",
                "landmark": "Sultan Qaboos Grand Mosque"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Aerial_view_of_the_coastline_of_Muttrah.jpg/1920px-Aerial_view_of_the_coastline_of_Muttrah.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Muttrah Corniche & Traditional Harbor",
                "landmark": "Muttrah"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Jebel_Akhdar_view.jpg/1920px-Jebel_Akhdar_view.jpg",
                "caption": "Historic Nizwa Castle & Oasis",
                "landmark": "Nizwa Fort"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/Jebel_Akhdar_view.jpg/1920px-Jebel_Akhdar_view.jpg",
                "caption": "Jebel Akhdar Green Mountain Terraces",
                "landmark": "Jebel Akhdar (Oman)"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Rub_al_Khali_002.JPG/1920px-Rub_al_Khali_002.JPG",
                "caption": "Empty Quarter Golden Sand Sea",
                "landmark": "Rub' al Khali"
            }
        ],
        "description": "Oman is a captivating Sultanate of dramatic fjord-like coastlines, turquoise wadi canyons, historic desert forts, and warm Arabian hospitality. Hike through Wadi Shab, witness the sunset across Sharqiya Sands, and explore the aromatic frankincense souqs of Muscat and Salalah. Apply for your Oman Tourist eVisa with fast 5-6 day online processing."
    },
    "egypt": {
        "title": "Explore Egypt: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Pyramids_of_the_Giza_Necropolis.jpg/1920px-Pyramids_of_the_Giza_Necropolis.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Great Pyramids of Giza & Sphinx",
                "landmark": "Giza pyramid complex"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/1550_bis_1070_v._Chr._ca._wurde_der_Tempel_von_Luxor_erbaut._01.jpg/1920px-1550_bis_1070_v._Chr._ca._wurde_der_Tempel_von_Luxor_erbaut._01.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Luxor Temple on the Nile River",
                "landmark": "Luxor Temple"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Ramsis%2C_Aswan_Governorate%2C_Egypt_-_panoramio.jpg/1920px-Ramsis%2C_Aswan_Governorate%2C_Egypt_-_panoramio.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Abu Simbel Monumental Colossi",
                "landmark": "Abu Simbel temples"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Temple_de_Louxor_68.jpg/1920px-Temple_de_Louxor_68.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Karnak Great Hypostyle Temple Complex",
                "landmark": "Karnak"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/0/0c/Luxor%2C_Tal_der_K%C3%B6nige_%281995%2C_860x605%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Valley of the Kings Pharaoh Tombs",
                "landmark": "Valley of the Kings"
            }
        ],
        "description": "Journey back through thousands of years of human civilization in Egypt. Gaze at the monumental Pyramids of Giza, cruise down the eternal Nile to Luxor and Aswan, admire royal tombs in the Valley of the Kings, and relax along pristine Red Sea coral resorts in Sharm El Sheikh. Secure your Egypt Tourist eVisa with fast, hassle-free processing."
    },
    "turkey": {
        "title": "Explore Türkiye: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Hagia_Sophia_%28228968325%29.jpeg/1920px-Hagia_Sophia_%28228968325%29.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Hagia Sophia Grand Byzantine Landmark",
                "landmark": "Hagia Sophia"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg/1920px-Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Cappadocia Fairy Chimneys & Balloons",
                "landmark": "Cappadocia"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Pamukkale%2C_Denizli_2026_68.jpg/1920px-Pamukkale%2C_Denizli_2026_68.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Pamukkale Thermal Travertine Terraces",
                "landmark": "Pamukkale"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Istanbul_%2834223582516%29_%28cropped%29.jpg/1920px-Istanbul_%2834223582516%29_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sultan Ahmed Blue Mosque",
                "landmark": "Blue Mosque, Istanbul"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Ephesus_Celsus_Library_Fa%C3%A7ade.jpg/1920px-Ephesus_Celsus_Library_Fa%C3%A7ade.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Ephesus Library of Celsus Ancient Ruins",
                "landmark": "Ephesus"
            }
        ],
        "description": "Bridging Europe and Asia, Türkiye is a treasure trove of ancient empires, fairytale landscape chimneys, and vibrant bazaar culture. Witness hundreds of hot air balloons drifting above Cappadocia at dawn, marvel at the grandeur of Hagia Sophia and the Blue Mosque in Istanbul, and swim in the azure waters of Bodrum and Antalya. Apply for your official Türkiye eVisa in 1-2 days."
    },
    "thailand": {
        "title": "Explore Thailand: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg/1920px-%E0%B9%80%E0%B8%88%E0%B8%94%E0%B8%B5%E0%B8%A2%E0%B9%8C%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%98%E0%B8%B2%E0%B8%99%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%9B%E0%B8%A3%E0%B8%B2%E0%B8%87%E0%B8%84%E0%B9%8C%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%AD%E0%B8%A3%E0%B8%B8%E0%B8%932.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Wat Arun Temple of Dawn, Bangkok",
                "landmark": "Wat Arun"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/0005574_-_Wat_Phra_Kaew_006.jpg/1920px-0005574_-_Wat_Phra_Kaew_006.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Grand Palace & Wat Phra Kaew",
                "landmark": "Grand Palace"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/KohPhiPhi.JPG/1920px-KohPhiPhi.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Phi Phi Islands Emerald Lagoon",
                "landmark": "Phi Phi Islands"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Wat_Rong_Khun_-_Chiang_Rai.jpg/1920px-Wat_Rong_Khun_-_Chiang_Rai.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Wat Rong Khun White Temple, Chiang Rai",
                "landmark": "Wat Rong Khun"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Ayutthaya_World_Heritage_sign.jpg/1920px-Ayutthaya_World_Heritage_sign.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Ayutthaya UNESCO Siamese Heritage",
                "landmark": "Ayutthaya Historical Park"
            }
        ],
        "description": "Known as the Land of Smiles, Thailand captivates travelers with ornate Buddhist temples, turquoise tropical waters, vibrant night bazaars, and delectable street cuisine. Whether you are exploring the bustling metropolis of Bangkok, scuba diving around Phuket and Koh Samui, or exploring the misty peaks of Chiang Mai, get ready for an unforgettable journey. Apply for your Thailand eVisa / Visa-on-Arrival assistance effortlessly."
    },
    "vietnam": {
        "title": "Explore Vietnam: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Ha_Long_Bay_in_2019.jpg/1920px-Ha_Long_Bay_in_2019.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Hạ Long Bay Emerald Waters & Karsts",
                "landmark": "Hạ Long Bay"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Dragon_Bridge%2C_Da_Nang_during_day_-_20230819_%28cropped%29.jpg/1920px-Dragon_Bridge%2C_Da_Nang_during_day_-_20230819_%28cropped%29.jpg",
                "caption": "Dragon Bridge, Da Nang",
                "landmark": "Da Nang"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Golden_Bridge_at_Ba_Na_Hills_20250718.jpg/1920px-Golden_Bridge_at_Ba_Na_Hills_20250718.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Ba Na Hills Giant Golden Bridge",
                "landmark": "Golden Bridge (Vietnam)"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/0/08/Muaxuantamcoc.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Tràng An & Ninh Bình River Sanctuaries",
                "landmark": "Tràng An Scenic Landscape Complex"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/b/b9/%C4%90%E1%BA%A1i_n%E1%BB%99i.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Imperial City of Huế Citadel",
                "landmark": "Imperial City of Huế"
            }
        ],
        "description": "Immerse yourself in Vietnam's awe-inspiring limestone karsts, vibrant lantern-lit historic alleys, and world-renowned culinary culture. From cruising along emerald waters of Ha Long Bay to savoring authentic Pho in Hanoi, strolling across Hoi An’s ancient bridges, and relaxing on tropical Phu Quoc beaches, Vietnam is a traveler’s paradise. Secure your official Vietnam 30-day or 90-day eVisa online in just a few clicks."
    },
    "indonesia": {
        "title": "Explore Indonesia: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Pura_Ulun_Danu_Bratan%2C_2022.jpg/1920px-Pura_Ulun_Danu_Bratan%2C_2022.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Ulun Danu Beratan Water Temple, Bali",
                "landmark": "Pura Ulun Danu Bratan"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Pradaksina.jpg/1920px-Pradaksina.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Borobudur Monumental Buddhist Temple, Java",
                "landmark": "Borobudur"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Prambanan_Temple_Yogyakarta_Indonesia.jpg/1920px-Prambanan_Temple_Yogyakarta_Indonesia.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Prambanan Ancient Hindu Temple Compound",
                "landmark": "Prambanan"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/8/8e/Bromo-Semeru-Batok-Widodaren.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Mount Bromo Volcanic Sunrise",
                "landmark": "Mount Bromo"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Broken_Bay%2C_Nusa_Penida.jpg/1920px-Broken_Bay%2C_Nusa_Penida.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Nusa Penida Kelingking Cliffs",
                "landmark": "Nusa Penida"
            }
        ],
        "description": "An archipelago of over 17,000 islands, Indonesia is a tropical wonderland of lush volcanic landscapes, sacred Hindu and Buddhist temples, vibrant coral reefs, and world-class surf breaks. From spiritual retreats in Ubud to sun-drenched beaches in Bali and dramatic sunrises over Mount Bromo, Indonesia is an unforgettable getaway. Apply for your Indonesia electronic Visa on Arrival (e-VoA) easily."
    },
    "sri-lanka": {
        "title": "Explore Sri Lanka: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Sigiriya_%28141688197%29.jpeg/1920px-Sigiriya_%28141688197%29.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sigiriya Ancient Lion Rock Palace",
                "landmark": "Sigiriya"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1920px-The_Nine_Arches_Bridge.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Ella Nine Arches Scenic Viaduct",
                "landmark": "Nine Arch Bridge, Demodara"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Galle_Fort.jpg/1920px-Galle_Fort.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Historic Galle Coastal Dutch Fort",
                "landmark": "Galle Fort"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/SL_Kandy_asv2020-01_img33_Sacred_Tooth_Temple.jpg/1920px-SL_Kandy_asv2020-01_img33_Sacred_Tooth_Temple.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sacred Temple of the Tooth, Kandy",
                "landmark": "Temple of the Tooth"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/3/34/Dambulla-buddhastupa.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Dambulla Golden Cave Monasteries",
                "landmark": "Dambulla cave temple"
            }
        ],
        "description": "The Pearl of the Indian Ocean, Sri Lanka boasts emerald tea highlands, ancient UNESCO rock fortresses, pristine palm-fringed coastlines, and thrilling wildlife safaris. Explore Sigiriya, ride the scenic train through Ella's mist-covered hills, and watch sunset at Galle Fort. Apply for your official Sri Lanka ETA / eVisa with express 24-48 hour approval."
    },
    "philippines": {
        "title": "Explore Philippines: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/El_Nido_Bay_December_2018.jpg/1920px-El_Nido_Bay_December_2018.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "El Nido Secret Lagoons & Limestone Cliffs",
                "landmark": "El Nido, Palawan"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/c/cd/Boracay_White_Beach.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Boracay White Sand Beach Sunset",
                "landmark": "Boracay"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/a/af/Chocolate_Hills_Bohol.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Bohol Famous Chocolate Hills",
                "landmark": "Chocolate Hills"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Banaue-terrace.JPG/1920px-Banaue-terrace.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Banaue UNESCO Ancient Rice Terraces",
                "landmark": "Banaue Rice Terraces"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Coron_skyline_Tapyas_%28Coron%2C_Palwan%3B_03-16-2024%29.jpg/1920px-Coron_skyline_Tapyas_%28Coron%2C_Palwan%3B_03-16-2024%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Coron Island Crystal Waters & Lakes",
                "landmark": "Coron, Palawan"
            }
        ],
        "description": "With over 7,000 tropical islands, the Philippines is famous for emerald lagoons, powdery white sand beaches, world-renowned diving, and friendly hospitality. Island-hop in Palawan, dive WWII shipwrecks in Coron, or surf the barrels of Siargao. Apply for your Philippines Visitor Visa and electronic Travel Declaration (eTravel) quickly."
    },
    "singapore": {
        "title": "Explore Singapore: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Marina_Bay_Sands_%28I%29.jpg/1920px-Marina_Bay_Sands_%28I%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Marina Bay Sands & Waterfront Skyline",
                "landmark": "Marina Bay Sands"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Supertree_Grove%2C_Gardens_by_the_Bay%2C_Singapore_-_20120712-02.jpg/1920px-Supertree_Grove%2C_Gardens_by_the_Bay%2C_Singapore_-_20120712-02.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Gardens by the Bay Supertrees",
                "landmark": "Gardens by the Bay"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Jewel_Changi_Airport_13-11-2023%281%29.jpg/1920px-Jewel_Changi_Airport_13-11-2023%281%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Jewel Changi Rain Vortex Waterfall",
                "landmark": "Jewel Changi Airport"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/1_sentosa_aerial_2016.jpg/1920px-1_sentosa_aerial_2016.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sentosa Island Resort Coast",
                "landmark": "Sentosa"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Aerial_perspective_of_Singapore%27s_Chinatown.jpg/1920px-Aerial_perspective_of_Singapore%27s_Chinatown.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Historic Singapore Chinatown Shophouses",
                "landmark": "Chinatown, Singapore"
            }
        ],
        "description": "Singapore is the City in a Garden, blending futuristic architecture, lush urban flora, world-class entertainment, and rich multicultural heritage. Marvel at Supertrees in Gardens by the Bay, indulge in legendary hawker food, and enjoy family attractions on Sentosa Island. Apply for your Singapore Tourist eVisa with fast, guided document processing."
    },
    "malaysia": {
        "title": "Explore Malaysia: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bc/Petronas_Towers_Logo.svg/1920px-Petronas_Towers_Logo.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Petronas Twin Towers, Kuala Lumpur",
                "landmark": "Petronas Towers"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Batu_Caves_stairs_2022-05.jpg/1920px-Batu_Caves_stairs_2022-05.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Batu Caves Golden Statue & Limestone Shrine",
                "landmark": "Batu Caves"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Skyline_of_George_Town%2C_Penang_at_night_Nov2024-29-17.jpg/1920px-Skyline_of_George_Town%2C_Penang_at_night_Nov2024-29-17.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "George Town UNESCO Heritage & Murals",
                "landmark": "George Town, Penang"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg/1920px-Kinabalu_Sabah_Borneo_Kampong_Kundasang_panorama_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Mount Kinabalu Majestic Borneo Peak",
                "landmark": "Mount Kinabalu"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Eagle_square_at_Kuah_Langkawi.jpg/1920px-Eagle_square_at_Kuah_Langkawi.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Langkawi Archipelago & Turquoise Coast",
                "landmark": "Langkawi"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of Malaysia. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official Malaysia visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "georgia": {
        "title": "Explore Georgia: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Gergeti_Trinity_Church_09.23.jpg/1920px-Gergeti_Trinity_Church_09.23.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Gergeti Trinity Church & Mt. Kazbek",
                "landmark": "Gergeti Trinity Church"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Tbilisi_IMG_8846_1920.jpg/1920px-Tbilisi_IMG_8846_1920.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Narikala Fortress Overlooking Old Tbilisi",
                "landmark": "Narikala"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Middle_ages_Basilica_on_the_top_of_the_cave%2C_Uplistsikhe_20230920_%28II%29.jpg/1920px-Middle_ages_Basilica_on_the_top_of_the_cave%2C_Uplistsikhe_20230920_%28II%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Uplistsikhe Ancient Cave Town",
                "landmark": "Uplistsikhe"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Historical_Svaneti_in_modern_international_borders_of_Georgia.svg/1920px-Historical_Svaneti_in_modern_international_borders_of_Georgia.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Svaneti Defensive Towers in the Caucasus",
                "landmark": "Svaneti"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/USS_Oak_Hill%2C_26th_MEU_Marines_Visit_Batumi%2C_Georgia_%2840817303032%29.jpg/1920px-USS_Oak_Hill%2C_26th_MEU_Marines_Visit_Batumi%2C_Georgia_%2840817303032%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Batumi Seaside Boulevard & Modern Architecture",
                "landmark": "Batumi"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of Georgia. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official Georgia visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "azerbaijan": {
        "title": "Explore Azerbaijan: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/0/08/Flame_towers_baku.jpg/1920px-Flame_towers_baku.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Baku Flame Towers & Promenade",
                "landmark": "Flame Towers"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/d/d3/Heydar_Aliyev_Cultural_Center.jpg/1920px-Heydar_Aliyev_Cultural_Center.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Heydar Aliyev Center Fluid Architecture",
                "landmark": "Heydar Aliyev Center"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/%C4%B0%C3%A7%C9%99ri%C5%9F%C9%99h%C9%99r_kollaj%C4%B1.jpg/1920px-%C4%B0%C3%A7%C9%99ri%C5%9F%C9%99h%C9%99r_kollaj%C4%B1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Icherisheher Old City & Maiden Tower",
                "landmark": "Old City (Baku)"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Qobustan_giri%C5%9F_qayas%C4%B1_2026_%281%29.jpg/1920px-Qobustan_giri%C5%9F_qayas%C4%B1_2026_%281%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Gobustan Mud Volcanoes & Petroglyphs",
                "landmark": "Gobustan National Park"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/2/29/%C5%9E%C9%99ki_xan_saray%C4%B1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Palace of Shaki Khans Ornate Stained Glass",
                "landmark": "Palace of Shaki Khans"
            }
        ],
        "description": "Known as the Land of Fire, Azerbaijan seamlessly bridges eastern traditions and western modernism. Marvel at Baku’s iconic Flame Towers and fluid Zaha Hadid architecture, wander ancient stone alleys in Icherisheher, and take in the majestic Caucasus mountain peaks in Shahdag and Gabala. Get your official ASAN Azerbaijan eVisa approved in 1 to 3 days."
    },
    "kenya": {
        "title": "Explore Kenya: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Masai_Mara_at_Sunset.jpg/1920px-Masai_Mara_at_Sunset.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Maasai Mara Great Savannah Safari",
                "landmark": "Maasai Mara"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Lions_of_Kenya_02.jpg/1920px-Lions_of_Kenya_02.jpg",
                "caption": "Lions of Nairobi National Park",
                "landmark": "Nairobi National Park"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Lake-Nakuru-Baboon-Hill-View.JPG/1920px-Lake-Nakuru-Baboon-Hill-View.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Lake Nakuru National Bird Sanctuary",
                "landmark": "Lake Nakuru"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/MtKenya.jpg/1920px-MtKenya.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Mount Kenya Alpine Peaks",
                "landmark": "Mount Kenya"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/4/41/Fort_Jesus_at_the_Mombasa_Island.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Historic Fort Jesus, Coastal Mombasa",
                "landmark": "Fort Jesus"
            }
        ],
        "description": "Kenya is Africa's premier wildlife destination, home to the legendary Great Migration across the golden savannahs of the Masai Mara, elephant herds framed against Mount Kilimanjaro, and tropical coral beaches in Diani. Apply for the official Kenya Electronic Travel Authorisation (eTA) in just 1 to 2 days."
    },
    "russia": {
        "title": "Explore Russia: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Saint_Basil%27s_Cathedral_in_Moscow.jpg/1920px-Saint_Basil%27s_Cathedral_in_Moscow.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "St. Basil's Cathedral on Red Square",
                "landmark": "Saint Basil's Cathedral"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/5174-3._St._Petersburg._Greater_Hermitage.jpg/1920px-5174-3._St._Petersburg._Greater_Hermitage.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Winter Palace & Hermitage Museum",
                "landmark": "Hermitage Museum"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Moscow_Kremlin_%288281675670%29.jpg/1920px-Moscow_Kremlin_%288281675670%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Moscow Kremlin Historic Walled Complex",
                "landmark": "Kremlin"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Auferstehungskirche_%28Sankt_Petersburg%29.JPG/1920px-Auferstehungskirche_%28Sankt_Petersburg%29.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Church of the Savior on Spilled Blood",
                "landmark": "Church of the Savior on Blood"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/Baikal.A2001296.0420.250m-NASA.jpg/1920px-Baikal.A2001296.0420.250m-NASA.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Lake Baikal Ancient Siberian Waters",
                "landmark": "Lake Baikal"
            }
        ],
        "description": "Spanning eleven time zones, Russia offers grand imperial palaces, iconic onion-domed cathedrals, legendary ballet, and majestic natural frontiers. Explore Moscow's Kremlin and Red Square, the artistic splendor and canals of St. Petersburg, and historic towns along the Golden Ring. Apply for the official Russian Unified Electronic Visa with guided application assistance."
    },
    "japan": {
        "title": "Explore Japan: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg/1920px-View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Mount Fuji Sacred Snow-Capped Peak",
                "landmark": "Mount Fuji"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/1920px-Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Fushimi Inari Torii Gate Corridor, Kyoto",
                "landmark": "Fushimi Inari-taisha"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg/1920px-Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Kinkaku-ji Golden Pavilion Temple",
                "landmark": "Kinkaku-ji"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Shibuya_Crossing%2C_Aerial.jpg/1920px-Shibuya_Crossing%2C_Aerial.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Shibuya Iconic Neon Crossing, Tokyo",
                "landmark": "Shibuya Crossing"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Osaka_Castle_03bs3200.jpg/1920px-Osaka_Castle_03bs3200.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Historic Osaka Castle & Cherry Blossoms",
                "landmark": "Osaka Castle"
            }
        ],
        "description": "Discover the harmonious blend of ancient traditions and futuristic innovation in Japan. From historic Zen temples, tea ceremonies, and cherry blossom gardens in Kyoto to neon-lit skyscrapers, robot cafes, and Michelin-starred gastronomy in Tokyo, Japan promises an extraordinary journey. Apply for your Japan Tourist eVisa / Visa assistance with precision guidance."
    },
    "china": {
        "title": "Explore China: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg/1920px-The_Great_Wall_of_China_at_Jinshanling-edit.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Great Wall of China Mountain Vistas",
                "landmark": "Great Wall of China"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Forbidden_City_-_View_from_Coal_Hill.jpg/1920px-The_Forbidden_City_-_View_from_Coal_Hill.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Forbidden City Imperial Palace, Beijing",
                "landmark": "Forbidden City"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/1_tianzishan_wulingyuan_zhangjiajie_2012.jpg/1920px-1_tianzishan_wulingyuan_zhangjiajie_2012.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Zhangjiajie Avatar Floating Pillars",
                "landmark": "Zhangjiajie National Forest Park"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/51714-Terracota-Army.jpg/1920px-51714-Terracota-Army.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Terracotta Army Ancient Warriors, Xi'an",
                "landmark": "Terracotta Army"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/The_Bund_2.jpg/1920px-The_Bund_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "The Bund & Futuristic Shanghai Skyline",
                "landmark": "The Bund"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of China. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official China visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "united-kingdom": {
        "title": "Explore United Kingdom: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Elizabeth_Tower_and_the_north_front_of_the_Palace_of_Westminster%2C_London.jpg/1920px-Elizabeth_Tower_and_the_north_front_of_the_Palace_of_Westminster%2C_London.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Big Ben & Palace of Westminster, London",
                "landmark": "Big Ben"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Tower_Bridge_at_Dawn.jpg/1920px-Tower_Bridge_at_Dawn.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Tower Bridge Over the River Thames",
                "landmark": "Tower Bridge"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg/1920px-City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Edinburgh Castle Atop Volcanic Castle Rock",
                "landmark": "Edinburgh Castle"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Stonehenge2007_07_30.jpg/1920px-Stonehenge2007_07_30.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Stonehenge Prehistoric Megalith Circle",
                "landmark": "Stonehenge"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Causeway-code_poet-4.jpg/1920px-Causeway-code_poet-4.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Giant's Causeway Basalt Columns",
                "landmark": "Giant's Causeway"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of United Kingdom. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official United Kingdom visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "united-states": {
        "title": "Explore United States: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Front_view_of_Statue_of_Liberty_%28cropped%29.jpg/1920px-Front_view_of_Statue_of_Liberty_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Statue of Liberty & New York Harbor",
                "landmark": "Statue of Liberty"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Canyon_River_Tree_%28165872763%29.jpeg/1920px-Canyon_River_Tree_%28165872763%29.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Grand Canyon Monumental Rock Formations",
                "landmark": "Grand Canyon"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg/1920px-Golden_Gate_Bridge_as_seen_from_Battery_East.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Golden Gate Bridge, San Francisco",
                "landmark": "Golden Gate Bridge"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/New_york_times_square-terabass.jpg/1920px-New_york_times_square-terabass.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Times Square Bustling Manhattan Lights",
                "landmark": "Times Square"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Tunnel_View%2C_Yosemite_Valley%2C_Yosemite_NP_-_Diliff.jpg/1920px-Tunnel_View%2C_Yosemite_Valley%2C_Yosemite_NP_-_Diliff.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Yosemite Valley El Capitan Granite Cliffs",
                "landmark": "Yosemite Valley"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of United States. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official United States visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "france": {
        "title": "Explore France: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/1920px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Eiffel Tower Iconic Iron Silhouette, Paris",
                "landmark": "Eiffel Tower"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/66/Louvre_Museum_Wikimedia_Commons.jpg/1920px-Louvre_Museum_Wikimedia_Commons.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Louvre Museum & Modern Glass Pyramid",
                "landmark": "Louvre"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Mont-Saint-Michel_vu_du_ciel.jpg/1920px-Mont-Saint-Michel_vu_du_ciel.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Mont-Saint-Michel Tidal Island Abbey",
                "landmark": "Mont-Saint-Michel"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Vue_a%C3%A9rienne_du_domaine_de_Versailles_par_ToucanWings_-_Creative_Commons_By_Sa_3.0_-_081_%28cropped%29.jpg/1920px-Vue_a%C3%A9rienne_du_domaine_de_Versailles_par_ToucanWings_-_Creative_Commons_By_Sa_3.0_-_081_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Palace of Versailles Grand Royal Estate",
                "landmark": "Palace of Versailles"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/CollineDuChateau_NiceFrance2022.png/1920px-CollineDuChateau_NiceFrance2022.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Promenade des Anglais, French Riviera Nice",
                "landmark": "Promenade des Anglais"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of France. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official France visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "germany": {
        "title": "Explore Germany: Visas",
        "photos": [
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/a/a6/Brandenburger_Tor_abends.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Brandenburg Gate Neoclassical Portal, Berlin",
                "landmark": "Brandenburg Gate"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Schloss_Neuschwanstein_2013.jpg/1920px-Schloss_Neuschwanstein_2013.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Neuschwanstein Fairytale Bavarian Castle",
                "landmark": "Neuschwanstein Castle"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/K%C3%B6lner_Dom_-_Westfassade_2022_ohne_Ger%C3%BCst-0968_b.jpg/1920px-K%C3%B6lner_Dom_-_Westfassade_2022_ohne_Ger%C3%BCst-0968_b.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Cologne Gothic Twin-Spired Cathedral",
                "landmark": "Cologne Cathedral"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Heidelberg-2726936.jpg/1920px-Heidelberg-2726936.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Heidelberg Historic Castle & Neckar River",
                "landmark": "Heidelberg Castle"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Rothenburg_BW_4.JPG/1920px-Rothenburg_BW_4.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Rothenburg Medieval Walled Town",
                "landmark": "Rothenburg ob der Tauber"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of Germany. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official Germany visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "italy": {
        "title": "Explore Italy: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/1920px-Colosseo_2020.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Colosseum Ancient Roman Flavian Amphitheatre",
                "landmark": "Colosseum"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/View_of_the_Grand_Canal_from_Rialto_to_Ca%27Foscari.jpg/1920px-View_of_the_Grand_Canal_from_Rialto_to_Ca%27Foscari.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Grand Canal Historic Venetian Palazzos",
                "landmark": "Grand Canal (Venice)"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Cattedrale_di_Santa_Maria_del_Fiore_%E2%80%93_Il_Duomo_di_Firenze.jpg/1920px-Cattedrale_di_Santa_Maria_del_Fiore_%E2%80%93_Il_Duomo_di_Firenze.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Florence Duomo Brunelleschi's Dome",
                "landmark": "Florence Cathedral"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4b/Italy_-_Pisa_-_Leaning_Tower.jpg/1920px-Italy_-_Pisa_-_Leaning_Tower.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Leaning Tower of Pisa Marble Campanile",
                "landmark": "Leaning Tower of Pisa"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Amalfi_Coast_%28Italy%2C_October_2020%29_-_75_%2850558355441%29.jpg/1920px-Amalfi_Coast_%28Italy%2C_October_2020%29_-_75_%2850558355441%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Amalfi Coast Cliffside Mediterranean Villages",
                "landmark": "Amalfi Coast"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of Italy. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official Italy visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "spain": {
        "title": "Explore Spain: Visas",
        "photos": [
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/e/ef/SF_maig_2_cropped.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Sagrada Família Gaudí Basilica, Barcelona",
                "landmark": "Sagrada Família"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Dawn_Charles_V_Palace_Alhambra_Granada_Andalusia_Spain.jpg/1920px-Dawn_Charles_V_Palace_Alhambra_Granada_Andalusia_Spain.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Alhambra Nasrid Palaces & Fortress, Granada",
                "landmark": "Alhambra"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Parc_guell_-_panoramio.jpg/1920px-Parc_guell_-_panoramio.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Park Güell Mosaic Architecture, Barcelona",
                "landmark": "Park Güell"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Plaza_de_Espa%C3%B1a_%28Sevilla%29_-_01.jpg/1920px-Plaza_de_Espa%C3%B1a_%28Sevilla%29_-_01.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Plaza de España Semicircular Renaissance Square",
                "landmark": "Plaza de España, Seville"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Mezquita_de_C%C3%B3rdoba_desde_el_aire_%28C%C3%B3rdoba%2C_Espa%C3%B1a%29.jpg/1920px-Mezquita_de_C%C3%B3rdoba_desde_el_aire_%28C%C3%B3rdoba%2C_Espa%C3%B1a%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Great Mosque of Córdoba Two-Tiered Arches",
                "landmark": "Mosque–Cathedral of Córdoba"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of Spain. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official Spain visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "switzerland": {
        "title": "Explore Switzerland: Visas",
        "photos": [
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/6/60/Matterhorn_from_Domh%C3%BCtte_-_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Matterhorn Iconic Alpine Pyramid, Zermatt",
                "landmark": "Matterhorn"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Kapellbruecke.JPG/1920px-Kapellbruecke.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Kapellbrücke Covered Wooden Bridge, Lucerne",
                "landmark": "Kapellbrücke"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Sphinx_et_Jungfrau_-_img_06980.jpg/1920px-Sphinx_et_Jungfrau_-_img_06980.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Jungfraujoch Top of Europe Mountain Glacier",
                "landmark": "Jungfraujoch"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Lake_Geneva_by_Sentinel-2.jpg/1920px-Lake_Geneva_by_Sentinel-2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Lake Geneva & Chillon Castle",
                "landmark": "Lake Geneva"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/1_lauterbrunnen_valley_wengen_2022.jpg/1920px-1_lauterbrunnen_valley_wengen_2022.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Lauterbrunnen Valley of 72 Alpine Waterfalls",
                "landmark": "Lauterbrunnen"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of Switzerland. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official Switzerland visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "greece": {
        "title": "Explore Greece: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Oia_sunset_-_panoramio_%282%29.jpg/1920px-Oia_sunset_-_panoramio_%282%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Oia Santorini Whitewashed Caldera Domes",
                "landmark": "Oia, Greece"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/d/da/The_Parthenon_in_Athens.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Parthenon Temple on the Acropolis of Athens",
                "landmark": "Parthenon"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Meteora%27s_monastery_2.jpg/1920px-Meteora%27s_monastery_2.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Meteora Monasteries Atop Gigantic Rock Pillars",
                "landmark": "Meteora"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Navagio%2C_Zante_01.jpg/1920px-Navagio%2C_Zante_01.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Navagio Shipwreck Beach, Zakynthos Island",
                "landmark": "Navagio"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/2011_Dimos_Mykonou.png/1920px-2011_Dimos_Mykonou.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Mykonos Iconic Windmills & Little Venice",
                "landmark": "Mykonos"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of Greece. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official Greece visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "denmark": {
        "title": "Explore Denmark: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/The_Nyhavn_Canal_3.jpg/1920px-The_Nyhavn_Canal_3.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Nyhavn 17th-Century Colorful Canal, Copenhagen",
                "landmark": "Nyhavn"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/en/7/7a/Copenhagen_-_the_little_mermaid_statue_-_2013.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "The Little Mermaid Statue on Langelinie",
                "landmark": "The Little Mermaid (statue)"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Amalienborg_Palace_%28cropped%29.jpg/1920px-Amalienborg_Palace_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Amalienborg Danish Royal Palace Complex",
                "landmark": "Amalienborg"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/Kronborg_002.JPG/1920px-Kronborg_002.JPG?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Kronborg Castle Hamlet's Renaissance Fortress",
                "landmark": "Kronborg"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Tivoli_Gardens_4.jpg/1920px-Tivoli_Gardens_4.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Tivoli Gardens Historic Pleasure Grounds",
                "landmark": "Tivoli Gardens"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of Denmark. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official Denmark visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "uae": {
        "title": "Explore United Arab Emirates: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg/1920px-Burj_Khalifa_%28worlds_tallest_building%29_and_the_Dubai_skyline_%2825781049892%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Burj Khalifa & Downtown Dubai",
                "landmark": "Burj Khalifa"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/en/7/7d/Sheikh_Zayed_Mosque_view.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Sheikh Zayed Grand Mosque, Abu Dhabi",
                "landmark": "Sheikh Zayed Grand Mosque"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/8/8c/Museum_of_the_future%2C_Dubai.jpeg/1920px-Museum_of_the_future%2C_Dubai.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Museum of the Future, Dubai",
                "landmark": "Museum of the Future"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/3/30/Artificial_Archipelagos%2C_Dubai%2C_United_Arab_Emirates_ISS022-E-024940_lrg_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Palm Jumeirah Island",
                "landmark": "Palm Jumeirah"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Dubai_Marina_Skyline.jpg/1920px-Dubai_Marina_Skyline.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Dubai Marina Luxury Waterfront",
                "landmark": "Dubai Marina"
            }
        ],
        "description": "Discover the breathtaking fusion of modern luxury and Arabian hospitality across Dubai, Abu Dhabi, and the Northern Emirates. Explore world-record architectural marvels like Burj Khalifa and Museum of the Future, tranquil desert dunes, pristine Arabian Gulf beaches, and world-class shopping. Apply for 30-day or 60-day single and multiple entry UAE eVisas with express 12 to 24-hour options."
    },
    "saudi": {
        "title": "Explore Saudi Arabia: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Al_Ula_%286748577917%29.jpg/1920px-Al_Ula_%286748577917%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "AlUla Ancient Hegra Heritage",
                "landmark": "Al-Ula"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Kingdom_Centre_Riyadh_2024.jpeg/1920px-Kingdom_Centre_Riyadh_2024.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Kingdom Centre Tower, Riyadh",
                "landmark": "Kingdom Centre"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Old_Jeddah_%28Al_Balad%29_architecture_3_Feb_2022.jpg/1920px-Old_Jeddah_%28Al_Balad%29_architecture_3_Feb_2022.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Al-Balad Historic Coral Stone District",
                "landmark": "Al-Balad, Jeddah"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Masmak_Fort_%2812753717253%29.jpg/1920px-Masmak_Fort_%2812753717253%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Historic Masmak Clay Fortress, Riyadh",
                "landmark": "Masmak fort"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Jeddah_Corniche_36.jpg/1920px-Jeddah_Corniche_36.jpg",
                "caption": "Jeddah Waterfront Corniche & Red Sea",
                "landmark": "Jeddah Corniche"
            }
        ],
        "description": "A land of monumental history and transformative visionary ambition, Saudi Arabia welcomes travelers to explore the ancient Nabataean wonders of AlUla, the vibrant UNESCO heritage of Jeddah's Al-Balad, the ultra-modern capital Riyadh, and untouched Red Sea coral reefs. Apply for your Saudi Tourist eVisa or Umrah Visa with fast approval."
    },
    "egypt-2": {
        "title": "Explore Egypt: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Pyramids_of_the_Giza_Necropolis.jpg/1920px-Pyramids_of_the_Giza_Necropolis.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Great Pyramids of Giza & Sphinx",
                "landmark": "Giza pyramid complex"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/1550_bis_1070_v._Chr._ca._wurde_der_Tempel_von_Luxor_erbaut._01.jpg/1920px-1550_bis_1070_v._Chr._ca._wurde_der_Tempel_von_Luxor_erbaut._01.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Luxor Temple on the Nile River",
                "landmark": "Luxor Temple"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Ramsis%2C_Aswan_Governorate%2C_Egypt_-_panoramio.jpg/1920px-Ramsis%2C_Aswan_Governorate%2C_Egypt_-_panoramio.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Abu Simbel Monumental Colossi",
                "landmark": "Abu Simbel temples"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/60/Temple_de_Louxor_68.jpg/1920px-Temple_de_Louxor_68.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Karnak Great Hypostyle Temple Complex",
                "landmark": "Karnak"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/0/0c/Luxor%2C_Tal_der_K%C3%B6nige_%281995%2C_860x605%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Valley of the Kings Pharaoh Tombs",
                "landmark": "Valley of the Kings"
            }
        ],
        "description": "Journey back through thousands of years of human civilization in Egypt. Gaze at the monumental Pyramids of Giza, cruise down the eternal Nile to Luxor and Aswan, admire royal tombs in the Valley of the Kings, and relax along pristine Red Sea coral resorts in Sharm El Sheikh. Secure your Egypt Tourist eVisa with fast, hassle-free processing."
    },
    "azerbaijan-2": {
        "title": "Explore Azerbaijan: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/0/08/Flame_towers_baku.jpg/1920px-Flame_towers_baku.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Baku Flame Towers & Promenade",
                "landmark": "Flame Towers"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/en/thumb/d/d3/Heydar_Aliyev_Cultural_Center.jpg/1920px-Heydar_Aliyev_Cultural_Center.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Heydar Aliyev Center Fluid Architecture",
                "landmark": "Heydar Aliyev Center"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/%C4%B0%C3%A7%C9%99ri%C5%9F%C9%99h%C9%99r_kollaj%C4%B1.jpg/1920px-%C4%B0%C3%A7%C9%99ri%C5%9F%C9%99h%C9%99r_kollaj%C4%B1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Icherisheher Old City & Maiden Tower",
                "landmark": "Old City (Baku)"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Qobustan_giri%C5%9F_qayas%C4%B1_2026_%281%29.jpg/1920px-Qobustan_giri%C5%9F_qayas%C4%B1_2026_%281%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Gobustan Mud Volcanoes & Petroglyphs",
                "landmark": "Gobustan National Park"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/2/29/%C5%9E%C9%99ki_xan_saray%C4%B1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Palace of Shaki Khans Ornate Stained Glass",
                "landmark": "Palace of Shaki Khans"
            }
        ],
        "description": "Known as the Land of Fire, Azerbaijan seamlessly bridges eastern traditions and western modernism. Marvel at Baku’s iconic Flame Towers and fluid Zaha Hadid architecture, wander ancient stone alleys in Icherisheher, and take in the majestic Caucasus mountain peaks in Shahdag and Gabala. Get your official ASAN Azerbaijan eVisa approved in 1 to 3 days."
    },
    "srilanka": {
        "title": "Explore Sri Lanka: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Sigiriya_%28141688197%29.jpeg/1920px-Sigiriya_%28141688197%29.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sigiriya Ancient Lion Rock Palace",
                "landmark": "Sigiriya"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Nine_Arches_Bridge.jpg/1920px-The_Nine_Arches_Bridge.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Ella Nine Arches Scenic Viaduct",
                "landmark": "Nine Arch Bridge, Demodara"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Galle_Fort.jpg/1920px-Galle_Fort.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Historic Galle Coastal Dutch Fort",
                "landmark": "Galle Fort"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/SL_Kandy_asv2020-01_img33_Sacred_Tooth_Temple.jpg/1920px-SL_Kandy_asv2020-01_img33_Sacred_Tooth_Temple.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sacred Temple of the Tooth, Kandy",
                "landmark": "Temple of the Tooth"
            },
            {
                "url": "https://upload.wikimedia.org/wikipedia/commons/3/34/Dambulla-buddhastupa.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail_unscaled",
                "caption": "Dambulla Golden Cave Monasteries",
                "landmark": "Dambulla cave temple"
            }
        ],
        "description": "The Pearl of the Indian Ocean, Sri Lanka boasts emerald tea highlands, ancient UNESCO rock fortresses, pristine palm-fringed coastlines, and thrilling wildlife safaris. Explore Sigiriya, ride the scenic train through Ella's mist-covered hills, and watch sunset at Galle Fort. Apply for your official Sri Lanka ETA / eVisa with express 24-48 hour approval."
    },
    "turkiye": {
        "title": "Explore Türkiye: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Hagia_Sophia_%28228968325%29.jpeg/1920px-Hagia_Sophia_%28228968325%29.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Hagia Sophia Grand Byzantine Landmark",
                "landmark": "Hagia Sophia"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg/1920px-Cappadocia_balloon_trip%2C_Ortahisar_Castle_%2811893715185%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Cappadocia Fairy Chimneys & Balloons",
                "landmark": "Cappadocia"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Pamukkale%2C_Denizli_2026_68.jpg/1920px-Pamukkale%2C_Denizli_2026_68.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Pamukkale Thermal Travertine Terraces",
                "landmark": "Pamukkale"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Istanbul_%2834223582516%29_%28cropped%29.jpg/1920px-Istanbul_%2834223582516%29_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Sultan Ahmed Blue Mosque",
                "landmark": "Blue Mosque, Istanbul"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Ephesus_Celsus_Library_Fa%C3%A7ade.jpg/1920px-Ephesus_Celsus_Library_Fa%C3%A7ade.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Ephesus Library of Celsus Ancient Ruins",
                "landmark": "Ephesus"
            }
        ],
        "description": "Bridging Europe and Asia, Türkiye is a treasure trove of ancient empires, fairytale landscape chimneys, and vibrant bazaar culture. Witness hundreds of hot air balloons drifting above Cappadocia at dawn, marvel at the grandeur of Hagia Sophia and the Blue Mosque in Istanbul, and swim in the azure waters of Bodrum and Antalya. Apply for your official Türkiye eVisa in 1-2 days."
    },
    "uk": {
        "title": "Explore United Kingdom: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Elizabeth_Tower_and_the_north_front_of_the_Palace_of_Westminster%2C_London.jpg/1920px-Elizabeth_Tower_and_the_north_front_of_the_Palace_of_Westminster%2C_London.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Big Ben & Palace of Westminster, London",
                "landmark": "Big Ben"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/Tower_Bridge_at_Dawn.jpg/1920px-Tower_Bridge_at_Dawn.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Tower Bridge Over the River Thames",
                "landmark": "Tower Bridge"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg/1920px-City_of_Edinburgh_-_Edinburgh_Castle_-_20140421004403.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Edinburgh Castle Atop Volcanic Castle Rock",
                "landmark": "Edinburgh Castle"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Stonehenge2007_07_30.jpg/1920px-Stonehenge2007_07_30.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Stonehenge Prehistoric Megalith Circle",
                "landmark": "Stonehenge"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Causeway-code_poet-4.jpg/1920px-Causeway-code_poet-4.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Giant's Causeway Basalt Columns",
                "landmark": "Giant's Causeway"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of United Kingdom. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official United Kingdom visa with verified specialist file review, transparent pricing, and 100% digital submission."
    },
    "usa": {
        "title": "Explore United States: Visas",
        "photos": [
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Front_view_of_Statue_of_Liberty_%28cropped%29.jpg/1920px-Front_view_of_Statue_of_Liberty_%28cropped%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Statue of Liberty & New York Harbor",
                "landmark": "Statue of Liberty"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Canyon_River_Tree_%28165872763%29.jpeg/1920px-Canyon_River_Tree_%28165872763%29.jpeg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Grand Canyon Monumental Rock Formations",
                "landmark": "Grand Canyon"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Golden_Gate_Bridge_as_seen_from_Battery_East.jpg/1920px-Golden_Gate_Bridge_as_seen_from_Battery_East.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Golden Gate Bridge, San Francisco",
                "landmark": "Golden Gate Bridge"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/New_york_times_square-terabass.jpg/1920px-New_york_times_square-terabass.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Times Square Bustling Manhattan Lights",
                "landmark": "Times Square"
            },
            {
                "url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Tunnel_View%2C_Yosemite_Valley%2C_Yosemite_NP_-_Diliff.jpg/1920px-Tunnel_View%2C_Yosemite_Valley%2C_Yosemite_NP_-_Diliff.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
                "caption": "Yosemite Valley El Capitan Granite Cliffs",
                "landmark": "Yosemite Valley"
            }
        ],
        "description": "Experience the captivating culture, iconic landmarks, and scenic landscapes of United States. Discover world-famous monuments, rich heritage, and vibrant travel experiences. Apply for your official United States visa with verified specialist file review, transparent pricing, and 100% digital submission."
    }
};

  function getCountryGalleryData(country, image) {
    var slug = (country.slug || '').toLowerCase();
    var baseSlug = slug.replace(/-\d+$/, '');
    var data = COUNTRY_GALLERIES[slug] || COUNTRY_GALLERIES[baseSlug];

    if (data && data.photos && data.photos.length >= 5) {
      return data;
    }

    // High quality universal fallback - ALWAYS country specific, never generic other-country photos!
    var mainImg = photos[slug + '-banner'] || photos[baseSlug + '-banner'] || photos[slug] || photos[baseSlug] || (country.image_url && !isFlagImage(country.image_url) ? country.image_url : '') || image || '/assets/uae-burj-khalifa-hero.jpg';

    var fallbackPhotos = [
      { url: mainImg, caption: (country.name || 'Destination') + ' Iconic Landmark' },
      { url: mainImg, caption: (country.name || 'Destination') + ' Historic Heritage' },
      { url: mainImg, caption: (country.name || 'Destination') + ' Scenic Landscapes' },
      { url: mainImg, caption: (country.name || 'Destination') + ' City Highlights' },
      { url: mainImg, caption: (country.name || 'Destination') + ' Cultural Experience' }
    ];

    var fallbackDesc = country.summary || country.seo_description || ('Experience the captivating culture, historic monuments, and scenic beauty of ' + country.name + '. Apply for your ' + country.name + ' visa online with verified specialist file review, transparent pricing, and 100% digital submission.');

    return {
      title: 'Explore ' + (country.name || 'Destination') + ': Visas',
      photos: fallbackPhotos,
      description: fallbackDesc
    };
  }

  function countryExperienceShowcase(country, image, visas, reviews) {
    var galleryData = getCountryGalleryData(country, image);
    var photosList = galleryData.photos || [];
    window.currentCountryGalleryPhotos = photosList;
    var mainPhoto = photosList[0] || { url: image || '/assets/uae-burj-khalifa-hero.jpg', caption: country.name };
    var mosaicFour = photosList.slice(1, 5);
    while (mosaicFour.length < 4) {
      mosaicFour.push(mainPhoto);
    }

    var reviewsCount = 1280;
    if (reviews && reviews.length) {
      reviewsCount = 1200 + reviews.length * 15;
    }

    var fourGridHtml = mosaicFour.map(function(item, idx) {
      var isLast = idx === 3;
      var viewAllBtn = isLast ?
        '<button class="mosaic-view-all-btn" type="button" aria-label="View all photos">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
          '<span>View all</span>' +
        '</button>' : '';

      return '<div class="mosaic-photo-card" data-gallery-idx="' + (idx + 1) + '" data-landmark-name="' + esc(item.landmark || item.title || item.caption || '') + '" style="background-image:url(\'' + esc(item.url) + '\');" title="' + esc(item.caption) + '">' +
        '<div class="mosaic-hover-overlay"></div>' +
        viewAllBtn +
      '</div>';
    }).join('');

    return '<section class="country-exp-showcase-section">' +
      '<div class="country-exp-container">' +
        '<div class="country-exp-top-bar">' +
          '<a href="/#destinations" class="country-exp-back"><span aria-hidden="true">&#8592;</span> All destinations</a>' +
          '<h1 class="country-exp-title">Explore ' + esc(country.name) + ': Visas</h1>' +
          '<div class="country-exp-meta-bar">' +
            '<span class="country-exp-badge">Top rated</span>' +
            '<div class="country-exp-rating">' +
              '<span class="country-exp-star">★</span>' +
              '<span>4.9</span>' +
            '</div>' +
            '<a href="#reviews-section" class="country-exp-rev-link">(' + reviewsCount.toLocaleString() + '+ reviews)</a>' +
            '<span class="country-exp-dot">•</span>' +
            '<span class="country-exp-feature">Visa Doo Verified Processing</span>' +
          '</div>' +
        '</div>' +

        '<div class="country-exp-gallery-grid">' +
          '<div class="gallery-main-col">' +
            '<div class="mosaic-photo-card" data-gallery-idx="0" data-landmark-name="' + esc(mainPhoto.landmark || mainPhoto.title || mainPhoto.caption || '') + '" style="background-image:url(\'' + esc(mainPhoto.url) + '\');" title="' + esc(mainPhoto.caption) + '">' +
              '<div class="mosaic-hover-overlay"></div>' +
            '</div>' +
          '</div>' +
          '<div class="gallery-mosaic-2x2">' +
            fourGridHtml +
          '</div>' +
        '</div>' +

        '<div class="country-exp-desc-box">' +
          '<p class="country-exp-desc-text">' + esc(galleryData.description) + '</p>' +
        '</div>' +
      '</div>' +
    '</section>' +
    lightboxHtml(country.name, photosList);
  }

  function loadShowcaseGalleryImages(scope) {
    var root = scope || document;
    var cards = Array.prototype.slice.call(root.querySelectorAll('.mosaic-photo-card[data-landmark-name]'));
    if (!cards.length) return;
    
    var titles = [];
    cards.forEach(function(card) {
      var t = (card.getAttribute('data-landmark-name') || '').trim();
      if (t && titles.indexOf(t) === -1) titles.push(t);
    });
    if (!titles.length) return;

    var endpoint = 'https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=1600&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(titles.join('|'));
    
    fetch(endpoint).then(function(res) {
      if (!res.ok) throw new Error('Wiki API error');
      return res.json();
    }).then(function(data) {
      var pages = (data && data.query && data.query.pages) ? Object.values(data.query.pages) : [];
      var byTitle = {};
      pages.forEach(function(p) {
        if (p.thumbnail && p.thumbnail.source) {
          byTitle[String(p.title || '').toLowerCase()] = p.thumbnail.source;
        }
      });

      cards.forEach(function(card) {
        var lm = (card.getAttribute('data-landmark-name') || '').toLowerCase();
        var src = byTitle[lm];
        if (!src) {
          var foundKey = Object.keys(byTitle).find(function(k) {
            return k.indexOf(lm.slice(0, 6)) > -1 || lm.indexOf(k.slice(0, 6)) > -1;
          });
          if (foundKey) src = byTitle[foundKey];
        }
        if (src) {
          card.style.backgroundImage = 'url("' + src + '")';
          var idx = parseInt(card.getAttribute('data-gallery-idx'), 10);
          if (!isNaN(idx) && window.currentCountryGalleryPhotos && window.currentCountryGalleryPhotos[idx]) {
            window.currentCountryGalleryPhotos[idx].url = src;
          }
        }
      });
    }).catch(function(_e) {});
  }

  function lightboxHtml(countryName, photosList) {
    return '<div class="country-lightbox-modal" id="countryLightbox" role="dialog" aria-modal="true" aria-label="' + esc(countryName) + ' photo gallery">' +
      '<button class="lightbox-close-btn" id="lightboxCloseBtn" type="button" aria-label="Close gallery">✕</button>' +
      '<button class="lightbox-arrow lightbox-prev" id="lightboxPrevBtn" type="button" aria-label="Previous photo">‹</button>' +
      '<button class="lightbox-arrow lightbox-next" id="lightboxNextBtn" type="button" aria-label="Next photo">›</button>' +
      '<div class="lightbox-content-box">' +
        '<div class="lightbox-counter" id="lightboxCounter" style="color:#94a3b8;font-size:13px;font-weight:600;margin-bottom:8px;">1 / ' + photosList.length + '</div>' +
        '<img class="lightbox-img" id="lightboxImg" src="' + esc(photosList[0] ? photosList[0].url : '') + '" alt="' + esc(countryName) + '">' +
        '<div class="lightbox-caption" id="lightboxCaption">' + esc(photosList[0] ? photosList[0].caption : '') + '</div>' +
      '</div>' +
    '</div>';
  }

  function wireCountryGalleryLightbox() {
    var modal = document.getElementById('countryLightbox');
    if (!modal) return;

    var currentIdx = 0;
    var cards = document.querySelectorAll('.mosaic-photo-card');
    var viewAllBtn = document.querySelector('.mosaic-view-all-btn');
    var closeBtn = document.getElementById('lightboxCloseBtn');
    var prevBtn = document.getElementById('lightboxPrevBtn');
    var nextBtn = document.getElementById('lightboxNextBtn');
    var imgElem = document.getElementById('lightboxImg');
    var captionElem = document.getElementById('lightboxCaption');
    var counterElem = document.getElementById('lightboxCounter');

    var currentCountryData = window.currentCountryGalleryPhotos || [];
    if (!currentCountryData.length) return;

    function showPhoto(idx) {
      if (idx < 0) idx = currentCountryData.length - 1;
      if (idx >= currentCountryData.length) idx = 0;
      currentIdx = idx;
      var item = currentCountryData[currentIdx];
      if (!item) return;
      if (imgElem) {
        imgElem.src = item.url;
        imgElem.alt = item.caption || '';
      }
      if (captionElem) {
        captionElem.textContent = item.caption || '';
      }
      if (counterElem) {
        counterElem.textContent = (currentIdx + 1) + ' / ' + currentCountryData.length;
      }
    }

    function openModal(idx) {
      showPhoto(idx);
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }

    cards.forEach(function(card) {
      card.addEventListener('click', function(e) {
        if (e.target.closest('.mosaic-view-all-btn')) {
          e.stopPropagation();
          openModal(0);
          return;
        }
        var idxStr = card.getAttribute('data-gallery-idx');
        var idx = parseInt(idxStr, 10) || 0;
        openModal(idx);
      });
    });

    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        openModal(0);
      });
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (prevBtn) prevBtn.addEventListener('click', function(e) { e.stopPropagation(); showPhoto(currentIdx - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function(e) { e.stopPropagation(); showPhoto(currentIdx + 1); });

    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function(e) {
      if (!modal.classList.contains('show')) return;
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft') showPhoto(currentIdx - 1);
      else if (e.key === 'ArrowRight') showPhoto(currentIdx + 1);
    });
  }

  function uaeHeroBanner(country, image, visas) {
    return countryExperienceShowcase(country, image, visas);
  }

  function uaeCountryInfoStrip(visas, fromPrice, fastest) {
    return '<section class="uae-travel-info-strip">' +
      '<div class="container uae-travel-container">' +
        '<div class="uae-travel-strip-inner">' +
          '<div class="uae-travel-strip-title">' +
            '<h3>UAE</h3>' +
            '<span>Dubai &bull; Abu Dhabi &bull; UAE</span>' +
          '</div>' +
          '<div class="uae-travel-strip-meta">' +
            '<div class="uae-strip-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> <span>Stay: <b>30 / 60 Days</b></span></div>' +
            '<div class="uae-strip-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> <span>Entry: <b>Single / Multiple</b></span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function uaeFaqSection(countryName){
    var faqs = guideFaqs(countryName || 'UAE');
    var accordionHtml = faqs.map(function(item, index){
      return '<details>' +
        '<summary>' + esc(item[0]) + '<span class="uae-accordion-icon" aria-hidden="true"></span></summary>' +
        '<p>' + esc(item[1]) + '</p>' +
      '</details>';
    }).join('');

    return '<section class="uae-account-faq" id="faq">' +
      '<header>' +
        '<h2>Frequently asked questions</h2>' +
      '</header>' +
      '<div>' + accordionHtml + '</div>' +
    '</section>';
  }

  function uaeReviewsSection(reviews){
    var list = reviews || window.UAE_REVIEWS || FALLBACK_REVIEWS;
    if(!list || !list.length) return '';
    
    // Duplicate reviews to have at least 5 cards for a seamless ticker animation loop
    var tickerList = [].concat(list);
    while (tickerList.length > 0 && tickerList.length < 5) {
      tickerList = tickerList.concat(list);
    }

    var cardsHtml = tickerList.map(function(r){
      var stars = '';
      for(var i=1; i<=5; i++){
        stars += '<span style="color:' + (i <= r.rating ? '#f5a623' : '#d0dbd9') + '">★</span>';
      }
      
      var hash = 0;
      for (var i = 0; i < r.name.length; i++) {
        hash = r.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      var avatarId = Math.abs(hash) % 70;
      var avatarUrl = 'https://i.pravatar.cc/100?img=' + avatarId;
      
      var times = ['1 week ago', '2 weeks ago', '3 weeks ago', '1 month ago', '2 months ago', '3 months ago'];
      var timeStr = times[Math.abs(hash) % times.length];

      return '<div class="uae-review-item-card">' +
        '<div class="uae-review-item-stars">' + stars + '</div>' +
        '<p class="uae-review-item-body">"' + esc(r.body) + '"</p>' +
        '<div class="uae-review-author-wrap" style="display:flex;align-items:center;gap:12px;margin-top:12px;">' +
          '<img src="' + avatarUrl + '" alt="' + esc(r.name) + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;">' +
          '<div style="display:flex;flex-direction:column;gap:2px;text-align:left;">' +
            '<div style="display:flex;align-items:center;gap:4px;line-height:1.2;">' +
              '<b style="font-size:13px;color:#0f172a;font-weight:700;">' + esc(r.name) + '</b>' +
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="#22c55e" style="flex-shrink:0;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' +
            '</div>' +
            '<span style="font-size:11px;color:#64748b;font-weight:500;">' + timeStr + (r.location ? ' · ' + esc(r.location) : '') + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<section class="uae-account-faq uae-reviews-layout-section" id="reviews-section">' +
      '<header>' +
        '<h2>What our travellers say</h2>' +
      '</header>' +
      '<div class="uae-reviews-list-container">' + cardsHtml + '</div>' +
    '</section>';
  }

  function exploreOtherVisasSection(otherCountries) {
    var selectedNatName = localStorage.getItem('visadoo_nationality') || 'India';
    var currentSlug = (slug || 'uae').toLowerCase().replace(/-\d+$/, '');

    var curatedTop = [
      { name: 'Maldives', slug: 'maldives', iso2: 'mv', tag: 'Instant' },
      { name: 'Thailand', slug: 'thailand', iso2: 'th', tag: '3-5 Days' },
      { name: 'Vietnam', slug: 'vietnam', iso2: 'vn', tag: '3-5 Days' },
      { name: 'Indonesia', slug: 'indonesia', iso2: 'id', tag: '3-5 Days' },
      { name: 'United Arab Emirates', slug: 'united-arab-emirates', iso2: 'ae', tag: '1-2 Days' },
      { name: 'Singapore', slug: 'singapore', iso2: 'sg', tag: '3-5 Days' },
      { name: 'Malaysia', slug: 'malaysia', iso2: 'my', tag: '1-2 Days' },
      { name: 'Bahrain', slug: 'bahrain', iso2: 'bh', tag: '3-5 Days' },
      { name: 'Qatar', slug: 'qatar', iso2: 'qa', tag: '5-6 Days' },
      { name: 'Sri Lanka', slug: 'sri-lanka', iso2: 'lk', tag: '24-48 Hours' },
      { name: 'Azerbaijan', slug: 'azerbaijan', iso2: 'az', tag: 'Upto 3 Days' },
      { name: 'Egypt', slug: 'egypt', iso2: 'eg', tag: '10-15 Days' }
    ];

    function currentNormMatchesUae(s){
      return s === 'uae' || s === 'united-arab-emirates' || s === 'dubai';
    }

    var list = Array.isArray(otherCountries) && otherCountries.length ? otherCountries.slice() : curatedTop.slice();

    if (typeof window.getVisadooAllowedDestinations === 'function') {
      var allowed = window.getVisadooAllowedDestinations(selectedNatName);
      if (allowed && Array.isArray(allowed) && allowed.length) {
        list = list.filter(function(c){
          var s = (c.slug || '').toLowerCase().replace(/-\d+$/, '');
          return allowed.indexOf(c.slug) > -1 || allowed.indexOf(s) > -1;
        });
      }
    }

    list = list.filter(function(c){
      var cNorm = (c.slug || '').toLowerCase().replace(/-\d+$/, '');
      if (cNorm === currentSlug) return false;
      if (currentNormMatchesUae(currentSlug) && currentNormMatchesUae(cNorm)) return false;
      return true;
    });

    var POPULAR_PRIORITY = [
      'united-arab-emirates', 'uae',
      'thailand',
      'vietnam',
      'indonesia',
      'bahrain',
      'qatar',
      'singapore',
      'malaysia',
      'maldives',
      'sri-lanka', 'srilanka',
      'azerbaijan',
      'egypt',
      'russia',
      'morocco',
      'philippines',
      'turkey',
      'japan',
      'south-korea',
      'spain',
      'france',
      'germany'
    ];

    list.sort(function(a, b) {
      var aSlug = (a.slug || '').toLowerCase().replace(/-\d+$/, '');
      var bSlug = (b.slug || '').toLowerCase().replace(/-\d+$/, '');
      var aIdx = POPULAR_PRIORITY.indexOf(aSlug);
      var bIdx = POPULAR_PRIORITY.indexOf(bSlug);
      if (aIdx === -1) aIdx = 999;
      if (bIdx === -1) bIdx = 999;
      return aIdx - bIdx;
    });

    if (list.length < 5) {
      curatedTop.forEach(function(item){
        var itemNorm = item.slug.toLowerCase().replace(/-\d+$/, '');
        var exists = list.some(function(l){
          return (l.slug || '').toLowerCase().replace(/-\d+$/, '') === itemNorm;
        });
        var isCurrent = itemNorm === currentSlug || (currentNormMatchesUae(currentSlug) && currentNormMatchesUae(itemNorm));
        if (!exists && !isCurrent && list.length < 5) {
          list.push(item);
        }
      });
    }

    if (!list.length) {
      return '';
    }

    list = list.slice(0, 5);

    var DESTINATION_TAGLINES = {
      'united-arab-emirates': 'City of Future & Wonder',
      'uae': 'City of Future & Wonder',
      'dubai': 'City of Future & Wonder',
      'thailand': 'Amazing Thailand',
      'vietnam': 'Timeless Charm',
      'indonesia': 'Wonderful Indonesia',
      'bali': 'Island of the Gods',
      'bahrain': 'Pearl of the Arabian Gulf',
      'qatar': 'Where Culture Meets Future',
      'maldives': 'The sunny side of life',
      'singapore': 'Passion Made Possible',
      'malaysia': 'Truly Asia',
      'sri-lanka': 'Pearl of the Indian Ocean',
      'srilanka': 'Pearl of the Indian Ocean',
      'azerbaijan': 'Land of Fire',
      'egypt': 'Where History Lives',
      'turkey': 'Bridge Between Worlds',
      'morocco': 'Kingdom of Light',
      'philippines': 'It’s More Fun in the Philippines',
      'oman': 'Beauty Has An Address',
      'saudi-arabia': 'Welcome to Arabia',
      'saudi': 'Welcome to Arabia',
      'kenya': 'Magical Kenya',
      'russia': 'Discover Vast Horizons',
      'japan': 'Endless Discovery',
      'south-korea': 'Imagine Your Korea',
      'spain': 'Passion for Life',
      'france': 'Rendez-vous en France',
      'germany': 'Simply Inspiring',
      'italy': 'Bel Paese',
      'switzerland': 'Get Natural'
    };

    function getExplorePhoto(c) {
      var photos = window.VISADOO_DESTINATION_PHOTOS || {};
      var baseSlug = (c.slug || '').toLowerCase().replace(/-\d+$/, '');
      var src = photos[c.slug + '-card'] || photos[c.slug + '-banner'] || photos[c.slug] ||
                photos[baseSlug + '-card'] || photos[baseSlug + '-banner'] || photos[baseSlug] || '';
      if (!src || src.indexOf('flagcdn.com') > -1) {
        if (c.hero_image_url && c.hero_image_url.indexOf('flagcdn.com') === -1) {
          src = c.hero_image_url;
        } else if (c.image_url && c.image_url.indexOf('flagcdn.com') === -1) {
          src = c.image_url;
        } else {
          src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2400&q=95';
        }
      }
      return src;
    }

    var itemsHtml = list.map(function(c){
      var normSlug = (c.slug || '').toLowerCase().replace(/-\d+$/, '');
      var photo = getExplorePhoto(c);
      var photoStyle = photo ? ' style="background-image:url(&quot;' + photo + '&quot;)"' : '';
      var localPreview = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
      var href = localPreview ? 'country.html?slug=' + encodeURIComponent(c.slug) : '/country/' + encodeURIComponent(c.slug);
      var tagline = DESTINATION_TAGLINES[normSlug] || DESTINATION_TAGLINES[c.slug] || c.tagline || 'Tourist & Business Visas';

      return '<a class="dest-editorial-card" href="' + href + '" data-slug="' + normSlug + '">' +
        '<div class="dest-editorial-bg"' + photoStyle + '></div>' +
        '<div class="dest-editorial-gradient"></div>' +
        '<div class="dest-editorial-content">' +
          '<h3 class="dest-editorial-name">' + esc(c.name) + '</h3>' +
          '<p class="dest-editorial-tagline">' + esc(tagline) + '</p>' +
        '</div>' +
      '</a>';
    }).join('');

    return '<section class="uae-explore-section dest-editorial-section" id="explore-destinations">' +
      '<div class="dest-editorial-header">' +
        '<h2 class="dest-editorial-title">Destinations</h2>' +
        '<a href="index.html#destinations" class="dest-editorial-see-all">' +
          '<span>See all</span>' +
          '<span class="see-all-chevron" aria-hidden="true">&rsaquo;</span>' +
        '</a>' +
      '</div>' +
      '<div class="dest-editorial-grid">' + itemsHtml + '</div>' +
    '</section>';
  }

  function initReviewsTicker(){
    var container = document.querySelector('.uae-reviews-list-container');
    if(!container) return;
    
    if(window.reviewsTickerInterval) {
      clearInterval(window.reviewsTickerInterval);
    }
    
    var cards = container.querySelectorAll('.uae-review-item-card');
    if(cards.length < 4) return;

    function updateCardVisibility(){
      var currentCards = container.querySelectorAll('.uae-review-item-card');
      currentCards.forEach(function(card, index){
        if(index < 3) {
          card.style.display = 'block';
          card.style.opacity = '1';
        } else if(index === 3) {
          card.style.display = 'block';
          card.style.opacity = '0';
        } else {
          card.style.display = 'none';
        }
      });
    }

    // Set initial container height based on first 3 cards' heights
    updateCardVisibility();
    var h0 = cards[0].offsetHeight || 120;
    var h1 = cards[1].offsetHeight || 120;
    var h2 = cards[2].offsetHeight || 120;
    container.style.height = (h0 + h1 + h2 + 24) + 'px';

    var isReviewsVisible = true;
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          isReviewsVisible = entry.isIntersecting;
        });
      }, { threshold: 0.1 });
      obs.observe(container);
    }

    window.reviewsTickerInterval = setInterval(function(){
      if (document.hidden || !isReviewsVisible) return;
      var currentCards = container.querySelectorAll('.uae-review-item-card');
      var firstCard = currentCards[0];
      if(!firstCard) return;

      var height = firstCard.offsetHeight;
      var gap = 12;

      // Calculate new height based on Cards 1, 2, 3 (which will shift into positions 0, 1, 2)
      var h1_new = currentCards[1] ? currentCards[1].offsetHeight : 120;
      var h2_new = currentCards[2] ? currentCards[2].offsetHeight : 120;
      var h3_new = currentCards[3] ? currentCards[3].offsetHeight : 120;
      var nextHeight = h1_new + h2_new + h3_new + 24;

      // Transition container height smoothly alongside card scroll
      container.style.height = nextHeight + 'px';

      firstCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      firstCard.style.marginTop = '-' + (height + gap) + 'px';
      firstCard.style.opacity = '0';
      firstCard.style.transform = 'translateY(-20px)';

      if(currentCards[3]) {
        currentCards[3].style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        currentCards[3].style.opacity = '1';
      }

      setTimeout(function(){
        firstCard.removeAttribute('style');
        container.appendChild(firstCard);
        updateCardVisibility();
      }, 600);
    }, 4000);
  }
  
  function wireUaeFaqAccordion(){
    // Wire FAQs independently
    var faqGroups = document.querySelectorAll('#faq, #uae-faq, #country-faq');
    faqGroups.forEach(function(group){
      var faqDetails = group.querySelectorAll('details');
      faqDetails.forEach(function(details){
        var summary = details.querySelector('summary');
        if (!summary || details.getAttribute('data-accordion-wired') === 'true') return;
        details.setAttribute('data-accordion-wired', 'true');
        summary.addEventListener('click', function(e){
          e.preventDefault();
          var isOpen = details.hasAttribute('open');
          faqDetails.forEach(function(other){
            if(other !== details && other.hasAttribute('open')){
              collapseDetails(other);
            }
          });
          if(isOpen) collapseDetails(details);
          else expandDetails(details);
        });
      });
    });

    // Wire Requirements independently
    var reqGroups = document.querySelectorAll('#requirements');
    reqGroups.forEach(function(group){
      var reqDetails = group.querySelectorAll('details');
      reqDetails.forEach(function(details){
        var summary = details.querySelector('summary');
        if (!summary || details.getAttribute('data-accordion-wired') === 'true') return;
        details.setAttribute('data-accordion-wired', 'true');
        summary.addEventListener('click', function(e){
          e.preventDefault();
          var isOpen = details.hasAttribute('open');
          reqDetails.forEach(function(other){
            if(other !== details && other.hasAttribute('open')){
              collapseDetails(other);
            }
          });
          if(isOpen) collapseDetails(details);
          else expandDetails(details);
        });
      });
    });

    function collapseDetails(details){
      var summary = details.querySelector('summary');
      if(!summary) return;
      
      var startHeight = details.offsetHeight;
      var summaryHeight = summary.offsetHeight;

      details.style.height = startHeight + 'px';
      details.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Force reflow
      details.offsetHeight;
      details.style.height = summaryHeight + 'px';

      setTimeout(function(){
        if (details.style.height === summaryHeight + 'px') {
          details.removeAttribute('open');
          details.removeAttribute('style');
        }
      }, 300);
    }

    function expandDetails(details){
      var summary = details.querySelector('summary');
      var content = details.querySelector('.uae-req-details-content, p, div');
      if(!summary || !content) return;

      var summaryHeight = summary.offsetHeight;
      
      // Open to measure content
      details.setAttribute('open', '');
      var contentHeight = content.offsetHeight;
      var totalHeight = summaryHeight + contentHeight;

      details.style.height = summaryHeight + 'px';
      details.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // Force reflow
      details.offsetHeight;
      details.style.height = totalHeight + 'px';

      setTimeout(function(){
        if (details.style.height === totalHeight + 'px') {
          details.removeAttribute('style');
        }
      }, 300);
    }
  }

  window.wireUaeFaqAccordion = wireUaeFaqAccordion;
  window.initReviewsTicker = initReviewsTicker;

  var COUNTRY_GUIDES={
    US:{
      kicker:'Explore USA',
      title:'USA Tourist Attractions',
      places:['Statue of Liberty','Times Square','Grand Canyon','Golden Gate Bridge','White House','Yosemite National Park','Las Vegas Strip','Walt Disney World']
    },
    GB:{
      kicker:'Explore the UK',
      title:'UK Tourist Attractions',
      places:['Big Ben','Tower Bridge','Buckingham Palace','Stonehenge','Edinburgh Castle','Lake District','Windsor Castle','British Museum']
    }
  };

  function guideFaqs(countryName, countrySlug){
    var name = countryName || 'UAE';
    var slug = (countrySlug || window.currentCountrySlug || '').toLowerCase();
    var SCHENGEN_LIST = ['denmark', 'spain', 'switzerland', 'france', 'germany', 'greece', 'italy', 'netherlands', 'portugal', 'austria', 'belgium', 'sweden', 'norway', 'finland', 'poland'];
    var isSchengen = SCHENGEN_LIST.indexOf(slug) > -1;
    var visaTerm = isSchengen ? (name + ' Schengen visa') : (name + ' visa');

    var procTimeDesc = 'The standard processing time is 3 to 5 working days.';
    if (slug === 'united-arab-emirates' || slug === 'uae' || slug === 'dubai') procTimeDesc = 'The standard processing time is 3 to 5 working days.';
    else if (slug === 'vietnam') procTimeDesc = 'The standard processing time is 3 to 5 working days.';
    else if (slug === 'morocco') procTimeDesc = 'The standard processing time is 3 to 5 working days for Tourist Visa, and 5 to 7 working days for Business Visa.';
    else if (slug === 'qatar') procTimeDesc = 'The standard processing time is 5 to 6 working days.';
    else if (slug === 'srilanka' || slug === 'sri-lanka') procTimeDesc = 'The standard processing time is 24 to 48 hours.';
    else if (slug === 'thailand') procTimeDesc = 'The standard processing time is 3 to 5 working days.';
    else if (slug === 'kenya') procTimeDesc = 'The standard processing time is up to 2 days.';
    else if (slug === 'russia') procTimeDesc = 'The standard processing time is 10 to 12 days.';
    else if (slug === 'indonesia') procTimeDesc = 'The standard processing time is 5 to 7 working days.';
    else if (slug === 'azerbaijan' || slug === 'azerbaijan-2') procTimeDesc = 'The standard processing time is up to 3 days.';
    else if (slug === 'bahrain') procTimeDesc = 'The standard processing time is 3 to 5 working days.';
    else if (slug === 'egypt' || slug === 'egypt-2') procTimeDesc = 'The standard processing time is 10 to 15 days.';
    else if (slug === 'philippines') procTimeDesc = 'The standard processing time is 8 to 10 days.';
    else if (slug === 'saudi-arabia' || slug === 'saudi') procTimeDesc = 'The standard processing time is 5 working days.';
    else if (slug === 'oman') procTimeDesc = 'The standard processing time is 5 to 6 working days.';

    return [
      ['Which ' + name + ' visa should I choose?', 'Choose based on the duration of your stay and entry requirements (single or multiple entry). Compare the visa options above or chat with our team.'],
      ['What documents are required for a ' + name + ' visa?', 'You will need a clear copy of your passport bio page (front and back) and a recent color passport-size photograph with a white background.'],
      ['How long does ' + name + ' visa processing take?', procTimeDesc + ' We recommend applying at least a week before your travel date.'],
      ['Can I apply completely online?', 'Yes, the entire process is 100% online. You can select your visa, upload documents, make the payment, and track the status on your mobile or computer.'],
      ['How will I receive my approved visa?', 'Once approved, your ' + visaTerm + ' document and confirmation will be sent directly to you via email and WhatsApp.'],
      ['Can I get help with my application?', 'Yes, our support team is available 24/7. You can use our AI assistant or click the WhatsApp button to chat with our visa experts.'],
      ['Is my visa fee refundable if rejected?', 'Visa fees are charged by the government for processing and are non-refundable once the application is submitted to the immigration authorities.'],
      ['Do children need a separate visa for ' + name + '?', 'Yes, all travellers including infants and children must have a valid visa to enter the country.'],
      ['Can I extend my ' + name + ' visa while in the country?', 'Yes, tourist visas can often be extended. Please contact our support team at least 5 days before your visa expires to start the extension process.'],
      ['What is the validity of the ' + name + ' visa?', 'Once issued, the visa is valid according to the approved travel dates and duration.'],
      ['Do I need to print my visa?', 'Yes, it is recommended to print a physical color copy of your approved visa document and carry it with you along with your passport during travel.'],
      ['What happens if there is a spelling mistake on my visa?', 'If you notice any mistakes, contact us immediately. If the visa is already issued, a correction or new application may be required as details cannot be modified after approval.']
    ];
  }

  function countryTravelGuide(country,iso){
    var guide=COUNTRY_GUIDES[iso];
    var faqs=guideFaqs(country.name);
    var attractionsCards=guide ? guide.places.map(function(place,index){
      return '<li><div class="uae-attraction-photo"><img data-country-guide-image="'+esc(place)+'" alt="'+esc(place)+', '+esc(country.name)+'" loading="lazy" decoding="async"></div><div class="uae-attraction-copy"><b>'+String(index+1).padStart(2,'0')+'</b><span>'+esc(place)+'</span></div></li>';
    }).join('') : '';
    var attractionsSection = guide ? '<section class="uae-attractions" id="country-attractions"><header><h2>'+esc(guide.title)+'</h2></header><ol>'+attractionsCards+'</ol></section>' : '';
    return '<section class="uae-public-guide-section"><div class="container"><section class="uae-account-information uae-public-travel-guide'+(guide?'':' uae-information-faq-only')+'">'+
      attractionsSection+
      '<section class="uae-account-faq" id="country-faq"><header><h2>Frequently asked questions</h2></header><div>'+faqs.map(function(item,index){return '<details'+(index===0?' open':'')+'><summary>'+esc(item[0])+'<span class="uae-accordion-icon" aria-hidden="true"></span></summary><p>'+esc(item[1])+'</p></details>';}).join('')+'</div></section>'+
    '</section></div></section>';
  }

  function loadCountryGuideImages(scope){
    var images=Array.prototype.slice.call(scope.querySelectorAll('[data-country-guide-image]'));
    if(!images.length) return;
    var titles=images.map(function(image){return image.getAttribute('data-country-guide-image');});
    var endpoint='https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=1400&redirects=1&format=json&origin=*&titles='+encodeURIComponent(titles.join('|'));
    fetch(endpoint).then(function(response){
      if(!response.ok) throw new Error('Image request failed');
      return response.json();
    }).then(function(data){
      var pages=data&&data.query&&data.query.pages?Object.keys(data.query.pages).map(function(key){return data.query.pages[key];}):[];
      var byTitle={};
      pages.forEach(function(page){if(page.thumbnail&&page.thumbnail.source) byTitle[String(page.title||'').toLowerCase()]=page.thumbnail.source;});
      images.forEach(function(image){
        var source=byTitle[String(image.getAttribute('data-country-guide-image')||'').toLowerCase()];
        if(source) image.src=source;
        else image.closest('.uae-attraction-photo').classList.add('image-unavailable');
      });
    }).catch(function(){
      images.forEach(function(image){image.closest('.uae-attraction-photo').classList.add('image-unavailable');});
    });
  }

  function renderCountry(country,visas,reviews,otherCountries){
    var baseSlug = (country.slug || '').toLowerCase().replace(/-\d+$/, '');
    if(country.slug==='spain') country.name='Spain';
    if(country.slug==='denmark') country.name='Denmark';
    if(country.slug==='japan') country.name='Japan';
    if(country.slug==='south-korea') country.name='South Korea';
    if(country.slug==='switzerland') country.name='Switzerland';
    if(country.slug==='ireland') country.name='Ireland';
    if(country.slug==='france') country.name='France';
    if(country.slug==='germany') country.name='Germany';
    if(country.slug==='greece') country.name='Greece';
    if(country.slug==='azerbaijan' || country.slug==='azerbaijan-2' || baseSlug==='azerbaijan') country.name='Azerbaijan';
    if(country.slug==='thailand') country.name='Thailand';
    if(country.slug==='bahrain') country.name='Bahrain';
    if(country.slug==='turkey') country.name='Türkiye';
    if(country.slug==='indonesia') country.name='Indonesia';
    if(country.slug==='russia') country.name='Russia';
    if(country.slug==='vietnam') country.name='Vietnam';
    if(country.slug==='india') country.name='India';
    if(country.slug==='sri-lanka') country.name='Sri Lanka';
    if(country.slug==='kenya') country.name='Kenya';
    if(country.slug==='morocco') country.name='Morocco';
    if(country.slug==='china') country.name='China';
    if(country.slug==='qatar') country.name='Qatar';
    if(country.slug==='united-arab-emirates'||country.slug==='uae') country.name='United Arab Emirates';
    window.currentCountryName = country.name;
    window.currentCountrySlug = country.slug;
    try { window.localStorage.setItem('visadoo-last-country', country.slug); } catch(e){}
    reviews = reviews || window.UAE_REVIEWS || FALLBACK_REVIEWS;
    var image = photos[country.slug+'-banner'] || photos[baseSlug+'-banner'] || photos[country.slug] || photos[baseSlug] || '';
    if (!image || isFlagImage(image)) {
      if (country.image_url && !isFlagImage(country.image_url)) {
        image = country.image_url;
      } else {
        image = '/assets/uae-burj-khalifa-hero.jpg';
      }
    }
    var iso=String(country.iso2||(baseSlug==='azerbaijan'?'AZ':'')).toUpperCase();
    var isUae=iso==='AE'||country.slug==='uae'||country.slug==='united-arab-emirates';
    var isUaeStyle=true;
    var isEnhanced=isUaeStyle||iso==='US'||iso==='GB'||iso==='UK'||country.slug==='united-states'||country.slug==='united-kingdom';
    var guideCode=iso==='UK'?'GB':iso;
    if(country.slug==='united-states') guideCode='US';
    if(country.slug==='united-kingdom') guideCode='GB';
    var visaSectionTitle=isEnhanced?'Visa types':'Visa options';
    var prices=visas.map(priceNumber).filter(function(value){return value!=null;});
    var fromPrice=prices.length?Math.min.apply(null,prices):null;
    var times=visas.map(function(visa){
      if(!processingText(visa)) return null;
      var numVal = parseFloat(visa.processing_time_value) || 5;
      var isHours = String(visa.processing_time_unit || '').toLowerCase().indexOf('hour') > -1;
      return {
        hours: isHours ? numVal : numVal * 24,
        text: processingText(visa)
      };
    }).filter(Boolean).sort(function(a,b){return a.hours-b.hours;});
    var fastest=times.length?times[0].text:'';

    var summary=shortText(country.summary,'Apply online with clear prices and simple tracking.',120);

    document.title=(country.seo_title||country.name+' Visas — Apply Online | Visa Doo');
    var meta=document.querySelector('meta[name="description"]');
    if(meta) meta.content=country.seo_description||summary;

    // Apply premium country-page class when viewing UAE, Japan or Denmark style pages
    document.body.classList.toggle('uae-country-page',isUaeStyle);
    document.body.setAttribute('data-country-code',iso);

    if(isUaeStyle) {
      // Modern GetYourGuide / Viator Style Destination Showcase Layout
      var visaContent = uaeVisaSelector(visas, country.name, country.summary);
      root.innerHTML =
        countryExperienceShowcase(country, image, visas, reviews) +
        '<div class="uae-travel-body-section">' +
          '<div class="container uae-travel-container">' +
            visaContent +
          '</div>' +
        '</div>' +
        '<section class="uae-public-guide-section">' +
          '<div class="container">' +
            '<section class="uae-account-information uae-public-travel-guide uae-information-faq-only">' +
              uaeReviewsSection(reviews) +
              uaeFaqSection(country.name) +
              exploreOtherVisasSection(otherCountries) +
            '</section>' +
          '</div>' +
        '</section>';
      wireUaeVisaSelector();
      wireCountryGalleryLightbox();
      loadShowcaseGalleryImages(document);
      initReviewsTicker();
    } else {
      // Standard / non-UAE rendering (remains unchanged)
      var facts=[
        '<div><strong>'+visas.length+'</strong><span>Options</span></div>',
        fromPrice!=null?'<div><strong>'+esc(money(fromPrice))+'</strong><span>From</span></div>':'',
        fastest?'<div><strong>'+esc(fastest)+'</strong><span>Fastest</span></div>':''
      ].filter(Boolean).join('');
      var cards=visas.length?visas.map(visaCard).join(''):
        '<div class="country-empty"><h3>Options coming soon</h3><a href="index.html#contact" class="btn btn-primary">Contact us</a></div>';
      var visaContentStandard=isEnhanced&&visas.length?uaeVisaSelector(visas,country.name,country.summary):'<div class="cards">'+cards+'</div>';
      var documentsContentStandard=
        '<div class="container country-documents-grid">'+
          '<div><span class="eyebrow">Documents</span><h2>Keep these ready</h2></div>'+
          '<div class="country-doc-list">'+
            '<div>'+CHECK+'<span><b>Passport</b></span></div>'+
            '<div>'+CHECK+'<span><b>Photo</b></span></div>'+
            '<div>'+CHECK+'<span><b>Travel details</b></span></div>'+
            '<div>'+CHECK+'<span><b>Extra documents, if needed</b></span></div>'+
          '</div>'+
        '</div>';
      var heroStyle=image?" style=\"--country-hero-image:url('" + esc(image) + "')\"":"";
      var heroMarkup=isEnhanced?
        '<section class="country-detail-hero uae-hero-giant"'+heroStyle+'><div class="container country-detail-grid">'+
          '<div class="country-detail-copy uae-giant-copy">'+
            '<h1 class="uae-giant-title">'+esc(country.name)+'</h1>'+
            '<a href="index.html#destinations" class="country-back uae-giant-back"><span aria-hidden="true">•</span> All destinations</a>'+
          '</div>'+
        '</div></section>':
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
        '</div></section>';

      root.innerHTML=
        heroMarkup+
        '<nav class="country-info-nav" aria-label="Country visa information"><div class="container">'+
          '<a href="#visa-info">Visa Info</a>'+
          '<a href="requirements.html?slug='+encodeURIComponent(country.slug)+'">Visa Requirements</a>'+
        '</div></nav>'+
        '<section class="section sky country-options" id="visa-info"><div class="container">'+
          '<div class="country-section-heading"><span class="eyebrow">Choose a visa</span><h2>'+visaSectionTitle+'</h2></div>'+
          visaContentStandard+
        '</div></section>'+
        '<section class="section country-documents" id="documents">'+documentsContentStandard+'</section>'+
        '<section class="section country-process" id="visa-process">'+
          '<div class="container">'+
            '<div class="country-section-heading"><span class="eyebrow">How it works</span><h2>Simple application process</h2></div>'+
            '<div class="country-process-grid">'+
              '<div class="country-process-step"><span>01</span><h3>Select visa</h3><p>Choose your duration and entry type</p></div>'+
              '<div class="country-process-step"><span>02</span><h3>Enter details</h3><p>Fill in applicant details</p></div>'+
              '<div class="country-process-step"><span>03</span><h3>Submit</h3><p>Upload documents & receive updates</p></div>'+
            '</div>'+
          '</div>'+
        '</section>'+
        '<section class="section uae-explore-other-countries" style="border-top:1px solid #edf2f7;padding:48px 0;scroll-margin-top:70px"><div class="container">' +
          exploreOtherVisasSection(otherCountries) +
        '</div></section>' +
        countryTravelGuide(country,guideCode);
      if(isEnhanced&&visas.length) wireUaeVisaSelector();
      loadCountryGuideImages(root);
    }

    wireCountryInfoNav();
    if(window.VisaDooCountryExperience) window.VisaDooCountryExperience.initAssistant(country.name);
    wireUaeFaqAccordion();
    document.dispatchEvent(new Event('visadoo:country-rendered'));
  }

  function renderError(title,message){
    document.body.classList.remove('uae-country-page');
    document.body.removeAttribute('data-country-code');
    root.innerHTML='<section class="country-page-error"><div><div class="country-error-icon">!</div><h1>'+esc(title)+'</h1><p>'+esc(message)+'</p><a href="index.html#destinations" class="btn btn-primary btn-lg">Browse destinations</a></div></section>';
  }

  var FALLBACK_COUNTRIES = {
    japan: {
      name: 'Japan',
      slug: 'japan',
      iso2: 'JP',
      seo_title: 'Japan Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Japan tourist visa with simple guided form and document upload.',
      summary: 'Apply for a Japan tourist visa with simple guided form and document upload.'
    },
    denmark: {
      name: 'Denmark',
      slug: 'denmark',
      iso2: 'DK',
      seo_title: 'Denmark Schengen Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Denmark Schengen tourist visa with a simple guided application.',
      summary: 'Apply for a Denmark Schengen short-stay visa with a simple guided form and document upload.'
    },
    china: {
      name: 'China',
      slug: 'china',
      iso2: 'CN',
      seo_title: 'China Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a China tourist or business visa with a simple guided application.',
      summary: 'Apply for a China tourist or business visa with a simple guided form and document upload.'
    },
    spain: {
      name: 'Spain',
      slug: 'spain',
      iso2: 'ES',
      seo_title: 'Spain Schengen Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Spain Schengen tourist visa with a simple guided application.',
      summary: 'Apply for a Spain Schengen short-stay visa with a simple guided form and document upload.'
    },
    'south-korea': {
      name: 'South Korea',
      slug: 'south-korea',
      iso2: 'KR',
      seo_title: 'South Korea Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a South Korea tourist visa with a simple guided application.',
      summary: 'Apply for a South Korea tourist visa with a simple guided form and document upload.'
    },
    switzerland: {
      name: 'Switzerland',
      slug: 'switzerland',
      iso2: 'CH',
      seo_title: 'Switzerland Schengen Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Switzerland Schengen tourist visa with a simple guided application.',
      summary: 'Apply for a Switzerland Schengen short-stay visa with a simple guided form and PDF generation.'
    },
    ireland: {
      name: 'Ireland',
      slug: 'ireland',
      iso2: 'IE',
      seo_title: 'Ireland Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for an Ireland tourist visa online with simple guided steps.',
      summary: 'Explore Dublin, Galway, and the Emerald Isle with simple online visa application.'
    },
    uae: {
      name: 'United Arab Emirates',
      slug: 'uae',
      iso2: 'AE',
      seo_title: 'UAE Visas — Apply Online | Visa Doo',
      seo_description: 'Apply for 30-day and 60-day UAE tourist visas online with quick processing and transparent pricing.',
      summary: 'Explore Dubai, Abu Dhabi, and all seven Emirates with simple online visa processing.'
    },
    france: {
      name: 'France',
      slug: 'france',
      iso2: 'FR',
      seo_title: 'France Schengen Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a France Schengen tourist visa with a simple guided application.',
      summary: 'Apply for a France Schengen short-stay visa with a simple guided form and document upload.'
    },
    germany: {
      name: 'Germany',
      slug: 'germany',
      iso2: 'DE',
      seo_title: 'Germany Schengen Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Germany Schengen tourist visa with a simple guided application.',
      summary: 'Apply for a Germany Schengen short-stay visa with a simple guided form and document upload.'
    },
    greece: {
      name: 'Greece',
      slug: 'greece',
      iso2: 'GR',
      seo_title: 'Greece Schengen Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Greece Schengen tourist visa with a simple guided application.',
      summary: 'Apply for a Greece Schengen short-stay visa with a simple guided form and document upload.'
    },
    italy: {
      name: 'Italy',
      slug: 'italy',
      iso2: 'IT',
      seo_title: 'Italy Schengen Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for an Italy Schengen tourist visa with a simple guided application.',
      summary: 'Apply for an Italy Schengen short-stay visa with a simple guided form and document upload.'
    },
    azerbaijan: {
      name: 'Azerbaijan',
      slug: 'azerbaijan',
      iso2: 'AZ',
      seo_title: 'Azerbaijan eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for an Azerbaijan tourist eVisa with a simple guided application.',
      summary: 'Apply for an Azerbaijan tourist eVisa with a simple guided form and document upload.'
    },
    'azerbaijan-2': {
      name: 'Azerbaijan',
      slug: 'azerbaijan-2',
      iso2: 'AZ',
      group: 'e-visa',
      seo_title: 'Azerbaijan eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for an Azerbaijan tourist eVisa with a simple guided application.',
      summary: 'Apply for an Azerbaijan tourist eVisa with a simple guided form and document upload.'
    },
    thailand: {
      name: 'Thailand',
      slug: 'thailand',
      iso2: 'TH',
      seo_title: 'Thailand Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Thailand tourist visa with a simple guided application.',
      summary: 'Apply for a Thailand tourist visa with a simple guided form and document upload.'
    },
    bahrain: {
      name: 'Bahrain',
      slug: 'bahrain',
      iso2: 'BH',
      seo_title: 'Bahrain eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Bahrain tourist eVisa with a simple guided application.',
      summary: 'Apply for a Bahrain tourist eVisa with a simple guided form and document upload.'
    },
    indonesia: {
      name: 'Indonesia',
      slug: 'indonesia',
      iso2: 'ID',
      seo_title: 'Indonesia Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for an Indonesia tourist or business visa with a simple guided application.',
      summary: 'Apply for an Indonesia tourist or business visa with a simple guided form and document upload.'
    },
    russia: {
      name: 'Russia',
      slug: 'russia',
      iso2: 'RU',
      seo_title: 'Russia Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Russia tourist or business visa with a simple guided application.',
      summary: 'Apply for a Russia tourist or business visa with a simple guided form and document upload.'
    },
    kenya: {
      name: 'Kenya',
      slug: 'kenya',
      iso2: 'KE',
      seo_title: 'Kenya Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Kenya single entry tourist or business visa with a simple guided application.',
      summary: 'Apply for a Kenya single entry tourist or business visa with a simple guided form and document upload.'
    },
    vietnam: {
      name: 'Vietnam',
      slug: 'vietnam',
      iso2: 'VN',
      seo_title: 'Vietnam Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Vietnam tourist eVisa with a simple guided application.',
      summary: 'Apply for a Vietnam tourist eVisa with a simple guided form and document upload.'
    },
    morocco: {
      name: 'Morocco',
      slug: 'morocco',
      iso2: 'MA',
      seo_title: 'Morocco eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Morocco tourist or business eVisa with a simple guided application.',
      summary: 'Apply for a Morocco tourist or business eVisa with a simple guided form and document upload.'
    },
    srilanka: {
      name: 'Sri Lanka',
      slug: 'srilanka',
      iso2: 'LK',
      seo_title: 'Sri Lanka Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Sri Lanka tourist or business ETA / visa with a simple guided application.',
      summary: 'Apply for a Sri Lanka tourist or business ETA with a simple guided form and document upload.'
    },
    turkey: {
      name: 'Turkey',
      slug: 'turkey',
      iso2: 'TR',
      seo_title: 'Turkey eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Turkey tourist eVisa with a simple guided application.',
      summary: 'Apply for a Turkey tourist eVisa with a simple guided form and document upload.'
    },
    'united-arab-emirates': {
      name: 'United Arab Emirates',
      slug: 'united-arab-emirates',
      iso2: 'AE',
      seo_title: 'UAE Visas — Apply Online | Visa Doo',
      seo_description: 'Apply for 30-day and 60-day UAE tourist visas online with quick processing and transparent pricing.',
      summary: 'Explore Dubai, Abu Dhabi, and all seven Emirates with simple online visa processing.'
    },
    qatar: {
      name: 'Qatar',
      slug: 'qatar',
      iso2: 'QA',
      seo_title: 'Qatar Visa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Qatar tourist or business visa with a simple guided application.',
      summary: 'Apply for a Qatar tourist or business visa with a simple guided form and document upload.'
    },
    egypt: {
      name: 'Egypt',
      slug: 'egypt',
      iso2: 'EG',
      seo_title: 'Egypt eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for an Egypt tourist eVisa with a simple guided application.',
      summary: 'Apply for an Egypt tourist eVisa with a simple guided form and document upload.'
    },
    'egypt-2': {
      name: 'Egypt',
      slug: 'egypt-2',
      iso2: 'EG',
      seo_title: 'Egypt eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for an Egypt tourist eVisa with a simple guided application.',
      summary: 'Apply for an Egypt tourist eVisa with a simple guided form and document upload.'
    },
    philippines: {
      name: 'Philippines',
      slug: 'philippines',
      iso2: 'PH',
      seo_title: 'Philippines eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Philippines tourist eVisa with a simple guided application.',
      summary: 'Apply for a Philippines tourist eVisa with a simple guided form and document upload.'
    },
    oman: {
      name: 'Oman',
      slug: 'oman',
      iso2: 'OM',
      seo_title: 'Oman eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for an Oman tourist eVisa with a simple guided application.',
      summary: 'Apply for an Oman tourist eVisa with a simple guided form and document upload.'
    },
    'saudi-arabia': {
      name: 'Saudi Arabia',
      slug: 'saudi-arabia',
      iso2: 'SA',
      seo_title: 'Saudi Arabia eVisa — Apply Online | Visa Doo',
      seo_description: 'Apply for a Saudi Arabia tourist eVisa with a simple guided application.',
      summary: 'Apply for a Saudi Arabia tourist eVisa with a simple guided form and document upload.'
    }
  };

  var UAE_EIGHT_VISAS = [
    {
      slug: 'uae-48-hours-transit-visa',
      name: '48 Hours Transit Visa',
      category: 'Transit',
      stay_period_value: 2,
      stay_period_unit: 'days',
      validity_days: 30,
      sub: 'Single Entry',
      price_aed: 3499,
      processing_time_value: 5,
      processing_time_unit: 'working days'
    },
    {
      slug: 'uae-30-days-tourist-visa',
      name: '30 Days Tourist Visa',
      category: 'Tourist',
      stay_period_value: 30,
      stay_period_unit: 'days',
      validity_days: 58,
      sub: 'Single Entry',
      price_aed: 7600,
      processing_time_value: 5,
      processing_time_unit: 'working days'
    },
    {
      slug: 'uae-30-days-family-tourist-visa',
      name: '30 Days Family Tourist Visa (Includes 2 Adults + 1 Child)',
      category: 'Tourist',
      stay_period_value: 30,
      stay_period_unit: 'days',
      validity_days: 58,
      sub: 'Single Entry',
      price_aed: 19999,
      processing_time_value: 5,
      processing_time_unit: 'working days'
    },
    {
      slug: 'uae-96-hours-transit-visa',
      name: '96 Hours Transit Visa',
      category: 'Transit',
      stay_period_value: 4,
      stay_period_unit: 'days',
      validity_days: 30,
      sub: 'Single Entry',
      price_aed: 5299,
      processing_time_value: 5,
      processing_time_unit: 'working days'
    },
    {
      slug: 'uae-14-days-tourist-visa',
      name: '14 Days Tourist Visa',
      category: 'Tourist',
      stay_period_value: 14,
      stay_period_unit: 'days',
      validity_days: 58,
      sub: 'Single Entry',
      price_aed: 7699,
      processing_time_value: 5,
      processing_time_unit: 'working days'
    },
    {
      slug: 'uae-30-days-tourist-visa-express',
      name: '30 Days Tourist Visa (Express)',
      category: 'Tourist',
      stay_period_value: 30,
      stay_period_unit: 'days',
      validity_days: 58,
      sub: 'Single Entry',
      price_aed: 8999,
      processing_time_value: 48,
      processing_time_unit: 'hours'
    },
    {
      slug: 'uae-60-days-tourist-visa',
      name: '60 Days Tourist Visa',
      category: 'Tourist',
      stay_period_value: 60,
      stay_period_unit: 'days',
      validity_days: 58,
      sub: 'Single Entry',
      price_aed: 10800,
      processing_time_value: 5,
      processing_time_unit: 'working days'
    },
    {
      slug: 'uae-30-days-multiple-entry-visa',
      name: '30 Days Multiple Entry Tourist Visa',
      category: 'Tourist',
      stay_period_value: 30,
      stay_period_unit: 'days',
      validity_days: 58,
      sub: 'Multiple Entry',
      price_aed: 17999,
      processing_time_value: 5,
      processing_time_unit: 'working days'
    }
  ];

  var FALLBACK_VISAS = {
    uae: UAE_EIGHT_VISAS,
    'united-arab-emirates': UAE_EIGHT_VISAS,
    qatar: [
      {
        slug: 'qatar-30-days-tourist-visa-age-1-55',
        name: 'Qatar Tourist Visa 30 Days (Age 1–55 Years)',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 8999,
        prices: { INR: 8999 },
        processing: '5 – 6 Days',
        processing_time_value: '5-6',
        processing_time_unit: 'days'
      },
      {
        slug: 'qatar-30-days-tourist-visa-age-55-plus',
        name: 'Qatar Tourist Visa 30 Days (Age 55 Years & Above)',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 13999,
        prices: { INR: 13999 },
        processing: '5 – 6 Days',
        processing_time_value: '5-6',
        processing_time_unit: 'days'
      },
      {
        slug: 'qatar-30-days-business-visa',
        name: 'Qatar Business Visa 30 Days',
        category: 'Business',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 9999,
        prices: { INR: 9999 },
        processing: '5 – 6 Days',
        processing_time_value: '5-6',
        processing_time_unit: 'days'
      },
      {
        slug: 'qatar-90-days-business-visa',
        name: 'Qatar Business Visa 90 Days',
        category: 'Business',
        stay_period_value: 90,
        stay_period_unit: 'days',
        stay: '90 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 20999,
        prices: { INR: 20999 },
        processing: '5 – 6 Days',
        processing_time_value: '5-6',
        processing_time_unit: 'days'
      }
    ],
    spain: [
      {
        slug: 'spain-schengen-tourist',
        name: 'Spain Schengen Tourist Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Short Stay',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    china: [
      {
        slug: 'china-tourist-visa',
        name: 'China Tourist Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    'south-korea': [
      {
        slug: 'south-korea-tourist-visa',
        name: 'South Korea Tourist Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Short Stay',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    switzerland: [
      {
        slug: 'switzerland-schengen-tourist',
        name: 'Switzerland Schengen Tourist Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Short Stay',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    ireland: [
      {
        slug: 'ireland-tourist-visa',
        name: 'Ireland Tourist Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Short Stay',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    japan: [
      {
        slug: 'japan-tourist-visa',
        name: 'Japan Tourist Visa (eVisa)',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 3200,
        processing_time_value: 1,
        processing_time_unit: 'days'
      },
      {
        slug: 'japan-double-entry',
        name: 'Double Entry Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Double Entry',
        price_aed: 4500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      },
      {
        slug: 'japan-multiple-entry',
        name: 'Multiple Entry Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Multiple Entry',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    france: [
      {
        slug: 'france-schengen-tourist',
        name: 'France Schengen Tourist Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Short Stay',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    germany: [
      {
        slug: 'germany-schengen-tourist',
        name: 'Germany Schengen Tourist Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Short Stay',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    greece: [
      {
        slug: 'greece-schengen-tourist',
        name: 'Greece Schengen Tourist Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Short Stay',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    italy: [
      {
        slug: 'italy-schengen-tourist',
        name: 'Italy Schengen Tourist Visa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Short Stay',
        price_aed: 6500,
        processing_time_value: 1,
        processing_time_unit: 'days'
      }
    ],
    azerbaijan: [
      {
        slug: 'azerbaijan-tourist-evisa',
        name: 'Azerbaijan Tourist E Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 2899,
        processing: 'Upto 3 Days',
        processing_time_value: 3,
        processing_time_unit: 'days'
      },
      {
        slug: 'azerbaijan-business-evisa',
        name: 'Azerbaijan Business E Visa',
        category: 'Business',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 2899,
        processing: 'Upto 3 Days',
        processing_time_value: 3,
        processing_time_unit: 'days'
      }
    ],
    'azerbaijan-2': [
      {
        slug: 'azerbaijan-tourist-evisa',
        name: 'Azerbaijan Tourist E Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 2899,
        processing: 'Upto 3 Days',
        processing_time_value: 3,
        processing_time_unit: 'days'
      },
      {
        slug: 'azerbaijan-business-evisa',
        name: 'Azerbaijan Business E Visa',
        category: 'Business',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 2899,
        processing: 'Upto 3 Days',
        processing_time_value: 3,
        processing_time_unit: 'days'
      }
    ],
    thailand: [
      {
        slug: 'thailand-e-visa',
        name: 'Thailand E Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '1 Month',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 499,
        processing: '24 Hours',
        processing_time_value: 24,
        processing_time_unit: 'hours'
      },
      {
        slug: 'thailand-e-visa-express',
        name: 'Thailand E Visa (Express)',
        category: 'Tourist',
        stay_period_value: 15,
        stay_period_unit: 'days',
        stay: 'Upto 15 Days',
        validity: '1 Month',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 11999,
        processing: 'Upto 24 Hours',
        processing_time_value: 24,
        processing_time_unit: 'hours'
      },
      {
        slug: 'thailand-tourist-visa-stamp-visa',
        name: 'Thailand Tourist Visa (Stamp Visa)',
        category: 'Tourist',
        stay_period_value: 60,
        stay_period_unit: 'days',
        stay: 'Upto 60 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 5999,
        processing: '3 – 4 Days',
        processing_time_value: '3-4',
        processing_time_unit: 'days'
      },
      {
        slug: 'thailand-business-visa-stamp-visa',
        name: 'Thailand Business Visa (Stamp Visa)',
        category: 'Business',
        stay_period_value: 90,
        stay_period_unit: 'days',
        stay: 'Upto 90 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 7999,
        processing: '3 – 4 Days',
        processing_time_value: '3-4',
        processing_time_unit: 'days'
      }
    ],
    bahrain: [
      {
        slug: 'bahrain-14-days-tourist-visa',
        name: 'Bahrain 2 Weeks Single Entry',
        category: 'Tourist',
        stay_period_value: 14,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 4500,
        processing_time_value: '3-5',
        processing_time_unit: 'working days'
      },
      {
        slug: 'bahrain-30-days-tourist-visa',
        name: 'Bahrain One Month Multiple Entry',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Multiple Entry',
        price_aed: 7000,
        processing_time_value: '3-5',
        processing_time_unit: 'working days'
      },
      {
        slug: 'bahrain-one-year-multiple-entry',
        name: 'Bahrain One Year Multiple Entry',
        category: 'Tourist',
        stay_period_value: 365,
        stay_period_unit: 'days',
        sub: 'Multiple Entry',
        price_aed: 14000,
        processing_time_value: '3-5',
        processing_time_unit: 'working days'
      }
    ],
    indonesia: [
      {
        slug: 'indonesia-tourist-visa',
        name: 'Indonesia Tourist Visa',
        category: 'Tourist',
        stay: '30 Days',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 8999,
        features: ['Stay Period: 30 Days', 'Single Entry', 'Extension: Not Permitted', 'Processing: 5-7 Working Days'],
        processing_time_value: '5-7',
        processing_time_unit: 'working days'
      },
      {
        slug: 'indonesia-business-visa',
        name: 'Indonesia Business Visa',
        category: 'Business',
        stay: '30 Days',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 8999,
        features: ['Stay Period: 30 Days', 'Single Entry', 'Extension: Not Permitted', 'Processing: 5-7 Working Days'],
        processing_time_value: '5-7',
        processing_time_unit: 'working days'
      }
    ],
    russia: [
      {
        slug: 'russia-tourist-visa',
        name: 'Russia Tourist Visa',
        category: 'Tourist',
        stay: '30 Days',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 4999,
        validity: 'As per Embassy',
        processing_time_value: '10-12',
        processing_time_unit: 'days'
      },
      {
        slug: 'russia-business-visa',
        name: 'Russia Business Visa',
        category: 'Business',
        stay: '3 Months',
        stay_period_value: 90,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 4999,
        validity: 'As per Embassy',
        processing_time_value: '10-12',
        processing_time_unit: 'days'
      }
    ],
    kenya: [
      {
        slug: 'kenya-single-entry-tourist-visa',
        name: 'Single Entry Tourist Visa',
        category: 'Tourist',
        stay: 'As per Embassy',
        sub: 'Single Entry',
        price_aed: 5999,
        validity: '3 Months',
        processing_time_value: 2,
        processing_time_unit: 'days'
      },
      {
        slug: 'kenya-single-entry-business-visa',
        name: 'Single Entry Business Visa',
        category: 'Business',
        stay: '72 Hours',
        sub: 'Single Entry',
        price_aed: 5999,
        validity: '3 Months',
        processing_time_value: 2,
        processing_time_unit: 'days'
      }
    ],
    vietnam: [
      {
        slug: 'vietnam-tourist-visa',
        name: 'Tourist eVisa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 2999,
        processing_time_value: 5,
        processing_time_unit: 'working days'
      },
      {
        slug: 'vietnam-tourist-visa-express',
        name: 'Tourist eVisa (Express)',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 9999,
        processing_time_value: 24,
        processing_time_unit: 'hours'
      },
      {
        slug: 'vietnam-tourist-visa-super-express',
        name: 'Tourist eVisa (Super Express)',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 10999,
        processing_time_value: 12,
        processing_time_unit: 'hours'
      }
    ],
    morocco: [
      {
        slug: 'morocco-tourist-visa',
        name: 'Morocco Tourist eVisa',
        category: 'Tourist',
        stay_period_value: 90,
        stay_period_unit: 'days',
        stay: 'Up to 90 Days',
        validity: 'Up to 90 Days',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 4149,
        prices: { INR: 4149 },
        processing: '3 – 5 Days',
        processing_time_value: '3-5',
        processing_time_unit: 'days'
      },
      {
        slug: 'morocco-business-visa',
        name: 'Morocco Business eVisa',
        category: 'Business',
        stay_period_value: 90,
        stay_period_unit: 'days',
        stay: 'Up to 90 Days',
        validity: 'Up to 90 Days',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 4149,
        prices: { INR: 4149 },
        processing: '5 – 7 Days',
        processing_time_value: '5-7',
        processing_time_unit: 'days'
      }
    ],
    srilanka: [
      {
        slug: 'srilanka-30-days-tourist-visa',
        name: '30 Days Sri Lanka Tourist Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: 'Upto 30 Days',
        validity: '6 Months',
        validity_days: 180,
        sub: 'Double Entry',
        price_aed: 999,
        prices: { INR: 999 },
        processing: '24 to 48 Hours',
        processing_time_value: 48,
        processing_time_unit: 'hours'
      },
      {
        slug: 'srilanka-30-days-business-visa',
        name: '30 Days Sri Lanka Business Visa',
        category: 'Business',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: 'Upto 30 Days',
        validity: '6 Months',
        validity_days: 180,
        sub: 'Multiple Entry',
        price_aed: 3499,
        prices: { INR: 3499 },
        processing: '24 to 48 Hours',
        processing_time_value: 48,
        processing_time_unit: 'hours'
      }
    ],
    turkey: [
      {
        slug: 'turkey-tourist-visa',
        name: 'Turkey Tourist eVisa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 5500,
        processing_time_value: '1-2',
        processing_time_unit: 'working days'
      }
    ],
    egypt: [
      {
        slug: 'egypt-tourist-visa',
        name: 'Egypt Tourist Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '30 Days',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 5999,
        prices: { INR: 5999 },
        processing: '10 - 15 Days',
        processing_time_value: 15,
        processing_time_unit: 'days'
      },
      {
        slug: 'egypt-business-visa',
        name: 'Egypt Business Visa',
        category: 'Business',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '30 Days',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 6999,
        prices: { INR: 6999 },
        processing: '10 - 15 Days',
        processing_time_value: 15,
        processing_time_unit: 'days'
      }
    ],
    'egypt-2': [
      {
        slug: 'egypt-tourist-visa',
        name: 'Egypt Tourist Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '30 Days',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 5999,
        prices: { INR: 5999 },
        processing: '10 - 15 Days',
        processing_time_value: 15,
        processing_time_unit: 'days'
      },
      {
        slug: 'egypt-business-visa',
        name: 'Egypt Business Visa',
        category: 'Business',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '30 Days',
        validity_days: 30,
        sub: 'Single Entry',
        price_aed: 6999,
        prices: { INR: 6999 },
        processing: '10 - 15 Days',
        processing_time_value: 15,
        processing_time_unit: 'days'
      }
    ],
    philippines: [
      {
        slug: 'philippines-single-entry-visa',
        name: 'Philippines Single Entry Visa',
        category: 'Tourist / Business',
        stay_period_value: 59,
        stay_period_unit: 'days',
        stay: 'Upto 59 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 8499,
        processing: '8 - 10 Days',
        processing_time_value: 10,
        processing_time_unit: 'days'
      },
      {
        slug: 'philippines-multiple-entry-business-visa',
        name: 'Philippines Multiple Entry Business Visa',
        category: 'Business',
        stay_period_value: 59,
        stay_period_unit: 'days',
        stay: 'Upto 59 Days',
        validity: '6 Months / 1 Year',
        validity_days: 365,
        sub: 'Multiple Entry',
        price_aed: 9999,
        processing: '8 - 10 Days',
        processing_time_value: 10,
        processing_time_unit: 'days'
      }
    ],
    oman: [
      {
        slug: 'oman-10-days-tourist-visa',
        name: '10 Days Tourist Visa',
        category: 'Tourist',
        stay_period_value: 10,
        stay_period_unit: 'days',
        stay: '10 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 4499,
        processing: '5 - 6 Days',
        processing_time_value: 6,
        processing_time_unit: 'days'
      },
      {
        slug: 'oman-30-days-tourist-visa',
        name: '30 Days Tourist Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        stay: '30 Days',
        validity: '3 Months',
        validity_days: 90,
        sub: 'Single Entry',
        price_aed: 7999,
        processing: '5 - 6 Days',
        processing_time_value: 6,
        processing_time_unit: 'days'
      }
    ],
    'saudi-arabia': [
      {
        slug: 'saudi-arabia-30-days-tourist-visa',
        name: 'Saudi Arabia Tourist Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 16000,
        processing_time_value: 5,
        processing_time_unit: 'working days'
      }
    ],
    saudi: [
      {
        slug: 'saudi-arabia-30-days-tourist-visa',
        name: 'Saudi Arabia Tourist Visa',
        category: 'Tourist',
        stay_period_value: 30,
        stay_period_unit: 'days',
        sub: 'Single Entry',
        price_aed: 16000,
        processing_time_value: 5,
        processing_time_unit: 'working days'
      }
    ]
  };

  // Public Sri Lanka route uses the hyphenated slug. Keep fallback content identical.
  FALLBACK_COUNTRIES['sri-lanka'] = FALLBACK_COUNTRIES.srilanka;
  FALLBACK_VISAS['sri-lanka'] = FALLBACK_VISAS.srilanka;

  var FALLBACK_REVIEWS = [
    { name: 'Rahul Sharma', location: 'Delhi', rating: 5, body: 'Extremely fast service! Got my UAE visa in less than 2 days. The tracking system is very detailed.' },
    { name: 'Sarah Jenkins', location: 'London', rating: 5, body: 'The team was incredibly helpful on WhatsApp when I had to change a document. Highly recommend!' },
    { name: 'Mohamed Al-Ansari', location: 'Dubai', rating: 5, body: 'Seamless experience. Applied online and received the electronic visa directly in my email. Very professional.' }
  ];

  var slug = 'uae';

  resolveSlug().then(function(resolvedSlug){
    slug = resolvedSlug;
    var visaQuery = '';
    var parts = window.location.pathname.split('/').filter(Boolean);
    if(parts.indexOf('visa') > -1 && parts[parts.indexOf('visa') + 1]) {
      visaQuery = decodeURIComponent(parts[parts.indexOf('visa') + 1]);
      // Set the query parameter so country-experience/application knows to select this visa
      var newUrl = new URL(window.location.href);
      newUrl.searchParams.set('visa', visaQuery);
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search + newUrl.hash);
    }

    if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY){
      var fallbackC = FALLBACK_COUNTRIES[slug];
      if(!fallbackC){
        renderError('Destination not found', 'We don’t have this destination yet.<br><br><a href="/" class="btn btn-primary btn-lg" style="display:inline-block;margin-top:14px">Browse destinations</a>');
        return;
      }
      var fallbackV = FALLBACK_VISAS[slug] || [];
      window.UAE_REVIEWS = FALLBACK_REVIEWS;
      renderCountry(fallbackC, fallbackV, FALLBACK_REVIEWS);
      return;
    }

    Promise.all([
      fetchJson('/rest/v1/countries?slug=eq.'+encodeURIComponent(slug)+'&active=eq.true&select=*'),
      fetchJson('/rest/v1/visa_types?country_slug=eq.'+encodeURIComponent(slug)+'&active=eq.true&order=sort_order&select=*'),
      fetchJson('/rest/v1/reviews?active=eq.true&order=sort_order&select=*').catch(function(){ return []; }),
      fetchJson('/rest/v1/countries?active=eq.true&order=sort_order&select=*').catch(function(){ return []; }),
      fetchJson('/rest/v1/pages?slug=eq.system-nationality-destinations&status=eq.published&select=content&limit=1').catch(function(){ return []; })
    ]).then(function(data){
      var c = (data[0] && data[0].length) ? data[0][0] : FALLBACK_COUNTRIES[slug];
      if(!c){
        renderError('Destination not found', 'We don’t have this destination yet.<br><br><a href="/" class="btn btn-primary btn-lg" style="display:inline-block;margin-top:14px">Browse destinations</a>');
        return;
      }
      var forcedConfigured = ['egypt','egypt-2','philippines','oman','saudi-arabia','saudi','uae','united-arab-emirates','vietnam','thailand'].indexOf(slug) > -1;
      var v = forcedConfigured ? (FALLBACK_VISAS[slug] || []) : ((data[1] && data[1].length) ? data[1] : (FALLBACK_VISAS[slug] || []));
      var r = (data[2] && data[2].length) ? data[2] : FALLBACK_REVIEWS;
      var allActive = (data[3] && data[3].length) ? data[3] : [];

      var natRows = Array.isArray(data[4]) ? data[4] : [];
      var parsedNats = [];
      try { parsedNats = JSON.parse((natRows[0] && natRows[0].content) || '[]'); } catch(e) { parsedNats = []; }
      var nationalities = (Array.isArray(parsedNats) ? parsedNats : []).filter(function(n){ return n.active !== false; });
      var selectedNatName = localStorage.getItem('visadoo_nationality') || 'India';
      var selectedNat = nationalities.filter(function(n){ return n.name === selectedNatName; })[0];
      var allowedSlugs = selectedNat && Array.isArray(selectedNat.destinations) ? selectedNat.destinations : null;

      var others = allActive.filter(function(ac){ return ac.slug !== slug; });
      if (allowedSlugs) {
        others = others.filter(function(ac){ return allowedSlugs.indexOf(ac.slug) > -1; });
      }

      window.UAE_REVIEWS = r;
      renderCountry(c, v, r, others);
    }).catch(function(){
      var fallbackC = FALLBACK_COUNTRIES[slug];
      if(fallbackC){
        var fallbackV = FALLBACK_VISAS[slug] || [];
        window.UAE_REVIEWS = FALLBACK_REVIEWS;
        renderCountry(fallbackC, fallbackV, FALLBACK_REVIEWS, []);
      } else {
        renderError('Destination not found', 'We don’t have this destination yet.<br><br><a href="/" class="btn btn-primary btn-lg" style="display:inline-block;margin-top:14px">Browse destinations</a>');
      }
    });

    if (!window.__visadooNationalityCountryBound) {
      window.__visadooNationalityCountryBound = true;
      document.addEventListener('nationalitychanged', function(){
        window.location.reload();
      });
    }
  });
})();
