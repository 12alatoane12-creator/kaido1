'use strict';
const crypto = require('node:crypto');
const seed = require('./seed.json');
const pairs = Object.entries(seed).flatMap(([owner, groups]) => Object.keys(groups).map(category => [owner, category]));
const COOKIE = '__Host-kaido_session';
const SESSION_SECONDS = 8 * 60 * 60;
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const digest = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const equal = (a, b) => crypto.timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
const random = () => crypto.randomBytes(32).toString('hex');
function configuration(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) fail(503, 'قاعدة البيانات غير مربوطة. أضف متغيرات Upstash Redis في Vercel ثم أعد النشر.');
  let parsed; try { parsed = new URL(url); } catch { fail(503, 'إعداد رابط قاعدة البيانات غير صحيح.'); }
  if (parsed.protocol !== 'https:') fail(503, 'رابط قاعدة البيانات يجب أن يبدأ بـ https://.');
  return { url: url.replace(/\/$/, ''), token };
}
function authConfiguration(env) {
  if (!env.KAIDO_PASSWORD || env.KAIDO_PASSWORD.length < 12 || !env.NOVA_PASSWORD || env.NOVA_PASSWORD.length < 12 || !env.ADMIN_TOOL_CODE || env.ADMIN_TOOL_CODE.length < 8)
    fail(503, 'أكمل إعداد KAIDO_PASSWORD وNOVA_PASSWORD (12 حرفًا على الأقل) وADMIN_TOOL_CODE (8 أحرف على الأقل) في Vercel ثم أعد النشر.');
}
const mutateScript = `
local values = cjson.decode(redis.call('GET', KEYS[1]) or '[]')
local id = ARGV[2]
local found = false
for i = #values, 1, -1 do
  if values[i] == id then
    found = true
    if ARGV[1] == 'delete' then table.remove(values, i) end
  end
end
if ARGV[1] == 'add' and not found then
  if #values >= 500 then return -1 end
  table.insert(values, 1, id)
end
local encoded = '[]'
if #values > 0 then encoded = cjson.encode(values) end
redis.call('SET', KEYS[1], encoded)
return 1`;
const rateScript = `local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n`;
function videoId(value) {
  if (typeof value !== 'string' || value.length > 2048) fail(400, 'رابط الفيديو غير صالح.');
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  let url; try { url = new URL(value); } catch { fail(400, 'أدخل رابط يوتيوب صحيحًا.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) fail(400, 'أدخل رابط يوتيوب صحيحًا.');
  const host = url.hostname.toLowerCase(); let id;
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split('/')[2];
  }
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) fail(400, 'الرابط يجب أن يكون لفيديو يوتيوب، وليس قناة أو قائمة تشغيل.');
  return id;
}
function createBackend({ env = process.env, fetchImpl = global.fetch } = {}) {
  const prefix = () => env.DATA_PREFIX || 'kaido-nova:v1';
  const key = (owner, category) => `${prefix()}:content:${owner}:${category}`;
  async function command(args) {
    const { url, token } = configuration(env);
    let response, payload;
    try {
      response = await fetchImpl(url, {method:'POST', headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json'}, body:JSON.stringify(args), signal:AbortSignal.timeout(10000)});
      payload = await response.json();
    } catch { fail(503, 'تعذر الاتصال بقاعدة البيانات. أعد المحاولة بعد قليل.'); }
    if (!response.ok || payload.error) fail(503, 'تعذر الوصول لقاعدة البيانات. تحقق من رابط Redis ورمز الوصول.');
    return payload.result;
  }
  async function content() {
    const keys = pairs.map(([o,c]) => key(o,c));
    let values = await command(['MGET', ...keys]);
    if (!Array.isArray(values) || values.length !== pairs.length) fail(503, 'تعذر قراءة قوائم الأعمال.');
    // SET NX prevents redeployment or concurrent cold starts from replacing saved content.
    for (let i = 0; i < pairs.length; i++) if (values[i] === null) {
      const [o,c] = pairs[i]; await command(['SET', keys[i], JSON.stringify(seed[o][c]), 'NX']);
    }
    if (values.some(v => v === null)) values = await command(['MGET', ...keys]);
    const result = {kaido:{},nova:{}};
    pairs.forEach(([o,c], i) => {
      let list; try { list = JSON.parse(values[i]); } catch { fail(503, 'بيانات القائمة غير صالحة. راجع قاعدة البيانات.'); }
      if (!Array.isArray(list) || list.length > 500 || !list.every(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id))) fail(503, 'بيانات القائمة غير صالحة.');
      result[o][c] = list;
    });
    return result;
  }
  const sessionKey = token => `${prefix()}:session:${digest(token)}`;
  function cookieToken(req) {
    const match = String(req.headers.cookie || '').match(/(?:^|;\s*)__Host-kaido_session=([a-f0-9]{64})(?:;|$)/);
    return match ? match[1] : null;
  }
  function cookie(res, token, maxAge) {
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`);
  }
  async function session(req) {
    const token = cookieToken(req); if (!token) return null;
    const raw = await command(['GET',sessionKey(token)]); if (!raw) return null;
    let data; try { data = JSON.parse(raw); } catch { return null; }
    // Changing any admin secret revokes all existing sessions.
    if (!equal(data.version || '', authVersion())) return null;
    return {token, ...data};
  }
  const authVersion = () => digest(JSON.stringify([env.KAIDO_PASSWORD,env.NOVA_PASSWORD,env.ADMIN_TOOL_CODE]));
  async function newSession(res, username, verified, oldToken) {
    const token = random(); const csrf = verified ? random() : null;
    const ttl = verified ? SESSION_SECONDS : 300;
    await command(['SET',sessionKey(token),JSON.stringify({username,verified,csrf,version:authVersion()}),'EX',ttl]);
    if (oldToken) await command(['DEL',sessionKey(oldToken)]);
    cookie(res,token,ttl); return {csrf};
  }
  async function rate(bucket, identity, max) {
    const n = await command(['EVAL',rateScript,1,`${prefix()}:rate:${bucket}:${digest(identity)}`,900]);
    if (Number(n) > max) fail(429, 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجددًا.');
  }
  function verifyOrigin(req) {
    const origin = req.headers.origin;
    const expected = env.SITE_ORIGIN;
    if (!expected) fail(503, 'أضف SITE_ORIGIN في Vercel بقيمة رابط موقعك بدون #kaido ثم أعد النشر.');
    let canonical; try { canonical = new URL(expected).origin; } catch { fail(503, 'إعداد SITE_ORIGIN غير صحيح.'); }
    if (origin !== canonical) fail(403, 'طلب غير مسموح. افتح الموقع من رابط SITE_ORIGIN المحدد.');
    if (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin') fail(403, 'طلب غير مسموح.');
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) fail(415, 'نوع الطلب غير مدعوم.');
  }
  function requestBody(req) {
    let body = req.body;
    if (Buffer.isBuffer(body)) body = body.toString('utf8');
    if (typeof body === 'string') { if (body.length > 4096) fail(413,'الطلب أكبر من المسموح.'); try { body = JSON.parse(body); } catch { fail(400,'بيانات غير صالحة.'); } }
    if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 4096) fail(400,'بيانات غير صالحة.');
    return body;
  }
  return async function handle(action, req, res) {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options','nosniff');
    const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    try {
      const methods = {content:['GET','POST'],session:['GET'],login:['POST'],verify:['POST'],logout:['POST']};
      if (!Object.hasOwn(methods,action)) fail(404,'المسار غير موجود.');
      if (!methods[action].includes(req.method)) { res.setHeader('Allow',methods[action].join(', ')); fail(405,'طريقة الطلب غير مسموحة.'); }
      configuration(env);
      if (req.method === 'GET' && action === 'content') return send(200,await content());
      authConfiguration(env);
      if (req.method === 'GET') {
        const s = await session(req);
        return send(200,s?.verified ? {csrf:s.csrf,username:s.username} : {csrf:null,pending:!!s});
      }
      verifyOrigin(req); const body = requestBody(req);
      // Vercel overwrites x-real-ip. Never trust client-supplied x-forwarded-for.
      const ip = String(req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown');
      if (action === 'login') {
        await rate('login-ip',ip,30);
        const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
        await rate('login-account',['kaido','nova'].includes(username) ? username : 'unknown',30);
        const password = username === 'kaido' ? env.KAIDO_PASSWORD : username === 'nova' ? env.NOVA_PASSWORD : random();
        if (typeof body.password !== 'string' || body.password.length > 256 || !equal(body.password,password)) fail(401,'اسم المستخدم أو كلمة المرور غير صحيحة.');
        await newSession(res,username,false,cookieToken(req)); return send(200,{ok:true,pending:true});
      }
      const s = await session(req);
      if (!s) fail(401,'انتهت الجلسة. أغلق لوحة الإدارة وافتحها وسجّل الدخول مجددًا.');
      if (action === 'verify') {
        if (s.verified) return send(200,{csrf:s.csrf});
        await rate('verify-ip',ip,20); await rate('verify-session',s.token,8);
        if (typeof body.code !== 'string' || body.code.length > 256 || !equal(body.code,env.ADMIN_TOOL_CODE)) fail(401,'رمز التوول غير صحيح.');
        return send(200,await newSession(res,s.username,true,s.token));
      }
      if (!s.verified) fail(403,'أكمل التحقق برمز التوول أولًا.');
      if (typeof req.headers['x-csrf-token'] !== 'string' || !equal(req.headers['x-csrf-token'],s.csrf)) fail(403,'رمز حماية الجلسة غير صحيح. أغلق اللوحة وافتحها مجددًا.');
      if (action === 'logout') { await command(['DEL',sessionKey(s.token)]); cookie(res,'',0); return send(200,{ok:true}); }
      const {owner,category,action:change} = body;
      if (!pairs.some(([o,c]) => o === owner && c === category) || !['add','delete'].includes(change)) fail(400,'الفنان أو القسم أو العملية غير صالحة.');
      const id = videoId(body.url);
      await rate('writes',s.username,150);
      await content();
      const updated = await command(['EVAL',mutateScript,1,key(owner,category),change,id]);
      if (Number(updated) === -1) fail(400,'وصلت القائمة إلى الحد الأقصى (500 فيديو).');
      return send(200,await content());
    } catch (error) { return send(error.status || 500,{error:error.status ? error.message : 'حدث خطأ داخلي. راجع سجلات الخادم.'}); }
  };
}
module.exports = {createBackend,videoId,mutateScript,rateScript};
