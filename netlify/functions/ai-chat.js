exports.handler = async function(event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  try {
    const body = JSON.parse(event.body || '{}');
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const country = String(body.country || '').slice(0, 80);
    const last = messages[messages.length - 1];
    if (!last || !String(last.content || '').trim()) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message required' }) };
    const system = `You are VisaDoo AI, a professional visa and travel assistant. Answer clearly, politely and concisely. Help with visa types, documents, eligibility, processing-time guidance, travel preparation, destination questions and how to use VisaDoo. Never invent live visa fees, approval guarantees, embassy rules or application status. When information can change, say it should be verified before applying. If the user asks about their own application status, tell them to open the Track section in their VisaDoo account. ${country ? `Current destination context: ${country}.` : ''}`;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }));
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:.35,maxOutputTokens:500}}) });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error?.message || 'Gemini request failed');
      const reply = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
      if (reply) return { statusCode:200, headers, body:JSON.stringify({reply}) };
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const r = await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:.35,max_tokens:500,messages:[{role:'system',content:system},...messages.map(m=>({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'')}))]})});
      const data=await r.json();
      if(!r.ok) throw new Error(data?.error?.message||'OpenAI request failed');
      const reply=data?.choices?.[0]?.message?.content?.trim();
      if(reply) return {statusCode:200,headers,body:JSON.stringify({reply})};
    }
    return { statusCode:503, headers, body:JSON.stringify({error:'AI is not configured'}) };
  } catch(error) {
    return { statusCode:500, headers, body:JSON.stringify({error:error&&error.message?error.message:'AI request failed'}) };
  }
};
