import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAdminService } from '../server/admin.mjs';
import { createAIHandler } from '../server/ai.mjs';
import { defaultSite, validateSite } from '../packages/domain/site.ts';
import { validateBackup, withoutLearner, withoutLesson } from '../packages/domain/admin.ts';
import { seedWorkspace, dateLabel } from '../packages/domain/index.ts';
import { defaultAccess } from '../packages/domain/games.ts';
import { latinDigits, latinizeContent } from '../packages/domain/numbers.ts';
import { deckFromLesson } from '../packages/domain/presentations.ts';
import { buildPowerPoint } from '../packages/presentation/export.ts';
import JSZip from 'jszip';

const credentials={username:'test_admin',name:'مدير ٢',password:'test-only-password-123'};
async function fixture(t,corrupt=false){
  const dir=mkdtempSync(join(tmpdir(),'tarbya-admin-test-'));const file=join(dir,'admin.json');if(corrupt)writeFileSync(file,'{bad');
  let clock=Date.now();const service=createAdminService({file,now:()=>clock});
  const ai=createAIHandler({getSite:service.getSite,apiKey:'test-only',fetcher:()=>{throw new Error('No upstream allowed');}});
  const server=createServer((req,res)=>service.handler(req,res,()=>ai(req,res,()=>{res.writeHead(404);res.end();})));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}`;
  const req=async(path,body,cookie='',headers={})=>{const r=await fetch(base+path,{headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{cookie}:{}),...headers},...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],cookieHeader:r.headers.get('set-cookie')};};
  return {req,file,service,advance:ms=>{clock+=ms;}};
}
test('admin requires server authentication, stores hashes, rejects cross-origin and expires sessions',async t=>{
  const f=await fixture(t);assert.equal((await f.req('/api/admin/state')).status,401);
  assert.equal((await f.req('/api/admin/settings',defaultSite)).status,401);
  assert.equal((await f.req('/api/admin/session')).body.setupRequired,true);
  assert.equal((await f.req('/api/admin/setup',credentials,'',{Origin:'https://other.example'})).status,403);
  const setup=await f.req('/api/admin/setup',credentials);assert.equal(setup.status,201);assert.match(setup.cookieHeader,/HttpOnly; SameSite=Strict/);
  assert.equal(setup.body.user.name,'مدير 2');
  const stored=readFileSync(f.file,'utf8');assert.ok(!stored.includes(credentials.password));assert.equal(JSON.parse(stored).users[0].hash.length,128);
  assert.equal((await f.req('/api/admin/setup',credentials)).status,409);
  const state=await f.req('/api/admin/state',undefined,setup.cookie);assert.equal(state.status,200);assert.ok(!JSON.stringify(state.body).includes('"hash"'));
  f.advance(8*3600000+1);assert.equal((await f.req('/api/admin/state',undefined,setup.cookie)).status,401);
});
test('saved settings persist, reject stale writes, normalize digits, and disable AI on the server',async t=>{
  const f=await fixture(t);const {cookie}=await f.req('/api/admin/setup',credentials);
  const changed={...structuredClone(defaultSite),brandName:'منصة ١٢',aiEnabled:false,modules:{...defaultSite.modules,games:false}};
  assert.equal((await f.req('/api/admin/settings',changed,cookie,{Origin:'https://other.example'})).status,403);
  const saved=await f.req('/api/admin/settings',changed,cookie);assert.equal(saved.status,200);assert.equal(saved.body.site.revision,1);assert.equal(saved.body.site.brandName,'منصة 12');
  assert.equal((await f.req('/api/admin/settings',changed,cookie)).status,409);
  assert.equal((await f.req('/api/site')).body.site.modules.games,false);
  assert.equal(createAdminService({file:f.file}).getSite().aiEnabled,false);
  assert.equal((await f.req('/api/author/status')).body.ready,false);
  assert.equal((await f.req('/api/author/generate',{})).status,403);
  assert.equal((await f.req('/api/admin/settings',{...saved.body.site,primaryColor:'#ffffff'},cookie)).status,400);
});
test('account disabling and password changes revoke sessions; final account cannot disable itself',async t=>{
  const f=await fixture(t);const first=await f.req('/api/admin/setup',credentials);
  assert.equal((await f.req('/api/admin/users/toggle',{id:first.body.user.id},first.cookie)).status,400);
  const secondCredentials={...credentials,username:'other_admin'};const created=await f.req('/api/admin/users/create',secondCredentials,first.cookie);assert.equal(created.status,201);
  const second=await f.req('/api/admin/login',secondCredentials);assert.equal(second.status,200);
  assert.equal((await f.req('/api/admin/users/toggle',{id:created.body.user.id},first.cookie)).status,200);
  assert.equal((await f.req('/api/admin/state',undefined,second.cookie)).status,401);
  assert.equal((await f.req('/api/admin/login',secondCredentials)).status,401);
  const changed=await f.req('/api/admin/password',{current:credentials.password,password:'a-new-test-password-123'},first.cookie);assert.equal(changed.status,200);
  assert.equal((await f.req('/api/admin/state',undefined,first.cookie)).status,401);
  assert.equal((await f.req('/api/admin/state',undefined,changed.cookie)).status,200);
  assert.equal((await f.req('/api/admin/logout',{},changed.cookie)).status,200);
  assert.equal((await f.req('/api/admin/state',undefined,changed.cookie)).status,401);
});
test('failed logins are rate limited and corrupt server storage fails closed',async t=>{
  const f=await fixture(t);await f.req('/api/admin/setup',credentials);
  for(let i=0;i<5;i++)assert.equal((await f.req('/api/admin/login',{...credentials,password:'incorrect'})).status,401);
  assert.equal((await f.req('/api/admin/login',credentials)).status,429);
  f.advance(15*60000+1);assert.equal((await f.req('/api/admin/login',credentials)).status,200);
  const bad=await fixture(t,true);assert.equal((await bad.req('/api/admin/setup',credentials)).status,503);assert.equal(readFileSync(bad.file,'utf8'),'{bad');assert.equal(bad.service.getSite().aiEnabled,false);
});
test('backup validation and deletion preserve unrelated records and remove linked references',()=>{
  const w=seedWorkspace();w.practiceSessions=[{id:'p1',learnerId:'demo-1',gameId:'match',date:new Date().toISOString(),access:defaultAccess,attempts:[{roundId:'x',selected:'a',correct:true,hintUsed:false}]}];
  w.observations=[{id:'o1',lessonId:'animals',learnerId:'demo-1',goalId:'g1',date:new Date().toISOString(),correct:1,total:1,independent:1,support:'independent',note:''}];
  assert.deepEqual(validateBackup(w),w);const bad=structuredClone(w);bad.learners[0].goals=null;assert.throws(()=>validateBackup(bad));
  const bad2=structuredClone(w);bad2.practiceSessions[0].attempts=[{}];assert.throws(()=>validateBackup(bad2));
  const next=withoutLearner(w,'demo-1');assert.equal(next.learners.length,w.learners.length-1);assert.equal(next.observations.length,0);assert.equal(next.practiceSessions.length,0);
  assert.equal(next.lessons.find(l=>l.id==='animals').status,'draft');assert.ok(next.lessons.every(l=>!l.learnerIds.includes('demo-1')&&!l.goalIds.includes('g1')));assert.equal(w.learners.length,seedWorkspace().learners.length);
  const removed=withoutLesson(w,'animals');assert.equal(removed.lessons.length,3);assert.equal(removed.observations.length,0);assert.equal(removed.learners.length,w.learners.length);
  assert.throws(()=>validateSite({...defaultSite,aiRequestLimit:0}));
});
test('English digits cover saved content, dates and exported PowerPoint without changing IDs',async()=>{
  assert.equal(latinDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹'),'0123456789 0123456789');
  assert.deepEqual(latinizeContent({id:'ref-١',title:'درس ١٢',learnerIds:['طالب١']}),{id:'ref-١',title:'درس 12',learnerIds:['طالب١']});
  assert.ok(!/[٠-٩۰-۹]/.test(dateLabel('2026-10-31')));
  const deck=deckFromLesson({...seedWorkspace().lessons[0],title:'الأعداد ١٢٣'});deck.reviewed=true;deck.slides[0].body='عدد ۴۵۶';
  const zip=await JSZip.loadAsync(await buildPowerPoint(deck).write({outputType:'uint8array'}));
  const slides=(await Promise.all(Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p)).map(p=>zip.file(p).async('string')))).join('');
  assert.ok(slides.includes('123'));assert.ok(slides.includes('456'));assert.ok(!/[٠-٩۰-۹]/.test(slides));
});

test('teacher self sign-up is open by default, follows the saved switch, and rejects a non-boolean', async () => {
  const { defaultSite, validateSite } = await import('../packages/domain/site.ts');
  assert.equal(defaultSite.teacherSignup, true);
  const saved = structuredClone(defaultSite); delete saved.teacherSignup;
  assert.equal(validateSite(saved).teacherSignup, true, 'settings saved before the switch keep the default');
  assert.equal(validateSite({ ...structuredClone(defaultSite), teacherSignup: false }).teacherSignup, false);
  assert.throws(() => validateSite({ ...structuredClone(defaultSite), teacherSignup: 'yes' }));
});
