// Visa Doo — inject editable global SEO into the homepage (title, description,
// social tags, Google verification) by transforming the static index.html.
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }

// Brand colour palette — must match branding.js applyColor() so the server-injected
// colour is identical to what the script later sets (prevents the colour "flash").
function shade(hex,p){ hex=(hex||"").replace("#",""); if(hex.length===3) hex=hex.split("").map(function(c){return c+c;}).join(""); if(hex.length!==6) return "#"+hex; var r=parseInt(hex.substr(0,2),16),g=parseInt(hex.substr(2,2),16),b=parseInt(hex.substr(4,2),16); var t=p<0?0:255,a=Math.abs(p)/100; r=Math.round((t-r)*a+r); g=Math.round((t-g)*a+g); b=Math.round((t-b)*a+b); return "#"+[r,g,b].map(function(v){return ("0"+v.toString(16)).slice(-2);}).join(""); }
function brandVars(p){ if(!p) return ""; return '<style id="brand-vars">:root{--blue-600:'+p+';--blue-700:'+shade(p,-14)+';--blue-900:'+shade(p,-34)+';--blue-500:'+shade(p,8)+';--blue-400:'+shade(p,24)+';--blue-100:'+shade(p,82)+';--sky-50:'+shade(p,93)+';}</style>'; }

async function getSettings(){
  try{
    const r = await fetch(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=*", { headers:{ apikey:ANON, authorization:"Bearer "+ANON }});
    if(!r.ok) return {};
    const rows = await r.json();
    return (rows && rows[0]) || {};
  }catch(e){ return {}; }
}

export default async (request, context) => {
  let res;
  try {
    res = await context.next();
  } catch (err) {
    console.error("Home Edge Function Context Next Error:", err);
    return new Response("Service temporarily unavailable", { status: 502 });
  }

  try {
    const ctype = res.headers.get("content-type") || "";
    if(!ctype.includes("text/html")) return res;

    let html = await res.text();
    const s = await getSettings();

    const title = (s.home_seo_title && s.home_seo_title.trim()) || null;
    const desc = (s.home_seo_description && s.home_seo_description.trim()) || null;
    const ogImage = s.home_social_image || s.default_social_image || null;

    if(title){ html = html.replace(/<title>[\s\S]*?<\/title>/, "<title>"+esc(title)+"</title>"); }
    if(desc){
      if(/<meta\s+name="description"[^>]*>/i.test(html)){
        html = html.replace(/<meta\s+name="description"[^>]*>/i, '<meta name="description" content="'+esc(desc)+'">');
      } else {
        html = html.replace("</title>", "</title>\n<meta name=\"description\" content=\""+esc(desc)+"\">");
      }
    }

    // Build social + verification tags to inject before </head>
    const t = title || "Visa Doo — UAE Tourist Visas, Made Simple";
    const d = desc || "Apply for your UAE tourist visa online with Visa Doo. Fast, secure, 100% online.";
    let inject = "\n" +
      '<meta property="og:type" content="website">' +
      '<meta property="og:site_name" content="Visa Doo">' +
      '<meta property="og:title" content="'+esc(t)+'">' +
      '<meta property="og:description" content="'+esc(d)+'">' +
      '<meta property="og:url" content="'+SITE+'/">' +
      (ogImage ? '<meta property="og:image" content="'+esc(ogImage)+'">' : '') +
      '<meta name="twitter:card" content="summary_large_image">' +
      '<meta name="twitter:title" content="'+esc(t)+'">' +
      '<meta name="twitter:description" content="'+esc(d)+'">' +
      (ogImage ? '<meta name="twitter:image" content="'+esc(ogImage)+'">' : '') +
      '<link rel="canonical" href="'+SITE+'/">';
    if(s.google_verification && s.google_verification.trim()){
      inject += '<meta name="google-site-verification" content="'+esc(s.google_verification.trim())+'">';
    }
    inject += brandVars(s.brand_color); // correct brand colour on first paint (no flash)

    // Favicon / app icon: swap the default icon link for the saved ones (prevents tab-icon flash)
    var iconLinks = "";
    if(s.favicon_url) iconLinks += '<link rel="icon" href="'+esc(s.favicon_url)+'">';
    if(s.app_icon_url || s.logo_url) iconLinks += '<link rel="apple-touch-icon" href="'+esc(s.app_icon_url || s.logo_url)+'">';
    // Match the WHOLE icon link incl. the href value — the default favicon is an inline SVG data-URI
    // that contains '>' characters, so a plain [^>]* would stop early and leave a leftover scrap.
    if(iconLinks) html = html.replace(/<link\s+rel="icon"\s+href="[^"]*">/i, iconLinks);

    html = html.replace("</head>", inject+"\n</head>");

    // Logo: replace the default brand mark (plane + "VisaDoo") with the uploaded logo so it's correct on first paint
    if(s.logo_url){
      var logoImg = '<img src="'+esc(s.logo_url)+'" alt="'+esc(s.brand_name||"logo")+'" style="height:34px;width:auto;max-width:180px;display:block">';
      html = html.replace(/(<a[^>]*class="brand"[^>]*>)[\s\S]*?(<\/a>)/g, "$1"+logoImg+"$2");
    }

    return new Response(html, { status: res.status, headers: { "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" } });
  } catch (err) {
    console.error("Home Edge Function Transform Error:", err);
    return res;
  }
};

export const config = { path: "/" };
