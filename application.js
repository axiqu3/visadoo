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
  function defaultStaffView(){ if(canViewApps()) return 'admin'; if(isFinance()) return 'suppliers'; if(canManageContent()) return 'visatypes'; return 'admin'; }

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
  function renderHeader(){
    if(!state.user){ headerActions.innerHTML=''; return; }
    var meta = state.user.user_metadata || {};
    var name = meta.full_name || meta.name || state.user.email || 'You';
    var initial = (name[0]||'U').toUpperCase();
    var av = meta.avatar_url ? '<img src="'+esc(meta.avatar_url)+'" alt="">' : esc(initial);
    var roleLabels = { admin:'Admin', agent:'Agent', content:'Content', viewer:'Viewer', finance:'Finance', sales:'Sales' };
    var links = '';
    if(isStaff()){
      links = '<button class="link-btn" data-go="'+defaultStaffView()+'">Dashboard</button>' +
              '<button class="link-btn" data-go="setpw">Set password</button>';
    } else {
      links = '<button class="link-btn" data-go="apply">New application</button>' +
              '<button class="link-btn" data-go="track">My applications</button>';
    }
    var roleBadge = isStaff() ? '<span class="role-badge">'+esc(roleLabels[state.role]||state.role)+'</span>' : '';
    headerActions.innerHTML =
      links +
      '<span class="user-chip"><span class="avatar">'+av+'</span><span class="uname">'+esc(name.split(' ')[0])+'</span>'+roleBadge+'</span>' +
      '<button class="link-btn" id="signOutBtn">Sign out</button>';
    headerActions.querySelectorAll('[data-go]').forEach(function(b){ b.onclick=function(){ go(b.getAttribute('data-go')); }; });
    document.getElementById('signOutBtn').onclick=function(){ sb.auth.signOut(); };
  }

  function go(view){ state.view=view; location.hash=view; renderHeader(); render(); }

  // ============================================================
  //  SIGN IN
  // ============================================================
  function renderSignIn(){
    renderHeader();
    var intended = qParam('visa');
    root.innerHTML='';
    var card = el(
      '<div class="signin-wrap"><div class="signin-card">' +
        '<div class="logo-lg">'+planeLogo()+'</div>' +
        '<h2>Sign in to continue</h2>' +
        '<p class="muted">Sign in to start your UAE tourist visa application and track its progress — your details stay private to you.</p>' +
        '<div class="signin-msg" id="siMsg"></div>' +
        '<button class="btn btn-google" id="googleBtn">' +
          '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/></svg>' +
          'Continue with Google' +
        '</button>' +
        '<div class="or-divider">or sign in with email</div>' +
        '<div id="emailStep">' +
          '<div class="field"><label for="siEmail">Email address</label>' +
          '<input id="siEmail" type="email" placeholder="you@email.com" autocomplete="email"></div>' +
          '<div class="field"><label for="siPass">Password</label>' +
          '<input id="siPass" type="password" placeholder="Your password" autocomplete="current-password"></div>' +
          '<button class="btn btn-primary btn-block" id="pwBtn">Sign in</button>' +
          '<div style="text-align:right;margin-top:8px"><button class="link-btn" id="forgotBtn" style="padding:0;font-size:13px">Forgot password?</button></div>' +
          '<div class="or-divider" style="margin-top:14px">or</div>' +
          '<button class="btn btn-ghost btn-block" id="sendCodeBtn">Email me a sign-in link</button>' +
          '<p class="phint" style="text-align:center;margin-top:10px">New here or a customer? Just use the email link — no password needed. Staff can set a password once signed in.</p>' +
        '</div>' +
        '<div id="sentStep" style="display:none">' +
          '<div style="text-align:center;padding:6px 0 14px">' +
            '<div style="width:54px;height:54px;border-radius:50%;background:var(--sky-50);display:grid;place-items:center;margin:0 auto 14px;color:var(--blue-600)">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="28" height="28"><path d="M22 6l-10 7L2 6"/><rect x="2" y="6" width="20" height="13" rx="2"/></svg></div>' +
            '<b style="font-size:16px">Check your email</b>' +
            '<p style="color:var(--muted);font-size:14px;margin-top:6px">Tap the <b>Sign in</b> link in the email we just sent and you\'ll be brought right back here, signed in.</p>' +
          '</div>' +
          '<button class="link-btn" id="backToEmail" style="margin-top:4px">← Use a different email</button>' +
        '</div>' +
        '<p class="fine">By continuing you agree to let Visa Doo process your application details. ' +
        (intended ? 'You\'re applying for the <b>'+esc((visaById(intended)||{}).name||'')+'</b>.' : '') +
        '</p>' +
      '</div></div>'
    );
    root.appendChild(card);

    var msg=document.getElementById('siMsg');
    function showMsg(t,cls){ msg.className='signin-msg '+cls; msg.innerHTML=t; }

    document.getElementById('googleBtn').onclick=function(){
      showMsg('Opening Google sign-in…','info');
      sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: location.origin + '/app.html' + (intended?('?visa='+encodeURIComponent(intended)):'') } })
        .then(function(r){ if(r.error){ showMsg('Google sign-in isn\'t switched on yet. Please use the email option below for now.','err'); } });
    };

    var redirectTo = location.origin + '/app.html' + (intended?('?visa='+encodeURIComponent(intended)):'');

    // Password sign-in (staff/admins who've set one) — instant, no email wait.
    var pwBtn=document.getElementById('pwBtn');
    function doPasswordSignIn(){
      var email=document.getElementById('siEmail').value.trim();
      var pass=document.getElementById('siPass').value;
      if(!/.+@.+\..+/.test(email)){ showMsg('Please enter a valid email address.','err'); return; }
      if(!pass){ showMsg('Enter your password, or use the email link below.','err'); return; }
      pwBtn.disabled=true; pwBtn.innerHTML='<span class="spin"></span> Signing in…';
      sb.auth.signInWithPassword({ email:email, password:pass }).then(function(r){
        pwBtn.disabled=false; pwBtn.innerHTML='Sign in';
        if(r.error){ showMsg('Wrong email or password — or you haven’t set a password yet. Use the email link below, then set a password from inside the app.','err'); return; }
        // onAuthStateChange handles routing
      });
    }
    pwBtn.onclick=doPasswordSignIn;
    document.getElementById('siPass').addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); doPasswordSignIn(); } });

    // Forgot / set password — one-time reset email.
    document.getElementById('forgotBtn').onclick=function(){
      var email=document.getElementById('siEmail').value.trim();
      if(!/.+@.+\..+/.test(email)){ showMsg('Enter your email above first, then tap “Forgot password?”.','err'); return; }
      sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/app.html' }).then(function(r){
        if(r.error){ showMsg(esc(r.error.message||'Could not send the reset email.'),'err'); return; }
        showMsg('Password reset link sent to <b>'+esc(email)+'</b>. Open it to set a new password.','ok');
      });
    };

    // Email sign-in link (customers / no password).
    var sendBtn=document.getElementById('sendCodeBtn');
    sendBtn.onclick=function(){
      var email=document.getElementById('siEmail').value.trim();
      if(!/.+@.+\..+/.test(email)){ showMsg('Please enter a valid email address.','err'); return; }
      sendBtn.disabled=true; sendBtn.innerHTML='<span class="spin"></span> Sending…';
      sb.auth.signInWithOtp({ email:email, options:{ shouldCreateUser:true, emailRedirectTo: redirectTo } }).then(function(r){
        sendBtn.disabled=false; sendBtn.innerHTML='Email me a sign-in link';
        if(r.error){ showMsg(esc(r.error.message||'Could not send the email. Please try again in a minute.'),'err'); return; }
        document.getElementById('emailStep').style.display='none';
        document.getElementById('sentStep').style.display='block';
        showMsg('Sign-in link sent to <b>'+esc(email)+'</b>. It can take a minute to arrive — check your spam folder too.','ok');
      });
    };

    document.getElementById('backToEmail').onclick=function(){
      document.getElementById('sentStep').style.display='none';
      document.getElementById('emailStep').style.display='block';
      msg.className='signin-msg';
    };
  }

  // ============================================================
  //  SET / CHANGE PASSWORD (staff self-service + reset-link recovery)
  // ============================================================
  function renderSetPassword(){
    if(!state.user){ renderSignIn(); return; }
    renderHeader();
    var recovery = !!state._recovery;
    root.innerHTML='<div class="signin-wrap"><div class="signin-card">'+
      '<div class="logo-lg">'+planeLogo()+'</div>'+
      '<h2>'+(recovery?'Set a new password':'Set your password')+'</h2>'+
      '<p class="muted">For <b>'+esc(state.user.email||'')+'</b>. After this you can sign in instantly with your email and password — no waiting for the email link.</p>'+
      '<div class="signin-msg" id="spMsg"></div>'+
      '<div class="field"><label for="spPass">New password</label><input id="spPass" type="password" placeholder="At least 8 characters" autocomplete="new-password"></div>'+
      '<div class="field"><label for="spPass2">Confirm password</label><input id="spPass2" type="password" placeholder="Re-enter password" autocomplete="new-password"></div>'+
      '<button class="btn btn-primary btn-block" id="spSave">Save password</button>'+
      (recovery?'':'<button class="link-btn" id="spCancel" style="margin-top:10px">← Back</button>')+
    '</div></div>';
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
        state.view = isStaff()?defaultStaffView():'apply'; go(state.view);
      });
    };
    if(document.getElementById('spCancel')) document.getElementById('spCancel').onclick=function(){ state.view=isStaff()?defaultStaffView():'apply'; render(); };
  }

  // ============================================================
  //  APPLY
  // ============================================================
  function renderApply(){
    if(!VISAS.length){ root.innerHTML='<div class="app-main"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div>'; loadVisaTypes().then(render); return; }
    var pre = qParam('visa');
    var chosen = pre ? visaById(pre) : null;
    if(!chosen){
      root.innerHTML='<div class="app-main"><div class="panel empty-state" style="padding:50px 24px">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke-linecap="round"/></svg>'+
        '<h2 style="color:var(--ink);font-size:24px;font-weight:800;margin-bottom:8px">Choose your visa first</h2>'+
        '<p>Pick your destination and the visa you need, then you can apply here.</p>'+
        '<a class="btn btn-primary btn-lg" href="index.html#destinations" style="margin-top:18px">Browse destinations</a>'+
      '</div></div>';
      return;
    }
    var meta = state.user.user_metadata || {};
    var defaultName = meta.full_name || meta.name || '';
    var html =
      '<div class="app-main">' +
        '<div class="app-head"><h1>Apply for your '+esc(chosen.name)+'</h1>' +
        '<p>Fill in your details and upload your documents. It only takes a few minutes.</p></div>' +

        '<form id="applyForm">' +
        '<div class="panel">' +
          '<span class="step-badge">Step 1 · Your visa</span>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">' +
            '<div><h3 style="font-size:18px;font-weight:800">'+esc(chosen.name)+'</h3>' +
              '<div class="phint" style="margin:3px 0 0">'+esc(chosen.sub||chosen.category||'')+(chosen.days?(' · up to '+chosen.days+' days'):'')+'</div>' +
              (etaText(chosen)?('<div class="phint" style="margin:6px 0 0">⏱ Estimated processing time: <b>'+esc(etaText(chosen))+'</b> <span style="opacity:.8">— an estimate, not a guaranteed approval time.</span></div>'):'') +
              '</div>' +
            '<div style="text-align:right"><div style="font-size:22px;font-weight:800">'+visaPriceText(chosen)+'</div>' +
              '<a href="index.html#destinations" class="link-btn" style="padding:0;font-size:13px">Change visa</a></div>' +
          '</div>' +
        '</div>' +

        '<div class="panel">' +
          '<span class="step-badge">Step 2 · Your details</span>' +
          '<div class="grid2">' +
            field('full_name','Full name (as in passport)','text',defaultName,true) +
            field('passport_number','Passport number','text','',true) +
            comboHtml('passport_issuing_country','Passport Issuing Country','Search country…',true) +
            '<div id="stateWrap" style="display:none">'+comboHtml('state','State','Search state…',true)+'</div>' +
            field('phone','Phone number','tel','',true) +
            field('date_of_birth','Date of birth','date','',false) +
            field('passport_expiry','Passport expiry date','date','',false) +
          '</div>' +
        '</div>' +

        '<div class="panel" id="qPanel" style="display:none">' +
          '<span class="step-badge">A few more questions</span>' +
          '<div id="applyQuestions"></div>' +
        '</div>' +

        '<div class="panel">' +
          '<span class="step-badge">Upload documents</span>' +
          '<p class="phint">Clear photos or scans are fine. Max 10 MB each (JPG, PNG or PDF).</p>' +
          '<div class="upload-row">' +
            dropZone('passport','Passport copy','Front page of your passport') +
            dropZone('photo','Passport-size photo','Recent colour photo, white background') +
          '</div>' +
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
          '<button type="submit" class="btn btn-primary btn-lg" id="submitBtn">Submit application</button>' +
        '</div>' +
        '</form>' +
      '</div>';
    root.innerHTML=html;

    var selected = chosen.id;
    function refreshSummary(){
      var v=visaById(selected);
      document.getElementById('sumName').textContent=v.name;
      document.getElementById('sumPrice').textContent=visaPriceText(v);
    }
    refreshSummary();
    loadApplyQuestions(selected);
    wireDrop('passport'); wireDrop('photo');

    // Passport Issuing Country (India default + pinned) + conditional India State dropdown
    var countryCombo, stateCombo;
    function toggleState(country){
      var w=document.getElementById('stateWrap'); if(!w) return;
      if(country==='India'){ w.style.display=''; loadIndiaStates().then(function(){ if(stateCombo) stateCombo.refresh(); }); }
      else { w.style.display='none'; var h=document.getElementById('state'), ss=document.getElementById('state_s'); if(h) h.value=''; if(ss) ss.value=''; }
    }
    loadCountries().then(function(){ if(countryCombo) countryCombo.refresh(); });
    stateCombo=comboInit('state', function(){ return geoIndiaStates||[]; }, { placeholder:'Search state…' });
    countryCombo=comboInit('passport_issuing_country', function(){ return geoCountries||['India']; }, { selected:'India', onSelect:toggleState });

    document.getElementById('applyForm').onsubmit=function(e){
      e.preventDefault();
      submitApplication(selected);
    };
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
    return '<div><span class="ulabel">'+esc(title)+' <span class="req-star">*</span></span>' +
      '<div class="drop" id="drop_'+key+'">' +
        '<div class="di"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0L8 8m4-4l4 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke-linecap="round"/></svg></div>' +
        '<b>Tap to upload</b><small>'+esc(sub)+'</small>' +
        '<div class="fname" id="fname_'+key+'"></div>' +
        '<input type="file" id="file_'+key+'" accept="image/*,application/pdf" style="display:none">' +
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
    return { refresh:function(){ if(menu.style.display!=='none') draw(s.value); } };
  }

  var picked={};
  function wireDrop(key){
    var zone=document.getElementById('drop_'+key);
    var input=document.getElementById('file_'+key);
    zone.onclick=function(){ input.click(); };
    input.onchange=function(){
      var f=input.files[0]; if(!f) return;
      if(f.size>10485760){ toast('That file is over 10 MB. Please choose a smaller one.'); input.value=''; return; }
      picked[key]=f;
      document.getElementById('fname_'+key).textContent='✓ '+f.name;
      zone.classList.add('has');
    };
  }

  function submitApplication(visaId){
    var f=document.getElementById('applyForm');
    if(!f.checkValidity()){ f.reportValidity(); return; }
    if(!picked.passport || !picked.photo){ toast('Please upload both your passport copy and photo.'); return; }
    var pCountry=(document.getElementById('passport_issuing_country').value||'').trim();
    if(!pCountry){ toast('Please select your passport issuing country.'); return; }
    var pState=((document.getElementById('state')||{}).value||'').trim();
    if(pCountry==='India' && !pState){ toast('Please select your state.'); return; }
    var qa = collectApplyAnswers();
    if(!qa.ok){ toast('Please answer the required question: “'+qa.missing+'”.'); return; }
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
        phone: document.getElementById('phone').value.trim(),
        passport_issuing_country: pCountry,
        state: pCountry==='India' ? pState : null,
        passport_number: document.getElementById('passport_number').value.trim(),
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
    ['passport','photo'].forEach(function(key){
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
    root.innerHTML=
      '<div class="app-main"><div class="panel success">' +
        '<div class="big-tick">'+CHECK+'</div>' +
        '<h2>Application submitted!</h2>' +
        '<p>Thank you, '+esc((app.full_name||'').split(' ')[0])+'. We\'ve received your '+esc(visaById(app.visa_type).name)+' application.</p>' +
        '<div class="ref-box">Ref: '+esc(app.reference_code)+'</div>' +
        '<p>'+(partial?'Your application is saved. If a document didn\'t upload, you can mention it to us on WhatsApp.':'Our team will review your documents and update your status at each step.')+'</p>' +
        '<div style="margin-top:24px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
          '<button class="btn btn-primary btn-lg" data-go="track">Track my application</button>' +
          '<a class="btn btn-ghost btn-lg" href="https://wa.me/'+cfg.WHATSAPP+'" target="_blank" rel="noopener">Message us on WhatsApp</a>' +
        '</div>' +
      '</div></div>';
    root.querySelector('[data-go="track"]').onclick=function(){ go('track'); };
  }

  // ============================================================
  //  TRACK (customer dashboard)
  // ============================================================
  function renderTrack(){
    root.innerHTML='<div class="app-main"><div class="app-head"><h1>My applications</h1>'+
      '<p>Track each application through to your visa being issued.</p></div>'+
      '<div id="trackList"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading…</p></div></div></div>';

    sb.from('applications').select('*, documents(*), app_messages(*)').order('created_at',{ascending:false}).then(function(r){
      var box=document.getElementById('trackList');
      if(r.error){ box.innerHTML='<div class="empty-state"><p>Could not load your applications. Please refresh.</p></div>'; console.error(r.error); return; }
      if(!r.data.length){
        box.innerHTML='<div class="panel empty-state">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 12h6m-6 4h6m2 4H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7l5 5v9a2 2 0 0 1-2 2z"/></svg>'+
          '<h3 style="color:var(--ink);margin-bottom:6px">No applications yet</h3>'+
          '<p>Start your first UAE tourist visa application now.</p>'+
          '<button class="btn btn-primary" style="margin-top:16px" id="startFirst">Start an application</button>'+
          '</div>';
        document.getElementById('startFirst').onclick=function(){ go('apply'); };
        return;
      }
      box.innerHTML='<div class="app-list">'+r.data.map(appCard).join('')+'</div>';
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
            btn.innerHTML='&#11015; Download your visa';
            if(s.error||!s.data){ toast('Could not open your visa. Please try again.'); return; }
            window.open(s.data.signedUrl,'_blank','noopener');
          });
        };
      });
    });
  }

  function statusPill(status){
    if(status==='Visa Issued') return '<span class="status-pill sp-done">'+esc(status)+'</span>';
    if(status==='Action Needed') return '<span class="status-pill sp-action">'+esc(status)+'</span>';
    return '<span class="status-pill sp-progress">'+esc(status)+'</span>';
  }

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
  function appCard(a){
    var stages=cfg.STAGES;
    var idx=stages.indexOf(a.status);
    var action = a.status==='Action Needed';
    var steps=stages.map(function(label,i){
      var cls = action ? (i===0?'current':'upcoming') :
                (i<idx?'done':(i===idx?'current':'upcoming'));
      var inner = (cls==='done') ? CHECK : '<span style="font-size:12px;font-weight:700">'+(i+1)+'</span>';
      return '<div class="tstep '+cls+'"><div class="dot">'+inner+'</div><div class="tlabel">'+esc(label)+'</div></div>';
    }).join('');
    var created=new Date(a.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
    var hasVisa=(a.documents||[]).some(function(d){ return d.doc_type==='visa'; });
    var visaBanner = hasVisa ?
      '<div style="margin-top:18px;background:#f1faf4;border:1px solid #b6e6c9;border-radius:14px;padding:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">'+
        '<div><b style="color:#137a3a;font-size:15px">🎉 Your visa is ready!</b>'+
        '<div style="color:var(--muted);font-size:13.5px;margin-top:2px">Your UAE tourist visa has been issued. Download and keep a copy for your travel.</div></div>'+
        '<button class="btn btn-primary dl-visa" data-app="'+esc(a.id)+'">&#11015; Download your visa</button>'+
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
    return '<div class="app-card">'+
      '<div class="app-card-top"><div>'+
        '<h3>'+esc(visaById(a.visa_type)?visaById(a.visa_type).name:a.visa_type)+'</h3>'+
        '<div class="sub">Ref '+esc(a.reference_code)+' · applied '+created+' · '+appPriceText(a)+'</div>'+
      '</div>'+statusPill(a.status)+'</div>'+
      (action && a.notes && !msgs.length ? '<div class="signin-msg err" style="display:block;margin-bottom:18px">'+esc(a.notes)+'</div>' : '')+
      '<div class="tracker">'+steps+'</div>'+
      visaBanner+
      threadBlock+
      replyPanel+
      '</div>';
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
      '<input class="cl-cost" type="number" min="0" placeholder="cost ₹" value="'+esc(l.cost!=null&&l.cost!==0?l.cost:(l.cost===0?'0':''))+'" style="width:110px;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit">'+
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
  var adminFilters = { q:'', visa:'', status:'all', country:'', from:'', to:'', sort:'newest' };
  var adminFiltersOpen = false;
  function adminActiveCount(){ var f=adminFilters, n=0; if(f.q.trim())n++; if(f.visa)n++; if(f.status!=='all')n++; if(f.country)n++; if(f.from||f.to)n++; return n; }

  // Backend console navigation: a grouped left sidebar (collapses to a slide-out
  // drawer on phones). Same data-section keys + routing as before — nothing breaks.
  var ADMIN_VIEWS=['admin','enquiries','customers','custview','comms','suppliers','supview','refunds','destinations','visatypes','articles','content','siteseo','brand','emailcfg','team'];

  // Inline-SVG icon per item (brand-coloured via currentColor).
  function sideIcon(key){
    var P={
      admin:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
      enquiries:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      customers:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
      comms:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
      destinations:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
      visatypes:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.2"/><path d="M14 10h4M14 14h4"/>',
      articles:'<path d="M4 4h13v16H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h5"/>',
      content:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
      siteseo:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
      brand:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
      emailcfg:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      team:'<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      suppliers:'<path d="M3 7h13v10H3zM16 10h3l2 3v4h-5"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
      refunds:'<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 7"/>'
    };
    return '<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(P[key]||'')+'</svg></span>';
  }

  // Groups + their items, each gated by the same role rules as before. Empty groups drop out.
  function adminNavModel(){
    var g=[
      ['Customers',[['admin','Applications',canViewApps()],['enquiries','Enquiries',state.role==='admin'],['customers','Customers',state.role==='admin']]],
      ['Messaging',[['comms','Communications',state.role==='admin']]],
      ['Finance',[['suppliers','Suppliers',isFinance()],['refunds','Refund requests',isFinance()]]],
      ['Catalogue',[['destinations','Destinations',canManageContent()],['visatypes','Visa Types',canManageContent()]]],
      ['Content',[['articles','Articles',canManageContent()],['content','Content',canManageContent()],['siteseo','Site SEO',canManageContent()]]],
      ['Settings',[['brand','Brand & Settings',state.role==='admin'],['emailcfg','Email',state.role==='admin'],['team','Team',state.role==='admin']]]
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
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+
            '<button class="btn btn-ghost" id="adminFiltersBtn" type="button">Filters'+(adminActiveCount()?(' ('+adminActiveCount()+')'):'')+'</button>'+
            '<span id="adminCount" class="phint" style="margin:0"></span>'+
            '<button class="link-btn" id="adminClear" type="button" style="margin-left:auto;display:none">Clear all</button>'+
          '</div>'+
          '<div id="adminFilterPanel" class="panel" style="margin-top:12px;'+(adminFiltersOpen?'':'display:none')+'">'+
            '<div class="field"><label>Search</label><input id="afQ" type="text" value="'+esc(adminFilters.q)+'" placeholder="Name, email, phone, passport, or reference…"></div>'+
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
          '</div>'+
        '</div>'+
        '<div id="adminList"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span><p style="margin-top:12px">Loading applications…</p></div></div>' +
      '</div>';

    wireAdminSections();
    var newBtn=document.getElementById('adminNewApp'); if(newBtn){ newBtn.onclick=function(){ openOnBehalf(); }; }
    document.getElementById('adminFiltersBtn').onclick=function(){ adminFiltersOpen=!adminFiltersOpen; document.getElementById('adminFilterPanel').style.display=adminFiltersOpen?'':'none'; };
    document.getElementById('adminClear').onclick=function(){
      adminFilters.q=''; adminFilters.visa=''; adminFilters.status='all'; adminFilters.country=''; adminFilters.from=''; adminFilters.to='';
      document.getElementById('afQ').value=''; document.getElementById('afVisa').value=''; document.getElementById('afStatus').value='all';
      document.getElementById('afCountry').value=''; document.getElementById('afFrom').value=''; document.getElementById('afTo').value='';
      paintAdminList();
    };
    function bind(id,key,ev){ var el=document.getElementById(id); if(el) el[ev]=function(){ adminFilters[key]=el.value; paintAdminList(); }; }
    bind('afQ','q','oninput'); bind('afVisa','visa','onchange'); bind('afStatus','status','onchange');
    bind('afCountry','country','onchange'); bind('afSort','sort','onchange'); bind('afFrom','from','onchange'); bind('afTo','to','onchange');

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
    box.innerHTML=rows.map(adminCard).join('');
    rows.forEach(wireAdminCard);
  }

  function docLabel(t){ return t==='visa'?'visa':(t==='photo'?'photo':'passport'); }

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
        '<div class="meta">'+esc(a.passport_issuing_country||a.nationality||'')+(a.state?(' ('+esc(a.state)+')'):'')+' · Passport '+esc(a.passport_number)+' · '+esc(a.phone)+' · '+esc(a.email)+'</div></div>' +
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
    return '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--blue-100)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">'+
        '<div style="font-weight:700">Customer payments '+payStatusPill(f.customer_payment_status)+'</div>'+
        '<div class="phint" style="margin:0">Paid '+money(net)+' of '+money(total)+' · Balance '+money(balance)+'</div>'+
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
                 cost:Number((row.querySelector('.cl-cost')||{}).value)||0 }; }); };
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
          return sb.from('application_cost_lines').insert(lines.map(function(l){ return { application_id:a.id, category:l.category, supplier_id:l.supplier_id, cost:l.cost }; }));
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
          toast('Finance saved'); renderAdmin();
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
          up.then(ins).then(function(r){ if(r.error) throw r.error; logFinance('customer_payment', a.id, kind, (kind==='refund'?'Refund ':'Payment ')+money(amt)); toast('Saved'); renderAdmin(); })
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
            toast('Refund request sent to finance'); renderAdmin();
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
        if(status!==prevStatus) notifyStatusChange(a.id, status, a.full_name);
        renderAdmin();
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
        '<a class="link-btn" id="artPreview" href="/article/'+esc(a.slug||'')+'" target="_blank" rel="noopener"'+(a.id&&a.slug?'':' style="display:none"')+'>View live page ↗</a>'+
      '</div>';
  }

  function artSeoHtml(a){
    var d={ title:(a.title||'Article')+' | Visa Doo', desc:(a.excerpt||a.title||'').slice(0,160) };
    var vals={ seo_title:a.seo_title||'', seo_description:a.seo_description||'', focus_keyword:a.focus_keyword||'', social_image:a.social_image||'' };
    return '<div class="seo-grid">'+
      '<div>'+
        '<div class="field"><label>Focus keyword</label><input id="aSeoKw" type="text" value="'+esc(vals.focus_keyword)+'" placeholder="e.g. uae visa requirements"></div>'+
        '<div class="field"><label>SEO title</label><input id="aSeoTitle" type="text" value="'+esc(vals.seo_title)+'" placeholder="'+esc(d.title)+'"><div class="char-counter" id="aSeoTitleCount"></div></div>'+
        '<div class="field"><label>Meta description</label><textarea id="aSeoDesc" style="min-height:90px" placeholder="'+esc(d.desc)+'">'+esc(vals.seo_description)+'</textarea><div class="char-counter" id="aSeoDescCount"></div></div>'+
        '<div class="field"><label>Social share image</label><div class="img-drop"><div class="img-thumb" id="aSeoThumb">'+(vals.social_image?'<img src="'+esc(vals.social_image)+'" style="width:100%;height:100%;object-fit:cover;border-radius:8px">':IMGICON)+'</div>'+
          '<div><button type="button" class="btn btn-ghost" id="aSeoImgBtn">'+(vals.social_image?'Replace image':'Upload image')+'</button><div class="phint" style="margin:6px 0 0">Best 1200 × 630. If empty, the cover image is used.</div></div>'+
          '<input type="file" id="aSeoImgFile" accept="image/*" style="display:none"></div></div>'+
      '</div>'+
      '<div>'+
        '<div class="seo-score-ring"><div class="ring" id="aSeoRing"><span id="aSeoScore">0</span></div><div class="lbl"><b>SEO score</b><div id="aSeoScoreText"></div></div></div>'+
        '<div class="preview-label">Google result preview</div>'+
        '<div class="gpreview"><div class="gp-url"><span class="dot">VD</span><div class="gp-crumb">visadoo-uae.netlify.app › article › '+esc(a.slug||'…')+'</div></div><div class="gp-title" id="aGpTitle"></div><div class="gp-desc" id="aGpDesc"></div></div>'+
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
  }
  function captureArtSeo(){
    if(artTab!=='seo') return;
    var t=document.getElementById('aSeoTitle'); if(!t) return;
    artEditing.seo_title=t.value; artEditing.seo_description=document.getElementById('aSeoDesc').value; artEditing.focus_keyword=document.getElementById('aSeoKw').value;
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
        msg.className='signin-msg'; document.execCommand('insertImage',false,url);
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
    ['aSeoTitle','aSeoDesc','aSeoKw'].forEach(function(id){ document.getElementById(id).addEventListener('input',recompute); });
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

  function saveArticle(status, stayOnSeo){
    captureArtWrite(); captureArtSeo();
    var a=artEditing;
    if(!(a.title||'').trim()){ var m=document.getElementById('artMsg'); if(m){m.className='signin-msg err'; m.textContent='Please add a title first.';} if(artTab!=='write'){artTab='write';paintArt();} return; }
    var payload={
      title:a.title.trim(), excerpt:(a.excerpt||'').trim()||null, content:a.content||null, cover_image:a.cover_image||null,
      status:status, seo_title:(a.seo_title||'').trim()||null, seo_description:(a.seo_description||'').trim()||null,
      focus_keyword:(a.focus_keyword||'').trim()||null, social_image:a.social_image||null
    };
    if(status==='published' && !a.published_at) payload.published_at=new Date().toISOString();

    var btnIds=['artSaveDraft','artPublish','artUnpub','aSeoSave'];
    btnIds.forEach(function(id){ var b=document.getElementById(id); if(b){ b.disabled=true; } });

    var op;
    if(a.id){ op=sb.from('articles').update(payload).eq('id',a.id).select().single(); }
    else { payload.slug=uniqueArticleSlug(slugify(a.title)); op=sb.from('articles').insert(payload).select().single(); }
    op.then(function(r){
      if(r.error){ var m=document.getElementById('artMsg'); if(m){m.className='signin-msg err'; m.textContent='Could not save. Please try again.';} btnIds.forEach(function(id){var b=document.getElementById(id);if(b)b.disabled=false;}); console.error(r.error); return; }
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
        '<button class="btn btn-primary" id="spAdd" style="margin-top:8px">+ Record payment</button>'+
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
    area.innerHTML=supList.map(function(s){
      var meta=[s.supplier_type, s.contact_name, s.phone, s.email].filter(Boolean).map(esc).join(' · ');
      var out=Number(s._outstanding||0);
      var outPill=out>0
        ? '<span class="status-pill sp-action" style="font-size:12px">Outstanding: '+money(out)+'</span>'
        : '<span class="status-pill sp-done" style="font-size:12px">Settled</span>';
      var extra=(s.credit_limit!=null&&s.credit_limit!=='')?(' · Credit limit: '+money(s.credit_limit)):'';
      return '<div class="admin-app"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h4>'+esc(s.name)+(s.active?'':' <span class="status-pill" style="background:#eef2f7;color:#64748b;font-size:11px">Inactive</span>')+'</h4>'+
        (meta?('<div class="meta">'+meta+'</div>'):'')+
        '<div style="margin-top:6px">'+outPill+'<span class="phint" style="display:inline;margin-left:8px">'+extra.replace(/^ · /,'')+'</span></div></div>'+
        '<div style="display:flex;gap:8px">'+
          '<button class="btn btn-ghost" data-supview="'+esc(s.id)+'">Statement</button>'+
          '<button class="btn btn-ghost" data-supedit="'+esc(s.id)+'">Edit</button>'+
          (state.role==='admin'?('<button class="btn btn-ghost" data-supdel="'+esc(s.id)+'" style="color:var(--red)">Delete</button>'):'')+
        '</div></div></div>';
    }).join('');
    area.querySelectorAll('[data-supview]').forEach(function(b){ b.onclick=function(){ openSupplier(b.getAttribute('data-supview')); }; });
    area.querySelectorAll('[data-supedit]').forEach(function(b){ b.onclick=function(){ supEditing=JSON.parse(JSON.stringify(supList.filter(function(x){return x.id===b.getAttribute('data-supedit');})[0])); paintSup(); }; });
    area.querySelectorAll('[data-supdel]').forEach(function(b){ b.onclick=function(){
      var s=supList.filter(function(x){return x.id===b.getAttribute('data-supdel');})[0]; if(!s) return;
      if(!window.confirm('Delete supplier “'+s.name+'”? This cannot be undone.')) return;
      sb.from('suppliers').delete().eq('id',s.id).then(function(r){ if(r.error){ toast('Could not delete (the supplier may be in use).'); return; } logFinance('supplier',s.id,'delete','Deleted supplier '+s.name); toast('Supplier deleted'); renderSuppliers(); });
    }; });
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
  //  TEAM MANAGEMENT (admins only)
  // ============================================================
  var ROLE_OPTS=[['agent','Agent / Processor'],['finance','Finance'],['sales','Sales / Support'],['content','Content / SEO editor'],['viewer','Viewer (read-only)'],['admin','Admin (full access)']];
  function roleName(r){ var m={admin:'Admin',agent:'Agent',content:'Content / SEO',viewer:'Viewer',customer:'Customer',finance:'Finance',sales:'Sales / Support'}; return m[r]||r; }

  // Send an invitation = a one-tap sign-in link; clicking it signs them in with the role waiting in team_invites.
  function sendInviteEmail(email){
    return sb.auth.signInWithOtp({ email:email, options:{ shouldCreateUser:true, emailRedirectTo: location.origin + '/app.html' } })
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
            '<select data-role-for="'+esc(s.id)+'">'+sel+'</select>'+
            '<button class="btn btn-ghost" data-remove="'+esc(s.id)+'" style="color:var(--red)">Remove</button>')+
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
        sb.rpc('set_user_role',{target_id:id,new_role:sel.value}).then(function(r){
          if(r.error){ toast('Could not change role.'); console.error(r.error); return; }
          toast('Role updated'); loadTeam();
        });
      };
    });
    area.querySelectorAll('[data-remove]').forEach(function(b){
      b.onclick=function(){
        if(!window.confirm('Remove this person\'s team access? They become a normal customer account.')) return;
        sb.rpc('set_user_role',{target_id:b.getAttribute('data-remove'),new_role:'customer'}).then(function(r){
          if(r.error){ toast('Could not remove.'); console.error(r.error); return; }
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
        summary:document.getElementById('cSummary').value.trim()||null, image_url:cImageUrl, seo_title:document.getElementById('cSeoT').value.trim()||null, seo_description:document.getElementById('cSeoD').value.trim()||null,
        featured:document.getElementById('cFeat').checked, active:document.getElementById('cActive').checked, sort_order:parseInt(document.getElementById('cSort').value,10)||0 };
      saveBtn.disabled=true; saveBtn.innerHTML='<span class="spin"></span>';
      var op;
      if(cEditing.id){ op=sb.from('countries').update(payload).eq('id',cEditing.id); }
      else { payload.slug=uniqueSlugIn(slugify(name), countryList); op=sb.from('countries').insert(payload); }
      op.then(function(r){ saveBtn.disabled=false; saveBtn.innerHTML='Save';
        if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save. Please try again.'; console.error(r.error); return; }
        toast('Country saved'); cEditing=null; renderDestinationsAdmin();
      });
    };
  }
  function countryDelete(id){
    var c=countryList.filter(function(x){return x.id===id;})[0]; if(!c) return;
    if(!window.confirm('Delete “'+c.name+'”? This also removes its visa options. This cannot be undone.')) return;
    sb.from('countries').delete().eq('id',id).then(function(r){ if(r.error){ toast('Could not delete.'); console.error(r.error); return; } toast('Country deleted'); loadVisaTypes(); renderDestinationsAdmin(); });
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
        toast('Group saved'); gEditing=null; renderDestinationsAdmin();
      });
    };
  }
  function groupDelete(id){
    var g=groupList.filter(function(x){return x.id===id;})[0]; if(!g) return;
    if(!window.confirm('Delete the “'+g.name+'” group? Countries in it stay, but are no longer grouped.')) return;
    sb.from('visa_groups').delete().eq('id',id).then(function(r){ if(r.error){ toast('Could not delete.'); return; } toast('Group deleted'); renderDestinationsAdmin(); });
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
    area.innerHTML=rows.map(function(e){
      var opts=['New','Contacted','Closed'].map(function(s){ return '<option'+(s===e.status?' selected':'')+'>'+s+'</option>'; }).join('');
      return '<div class="admin-app"><div class="arow" style="align-items:flex-start;gap:14px"><div style="flex:1;min-width:0">'+
        '<h4>'+esc(enqRef(e.seq))+' · '+esc(e.name||'(no name)')+'</h4>'+
        '<div class="meta">'+esc(e.email||'')+' · '+esc(new Date(e.created_at).toLocaleString())+'</div>'+
        '<p style="margin:8px 0 0;white-space:pre-wrap">'+esc(e.message||'')+'</p></div>'+
        '<select data-enq="'+esc(e.id)+'" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:9px;font-family:inherit">'+opts+'</select>'+
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
  }
  function renderEnquiries(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
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
  //  CUSTOMERS (admins only) — text-only applicant data for outreach (downloadable)
  // ============================================================
  var custList=[], custViewId=null;
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
    return sb.from('consent').upsert(rows,{onConflict:'customer_id,channel'});
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
    var srcLabel={application:'Applied',enquiry:'Enquiry','walk-in':'Walk-in',manual:'Added manually'};
    area.innerHTML=rows.map(function(c){
      var countPill=c.count>1?(' <span class="status-pill sp-progress" style="font-size:11px">'+c.count+' applications</span>'):(c.count===0?(' <span class="status-pill sp-action" style="font-size:11px">Enquiry only</span>'):'');
      var line2=[c.country,c.state,c.visa,c.status].filter(function(x){return x;}).map(esc).join(' · ');
      var src=c.source?('<span class="phint" style="margin:0;font-size:11px">'+esc(srcLabel[c.source]||c.source)+'</span>'):'';
      var mPill=c.marketing
        ? '<span class="status-pill sp-done" style="font-size:11px">📣 Marketing: On</span>'
        : '<span class="status-pill" style="font-size:11px;background:#eef2f7;color:#64748b">📣 Marketing: Off</span>';
      var mBtn='<button class="link-btn" data-mkt="'+esc(c.id)+'" data-mval="'+(c.marketing?'0':'1')+'" style="padding:0;font-size:12px">'+(c.marketing?'Turn off':'Turn on')+'</button>';
      return '<div class="admin-app" data-custopen="'+esc(c.id)+'" style="cursor:pointer"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h4>'+esc(c.name||'(no name)')+countPill+'</h4>'+
        '<div class="meta">'+esc(c.email||'')+(c.phone?(' · '+esc(c.phone)):'')+'</div>'+
        (line2?('<div class="meta">'+line2+'</div>'):'')+
        '<div style="margin-top:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+mPill+mBtn+'</div></div>'+
        '<div style="text-align:right;white-space:nowrap">'+src+'<div class="phint" style="margin:0">Last: '+esc(new Date(c.last).toLocaleDateString())+'</div>'+
          '<div class="phint" style="margin:4px 0 0;color:var(--blue-600);font-weight:700">View history →</div></div>'+
      '</div></div>';
    }).join('');
    area.querySelectorAll('[data-custopen]').forEach(function(card){ card.onclick=function(){ openCustomer(card.getAttribute('data-custopen')); }; });
    area.querySelectorAll('[data-mkt]').forEach(function(b){ b.onclick=function(ev){
      if(ev&&ev.stopPropagation) ev.stopPropagation();
      var id=b.getAttribute('data-mkt'), val=b.getAttribute('data-mval')==='1';
      b.disabled=true; b.textContent='Saving…';
      setCustMarketing(id,val).then(function(r){
        if(r&&r.error){ toast('Could not update consent.'); console.error(r.error); b.disabled=false; return; }
        custList.forEach(function(c){ if(c.id===id) c.marketing=val; });
        toast(val?'Marketing turned on':'Marketing turned off'); paintCust();
      });
    }; });
  }
  function renderCustomers(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    if(!VISAS.length) loadVisaTypes();
    root.innerHTML='<div class="app-main">'+adminSections('customers')+
      '<div class="app-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap"><div>'+
        '<h1>Customers</h1><p>One record per person — automatically gathered from applications and enquiries (matched by email). Text only, no documents. For outreach.</p></div>'+
        '<button class="btn btn-ghost" id="custCsv">Download CSV</button></div>'+
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">'+
        '<input id="custSearch" type="text" placeholder="Search name, email, phone or country…" style="flex:1;min-width:200px;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px">'+
        '<span id="custCount" class="phint" style="margin:0"></span>'+
      '</div>'+
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
    document.getElementById('custSearch').oninput=paintCust;
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
      sb.from('consent').select('channel,marketing_opted_in,service_opted_out').eq('customer_id',id)
    ]).then(function(res){
      var c=res[0].data;
      if(res[0].error||!c){ document.getElementById('custDetail').innerHTML='<div class="panel empty-state"><p>Could not load this customer.</p></div>'; return; }
      paintCustomerDetail(c, res[1].data||[], res[2].data||[], res[3].data||[]);
    });
  }

  function paintCustomerDetail(c, apps, msgs, consents){
    var box=document.getElementById('custDetail'); if(!box) return;
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
      '<div class="phint" style="margin:0;white-space:nowrap">Since '+esc(new Date(c.created_at).toLocaleDateString())+'</div></div>';

    var appsHtml='';
    if(apps.length){
      appsHtml='<div style="margin-top:22px"><h3 style="font-size:16px;font-weight:800;margin-bottom:8px">Applications ('+apps.length+')</h3>'+
        apps.map(function(a){ var vn=visaById(a.visa_type)?visaById(a.visa_type).name:(a.visa_type||'');
          return '<div class="admin-app"><div class="arow"><div><h4 style="font-size:15px">'+esc(vn)+'</h4><div class="meta">'+esc(a.reference_code||'')+' · '+esc(a.status||'')+'</div></div>'+
            '<div class="phint" style="margin:0">'+esc(new Date(a.created_at).toLocaleDateString())+'</div></div></div>'; }).join('')+'</div>';
    }

    var histHtml='<div style="margin-top:22px"><h3 style="font-size:16px;font-weight:800;margin-bottom:8px">Message history ('+msgs.length+')</h3>'+
      (msgs.length? msgs.map(msgRowHtml).join('') : '<div class="panel empty-state"><p>No messages sent to this customer yet.</p></div>')+'</div>';

    box.innerHTML=header+appsHtml+histHtml;

    var mk=document.getElementById('cdMkt'); if(mk) mk.onclick=function(){
      var val=mk.getAttribute('data-mval')==='1'; mk.disabled=true; mk.textContent='Saving…';
      setCustMarketing(c.id,val).then(function(r){ if(r&&r.error){ toast('Could not update consent.'); mk.disabled=false; return; } toast(val?'Marketing turned on':'Marketing turned off'); renderCustomerDetail(c.id); });
    };
    box.querySelectorAll('[data-msgview]').forEach(function(b){ b.onclick=function(){
      var d=document.getElementById('mv_'+b.getAttribute('data-msgview')); if(!d) return;
      var show=d.style.display==='none'; d.style.display=show?'block':'none'; b.textContent=show?'Hide content':'View content';
    }; });
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
    area.querySelectorAll('[data-pdel]').forEach(function(b){ b.onclick=function(){ var p=pList.filter(function(x){return x.id===b.getAttribute('data-pdel');})[0]; if(!window.confirm('Delete “'+p.title+'”?'))return; sb.from('pages').delete().eq('id',p.id).then(function(){ toast('Page deleted'); renderContentAdmin(); }); }; });
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
      var op = pEditing.id ? sb.from('pages').update(payload).eq('id',pEditing.id) : (function(){ payload.slug=uniqueSlugIn(slugify(title),pList); return sb.from('pages').insert(payload); })();
      op.then(function(r){ if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save.'; console.error(r.error); return; } toast(status==='published'?'Page published':'Saved'); pEditing=null; renderContentAdmin(); });
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
    area.querySelectorAll('[data-fdel]').forEach(function(b){ b.onclick=function(){ if(!window.confirm('Delete this question?'))return; sb.from('faqs').delete().eq('id',b.getAttribute('data-fdel')).then(function(){ toast('Deleted'); renderContentAdmin(); }); }; });
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
      op.then(function(r){ if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save.'; return; } toast('Saved'); fEditing=null; renderContentAdmin(); });
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
    area.querySelectorAll('[data-rvdel]').forEach(function(b){ b.onclick=function(){ if(!window.confirm('Delete this review?'))return; sb.from('reviews').delete().eq('id',b.getAttribute('data-rvdel')).then(function(){ toast('Deleted'); renderContentAdmin(); }); }; });
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
      op.then(function(r){ if(r.error){ msg.className='signin-msg err'; msg.textContent='Could not save.'; return; } toast('Saved'); rEditing=null; renderContentAdmin(); });
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
  var PLACEHOLDERS='Placeholders you can use: {{first_name}}, {{name}}, {{visa}}, {{country}}, {{reference}}, {{review_url}}, {{brand}}';

  function msgStatusPill(s){
    var map={ sent:['sp-done','Sent'], delivered:['sp-done','Delivered'], queued:['sp-progress','Queued'],
      skipped:['','Skipped'], failed:['sp-action','Failed'], cancelled:['','Cancelled'] };
    var m=map[s]||['',''+s];
    var extra=(s==='skipped'||s==='cancelled')?' style="background:#eef2f7;color:#64748b"':'';
    return '<span class="status-pill '+m[0]+'" '+extra+'>'+esc(m[1])+'</span>';
  }

  function renderComms(){
    if(state.role!=='admin'){ go(defaultStaffView()); return; }
    if(!VISAS.length) loadVisaTypes();
    root.innerHTML='<div class="app-main">'+adminSections('comms')+
      '<div class="app-head"><h1>Communications</h1><p>Your message engine — automations, templates and the history of everything sent.</p></div>'+
      '<div id="commsArea"><div class="empty-state"><span class="spin" style="border-color:#cbd5e1;border-top-color:#2563eb"></span></div></div>'+
    '</div>';
    wireAdminSections();
    Promise.all([
      sb.from('automation_rules').select('*').eq('key','review-request').single(),
      sb.from('site_settings').select('google_review_url').eq('id','global').single(),
      sb.from('message_templates').select('*').order('key'),
      sb.from('messages').select('id,to_address,subject,status,reason,template_key,purpose,channel,created_at,sent_at,scheduled_for').order('created_at',{ascending:false}).limit(100)
    ]).then(function(res){
      commsRule=res[0].data||null;
      commsReviewUrl=(res[1].data&&res[1].data.google_review_url)||'';
      commsTpls=res[2].data||[];
      commsMsgs=res[3].data||[];
      paintComms();
    });
  }

  function paintComms(){
    var area=document.getElementById('commsArea'); if(!area) return;
    var ruleOn=commsRule?commsRule.active:false;
    var urlMissing=!commsReviewUrl;
    var autoPanel='<div class="panel"><h3 style="font-size:17px;font-weight:800;margin-bottom:4px">Review-request automation</h3>'+
      '<p class="phint" style="margin-top:0">Automatically emails the customer <b>3 days after</b> you mark their visa as “Visa Issued”, asking for a Google review. Opt-outs are always respected.</p>'+
      '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin:10px 0"><input type="checkbox" id="cmAutoOn" '+(ruleOn?'checked':'')+' style="width:auto"> <span style="font-weight:600">Turn this automation on</span></label>'+
      '<div class="field"><label>Your Google review link</label>'+
        '<input id="cmReviewUrl" type="url" value="'+esc(commsReviewUrl)+'" placeholder="https://g.page/r/your-business/review" style="width:100%;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px">'+
        '<p class="phint">Paste the link customers use to leave you a Google review. '+(urlMissing?'<b style="color:var(--red)">Until this is set, review emails are skipped.</b>':'')+'</p></div>'+
      '<div class="signin-msg" id="cmMsg"></div>'+
      '<button class="btn btn-primary" id="cmSave">Save settings</button></div>';

    var tplRows=commsTpls.map(function(t){
      return '<div class="admin-app"><div class="arow"><div><h4>'+esc(t.name)+(t.active?'':' <span class="status-pill" style="background:#eef2f7;color:#64748b">Off</span>')+'</h4>'+
        '<div class="meta">'+esc(t.channel)+' · '+esc(t.subject||'(no subject)')+'</div></div>'+
        '<button class="btn btn-ghost" data-tpledit="'+esc(t.key)+'">Edit</button></div></div>';
    }).join('')||'<div class="panel empty-state"><p>No templates.</p></div>';
    var tplPanel='<div style="margin-top:26px"><h3 style="font-size:17px;font-weight:800;margin-bottom:8px">Message templates</h3>'+tplRows+'</div>';

    var histPanel='<div style="margin-top:26px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">'+
      '<h3 style="font-size:17px;font-weight:800;margin:0">Message history</h3>'+
      '<input id="cmSearch" type="text" placeholder="Search email or subject…" style="flex:1;min-width:180px;max-width:320px;padding:9px 12px;border:1.5px solid var(--line);border-radius:10px"></div>'+
      '<div id="cmHist"></div></div>';

    area.innerHTML=autoPanel+(commsTplEditing?'':tplPanel)+(commsTplEditing?'':histPanel);

    if(commsTplEditing){ area.innerHTML=tplEditorHtml(commsTplEditing); wireTplEditor(); return; }

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
        if(commsRule) commsRule.active=on; commsReviewUrl=url||''; toast('Saved'); paintComms();
      });
    };
    area.querySelectorAll('[data-tpledit]').forEach(function(b){ b.onclick=function(){
      var k=b.getAttribute('data-tpledit'); commsTplEditing=JSON.parse(JSON.stringify(commsTpls.filter(function(x){return x.key===k;})[0])); paintComms();
    }; });
    var search=document.getElementById('cmSearch'); if(search) search.oninput=paintHist;
    paintHist();
  }

  function paintHist(){
    var box=document.getElementById('cmHist'); if(!box) return;
    var q=((document.getElementById('cmSearch')||{}).value||'').trim().toLowerCase();
    var rows=commsMsgs.filter(function(m){ if(!q) return true; return ((m.to_address||'')+' '+(m.subject||'')).toLowerCase().indexOf(q)>-1; });
    if(!commsMsgs.length){ box.innerHTML='<div class="panel empty-state"><p>No messages yet. Sent emails (status updates and automations) will appear here.</p></div>'; return; }
    if(!rows.length){ box.innerHTML='<div class="panel empty-state"><p>No messages match your search.</p></div>'; return; }
    box.innerHTML=rows.map(function(m){
      var when=(m.status==='queued'&&m.scheduled_for)?('Scheduled · '+new Date(m.scheduled_for).toLocaleString()):new Date(m.sent_at||m.created_at).toLocaleString();
      var tpl=m.template_key==='review-request'?'Review request':(m.template_key==='status-update'?'Status update':(m.template_key||'Message'));
      var reason=m.reason?(' · <span class="phint" style="display:inline">'+esc(m.reason)+'</span>'):'';
      return '<div class="admin-app"><div class="arow" style="align-items:flex-start"><div style="flex:1;min-width:0">'+
        '<h4 style="font-size:15px">'+esc(m.subject||tpl)+'</h4>'+
        '<div class="meta">'+esc(m.to_address||'')+' · '+esc(tpl)+' · '+esc(m.channel)+reason+'</div></div>'+
        '<div style="text-align:right;white-space:nowrap">'+msgStatusPill(m.status)+'<div class="phint" style="margin:4px 0 0">'+esc(when)+'</div></div>'+
      '</div></div>';
    }).join('');
  }

  function tplEditorHtml(t){
    return '<div class="panel"><button class="link-btn" id="tplBack" style="margin-bottom:8px">← Back to communications</button>'+
      '<h3 style="font-size:17px;font-weight:800">Edit template — '+esc(t.name)+'</h3>'+
      '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin:8px 0"><input type="checkbox" id="tplActive" '+(t.active?'checked':'')+' style="width:auto"> <span>Active</span></label>'+
      '<div class="field"><label>Subject</label><input id="tplSubject" type="text" value="'+esc(t.subject||'')+'" style="width:100%;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px"></div>'+
      '<div class="field"><label>Body (HTML allowed)</label><textarea id="tplBody" style="width:100%;min-height:200px;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px;font-family:inherit">'+esc(t.body||'')+'</textarea></div>'+
      '<p class="phint">'+esc(PLACEHOLDERS)+'</p>'+
      '<div class="signin-msg" id="tplMsg"></div>'+
      '<div style="display:flex;gap:10px"><button class="btn btn-primary" id="tplSave">Save template</button><button class="btn btn-ghost" id="tplCancel">Cancel</button></div></div>';
  }
  function wireTplEditor(){
    document.getElementById('tplBack').onclick=document.getElementById('tplCancel').onclick=function(){ commsTplEditing=null; paintComms(); };
    document.getElementById('tplSave').onclick=function(){
      var key=commsTplEditing.key, msg=document.getElementById('tplMsg'), btn=document.getElementById('tplSave');
      var payload={ subject:document.getElementById('tplSubject').value, body:document.getElementById('tplBody').value, active:document.getElementById('tplActive').checked, updated_at:new Date().toISOString() };
      btn.disabled=true; btn.textContent='Saving…';
      sb.from('message_templates').update(payload).eq('key',key).then(function(r){
        btn.disabled=false; btn.textContent='Save template';
        if(r.error){ msg.className='signin-msg err'; msg.style.display='block'; msg.textContent='Could not save.'; return; }
        commsTpls.forEach(function(t){ if(t.key===key){ t.subject=payload.subject; t.body=payload.body; t.active=payload.active; } });
        commsTplEditing=null; toast('Template saved'); paintComms();
      });
    };
  }

  // ============================================================
  //  ROUTER
  // ============================================================
  function render(){
    if(!state.user){ renderSignIn(); return; }
    var v=state.view;
    // staff never land on the customer apply/track screens
    if(isStaff() && (v==='apply'||v==='track')) v=defaultStaffView();
    // permission guards — bounce to an allowed area
    if(v==='admin' && !canViewApps()) v=defaultStaffView();
    if((v==='visatypes'||v==='articles'||v==='siteseo'||v==='destinations'||v==='content') && !canManageContent()) v=defaultStaffView();
    if((v==='team'||v==='brand'||v==='emailcfg'||v==='enquiries'||v==='customers'||v==='comms') && state.role!=='admin') v=defaultStaffView();
    if(v==='custview' && (state.role!=='admin' || !custViewId)) v='customers';
    if((v==='suppliers'||v==='refunds'||v==='supview') && !isFinance()) v=defaultStaffView();
    if(v==='supview' && !supViewId) v='suppliers';
    state.view=v;

    // Backend sidebar layout: shift content right only on staff console screens.
    var showSide = isStaff() && ADMIN_VIEWS.indexOf(v)>-1 && adminNavCount()>=2;
    document.body.classList.toggle('has-admin-side', showSide);
    if(!showSide) document.body.classList.remove('side-open');

    if(v==='apply') renderApply();
    else if(v==='track') renderTrack();
    else if(v==='admin') renderAdmin();
    else if(v==='destinations') renderDestinationsAdmin();
    else if(v==='visatypes') renderVisaTypesAdmin();
    else if(v==='articles') renderArticlesAdmin();
    else if(v==='content') renderContentAdmin();
    else if(v==='siteseo') renderSiteSeo();
    else if(v==='brand') renderBrand();
    else if(v==='emailcfg') renderEmailSettings();
    else if(v==='enquiries') renderEnquiries();
    else if(v==='customers') renderCustomers();
    else if(v==='custview') renderCustomerDetail(custViewId);
    else if(v==='comms') renderComms();
    else if(v==='suppliers') renderSuppliers();
    else if(v==='refunds') renderRefunds();
    else if(v==='supview') renderSupplierDetail(supViewId);
    else if(v==='team') renderTeam();
    else if(v==='setpw') renderSetPassword();
    else renderApply();
  }

  function resolveStartView(){
    var h=(location.hash||'').replace('#','');
    if(h.indexOf('custview/')===0){ custViewId=decodeURIComponent(h.slice(9))||null; return custViewId?'custview':'customers'; }
    if(h.indexOf('supview/')===0){ supViewId=decodeURIComponent(h.slice(8))||null; return supViewId?'supview':'suppliers'; }
    if(['track','apply','admin','destinations','visatypes','articles','content','siteseo','brand','emailcfg','enquiries','customers','comms','suppliers','refunds','team','setpw'].indexOf(h)>-1) return h;
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
    state.view = resolveStartView();
    if(state.user) loadProfileThenRender(); else { renderHeader(); render(); }
  });

  sb.auth.onAuthStateChange(function(event, session){
    var was = state.user;
    state.user = session ? session.user : null;
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
      state.view = (qParam('visa')) ? 'apply' : resolveStartView();
      loadProfileThenRender();
    } else if(!state.user && was){
      state.isAdmin=false; state.role=null; state.view='apply'; renderHeader(); render();
    }
  });

  window.addEventListener('hashchange',function(){
    var h=resolveStartView();
    if(h!==state.view && state.user){ state.view=h; renderHeader(); render(); }
  });
})();
