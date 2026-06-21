// Visa Doo — auto-generated XML sitemap (homepage + visa pages + published articles)
const SUPABASE_URL = "https://rfueqawvadcvhpmleeoi.supabase.co";
const ANON = "sb_publishable_LyaaSuHTI2x6rCc_HmD-iA_bR9gLx7i";
const SITE = "https://visadoo-uae.netlify.app";

async function fetchJson(url){ const r=await fetch(url,{headers:{apikey:ANON,authorization:"Bearer "+ANON}}); if(!r.ok) return []; return await r.json(); }
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export default async () => {
  const visas = await fetchJson(SUPABASE_URL+"/rest/v1/visa_types?active=eq.true&select=slug,updated_at");
  const arts = await fetchJson(SUPABASE_URL+"/rest/v1/articles?status=eq.published&select=slug,updated_at,published_at");

  const urls = [];
  urls.push({ loc: SITE+"/", pri: "1.0" });
  urls.push({ loc: SITE+"/articles", pri: "0.7" });
  (visas||[]).forEach(function(v){ urls.push({ loc: SITE+"/visa/"+v.slug, lastmod: v.updated_at, pri: "0.9" }); });
  (arts||[]).forEach(function(a){ urls.push({ loc: SITE+"/article/"+a.slug, lastmod: a.updated_at||a.published_at, pri: "0.8" }); });

  const body = '<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
    urls.map(function(u){
      return '  <url><loc>'+esc(u.loc)+'</loc>'+
        (u.lastmod?('<lastmod>'+new Date(u.lastmod).toISOString().slice(0,10)+'</lastmod>'):'')+
        '<priority>'+u.pri+'</priority></url>';
    }).join('\n')+
    '\n</urlset>\n';

  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control":"public, max-age=0, must-revalidate" } });
};

export const config = { path: "/sitemap.xml" };
