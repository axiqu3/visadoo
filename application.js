/* ============================================================
   Visa Doo — Application area
   Sign-in (Google + email code) · Apply · Upload · Track · Admin
   ============================================================ */
(function () {
  var cfg = window.VISADOO_CONFIG;
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  var SITE_PATH = 'visadoo-uae.netlify.app';

  var root = document.getElementById('appRoot');
  var headerActions = document.getElementById('headerActions');
  var toastEl = document.getElementById('toast');

  var state = { user: null, role: null, isAdmin: false, view: 'apply' };

  // Exact marketing-consent wording shown to customers (stored as an audit snapshot).
  var MARKETING_CONSENT_TEXT = 'Keep me updated with visa offers, tips and news by email and WhatsApp.';

  // ---- role helpers ----
  function hasRole(list){ return list.indexOf(state.role) > -1; }
  function isStaff(){ return hasRole(['admin','agent','content','viewer','finance','sales']); }
  function canViewApps(){ return hasRole(['admin','agent','viewer','finance','sales']); }
  function canProcessApps(){ return hasRole(['admin','agent']); }
  function canManageContent(){ return hasRole(['admin','content']); }
  function isFinance(){ return hasRole(['admin','finance']); }   // sees money: suppliers, finance panels, margin
  function canCRM(){ return hasRole(['admin','agent','sales','viewer']); }   // CRM: view leads/enquiries/follow-ups
  function canEditCRM(){ return hasRole(['admin','agent','sales']); }        // CRM: create/edit/convert (viewer = read-only)
  function defaultStaffView(){ return 'dashboard'; }   // all staff land on the read-only Dashboard

  // Visa types: loaded live from the database (config is just a fallback)
  var VISAS = (cfg.VISAS || []).slice();
  function mapVisaRow(r){
    return { id:r.slug, name:r.name, sub:r.sub, price:r.price_aed, days:r.days,
             popular:r.popular, blurb:r.blurb, features:r.features||[], active:r.active,
             country_slug:r.country_slug, category:r.category, prices:r.prices||{},
             etaValue:r.processing_time_value, etaUnit:r.processing_time_unit };
  }
  // Expected processing time as a friendly estimate, e.g. "about 5 days" (blank if not set).
  function etaText(v){
    if(!v) return '';
    var n=(v.etaValue!=null?v.etaValue:v.processing_time_value);
    var u=(v.etaUnit||v.processing_time_unit);
    if(n==null||n==='' || !u) return '';
    var unit = u==='hours' ? ('hour'+(Number(n)===1?'':'s')) : ('day'+(Number(n)===1?'':'s'));
    return 'about '+n+' '+unit;
  }
  function loadVisaTypes(){
    return sb.from('visa_types').select('*').eq('active',true).order('sort_order').then(function(r){
      if(!r.error && r.data && r.data.length){ VISAS = r.data.map(mapVisaRow); }
      return VISAS;
    });
  }

  // ---- currency: INR only. Base price is stored on price_aed (kept name) / prices.INR. ----
  var activeCurrency = { code:'INR', symbol:'₹' };
  function loadCurrency(){ activeCurrency = { code:'INR', symbol:'₹' }; return Promise.resolve(activeCurrency); }
  // Format a number as Indian-grouped rupees, e.g. ₹1,23,456.
  function money(amount){
    if(amount==null || amount==='' || isNaN(Number(amount))) return '';
    return '₹' + Number(amount).toLocaleString('en-IN');
  }
  // A visa's INR price, or null if none set (shown as "Price on request").
  function visaPrice(v){
    if(!v) return null;
    var p = (v.prices && v.prices.INR!=null && v.prices.INR!=='') ? v.prices.INR : (v.price!=null ? v.price : v.price_aed);
    return (p==null || p==='' || isNaN(Number(p)) || Number(p)<=0) ? null : Number(p);
  }
  function visaPriceText(v){ var p=visaPrice(v); return p==null ? 'Price on request' : money(p); }
  function appPriceText(a){
    var v=visaById(a.visa_type);
    if(v) return visaPriceText(v);
    var p=a.price_aed; return (p==null || Number(p)<=0) ? 'Price on request' : money(p);
  }

  // Countries & groups (for admin managers + visa assignment)
  var countryList = [], groupList = [];
  function loadCountriesGroups(){
    return Promise.all([
      sb.from('countries').select('*').order('sort_order'),
      sb.from('visa_groups').select('*').order('sort_order')
    ]).then(function(res){ countryList=(res[0].data)||[]; groupList=(res[1].data)||[]; return true; });
  }
  function countryName(slug){ for(var i=0;i<countryList.length;i++){ if(countryList[i].slug===slug) return countryList[i].name; } return slug||'—'; }
  function fnUrl(name){ return cfg.SUPABASE_URL.replace(/\/$/,'') + '/functions/v1/' + name; }

  // Email the customer when their status changes (sends only for key stages; silently skips if email isn't set up).
  function notifyStatusChange(appId, status, fullName){
    sb.auth.getSession().then(function(sess){
      var token=sess.data.session?sess.data.session.access_token:cfg.SUPABASE_ANON_KEY;
      return fetch(fnUrl('send-status-email'), {
        method:'POST', headers:{ 'Content-Type':'application/json', 'apikey':cfg.SUPABASE_ANON_KEY, 'Authorization':'Bearer '+token },
        body: JSON.stringify({ application_id:appId, status:status, origin:location.origin })
      });
    }).then(function(r){ return r.json().catch(function(){return {};}); }).then(function(d){
      if(d && d.ok){ toast((fullName?fullName.split(' ')[0]:'Customer')+' was emailed about the update'); }
      else if(d && d.error){ toast('Status saved — but the email didn’t send. Check the Email screen.'); console.error('status email error:', d.error, d.detail||''); }
      // "skipped" (not a key stage / no key / disabled) stays quiet — the status still updated
    }).catch(function(){ /* ignore — status update already saved */ });
  }

  // ---------- tiny helpers ----------
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function el(html){ var d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
  function toast(msg){ toastEl.textContent=msg; toastEl.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(function(){toastEl.classList.remove('show');},3200); }
  function planeLogo(){ return '<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>'; }
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function visaById(id){ for(var i=0;i<VISAS.length;i++){ if(VISAS[i].id===id) return VISAS[i]; } return null; }
  function qParam(k){ return new URLSearchParams(location.search).get(k); }

  // Prepare an image for upload: normalise to a web-friendly JPEG and shrink if huge.
  // Resolves {blob, ext, type}; rejects {code:'decode'|'big'|'convert', name}.
  function prepareImage(file){
    return new Promise(function(resolve, reject){
      if(file.size > 25*1024*1024){ reject({code:'big'}); return; }
      if(file.type === 'image/gif'){ // keep gifs as-is (canvas would drop animation)
        if(file.size > 10485760){ reject({code:'big'}); return; }
        resolve({ blob:file, ext:'gif', type:'image/gif' }); return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function(){
        URL.revokeObjectURL(url);
        var maxW = 1200;
        var scale = Math.min(1, maxW / (img.naturalWidth || maxW));
        var w = Math.max(1, Math.round((img.naturalWidth||maxW) * scale));
        var h = Math.max(1, Math.round((img.naturalHeight||maxW) * scale));
        try {
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h); // flatten transparency for JPEG
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(function(blob){
            if(!blob){ reject({code:'convert'}); return; }
            resolve({ blob:blob, ext:'jpg', type:'image/jpeg' });
          }, 'image/jpeg', 0.85);
        } catch(e){ reject({code:'convert'}); }
      };
      img.onerror = function(){ URL.revokeObjectURL(url); reject({code:'decode', name:file.name}); };
      img.src = url;
    });
  }

  // ---------- header ----------
  function clearStoredAuthSession(){
    try{
      var projectRef=(new URL(cfg.SUPABASE_URL)).hostname.split('.')[0];
      var authKey='sb-'+projectRef+'-auth-token';
      Object.keys(localStorage).forEach(function(key){
        if(key===authKey || key.indexOf(authKey+'.')===0) localStorage.removeItem(key);
      });
    }catch(_e){}
  }
  function signOutCurrentUser(btn){
    if(!btn || btn.disabled) return;
    btn.disabled=true;
    btn.textContent='Signing out…';
    var finished=false;
    var timer=setTimeout(function(){ finish(true); },5000);
    function finish(useFallback){
      if(finished) return;
      finished=true;
      clearTimeout(timer);
      if(useFallback) clearStoredAuthSession();
      location.replace(location.pathname);
    }
    Promise.resolve().then(function(){
      return sb.auth.signOut({scope:'local'});
    }).then(function(result){
      finish(!!(result && result.error));
    }).catch(function(){
      finish(true);
    });
  }
  function renderHeader(){
    var header=document.querySelector('.header');
    var navLinks=document.getElementById('appNavLinks');
    if(!state.user){
      if(header){ header.classList.remove('app-customer-header'); header.classList.remove('discover-header'); }
      if(navLinks){ navLinks.hidden=true; navLinks.classList.remove('open'); }
      headerActions.innerHTML='<a class="signin-home-link" href="index.html">Back to home <span aria-hidden="true">&rarr;</span></a>';
      return;
    }
    var meta = state.user.user_metadata || {};
    var name = meta.full_name || meta.name || state.user.email || 'You';
    var initial = (name[0]||'U').toUpperCase();
    var av = meta.avatar_url ? '<img src="'+esc(meta.avatar_url)+'" alt="">' : esc(initial);
    var roleLabels = { admin:'Admin', agent:'Agent', content:'Content', viewer:'Viewer', finance:'Finance', sales:'Sales' };
    var roleBadge = isStaff() ? '<span class="role-badge">'+esc(roleLabels[state.role]||state.role)+'</span>' : '';
    if(!isStaff()){
      if(header){ header.classList.add('app-customer-header'); header.classList.add('discover-header'); }
      if(navLinks){ navLinks.hidden=true; navLinks.classList.remove('open'); }
      headerActions.innerHTML =
        '<button class="nav-track app-header-track '+(state.view==='track'?'active':'')+'" data-go="track" type="button">Track visa</button>'+
        '<button class="nav-profile app-header-profile '+(state.view==='profile'?'active':'')+'" data-go="profile" type="button" aria-label="Profile" title="Profile"></button>';
    } else {
      if(header){ header.classList.remove('app-customer-header'); header.classList.remove('discover-header'); }
      if(navLinks){ navLinks.hidden=true; navLinks.classList.remove('open'); }
      headerActions.innerHTML =
        '<button class="user-chip profile-trigger" data-go="profile" type="button" aria-label="Open profile"><span class="avatar">'+av+'</span><span class="uname">Profile</span>'+roleBadge+'</button>'+
        '<button class="link-btn app-signout" id="signOutBtn" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Sign out</span></button>';
    }
    headerActions.querySelectorAll('[data-go]').forEach(function(b){ b.onclick=function(){ go(b.getAttribute('data-go')); }; });
    var signOutBtn=document.getElementById('signOutBtn');
    if(signOutBtn) signOutBtn.onclick=function(){ signOutCurrentUser(this); };
  }

  function go(view){ state.view=view; location.hash=view; renderHeader(); render(); }

  // ============================================================
  //  SIGN IN
  // ============================================================
  function finishGooglePopup(user){
    if(!user || window.name!=='visadoo-google-signin' || !window.opener) return false;
    try{
      window.opener.postMessage({type:'visadoo-google-auth-complete'},location.origin);
      setTimeout(function(){ window.close(); },120);
      return true;
    }catch(_popupCloseError){
      return false;
    }
  }
  function authRedirectUrl(intended){
    var url = new URL('/app.html', location.origin);
    if(intended) url.searchParams.set('visa', intended);
    return url.toString();
  }
  function emailLinkRedirectUrl(intended){
    var url = new URL(authRedirectUrl(intended));
    url.searchParams.set('set_password','1');
    return url.toString();
  }
  function passwordSetupRequested(){
    return qParam('set_password')==='1';
  }
  function consumePasswordSetupRequest(){
    if(!passwordSetupRequested()) return;
    try{
      var url=new URL(location.href);
      url.searchParams.delete('set_password');
      url.hash='setpw';
      history.replaceState(null,'',url.pathname+url.search+url.hash);
    }catch(_urlError){}
  }
  function rememberOAuthReturn(redirectTo){
    try{
      var url=new URL(redirectTo,location.origin);
      var returnTo=url.pathname+url.search;
      sessionStorage.setItem('visadoo-oauth-return',returnTo);
      localStorage.setItem('visadoo-oauth-pending',JSON.stringify({returnTo:returnTo,createdAt:Date.now()}));
    }catch(_storageError){}
  }
  function clearOAuthPending(){
    try{ localStorage.removeItem('visadoo-oauth-pending'); }catch(_storageError){}
  }
  function authSettings(){
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function(){ controller.abort(); }, 6000) : null;
    return fetch(cfg.SUPABASE_URL.replace(/\/$/,'') + '/auth/v1/settings', {
      headers:{ apikey:cfg.SUPABASE_ANON_KEY },
      signal:controller ? controller.signal : undefined
    }).then(function(response){
      if(!response.ok) throw new Error('Could not check login settings.');
      return response.json();
    }).finally(function(){ if(timer) clearTimeout(timer); });
  }
  function oauthErrorFromLocation(){
    var query = new URLSearchParams(location.search);
    var hash = new URLSearchParams((location.hash||'').replace(/^#/,''));
    return query.get('error_description') || hash.get('error_description') ||
           query.get('error') || hash.get('error') || '';
  }
  function renderSignIn(){
    document.body.classList.add('signin-page');
    document.body.classList.remove('has-admin-side','side-open','apply-reviewing');
    renderHeader();
    var intended = qParam('visa');
    document.body.classList.toggle('apply-focus',!!intended);
    root.innerHTML='';
    var card = el(
      '<main class="signin-wrap">'+(intended?'<a class="application-auth-back" href="country.html?slug=united-arab-emirates#visa-info">← Back</a>':'')+'<div class="signin-shell">' +
        '<section class="signin-form-panel">' +
          '<div class="signin-card">' +
        '<h2 id="signinTitle">Sign in</h2>' +
        '<p class="muted" id="signinSubtitle">Enter your email to continue.</p>' +
        '<div class="signin-msg" id="siMsg"></div>' +
        '<div id="emailStep">' +
          '<div class="field"><label for="siEmail">Email address</label>' +
            '<div class="input-icon-wrap">' +
              '<span class="field-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>' +
              '<input id="siEmail" type="email" placeholder="you@example.com" autocomplete="email">' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" id="continueEmailBtn">Continue</button>' +
        '</div>' +
        '<div id="accountStep" style="display:none">' +
          '<div class="signin-account-row"><span id="accountEmail"></span><button class="signin-step-back" id="editEmailBtn" type="button">Change</button></div>' +
          '<div class="field"><label for="siPass">Password</label>' +
            '<div class="input-icon-wrap">' +
              '<span class="field-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>' +
              '<input id="siPass" type="password" placeholder="Enter your password" autocomplete="current-password">' +
              '<button type="button" class="pw-toggle" id="togglePwBtn" title="Toggle password visibility">' +
                '<svg id="eyeIcon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-primary btn-block" id="pwBtn">Sign in with password</button>' +
          '<button class="link-btn signin-forgot" id="forgotBtn" type="button">Forgot password?</button>' +
          '<div class="or-divider">or</div>' +
          '<button class="btn btn-ghost btn-block signin-link-option" id="sendCodeBtn">Email me a sign-in link</button>' +
        '</div>' +
        '<div id="sentStep" style="display:none">' +
          '<div style="text-align:center;padding:10px 0 16px">' +
            '<div style="width:58px;height:58px;border-radius:50%;background:var(--sky-50);display:grid;place-items:center;margin:0 auto 14px;color:var(--blue-600);box-shadow:0 4px 12px rgba(37,99,235,0.15)">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="30" height="30"><path d="M22 6l-10 7L2 6"/><rect x="2" y="6" width="20" height="13" rx="2"/></svg></div>' +
            '<b style="font-size:18px">Check your email</b>' +
            '<p style="color:var(--muted);font-size:14.5px;margin-top:6px;line-height:1.5">We sent a sign-in link to <b id="sentTargetEmail" style="color:var(--ink)"></b>.<br>Tap it to sign in, then create your password.</p>' +
          '</div>' +
          '<button class="link-btn" id="backToEmail" style="margin-top:4px;font-weight:700">← Back to sign in</button>' +
        '</div>' +
        '<div id="googleGroup">' +
          '<div class="or-divider">or</div>' +
          '<button class="btn btn-google" id="googleBtn">' +
            '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>' +
            'Continue with Google' +
          '</button>' +
        '</div>' +
        '<p class="fine">By continuing you agree to let Visa Doo process your application details. ' +
        (intended ? 'You\'re applying for the <b>'+esc((visaById(intended)||{}).name||'')+'</b>.' : '') +
        '</p>' +
          '</div>' +
        '</section>' +
      '</div></main>'
    );
    root.appendChild(card);

    var msg=document.getElementById('siMsg');
    function showMsg(t,cls){ msg.className='signin-msg '+cls; msg.innerHTML=t; }

    var oauthError = oauthErrorFromLocation();
    if(oauthError) showMsg('Google sign-in could not be completed: '+esc(oauthError),'err');

    if(!window.__visadooGooglePopupListener){
      window.__visadooGooglePopupListener=true;
      window.addEventListener('message',function(event){
        if(event.origin!==location.origin || !event.data || event.data.type!=='visadoo-google-auth-complete') return;
        location.reload();
      });
    }

    // Google Sign-In
    var googleBtn=document.getElementById('googleBtn');
    googleBtn.onclick=function(){
      if(googleBtn.disabled) return;
      var originalHtml=googleBtn.innerHTML;
      var popupWidth=520, popupHeight=700;
      var popupLeft=Math.max(0,Math.round((window.screen.width-popupWidth)/2));
      var popupTop=Math.max(0,Math.round((window.screen.height-popupHeight)/2));
      var popupFeatures='popup=yes,width='+popupWidth+',height='+popupHeight+',left='+popupLeft+',top='+popupTop+',resizable=yes,scrollbars=yes';
      var authPopup=window.open('','visadoo-google-signin',popupFeatures);
      if(authPopup){
        try{
          authPopup.document.title='Sign in with Google';
          authPopup.document.body.innerHTML='<div style="min-height:90vh;display:grid;place-items:center;font:600 15px Arial,sans-serif;color:#475569">Connecting to Google…</div>';
        }catch(_popupPreviewError){}
      }
      googleBtn.disabled=true;
      googleBtn.innerHTML='<span class="spin"></span> Connecting to Google…';
      showMsg('Checking Google sign-in status…','info');
      var redirectTo = authRedirectUrl(intended);
      rememberOAuthReturn(redirectTo);

      function resetGoogleButton(message){
        if(authPopup && !authPopup.closed) authPopup.close();
        clearOAuthPending();
        googleBtn.disabled=false;
        googleBtn.innerHTML=originalHtml;
        if(message) showMsg(message,'err');
      }
      function openGoogleChooser(){
        return sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectTo,
            skipBrowserRedirect: true,
            queryParams: { prompt: 'select_account' }
          }
        }).then(function(result){
          if(result && result.error){
            resetGoogleButton(esc(result.error.message || 'Google sign-in could not start. Please use the email option below.'));
            return;
          }
          var chooserUrl=result && result.data && result.data.url;
          if(!chooserUrl){
            resetGoogleButton('Google sign-in could not start. Please use the email option below.');
            return;
          }
          showMsg('Choose your Google account in the sign-in window.','info');
          if(authPopup && !authPopup.closed) authPopup.location.replace(chooserUrl);
          else location.assign(chooserUrl);
        }).catch(function(){
          resetGoogleButton('Google sign-in could not start. Please use the email option below.');
        });
      }

      authSettings().then(function(settings){
        if(settings && settings.external && settings.external.google === false){
          resetGoogleButton('Google sign-in is not enabled yet. Please use the email option above.');
          return;
        }
        openGoogleChooser();
      }).catch(function(){
        openGoogleChooser();
      });
    };

    var redirectTo = emailLinkRedirectUrl(intended);

    // Email-first account flow. Password sign-in includes a safe email-link fallback.
    var emailStep=document.getElementById('emailStep');
    var accountStep=document.getElementById('accountStep');
    var googleGroup=document.getElementById('googleGroup');
    var emailInput=document.getElementById('siEmail');
    var siPass=document.getElementById('siPass');
    var sendBtn=document.getElementById('sendCodeBtn');
    function showAccountStep(){
      var email=emailInput.value.trim();
      if(!/.+@.+\..+/.test(email)){ showMsg('Please enter a valid email address.','err'); return; }
      document.getElementById('accountEmail').textContent=email;
      emailStep.style.display='none';
      accountStep.style.display='block';
      googleGroup.style.display='none';
      document.getElementById('signinSubtitle').textContent='Enter your password or request a sign-in link.';
      msg.className='signin-msg';
      siPass.focus();
    }
    document.getElementById('continueEmailBtn').onclick=showAccountStep;
    document.getElementById('editEmailBtn').onclick=function(){
      accountStep.style.display='none';
      emailStep.style.display='block';
      googleGroup.style.display='block';
      document.getElementById('signinSubtitle').textContent='Enter your email to continue.';
      siPass.value='';
      msg.className='signin-msg';
      emailInput.focus();
    };

    // Password Show/Hide Toggle
    var togglePwBtn=document.getElementById('togglePwBtn');
    var eyeIcon=document.getElementById('eyeIcon');
    if(togglePwBtn){
      togglePwBtn.onclick=function(){
        if(siPass.type==='password'){
          siPass.type='text';
          eyeIcon.innerHTML='<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
        } else {
          siPass.type='password';
          eyeIcon.innerHTML='<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        }
      };
    }

    // Password sign-in
    var pwBtn=document.getElementById('pwBtn');
    function doPasswordSignIn(){
      var email=document.getElementById('siEmail').value.trim();
      var pass=siPass.value;
      if(!/.+@.+\..+/.test(email)){ showMsg('Please enter a valid email address.','err'); return; }
      if(!pass){ showMsg('Enter your password, or choose the sign-in link option below.','err'); return; }
      pwBtn.disabled=true; pwBtn.innerHTML='<span class="spin"></span> Signing in…';
      sb.auth.signInWithPassword({ email:email, password:pass }).then(function(r){
        pwBtn.disabled=false; pwBtn.innerHTML='Sign in';
        if(r.error){
          var errHtml='Email or password is incorrect.';
          errHtml+='<button type="button" class="signin-msg-btn" id="fallbackMagicBtn">Send me a sign-in link</button>';
          showMsg(errHtml,'err');
          var fbBtn=document.getElementById('fallbackMagicBtn');
          if(fbBtn){
            fbBtn.onclick=function(){
              sendBtn.click();
            };
          }
          return;
        }
        // onAuthStateChange handles routing
      });
    }
    pwBtn.onclick=doPasswordSignIn;

    // Keyboard ENTER listeners
    emailInput.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        e.preventDefault();
        showAccountStep();
      }
    });
    siPass.addEventListener('keydown',function(e){
      if(e.key==='Enter'){ e.preventDefault(); doPasswordSignIn(); }
    });

    // Forgot / set password
    document.getElementById('forgotBtn').onclick=function(){
      var email=document.getElementById('siEmail').value.trim();
      if(!/.+@.+\..+/.test(email)){ showMsg('Enter your email address above first, then tap “Forgot password?”.','err'); return; }
      sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/app.html' }).then(function(r){
        if(r.error){ showMsg(esc(r.error.message||'Could not send the reset email.'),'err'); return; }
        showMsg('Password reset link sent to <b>'+esc(email)+'</b>. Open it to set a new password.','ok');
      });
    };

    // Email magic link sign-in
    sendBtn.onclick=function(){
      var email=emailInput.value.trim();
      if(!/.+@.+\..+/.test(email)){ showMsg('Please enter a valid email address.','err'); return; }
      sendBtn.disabled=true; sendBtn.innerHTML='<span class="spin"></span> Sending…';
      sb.auth.signInWithOtp({ email:email, options:{ shouldCreateUser:true, emailRedirectTo: redirectTo } }).then(function(r){
        sendBtn.disabled=false; sendBtn.innerHTML='Email me a sign-in link';
        if(r.error){ showMsg(esc(r.error.message||'Could not send the email. Please try again in a minute.'),'err'); return; }
        document.getElementById('sentTargetEmail').textContent = email;
        emailStep.style.display='none';
        accountStep.style.display='none';
        document.getElementById('sentStep').style.display='block';
        googleGroup.style.display='none';
        msg.className='signin-msg';
      });
    };

    document.getElementById('backToEmail').onclick=function(){
      document.getElementById('sentStep').style.display='none';
      emailStep.style.display='block';
      accountStep.style.display='none';
      googleGroup.style.display='block';
      document.getElementById('signinSubtitle').textContent='Enter your email to continue.';
      msg.className='signin-msg';
      emailInput.focus();
    };
  }

  // ============================================================
  //  PROFILE
  // ============================================================
  function renderProfile(){
    if(!state.user){ renderSignIn(); return; }
    renderHeader();
    var meta=state.user.user_metadata||{};
    var name=meta.full_name||meta.name||(state.user.email||'').split('@')[0]||'Your account';
    var initial=(name[0]||'U').toUpperCase();
    var avatar=meta.avatar_url?'<img src="'+esc(meta.avatar_url)+'" alt="">':esc(initial);
    var customerActions=isStaff() ?
      '<button class="profile-action" type="button" data-profile-go="'+esc(defaultStaffView())+'"><span class="profile-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" stroke-linecap="round"/></svg></span><span><b>Back to dashboard</b><small>Return to the staff workspace</small></span><i aria-hidden="true">&rarr;</i></button>' :
      '<button class="profile-action" type="button" data-profile-explore><span class="profile-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg></span><span><b>New application</b><small>Explore visas and destinations</small></span><i aria-hidden="true">&rarr;</i></button>'+
      '<button class="profile-action" type="button" data-profile-go="track"><span class="profile-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5m-5 4h5" stroke-linecap="round"/></svg></span><span><b>My applications</b><small>Track your visa status</small></span><i aria-hidden="true">&rarr;</i></button>';
    root.innerHTML='<main class="app-main profile-main profile-dashboard">'+
      '<aside class="profile-sidebar">'+
        '<div class="profile-identity"><div class="profile-avatar">'+avatar+'</div><div><h1>'+esc(name)+'</h1><p>'+esc(state.user.email||'')+'</p></div></div>'+
        '<div class="profile-stats"><div><strong id="profileCompletedCount">0</strong><span>Completed</span></div><div><strong id="profileOngoingCount">0</strong><span>Ongoing</span></div></div>'+
        '<div class="profile-sidebar-label">Account</div><div class="profile-actions">'+customerActions+
          '<button class="profile-action" type="button" data-profile-go="setpw"><span class="profile-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" stroke-linecap="round"/></svg></span><span><b>Change password</b><small>Update your account password</small></span><i aria-hidden="true">&rarr;</i></button>'+
          '<button class="profile-action profile-action-signout" type="button" data-profile-signout><span class="profile-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span><b>Sign out</b><small>Sign out of your VisaDoo account</small></span><i aria-hidden="true">&rarr;</i></button>'+
        '</div>'+
      '</aside>'+
      '<section class="profile-workspace"><div class="profile-documents-wrap" id="profileDocuments"><div class="customer-documents-loading"><span class="spin"></span><span>Loading your applications&hellip;</span></div></div></section>'+
    '</main>';
    root.querySelectorAll('[data-profile-go]').forEach(function(button){ button.onclick=function(){ go(button.getAttribute('data-profile-go')); }; });
    var profileExplore=root.querySelector('[data-profile-explore]');
    if(profileExplore) profileExplore.onclick=function(){ window.location.href='index.html#destinations'; };
    var profileSignout=root.querySelector('[data-profile-signout]');
    if(profileSignout) profileSignout.onclick=function(){ signOutCurrentUser(profileSignout); };
    sb.from('applications').select('id,reference_code,visa_type,status,created_at,documents(*)').order('created_at',{ascending:false}).then(function(result){
      var box=document.getElementById('profileDocuments');
      if(!box) return;
      if(result.error){ box.innerHTML='<div class="customer-documents-empty">Could not load your applications.</div>'; return; }
      var apps=result.data||[];
      var completed=apps.filter(function(a){ return a.status==='Visa Issued'; });
      var ongoing=apps.filter(function(a){ return a.status!=='Visa Issued'; });
      var completedCount=document.getElementById('profileCompletedCount'), ongoingCount=document.getElementById('profileOngoingCount');
      if(completedCount) completedCount.textContent=completed.length;
      if(ongoingCount) ongoingCount.textContent=ongoing.length;
      function paintProfileApplications(tab){
        box.innerHTML=profileApplicationsHtml(apps,tab);
        box.querySelectorAll('[data-profile-tab]').forEach(function(button){ button.onclick=function(){ paintProfileApplications(button.getAttribute('data-profile-tab')); }; });
        box.querySelectorAll('[data-profile-track]').forEach(function(button){ button.onclick=function(){ go('track'); }; });
      }
      paintProfileApplications(ongoing.length?'ongoing':'completed');
    });
  }

  // ============================================================
  //  SET / CHANGE PASSWORD (staff self-service + reset-link recovery)
  // ============================================================
  function renderSetPassword(){
    if(!state.user){ renderSignIn(); return; }
    renderHeader();
    var recovery = !!state._recovery;
    root.innerHTML='<main class="app-main password-main">'+
      (recovery?'':'<button class="password-back" id="spCancel" type="button"><span aria-hidden="true">&larr;</span> Back to profile</button>')+
      '<section class="password-card">'+
      '<div class="password-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" stroke-linecap="round"/></svg></div>'+
      '<span class="password-kicker">Account security</span>'+
      '<h1>'+(recovery?'Set a new password':'Change password')+'</h1>'+
      '<p class="password-lead">Create a password with at least 8 characters for <b>'+esc(state.user.email||'')+'</b>.</p>'+
      '<div class="signin-msg" id="spMsg"></div>'+
      '<div class="password-fields"><div class="field"><label for="spPass">New password</label><input id="spPass" type="password" placeholder="At least 8 characters" autocomplete="new-password"></div>'+
      '<div class="field"><label for="spPass2">Confirm password</label><input id="spPass2" type="password" placeholder="Re-enter password" autocomplete="new-password"></div></div>'+
      '<button class="btn password-save" id="spSave">Save password <span aria-hidden="true">&rarr;</span></button>'+
    '</section></main>';
    var m=document.getElementById('spMsg');
    document.getElementById('spSave').onclick=function(){
      var p=document.getElementById('spPass').value, p2=document.getElementById('spPass2').value;
      if((p||'').length<8){ m.className='signin-msg err'; m.textContent='Password must be at least 8 characters.'; return; }
      if(p!==p2){ m.className='signin-msg err'; m.textContent='The two passwords don’t match.'; return; }
      var btn=document.getElementById('spSave'); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Saving…';
      sb.auth.updateUser({ password:p }).then(function(r){
        btn.disabled=false; btn.innerHTML='Save password';
        if(r.error){ m.className='signin-msg err'; m.textContent=esc(r.error.message||'Could not set password.'); return; }
        state._recovery=false; toast('Password saved — you can now sign in with your email and password.');
        go('profile');
      });
    };
    if(document.getElementById('spCancel')) document.getElementById('spCancel').onclick=function(){ go('profile'); };
  }

  // ============================================================
  //  APPLY
  // ============================================================
  function renderApply(){
    document.body.classList.add('apply-focus');
    document.body.classList.remove('apply-reviewing');
    if(!VISAS.length){ root.innerHTML='<div class="app-main"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'; loadVisaTypes().then(render); return; }
    var pre = qParam('visa');
    var chosen = pre ? visaById(pre) : null;
    if(!chosen){
      window.location.replace('index.html#destinations');
      return;
    }
    var meta = state.user.user_metadata || {};
    var defaultName = meta.full_name || meta.name || '';
    clearDocumentPreviewUrls();
    picked={};
    passportOcrState={ busy:false, complete:false, extracted:null, frontVerified:false };
    applyWizardStep=1;
    var html =
      '<div class="app-main apply-wizard-main">' +
        '<div class="apply-focus-top">'+
          '<button type="button" class="apply-exit" id="applyExit"><span aria-hidden="true">←</span> Back</button>'+
        '</div>'+
        '<div class="apply-selected-line"><span>United Arab Emirates</span><b>'+esc(chosen.name)+'</b></div>'+
        '<form id="applyForm">' +
        '<section class="panel apply-step active" id="applyStep1" data-apply-step="1">'+
          '<div class="traveller-simple-form">'+
            '<span class="step-badge">Step 1 of 4</span>'+
            '<h2 data-step-heading>Enter your name</h2>'+
            '<p class="apply-step-intro">Use the full name shown on your passport.</p>'+
            '<div class="apply-name-field">'+field('full_name','Full name','text',defaultName,true)+'</div>'+
            '<button type="button" class="btn btn-primary btn-lg apply-next" id="nameNext">Continue to photo <span aria-hidden="true">→</span></button>'+
          '</div>'+
        '</section>'+

        '<section class="panel apply-step" id="applyStep2" data-apply-step="2" hidden>'+
          '<h2>Upload your photo</h2>'+
          '<p class="apply-step-intro">Upload one clear, front-facing personal portrait. ID cards, documents and group photos are not accepted.</p>'+
          '<div class="upload-row apply-document-upload apply-single-upload apply-photo-upload">' +
            dropZone('photo','','JPG, PNG or WEBP · max 10 MB') +
          '</div>'+
          '<div class="photo-check-status" id="photoCheckStatus" aria-live="polite" hidden><span class="photo-check-icon" aria-hidden="true"></span><div><b id="photoCheckTitle"></b><small id="photoCheckText"></small></div></div>'+
          '<div class="apply-step-actions"><button type="button" class="btn btn-primary btn-lg" id="photoNext" disabled>Continue to passport <span aria-hidden="true">→</span></button></div>'+
        '</section>'+

        '<section class="panel apply-step" id="applyStep3" data-apply-step="3" hidden>'+
          '<h2>Upload your passport</h2><p class="apply-step-intro">Add the front/photo page first, then the back page.</p>'+
          '<div class="passport-page-list">'+
            '<section class="passport-page-card" id="passportFrontCard"><header><i>1</i><div><b>Front / photo page</b><small>Page with your photo and passport details</small></div></header>'+dropZone('passport','','JPG, PNG or WEBP · max 10 MB')+'<div class="passport-page-status" id="passportStatus" aria-live="polite" hidden><span></span><div><b></b><small></small></div></div></section>'+
            '<section class="passport-page-card locked" id="passportBackCard"><header><i>2</i><div><b>Back page</b><small>Father’s and mother’s names are read automatically</small></div></header>'+dropZone('passport_back','','JPG, PNG or WEBP · max 10 MB')+'<div class="passport-page-status" id="passport_backStatus" aria-live="polite" hidden><span></span><div><b></b><small></small></div></div></section>'+
          '</div>'+
          '<div class="apply-step-actions"><button type="button" class="btn btn-primary btn-lg" id="passportNext" disabled>Continue to review <span aria-hidden="true">→</span></button></div>'+
        '</section>'+

        '<div id="applyStep4" data-apply-step="4" hidden>'+
        '<div class="passport-review-layout">'+
          '<aside class="passport-review-previews" aria-label="Uploaded document previews">'+
            '<div class="review-passport-gallery">'+
              '<button class="review-preview-card review-passport-card" type="button" data-passport-preview="passport" aria-label="View passport bio page">'+
                '<span class="review-preview-media"><img id="passportReviewPreview" alt="Uploaded passport bio page"></span><span><b>Passport bio page</b><small>Tap to view</small></span>'+
              '</button>'+
              '<button class="review-preview-card review-passport-card" type="button" data-passport-preview="passport_back" aria-label="View passport back page">'+
                '<span class="review-preview-media"><img id="passportBackReviewPreview" alt="Uploaded passport back page"></span><span><b>Passport back page</b><small>Tap to view</small></span>'+
              '</button>'+
            '</div>'+
            '<p>Tap either passport page to view it full size.</p>'+
          '</aside>'+
          '<div class="passport-review-content">'+
        '<section class="passport-review-form apply-step active">' +
          '<span class="step-badge">Step 4 of 4</span><h2>Check your passport details</h2>'+
          '<div class="grid2">' +
            field('first_name','First name','text','',true) +
            field('last_name','Last name','text','',false) +
            field('father_name','Father\'s name','text','',false) +
            field('mother_name','Mother\'s name','text','',false) +
            '<div class="field"><label for="gender">Gender</label><select id="gender" name="gender"><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Unspecified">Unspecified</option></select></div>'+
            field('passport_number','Passport number','text','',true) +
            '<input id="passport_issuing_country" type="hidden" value="India">' +
            '<div class="review-passport-details-grid">'+
              field('nationality','Nationality','text','',false) +
              field('date_of_birth','Date of birth','date','',true) +
              field('passport_issue_date','Passport issued on','date','',true) +
              field('passport_expiry','Passport valid till','date','',true) +
            '</div>' +
            '<div class="review-contact-details">'+
              '<h3>Contact Details</h3><p>Required for sharing essential visa updates. In real time.</p>'+
              '<div class="review-contact-fields">'+
                '<div class="field review-email-field"><label for="contact_email">Email address <span class="req-star">*</span></label><input id="contact_email" type="email" value="'+esc(state.user.email||'')+'" readonly></div>'+
                '<div class="field review-phone-field" id="mobileField">'+
                  '<label for="phone">Phone number <span class="req-star">*</span></label>'+
                  '<input id="phone" name="phone" type="tel" autocomplete="tel" required>'+
                '</div>'+
                '<div id="otpArea" class="otp-area" style="display:none"></div>'+
              '</div>'+
            '</div>' +
          '</div>' +
        '</section>' +

        '<div class="panel" id="qPanel" style="display:none">' +
          '<span class="step-badge">A few more questions</span>' +
          '<div id="applyQuestions"></div>' +
        '</div>' +

        '<div class="panel">' +
          '<label style="display:flex;gap:11px;align-items:flex-start;cursor:pointer;margin:0">' +
            '<input id="marketingConsent" type="checkbox" checked style="width:auto;margin-top:3px;flex:none">' +
            '<span style="font-size:14.5px;line-height:1.5">'+esc(MARKETING_CONSENT_TEXT)+' '+
              '<span class="phint" style="display:inline">You can unsubscribe anytime. We\'ll still send updates about your own application either way.</span></span>' +
          '</label>' +
        '</div>' +

        '<div class="panel submit-bar">' +
          '<div class="total-line">Total for <span id="sumName"></span>: <b id="sumPrice"></b></div>' +
          '<div class="apply-submit-actions"><button type="submit" class="btn btn-primary btn-lg" id="submitBtn">Submit application</button></div>' +
        '</div>' +
        '</div></div></div>'+
        '<div class="review-image-modal" id="passportPreviewModal" role="dialog" aria-modal="true" aria-labelledby="passportPreviewTitle" hidden>'+
          '<div class="review-image-dialog">'+
            '<div class="review-image-head"><b id="passportPreviewTitle">Passport page</b><button type="button" id="passportPreviewClose" aria-label="Close passport preview">×</button></div>'+
            '<div class="review-image-stage"><img id="passportPreviewLarge" alt="Passport page full-size preview"></div>'+
          '</div>'+
        '</div>'+
        '</form>' +
      '</div>';
    root.innerHTML=html;
    var travellerNameInput=document.getElementById('full_name');
    if(travellerNameInput){ travellerNameInput.placeholder='Enter traveller’s full name'; travellerNameInput.setAttribute('autocomplete','name'); }

    var selected = chosen.id;
    function refreshSummary(){
      var v=visaById(selected);
      document.getElementById('sumName').textContent=v.name;
      document.getElementById('sumPrice').textContent=visaPriceText(v);
    }
    refreshSummary();
    loadApplyQuestions(selected);
    wirePassportPages(); wireDrop('photo'); wirePassportReviewPreviews();

    initMobileField();
    wireApplyWizard();

    document.getElementById('applyForm').onsubmit=function(e){
      e.preventDefault();
      submitApplication(selected);
    };
  }

  // ---- Mobile number field (intl-tel-input) + optional WhatsApp OTP verification ----
  var applyIti=null, mobileOtpRequired=false, mobileVerified=false, verifiedNumber='';
  function currentMobileE164(){ try { return applyIti ? applyIti.getNumber() : ((document.getElementById('phone')||{}).value||''); } catch(_e){ return ((document.getElementById('phone')||{}).value||''); } }
  function mobileIsValid(){ if(applyIti && window.intlTelInputUtils){ return applyIti.isValidNumber(); } return currentMobileE164().replace(/\D/g,'').length>=8; }

  function initMobileField(){
    var input=document.getElementById('phone'); if(!input) return;
    applyIti=null; mobileOtpRequired=false; mobileVerified=false; verifiedNumber='';
    if(window.intlTelInput){
      applyIti=window.intlTelInput(input,{ initialCountry:'in', separateDialCode:true,
        preferredCountries:['in','ae','sa','qa','kw','om','bh','us','gb'],
        utilsScript:'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js' });
    }
    sb.from('site_settings').select('mobile_otp_active').eq('id','global').single().then(function(r){
      mobileOtpRequired = !!(r.data && r.data.mobile_otp_active);
      if(mobileOtpRequired) buildOtpUI();
    });
    input.addEventListener('input', resetMobileVerify);
    input.addEventListener('countrychange', resetMobileVerify);
  }
  function resetMobileVerify(){
    if(!mobileOtpRequired) return;
    if(mobileVerified && currentMobileE164()!==verifiedNumber){ mobileVerified=false; verifiedNumber=''; buildOtpUI(); }
  }
  function buildOtpUI(){
    var area=document.getElementById('otpArea'); if(!area) return;
    area.style.display='block';
    if(mobileVerified){ area.innerHTML='<div class="otp-ok">✓ Mobile number verified</div>'; return; }
    var waNum=((window.VISADOO_CONFIG&&window.VISADOO_CONFIG.WHATSAPP)||'919895226697').replace(/[^0-9]/g,'');
    var waHelp='https://wa.me/'+waNum+'?text='+encodeURIComponent('Hi Visa Doo, I need help verifying my mobile number for my visa application.');
    area.innerHTML=
      '<div class="otp-hint">We’ll send a one-time code to this number on WhatsApp to verify it.</div>'+
      '<div class="otp-controls"><button type="button" class="btn btn-ghost" id="otpSend">Send verification code</button></div>'+
      '<div id="otpStep" style="display:none;margin-top:8px">'+
        '<div class="otp-controls">'+
          '<input id="otpCode" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code">'+
          '<button type="button" class="btn btn-primary" id="otpVerify">Verify</button>'+
          '<button type="button" class="link-btn" id="otpResend" disabled>Resend</button>'+
        '</div>'+
        '<div class="otp-msg" id="otpMsg"></div>'+
      '</div>'+
      '<div class="otp-help">Not receiving the code? <a href="'+waHelp+'" target="_blank" rel="noopener">Contact us on WhatsApp</a> — our team can help or complete your application for you.</div>';
    document.getElementById('otpSend').onclick=function(){ sendOtp(false); };
    document.getElementById('otpVerify').onclick=function(){ doVerifyOtp(); };
    document.getElementById('otpResend').onclick=function(){ sendOtp(true); };
  }
  function startResendCooldown(){
    var resend=document.getElementById('otpResend'); if(!resend) return;
    var left=30; resend.disabled=true; resend.textContent='Resend in '+left+'s';
    var t=setInterval(function(){ left--; if(left<=0){ clearInterval(t); resend.disabled=false; resend.textContent='Resend'; } else { resend.textContent='Resend in '+left+'s'; } },1000);
  }
  function sendOtp(isResend){
    if(!mobileIsValid()){ toast('Please enter a valid mobile number first.'); return; }
    var num=currentMobileE164();
    var sendBtn=document.getElementById('otpSend');
    if(!isResend && sendBtn){ sendBtn.disabled=true; sendBtn.innerHTML='<span class="spin"></span> Sending…'; }
    sb.functions.invoke('send-mobile-otp',{ body:{ phone:num } }).then(function(res){
      var d=res&&res.data;
      if(!d || !d.ok){
        if(sendBtn){ sendBtn.disabled=false; sendBtn.innerHTML='Send verification code'; }
        var reason=(d&&d.reason)||'';
        toast(reason==='rate_limited'?'Too many attempts. Please wait a few minutes.':(reason==='bad_phone'?'Please enter a valid mobile number.':(reason==='not_configured'?'Verification is temporarily unavailable. Please try again shortly.':'Could not send the code. Please try again.')));
        return;
      }
      var step=document.getElementById('otpStep'); if(step) step.style.display='block';
      if(sendBtn) sendBtn.style.display='none';
      var msg=document.getElementById('otpMsg'); if(msg){ msg.className='otp-msg ok'; msg.textContent='Code sent on WhatsApp to '+num+'.'; }
      startResendCooldown();
      var ci=document.getElementById('otpCode'); if(ci) ci.focus();
    }).catch(function(){ if(sendBtn){ sendBtn.disabled=false; sendBtn.innerHTML='Send verification code'; } toast('Could not send the code. Please try again.'); });
  }
  function doVerifyOtp(){
    var num=currentMobileE164();
    var code=((document.getElementById('otpCode')||{}).value||'').replace(/\D/g,'');
    var msg=document.getElementById('otpMsg');
    if(code.length!==6){ if(msg){ msg.className='otp-msg err'; msg.textContent='Enter the 6-digit code.'; } return; }
    var vb=document.getElementById('otpVerify'); if(vb){ vb.disabled=true; vb.innerHTML='<span class="spin"></span>'; }
    sb.functions.invoke('verify-mobile-otp',{ body:{ phone:num, code:code } }).then(function(res){
      if(vb){ vb.disabled=false; vb.innerHTML='Verify'; }
      var d=res&&res.data;
      if(d&&d.ok){ mobileVerified=true; verifiedNumber=num; buildOtpUI(); toast('Mobile number verified'); return; }
      var reason=(d&&d.reason)||'';
      if(msg){ msg.className='otp-msg err'; msg.textContent=(reason==='wrong'?'Incorrect code. Please try again.':((reason==='expired'||reason==='no_code')?'Code expired. Tap Resend for a new one.':(reason==='too_many'?'Too many tries. Tap Resend for a new code.':'Could not verify. Please try again.'))); }
    }).catch(function(){ if(vb){ vb.disabled=false; vb.innerHTML='Verify'; } if(msg){ msg.className='otp-msg err'; msg.textContent='Could not verify. Please try again.'; } });
  }

  // ---- custom questions on the apply form ----
  var applyQ = [];        // current visa's questions
  var applyQFiles = {};   // {questionId: File}

  function loadApplyQuestions(slug){
    var panel=document.getElementById('qPanel'); if(!panel) return;
    sb.from('visa_questions').select('*').eq('visa_slug',slug).order('sort_order').then(function(r){
      applyQ = (r.data)||[]; applyQFiles = {};
      if(!applyQ.length){ panel.style.display='none'; document.getElementById('applyQuestions').innerHTML=''; return; }
      panel.style.display='block';
      document.getElementById('applyQuestions').innerHTML = applyQ.map(applyQuestionHtml).join('');
      applyQ.forEach(function(q){ if(q.qtype==='file') wireQFile(q.id); });
    });
  }
  function applyQuestionHtml(q){
    var req = q.required ? ' <span class="req-star">*</span>' : '';
    var hint = q.help ? '<div class="phint" style="margin:-6px 0 10px">'+esc(q.help)+'</div>' : '';
    var inner='';
    if(q.qtype==='text'){
      inner='<textarea id="q_'+q.id+'" style="min-height:64px" placeholder="Your answer"></textarea>';
    } else if(q.qtype==='yesno'){
      inner='<div style="display:flex;gap:18px;padding-top:4px">'+
        '<label style="display:flex;align-items:center;gap:8px;font-weight:500;cursor:pointer"><input type="radio" name="q_'+q.id+'" value="Yes" style="width:auto"> Yes</label>'+
        '<label style="display:flex;align-items:center;gap:8px;font-weight:500;cursor:pointer"><input type="radio" name="q_'+q.id+'" value="No" style="width:auto"> No</label></div>';
    } else if(q.qtype==='choice'){
      inner='<select id="q_'+q.id+'" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px"><option value="">— Please choose —</option>'+
        (q.options||[]).map(function(o){ return '<option value="'+esc(o)+'">'+esc(o)+'</option>'; }).join('')+'</select>';
    } else if(q.qtype==='file'){
      inner='<div class="drop" id="qdrop_'+q.id+'"><div class="di"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0L8 8m4-4l4 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-linecap="round"/></svg></div><b>Tap to upload</b><small>JPG, PNG or PDF, max 10 MB</small><div class="fname" id="qfname_'+q.id+'"></div><input type="file" id="qf_'+q.id+'" accept="image/*,application/pdf" style="display:none"></div>';
    }
    return '<div class="field" data-q="'+q.id+'"><label>'+esc(q.label)+req+'</label>'+hint+inner+'</div>';
  }
  function wireQFile(qid){
    var zone=document.getElementById('qdrop_'+qid), input=document.getElementById('qf_'+qid);
    zone.onclick=function(){ input.click(); };
    input.onchange=function(){
      var f=input.files[0]; if(!f) return;
      if(f.size>10485760){ toast('That file is over 10 MB. Please choose a smaller one.'); input.value=''; return; }
      applyQFiles[qid]=f; document.getElementById('qfname_'+qid).textContent='✓ '+f.name; zone.classList.add('has');
    };
  }
  // returns {ok:bool, missing:label, answers:[{q,label,type,value}], fileQs:[q...]}
  function collectApplyAnswers(){
    var answers=[], missing=null, fileQs=[];
    applyQ.forEach(function(q){
      var val='';
      if(q.qtype==='text'){ val=(document.getElementById('q_'+q.id).value||'').trim(); }
      else if(q.qtype==='choice'){ val=document.getElementById('q_'+q.id).value; }
      else if(q.qtype==='yesno'){ var c=document.querySelector('input[name="q_'+q.id+'"]:checked'); val=c?c.value:''; }
      else if(q.qtype==='file'){ if(applyQFiles[q.id]){ fileQs.push(q); val={ pending:true }; } else { val=''; } }
      if(q.required && (!val || (val&&val.pending!==true && String(val).length===0))){ if(!missing) missing=q.label; }
      answers.push({ q:q.id, label:q.label, type:q.qtype, value:val });
    });
    return { ok: !missing, missing:missing, answers:answers, fileQs:fileQs };
  }

  function field(id,label,type,val,req){
    return '<div class="field"><label for="'+id+'">'+esc(label)+(req?' <span class="req-star">*</span>':'')+'</label>' +
      '<input id="'+id+'" name="'+id+'" type="'+type+'" value="'+esc(val)+'"'+(req?' required':'')+'></div>';
  }
  function dropZone(key,title,sub){
    var label=title?'<span class="ulabel">'+esc(title)+' <span class="req-star">*</span></span>':'';
    return '<div>'+label+
      '<div class="drop" id="drop_'+key+'">' +
        '<div class="di"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0L8 8m4-4l4 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-linecap="round"/></svg></div>' +
        '<b>Tap to upload</b><small>'+esc(sub)+'</small>' +
        '<div class="fname" id="fname_'+key+'"></div>' +
        '<input type="file" id="file_'+key+'" accept="image/jpeg,image/png,image/webp" style="display:none">' +
      '</div></div>';
  }

  // ---- searchable country / state dropdown ----
  // Data comes from the country-state-city package's published data files (loaded from its CDN).
  // We deliberately load only the small country + state files, never the large city file, and never hardcode the lists.
  var GEO_BASE='https://cdn.jsdelivr.net/npm/country-state-city@3.2.1/lib/assets/';
  var geoCountries=null, geoIndiaStates=null;
  function loadCountries(){
    if(geoCountries) return Promise.resolve(geoCountries);
    return fetch(GEO_BASE+'country.json').then(function(r){ return r.json(); }).then(function(arr){
      var names=(arr||[]).map(function(c){ return c.name; }).filter(Boolean).filter(function(n){ return n!=='India'; });
      names.sort(function(a,b){ return a.localeCompare(b); });
      names.unshift('India'); // India pinned to the top
      geoCountries=names; return names;
    }).catch(function(){ geoCountries=['India']; return geoCountries; });
  }
  function loadIndiaStates(){
    if(geoIndiaStates) return Promise.resolve(geoIndiaStates);
    return fetch(GEO_BASE+'state.json').then(function(r){ return r.json(); }).then(function(arr){
      var names=(arr||[]).filter(function(s){ return s.countryCode==='IN'; }).map(function(s){ return s.name; }).filter(Boolean);
      names.sort(function(a,b){ return a.localeCompare(b); });
      geoIndiaStates=names; return names;
    }).catch(function(){ geoIndiaStates=[]; return geoIndiaStates; });
  }
  function ensureComboCss(){
    if(document.getElementById('combo-css')) return;
    var st=document.createElement('style'); st.id='combo-css';
    st.textContent='.combo-menu{position:absolute;left:0;right:0;top:100%;z-index:60;background:#fff;border:1.5px solid var(--line);border-radius:12px;margin-top:4px;max-height:260px;overflow:auto;box-shadow:0 14px 34px rgba(2,12,27,.14)}'+
      '.combo-menu .ci{padding:11px 14px;cursor:pointer;font-size:15px;border-bottom:1px solid #f1f5f9}'+
      '.combo-menu .ci:last-child{border-bottom:0}'+
      '.combo-menu .ci.active{background:var(--sky-50)}'+
      '@media(hover:hover){.combo-menu .ci:hover{background:var(--sky-50)}}'+
      '.combo-menu .none{padding:12px 14px;color:var(--muted);font-size:14px}';
    document.head.appendChild(st);
  }
  function comboHtml(id,label,placeholder,req){
    return '<div class="field" style="position:relative">'+
      '<label for="'+id+'_s">'+esc(label)+(req?' <span class="req-star">*</span>':'')+'</label>'+
      '<input id="'+id+'_s" type="text" autocomplete="off" inputmode="search" placeholder="'+esc(placeholder||'Search…')+'">'+
      '<input type="hidden" id="'+id+'">'+
      '<div class="combo-menu" id="'+id+'_menu" style="display:none"></div>'+
    '</div>';
  }
  function comboInit(id, getOptions, opts){
    opts=opts||{}; ensureComboCss();
    var s=document.getElementById(id+'_s'), hid=document.getElementById(id), menu=document.getElementById(id+'_menu');
    if(!s||!hid||!menu) return null;
    var active=-1, shown=[];
    function setVal(v){ hid.value=v||''; s.value=v||''; if(opts.onSelect) opts.onSelect(v||''); }
    function draw(q){
      var all=getOptions()||[]; q=(q||'').trim().toLowerCase();
      shown=(q ? all.filter(function(o){ return o.toLowerCase().indexOf(q)>-1; }) : all.slice()).slice(0,100);
      if(!all.length){ menu.innerHTML='<div class="none">Loading…</div>'; return; }
      if(!shown.length){ menu.innerHTML='<div class="none">No match — check spelling</div>'; return; }
      menu.innerHTML=shown.map(function(o,i){ return '<div class="ci'+(i===active?' active':'')+'" data-v="'+esc(o)+'">'+esc(o)+'</div>'; }).join('');
      menu.querySelectorAll('.ci').forEach(function(el){ el.addEventListener('pointerdown',function(e){ e.preventDefault(); setVal(el.getAttribute('data-v')); hide(); }); });
    }
    function open(){ active=-1; draw(s.value===hid.value?'':s.value); menu.style.display=''; }
    function hide(){ menu.style.display='none'; }
    s.addEventListener('focus',open);
    s.addEventListener('input',function(){ active=-1; draw(s.value); menu.style.display=''; });
    s.addEventListener('keydown',function(e){
      if(menu.style.display==='none'){ if(e.key==='ArrowDown') open(); return; }
      if(e.key==='ArrowDown'){ e.preventDefault(); active=Math.min(active+1,shown.length-1); draw(s.value); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); active=Math.max(active-1,0); draw(s.value); }
      else if(e.key==='Enter'){ if(active>=0&&shown[active]){ e.preventDefault(); setVal(shown[active]); hide(); } }
      else if(e.key==='Escape'){ hide(); }
    });
    s.addEventListener('blur',function(){ setTimeout(function(){ hide(); if(s.value!==hid.value) s.value=hid.value; },150); });
    if(opts.selected) setVal(opts.selected);
    return {
      refresh:function(){ if(menu.style.display!=='none') draw(s.value); },
      setValue:function(value){ setVal(value); }
    };
  }

  var picked={};
  var passportOcrState={ busy:false, complete:false, extracted:null, frontVerified:false };
  var applyWizardStep=1;
  var photoValidationRun=0;
  var photoFaceDetectorPromise=null;
  var passportValidationRun={passport:0,passport_back:0};
  var documentPreviewUrls={passport:'',passport_back:'',photo:''};

  function clearDocumentPreviewUrls(){
    ['passport','passport_back','photo'].forEach(function(key){
      if(documentPreviewUrls[key]){ try{ URL.revokeObjectURL(documentPreviewUrls[key]); }catch(_revokeError){} }
      documentPreviewUrls[key]='';
    });
  }

  function setDocumentPreview(key,file){
    if(documentPreviewUrls[key]){ try{ URL.revokeObjectURL(documentPreviewUrls[key]); }catch(_revokeError){} }
    var url=URL.createObjectURL(file); documentPreviewUrls[key]=url;
    var previewIds={passport:'passportReviewPreview',passport_back:'passportBackReviewPreview',photo:'photoReviewPreview'};
    var image=document.getElementById(previewIds[key]);
    if(image) image.src=url;
  }

  function wirePassportReviewPreviews(){
    var modal=document.getElementById('passportPreviewModal');
    var large=document.getElementById('passportPreviewLarge');
    var title=document.getElementById('passportPreviewTitle');
    var closeButton=document.getElementById('passportPreviewClose');
    if(!modal||!large||!title||!closeButton) return;
    var opener=null;
    function closePreview(){
      modal.hidden=true;
      document.body.classList.remove('passport-preview-open');
      large.removeAttribute('src');
      if(opener) opener.focus({preventScroll:true});
    }
    document.querySelectorAll('[data-passport-preview]').forEach(function(button){
      button.onclick=function(){
        var key=button.getAttribute('data-passport-preview');
        var url=documentPreviewUrls[key];
        if(!url) return;
        opener=button;
        large.src=url;
        title.textContent=key==='passport_back'?'Passport back page':'Passport bio page';
        modal.hidden=false;
        document.body.classList.add('passport-preview-open');
        closeButton.focus({preventScroll:true});
      };
    });
    closeButton.onclick=closePreview;
    modal.onclick=function(event){ if(event.target===modal) closePreview(); };
    modal.onkeydown=function(event){ if(event.key==='Escape'){ event.preventDefault(); closePreview(); } };
  }

  function setApplyStep(step){
    var one=document.getElementById('applyStep1'), two=document.getElementById('applyStep2'), three=document.getElementById('applyStep3'), four=document.getElementById('applyStep4');
    if(!one||!two||!three||!four) return;
    one.hidden=step!==1; two.hidden=step!==2; three.hidden=step!==3; four.hidden=step!==4;
    applyWizardStep=step;
    document.body.classList.toggle('apply-reviewing',step===4);
    if(step===4){
      seedPassportNameFields();
    }
    var active=step===1?one:(step===2?two:(step===3?three:four));
    var heading=active.querySelector('[data-step-heading]')||active.querySelector('h2');
    if(heading){ heading.setAttribute('tabindex','-1'); heading.focus({preventScroll:true}); }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function wireApplyWizard(){
    var name=document.getElementById('full_name');
    var nameNext=document.getElementById('nameNext');
    var photoNext=document.getElementById('photoNext');
    var passportNext=document.getElementById('passportNext');
    if(!name||!nameNext||!photoNext||!passportNext) return;
    nameNext.onclick=function(){
      name.value=name.value.trim();
      if(!name.value){ name.setCustomValidity('Please enter your full name.'); name.reportValidity(); return; }
      name.setCustomValidity(''); setApplyStep(2); updateDocumentsNext();
    };
    name.addEventListener('input',function(){ name.setCustomValidity(''); });
    name.addEventListener('keydown',function(event){ if(event.key==='Enter'){ event.preventDefault(); nameNext.click(); } });
    photoNext.onclick=function(){ if(!photoNext.disabled) setApplyStep(3); };
    passportNext.onclick=function(){ if(!passportNext.disabled) setApplyStep(4); };
    ['first_name','last_name'].forEach(function(id){
      var input=document.getElementById(id);
      if(input) input.addEventListener('input',syncPassportFullName);
    });
    var exit=document.getElementById('applyExit');
    if(exit) exit.onclick=function(){
      if(applyWizardStep>1){ setApplyStep(applyWizardStep-1); return; }
      if(history.length>1) history.back(); else location.href='country.html?slug=united-arab-emirates#visa-info';
    };
  }

  function updateDocumentsNext(){
    var photoButton=document.getElementById('photoNext');
    var passportButton=document.getElementById('passportNext');
    if(photoButton) photoButton.disabled=!picked.photo;
    if(passportButton) passportButton.disabled=!picked.passport||!picked.passport_back||passportOcrState.busy||!passportOcrState.frontVerified;
  }

  function setPassportPageUi(key,tone,title,message){
    var box=document.getElementById(key+'Status');
    if(!box) return;
    var titleEl=box.querySelector('b'), textEl=box.querySelector('small');
    box.hidden=false; box.className='passport-page-status '+tone;
    if(titleEl) titleEl.textContent=title;
    if(textEl) textEl.textContent=message;
  }

  function mrzCountryName(code){
    var map={IND:'India',ARE:'United Arab Emirates',USA:'United States',GBR:'United Kingdom',CAN:'Canada',AUS:'Australia',PAK:'Pakistan',BGD:'Bangladesh',NPL:'Nepal',LKA:'Sri Lanka',PHL:'Philippines',IDN:'Indonesia',MYS:'Malaysia',SGP:'Singapore',SAU:'Saudi Arabia',QAT:'Qatar',KWT:'Kuwait',OMN:'Oman',BHR:'Bahrain',EGY:'Egypt',ZAF:'South Africa',NZL:'New Zealand',DEU:'Germany',FRA:'France',ITA:'Italy',ESP:'Spain',NLD:'Netherlands',IRL:'Ireland',JPN:'Japan',CHN:'China',KOR:'South Korea',THA:'Thailand',VNM:'Vietnam',TUR:'Turkey'};
    return map[code]||code||'';
  }

  function mrzDigits(value){
    return String(value||'').toUpperCase().replace(/[OQD]/g,'0').replace(/[IL]/g,'1').replace(/Z/g,'2').replace(/S/g,'5').replace(/B/g,'8').replace(/[^0-9]/g,'');
  }

  function mrzDate(value,type){
    var digits=mrzDigits(value).slice(0,6);
    if(digits.length!==6) return '';
    var yy=Number(digits.slice(0,2)), mm=Number(digits.slice(2,4)), dd=Number(digits.slice(4,6));
    if(mm<1||mm>12||dd<1||dd>31) return '';
    var current=new Date().getFullYear();
    var year=type==='birth'?(yy>current%100?1900+yy:2000+yy):2000+yy;
    return String(year)+'-'+String(mm).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
  }

  function mrzPersonName(value){
    var parts=String(value||'').replace(/<+$/,'').split('<<');
    var surname=(parts[0]||'').replace(/<+/g,' ').trim();
    var given=(parts.slice(1).join(' ')||'').replace(/<+/g,' ').trim();
    return (given+' '+surname).trim().toLowerCase().replace(/\b[a-z]/g,function(c){return c.toUpperCase();});
  }

  function titleCaseOcrName(value){
    return String(value||'').toLowerCase().replace(/\b[a-z]/g,function(c){return c.toUpperCase();});
  }

  function splitPassportName(value){
    var clean=String(value||'').replace(/\s+/g,' ').trim();
    if(!clean) return {firstName:'',lastName:''};
    var parts=clean.split(' ');
    if(parts.length===1) return {firstName:clean,lastName:''};
    return {firstName:parts.slice(0,-1).join(' '),lastName:parts[parts.length-1]};
  }

  function seedPassportNameFields(){
    var first=document.getElementById('first_name'), last=document.getElementById('last_name'), full=document.getElementById('full_name');
    if(!first||!last||!full||first.value.trim()||last.value.trim()) return;
    var split=splitPassportName(full.value);
    first.value=split.firstName; last.value=split.lastName;
  }

  function syncPassportFullName(){
    var first=document.getElementById('first_name'), last=document.getElementById('last_name'), full=document.getElementById('full_name');
    if(!first||!last||!full) return;
    var combined=(first.value.trim()+' '+last.value.trim()).trim();
    if(combined) full.value=combined;
  }

  function parsePassportMrz(text){
    var lines=String(text||'').toUpperCase().replace(/[«‹]/g,'<<').split(/\r?\n/).map(function(line){
      line=line.replace(/[^A-Z0-9<]/g,'');
      var passportStart=line.indexOf('P<');
      if(passportStart>-1&&passportStart<5) line=line.slice(passportStart);
      return line;
    }).filter(function(line){return line.length>=28;});
    var firstIndex=-1;
    for(var i=0;i<lines.length;i++){ if(/^P[A-Z0-9<]/.test(lines[i])&&lines[i].indexOf('<')>-1){ firstIndex=i; break; } }
    if(firstIndex<0) return null;
    var first=(lines[firstIndex]+'<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<').slice(0,44);
    var second='';
    for(var j=firstIndex+1;j<lines.length;j++){ if(lines[j].length>=36){ second=(lines[j]+'<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<').slice(0,44); break; } }
    if(!second) return null;
    var passportNumber=second.slice(0,9).replace(/</g,'').trim();
    var surname=first.slice(5).split('<<')[0].replace(/<+/g,' ').trim();
    var givenNames=first.slice(5).split('<<').slice(1).join(' ').replace(/<+/g,' ').trim();
    var genderCode=second.charAt(20);
    var result={
      firstName:titleCaseOcrName(givenNames),
      lastName:titleCaseOcrName(surname),
      fullName:mrzPersonName(first.slice(5)),
      issuingCountry:mrzCountryName(first.slice(2,5).replace(/</g,'')),
      passportNumber:passportNumber,
      nationality:mrzCountryName(second.slice(10,13).replace(/</g,'')),
      dateOfBirth:mrzDate(second.slice(13,19),'birth'),
      gender:genderCode==='M'?'Male':(genderCode==='F'?'Female':(genderCode==='X'?'Unspecified':'')),
      passportExpiry:mrzDate(second.slice(21,27),'expiry')
    };
    return result.passportNumber||result.dateOfBirth||result.passportExpiry?result:null;
  }

  function ocrDate(value){
    var match=String(value||'').match(/\b(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})\b/);
    if(!match) return '';
    var day=Number(match[1]),month=Number(match[2]),year=Number(match[3]);
    if(day<1||day>31||month<1||month>12||year<1900||year>2200) return '';
    return String(year)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  }

  function ocrDates(value){
    var dates=[],pattern=/\b(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})\b/g,match;
    while((match=pattern.exec(String(value||'')))!==null){
      var parsed=ocrDate(match[0]);
      if(parsed&&dates.indexOf(parsed)===-1) dates.push(parsed);
    }
    return dates;
  }

  function parsePassportVisualDetails(text,known){
    known=known||{};
    var lines=String(text||'').toUpperCase().split(/\r?\n/).map(function(line){return line.replace(/\s+/g,' ').trim();}).filter(Boolean);
    var candidates=[];
    lines.forEach(function(line,index){
      ocrDates(line).forEach(function(date){
        if(date===known.dateOfBirth||date===known.passportExpiry) return;
        if(known.passportExpiry&&date>=known.passportExpiry) return;
        if(known.dateOfBirth&&date<=known.dateOfBirth) return;
        if(!candidates.some(function(candidate){return candidate.date===date;})) candidates.push({date:date,line:index});
      });
    });
    if(!candidates.length) return {};
    var issueLines=[];
    for(var i=0;i<lines.length;i++){
      if(/(DATE\s+(OF\s+)?ISSUE|ISSUE\s+DATE)/.test(lines[i])) issueLines.push(i);
    }
    candidates.forEach(function(candidate){
      candidate.distance=issueLines.length?Math.min.apply(null,issueLines.map(function(line){return Math.abs(line-candidate.line);})) : 99;
    });
    candidates.sort(function(a,b){ return a.distance-b.distance||b.date.localeCompare(a.date); });
    return {passportIssueDate:candidates[0].date};
  }

  function preparePassportForOcr(file){
    return new Promise(function(resolve){
      var url=URL.createObjectURL(file), image=new Image();
      image.onload=function(){
        try{
          var sourceWidth=image.naturalWidth||image.width, sourceHeight=image.naturalHeight||image.height;
          var cropY=Math.round(sourceHeight*.54), cropHeight=Math.max(1,sourceHeight-cropY);
          var targetWidth=Math.min(1800,Math.max(1000,sourceWidth));
          var scale=targetWidth/sourceWidth;
          var canvas=document.createElement('canvas');
          canvas.width=Math.round(sourceWidth*scale); canvas.height=Math.round(cropHeight*scale);
          var context=canvas.getContext('2d');
          context.drawImage(image,0,cropY,sourceWidth,cropHeight,0,0,canvas.width,canvas.height);
          var pixels=context.getImageData(0,0,canvas.width,canvas.height), data=pixels.data;
          for(var i=0;i<data.length;i+=4){
            var gray=Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114);
            var contrast=Math.max(0,Math.min(255,(gray-128)*1.55+128));
            data[i]=data[i+1]=data[i+2]=contrast;
          }
          context.putImageData(pixels,0,0);
          canvas.toBlob(function(blob){ URL.revokeObjectURL(url); resolve(blob||file); },'image/jpeg',.94);
        }catch(_cropError){ URL.revokeObjectURL(url); resolve(file); }
      };
      image.onerror=function(){ URL.revokeObjectURL(url); resolve(file); };
      image.src=url;
    });
  }

  function fillPassportFields(data){
    if(!data) return 0;
    var count=0;
    function set(id,value,keepExisting){
      var input=document.getElementById(id);
      if(!input||!value||(keepExisting&&input.value.trim())) return;
      input.value=value; count++;
    }
    set('full_name',data.fullName,true);
    set('first_name',data.firstName,false);
    set('last_name',data.lastName,false);
    set('passport_number',data.passportNumber,false);
    set('nationality',data.nationality,false);
    set('date_of_birth',data.dateOfBirth,false);
    set('gender',data.gender,false);
    if(data.passportIssueDate&&data.passportIssueDate!==data.passportExpiry) set('passport_issue_date',data.passportIssueDate,false);
    set('passport_expiry',data.passportExpiry,false);
    if(data.issuingCountry){
      var countryInput=document.getElementById('passport_issuing_country');
      if(countryInput) countryInput.value=data.issuingCountry;
      count++;
    }
    syncPassportFullName();
    return count;
  }

  function fillPassportBackFields(data){
    if(!data) return 0;
    var count=0;
    [['father_name',data.fatherName],['mother_name',data.motherName]].forEach(function(pair){
      var input=document.getElementById(pair[0]);
      if(input&&pair[1]){ input.value=pair[1]; count++; }
    });
    return count;
  }

  function rotatePassportImage(file,degrees){
    if(!degrees) return Promise.resolve(file);
    return loadPhotoImage(file).then(function(image){
      return new Promise(function(resolve){
        var sourceWidth=image.naturalWidth||image.width, sourceHeight=image.naturalHeight||image.height;
        var swap=degrees===90||degrees===270;
        var canvas=document.createElement('canvas');
        canvas.width=swap?sourceHeight:sourceWidth; canvas.height=swap?sourceWidth:sourceHeight;
        var context=canvas.getContext('2d');
        context.translate(canvas.width/2,canvas.height/2);
        context.rotate(degrees*Math.PI/180);
        context.drawImage(image,-sourceWidth/2,-sourceHeight/2,sourceWidth,sourceHeight);
        canvas.toBlob(function(blob){resolve(blob||file);},'image/jpeg',.94);
      });
    });
  }

  async function validatePassportImage(key,file){
    var image=await loadPhotoImage(file);
    var clarity=inspectPhotoClarity(image,true);
    if(!clarity.ok) return clarity;
    if(!window.Tesseract||!window.Tesseract.createWorker) throw new Error('OCR library unavailable');
    var worker=null;
    try{
      worker=await window.Tesseract.createWorker('eng',1,{logger:function(message){
        if(message&&typeof message.progress==='number') setPassportPageUi(key,'checking','Checking passport…',String(message.status||'Reading image').replace(/_/g,' '));
      }});
      if(worker.setParameters) await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'});
      var rotations=[0,90,270,180];
      for(var rotationIndex=0;rotationIndex<rotations.length;rotationIndex++){
        var rotated=await rotatePassportImage(file,rotations[rotationIndex]);
        var ocrImage=await preparePassportForOcr(rotated);
        var result=await worker.recognize(ocrImage);
        var text=result&&result.data&&result.data.text||'';
        var extracted=parsePassportMrz(text);
        if(extracted&&extracted.passportNumber&&extracted.passportNumber.length>=7&&extracted.nationality&&(extracted.dateOfBirth||extracted.passportExpiry)){
          try{
            if(worker.setParameters) await worker.setParameters({tessedit_pageseg_mode:'11',tessedit_char_whitelist:'',preserve_interword_spaces:'1'});
            var fullPage=await preparePassportFullPageForOcr(rotated);
            var visualResult=await worker.recognize(fullPage);
            var visual=parsePassportVisualDetails(visualResult&&visualResult.data&&visualResult.data.text||'',extracted);
            if(visual.passportIssueDate&&visual.passportIssueDate!==extracted.passportExpiry) extracted.passportIssueDate=visual.passportIssueDate;
          }catch(_visualOcrError){ /* MRZ data is still valid when the visual pass is unclear. */ }
          return {ok:true,extracted:extracted};
        }
      }
      return {ok:false,message:'This does not look like a passport front/photo page. Upload the clear page with your photo and MRZ lines.'};
    }finally{
      if(worker){ try{ await worker.terminate(); }catch(_terminateError){} }
    }
  }

  function preparePassportFullPageForOcr(file){
    return new Promise(function(resolve){
      var url=URL.createObjectURL(file), image=new Image();
      image.onload=function(){
        try{
          var sourceWidth=image.naturalWidth||image.width, sourceHeight=image.naturalHeight||image.height;
          var cropX=0,cropY=0,cropWidth=sourceWidth,cropHeight=sourceHeight;
          var scale=Math.min(2.5,1900/Math.max(cropWidth,cropHeight));
          if(Math.min(cropWidth,cropHeight)*scale<1050) scale=Math.min(2.5,1050/Math.min(cropWidth,cropHeight));
          var canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(cropWidth*scale)); canvas.height=Math.max(1,Math.round(cropHeight*scale));
          var context=canvas.getContext('2d',{willReadFrequently:true});
          context.drawImage(image,cropX,cropY,cropWidth,cropHeight,0,0,canvas.width,canvas.height);
          var pixels=context.getImageData(0,0,canvas.width,canvas.height), data=pixels.data;
          for(var i=0;i<data.length;i+=4){
            var gray=Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114);
            var contrast=Math.max(0,Math.min(255,(gray-128)*1.5+128));
            data[i]=data[i+1]=data[i+2]=contrast;
          }
          context.putImageData(pixels,0,0);
          canvas.toBlob(function(blob){ URL.revokeObjectURL(url); resolve(blob||file); },'image/jpeg',.95);
        }catch(_prepareError){ URL.revokeObjectURL(url); resolve(file); }
      };
      image.onerror=function(){ URL.revokeObjectURL(url); resolve(file); };
      image.src=url;
    });
  }

  function preparePassportBackNamesForOcr(file,fullPage){
    return new Promise(function(resolve){
      var url=URL.createObjectURL(file), image=new Image();
      image.onload=function(){
        try{
          var sourceWidth=image.naturalWidth||image.width, sourceHeight=image.naturalHeight||image.height;
          var cropY=fullPage?0:Math.round(sourceHeight*.40);
          var cropHeight=sourceHeight-cropY;
          var scale=Math.min(2.7,2200/Math.max(sourceWidth,cropHeight));
          if(Math.min(sourceWidth,cropHeight)*scale<1150) scale=Math.min(2.7,1150/Math.min(sourceWidth,cropHeight));
          var canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(sourceWidth*scale));
          canvas.height=Math.max(1,Math.round(cropHeight*scale));
          var context=canvas.getContext('2d',{willReadFrequently:true});
          context.drawImage(image,0,cropY,sourceWidth,cropHeight,0,0,canvas.width,canvas.height);
          var pixels=context.getImageData(0,0,canvas.width,canvas.height), data=pixels.data;
          for(var i=0;i<data.length;i+=4){
            var gray=Math.round(data[i]*.299+data[i+1]*.587+data[i+2]*.114);
            var contrast=Math.max(0,Math.min(255,(gray-128)*1.7+128));
            data[i]=data[i+1]=data[i+2]=contrast;
          }
          context.putImageData(pixels,0,0);
          canvas.toBlob(function(blob){ URL.revokeObjectURL(url); resolve(blob||file); },'image/jpeg',.96);
        }catch(_prepareError){ URL.revokeObjectURL(url); resolve(file); }
      };
      image.onerror=function(){ URL.revokeObjectURL(url); resolve(file); };
      image.src=url;
    });
  }

  function passportBackLabelType(value){
    var line=String(value||'').toUpperCase().replace(/[^A-Z ]/g,' ').replace(/\s+/g,' ').trim();
    if(/\bFATH[EA]R\b|\bVATER\b|\bFATER\b|\bNAME (?:OF|I) (?:ATER|SER)\b|LEGAL GUARD/.test(line)) return 'father';
    if(/\bMOTH[EA]R\b|\bMETER\b|\bMEHER\b|\bMETHER\b|\bNAME OF M[EO][A-Z]{2,5}R\b/.test(line)) return 'mother';
    if(/\bSPOU[S5]E\b|\bADDRE[S5]{2}\b|\bFILE (?:NO|NUMBER)\b|\bHOUSE\b|\bPOST\b|\bPIN\b/.test(line)) return 'stop';
    return '';
  }

  function passportBackNameCandidate(value){
    var original=String(value||'').trim();
    var clean=original.toUpperCase().replace(/[^A-Z.'\- ]/g,' ').replace(/\s+/g,' ').trim();
    if(clean.length<3||clean.length>70) return null;
    if(/\b(NAME|FATHER|MOTHER|LEGAL|GUARDIAN|SPOUSE|ADDRESS|PASSPORT|FILE|PIN|INDIA|KERALA|HOUSE|POST|SIGNATURE)\b/.test(clean)) return null;
    var words=clean.split(' ').filter(function(word){return word.replace(/[^A-Z]/g,'').length>=2;});
    if(!words.length) return null;
    var letters=(original.match(/[A-Za-z]/g)||[]).length;
    var uppercase=(original.match(/[A-Z]/g)||[]).length;
    var uppercaseRatio=letters?uppercase/letters:0;
    var score=words.length*12+Math.min(30,letters)+uppercaseRatio*20;
    if(words.length===1) score-=24;
    return {value:titleCaseOcrName(clean),score:score,wordCount:words.length,uppercaseRatio:uppercaseRatio};
  }

  function parsePassportBackNames(text){
    var lines=String(text||'').split(/\r?\n/).map(function(line){return line.replace(/\s+/g,' ').trim();}).filter(Boolean);
    function bestAfter(type){
      var best=null;
      for(var i=0;i<lines.length;i++){
        if(passportBackLabelType(lines[i])!==type) continue;
        for(var j=i+1;j<Math.min(lines.length,i+9);j++){
          var nextType=passportBackLabelType(lines[j]);
          if(nextType&&nextType!==type) break;
          var candidate=passportBackNameCandidate(lines[j]);
          if(candidate&&(!best||candidate.score>best.score)) best=candidate;
        }
        if(best) return best.value;
      }
      return '';
    }
    var fatherName=bestAfter('father'),motherName=bestAfter('mother');
    if(!fatherName||!motherName){
      var stopIndex=lines.length;
      for(var i=0;i<lines.length;i++){
        if(passportBackLabelType(lines[i])==='stop'){ stopIndex=i; break; }
      }
      var fallback=[];
      for(var j=0;j<stopIndex;j++){
        if(passportBackLabelType(lines[j])) continue;
        var candidate=passportBackNameCandidate(lines[j]);
        if(!candidate||candidate.score<45||candidate.wordCount<2||candidate.uppercaseRatio<.72) continue;
        if(!fallback.some(function(item){return item.value===candidate.value;})) fallback.push({value:candidate.value,line:j,score:candidate.score});
      }
      if(!fatherName&&fallback.length) fatherName=fallback[0].value;
      if(!motherName){
        for(var k=0;k<fallback.length;k++){
          if(fallback[k].value!==fatherName){ motherName=fallback[k].value; break; }
        }
      }
    }
    return {fatherName:fatherName,motherName:motherName};
  }

  function mergePassportBackNames(target,source){
    if(!target.fatherName&&source&&source.fatherName) target.fatherName=source.fatherName;
    if(!target.motherName&&source&&source.motherName) target.motherName=source.motherName;
  }

  async function readPassportBackNames(key,file){
    var image=await loadPhotoImage(file);
    var width=image.naturalWidth||image.width, height=image.naturalHeight||image.height;
    if(Math.min(width,height)<320||Math.max(width,height)<600) return {ok:false,message:'This passport back image is too small. Upload a clearer image showing both parent names.'};
    var clarity=inspectPhotoClarity(image,true);
    if(!clarity.ok) return clarity;
    if(!window.Tesseract||!window.Tesseract.createWorker) throw new Error('OCR library unavailable');
    var worker=null,extracted={fatherName:'',motherName:''};
    try{
      worker=await window.Tesseract.createWorker('eng',1,{logger:function(message){
        if(message&&typeof message.progress==='number') setPassportPageUi(key,'checking','Reading parent names…',String(message.status||'Reading image').replace(/_/g,' '));
      }});
      if(worker.setParameters) await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});
      var rotations=[0,90,270,180];
      for(var rotationIndex=0;rotationIndex<rotations.length;rotationIndex++){
        var rotated=await rotatePassportImage(file,rotations[rotationIndex]);
        for(var pass=0;pass<2;pass++){
          var prepared=await preparePassportBackNamesForOcr(rotated,pass===0);
          var result=await worker.recognize(prepared);
          mergePassportBackNames(extracted,parsePassportBackNames(result&&result.data&&result.data.text||''));
          if(extracted.fatherName&&extracted.motherName) return {ok:true,extracted:extracted};
        }
      }
      return {ok:false,message:"We could not read both the father's and mother's names. Upload a clearer passport back image."};
    }finally{
      if(worker){ try{ await worker.terminate(); }catch(_terminateError){} }
    }
  }

  function setPhotoCheckUi(tone,title,message){
    var box=document.getElementById('photoCheckStatus');
    var titleEl=document.getElementById('photoCheckTitle');
    var textEl=document.getElementById('photoCheckText');
    if(!box||!titleEl||!textEl) return;
    box.hidden=false;
    box.className='photo-check-status '+tone;
    titleEl.textContent=title;
    textEl.textContent=message;
  }

  function loadPhotoImage(file){
    return new Promise(function(resolve,reject){
      var url=URL.createObjectURL(file), image=new Image();
      image.onload=function(){ URL.revokeObjectURL(url); resolve(image); };
      image.onerror=function(){ URL.revokeObjectURL(url); reject(new Error('decode')); };
      image.src=url;
    });
  }

  function inspectPhotoClarity(image,relaxed){
    var sourceWidth=image.naturalWidth||image.width, sourceHeight=image.naturalHeight||image.height;
    var minimumSize=relaxed?160:96;
    if(sourceWidth<minimumSize||sourceHeight<minimumSize) return {ok:false,message:relaxed?'This passport image is too small or unclear to read. Please upload a clearer image.':'This image is too small to check clearly. Please upload a clearer image.'};
    var maxSide=360, scale=Math.min(1,maxSide/Math.max(sourceWidth,sourceHeight));
    var width=Math.max(3,Math.round(sourceWidth*scale)), height=Math.max(3,Math.round(sourceHeight*scale));
    var canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
    var context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(image,0,0,width,height);
    var pixels=context.getImageData(0,0,width,height).data;
    var gray=new Float32Array(width*height), brightnessSum=0, brightnessSq=0;
    for(var i=0,p=0;i<pixels.length;i+=4,p++){
      var value=.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2];
      gray[p]=value; brightnessSum+=value; brightnessSq+=value*value;
    }
    var count=gray.length, brightness=brightnessSum/count;
    var contrast=Math.sqrt(Math.max(0,brightnessSq/count-brightness*brightness));
    if(brightness<(relaxed?20:28)||brightness>(relaxed?250:245)||contrast<(relaxed?8:12)) return {ok:false,message:'The photo is too dark, too bright, or unclear. Please use a clear, well-lit photo.'};
    var lapSum=0, lapSq=0, lapCount=0;
    for(var y=1;y<height-1;y++){
      for(var x=1;x<width-1;x++){
        var at=y*width+x;
        var lap=gray[at-width]+gray[at-1]+gray[at+1]+gray[at+width]-4*gray[at];
        lapSum+=lap; lapSq+=lap*lap; lapCount++;
      }
    }
    var lapMean=lapSum/lapCount, sharpness=lapSq/lapCount-lapMean*lapMean;
    if(sharpness<(relaxed?12:35)) return {ok:false,message:'This photo looks blurry. Please upload a clearer photo.'};
    return {ok:true};
  }

  function ensurePhotoFaceDetector(){
    if(photoFaceDetectorPromise) return photoFaceDetectorPromise;
    if('FaceDetector' in window){
      photoFaceDetectorPromise=Promise.resolve({detect:function(image){ return new window.FaceDetector({fastMode:true,maxDetectedFaces:3}).detect(image); }});
      return photoFaceDetectorPromise;
    }
    photoFaceDetectorPromise=new Promise(function(resolve,reject){
      function createDetector(){
        try{
          var base='https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/';
          var detector=new window.FaceDetection({locateFile:function(file){return base+file;}});
          var pending=null;
          detector.setOptions({model:'short',minDetectionConfidence:.65});
          detector.onResults(function(results){ if(pending){ var done=pending; pending=null; done.resolve((results&&results.detections)||[]); } });
          resolve({detect:function(image){
            return new Promise(function(resolveDetection,rejectDetection){
              if(pending){ rejectDetection(new Error('busy')); return; }
              pending={resolve:resolveDetection,reject:rejectDetection};
              detector.send({image:image}).catch(function(error){ var failed=pending; pending=null; if(failed) failed.reject(error); });
            });
          }});
        }catch(error){ reject(error); }
      }
      if(window.FaceDetection){ createDetector(); return; }
      var script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/face_detection.js';
      script.async=true; script.crossOrigin='anonymous';
      script.onload=createDetector;
      script.onerror=function(){reject(new Error('face model load failed'));};
      document.head.appendChild(script);
    });
    return photoFaceDetectorPromise;
  }

  function normaliseDetectedFace(face,image){
    if(!face||!image) return null;
    var box=face.boundingBox||(face.locationData&&face.locationData.relativeBoundingBox);
    if(!box) return null;
    var imageWidth=image.naturalWidth||image.width, imageHeight=image.naturalHeight||image.height;
    var width=Number(box.width), height=Number(box.height);
    var left=Number(box.x!==undefined?box.x:box.xMin);
    var top=Number(box.y!==undefined?box.y:box.yMin);
    var centerX=Number(box.xCenter), centerY=Number(box.yCenter);
    var normalized=width<=1.5&&height<=1.5;
    if(!normalized){
      width=width/imageWidth; height=height/imageHeight;
      if(Number.isFinite(left)) left=left/imageWidth;
      if(Number.isFinite(top)) top=top/imageHeight;
      if(Number.isFinite(centerX)) centerX=centerX/imageWidth;
      if(Number.isFinite(centerY)) centerY=centerY/imageHeight;
    }
    if(!Number.isFinite(centerX)&&Number.isFinite(left)) centerX=left+width/2;
    if(!Number.isFinite(centerY)&&Number.isFinite(top)) centerY=top+height/2;
    if(!Number.isFinite(width)||!Number.isFinite(height)||!Number.isFinite(centerX)||!Number.isFinite(centerY)) return null;
    return {width:width,height:height,centerX:centerX,centerY:centerY};
  }

  function validatePersonalPhotoFraming(image,faces){
    var width=image.naturalWidth||image.width, height=image.naturalHeight||image.height;
    if(width<320||height<320) return {ok:false,message:'This image is too small to verify as a personal photo. Upload a clearer portrait at least 320 × 320 pixels.'};
    var ratio=width/height;
    if(ratio<.5||ratio>1.1) return {ok:false,message:'Upload a portrait photo of the traveller, not an ID card, document or wide image.'};
    if(!faces||!faces.length) return {ok:false,message:'We could not find a person in this image. Please upload a clear, front-facing photo of the traveller.'};
    if(faces.length!==1) return {ok:false,message:'The photo must show exactly one person. Please upload a single-person portrait.'};
    var face=normaliseDetectedFace(faces[0],image);
    if(!face) return {ok:false,message:'We could not verify the face framing. Please upload a different, clear personal portrait.'};
    var faceArea=face.width*face.height;
    if(face.width<.18||face.height<.22||faceArea<.055) return {ok:false,message:'The face is too small in this image. Upload a close, passport-style personal portrait—not a photo of an ID card.'};
    if(face.width>.78||face.height>.82) return {ok:false,message:'The face is cropped too closely. Upload a clear portrait showing the full head and shoulders.'};
    if(face.centerX<.30||face.centerX>.70||face.centerY<.24||face.centerY>.62) return {ok:false,message:'Please centre the traveller’s face in a proper personal portrait. ID-card and document photos are not accepted.'};
    return {ok:true};
  }

  async function validatePersonalPhoto(file){
    var image=await loadPhotoImage(file);
    var width=image.naturalWidth||image.width, height=image.naturalHeight||image.height;
    if(width<320||height<320||width/height<.5||width/height>1.1) return validatePersonalPhotoFraming(image,[]);
    var clarity=inspectPhotoClarity(image);
    if(!clarity.ok) return clarity;
    var detector=await ensurePhotoFaceDetector();
    var faces=await Promise.race([
      detector.detect(image),
      new Promise(function(_resolve,reject){setTimeout(function(){reject(new Error('face check timeout'));},15000);})
    ]);
    return validatePersonalPhotoFraming(image,faces);
  }

  function resetPassportBackUpload(){
    passportValidationRun.passport_back++;
    delete picked.passport_back;
    var card=document.getElementById('passportBackCard');
    var input=document.getElementById('file_passport_back');
    var zone=document.getElementById('drop_passport_back');
    var fileName=document.getElementById('fname_passport_back');
    var status=document.getElementById('passport_backStatus');
    if(card) card.classList.add('locked');
    if(input) input.value='';
    if(zone) zone.classList.remove('has','invalid','checking');
    if(fileName) fileName.textContent='';
    if(status) status.hidden=true;
    if(documentPreviewUrls.passport_back){ try{ URL.revokeObjectURL(documentPreviewUrls.passport_back); }catch(_revokeError){} }
    documentPreviewUrls.passport_back='';
    var preview=document.getElementById('passportBackReviewPreview');
    if(preview) preview.removeAttribute('src');
  }

  function wirePassportPages(){
    ['passport'].forEach(function(key){
      var zone=document.getElementById('drop_'+key), input=document.getElementById('file_'+key);
      var card=document.getElementById('passportFrontCard');
      if(!zone||!input||!card) return;
      zone.onclick=function(){ if(!card.classList.contains('locked')&&!zone.classList.contains('checking')&&!passportOcrState.busy) input.click(); };
      input.onchange=async function(){
        var file=input.files[0]; if(!file) return;
        passportValidationRun[key]++;
        var validationId=passportValidationRun[key];
        delete picked[key];
        zone.classList.remove('has','invalid');
        document.getElementById('fname_'+key).textContent='';
        passportOcrState.frontVerified=false;
        passportOcrState.extracted=null;
        resetPassportBackUpload();
        updateDocumentsNext();
        if(file.size>10485760){
          input.value=''; zone.classList.add('invalid');
          setPassportPageUi(key,'error','Upload another image','The image is over 10 MB. Choose a smaller JPG, PNG or WEBP image.');
          return;
        }
        if(!/^image\/(jpeg|png|webp)$/i.test(file.type||'')){
          input.value=''; zone.classList.add('invalid');
          setPassportPageUi(key,'error','Upload another image','Choose a JPG, PNG or WEBP passport image.');
          return;
        }
        passportOcrState.busy=true; zone.classList.add('checking');
        setPassportPageUi(key,'checking','Checking passport…','Verifying the front/photo page.');
        updateDocumentsNext();
        try{
          var result=await validatePassportImage(key,file);
          if(validationId!==passportValidationRun[key]) return;
          if(!result.ok){
            input.value=''; zone.classList.add('invalid');
            setPassportPageUi(key,'error','Upload another image',result.message);
            return;
          }
          picked[key]=file;
          setDocumentPreview(key,file);
          document.getElementById('fname_'+key).textContent='✓ '+file.name;
          zone.classList.add('has');
          passportOcrState.frontVerified=true;
          passportOcrState.extracted=result.extracted;
          var filled=fillPassportFields(result.extracted);
          setPassportPageUi(key,'success','Front page verified',(filled?filled+' passport detail'+(filled===1?'':'s')+' read. ':'')+'Now upload the back page.');
          var backCard=document.getElementById('passportBackCard'); if(backCard) backCard.classList.remove('locked');
        }catch(error){
          if(validationId!==passportValidationRun[key]) return;
          input.value=''; zone.classList.add('invalid');
          setPassportPageUi(key,'error','Passport check could not finish','Please check your connection and upload the passport image again.');
          console.warn('Passport validation failed',error);
        }finally{
          if(validationId===passportValidationRun[key]) zone.classList.remove('checking');
          passportOcrState.busy=false; passportOcrState.complete=true; updateDocumentsNext();
        }
      };
    });
    var backZone=document.getElementById('drop_passport_back');
    var backInput=document.getElementById('file_passport_back');
    var backCard=document.getElementById('passportBackCard');
    if(backZone&&backInput&&backCard){
      backZone.onclick=function(){ if(!backCard.classList.contains('locked')&&!backZone.classList.contains('checking')&&!passportOcrState.busy) backInput.click(); };
      backInput.onchange=async function(){
        var file=backInput.files[0]; if(!file) return;
        passportValidationRun.passport_back++;
        var validationId=passportValidationRun.passport_back;
        delete picked.passport_back;
        backZone.classList.remove('has','invalid','checking');
        document.getElementById('fname_passport_back').textContent='';
        ['father_name','mother_name'].forEach(function(id){ var input=document.getElementById(id); if(input) input.value=''; });
        if(documentPreviewUrls.passport_back){ try{ URL.revokeObjectURL(documentPreviewUrls.passport_back); }catch(_revokeError){} }
        documentPreviewUrls.passport_back='';
        var oldBackPreview=document.getElementById('passportBackReviewPreview'); if(oldBackPreview) oldBackPreview.removeAttribute('src');
        updateDocumentsNext();
        if(file.size>10485760){
          backInput.value=''; backZone.classList.add('invalid');
          setPassportPageUi('passport_back','error','Upload another image','The image is over 10 MB. Choose a smaller JPG, PNG or WEBP image.');
          return;
        }
        if(!/^image\/(jpeg|png|webp)$/i.test(file.type||'')){
          backInput.value=''; backZone.classList.add('invalid');
          setPassportPageUi('passport_back','error','Upload another image','Choose a JPG, PNG or WEBP passport image.');
          return;
        }
        passportOcrState.busy=true; backZone.classList.add('checking');
        setPassportPageUi('passport_back','checking','Reading parent names…',"Reading only the father's and mother's names.");
        updateDocumentsNext();
        try{
          var result=await readPassportBackNames('passport_back',file);
          if(validationId!==passportValidationRun.passport_back) return;
          if(!result.ok){
            backInput.value=''; backZone.classList.add('invalid');
            setPassportPageUi('passport_back','error','Upload a clearer back page',result.message);
            return;
          }
          picked.passport_back=file;
          setDocumentPreview('passport_back',file);
          document.getElementById('fname_passport_back').textContent='✓ '+file.name;
          backZone.classList.add('has');
          fillPassportBackFields(result.extracted);
          setPassportPageUi('passport_back','success','Parent names read','Father’s and mother’s names will be filled on the review page.');
        }catch(error){
          if(validationId!==passportValidationRun.passport_back) return;
          backInput.value=''; backZone.classList.add('invalid');
          if(error&&error.message==='decode') setPassportPageUi('passport_back','error','Upload another image','This image could not be read. Choose a valid JPG, PNG or WEBP image.');
          else setPassportPageUi('passport_back','error','Parent-name OCR could not finish','Please check your connection and upload the passport back image again.');
          console.warn('Passport back parent-name OCR failed',error);
        }finally{
          if(validationId===passportValidationRun.passport_back){
            backZone.classList.remove('checking');
            passportOcrState.busy=false;
            updateDocumentsNext();
          }
        }
      };
    }
  }

  function wireDrop(key){
    var zone=document.getElementById('drop_'+key);
    var input=document.getElementById('file_'+key);
    zone.onclick=function(){ if(!zone.classList.contains('checking')) input.click(); };
    input.onchange=async function(){
      var f=input.files[0]; if(!f) return;
      if(key==='photo'){
        photoValidationRun++;
        delete picked.photo;
        zone.classList.remove('has','invalid');
        document.getElementById('fname_photo').textContent='';
        updateDocumentsNext();
      }
      if(f.size>10485760){
        toast('That file is over 10 MB. Please choose a smaller one.'); input.value='';
        if(key==='photo'){ zone.classList.add('invalid'); setPhotoCheckUi('error','Please upload another photo','The photo is over 10 MB. Choose a smaller JPG, PNG or WEBP image.'); }
        return;
      }
      if(!/^image\/(jpeg|png|webp)$/i.test(f.type||'')){
        toast('Please choose a JPG, PNG or WEBP photo.'); input.value='';
        if(key==='photo'){ zone.classList.add('invalid'); setPhotoCheckUi('error','Please upload another photo','Choose a JPG, PNG or WEBP image.'); }
        return;
      }
      if(key==='photo'){
        var validationId=photoValidationRun;
        zone.classList.add('checking');
        setPhotoCheckUi('checking','Checking your photo…','Checking clarity, portrait framing and that exactly one person is visible.');
        try{
          var result=await validatePersonalPhoto(f);
          if(validationId!==photoValidationRun) return;
          if(!result.ok){
            zone.classList.add('invalid'); input.value='';
            setPhotoCheckUi('error','Please upload another photo',result.message);
            return;
          }
          picked.photo=f;
          setDocumentPreview('photo',f);
          document.getElementById('fname_photo').textContent='✓ '+f.name;
          zone.classList.add('has');
          setPhotoCheckUi('success','Photo looks good','A clear, single-person portrait was verified. You can continue.');
          updateDocumentsNext();
        }catch(error){
          if(validationId!==photoValidationRun) return;
          input.value=''; zone.classList.add('invalid');
          if(error&&error.message==='decode') setPhotoCheckUi('error','Please upload another photo','This image could not be read. Choose a valid JPG, PNG or WEBP photo.');
          else setPhotoCheckUi('error','Photo check could not finish','Please check your connection and upload the photo again.');
          console.warn('Photo validation failed',error);
        }finally{
          if(validationId===photoValidationRun) zone.classList.remove('checking');
        }
        return;
      }
      picked[key]=f;
      setDocumentPreview(key,f);
      document.getElementById('fname_'+key).textContent='✓ '+f.name;
      zone.classList.add('has');
      updateDocumentsNext();
    };
  }

  function submitApplication(visaId){
    syncPassportFullName();
    var f=document.getElementById('applyForm');
    if(!f.checkValidity()){ f.reportValidity(); return; }
    if(!mobileIsValid()){ toast('Please enter a valid mobile number.'); return; }
    if(mobileOtpRequired && (!mobileVerified || currentMobileE164()!==verifiedNumber)){ toast('Please verify your mobile number to continue.'); return; }
    if(!picked.passport || !picked.passport_back || !picked.photo){ toast('Please upload your passport front page, back page and personal photo.'); return; }
    var pCountry=((document.getElementById('passport_issuing_country')||{}).value||'').trim()||null;
    var qa = collectApplyAnswers();
    if(!qa.ok){ toast('Please answer the required question: “'+qa.missing+'”.'); return; }
    var passportIssueDate=(document.getElementById('passport_issue_date').value||'').trim();
    var passportExpiryDate=(document.getElementById('passport_expiry').value||'').trim();
    if(passportIssueDate && passportExpiryDate && passportIssueDate>=passportExpiryDate){ toast('Passport issue date must be before the expiry date.'); return; }
    qa.answers.push({ q:'passport_issue_date', label:'Passport issue date', type:'date', value:passportIssueDate });
    qa.answers.push({ q:'passport_first_name', label:'Passport first name', type:'text', value:(document.getElementById('first_name').value||'').trim() });
    qa.answers.push({ q:'passport_last_name', label:'Passport last name', type:'text', value:(document.getElementById('last_name').value||'').trim() });
    qa.answers.push({ q:'father_name', label:"Father's name", type:'text', value:(document.getElementById('father_name').value||'').trim() });
    qa.answers.push({ q:'mother_name', label:"Mother's name", type:'text', value:(document.getElementById('mother_name').value||'').trim() });
    qa.answers.push({ q:'gender', label:'Gender', type:'text', value:(document.getElementById('gender').value||'').trim() });
    var v=visaById(visaId);
    var btn=document.getElementById('submitBtn');
    btn.disabled=true; btn.innerHTML='<span class="spin"></span> Submitting…';

    // Generate the application id up front so all files (and the answers' file paths)
    // can be uploaded BEFORE inserting — customers can insert but not update applications.
    var appId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);});
    var uid=state.user.id;

    uploadAllFiles(appId, uid, qa).then(function(docRows){
      var payload={
        id: appId,
        user_id: uid,
        visa_type: visaId,
        price_aed: v.price,
        full_name: document.getElementById('full_name').value.trim(),
        email: state.user.email || document.getElementById('full_name').value,
        phone: currentMobileE164() || document.getElementById('phone').value.trim(),
        passport_issuing_country: pCountry,
        state: null,
        passport_number: document.getElementById('passport_number').value.trim(),
        nationality: (document.getElementById('nationality').value||'').trim() || null,
        date_of_birth: document.getElementById('date_of_birth').value || null,
        passport_expiry: document.getElementById('passport_expiry').value || null,
        answers: qa.answers
      };
      return sb.from('applications').insert(payload).select().single().then(function(r){
        if(r.error) throw r.error;
        var app=r.data;
        if(docRows.length) return sb.from('documents').insert(docRows).then(function(){ return app; });
        return app;
      });
    }).then(function(app){
      // Record marketing consent (best-effort — never blocks the confirmation).
      var consentEl=document.getElementById('marketingConsent');
      var optedIn=consentEl?!!consentEl.checked:true;
      try {
        sb.rpc('record_my_marketing_consent',{ p_opted_in:optedIn, p_source:'apply-form', p_text:MARKETING_CONSENT_TEXT })
          .then(function(r){ if(r&&r.error) console.warn('consent record failed', r.error); });
      } catch(_e){ /* ignore */ }
      renderSuccess(app);
    }).catch(function(err){
      btn.disabled=false; btn.innerHTML='Submit application';
      toast('Something went wrong submitting your application. Please try again.'); console.error(err);
    });
  }

  // Upload standard docs + any question-file answers to storage, returning document rows.
  // Patches qa.answers file values with their stored paths.
  function uploadAllFiles(appId, uid, qa){
    var docRows=[], jobs=[];
    ['passport','passport_back','photo'].forEach(function(key){
      var file=picked[key]; if(!file) return;
      var ext=(file.name.split('.').pop()||'dat').toLowerCase();
      var path=uid+'/'+appId+'/'+key+'_'+Date.now()+'.'+ext;
      jobs.push(sb.storage.from('visa-documents').upload(path,file,{upsert:false}).then(function(up){
        if(up.error) throw up.error;
        docRows.push({ application_id:appId, user_id:uid, doc_type:key, file_path:path, file_name:file.name });
      }));
    });
    (qa.fileQs||[]).forEach(function(q){
      var file=applyQFiles[q.id]; if(!file) return;
      var ext=(file.name.split('.').pop()||'dat').toLowerCase();
      var path=uid+'/'+appId+'/q_'+q.id+'_'+Date.now()+'.'+ext;
      jobs.push(sb.storage.from('visa-documents').upload(path,file,{upsert:false}).then(function(up){
        if(up.error) throw up.error;
        for(var i=0;i<qa.answers.length;i++){ if(qa.answers[i].q===q.id){ qa.answers[i].value={ name:file.name, path:path }; } }
      }));
    });
    return Promise.all(jobs).then(function(){ return docRows; });
  }

  function renderSuccess(app, partial){
    picked={};
    clearDocumentPreviewUrls();
    document.body.classList.remove('apply-focus','apply-reviewing');
    renderHeader();
    var visa=visaById(app.visa_type);
    var visaName=visa&&visa.name?visa.name:(app.visa_type||'UAE visa');
    var submitted=app.created_at?new Date(app.created_at):new Date();
    var submittedText=submitted.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    var status=app.status||'Submitted';
    root.innerHTML=
      '<main class="app-main success-main success-dashboard">'+
        '<section class="success-hero">'+
          '<div class="success-hero-copy"><div class="success-mark" aria-hidden="true">'+CHECK+'</div><div><span class="success-kicker">Application submitted</span><h1>Your UAE visa is on its way.</h1><p class="success-lead">Thank you, '+esc((app.full_name||'').split(' ')[0]||'traveller')+'. We received your application and documents securely.</p></div></div>'+
          '<div class="success-actions"><button class="btn success-track" data-go="track">Track your visa <span aria-hidden="true">&rarr;</span></button><a class="btn success-add" href="country.html?slug=united-arab-emirates#visa-info">Add another visa <span aria-hidden="true">+</span></a></div>'+
        '</section>'+
        '<div class="success-layout">'+
          '<section class="success-application" aria-labelledby="successVisaTitle">'+
            '<header><div><span>United Arab Emirates</span><h2 id="successVisaTitle">'+esc(visaName)+'</h2></div><strong>'+esc(status)+'</strong></header>'+
            '<dl class="success-details"><div><dt>Reference</dt><dd>'+esc(app.reference_code||'-')+'</dd></div><div><dt>Traveller</dt><dd>'+esc(app.full_name||'-')+'</dd></div><div><dt>Submitted</dt><dd>'+esc(submittedText)+'</dd></div><div><dt>Application type</dt><dd>Online UAE visa</dd></div></dl>'+
            '<div class="success-next"><span>What happens next</span><ol><li class="done"><i>'+CHECK+'</i><div><b>Application received</b><small>Your details and files are saved.</small></div></li><li><i>2</i><div><b>Document review</b><small>'+(partial?'We will help if a file needs to be uploaded again.':'Our team checks the passport and personal photo.')+'</small></div></li><li><i>3</i><div><b>Status updates</b><small>Open Track visa to follow every update.</small></div></li></ol></div>'+
          '</section>'+
          '<aside class="success-documents-panel"><header><div><span>Attached documents</span><h2>Passport &amp; photo</h2></div><b>Secure</b></header><p>These are the files attached to this application.</p><div id="successDocuments"><div class="success-documents-loading"><span class="spin"></span><span>Loading your files&hellip;</span></div></div></aside>'+
        '</div>'+
        '<section class="success-help-strip"><div><b>Need help with this application?</b><p>Message our visa team and include reference '+esc(app.reference_code||'')+'.</p></div><a href="https://wa.me/'+cfg.WHATSAPP+'" target="_blank" rel="noopener">Message us on WhatsApp <span aria-hidden="true">&rarr;</span></a></section>'+
      '</main>';
    root.querySelector('[data-go="track"]').onclick=function(){ go('track'); };
    sb.from('documents').select('*').eq('application_id',app.id).then(function(result){
      var box=document.getElementById('successDocuments');
      if(!box) return;
      if(result.error){ box.innerHTML='<div class="success-documents-error">Your application is saved, but the previews could not be loaded.</div>'; return; }
      var completeApp=Object.assign({},app,{documents:result.data||[]});
      box.innerHTML=customerDocumentsHtml(completeApp,false,true);
      wireCustomerDocumentPreviews(box);
    }).catch(function(){
      var box=document.getElementById('successDocuments');
      if(box) box.innerHTML='<div class="success-documents-error">Your application is saved, but the previews could not be loaded.</div>';
    });
  }

  // ============================================================
  //  TRACK (customer dashboard)
  // ============================================================
  function renderTrack(){
    document.body.classList.remove('track-detail-open');
    root.innerHTML='<main class="app-main track-main track-dashboard">'+
      '<section class="track-workspace"><header class="track-workspace-head"><div><span>Your applications</span><h2>Track your visa status.</h2><p>Select an application to view its timeline, documents and latest updates.</p></div><div class="track-live"><i aria-hidden="true"></i><span>Live updates</span></div></header><div id="trackList"><div class="track-loading"><span class="spin"></span><p>Loading your applications&hellip;</p></div></div></section>'+
    '</main>';

    sb.from('applications').select('*, documents(*), app_messages(*)').order('created_at',{ascending:false}).then(function(r){
      var box=document.getElementById('trackList');
      if(r.error){ box.innerHTML='<div class="empty-state"><p>Could not load your applications. Please refresh.</p></div>'; console.error(r.error); return; }
      if(!r.data.length){
        box.innerHTML='<div class="track-empty">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 12h6m-6 4h6m2 4H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7l5 5v9a2 2 0 0 1-2 2z"/></svg>'+
          '<h3>No applications to track yet</h3>'+
          '<p>Applications linked to this account will appear here with their latest status.</p>'+
          '</div>';
        return;
      }
      box.innerHTML='<section class="track-applications-panel" id="trackApplicationsPanel"><header class="track-applications-head"><div><span>Visa overview</span><h3>Your applications</h3></div><b>'+r.data.length+' '+(r.data.length===1?'application':'applications')+'</b></header><div class="app-list">'+r.data.map(function(a){ return appCard(a); }).join('')+'</div></section>';
      var list=box.querySelector('.app-list'), collection=document.getElementById('trackApplicationsPanel');
      box.querySelectorAll('.track-compact-item').forEach(function(item){
        var back=item.querySelector('[data-track-back]');
        item.addEventListener('toggle',function(){
          if(item.open){
            [].slice.call(list.querySelectorAll('.track-compact-item')).forEach(function(other){ if(other!==item) other.open=false; });
            item.classList.add('track-focused'); list.classList.add('track-detail-mode'); collection.classList.add('track-detail-mode');
            collection.setAttribute('data-restore-y',String(window.scrollY||0)); document.body.classList.add('track-detail-open'); window.scrollTo(0,0);
          } else if(item.classList.contains('track-focused')){
            item.classList.remove('track-focused'); list.classList.remove('track-detail-mode'); collection.classList.remove('track-detail-mode'); document.body.classList.remove('track-detail-open');
          }
        });
        if(back) back.onclick=function(){ var restore=Number(collection.getAttribute('data-restore-y')||0); item.open=false; setTimeout(function(){ window.scrollTo(0,restore); },0); };
      });
      wireCustomerDocumentPreviews(box);
      wireThreadFiles(box);
      box.querySelectorAll('.reply-panel[data-app]').forEach(function(panel){ var b=panel.querySelector('[data-reply-send]'); if(b) b.onclick=function(){ submitReply(panel); }; });
      // wire "download your visa" buttons
      r.data.forEach(function(a){
        var vd=(a.documents||[]).filter(function(d){return d.doc_type==='visa';})[0];
        if(!vd) return;
        var btn=box.querySelector('.dl-visa[data-app="'+a.id+'"]');
        if(!btn) return;
        btn.onclick=function(){
          btn.innerHTML='<span class="spin"></span> Preparing…';
          sb.storage.from('visa-documents').createSignedUrl(vd.file_path,3600,{ download: vd.file_name||'visa.pdf' }).then(function(s){
            btn.innerHTML='Download your visa <span aria-hidden="true">&darr;</span>';
            if(s.error||!s.data){ toast('Could not open your visa. Please try again.'); return; }
            window.open(s.data.signedUrl,'_blank','noopener');
          });
        };
      });
    });
  }

  function statusPillClass(s){ return s==='Visa Issued'?'sp-done':(s==='Action Needed'?'sp-action':'sp-progress'); }
  function statusPill(status){
    return '<span class="status-pill '+statusPillClass(status)+'">'+esc(status)+'</span>';
  }
  // Country name for a visa (for the compact application rows). Empty if not resolvable yet.
  function visaCountryName(a){ var v=visaById(a.visa_type); if(!v||!v.country_slug) return '';
    for(var i=0;i<countryList.length;i++){ if(countryList[i].slug===v.country_slug) return countryList[i].name; } return ''; }
  // Small customer-payment pill for a row (finance only). Mirrors the panel logic incl. "Advance".
  function rowPayPill(a){
    if(!isFinance()) return '';
    var f=finOf(a); if(!f) return '';
    var net=cpNetPaid(a), total=Number(f.customer_total||0);
    if(total<=0 && net>0) return '<span class="status-pill sp-progress pill-sm">Advance</span>';
    var s=f.customer_payment_status||'unpaid';
    var map={paid:['sp-done','Paid'],partial:['sp-progress','Partial'],unpaid:['','Unpaid'],refunded:['sp-action','Refunded']};
    var m=map[s]||['',s], ex=(s==='unpaid')?' style="background:#eef2f7;color:#64748b"':'';
    return '<span class="status-pill pill-sm '+m[0]+'"'+ex+'>'+esc(m[1])+'</span>';
  }
  // Shared right-chevron for clickable compact rows.
  var CHEV='<svg class="ar-chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

  // ---- shared "Action Needed" conversation thread (staff request <-> customer reply) ----
  function fmtWhen(ts){ return new Date(ts).toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}); }
  function threadMsgsOf(a){ return (a.app_messages||[]).slice().sort(function(x,y){ return new Date(x.created_at)-new Date(y.created_at); }); }
  function lastStaffMsg(a){ var s=threadMsgsOf(a).filter(function(m){return m.author==='staff';}); return s.length?s[s.length-1]:null; }
  function threadHtml(a){
    var msgs=threadMsgsOf(a); if(!msgs.length) return '';
    return '<div class="thread">'+msgs.map(function(m){
      var staff=m.author==='staff';
      var docs=(m.requested_docs&&m.requested_docs.length)?('<div class="thread-req">Documents requested: '+m.requested_docs.map(esc).join(', ')+'</div>'):'';
      var atts=(m.attachments&&m.attachments.length)?('<div class="thread-atts">'+m.attachments.map(function(f){ return '<a href="#" class="thread-file" data-path="'+esc(f.path)+'">📎 '+(f.label?esc(f.label)+': ':'')+esc(f.name||'file')+'</a>'; }).join('')+'</div>'):'';
      var bodyHtml=m.body?('<div class="tmsg-body">'+esc(m.body).replace(/\n/g,'<br>')+'</div>'):'';
      return '<div class="tmsg '+(staff?'tmsg-staff':'tmsg-cust')+'"><div class="tmsg-head">'+(staff?'Our team':'Customer')+' · '+esc(fmtWhen(m.created_at))+'</div>'+bodyHtml+docs+atts+'</div>';
    }).join('')+'</div>';
  }
  function wireThreadFiles(scope){
    (scope||document).querySelectorAll('.thread-file[data-path]').forEach(function(link){
      link.onclick=function(e){ e.preventDefault(); var p=link.getAttribute('data-path'), orig=link.textContent; link.textContent='Opening…';
        sb.storage.from('visa-documents').createSignedUrl(p,3600).then(function(s){ link.textContent=orig; if(s.error||!s.data){ toast('Could not open that file.'); return; } window.open(s.data.signedUrl,'_blank','noopener'); }); };
    });
  }

  function profileVisaCountry(a){
    var v=visaById(a.visa_type), slug=v&&v.country_slug;
    if(slug==='uae'||slug==='united-arab-emirates') return 'United Arab Emirates';
    var known=slug?countryName(slug):'';
    if(known&&known!==slug) return known;
    if(slug) return slug.split('-').map(function(word){ return word.charAt(0).toUpperCase()+word.slice(1); }).join(' ');
    return 'United Arab Emirates';
  }

  function profileVisaPlaceImage(a){
    var v=visaById(a.visa_type), slug=v&&v.country_slug;
    for(var i=0;i<countryList.length;i++){
      if(countryList[i].slug===slug && countryList[i].image_url) return countryList[i].image_url;
    }
    return '/assets/dubai-attractions/burj-khalifa.jpg';
  }

  function profileApplicationsHtml(apps,activeTab){
    var completed=apps.filter(function(a){ return a.status==='Visa Issued'; });
    var ongoing=apps.filter(function(a){ return a.status!=='Visa Issued'; });
    var shown=activeTab==='completed'?completed:ongoing;
    var emptyText=activeTab==='completed'?'No completed applications yet.':'No ongoing applications.';
    var cards=shown.map(function(a){
      var v=visaById(a.visa_type);
      var created=a.created_at?new Date(a.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'';
      var destination=profileVisaCountry(a), placeImage=profileVisaPlaceImage(a);
      return '<article class="profile-compact-visa"><div class="compact-visa-visual"><span class="compact-visa-place-photo"><img src="'+esc(placeImage)+'" alt="'+esc(destination)+' destination" loading="lazy" decoding="async"></span></div><div class="compact-visa-copy"><span>'+esc(a.status==='Visa Issued'?'Completed':'Continue')+'</span><h3>'+esc(v?v.name:(a.visa_type||'Visa application'))+'</h3><small>'+esc(destination)+' &middot; '+esc(a.reference_code||'-')+(created?' &middot; '+esc(created):'')+'</small></div>'+statusPill(a.status||'Submitted')+'<button class="compact-visa-arrow" type="button" data-profile-track aria-label="View '+esc(v?v.name:'application')+'">&rarr;</button></article>';
    }).join('');
    return '<section class="profile-visas"><div class="profile-application-tabs" role="tablist" aria-label="Applications"><button type="button" role="tab" aria-selected="'+(activeTab==='completed')+'" class="'+(activeTab==='completed'?'active':'')+'" data-profile-tab="completed">Completed applications <span>'+completed.length+'</span></button><button type="button" role="tab" aria-selected="'+(activeTab==='ongoing')+'" class="'+(activeTab==='ongoing'?'active':'')+'" data-profile-tab="ongoing">Ongoing applications <span>'+ongoing.length+'</span></button></div>'+(cards?'<div class="profile-visa-list">'+cards+'</div>':'<div class="customer-documents-empty">'+emptyText+'</div>')+'</section>';
  }

  function customerDocumentsHtml(a, profileMode, embedded){
    var docs=a.documents||[];
    function find(type){ for(var i=0;i<docs.length;i++){ if(docs[i].doc_type===type) return docs[i]; } return null; }
    function tile(type,label,description){
      var doc=find(type);
      if(!doc) return '<div class="customer-document missing"><div class="customer-document-media"><span>Not available</span></div><div class="customer-document-copy"><b>'+esc(label)+'</b><small>'+esc(description)+'</small></div></div>';
      return '<button class="customer-document" type="button" data-customer-doc="'+esc(doc.file_path)+'" data-customer-label="'+esc(label)+'"><div class="customer-document-media"><span class="customer-document-spinner"></span></div><div class="customer-document-copy"><b>'+esc(label)+'</b><small>'+esc(description)+'</small><i>View image <span aria-hidden="true">&rarr;</span></i></div></button>';
    }
    var tiles='<div class="customer-documents-grid">'+tile('passport','Passport front','Verified passport page')+tile('photo','Personal photo','Photo used for this application')+'</div>';
    if(embedded) return '<section class="customer-documents embedded">'+tiles+'</section>';
    return '<details class="customer-documents customer-document-disclosure '+(profileMode?'profile-document-section':'')+'" data-customer-documents-disclosure><summary class="customer-documents-toggle"><div class="customer-documents-head"><div><strong>Passport &amp; photo</strong><p>Your uploaded documents'+(profileMode&&a.reference_code?' for '+esc(a.reference_code):'')+'.</p></div><span>Secure</span></div><div class="customer-documents-toggle-row"><b>View attached files</b><span aria-hidden="true">+</span></div></summary><div class="customer-documents-reveal">'+tiles+'</div></details>';
  }

  function wireCustomerDocumentPreviews(scope){
    scope=scope||document;
    function loadPreview(card){
      if(card.getAttribute('data-preview-loading')==='true') return;
      card.setAttribute('data-preview-loading','true');
      var path=card.getAttribute('data-customer-doc');
      var media=card.querySelector('.customer-document-media');
      sb.storage.from('visa-documents').createSignedUrl(path,3600).then(function(result){
        if(!card.isConnected) return;
        if(result.error||!result.data||!result.data.signedUrl){
          card.disabled=true; card.classList.add('missing'); media.innerHTML='<span>Preview unavailable</span>'; return;
        }
        var url=result.data.signedUrl;
        var label=card.getAttribute('data-customer-label')||'Uploaded document';
        media.innerHTML='<img src="'+esc(url)+'" alt="'+esc(label)+' preview">';
        card.onclick=function(){ window.open(url,'_blank','noopener'); };
      }).catch(function(){
        if(!card.isConnected) return;
        card.disabled=true; card.classList.add('missing'); media.innerHTML='<span>Preview unavailable</span>';
      });
    }
    scope.querySelectorAll('[data-customer-documents-disclosure]').forEach(function(disclosure){
      disclosure.addEventListener('toggle',function(){
        if(disclosure.open) disclosure.querySelectorAll('[data-customer-doc]').forEach(loadPreview);
      });
      if(disclosure.open) disclosure.querySelectorAll('[data-customer-doc]').forEach(loadPreview);
    });
    scope.querySelectorAll('[data-customer-doc]').forEach(function(card){
      if(!card.closest('[data-customer-documents-disclosure]')) loadPreview(card);
    });
  }

  function wireCustomerThumbnails(scope){
    (scope||document).querySelectorAll('[data-customer-thumb]').forEach(function(media){
      var path=media.getAttribute('data-customer-thumb');
      sb.storage.from('visa-documents').createSignedUrl(path,3600).then(function(result){
        if(!media.isConnected) return;
        if(result.error||!result.data||!result.data.signedUrl){ media.classList.add('placeholder'); media.textContent=''; return; }
        media.innerHTML='<img src="'+esc(result.data.signedUrl)+'" alt="">';
      }).catch(function(){ if(media.isConnected) media.classList.add('placeholder'); });
    });
  }

  function appCard(a){
    var stages=cfg.STAGES;
    var idx=stages.indexOf(a.status);
    var action = a.status==='Action Needed';
    var visa=visaById(a.visa_type);
    var destination=profileVisaCountry(a);
    var destinationCode=destination==='United Arab Emirates'?'DXB':destination.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase();
    var steps=stages.map(function(label,i){
      var cls = action ? (i===0?'current':'upcoming') :
                (i<idx?'done':(i===idx?'current':'upcoming'));
      var inner = (cls==='done') ? CHECK : '<span style="font-size:12px;font-weight:700">'+(i+1)+'</span>';
      return '<div class="tstep '+cls+'"><div class="dot">'+inner+'</div><div class="tlabel">'+esc(label)+'</div></div>';
    }).join('');
    var created=new Date(a.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    var statusDescriptions={
      'Submitted':'Your application has been received and is waiting for document checks.',
      'Documents Verified':'Your uploaded documents have been checked successfully.',
      'Under Review':'Our visa team is reviewing your application.',
      'Payment Confirmed':'Your payment has been confirmed.',
      'Approved':'Your application is approved and the visa is being prepared.',
      'Visa Issued':'Your visa is ready to download.',
      'Action Needed':'We need some information from you before we can continue.'
    };
    var currentDescription=statusDescriptions[a.status]||'We will notify you when your application status changes.';
    var hasVisa=(a.documents||[]).some(function(d){ return d.doc_type==='visa'; });
    var visaBanner = hasVisa ?
      '<div class="visa-ready-banner">'+
        '<div class="visa-ready-mark">'+CHECK+'</div><div class="visa-ready-copy"><b>Your visa is ready</b>'+
        '<p>Your UAE tourist visa has been issued. Download and keep a copy for your travel.</p></div>'+
        '<button class="btn track-primary dl-visa" data-app="'+esc(a.id)+'">Download your visa <span aria-hidden="true">&darr;</span></button>'+
      '</div>' : '';
    var msgs=threadMsgsOf(a);
    var threadBlock = msgs.length ? ('<div class="thread-wrap"><div class="thread-title">Messages with our team</div>'+threadHtml(a)+'</div>') : '';
    var replyPanel='';
    if(action){
      var ls=lastStaffMsg(a);
      var reqDocs=(ls&&ls.requested_docs)||[];
      var slots = reqDocs.length
        ? reqDocs.map(function(label,i){ return '<div class="field"><label class="ulabel">'+esc(label)+'</label><input type="file" data-reqfile="'+i+'" data-label="'+esc(label)+'" accept="image/*,application/pdf"></div>'; }).join('')
        : '<div class="field"><label class="ulabel">Attach a file (optional)</label><input type="file" data-reqfile="0" accept="image/*,application/pdf"></div>';
      replyPanel='<div class="reply-panel" data-app="'+esc(a.id)+'">'+
        '<div class="reply-title">Action needed — respond to our team</div>'+
        '<p class="reply-ask">Upload the requested document'+(reqDocs.length>1?'s':'')+' below and/or send us a message. Your reply goes straight to our team.</p>'+
        slots+
        '<div class="field"><label class="ulabel">Message (optional)</label><textarea data-reply-msg rows="3" placeholder="Add a note for our team…" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:14px"></textarea></div>'+
        '<button class="btn btn-primary" data-reply-send>Send to our team</button>'+
      '</div>';
    }
    var progressLabel=(action||idx<0)?'Update required':Math.round(((idx+1)/stages.length)*100)+'% complete';
    var progressPercent=(action||idx<0)?0:Math.round(((idx+1)/stages.length)*100);
    return '<details class="track-compact-item"><summary class="track-compact-summary"><span class="track-route-badge" aria-hidden="true"><b>'+esc(destinationCode||'VISA')+'</b><small>eVISA</small></span><span class="track-compact-copy"><small>'+esc(action?'Waiting for you':(a.status==='Visa Issued'?'Ready to travel':'Journey in motion'))+'</small><strong>'+esc(visa?visa.name:a.visa_type)+'</strong><i>'+esc(a.reference_code)+' &middot; '+esc(destination)+'</i></span><span class="track-summary-progress" aria-label="'+esc(progressLabel)+'"><i style="--track-progress:'+progressPercent+'%"><b></b></i><em>'+esc(progressLabel)+'</em></span>'+statusPill(a.status)+'<span class="track-compact-arrow" aria-hidden="true">+</span></summary><div class="track-expanded"><button class="track-back-list" type="button" data-track-back><span aria-hidden="true">&larr;</span> All applications</button><article class="app-card track-card">'+
      '<div class="app-card-top track-card-head"><div class="track-card-title">'+
        '<span class="track-destination">Visadoo journey &middot; '+esc(a.reference_code)+'</span>'+
        '<h2>'+esc(visa?visa.name:a.visa_type)+'</h2>'+
        '<div class="track-meta"><span><small>Reference</small><b>'+esc(a.reference_code)+'</b></span><span><small>Applied on</small><b>'+created+'</b></span><span><small>Journey value</small><b>'+appPriceText(a)+'</b></span></div>'+
      '</div>'+statusPill(a.status)+'</div>'+
      (action && a.notes && !msgs.length ? '<div class="signin-msg err" style="display:block;margin-bottom:18px">'+esc(a.notes)+'</div>' : '')+
      '<div class="track-current '+(action?'needs-action':'')+'"><div class="track-current-mark">'+(action?'!':CHECK)+'</div><div><small>Current status</small><strong>'+esc(a.status)+'</strong><p>'+esc(currentDescription)+'</p></div></div>'+
      '<div class="track-progress-head"><strong>Your visa milestones</strong><span>'+((action||idx<0)?'Update required':Math.round(((idx+1)/stages.length)*100)+'% complete')+'</span></div>'+
      '<div class="tracker">'+steps+'</div>'+
      customerDocumentsHtml(a,false)+
      visaBanner+
      threadBlock+
      replyPanel+
      '</article></div></details>';
  }

  function submitReply(panel){
    var appId=panel.getAttribute('data-app');
    var btn=panel.querySelector('[data-reply-send]');
    var msg=((panel.querySelector('[data-reply-msg]')||{}).value||'').trim();
    var inputs=[].slice.call(panel.querySelectorAll('[data-reqfile]'));
    var files=[];
    for(var i=0;i<inputs.length;i++){ var fi=inputs[i]; if(fi.files&&fi.files[0]){ if(fi.files[0].size>10485760){ toast('“'+fi.files[0].name+'” is over 10 MB. Please choose a smaller file.'); return; } files.push({file:fi.files[0], label:fi.getAttribute('data-label')||''}); } }
    if(!files.length && !msg){ toast('Please attach a file or write a message.'); return; }
    btn.disabled=true; btn.innerHTML='<span class="spin"></span> Sending…';
    var uid=state.user.id, atts=[];
    var jobs=files.map(function(f,idx){
      var ext=(f.file.name.split('.').pop()||'dat').toLowerCase();
      var path=uid+'/'+appId+'/reply_'+Date.now()+'_'+idx+'.'+ext;
      return sb.storage.from('visa-documents').upload(path,f.file,{upsert:false}).then(function(up){ if(up.error) throw up.error; atts.push({name:f.file.name, path:path, label:f.label}); });
    });
    Promise.all(jobs).then(function(){
      return sb.from('app_messages').insert({ application_id:appId, author:'customer', author_id:uid, body:msg||null, attachments:atts });
    }).then(function(r){
      if(r.error) throw r.error;
      sb.auth.getSession().then(function(sess){ var token=sess.data.session?sess.data.session.access_token:cfg.SUPABASE_ANON_KEY;
        fetch(fnUrl('notify-staff-reply'),{ method:'POST', headers:{'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY,'Authorization':'Bearer '+token}, body:JSON.stringify({application_id:appId, origin:location.origin}) }).catch(function(){}); });
      toast('Sent to our team. We’ll review and update you.');
      renderTrack();
    }).catch(function(err){ btn.disabled=false; btn.innerHTML='Send to our team'; toast('Could not send. Please try again.'); console.error(err); });
  }

  // ============================================================
  //  ADMIN  (team console — view all applications, change status, view docs)
  // ============================================================
  var ALL_STATUSES = cfg.STAGES.concat(['Action Needed']);
  var adminRows = [], finSuppliers = [], finSettings = {}, finBrand = {};
  var appViewId = null;                 // application open on its own detail page
  var appTab='detail', appEditing=false, appEdits=[], appIti=null;  // application edit + history
  var ADMIN_PAGE = 25, adminLimit = ADMIN_PAGE; // compact-list "Load more" batching
  // Finance maths (cost lines + margin ₹/% + flexible GST). All INR.
  var COST_CATEGORIES=['Visa processing','Insurance','Express delivery','Voucher','Other'];
  function computeFin(lines, marginType, marginValue, gstMode, gstRate){
    var totalCost=(lines||[]).reduce(function(s,l){ return s+(Number(l.cost)||0); },0);
    marginValue=Number(marginValue)||0; gstRate=Number(gstRate)||0;
    var marginAmt = marginType==='percent' ? Math.round(totalCost*marginValue/100) : marginValue;
    var selling = totalCost + marginAmt;
    var taxable = gstMode==='none' ? 0 : (gstMode==='full' ? selling : marginAmt); // 'margin' default
    var gst = Math.round(taxable*gstRate/100);
    return { totalCost:totalCost, marginAmt:marginAmt, selling:selling, gst:gst, total:selling+gst };
  }
  // One editable cost-line row (category · supplier · cost).
  function clRowHtml(l){
    l=l||{};
    var cats=COST_CATEGORIES.map(function(c){ return '<option'+(l.category===c?' selected':'')+'>'+esc(c)+'</option>'; }).join('');
    var sups='<option value="">— supplier —</option>'+finSuppliers.map(function(s){ return '<option value="'+esc(s.id)+'"'+(l.supplier_id===s.id?' selected':'')+'>'+esc(s.name)+'</option>'; }).join('');
    return '<div class="cl-row" style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap;align-items:center">'+
      '<select class="cl-cat" style="flex:1;min-width:130px">'+cats+'</select>'+
      '<select class="cl-sup" style="flex:1;min-width:130px">'+sups+'</select>'+
      '<input class="cl-cost" type="number" min="0" placeholder="cost ₹" value="'+esc(l.cost!=null&&l.cost!==0?l.cost:(l.cost===0?'0':''))+'" style="width:100px;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit">'+
      '<input class="cl-inv" type="text" placeholder="invoice no" value="'+esc(l.invoice_no||'')+'" style="width:120px;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit">'+
      '<button type="button" class="cl-del link-btn" style="color:var(--red);padding:0 6px;font-size:16px">✕</button>'+
    '</div>';
  }
  // Customer payment status from payment lines vs a given total (mirrors the DB trigger).
  function cpStatus(a, total){
    var pays=cpListOf(a).filter(function(p){return (p.status||'approved')==='approved';});
    var paid=pays.filter(function(p){return p.kind!=='refund';}).reduce(function(s,p){return s+Number(p.amount||0);},0);
    var ref=pays.filter(function(p){return p.kind==='refund';}).reduce(function(s,p){return s+Number(p.amount||0);},0);
    var net=paid-ref;
    if(ref>0 && net<=0) return 'refunded';
    if(net<=0) return 'unpaid';
    if(total>0 && net>=total) return 'paid';
    return 'partial';
  }
  function finOf(a){ var f=a&&a.application_finance; if(Array.isArray(f)) return f[0]||null; return f||null; }
  function cpListOf(a){ var c=(a&&a.customer_payments)||[]; return c.slice().sort(function(x,y){ return new Date(x.created_at)-new Date(y.created_at); }); }
  function cpNetPaid(a){ return cpListOf(a).reduce(function(n,p){ if((p.status||'approved')!=='approved') return n; return n + (p.kind==='refund' ? -Number(p.amount||0) : Number(p.amount||0)); }, 0); }
  function receiptNo(p){ var pre=(p.kind==='refund')?'REF':((finSettings&&finSettings.receipt_prefix)||'RCPT'); return pre+'-'+String(p.seq==null?0:p.seq).padStart(6,'0'); }
  function payStatusPill(s){
    var map={ paid:['sp-done','Paid'], partial:['sp-progress','Partial'], unpaid:['','Unpaid'], refunded:['sp-action','Refunded'] };
    var m=map[s||'unpaid']||['',s]; var ex=(s==='unpaid')?' style="background:#eef2f7;color:#64748b"':'';
    return '<span class="status-pill '+m[0]+'"'+ex+'>'+esc(m[1])+'</span>';
  }
  var adminFilters = { q:'', visa:'', status:'all', country:'', from:'', to:'', sort:'newest', custpay:'all', supplier:'', unread:false, pendingref:false };
  var adminFiltersOpen = false;
  function adminActiveCount(){ var f=adminFilters, n=0; if(f.q.trim())n++; if(f.visa)n++; if(f.status!=='all')n++; if(f.country)n++; if(f.from||f.to)n++; if(f.custpay&&f.custpay!=='all')n++; if(f.supplier)n++; if(f.unread)n++; if(f.pendingref)n++; return n; }
  function afSupplierOptions(){ return '<option value="">All suppliers</option>'+finSuppliers.map(function(s){ return '<option value="'+esc(s.id)+'"'+(adminFilters.supplier===s.id?' selected':'')+'>'+esc(s.name)+'</option>'; }).join(''); }

  // Backend console navigation: a grouped left sidebar (collapses to a slide-out
  // drawer on phones). Same data-section keys + routing as before — nothing breaks.
  var ADMIN_VIEWS=['dashboard','admin','appview','enquiries','leads','leadview','followups','customers','custview','automations','templates','msghistory','suppliers','supview','refunds','reports','destinations','visatypes','events','articles','content','siteseo','brand','emailcfg','team','audit'];

  // Inline-SVG icon per item (brand-coloured via currentColor).
  function sideIcon(key){
    var P={
      dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
      admin:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
      enquiries:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      leads:'<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
      followups:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      customers:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
      comms:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
      automations:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
      templates:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
      msghistory:'<path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-7 3.3M3 4v4h4"/><path d="M12 8v4l3 2"/>',
      destinations:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
      visatypes:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><path d="M14 10h4M14 14h4"/>',
      events:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="15" r="2"/>',
      articles:'<path d="M4 4h13v16H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h5"/>',
      content:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
      siteseo:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      brand:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
      emailcfg:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      team:'<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      suppliers:'<path d="M3 7h13v10H3zM16 10h3l2 3v4h-5"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
      refunds:'<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 7"/>',
      reports:'<path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/>',
      audit:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
    };
    return '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(P[key]||'')+'</svg></span>';
  }

  // Groups + their items, each gated by the same role rules as before. Empty groups drop out.
  function adminNavModel(){
    var g=[
      ['Dashboard',[['dashboard','Dashboard',isStaff()]]],
      ['Customers',[['admin','Applications',canViewApps()],['customers','Customers',state.role==='admin']]],
      ['CRM',[['enquiries','Enquiries',canCRM()],['leads','Leads',canCRM()],['followups','Follow-ups',canCRM()]]],
      ['Messaging',[['automations','Automations',state.role==='admin'],['templates','Message templates',state.role==='admin'],['msghistory','Message history',state.role==='admin']]],
      ['Finance',[['suppliers','Suppliers',isFinance()],['refunds','Refund requests',isFinance()],['reports','Finance reports',isFinance()]]],
      ['Catalogue',[['destinations','Destinations',canManageContent()],['visatypes','Visa Types',canManageContent()],['events','Events',canManageContent()]]],
      ['Content',[['articles','Articles',canManageContent()],['content','Content',canManageContent()],['siteseo','Site SEO',canManageContent()]]],
      ['Settings',[['brand','Brand & Settings',state.role==='admin'],['emailcfg','Email',state.role==='admin'],['team','Team',state.role==='admin']]],
      ['Audit',[['audit','Audit Centre',state.role==='admin']]]
    ];
    return g.map(function(x){ return [x[0], x[1].filter(function(it){return it[2];})]; }).filter(function(x){ return x[1].length; });
  }
  function adminNavCount(){ return adminNavModel().reduce(function(n,g){ return n+g[1].length; },0); }

  function adminSections(active){
    var model=adminNavModel();
    if(adminNavCount()<2) return ''; // nothing to switch between (e.g. viewer)
    var groups=model.map(function(g){
      var hasActive=g[1].some(function(it){ return it[0]===active; });
      var items=g[1].map(function(it){
        return '<button class="side-item'+(active===it[0]?' active':'')+'" data-section="'+it[0]+'">'+sideIcon(it[0])+'<span>'+esc(it[1])+'</span></button>';
      }).join('');
      if(g[0]==='Dashboard'){
        return '<div class="side-group side-group-pinned open">'+
          '<div class="side-group-head side-group-static"><span>'+esc(g[0])+'</span></div>'+
          '<div class="side-group-items">'+items+'</div></div>';
      }
      return '<div class="side-group'+(hasActive?' open':'')+'">'+
        '<button class="side-group-head" data-group-toggle><span>'+esc(g[0])+'</span>'+
          '<svg class="caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>'+
        '</button><div class="side-group-items">'+items+'</div></div>';
    }).join('');
    return '<button class="side-toggle" id="sideToggle"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg> Menu</button>'+
      '<div class="side-backdrop" id="sideBackdrop"></div>'+
      '<nav class="admin-side" id="adminSide"><button class="side-close" id="sideClose" aria-label="Close menu">&times;</button>'+groups+'</nav>';
  }
  function wireAdminSections(){
    root.querySelectorAll('[data-section]').forEach(function(b){
      b.onclick=function(){ document.body.classList.remove('side-open'); go(b.getAttribute('data-section')); };
    });
    root.querySelectorAll('[data-group-toggle]').forEach(function(b){
      b.onclick=function(){ b.parentNode.classList.toggle('open'); };
    });
    var t=document.getElementById('sideToggle'); if(t) t.onclick=function(){ document.body.classList.add('side-open'); };
    var c=document.getElementById('sideClose'); if(c) c.onclick=function(){ document.body.classList.remove('side-open'); };
    var bd=document.getElementById('sideBackdrop'); if(bd) bd.onclick=function(){ document.body.classList.remove('side-open'); };
  }

  function afVisaOptions(){ return '<option value="">All visa types</option>'+VISAS.map(function(v){ return '<option value="'+esc(v.id)+'"'+(adminFilters.visa===v.id?' selected':'')+'>'+esc(v.name)+'</option>'; }).join(''); }
  function afStatusOptions(){
    var opts=[['all','All statuses'],['In progress','In progress (not issued/closed)']].concat(ALL_STATUSES.map(function(s){return [s,s];}));
    return opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(adminFilters.status===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('');
  }
  function afCountryOptions(){ return '<option value="">All countries</option>'+countryList.map(function(c){ return '<option value="'+esc(c.slug)+'"'+(adminFilters.country===c.slug?' selected':'')+'>'+esc(c.name)+'</option>'; }).join(''); }

  function renderAdmin(){
    if(!canViewApps()){ go(defaultStaffView()); return; }
    adminLimit=ADMIN_PAGE;
    if(!countryList.length){ loadCountriesGroups().then(function(){ var sel=document.getElementById('afCountry'); if(sel) sel.innerHTML=afCountryOptions(); }); }
    var canProc=canProcessApps();
    root.innerHTML=
      '<div class="app-main">' +
        adminSections('admin') +
        '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap"><div>'+
          '<h1>Applications</h1><p>'+(canProc?'Review applications, move them through the stages, and open uploaded documents.':'View applications and their current status.')+'</p></div>'+
          (canProc?'<button class="btn btn-primary" id="adminNewApp">+ New application for a customer</button>':'')+
        '</div>' +
        '<div style="margin-bottom:14px">'+
          '<div class="app-toolbar">'+
            '<div class="app-search">'+
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'+
              '<input id="adminSearch" type="text" value="'+esc(adminFilters.q)+'" placeholder="Search name, reference, email, phone, passport…">'+
            '</div>'+
            '<button class="btn btn-ghost" id="adminFiltersBtn" type="button">Filters'+(adminActiveCount()?(' ('+adminActiveCount()+')'):'')+'</button>'+
          '</div>'+
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px">'+
            '<span id="adminCount" class="phint" style="margin:0"></span>'+
            '<button class="link-btn" id="adminClear" type="button" style="margin-left:auto;display:none">Clear all</button>'+
          '</div>'+
          '<div id="adminFilterPanel" class="panel" style="margin-top:12px;'+(adminFiltersOpen?'':'display:none')+'">'+
            '<div class="grid2">'+
              '<div class="field"><label>Visa type</label><select id="afVisa">'+afVisaOptions()+'</select></div>'+
              '<div class="field"><label>Status / stage</label><select id="afStatus">'+afStatusOptions()+'</select></div>'+
              '<div class="field"><label>Destination country</label><select id="afCountry">'+afCountryOptions()+'</select></div>'+
              '<div class="field"><label>Sort by</label><select id="afSort">'+
                '<option value="newest"'+(adminFilters.sort==='newest'?' selected':'')+'>Newest first</option>'+
                '<option value="oldest"'+(adminFilters.sort==='oldest'?' selected':'')+'>Oldest first</option>'+
                '<option value="name"'+(adminFilters.sort==='name'?' selected':'')+'>Name A–Z</option>'+
              '</select></div>'+
              '<div class="field"><label>From date</label><input id="afFrom" type="date" value="'+esc(adminFilters.from)+'"></div>'+
              '<div class="field"><label>To date</label><input id="afTo" type="date" value="'+esc(adminFilters.to)+'"></div>'+
            '</div>'+
            (isFinance()? ('<div class="grid2">'+
              '<div class="field"><label>Customer payment</label><select id="afCustpay">'+
                [['all','All payment statuses'],['unpaid','Unpaid'],['partial','Partial'],['paid','Paid'],['refunded','Refunded'],['advance','Advance (paid, not billed)']].map(function(o){ return '<option value="'+o[0]+'"'+(adminFilters.custpay===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('')+'</select></div>'+
              '<div class="field"><label>Supplier</label><select id="afSupplier">'+afSupplierOptions()+'</select></div>'+
            '</div>') : '')+
            '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:6px">'+
              '<label style="display:flex;gap:7px;align-items:center;font-weight:500;cursor:pointer"><input type="checkbox" id="afUnread" '+(adminFilters.unread?'checked':'')+' style="width:auto"> New customer reply</label>'+
              '<label style="display:flex;gap:7px;align-items:center;font-weight:500;cursor:pointer"><input type="checkbox" id="afPendingRef" '+(adminFilters.pendingref?'checked':'')+' style="width:auto"> Pending refund request</label>'+
            '</div>'+
          '</div>'+
        '</div>'+
        '<div id="adminList"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading applications…</p></div></div>' +
      '</div>';

    wireAdminSections();
    var newBtn=document.getElementById('adminNewApp'); if(newBtn){ newBtn.onclick=function(){ openOnBehalf(); }; }
    document.getElementById('adminFiltersBtn').onclick=function(){ adminFiltersOpen=!adminFiltersOpen; document.getElementById('adminFilterPanel').style.display=adminFiltersOpen?'':'none'; };
    document.getElementById('adminClear').onclick=function(){
      adminFilters.q=''; adminFilters.visa=''; adminFilters.status='all'; adminFilters.country=''; adminFilters.from=''; adminFilters.to='';
      adminFilters.custpay='all'; adminFilters.supplier=''; adminFilters.unread=false; adminFilters.pendingref=false;
      renderAdmin(); return;
    };
    function bind(id,key,ev){ var el=document.getElementById(id); if(el) el[ev]=function(){ adminFilters[key]=el.value; adminLimit=ADMIN_PAGE; paintAdminList(); }; }
    function bindChk(id,key){ var el=document.getElementById(id); if(el) el.onchange=function(){ adminFilters[key]=el.checked; adminLimit=ADMIN_PAGE; paintAdminList(); }; }
    var srch=document.getElementById('adminSearch'); if(srch) srch.oninput=function(){ adminFilters.q=srch.value; adminLimit=ADMIN_PAGE; paintAdminList(); };
    bind('afVisa','visa','onchange'); bind('afStatus','status','onchange');
    bind('afCountry','country','onchange'); bind('afSort','sort','onchange'); bind('afFrom','from','onchange'); bind('afTo','to','onchange');
    bind('afCustpay','custpay','onchange'); bind('afSupplier','supplier','onchange');
    bindChk('afUnread','unread'); bindChk('afPendingRef','pendingref');

    var R=function(d){ return Promise.resolve({data:d}); };
    Promise.all([
      sb.from('applications').select('*, documents(*), app_messages(*), application_finance(*), customer_payments(*), application_cost_lines(*)').order('created_at',{ascending:false}),
      isFinance() ? sb.from('suppliers').select('id,name').eq('active',true).order('name') : R([]),
      isFinance() ? sb.from('finance_settings').select('*').eq('id','global').single() : R(null),
      isFinance() ? sb.from('site_settings').select('brand_name,brand_color,logo_url,contact_email,contact_phone,contact_whatsapp').eq('id','global').single() : R(null)
    ]).then(function(res){
      var box=document.getElementById('adminList');
      if(res[0].error){ box.innerHTML='<div class="empty-state"><p>Could not load applications.</p></div>'; console.error(res[0].error); return; }
      adminRows=res[0].data||[];
      finSuppliers=res[1].data||[];
      finSettings=res[2].data||{};
      finBrand=res[3].data||{};
      var ssel=document.getElementById('afSupplier'); if(ssel) ssel.innerHTML=afSupplierOptions();
      paintAdminList();
    });
  }

  function paintAdminList(){
    var box=document.getElementById('adminList'); if(!box) return;
    var f=adminFilters, q=f.q.trim().toLowerCase();
    var rows=adminRows.filter(function(a){
      if(f.status==='In progress'){ if(a.status==='Visa Issued'||a.status==='Action Needed') return false; }
      else if(f.status!=='all'){ if(a.status!==f.status) return false; }
      if(f.visa && a.visa_type!==f.visa) return false;
      if(f.country){ var v=visaById(a.visa_type); if(!v || v.country_slug!==f.country) return false; }
      var day=(a.created_at||'').slice(0,10);
      if(f.from && day<f.from) return false;
      if(f.to && day>f.to) return false;
      if(q){ var hay=[a.full_name,a.email,a.phone,a.passport_number,a.reference_code].map(function(x){return (x||'').toLowerCase();}).join(' '); if(hay.indexOf(q)===-1) return false; }
      if(isFinance()){
        if(f.custpay && f.custpay!=='all'){ var ff=finOf(a);
          if(f.custpay==='advance'){ if(!ff || Number(ff.customer_total||0)>0 || cpNetPaid(a)<=0) return false; }
          else if(!ff || ff.customer_payment_status!==f.custpay) return false;
        }
        if(f.supplier){ if(!(a.application_cost_lines||[]).some(function(l){return l.supplier_id===f.supplier;})) return false; }
      }
      if(f.unread && !a.unread_reply) return false;
      if(f.pendingref){ if(!(a.customer_payments||[]).some(function(p){return p.kind==='refund' && (p.status||'')==='pending';})) return false; }
      return true;
    });
    rows.sort(function(a,b){
      if(f.sort==='name') return (a.full_name||'').localeCompare(b.full_name||'');
      var da=new Date(a.created_at).getTime(), db=new Date(b.created_at).getTime();
      return f.sort==='oldest' ? (da-db) : (db-da);
    });
    var cnt=document.getElementById('adminCount'); if(cnt) cnt.textContent=rows.length+' of '+adminRows.length+' shown';
    var clr=document.getElementById('adminClear'); if(clr) clr.style.display=adminActiveCount()?'inline':'none';
    var fb=document.getElementById('adminFiltersBtn'); if(fb) fb.textContent='Filters'+(adminActiveCount()?(' ('+adminActiveCount()+')'):'');
    if(!adminRows.length){ box.innerHTML='<div class="panel empty-state"><p>No applications yet.</p></div>'; return; }
    if(!rows.length){ box.innerHTML='<div class="panel empty-state"><p>No applications match your search or filters.</p></div>'; return; }
    var shown=rows.slice(0, adminLimit), remaining=rows.length-shown.length;
    box.innerHTML='<div class="app-list">'+shown.map(adminRowHtml).join('')+'</div>'+
      (remaining>0 ? ('<div class="app-loadmore"><button class="btn btn-ghost" id="adminMore" type="button">Load more ('+remaining+' more)</button></div>') : '');
    box.querySelectorAll('.app-row[data-open]').forEach(function(el){ el.onclick=function(){ openApp(el.getAttribute('data-open')); }; });
    var more=document.getElementById('adminMore'); if(more) more.onclick=function(){ adminLimit+=ADMIN_PAGE; paintAdminList(); };
  }

  // One tidy line per application in the list. Click → full detail page (renderAppDetail).
  function adminRowHtml(a){
    var created=new Date(a.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    var visaName=visaById(a.visa_type)?visaById(a.visa_type).name:a.visa_type;
    var cn=visaCountryName(a);
    var unread=a.unread_reply?' <span class="status-pill sp-action pill-sm">New reply</span>':'';
    var pendRef=(a.customer_payments||[]).some(function(p){return p.kind==='refund'&&(p.status||'')==='pending';})
      ? '<span class="status-pill sp-progress pill-sm">Refund req</span>' : '';
    return '<div class="app-row" data-open="'+esc(a.id)+'">'+
      '<div class="ar-main">'+
        '<div class="ar-name">'+esc(a.full_name||'(no name)')+'<span class="ar-ref"> · '+esc(a.reference_code||'')+'</span>'+unread+'</div>'+
        '<div class="ar-sub">'+esc(visaName)+(cn?(' · '+esc(cn)):'')+'</div>'+
      '</div>'+
      '<div class="ar-right">'+rowPayPill(a)+pendRef+
        '<span class="status-pill pill-sm '+statusPillClass(a.status)+'">'+esc(a.status)+'</span>'+
        '<span class="ar-date">'+created+'</span>'+CHEV+
      '</div>'+
    '</div>';
  }

  function docLabel(t){ return t==='visa'?'visa':(t==='photo'?'photo':(t==='passport_back'?'passport back':'passport front')); }

  function adminCard(a){
    var created=new Date(a.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    var visaName=visaById(a.visa_type)?visaById(a.visa_type).name:a.visa_type;
    var docs=(a.documents||[]);
    var hasVisa=docs.some(function(d){ return d.doc_type==='visa'; });
    var docBtns = docs.length
      ? docs.map(function(d){ return '<a href="#" data-path="'+esc(d.file_path)+'" data-doc="'+esc(d.doc_type)+'">View '+esc(docLabel(d.doc_type))+'</a>'; }).join('')
      : '<span style="color:var(--muted);font-size:13px">No documents uploaded</span>';
    var opts=ALL_STATUSES.map(function(s){ return '<option value="'+esc(s)+'"'+(s===a.status?' selected':'')+'>'+esc(s)+'</option>'; }).join('');
    var ans=(a.answers||[]).filter(function(x){ return x.value && (x.value.path || String(x.value).length); });
    var answersHtml = ans.length ? ('<div class="answers-box"><div class="answers-title">Application answers</div>'+
      ans.map(function(x){
        var val = (x.type==='file' && x.value && x.value.path)
          ? '<a href="#" class="ans-file" data-path="'+esc(x.value.path)+'">View file ('+esc(x.value.name||'file')+')</a>'
          : esc(x.value);
        return '<div class="answer-row"><span class="answer-q">'+esc(x.label)+'</span><span class="answer-a">'+val+'</span></div>';
      }).join('')+'</div>') : '';
    return '<div class="admin-app" data-id="'+esc(a.id)+'">' +
      '<div class="arow">' +
        '<div><h4>'+esc(a.full_name)+' '+statusPill(a.status)+(a.unread_reply?' <span class="status-pill sp-action" style="font-size:11px">New reply</span>':'')+'</h4>' +
        '<div class="meta">'+esc(visaName)+' · '+appPriceText(a)+' · Ref '+esc(a.reference_code)+' · '+created+'</div>' +
        '<div class="meta">'+esc(a.passport_issuing_country||a.nationality||'')+(a.state?(' ('+esc(a.state)+')'):'')+' · Passport '+esc(a.passport_number)+' · '+esc(a.phone)+(a.mobile_verified?(' <span class="status-pill sp-done" style="font-size:10px;padding:1px 7px" title="Mobile verified by WhatsApp OTP'+(a.mobile_verified_at?(' on '+new Date(a.mobile_verified_at).toLocaleDateString()):'')+'">Mobile ✓</span>'):'')+' · '+esc(a.email)+'</div></div>' +
      '</div>' +
      '<div class="doc-links">'+docBtns+'</div>' +
      answersHtml +
      (threadMsgsOf(a).length ? ('<div class="thread-wrap"><div class="thread-title">Conversation</div>'+threadHtml(a)+'</div>') : '') +
      (canProcessApps() ? (
      '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">' +
        '<div><label class="ulabel">Status</label><select data-role="status">'+opts+'</select></div>' +
        '<div style="flex:1;min-width:220px" data-role="noteWrap"><label class="ulabel">Message to customer (sent when status is “Action Needed”)</label>' +
          '<input data-role="note" type="text" value="'+esc(a.notes||'')+'" placeholder="e.g. Your passport photo is blurry — please re-upload" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:14px"></div>' +
        '<button class="btn btn-primary" data-role="save">Save</button>' +
      '</div>' +
      '<div style="margin-top:10px" data-role="reqWrap"><label class="ulabel">Documents to request (one per line) — shown to the customer as upload slots when “Action Needed”</label>' +
        '<textarea data-role="reqdocs" rows="2" placeholder="Bank statement&#10;Updated passport photo" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-size:14px"></textarea></div>' +
      '<div style="margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)">' +
        '<label class="ulabel">Issued visa document ' +
          (hasVisa ? '<span style="color:var(--green)">· attached &#10003;</span>'
                   : '<span style="color:var(--muted)">· attach the visa file before marking &ldquo;Visa Issued&rdquo;</span>') + '</label>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
          '<button type="button" class="btn btn-ghost" data-role="visaPick">'+(hasVisa?'Replace visa file':'Choose visa file')+'</button>' +
          '<span data-role="visaName" style="font-size:13px;color:var(--green);font-weight:600"></span>' +
          '<input type="file" data-role="visaFile" accept="image/*,application/pdf" style="display:none">' +
        '</div>' +
      '</div>') : '') +
      refundRequestHtml(a) +
      financePanelHtml(a) +
    '</div>';
  }

  // "Request refund" for Operations/Sales (raises a pending request for finance).
  function refundRequestHtml(a){
    if(!hasRole(['agent','sales'])) return '';
    var mine=cpListOf(a).filter(function(p){ return p.kind==='refund'; });
    var statusLine = mine.length ? ('<div class="phint" style="margin:8px 0 0">'+mine.map(function(p){ return 'Refund '+money(p.amount)+' — '+esc(p.status||'pending'); }).join(' · ')+'</div>') : '';
    return '<div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--line)">'+
      '<button class="btn btn-ghost" data-rfreq="open">Request refund</button>'+
      '<div class="rfreq-form" style="display:none;margin-top:8px;padding:10px;border:1px dashed var(--line);border-radius:10px">'+
        '<div class="grid2"><div class="field"><label class="ulabel">Refund amount (₹)</label><input data-rfreq="amount" type="number" min="0"></div>'+
        '<div class="field"><label class="ulabel">Reason</label><input data-rfreq="reason" type="text" placeholder="why a refund is needed"></div></div>'+
        '<div style="display:flex;gap:10px"><button class="btn btn-primary" data-rfreq="save">Send request to finance</button><button class="link-btn" data-rfreq="cancel">Cancel</button></div>'+
      '</div>'+statusLine+
    '</div>';
  }

  // Per-application Finance panel (admin/finance only). Cost lines + margin (₹/%)
  // → selling price + flexible GST → customer total. Customer never sees this.
  function financePanelHtml(a){
    if(!isFinance()) return '';
    var f=finOf(a)||{};
    var lines=(a.application_cost_lines||[]).slice().sort(function(x,y){ return new Date(x.created_at)-new Date(y.created_at); });
    if(!lines.length) lines=[{}];
    var marginType=f.margin_type||'amount';
    var gstmodeSel=[['margin','GST on margin'],['full','GST on full price'],['none','No GST']].map(function(o){ return '<option value="'+o[0]+'"'+((f.gst_mode||'margin')===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('');
    return '<div style="margin-top:16px;padding:14px 16px;border:1px solid var(--blue-100);background:var(--sky-50);border-radius:12px">'+
      '<div class="answers-title" style="color:var(--blue-700)">💰 Finance</div>'+
      '<div style="font-weight:600;font-size:13px;margin-bottom:6px">Cost lines</div>'+
      '<div data-fin="clwrap">'+lines.map(clRowHtml).join('')+'</div>'+
      '<button type="button" class="btn btn-ghost" data-fin="addline" style="margin:2px 0 12px">+ Add cost line</button>'+
      '<div class="grid2">'+
        '<div class="field"><label class="ulabel">Margin</label><div style="display:flex;gap:6px">'+
          '<select data-fin="margintype" style="width:84px"><option value="amount"'+(marginType==='amount'?' selected':'')+'>₹</option><option value="percent"'+(marginType==='percent'?' selected':'')+'>%</option></select>'+
          '<input data-fin="marginval" type="number" min="0" value="'+esc(f.margin_value!=null?f.margin_value:'')+'" placeholder="0" style="flex:1;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit"></div></div>'+
        '<div class="field"><label class="ulabel">GST</label><select data-fin="gstmode">'+gstmodeSel+'</select></div>'+
      '</div>'+
      '<div class="grid2">'+
        '<div class="field"><label class="ulabel">GST rate %</label><input data-fin="gstrate" type="number" min="0" value="'+esc(f.gst_rate!=null?f.gst_rate:18)+'"></div>'+
        '<div class="field"><label class="ulabel">&nbsp;</label><button class="btn btn-primary" data-fin="save" style="width:100%">Save finance</button></div>'+
      '</div>'+
      '<div class="phint" data-fin="calc" style="margin:2px 0 0;font-weight:600;color:var(--ink);font-size:14px"></div>'+
      financePaymentsHtml(a, f)+
    '</div>';
  }

  // Customer payments sub-section (list + record payment/refund + receipts).
  function financePaymentsHtml(a, f){
    var pays=cpListOf(a), net=cpNetPaid(a), total=Number(f.customer_total||0), balance=total-net;
    var rows = pays.length ? pays.map(function(p){
      var st=p.status||'approved';
      if(p.kind==='refund' && st!=='approved'){
        var badge = st==='pending'
          ? '<span class="status-pill sp-progress" style="font-size:11px">Pending approval</span>'
          : '<span class="status-pill" style="font-size:11px;background:#eef2f7;color:#64748b">Rejected</span>';
        var extra = (st==='rejected' && p.reject_reason) ? (' · '+esc(p.reject_reason)) : (p.reason?(' · '+esc(p.reason)):'');
        return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px dashed var(--blue-100);font-size:13.5px">'+
          '<div>Refund request · −'+money(p.amount)+' '+badge+extra+'</div>'+
          '<div style="white-space:nowrap;color:var(--muted)">'+esc(new Date(p.created_at).toLocaleDateString())+'</div>'+
        '</div>';
      }
      var amt=(p.kind==='refund'?'−':'')+money(p.amount);
      var proof=p.proof_path?(' · <a href="#" class="cp-proof" data-path="'+esc(p.proof_path)+'">proof</a>'):'';
      return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-top:1px dashed var(--blue-100);font-size:13.5px">'+
        '<div><b>'+esc(receiptNo(p))+'</b> · '+amt+' · '+esc(p.method||'')+proof+'</div>'+
        '<div style="white-space:nowrap;color:var(--muted)">'+esc(new Date(p.received_at||p.created_at).toLocaleDateString())+' · <a href="#" class="cp-receipt" data-id="'+esc(p.id)+'">Receipt</a></div>'+
      '</div>';
    }).join('') : '<div class="phint" style="margin:4px 0">No payments recorded yet.</div>';
    function form(kind){ return '<div class="cp-form" data-kind="'+kind+'" style="display:none;margin-top:8px;padding:10px;border:1px dashed var(--blue-100);border-radius:10px;background:#fff">'+
      '<div class="grid2"><div class="field"><label class="ulabel">Amount (₹)</label><input data-cp="amount" type="number" min="0"></div>'+
      '<div class="field"><label class="ulabel">Method</label><select data-cp="method"><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div></div>'+
      '<div class="grid2"><div class="field"><label class="ulabel">Reference (optional)</label><input data-cp="reference" type="text"></div>'+
      '<div class="field"><label class="ulabel">Proof (optional)</label><input data-cp="proof" type="file" accept="image/*,application/pdf"></div></div>'+
      (kind==='refund'?'<div class="field"><label class="ulabel">Reason</label><input data-cp="reason" type="text" placeholder="why this refund"></div>':'')+
      '<div class="field"><label class="ulabel">Remarks (optional)</label><input data-cp="remarks" type="text"></div>'+
      '<div style="display:flex;gap:10px;align-items:center"><button class="btn btn-primary" data-cp="save">Save '+(kind==='refund'?'refund':'payment')+'</button><button class="link-btn" data-cp="cancel">Cancel</button></div>'+
    '</div>'; }
    var unbilled = (total<=0 && net>0); // money received but billing not set yet
    var pill = unbilled ? '<span class="status-pill sp-progress" style="font-size:11px">Advance</span>' : payStatusPill(f.customer_payment_status);
    var summary = unbilled
      ? ('Advance received '+money(net)+' · enter the billing above to apply it')
      : ('Paid '+money(net)+' of '+money(total)+' · Balance '+money(balance));
    return '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--blue-100)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">'+
        '<div style="font-weight:700">Customer payments '+pill+'</div>'+
        '<div class="phint" style="margin:0">'+summary+'</div>'+
      '</div>'+
      '<div style="margin-top:6px">'+rows+'</div>'+
      '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost" data-cp="addpay">+ Record payment</button><button class="btn btn-ghost" data-cp="addref">Record refund</button></div>'+
      form('payment')+form('refund')+
    '</div>';
  }

  // Branded, numbered, printable receipt (new window → Save as PDF).
  function openReceipt(p, a){
    var f=finOf(a)||{};
    var brand=(finBrand&&finBrand.brand_name)||'Visa Doo';
    var color=(finBrand&&finBrand.brand_color)||'#2563eb';
    var gstin=(finSettings&&finSettings.gstin)||'';
    var home=(finSettings&&finSettings.home_state)||'';
    var visaName=visaById(a.visa_type)?visaById(a.visa_type).name:(a.visa_type||'');
    var gst=Number(f.gst_amount||0);
    var intra = home && a.state && home.toLowerCase()===String(a.state).toLowerCase();
    var gstLines='';
    if(gst>0){ gstLines = intra
      ? '<tr><td>CGST</td><td style="text-align:right">'+money(gst/2)+'</td></tr><tr><td>SGST</td><td style="text-align:right">'+money(gst/2)+'</td></tr>'
      : '<tr><td>IGST</td><td style="text-align:right">'+money(gst)+'</td></tr>'; }
    var net=cpNetPaid(a), total=Number(f.customer_total||0), bal=total-net;
    var rowIf=function(label,val){ return Number(val||0)?('<tr><td>'+label+'</td><td style="text-align:right">'+money(val)+'</td></tr>'):''; };
    var html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(receiptNo(p))+'</title><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:640px;margin:24px auto;padding:0 16px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:6px 0;border-bottom:1px solid #eef2f7}.tot td{font-weight:800;border-top:2px solid #0f172a;border-bottom:none}.hd{padding:18px 20px;border-radius:12px 12px 0 0;color:#fff}.bx{border:1px solid #e7ecf3;border-top:none;border-radius:0 0 12px 12px;padding:20px}.muted{color:#64748b;font-size:13px}@media print{.noprint{display:none}}</style></head><body>'+
      '<div class="hd" style="background:'+esc(color)+'"><div style="font-size:22px;font-weight:800">'+esc(brand)+'</div>'+(gstin?'<div style="font-size:12px;opacity:.9">GSTIN: '+esc(gstin)+'</div>':'')+'</div>'+
      '<div class="bx">'+
        '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><div><h1>'+(p.kind==='refund'?'Refund Receipt':'Receipt')+'</h1><div class="muted">'+esc(receiptNo(p))+'</div></div>'+
          '<div class="muted" style="text-align:right">'+esc(new Date(p.received_at||p.created_at).toLocaleString())+'</div></div>'+
        '<table><tr><td class="muted">Customer</td><td style="text-align:right">'+esc(a.full_name||'')+'</td></tr>'+
          '<tr><td class="muted">Application</td><td style="text-align:right">'+esc(a.reference_code||'')+' · '+esc(visaName)+'</td></tr></table>'+
        '<table>'+rowIf('Visa service charges',f.selling_price)+gstLines+
          '<tr class="tot"><td>Total</td><td style="text-align:right">'+money(total)+'</td></tr></table>'+
        '<table><tr><td class="muted">'+(p.kind==='refund'?'Refunded now':'Paid now')+' ('+esc(p.method||'')+')</td><td style="text-align:right;font-weight:700">'+(p.kind==='refund'?'−':'')+money(p.amount)+'</td></tr>'+
          '<tr><td class="muted">Total received to date</td><td style="text-align:right">'+money(net)+'</td></tr>'+
          '<tr><td class="muted">Balance</td><td style="text-align:right">'+money(bal)+'</td></tr></table>'+
        (p.reference?'<div class="muted">Ref: '+esc(p.reference)+'</div>':'')+
        '<p class="muted" style="margin-top:18px">Thank you. This is a computer-generated receipt from '+esc(brand)+'.</p>'+
        '<button class="noprint" onclick="window.print()" style="margin-top:10px;padding:10px 18px;border:none;background:'+esc(color)+';color:#fff;border-radius:8px;font-weight:700;cursor:pointer">Print / Save PDF</button>'+
      '</div></body></html>';
    var w=window.open('','_blank'); if(!w){ toast('Please allow pop-ups to view the receipt.'); return; }
    w.document.write(html); w.document.close();
  }

  function wireAdminCard(a){
    var card=root.querySelector('.admin-app[data-id="'+a.id+'"]');
    if(!card) return;
    var docs=(a.documents||[]);
    var hasVisa=docs.some(function(d){ return d.doc_type==='visa'; });
    var visaFile=null;

    // open documents via signed URLs
    card.querySelectorAll('.doc-links a[data-path]').forEach(function(link){
      link.onclick=function(e){
        e.preventDefault();
        var path=link.getAttribute('data-path');
        var label=docLabel(link.getAttribute('data-doc'));
        link.textContent='Opening…';
        sb.storage.from('visa-documents').createSignedUrl(path,3600).then(function(s){
          link.textContent='View '+label;
          if(s.error||!s.data){ toast('Could not open that document.'); return; }
          window.open(s.data.signedUrl,'_blank','noopener');
        });
      };
    });

    // answer-file links (uploaded as answers to custom questions)
    card.querySelectorAll('.ans-file[data-path]').forEach(function(link){
      link.onclick=function(e){
        e.preventDefault();
        var path=link.getAttribute('data-path'); var orig=link.textContent;
        link.textContent='Opening…';
        sb.storage.from('visa-documents').createSignedUrl(path,3600).then(function(s){
          link.textContent=orig;
          if(s.error||!s.data){ toast('Could not open that file.'); return; }
          window.open(s.data.signedUrl,'_blank','noopener');
        });
      };
    });

    wireThreadFiles(card);

    // Finance panel (admin/finance) — wired before the processing-controls gate.
    if(isFinance()){
      var fget=function(k){ var el=card.querySelector('[data-fin="'+k+'"]'); return el?el.value:''; };
      var readLines=function(){ return [].map.call(card.querySelectorAll('.cl-row'), function(row){
        return { category:((row.querySelector('.cl-cat')||{}).value)||'Visa processing',
                 supplier_id:((row.querySelector('.cl-sup')||{}).value)||null,
                 cost:Number((row.querySelector('.cl-cost')||{}).value)||0,
                 invoice_no:(((row.querySelector('.cl-inv')||{}).value)||'').trim()||null }; }); };
      var recalc=function(){
        var c=computeFin(readLines(), fget('margintype'), fget('marginval'), fget('gstmode'), fget('gstrate'));
        var el=card.querySelector('[data-fin="calc"]');
        if(el) el.innerHTML='Total cost: <b>'+money(c.totalCost)+'</b> · Margin: <b>'+money(c.marginAmt)+'</b> · Selling: <b>'+money(c.selling)+'</b> · GST: '+money(c.gst)+' · Customer total: <b>'+money(c.total)+'</b>';
      };
      var clwrap=card.querySelector('[data-fin="clwrap"]');
      var isFinEl=function(t){ return t&&t.closest&&(t.closest('[data-fin="clwrap"]') || (t.getAttribute && ['margintype','marginval','gstmode','gstrate'].indexOf(t.getAttribute('data-fin'))>-1)); };
      card.addEventListener('input', function(e){ if(isFinEl(e.target)) recalc(); });
      card.addEventListener('change', function(e){ if(isFinEl(e.target)) recalc(); });
      if(clwrap) clwrap.addEventListener('click', function(e){ var del=e.target.closest('.cl-del'); if(del){ var row=del.closest('.cl-row'); if(row){ row.remove(); recalc(); } } });
      var addBtn=card.querySelector('[data-fin="addline"]'); if(addBtn) addBtn.onclick=function(){ if(clwrap){ clwrap.insertAdjacentHTML('beforeend', clRowHtml({})); } };
      recalc();
      var fsave=card.querySelector('[data-fin="save"]');
      if(fsave) fsave.onclick=function(){
        var lines=readLines().filter(function(l){ return l.cost>0 || l.supplier_id; });
        var mtype=fget('margintype')||'amount', mval=Number(fget('marginval'))||0;
        var c=computeFin(lines, mtype, mval, fget('gstmode'), fget('gstrate'));
        var status=cpStatus(a, c.total);
        var existed=!!finOf(a);
        fsave.disabled=true; fsave.innerHTML='<span class="spin"></span>';
        sb.from('application_cost_lines').delete().eq('application_id', a.id).then(function(d){
          if(d.error) throw d.error;
          if(!lines.length) return { error:null };
          return sb.from('application_cost_lines').insert(lines.map(function(l){ return { application_id:a.id, category:l.category, supplier_id:l.supplier_id, cost:l.cost, invoice_no:l.invoice_no||null }; }));
        }).then(function(ins){
          if(ins&&ins.error) throw ins.error;
          return sb.from('application_finance').upsert({ application_id:a.id, currency:'INR',
            total_cost:c.totalCost, margin_type:mtype, margin_value:mval, margin:c.marginAmt,
            gst_mode:fget('gstmode')||'margin', gst_rate:Number(fget('gstrate'))||0, gst_amount:c.gst,
            selling_price:c.selling, customer_total:c.total, customer_payment_status:status,
            updated_at:new Date().toISOString() }, {onConflict:'application_id'});
        }).then(function(r){
          fsave.disabled=false; fsave.innerHTML='Save finance';
          if(r&&r.error) throw r.error;
          logFinance('application_finance', a.id, existed?'update':'create', 'Finance saved — selling '+money(c.selling)+', GST '+money(c.gst)+', total '+money(c.total)+', cost '+money(c.totalCost)+', margin '+money(c.marginAmt));
          toast('Finance saved'); afterAppSave(a.id);
        }).catch(function(err){ fsave.disabled=false; fsave.innerHTML='Save finance'; toast('Could not save finance.'); console.error(err); });
      };

      // payments: record payment/refund, receipts, proof links
      var cpf=function(kind){ return card.querySelector('.cp-form[data-kind="'+kind+'"]'); };
      var ap=card.querySelector('[data-cp="addpay"]'); if(ap) ap.onclick=function(){ var fm=cpf('payment'); fm.style.display=fm.style.display==='none'?'block':'none'; };
      var ar=card.querySelector('[data-cp="addref"]'); if(ar) ar.onclick=function(){ var fm=cpf('refund'); fm.style.display=fm.style.display==='none'?'block':'none'; };
      ['payment','refund'].forEach(function(kind){
        var form=cpf(kind); if(!form) return;
        form.querySelector('[data-cp="cancel"]').onclick=function(){ form.style.display='none'; };
        form.querySelector('[data-cp="save"]').onclick=function(){
          var amt=Number(form.querySelector('[data-cp="amount"]').value);
          if(!(amt>0)){ toast('Enter a valid amount.'); return; }
          var sbtn=form.querySelector('[data-cp="save"]'); sbtn.disabled=true; sbtn.innerHTML='<span class="spin"></span>';
          var fileEl=form.querySelector('[data-cp="proof"]'); var file=fileEl&&fileEl.files[0];
          var ins=function(proofPath){
            var row={ application_id:a.id, kind:kind, amount:amt,
              method:form.querySelector('[data-cp="method"]').value,
              reference:(form.querySelector('[data-cp="reference"]').value||'').trim()||null,
              remarks:(form.querySelector('[data-cp="remarks"]').value||'').trim()||null,
              proof_path:proofPath||null, received_by:(state.user&&state.user.id)||null };
            if(kind==='refund'){ var rs=form.querySelector('[data-cp="reason"]'); row.reason=((rs&&rs.value)||'').trim()||null; row.status='approved'; row.approved_by=(state.user&&state.user.id)||null; row.approved_at=new Date().toISOString(); }
            return sb.from('customer_payments').insert(row);
          };
          var up=Promise.resolve(null);
          if(file){ if(file.size>10485760){ toast('Proof file is over 10 MB.'); sbtn.disabled=false; sbtn.innerHTML='Save '+kind; return; }
            var ext=(file.name.split('.').pop()||'dat').toLowerCase(); var path='finance/'+a.id+'/pay_'+Date.now()+'.'+ext;
            up=sb.storage.from('finance-files').upload(path,file,{upsert:false}).then(function(u){ if(u.error) throw u.error; return path; });
          }
          up.then(ins).then(function(r){ if(r.error) throw r.error; logFinance('customer_payment', a.id, kind, (kind==='refund'?'Refund ':'Payment ')+money(amt)); toast('Saved'); afterAppSave(a.id); })
            .catch(function(err){ sbtn.disabled=false; sbtn.innerHTML='Save '+kind; toast('Could not save. Please try again.'); console.error(err); });
        };
      });
      card.querySelectorAll('.cp-receipt').forEach(function(l){ l.onclick=function(e){ e.preventDefault(); var p=cpListOf(a).filter(function(x){return x.id===l.getAttribute('data-id');})[0]; if(p) openReceipt(p,a); }; });
      card.querySelectorAll('.cp-proof').forEach(function(l){ l.onclick=function(e){ e.preventDefault(); var path=l.getAttribute('data-path'), o=l.textContent; l.textContent='…'; sb.storage.from('finance-files').createSignedUrl(path,3600).then(function(s){ l.textContent=o; if(s.error||!s.data){ toast('Could not open proof.'); return; } window.open(s.data.signedUrl,'_blank','noopener'); }); }; });
    }

    // Refund request (Operations/Sales) — raises a pending request for finance.
    if(hasRole(['agent','sales'])){
      var rfForm=card.querySelector('.rfreq-form');
      var rfOpen=card.querySelector('[data-rfreq="open"]');
      if(rfOpen&&rfForm){
        rfOpen.onclick=function(){ rfForm.style.display=rfForm.style.display==='none'?'block':'none'; };
        rfForm.querySelector('[data-rfreq="cancel"]').onclick=function(){ rfForm.style.display='none'; };
        rfForm.querySelector('[data-rfreq="save"]').onclick=function(){
          var amt=Number(rfForm.querySelector('[data-rfreq="amount"]').value);
          var reason=(rfForm.querySelector('[data-rfreq="reason"]').value||'').trim();
          if(!(amt>0)){ toast('Enter a valid amount.'); return; }
          if(!reason){ toast('Please add a reason.'); return; }
          var b=rfForm.querySelector('[data-rfreq="save"]'); b.disabled=true; b.innerHTML='<span class="spin"></span>';
          sb.from('customer_payments').insert({ application_id:a.id, kind:'refund', amount:amt, status:'pending', reason:reason, requested_by:(state.user&&state.user.id)||null }).then(function(r){
            b.disabled=false; b.innerHTML='Send request to finance';
            if(r.error){ toast('Could not send request.'); console.error(r.error); return; }
            logFinance('customer_payment', a.id, 'refund-request', 'Refund request '+money(amt)+' — '+reason);
            toast('Refund request sent to finance'); afterAppSave(a.id);
          });
        };
      }
    }

    if(!canProcessApps()) return; // viewers: read-only, no editing controls present

    // pick visa file
    var visaInput=card.querySelector('[data-role="visaFile"]');
    card.querySelector('[data-role="visaPick"]').onclick=function(){ visaInput.click(); };
    visaInput.onchange=function(){
      var f=visaInput.files[0]; if(!f) return;
      if(f.size>10485760){ toast('That file is over 10 MB. Please choose a smaller one.'); visaInput.value=''; return; }
      visaFile=f;
      card.querySelector('[data-role="visaName"]').textContent='✓ '+f.name;
    };

    // save status (+ optional visa upload) + note
    var saveBtn=card.querySelector('[data-role="save"]');
    var prevStatus=a.status;
    saveBtn.onclick=function(){
      var status=card.querySelector('[data-role="status"]').value;
      var note=card.querySelector('[data-role="note"]').value.trim();
      var reqDocs=((card.querySelector('[data-role="reqdocs"]')||{}).value||'').split('\n').map(function(s){return s.trim();}).filter(Boolean);
      if(status==='Visa Issued' && !hasVisa && !visaFile){
        toast('Please attach the visa document before marking this as Visa Issued.');
        return;
      }
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span>';

      var step = Promise.resolve();
      if(visaFile){
        var ext=(visaFile.name.split('.').pop()||'pdf').toLowerCase();
        var path=(a.user_id||'walkin')+'/'+a.id+'/visa_'+Date.now()+'.'+ext;
        step = sb.storage.from('visa-documents').upload(path,visaFile,{ upsert:false }).then(function(up){
          if(up.error) throw up.error;
          return sb.from('documents').insert({ application_id:a.id, user_id:a.user_id, doc_type:'visa', file_path:path, file_name:visaFile.name });
        }).then(function(di){ if(di.error) throw di.error; });
      }

      step.then(function(){
        return sb.from('applications').update({ status:status, notes: note||null, unread_reply:false }).eq('id',a.id);
      }).then(function(u){
        if(u.error) throw u.error;
        // Record an "Action Needed" request in the conversation thread (deduped vs the last staff message).
        var ls=lastStaffMsg(a);
        var dup = ls && (ls.body||'')===note && JSON.stringify(ls.requested_docs||[])===JSON.stringify(reqDocs);
        if(status==='Action Needed' && (note || reqDocs.length) && !dup){
          return sb.from('app_messages').insert({ application_id:a.id, customer_id:a.customer_id||null, author:'staff', author_id:state.user.id, body:note||null, requested_docs:reqDocs }).then(function(im){ if(im.error) throw im.error; });
        }
      }).then(function(){
        saveBtn.disabled=false; saveBtn.innerHTML='Save';
        toast('Updated '+a.full_name.split(' ')[0]+'’s application to “'+status+'”');
        if(status!==prevStatus){ notifyStatusChange(a.id, status, a.full_name); logAudit({ module:'Applications', action:'status_change', record_type:'application', record_id:a.id, record_ref:(a.reference_code||a.full_name||''), field:'status', old_value:prevStatus, new_value:status, remarks:(note||null), risk:(status==='Visa Issued'?'high':'sensitive') }); }
        afterAppSave(a.id);
      }).catch(function(err){
        saveBtn.disabled=false; saveBtn.innerHTML='Save';
        if(err && (''+err.message).indexOf('VISA_DOC_REQUIRED')>-1){
          toast('Please attach the visa document before marking this as Visa Issued.');
        } else {
          toast('Could not save. Please try again.');
        }
        console.error(err);
      });
    };
  }

  // Open one application on its own full detail page (compact list → detail).
  function openApp(id){ appViewId=id; state.view='appview'; location.hash='appview/'+encodeURIComponent(id); renderHeader(); render(); }
  // After a save, stay on the detail page if that's where we are; else refresh the list.
  function afterAppSave(id){ if(state.view==='appview' && appViewId===id) renderAppDetail(id); else renderAdmin(); }

  function renderAppDetail(id){
    if(!canViewApps()){ go(defaultStaffView()); return; }
    if(!id){ go('admin'); return; }
    appEditing=false; appTab='detail';
    if(!countryList.length) loadCountriesGroups();
    root.innerHTML='<div class="app-main">'+adminSections('admin')+
      '<button class="link-btn" id="appBack" style="margin-bottom:10px">← Back to applications</button>'+
      '<div id="appDetail"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('appBack').onclick=function(){ go('admin'); };
    var R=function(d){ return Promise.resolve({data:d}); };
    Promise.all([
      sb.from('applications').select('*, documents(*), app_messages(*), application_finance(*), customer_payments(*), application_cost_lines(*)').eq('id',id).single(),
      isFinance() ? sb.from('suppliers').select('id,name').eq('active',true).order('name') : R([]),
      isFinance() ? sb.from('finance_settings').select('*').eq('id','global').single() : R(null),
      isFinance() ? sb.from('site_settings').select('brand_name,brand_color,logo_url,contact_email,contact_phone,contact_whatsapp').eq('id','global').single() : R(null),
      (state.role==='admin') ? sb.from('application_edits').select('*').eq('application_id',id).order('edited_at',{ascending:false}).limit(300) : R([])
    ]).then(function(res){
      var box=document.getElementById('appDetail'); if(!box) return;
      if(res[0].error||!res[0].data){ box.innerHTML='<div class="panel empty-state"><p>Could not load this application.</p></div>'; console.error(res[0].error); return; }
      var a=res[0].data;
      if(res[1].data) finSuppliers=res[1].data;
      if(res[2].data) finSettings=res[2].data;
      if(res[3].data) finBrand=res[3].data;
      appEdits=res[4].data||[];
      paintAppDetail(a);
    });
  }

  // Editable applicant fields (extensible). Status stays in its own notifying control.
  var APP_FIELDS=[
    ['full_name','Full name','text'],
    ['phone','Mobile number','tel'],
    ['email','Email','email'],
    ['passport_number','Passport number','text'],
    ['date_of_birth','Date of birth','date'],
    ['passport_expiry','Passport expiry','date'],
    ['nationality','Nationality','text'],
    ['passport_issuing_country','Passport issuing country','text'],
    ['state','State','text'],
    ['visa_type','Visa type','visa'],
    ['notes','Internal notes','textarea']
  ];
  function appFieldLabel(k){ for(var i=0;i<APP_FIELDS.length;i++){ if(APP_FIELDS[i][0]===k) return APP_FIELDS[i][1]; } return k; }
  function appFieldDisplay(k,v){ if(v==null||v==='') return ''; if(k==='visa_type'){ var vv=visaById(v); return vv?vv.name:v; } return String(v); }

  function paintAppDetail(a){
    var box=document.getElementById('appDetail'); if(!box) return;
    var admin=(state.role==='admin');
    var bar = admin ? ('<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px">'+
        '<div class="subnav" style="margin:0">'+
          '<button data-atab="detail" class="'+((appTab==='detail'&&!appEditing)?'active':'')+'">Details</button>'+
          '<button data-atab="history" class="'+((appTab==='history'&&!appEditing)?'active':'')+'">Edit history ('+appEdits.length+')</button>'+
        '</div>'+
        ((appTab==='detail'&&!appEditing)?'<button class="btn btn-ghost" id="appEditBtn">Edit details</button>':'')+
      '</div>') : '';
    function wireTabs(){ box.querySelectorAll('[data-atab]').forEach(function(b){ b.onclick=function(){ appEditing=false; appTab=b.getAttribute('data-atab'); paintAppDetail(a); }; }); }

    if(admin && appEditing){ box.innerHTML=bar+appEditFormHtml(a); wireTabs(); wireAppEdit(a); return; }
    if(admin && appTab==='history'){ box.innerHTML=bar+appHistoryHtml(); wireTabs(); return; }

    box.innerHTML=bar+adminCard(a);
    wireTabs();
    var eb=document.getElementById('appEditBtn'); if(eb) eb.onclick=function(){ appEditing=true; paintAppDetail(a); };
    wireAdminCard(a);
  }

  function appEditFormHtml(a){
    var visaOpts=VISAS.map(function(v){ return '<option value="'+esc(v.id)+'"'+(a.visa_type===v.id?' selected':'')+'>'+esc(v.name)+'</option>'; }).join('');
    return '<div class="panel">'+
      '<h3 style="font-size:17px;font-weight:800;margin-bottom:4px">Edit application</h3>'+
      '<p class="phint" style="margin-top:0">Correct the applicant’s details. Status is changed from the Details tab (it notifies the customer).</p>'+
      '<div class="grid2">'+
        '<div class="field"><label>Full name</label><input id="aef_full_name" type="text" value="'+esc(a.full_name||'')+'"></div>'+
        '<div class="field"><label>Mobile number</label><input id="appfPhone" type="tel" value="'+esc(a.phone||'')+'"></div>'+
        '<div class="field"><label>Email</label><input id="aef_email" type="email" value="'+esc(a.email||'')+'"></div>'+
        '<div class="field"><label>Passport number</label><input id="aef_passport_number" type="text" value="'+esc(a.passport_number||'')+'"></div>'+
        '<div class="field"><label>Date of birth</label><input id="aef_date_of_birth" type="date" value="'+esc(a.date_of_birth||'')+'"></div>'+
        '<div class="field"><label>Passport expiry</label><input id="aef_passport_expiry" type="date" value="'+esc(a.passport_expiry||'')+'"></div>'+
        '<div class="field"><label>Nationality</label><input id="aef_nationality" type="text" value="'+esc(a.nationality||'')+'"></div>'+
        '<div class="field"><label>Passport issuing country</label><input id="aef_passport_issuing_country" type="text" value="'+esc(a.passport_issuing_country||'')+'"></div>'+
        '<div class="field"><label>State</label><input id="aef_state" type="text" value="'+esc(a.state||'')+'"></div>'+
        '<div class="field"><label>Visa type</label><select id="aef_visa_type">'+visaOpts+'</select></div>'+
      '</div>'+
      '<div class="field"><label>Internal notes</label><textarea id="aef_notes" style="min-height:70px">'+esc(a.notes||'')+'</textarea></div>'+
      '<div class="signin-msg" id="aefMsg"></div>'+
      '<div style="display:flex;gap:10px;margin-top:10px"><button class="btn btn-primary" id="aefSave">Save changes</button><button class="btn btn-ghost" id="aefCancel">Cancel</button></div>'+
    '</div>';
  }

  function wireAppEdit(a){
    appIti=null;
    var pin=document.getElementById('appfPhone');
    if(pin && window.intlTelInput){
      appIti=window.intlTelInput(pin,{ initialCountry:'in', separateDialCode:true,
        preferredCountries:['in','ae','sa','qa','kw','om','bh','us','gb'],
        utilsScript:'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js' });
    }
    document.getElementById('aefCancel').onclick=function(){ appEditing=false; renderAppDetail(a.id); };
    document.getElementById('aefSave').onclick=function(){
      var msg=document.getElementById('aefMsg');
      function err(t){ msg.className='signin-msg err'; msg.style.display='block'; msg.textContent=t; }
      var phoneRaw=(pin.value||'').trim();
      var email=document.getElementById('aef_email').value.trim();
      if(email && !/.+@.+\..+/.test(email)) return err('Please enter a valid email address, or clear it.');
      if(phoneRaw && appIti && window.intlTelInputUtils && !appIti.isValidNumber()) return err('Please enter a valid mobile number, or clear the box.');
      var newVals={
        full_name: document.getElementById('aef_full_name').value.trim()||null,
        phone: phoneRaw ? ((appIti && appIti.getNumber())||phoneRaw) : null,
        email: email||null,
        passport_number: document.getElementById('aef_passport_number').value.trim()||null,
        date_of_birth: document.getElementById('aef_date_of_birth').value||null,
        passport_expiry: document.getElementById('aef_passport_expiry').value||null,
        nationality: document.getElementById('aef_nationality').value.trim()||null,
        passport_issuing_country: document.getElementById('aef_passport_issuing_country').value.trim()||null,
        state: document.getElementById('aef_state').value.trim()||null,
        visa_type: document.getElementById('aef_visa_type').value||a.visa_type,
        notes: document.getElementById('aef_notes').value.trim()||null
      };
      var fields=['full_name','phone','email','passport_number','date_of_birth','passport_expiry','nationality','passport_issuing_country','state','visa_type','notes'];
      var changes=[];
      fields.forEach(function(f){ var ov=(a[f]==null?'':String(a[f])), nv=(newVals[f]==null?'':String(newVals[f])); if(ov!==nv) changes.push({ field:f, old_value:(a[f]==null?null:String(a[f])), new_value:(newVals[f]==null?null:String(newVals[f])) }); });
      var btn=document.getElementById('aefSave'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
      function fin(){ btn.disabled=false; btn.innerHTML='Save changes'; }
      if(!changes.length){ fin(); appEditing=false; toast('No changes'); renderAppDetail(a.id); return; }
      sb.from('applications').update(Object.assign({}, newVals, { updated_at:new Date().toISOString() })).eq('id',a.id).then(function(r){
        if(r.error){ fin(); err('Could not save. Please try again.'); console.error(r.error); return; }
        var uid=(state.user&&state.user.id)||null, uem=(state.user&&state.user.email)||null, now=new Date().toISOString();
        var rows=changes.map(function(ch){ return { application_id:a.id, field:ch.field, old_value:ch.old_value, new_value:ch.new_value, edited_by:uid, edited_by_email:uem, edited_at:now }; });
        sb.from('application_edits').insert(rows).then(function(){ appEditing=false; toast('Application updated'); renderAppDetail(a.id); });
      });
    };
  }

  function appHistoryHtml(){
    if(!appEdits.length) return '<div class="panel empty-state"><p>No edits recorded yet. Changes you make with “Edit details” will be logged here.</p></div>';
    return '<div>'+appEdits.map(function(e){
      var when=new Date(e.edited_at).toLocaleString();
      var ov=appFieldDisplay(e.field,e.old_value), nv=appFieldDisplay(e.field,e.new_value);
      ov=ov?esc(ov):'<i style="color:var(--muted)">(empty)</i>'; nv=nv?esc(nv):'<i style="color:var(--muted)">(empty)</i>';
      return '<div class="admin-app"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h4 style="font-size:15px">'+esc(appFieldLabel(e.field))+'</h4>'+
        '<div class="meta">'+ov+' → '+nv+'</div></div>'+
        '<div style="text-align:right;white-space:nowrap"><div class="phint" style="margin:0">'+esc(e.edited_by_email||'staff')+'</div><div class="phint" style="margin:2px 0 0">'+esc(when)+'</div></div>'+
      '</div></div>';
    }).join('')+'</div>';
  }

  // ============================================================
  //  ADMIN · VISA TYPES MANAGER
  // ============================================================
  var vtList = [];
  var vtEditing = null; // null=list view, object=editing/new
  var vtSeoEditing = null; // object=editing SEO for a visa type
  var vtQEditing = null;   // object=editing Questions for a visa type

  function slugify(s){ return (s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  function uniqueSlug(base){
    var existing=vtList.map(function(v){return v.slug;});
    var s=base||'visa', i=2;
    while(existing.indexOf(s)>-1){ s=(base||'visa')+'-'+i; i++; }
    return s;
  }

  var vtCountryFilter='all';
  function renderVisaTypesAdmin(){
    if(!canManageContent()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">' + adminSections('visatypes') +
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap">'+
        '<div><h1>Visa Types</h1><p>Add, edit, reorder or remove the visa options. Each visa belongs to a destination country.</p></div>'+
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><select id="vtFilter" style="padding:11px 14px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-weight:600;font-size:14px;background:#fff"></select><button class="btn btn-primary" id="vtAdd">+ Add visa type</button></div>'+
      '</div>'+
      '<div id="vtArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('vtAdd').onclick=function(){
      vtEditing={ id:null, name:'', sub:'Single Entry', price_aed:'', days:'', blurb:'', features:[], popular:false, active:true, sort_order:(vtList.length+1)*1,
        country_slug:(vtCountryFilter!=='all'?vtCountryFilter:''), category:'Tourist' };
      paintVt();
    };
    Promise.all([ sb.from('visa_types').select('*').order('sort_order'), loadCountriesGroups() ]).then(function(res){
      vtList=res[0].data||[]; vtEditing=null;
      var sel=document.getElementById('vtFilter');
      if(sel){ sel.innerHTML='<option value="all">All countries</option>'+countryList.map(function(c){ return '<option value="'+esc(c.slug)+'"'+(c.slug===vtCountryFilter?' selected':'')+'>'+esc(c.name)+'</option>'; }).join('');
        sel.onchange=function(){ vtCountryFilter=sel.value; paintVt(); }; }
      paintVt();
    });
  }

  function paintVt(){
    var area=document.getElementById('vtArea'); if(!area) return;
    if(vtQEditing){ renderQuestionsManager(); return; }
    if(vtSeoEditing){ area.innerHTML=seoEditorHtml(vtSeoEditing); wireSeoEditor(); return; }
    if(vtEditing){ area.innerHTML=vtFormHtml(vtEditing); wireVtForm(); return; }
    var shown = vtCountryFilter==='all' ? vtList : vtList.filter(function(v){return v.country_slug===vtCountryFilter;});
    if(!shown.length){ area.innerHTML='<div class="panel empty-state"><p>'+(vtList.length?'No visa types for this country yet.':'No visa types yet. Click “Add visa type” to create your first one.')+'</p></div>'; return; }
    area.innerHTML=shown.map(vtRow).join('');
    area.querySelectorAll('[data-q]').forEach(function(b){ b.onclick=function(){ var v=vtList.filter(function(x){return x.id===b.getAttribute('data-q');})[0]; vtQEditing=v; paintVt(); }; });
    area.querySelectorAll('[data-seo]').forEach(function(b){ b.onclick=function(){ var v=vtList.filter(function(x){return x.id===b.getAttribute('data-seo');})[0]; vtSeoEditing=JSON.parse(JSON.stringify(v)); paintVt(); }; });
    area.querySelectorAll('[data-edit]').forEach(function(b){ b.onclick=function(){ var v=vtList.filter(function(x){return x.id===b.getAttribute('data-edit');})[0]; vtEditing=JSON.parse(JSON.stringify(v)); paintVt(); }; });
    area.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=function(){ vtDelete(b.getAttribute('data-del')); }; });
  }

  function vtRow(v){
    return '<div class="admin-app">'+
      '<div class="arow">'+
        '<div><h4>'+esc(v.name)+' '+
          (v.popular?'<span class="status-pill sp-progress" style="font-size:11px">Most popular</span> ':'')+
          (v.active?'':'<span class="status-pill sp-action" style="font-size:11px">Hidden</span>')+
        '</h4>'+
        '<div class="meta">'+esc(countryName(v.country_slug))+(v.category?(' · '+esc(v.category)):'')+' · '+visaPriceText(v)+(v.sub?(' · '+esc(v.sub)):'')+'</div>'+
        '<div class="meta" style="opacity:.7">Web address: /visa/'+esc(v.slug)+'</div></div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'+
          '<button class="btn btn-ghost" data-q="'+esc(v.id)+'">Questions</button>'+
          '<button class="btn btn-ghost" data-seo="'+esc(v.id)+'">SEO</button>'+
          '<button class="btn btn-ghost" data-edit="'+esc(v.id)+'">Edit</button>'+
          '<button class="btn btn-ghost" data-del="'+esc(v.id)+'" style="color:var(--red)">Delete</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  function vtFormHtml(v){
    return '<div class="panel">'+
      '<h3>'+(v.id?'Edit visa type':'New visa type')+'</h3>'+
      '<p class="phint">These details show on the homepage, the application form, and the visa\'s own page.</p>'+
      '<div class="grid2">'+
        '<div class="field"><label>Destination country <span class="req-star">*</span></label><select id="vtCountry" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px"><option value="">— Choose a country —</option>'+
          countryList.map(function(c){ return '<option value="'+esc(c.slug)+'"'+(c.slug===v.country_slug?' selected':'')+'>'+esc(c.name)+'</option>'; }).join('')+'</select></div>'+
        '<div class="field"><label>Category</label><input id="vtCategory" list="vtCatList" type="text" value="'+esc(v.category||'')+'" placeholder="Tourist, Business, eVisa…"><datalist id="vtCatList"><option>Tourist</option><option>Business</option><option>eVisa</option><option>Transit</option><option>Student</option></datalist></div>'+
        '<div class="field"><label>Name <span class="req-star">*</span></label><input id="vtName" type="text" value="'+esc(v.name)+'" placeholder="e.g. 90-Day Tourist Visa"></div>'+
        '<div class="field"><label>Entry type</label><input id="vtSub" type="text" value="'+esc(v.sub||'')+'" placeholder="e.g. Single Entry"></div>'+
        '<div class="field"><label>Length of stay (days)</label><input id="vtDays" type="number" min="0" value="'+esc(v.days)+'" placeholder="e.g. 90"></div>'+
        '<div class="field"><label>Expected processing time</label>'+
          '<div style="display:flex;gap:8px">'+
            '<input id="vtEtaVal" type="number" min="0" value="'+esc(v.processing_time_value!=null?v.processing_time_value:'')+'" placeholder="e.g. 5" style="flex:1">'+
            '<select id="vtEtaUnit" style="width:110px;padding:13px 10px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px"><option value="days"'+((v.processing_time_unit||'days')==='days'?' selected':'')+'>Days</option><option value="hours"'+(v.processing_time_unit==='hours'?' selected':'')+'>Hours</option></select>'+
          '</div>'+
          '<div class="phint" style="margin-top:6px">Shown to customers as an estimate (not a guarantee). Leave blank to hide.</div></div>'+
      '</div>'+
      (function(){ var cur=(v.prices&&v.prices.INR!=null&&v.prices.INR!=='')?v.prices.INR:((v.price_aed!=null&&v.price_aed>0)?v.price_aed:'');
        return '<div class="field"><label>Price (₹)</label>'+
        '<input id="vtPriceINR" type="number" min="0" value="'+esc(cur)+'" placeholder="e.g. 4500">'+
        '<div class="phint" style="margin-top:6px">Enter the price in Indian Rupees (₹). Leave blank to show “Price on request”.</div>'+
      '</div>'; })()+
      '<div class="field"><label>Short description</label><textarea id="vtBlurb" style="min-height:70px" placeholder="One friendly line describing this visa.">'+esc(v.blurb||'')+'</textarea></div>'+
      '<div class="field"><label>Bullet points (one per line)</label><textarea id="vtFeatures" style="min-height:96px" placeholder="Stay up to 90 days&#10;Single entry&#10;Processed in 3–5 working days">'+esc((v.features||[]).join('\n'))+'</textarea></div>'+
      '<div class="grid2">'+
        '<div class="field"><label>Display order</label><input id="vtSort" type="number" value="'+esc(v.sort_order)+'"></div>'+
        '<div class="field"><label>&nbsp;</label>'+
          '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer"><input id="vtPopular" type="checkbox" '+(v.popular?'checked':'')+' style="width:auto"> Mark as “Most popular”</label>'+
          '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer;margin-top:10px"><input id="vtActive" type="checkbox" '+(v.active?'checked':'')+' style="width:auto"> Show on website</label>'+
        '</div>'+
      '</div>'+
      '<div class="signin-msg" id="vtMsg"></div>'+
      '<div style="display:flex;gap:10px;margin-top:8px">'+
        '<button class="btn btn-primary" id="vtSave">'+(v.id?'Save changes':'Create visa type')+'</button>'+
        '<button class="btn btn-ghost" id="vtCancel">Cancel</button>'+
      '</div>'+
    '</div>';
  }

  function wireVtForm(){
    document.getElementById('vtCancel').onclick=function(){ vtEditing=null; paintVt(); };
    var saveBtn=document.getElementById('vtSave');
    saveBtn.onclick=function(){
      var name=document.getElementById('vtName').value.trim();
      var priceRaw=parseInt(document.getElementById('vtPriceINR').value,10);
      var price=(isNaN(priceRaw)||priceRaw<0)?0:priceRaw;   // blank/invalid → 0 (shows "Price on request")
      var pricesObj=price>0?{ INR:price }:{};
      var country=document.getElementById('vtCountry').value;
      var msg=document.getElementById('vtMsg');
      if(!country){ msg.className='signin-msg err'; msg.textContent='Please choose a destination country.'; return; }
      if(!name){ msg.className='signin-msg err'; msg.textContent='Please enter a name.'; return; }
      var feats=document.getElementById('vtFeatures').value.split('\n').map(function(s){return s.trim();}).filter(Boolean);
      var daysV=parseInt(document.getElementById('vtDays').value,10);
      var etaV=parseInt(document.getElementById('vtEtaVal').value,10);
      var payload={
        name:name,
        country_slug:country,
        category:document.getElementById('vtCategory').value.trim()||null,
        sub:document.getElementById('vtSub').value.trim()||null,
        price_aed:price,
        prices:pricesObj,
        days:isNaN(daysV)?null:daysV,
        processing_time_value:isNaN(etaV)?null:etaV,
        processing_time_unit:isNaN(etaV)?null:(document.getElementById('vtEtaUnit').value||'days'),
        blurb:document.getElementById('vtBlurb').value.trim()||null,
        features:feats,
        popular:document.getElementById('vtPopular').checked,
        active:document.getElementById('vtActive').checked,
        sort_order:parseInt(document.getElementById('vtSort').value,10)||0
      };
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span>';
      var op;
      if(vtEditing.id){ op=sb.from('visa_types').update(payload).eq('id',vtEditing.id); }
      else { payload.slug=uniqueSlug(slugify(name)); op=sb.from('visa_types').insert(payload); }
      op.then(function(r){
        saveBtn.disabled=false; saveBtn.innerHTML='Save';
        if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        var wasEdit=!!vtEditing.id;
        logAudit({ module:'Catalogue', action:(wasEdit?'edit':'create'), record_type:'visa_type', record_ref:name, field:'price', new_value:(payload.price_aed!=null?('₹'+payload.price_aed):''), remarks:(wasEdit?'Visa type updated':'Visa type created'), risk:'sensitive' });
        toast(vtEditing.id?'Visa type updated':'Visa type created');
        vtEditing=null;
        loadVisaTypes();
        renderVisaTypesAdmin();
      });
    };
  }

  function vtDelete(id){
    var v=vtList.filter(function(x){return x.id===id;})[0];
    if(!v) return;
    if(!window.confirm('Delete “'+v.name+'”? It will be removed from your website. Existing applications are not affected.')) return;
    sb.from('visa_types').delete().eq('id',id).then(function(r){
      if(r.error){ toast('Could not delete. Please try again.'); console.error(r.error); return; }
      logAudit({ module:'Catalogue', action:'delete', record_type:'visa_type', record_ref:v.name, remarks:'Visa type deleted', risk:'high' });
      toast('Visa type deleted');
      loadVisaTypes();
      renderVisaTypesAdmin();
    });
  }

  // ============================================================
  //  CUSTOM QUESTIONS per visa type
  // ============================================================
  var QTYPES=[['text','Typed answer'],['yesno','Yes / No'],['choice','Choose from options'],['file','Upload a file']];
  function qTypeName(t){ for(var i=0;i<QTYPES.length;i++){ if(QTYPES[i][0]===t) return QTYPES[i][1]; } return t; }
  var qList=[];
  var qFormEditing=null;

  function renderQuestionsManager(){
    var area=document.getElementById('vtArea'); if(!area) return;
    area.innerHTML='<div class="panel">'+
      '<button class="link-btn" id="qBack" style="margin-bottom:8px">← Back to visa types</button>'+
      '<h3>Application questions · '+esc(vtQEditing.name)+'</h3>'+
      '<p class="phint">These extra questions appear on the application form when a customer chooses this visa.</p>'+
      '<div id="qArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    document.getElementById('qBack').onclick=function(){ vtQEditing=null; qFormEditing=null; renderVisaTypesAdmin(); };
    loadQuestions();
  }
  function loadQuestions(){
    sb.from('visa_questions').select('*').eq('visa_slug',vtQEditing.slug).order('sort_order').then(function(r){
      qList=r.data||[]; qFormEditing=null; paintQuestions();
    });
  }
  function paintQuestions(){
    var area=document.getElementById('qArea'); if(!area) return;
    if(qFormEditing){ area.innerHTML=qFormHtml(qFormEditing); wireQForm(); return; }
    var list = qList.length ? qList.map(qRow).join('') : '<div class="empty-state" style="padding:20px 0"><p>No questions yet for this visa.</p></div>';
    area.innerHTML=list+'<button class="btn btn-primary" id="qAdd" style="margin-top:14px">+ Add question</button>';
    document.getElementById('qAdd').onclick=function(){ qFormEditing={id:null,label:'',qtype:'text',options:[],help:'',required:false,sort_order:(qList.length+1)}; paintQuestions(); };
    area.querySelectorAll('[data-qedit]').forEach(function(b){ b.onclick=function(){ qFormEditing=JSON.parse(JSON.stringify(qList.filter(function(x){return x.id===b.getAttribute('data-qedit');})[0])); paintQuestions(); }; });
    area.querySelectorAll('[data-qdel]').forEach(function(b){ b.onclick=function(){ qDelete(b.getAttribute('data-qdel')); }; });
    area.querySelectorAll('[data-qmove]').forEach(function(b){ b.onclick=function(){ qMove(b.getAttribute('data-qmove'), b.getAttribute('data-dir')); }; });
  }
  function qRow(q,i){
    var opts = (q.qtype==='choice' && q.options && q.options.length) ? '<div class="meta" style="opacity:.8">Options: '+esc(q.options.join(', '))+'</div>' : '';
    var idx = qList.indexOf(q);
    return '<div class="admin-app"><div class="arow">'+
      '<div><h4>'+esc(q.label)+(q.required?' <span class="status-pill sp-action" style="font-size:11px">Required</span>':'')+'</h4>'+
        '<div class="meta">'+qTypeName(q.qtype)+(q.help?(' · hint: '+esc(q.help)):'')+'</div>'+opts+'</div>'+
      '<div style="display:flex;gap:6px;align-items:center">'+
        '<button class="btn btn-ghost" data-qmove="'+esc(q.id)+'" data-dir="up" '+(idx===0?'disabled':'')+' style="padding:8px 12px">↑</button>'+
        '<button class="btn btn-ghost" data-qmove="'+esc(q.id)+'" data-dir="down" '+(idx===qList.length-1?'disabled':'')+' style="padding:8px 12px">↓</button>'+
        '<button class="btn btn-ghost" data-qedit="'+esc(q.id)+'">Edit</button>'+
        '<button class="btn btn-ghost" data-qdel="'+esc(q.id)+'" style="color:var(--red)">Delete</button>'+
      '</div></div></div>';
  }
  function qFormHtml(q){
    var typeSel=QTYPES.map(function(t){ return '<option value="'+t[0]+'"'+(t[0]===q.qtype?' selected':'')+'>'+esc(t[1])+'</option>'; }).join('');
    return '<div style="border:1px solid var(--line);border-radius:14px;padding:20px">'+
      '<h4 style="font-size:16px;font-weight:800;margin-bottom:14px">'+(q.id?'Edit question':'New question')+'</h4>'+
      '<div class="field"><label>Question <span class="req-star">*</span></label><input id="qLabel" type="text" value="'+esc(q.label)+'" placeholder="e.g. What is the purpose of your visit?"></div>'+
      '<div class="grid2">'+
        '<div class="field"><label>Answer type</label><select id="qType" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px">'+typeSel+'</select></div>'+
        '<div class="field"><label>&nbsp;</label><label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer;padding-top:10px"><input id="qReq" type="checkbox" '+(q.required?'checked':'')+' style="width:auto"> Applicant must answer this</label></div>'+
      '</div>'+
      '<div class="field" id="qOptionsWrap"><label>Options (one per line)</label><textarea id="qOptions" style="min-height:90px" placeholder="Tourism&#10;Business&#10;Family visit">'+esc((q.options||[]).join('\n'))+'</textarea></div>'+
      '<div class="field"><label>Helper hint (optional)</label><input id="qHelp" type="text" value="'+esc(q.help||'')+'" placeholder="Shown in small text under the question"></div>'+
      '<div class="signin-msg" id="qMsg"></div>'+
      '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="qSave">'+(q.id?'Save question':'Add question')+'</button><button class="btn btn-ghost" id="qCancel">Cancel</button></div>'+
    '</div>';
  }
  function wireQForm(){
    function toggleOptions(){ document.getElementById('qOptionsWrap').style.display = (document.getElementById('qType').value==='choice')?'block':'none'; }
    toggleOptions();
    document.getElementById('qType').onchange=toggleOptions;
    document.getElementById('qCancel').onclick=function(){ qFormEditing=null; paintQuestions(); };
    var saveBtn=document.getElementById('qSave');
    saveBtn.onclick=function(){
      var label=document.getElementById('qLabel').value.trim();
      var qtype=document.getElementById('qType').value;
      var opts=document.getElementById('qOptions').value.split('\n').map(function(s){return s.trim();}).filter(Boolean);
      var msg=document.getElementById('qMsg');
      if(!label){ msg.className='signin-msg err'; msg.textContent='Please enter the question.'; return; }
      if(qtype==='choice' && opts.length<2){ msg.className='signin-msg err'; msg.textContent='Please add at least two options for a “choose from options” question.'; return; }
      var payload={ visa_slug:vtQEditing.slug, label:label, qtype:qtype, options:qtype==='choice'?opts:[], help:document.getElementById('qHelp').value.trim()||null, required:document.getElementById('qReq').checked, sort_order:qFormEditing.sort_order||(qList.length+1) };
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span>';
      var op = qFormEditing.id ? sb.from('visa_questions').update(payload).eq('id',qFormEditing.id) : sb.from('visa_questions').insert(payload);
      op.then(function(r){
        saveBtn.disabled=false; saveBtn.innerHTML='Save';
        if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        toast('Question saved'); loadQuestions();
      });
    };
  }
  function qDelete(id){
    if(!window.confirm('Delete this question?')) return;
    sb.from('visa_questions').delete().eq('id',id).then(function(r){ if(r.error){ toast('Could not delete.'); return; } toast('Question deleted'); loadQuestions(); });
  }
  function qMove(id,dir){
    var i=-1; for(var k=0;k<qList.length;k++){ if(qList[k].id===id){ i=k; break; } }
    var j = dir==='up' ? i-1 : i+1;
    if(i<0||j<0||j>=qList.length) return;
    var a=qList[i], b=qList[j];
    // swap sort_order values
    Promise.all([
      sb.from('visa_questions').update({sort_order:b.sort_order}).eq('id',a.id),
      sb.from('visa_questions').update({sort_order:a.sort_order}).eq('id',b.id)
    ]).then(function(){ loadQuestions(); });
  }

  // ============================================================
  //  SEO EDITOR (RankMath-style) — reusable for visa types (and later articles/home)
  // ============================================================
  var XCROSS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>';
  var IMGICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M3 17l5-4 4 3 3-2 6 5"/></svg>';

  function seoDefaults(v){
    return {
      title: v.name + ' — Apply Online | Visa Doo',
      desc: (v.blurb || ('Apply online for your '+v.name+' with Visa Doo. Fast, secure and 100% online.')).slice(0,160)
    };
  }

  // returns {score, color, checks:[{state,text}]}
  function computeSeo(vals, slug, dflt){
    var kw=(vals.focus_keyword||'').trim().toLowerCase();
    var title=(vals.seo_title||'').trim() || dflt.title;
    var desc=(vals.seo_description||'').trim() || dflt.desc;
    var checks=[];
    function add(state,text){ checks.push({state:state,text:text}); }

    if(!kw){ add('warn','Set a focus keyword — the phrase customers would search for.'); }
    else { add('pass','Focus keyword set: “'+kw+'”.'); }

    if(kw){
      add(title.toLowerCase().indexOf(kw)>-1?'pass':'fail', title.toLowerCase().indexOf(kw)>-1?'Keyword appears in the SEO title.':'Add your keyword to the SEO title.');
      add(desc.toLowerCase().indexOf(kw)>-1?'pass':'fail', desc.toLowerCase().indexOf(kw)>-1?'Keyword appears in the description.':'Add your keyword to the description.');
      add(slug.toLowerCase().indexOf(kw.replace(/\s+/g,'-'))>-1 || slug.toLowerCase().indexOf(kw.replace(/\s+/g,''))>-1 ?'pass':'warn', 'Keyword in the web address (helps a little).');
    }
    var tl=title.length;
    add(tl>=40&&tl<=60?'pass':(tl>=30&&tl<=65?'warn':'fail'), 'SEO title length: '+tl+' characters (aim for 50–60).');
    var dl=desc.length;
    add(dl>=120&&dl<=160?'pass':(dl>=70&&dl<=165?'warn':'fail'), 'Description length: '+dl+' characters (aim for 120–160).');
    add(vals.social_image?'pass':'warn', vals.social_image?'Social share image added.':'Add a social share image so links look great when shared.');

    var pass=checks.filter(function(c){return c.state==='pass';}).length;
    var score=Math.round(pass/checks.length*100);
    var color=score>=70?'good':(score>=40?'ok':'bad');
    return {score:score,color:color,checks:checks,title:title,desc:desc};
  }

  function seoEditorHtml(v){
    var d=seoDefaults(v);
    var vals={ seo_title:v.seo_title||'', seo_description:v.seo_description||'', focus_keyword:v.focus_keyword||'', social_image:v.social_image||'' };
    return '<div class="panel">'+
      '<button class="link-btn" id="seoBack" style="margin-bottom:8px">← Back to visa types</button>'+
      '<h3>SEO · '+esc(v.name)+'</h3>'+
      '<p class="phint">Control how this visa\'s page looks on Google and when shared. Web address: '+SITE_PATH+'/visa/'+esc(v.slug)+'</p>'+
      '<div class="seo-grid">'+
        // LEFT: fields
        '<div>'+
          '<div class="field"><label>Focus keyword</label>'+
            '<input id="seoKw" type="text" value="'+esc(vals.focus_keyword)+'" placeholder="e.g. 30 day uae tourist visa"></div>'+
          '<div class="field"><label>SEO title</label>'+
            '<input id="seoTitle" type="text" value="'+esc(vals.seo_title)+'" placeholder="'+esc(d.title)+'">'+
            '<div class="char-counter" id="seoTitleCount"></div></div>'+
          '<div class="field"><label>Meta description</label>'+
            '<textarea id="seoDesc" style="min-height:90px" placeholder="'+esc(d.desc)+'">'+esc(vals.seo_description)+'</textarea>'+
            '<div class="char-counter" id="seoDescCount"></div></div>'+
          '<div class="field"><label>Social share image</label>'+
            '<div class="img-drop"><div class="img-thumb" id="seoThumb">'+(vals.social_image?'<img src="'+esc(vals.social_image)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">':IMGICON)+'</div>'+
              '<div><button type="button" class="btn btn-ghost" id="seoImgBtn">'+(vals.social_image?'Replace image':'Upload image')+'</button>'+
              (vals.social_image?' <button type="button" class="link-btn" id="seoImgRemove" style="color:var(--red)">Remove</button>':'')+
              '<div class="phint" style="margin:6px 0 0">Best size 1200 × 630. JPG or PNG.</div></div>'+
              '<input type="file" id="seoImgFile" accept="image/*" style="display:none"></div></div>'+
        '</div>'+
        // RIGHT: previews + score
        '<div>'+
          '<div class="seo-score-ring"><div class="ring" id="seoRing"><span id="seoScore">0</span></div>'+
            '<div class="lbl"><b>SEO score</b><div id="seoScoreText">Fill in the fields to improve your score.</div></div></div>'+
          '<div class="preview-label">Google result preview</div>'+
          '<div class="gpreview"><div class="gp-url"><span class="dot">VD</span><div><div class="gp-crumb">visadoo-uae.netlify.app › visa › '+esc(v.slug)+'</div></div></div>'+
            '<div class="gp-title" id="gpTitle"></div><div class="gp-desc" id="gpDesc"></div></div>'+
          '<div class="preview-label">Social share preview</div>'+
          '<div class="spreview"><div class="sp-img" id="spImg">'+IMGICON+'</div><div class="sp-body"><div class="sp-site">visadoo-uae.netlify.app</div>'+
            '<div class="sp-title" id="spTitle"></div><div class="sp-desc" id="spDesc"></div></div></div>'+
          '<ul class="seo-checks" id="seoChecks"></ul>'+
        '</div>'+
      '</div>'+
      '<div class="signin-msg" id="seoMsg"></div>'+
      '<div style="display:flex;gap:10px;margin-top:18px"><button class="btn btn-primary" id="seoSave">Save SEO</button>'+
        '<button class="btn btn-ghost" id="seoCancel">Cancel</button></div>'+
    '</div>';
  }

  function wireSeoEditor(){
    var v=vtSeoEditing, d=seoDefaults(v);
    var vals={ seo_title:v.seo_title||'', seo_description:v.seo_description||'', focus_keyword:v.focus_keyword||'', social_image:v.social_image||'' };

    function recompute(){
      vals.seo_title=document.getElementById('seoTitle').value;
      vals.seo_description=document.getElementById('seoDesc').value;
      vals.focus_keyword=document.getElementById('seoKw').value;
      var res=computeSeo(vals, v.slug, d);
      // previews
      document.getElementById('gpTitle').textContent=res.title;
      document.getElementById('gpDesc').textContent=res.desc;
      document.getElementById('spTitle').textContent=res.title;
      document.getElementById('spDesc').textContent=res.desc;
      // counters
      function setCount(id,len,lo,hi){ var e=document.getElementById(id); e.textContent=len+' characters'; e.className='char-counter '+((len>=lo&&len<=hi)?'ok':((len>0&&len<lo)?'warn':(len>hi?'bad':''))); }
      setCount('seoTitleCount', (vals.seo_title||d.title).length, 40, 60);
      setCount('seoDescCount', (vals.seo_description||d.desc).length, 120, 160);
      // score ring
      var ring=document.getElementById('seoRing');
      ring.className='ring '+res.color;
      ring.style.setProperty('--deg', (res.score*3.6)+'deg');
      document.getElementById('seoScore').textContent=res.score;
      document.getElementById('seoScoreText').textContent = res.score>=70?'Great — this page is well optimised.':(res.score>=40?'Good start — a few tweaks will help.':'Needs work — follow the tips below.');
      // checks
      document.getElementById('seoChecks').innerHTML=res.checks.map(function(c){
        var ic=c.state==='pass'?CHECK:(c.state==='warn'?'!':XCROSS);
        return '<li class="'+c.state+'"><span class="ci">'+(c.state==='warn'?'!':ic)+'</span><span>'+esc(c.text)+'</span></li>';
      }).join('');
    }

    function setImg(url){
      vals.social_image=url;
      document.getElementById('seoThumb').innerHTML = url?('<img src="'+esc(url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">'):IMGICON;
      var sp=document.getElementById('spImg');
      if(url){ sp.style.backgroundImage='url('+url+')'; sp.innerHTML=''; } else { sp.style.backgroundImage=''; sp.innerHTML=IMGICON; }
      recompute();
    }

    document.getElementById('seoBack').onclick=document.getElementById('seoCancel').onclick=function(){ vtSeoEditing=null; paintVt(); };
    ['seoTitle','seoDesc','seoKw'].forEach(function(id){ document.getElementById(id).addEventListener('input',recompute); });

    var imgFile=document.getElementById('seoImgFile');
    document.getElementById('seoImgBtn').onclick=function(){ imgFile.click(); };
    var rm=document.getElementById('seoImgRemove'); if(rm){ rm.onclick=function(){ setImg(''); }; }
    imgFile.onchange=function(){
      var f=imgFile.files[0]; if(!f) return;
      var btn=document.getElementById('seoImgBtn');
      var seoMsg=document.getElementById('seoMsg'); seoMsg.className='signin-msg';
      btn.disabled=true; btn.innerHTML='<span class="spin"></span> Preparing…';
      var origLabel = vals.social_image?'Replace image':'Upload image';
      prepareImage(f).then(function(res){
        var path='visa/'+v.slug+'/og_'+Date.now()+'.'+res.ext;
        return sb.storage.from('public-media').upload(path,res.blob,{contentType:res.type}).then(function(up){
          if(up.error) throw up.error;
          var url=sb.storage.from('public-media').getPublicUrl(path).data.publicUrl;
          btn.disabled=false; btn.innerHTML='Replace image';
          setImg(url);
          toast('Image added');
        });
      }).catch(function(err){
        btn.disabled=false; btn.innerHTML=origLabel;
        if(err && err.code==='decode'){
          seoMsg.className='signin-msg err';
          seoMsg.innerHTML='That photo couldn’t be used here — it looks like a <b>HEIC</b> file (the format iPhones use by default). Please use a <b>JPG</b> or <b>PNG</b> instead.<br>Easiest fix: open the photo and take a <b>screenshot</b>, then upload the screenshot. Or set your iPhone to save JPGs: <b>Settings → Camera → Formats → “Most Compatible”</b>.';
        } else if(err && err.code==='big'){
          toast('That image is too large. Please choose one under 10 MB.');
        } else {
          toast('Could not prepare that image. Please try a JPG or PNG.');
          console.error(err);
        }
      });
    };

    var saveBtn=document.getElementById('seoSave');
    saveBtn.onclick=function(){
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span> Saving…';
      sb.from('visa_types').update({
        seo_title: document.getElementById('seoTitle').value.trim()||null,
        seo_description: document.getElementById('seoDesc').value.trim()||null,
        focus_keyword: document.getElementById('seoKw').value.trim()||null,
        social_image: vals.social_image||null
      }).eq('id',v.id).then(function(r){
        saveBtn.disabled=false; saveBtn.innerHTML='Save SEO';
        if(r.error){ var m=document.getElementById('seoMsg'); m.className='signin-msg err'; m.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        toast('SEO saved — your live page is updated');
        vtSeoEditing=null; loadVisaTypes(); renderVisaTypesAdmin();
      });
    };

    recompute();
  }

  // ============================================================
  //  ADMIN · ARTICLES (rich editor + SEO)
  // ============================================================
  function uploadPublicImage(file, prefix){
    return prepareImage(file).then(function(res){
      var path=prefix+'/'+Date.now()+'.'+res.ext;
      return sb.storage.from('public-media').upload(path,res.blob,{contentType:res.type}).then(function(up){
        if(up.error) throw up.error;
        return sb.storage.from('public-media').getPublicUrl(path).data.publicUrl;
      });
    });
  }

  var artList=[];
  var artEditing=null;    // null=list, object=edit/new
  var artTab='write';

  function renderArticlesAdmin(){
    if(!canManageContent()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('articles')+
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap">'+
        '<div><h1>Articles</h1><p>Write guides and posts to bring search traffic to your site.</p></div>'+
        '<button class="btn btn-primary" id="artNew">+ Write new article</button>'+
      '</div>'+
      '<div id="artArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('artNew').onclick=function(){
      artEditing={ id:null, slug:'', title:'', excerpt:'', content:'', cover_image:'', status:'draft', seo_title:'', seo_description:'', focus_keyword:'', social_image:'' };
      artTab='write'; paintArt();
    };
    sb.from('articles').select('*').order('updated_at',{ascending:false}).then(function(r){
      artList=r.data||[]; artEditing=null; paintArt();
    });
  }

  function paintArt(){
    var area=document.getElementById('artArea'); if(!area) return;
    if(artEditing){ area.innerHTML=artEditorHtml(artEditing); wireArtEditor(); return; }
    if(!artList.length){ area.innerHTML='<div class="panel empty-state"><p>No articles yet. Click “Write new article” to publish your first guide.</p></div>'; return; }
    area.innerHTML=artList.map(artRow).join('');
    area.querySelectorAll('[data-aedit]').forEach(function(b){ b.onclick=function(){ openArt(b.getAttribute('data-aedit'),'write'); }; });
    area.querySelectorAll('[data-aseo]').forEach(function(b){ b.onclick=function(){ openArt(b.getAttribute('data-aseo'),'seo'); }; });
    area.querySelectorAll('[data-adel]').forEach(function(b){ b.onclick=function(){ artDelete(b.getAttribute('data-adel')); }; });
  }
  function openArt(id,tab){ var a=artList.filter(function(x){return x.id===id;})[0]; if(!a) return; artEditing=JSON.parse(JSON.stringify(a)); artTab=tab||'write'; paintArt(); }

  function artRow(a){
    var pill = a.status==='published' ? '<span class="status-pill sp-done">Published</span>' : '<span class="status-pill sp-action">Draft</span>';
    var date=new Date(a.updated_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    return '<div class="admin-app"><div class="arow">'+
      '<div><h4>'+esc(a.title||'(untitled)')+' '+pill+'</h4>'+
        '<div class="meta">Updated '+date+'</div>'+
        '<div class="meta" style="opacity:.7">Web address: /article/'+esc(a.slug)+'</div></div>'+
      '<div style="display:flex;gap:8px">'+
        '<button class="btn btn-ghost" data-aseo="'+esc(a.id)+'">SEO</button>'+
        '<button class="btn btn-ghost" data-aedit="'+esc(a.id)+'">Edit</button>'+
        '<button class="btn btn-ghost" data-adel="'+esc(a.id)+'" style="color:var(--red)">Delete</button>'+
      '</div></div></div>';
  }

  function artEditorHtml(a){
    return '<div class="panel">'+
      '<button class="link-btn" id="artBack" style="margin-bottom:10px">← Back to articles</button>'+
      '<div class="art-tabs">'+
        '<button data-tab="write" class="'+(artTab==='write'?'active':'')+'">Write</button>'+
        '<button data-tab="seo" class="'+(artTab==='seo'?'active':'')+'">SEO &amp; sharing</button>'+
      '</div>'+
      (artTab==='write'? artWriteHtml(a) : artSeoHtml(a))+
    '</div>';
  }

  function artWriteHtml(a){
    return '<div class="field"><label>Title <span class="req-star">*</span></label>'+
        '<input id="artTitle" type="text" value="'+esc(a.title)+'" placeholder="e.g. UAE Tourist Visa Requirements for Indians"></div>'+
      '<div class="field"><label>Short summary (shown on cards &amp; in search)</label>'+
        '<textarea id="artExcerpt" style="min-height:64px" placeholder="One or two sentences summarising the article.">'+esc(a.excerpt||'')+'</textarea></div>'+
      '<div class="field"><label>Cover image</label>'+
        '<div class="cover-drop" id="artCover"'+(a.cover_image?(' style="background-image:url('+esc(a.cover_image)+')"'):'')+'>'+
          (a.cover_image?'':'<div class="ph">'+IMGICON+'<div>Click to add a cover image</div></div>')+'</div>'+
        '<input type="file" id="artCoverFile" accept="image/*" style="display:none">'+
        '<div class="phint" id="artCoverHint" style="margin-top:6px"></div></div>'+
      '<div class="field"><label>Cover image description (alt text)</label>'+
        '<input id="artCoverAlt" type="text" value="'+esc(a.cover_alt||'')+'" placeholder="Describe the image — e.g. Dubai skyline at sunset">'+
        '<div class="phint" style="margin-top:4px">Helps Google Images &amp; screen readers. Leave blank to use the article title.</div></div>'+
      '<div class="field"><label>Article content</label>'+
        '<div class="rte-toolbar" id="rteBar">'+
          '<button type="button" data-cmd="bold" title="Bold"><b>B</b></button>'+
          '<button type="button" data-cmd="italic" title="Italic"><i>I</i></button>'+
          '<span class="sep"></span>'+
          '<button type="button" data-block="h2" title="Heading">H2</button>'+
          '<button type="button" data-block="h3" title="Sub-heading">H3</button>'+
          '<button type="button" data-block="blockquote" title="Quote">&#8220;</button>'+
          '<span class="sep"></span>'+
          '<button type="button" data-cmd="insertUnorderedList" title="Bullet list">&#8226;</button>'+
          '<button type="button" data-cmd="insertOrderedList" title="Numbered list">1.</button>'+
          '<span class="sep"></span>'+
          '<button type="button" data-link="1" title="Add link">🔗</button>'+
          '<button type="button" data-image="1" title="Insert image">🖼</button>'+
        '</div>'+
        '<div class="rte" id="artContent" contenteditable="true" data-ph="Start writing your article here…">'+(a.content||'')+'</div>'+
        '<input type="file" id="artInlineImg" accept="image/*" style="display:none"></div>'+
      '<div class="signin-msg" id="artMsg"></div>'+
      '<div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">'+
        '<button class="btn btn-primary" id="artSaveDraft">'+(a.status==='published'?'Save changes':'Save draft')+'</button>'+
        (a.status==='published'
          ? '<button class="btn btn-ghost" id="artUnpub">Unpublish</button>'
          : '<button class="btn btn-primary" id="artPublish" style="background:var(--green)">Publish</button>')+
        (a.id&&a.slug?(a.status==='published'
          ? '<a class="link-btn" id="artPreview" href="'+esc(publicDetailHref('article',a.slug))+'" target="_blank" rel="noopener">View live page ↗</a>'
          : '<span class="phint">Publish this article to view its live page.</span>'):'')+
      '</div>';
  }

  function artSeoHtml(a){
    var d={ title:(a.title||'Article')+' | Visa Doo', desc:(a.excerpt||a.title||'').slice(0,160) };
    var vals={ seo_title:a.seo_title||'', seo_description:a.seo_description||'', focus_keyword:a.focus_keyword||'', social_image:a.social_image||'' };
    return '<div class="seo-grid">'+
      '<div>'+
        '<div class="field"><label>Focus keyword</label><input id="aSeoKw" type="text" value="'+esc(vals.focus_keyword)+'" placeholder="e.g. uae visa requirements"></div>'+
        '<div class="field"><label>Page address</label><div style="display:flex;align-items:center;gap:6px"><span class="phint" style="margin:0;white-space:nowrap">/article/</span><input id="aSlug" type="text" value="'+esc(a.slug||'')+'" placeholder="auto from the title"></div>'+
          '<div class="phint" style="margin-top:4px">Change the web address here. The old one automatically forwards to the new one, so nothing breaks.</div></div>'+
        '<div class="field"><label>SEO title</label><input id="aSeoTitle" type="text" value="'+esc(vals.seo_title)+'" placeholder="'+esc(d.title)+'"><div class="char-counter" id="aSeoTitleCount"></div></div>'+
        '<div class="field"><label>Meta description</label><textarea id="aSeoDesc" style="min-height:90px" placeholder="'+esc(d.desc)+'">'+esc(vals.seo_description)+'</textarea><div class="char-counter" id="aSeoDescCount"></div></div>'+
        '<div class="field"><label>Social share image</label><div class="img-drop"><div class="img-thumb" id="aSeoThumb">'+(vals.social_image?'<img src="'+esc(vals.social_image)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">':IMGICON)+'</div>'+
          '<div><button type="button" class="btn btn-ghost" id="aSeoImgBtn">'+(vals.social_image?'Replace image':'Upload image')+'</button><div class="phint" style="margin:6px 0 0">Best 1200 × 630. If empty, the cover image is used.</div></div>'+
          '<input type="file" id="aSeoImgFile" accept="image/*" style="display:none"></div></div>'+
      '</div>'+
      '<div>'+
        '<div class="seo-score-ring"><div class="ring" id="aSeoRing"><span id="aSeoScore">0</span></div><div class="lbl"><b>SEO score</b><div id="aSeoScoreText"></div></div></div>'+
        '<div class="preview-label">Google result preview</div>'+
        '<div class="gpreview"><div class="gp-url"><span class="dot">VD</span><div class="gp-crumb" id="aGpCrumb">visadoo-uae.netlify.app › article › '+esc(a.slug||'…')+'</div></div><div class="gp-title" id="aGpTitle"></div><div class="gp-desc" id="aGpDesc"></div></div>'+
        '<div class="preview-label">Social share preview</div>'+
        '<div class="spreview"><div class="sp-img" id="aSpImg">'+IMGICON+'</div><div class="sp-body"><div class="sp-site">visadoo-uae.netlify.app</div><div class="sp-title" id="aSpTitle"></div><div class="sp-desc" id="aSpDesc"></div></div></div>'+
        '<ul class="seo-checks" id="aSeoChecks"></ul>'+
      '</div>'+
    '</div>'+
    '<div class="signin-msg" id="artMsg"></div>'+
    '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-primary" id="aSeoSave">Save SEO</button></div>';
  }

  function wireArtEditor(){
    document.getElementById('artBack').onclick=function(){ artEditing=null; renderArticlesAdmin(); };
    root.querySelectorAll('.art-tabs button').forEach(function(b){
      b.onclick=function(){ captureArtWrite(); artTab=b.getAttribute('data-tab'); paintArt(); };
    });
    if(artTab==='write') wireArtWrite(); else wireArtSeo();
  }

  // keep in-memory artEditing updated from the Write tab before switching/saving
  function captureArtWrite(){
    if(artTab!=='write') return;
    var t=document.getElementById('artTitle'); if(!t) return;
    artEditing.title=t.value;
    artEditing.excerpt=document.getElementById('artExcerpt').value;
    artEditing.content=document.getElementById('artContent').innerHTML;
    var ca=document.getElementById('artCoverAlt'); if(ca) artEditing.cover_alt=ca.value;
  }
  function captureArtSeo(){
    if(artTab!=='seo') return;
    var t=document.getElementById('aSeoTitle'); if(!t) return;
    artEditing.seo_title=t.value; artEditing.seo_description=document.getElementById('aSeoDesc').value; artEditing.focus_keyword=document.getElementById('aSeoKw').value;
    var sl=document.getElementById('aSlug'); if(sl) artEditing.slug=sl.value;
  }

  function wireArtWrite(){
    var content=document.getElementById('artContent');
    var bar=document.getElementById('rteBar');
    bar.querySelectorAll('[data-cmd]').forEach(function(b){ b.onmousedown=function(e){ e.preventDefault(); document.execCommand(b.getAttribute('data-cmd'),false,null); content.focus(); }; });
    bar.querySelectorAll('[data-block]').forEach(function(b){ b.onmousedown=function(e){ e.preventDefault(); document.execCommand('formatBlock',false,b.getAttribute('data-block')); content.focus(); }; });
    bar.querySelector('[data-link]').onmousedown=function(e){ e.preventDefault(); var u=window.prompt('Link address (https://…)'); if(u){ document.execCommand('createLink',false,u); } content.focus(); };
    var inlineImg=document.getElementById('artInlineImg');
    bar.querySelector('[data-image]').onmousedown=function(e){ e.preventDefault(); inlineImg.click(); };
    inlineImg.onchange=function(){
      var f=inlineImg.files[0]; if(!f) return;
      var msg=document.getElementById('artMsg'); msg.className='signin-msg info'; msg.textContent='Uploading image…';
      uploadPublicImage(f,'article/inline').then(function(url){
        msg.className='signin-msg';
        var alt=(window.prompt('Describe this image for SEO & screen readers (optional):','')||'').trim();
        document.execCommand('insertHTML',false,'<img src="'+esc(url)+'" alt="'+esc(alt)+'" style="max-width:100%;height:auto">');
      }).catch(function(err){ msg.className='signin-msg err'; msg.innerHTML = (err&&err.code==='decode')?'That image couldn’t be used — please use a JPG or PNG (an iPhone HEIC won’t work here; take a screenshot instead).':'Could not upload that image.'; });
    };

    // cover image
    var cover=document.getElementById('artCover'); var coverFile=document.getElementById('artCoverFile');
    cover.onclick=function(){ coverFile.click(); };
    coverFile.onchange=function(){
      var f=coverFile.files[0]; if(!f) return;
      var hint=document.getElementById('artCoverHint'); hint.textContent='Uploading…';
      uploadPublicImage(f,'article/cover').then(function(url){
        artEditing.cover_image=url; cover.style.backgroundImage='url('+url+')'; cover.innerHTML=''; hint.textContent='';
      }).catch(function(err){ hint.textContent = (err&&err.code==='decode')?'That image couldn’t be used — please use a JPG/PNG (screenshot an iPhone photo).':'Could not upload image.'; });
    };

    if(document.getElementById('artSaveDraft')) document.getElementById('artSaveDraft').onclick=function(){ saveArticle(artEditing.status||'draft'); };
    if(document.getElementById('artPublish')) document.getElementById('artPublish').onclick=function(){ saveArticle('published'); };
    if(document.getElementById('artUnpub')) document.getElementById('artUnpub').onclick=function(){ saveArticle('draft'); };
  }

  function wireArtSeo(){
    var a=artEditing;
    var d={ title:(a.title||'Article')+' | Visa Doo', desc:(a.excerpt||a.title||'').slice(0,160) };
    var vals={ seo_title:a.seo_title||'', seo_description:a.seo_description||'', focus_keyword:a.focus_keyword||'', social_image:a.social_image||'' };
    function recompute(){
      vals.seo_title=document.getElementById('aSeoTitle').value; vals.seo_description=document.getElementById('aSeoDesc').value; vals.focus_keyword=document.getElementById('aSeoKw').value;
      var res=computeSeo(vals, a.slug||'', d);
      document.getElementById('aGpTitle').textContent=res.title; document.getElementById('aGpDesc').textContent=res.desc;
      document.getElementById('aSpTitle').textContent=res.title; document.getElementById('aSpDesc').textContent=res.desc;
      var slEl=document.getElementById('aSlug'), crumbEl=document.getElementById('aGpCrumb'); if(crumbEl) crumbEl.textContent='visadoo-uae.netlify.app › article › '+((slEl&&slugify(slEl.value))||(a.slug||'…'));
      function setCount(id,len,lo,hi){ var e=document.getElementById(id); e.textContent=len+' characters'; e.className='char-counter '+((len>=lo&&len<=hi)?'ok':((len>0&&len<lo)?'warn':(len>hi?'bad':''))); }
      setCount('aSeoTitleCount',(vals.seo_title||d.title).length,40,60);
      setCount('aSeoDescCount',(vals.seo_description||d.desc).length,120,160);
      var ring=document.getElementById('aSeoRing'); ring.className='ring '+res.color; ring.style.setProperty('--deg',(res.score*3.6)+'deg');
      document.getElementById('aSeoScore').textContent=res.score;
      document.getElementById('aSeoScoreText').textContent=res.score>=70?'Great — well optimised.':(res.score>=40?'Good start — a few tweaks will help.':'Needs work — follow the tips.');
      document.getElementById('aSeoChecks').innerHTML=res.checks.map(function(c){ var ic=c.state==='pass'?CHECK:(c.state==='warn'?'!':XCROSS); return '<li class="'+c.state+'"><span class="ci">'+(c.state==='warn'?'!':ic)+'</span><span>'+esc(c.text)+'</span></li>'; }).join('');
    }
    function setImg(url){ vals.social_image=url; artEditing.social_image=url;
      document.getElementById('aSeoThumb').innerHTML=url?('<img src="'+esc(url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">'):IMGICON;
      var sp=document.getElementById('aSpImg'); if(url){ sp.style.backgroundImage='url('+url+')'; sp.innerHTML=''; } else { sp.style.backgroundImage=''; sp.innerHTML=IMGICON; } recompute(); }
    ['aSeoTitle','aSeoDesc','aSeoKw','aSlug'].forEach(function(id){ var el=document.getElementById(id); if(el) el.addEventListener('input',recompute); });
    var imgFile=document.getElementById('aSeoImgFile');
    document.getElementById('aSeoImgBtn').onclick=function(){ imgFile.click(); };
    imgFile.onchange=function(){
      var f=imgFile.files[0]; if(!f) return; var btn=document.getElementById('aSeoImgBtn'); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Preparing…';
      uploadPublicImage(f,'article/og').then(function(url){ btn.disabled=false; btn.innerHTML='Replace image'; setImg(url); toast('Image added'); })
      .catch(function(err){ btn.disabled=false; btn.innerHTML='Upload image'; var m=document.getElementById('artMsg'); m.className='signin-msg err'; m.innerHTML=(err&&err.code==='decode')?'That photo couldn’t be used — please use a JPG or PNG (an iPhone HEIC won’t work; take a screenshot instead).':'Could not upload that image.'; });
    };
    document.getElementById('aSeoSave').onclick=function(){ captureArtSeo(); saveArticle(artEditing.status||'draft', true); };
    recompute();
  }

  function articleSlugs(){ return artList.filter(function(x){return x.id!==artEditing.id;}).map(function(x){return x.slug;}); }
  function uniqueArticleSlug(base){ var ex=articleSlugs(); var s=base||'article',i=2; while(ex.indexOf(s)>-1){ s=(base||'article')+'-'+i; i++; } return s; }
  function publicDetailHref(kind, slug){
    var local=window.location.protocol==='file:'||window.location.hostname==='127.0.0.1'||window.location.hostname==='localhost';
    var safeSlug=encodeURIComponent(slug||'');
    return local?(kind+'.html?slug='+safeSlug):('/'+kind+'/'+safeSlug);
  }
  // Sanitise a desired address, keep it unique among the others, and remember the old
  // address (so it can auto-forward). Returns {slug, past_slugs}.
  function seoSlugPayload(desired, current, pastSlugs, others, fallbackBase){
    var s=slugify(desired||'')||slugify(fallbackBase||'')||'page';
    var base=s, i=2; while(others.indexOf(s)>-1){ s=base+'-'+i; i++; }
    var past=(pastSlugs||[]).slice().filter(function(x){ return x && x!==s; });
    if(current && current!==s && past.indexOf(current)===-1) past.push(current);
    return { slug:s, past_slugs:past };
  }

  function saveArticle(status, stayOnSeo){
    captureArtWrite(); captureArtSeo();
    var a=artEditing;
    if(!(a.title||'').trim()){ var m=document.getElementById('artMsg'); if(m){m.className='signin-msg err'; m.textContent='Please add a title first.';} if(artTab!=='write'){artTab='write';paintArt();} return; }
    var payload={
      title:a.title.trim(), excerpt:(a.excerpt||'').trim()||null, content:a.content||null, cover_image:a.cover_image||null,
      cover_alt:(a.cover_alt||'').trim()||null,
      status:status, seo_title:(a.seo_title||'').trim()||null, seo_description:(a.seo_description||'').trim()||null,
      focus_keyword:(a.focus_keyword||'').trim()||null, social_image:a.social_image||null
    };
    if(status==='published' && !a.published_at) payload.published_at=new Date().toISOString();
    // Web address: sanitise + keep unique + auto-forward the old address if it changed.
    var _cur = a.id ? (artList.filter(function(x){return x.id===a.id;})[0]||{}) : {};
    var _sp = seoSlugPayload((a.slug!=null && String(a.slug).trim())?a.slug:a.title, _cur.slug||'', _cur.past_slugs||[], articleSlugs(), a.title);
    payload.slug = _sp.slug; payload.past_slugs = _sp.past_slugs;

    var btnIds=['artSaveDraft','artPublish','artUnpub','aSeoSave'];
    btnIds.forEach(function(id){ var b=document.getElementById(id); if(b){ b.disabled=true; } });

    var op;
    if(a.id){ op=sb.from('articles').update(payload).eq('id',a.id).select().single(); }
    else { op=sb.from('articles').insert(payload).select().single(); }
    op.then(function(r){
      if(r.error){ var m=document.getElementById('artMsg'); if(m){m.className='signin-msg err'; m.textContent='Could not save. Please try again.';} btnIds.forEach(function(id){var b=document.getElementById(id);if(b)b.disabled=false;}); console.error(r.error); return; }
      logAudit({ module:'Content', action:(a.id?'edit':'create'), record_type:'article', record_ref:(a.title||'(untitled)'), remarks:('Article '+(status==='published'?'published':'saved')), risk:'normal' });
      toast(status==='published'?'Article published — live now':'Saved');
      artEditing=r.data; // keep editing with new id/slug
      if(!stayOnSeo) artTab='write';
      // refresh list in background
      sb.from('articles').select('*').order('updated_at',{ascending:false}).then(function(rr){ artList=rr.data||[]; paintArt(); });
    });
  }

  function artDelete(id){
    var a=artList.filter(function(x){return x.id===id;})[0]; if(!a) return;
    if(!window.confirm('Delete “'+(a.title||'this article')+'”? This cannot be undone.')) return;
    sb.from('articles').delete().eq('id',id).then(function(r){
      if(r.error){ toast('Could not delete.'); console.error(r.error); return; }
      logAudit({ module:'Content', action:'delete', record_type:'article', record_ref:(a.title||'article'), remarks:'Article deleted', risk:'high' });
      toast('Article deleted'); renderArticlesAdmin();
    });
  }

  // ============================================================
  //  CREATE APPLICATION FOR A CUSTOMER (on behalf)
  // ============================================================
  function openOnBehalf(){
    if(!canProcessApps()){ go(defaultStaffView()); return; }
    var visaOpts=VISAS.map(function(v){ return '<option value="'+esc(v.id)+'">'+esc(v.name)+' — '+visaPriceText(v)+'</option>'; }).join('');
    root.innerHTML='<div class="app-main">'+adminSections('admin')+
      '<div class="panel">'+
        '<button class="link-btn" id="obBack" style="margin-bottom:8px">← Back to applications</button>'+
        '<h3>New application for a customer</h3>'+
        '<p class="phint">Create an application for a walk-in or phone customer. If they later sign in with the same email, it appears in their account to track.</p>'+
        '<div class="field"><label>Visa type</label><select id="obVisa" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px">'+visaOpts+'</select></div>'+
        '<div class="grid2">'+
          field('ob_email','Customer email','email','',true)+
          field('ob_name','Full name (as in passport)','text','',true)+
          field('ob_phone','Phone number','tel','',true)+
          field('ob_nationality','Nationality','text','',true)+
          field('ob_passport','Passport number','text','',true)+
          field('ob_dob','Date of birth','date','',false)+
        '</div>'+
        '<div class="signin-msg" id="obMsg"></div>'+
        '<div style="display:flex;gap:10px;margin-top:8px"><button class="btn btn-primary" id="obSave">Create application</button>'+
          '<button class="btn btn-ghost" id="obCancel">Cancel</button></div>'+
      '</div></div>';
    wireAdminSections();
    document.getElementById('obBack').onclick=document.getElementById('obCancel').onclick=function(){ renderAdmin(); };
    var saveBtn=document.getElementById('obSave');
    saveBtn.onclick=function(){
      var email=document.getElementById('ob_email').value.trim();
      var name=document.getElementById('ob_name').value.trim();
      var phone=document.getElementById('ob_phone').value.trim();
      var nat=document.getElementById('ob_nationality').value.trim();
      var pass=document.getElementById('ob_passport').value.trim();
      var msg=document.getElementById('obMsg');
      if(!/.+@.+\..+/.test(email)||!name||!phone||!nat||!pass){ msg.className='signin-msg err'; msg.textContent='Please fill in the customer email, name, phone, nationality and passport number.'; return; }
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span> Creating…';
      sb.from('applications').insert({
        user_id:null, visa_type:document.getElementById('obVisa').value, full_name:name, email:email, phone:phone,
        nationality:nat, passport_number:pass, date_of_birth:document.getElementById('ob_dob').value||null, status:'Submitted'
      }).select().single().then(function(r){
        saveBtn.disabled=false; saveBtn.innerHTML='Create application';
        if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not create. Please try again.'; console.error(r.error); return; }
        toast('Application created for '+name.split(' ')[0]+' (Ref '+r.data.reference_code+')');
        renderAdmin();
      });
    };
  }

  // ============================================================
  //  SUPPLIERS (Finance) — supplier master
  // ============================================================
  var supList=[], supEditing=null, rfList=[], supViewId=null;
  var SUP_TYPES=['Embassy','Processing partner','Other'];

  // ---- Supplier statement / ledger page (record payments + running balance) ----
  function openSupplier(id){ supViewId=id; state.view='supview'; location.hash='supview/'+encodeURIComponent(id); renderHeader(); render(); }
  function renderSupplierDetail(id){
    if(!isFinance()){ go(defaultStaffView()); return; }
    if(!id){ go('suppliers'); return; }
    root.innerHTML='<div class="app-main">'+adminSections('suppliers')+
      '<button class="link-btn" id="supBack2" style="margin-bottom:10px">← Back to suppliers</button>'+
      '<div id="supDetail"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('supBack2').onclick=function(){ go('suppliers'); };
    Promise.all([
      sb.from('suppliers').select('*').eq('id',id).single(),
      sb.from('application_cost_lines').select('category,cost,created_at,application_id, applications(reference_code,full_name)').eq('supplier_id',id),
      sb.from('supplier_payments').select('*').eq('supplier_id',id)
    ]).then(function(res){
      var s=res[0].data;
      if(res[0].error||!s){ document.getElementById('supDetail').innerHTML='<div class="panel empty-state"><p>Could not load this supplier.</p></div>'; return; }
      paintSupplierDetail(s, res[1].data||[], res[2].data||[]);
    });
  }
  function paintSupplierDetail(s, costLines, payments){
    var box=document.getElementById('supDetail'); if(!box) return;
    var opening=Number(s.opening_balance||0);
    // build chronological entries: opening, payables (cost lines), payments
    var entries=[];
    if(opening!==0) entries.push({ when:s.created_at, label:'Opening balance', debit:opening });
    costLines.forEach(function(l){ var app=l.applications||{}; entries.push({ when:l.created_at, label:'Payable — '+(l.category||'cost')+(app.reference_code?(' ('+app.reference_code+')'):''), debit:Number(l.cost||0) }); });
    payments.forEach(function(p){ entries.push({ when:p.paid_at||p.created_at, label:'Payment'+(p.method?(' ('+p.method+')'):'')+(p.reference?(' · '+p.reference):''), credit:Number(p.amount||0), receipt:p.receipt_path }); });
    entries.sort(function(a,b){ return new Date(a.when)-new Date(b.when); });
    var run=0;
    var rows=entries.map(function(e){
      run += (Number(e.debit||0) - Number(e.credit||0));
      var amt = e.debit ? ('+'+money(e.debit)) : ('−'+money(e.credit||0));
      var rcpt = e.receipt ? (' · <a href="#" class="sp-proof" data-path="'+esc(e.receipt)+'">receipt</a>') : '';
      return '<tr><td style="padding:6px 0;border-top:1px solid var(--line)">'+esc(new Date(e.when).toLocaleDateString())+'</td>'+
        '<td style="padding:6px 8px;border-top:1px solid var(--line)">'+esc(e.label)+rcpt+'</td>'+
        '<td style="padding:6px 0;border-top:1px solid var(--line);text-align:right">'+amt+'</td>'+
        '<td style="padding:6px 0 6px 8px;border-top:1px solid var(--line);text-align:right;font-weight:600">'+money(run)+'</td></tr>';
    }).join('');
    var outstanding=run;
    var meta=[s.supplier_type, s.contact_name, s.phone, s.email].filter(Boolean).map(esc).join(' · ');
    box.innerHTML=
      '<div class="panel"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h2 style="font-size:22px;font-weight:800;margin:0 0 4px">'+esc(s.name)+'</h2>'+
        (meta?('<div class="meta">'+meta+'</div>'):'')+
        (s.payment_terms?('<div class="meta">Terms: '+esc(s.payment_terms)+'</div>'):'')+'</div>'+
        '<div style="text-align:right;white-space:nowrap"><div class="phint" style="margin:0">Outstanding</div><div style="font-size:22px;font-weight:800;color:'+(outstanding>0?'var(--red)':'var(--green)')+'">'+money(outstanding)+'</div></div>'+
      '</div>'+
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'+
          '<button class="btn btn-primary" id="spAdd">+ Record payment</button>'+
          '<button class="btn btn-ghost" id="supEditBtn">Edit details</button>'+
          (state.role==='admin'?('<button class="btn btn-ghost" id="supDelBtn" style="color:var(--red)">Delete</button>'):'')+
        '</div>'+
        '<div id="spForm" style="display:none;margin-top:10px;padding:12px;border:1px dashed var(--line);border-radius:10px">'+
          '<div class="grid2"><div class="field"><label class="ulabel">Amount (₹)</label><input id="spAmt" type="number" min="0"></div>'+
          '<div class="field"><label class="ulabel">Method</label><select id="spMethod"><option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="other">Other</option></select></div></div>'+
          '<div class="grid2"><div class="field"><label class="ulabel">Reference (optional)</label><input id="spRef" type="text"></div>'+
          '<div class="field"><label class="ulabel">Supplier receipt (optional)</label><input id="spReceipt" type="file" accept="image/*,application/pdf"></div></div>'+
          '<div class="field"><label class="ulabel">Remarks (optional)</label><input id="spRemarks" type="text"></div>'+
          '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="spSave">Save payment</button><button class="link-btn" id="spCancel">Cancel</button></div>'+
        '</div>'+
      '</div>'+
      '<div style="margin-top:18px"><h3 style="font-size:16px;font-weight:800;margin-bottom:8px">Statement of account</h3>'+
        (entries.length
          ? ('<table style="width:100%;border-collapse:collapse;font-size:13.5px"><thead><tr style="text-align:left;color:var(--muted)"><th style="padding:0 0 4px">Date</th><th style="padding:0 8px 4px">Details</th><th style="padding:0 0 4px;text-align:right">Amount</th><th style="padding:0 0 4px 8px;text-align:right">Balance</th></tr></thead><tbody>'+rows+'</tbody></table>')
          : '<div class="panel empty-state"><p>No entries yet. Costs assigned to this supplier and payments will appear here.</p></div>')+
      '</div>';
    document.getElementById('spAdd').onclick=function(){ var fm=document.getElementById('spForm'); fm.style.display=fm.style.display==='none'?'block':'none'; };
    document.getElementById('spCancel').onclick=function(){ document.getElementById('spForm').style.display='none'; };
    var supEditBtn=document.getElementById('supEditBtn'); if(supEditBtn) supEditBtn.onclick=function(){ supEditing=JSON.parse(JSON.stringify(s)); go('suppliers'); };
    var supDelBtn=document.getElementById('supDelBtn'); if(supDelBtn) supDelBtn.onclick=function(){
      if(!window.confirm('Delete supplier “'+s.name+'”? This cannot be undone.')) return;
      sb.from('suppliers').delete().eq('id',s.id).then(function(r){ if(r.error){ toast('Could not delete (the supplier may be in use).'); console.error(r.error); return; } logFinance('supplier',s.id,'delete','Deleted supplier '+s.name); toast('Supplier deleted'); go('suppliers'); });
    };
    box.querySelectorAll('.sp-proof').forEach(function(l){ l.onclick=function(e){ e.preventDefault(); var p=l.getAttribute('data-path'), o=l.textContent; l.textContent='…'; sb.storage.from('finance-files').createSignedUrl(p,3600).then(function(r){ l.textContent=o; if(r.error||!r.data){ toast('Could not open receipt.'); return; } window.open(r.data.signedUrl,'_blank','noopener'); }); }; });
    document.getElementById('spSave').onclick=function(){
      var amt=Number(document.getElementById('spAmt').value);
      if(!(amt>0)){ toast('Enter a valid amount.'); return; }
      var btn=document.getElementById('spSave'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
      var fileEl=document.getElementById('spReceipt'); var file=fileEl&&fileEl.files[0];
      var ins=function(rp){ return sb.from('supplier_payments').insert({ supplier_id:s.id, amount:amt, method:document.getElementById('spMethod').value, reference:(document.getElementById('spRef').value||'').trim()||null, remarks:(document.getElementById('spRemarks').value||'').trim()||null, receipt_path:rp||null, paid_by:(state.user&&state.user.id)||null }); };
      var up=Promise.resolve(null);
      if(file){ if(file.size>10485760){ toast('Receipt file is over 10 MB.'); btn.disabled=false; btn.innerHTML='Save payment'; return; }
        var ext=(file.name.split('.').pop()||'dat').toLowerCase(); var path='finance/supplier/'+s.id+'/pay_'+Date.now()+'.'+ext;
        up=sb.storage.from('finance-files').upload(path,file,{upsert:false}).then(function(u){ if(u.error) throw u.error; return path; });
      }
      up.then(ins).then(function(r){ if(r.error) throw r.error; logFinance('supplier_payment', s.id, 'create', 'Paid supplier '+s.name+' '+money(amt)); toast('Payment recorded'); renderSupplierDetail(s.id); })
        .catch(function(err){ btn.disabled=false; btn.innerHTML='Save payment'; toast('Could not save.'); console.error(err); });
    };
  }

  // Append-only finance audit entry (who/what/when + remarks).
  function logFinance(entity_type, entity_id, action, remarks){
    return sb.from('finance_audit_log').insert({ entity_type:entity_type, entity_id:entity_id||null, action:action, actor:(state.user&&state.user.id)||null, actor_role:state.role||null, remarks:remarks||null });
  }

  function renderSuppliers(){
    if(!isFinance()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('suppliers')+
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap"><div>'+
        '<h1>Suppliers</h1><p>Your visa suppliers (embassies, processing partners). Costs and payments are recorded per application.</p></div>'+
        '<button class="btn btn-primary" id="supAdd">+ Add supplier</button></div>'+
      '<div id="supArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('supAdd').onclick=function(){ supEditing={ id:null, name:'', supplier_type:'', contact_name:'', email:'', phone:'', address:'', payment_terms:'', credit_limit:'', opening_balance:0, tax_no:'', notes:'', active:true }; paintSup(); };
    Promise.all([
      sb.from('suppliers').select('*').order('name'),
      sb.from('application_cost_lines').select('supplier_id,cost'),
      sb.from('supplier_payments').select('supplier_id,amount')
    ]).then(function(res){
      if(res[0].error){ document.getElementById('supArea').innerHTML='<div class="empty-state"><p>Could not load suppliers.</p></div>'; console.error(res[0].error); return; }
      var payable={}, paid={};
      (res[1].data||[]).forEach(function(l){ if(l.supplier_id) payable[l.supplier_id]=(payable[l.supplier_id]||0)+Number(l.cost||0); });
      (res[2].data||[]).forEach(function(p){ if(p.supplier_id) paid[p.supplier_id]=(paid[p.supplier_id]||0)+Number(p.amount||0); });
      supList=(res[0].data||[]).map(function(s){ s._outstanding=Number(s.opening_balance||0)+(payable[s.id]||0)-(paid[s.id]||0); return s; });
      paintSup();
    });
  }

  function paintSup(){
    var area=document.getElementById('supArea'); if(!area) return;
    if(supEditing){ area.innerHTML=supFormHtml(supEditing); wireSupForm(); return; }
    if(!supList.length){ area.innerHTML='<div class="panel empty-state"><p>No suppliers yet. Add your first supplier.</p></div>'; return; }
    area.innerHTML='<div class="app-list">'+supList.map(function(s){
      var meta=[s.supplier_type, s.contact_name, s.phone, s.email].filter(Boolean).map(esc).join(' · ');
      var out=Number(s._outstanding||0);
      var outPill=out>0
        ? '<span class="status-pill sp-action pill-sm">Outstanding '+money(out)+'</span>'
        : '<span class="status-pill sp-done pill-sm">Settled</span>';
      var inactive=s.active?'':' <span class="status-pill pill-sm" style="background:#eef2f7;color:#64748b">Inactive</span>';
      return '<div class="app-row" data-supopen="'+esc(s.id)+'"><div class="ar-main">'+
        '<div class="ar-name">'+esc(s.name)+inactive+'</div>'+
        '<div class="ar-sub">'+(meta||'—')+'</div></div>'+
        '<div class="ar-right">'+outPill+CHEV+'</div></div>';
    }).join('')+'</div>';
    area.querySelectorAll('[data-supopen]').forEach(function(el){ el.onclick=function(){ openSupplier(el.getAttribute('data-supopen')); }; });
  }

  function supFormHtml(s){
    function f(id,label,val,type){ return '<div class="field"><label>'+label+'</label><input id="'+id+'" type="'+(type||'text')+'" value="'+esc(val==null?'':val)+'"></div>'; }
    return '<div class="panel">'+
      '<button class="link-btn" id="supBack" style="margin-bottom:8px">← Back to suppliers</button>'+
      '<div class="field"><label>Supplier name <span class="req-star">*</span></label><input id="supName" type="text" value="'+esc(s.name||'')+'" placeholder="e.g. UAE Embassy / ABC Visa Services"></div>'+
      '<div class="field"><label>Type</label><input id="supType" list="supTypeList" value="'+esc(s.supplier_type||'')+'" placeholder="Embassy / Processing partner / Other"><datalist id="supTypeList">'+SUP_TYPES.map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></div>'+
      '<div class="grid2">'+f('supContact','Contact person',s.contact_name)+f('supPhone','Phone',s.phone,'tel')+'</div>'+
      '<div class="grid2">'+f('supEmail','Email',s.email,'email')+f('supTax','Tax / GSTIN (optional)',s.tax_no)+'</div>'+
      '<div class="field"><label>Address</label><textarea id="supAddr" style="min-height:60px">'+esc(s.address||'')+'</textarea></div>'+
      '<div class="field"><label>Payment terms</label><input id="supTerms" type="text" value="'+esc(s.payment_terms||'')+'" placeholder="e.g. Net 30 days, Advance"></div>'+
      '<div class="grid2">'+
        '<div class="field"><label>Credit limit (₹, optional)</label><input id="supCredit" type="number" min="0" value="'+esc(s.credit_limit==null?'':s.credit_limit)+'" placeholder="leave blank if none"></div>'+
        '<div class="field"><label>Opening balance (₹)</label><input id="supOpening" type="number" value="'+esc(s.opening_balance==null?0:s.opening_balance)+'" placeholder="0"><div class="phint">What you already owe this supplier at the start. Usually 0.</div></div>'+
      '</div>'+
      '<div class="field"><label>Notes</label><textarea id="supNotes" style="min-height:60px">'+esc(s.notes||'')+'</textarea></div>'+
      '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer"><input id="supActive" type="checkbox" '+(s.active?'checked':'')+' style="width:auto"> Active</label>'+
      '<div class="signin-msg" id="supMsg"></div>'+
      '<div style="display:flex;gap:10px;margin-top:10px"><button class="btn btn-primary" id="supSave">'+(s.id?'Save changes':'Create supplier')+'</button><button class="btn btn-ghost" id="supCancel">Cancel</button></div>'+
    '</div>';
  }

  function wireSupForm(){
    document.getElementById('supBack').onclick=document.getElementById('supCancel').onclick=function(){ supEditing=null; paintSup(); };
    document.getElementById('supSave').onclick=function(){
      var name=document.getElementById('supName').value.trim();
      var msg=document.getElementById('supMsg');
      if(!name){ msg.className='signin-msg err'; msg.style.display='block'; msg.textContent='Please enter a supplier name.'; return; }
      function num(id){ var v=document.getElementById(id).value; if(v==='') return null; var n=Number(v); return isNaN(n)?null:n; }
      var payload={
        name:name,
        supplier_type:document.getElementById('supType').value.trim()||null,
        contact_name:document.getElementById('supContact').value.trim()||null,
        email:document.getElementById('supEmail').value.trim()||null,
        phone:document.getElementById('supPhone').value.trim()||null,
        address:document.getElementById('supAddr').value.trim()||null,
        payment_terms:document.getElementById('supTerms').value.trim()||null,
        tax_no:document.getElementById('supTax').value.trim()||null,
        credit_limit:num('supCredit'),
        opening_balance:num('supOpening')||0,
        notes:document.getElementById('supNotes').value.trim()||null,
        active:document.getElementById('supActive').checked,
        updated_at:new Date().toISOString()
      };
      var btn=document.getElementById('supSave'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
      var editingId=supEditing&&supEditing.id;
      var op = editingId ? sb.from('suppliers').update(payload).eq('id',editingId).select().single() : sb.from('suppliers').insert(payload).select().single();
      op.then(function(r){
        btn.disabled=false; btn.innerHTML='Save';
        if(r.error){ msg.className='signin-msg err'; msg.style.display='block'; msg.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        logFinance('supplier', r.data.id, editingId?'update':'create', (editingId?'Updated':'Created')+' supplier '+name);
        supEditing=null; toast('Supplier saved'); renderSuppliers();
      });
    };
  }

  // ============================================================
  //  REFUND REQUESTS QUEUE (Finance) — approve / reject
  // ============================================================
  function renderRefunds(){
    if(!isFinance()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('refunds')+
      '<div class="app-head"><h1>Refund requests</h1><p>Requests awaiting your decision. Approve with the refund payment details, or reject with a reason.</p></div>'+
      '<div id="rfArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    sb.from('customer_payments').select('*, applications(full_name,reference_code,email,visa_type)').eq('kind','refund').eq('status','pending').order('created_at').then(function(r){
      if(r.error){ document.getElementById('rfArea').innerHTML='<div class="empty-state"><p>Could not load refund requests.</p></div>'; console.error(r.error); return; }
      rfList=r.data||[]; paintRefunds();
    });
  }
  function paintRefunds(){
    var area=document.getElementById('rfArea'); if(!area) return;
    if(!rfList.length){ area.innerHTML='<div class="panel empty-state"><p>No pending refund requests. 🎉</p></div>'; return; }
    area.innerHTML=rfList.map(function(p){
      var app=p.applications||{};
      var vn=visaById(app.visa_type)?visaById(app.visa_type).name:(app.visa_type||'');
      return '<div class="admin-app" data-rfid="'+esc(p.id)+'"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h4>'+esc(app.full_name||'(customer)')+' · '+money(p.amount)+'</h4>'+
        '<div class="meta">'+esc(app.reference_code||'')+(vn?(' · '+esc(vn)):'')+' · '+esc(app.email||'')+'</div>'+
        '<div class="meta">Reason: '+esc(p.reason||'—')+' · requested '+esc(new Date(p.created_at).toLocaleDateString())+'</div></div></div>'+
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center">'+
          '<select data-rf="method" style="width:150px"><option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card reversal</option><option value="cheque">Cheque</option><option value="other">Other</option></select>'+
          '<input data-rf="reference" type="text" placeholder="reference (optional)" style="flex:1;min-width:140px;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px">'+
          '<button class="btn btn-primary" data-rf="approve">Approve &amp; process</button>'+
          '<button class="btn btn-ghost" data-rf="reject" style="color:var(--red)">Reject</button>'+
        '</div></div>';
    }).join('');
    area.querySelectorAll('[data-rf="approve"]').forEach(function(b){ b.onclick=function(){
      var card=b.closest('[data-rfid]'); var id=card.getAttribute('data-rfid');
      var method=card.querySelector('[data-rf="method"]').value;
      var ref=(card.querySelector('[data-rf="reference"]').value||'').trim()||null;
      b.disabled=true; b.innerHTML='<span class="spin"></span>';
      sb.from('customer_payments').update({ status:'approved', method:method, reference:ref, approved_by:(state.user&&state.user.id)||null, approved_at:new Date().toISOString() }).eq('id',id).then(function(r){
        if(r.error){ b.disabled=false; b.innerHTML='Approve & process'; toast('Could not approve.'); console.error(r.error); return; }
        var p=rfList.filter(function(x){return x.id===id;})[0];
        logFinance('customer_payment', p?p.application_id:null, 'refund-approve', 'Approved refund '+money(p?p.amount:0));
        toast('Refund approved'); renderRefunds();
      });
    }; });
    area.querySelectorAll('[data-rf="reject"]').forEach(function(b){ b.onclick=function(){
      var card=b.closest('[data-rfid]'); var id=card.getAttribute('data-rfid');
      var reason=window.prompt('Reason for rejecting this refund request?'); if(reason===null) return;
      b.disabled=true; b.innerHTML='<span class="spin"></span>';
      sb.from('customer_payments').update({ status:'rejected', reject_reason:(reason||'').trim()||null, approved_by:(state.user&&state.user.id)||null, approved_at:new Date().toISOString() }).eq('id',id).then(function(r){
        if(r.error){ b.disabled=false; b.innerHTML='Reject'; toast('Could not reject.'); console.error(r.error); return; }
        var p=rfList.filter(function(x){return x.id===id;})[0];
        logFinance('customer_payment', p?p.application_id:null, 'refund-reject', 'Rejected refund '+money(p?p.amount:0)+(reason?(' — '+reason):''));
        toast('Refund rejected'); renderRefunds();
      });
    }; });
  }

  // ============================================================
  //  FINANCE REPORTS (Finance) — pending payments, outstanding, margins + CSV
  // ============================================================
  var frFilters={ from:'', to:'', visa:'', supplier:'', custpay:'all', status:'all' }, frFiltersOpen=false, frData=null;
  function frActiveCount(){ var f=frFilters,n=0; if(f.from||f.to)n++; if(f.visa)n++; if(f.supplier)n++; if(f.custpay&&f.custpay!=='all')n++; if(f.status&&f.status!=='all')n++; return n; }
  function renderFinReports(){
    if(!isFinance()){ go(defaultStaffView()); return; }
    if(!VISAS.length) loadVisaTypes();
    root.innerHTML='<div class="app-main">'+adminSections('reports')+
      '<div class="app-head"><h1>Finance reports</h1><p>Pending payments, supplier outstanding and margins. Filter, then download any table as CSV.</p></div>'+
      '<div style="margin-bottom:14px">'+
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+
          '<button class="btn btn-ghost" id="frFiltersBtn" type="button">Filters'+(frActiveCount()?(' ('+frActiveCount()+')'):'')+'</button>'+
          '<button class="link-btn" id="frClear" type="button" style="margin-left:auto;display:'+(frActiveCount()?'inline':'none')+'">Clear all</button>'+
        '</div>'+
        '<div id="frFilterPanel" class="panel" style="margin-top:12px;'+(frFiltersOpen?'':'display:none')+'">'+
          '<div class="grid2">'+
            '<div class="field"><label>From date</label><input id="frFrom" type="date" value="'+esc(frFilters.from)+'"></div>'+
            '<div class="field"><label>To date</label><input id="frTo" type="date" value="'+esc(frFilters.to)+'"></div>'+
            '<div class="field"><label>Visa type</label><select id="frVisa"><option value="">All visa types</option>'+VISAS.map(function(v){return '<option value="'+esc(v.id)+'"'+(frFilters.visa===v.id?' selected':'')+'>'+esc(v.name)+'</option>';}).join('')+'</select></div>'+
            '<div class="field"><label>Customer payment</label><select id="frCustpay">'+[['all','All payment statuses'],['unpaid','Unpaid'],['partial','Partial'],['paid','Paid'],['refunded','Refunded'],['advance','Advance (paid, not billed)']].map(function(o){return '<option value="'+o[0]+'"'+(frFilters.custpay===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select></div>'+
            '<div class="field"><label>Supplier</label><select id="frSupplier"><option value="">All suppliers</option></select></div>'+
            '<div class="field"><label>Application status</label><select id="frStatus"><option value="all">All statuses</option>'+ALL_STATUSES.map(function(s){return '<option value="'+esc(s)+'"'+(frFilters.status===s?' selected':'')+'>'+esc(s)+'</option>';}).join('')+'</select></div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div id="frArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('frFiltersBtn').onclick=function(){ frFiltersOpen=!frFiltersOpen; document.getElementById('frFilterPanel').style.display=frFiltersOpen?'':'none'; };
    document.getElementById('frClear').onclick=function(){ frFilters={from:'',to:'',visa:'',supplier:'',custpay:'all',status:'all'}; renderFinReports(); };
    function fbind(id,key){ var el=document.getElementById(id); if(el) el.onchange=function(){ frFilters[key]=el.value; paintFinReports(); }; }
    fbind('frFrom','from'); fbind('frTo','to'); fbind('frVisa','visa'); fbind('frCustpay','custpay'); fbind('frSupplier','supplier'); fbind('frStatus','status');
    Promise.all([
      sb.from('application_finance').select('application_id, customer_total, total_cost, margin, customer_payment_status, applications(full_name,reference_code,visa_type,created_at)'),
      sb.from('customer_payments').select('application_id, kind, amount, status'),
      sb.from('suppliers').select('id,name,opening_balance'),
      sb.from('application_cost_lines').select('application_id, supplier_id, cost, invoice_no, remarks, applications(full_name,passport_number,visa_type,status,reference_code,created_at)'),
      sb.from('supplier_payments').select('supplier_id, amount'),
      (countryList.length?Promise.resolve(true):loadCountriesGroups())
    ]).then(function(res){
      var area=document.getElementById('frArea'); if(!area) return;
      if(res[0].error){ area.innerHTML='<div class="empty-state"><p>Could not load reports.</p></div>'; console.error(res[0].error); return; }
      frData={ afs:res[0].data||[], pays:res[1].data||[], sups:res[2].data||[], lines:res[3].data||[], sppays:res[4].data||[] };
      var ssel=document.getElementById('frSupplier'); if(ssel) ssel.innerHTML='<option value="">All suppliers</option>'+frData.sups.map(function(s){return '<option value="'+esc(s.id)+'"'+(frFilters.supplier===s.id?' selected':'')+'>'+esc(s.name)+'</option>';}).join('');
      paintFinReports();
    });
  }
  function paintFinReports(){
    var area=document.getElementById('frArea'); if(!area||!frData) return;
    var fbn=document.getElementById('frFiltersBtn'); if(fbn) fbn.textContent='Filters'+(frActiveCount()?(' ('+frActiveCount()+')'):'');
    var fcl=document.getElementById('frClear'); if(fcl) fcl.style.display=frActiveCount()?'inline':'none';
    var f=frFilters, afs=frData.afs, pays=frData.pays, sups=frData.sups, lines=frData.lines, sppays=frData.sppays;
    var vn=function(slug){ return (visaById(slug)?visaById(slug).name:slug)||''; };
    function section(title,csvId,inner){ return '<div style="margin-bottom:22px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><h3 style="font-size:16px;font-weight:800;margin:0">'+esc(title)+'</h3><button class="btn btn-ghost" id="'+csvId+'">Download CSV</button></div>'+inner+'</div>'; }
    function emptyMsg(m){ return '<div class="panel empty-state"><p>'+esc(m)+'</p></div>'; }
    function tbl(headers, rows){ return '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="color:var(--muted)">'+headers.map(function(h,i){return '<th style="padding:0 8px 4px 0;text-align:'+(i>0?'right':'left')+'">'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return '<td style="padding:5px 8px 5px 0;border-top:1px solid var(--line)'+(i>0?';text-align:right':'')+'">'+esc(c)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>'; }
    function wireCsv(id,fname,headers,rows){ var b=document.getElementById(id); if(b) b.onclick=function(){ downloadCsv(fname,headers,rows); }; }
    var netByApp={}; pays.forEach(function(p){ if((p.status||'approved')!=='approved') return; netByApp[p.application_id]=(netByApp[p.application_id]||0)+(p.kind==='refund'?-Number(p.amount||0):Number(p.amount||0)); });
    var payable={}, paid={}; lines.forEach(function(l){ if(l.supplier_id) payable[l.supplier_id]=(payable[l.supplier_id]||0)+Number(l.cost||0); }); sppays.forEach(function(p){ if(p.supplier_id) paid[p.supplier_id]=(paid[p.supplier_id]||0)+Number(p.amount||0); });
    var supByApp={}; lines.forEach(function(l){ if(l.application_id&&l.supplier_id){ (supByApp[l.application_id]=supByApp[l.application_id]||{})[l.supplier_id]=true; } });
    function appPass(fr){ var app=fr.applications||{};
      if(f.visa && app.visa_type!==f.visa) return false;
      if(f.custpay&&f.custpay!=='all'){
        if(f.custpay==='advance'){ if(Number(fr.customer_total||0)>0 || (netByApp[fr.application_id]||0)<=0) return false; }
        else if((fr.customer_payment_status||'')!==f.custpay) return false;
      }
      var day=(app.created_at||'').slice(0,10); if(f.from && day<f.from) return false; if(f.to && day>f.to) return false;
      if(f.supplier){ var m=supByApp[fr.application_id]||{}; if(!m[f.supplier]) return false; }
      return true;
    }
    var fafs=afs.filter(appPass);
    var pendingCust=[]; fafs.forEach(function(fr){ var app=fr.applications||{}; var net=netByApp[fr.application_id]||0; var bal=Number(fr.customer_total||0)-net; if(bal>0.5) pendingCust.push({ name:app.full_name||'', ref:app.reference_code||'', visa:vn(app.visa_type), total:Number(fr.customer_total||0), paid:net, balance:bal, status:fr.customer_payment_status||'' }); });
    var appMargin=fafs.map(function(fr){ var app=fr.applications||{}; return { name:app.full_name||'', ref:app.reference_code||'', visa:vn(app.visa_type), selling:Number(fr.customer_total||0), cost:Number(fr.total_cost||0), margin:Number(fr.margin||0) }; });
    var vtMap={}; fafs.forEach(function(fr){ var app=fr.applications||{}; var v=vn(app.visa_type)||'(none)'; var m=vtMap[v]||(vtMap[v]={visa:v,count:0,margin:0,selling:0}); m.count++; m.margin+=Number(fr.margin||0); m.selling+=Number(fr.customer_total||0); });
    var vtRows=Object.keys(vtMap).map(function(k){return vtMap[k];}).sort(function(a,b){return b.margin-a.margin;});
    var supRows=sups.filter(function(s){ return !f.supplier || s.id===f.supplier; }).map(function(s){ var p=payable[s.id]||0, pd=paid[s.id]||0; var op=Number(s.opening_balance||0); return { name:s.name, opening:op, payable:p, paid:pd, outstanding:op+p-pd }; });
    var supPending=supRows.filter(function(r){return r.outstanding>0.5;});
    var sum=function(arr,k){ return arr.reduce(function(s,r){return s+Number(r[k]||0);},0); };
    var totReceivable=sum(pendingCust,'balance'), totPayable=sum(supPending,'outstanding'), totMargin=sum(appMargin,'margin');

    // Supplier-wise detailed report — one row per supplier cost line (matches the sample statement).
    var supName={}; sups.forEach(function(s){ supName[s.id]=s.name; });
    var vcty=function(slug){ var v=visaById(slug); return v?countryName(v.country_slug):''; };
    var detRows=[];
    lines.forEach(function(l){
      var app=l.applications||{};
      var day=(app.created_at||'').slice(0,10);
      if(f.from && day<f.from) return;
      if(f.to && day>f.to) return;
      if(f.supplier && l.supplier_id!==f.supplier) return;
      if(f.status && f.status!=='all' && (app.status||'')!==f.status) return;
      if(f.visa && app.visa_type!==f.visa) return;
      detRows.push({ date:day, name:app.full_name||'', passport:app.passport_number||'', visa:vn(app.visa_type), country:vcty(app.visa_type), supplier:(l.supplier_id?(supName[l.supplier_id]||''):''), invoice:l.invoice_no||'', cost:Number(l.cost||0), status:app.status||'', remarks:l.remarks||'', ref:app.reference_code||'' });
    });
    detRows.sort(function(a,b){ return (a.date<b.date?-1:(a.date>b.date?1:0)); });
    var detTotal=detRows.reduce(function(s,r){return s+r.cost;},0);
    var detHead=['#','Date','PAX Name','Passport','Visa Type','Country','Supplier','Invoice No.','Cost (₹)','Currency','Status','Remarks','App No.'];
    function detTable(){
      var th=detHead.map(function(h){ return '<th style="padding:6px 10px 6px 0;text-align:'+(h==='Cost (₹)'?'right':'left')+';white-space:nowrap;color:var(--muted);border-bottom:1px solid var(--line)">'+esc(h)+'</th>'; }).join('');
      var tr=detRows.map(function(r,i){
        var cells=[String(i+1), r.date, r.name, r.passport, r.visa, r.country, (r.supplier||'—'), (r.invoice||'—'), money(r.cost), 'INR', r.status, (r.remarks||'—'), r.ref];
        return '<tr>'+cells.map(function(c,ci){ return '<td style="padding:6px 10px 6px 0;border-top:1px solid var(--line);white-space:nowrap;text-align:'+(ci===8?'right':'left')+'">'+esc(c)+'</td>'; }).join('')+'</tr>';
      }).join('');
      return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr>'+th+'</tr></thead><tbody>'+tr+'</tbody></table></div>'+
        '<div class="phint" style="margin-top:8px">'+detRows.length+' cost lines · total supplier cost '+money(detTotal)+'</div>';
    }
    var detSection='<div style="margin-bottom:22px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px"><h3 style="font-size:16px;font-weight:800;margin:0">Supplier-wise detailed report</h3><button class="btn btn-ghost" id="frCsv5">Download CSV</button></div>'+
      (detRows.length? detTable() : emptyMsg('No supplier cost lines match your filters.'))+'</div>';

    area.innerHTML=
      '<div class="grid2" style="margin-bottom:8px">'+
        '<div class="panel" style="text-align:center"><div class="phint" style="margin:0">Receivable (customers owe)</div><div style="font-size:22px;font-weight:800;color:var(--red)">'+money(totReceivable)+'</div></div>'+
        '<div class="panel" style="text-align:center"><div class="phint" style="margin:0">Payable (we owe suppliers)</div><div style="font-size:22px;font-weight:800;color:var(--red)">'+money(totPayable)+'</div></div>'+
      '</div>'+
      '<div class="panel" style="text-align:center;margin-bottom:18px"><div class="phint" style="margin:0">Total margin (filtered applications)</div><div style="font-size:22px;font-weight:800;color:var(--green)">'+money(totMargin)+'</div></div>'+
      detSection+
      section('Pending customer payments','frCsv1', pendingCust.length? tbl(['Customer','Total','Paid','Balance','Status'], pendingCust.map(function(r){return [r.name+' ('+r.ref+')', money(r.total), money(r.paid), money(r.balance), r.status];})) : emptyMsg('No pending customer payments.'))+
      section('Supplier outstanding','frCsv2', supPending.length? tbl(['Supplier','Payable','Paid','Outstanding'], supPending.map(function(r){return [r.name, money(r.opening+r.payable), money(r.paid), money(r.outstanding)];})) : emptyMsg('No supplier dues.'))+
      section('Application margin','frCsv3', appMargin.length? tbl(['Application','Selling','Cost','Margin'], appMargin.map(function(r){return [r.name+' ('+r.ref+')', money(r.selling), money(r.cost), money(r.margin)];})) : emptyMsg('No finance entries match.'))+
      section('Visa-type margin','frCsv4', vtRows.length? tbl(['Visa type','Apps','Selling','Margin'], vtRows.map(function(r){return [r.visa, r.count, money(r.selling), money(r.margin)];})) : emptyMsg('No data.'));
    wireCsv('frCsv1','pending-customer-payments.csv',['Customer','Reference','Visa','Total','Paid','Balance','Status'], pendingCust.map(function(r){return [r.name,r.ref,r.visa,r.total,r.paid,r.balance,r.status];}));
    wireCsv('frCsv2','supplier-outstanding.csv',['Supplier','Opening','Payable','Paid','Outstanding'], supRows.map(function(r){return [r.name,r.opening,r.payable,r.paid,r.outstanding];}));
    wireCsv('frCsv3','application-margin.csv',['Customer','Reference','Visa','Selling','Cost','Margin'], appMargin.map(function(r){return [r.name,r.ref,r.visa,r.selling,r.cost,r.margin];}));
    wireCsv('frCsv4','visa-type-margin.csv',['Visa type','Applications','Selling','Margin'], vtRows.map(function(r){return [r.visa,r.count,r.selling,r.margin];}));
    wireCsv('frCsv5','supplier-wise-detailed-report.csv',
      ['Sl. No.','Application Date','PAX Name','Passport No.','Visa Type','Country','Supplier Name','Supplier Invoice No.','Supplier Cost','Currency','Status','Remarks','Visadoo Application No.'],
      detRows.map(function(r,i){ return [i+1, r.date, r.name, r.passport, r.visa, r.country, r.supplier, r.invoice, r.cost, 'INR', r.status, r.remarks, r.ref]; }));
  }

  // ============================================================
  //  TEAM MANAGEMENT (admins only)
  // ============================================================
  var ROLE_OPTS=[['agent','Agent / Processor'],['finance','Finance'],['sales','Sales / Support'],['content','Content / SEO editor'],['viewer','Viewer (read-only)'],['admin','Admin (full access)']];
  function roleName(r){ var m={admin:'Admin',agent:'Agent',content:'Content / SEO',viewer:'Viewer',customer:'Customer',finance:'Finance',sales:'Sales / Support'}; return m[r]||r; }

  // Send an invitation = a one-tap sign-in link; clicking it signs them in with the role waiting in team_invites.
  function sendInviteEmail(email){
    return sb.auth.signInWithOtp({ email:email, options:{ shouldCreateUser:true, emailRedirectTo: emailLinkRedirectUrl('') } })
      .then(function(r){ if(r.error) console.error('invite email error', r.error); return !r.error; })
      .catch(function(e){ console.error(e); return false; });
  }

  function renderTeam(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('team')+
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap">'+
        '<div><h1>Team</h1><p>Add colleagues and control what each can access.</p></div>'+
        '<button class="btn btn-primary" id="teamAdd">+ Add team member</button>'+
      '</div>'+
      '<div id="teamArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('teamAdd').onclick=function(){ paintTeamAdd(); };
    loadTeam();
  }

  function loadTeam(){
    Promise.all([
      sb.from('profiles').select('id,email,full_name,role').neq('role','customer').order('role'),
      sb.from('team_invites').select('*').order('created_at')
    ]).then(function(res){
      var staff=(res[0].data)||[];
      var staffEmails=staff.map(function(s){return (s.email||'').toLowerCase();});
      var pending=((res[1].data)||[]).filter(function(i){ return staffEmails.indexOf((i.email||'').toLowerCase())===-1; });
      paintTeam(staff,pending);
    });
  }

  function paintTeam(staff,pending){
    var area=document.getElementById('teamArea'); if(!area) return;
    var html='';
    html+= staff.map(function(s){
      var isMe=s.id===state.user.id;
      var sel=ROLE_OPTS.map(function(o){ return '<option value="'+o[0]+'"'+(o[0]===s.role?' selected':'')+'>'+esc(o[1])+'</option>'; }).join('');
      return '<div class="admin-app" data-uid="'+esc(s.id)+'"><div class="arow">'+
        '<div><h4>'+esc(s.full_name||s.email)+(isMe?' <span class="status-pill sp-progress" style="font-size:11px">You</span>':'')+'</h4>'+
          '<div class="meta">'+esc(s.email)+' · '+roleName(s.role)+'</div></div>'+
        '<div style="display:flex;gap:8px;align-items:center">'+
          (isMe?'<span class="meta">Your account</span>':
            '<select data-role-for="'+esc(s.id)+'" data-role-email="'+esc(s.email||'')+'" data-role-old="'+esc(s.role||'')+'">'+sel+'</select>'+
            '<button class="btn btn-ghost" data-remove="'+esc(s.id)+'" data-remove-email="'+esc(s.email||'')+'" data-remove-old="'+esc(s.role||'')+'" style="color:var(--red)">Remove</button>')+
        '</div></div></div>';
    }).join('');
    if(pending.length){
      html+='<h3 style="margin:24px 0 12px;font-size:16px">Invited — waiting for first sign-in</h3>';
      html+=pending.map(function(i){
        return '<div class="admin-app"><div class="arow"><div><h4>'+esc(i.email)+'</h4>'+
          '<div class="meta">Invited as '+roleName(i.role)+' · they get access when they first sign in with this email</div></div>'+
          '<div style="display:flex;gap:8px"><button class="btn btn-ghost" data-resend="'+esc(i.email)+'">Resend invite</button>'+
          '<button class="btn btn-ghost" data-cancel="'+esc(i.email)+'" style="color:var(--red)">Cancel invite</button></div></div></div>';
      }).join('');
    }
    if(!staff.length && !pending.length) html='<div class="panel empty-state"><p>Just you so far. Click “Add team member” to invite a colleague.</p></div>';
    area.innerHTML=html;

    area.querySelectorAll('[data-role-for]').forEach(function(sel){
      sel.onchange=function(){
        var id=sel.getAttribute('data-role-for');
        var oldRole=sel.getAttribute('data-role-old')||'', email=sel.getAttribute('data-role-email')||'', newRole=sel.value;
        sb.rpc('set_user_role',{target_id:id,new_role:newRole}).then(function(r){
          if(r.error){ toast('Could not change role.'); console.error(r.error); return; }
          logAudit({ module:'Staff & Roles', action:'role_change', record_type:'profile', record_id:id, record_ref:email, field:'role', old_value:oldRole, new_value:newRole, remarks:'Role changed', risk:'high' });
          toast('Role updated'); loadTeam();
        });
      };
    });
    area.querySelectorAll('[data-remove]').forEach(function(b){
      b.onclick=function(){
        if(!window.confirm('Remove this person\'s team access? They become a normal customer account.')) return;
        var rid=b.getAttribute('data-remove'), remail=b.getAttribute('data-remove-email')||'', rold=b.getAttribute('data-remove-old')||'';
        sb.rpc('set_user_role',{target_id:rid,new_role:'customer'}).then(function(r){
          if(r.error){ toast('Could not remove.'); console.error(r.error); return; }
          logAudit({ module:'Staff & Roles', action:'role_change', record_type:'profile', record_id:rid, record_ref:remail, field:'role', old_value:rold, new_value:'customer', remarks:'Team access removed', risk:'high' });
          toast('Access removed'); loadTeam();
        });
      };
    });
    area.querySelectorAll('[data-resend]').forEach(function(b){
      b.onclick=function(){
        b.disabled=true; b.innerHTML='<span class="spin"></span>';
        sendInviteEmail(b.getAttribute('data-resend')).then(function(ok){
          b.disabled=false; b.innerHTML='Resend invite';
          toast(ok?'Invitation email sent':'Sent — if it doesn’t arrive, check spam or try again shortly');
        });
      };
    });
    area.querySelectorAll('[data-cancel]').forEach(function(b){
      b.onclick=function(){
        sb.from('team_invites').delete().eq('email',b.getAttribute('data-cancel')).then(function(r){
          if(r.error){ toast('Could not cancel.'); return; }
          toast('Invite cancelled'); loadTeam();
        });
      };
    });
  }

  function paintTeamAdd(){
    var area=document.getElementById('teamArea'); if(!area) return;
    var sel=ROLE_OPTS.map(function(o){ return '<option value="'+o[0]+'">'+esc(o[1])+'</option>'; }).join('');
    area.innerHTML='<div class="panel">'+
      '<h3>Add team member</h3>'+
      '<p class="phint">Enter their email and choose a role. They sign in with the email-link method like everyone else; their access applies the moment they sign in.</p>'+
      '<div class="grid2">'+
        '<div class="field"><label>Email</label><input id="tmEmail" type="email" placeholder="colleague@email.com"></div>'+
        '<div class="field"><label>Role</label><select id="tmRole" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px">'+sel+'</select></div>'+
      '</div>'+
      '<div class="signin-msg" id="tmMsg"></div>'+
      '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="tmSave">Add member</button><button class="btn btn-ghost" id="tmCancel">Cancel</button></div>'+
    '</div>';
    document.getElementById('tmCancel').onclick=function(){ loadTeam(); };
    var saveBtn=document.getElementById('tmSave');
    saveBtn.onclick=function(){
      var email=document.getElementById('tmEmail').value.trim().toLowerCase();
      var role=document.getElementById('tmRole').value;
      var msg=document.getElementById('tmMsg');
      if(!/.+@.+\..+/.test(email)){ msg.className='signin-msg err'; msg.textContent='Please enter a valid email.'; return; }
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span> Adding…';
      // if the person already has an account, set their role directly; otherwise create a pending invite
      sb.from('profiles').select('id').eq('email',email).maybeSingle().then(function(p){
        if(p.data && p.data.id){
          return sb.rpc('set_user_role',{target_id:p.data.id,new_role:role}).then(function(r){ if(r.error) throw r.error; return 'existing'; });
        }
        return sb.from('team_invites').upsert({email:email,role:role}).then(function(r){ if(r.error) throw r.error;
          return sendInviteEmail(email).then(function(){ return 'invited'; }); });
      }).then(function(kind){
        saveBtn.disabled=false; saveBtn.innerHTML='Add member';
        toast(kind==='existing'?'Role assigned (they already have an account)':'Invitation email sent — they just click the link to join');
        loadTeam();
      }).catch(function(err){
        saveBtn.disabled=false; saveBtn.innerHTML='Add member';
        msg.className='signin-msg err'; msg.textContent='Could not add. Please try again.'; console.error(err);
      });
    };
  }

  // ============================================================
  //  DESTINATIONS (countries + groups managers)
  // ============================================================
  var destTab='countries', cEditing=null, gEditing=null;
  function flagImg(iso2){ return iso2 ? ('https://flagcdn.com/w40/'+iso2.toLowerCase()+'.png') : ''; }

  function renderDestinationsAdmin(){
    if(!canManageContent()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('destinations')+
      '<div class="app-head"><h1>Destinations</h1><p>Manage the countries customers can apply for, and the groups they’re shown in (like Schengen).</p></div>'+
      '<div class="subnav" id="destToggle" style="margin-bottom:18px">'+
        '<button data-dt="countries" class="'+(destTab==='countries'?'active':'')+'">Countries</button>'+
        '<button data-dt="groups" class="'+(destTab==='groups'?'active':'')+'">Groups</button>'+
      '</div>'+
      '<div id="destArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    root.querySelectorAll('#destToggle button').forEach(function(b){ b.onclick=function(){ destTab=b.getAttribute('data-dt'); cEditing=null; gEditing=null; renderDestinationsAdmin(); }; });
    Promise.all([loadCountriesGroups(), loadVisaTypes()]).then(paintDest);
  }
  function paintDest(){ var area=document.getElementById('destArea'); if(!area) return; if(destTab==='groups') paintGroups(area); else paintCountries(area); }

  // ---- Countries ----
  function paintCountries(area){
    if(cEditing){ area.innerHTML=countryFormHtml(cEditing); wireCountryForm(); return; }
    var rows = countryList.map(function(c){
      var vn = VISAS.filter(function(v){return v.country_slug===c.slug;}).length; // VISAS only has active; ok rough
      return '<div class="admin-app"><div class="arow">'+
        '<div style="display:flex;align-items:center;gap:12px">'+
          (c.iso2?'<img src="'+flagImg(c.iso2)+'" style="width:34px;height:23px;border-radius:3px;object-fit:cover" alt="">':'')+
          '<div><h4>'+esc(c.name)+' '+(c.featured?'<span class="status-pill sp-progress" style="font-size:11px">Featured</span> ':'')+(c.active?'':'<span class="status-pill sp-action" style="font-size:11px">Hidden</span>')+'</h4>'+
          '<div class="meta">'+(c.group_slug?('Group: '+esc(c.group_slug)+' · '):'')+'/country/'+esc(c.slug)+'</div></div>'+
        '</div>'+
        '<div style="display:flex;gap:8px"><button class="btn btn-ghost" data-cedit="'+esc(c.id)+'">Edit</button>'+
          '<button class="btn btn-ghost" data-cdel="'+esc(c.id)+'" style="color:var(--red)">Delete</button></div>'+
      '</div></div>';
    }).join('');
    area.innerHTML='<div style="margin-bottom:14px"><button class="btn btn-primary" id="cAdd">+ Add country</button></div>'+(rows||'<div class="panel empty-state"><p>No countries yet.</p></div>');
    document.getElementById('cAdd').onclick=function(){ cEditing={id:null,name:'',iso2:'',group_slug:'',summary:'',blurb:'',seo_title:'',seo_description:'',featured:false,active:true,sort_order:(countryList.length+1)}; paintDest(); };
    area.querySelectorAll('[data-cedit]').forEach(function(b){ b.onclick=function(){ cEditing=JSON.parse(JSON.stringify(countryList.filter(function(x){return x.id===b.getAttribute('data-cedit');})[0])); paintDest(); }; });
    area.querySelectorAll('[data-cdel]').forEach(function(b){ b.onclick=function(){ countryDelete(b.getAttribute('data-cdel')); }; });
  }
  function countryFormHtml(c){
    var groupOpts='<option value="">— No group —</option>'+groupList.map(function(g){ return '<option value="'+esc(g.slug)+'"'+(g.slug===c.group_slug?' selected':'')+'>'+esc(g.name)+'</option>'; }).join('');
    return '<div class="panel"><h3>'+(c.id?'Edit country':'New country')+'</h3>'+
      '<div class="grid2">'+
        '<div class="field"><label>Country name <span class="req-star">*</span></label><input id="cName" type="text" value="'+esc(c.name)+'" placeholder="e.g. Thailand"></div>'+
        '<div class="field"><label>Country code (for the flag)</label><input id="cIso" type="text" maxlength="2" value="'+esc(c.iso2||'')+'" placeholder="2 letters, e.g. TH, US, FR"></div>'+
        '<div class="field"><label>Group</label><select id="cGroup" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px">'+groupOpts+'</select></div>'+
        '<div class="field"><label>Display order</label><input id="cSort" type="number" value="'+esc(c.sort_order)+'"></div>'+
      '</div>'+
      '<div class="field"><label>Short summary (shown on the country page &amp; cards)</label><textarea id="cSummary" style="min-height:64px" placeholder="One friendly line about visas for this country.">'+esc(c.summary||'')+'</textarea></div>'+
      '<div class="field"><label>Card image (optional)</label><div class="img-drop"><div class="img-thumb" id="cImgThumb" style="width:84px;height:54px">'+(c.image_url?'<img src="'+esc(c.image_url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">':IMGICON)+'</div>'+
        '<div><button type="button" class="btn btn-ghost" id="cImgBtn">'+(c.image_url?'Replace image':'Upload image')+'</button>'+(c.image_url?' <button type="button" class="link-btn" id="cImgRm" style="color:var(--red)">Remove</button>':'')+'<div class="phint" style="margin:6px 0 0">Shown on the homepage card instead of the flag. Leave empty to use the flag.</div></div>'+
        '<input type="file" id="cImgFile" accept="image/*" style="display:none"></div></div>'+
      '<div class="field"><label>Image description (alt text)</label><input id="cImgAlt" type="text" value="'+esc(c.image_alt||'')+'" placeholder="e.g. Sheikh Zayed Mosque, Abu Dhabi"><div class="phint" style="margin-top:4px">Describes the image for Google &amp; screen readers. Leave blank to use the country name.</div></div>'+
      '<div class="grid2">'+
        '<div class="field"><label>SEO title (optional)</label><input id="cSeoT" type="text" value="'+esc(c.seo_title||'')+'" placeholder="Leave blank for a sensible default"></div>'+
        '<div class="field"><label>SEO description (optional)</label><input id="cSeoD" type="text" value="'+esc(c.seo_description||'')+'"></div>'+
      '</div>'+
      '<div class="field">'+
        '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer"><input id="cFeat" type="checkbox" '+(c.featured?'checked':'')+' style="width:auto"> Feature on homepage</label>'+
        '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer;margin-top:10px"><input id="cActive" type="checkbox" '+(c.active?'checked':'')+' style="width:auto"> Show on site</label>'+
      '</div>'+
      '<div class="signin-msg" id="cMsg"></div>'+
      '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="cSave">'+(c.id?'Save country':'Create country')+'</button><button class="btn btn-ghost" id="cCancel">Cancel</button></div>'+
    '</div>';
  }
  function wireCountryForm(){
    document.getElementById('cCancel').onclick=function(){ cEditing=null; paintDest(); };
    var cImageUrl = cEditing.image_url||null;
    (function(){
      var file=document.getElementById('cImgFile'), btn=document.getElementById('cImgBtn'), rm=document.getElementById('cImgRm');
      btn.onclick=function(){ file.click(); };
      if(rm) rm.onclick=function(){ cImageUrl=null; document.getElementById('cImgThumb').innerHTML=IMGICON; rm.style.display='none'; };
      file.onchange=function(){ var f=file.files[0]; if(!f) return; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
        uploadPublicImage(f,'country/'+(cEditing.slug||'new')).then(function(url){ btn.disabled=false; btn.innerHTML='Replace image'; cImageUrl=url; document.getElementById('cImgThumb').innerHTML='<img src="'+esc(url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">'; })
        .catch(function(err){ btn.disabled=false; btn.innerHTML='Upload image'; toast((err&&err.code==='decode')?'Use a JPG or PNG (HEIC won’t work).':'Could not upload that image.'); });
      };
    })();
    var saveBtn=document.getElementById('cSave');
    saveBtn.onclick=function(){
      var name=document.getElementById('cName').value.trim();
      var msg=document.getElementById('cMsg');
      if(!name){ msg.className='signin-msg err'; msg.textContent='Please enter the country name.'; return; }
      var payload={ name:name, iso2:(document.getElementById('cIso').value.trim().toUpperCase()||null), group_slug:document.getElementById('cGroup').value||null,
        summary:document.getElementById('cSummary').value.trim()||null, image_url:cImageUrl, image_alt:document.getElementById('cImgAlt').value.trim()||null, seo_title:document.getElementById('cSeoT').value.trim()||null, seo_description:document.getElementById('cSeoD').value.trim()||null,
        featured:document.getElementById('cFeat').checked, active:document.getElementById('cActive').checked, sort_order:parseInt(document.getElementById('cSort').value,10)||0 };
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span>';
      var op;
      if(cEditing.id){ op=sb.from('countries').update(payload).eq('id',cEditing.id); }
      else { payload.slug=uniqueSlugIn(slugify(name), countryList); op=sb.from('countries').insert(payload); }
      op.then(function(r){ saveBtn.disabled=false; saveBtn.innerHTML='Save';
        if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        logAudit({ module:'Catalogue', action:(cEditing.id?'edit':'create'), record_type:'country', record_ref:name, remarks:'Destination saved', risk:'normal' });
        toast('Country saved'); cEditing=null; renderDestinationsAdmin();
      });
    };
  }
  function countryDelete(id){
    var c=countryList.filter(function(x){return x.id===id;})[0]; if(!c) return;
    if(!window.confirm('Delete “'+c.name+'”? This also removes its visa options. This cannot be undone.')) return;
    sb.from('countries').delete().eq('id',id).then(function(r){ if(r.error){ toast('Could not delete.'); console.error(r.error); return; } logAudit({ module:'Catalogue', action:'delete', record_type:'country', record_ref:c.name, remarks:'Destination deleted', risk:'high' }); toast('Country deleted'); loadVisaTypes(); renderDestinationsAdmin(); });
  }

  // ---- Groups ----
  function paintGroups(area){
    if(gEditing){ area.innerHTML=groupFormHtml(gEditing); wireGroupForm(); return; }
    var rows=groupList.map(function(g){
      var members=countryList.filter(function(c){return c.group_slug===g.slug;}).length;
      return '<div class="admin-app"><div class="arow">'+
        '<div><h4>'+esc(g.name)+(g.active?'':' <span class="status-pill sp-action" style="font-size:11px">Hidden</span>')+'</h4>'+
        '<div class="meta">'+members+' countries'+(g.description?(' · '+esc(g.description)):'')+'</div></div>'+
        '<div style="display:flex;gap:8px"><button class="btn btn-ghost" data-gedit="'+esc(g.id)+'">Edit</button>'+
          '<button class="btn btn-ghost" data-gdel="'+esc(g.id)+'" style="color:var(--red)">Delete</button></div>'+
      '</div></div>';
    }).join('');
    area.innerHTML='<div style="margin-bottom:14px"><button class="btn btn-primary" id="gAdd">+ Add group</button></div>'+(rows||'<div class="panel empty-state"><p>No groups yet. Create one (e.g. Schengen) and assign countries to it.</p></div>');
    document.getElementById('gAdd').onclick=function(){ gEditing={id:null,name:'',description:'',active:true,sort_order:(groupList.length+1)}; paintDest(); };
    area.querySelectorAll('[data-gedit]').forEach(function(b){ b.onclick=function(){ gEditing=JSON.parse(JSON.stringify(groupList.filter(function(x){return x.id===b.getAttribute('data-gedit');})[0])); paintDest(); }; });
    area.querySelectorAll('[data-gdel]').forEach(function(b){ b.onclick=function(){ groupDelete(b.getAttribute('data-gdel')); }; });
  }
  function groupFormHtml(g){
    return '<div class="panel"><h3>'+(g.id?'Edit group':'New group')+'</h3>'+
      '<div class="field"><label>Group name <span class="req-star">*</span></label><input id="gName" type="text" value="'+esc(g.name)+'" placeholder="e.g. Schengen"></div>'+
      '<div class="field"><label>Description</label><textarea id="gDesc" style="min-height:64px" placeholder="A short line shown above the group on the homepage.">'+esc(g.description||'')+'</textarea></div>'+
      '<div class="grid2"><div class="field"><label>Display order</label><input id="gSort" type="number" value="'+esc(g.sort_order)+'"></div>'+
        '<div class="field"><label>&nbsp;</label><label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer;padding-top:10px"><input id="gActive" type="checkbox" '+(g.active?'checked':'')+' style="width:auto"> Show on site</label></div></div>'+
      '<p class="phint">After saving, assign countries to this group by editing each country and choosing it under “Group”.</p>'+
      '<div class="signin-msg" id="gMsg"></div>'+
      '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="gSave">'+(g.id?'Save group':'Create group')+'</button><button class="btn btn-ghost" id="gCancel">Cancel</button></div>'+
    '</div>';
  }
  function wireGroupForm(){
    document.getElementById('gCancel').onclick=function(){ gEditing=null; paintDest(); };
    var saveBtn=document.getElementById('gSave');
    saveBtn.onclick=function(){
      var name=document.getElementById('gName').value.trim(); var msg=document.getElementById('gMsg');
      if(!name){ msg.className='signin-msg err'; msg.textContent='Please enter the group name.'; return; }
      var payload={ name:name, description:document.getElementById('gDesc').value.trim()||null, active:document.getElementById('gActive').checked, sort_order:parseInt(document.getElementById('gSort').value,10)||0 };
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span>';
      var op = gEditing.id ? sb.from('visa_groups').update(payload).eq('id',gEditing.id) : (function(){ payload.slug=uniqueSlugIn(slugify(name), groupList); return sb.from('visa_groups').insert(payload); })();
      op.then(function(r){ saveBtn.disabled=false; saveBtn.innerHTML='Save';
        if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        logAudit({ module:'Catalogue', action:(gEditing.id?'edit':'create'), record_type:'visa_group', record_ref:name, remarks:'Group saved', risk:'normal' });
        toast('Group saved'); gEditing=null; renderDestinationsAdmin();
      });
    };
  }
  function groupDelete(id){
    var g=groupList.filter(function(x){return x.id===id;})[0]; if(!g) return;
    if(!window.confirm('Delete the “'+g.name+'” group? Countries in it stay, but are no longer grouped.')) return;
    sb.from('visa_groups').delete().eq('id',id).then(function(r){ if(r.error){ toast('Could not delete.'); return; } logAudit({ module:'Catalogue', action:'delete', record_type:'visa_group', record_ref:g.name, remarks:'Group deleted', risk:'high' }); toast('Group deleted'); renderDestinationsAdmin(); });
  }

  function uniqueSlugIn(base, list){ var ex=list.map(function(x){return x.slug;}); var s=base||'item', i=2; while(ex.indexOf(s)>-1){ s=(base||'item')+'-'+i; i++; } return s; }

  // ============================================================
  //  SITE SEO (homepage SEO + Google verification + default share image)
  // ============================================================
  var HOME_SEO_DEFAULTS = {
    title: 'Visa Doo — UAE Tourist Visas, Made Simple',
    desc: 'Apply for your UAE tourist visa online with Visa Doo. Fast, secure, 100% online. Track your application every step of the way.'
  };

  function renderSiteSeo(){
    if(!canManageContent()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('siteseo')+
      '<div class="app-head"><h1>Site SEO</h1><p>Control your homepage’s Google &amp; social appearance, connect Google, and set a default share image.</p></div>'+
      '<div id="ssArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    sb.from('site_settings').select('*').eq('id','global').single().then(function(r){ paintSiteSeo(r.data||{}); });
  }

  function paintSiteSeo(s){
    var area=document.getElementById('ssArea'); if(!area) return;
    var vals={ seo_title:s.home_seo_title||'', seo_description:s.home_seo_description||'', focus_keyword:s.home_focus_keyword||'', social_image:s.home_social_image||'' };
    var defImg=s.default_social_image||'';
    var gv=s.google_verification||'';
    area.innerHTML=
      // Homepage SEO
      '<div class="panel"><h3>Homepage SEO</h3><p class="phint">How your main page (visadoo-uae.netlify.app) looks in Google and when shared.</p>'+
        '<div class="seo-grid"><div>'+
          '<div class="field"><label>Focus keyword</label><input id="ssKw" type="text" value="'+esc(vals.focus_keyword)+'" placeholder="e.g. uae tourist visa"></div>'+
          '<div class="field"><label>SEO title</label><input id="ssTitle" type="text" value="'+esc(vals.seo_title)+'" placeholder="'+esc(HOME_SEO_DEFAULTS.title)+'"><div class="char-counter" id="ssTitleCount"></div></div>'+
          '<div class="field"><label>Meta description</label><textarea id="ssDesc" style="min-height:90px" placeholder="'+esc(HOME_SEO_DEFAULTS.desc)+'">'+esc(vals.seo_description)+'</textarea><div class="char-counter" id="ssDescCount"></div></div>'+
          '<div class="field"><label>Homepage share image</label><div class="img-drop"><div class="img-thumb" id="ssThumb">'+(vals.social_image?'<img src="'+esc(vals.social_image)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">':IMGICON)+'</div>'+
            '<div><button type="button" class="btn btn-ghost" id="ssImgBtn">'+(vals.social_image?'Replace image':'Upload image')+'</button><div class="phint" style="margin:6px 0 0">Best 1200 × 630.</div></div>'+
            '<input type="file" id="ssImgFile" accept="image/*" style="display:none"></div></div>'+
        '</div><div>'+
          '<div class="seo-score-ring"><div class="ring" id="ssRing"><span id="ssScore">0</span></div><div class="lbl"><b>SEO score</b><div id="ssScoreText"></div></div></div>'+
          '<div class="preview-label">Google result preview</div>'+
          '<div class="gpreview"><div class="gp-url"><span class="dot">VD</span><div class="gp-crumb">visadoo-uae.netlify.app</div></div><div class="gp-title" id="ssGpTitle"></div><div class="gp-desc" id="ssGpDesc"></div></div>'+
          '<div class="preview-label">Social share preview</div>'+
          '<div class="spreview"><div class="sp-img" id="ssSpImg">'+IMGICON+'</div><div class="sp-body"><div class="sp-site">visadoo-uae.netlify.app</div><div class="sp-title" id="ssSpTitle"></div><div class="sp-desc" id="ssSpDesc"></div></div></div>'+
          '<ul class="seo-checks" id="ssChecks"></ul>'+
        '</div></div>'+
      '</div>'+
      // Default share image
      '<div class="panel"><h3>Default share image</h3><p class="phint">Used when a visa or article page has no image of its own, so every shared link still looks good.</p>'+
        '<div class="img-drop"><div class="img-thumb" id="ssDefThumb" style="width:120px;height:64px">'+(defImg?'<img src="'+esc(defImg)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">':IMGICON)+'</div>'+
          '<div><button type="button" class="btn btn-ghost" id="ssDefBtn">'+(defImg?'Replace image':'Upload image')+'</button><div class="phint" style="margin:6px 0 0">Best 1200 × 630.</div></div>'+
          '<input type="file" id="ssDefFile" accept="image/*" style="display:none"></div>'+
      '</div>'+
      // Google verification
      '<div class="panel"><h3>Connect Google Search Console</h3>'+
        '<p class="phint">Paste the verification code Google gives you (the part inside content="…" of the HTML-tag method). This proves to Google you own the site so you can see your search performance.</p>'+
        '<div class="field"><label>Google verification code</label><input id="ssGv" type="text" value="'+esc(gv)+'" placeholder="e.g. AbCdEf123..."></div>'+
        '<a href="https://search.google.com/search-console" target="_blank" rel="noopener" class="link-btn" style="padding-left:0">Open Google Search Console ↗</a>'+
      '</div>'+
      '<div class="signin-msg" id="ssMsg"></div>'+
      '<button class="btn btn-primary btn-lg" id="ssSave">Save site SEO</button>';

    // ---- live homepage SEO previews ----
    function recompute(){
      vals.seo_title=document.getElementById('ssTitle').value; vals.seo_description=document.getElementById('ssDesc').value; vals.focus_keyword=document.getElementById('ssKw').value;
      var res=computeSeo(vals, 'home', HOME_SEO_DEFAULTS);
      document.getElementById('ssGpTitle').textContent=res.title; document.getElementById('ssGpDesc').textContent=res.desc;
      document.getElementById('ssSpTitle').textContent=res.title; document.getElementById('ssSpDesc').textContent=res.desc;
      function setCount(id,len,lo,hi){ var e=document.getElementById(id); e.textContent=len+' characters'; e.className='char-counter '+((len>=lo&&len<=hi)?'ok':((len>0&&len<lo)?'warn':(len>hi?'bad':''))); }
      setCount('ssTitleCount',(vals.seo_title||HOME_SEO_DEFAULTS.title).length,40,60);
      setCount('ssDescCount',(vals.seo_description||HOME_SEO_DEFAULTS.desc).length,120,160);
      var ring=document.getElementById('ssRing'); ring.className='ring '+res.color; ring.style.setProperty('--deg',(res.score*3.6)+'deg');
      document.getElementById('ssScore').textContent=res.score;
      document.getElementById('ssScoreText').textContent=res.score>=70?'Great — well optimised.':(res.score>=40?'Good start.':'Needs work.');
      document.getElementById('ssChecks').innerHTML=res.checks.map(function(c){ var ic=c.state==='pass'?CHECK:(c.state==='warn'?'!':XCROSS); return '<li class="'+c.state+'"><span class="ci">'+(c.state==='warn'?'!':ic)+'</span><span>'+esc(c.text)+'</span></li>'; }).join('');
    }
    function setHomeImg(url){ vals.social_image=url; document.getElementById('ssThumb').innerHTML=url?('<img src="'+esc(url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">'):IMGICON;
      var sp=document.getElementById('ssSpImg'); if(url){ sp.style.backgroundImage='url('+url+')'; sp.innerHTML=''; } else { sp.style.backgroundImage=''; sp.innerHTML=IMGICON; } recompute(); }
    ['ssTitle','ssDesc','ssKw'].forEach(function(id){ document.getElementById(id).addEventListener('input',recompute); });

    function wireImg(btnId, fileId, prefix, onUrl){
      var file=document.getElementById(fileId);
      document.getElementById(btnId).onclick=function(){ file.click(); };
      file.onchange=function(){
        var f=file.files[0]; if(!f) return; var btn=document.getElementById(btnId); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Preparing…';
        uploadPublicImage(f,prefix).then(function(url){ btn.disabled=false; btn.innerHTML='Replace image'; onUrl(url); toast('Image added'); })
        .catch(function(err){ btn.disabled=false; btn.innerHTML='Upload image'; var m=document.getElementById('ssMsg'); m.className='signin-msg err'; m.innerHTML=(err&&err.code==='decode')?'That photo couldn’t be used — please use a JPG or PNG (an iPhone HEIC won’t work; take a screenshot instead).':'Could not upload that image.'; });
      };
    }
    wireImg('ssImgBtn','ssImgFile','site/home', setHomeImg);
    var defImgUrl=defImg;
    wireImg('ssDefBtn','ssDefFile','site/default', function(url){ defImgUrl=url; document.getElementById('ssDefThumb').innerHTML='<img src="'+esc(url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">'; });

    document.getElementById('ssSave').onclick=function(){
      var btn=document.getElementById('ssSave'); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Saving…';
      sb.from('site_settings').update({
        home_seo_title: document.getElementById('ssTitle').value.trim()||null,
        home_seo_description: document.getElementById('ssDesc').value.trim()||null,
        home_focus_keyword: document.getElementById('ssKw').value.trim()||null,
        home_social_image: vals.social_image||null,
        default_social_image: defImgUrl||null,
        google_verification: document.getElementById('ssGv').value.trim()||null
      }).eq('id','global').then(function(r){
        btn.disabled=false; btn.innerHTML='Save site SEO';
        var m=document.getElementById('ssMsg');
        if(r.error){ m.className='signin-msg err'; m.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        m.className='signin-msg ok'; m.textContent='Saved — your homepage is updated.'; toast('Site SEO saved');
        logAudit({ module:'Content', action:'edit', record_type:'site_seo', record_ref:'Site SEO', remarks:'Homepage SEO updated', risk:'normal' });
      });
    };

    recompute();
  }

  // ============================================================
  //  BRAND & SETTINGS (admins only)
  // ============================================================
  var COLOR_PRESETS=['#2563eb','#0ea5e9','#0d9488','#16a34a','#7c3aed','#db2777','#ea580c','#dc2626','#0f172a'];

  function renderBrand(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('brand')+
      '<div class="app-head"><h1>Brand &amp; Settings</h1><p>Set your logo, colours, contact details and links — applied across your whole site.</p></div>'+
      '<div id="brandArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    sb.from('site_settings').select('*').eq('id','global').single().then(function(r){ paintBrand(r.data||{}); });
  }

  function paintBrand(s){
    var area=document.getElementById('brandArea'); if(!area) return;
    var color=s.brand_color||'#2563eb';
    function imgField(id, url, label, hint){
      return '<div class="field" style="margin-bottom:0"><label>'+label+'</label>'+
        '<div class="img-drop"><div class="img-thumb" id="'+id+'Thumb" style="width:84px;height:54px">'+(url?'<img src="'+esc(url)+'" style="width:100%;height:100%;object-fit:contain;border-radius:8px">':IMGICON)+'</div>'+
        '<div><button type="button" class="btn btn-ghost" id="'+id+'Btn">'+(url?'Replace':'Upload')+'</button>'+(url?' <button type="button" class="link-btn" id="'+id+'Rm" style="color:var(--red)">Remove</button>':'')+
        '<div class="phint" style="margin:6px 0 0">'+(hint||'')+'</div></div>'+
        '<input type="file" id="'+id+'File" accept="image/*" style="display:none"></div></div>';
    }
    function socialField(id, val, label, ph){ return '<div class="field"><label>'+label+'</label><input id="'+id+'" type="url" value="'+esc(val||'')+'" placeholder="'+ph+'"></div>'; }
    area.innerHTML=
      // Logo & icons
      '<div class="panel"><h3>Logo &amp; icons</h3><p class="phint">PNG or JPG. A transparent PNG works best for the logo.</p>'+
        '<div class="grid2" style="align-items:start">'+
          imgField('bLogo', s.logo_url, 'Company logo (header)', 'Replaces the icon + name in the header.')+
          imgField('bFav', s.favicon_url, 'Favicon (browser tab icon)', 'Best square, e.g. 64×64.')+
          imgField('bApp', s.app_icon_url, 'App / touch icon', 'Shown when saved to a phone home screen.')+
          '<div class="field" style="margin-bottom:0"><label>Brand name</label><input id="bName" type="text" value="'+esc(s.brand_name||'')+'" placeholder="Visa Doo"><div class="phint" style="margin-top:6px">Used if no logo is uploaded, and in the browser tab.</div></div>'+
        '</div>'+
      '</div>'+
      // Brand colour
      '<div class="panel"><h3>Brand colour</h3><p class="phint">Pick your main colour — buttons, links and accents update everywhere.</p>'+
        '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">'+
          '<input id="bColor" type="color" value="'+esc(color)+'" style="width:54px;height:46px;border:1px solid var(--line);border-radius:10px;background:none;cursor:pointer;padding:2px">'+
          '<input id="bColorHex" type="text" value="'+esc(color)+'" style="width:120px;padding:11px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-weight:600">'+
          '<div id="bSwatches" style="display:flex;gap:8px;flex-wrap:wrap">'+COLOR_PRESETS.map(function(c){return '<button type="button" class="bsw" data-c="'+c+'" style="width:30px;height:30px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line);background:'+c+';cursor:pointer"></button>';}).join('')+'</div>'+
        '</div>'+
        '<div id="bPreview" style="margin-top:18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">'+
          '<button type="button" id="bPrevBtn" class="btn" style="background:'+esc(color)+';color:#fff">Sample button</button>'+
          '<span id="bPrevLink" style="font-weight:700;color:'+esc(color)+'">Sample link</span>'+
        '</div>'+
      '</div>'+
      // Contact
      '<div class="panel"><h3>Contact details</h3><p class="phint">Shown across the site (WhatsApp button, footer, etc.).</p>'+
        '<div class="grid2">'+
          '<div class="field"><label>WhatsApp number</label><input id="bWa" type="text" value="'+esc(s.contact_whatsapp||'')+'" placeholder="+91 98952 26697"></div>'+
          '<div class="field"><label>Phone number</label><input id="bPhone" type="text" value="'+esc(s.contact_phone||'')+'" placeholder="+91 98952 26697"></div>'+
          '<div class="field"><label>Email</label><input id="bEmail" type="email" value="'+esc(s.contact_email||'')+'" placeholder="hello@visadoo.com"></div>'+
        '</div>'+
      '</div>'+
      // Social
      '<div class="panel"><h3>Social media links</h3><p class="phint">Paste your full profile links. Empty ones are hidden.</p>'+
        '<div class="grid2">'+
          socialField('bIg', s.social_instagram, 'Instagram', 'https://instagram.com/yourpage')+
          socialField('bFb', s.social_facebook, 'Facebook', 'https://facebook.com/yourpage')+
          socialField('bX', s.social_x, 'X (Twitter)', 'https://x.com/yourpage')+
          socialField('bIn', s.social_linkedin, 'LinkedIn', 'https://linkedin.com/company/yourpage')+
          socialField('bYt', s.social_youtube, 'YouTube', 'https://youtube.com/@yourpage')+
          socialField('bTt', s.social_tiktok, 'TikTok', 'https://tiktok.com/@yourpage')+
        '</div>'+
      '</div>'+
      // Images
      '<div class="panel"><h3>Site images</h3>'+
        '<div class="grid2" style="align-items:start">'+
          imgField('bShare', s.default_social_image, 'Default link-share image', 'Shown when a link is shared and the page has no image. Best 1200×630.')+
          imgField('bHero', s.hero_image_url, 'Homepage banner image', 'Optional background image behind the homepage search. Best wide, e.g. 1600×600.')+
        '</div>'+
        '<div class="field" style="margin-top:6px"><label>Homepage banner description (alt text)</label><input id="bHeroAlt" type="text" value="'+esc(s.hero_image_alt||'')+'" placeholder="Describe the banner image for Google &amp; screen readers"></div>'+
      '</div>'+
      // WhatsApp button
      '<div class="panel"><h3>WhatsApp button</h3>'+
        '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer;margin-bottom:14px"><input id="bWaShow" type="checkbox" '+(s.whatsapp_enabled!==false?'checked':'')+' style="width:auto"> Show the floating WhatsApp button</label>'+
        '<div class="grid2">'+
          '<div class="field"><label>Pre-filled message</label><input id="bWaMsg" type="text" value="'+esc(s.whatsapp_message||'')+'" placeholder="Hi Visa Doo, I have a question about a visa."></div>'+
          '<div class="field"><label>Button label (optional)</label><input id="bWaLabel" type="text" value="'+esc(s.whatsapp_label||'')+'" placeholder="e.g. Chat with us"></div>'+
        '</div>'+
      '</div>'+
      // Announcement bar
      '<div class="panel"><h3>Announcement bar</h3><p class="phint">A banner across the top of the site. Visitors can dismiss it.</p>'+
        '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer;margin-bottom:14px"><input id="bAnnOn" type="checkbox" '+(s.announcement_active?'checked':'')+' style="width:auto"> Show announcement bar</label>'+
        '<div class="field"><label>Announcement text</label><input id="bAnnText" type="text" value="'+esc(s.announcement_text||'')+'" placeholder="e.g. Eid offer — 10% off UAE visas this week!"></div>'+
        '<div class="field"><label>Link (optional)</label><input id="bAnnLink" type="text" value="'+esc(s.announcement_link||'')+'" placeholder="/country/united-arab-emirates"></div>'+
      '</div>'+
      // Cookie consent
      '<div class="panel"><h3>Cookie consent banner</h3>'+
        '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer;margin-bottom:14px"><input id="bCookieOn" type="checkbox" '+(s.cookie_enabled!==false?'checked':'')+' style="width:auto"> Show the cookie banner</label>'+
        '<div class="field"><label>Banner text (optional)</label><input id="bCookieText" type="text" value="'+esc(s.cookie_text||'')+'" placeholder="We use essential cookies to run this site and keep you signed in."></div>'+
      '</div>'+
      // Analytics
      '<div class="panel"><h3>Website analytics</h3><p class="phint">Paste your Google Analytics Measurement ID to track visitors.</p>'+
        '<div class="field"><label>Google Analytics ID</label><input id="bGa" type="text" value="'+esc(s.analytics_ga_id||'')+'" placeholder="G-XXXXXXXXXX"></div>'+
        '<a href="https://analytics.google.com" target="_blank" rel="noopener" class="link-btn" style="padding-left:0">Open Google Analytics ↗</a>'+
      '</div>'+
      // Currency (INR only)
      '<div class="panel"><h3>Currency</h3><p class="phint">All prices are shown in <b>Indian Rupees (₹)</b>. You set each visa\'s price under <b>Visa Types</b>.</p></div>'+
      '<div class="signin-msg" id="bMsg"></div>'+
      '<button class="btn btn-primary btn-lg" id="bSave">Save settings</button>';

    // working image urls
    var urls={ logo_url:s.logo_url||null, favicon_url:s.favicon_url||null, app_icon_url:s.app_icon_url||null, default_social_image:s.default_social_image||null, hero_image_url:s.hero_image_url||null };
    function wireImg(id, prefix, key){
      var file=document.getElementById(id+'File'), btn=document.getElementById(id+'Btn'), rm=document.getElementById(id+'Rm');
      btn.onclick=function(){ file.click(); };
      if(rm) rm.onclick=function(){ urls[key]=null; document.getElementById(id+'Thumb').innerHTML=IMGICON; rm.style.display='none'; };
      file.onchange=function(){ var f=file.files[0]; if(!f) return; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
        uploadPublicImage(f,prefix).then(function(url){ btn.disabled=false; btn.innerHTML='Replace'; urls[key]=url; document.getElementById(id+'Thumb').innerHTML='<img src="'+esc(url)+'" style="width:100%;height:100%;object-fit:contain;border-radius:8px">'; })
        .catch(function(err){ btn.disabled=false; btn.innerHTML='Upload'; var m=document.getElementById('bMsg'); m.className='signin-msg err'; m.innerHTML=(err&&err.code==='decode')?'That photo couldn’t be used — please use a JPG or PNG (an iPhone HEIC won’t work; take a screenshot instead).':'Could not upload that image.'; });
      };
    }
    wireImg('bLogo','brand/logo','logo_url'); wireImg('bFav','brand/favicon','favicon_url'); wireImg('bApp','brand/appicon','app_icon_url');
    wireImg('bShare','brand/share','default_social_image'); wireImg('bHero','brand/hero','hero_image_url');

    // colour sync + preview
    var ci=document.getElementById('bColor'), ch=document.getElementById('bColorHex');
    function setColor(c){ ci.value=c; ch.value=c; document.getElementById('bPrevBtn').style.background=c; document.getElementById('bPrevLink').style.color=c; }
    ci.oninput=function(){ setColor(ci.value); };
    ch.oninput=function(){ if(/^#?[0-9a-fA-F]{6}$/.test(ch.value)){ var v=ch.value[0]==='#'?ch.value:('#'+ch.value); setColor(v); } };
    area.querySelectorAll('.bsw').forEach(function(b){ b.onclick=function(){ setColor(b.getAttribute('data-c')); }; });

    document.getElementById('bSave').onclick=function(){
      var btn=document.getElementById('bSave'); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Saving…';
      var colorVal=ch.value[0]==='#'?ch.value:('#'+ch.value);
      // currency: INR only
      sb.from('site_settings').update({
        active_currency:'INR',
        currencies:[{ code:'INR', symbol:'₹' }],
        brand_name:document.getElementById('bName').value.trim()||null,
        brand_color:/^#[0-9a-fA-F]{6}$/.test(colorVal)?colorVal:null,
        logo_url:urls.logo_url, favicon_url:urls.favicon_url, app_icon_url:urls.app_icon_url,
        default_social_image:urls.default_social_image, hero_image_url:urls.hero_image_url,
        hero_image_alt:document.getElementById('bHeroAlt').value.trim()||null,
        contact_whatsapp:document.getElementById('bWa').value.trim()||null,
        contact_phone:document.getElementById('bPhone').value.trim()||null,
        contact_email:document.getElementById('bEmail').value.trim()||null,
        social_instagram:document.getElementById('bIg').value.trim()||null,
        social_facebook:document.getElementById('bFb').value.trim()||null,
        social_x:document.getElementById('bX').value.trim()||null,
        social_linkedin:document.getElementById('bIn').value.trim()||null,
        social_youtube:document.getElementById('bYt').value.trim()||null,
        social_tiktok:document.getElementById('bTt').value.trim()||null,
        whatsapp_enabled:document.getElementById('bWaShow').checked,
        whatsapp_message:document.getElementById('bWaMsg').value.trim()||null,
        whatsapp_label:document.getElementById('bWaLabel').value.trim()||null,
        announcement_active:document.getElementById('bAnnOn').checked,
        announcement_text:document.getElementById('bAnnText').value.trim()||null,
        announcement_link:document.getElementById('bAnnLink').value.trim()||null,
        cookie_enabled:document.getElementById('bCookieOn').checked,
        cookie_text:document.getElementById('bCookieText').value.trim()||null,
        analytics_ga_id:document.getElementById('bGa').value.trim()||null
      }).eq('id','global').then(function(r){
        btn.disabled=false; btn.innerHTML='Save settings';
        var m=document.getElementById('bMsg');
        if(r.error){ m.className='signin-msg err'; m.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        m.className='signin-msg ok'; m.textContent='Saved — your branding is updated across the site.'; toast('Brand settings saved');
        logAudit({ module:'Settings', action:'edit', record_type:'site_settings', record_ref:'Brand & contact', remarks:'Brand/contact settings updated', risk:'sensitive' });
      });
    };
  }

  // ============================================================
  //  EMAIL (admins only) — customer status-update emails via Brevo
  // ============================================================
  function renderEmailSettings(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('emailcfg')+
      '<div class="app-head"><h1>Email</h1><p>Automatically email customers when their application reaches a key stage — sent through your Brevo email service.</p></div>'+
      '<div id="emArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    sb.from('email_settings').select('*').eq('id','global').single().then(function(r){ paintEmail(r.data||{}); });
  }

  function paintEmail(s){
    var area=document.getElementById('emArea'); if(!area) return;
    var notify = s.notify_status_emails!==false;
    area.innerHTML=
      '<div class="panel"><h3>Customer updates</h3><p class="phint">Email customers automatically when their application is marked <b>Approved</b>, <b>Visa Issued</b>, or <b>Action Needed</b>.</p>'+
        '<label style="display:flex;align-items:center;gap:9px;font-weight:600;cursor:pointer"><input id="emNotify" type="checkbox" '+(notify?'checked':'')+' style="width:auto"> Send these update emails to customers</label>'+
      '</div>'+
      '<div class="panel"><h3>Email service (Brevo)</h3>'+
        '<p class="phint">These emails are sent through Brevo. Paste your Brevo <b>API key</b> below to switch it on.</p>'+
        '<div class="field"><label>Brevo API key</label><input id="emBrevoKey" type="password" value="'+esc(s.brevo_api_key||'')+'" placeholder="xkeysib-…" autocomplete="off"></div>'+
        '<div id="emKeyWarn"></div>'+
        '<p class="phint">In Brevo: <b>Settings → SMTP &amp; API → API Keys tab → Generate a new API key</b>. It starts with <b>xkeysib-</b>. (Do not use the SMTP key from the SMTP tab — that one won\'t work.) Your key is stored privately and never shown on your website.</p>'+
        '<div style="background:var(--sky-50);border-radius:10px;padding:12px 14px;margin-top:10px;font-size:13.5px;color:#475569">Sends as <b>'+esc(s.brevo_from_name||'Visa Doo')+' &lt;'+esc(s.brevo_from_email||'info@skybookdigital.com')+'&gt;</b>, with replies going to <b>'+esc(s.brevo_reply_to||'hello@visadoo.com')+'</b>.</div>'+
      '</div>'+
      '<div class="signin-msg" id="emMsg"></div>'+
      '<button class="btn btn-primary btn-lg" id="emSave">Save email settings</button>';

    var keyInput=document.getElementById('emBrevoKey'), warn=document.getElementById('emKeyWarn');
    function checkKey(){
      var v=(keyInput.value||'').trim();
      if(v && v.indexOf('xsmtpsib')===0){ warn.innerHTML='<p class="phint" style="color:var(--red);margin-top:6px">⚠ This looks like an <b>SMTP key</b>. Customer emails need the <b>API key</b> (starts with xkeysib-) from the “API Keys” tab.</p>'; }
      else warn.innerHTML='';
    }
    keyInput.oninput=checkKey; checkKey();

    document.getElementById('emSave').onclick=function(){
      var btn=this, m=document.getElementById('emMsg');
      var key=(keyInput.value||'').trim();
      if(key && key.indexOf('xsmtpsib')===0){ m.className='signin-msg err'; m.textContent='That’s a Brevo SMTP key. Please paste your Brevo API key (it starts with xkeysib-).'; return; }
      btn.disabled=true; btn.innerHTML='<span class="spin"></span> Saving…';
      sb.from('email_settings').update({ brevo_api_key:key||null, notify_status_emails:document.getElementById('emNotify').checked, updated_at:new Date().toISOString() }).eq('id','global').then(function(r){
        btn.disabled=false; btn.innerHTML='Save email settings';
        if(r.error){ m.className='signin-msg err'; m.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        m.className='signin-msg ok'; m.textContent=key?'Saved — customer update emails are on.':'Saved.';
        logAudit({ module:'Settings', action:'edit', record_type:'email_settings', record_ref:'Email settings', new_value:('status emails '+(document.getElementById('emNotify').checked?'on':'off')), remarks:'Email settings updated', risk:'sensitive' });
        toast('Email settings saved');
      });
    };
  }

  // ============================================================
  //  CSV download helper (shared)
  // ============================================================
  function pad6(n){ n=String(n==null?'':n); while(n.length<6) n='0'+n; return n; }
  function enqRef(seq){ return 'ENQ-'+pad6(seq); }
  function csvCell(v){ v=(v==null?'':String(v)); return /[",\n\r]/.test(v) ? ('"'+v.replace(/"/g,'""')+'"') : v; }
  function downloadCsv(filename, headers, rows){
    var lines=[headers.map(csvCell).join(',')];
    rows.forEach(function(r){ lines.push(r.map(csvCell).join(',')); });
    var blob=new Blob(['﻿'+lines.join('\r\n')], { type:'text/csv;charset=utf-8;' });
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=filename; document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 120);
    toast('Download started');
    logAudit({ module:'Exports', action:'export', record_ref:filename, remarks:(rows.length+' rows exported'), risk:'sensitive' });
  }

  // ============================================================
  //  ENQUIRIES (admins only) — homepage contact-form messages
  // ============================================================
  var enqRows=[];
  function filteredEnq(){
    var q=((document.getElementById('enqSearch')||{}).value||'').trim().toLowerCase();
    var st=(document.getElementById('enqStatus')||{}).value||'all';
    return enqRows.filter(function(e){
      if(st!=='all' && e.status!==st) return false;
      if(q){ var hay=[enqRef(e.seq),e.name,e.email,e.message].map(function(x){return (x||'').toString().toLowerCase();}).join(' '); if(hay.indexOf(q)===-1) return false; }
      return true;
    });
  }
  function paintEnq(){
    var area=document.getElementById('enqArea'); if(!area) return;
    var rows=filteredEnq();
    var cnt=document.getElementById('enqCount'); if(cnt) cnt.textContent=rows.length+' of '+enqRows.length+' shown';
    if(!enqRows.length){ area.innerHTML='<div class="panel empty-state"><p>No enquiries yet. Messages from the homepage contact form will appear here.</p></div>'; return; }
    if(!rows.length){ area.innerHTML='<div class="panel empty-state"><p>No enquiries match your search.</p></div>'; return; }
    var edit=canEditCRM();
    area.innerHTML=rows.map(function(e){
      var opts=['New','Contacted','Closed'].map(function(s){ return '<option'+(s===e.status?' selected':'')+'>'+s+'</option>'; }).join('');
      var convBtn = e.converted_lead_id
        ? '<button class="link-btn" data-enqlead="'+esc(e.converted_lead_id)+'">View lead →</button>'
        : (edit ? '<button class="btn btn-ghost pill-sm" data-enqconv="'+esc(e.id)+'">Convert to lead</button>' : '');
      return '<div class="admin-app"><div class="arow" style="align-items:flex-start;gap:14px"><div style="flex:1;min-width:0">'+
        '<h4>'+esc(enqRef(e.seq))+' · '+esc(e.name||'(no name)')+(e.converted_lead_id?' <span class="status-pill sp-done pill-sm">Lead</span>':'')+'</h4>'+
        '<div class="meta">'+esc(e.email||'')+' · '+esc(new Date(e.created_at).toLocaleString())+'</div>'+
        '<p style="margin:8px 0 0;white-space:pre-wrap">'+esc(e.message||'')+'</p></div>'+
        '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">'+
          '<select data-enq="'+esc(e.id)+'"'+(edit?'':' disabled')+' style="padding:9px 12px;border:1.5px solid var(--line);border-radius:9px;font-family:inherit">'+opts+'</select>'+
          convBtn+
        '</div>'+
      '</div></div>';
    }).join('');
    area.querySelectorAll('select[data-enq]').forEach(function(sel){
      sel.onchange=function(){ var id=sel.getAttribute('data-enq'), val=sel.value;
        sb.from('enquiries').update({ status:val }).eq('id',id).then(function(r){
          if(r.error){ toast('Could not update.'); console.error(r.error); return; }
          var e=enqRows.filter(function(x){return x.id===id;})[0]; if(e) e.status=val; toast('Marked “'+val+'”');
        });
      };
    });
    area.querySelectorAll('[data-enqconv]').forEach(function(b){ b.onclick=function(){ var e=enqRows.filter(function(x){return x.id===b.getAttribute('data-enqconv');})[0]; if(e) convertEnquiryToLead(e); }; });
    area.querySelectorAll('[data-enqlead]').forEach(function(b){ b.onclick=function(){ openLead(b.getAttribute('data-enqlead')); }; });
  }
  function renderEnquiries(){
    if(!canCRM()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('enquiries')+
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap"><div>'+
        '<h1>Enquiries</h1><p>Messages from the homepage contact form. Each gets a tracking number so a missing one is easy to spot.</p></div>'+
        '<button class="btn btn-ghost" id="enqCsv">Download CSV</button></div>'+
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">'+
        '<input id="enqSearch" type="text" placeholder="Search name, email, message or ENQ no…" style="flex:1;min-width:200px;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px">'+
        '<select id="enqStatus" style="padding:11px 14px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit"><option value="all">All statuses</option><option>New</option><option>Contacted</option><option>Closed</option></select>'+
        '<span id="enqCount" class="phint" style="margin:0"></span>'+
      '</div>'+
      '<div id="enqArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    sb.from('enquiries').select('*').order('seq',{ascending:false}).then(function(r){
      if(r.error){ document.getElementById('enqArea').innerHTML='<div class="empty-state"><p>Could not load enquiries.</p></div>'; console.error(r.error); return; }
      enqRows=r.data||[]; paintEnq();
    });
    document.getElementById('enqSearch').oninput=paintEnq;
    document.getElementById('enqStatus').onchange=paintEnq;
    document.getElementById('enqCsv').onclick=function(){
      var rows=filteredEnq().map(function(e){ return [enqRef(e.seq), new Date(e.created_at).toLocaleString(), e.name||'', e.email||'', e.status||'', e.message||'']; });
      downloadCsv('visadoo-enquiries.csv', ['Enquiry No','Date','Name','Email','Status','Message'], rows);
    };
  }

  // ============================================================
  //  CRM — Leads pipeline, follow-ups, activity trail (Phase 1)
  // ============================================================
  var LEAD_STAGES=['new','contacted','qualified','quoted','converted','lost'];
  var LEAD_STAGE_LABELS={ 'new':'New','contacted':'Contacted','qualified':'Qualified','quoted':'Quoted','converted':'Converted','lost':'Lost' };
  var LEAD_SOURCES=['manual','enquiry','walk-in','phone','referral','website','whatsapp','social-media','paid-ads'];
  var LEAD_SOURCE_LABELS={ 'manual':'Manual','enquiry':'Website enquiry','walk-in':'Walk-in','phone':'Phone','referral':'Referral','website':'Website','whatsapp':'WhatsApp','social-media':'Social Media','paid-ads':'Paid Ads' };
  function srcLabel(s){ return LEAD_SOURCE_LABELS[s]||s; }
  var leadList=[], leadViewId=null, LEAD_PAGE=25, leadLimit=LEAD_PAGE;
  var crmStaff=[], crmStaffLoaded=false;
  var leadFilters={ stage:'open', owner:'all', source:'all', search:'', overdue:false };
  var fuList=[], fuOwner='all';

  function leadRef(n){ return 'LEAD-'+pad6(n); }
  function vLabel(id){ var v=visaById(id); return v?v.name:(id||''); }
  function crmStaffName(uid){ if(!uid) return 'Unassigned'; for(var i=0;i<crmStaff.length;i++){ if(crmStaff[i].id===uid) return crmStaff[i].full_name||crmStaff[i].email; } return 'Staff member'; }
  function loadCrmStaff(){
    if(crmStaffLoaded) return Promise.resolve(crmStaff);
    return sb.from('profiles').select('id,email,full_name,role').neq('role','customer').then(function(r){
      crmStaff=(r.data||[]).filter(function(p){ return ['admin','agent','sales'].indexOf(p.role)>-1; }); crmStaffLoaded=true; return crmStaff;
    });
  }
  function leadStagePill(s){
    var cls={ 'new':'sp-action','contacted':'sp-progress','qualified':'sp-progress','quoted':'sp-progress','converted':'sp-done','lost':'' }[s]||'';
    var extra=(s==='lost')?' style="background:#eef2f7;color:#64748b"':'';
    return '<span class="status-pill '+cls+' pill-sm"'+extra+'>'+esc(LEAD_STAGE_LABELS[s]||s)+'</span>';
  }
  function followupBadge(d, stage){
    if(!d || stage==='converted' || stage==='lost') return '';
    var day=new Date(d); day.setHours(0,0,0,0);
    var today=new Date(); today.setHours(0,0,0,0);
    if(day.getTime()<today.getTime()) return '<span class="status-pill sp-action pill-sm">⏰ Overdue</span>';
    if(day.getTime()===today.getTime()) return '<span class="status-pill sp-action pill-sm">📅 Today</span>';
    return '<span class="status-pill sp-progress pill-sm">📅 '+esc(new Date(d).toLocaleDateString())+'</span>';
  }
  // Match an existing customer by email (or phone), else create one — never duplicates a person.
  function ensureCustomer(info){
    var email=(info.email||'').trim().toLowerCase();
    var phone=(info.phone||'').trim();
    var q;
    if(email) q=sb.from('customers').select('id').ilike('email',email).limit(1);
    else if(phone) q=sb.from('customers').select('id').eq('phone',phone).limit(1);
    else q=Promise.resolve({data:[]});
    return q.then(function(r){
      var rows=(r&&r.data)||[];
      if(rows.length) return rows[0].id;
      return sb.from('customers').insert({ email:email||null, full_name:info.full_name||null, phone:phone||null, lead_source:(info.source||'lead') }).select('id').single().then(function(ir){ if(ir.error) throw ir.error; return ir.data.id; });
    });
  }
  function logLeadActivity(leadId, type, body){
    return sb.from('lead_activities').insert({ lead_id:leadId, type:type, body:(body||null), actor:(state.user&&state.user.id)||null, actor_email:(state.user&&state.user.email)||null });
  }

  // ---- Leads list ----
  function leadFiltered(){
    var today=new Date(); today.setHours(0,0,0,0);
    var me=(state.user&&state.user.id)||'';
    return leadList.filter(function(l){
      if(leadFilters.stage==='open'){ if(l.stage==='converted'||l.stage==='lost') return false; }
      else if(leadFilters.stage!=='all'){ if(l.stage!==leadFilters.stage) return false; }
      if(leadFilters.owner==='mine'){ if(l.owner!==me) return false; }
      else if(leadFilters.owner!=='all'){ if(l.owner!==leadFilters.owner) return false; }
      if(leadFilters.source!=='all' && (l.source||'')!==leadFilters.source) return false;
      if(leadFilters.overdue){ if(l.stage==='converted'||l.stage==='lost') return false; if(!l.next_follow_up_at) return false; var d=new Date(l.next_follow_up_at); d.setHours(0,0,0,0); if(d.getTime()>today.getTime()) return false; }
      if(leadFilters.search){ var hay=[leadRef(l.lead_no),l.full_name,l.email,l.phone,vLabel(l.visa_type),(l.country_slug?countryName(l.country_slug):'')].map(function(x){return (x||'').toString().toLowerCase();}).join(' '); if(hay.indexOf(leadFilters.search)===-1) return false; }
      return true;
    });
  }
  function leadRowHtml(l){
    var line2=[l.phone, vLabel(l.visa_type), (l.country_slug?countryName(l.country_slug):'')].filter(function(x){return x;}).map(esc).join(' · ');
    var val=(l.expected_value!=null && l.expected_value!=='')?('<span class="ar-date">'+money(l.expected_value)+'</span>'):'';
    return '<div class="app-row" data-leadopen="'+esc(l.id)+'"><div class="ar-main">'+
      '<div class="ar-name">'+esc(l.full_name||'(no name)')+'<span class="ar-ref"> · '+esc(leadRef(l.lead_no))+'</span> '+leadStagePill(l.stage)+'</div>'+
      '<div class="ar-sub">'+(line2||esc(l.email||'')||'—')+' · '+esc(crmStaffName(l.owner))+'</div></div>'+
      '<div class="ar-right">'+followupBadge(l.next_follow_up_at,l.stage)+val+CHEV+'</div></div>';
  }
  function paintLeads(){
    var area=document.getElementById('leadArea'); if(!area) return;
    var rows=leadFiltered();
    var openVal=rows.reduce(function(s,l){ return s + ((l.stage!=='converted'&&l.stage!=='lost'&&l.expected_value)?Number(l.expected_value):0); },0);
    var cnt=document.getElementById('leadCount'); if(cnt) cnt.textContent=rows.length+' of '+leadList.length+' leads'+(openVal>0?(' · open pipeline '+money(openVal)):'');
    if(!leadList.length){ area.innerHTML='<div class="panel empty-state"><p>No leads yet. Add a lead, or convert an enquiry into a lead.</p></div>'; return; }
    if(!rows.length){ area.innerHTML='<div class="panel empty-state"><p>No leads match your filters.</p></div>'; return; }
    var shown=rows.slice(0,leadLimit), remaining=rows.length-shown.length;
    area.innerHTML='<div class="app-list">'+shown.map(leadRowHtml).join('')+'</div>'+
      (remaining>0?('<div class="app-loadmore"><button class="btn btn-ghost" id="leadMore" type="button">Load more ('+remaining+' more)</button></div>'):'');
    area.querySelectorAll('[data-leadopen]').forEach(function(el){ el.onclick=function(){ openLead(el.getAttribute('data-leadopen')); }; });
    var more=document.getElementById('leadMore'); if(more) more.onclick=function(){ leadLimit+=LEAD_PAGE; paintLeads(); };
  }
  function ownerFilterOptions(){
    return '<option value="all">All owners</option><option value="mine">My leads</option>'+
      crmStaff.map(function(s){ return '<option value="'+esc(s.id)+'">'+esc(s.full_name||s.email)+'</option>'; }).join('');
  }
  function leadCsv(){
    var rows=leadFiltered().map(function(l){ return [leadRef(l.lead_no), new Date(l.created_at).toLocaleDateString(), l.full_name||'', l.email||'', l.phone||'', vLabel(l.visa_type), l.country_slug?countryName(l.country_slug):'', LEAD_STAGE_LABELS[l.stage]||l.stage, crmStaffName(l.owner), srcLabel(l.source||''), l.next_follow_up_at||'', (l.expected_value!=null?l.expected_value:'')]; });
    downloadCsv('visadoo-leads.csv', ['Lead No','Created','Name','Email','Phone','Visa Type','Country','Stage','Owner','Source','Next Follow-up','Expected Value (INR)'], rows);
  }
  function renderLeads(){
    if(!canCRM()){ go(defaultStaffView()); return; }
    leadLimit=LEAD_PAGE;
    if(!VISAS.length) loadVisaTypes();
    if(!countryList.length) loadCountriesGroups();
    var edit=canEditCRM();
    root.innerHTML='<div class="app-main">'+adminSections('leads')+
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap"><div>'+
        '<h1>Leads</h1><p>Potential customers you’re following up. Move each New → Contacted → Qualified → Quoted, then convert to an application.</p></div>'+
        '<div style="display:flex;gap:8px">'+(edit?'<button class="btn btn-primary" id="leadAdd">+ Add lead</button>':'')+'<button class="btn btn-ghost" id="leadCsv">Download CSV</button></div></div>'+
      '<div style="margin-bottom:14px"><div class="app-toolbar">'+
        '<div class="app-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'+
        '<input id="leadSearch" type="text" placeholder="Search name, email, phone, visa or LEAD no…"></div>'+
        '<select id="lfStage" class="pill-sm"></select>'+
        '<select id="lfOwner" class="pill-sm"><option value="all">All owners</option></select>'+
        '<select id="lfSource" class="pill-sm"></select>'+ /* sources filled in renderLeads */
        '<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)"><input type="checkbox" id="lfOverdue"> Due/overdue only</label>'+
      '</div><div style="margin-top:6px"><span id="leadCount" class="phint" style="margin:0"></span></div></div>'+
      '<div id="leadArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    var st=document.getElementById('lfStage');
    st.innerHTML='<option value="open">Open (active)</option><option value="all">All stages</option>'+LEAD_STAGES.map(function(s){return '<option value="'+s+'">'+LEAD_STAGE_LABELS[s]+'</option>';}).join('');
    st.value=leadFilters.stage;
    var so=document.getElementById('lfSource');
    so.innerHTML='<option value="all">All sources</option>'+LEAD_SOURCES.map(function(s){return '<option value="'+s+'">'+srcLabel(s)+'</option>';}).join('');
    so.value=leadFilters.source;
    document.getElementById('lfOverdue').checked=!!leadFilters.overdue;
    document.getElementById('leadSearch').value=leadFilters.search||'';
    function apply(){ leadFilters.stage=st.value; leadFilters.owner=document.getElementById('lfOwner').value; leadFilters.source=so.value; leadFilters.overdue=document.getElementById('lfOverdue').checked; leadFilters.search=(document.getElementById('leadSearch').value||'').trim().toLowerCase(); leadLimit=LEAD_PAGE; paintLeads(); }
    document.getElementById('leadSearch').oninput=apply; st.onchange=apply; so.onchange=apply; document.getElementById('lfOverdue').onchange=apply;
    if(edit){ var add=document.getElementById('leadAdd'); if(add) add.onclick=function(){ showLeadForm(); }; }
    document.getElementById('leadCsv').onclick=leadCsv;
    Promise.all([ sb.from('leads').select('*').order('created_at',{ascending:false}), loadCrmStaff() ]).then(function(res){
      if(res[0].error){ document.getElementById('leadArea').innerHTML='<div class="empty-state"><p>Could not load leads.</p></div>'; console.error(res[0].error); return; }
      leadList=res[0].data||[];
      var of=document.getElementById('lfOwner'); if(of){ of.innerHTML=ownerFilterOptions(); of.value=leadFilters.owner; of.onchange=apply; }
      paintLeads();
    });
  }

  // ---- Lead detail ----
  function openLead(id){ leadViewId=id; state.view='leadview'; location.hash='leadview/'+encodeURIComponent(id); renderHeader(); render(); }
  function leadVisaOptions(sel){ return '<option value="">— Select visa —</option>'+VISAS.map(function(v){return '<option value="'+esc(v.id)+'"'+(sel===v.id?' selected':'')+'>'+esc(v.name)+'</option>';}).join(''); }
  function leadCountryOptions(sel){ return '<option value="">— Select country —</option>'+countryList.map(function(c){return '<option value="'+esc(c.slug)+'"'+(sel===c.slug?' selected':'')+'>'+esc(c.name)+'</option>';}).join(''); }
  function leadOwnerOptions(sel){ return '<option value="">Unassigned</option>'+crmStaff.map(function(s){return '<option value="'+esc(s.id)+'"'+(sel===s.id?' selected':'')+'>'+esc(s.full_name||s.email)+'</option>';}).join(''); }
  function actLabel(t){ return {note:'Note',call:'Call',whatsapp:'WhatsApp',email:'Email',stage_change:'Stage change',follow_up_set:'Follow-up set',converted:'Converted',created:'Created',lost:'Marked lost',owner_change:'Owner change'}[t]||t; }
  function renderLeadDetail(id){
    if(!canCRM()){ go(defaultStaffView()); return; }
    if(!id){ go('leads'); return; }
    if(!VISAS.length) loadVisaTypes();
    if(!countryList.length) loadCountriesGroups();
    root.innerHTML='<div class="app-main">'+adminSections('leads')+'<button class="link-btn" id="leadBack" style="margin-bottom:8px">← Back to leads</button><div id="leadDetail"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div></div>';
    wireAdminSections();
    document.getElementById('leadBack').onclick=function(){ go('leads'); };
    Promise.all([
      sb.from('leads').select('*').eq('id',id).single(),
      sb.from('lead_activities').select('*').eq('lead_id',id).order('created_at',{ascending:false}),
      loadCrmStaff()
    ]).then(function(res){
      if(res[0].error||!res[0].data){ document.getElementById('leadDetail').innerHTML='<div class="empty-state"><p>Lead not found.</p></div>'; return; }
      paintLeadDetail(res[0].data, res[1].data||[]);
    });
  }
  function paintLeadDetail(l, acts){
    var host=document.getElementById('leadDetail'); if(!host) return;
    var edit=canEditCRM();
    var closed=(l.stage==='converted'||l.stage==='lost');
    var canConv=canProcessApps() && l.stage!=='converted';
    var custLink=(l.customer_id && state.role==='admin')?'<button class="link-btn" id="leadCust">View customer record →</button>':'';
    var appLink=(l.application_id)?'<button class="link-btn" id="leadApp">View application →</button>':'';
    var head='<div class="panel"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">'+
      '<div><h2 style="font-size:22px;font-weight:800;margin:0 0 4px">'+esc(l.full_name||'(no name)')+'</h2>'+
      '<div class="meta">'+esc(leadRef(l.lead_no))+' · '+leadStagePill(l.stage)+' · Owner: '+esc(crmStaffName(l.owner))+'</div>'+
      '<div class="meta" style="margin-top:4px">'+([l.email,l.phone].filter(function(x){return x;}).map(esc).join(' · ')||'—')+'</div></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+(canConv?'<button class="btn btn-primary" id="leadConvert">Convert to application</button>':'')+(edit&&!closed?'<button class="btn btn-ghost" id="leadLost" style="color:var(--red)">Mark lost</button>':'')+'</div></div>'+
      ((custLink||appLink)?('<div style="margin-top:8px;display:flex;gap:14px;flex-wrap:wrap">'+custLink+appLink+'</div>'):'')+
      (l.stage==='lost'&&l.lost_reason?('<div class="meta" style="margin-top:8px">Lost reason: '+esc(l.lost_reason)+'</div>'):'')+'</div>';
    var form;
    if(edit){
      form='<div class="panel"><h3>Lead details</h3><div class="grid2">'+
        '<div class="field"><label>Full name</label><input id="lf_name" type="text" value="'+esc(l.full_name||'')+'"></div>'+
        '<div class="field"><label>Email</label><input id="lf_email" type="email" value="'+esc(l.email||'')+'"></div>'+
        '<div class="field"><label>Phone</label><input id="lf_phone" type="tel" value="'+esc(l.phone||'')+'"></div>'+
        '<div class="field"><label>Source</label><select id="lf_source">'+LEAD_SOURCES.map(function(s){return '<option value="'+s+'"'+((l.source||'')===s?' selected':'')+'>'+srcLabel(s)+'</option>';}).join('')+'</select></div>'+
        '<div class="field"><label>Visa type (interested in)</label><select id="lf_visa">'+leadVisaOptions(l.visa_type)+'</select></div>'+
        '<div class="field"><label>Country</label><select id="lf_country">'+leadCountryOptions(l.country_slug)+'</select></div>'+
        '<div class="field"><label>Stage</label><select id="lf_stage">'+LEAD_STAGES.map(function(s){return '<option value="'+s+'"'+(l.stage===s?' selected':'')+'>'+LEAD_STAGE_LABELS[s]+'</option>';}).join('')+'</select></div>'+
        '<div class="field"><label>Owner</label><select id="lf_owner">'+leadOwnerOptions(l.owner)+'</select></div>'+
        '<div class="field"><label>Next follow-up</label><input id="lf_followup" type="date" value="'+esc(l.next_follow_up_at||'')+'"></div>'+
        '<div class="field"><label>Expected value (₹)</label><input id="lf_value" type="number" min="0" step="1" value="'+(l.expected_value!=null?esc(l.expected_value):'')+'"></div>'+
        '</div><div class="field"><label>Notes</label><textarea id="lf_notes" rows="3">'+esc(l.notes||'')+'</textarea></div>'+
        '<button class="btn btn-primary" id="lf_save">Save changes</button></div>';
    } else {
      form='<div class="panel"><h3>Lead details</h3><table style="width:100%;border-collapse:collapse">'+
        '<tr><td class="muted">Visa</td><td style="text-align:right">'+esc(vLabel(l.visa_type)||'—')+'</td></tr>'+
        '<tr><td class="muted">Country</td><td style="text-align:right">'+esc(l.country_slug?countryName(l.country_slug):'—')+'</td></tr>'+
        '<tr><td class="muted">Source</td><td style="text-align:right">'+esc(l.source||'—')+'</td></tr>'+
        '<tr><td class="muted">Next follow-up</td><td style="text-align:right">'+esc(l.next_follow_up_at||'—')+'</td></tr>'+
        '<tr><td class="muted">Expected value</td><td style="text-align:right">'+(l.expected_value!=null?money(l.expected_value):'—')+'</td></tr>'+
        '<tr><td class="muted" style="vertical-align:top">Notes</td><td style="text-align:right;white-space:pre-wrap">'+esc(l.notes||'—')+'</td></tr></table></div>';
    }
    var actComposer=edit?('<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+
      '<select id="la_type" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:9px;font-family:inherit"><option value="note">Note</option><option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select>'+
      '<input id="la_body" type="text" placeholder="Log a note or call…" style="flex:1;min-width:200px;padding:10px 12px;border:1.5px solid var(--line);border-radius:9px">'+
      '<button class="btn btn-ghost" id="la_add">Add</button></div>'):'';
    var timeline=acts.length?acts.map(function(a){
      return '<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div style="font-size:13px"><strong>'+esc(actLabel(a.type))+'</strong>'+(a.body?(' — '+esc(a.body)):'')+'</div>'+
        '<div class="meta" style="font-size:12px">'+esc(a.actor_email||'')+' · '+esc(new Date(a.created_at).toLocaleString())+'</div></div>';
    }).join(''):'<p class="phint">No activity yet.</p>';
    host.innerHTML=head+form+'<div class="panel"><h3>Activity &amp; follow-ups</h3>'+actComposer+'<div>'+timeline+'</div></div>';
    if(custLink){ var cb=document.getElementById('leadCust'); if(cb) cb.onclick=function(){ openCustomer(l.customer_id); }; }
    if(appLink){ var ab=document.getElementById('leadApp'); if(ab) ab.onclick=function(){ openApp(l.application_id); }; }
    if(canConv){ var cv=document.getElementById('leadConvert'); if(cv) cv.onclick=function(){ showLeadConvert(l); }; }
    if(edit&&!closed){ var lb=document.getElementById('leadLost'); if(lb) lb.onclick=function(){ markLeadLost(l); }; }
    if(edit){ document.getElementById('lf_save').onclick=function(){ saveLead(l); }; var la=document.getElementById('la_add'); if(la) la.onclick=function(){ addLeadNote(l); }; }
  }
  function saveLead(l){
    var patch={
      full_name:document.getElementById('lf_name').value.trim()||null,
      email:document.getElementById('lf_email').value.trim().toLowerCase()||null,
      phone:document.getElementById('lf_phone').value.trim()||null,
      source:document.getElementById('lf_source').value,
      visa_type:document.getElementById('lf_visa').value||null,
      country_slug:document.getElementById('lf_country').value||null,
      stage:document.getElementById('lf_stage').value,
      owner:document.getElementById('lf_owner').value||null,
      next_follow_up_at:document.getElementById('lf_followup').value||null,
      expected_value:(document.getElementById('lf_value').value!==''?Number(document.getElementById('lf_value').value):null),
      notes:document.getElementById('lf_notes').value.trim()||null
    };
    var btn=document.getElementById('lf_save'); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Saving…';
    sb.from('leads').update(patch).eq('id',l.id).then(function(r){
      btn.disabled=false; btn.innerHTML='Save changes';
      if(r.error){ toast('Could not save.'); console.error(r.error); return; }
      var proms=[];
      if(patch.stage!==l.stage){ proms.push(logLeadActivity(l.id,'stage_change',(LEAD_STAGE_LABELS[l.stage]||l.stage)+' → '+(LEAD_STAGE_LABELS[patch.stage]||patch.stage))); logAudit({ module:'CRM', action:'stage_change', record_type:'lead', record_id:l.id, record_ref:leadRef(l.lead_no), field:'stage', old_value:l.stage, new_value:patch.stage, remarks:'Lead stage changed', risk:'normal' }); }
      if((patch.owner||'')!==(l.owner||'')){ proms.push(logLeadActivity(l.id,'owner_change',crmStaffName(l.owner)+' → '+crmStaffName(patch.owner))); logAudit({ module:'CRM', action:'owner_change', record_type:'lead', record_id:l.id, record_ref:leadRef(l.lead_no), field:'owner', old_value:crmStaffName(l.owner), new_value:crmStaffName(patch.owner), remarks:'Lead reassigned', risk:'normal' }); }
      if((patch.next_follow_up_at||'')!==(l.next_follow_up_at||'') && patch.next_follow_up_at){ proms.push(logLeadActivity(l.id,'follow_up_set','Next follow-up: '+patch.next_follow_up_at)); }
      toast('Lead saved');
      Promise.all(proms).then(function(){ openLead(l.id); });
    });
  }
  function addLeadNote(l){
    var type=document.getElementById('la_type').value;
    var body=document.getElementById('la_body').value.trim();
    if(!body){ toast('Type a note first.'); return; }
    var btn=document.getElementById('la_add'); btn.disabled=true;
    logLeadActivity(l.id,type,body).then(function(r){ btn.disabled=false; if(r&&r.error){ toast('Could not save note.'); console.error(r.error); return; } openLead(l.id); });
  }
  function markLeadLost(l){
    var reason=window.prompt('Reason for marking this lead as lost? (optional)','');
    if(reason===null) return;
    sb.from('leads').update({ stage:'lost', lost_reason:reason||null }).eq('id',l.id).then(function(r){
      if(r.error){ toast('Could not update.'); console.error(r.error); return; }
      logLeadActivity(l.id,'lost',reason||null);
      logAudit({ module:'CRM', action:'lost', record_type:'lead', record_id:l.id, record_ref:leadRef(l.lead_no), field:'stage', old_value:l.stage, new_value:'lost', remarks:(reason||null), risk:'normal' });
      toast('Lead marked lost'); openLead(l.id);
    });
  }
  // ---- Add lead (manual) ----
  function showLeadForm(){
    if(!canEditCRM()){ go('leads'); return; }
    if(!VISAS.length) loadVisaTypes();
    if(!countryList.length) loadCountriesGroups();
    loadCrmStaff().then(function(){
      root.innerHTML='<div class="app-main">'+adminSections('leads')+
        '<button class="link-btn" id="lnBack" style="margin-bottom:8px">← Back to leads</button>'+
        '<div class="panel"><h3>Add a lead</h3><p class="phint">For a walk-in, phone or referral enquiry. We’ll match or create the customer record automatically.</p><div class="grid2">'+
          '<div class="field"><label>Full name</label><input id="ln_name" type="text"></div>'+
          '<div class="field"><label>Email</label><input id="ln_email" type="email"></div>'+
          '<div class="field"><label>Phone</label><input id="ln_phone" type="tel"></div>'+
          '<div class="field"><label>Source</label><select id="ln_source">'+LEAD_SOURCES.map(function(s){return '<option value="'+s+'"'+(s==='walk-in'?' selected':'')+'>'+srcLabel(s)+'</option>';}).join('')+'</select></div>'+
          '<div class="field"><label>Visa type (interested in)</label><select id="ln_visa">'+leadVisaOptions('')+'</select></div>'+
          '<div class="field"><label>Country</label><select id="ln_country">'+leadCountryOptions('')+'</select></div>'+
          '<div class="field"><label>Owner</label><select id="ln_owner">'+leadOwnerOptions((state.user&&state.user.id)||'')+'</select></div>'+
          '<div class="field"><label>Next follow-up</label><input id="ln_followup" type="date"></div>'+
          '<div class="field"><label>Expected value (₹)</label><input id="ln_value" type="number" min="0" step="1"></div>'+
        '</div><div class="field"><label>Notes</label><textarea id="ln_notes" rows="3"></textarea></div>'+
        '<div class="signin-msg" id="ln_msg"></div>'+
        '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="ln_save">Create lead</button><button class="btn btn-ghost" id="ln_cancel">Cancel</button></div></div></div>';
      wireAdminSections();
      document.getElementById('lnBack').onclick=document.getElementById('ln_cancel').onclick=function(){ go('leads'); };
      document.getElementById('ln_save').onclick=function(){ createLead(); };
    });
  }
  function createLead(){
    var name=document.getElementById('ln_name').value.trim();
    var email=document.getElementById('ln_email').value.trim();
    var phone=document.getElementById('ln_phone').value.trim();
    var msg=document.getElementById('ln_msg');
    if(!name || (!email && !phone)){ msg.className='signin-msg err'; msg.textContent='Please enter a name and at least an email or phone number.'; return; }
    var btn=document.getElementById('ln_save'); btn.disabled=true; btn.innerHTML='<span class="spin"></span> Creating…';
    var source=document.getElementById('ln_source').value;
    ensureCustomer({ email:email, full_name:name, phone:phone, source:source }).then(function(custId){
      return sb.from('leads').insert({
        customer_id:custId||null, full_name:name, email:(email.toLowerCase()||null), phone:phone||null,
        visa_type:document.getElementById('ln_visa').value||null, country_slug:document.getElementById('ln_country').value||null,
        source:source, owner:document.getElementById('ln_owner').value||null,
        next_follow_up_at:document.getElementById('ln_followup').value||null,
        expected_value:(document.getElementById('ln_value').value!==''?Number(document.getElementById('ln_value').value):null),
        notes:document.getElementById('ln_notes').value.trim()||null, stage:'new'
      }).select().single();
    }).then(function(r){
      if(r.error) throw r.error;
      var lead=r.data;
      logLeadActivity(lead.id,'created','Lead created ('+source+')');
      logAudit({ module:'CRM', action:'create', record_type:'lead', record_id:lead.id, record_ref:leadRef(lead.lead_no), remarks:'Lead created ('+source+')', risk:'normal' });
      toast('Lead created'); openLead(lead.id);
    }).catch(function(err){ btn.disabled=false; btn.innerHTML='Create lead'; msg.className='signin-msg err'; msg.textContent='Could not create the lead. Please try again.'; console.error(err); });
  }
  // ---- Convert enquiry -> lead ----
  function convertEnquiryToLead(e){
    if(!canEditCRM()) return;
    if(e.converted_lead_id){ openLead(e.converted_lead_id); return; }
    ensureCustomer({ email:e.email, full_name:e.name, source:'enquiry' }).then(function(custId){
      return sb.from('leads').insert({ customer_id:custId||null, full_name:e.name||null, email:(e.email?e.email.toLowerCase():null), source:'enquiry', enquiry_id:e.id, stage:'new', notes:e.message||null, owner:(state.user&&state.user.id)||null }).select().single();
    }).then(function(r){
      if(r.error) throw r.error;
      var lead=r.data;
      sb.from('enquiries').update({ converted_lead_id:lead.id, status:'Contacted' }).eq('id',e.id).then(function(){ e.converted_lead_id=lead.id; e.status='Contacted'; });
      logLeadActivity(lead.id,'created','Created from enquiry '+enqRef(e.seq));
      logAudit({ module:'CRM', action:'convert_enquiry', record_type:'lead', record_id:lead.id, record_ref:leadRef(lead.lead_no), remarks:'Enquiry '+enqRef(e.seq)+' converted to lead', risk:'normal' });
      toast('Enquiry converted to lead'); openLead(lead.id);
    }).catch(function(err){ toast('Could not convert.'); console.error(err); });
  }
  // ---- Convert lead -> application (admin/agent only; collects passport) ----
  function showLeadConvert(l){
    if(!canProcessApps()){ openLead(l.id); return; }
    if(!VISAS.length) loadVisaTypes();
    var visaOpts=VISAS.map(function(v){ return '<option value="'+esc(v.id)+'"'+(l.visa_type===v.id?' selected':'')+'>'+esc(v.name)+' — '+visaPriceText(v)+'</option>'; }).join('');
    root.innerHTML='<div class="app-main">'+adminSections('leads')+
      '<button class="link-btn" id="lcBack" style="margin-bottom:8px">← Back to lead</button>'+
      '<div class="panel"><h3>Convert lead to application</h3><p class="phint">Creates a visa application for this customer. The lead is marked Converted and linked to it.</p>'+
      '<div class="field"><label>Visa type</label><select id="lc_visa" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px">'+visaOpts+'</select></div><div class="grid2">'+
        field('lc_email','Customer email','email',l.email||'',true)+
        field('lc_name','Full name (as in passport)','text',l.full_name||'',true)+
        field('lc_phone','Phone number','tel',l.phone||'',true)+
        field('lc_nationality','Nationality','text','',true)+
        field('lc_passport','Passport number','text','',true)+
        field('lc_dob','Date of birth','date','',false)+
      '</div><div class="signin-msg" id="lc_msg"></div>'+
      '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="lc_save">Create application</button><button class="btn btn-ghost" id="lc_cancel">Cancel</button></div></div></div>';
    wireAdminSections();
    document.getElementById('lcBack').onclick=document.getElementById('lc_cancel').onclick=function(){ openLead(l.id); };
    var save=document.getElementById('lc_save');
    save.onclick=function(){
      var email=document.getElementById('lc_email').value.trim();
      var name=document.getElementById('lc_name').value.trim();
      var phone=document.getElementById('lc_phone').value.trim();
      var nat=document.getElementById('lc_nationality').value.trim();
      var pass=document.getElementById('lc_passport').value.trim();
      var msg=document.getElementById('lc_msg');
      if(!/.+@.+\..+/.test(email)||!name||!phone||!nat||!pass){ msg.className='signin-msg err'; msg.textContent='Please fill in email, name, phone, nationality and passport number.'; return; }
      save.disabled=true; save.innerHTML='<span class="spin"></span> Creating…';
      sb.from('applications').insert({ user_id:null, visa_type:document.getElementById('lc_visa').value, full_name:name, email:email, phone:phone, nationality:nat, passport_number:pass, date_of_birth:document.getElementById('lc_dob').value||null, status:'Submitted' }).select().single().then(function(r){
        if(r.error){ save.disabled=false; save.innerHTML='Create application'; msg.className='signin-msg err'; msg.textContent='Could not create the application.'; console.error(r.error); return; }
        var app=r.data;
        sb.from('leads').update({ stage:'converted', application_id:app.id }).eq('id',l.id).then(function(){
          logLeadActivity(l.id,'converted','Converted to application '+(app.reference_code||''));
          logAudit({ module:'CRM', action:'convert', record_type:'lead', record_id:l.id, record_ref:leadRef(l.lead_no), field:'application', new_value:(app.reference_code||app.id), remarks:'Lead converted to application', risk:'sensitive' });
          toast('Application created (Ref '+app.reference_code+')'); openApp(app.id);
        });
      });
    };
  }
  // ---- Follow-ups ----
  function renderFollowups(){
    if(!canCRM()){ go(defaultStaffView()); return; }
    if(!VISAS.length) loadVisaTypes();
    if(!countryList.length) loadCountriesGroups();
    root.innerHTML='<div class="app-main">'+adminSections('followups')+
      '<div class="app-head"><h1>Follow-ups</h1><p>Leads due today or overdue. Keep this list at zero.</p></div>'+
      '<div style="margin-bottom:12px"><label style="font-size:13px;color:var(--muted)">Owner: </label> <select id="fuOwner" class="pill-sm"><option value="all">All owners</option></select></div>'+
      '<div id="fuArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div></div>';
    wireAdminSections();
    Promise.all([ sb.from('leads').select('*').not('next_follow_up_at','is',null).not('stage','in','(converted,lost)').order('next_follow_up_at',{ascending:true}), loadCrmStaff() ]).then(function(res){
      if(res[0].error){ document.getElementById('fuArea').innerHTML='<div class="empty-state"><p>Could not load.</p></div>'; console.error(res[0].error); return; }
      fuList=res[0].data||[];
      var of=document.getElementById('fuOwner'); of.innerHTML='<option value="all">All owners</option><option value="mine">My follow-ups</option>'+crmStaff.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(s.full_name||s.email)+'</option>';}).join(''); of.value=fuOwner; of.onchange=function(){ fuOwner=of.value; paintFollowups(); };
      paintFollowups();
    });
  }
  function paintFollowups(){
    var area=document.getElementById('fuArea'); if(!area) return;
    var me=(state.user&&state.user.id)||'';
    var today=new Date(); today.setHours(0,0,0,0);
    var rows=fuList.filter(function(l){ if(fuOwner==='mine'){ if(l.owner!==me) return false; } else if(fuOwner!=='all'){ if(l.owner!==fuOwner) return false; } return true; });
    var overdue=[], todayR=[];
    rows.forEach(function(l){ var d=new Date(l.next_follow_up_at); d.setHours(0,0,0,0); if(d.getTime()<today.getTime()) overdue.push(l); else if(d.getTime()===today.getTime()) todayR.push(l); });
    function sec(title,arr){ if(!arr.length) return ''; return '<h3 style="margin:16px 0 8px">'+title+' ('+arr.length+')</h3><div class="app-list">'+arr.map(leadRowHtml).join('')+'</div>'; }
    var html=sec('⏰ Overdue',overdue)+sec('📅 Due today',todayR);
    if(!html){ area.innerHTML='<div class="panel empty-state"><p>🎉 Nothing due. You’re all caught up.</p></div>'; return; }
    area.innerHTML=html;
    area.querySelectorAll('[data-leadopen]').forEach(function(el){ el.onclick=function(){ openLead(el.getAttribute('data-leadopen')); }; });
  }

  // ============================================================
  //  CUSTOMERS (admins only) — text-only applicant data for outreach (downloadable)
  // ============================================================
  var custList=[], custViewId=null, CUST_PAGE=25, custLimit=CUST_PAGE;
  var custTab='profile', custEditing=false, custEdits=[], custIti=null;
  // Build the customer list from the real customers table, merging in
  // each person's application count + latest visa/status from applications.
  function buildCustList(customers, apps, consents){
    var byId={};
    (apps||[]).forEach(function(a){
      if(!a.customer_id) return;
      var visaName=visaById(a.visa_type)?visaById(a.visa_type).name:(a.visa_type||'');
      var t=new Date(a.created_at).getTime();
      var m=byId[a.customer_id];
      if(!m){ byId[a.customer_id]={ count:1, first:a.created_at, last:a.created_at, _firstT:t, _lastT:t, visa:visaName, status:a.status||'' }; }
      else { m.count++;
        if(t>m._lastT){ m._lastT=t; m.last=a.created_at; m.visa=visaName||m.visa; m.status=a.status||m.status; }
        if(t<m._firstT){ m._firstT=t; m.first=a.created_at; }
      }
    });
    // Marketing state per customer (email channel is representative; the opt-in box sets both the same).
    var consById={};
    (consents||[]).forEach(function(cn){
      var e=consById[cn.customer_id]||(consById[cn.customer_id]={hasRow:true,marketing:false});
      if(cn.marketing_opted_in) e.marketing=true; // opted in on any channel counts as on
    });
    return (customers||[]).map(function(c){
      var agg=byId[c.id]||{ count:0, first:c.created_at, last:c.created_at, visa:'', status:'' };
      var cons=consById[c.id]||{hasRow:false,marketing:false};
      return { id:c.id, name:c.full_name||'', email:c.email||'', phone:c.phone||'',
        country:c.passport_issuing_country||'', state:c.state||'', source:c.lead_source||'',
        visa:agg.visa, status:agg.status, count:agg.count, first:agg.first, last:agg.last,
        marketing:cons.marketing };
    }).sort(function(a,b){ return new Date(b.last)-new Date(a.last); });
  }
  // Upsert a customer's marketing consent on both channels (staff manual change).
  function setCustMarketing(id, val){
    var now=new Date().toISOString();
    var rows=['email','whatsapp'].map(function(ch){ return { customer_id:id, channel:ch, marketing_opted_in:val, marketing_source:'manual', marketing_updated_at:now, updated_at:now }; });
    return sb.from('consent').upsert(rows,{onConflict:'customer_id,channel'}).then(function(r){
      if(!(r&&r.error)) logAudit({ module:'Customers', action:'edit', record_type:'customer', record_id:id, field:'marketing_consent', old_value:(val?'off':'on'), new_value:(val?'on':'off'), remarks:'Marketing consent changed', risk:'sensitive' });
      return r;
    });
  }
  function filteredCust(){
    var q=((document.getElementById('custSearch')||{}).value||'').trim().toLowerCase();
    if(!q) return custList;
    return custList.filter(function(c){ var hay=[c.name,c.email,c.phone,c.country,c.state,c.visa,c.source].map(function(x){return (x||'').toString().toLowerCase();}).join(' '); return hay.indexOf(q)>-1; });
  }
  function paintCust(){
    var area=document.getElementById('custArea'); if(!area) return;
    var rows=filteredCust();
    var cnt=document.getElementById('custCount'); if(cnt) cnt.textContent=rows.length+' of '+custList.length+' customers';
    if(!custList.length){ area.innerHTML='<div class="panel empty-state"><p>No customers yet. People who submit an application will appear here.</p></div>'; return; }
    if(!rows.length){ area.innerHTML='<div class="panel empty-state"><p>No customers match your search.</p></div>'; return; }
    var shown=rows.slice(0, custLimit), remaining=rows.length-shown.length;
    area.innerHTML='<div class="app-list">'+shown.map(function(c){
      var countPill=c.count>1?('<span class="status-pill sp-progress pill-sm">'+c.count+' apps</span>'):(c.count===0?('<span class="status-pill sp-action pill-sm">Enquiry</span>'):'');
      var line2=[c.country,c.state,c.visa,c.status].filter(function(x){return x;}).map(esc).join(' · ');
      var mPill=c.marketing
        ? '<span class="status-pill sp-done pill-sm">📣 On</span>'
        : '<span class="status-pill pill-sm" style="background:#eef2f7;color:#64748b">📣 Off</span>';
      var sub=[c.phone?esc(c.phone):'', line2].filter(function(x){return x;}).join(' · ');
      return '<div class="app-row" data-custopen="'+esc(c.id)+'"><div class="ar-main">'+
        '<div class="ar-name">'+esc(c.name||'(no name)')+(c.email?'<span class="ar-ref"> · '+esc(c.email)+'</span>':'')+(countPill?(' '+countPill):'')+'</div>'+
        '<div class="ar-sub">'+(sub||'—')+'</div></div>'+
        '<div class="ar-right">'+mPill+'<span class="ar-date">'+esc(new Date(c.last).toLocaleDateString())+'</span>'+CHEV+'</div></div>';
    }).join('')+'</div>'+
      (remaining>0 ? ('<div class="app-loadmore"><button class="btn btn-ghost" id="custMore" type="button">Load more ('+remaining+' more)</button></div>') : '');
    area.querySelectorAll('[data-custopen]').forEach(function(el){ el.onclick=function(){ openCustomer(el.getAttribute('data-custopen')); }; });
    var more=document.getElementById('custMore'); if(more) more.onclick=function(){ custLimit+=CUST_PAGE; paintCust(); };
  }
  function renderCustomers(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    if(!VISAS.length) loadVisaTypes();
    custLimit=CUST_PAGE;
    root.innerHTML='<div class="app-main">'+adminSections('customers')+
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap"><div>'+
        '<h1>Customers</h1><p>One record per person — automatically gathered from applications and enquiries (matched by email). Text only, no documents. For outreach.</p></div>'+
        '<button class="btn btn-ghost" id="custCsv">Download CSV</button></div>'+
      '<div style="margin-bottom:14px"><div class="app-toolbar">'+
        '<div class="app-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'+
        '<input id="custSearch" type="text" placeholder="Search name, email, phone or country…"></div>'+
      '</div><div style="margin-top:6px"><span id="custCount" class="phint" style="margin:0"></span></div></div>'+
      '<div id="custArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    Promise.all([
      sb.from('customers').select('id,full_name,email,phone,passport_issuing_country,state,lead_source,created_at').order('created_at',{ascending:false}),
      sb.from('applications').select('customer_id,visa_type,status,created_at'),
      sb.from('consent').select('customer_id,channel,marketing_opted_in')
    ]).then(function(res){
      if(res[0].error){ document.getElementById('custArea').innerHTML='<div class="empty-state"><p>Could not load customers.</p></div>'; console.error(res[0].error); return; }
      custList=buildCustList(res[0].data||[], res[1].data||[], res[2].data||[]); paintCust();
    });
    document.getElementById('custSearch').oninput=function(){ custLimit=CUST_PAGE; paintCust(); };
    document.getElementById('custCsv').onclick=function(){
      var srcLabel={application:'Applied',enquiry:'Enquiry','walk-in':'Walk-in',manual:'Added manually'};
      var rows=filteredCust().map(function(c){ return [c.name,c.email,c.phone,c.country,c.state,c.visa,c.status,c.count,(srcLabel[c.source]||c.source||''),(c.marketing?'Yes':'No'),new Date(c.first).toLocaleDateString(),new Date(c.last).toLocaleDateString()]; });
      downloadCsv('visadoo-customers.csv', ['Name','Email','Phone','Passport Issuing Country','State','Visa Type','Status','Applications','Source','Marketing Consent','First Seen','Last Seen'], rows);
    };
  }

  // ---- per-customer page: profile + applications + full message history ----
  function openCustomer(id){ custViewId=id; state.view='custview'; location.hash='custview/'+encodeURIComponent(id); renderHeader(); render(); }

  function renderCustomerDetail(id){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    if(!id){ go('customers'); return; }
    custEditing=false; custTab='profile';
    if(!VISAS.length) loadVisaTypes();
    root.innerHTML='<div class="app-main">'+adminSections('customers')+
      '<button class="link-btn" id="custBack" style="margin-bottom:10px">← Back to customers</button>'+
      '<div id="custDetail"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('custBack').onclick=function(){ go('customers'); };
    Promise.all([
      sb.from('customers').select('*').eq('id',id).single(),
      sb.from('applications').select('id,visa_type,status,reference_code,created_at').eq('customer_id',id).order('created_at',{ascending:false}),
      sb.from('messages').select('id,to_address,subject,body,status,reason,template_key,purpose,channel,created_at,sent_at,scheduled_for').eq('customer_id',id).order('created_at',{ascending:false}).limit(200),
      sb.from('consent').select('channel,marketing_opted_in,service_opted_out').eq('customer_id',id),
      sb.from('customer_edits').select('*').eq('customer_id',id).order('edited_at',{ascending:false}).limit(300)
    ]).then(function(res){
      var c=res[0].data;
      if(res[0].error||!c){ document.getElementById('custDetail').innerHTML='<div class="panel empty-state"><p>Could not load this customer.</p></div>'; return; }
      custEdits=res[4].data||[];
      paintCustomerDetail(c, res[1].data||[], res[2].data||[], res[3].data||[]);
    });
  }

  // Human labels for the editable customer fields (used by the form + history).
  var CUST_FIELDS=[
    ['full_name','Full name','text'],
    ['phone','Mobile number','tel'],
    ['email','Email','email'],
    ['date_of_birth','Date of birth','date'],
    ['passport_issuing_country','Passport issuing country','text'],
    ['state','State','text'],
    ['notes','Internal notes','textarea'],
    ['status','Status','status']
  ];
  function custFieldLabel(k){ for(var i=0;i<CUST_FIELDS.length;i++){ if(CUST_FIELDS[i][0]===k) return CUST_FIELDS[i][1]; } return k; }

  function paintCustomerDetail(c, apps, msgs, consents){
    var box=document.getElementById('custDetail'); if(!box) return;
    var tabs='<div class="subnav" style="margin-bottom:18px">'+
      '<button data-ctab="profile" class="'+((custTab==='profile'&&!custEditing)?'active':'')+'">Profile</button>'+
      '<button data-ctab="history" class="'+((custTab==='history'&&!custEditing)?'active':'')+'">Edit history ('+custEdits.length+')</button>'+
    '</div>';
    function wireTabs(){ box.querySelectorAll('[data-ctab]').forEach(function(b){ b.onclick=function(){ custEditing=false; custTab=b.getAttribute('data-ctab'); paintCustomerDetail(c,apps,msgs,consents); }; }); }

    if(custEditing){ box.innerHTML=tabs+custEditFormHtml(c); wireTabs(); wireCustEdit(c); return; }
    if(custTab==='history'){ box.innerHTML=tabs+custHistoryHtml(); wireTabs(); return; }

    var marketing=consents.some(function(x){ return x.marketing_opted_in; });
    var srcLabel={application:'Applied',enquiry:'Enquiry','walk-in':'Walk-in',manual:'Added manually'};
    var line=[c.passport_issuing_country,c.state].filter(function(x){return x;}).map(esc).join(' · ');
    var mPill=marketing?'<span class="status-pill sp-done" style="font-size:11px">📣 Marketing: On</span>':'<span class="status-pill" style="font-size:11px;background:#eef2f7;color:#64748b">📣 Marketing: Off</span>';
    var header='<div class="panel"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
      '<h2 style="font-size:22px;font-weight:800;margin:0 0 4px">'+esc(c.full_name||'(no name)')+'</h2>'+
      '<div class="meta">'+esc(c.email||'')+(c.phone?(' · '+esc(c.phone)):'')+'</div>'+
      (line?('<div class="meta">'+line+'</div>'):'')+
      '<div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+mPill+
        '<button class="link-btn" id="cdMkt" data-mval="'+(marketing?'0':'1')+'" style="padding:0;font-size:12px">'+(marketing?'Turn off':'Turn on')+'</button>'+
        (c.lead_source?('<span class="phint" style="margin:0">'+esc(srcLabel[c.lead_source]||c.lead_source)+'</span>'):'')+'</div></div>'+
      '<div style="text-align:right;white-space:nowrap"><button class="btn btn-ghost" id="custEditBtn">Edit details</button>'+
        '<div class="phint" style="margin:8px 0 0">Since '+esc(new Date(c.created_at).toLocaleDateString())+'</div></div></div>';

    var appsHtml='';
    if(apps.length){
      appsHtml='<div style="margin-top:22px"><h3 style="font-size:16px;font-weight:800;margin-bottom:8px">Applications ('+apps.length+')</h3>'+
        apps.map(function(a){ var vn=visaById(a.visa_type)?visaById(a.visa_type).name:(a.visa_type||'');
          return '<div class="admin-app"><div class="arow"><div><h4 style="font-size:15px">'+esc(vn)+'</h4><div class="meta">'+esc(a.reference_code||'')+' · '+esc(a.status||'')+'</div></div>'+
            '<div class="phint" style="margin:0">'+esc(new Date(a.created_at).toLocaleDateString())+'</div></div></div>'; }).join('')+'</div>';
    }

    var histHtml='<div style="margin-top:22px"><h3 style="font-size:16px;font-weight:800;margin-bottom:8px">Message history ('+msgs.length+')</h3>'+
      (msgs.length? msgs.map(msgRowHtml).join('') : '<div class="panel empty-state"><p>No messages sent to this customer yet.</p></div>')+'</div>';

    box.innerHTML=tabs+header+appsHtml+histHtml;
    wireTabs();
    document.getElementById('custEditBtn').onclick=function(){ custEditing=true; paintCustomerDetail(c,apps,msgs,consents); };
    var mk=document.getElementById('cdMkt'); if(mk) mk.onclick=function(){
      var val=mk.getAttribute('data-mval')==='1'; mk.disabled=true; mk.textContent='Saving…';
      setCustMarketing(c.id,val).then(function(r){ if(r&&r.error){ toast('Could not update consent.'); mk.disabled=false; return; } toast(val?'Marketing turned on':'Marketing turned off'); renderCustomerDetail(c.id); });
    };
    box.querySelectorAll('[data-msgview]').forEach(function(b){ b.onclick=function(){
      var d=document.getElementById('mv_'+b.getAttribute('data-msgview')); if(!d) return;
      var show=d.style.display==='none'; d.style.display=show?'block':'none'; b.textContent=show?'Hide content':'View content';
    }; });
  }

  function custEditFormHtml(c){
    return '<div class="panel">'+
      '<h3 style="font-size:17px;font-weight:800;margin-bottom:12px">Edit customer</h3>'+
      '<div class="grid2">'+
        '<div class="field"><label>Full name</label><input id="cef_full_name" type="text" value="'+esc(c.full_name||'')+'"></div>'+
        '<div class="field"><label>Mobile number</label><input id="custfPhone" type="tel" value="'+esc(c.phone||'')+'"></div>'+
        '<div class="field"><label>Email <span class="req-star">*</span></label><input id="cef_email" type="email" value="'+esc(c.email||'')+'"></div>'+
        '<div class="field"><label>Date of birth</label><input id="cef_dob" type="date" value="'+esc(c.date_of_birth||'')+'"></div>'+
        '<div class="field"><label>Passport issuing country</label><input id="cef_country" type="text" value="'+esc(c.passport_issuing_country||'')+'"></div>'+
        '<div class="field"><label>State</label><input id="cef_state" type="text" value="'+esc(c.state||'')+'"></div>'+
      '</div>'+
      '<div class="field"><label>Internal notes</label><textarea id="cef_notes" style="min-height:70px">'+esc(c.notes||'')+'</textarea></div>'+
      '<div class="field"><label>Status</label><select id="cef_status"><option value="active"'+((c.status||'active')==='active'?' selected':'')+'>Active</option><option value="archived"'+(c.status==='archived'?' selected':'')+'>Archived</option></select></div>'+
      '<div class="signin-msg" id="cefMsg"></div>'+
      '<div style="display:flex;gap:10px;margin-top:10px"><button class="btn btn-primary" id="cefSave">Save changes</button><button class="btn btn-ghost" id="cefCancel">Cancel</button></div>'+
    '</div>';
  }

  function wireCustEdit(c){
    custIti=null;
    var pin=document.getElementById('custfPhone');
    if(pin && window.intlTelInput){
      custIti=window.intlTelInput(pin,{ initialCountry:'in', separateDialCode:true,
        preferredCountries:['in','ae','sa','qa','kw','om','bh','us','gb'],
        utilsScript:'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js' });
    }
    document.getElementById('cefCancel').onclick=function(){ custEditing=false; renderCustomerDetail(c.id); };
    document.getElementById('cefSave').onclick=function(){
      var msg=document.getElementById('cefMsg');
      function err(t){ msg.className='signin-msg err'; msg.style.display='block'; msg.textContent=t; }
      var phoneRaw=(pin.value||'').trim();
      var email=document.getElementById('cef_email').value.trim();
      if(!email || !/.+@.+\..+/.test(email)) return err('Please enter a valid email address.');
      if(phoneRaw && custIti && window.intlTelInputUtils && !custIti.isValidNumber()) return err('Please enter a valid mobile number, or clear the box.');
      var newVals={
        full_name: document.getElementById('cef_full_name').value.trim()||null,
        phone: phoneRaw ? ((custIti && custIti.getNumber())||phoneRaw) : null,
        email: email,
        date_of_birth: document.getElementById('cef_dob').value||null,
        passport_issuing_country: document.getElementById('cef_country').value.trim()||null,
        state: document.getElementById('cef_state').value.trim()||null,
        notes: document.getElementById('cef_notes').value.trim()||null,
        status: document.getElementById('cef_status').value
      };
      var btn=document.getElementById('cefSave'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
      function fin(){ btn.disabled=false; btn.innerHTML='Save changes'; }
      sb.from('customers').select('id').ilike('email',email).neq('id',c.id).limit(1).then(function(dup){
        if(dup.data && dup.data.length){ fin(); return err('Another customer already uses that email address.'); }
        var fields=['full_name','phone','email','date_of_birth','passport_issuing_country','state','notes','status'];
        var changes=[];
        fields.forEach(function(f){ var ov=(c[f]==null?'':String(c[f])), nv=(newVals[f]==null?'':String(newVals[f])); if(ov!==nv) changes.push({ field:f, old_value:(c[f]==null?null:String(c[f])), new_value:(newVals[f]==null?null:String(newVals[f])) }); });
        if(!changes.length){ fin(); custEditing=false; toast('No changes'); renderCustomerDetail(c.id); return; }
        sb.from('customers').update(Object.assign({}, newVals, { updated_at:new Date().toISOString() })).eq('id',c.id).then(function(r){
          if(r.error){ fin(); err('Could not save. Please try again.'); console.error(r.error); return; }
          var uid=(state.user&&state.user.id)||null, uem=(state.user&&state.user.email)||null, now=new Date().toISOString();
          var rows=changes.map(function(ch){ return { customer_id:c.id, field:ch.field, old_value:ch.old_value, new_value:ch.new_value, edited_by:uid, edited_by_email:uem, edited_at:now }; });
          sb.from('customer_edits').insert(rows).then(function(){ custEditing=false; toast('Customer updated'); renderCustomerDetail(c.id); });
        });
      });
    };
  }

  function custHistoryHtml(){
    if(!custEdits.length) return '<div class="panel empty-state"><p>No edits recorded yet. Changes you make with “Edit details” will be logged here.</p></div>';
    return '<div>'+custEdits.map(function(e){
      var when=new Date(e.edited_at).toLocaleString();
      var ov=(e.old_value==null||e.old_value==='')?'<i style="color:var(--muted)">(empty)</i>':esc(e.old_value);
      var nv=(e.new_value==null||e.new_value==='')?'<i style="color:var(--muted)">(empty)</i>':esc(e.new_value);
      return '<div class="admin-app"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h4 style="font-size:15px">'+esc(custFieldLabel(e.field))+'</h4>'+
        '<div class="meta">'+ov+' → '+nv+'</div></div>'+
        '<div style="text-align:right;white-space:nowrap"><div class="phint" style="margin:0">'+esc(e.edited_by_email||'staff')+'</div><div class="phint" style="margin:2px 0 0">'+esc(when)+'</div></div>'+
      '</div></div>';
    }).join('')+'</div>';
  }

  function msgRowHtml(m){
    var when=(m.status==='queued'&&m.scheduled_for)?('Scheduled · '+new Date(m.scheduled_for).toLocaleString()):new Date(m.sent_at||m.created_at).toLocaleString();
    var tpl=m.template_key==='review-request'?'Review request':(m.template_key==='status-update'?'Status update':(m.template_key||'Message'));
    var reason=m.reason?(' · <span class="phint" style="display:inline">'+esc(m.reason)+'</span>'):'';
    var body=m.body?('<div id="mv_'+esc(m.id)+'" style="display:none;margin-top:10px;border:1px solid var(--line);border-radius:10px;padding:12px;background:#fff;max-width:100%;overflow:auto">'+m.body+'</div>'):'';
    var viewBtn=m.body?('<button class="link-btn" data-msgview="'+esc(m.id)+'" style="padding:0;font-size:12px;margin-top:6px">View content</button>'):'';
    return '<div class="admin-app"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
      '<h4 style="font-size:15px">'+esc(m.subject||tpl)+'</h4>'+
      '<div class="meta">'+esc(tpl)+' · '+esc(m.channel)+reason+'</div>'+viewBtn+body+'</div>'+
      '<div style="text-align:right;white-space:nowrap">'+msgStatusPill(m.status)+'<div class="phint" style="margin:4px 0 0">'+esc(when)+'</div></div>'+
    '</div></div>';
  }

  // ============================================================
  //  CONTENT (pages + FAQs + reviews)
  // ============================================================
  var contentTab='pages', pEditing=null, fEditing=null, rEditing=null;
  var pList=[], fList=[], rvList=[];

  function renderContentAdmin(){
    if(!canManageContent()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('content')+
      '<div class="app-head"><h1>Site content</h1><p>Manage your pages, homepage FAQs and customer reviews.</p></div>'+
      '<div class="subnav" id="contentToggle" style="margin-bottom:18px">'+
        ['pages','faqs','reviews'].map(function(t){ return '<button data-ct="'+t+'" class="'+(contentTab===t?'active':'')+'">'+(t==='pages'?'Pages':(t==='faqs'?'FAQ':'Reviews'))+'</button>'; }).join('')+
      '</div>'+
      '<div id="contentArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    root.querySelectorAll('#contentToggle button').forEach(function(b){ b.onclick=function(){ contentTab=b.getAttribute('data-ct'); pEditing=fEditing=rEditing=null; renderContentAdmin(); }; });
    if(contentTab==='pages') sb.from('pages').select('*').order('sort_order').then(function(r){ pList=r.data||[]; paintPages(); });
    else if(contentTab==='faqs') sb.from('faqs').select('*').order('sort_order').then(function(r){ fList=r.data||[]; paintFaqs(); });
    else sb.from('reviews').select('*').order('sort_order').then(function(r){ rvList=r.data||[]; paintReviews(); });
  }
  function stars(n){ var s=''; for(var i=1;i<=5;i++){ s+='<span style="color:'+(i<=n?'#f5a623':'#d8dee9')+'">★</span>'; } return s; }

  // ---- Pages (rich editor) ----
  function paintPages(){
    var area=document.getElementById('contentArea'); if(!area) return;
    if(pEditing){ area.innerHTML=pageFormHtml(pEditing); wirePageForm(); return; }
    var rows=pList.map(function(p){
      var pill=p.status==='published'?'<span class="status-pill sp-done">Published</span>':'<span class="status-pill sp-action">Draft</span>';
      return '<div class="admin-app"><div class="arow"><div><h4>'+esc(p.title)+' '+pill+(p.show_in_footer?' <span class="status-pill sp-progress" style="font-size:11px">In footer</span>':'')+'</h4>'+
        '<div class="meta">/p/'+esc(p.slug)+'</div></div><div style="display:flex;gap:8px">'+
        '<button class="btn btn-ghost" data-pedit="'+esc(p.id)+'">Edit</button><button class="btn btn-ghost" data-pdel="'+esc(p.id)+'" style="color:var(--red)">Delete</button></div></div></div>';
    }).join('');
    area.innerHTML='<div style="margin-bottom:14px"><button class="btn btn-primary" id="pAdd">+ New page</button></div>'+(rows||'<div class="panel empty-state"><p>No pages yet.</p></div>');
    document.getElementById('pAdd').onclick=function(){ pEditing={id:null,title:'',content:'',status:'draft',show_in_footer:true,sort_order:(pList.length+1),seo_title:'',seo_description:''}; paintPages(); };
    area.querySelectorAll('[data-pedit]').forEach(function(b){ b.onclick=function(){ pEditing=JSON.parse(JSON.stringify(pList.filter(function(x){return x.id===b.getAttribute('data-pedit');})[0])); paintPages(); }; });
    area.querySelectorAll('[data-pdel]').forEach(function(b){ b.onclick=function(){ var p=pList.filter(function(x){return x.id===b.getAttribute('data-pdel');})[0]; if(!window.confirm('Delete “'+p.title+'”?'))return; sb.from('pages').delete().eq('id',p.id).then(function(){ logAudit({ module:'Content', action:'delete', record_type:'page', record_ref:p.title, remarks:'Page deleted', risk:'high' }); toast('Page deleted'); renderContentAdmin(); }); }; });
  }
  function pageFormHtml(p){
    return '<div class="panel">'+
      '<button class="link-btn" id="pBack" style="margin-bottom:8px">← Back to pages</button>'+
      '<div class="field"><label>Page title <span class="req-star">*</span></label><input id="pTitle" type="text" value="'+esc(p.title)+'" placeholder="e.g. About Us"></div>'+
      '<div class="field"><label>Content</label>'+
        '<div class="rte-toolbar" id="pBar">'+
          '<button type="button" data-cmd="bold"><b>B</b></button><button type="button" data-cmd="italic"><i>I</i></button><span class="sep"></span>'+
          '<button type="button" data-block="h2">H2</button><button type="button" data-block="h3">H3</button><span class="sep"></span>'+
          '<button type="button" data-cmd="insertUnorderedList">&#8226;</button><button type="button" data-cmd="insertOrderedList">1.</button><span class="sep"></span>'+
          '<button type="button" data-link="1">🔗</button>'+
        '</div>'+
        '<div class="rte" id="pContent" contenteditable="true" data-ph="Write your page content…">'+(p.content||'')+'</div></div>'+
      '<div class="grid2"><div class="field"><label>SEO title (optional)</label><input id="pSeoT" type="text" value="'+esc(p.seo_title||'')+'"></div>'+
        '<div class="field"><label>SEO description (optional)</label><input id="pSeoD" type="text" value="'+esc(p.seo_description||'')+'"></div></div>'+
      '<div class="field"><label>Page address</label><div style="display:flex;align-items:center;gap:6px"><span class="phint" style="margin:0;white-space:nowrap">/p/</span><input id="pSlug" type="text" value="'+esc(p.slug||'')+'" placeholder="auto from the title"></div>'+
        '<div class="phint" style="margin-top:4px">Change the web address here. The old one automatically forwards to the new one, so nothing breaks.</div></div>'+
      '<div class="field"><label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer"><input id="pFooter" type="checkbox" '+(p.show_in_footer?'checked':'')+' style="width:auto"> Show a link in the footer</label></div>'+
      '<div class="signin-msg" id="pMsg"></div>'+
      '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="pSaveDraft">'+(p.status==='published'?'Save changes':'Save draft')+'</button>'+
        (p.status==='published'?'<button class="btn btn-ghost" id="pUnpub">Unpublish</button>':'<button class="btn btn-primary" id="pPublish" style="background:var(--green)">Publish</button>')+
        '<button class="btn btn-ghost" id="pCancel">Cancel</button></div>'+
    '</div>';
  }
  function wirePageForm(){
    var content=document.getElementById('pContent'), bar=document.getElementById('pBar');
    bar.querySelectorAll('[data-cmd]').forEach(function(b){ b.onmousedown=function(e){ e.preventDefault(); document.execCommand(b.getAttribute('data-cmd'),false,null); content.focus(); }; });
    bar.querySelectorAll('[data-block]').forEach(function(b){ b.onmousedown=function(e){ e.preventDefault(); document.execCommand('formatBlock',false,b.getAttribute('data-block')); content.focus(); }; });
    bar.querySelector('[data-link]').onmousedown=function(e){ e.preventDefault(); var u=window.prompt('Link address (https://…)'); if(u) document.execCommand('createLink',false,u); content.focus(); };
    document.getElementById('pBack').onclick=document.getElementById('pCancel').onclick=function(){ pEditing=null; renderContentAdmin(); };
    function save(status){
      var title=document.getElementById('pTitle').value.trim(); var msg=document.getElementById('pMsg');
      if(!title){ msg.className='signin-msg err'; msg.textContent='Please add a title.'; return; }
      var payload={ title:title, content:document.getElementById('pContent').innerHTML, status:status, show_in_footer:document.getElementById('pFooter').checked,
        seo_title:document.getElementById('pSeoT').value.trim()||null, seo_description:document.getElementById('pSeoD').value.trim()||null };
      var _cur = pEditing.id ? (pList.filter(function(x){return x.id===pEditing.id;})[0]||{}) : {};
      var _others = pList.filter(function(x){return x.id!==pEditing.id;}).map(function(x){return x.slug;});
      var _slIn = document.getElementById('pSlug'); var _desired = (_slIn && _slIn.value.trim()) ? _slIn.value : title;
      var _sp = seoSlugPayload(_desired, _cur.slug||'', _cur.past_slugs||[], _others, title);
      payload.slug=_sp.slug; payload.past_slugs=_sp.past_slugs;
      var op = pEditing.id ? sb.from('pages').update(payload).eq('id',pEditing.id) : sb.from('pages').insert(payload);
      op.then(function(r){ if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save.'; console.error(r.error); return; } logAudit({ module:'Content', action:(pEditing.id?'edit':'create'), record_type:'page', record_ref:title, remarks:('Page '+(status==='published'?'published':'saved')), risk:'normal' }); toast(status==='published'?'Page published':'Saved'); pEditing=null; renderContentAdmin(); });
    }
    if(document.getElementById('pSaveDraft')) document.getElementById('pSaveDraft').onclick=function(){ save(pEditing.status||'draft'); };
    if(document.getElementById('pPublish')) document.getElementById('pPublish').onclick=function(){ save('published'); };
    if(document.getElementById('pUnpub')) document.getElementById('pUnpub').onclick=function(){ save('draft'); };
  }

  // ---- FAQs ----
  function paintFaqs(){
    var area=document.getElementById('contentArea'); if(!area) return;
    if(fEditing){ area.innerHTML=faqFormHtml(fEditing); wireFaqForm(); return; }
    var rows=fList.map(function(q,i){
      return '<div class="admin-app"><div class="arow"><div><h4>'+esc(q.question)+(q.active?'':' <span class="status-pill sp-action" style="font-size:11px">Hidden</span>')+'</h4>'+
        '<div class="meta">'+esc((q.answer||'').slice(0,90))+((q.answer||'').length>90?'…':'')+'</div></div>'+
        '<div style="display:flex;gap:6px;align-items:center">'+
        '<button class="btn btn-ghost" data-fmove="'+esc(q.id)+'" data-dir="up" '+(i===0?'disabled':'')+' style="padding:8px 12px">↑</button>'+
        '<button class="btn btn-ghost" data-fmove="'+esc(q.id)+'" data-dir="down" '+(i===fList.length-1?'disabled':'')+' style="padding:8px 12px">↓</button>'+
        '<button class="btn btn-ghost" data-fedit="'+esc(q.id)+'">Edit</button><button class="btn btn-ghost" data-fdel="'+esc(q.id)+'" style="color:var(--red)">Delete</button></div></div></div>';
    }).join('');
    area.innerHTML='<div style="margin-bottom:14px"><button class="btn btn-primary" id="fAdd">+ Add question</button></div>'+(rows||'<div class="panel empty-state"><p>No FAQs yet.</p></div>');
    document.getElementById('fAdd').onclick=function(){ fEditing={id:null,question:'',answer:'',active:true,sort_order:(fList.length+1)}; paintFaqs(); };
    area.querySelectorAll('[data-fedit]').forEach(function(b){ b.onclick=function(){ fEditing=JSON.parse(JSON.stringify(fList.filter(function(x){return x.id===b.getAttribute('data-fedit');})[0])); paintFaqs(); }; });
    area.querySelectorAll('[data-fdel]').forEach(function(b){ b.onclick=function(){ if(!window.confirm('Delete this question?'))return; sb.from('faqs').delete().eq('id',b.getAttribute('data-fdel')).then(function(){ logAudit({ module:'Content', action:'delete', record_type:'faq', record_ref:'FAQ', remarks:'FAQ deleted', risk:'normal' }); toast('Deleted'); renderContentAdmin(); }); }; });
    area.querySelectorAll('[data-fmove]').forEach(function(b){ b.onclick=function(){ swapOrder('faqs',fList,b.getAttribute('data-fmove'),b.getAttribute('data-dir')); }; });
  }
  function faqFormHtml(q){
    return '<div class="panel"><h3>'+(q.id?'Edit question':'New question')+'</h3>'+
      '<div class="field"><label>Question <span class="req-star">*</span></label><input id="fQ" type="text" value="'+esc(q.question)+'" placeholder="e.g. How long does it take?"></div>'+
      '<div class="field"><label>Answer</label><textarea id="fA" style="min-height:90px">'+esc(q.answer||'')+'</textarea></div>'+
      '<div class="field"><label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer"><input id="fActive" type="checkbox" '+(q.active?'checked':'')+' style="width:auto"> Show on site</label></div>'+
      '<div class="signin-msg" id="fMsg"></div><div style="display:flex;gap:10px"><button class="btn btn-primary" id="fSave">Save</button><button class="btn btn-ghost" id="fCancel">Cancel</button></div></div>';
  }
  function wireFaqForm(){
    document.getElementById('fCancel').onclick=function(){ fEditing=null; paintFaqs(); };
    document.getElementById('fSave').onclick=function(){
      var qn=document.getElementById('fQ').value.trim(); var msg=document.getElementById('fMsg');
      if(!qn){ msg.className='signin-msg err'; msg.textContent='Please enter the question.'; return; }
      var payload={ question:qn, answer:document.getElementById('fA').value.trim()||null, active:document.getElementById('fActive').checked, sort_order:fEditing.sort_order||(fList.length+1) };
      var op=fEditing.id?sb.from('faqs').update(payload).eq('id',fEditing.id):sb.from('faqs').insert(payload);
      op.then(function(r){ if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save.'; return; } logAudit({ module:'Content', action:(fEditing.id?'edit':'create'), record_type:'faq', record_ref:'FAQ', remarks:'FAQ saved', risk:'normal' }); toast('Saved'); fEditing=null; renderContentAdmin(); });
    };
  }

  // ---- Reviews ----
  function paintReviews(){
    var area=document.getElementById('contentArea'); if(!area) return;
    if(rEditing){ area.innerHTML=reviewFormHtml(rEditing); wireReviewForm(); return; }
    var rows=rvList.map(function(rv){
      return '<div class="admin-app"><div class="arow"><div><h4>'+esc(rv.name)+' '+stars(rv.rating)+(rv.active?'':' <span class="status-pill sp-action" style="font-size:11px">Hidden</span>')+'</h4>'+
        '<div class="meta">'+(rv.location?esc(rv.location)+' · ':'')+esc((rv.body||'').slice(0,80))+'…</div></div>'+
        '<div style="display:flex;gap:8px"><button class="btn btn-ghost" data-rvedit="'+esc(rv.id)+'">Edit</button><button class="btn btn-ghost" data-rvdel="'+esc(rv.id)+'" style="color:var(--red)">Delete</button></div></div></div>';
    }).join('');
    area.innerHTML='<div style="margin-bottom:14px"><button class="btn btn-primary" id="rvAdd">+ Add review</button></div>'+(rows||'<div class="panel empty-state"><p>No reviews yet.</p></div>');
    document.getElementById('rvAdd').onclick=function(){ rEditing={id:null,name:'',location:'',rating:5,body:'',active:true,sort_order:(rvList.length+1)}; paintReviews(); };
    area.querySelectorAll('[data-rvedit]').forEach(function(b){ b.onclick=function(){ rEditing=JSON.parse(JSON.stringify(rvList.filter(function(x){return x.id===b.getAttribute('data-rvedit');})[0])); paintReviews(); }; });
    area.querySelectorAll('[data-rvdel]').forEach(function(b){ b.onclick=function(){ if(!window.confirm('Delete this review?'))return; sb.from('reviews').delete().eq('id',b.getAttribute('data-rvdel')).then(function(){ logAudit({ module:'Content', action:'delete', record_type:'review', record_ref:'Review', remarks:'Review deleted', risk:'normal' }); toast('Deleted'); renderContentAdmin(); }); }; });
  }
  function reviewFormHtml(rv){
    var ratingOpts=[5,4,3,2,1].map(function(n){ return '<option value="'+n+'"'+(n===rv.rating?' selected':'')+'>'+n+' star'+(n===1?'':'s')+'</option>'; }).join('');
    return '<div class="panel"><h3>'+(rv.id?'Edit review':'New review')+'</h3>'+
      '<div class="grid2"><div class="field"><label>Customer name <span class="req-star">*</span></label><input id="rvName" type="text" value="'+esc(rv.name)+'" placeholder="e.g. Aisha R."></div>'+
        '<div class="field"><label>Location (optional)</label><input id="rvLoc" type="text" value="'+esc(rv.location||'')+'" placeholder="e.g. Dubai, UAE"></div>'+
        '<div class="field"><label>Rating</label><select id="rvRating" style="width:100%;padding:13px 15px;border:1.5px solid var(--line);border-radius:12px;font-family:inherit;font-size:15px">'+ratingOpts+'</select></div></div>'+
      '<div class="field"><label>Review</label><textarea id="rvBody" style="min-height:90px" placeholder="What the customer said…">'+esc(rv.body||'')+'</textarea></div>'+
      '<div class="field"><label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer"><input id="rvActive" type="checkbox" '+(rv.active?'checked':'')+' style="width:auto"> Show on homepage</label></div>'+
      '<div class="signin-msg" id="rvMsg"></div><div style="display:flex;gap:10px"><button class="btn btn-primary" id="rvSave">Save</button><button class="btn btn-ghost" id="rvCancel">Cancel</button></div></div>';
  }
  function wireReviewForm(){
    document.getElementById('rvCancel').onclick=function(){ rEditing=null; paintReviews(); };
    document.getElementById('rvSave').onclick=function(){
      var name=document.getElementById('rvName').value.trim(); var msg=document.getElementById('rvMsg');
      if(!name){ msg.className='signin-msg err'; msg.textContent='Please enter the customer name.'; return; }
      var payload={ name:name, location:document.getElementById('rvLoc').value.trim()||null, rating:parseInt(document.getElementById('rvRating').value,10)||5,
        body:document.getElementById('rvBody').value.trim()||null, active:document.getElementById('rvActive').checked, sort_order:rEditing.sort_order||(rvList.length+1) };
      var op=rEditing.id?sb.from('reviews').update(payload).eq('id',rEditing.id):sb.from('reviews').insert(payload);
      op.then(function(r){ if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save.'; return; } logAudit({ module:'Content', action:(rEditing.id?'edit':'create'), record_type:'review', record_ref:'Review', remarks:'Review saved', risk:'normal' }); toast('Saved'); rEditing=null; renderContentAdmin(); });
    };
  }

  function swapOrder(table, list, id, dir){
    var i=-1; for(var k=0;k<list.length;k++){ if(list[k].id===id){ i=k; break; } }
    var j=dir==='up'?i-1:i+1; if(i<0||j<0||j>=list.length) return;
    Promise.all([ sb.from(table).update({sort_order:list[j].sort_order}).eq('id',list[i].id), sb.from(table).update({sort_order:list[i].sort_order}).eq('id',list[j].id) ]).then(function(){ renderContentAdmin(); });
  }

  // ============================================================
  //  COMMUNICATIONS (notification engine: automation, templates, history)
  // ============================================================
  var commsRule=null, commsTpls=[], commsMsgs=[], commsTplEditing=null, commsReviewUrl='';
  var commsFilters={ q:'', channel:'', status:'', type:'', from:'', to:'' }, commsFiltersOpen=false;
  var PLACEHOLDERS='Placeholders you can use: {{first_name}}, {{name}}, {{visa}}, {{country}}, {{reference}}, {{review_url}}, {{brand}}';

  // Group a template key into a friendly message "type" for filtering.
  function msgTypeKey(tk){ tk=tk||'';
    if(tk==='status-update'||tk==='wa-status-update') return 'status';
    if(tk==='app-received-email'||tk==='wa-app-received') return 'apprcvd';
    if(tk==='payment-received-email'||tk==='wa-payment') return 'payment';
    if(tk==='review-request'||tk==='wa-review') return 'review';
    if(tk==='wa-birthday') return 'birthday';
    return 'other'; }
  var MSG_TYPE_LABELS={ status:'Status update', apprcvd:'Application received', payment:'Payment received', review:'Review request', birthday:'Birthday', other:'Other' };
  function msgWhenDate(m){ return ((m.sent_at||m.created_at||m.scheduled_for)||'').slice(0,10); }
  function commsActiveCount(){ var f=commsFilters,n=0; if(f.q.trim())n++; if(f.channel)n++; if(f.status)n++; if(f.type)n++; if(f.from||f.to)n++; return n; }
  function commsFiltered(){
    var f=commsFilters, q=f.q.trim().toLowerCase();
    return commsMsgs.filter(function(m){
      if(f.channel && (m.channel||'')!==f.channel) return false;
      if(f.status && (m.status||'')!==f.status) return false;
      if(f.type && msgTypeKey(m.template_key)!==f.type) return false;
      var d=msgWhenDate(m);
      if(f.from && d<f.from) return false;
      if(f.to && d>f.to) return false;
      if(q){ var hay=((m.to_address||'')+' '+(m.subject||'')).toLowerCase(); if(hay.indexOf(q)===-1) return false; }
      return true;
    });
  }
  function commsCsv(){
    var rows=commsFiltered().map(function(m){
      return [ msgWhenDate(m), (m.to_address||''), (m.channel||''), MSG_TYPE_LABELS[msgTypeKey(m.template_key)]||'', (m.status||''), (m.subject||''), (m.reason||'') ];
    });
    downloadCsv('visadoo-messages.csv', ['Date','Recipient','Channel','Type','Status','Subject','Note'], rows);
  }

  function msgStatusPill(s){
    var map={ sent:['sp-done','Sent'], delivered:['sp-done','Delivered'], queued:['sp-progress','Queued'],
      skipped:['','Skipped'], failed:['sp-action','Failed'], cancelled:['','Cancelled'] };
    var m=map[s]||['',''+s];
    var extra=(s==='skipped'||s==='cancelled')?' style="background:#eef2f7;color:#64748b"':'';
    return '<span class="status-pill '+m[0]+'" '+extra+'>'+esc(m[1])+'</span>';
  }

  // ---- Messaging is split into three screens: Automations · Templates · Message history ----
  function renderAutomations(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('automations')+
      '<div class="app-head"><h1>Automations</h1><p>Messages that send themselves when something happens.</p></div>'+
      '<div id="autoArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    Promise.all([
      sb.from('automation_rules').select('*').eq('key','review-request').single(),
      sb.from('site_settings').select('google_review_url').eq('id','global').single()
    ]).then(function(res){
      commsRule=res[0].data||null;
      commsReviewUrl=(res[1].data&&res[1].data.google_review_url)||'';
      paintAutomations();
    });
  }

  function renderTemplates(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    if(!VISAS.length) loadVisaTypes();
    root.innerHTML='<div class="app-main">'+adminSections('templates')+
      '<div class="app-head"><h1>Message templates</h1><p>The wording of your automatic emails and WhatsApp messages.</p></div>'+
      '<div id="tplArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    sb.from('message_templates').select('*').order('key').then(function(r){ commsTpls=r.data||[]; commsTplEditing=null; paintTemplates(); });
  }

  function renderMsgHistory(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    if(!VISAS.length) loadVisaTypes();
    root.innerHTML='<div class="app-main">'+adminSections('msghistory')+
      '<div class="app-head"><h1>Message history</h1><p>Every email and WhatsApp the system has sent.</p></div>'+
      '<div id="histArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    sb.from('messages').select('id,customer_id,application_id,to_address,subject,status,reason,template_key,purpose,channel,created_at,sent_at,scheduled_for').order('created_at',{ascending:false}).limit(500)
      .then(function(r){ commsMsgs=r.data||[]; paintMsgHistory(); });
  }

  function paintAutomations(){
    var area=document.getElementById('autoArea'); if(!area) return;
    var ruleOn=commsRule?commsRule.active:false;
    var urlMissing=!commsReviewUrl;
    area.innerHTML='<div class="panel"><h3 style="font-size:17px;font-weight:800;margin-bottom:4px">Review-request automation</h3>'+
      '<p class="phint" style="margin-top:0">Automatically emails the customer <b>3 days after</b> you mark their visa as “Visa Issued”, asking for a Google review. Opt-outs are always respected.</p>'+
      '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin:10px 0"><input type="checkbox" id="cmAutoOn" '+(ruleOn?'checked':'')+' style="width:auto"> <span style="font-weight:600">Turn this automation on</span></label>'+
      '<div class="field"><label>Your Google review link</label>'+
        '<input id="cmReviewUrl" type="url" value="'+esc(commsReviewUrl)+'" placeholder="https://g.page/r/your-business/review" style="width:100%;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px">'+
        '<p class="phint">Paste the link customers use to leave you a Google review. '+(urlMissing?'<b style="color:var(--red)">Until this is set, review emails are skipped.</b>':'')+'</p></div>'+
      '<div class="signin-msg" id="cmMsg"></div>'+
      '<button class="btn btn-primary" id="cmSave">Save settings</button></div>'+
      '<p class="phint" style="margin-top:16px">Your other automatic messages — status updates, application &amp; payment confirmations, and birthday greetings — send automatically and don’t need switching on here.</p>';
    document.getElementById('cmSave').onclick=function(){
      var on=document.getElementById('cmAutoOn').checked;
      var url=document.getElementById('cmReviewUrl').value.trim()||null;
      var msg=document.getElementById('cmMsg'); var btn=document.getElementById('cmSave');
      btn.disabled=true; btn.textContent='Saving…';
      Promise.all([
        sb.from('automation_rules').update({active:on, updated_at:new Date().toISOString()}).eq('key','review-request'),
        sb.from('site_settings').update({google_review_url:url}).eq('id','global')
      ]).then(function(r){
        btn.disabled=false; btn.textContent='Save settings';
        if((r[0]&&r[0].error)||(r[1]&&r[1].error)){ msg.className='signin-msg err'; msg.style.display='block'; msg.textContent='Could not save.'; return; }
        if(commsRule) commsRule.active=on; commsReviewUrl=url||''; toast('Saved'); paintAutomations();
      });
    };
  }

  function paintTemplates(){
    var area=document.getElementById('tplArea'); if(!area) return;
    if(commsTplEditing){ area.innerHTML=tplEditorHtml(commsTplEditing); wireTplEditor(); return; }
    area.innerHTML=commsTpls.map(function(t){
      return '<div class="admin-app"><div class="arow"><div><h4>'+esc(t.name)+(t.active?'':' <span class="status-pill" style="background:#eef2f7;color:#64748b">Off</span>')+'</h4>'+
        '<div class="meta">'+esc(t.channel)+' · '+esc(t.subject||'(no subject)')+'</div></div>'+
        '<button class="btn btn-ghost" data-tpledit="'+esc(t.key)+'">Edit</button></div></div>';
    }).join('')||'<div class="panel empty-state"><p>No templates.</p></div>';
    area.querySelectorAll('[data-tpledit]').forEach(function(b){ b.onclick=function(){
      var k=b.getAttribute('data-tpledit'); commsTplEditing=JSON.parse(JSON.stringify(commsTpls.filter(function(x){return x.key===k;})[0])); paintTemplates();
    }; });
  }

  function paintMsgHistory(){
    var area=document.getElementById('histArea'); if(!area) return;
    var chOpts=[['','All channels'],['email','Email'],['whatsapp','WhatsApp']];
    var stOpts=[['','All statuses'],['sent','Sent'],['delivered','Delivered'],['queued','Queued'],['failed','Failed'],['skipped','Skipped'],['cancelled','Cancelled']];
    var tyOpts=[['','All types'],['status','Status update'],['apprcvd','Application received'],['payment','Payment received'],['review','Review request'],['birthday','Birthday'],['other','Other']];
    function selOpts(opts,cur){ return opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(cur===o[0]?' selected':'')+'>'+esc(o[1])+'</option>'; }).join(''); }
    area.innerHTML='<div class="app-toolbar">'+
        '<div class="app-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'+
        '<input id="cmSearch" type="text" value="'+esc(commsFilters.q)+'" placeholder="Search recipient or subject…"></div>'+
        '<button class="btn btn-ghost" id="cmFiltersBtn" type="button">Filters'+(commsActiveCount()?(' ('+commsActiveCount()+')'):'')+'</button>'+
        '<button class="btn btn-ghost" id="cmCsv" type="button">Download CSV</button>'+
      '</div>'+
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px">'+
        '<span id="cmCount" class="phint" style="margin:0"></span>'+
        '<button class="link-btn" id="cmClear" type="button" style="margin-left:auto;display:none">Clear all</button>'+
      '</div>'+
      '<div id="cmFilterPanel" class="panel" style="margin-top:12px;'+(commsFiltersOpen?'':'display:none')+'">'+
        '<div class="grid2">'+
          '<div class="field"><label>Channel</label><select id="cmfChannel">'+selOpts(chOpts,commsFilters.channel)+'</select></div>'+
          '<div class="field"><label>Delivery status</label><select id="cmfStatus">'+selOpts(stOpts,commsFilters.status)+'</select></div>'+
          '<div class="field"><label>Message type</label><select id="cmfType">'+selOpts(tyOpts,commsFilters.type)+'</select></div>'+
          '<div class="field"><label>&nbsp;</label><div class="phint" style="margin:0">Filter the sent-message log.</div></div>'+
          '<div class="field"><label>From date</label><input id="cmfFrom" type="date" value="'+esc(commsFilters.from)+'"></div>'+
          '<div class="field"><label>To date</label><input id="cmfTo" type="date" value="'+esc(commsFilters.to)+'"></div>'+
        '</div>'+
      '</div>'+
      '<div id="cmHist" style="margin-top:12px"></div>';
    var search=document.getElementById('cmSearch'); if(search) search.oninput=function(){ commsFilters.q=search.value; paintHist(); };
    document.getElementById('cmFiltersBtn').onclick=function(){ commsFiltersOpen=!commsFiltersOpen; document.getElementById('cmFilterPanel').style.display=commsFiltersOpen?'':'none'; };
    document.getElementById('cmCsv').onclick=commsCsv;
    document.getElementById('cmClear').onclick=function(){ commsFilters={ q:'', channel:'', status:'', type:'', from:'', to:'' }; paintMsgHistory(); };
    function bindCm(id,key){ var el=document.getElementById(id); if(el) el.onchange=function(){ commsFilters[key]=el.value; paintHist(); }; }
    bindCm('cmfChannel','channel'); bindCm('cmfStatus','status'); bindCm('cmfType','type'); bindCm('cmfFrom','from'); bindCm('cmfTo','to');
    paintHist();
  }

  // Turn a raw failure reason into a plain-English explanation + suggested fix.
  function msgFailInfo(m){
    var r=(m.reason||'').toLowerCase();
    if(r.indexOf('invalid phone')>-1 || (r.indexOf('telinfy')>-1 && r.indexOf('phone')>-1) || r.indexOf('no whatsapp number')>-1){
      return { why:'WhatsApp didn’t accept the phone number.', fix:'The number on file looks invalid. Open the customer’s profile, correct their WhatsApp number, then Resend.', cust:true };
    }
    if(r.indexOf('no valid email')>-1){ return { why:'No valid email address on file.', fix:'Add or correct the customer’s email on their profile, then Resend.', cust:true }; }
    if(r==='no consent'||r.indexOf('consent')>-1){ return { why:'The customer hasn’t opted in to this type of message.', fix:'Marketing messages only go to opted-in customers — no action needed unless they opt in.', cust:true }; }
    if(r.indexOf('not configured')>-1||r.indexOf('not_configured')>-1){ return { why:'WhatsApp/email sending isn’t fully set up.', fix:'Check the WhatsApp template or email settings, then Resend.', cust:false }; }
    if(r.indexOf('template')>-1){ return { why:'The message template is missing or switched off.', fix:'Turn the template on in Message templates, then Resend.', cust:false }; }
    if(r.indexOf('telinfy')>-1){ return { why:'WhatsApp provider rejected the message.', fix:'Provider said: “'+esc(m.reason)+'”. Fix the cause, then Resend.', cust:true }; }
    if(r.indexOf('brevo')>-1){ return { why:'The email provider rejected the message.', fix:'Provider said: “'+esc(m.reason)+'”. Then Resend.', cust:true }; }
    return { why:'The message could not be sent.', fix:(m.reason?('Details: “'+esc(m.reason)+'”. '):'')+'Try Resend, or check the customer’s details.', cust:true };
  }
  function msgFailBox(m){
    var fi=msgFailInfo(m);
    var openBtn=(fi.cust && m.customer_id)?'<button class="btn btn-ghost" data-openc="'+esc(m.customer_id)+'" style="padding:6px 12px;font-size:13px">Open customer profile</button>':'';
    return '<div style="margin-top:10px;padding:11px 13px;border:1px solid #fde0e0;background:#fff6f6;border-radius:10px">'+
      '<div style="font-weight:700;font-size:13.5px;color:#b91c1c">Why it failed: '+esc(fi.why)+'</div>'+
      '<div class="phint" style="margin:5px 0 9px">'+fi.fix+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap">'+openBtn+'<button class="btn btn-primary" data-resend="'+esc(m.id)+'" style="padding:6px 14px;font-size:13px">Resend</button></div>'+
    '</div>';
  }

  function paintHist(){
    var box=document.getElementById('cmHist'); if(!box) return;
    var rows=commsFiltered();
    var cnt=document.getElementById('cmCount'); if(cnt) cnt.textContent=rows.length+' of '+commsMsgs.length+' shown';
    var clr=document.getElementById('cmClear'); if(clr) clr.style.display=commsActiveCount()?'inline':'none';
    var fb=document.getElementById('cmFiltersBtn'); if(fb) fb.textContent='Filters'+(commsActiveCount()?(' ('+commsActiveCount()+')'):'');
    if(!commsMsgs.length){ box.innerHTML='<div class="panel empty-state"><p>No messages yet. Sent emails (status updates and automations) will appear here.</p></div>'; return; }
    if(!rows.length){ box.innerHTML='<div class="panel empty-state"><p>No messages match your search or filters.</p></div>'; return; }
    box.innerHTML=rows.map(function(m){
      var when=(m.status==='queued'&&m.scheduled_for)?('Scheduled · '+new Date(m.scheduled_for).toLocaleString()):new Date(m.sent_at||m.created_at).toLocaleString();
      var tpl=m.template_key==='review-request'?'Review request':(m.template_key==='status-update'?'Status update':(m.template_key||'Message'));
      var failed=(m.status==='failed');
      var reason=(m.reason && !failed)?(' · <span class="phint" style="display:inline">'+esc(m.reason)+'</span>'):'';
      return '<div class="admin-app"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h4 style="font-size:15px">'+esc(m.subject||tpl)+'</h4>'+
        '<div class="meta">'+esc(m.to_address||'')+' · '+esc(tpl)+' · '+esc(m.channel)+reason+'</div></div>'+
        '<div style="text-align:right;white-space:nowrap">'+msgStatusPill(m.status)+'<div class="phint" style="margin:4px 0 0">'+esc(when)+'</div></div>'+
      '</div>'+(failed?msgFailBox(m):'')+'</div>';
    }).join('');
    box.querySelectorAll('[data-openc]').forEach(function(b){ b.onclick=function(){ openCustomer(b.getAttribute('data-openc')); }; });
    box.querySelectorAll('[data-resend]').forEach(function(b){ b.onclick=function(){
      var id=b.getAttribute('data-resend'); b.disabled=true; b.innerHTML='<span class="spin"></span> Resending…';
      sb.from('messages').update({ status:'queued', scheduled_for:new Date().toISOString(), reason:null, updated_at:new Date().toISOString() }).eq('id',id).then(function(r){
        if(r.error){ b.disabled=false; b.innerHTML='Resend'; toast('Could not resend.'); console.error(r.error); return; }
        return fetch(fnUrl('process-due-messages'),{ method:'POST', headers:{ 'Content-Type':'application/json','apikey':cfg.SUPABASE_ANON_KEY }, body:'{}' })
          .then(function(){ toast('Resending…'); setTimeout(function(){ renderMsgHistory(); }, 2000); });
      });
    }; });
  }

  function tplEditorHtml(t){
    return '<div class="panel"><button class="link-btn" id="tplBack" style="margin-bottom:8px">← Back to templates</button>'+
      '<h3 style="font-size:17px;font-weight:800">Edit template — '+esc(t.name)+'</h3>'+
      '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin:8px 0"><input type="checkbox" id="tplActive" '+(t.active?'checked':'')+' style="width:auto"> <span>Active</span></label>'+
      '<div class="field"><label>Subject</label><input id="tplSubject" type="text" value="'+esc(t.subject||'')+'" style="width:100%;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px"></div>'+
      '<div class="field"><label>Body (HTML allowed)</label><textarea id="tplBody" style="width:100%;min-height:200px;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit">'+esc(t.body||'')+'</textarea></div>'+
      '<p class="phint">'+esc(PLACEHOLDERS)+'</p>'+
      '<div class="signin-msg" id="tplMsg"></div>'+
      '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="tplSave">Save template</button><button class="btn btn-ghost" id="tplCancel">Cancel</button></div></div>';
  }
  function wireTplEditor(){
    document.getElementById('tplBack').onclick=document.getElementById('tplCancel').onclick=function(){ commsTplEditing=null; paintTemplates(); };
    document.getElementById('tplSave').onclick=function(){
      var key=commsTplEditing.key, msg=document.getElementById('tplMsg'), btn=document.getElementById('tplSave');
      var payload={ subject:document.getElementById('tplSubject').value, body:document.getElementById('tplBody').value, active:document.getElementById('tplActive').checked, updated_at:new Date().toISOString() };
      btn.disabled=true; btn.textContent='Saving…';
      sb.from('message_templates').update(payload).eq('key',key).then(function(r){
        btn.disabled=false; btn.textContent='Save template';
        if(r.error){ msg.className='signin-msg err'; msg.style.display='block'; msg.textContent='Could not save.'; return; }
        commsTpls.forEach(function(t){ if(t.key===key){ t.subject=payload.subject; t.body=payload.body; t.active=payload.active; } });
        commsTplEditing=null; toast('Template saved'); paintTemplates();
      });
    };
  }

  // ============================================================
  //  ADMIN · EVENTS (international events that promote country visas)
  // ============================================================
  var evList=[], evEditing=null;
  var EVENT_CATEGORIES=['Music','Sports','Art & Culture','Business & Science'];
  function evSlugify(s){ return (s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  function evUniqueSlug(base, exceptId){
    var s=evSlugify(base)||'event', i=2, taken=s;
    var exists=function(x){ return evList.some(function(e){ return e.slug===x && e.id!==exceptId; }); };
    while(exists(taken)){ taken=s+'-'+i; i++; } return taken;
  }

  function renderEventsAdmin(){
    if(!canManageContent()){ go(defaultStaffView()); return; }
    root.innerHTML='<div class="app-main">'+adminSections('events')+
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap">'+
        '<div><h1>Events</h1><p>Major international events that promote your visa services. Each event links to that country’s visas.</p></div>'+
        '<button class="btn btn-primary" id="evNew">+ Add event</button>'+
      '</div>'+
      '<div id="evArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('evNew').onclick=function(){
      evEditing={ id:null, slug:'', name:'', country_slug:'', category:'Music', event_date:'', end_date:'', city:'', image_url:'', blurb:'', seo_title:'', seo_description:'', active:true };
      paintEv();
    };
    Promise.all([ sb.from('events').select('*').order('event_date',{ascending:true}), countryList.length?Promise.resolve(true):loadCountriesGroups() ]).then(function(res){
      evList=res[0].data||[]; evEditing=null; paintEv();
    });
  }

  function paintEv(){
    var area=document.getElementById('evArea'); if(!area) return;
    if(evEditing){ area.innerHTML=evFormHtml(evEditing); wireEvForm(); return; }
    if(!evList.length){ area.innerHTML='<div class="panel empty-state"><p>No events yet. Click “Add event” to create your first one.</p></div>'; return; }
    area.innerHTML='<div class="app-list">'+evList.map(evRow).join('')+'</div>';
    area.querySelectorAll('[data-evopen]').forEach(function(el){ el.onclick=function(){ var e=evList.filter(function(x){return x.id===el.getAttribute('data-evopen');})[0]; evEditing=JSON.parse(JSON.stringify(e)); paintEv(); }; });
  }

  function evRow(e){
    var when=e.event_date?new Date(e.event_date).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'No date';
    var sub=[countryName(e.country_slug), e.category, when].filter(Boolean).map(esc).join(' · ');
    var inactive=e.active?'':' <span class="status-pill pill-sm" style="background:#eef2f7;color:#64748b">Hidden</span>';
    return '<div class="app-row" data-evopen="'+esc(e.id)+'"><div class="ar-main">'+
      '<div class="ar-name">'+esc(e.name||'(untitled)')+inactive+'</div>'+
      '<div class="ar-sub">'+(sub||'—')+'</div></div>'+
      '<div class="ar-right">'+CHEV+'</div></div>';
  }

  function evFormHtml(e){
    var cOpts='<option value="">Select country…</option>'+countryList.map(function(c){ return '<option value="'+esc(c.slug)+'"'+(e.country_slug===c.slug?' selected':'')+'>'+esc(c.name)+'</option>'; }).join('');
    var cats=EVENT_CATEGORIES.slice();
    evList.forEach(function(x){ if(x.category && cats.indexOf(x.category)===-1) cats.push(x.category); });
    var catList=cats.map(function(c){ return '<option value="'+esc(c)+'">'; }).join('');
    return '<div class="panel">'+
      '<button class="link-btn" id="evBack" style="margin-bottom:10px">← Back to events</button>'+
      '<div class="field"><label>Event name <span class="req-star">*</span></label><input id="evName" type="text" value="'+esc(e.name||'')+'" placeholder="e.g. Exit Festival 2026"></div>'+
      '<div class="grid2">'+
        '<div class="field"><label>Country <span class="req-star">*</span></label><select id="evCountry">'+cOpts+'</select></div>'+
        '<div class="field"><label>Category</label><input id="evCategory" list="evCatList" value="'+esc(e.category||'')+'" placeholder="Music"><datalist id="evCatList">'+catList+'</datalist></div>'+
      '</div>'+
      '<div class="grid2">'+
        '<div class="field"><label>Start date <span class="req-star">*</span></label><input id="evDate" type="date" value="'+esc(e.event_date||'')+'"></div>'+
        '<div class="field"><label>End date (optional)</label><input id="evEnd" type="date" value="'+esc(e.end_date||'')+'"></div>'+
      '</div>'+
      '<div class="field"><label>City / venue (optional)</label><input id="evCity" type="text" value="'+esc(e.city||'')+'" placeholder="e.g. Novi Sad, Serbia"></div>'+
      '<div class="field"><label>Event image</label>'+
        '<div class="cover-drop" id="evCover"'+(e.image_url?(' style="background-image:url('+esc(e.image_url)+')"'):'')+'>'+(e.image_url?'':'<div class="ph">'+IMGICON+'<div>Click to add an event image</div></div>')+'</div>'+
        '<input type="file" id="evCoverFile" accept="image/*" style="display:none"><div class="phint" id="evCoverHint" style="margin-top:6px"></div></div>'+
      '<div class="field"><label>Image description (alt text)</label><input id="evImgAlt" type="text" value="'+esc(e.image_alt||'')+'" placeholder="Describe the event image"><div class="phint" style="margin-top:4px">For Google &amp; screen readers. Leave blank to use the event name.</div></div>'+
      '<div class="field"><label>Short description (shown on the event page)</label><textarea id="evBlurb" style="min-height:80px" placeholder="A line or two about the event.">'+esc(e.blurb||'')+'</textarea></div>'+
      '<div class="grid2">'+
        '<div class="field"><label>SEO title (optional)</label><input id="evSeoTitle" type="text" value="'+esc(e.seo_title||'')+'"></div>'+
        '<div class="field"><label>SEO description (optional)</label><input id="evSeoDesc" type="text" value="'+esc(e.seo_description||'')+'"></div>'+
      '</div>'+
      '<label style="display:flex;align-items:center;gap:9px;font-weight:500;cursor:pointer;margin-top:4px"><input id="evActive" type="checkbox" '+(e.active?'checked':'')+' style="width:auto"> Show on the website (live)</label>'+
      '<div class="signin-msg" id="evMsg"></div>'+
      '<div style="display:flex;gap:10px;margin-top:12px;align-items:center"><button class="btn btn-primary" id="evSave">'+(e.id?'Save changes':'Create event')+'</button>'+
        (e.id?'<button class="btn btn-ghost" id="evDel" style="color:var(--red)">Delete</button>':'')+
        (e.id&&e.slug?'<a class="link-btn" href="'+esc(publicDetailHref('event',e.slug))+'" target="_blank" rel="noopener" style="margin-left:auto">View live page ↗</a>':'')+
      '</div>'+
    '</div>';
  }

  function wireEvForm(){
    document.getElementById('evBack').onclick=function(){ evEditing=null; paintEv(); };
    var coverFile=document.getElementById('evCoverFile');
    document.getElementById('evCover').onclick=function(){ coverFile.click(); };
    coverFile.onchange=function(){
      var f=coverFile.files[0]; if(!f) return;
      var hint=document.getElementById('evCoverHint'); hint.textContent='Uploading…';
      uploadPublicImage(f,'events').then(function(url){
        evEditing.image_url=url;
        var d=document.getElementById('evCover'); d.style.backgroundImage='url('+url+')'; d.innerHTML='';
        hint.textContent='Image added';
      }).catch(function(err){ hint.textContent='';
        if(err&&err.code==='decode'){ toast('That looks like a HEIC photo — please use a JPG or PNG.'); }
        else if(err&&err.code==='big'){ toast('That image is too large (max 10 MB).'); }
        else { toast('Could not upload that image.'); console.error(err); } });
    };
    document.getElementById('evSave').onclick=function(){
      var name=document.getElementById('evName').value.trim();
      var country=document.getElementById('evCountry').value;
      var date=document.getElementById('evDate').value;
      var msg=document.getElementById('evMsg');
      function err(t){ msg.className='signin-msg err'; msg.style.display='block'; msg.textContent=t; }
      if(!name) return err('Please enter the event name.');
      if(!country) return err('Please choose the country.');
      if(!date) return err('Please set the start date.');
      var payload={
        name:name, country_slug:country,
        category:document.getElementById('evCategory').value.trim()||null,
        event_date:date, end_date:document.getElementById('evEnd').value||null,
        city:document.getElementById('evCity').value.trim()||null,
        image_url:evEditing.image_url||null,
        image_alt:document.getElementById('evImgAlt').value.trim()||null,
        blurb:document.getElementById('evBlurb').value.trim()||null,
        seo_title:document.getElementById('evSeoTitle').value.trim()||null,
        seo_description:document.getElementById('evSeoDesc').value.trim()||null,
        active:document.getElementById('evActive').checked,
        updated_at:new Date().toISOString()
      };
      var btn=document.getElementById('evSave'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
      var editingId=evEditing&&evEditing.id;
      if(!editingId) payload.slug=evUniqueSlug(name,null);
      var op = editingId ? sb.from('events').update(payload).eq('id',editingId).select().single() : sb.from('events').insert(payload).select().single();
      op.then(function(r){
        btn.disabled=false; btn.innerHTML='Save';
        if(r.error){ err('Could not save. Please try again.'); console.error(r.error); return; }
        logAudit({ module:'Catalogue', action:(editingId?'edit':'create'), record_type:'event', record_ref:name, remarks:'Event saved', risk:'normal' });
        evEditing=null; toast('Event saved'); renderEventsAdmin();
      });
    };
    var del=document.getElementById('evDel'); if(del) del.onclick=function(){
      if(!window.confirm('Delete this event? This cannot be undone.')) return;
      var evName=evEditing.name;
      sb.from('events').delete().eq('id',evEditing.id).then(function(r){ if(r.error){ toast('Could not delete.'); console.error(r.error); return; } logAudit({ module:'Catalogue', action:'delete', record_type:'event', record_ref:evName, remarks:'Event deleted', risk:'high' }); evEditing=null; toast('Event deleted'); renderEventsAdmin(); });
    };
  }

  // ============================================================
  //  ADMIN · AUDIT CENTRE (platform-wide change log; admin/owner only)
  // ============================================================
  // Write a platform audit entry (future modules call this). Admin-gated by RLS; never pass secrets.
  function logAudit(o){
    try {
      return sb.from('audit_logs').insert({
        module:o.module, action:o.action, record_type:o.record_type||null, record_id:o.record_id||null,
        record_ref:o.record_ref||null, field:o.field||null,
        old_value:(o.old_value==null?null:String(o.old_value)), new_value:(o.new_value==null?null:String(o.new_value)),
        remarks:o.remarks||null, risk:o.risk||'normal', meta:o.meta||{},
        actor:(state.user&&state.user.id)||null, actor_email:(state.user&&state.user.email)||null, actor_role:state.role||null
      });
    } catch(_e){ return Promise.resolve(); }
  }

  var auditFilters={ q:'', module:'', action:'', from:'', to:'', riskonly:false }, auditFiltersOpen=false, auditRows=[], auditExpanded=null;
  var AUDIT_ACTION_LABELS={ edit:'Edited', create:'Created', delete:'Deleted', role_change:'Role changed', status_change:'Status changed', payment_update:'Payment update', 'refund-approve':'Refund approved', 'refund-request':'Refund requested', refund:'Refund', sent:'Message sent', failed:'Message failed', skipped:'Message skipped', queued:'Message queued', delivered:'Message delivered', export:'Export', login:'Sign-in' };
  function auditActionLabel(a){ return AUDIT_ACTION_LABELS[a]||(a?(a.charAt(0).toUpperCase()+a.slice(1)):'Action'); }
  function auditRiskPill(r){ if(r==='high') return '<span class="status-pill sp-action pill-sm">High-risk</span>'; if(r==='sensitive') return '<span class="status-pill sp-progress pill-sm">Sensitive</span>'; return '<span class="status-pill pill-sm" style="background:#eef2f7;color:#64748b">Normal</span>'; }

  function loadAuditData(){
    var R=function(d){ return Promise.resolve({data:d}); };
    return Promise.all([
      sb.from('audit_logs').select('*').order('occurred_at',{ascending:false}).limit(1000),
      sb.from('application_edits').select('*').order('edited_at',{ascending:false}).limit(1000),
      sb.from('customer_edits').select('*').order('edited_at',{ascending:false}).limit(1000),
      sb.from('finance_audit_log').select('*').order('created_at',{ascending:false}).limit(1000).then(function(r){return r;}, function(){return {data:[]};}),
      sb.from('messages').select('id,channel,template_key,to_address,status,reason,sent_at,created_at').order('created_at',{ascending:false}).limit(500),
      sb.from('applications').select('id,reference_code,full_name'),
      sb.from('customers').select('id,full_name,email')
    ]).then(function(res){
      var apps={}, custs={};
      (res[5].data||[]).forEach(function(a){ apps[a.id]=a; });
      (res[6].data||[]).forEach(function(c){ custs[c.id]=c; });
      var out=[];
      (res[0].data||[]).forEach(function(e){ out.push({ ts:e.occurred_at, who:e.actor_email||e.actor_role||'—', module:e.module, action:e.action, ref:e.record_ref||'', field:e.field||'', old:e.old_value, new:e.new_value, remarks:e.remarks||'', risk:e.risk||'normal' }); });
      (res[1].data||[]).forEach(function(e){ var a=apps[e.application_id]||{}; out.push({ ts:e.edited_at, who:e.edited_by_email||'—', module:'Applications', action:'edit', ref:(a.reference_code||a.full_name||'application'), field:appFieldLabel(e.field), old:appFieldDisplay(e.field,e.old_value), new:appFieldDisplay(e.field,e.new_value), remarks:'', risk:(['phone','email','passport_number'].indexOf(e.field)>-1?'sensitive':'normal') }); });
      (res[2].data||[]).forEach(function(e){ var c=custs[e.customer_id]||{}; out.push({ ts:e.edited_at, who:e.edited_by_email||'—', module:'Customers', action:'edit', ref:(c.full_name||c.email||'customer'), field:custFieldLabel(e.field), old:e.old_value, new:e.new_value, remarks:'', risk:(['phone','email'].indexOf(e.field)>-1?'sensitive':'normal') }); });
      (res[3].data||[]).forEach(function(e){ out.push({ ts:e.created_at, who:(e.actor_role?('('+e.actor_role+')'):'—'), module:'Finance', action:(e.action||'update'), ref:((e.entity_type||'')+(e.entity_id?(' '+String(e.entity_id).slice(0,8)):'')), field:e.field||'', old:e.old_value, new:e.new_value, remarks:e.remarks||'', risk:(/delete|approve|refund/i.test(e.action||'')?'high':'sensitive') }); });
      (res[4].data||[]).forEach(function(m){ out.push({ ts:(m.sent_at||m.created_at), who:'System', module:'Messaging', action:(m.status||'message'), ref:(m.to_address||m.channel||''), field:(m.template_key||''), old:'', new:'', remarks:(m.reason||''), risk:(m.status==='failed'?'sensitive':'normal') }); });
      out.sort(function(a,b){ return new Date(b.ts)-new Date(a.ts); });
      auditRows=out;
    });
  }

  function renderAudit(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    auditFilters={ q:'', module:'', action:'', from:'', to:'', riskonly:false }; auditFiltersOpen=false; auditExpanded=null;
    root.innerHTML='<div class="app-main">'+adminSections('audit')+
      '<div class="app-head"><h1>Audit Centre</h1><p>Every important change across the platform — who did what, and when. Admin/Owner only.</p></div>'+
      '<div style="margin-bottom:14px"><div class="app-toolbar">'+
        '<div class="app-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'+
        '<input id="auQ" type="text" placeholder="Search reference, person or details…"></div>'+
        '<button class="btn btn-ghost" id="auFiltersBtn" type="button">Filters</button>'+
      '</div>'+
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:6px"><span id="auCount" class="phint" style="margin:0"></span><button class="link-btn" id="auClear" type="button" style="margin-left:auto;display:none">Clear all</button></div>'+
      '<div id="auFilterPanel" class="panel" style="margin-top:12px;display:none">'+
        '<div class="grid2">'+
          '<div class="field"><label>Module</label><select id="auModule"></select></div>'+
          '<div class="field"><label>Action</label><select id="auAction"></select></div>'+
          '<div class="field"><label>From date</label><input id="auFrom" type="date"></div>'+
          '<div class="field"><label>To date</label><input id="auTo" type="date"></div>'+
        '</div>'+
        '<label style="display:flex;gap:7px;align-items:center;font-weight:500;cursor:pointer;margin-top:6px"><input type="checkbox" id="auRisk" style="width:auto"> Show only sensitive / high-risk actions</label>'+
      '</div></div>'+
      '<div id="auList"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    document.getElementById('auFiltersBtn').onclick=function(){ auditFiltersOpen=!auditFiltersOpen; document.getElementById('auFilterPanel').style.display=auditFiltersOpen?'':'none'; };
    document.getElementById('auClear').onclick=function(){ auditFilters={ q:'', module:'', action:'', from:'', to:'', riskonly:false }; renderAuditControls(); paintAudit(); };
    var q=document.getElementById('auQ'); q.oninput=function(){ auditFilters.q=q.value; paintAudit(); };
    loadAuditData().then(function(){ renderAuditControls(); paintAudit(); });
  }

  function renderAuditControls(){
    function fill(id,key,label){
      var el=document.getElementById(id); if(!el) return;
      var vals={}; auditRows.forEach(function(r){ if(r[key]) vals[r[key]]=true; });
      var opts=['<option value="">'+label+'</option>'].concat(Object.keys(vals).sort().map(function(v){ return '<option value="'+esc(v)+'"'+(auditFilters[key]===v?' selected':'')+'>'+esc(key==='action'?auditActionLabel(v):v)+'</option>'; }));
      el.innerHTML=opts.join('');
      el.onchange=function(){ auditFilters[key]=el.value; paintAudit(); };
    }
    fill('auModule','module','All modules'); fill('auAction','action','All actions');
    var f=document.getElementById('auFrom'); if(f){ f.value=auditFilters.from; f.onchange=function(){ auditFilters.from=f.value; paintAudit(); }; }
    var t=document.getElementById('auTo'); if(t){ t.value=auditFilters.to; t.onchange=function(){ auditFilters.to=t.value; paintAudit(); }; }
    var rk=document.getElementById('auRisk'); if(rk){ rk.checked=auditFilters.riskonly; rk.onchange=function(){ auditFilters.riskonly=rk.checked; paintAudit(); }; }
  }
  function auditActiveCount(){ var f=auditFilters,n=0; if(f.q.trim())n++; if(f.module)n++; if(f.action)n++; if(f.from||f.to)n++; if(f.riskonly)n++; return n; }
  function auditFiltered(){
    var f=auditFilters, q=f.q.trim().toLowerCase();
    return auditRows.filter(function(r){
      if(f.module && r.module!==f.module) return false;
      if(f.action && r.action!==f.action) return false;
      if(f.riskonly && r.risk==='normal') return false;
      var d=(r.ts||'').slice(0,10);
      if(f.from && d<f.from) return false;
      if(f.to && d>f.to) return false;
      if(q){ var hay=[r.who,r.module,r.action,r.ref,r.field,r.old,r.new,r.remarks].map(function(x){return (x==null?'':String(x)).toLowerCase();}).join(' '); if(hay.indexOf(q)===-1) return false; }
      return true;
    });
  }
  function paintAudit(){
    var box=document.getElementById('auList'); if(!box) return;
    var rows=auditFiltered();
    var cnt=document.getElementById('auCount'); if(cnt) cnt.textContent=rows.length+' of '+auditRows.length+' events';
    var clr=document.getElementById('auClear'); if(clr) clr.style.display=auditActiveCount()?'inline':'none';
    var fb=document.getElementById('auFiltersBtn'); if(fb) fb.textContent='Filters'+(auditActiveCount()?(' ('+auditActiveCount()+')'):'');
    if(!auditRows.length){ box.innerHTML='<div class="panel empty-state"><p>No audit events yet.</p></div>'; return; }
    if(!rows.length){ box.innerHTML='<div class="panel empty-state"><p>No events match your search or filters.</p></div>'; return; }
    var shown=rows.slice(0,200);
    box.innerHTML=shown.map(function(r,i){
      var exp=(auditExpanded===i);
      var detail = exp ? ('<div style="margin-top:8px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#fafcff;font-size:13.5px">'+
        (r.field?('<div><b>Field:</b> '+esc(r.field)+'</div>'):'')+
        (((r.old!=null&&r.old!=='')||(r.new!=null&&r.new!==''))?('<div><b>Change:</b> '+esc((r.old==null||r.old==='')?'(empty)':r.old)+' → '+esc((r.new==null||r.new==='')?'(empty)':r.new)+'</div>'):'')+
        (r.remarks?('<div><b>Note:</b> '+esc(r.remarks)+'</div>'):'')+
        '<div class="phint" style="margin:4px 0 0">'+esc(r.module)+' · '+esc(auditActionLabel(r.action))+' · '+esc(new Date(r.ts).toLocaleString())+'</div></div>') : '';
      return '<div class="admin-app" data-auidx="'+i+'" style="cursor:pointer"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h4 style="font-size:15px">'+esc(r.module)+' · '+esc(auditActionLabel(r.action))+(r.ref?(' — '+esc(r.ref)):'')+'</h4>'+
        '<div class="meta">'+(r.field?(esc(r.field)+' · '):'')+'by '+esc(r.who)+' · '+esc(new Date(r.ts).toLocaleString())+'</div>'+detail+'</div>'+
        '<div style="text-align:right;white-space:nowrap">'+auditRiskPill(r.risk)+'</div>'+
      '</div></div>';
    }).join('')+(rows.length>200?'<div class="phint" style="text-align:center;margin-top:10px">Showing the most recent 200 of '+rows.length+' — narrow with filters to see more.</div>':'');
    box.querySelectorAll('[data-auidx]').forEach(function(el){ el.onclick=function(){ var i=parseInt(el.getAttribute('data-auidx'),10); auditExpanded=(auditExpanded===i?null:i); paintAudit(); }; });
  }

  // ============================================================
  //  ADMIN DASHBOARD (read-only, role-aware) — Phase 1
  // ============================================================
  var dashTab='overview', dashRaw=null, dashLoading=false, dashCharts={};
  var dashFilters={ preset:'thisMonth', from:'', to:'', staff:'all', country:'', source:'all' };
  function dashSeeMoney(){ return isFinance(); }            // admin/finance see revenue
  function dashSeeAll(){ return hasRole(['admin','finance']); } // see everyone; else own performance only
  function dashPad(n){ return (n<10?'0':'')+n; }
  function dashFmt(d){ return d.getFullYear()+'-'+dashPad(d.getMonth()+1)+'-'+dashPad(d.getDate()); }
  function dashRange(){
    var now=new Date(), y=now.getFullYear(), m=now.getMonth(), d=now.getDate(), q=Math.floor(m/3)*3;
    switch(dashFilters.preset){
      case 'today': return [dashFmt(now),dashFmt(now)];
      case 'thisWeek': { var dow=(now.getDay()+6)%7; return [dashFmt(new Date(y,m,d-dow)),dashFmt(now)]; }
      case 'thisMonth': return [dashFmt(new Date(y,m,1)),dashFmt(now)];
      case 'lastMonth': return [dashFmt(new Date(y,m-1,1)),dashFmt(new Date(y,m,0))];
      case 'thisQuarter': return [dashFmt(new Date(y,q,1)),dashFmt(now)];
      case 'thisYear': return [dashFmt(new Date(y,0,1)),dashFmt(now)];
      case 'custom': return [dashFilters.from||'2000-01-01', dashFilters.to||dashFmt(now)];
      default: return ['2000-01-01', dashFmt(now)]; // all
    }
  }
  function dashInRange(ts){ if(!ts) return false; var d=String(ts).slice(0,10); var r=dashRange(); return d>=r[0] && d<=r[1]; }
  function dashCountrySlug(a){ var v=visaById(a.visa_type); return v?v.country_slug:''; }
  function dashStaffName(uid){ if(!uid) return 'Unassigned'; if(state.user&&uid===state.user.id) return 'You'; var s=(dashRaw&&dashRaw.staffById&&dashRaw.staffById[uid]); return s?(s.full_name||s.email||'Staff'):'Staff'; }
  function dashLockedStaff(){ return dashSeeAll()? (dashFilters.staff) : ((state.user&&state.user.id)||'__none__'); }

  function dashLeads(){ var staff=dashLockedStaff();
    return (dashRaw.leads||[]).filter(function(l){
      if(!dashInRange(l.created_at)) return false;
      if(staff!=='all' && (l.owner||'')!==staff) return false;
      if(dashFilters.country && (l.country_slug||'')!==dashFilters.country) return false;
      if(dashFilters.source!=='all' && (l.source||'')!==dashFilters.source) return false;
      return true; });
  }
  function dashEnq(){ return (dashRaw.enquiries||[]).filter(function(e){
      if(!dashInRange(e.created_at)) return false;
      if(dashFilters.source!=='all' && (e.source||'')!==dashFilters.source) return false;
      return true; });
  }
  function dashApps(){ return (dashRaw.apps||[]).filter(function(a){
      if(!dashInRange(a.created_at)) return false;
      if(dashFilters.country && dashCountrySlug(a)!==dashFilters.country) return false;
      return true; });
  }
  function dashActs(){ var staff=dashLockedStaff();
    return (dashRaw.acts||[]).filter(function(a){
      if(!dashInRange(a.created_at)) return false;
      if(staff!=='all' && (a.actor||'')!==staff) return false;
      return true; });
  }
  function dashPays(){ if(!dashSeeMoney()) return [];
    return (dashRaw.pays||[]).filter(function(p){ return dashInRange(p.created_at); });
  }

  function dChart(id,cfg){ if(!window.Chart){ return; } var el=document.getElementById(id); if(!el) return;
    if(dashCharts[id]){ try{dashCharts[id].destroy();}catch(_e){} } dashCharts[id]=new window.Chart(el,cfg); }
  var DASH_C={ blue:'#2456C4', teal:'#0E7C6B', amber:'#C98A12', red:'#B3402E', violet:'#6C4AB0', grey:'#94a3b8', ink:'#16233B' };
  function dashKpisHtml(items){ return '<div class="dash-kpis">'+items.map(function(k){
      return '<div class="dash-kpi '+(k.tone||'')+'"><div class="dv">'+k.v+'</div><div class="dl">'+esc(k.l)+'</div>'+(k.s?('<div class="ds">'+esc(k.s)+'</div>'):'')+'</div>'; }).join('')+'</div>'; }
  function dashBars(rows){ // rows:[{label,n,color}] horizontal css bars
    var max=Math.max.apply(null,rows.map(function(r){return r.n;}).concat([1]));
    return '<div class="dash-barlist">'+rows.map(function(r){
      return '<div class="dbrow"><div class="dblabel">'+esc(r.label)+'</div><div class="dbtrack"><div class="dbfill" style="width:'+Math.max(2,Math.round(r.n/max*100))+'%;background:'+(r.color||DASH_C.blue)+'"></div></div><div class="dbval">'+r.n+'</div></div>';
    }).join('')+'</div>'; }

  function renderDashboard(){
    if(!isStaff()){ go('apply'); return; }
    if(!VISAS.length) loadVisaTypes();
    if(!countryList.length) loadCountriesGroups();
    root.innerHTML='<div class="app-main">'+adminSections('dashboard')+
      '<div class="app-head"><h1>Dashboard</h1><p>Your daily view of leads, operations'+(dashSeeMoney()?', revenue':'')+' and team activity. Read-only.</p></div>'+
      '<div id="dashFilters"></div><div id="dashTabs" class="dash-tabs"></div>'+
      '<div id="dashBody"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'+
    '</div>';
    wireAdminSections();
    // Show cached view instantly (no flicker) if we have one, then ALWAYS re-fetch from the
    // server so newly added leads/applications/payments appear without needing a hard refresh.
    if(dashRaw){ paintDashFilters(); paintDashTabs(); paintDash(); }
    loadDashData();
  }
  function loadDashData(){
    if(dashLoading) return; dashLoading=true;
    var Rz=function(d){ return Promise.resolve({data:d}); };
    Promise.all([
      sb.from('leads').select('id,stage,source,owner,created_at,expected_value,application_id,country_slug,visa_type').limit(5000),
      sb.from('enquiries').select('id,status,source,created_at').limit(5000),
      sb.from('applications').select('id,status,visa_type,created_at,reference_code').limit(5000),
      sb.from('lead_activities').select('actor,type,created_at').limit(8000),
      sb.from('profiles').select('id,full_name,email,role').neq('role','customer'),
      dashSeeMoney()? sb.from('customer_payments').select('amount,kind,status,created_at,application_id').limit(8000) : Rz([])
    ]).then(function(res){
      dashLoading=false;
      if(state.view!=='dashboard') return; // user navigated away while loading
      var staff=(res[4].data||[]); var staffById={}; staff.forEach(function(s){ staffById[s.id]=s; });
      dashRaw={ leads:res[0].data||[], enquiries:res[1].data||[], apps:res[2].data||[], acts:res[3].data||[], staff:staff, staffById:staffById, pays:res[5].data||[] };
      paintDashFilters(); paintDashTabs(); paintDash();
    }).catch(function(e){ dashLoading=false; if(!dashRaw){ var b=document.getElementById('dashBody'); if(b) b.innerHTML='<div class="panel empty-state"><p>Could not load the dashboard. Please refresh.</p></div>'; } console.error(e); });
  }

  function paintDashFilters(){
    var host=document.getElementById('dashFilters'); if(!host) return;
    var presets=[['today','Today'],['thisWeek','This week'],['thisMonth','This month'],['lastMonth','Last month'],['thisQuarter','This quarter'],['thisYear','This year'],['all','All time'],['custom','Custom']];
    var presetSel='<select id="dfPreset" class="dash-sel">'+presets.map(function(p){return '<option value="'+p[0]+'"'+(dashFilters.preset===p[0]?' selected':'')+'>'+p[1]+'</option>';}).join('')+'</select>';
    var custom='<span id="dfCustom" style="'+(dashFilters.preset==='custom'?'':'display:none')+'"><input type="date" id="dfFrom" class="dash-date" value="'+esc(dashFilters.from)+'"> to <input type="date" id="dfTo" class="dash-date" value="'+esc(dashFilters.to)+'"></span>';
    var staffSel='';
    if(dashSeeAll()){
      staffSel='<select id="dfStaff" class="dash-sel"><option value="all">All staff</option>'+
        (dashRaw.staff||[]).map(function(s){return '<option value="'+esc(s.id)+'"'+(dashFilters.staff===s.id?' selected':'')+'>'+esc(s.full_name||s.email)+'</option>';}).join('')+'</select>';
    }
    var countrySel='<select id="dfCountry" class="dash-sel"><option value="">All countries</option>'+
      countryList.map(function(c){return '<option value="'+esc(c.slug)+'"'+(dashFilters.country===c.slug?' selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select>';
    var srcSel='<select id="dfSource" class="dash-sel"><option value="all">All sources</option>'+
      LEAD_SOURCES.map(function(s){return '<option value="'+s+'"'+(dashFilters.source===s?' selected':'')+'>'+srcLabel(s)+'</option>';}).join('')+'</select>';
    host.innerHTML='<div class="dash-filterbar">'+
      '<div class="dff"><label>Period</label>'+presetSel+' '+custom+'</div>'+
      (staffSel?('<div class="dff"><label>Staff</label>'+staffSel+'</div>'):'')+
      '<div class="dff"><label>Country</label>'+countrySel+'</div>'+
      '<div class="dff"><label>Lead source</label>'+srcSel+'</div>'+
      '<button class="btn btn-ghost btn-sm" id="dfRefresh" type="button">↻ Refresh</button>'+
      '<button class="link-btn" id="dfReset" type="button">Clear</button>'+
    '</div>';
    document.getElementById('dfPreset').onchange=function(){ dashFilters.preset=this.value; document.getElementById('dfCustom').style.display=(this.value==='custom')?'':'none'; if(this.value!=='custom') paintDash(); };
    var ff=document.getElementById('dfFrom'), ft=document.getElementById('dfTo');
    if(ff) ff.onchange=function(){ dashFilters.from=ff.value; if(ft.value) paintDash(); };
    if(ft) ft.onchange=function(){ dashFilters.to=ft.value; if(ff.value) paintDash(); };
    var ds=document.getElementById('dfStaff'); if(ds) ds.onchange=function(){ dashFilters.staff=ds.value; paintDash(); };
    document.getElementById('dfCountry').onchange=function(){ dashFilters.country=this.value; paintDash(); };
    document.getElementById('dfSource').onchange=function(){ dashFilters.source=this.value; paintDash(); };
    var dref=document.getElementById('dfRefresh'); if(dref) dref.onclick=function(){ loadDashData(); toast('Refreshing…'); };
    document.getElementById('dfReset').onclick=function(){ dashFilters={ preset:'thisMonth', from:'', to:'', staff:'all', country:'', source:'all' }; paintDashFilters(); paintDash(); };
  }

  function paintDashTabs(){
    var host=document.getElementById('dashTabs'); if(!host) return;
    var tabs=[['overview','Overview'],['leads','Leads'],['ops','Operations'],['staff','Staff performance']];
    if(dashSeeMoney()) tabs.push(['revenue','Revenue']);
    if(!tabs.some(function(t){return t[0]===dashTab;})) dashTab='overview';
    host.innerHTML=tabs.map(function(t){ return '<button class="dash-tab'+(dashTab===t[0]?' active':'')+'" data-dtab="'+t[0]+'">'+esc(t[1])+'</button>'; }).join('');
    host.querySelectorAll('[data-dtab]').forEach(function(b){ b.onclick=function(){ dashTab=b.getAttribute('data-dtab'); paintDashTabs(); paintDash(); }; });
  }

  function paintDash(){
    var b=document.getElementById('dashBody'); if(!b) return;
    if(dashTab==='overview') paintDashOverview(b);
    else if(dashTab==='leads') paintDashLeads(b);
    else if(dashTab==='ops') paintDashOps(b);
    else if(dashTab==='staff') paintDashStaff(b);
    else if(dashTab==='revenue' && dashSeeMoney()) paintDashRevenue(b);
    else paintDashOverview(b);
  }

  function paintDashOverview(b){
    var leads=dashLeads(), enq=dashEnq(), apps=dashApps();
    var converted=leads.filter(function(l){ return l.stage==='converted' || l.application_id; }).length;
    var issued=apps.filter(function(a){ return a.status==='Visa Issued'; }).length;
    var needAction=apps.filter(function(a){ return a.status==='Action Needed'; }).length;
    var inProg=apps.filter(function(a){ return a.status!=='Visa Issued'; }).length;
    var kpis=[
      {v:leads.length, l:'New leads', tone:'blue'},
      {v:enq.length, l:'New enquiries'},
      {v:inProg, l:'Applications in progress', tone:'blue'},
      {v:needAction, l:'Needing action', tone:(needAction?'amber':'')},
      {v:issued, l:'Visas issued', tone:'teal'},
      {v:converted, l:'Leads converted', tone:'teal'}
    ];
    if(dashSeeMoney()){
      var pays=dashPays();
      var collected=pays.filter(function(p){return p.kind==='payment'&&p.status==='approved';}).reduce(function(x,p){return x+Number(p.amount||0);},0);
      var pend=pays.filter(function(p){return p.kind==='payment'&&p.status==='pending';}).reduce(function(x,p){return x+Number(p.amount||0);},0);
      kpis.push({v:money(collected), l:'Money collected', tone:'teal'});
      kpis.push({v:money(pend), l:'Payments pending', tone:(pend?'amber':'')});
    }
    // lead funnel
    var funnel=LEAD_STAGES.map(function(s){ return { label:LEAD_STAGE_LABELS[s], n:leads.filter(function(l){return l.stage===s;}).length, color:(s==='lost'?DASH_C.red:(s==='converted'?DASH_C.teal:DASH_C.blue)) }; });
    // apps by status
    var stRows=ALL_STATUSES.map(function(s){ return { label:s, n:apps.filter(function(a){return a.status===s;}).length, color:(s==='Visa Issued'?DASH_C.teal:(s==='Action Needed'?DASH_C.amber:DASH_C.blue)) }; }).filter(function(r){return r.n>0;});
    b.innerHTML=dashKpisHtml(kpis)+
      '<div class="dash-grid2">'+
        '<div class="panel"><h3>Lead funnel</h3><p class="phint">Where your leads sit right now'+(dashSeeAll()?'':' (your leads)')+'.</p>'+dashBars(funnel)+'</div>'+
        '<div class="panel"><h3>Applications by stage</h3><p class="phint">Live operational workload.</p>'+(stRows.length?dashBars(stRows):'<p class="phint">No applications in this period.</p>')+'</div>'+
      '</div>';
  }

  function paintDashLeads(b){
    var leads=dashLeads();
    var srcs={}; LEAD_SOURCES.forEach(function(s){ srcs[s]=0; });
    leads.forEach(function(l){ var s=l.source||'manual'; srcs[s]=(srcs[s]||0)+1; });
    var srcRows=Object.keys(srcs).filter(function(s){return srcs[s]>0;}).map(function(s){
      var mine=leads.filter(function(l){return (l.source||'manual')===s;});
      var conv=mine.filter(function(l){return l.stage==='converted'||l.application_id;}).length;
      return { s:s, total:mine.length, conv:conv, rate: mine.length?Math.round(conv/mine.length*100):0 };
    }).sort(function(a,b){return b.total-a.total;});
    var converted=leads.filter(function(l){ return l.stage==='converted'||l.application_id; }).length;
    var lost=leads.filter(function(l){ return l.stage==='lost'; }).length;
    var kpis=[
      {v:leads.length, l:'Total leads', tone:'blue'},
      {v:converted, l:'Converted', tone:'teal'},
      {v: leads.length?Math.round(converted/leads.length*100)+'%':'0%', l:'Conversion rate', tone:'teal'},
      {v:lost, l:'Lost', tone:(lost?'red':'')}
    ];
    var funnel=LEAD_STAGES.map(function(s){ return { label:LEAD_STAGE_LABELS[s], n:leads.filter(function(l){return l.stage===s;}).length, color:(s==='lost'?DASH_C.red:(s==='converted'?DASH_C.teal:DASH_C.blue)) }; });
    var table='<table class="dash-table"><thead><tr><th>Source</th><th class="num">Leads</th><th class="num">Converted</th><th class="num">Rate</th></tr></thead><tbody>'+
      (srcRows.length?srcRows.map(function(r){ return '<tr><td>'+esc(srcLabel(r.s))+'</td><td class="num">'+r.total+'</td><td class="num">'+r.conv+'</td><td class="num">'+r.rate+'%</td></tr>'; }).join(''):'<tr><td colspan="4" class="phint" style="text-align:center;padding:16px">No leads in this period.</td></tr>')+
      '</tbody></table>';
    b.innerHTML=dashKpisHtml(kpis)+
      '<div class="dash-grid2">'+
        '<div class="panel"><h3>Lead funnel</h3>'+dashBars(funnel)+'</div>'+
        '<div class="panel"><h3>Leads by source</h3><div class="dash-chartbox"><canvas id="dcLeadSrc"></canvas></div></div>'+
      '</div>'+
      '<div class="panel" style="margin-top:14px"><h3>Source performance</h3>'+table+'</div>';
    dChart('dcLeadSrc',{ type:'doughnut', data:{ labels:srcRows.map(function(r){return srcLabel(r.s);}), datasets:[{ data:srcRows.map(function(r){return r.total;}), backgroundColor:[DASH_C.blue,DASH_C.teal,DASH_C.amber,DASH_C.violet,DASH_C.red,DASH_C.grey,DASH_C.ink,'#0891b2','#db2777'], borderWidth:2, borderColor:'#fff' }]}, options:{ maintainAspectRatio:false, cutout:'58%', plugins:{legend:{position:'bottom',labels:{boxWidth:12}}} } });
  }

  function paintDashOps(b){
    var apps=dashApps();
    var g=function(s){ return apps.filter(function(a){return a.status===s;}).length; };
    var kpis=[
      {v:apps.length, l:'Total applications', tone:'blue'},
      {v:g('Action Needed'), l:'Needing action', tone:(g('Action Needed')?'amber':'')},
      {v:apps.filter(function(a){return a.status!=='Visa Issued';}).length, l:'In progress', tone:'blue'},
      {v:g('Visa Issued'), l:'Visas issued', tone:'teal'}
    ];
    var stRows=ALL_STATUSES.map(function(s){ return { label:s, n:g(s), color:(s==='Visa Issued'?DASH_C.teal:(s==='Action Needed'?DASH_C.amber:DASH_C.blue)) }; }).filter(function(r){return r.n>0;});
    // by country
    var cmap={}; apps.forEach(function(a){ var c=dashCountrySlug(a)||'—'; cmap[c]=(cmap[c]||0)+1; });
    var cRows=Object.keys(cmap).map(function(c){ return { label:(c==='—'?'—':countryName(c)), n:cmap[c], color:DASH_C.blue }; }).sort(function(a,b){return b.n-a.n;}).slice(0,10);
    // recent issued (no passport/doc details)
    var recent=apps.filter(function(a){return a.status==='Visa Issued';}).sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at));}).slice(0,8);
    var recentT='<table class="dash-table"><thead><tr><th>Ref</th><th>Country</th><th>Status</th></tr></thead><tbody>'+
      (recent.length?recent.map(function(a){ return '<tr><td>'+esc(a.reference_code||'')+'</td><td>'+esc(countryName(dashCountrySlug(a))||'—')+'</td><td>'+statusPill(a.status)+'</td></tr>'; }).join(''):'<tr><td colspan="3" class="phint" style="text-align:center;padding:16px">No visas issued in this period.</td></tr>')+'</tbody></table>';
    b.innerHTML=dashKpisHtml(kpis)+
      '<div class="dash-grid2">'+
        '<div class="panel"><h3>Applications by stage</h3>'+(stRows.length?dashBars(stRows):'<p class="phint">No applications in this period.</p>')+'</div>'+
        '<div class="panel"><h3>Applications by country</h3>'+(cRows.length?dashBars(cRows):'<p class="phint">No applications in this period.</p>')+'</div>'+
      '</div>'+
      '<div class="panel" style="margin-top:14px"><h3>Recent visas issued</h3>'+recentT+'</div>';
  }

  function paintDashStaff(b){
    var leads=dashLeads(), acts=dashActs();
    var ids;
    if(dashSeeAll()){ ids=(dashRaw.staff||[]).map(function(s){return s.id;}); }
    else { ids=[(state.user&&state.user.id)]; }
    var rows=ids.map(function(uid){
      var mine=leads.filter(function(l){return (l.owner||'')===uid;});
      var conv=mine.filter(function(l){return l.stage==='converted'||l.application_id;}).length;
      var act=acts.filter(function(a){return (a.actor||'')===uid;}).length;
      return { uid:uid, name:dashStaffName(uid), total:mine.length, conv:conv, rate:mine.length?Math.round(conv/mine.length*100):0, act:act };
    }).filter(function(r){ return dashSeeAll()? (r.total>0||r.act>0) : true; })
      .sort(function(a,b){return b.conv-a.conv;});
    var kpis=[
      {v:leads.length, l:(dashSeeAll()?'Team leads':'Your leads'), tone:'blue'},
      {v:leads.filter(function(l){return l.stage==='converted'||l.application_id;}).length, l:'Converted', tone:'teal'},
      {v:acts.length, l:'Activities logged'}
    ];
    var table='<table class="dash-table"><thead><tr><th>Staff</th><th class="num">Leads</th><th class="num">Converted</th><th class="num">Rate</th><th class="num">Activities</th></tr></thead><tbody>'+
      (rows.length?rows.map(function(r){ return '<tr><td>'+esc(r.name)+'</td><td class="num">'+r.total+'</td><td class="num">'+r.conv+'</td><td class="num">'+r.rate+'%</td><td class="num">'+r.act+'</td></tr>'; }).join(''):'<tr><td colspan="5" class="phint" style="text-align:center;padding:16px">No activity in this period.</td></tr>')+'</tbody></table>';
    b.innerHTML=dashKpisHtml(kpis)+
      '<div class="panel" style="margin-top:14px"><h3>'+(dashSeeAll()?'Team performance':'Your performance')+'</h3><p class="phint">Leads handled, conversions and logged activity for the selected period.</p>'+table+'</div>';
  }

  function paintDashRevenue(b){
    if(!dashSeeMoney()){ b.innerHTML='<div class="panel empty-state"><p>Revenue is available to Admin and Finance only.</p></div>'; return; }
    var pays=dashPays();
    var payColl=pays.filter(function(p){return p.kind==='payment'&&p.status==='approved';});
    var collected=payColl.reduce(function(x,p){return x+Number(p.amount||0);},0);
    var pend=pays.filter(function(p){return p.kind==='payment'&&p.status==='pending';}).reduce(function(x,p){return x+Number(p.amount||0);},0);
    var refReq=pays.filter(function(p){return p.kind==='refund'&&p.status==='pending';});
    var refPaid=pays.filter(function(p){return p.kind==='refund'&&p.status==='approved';}).reduce(function(x,p){return x+Number(p.amount||0);},0);
    var refPendAmt=refReq.reduce(function(x,p){return x+Number(p.amount||0);},0);
    var kpis=[
      {v:money(collected), l:'Money collected', s:payColl.length+' payments', tone:'teal'},
      {v:money(pend), l:'Payments pending', tone:(pend?'amber':'')},
      {v:money(refPendAmt), l:'Refunds pending', s:refReq.length+' requests', tone:(refPendAmt?'red':'')},
      {v:money(refPaid), l:'Refunds paid out'}
    ];
    // by country (via application -> visa -> country)
    var appById={}; (dashRaw.apps||[]).forEach(function(a){ appById[a.id]=a; });
    var cmap={};
    payColl.forEach(function(p){ var a=appById[p.application_id]; var c=a?(dashCountrySlug(a)||'—'):'—'; cmap[c]=(cmap[c]||0)+Number(p.amount||0); });
    var cRows=Object.keys(cmap).map(function(c){ return { c:c, label:(c==='—'?'Other':countryName(c)), amt:cmap[c] }; }).sort(function(a,b){return b.amt-a.amt;});
    // monthly trend
    var mmap={}; payColl.forEach(function(p){ var mk=String(p.created_at).slice(0,7); mmap[mk]=(mmap[mk]||0)+Number(p.amount||0); });
    var mk=Object.keys(mmap).sort();
    var table='<table class="dash-table"><thead><tr><th>Country</th><th class="num">Collected</th><th class="num">Share</th></tr></thead><tbody>'+
      (cRows.length?cRows.map(function(r){ return '<tr><td>'+esc(r.label)+'</td><td class="num">'+money(r.amt)+'</td><td class="num">'+(collected?Math.round(r.amt/collected*100):0)+'%</td></tr>'; }).join(''):'<tr><td colspan="3" class="phint" style="text-align:center;padding:16px">No payments in this period.</td></tr>')+'</tbody></table>';
    b.innerHTML=dashKpisHtml(kpis)+
      '<div class="dash-grid2">'+
        '<div class="panel"><h3>Collected over time</h3><div class="dash-chartbox"><canvas id="dcRevTrend"></canvas></div></div>'+
        '<div class="panel"><h3>Collected by country</h3>'+table+'</div>'+
      '</div>'+
      (refReq.length?('<div class="panel" style="margin-top:14px"><h3>Refunds pending</h3><p class="phint">'+refReq.length+' refund request(s) awaiting action, totalling '+money(refPendAmt)+'. Manage these in Finance → Refund requests.</p></div>'):'');
    dChart('dcRevTrend',{ type:'bar', data:{ labels:mk, datasets:[{ label:'Collected', data:mk.map(function(k){return mmap[k];}), backgroundColor:DASH_C.teal, borderRadius:4 }]}, options:{ maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:function(ctx){return ' '+money(ctx.parsed.y);}}}}, scales:{ y:{beginAtZero:true, ticks:{callback:function(v){return money(v);}}}, x:{grid:{display:false}} } } });
  }

  // ============================================================
  //  ROUTER
  // ============================================================
  function render(){
    if(!state.user){ renderSignIn(); return; }
    document.body.classList.remove('signin-page');
    var v=state.view;
    // staff never land on the customer apply/track screens
    if(isStaff() && (v==='apply'||v==='track')) v=defaultStaffView();
    // permission guards — bounce to an allowed area
    if(v==='admin' && !canViewApps()) v=defaultStaffView();
    if(v==='appview' && (!canViewApps() || !appViewId)) v='admin';
    if((v==='visatypes'||v==='events'||v==='articles'||v==='siteseo'||v==='destinations'||v==='content') && !canManageContent()) v=defaultStaffView();
    if((v==='team'||v==='brand'||v==='emailcfg'||v==='customers'||v==='automations'||v==='templates'||v==='msghistory'||v==='audit') && state.role!=='admin') v=defaultStaffView();
    if((v==='enquiries'||v==='leads'||v==='followups') && !canCRM()) v=defaultStaffView();
    if(v==='leadview' && (!canCRM() || !leadViewId)) v='leads';
    if(v==='custview' && (state.role!=='admin' || !custViewId)) v='customers';
    if((v==='suppliers'||v==='refunds'||v==='supview'||v==='reports') && !isFinance()) v=defaultStaffView();
    if(v==='supview' && !supViewId) v='suppliers';
    state.view=v;
    document.body.classList.toggle('apply-focus',v==='apply');
    document.body.classList.toggle('profile-view',v==='profile');
    document.body.classList.toggle('track-view',v==='track');
    if(v!=='track') document.body.classList.remove('track-detail-open');
    if(v!=='apply') document.body.classList.remove('apply-reviewing');

    // Backend sidebar layout: shift content right only on staff console screens.
    var isStaffView = isStaff() && ADMIN_VIEWS.indexOf(v)>-1;
    var showSide = isStaffView && adminNavCount()>=2;
    document.body.classList.toggle('is-staff-view', isStaffView);
    document.body.classList.toggle('has-admin-side', showSide);
    if(!showSide) document.body.classList.remove('side-open');

    if(v==='apply') renderApply();
    else if(v==='track') renderTrack();
    else if(v==='dashboard') renderDashboard();
    else if(v==='admin') renderAdmin();
    else if(v==='appview') renderAppDetail(appViewId);
    else if(v==='destinations') renderDestinationsAdmin();
    else if(v==='visatypes') renderVisaTypesAdmin();
    else if(v==='events') renderEventsAdmin();
    else if(v==='articles') renderArticlesAdmin();
    else if(v==='content') renderContentAdmin();
    else if(v==='siteseo') renderSiteSeo();
    else if(v==='brand') renderBrand();
    else if(v==='emailcfg') renderEmailSettings();
    else if(v==='enquiries') renderEnquiries();
    else if(v==='leads') renderLeads();
    else if(v==='leadview') renderLeadDetail(leadViewId);
    else if(v==='followups') renderFollowups();
    else if(v==='customers') renderCustomers();
    else if(v==='custview') renderCustomerDetail(custViewId);
    else if(v==='automations') renderAutomations();
    else if(v==='templates') renderTemplates();
    else if(v==='msghistory') renderMsgHistory();
    else if(v==='suppliers') renderSuppliers();
    else if(v==='refunds') renderRefunds();
    else if(v==='supview') renderSupplierDetail(supViewId);
    else if(v==='reports') renderFinReports();
    else if(v==='team') renderTeam();
    else if(v==='audit') renderAudit();
    else if(v==='profile') renderProfile();
    else if(v==='setpw') renderSetPassword();
    else renderApply();
  }

  function resolveStartView(){
    var h=(location.hash||'').replace('#','');
    if(h.indexOf('appview/')===0){ appViewId=decodeURIComponent(h.slice(8))||null; return appViewId?'appview':'admin'; }
    if(h.indexOf('custview/')===0){ custViewId=decodeURIComponent(h.slice(9))||null; return custViewId?'custview':'customers'; }
    if(h.indexOf('supview/')===0){ supViewId=decodeURIComponent(h.slice(8))||null; return supViewId?'supview':'suppliers'; }
    if(h.indexOf('leadview/')===0){ leadViewId=decodeURIComponent(h.slice(9))||null; return leadViewId?'leadview':'leads'; }
    if(['track','apply','profile','dashboard','admin','destinations','visatypes','events','articles','content','siteseo','brand','emailcfg','enquiries','leads','followups','customers','automations','templates','msghistory','suppliers','refunds','reports','team','audit','setpw'].indexOf(h)>-1) return h;
    return isStaff() ? defaultStaffView() : 'apply';
  }

  // ---------- boot ----------
  function loadProfileThenRender(){
    Promise.all([
      sb.from('profiles').select('role').eq('id',state.user.id).single(),
      loadVisaTypes()
    ]).then(function(res){
      var r=res[0];
      state.role = (r.data && r.data.role) || 'customer';
      state.isAdmin = state.role==='admin';
      if(isStaff() && (state.view==='apply'||state.view==='track')) state.view=defaultStaffView();
      renderHeader(); render();
    });
  }

  loadVisaTypes();
  loadCurrency().then(function(){ if(state.user) render(); });
  sb.auth.getSession().then(function(r){
    state.user = r.data.session ? r.data.session.user : null;
    clearOAuthPending();
    if(state.user && finishGooglePopup(state.user)) return;
    if(state.user && passwordSetupRequested()){
      state.view='setpw';
      consumePasswordSetupRequest();
    } else {
      state.view = resolveStartView();
    }
    if(state.user) loadProfileThenRender(); else { renderHeader(); render(); }
  });

  sb.auth.onAuthStateChange(function(event, session){
    var was = state.user;
    state.user = session ? session.user : null;
    if(state.user && finishGooglePopup(state.user)) return;
    if(event==='PASSWORD_RECOVERY' && state.user){
      // arrived via the password-reset email link — go straight to "set a new password"
      state._recovery=true;
      Promise.all([ sb.from('profiles').select('role').eq('id',state.user.id).single(), loadVisaTypes() ]).then(function(res){
        state.role=(res[0].data&&res[0].data.role)||'customer'; state.isAdmin=state.role==='admin';
        state.view='setpw'; renderHeader(); render();
      });
      return;
    }
    if(state.user && !was){
      // just signed in
      if(passwordSetupRequested()){
        state.view='setpw';
        consumePasswordSetupRequest();
      } else {
        state.view = (qParam('visa')) ? 'apply' : resolveStartView();
      }
      loadProfileThenRender();
    } else if(!state.user && was){
      state.isAdmin=false; state.role=null; state.view='apply'; renderHeader(); render();
    }
  });

  window.addEventListener('hashchange',function(){
    var h=resolveStartView();
    if(h!==state.view && state.user){ state.view=h; renderHeader(); render(); }
  });

  if(qParam('ocr-test')==='1'){
    window.__parsePassportMrzForTest=parsePassportMrz;
    window.__parsePassportVisualDetailsForTest=parsePassportVisualDetails;
  }
})();
