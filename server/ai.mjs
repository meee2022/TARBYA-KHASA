import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateContent, validateRequest } from '../packages/domain/author.ts';
export { generateContent, validateRequest };

const settings = resolve(process.cwd(), '.env.server');
if (existsSync(settings)) process.loadEnvFile(settings);

export function createAIHandler(options = {}) {
  let active = 0; const attempts = [];
  return async (req, res, next) => {
    const path = req.url?.split('?')[0];
    if (!['/api/author/status','/api/author/generate'].includes(path)) return next?.();
    const send = (code, payload) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(payload)); };
    const host = req.headers.host || '';
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) return send(403,{ error: 'هذه الخدمة المحلية غير متاحة عبر عنوان خارجي.' });
    if (req.headers.origin && ![`http://${host}`, `https://${host}`].includes(req.headers.origin)) return send(403, { error: 'مصدر الطلب غير مسموح.' });
    const settings=options.getSite?.();
    const enabled=!settings || (settings.aiEnabled && !settings.maintenance);
    if (path.endsWith('/status') && req.method === 'GET') return send(200, { ready: enabled && Boolean(options.apiKey ?? process.env.ANTHROPIC_API_KEY), enabled, provider: 'Claude' });
    if (req.method !== 'POST') return send(405, { error: 'طريقة الطلب غير مسموحة.' });
    if (!enabled) return send(403,{error:'خدمة الذكاء الاصطناعي موقوفة من الإدارة حاليًا.'});
    if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'يلزم محتوى JSON.' });
    while (attempts.length && attempts[0] < Date.now() - 600000) attempts.shift();
    if (active >= 2 || attempts.length >= (settings?.aiRequestLimit ?? 15)) return send(429, { error: 'طلبات كثيرة. انتظر قليلًا ثم أعد المحاولة.' });
    const chunks = []; let size = 0;
    try {
      for await (const chunk of req) { size += chunk.length; if (size > 64000) return send(413, { error: 'المحتوى طويل. اختصر النص إلى 12000 حرف.' }); chunks.push(chunk); }
      let input; try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'الطلب غير صالح.' }); }
      try { validateRequest(input); } catch (e) { return send(400, { error: e.message }); }
      active++; attempts.push(Date.now());
      try { send(200, { result: await generateContent(input, options) }); }
      finally { active--; }
    } catch (e) { send(e.status || 502, { error: e.name === 'TimeoutError' ? 'استغرق الطلب وقتًا طويلًا. حاول مرة أخرى.' : e.message || 'تعذّر إنشاء المسودة.' }); }
  };
}
