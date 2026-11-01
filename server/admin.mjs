import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { defaultSite, validateSite } from '../packages/domain/site.ts';
import { latinDigits, latinizeContent } from '../packages/domain/numbers.ts';

const COOKIE='tarbya_admin';
// Shared pack media. Allowlist with magic-byte checks: a declared type or extension proves nothing.
const MEDIA_TYPES={'image/jpeg':['jpg',b=>b[0]===0xff&&b[1]===0xd8&&b[2]===0xff],'image/png':['png',b=>b.subarray(0,4).toString('hex')==='89504e47'],'audio/webm':['webm',b=>b.subarray(0,4).toString('hex')==='1a45dfa3'],'video/webm':['webm',b=>b.subarray(0,4).toString('hex')==='1a45dfa3'],'audio/mp4':['m4a',b=>b.subarray(4,8).toString()==='ftyp'],'video/mp4':['mp4',b=>b.subarray(4,8).toString()==='ftyp'],'audio/ogg':['ogg',b=>b.subarray(0,4).toString()==='OggS'],'audio/mpeg':['mp3',b=>b.subarray(0,3).toString()==='ID3'||b[0]===0xff]};
const MEDIA_LIMIT=30*1024*1024;
const hashPassword=(password,salt=randomBytes(16).toString('hex'))=>({salt,hash:scryptSync(password,salt,64).toString('hex')});
const verify=(password,user)=>timingSafeEqual(scryptSync(password,user.salt,64),Buffer.from(user.hash,'hex'));
const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export function createAdminService({file=resolve('.local-data/admin.json'),now=()=>Date.now()}={}) {
  let state={version:1,site:structuredClone(defaultSite),users:[],audit:[]};let loadError=false;
  try { if(existsSync(file)){state=JSON.parse(readFileSync(file,'utf8')); state.site=validateSite(state.site); if(state.version!==1||!Array.isArray(state.users)||!Array.isArray(state.audit)||!state.users.every(u=>u&&typeof u.id==='string'&&typeof u.username==='string'&&typeof u.name==='string'&&typeof u.active==='boolean'&&/^[a-f\d]{128}$/i.test(u.hash)&&/^[a-f\d]{32}$/i.test(u.salt)))throw new Error();} }catch{loadError=true;}
  const sessions=new Map();const attempts=new Map();const mediaDir=resolve(dirname(file),'media');
  const save=next=>{mkdirSync(dirname(file),{recursive:true});const temp=file+'.tmp';writeFileSync(temp,JSON.stringify(next,null,2),{mode:0o600});renameSync(temp,file);state=next;};
  const audit=(next,actor,action)=>({...next,audit:[{id:randomBytes(8).toString('hex'),actor,action,date:new Date(now()).toISOString()},...next.audit].slice(0,300)});
  const getSession=req=>{const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);const session=token&&sessions.get(tokenHash(token));if(!session||session.expires<now())return null;const user=state.users.find(u=>u.id===session.userId&&u.active);return user?{user,token}:null;};
  const publicUser=u=>({id:u.id,username:u.username,name:latinDigits(u.name),active:u.active});
  const credentials=(body)=>{if(!body||typeof body.username!=='string'||!/^[a-zA-Z0-9_.-]{3,40}$/.test(body.username)||typeof body.password!=='string'||body.password.length<12||body.password.length>128||typeof body.name!=='string'||!body.name.trim()||body.name.length>80)throw new Error('اكتب اسم دخول إنجليزيًا من 3 إلى 40 حرفًا، واسمًا ظاهرًا، وكلمة مرور من 12 إلى 128 حرفًا.');return {username:body.username.toLowerCase(),name:body.name.trim(),password:body.password};};
  const login=(user,res)=>{for(const [k,s] of sessions)if(s.expires<now())sessions.delete(k);const token=randomBytes(32).toString('hex');sessions.set(tokenHash(token),{userId:user.id,expires:now()+8*3600000});res.setHeader('Set-Cookie',`${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);};
  const handler=async(req,res,next)=>{
    const path=req.url?.split('?')[0];if(!path?.startsWith('/api/admin/')&&!path?.startsWith('/api/media/')&&path!=='/api/site')return next?.();
    const send=(status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));};
    const host=req.headers.host||'';if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))return send(403,{error:'خدمة الإدارة المحلية متاحة على هذا الجهاز فقط.'});
    if(req.headers.origin&&!['http://'+host,'https://'+host].includes(req.headers.origin))return send(403,{error:'مصدر الطلب غير مسموح.'});
    if(loadError)return send(503,{error:'تعذّر قراءة ملف الإدارة. أوقفنا التعديل لحماية البيانات؛ استعد نسخة الخادم.'});
    if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(403,{error:'خدمة الإدارة متاحة على الجهاز المحلي فقط.'});
    let session=getSession(req);
    if(path==='/api/site'&&req.method==='GET')return send(200,{site:state.site});
    if(path.startsWith('/api/media/')&&req.method==='GET'){
      const id=path.slice(11);if(!/^[a-f\d]{32}$/.test(id))return send(404,{error:'غير موجود.'});
      const name=existsSync(mediaDir)&&readdirSync(mediaDir).find(f=>f.startsWith(id+'.'));if(!name)return send(404,{error:'غير موجود.'});
      const type=Object.entries(MEDIA_TYPES).find(([t,[ext]])=>name.endsWith('.'+ext)&&(!name.endsWith('.webm')||t==='video/webm'))?.[0];
      // ponytail: no Range support, so Safari may refuse long videos; add it if shared sign videos reach iPads.
      try { const file=readFileSync(resolve(mediaDir,name));res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'private, max-age=86400'});return res.end(file); }
      catch { return send(404,{error:'غير موجود.'}); }
    }
    if(path==='/api/admin/media'&&req.method==='POST'){
      if(!session)return send(401,{error:'انتهت جلسة الإدارة. سجّل الدخول مجددًا.'});
      const kind=MEDIA_TYPES[(req.headers['content-type']||'').split(';')[0].trim()];if(!kind)return send(415,{error:'نوع الملف غير مسموح.'});
      try {
        const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>MEDIA_LIMIT)return send(413,{error:'الملف أكبر من 30 ميجابايت.'});chunks.push(chunk);}
        const buffer=Buffer.concat(chunks);if(buffer.length<12||!kind[1](buffer))return send(415,{error:'محتوى الملف لا يطابق نوعه.'});
        const id=randomBytes(16).toString('hex');mkdirSync(mediaDir,{recursive:true});writeFileSync(resolve(mediaDir,`${id}.${kind[0]}`),buffer,{mode:0o600});save(audit(state,session.user.username,'رفع وسائط إلى الحزم المشتركة'));
        return send(201,{url:'/api/media/'+id});
      } catch { if(!res.destroyed)send(500,{error:'تعذّر حفظ الملف على الخادم.'});return; }
    }
    if(path==='/api/admin/session'&&req.method==='GET')return send(200,{setupRequired:state.users.length===0,user:session?publicUser(session.user):null});
    if(path==='/api/admin/state'&&req.method==='GET'){if(!session)return send(401,{error:'سجّل الدخول إلى الإدارة.'});return send(200,{site:state.site,users:state.users.map(publicUser),audit:state.audit,aiConfigured:Boolean(process.env.ANTHROPIC_API_KEY)});}
    if(req.method!=='POST')return send(405,{error:'طريقة الطلب غير مسموحة.'});
    if(!['/api/admin/setup','/api/admin/login'].includes(path)&&!session)return send(401,{error:'انتهت جلسة الإدارة. سجّل الدخول مجددًا.'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'يلزم طلب JSON.'});
    try {
      const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>2097152)return send(413,{error:'حجم الطلب أكبر من المسموح.'});chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'طلب غير صالح.'});}
      if(!body||typeof body!=='object'||Array.isArray(body))return send(400,{error:'طلب غير صالح.'});
      if(!['/api/admin/setup','/api/admin/login'].includes(path)){session=getSession(req);if(!session)return send(401,{error:'انتهت جلسة الإدارة. سجّل الدخول مجددًا.'});}
      if(path==='/api/admin/setup'){
        if(state.users.length)return send(409,{error:'تم إعداد الإدارة بالفعل. استخدم تسجيل الدخول.'});
        const c=credentials(body);const user={id:randomBytes(16).toString('hex'),username:c.username,name:c.name,...hashPassword(c.password),active:true};save(audit({...state,users:[user]},c.username,'إنشاء حساب الإدارة الأول'));login(user,res);return send(201,{user:publicUser(user)});
      }
      if(path==='/api/admin/login'){
        const ip=req.socket.remoteAddress||'local';let list=(attempts.get(ip)||[]).filter(t=>t>now()-15*60000);if(list.length>=5)return send(429,{error:'محاولات كثيرة. حاول بعد 15 دقيقة.'});list.push(now());attempts.set(ip,list);
        if(typeof body.username!=='string'||typeof body.password!=='string'||body.password.length>128)return send(401,{error:'بيانات الدخول غير صحيحة.'});
        const user=state.users.find(u=>u.username===body.username.toLowerCase()&&u.active);if(!user||!verify(body.password,user))return send(401,{error:'بيانات الدخول غير صحيحة.'});
        attempts.delete(ip);save(audit(state,user.username,'تسجيل الدخول'));login(user,res);return send(200,{user:publicUser(user)});
      }
      const actor=session.user.username;
      if(path==='/api/admin/logout'){sessions.delete(tokenHash(session.token));res.setHeader('Set-Cookie',`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);return send(200,{ok:true});}
      if(path==='/api/admin/settings'){
        const site=latinizeContent(validateSite(body));if(site.revision!==state.site.revision)return send(409,{error:'تغيّرت الإعدادات من جلسة أخرى. أعد تحميلها قبل الحفظ.'});site.revision++;save(audit({...state,site},actor,'تحديث إعدادات المنصة'));return send(200,{site});
      }
      if(path==='/api/admin/users/create'){
        const c=credentials(body);if(state.users.length>=20||state.users.some(u=>u.username===c.username))return send(409,{error:'اسم الدخول مستخدم أو وصل عدد الحسابات إلى الحد.'});const user={id:randomBytes(16).toString('hex'),username:c.username,name:c.name,...hashPassword(c.password),active:true};save(audit({...state,users:[...state.users,user]},actor,'إضافة مدير: '+c.username));return send(201,{user:publicUser(user)});
      }
      if(path==='/api/admin/users/toggle'){
        const user=state.users.find(u=>u.id===body.id);if(!user)return send(404,{error:'الحساب غير موجود.'});if(user.id===session.user.id)return send(400,{error:'لا يمكنك إيقاف حساب جلستك الحالية.'});const users=state.users.map(u=>u.id===user.id?{...u,active:!u.active}:u);if(!users.some(u=>u.active))return send(400,{error:'يجب بقاء مدير واحد نشط.'});save(audit({...state,users},actor,'تغيير حالة المدير: '+user.username));for(const[k,s]of sessions)if(s.userId===user.id)sessions.delete(k);return send(200,{ok:true});
      }
      if(path==='/api/admin/password'){
        if(typeof body.current!=='string'||body.current.length>128||!verify(body.current,session.user))return send(400,{error:'كلمة المرور الحالية غير صحيحة.'});if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)return send(400,{error:'استخدم كلمة مرور من 12 إلى 128 حرفًا.'});save(audit({...state,users:state.users.map(u=>u.id===session.user.id?{...u,...hashPassword(body.password)}:u)},actor,'تغيير كلمة مرور الإدارة'));for(const[k,s]of sessions)if(s.userId===session.user.id)sessions.delete(k);login(session.user,res);return send(200,{ok:true});
      }
      return send(404,{error:'الإجراء غير موجود.'});
    }catch(e){return send(400,{error:e.code?'تعذّر حفظ التغيير على الخادم. حاول مرة أخرى.':e.message||'تعذّر تنفيذ الإجراء.'});}
  };
  return {handler, getSite:()=>loadError?{...structuredClone(defaultSite),aiEnabled:false,maintenance:true}:structuredClone(state.site)};
}
