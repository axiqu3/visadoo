// VisaDoo Serverless AI Chat API — Production Hardened
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 20 messages per minute per IP

function isRateLimited(ip) {
  const now = Date.now();
  const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, clientData);
    return false;
  }

  clientData.count += 1;
  rateLimitMap.set(ip, clientData);

  // Periodic cleanup of stale entries
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetTime) rateLimitMap.delete(k);
    }
  }

  return clientData.count > MAX_REQUESTS_PER_WINDOW;
}

const APPROVED_ORIGINS = new Set([
  'https://visadoo.com',
  'https://www.visadoo.com',
  'https://visadoo-uae.netlify.app',
  'https://visadoo.vercel.app'
]);

function getAllowedOrigin(origin) {
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    const proto = parsed.protocol;
    if (proto !== 'http:' && proto !== 'https:') return null;

    // Check strict whitelist
    const originNormalized = `${proto}//${host}${parsed.port ? ':' + parsed.port : ''}`;
    if (APPROVED_ORIGINS.has(originNormalized)) {
      return originNormalized;
    }

    // Local development only
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return originNormalized;
    }
  } catch (e) {
    return null;
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Origin');

  const originHeader = req.headers.origin || req.headers.referer;
  const matchedOrigin = getAllowedOrigin(originHeader);
  if (matchedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', matchedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
    const country = String(body.country || '').slice(0, 60).replace(/[^\w\s\-]/g, '');

    // Validate and sanitize messages
    const messages = rawMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 1000).trim()
    })).filter(m => m.content.length > 0);

    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user') {
      return res.status(400).json({ error: 'Valid message required' });
    }

    const system = `You are VisaDoo AI, a professional visa and travel assistant. Answer clearly, politely and concisely. Help with visa types, documents, eligibility, processing-time guidance, travel preparation, destination questions and how to use VisaDoo. Never invent live visa fees, approval guarantees, embassy rules or application status. When information can change, say it should be verified before applying. If the user asks about their own application status, tell them to open the Track section in their VisaDoo account. ${country ? `Current destination context: ${country}.` : ''}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.35, maxOutputTokens: 500 }
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error('Upstream provider error');
      const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
      if (reply) return res.status(200).json({ reply });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.35,
          max_tokens: 500,
          messages: [
            { role: 'system', content: system },
            ...messages
          ]
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error('Upstream provider error');
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (reply) return res.status(200).json({ reply });
    }

    return res.status(503).json({ error: 'AI is not configured' });
  } catch (error) {
    // Never expose stack traces or raw provider details to clients
    return res.status(500).json({ error: 'The AI assistant is temporarily unavailable. Please try again shortly.' });
  }
};
