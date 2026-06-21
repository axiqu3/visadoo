// Visa Doo — inject editable global SEO into the homepage (title, description,
// social tags, Google verification) by transforming the static index.html.
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }

async function getSettings(){
  try{
    const r = await fetch(SUPABASE_URL+"/rest/v1/site_settings?id=eq.global&select=*", { headers:{ apikey:ANON, authorization:"Bearer "+ANON }});
    if(!r.ok) return {};
    const rows = await r.json();
    return (rows && rows[0]) || {};
  }catch(e){ return {}; }
}

export default async (request, context) => {
  const res = await context.next();
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
  html = html.replace("</head>", inject+"\n</head>");

  return new Response(html, { status: res.status, headers: { "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" } });
};

export const config = { path: "/" };
