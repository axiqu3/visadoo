// Visa Doo — server-rendered country pages (/country/<slug>): lists that country's visas
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function shortText(value,fallback,limit){
  var text=String(value||fallback||"").replace(/\s+/g," ").trim();
  if(text.length<=limit) return text;
  var cut=text.slice(0,limit+1).lastIndexOf(" ");
  return text.slice(0,cut>limit*.65?cut:limit).replace(/[.,;:\s]+$/,"")+"…";
}
async function fetchJson(url){
  const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}});
  if(!r.ok) throw new Error("Data request failed: "+r.status);
  return await r.json();
}

// ---- currency (single active currency chosen in the backend) ----
// Currency: INR only (₹, Indian grouping). Args kept for caller compatibility but ignored.
function resolveActive(){ return { code:"INR", symbol:"₹" }; }
function fmtMoney(n){ if(n==null||n===""||isNaN(Number(n))) return ""; return "₹"+Number(n).toLocaleString("en-IN"); }
function priceText(row){
  const p=(row.prices&&row.prices.INR!=null&&row.prices.INR!=="")?row.prices.INR:row.price_aed;
  return (p==null||p===""||isNaN(Number(p))||Number(p)<=0)?"Price on request":fmtMoney(p);
}
const PLANE='<svg viewBox="0 0 24 24" fill="none"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="currentColor"/></svg>';
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function processingText(v){
  var n=v.processing_time_value, u=v.processing_time_unit;
  if(n==null||n===''||!u) return '';
  var unit=u==='hours'?('hour'+(Number(n)===1?'':'s')):('day'+(Number(n)===1?'':'s'));
  return n+' '+unit;
}

function stayText(v){
  if(v.days==null||v.days===''||Number(v.days)<=0) return '';
  return v.days+' days';
}

// "Get your visa in X" pill — uses the existing per-visa ETA; blank ETA shows nothing.
// Brand-adaptive (var(--blue-*) are set to the saved brand colour), honest wording ("about").
function etaBadge(v){
  var n=v.processing_time_value, u=v.processing_time_unit;
  if(n==null||n===''||!u) return '';
  var unit = u==='hours' ? ('hour'+(Number(n)===1?'':'s')) : ('day'+(Number(n)===1?'':'s'));
  return '<div class="eta-pill">Ready in '+esc(n)+' '+unit+'</div>';
}

function visaCard(v, active){
  var cat = v.category ? '<div class="vsub">'+esc(v.category)+'</div>' : '';
  var cleanName = (v.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim();
  var facts=[
    stayText(v)?'<span><small>Stay</small><b>'+esc(stayText(v))+'</b></span>':'',
    v.sub?'<span><small>Entry</small><b>'+esc(v.sub)+'</b></span>':'',
    processingText(v)?'<span><small>Processing</small><b>'+esc(processingText(v))+'</b></span>':''
  ].filter(Boolean).join('');
  return '<div class="vcard">'+
    etaBadge(v)+
    '<h3>'+esc(cleanName)+'</h3>'+cat+
    '<div class="price">'+esc(priceText(v, active))+' <small>/ visa</small></div>'+
    (facts?'<div class="country-visa-facts">'+facts+'</div>':'')+
    '<a href="/app.html?visa='+encodeURIComponent(v.slug)+'" class="btn btn-primary btn-block">Apply now</a>'+
    '<a href="/visa/'+encodeURIComponent(v.slug)+'" class="country-visa-details">Details →</a>'+
  '</div>';
}

function uaeVisaSelector(visas, active){
  if(!visas.length) return '';
  var first=visas[0];
  var firstCleanName = (first.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim();
  var choices=visas.map(function(v,index){
    var cleanName = (v.name || '').replace(/\bUAE\b/g, '').replace(/\s+/g, ' ').trim();
    return '<label class="uae-visa-option'+(index===0?' selected':'')+'">'+
      '<input class="uae-visa-option-input" type="radio" name="visa" value="'+esc(v.slug)+'"'+(index===0?' checked':'')+' required'+
      ' data-name="'+esc(cleanName||'UAE visa')+'"'+
      ' data-category="'+esc(v.category||'UAE visa')+'"'+
      ' data-stay="'+esc(stayText(v)||'See visa details')+'"'+
      ' data-entry="'+esc(v.sub||v.category||'See visa details')+'"'+
      ' data-processing="'+esc(processingText(v)||'To be confirmed')+'"'+
      ' data-price="'+esc(priceText(v, active))+'" data-uae-choice>'+
      '<span class="uae-option-top"><span><b>'+esc(cleanName||'UAE visa')+'</b><small>'+esc(v.category||'UAE visa')+'</small></span><strong>'+esc(priceText(v, active))+'<small>per applicant</small></strong></span>'+
      '<span class="uae-option-facts">'+
        '<span><small>Stay</small><b>'+esc(stayText(v)||'See details')+'</b></span>'+
        '<span><small>Entry</small><b>'+esc(v.sub||v.category||'See details')+'</b></span>'+
        '<span><small>Processing</small><b>'+esc(processingText(v)||'To be confirmed')+'</b></span>'+
      '</span>'+
      '<span class="uae-option-action"><i aria-hidden="true">&#10003;</i><span>Choose this visa</span></span>'+
    '</label>';
  }).join('');
  return '<form class="uae-visa-picker" action="/app.html" method="get" data-uae-visa-selector>'+
    '<fieldset class="uae-visa-catalogue">'+
      '<legend class="uae-visually-hidden">Choose a UAE visa type</legend>'+
      '<div class="uae-catalogue-heading"><div><span>Available visa types</span><h3>Compare all UAE visas</h3></div><b>'+visas.length+' option'+(visas.length===1?'':'s')+'</b></div>'+
      '<div class="uae-visa-list">'+choices+'</div>'+
    '</fieldset>'+
    '<aside class="uae-picker-summary" aria-live="polite" aria-atomic="true">'+
      '<span class="uae-picker-kicker">Your selection</span>'+
      '<h3 data-uae-name>'+esc(firstCleanName||'UAE visa')+'</h3>'+
      '<p data-uae-category>'+esc(first.category||'UAE visa')+'</p>'+
      '<div class="uae-picker-price"><span>Visa fee</span><strong data-uae-price>'+esc(priceText(first, active))+'</strong><small>per applicant</small></div>'+
      '<div class="uae-picker-facts">'+
        '<div><span>Stay</span><b data-uae-stay>'+esc(stayText(first)||'See visa details')+'</b></div>'+
        '<div><span>Entry</span><b data-uae-entry>'+esc(first.sub||first.category||'See visa details')+'</b></div>'+
        '<div><span>Processing</span><b data-uae-processing>'+esc(processingText(first)||'To be confirmed')+'</b></div>'+
      '</div>'+
      '<div class="uae-picker-assurance"><span aria-hidden="true">&#10003;</span><p><b>Simple and secure</b><small>Review your details before submitting.</small></p></div>'+
      '<button class="btn btn-primary btn-block uae-picker-submit" type="submit">Continue application <span aria-hidden="true">&#8594;</span></button>'+
    '</aside>'+
  '</form>';
}

function schengenDocuments(countryName){
  function card(title,text){
    return '<article class="uae-document-card uae-document-card-simple" style="min-height: auto; padding: 16px;">'+
      '<div class="uae-document-copy"><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p></div>'+
    '</article>';
  }
  var isKorea = countryName === 'South Korea';
  var isIreland = countryName === 'Ireland';
  var docsCount = isKorea ? '8' : (isIreland ? '10' : '6');
  var headingHtml = (isKorea || isIreland)
    ? '<p>Prepare these documents before starting your ' + esc(countryName) + ' visa application.</p>'
    : '<p>Prepare these documents before starting your ' + esc(countryName) + ' Schengen visa application.</p>';

  var docsGrid = '';
  if (isKorea) {
    docsGrid =
      card('Passport','Passport valid.')+
      card('Qatar ID','Qatar ID (valid more than 3 months from the entry date of Korea).')+
      card('Passport size photo','Passport size photo (White background).')+
      card('Employment letter','Recent employment letter from your employer.')+
      card('Residency Permit Certificate','Certificate which is mentioned your Residency Permit details, including first entry (issuance date) and the expiry date; Apply for \'To Whom It May Concern\' certificate through online Metrash and print.')+
      card('Company Establishment & CR Cards','Company’s establishment card (Front and back side printed in one page) and English commercial registration that valid more than 3 months from entry date of Korea.')+
      card('3 Months Bank Statement','Original bank statement showing 3 months salaries.')+
      card('Travel Record Copy','Copy of previous 5 years of travel record such as exit-entry stamp or visa page on the passport, if you have traveled and applicable. The last entry date to Qatar record must be included.');
  } else if (isIreland) {
    docsGrid =
      card('Passport','Passport (6 Months validity required).')+
      card('Qatar ID','Qatar ID (3 months validity required from the date of return).')+
      card('Passport size Photo','Recently taken passport-size photo with a white background.')+
      card('Travel records photocopy','Photocopy of your bio page, all visa & immigration stamps for all travel.')+
      card('Last 6 months bank statement','Original bank statement showing latest 6 months transaction history (Sealed and signed).')+
      card('Employment letter & Salary certificate','Recent employment letter and salary certificate from your employer.')+
      card('Application form','We will provide a dummy application form.')+
      card('Hotel booking','Hotel booking will be provided by us.')+
      card('Flight ticket','We will provide a dummy flight ticket.')+
      card('Appointment','Visa appointment will be booked and provided by us.');
  } else {
    docsGrid =
      card('Passport','Passport valid for a minimum of 6 months.')+
      card('Passport size photo','Recent passport-size photo with a white background.')+
      card('Last 6 months bank statement','Provide your latest 6 months bank statement.')+
      card('Qatar ID','Clear copy of your valid Qatar ID.')+
      card('Employment letter','Recent employment letter from your employer.')+
      card('Previous Schengen visa copy','Upload a previous Schengen visa copy only if you have one.');
  }

  var detailsTitle = (isKorea || isIreland) ? 'Required details' : 'Required details for Schengen';
  var detailsList = isKorea
    ? [
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
      ]
    : (isIreland
      ? [
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
        ]
      : ((countryName === 'France' || countryName === 'Germany')
        ? [
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
          ]
        : [
            'Residence address',
            'Mobile number',
            'Email address',
            'Current Occupation',
            'Employer name',
            'Employer Address',
            'Employer phone number',
            'Date of arrival',
            'Date of return'
          ]));

  var detailsHtml = detailsList.map(function(item) {
    return '<li>' + esc(item) + '</li>';
  }).join('');

  return '<div class="container uae-documents-simple">'+
    '<div class="uae-documents-overview">'+
      '<div class="uae-documents-heading"><span class="eyebrow">Documents</span><h2>Tourist visa requirements</h2>' + headingHtml + '</div>'+
      '<div class="uae-documents-quick" aria-label="Document preparation summary">'+
        '<div><strong>' + docsCount + '</strong><span>essential items</span></div>'+
        '<div><strong>' + (isIreland ? '10-45 days' : '5-20 days') + '</strong><span>processing</span></div>'+
        '<div><strong>Online</strong><span>guided form</span></div>'+
      '</div>'+
    '</div>'+
    '<div class="uae-document-grid" style="grid-template-columns: 1fr; gap: 12px;">'+
      docsGrid +
    '</div>'+
    '<div class="schengen-details-note" style="margin-top: 24px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 14px; background: #f8fafc; text-align: left; width: 100%;">'+
      '<h3 style="font-size: 15px; font-weight: 800; color: #1e293b; margin: 0 0 12px 0;">' + esc(detailsTitle) + '</h3>'+
      '<ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13.5px; line-height: 1.8; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 4px 16px; list-style-type: disc;">'+
        detailsHtml +
      '</ul>'+
    '</div>'+
    '<div class="uae-documents-footer">'+
      '<div><span aria-hidden="true">&#8593;</span><p><b>Upload from any device</b><small>Clear phone photos or scans are accepted.</small></p></div>'+
      '<a href="#visa-info" class="btn btn-primary">Choose visa &amp; start <span aria-hidden="true">&#8594;</span></a>'+
    '</div>'+
  '</div>';
}

function uaeDocuments(){
  function card(label,title,text,image){
    return '<article class="uae-document-card uae-document-card-simple">'+
      '<div class="uae-document-photo"><img src="'+image+'" alt="" loading="lazy" decoding="async"></div>'+
      '<div class="uae-document-copy"><div><h3>'+title+'</h3><span class="uae-document-status">'+label+'</span></div><p>'+text+'</p></div>'+
    '</article>';
  }
  return '<div class="container uae-documents-simple">'+
    '<div class="uae-documents-overview">'+
      '<div class="uae-documents-heading"><span class="eyebrow">Documents</span><h2>Only two documents needed</h2><p>Keep a clear passport bio page and a recent personal photo ready.</p></div>'+
      '<div class="uae-documents-quick" aria-label="Document preparation summary">'+
        '<div><strong>2</strong><span>essential items</span></div>'+
        '<div><strong>~3 min</strong><span>to prepare</span></div>'+
        '<div><strong>Phone</strong><span>uploads accepted</span></div>'+
      '</div>'+
    '</div>'+
    '<div class="uae-document-grid">'+
      card('Required','Passport bio page','A clear copy of the page with your photo and details.','/assets/uae-documents/passport-bio-page.png')+
      card('Required','Recent photo','A clear, front-facing photo on a plain background.','/assets/uae-documents/recent-photo.png')+
    '</div>'+
    '<div class="uae-documents-footer">'+
      '<div><span aria-hidden="true">&#8593;</span><p><b>Upload from any device</b><small>Clear phone photos or scans are accepted.</small></p></div>'+
      '<a href="#visa-info" class="btn btn-primary">Choose visa &amp; start <span aria-hidden="true">&#8594;</span></a>'+
    '</div>'+
  '</div>';
}

function uaeProcess(){
  return '<div class="container uae-process-simple">'+
    '<div class="uae-process-heading">'+
      '<span class="eyebrow">What happens after you apply</span>'+
      '<h2>Your UAE visa in 3 simple steps</h2>'+
      '<p>Choose, upload and track. VisaDoo guides you through the rest.</p>'+
    '</div>'+
    '<div class="uae-process-steps" role="list" aria-label="UAE visa application steps">'+
      '<article class="uae-process-step" role="listitem"><span>01</span><div><h3>Choose your visa</h3><p>Compare the options and select the one that fits your trip.</p></div></article>'+
      '<article class="uae-process-step" role="listitem"><span>02</span><div><h3>Upload documents</h3><p>Add clear passport and photo copies from your phone.</p></div></article>'+
      '<article class="uae-process-step" role="listitem"><span>03</span><div><h3>Track your visa</h3><p>Follow every update online until your visa is ready.</p></div></article>'+
    '</div>'+
  '</div>';
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



function uaeAttractionsDropdownHtml(whatsappNumber) {
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

// Brand colour palette — must match branding.js applyColor() so first paint is the saved colour (no flash).
function shade(hex,p){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex.split("").map(function(c){return c+c;}).join(""); if(hex.length!==6) return "#"+hex; var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16); var t=p<0?0:255,a=Math.abs(p)/100; r=Math.round((t-r)*a+r); g=Math.round((t-g)*a+g); b=Math.round((t-b)*a+b); return "#"+[r,g,b].map(function(v){return ("0"+v.toString(16)).slice(-2);}).join(""); }
function brandVars(p){ if(!p) return ""; return '<style id="brand-vars">:root{--blue-600:'+p+';--blue-700:'+shade(p,-14)+';--blue-900:'+shade(p,-34)+';--blue-500:'+shade(p,8)+';--blue-400:'+shade(p,24)+';--blue-100:'+shade(p,82)+';--sky-50:'+shade(p,93)+';}</style>'; }
// Logo / favicon — same site-wide for every request; matches branding.js so first paint is correct (no flash).
var LOGO="", FAVICON="", APPICON="", BNAME="Visa Doo";
function brandMark(){ return LOGO ? ('<img src="'+esc(LOGO)+'" alt="'+esc(BNAME||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">') : ('<span class="logo">'+PLANE+'</span>Visa<b>Doo</b>'); }
function iconTags(){ var t = FAVICON ? ('<link rel="icon" href="'+esc(FAVICON)+'">') : '<link rel="icon" href="data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27><rect width=%27100%27 height=%27100%27 rx=%2724%27 fill=%27%232563eb%27/></svg>">'; if(APPICON||LOGO) t += '<link rel="apple-touch-icon" href="'+esc(APPICON||LOGO)+'">'; return t; }

function pageHtml(c, visas, defaultImg, active, brandColor, whatsappNumber){
  if(c.slug==='spain') c.name='Spain';
  if(c.slug==='denmark') c.name='Denmark';
  if(c.slug==='japan') c.name='Japan';
  if(c.slug==='south-korea') c.name='South Korea';
  if(c.slug==='switzerland') c.name='Switzerland';
  if(c.slug==='ireland') c.name='Ireland';
  if(c.slug==='france') c.name='France';
  if(c.slug==='germany') c.name='Germany';

  var isUae=String(c.iso2||'').toUpperCase()==='AE'||c.slug==='uae'||c.slug==='united-arab-emirates';
  var isUaeStyle=isUae||c.slug==='japan'||c.slug==='denmark'||c.slug==='spain'||c.slug==='south-korea'||c.slug==='switzerland'||c.slug==='ireland'||c.slug==='france'||c.slug==='germany';
  var showAttractions=c.slug!=='japan'&&c.slug!=='denmark'&&c.slug!=='spain'&&c.slug!=='south-korea'&&c.slug!=='switzerland'&&c.slug!=='ireland'&&c.slug!=='france'&&c.slug!=='germany';
  var visaSectionTitle=isUaeStyle?'Visa types':'Visa options';
  var title=(c.seo_title&&c.seo_title.trim())||(c.name+' Visas — Apply Online | Visa Doo');
  var desc=(c.seo_description&&c.seo_description.trim())||(c.summary||('Apply online for your '+c.name+' visa with Visa Doo. Tourist and business visas, document upload and live tracking.')).slice(0,160);
  var canonical=SITE+'/country/'+c.slug;
  var ogImage=c.social_image||defaultImg||'';
  var cards = visas.length ? visas.map(function(v){return visaCard(v, active);}).join('') : '<div class="country-empty"><h3>Options coming soon</h3><a href="/#contact" class="btn btn-primary">Contact us</a></div>';
  var visaContent=isUaeStyle&&visas.length?uaeVisaSelector(visas,active):'<div class="cards">'+cards+'</div>';
  var documentsContent=(c.slug==='denmark'||c.slug==='spain'||c.slug==='south-korea'||c.slug==='switzerland'||c.slug==='ireland'||c.slug==='france'||c.slug==='germany')?schengenDocuments(c.name):
    (isUaeStyle?uaeDocuments():
    '<div class="container country-documents-grid">'+
      '<div><span class="eyebrow">Documents</span><h2>Keep these ready</h2></div>'+
      '<div class="country-doc-list">'+
        '<div>'+CHECK+'<span><b>Passport</b></span></div>'+
        '<div>'+CHECK+'<span><b>Photo</b></span></div>'+
        '<div>'+CHECK+'<span><b>Travel details</b></span></div>'+
        '<div>'+CHECK+'<span><b>Extra documents, if needed</b></span></div>'+
      '</div>'+
    '</div>');
  var bannerOverrides={
    'united-arab-emirates-banner':'/assets/uae-burj-khalifa-hero.jpg',
    'uae-banner':'/assets/uae-burj-khalifa-hero.jpg',
    'united-arab-emirates':'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=2400&q=95',
    'uae':'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=2400&q=95',
    'japan':'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=2400&q=95',
    'denmark':'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=2400&q=95',
    'spain':'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=2400&q=95',
    'south-korea':'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=2400&q=95',
    'switzerland':'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=2400&q=95',
    'ireland':'https://images.unsplash.com/photo-1590089415225-401ed6f9db8e?auto=format&fit=crop&w=2400&q=95'
  };
  var heroImage=bannerOverrides[c.slug+'-banner']||bannerOverrides[c.slug]||c.image_url||c.social_image||defaultImg||'';
  var priced=visas.map(function(v){
    var p=(v.prices&&v.prices.INR!=null&&v.prices.INR!=='')?v.prices.INR:v.price_aed;
    return (p==null||p===''||isNaN(Number(p))||Number(p)<=0)?null:Number(p);
  }).filter(function(p){return p!=null;});
  var fromPrice=priced.length?Math.min.apply(null,priced):null;
  var processing=visas.map(function(v){
    if(v.processing_time_value==null||v.processing_time_value===''||!v.processing_time_unit) return null;
    return {
      hours:v.processing_time_unit==='hours'?Number(v.processing_time_value):Number(v.processing_time_value)*24,
      text:processingText(v)
    };
  }).filter(Boolean).sort(function(a,b){return a.hours-b.hours;});
  var fastest=processing.length?processing[0].text:'';
  var currencyStr=visas.some(function(v){return v.prices&&v.prices.INR!=null;})?'INR':'AED';
  var priceTextStr=fromPrice?(currencyStr+' '+fromPrice):'AED 350';
  var approvedText=fastest
    ? (fastest.toLowerCase().indexOf('day') > -1 || fastest.toLowerCase().indexOf('hour') > -1 ? 'Approved in ' + fastest : 'Approved in ' + fastest + ' business days')
    : 'Approved in 2 business days';
  var facts=[
    '<div><strong>'+visas.length+'</strong><span>Options</span></div>',
    fromPrice!=null?'<div><strong>'+esc(fmtMoney(fromPrice))+'</strong><span>From</span></div>':'',
    fastest?'<div><strong>'+esc(fastest)+'</strong><span>Fastest</span></div>':''
  ].filter(Boolean).join('');
  var summary=shortText(c.summary,'Apply online with clear prices and simple tracking.',120);
  var heroStyle=heroImage?" style=\"--country-hero-image:url('" + esc(heroImage) + "')\"":"";

  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'+
    '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'">'+
    '<link rel="canonical" href="'+esc(canonical)+'">'+
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Visa Doo">'+
    '<meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
    (ogImage?'<meta property="og:image" content="'+esc(ogImage)+'">':'')+
    '<meta name="twitter:card" content="summary_large_image">'+
    iconTags()+
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">'+
    '<link rel="stylesheet" href="/styles.css?v=20260804-natural-uae-hero">'+
    '<link rel="stylesheet" href="/country.css">'+
    brandVars(brandColor)+
    '<script src="/branding.js"></scr'+'ipt>'+
    '</head><body class="country-page'+(isUaeStyle?' uae-country-page':'')+'">'+
    '<header class="header discover-header"><div class="container nav">'+
      '<div class="nav-brand-cluster">'+
        '<a href="/#top" class="brand">'+brandMark()+'</a>'+
      '</div>'+
      '<nav class="nav-links" id="navLinks">'+
        '<a href="/#destinations" class="active" aria-current="page">Explore</a>'+
        '<a href="/events">Events</a>'+
        '<a href="/articles">Articles</a>'+
      '</nav>'+
      '<div class="nav-actions">'+
        '<div class="site-language-header-selector">' +
          '<button class="site-language-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" class="globe-icon" style="margin-right: 4px; display: inline-block; vertical-align: middle;">' +
              '<circle cx="12" cy="12" r="10"/>' +
              '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' +
              '<path d="M2 12h20"/>' +
            '</svg>' +
            '<b data-language-header-name>EN</b>' +
          '</button>' +
          '<div class="site-language-menu header-menu" role="listbox" aria-label="Languages" style="display: none;">' +
            '<button type="button" role="option" data-language-option="en"><img src="https://flagcdn.com/w40/gb.png" alt="UK flag" class="flag-icon"><span>English</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>' +
            '<button type="button" role="option" data-language-option="ml"><img src="https://flagcdn.com/w40/in.png" alt="Indian flag" class="flag-icon"><span>Malayalam</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>' +
            '<button type="button" role="option" data-language-option="hi"><img src="https://flagcdn.com/w40/in.png" alt="Indian flag" class="flag-icon"><span>Hindi</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>' +
            '<button type="button" role="option" data-language-option="ar"><img src="https://flagcdn.com/w40/sa.png" alt="Arabic flag" class="flag-icon"><span>Arabic</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>' +
            '<button type="button" role="option" data-language-option="fr"><img src="https://flagcdn.com/w40/fr.png" alt="French flag" class="flag-icon"><span>French</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>' +
            '<button type="button" role="option" data-language-option="es"><img src="https://flagcdn.com/w40/es.png" alt="Spanish flag" class="flag-icon"><span>Spanish</span><i aria-hidden="true" style="margin-left: auto; display: none;">&#10003;</i></button>' +
          '</div>' +
        '</div>' +
        '<a href="/app.html#profile" class="nav-profile" aria-label="Profile" title="Profile"></a>'+
        '<button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">'+
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg>'+
        '</button>'+
      '</div>'+
    '</div></header>'+
    '<main>'+
    (isUaeStyle?
      '<section class="uae-travel-banner" style="background-image: url(&quot;' + esc(heroImage) + '&quot;);">' +
        '<div class="uae-banner-bottom-bar">' +
          '<div class="uae-banner-bottom-bg"></div>' +
          '<div class="container uae-banner-bottom-content">' +
            '<a href="/#destinations" class="uae-travel-back"><span aria-hidden="true">&#8592;</span> All destinations</a>' +
            '<h1>Apply ' + esc(c.name) + ' ' + (c.slug === 'japan' || isUae ? 'eVisa' : 'Visa') + '</h1>' +
            '<p>' + esc(approvedText) + '. From ' + esc(priceTextStr) + ' all-inclusive. No embassy visit, no paperwork.</p>' +
            (showAttractions ?
            ('<button class="uae-attractions-toggle" aria-expanded="false" type="button">' +
              '<span>' + esc(c.name === 'United Arab Emirates' || c.name === 'UAE' ? 'Dubai' : c.name) + ' Tourist Attractions</span>' +
              '<svg class="uae-toggle-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M6 9l6 6 6-6"/></svg>' +
            '</button>') : '') +
          '</div>' +
        '</div>' +
      '</section>':
      '<section class="country-detail-hero"'+heroStyle+'><div class="container country-detail-grid">'+
        '<div class="country-detail-copy">'+
          '<a href="/#destinations" class="country-back"><span aria-hidden="true">&#8592;</span> All destinations</a>'+
          '<div class="country-guide-row">'+
            (c.iso2?'<img src="https://flagcdn.com/w80/'+esc(c.iso2.toLowerCase())+'.png" alt="'+esc(c.name)+' flag">':'')+
            '<span class="eyebrow">Visa guide</span>'+
          '</div>'+
          '<h1>'+esc(c.name)+' Visas</h1>'+
          '<p>'+esc(summary)+'</p>'+
          '<div class="country-facts">'+facts+'</div>'+
          '<a href="#visa-info" class="btn btn-primary btn-lg">Choose a visa <span aria-hidden="true">→</span></a>'+
        '</div>'+
      '</div></section>')+
    (isUaeStyle ? '' :
    '<nav class="country-info-nav" aria-label="Country visa information"><div class="container">'+
      '<a href="#visa-info">Visa Info</a>'+
      '<a href="/requirements.html?slug='+encodeURIComponent(c.slug||'')+'">Visa Requirements</a>'+
    '</div></nav>')+
    '<section class="section sky country-options'+(isUaeStyle?' uae-country-options':'')+'" id="visa-info"><div class="container">'+
      '<div class="country-section-heading"><span class="eyebrow">Choose a visa</span><h2>'+visaSectionTitle+'</h2>'+(isUaeStyle?'<p>Compare '+esc(c.name)+' visa types, check the key details and continue with the option that fits your trip.</p>':'')+'</div>'+
      (isUaeStyle && showAttractions ? uaeAttractionsDropdownHtml(whatsappNumber) : '') +
      visaContent+
    '</div></section>'+
    (isUaeStyle?'':'<section class="section country-documents'+(isUaeStyle?' uae-documents':'')+'" id="documents">'+documentsContent+'</section>')+
    (isUaeStyle?'':'<section class="section country-process'+(isUaeStyle?' uae-country-process':'')+'" id="visa-process">'+
      (isUaeStyle?uaeProcess():'<div class="container"><div class="country-process-heading"><span class="eyebrow">Visa Process</span><h2>What to do next</h2><p>Choose your visa, upload the documents and track every update online.</p></div><div class="country-process-flow" role="list" aria-label="Visa application steps"><div class="country-process-step" role="listitem"><i aria-hidden="true">&#10003;</i><b>Choose visa</b><small>Pick the right option</small></div><div class="country-process-step" role="listitem"><i aria-hidden="true">&#8593;</i><b>Upload files</b><small>Add passport and photo</small></div><div class="country-process-step" role="listitem"><i aria-hidden="true">&#9678;</i><b>Track status</b><small>See updates online</small></div></div></div>')+
    '</section>')+
    '</main>'+
    '<footer class="footer home-footer"><div class="container">'+
      '<div class="footer-grid footer-grid--expanded">'+
        '<div class="footer-intro">'+
          '<a href="/#top" class="brand">'+brandMark()+'</a>'+
          '<p>Tourist &amp; business visas for destinations worldwide — applied for and tracked entirely online. We handle the paperwork so you can plan the trip.</p>'+
          '<div class="footer-assurances"><span>100% online</span><span>Secure &amp; tracked</span></div>'+
        '</div>'+
        '<div><h5>Explore</h5><ul>'+
          '<li><a href="/#destinations">Destinations</a></li>'+
          '<li><a href="/events">Events</a></li>'+
          '<li><a href="/#how">How it works</a></li>'+
          '<li><a href="/articles">Articles</a></li>'+
          '<li><a href="/app.html#track">Track application</a></li>'+
        '</ul></div>'+
        '<div><h5>Company</h5><ul id="footerCompany">'+
          '<li><a href="/p/about">About Visa Doo</a></li>'+
          '<li><a href="/p/privacy-policy">Privacy Policy</a></li>'+
          '<li><a href="/p/terms">Terms &amp; Conditions</a></li>'+
          '<li><a href="/#contact">Contact us</a></li>'+
        '</ul></div>'+
        '<div class="footer-contact"><h5>Contact</h5><ul>'+
          '<li><a id="footWa" href="https://wa.me/919895226697?text=Hi%20Visa%20Doo%2C%20I%20have%20a%20question%20about%20a%20visa." target="_blank" rel="noopener"><span>WhatsApp</span><small>Chat with our visa team</small></a></li>'+
          '<li><a id="footEmail" href="mailto:hello@visadoo.com"><span>hello@visadoo.com</span><small>Send us your questions</small></a></li>'+
        '</ul></div>'+
      '</div>'+
      '<div class="footer-bottom">'+
        '<span>© '+new Date().getFullYear()+' Visa Doo. All rights reserved.</span>'+
        '<span>Plan simply. Travel confidently.</span>'+
        '<div id="socialLinks" hidden></div>'+
      '</div>'+
    '</div></footer>'+
    '<script src="/destination-images.js"></scr'+'ipt>'+
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></scr'+'ipt>'+
    '<script src="/config.js"></scr'+'ipt>'+
    '<script src="/country-experience.js"></scr'+'ipt>'+
    '<script src="/country-page.js?v=20260805-dynamic-single-active-nav"></scr'+'ipt>'+
    '<script src="/country-history.js?v=20260804-natural-uae-hero"></scr'+'ipt>'+
    '<script>(function(){var b=document.getElementById("menuBtn"),n=document.getElementById("navLinks");if(!b||!n)return;b.addEventListener("click",function(){var o=n.classList.toggle("open");b.setAttribute("aria-expanded",String(o))});n.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){n.classList.remove("open");b.setAttribute("aria-expanded","false")})})})();</scr'+'ipt>'+
    '<script>(function(){var w=document.querySelector("[data-uae-visa-selector]"),c=w&&w.querySelectorAll("[data-uae-choice]");if(!w||!c.length)return;function u(o){if(!o)return;["name","category","stay","entry","processing","price"].forEach(function(k){w.querySelectorAll("[data-uae-"+k+"]").forEach(function(n){n.textContent=o.getAttribute("data-"+k)||""})});c.forEach(function(i){var l=i.closest(".uae-visa-option");if(l)l.classList.toggle("selected",i===o)})}c.forEach(function(i){i.addEventListener("change",function(){if(i.checked)u(i)})});u(w.querySelector("[data-uae-choice]:checked"))})();</scr'+'ipt>'+
    '<script>(function(){' +
      'var b=document.querySelector(".uae-attractions-toggle"),p=document.querySelector(".uae-attractions-dropdown");' +
      'if(!b||!p)return;' +
      'b.addEventListener("click",function(){' +
        'var a=b.classList.toggle("active");' +
        'b.setAttribute("aria-expanded",String(a));' +
        'p.style.display=a?"block":"none";' +
        'p.classList.toggle("is-open",a);' +
        'if(a){' +
          'setTimeout(function(){p.scrollIntoView({behavior:"smooth",block:"nearest"});toggleArrows();},100);' +
        '}' +
      '});' +
      'document.querySelectorAll(\'a[href="#attractions"]\').forEach(function(l){' +
        'l.addEventListener("click",function(e){' +
          'e.preventDefault();' +
          'if(!b.classList.contains("active")){b.click()}else{p.scrollIntoView({behavior:"smooth",block:"nearest"})}' +
        '});' +
      '});' +
      'var container=p.querySelector(".uae-horizontal-scroll-container"),' +
          'leftArrow=p.querySelector(".uae-carousel-arrow-left"),' +
          'rightArrow=p.querySelector(".uae-carousel-arrow-right");' +
      'if(container&&leftArrow&&rightArrow){' +
        'leftArrow.addEventListener("click",function(){container.scrollBy({left:-310,behavior:"smooth"})});' +
        'rightArrow.addEventListener("click",function(){container.scrollBy({left:310,behavior:"smooth"})});' +
        'function toggleArrows(){' +
          'var sl=container.scrollLeft,max=container.scrollWidth-container.clientWidth;' +
          'leftArrow.style.opacity=sl<=5?"0":"1";' +
          'leftArrow.style.pointerEvents=sl<=5?"none":"auto";' +
          'rightArrow.style.opacity=sl>=max-5?"0":"1";' +
          'rightArrow.style.pointerEvents=sl>=max-5?"none":"auto";' +
        '}' +
        'container.addEventListener("scroll",toggleArrows);' +
        'window.addEventListener("resize",toggleArrows);' +
        'setTimeout(toggleArrows,200);' +
      '}' +
    '})();</scr'+'ipt>'+
    '</body></html>';
}

function notFound(){
  return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Destination not found | Visa Doo</title><link rel="stylesheet" href="/styles.css?v=20260803-footer-top-line"></head><body>'+
    '<div style="min-height:70vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">Destination not found</h1>'+
    '<p style="color:#5b6b85;margin:12px 0 22px">We don\'t have this destination yet.</p><a href="/" class="btn btn-primary btn-lg">Browse destinations</a></div></div></body></html>',
    { status:404, headers:{ "content-type":"text/html; charset=utf-8" } });
}

function serviceUnavailable(){
  return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Please try again | Visa Doo</title><link rel="stylesheet" href="/styles.css?v=20260803-footer-top-line"></head><body>'+
    '<div style="min-height:70vh;display:grid;place-items:center;text-align:center;padding:40px"><div><h1 style="font-size:30px">We could not load this destination</h1>'+
    '<p style="color:#5b6b85;margin:12px auto 22px;max-width:480px">This is usually temporary. Please refresh the page, browse another destination, or contact us if you need help now.</p>'+
    '<a href="" class="btn btn-primary btn-lg">Try again</a> <a href="/#contact" class="btn btn-ghost btn-lg">Contact us</a></div></div></body></html>',
    { status:503, headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"no-store" } });
}

export default async (request) => {
  try{
    const url=new URL(request.url);
    const parts=url.pathname.split("/").filter(Boolean); // ["country","<slug>"]
    const slug=parts[1]?decodeURIComponent(parts[1]):"";
    if(!slug) return notFound();

    const countries=await fetchJson(SUPABASE_URL+"/rest/v1/countries?slug=eq."+encodeURIComponent(slug)+"&active=eq.true&select=*");
    if(!countries.length) return notFound();
    const c=countries[0];
    const data=await Promise.all([
      fetchJson(SUPABASE_URL+"/rest/v1/visa_types?country_slug=eq."+encodeURIComponent(slug)+"&active=eq.true&order=sort_order&select=*"),
      fetchJson(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=default_social_image,active_currency,currencies,brand_color,logo_url,favicon_url,app_icon_url,brand_name,contact_whatsapp")
    ]);
    const visas=data[0]||[];
    const settings=data[1]||[];
    const defaultImg=(settings[0]&&settings[0].default_social_image)||"";
    const active=resolveActive(settings);
    const brandColor=(settings[0]&&settings[0].brand_color)||"";
    const ss0=settings[0]||{};
    LOGO=ss0.logo_url||""; FAVICON=ss0.favicon_url||""; APPICON=ss0.app_icon_url||""; BNAME=ss0.brand_name||"Visa Doo";
    const waNumber=ss0.contact_whatsapp||"";

    return new Response(pageHtml(c, visas, defaultImg, active, brandColor, waNumber), {
      headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" }
    });
  }catch(e){
    return serviceUnavailable();
  }
};

export const config = { path: "/country/:slug" };
