import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { seedWorkspace } from '../packages/domain/index.ts';
import { deckFromLesson, deckFromAI, splitSlideText, validateDeck, parsePlan, isDeck } from '../packages/domain/presentations.ts';
import { buildPowerPoint, safeDeckFilename } from '../packages/presentation/export.ts';
import { generateContent, validateRequest, createAIHandler } from '../server/ai.mjs';
import { createServer } from 'node:http';

const lesson = seedWorkspace().lessons[0];
const request = { task:'presentation', title:'الحيوانات', subject:'العلوم', grade:'الأول', language:'ar', sourceText:'السمكة تعيش في الماء. الطائر له جناحان ومنقار. هذه أمثلة من الدرس.', objective:'يميّز الطالب السمكة من الطائر.', instructions:'خطوة واحدة', slideCount:6, choices:2 };
test('template creation cannot produce an unreadable oversized saved deck', () => {
  assert.throws(()=>deckFromLesson({...lesson,sourceText:'كلمة '.repeat(4000)}),/المصدر طويل/);
  assert.throws(()=>deckFromLesson({...lesson,questions:Array.from({length:81},()=>lesson.questions[0])}),/80/);
  for(const l of seedWorkspace().lessons) assert.ok(isDeck(deckFromLesson(l)));
});
test('template preserves source text and keeps preparation and correct answers in teacher notes', async () => {
  const source = Array.from({length:180},(_,i)=>`كلمة${i}`).join(' ');
  const pages=splitSlideText(source);
  assert.equal(pages.join(' '),source); assert.ok(pages.every(p=>p.length<=240));
  const d=deckFromLesson({...lesson, language:'ar', sourceText:'تعيش السمكة في الماء.', warmup:'تعليمات خاصة بالمعلم'});d.reviewed=true;
  assert.ok(!d.slides.some(s=>s.body.includes('تعليمات خاصة بالمعلم')));
  const bytes=await buildPowerPoint(d).write({outputType:'uint8array'});
  const zip=await JSZip.loadAsync(bytes); const slideFiles=Object.keys(zip.files).filter(p=>/^ppt\/slides\/slide\d+\.xml$/.test(p));
  assert.equal(slideFiles.length,d.slides.length);
  const slides=(await Promise.all(slideFiles.map(p=>zip.file(p).async('string')))).join('');
  assert.ok(!slides.includes('تعليمات خاصة بالمعلم'));
  assert.ok(slides.includes('rtl="1"'));
  const notes=(await Promise.all(Object.keys(zip.files).filter(p=>/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(p)).map(p=>zip.file(p).async('string')))).join('');
  assert.ok(notes.includes('تعليمات خاصة بالمعلم')); assert.ok(notes.includes('الإجابة الصحيحة'));
});
test('export blocks unreviewed, crowded, and invalid-answer slides', () => {
  const d=deckFromLesson(lesson);assert.throws(()=>buildPowerPoint(d),/راجع/);
  d.reviewed=true;d.slides[0].body='أ'.repeat(301);assert.ok(validateDeck(d).length);
  d.slides[0].body='';d.slides.push({id:'x',kind:'choice',title:'سؤال',body:'',options:['أ','ب'],answer:8,notes:''});assert.ok(validateDeck(d).length);
  assert.equal(safeDeckFilename('عالم / الحيوانات:؟'), 'عالم  الحيوانات؟.pptx');
});
test('provider response is validated and unknown request fields are never sent', async () => {
  let body;
  const clean=validateRequest({...request,learners:[{name:'PRIVATE_NAME'}], apiKey:'PRIVATE_KEY'});
  assert.ok(!('learners' in clean));
  const result=await generateContent({...request, learners:['PRIVATE_NAME']},{apiKey:'test-only',fetcher:async (_url,options)=>{ body=JSON.parse(options.body); return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({slides:Array.from({length:6},()=>({kind:'concept',title:'سمكة',body:'تعيش في الماء.',options:[],answer:null,notes:'ناقش المثال.'}))})}]})); }});
  assert.equal(result.origin,'ai');assert.equal(result.reviewed,false);assert.ok(!JSON.stringify(body).includes('PRIVATE_NAME'));
  await assert.rejects(generateContent(request,{apiKey:'',fetcher:()=>{throw new Error('must not call');}}),/غير مفعّل/);
  await assert.rejects(generateContent(request,{apiKey:'test-only',fetcher:async()=>new Response(JSON.stringify({content:[{type:'text',text:'not json'}]}))}),/تعذّر قراءة/);
  assert.throws(()=>deckFromAI({slides:[]},request)); assert.throws(()=>parsePlan({}));
});
test('local API rejects cross-origin and malformed requests and reports disabled configuration', async t => {
  const handler=createAIHandler({apiKey:''});const server=createServer((req,res)=>handler(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await (await fetch(base+'/api/author/status')).json()).ready,false);
  assert.equal((await fetch(base+'/api/author/generate',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://untrusted.example'},body:JSON.stringify(request)})).status,403);
  assert.equal((await fetch(base+'/api/author/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  const disabled=await fetch(base+'/api/author/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});assert.equal(disabled.status,503);
});
