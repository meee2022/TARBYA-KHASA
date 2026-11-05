import { assertWorkspace, type Workspace } from './index.ts';
import { latinizeContent } from './numbers.ts';
import type { Iep, WeeklyPlan } from './planning.ts';

const strings=(v:unknown)=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const textFields=(v:unknown,fields:string[])=>!!v&&typeof v==='object'&&fields.every(k=>typeof (v as Record<string,unknown>)[k]==='string');
export function validateBackup(input:unknown):Workspace {
  // Imports are a new trust boundary; the older store shape check alone is insufficient.
  try {
    if(!assertWorkspace(input))throw new Error();
    const w=input;
    if(w.lessons.length>5000||w.learners.length>5000||w.observations.length>100000)throw new Error();
    if(new Set(w.lessons.map(l=>l.id)).size!==w.lessons.length||new Set(w.learners.map(l=>l.id)).size!==w.learners.length)throw new Error();
    for(const s of w.learners){
      if(!textFields(s,['id','name','grade','initials','color','strengths','needs'])||!s.id||!Array.isArray(s.goals))throw new Error();
      const p=s.preferences;
      if(!p||!['largeText','highContrast','sound','reducedMotion'].every(k=>typeof p[k as keyof typeof p]==='boolean')||![1,2,3,4].includes(p.choices)||!['touch','point'].includes(p.response))throw new Error();
      if(p.access&&!validAccess(p.access))throw new Error();
      for(const g of s.goals)if(!textFields(g,['id','text','subject','baseline'])||!Number.isFinite(g.target)||!Number.isFinite(g.opportunities))throw new Error();
    }
    for(const l of w.lessons){
      if(!textFields(l,['id','title','subject','grade','objective','warmup','teaching','practice','closing','adaptations','source','sourceText','language','reviewNote','updatedAt'])||!l.id||!Number.isFinite(l.duration)||!['draft','review','approved'].includes(l.status)||!['ar','en'].includes(l.language)||!strings(l.learnerIds)||!strings(l.goalIds))throw new Error();
      for(const q of l.questions)if(!textFields(q,['id','prompt'])||!strings(q.options)||q.options.length<2||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)throw new Error();
    }
    for(const o of w.observations)if(!textFields(o,['id','lessonId','learnerId','goalId','date','support','note'])||![o.correct,o.total,o.independent].every(Number.isFinite)||!['independent','visual','gesture','verbal','model','partial','physical','not-observed'].includes(o.support))throw new Error();
    if(w.practiceSessions!==undefined){if(!Array.isArray(w.practiceSessions))throw new Error();for(const p of w.practiceSessions)if(!textFields(p,['id','gameId','learnerId','date'])||!Array.isArray(p.attempts)||(p.access!==undefined&&(!p.access||typeof p.access!=='object'))||!p.attempts.every(a=>textFields(a,['roundId','selected'])&&typeof a.correct==='boolean'&&typeof a.hintUsed==='boolean'))throw new Error();}
    if(w.packs!==undefined&&(!Array.isArray(w.packs)||!w.packs.every(p=>textFields(p,['id','title','subject','language'])&&Array.isArray(p.items)&&p.items.every(i=>textFields(i,['id','text'])))))throw new Error();
    if(w.plans!==undefined&&(!Array.isArray(w.plans)||!w.plans.every(validPlan)))throw new Error();
    if(w.ieps!==undefined&&(!Array.isArray(w.ieps)||!w.ieps.every(validIep)))throw new Error();
    return latinizeContent(structuredClone(w));
  }catch{throw new Error('الملف لا يحتوي على نسخة سليمة من مساحة العمل. لم تتغيّر بياناتك.');}
}
const rows=(v:unknown,fields:string[])=>Array.isArray(v)&&v.every(x=>textFields(x,fields));
function validPlan(p:WeeklyPlan){return textFields(p,['id','title','subject','field','year','weekStart','weekEnd','supportLevel','shortGoals','individual','skillGoal','reflection'])&&Number.isFinite(p.sessionLength)&&strings(p.learnerIds)&&strings(p.goalIds)&&Array.isArray(p.sessions)&&p.sessions.length>0&&p.sessions.every(s=>textFields(s,['id','date','objective'])&&(['warmup','content','closing'] as const).every(k=>textFields(s[k],['teacher','student','arrangements','assessment'])&&Number.isFinite(s[k].minutes)))&&rows(p.paths,['learnerId','text'])&&rows(p.bagLinks,['title','url'])&&rows(p.bagItems,['text']);}
function validIep(p:Iep){return textFields(p,['learnerId','year','school','schoolType','birthDate','age','curriculum','disability','supportLevel','summary','nextReview'])&&!!p.services&&typeof p.services==='object'&&!!p.performance&&typeof p.performance==='object'&&Object.values(p.performance).every(r=>rows(r,['strength','need']))&&Array.isArray(p.goals)&&p.goals.every(g=>textFields(g,['id','subject','unit','text','start','end'])&&rows(g.shorts,['id','text','strategy','arrangements','assessment','start','end']))&&strings(p.classroom)&&strings(p.assessmentAcc)&&strings(p.curriculumAcc)&&rows(p.tech,['tool','purpose'])&&rows(p.team,['name','role'])&&Array.isArray(p.reviews)&&p.reviews.every(r=>textFields(r,['id','date','notes'])&&strings(r.reasons)&&strings(r.parties));}
function validAccess(value:unknown){if(!value||typeof value!=='object')return false;const a=value as Record<string,unknown>;return ['large','contrast','textAlternative','speech','scan'].every(k=>typeof a[k]==='boolean')&&[1,2,3,4].includes(a.choices as number)&&typeof a.scanSeconds==='number'&&Number.isFinite(a.scanSeconds)&&a.scanSeconds>=1&&a.scanSeconds<=30;}
export function withoutLesson(w:Workspace,id:string):Workspace{return {...w,lessons:w.lessons.filter(l=>l.id!==id),observations:w.observations.filter(o=>o.lessonId!==id)};}
export function withoutLearner(w:Workspace,id:string):Workspace {
  const goals=new Set(w.learners.find(l=>l.id===id)?.goals.map(g=>g.id)??[]);
  return {...w,learners:w.learners.filter(l=>l.id!==id),observations:w.observations.filter(o=>o.learnerId!==id),practiceSessions:w.practiceSessions?.filter(p=>p.learnerId!==id),ieps:w.ieps?.filter(p=>p.learnerId!==id),plans:w.plans?.map(p=>({...p,learnerIds:p.learnerIds.filter(i=>i!==id),goalIds:p.goalIds.filter(g=>!goals.has(g)),paths:p.paths.filter(x=>x.learnerId!==id)})),lessons:w.lessons.map(l=>l.learnerIds.includes(id)||l.goalIds.some(g=>goals.has(g))?{...l,learnerIds:l.learnerIds.filter(i=>i!==id),goalIds:l.goalIds.filter(g=>!goals.has(g)),status:'draft',updatedAt:new Date().toISOString()}:l)};
}
