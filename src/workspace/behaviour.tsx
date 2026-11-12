import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardPen, Pause, Pencil, Play, Plus, Printer, ShieldCheck, Trash2 } from 'lucide-react';
import { countOf, dateLabel, uid, type BehaviourNote, type Learner } from '../../packages/domain';
import { behaviourCounts, type BehaviourPlan } from '../../packages/domain/desk';
import { today } from '../../packages/domain/planning';
import { confirmDialog } from './confirm';
import { Chip } from './fields';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { Avatar, Empty, PageHeading } from './Workspace';
import './desk.css';

const first = (l: Learner) => l.name.split(/\s·/)[0];
const inFourWeeks = () => new Date(Date.now() + 28 * 86400000).toLocaleDateString('en-CA');

/** A row of chips where several can be on, plus whatever the plan already holds that the list no longer offers. */
function Choices({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (next: string[]) => void }) {
  return <div className="seg" role="group" aria-label={label}><span className="seg-label">{label}</span><div className="option-chips">{[...new Set([...options, ...value])].map(o => <Chip key={o} on={value.includes(o)} label={o} onClick={() => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o])} />)}</div></div>;
}

/** Behaviour plans: one card per target behaviour, with how often it was noted over the last two weeks. The notes are the pupil's own behaviour notes, so nothing is recorded twice. */
export function BehaviourPage() {
  const { data, saveDesk, saveLearner, notify } = useWorkspace(); const { site } = useSiteConfig(); const { catalog } = site;
  const plans = data.desk?.behaviourPlans ?? []; const now = today();
  const blank = (): BehaviourPlan => ({ id: uid(), learnerId: data.learners[0]?.id ?? '', target: '', definition: '', baseline: '', goal: '', func: catalog.behaviourFunctions[catalog.behaviourFunctions.length - 1] ?? '', replacement: '', prevention: [], reinforcers: [], response: '', team: '', review: inFourWeeks(), active: true });
  const [draft, setDraft] = useState<BehaviourPlan | null>(null); const [noting, setNoting] = useState(''); const [note, setNote] = useState({ antecedent: '', consequence: '', setting: catalog.settings[0] ?? '' });
  const put = (change: Partial<BehaviourPlan>) => setDraft(d => d && { ...d, ...change });
  const store = (next: BehaviourPlan[]) => saveDesk({ behaviourPlans: next });
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft || !draft.target.trim() || !draft.learnerId) return; const p = { ...draft, target: draft.target.trim() }; store(plans.some(x => x.id === p.id) ? plans.map(x => x.id === p.id ? p : x) : [...plans, p]); setDraft(null); notify('حُفظت خطة السلوك'); };
  const addNote = (p: BehaviourPlan, learner: Learner) => {
    const entry: BehaviourNote = { id: uid(), date: now, antecedent: note.antecedent.trim(), behaviour: p.target, consequence: note.consequence.trim(), setting: note.setting, planId: p.id };
    saveLearner({ ...learner, behaviour: [...(learner.behaviour ?? []), entry] }); setNoting(''); setNote({ ...note, antecedent: '', consequence: '' }); notify('سُجّلت الملاحظة في ملف الطالب');
  };
  const ordered = [...plans].sort((a, b) => Number(b.active) - Number(a.active));
  return <>
    <PageHeading title="خطط تعديل السلوك" description="خطة لكل سلوك مستهدف: ما نراه ونعدّه، والسلوك البديل، وما يقي منه وما يعزّز. التكرار يُحسب من ملاحظات السلوك نفسها.">{data.learners.length > 0 && <button className="button primary" onClick={() => setDraft(blank())}><Plus size={17} />خطة جديدة</button>}<button className="button secondary no-print" onClick={() => window.print()}><Printer size={17} />طباعة</button></PageHeading>
    <p className="info-note behaviour-caution no-print"><ShieldCheck size={18} aria-hidden="true" />«الوظيفة المفترضة» فرضية تربوية من الملاحظة، تُراجَع مع الفريق والأسرة، وليست تشخيصًا. نصف الموقف لا الطالب.</p>
    {draft && <form className="panel desk-panel desk-form no-print" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{plans.some(p => p.id === draft.id) ? 'تعديل خطة السلوك' : 'خطة سلوك جديدة'}</h2></div>
      <div className="form-grid">
        <label>الطالب<select required value={draft.learnerId} onChange={e => put({ learnerId: e.target.value })}>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        <label>السلوك المستهدف<input required autoFocus maxLength={160} value={draft.target} onChange={e => put({ target: e.target.value })} placeholder="مثلًا: ترك المقعد أثناء الحصة" /></label>
        <label>خط الأساس<input maxLength={200} value={draft.baseline} onChange={e => put({ baseline: e.target.value })} placeholder="مثلًا: 6 مرات في اليوم" /></label>
        <label>هدف الخطة<input maxLength={200} value={draft.goal} onChange={e => put({ goal: e.target.value })} placeholder="مثلًا: مرتان أو أقل يوميًا خلال 4 أسابيع" /></label>
        <label>الوظيفة المفترضة<select value={draft.func} onChange={e => put({ func: e.target.value })}>{[...new Set([...catalog.behaviourFunctions, draft.func])].filter(Boolean).map(f => <option key={f}>{f}</option>)}</select></label>
        <label>موعد المراجعة<input type="date" value={draft.review} onChange={e => put({ review: e.target.value })} /></label>
      </div>
      <label>التعريف الإجرائي<small>ما نراه ونعدّه، بلا تفسير</small><textarea rows={2} maxLength={600} value={draft.definition} onChange={e => put({ definition: e.target.value })} placeholder="مثلًا: يقوم من مقعده دون إذن ويبتعد أكثر من متر" /></label>
      <label>السلوك البديل المرغوب<input maxLength={300} value={draft.replacement} onChange={e => put({ replacement: e.target.value })} placeholder="مثلًا: يرفع بطاقة «استراحة» وينتظر الإذن" /></label>
      <Choices label="إستراتيجيات وقائية" options={catalog.behaviourPrevention} value={draft.prevention} onChange={prevention => put({ prevention })} />
      <Choices label="المعززات" options={catalog.rewards.map(r => r.label)} value={draft.reinforcers} onChange={reinforcers => put({ reinforcers })} />
      <label>ماذا نفعل عند حدوث السلوك؟<textarea rows={2} maxLength={800} value={draft.response} onChange={e => put({ response: e.target.value })} placeholder="مثلًا: تلميح بصري لبطاقة الاستراحة، ثم إعادة توجيه هادئة، وتعزيز فوري عند استخدام البطاقة" /></label>
      <label>المشاركون في الخطة<input maxLength={200} value={draft.team} onChange={e => put({ team: e.target.value })} placeholder="المعلم، الأسرة، الأخصائي النفسي" /></label>
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ الخطة</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {ordered.length ? <div className="behaviour-list">{ordered.map((p, i) => { const learner = data.learners.find(l => l.id === p.learnerId); if (!learner) return null;
      const days = behaviourCounts(learner.behaviour, p.id, now); const total = days.reduce((t, d) => t + d.count, 0); const peak = Math.max(1, ...days.map(d => d.count)); const due = p.active && p.review && p.review <= now;
      return <article className={`panel behaviour-card ${p.active ? '' : 'is-paused'}`} key={p.id} style={{ '--i': i } as React.CSSProperties}>
        <header><Link to={`/learners/${learner.id}`}><Avatar learner={learner} /></Link><div><h2>{p.target}</h2><p className="muted">{first(learner)} · الصف {learner.grade}</p></div><span className={`plan-state ${p.active ? 'ok' : ''}`}>{p.active ? 'نشطة' : 'متوقفة'}</span>{due && <span className="plan-state late">حان موعد المراجعة</span>}</header>
        <div className="behaviour-body">
          <dl>
            <div><dt>التعريف الإجرائي</dt><dd>{p.definition || 'لم يُكتب بعد'}</dd></div>
            <div><dt>من خط الأساس إلى الهدف</dt><dd>{p.baseline || 'لم يُحدد'}، ثم {p.goal || 'لم يُحدد'}</dd></div>
            <div><dt>الوظيفة المفترضة</dt><dd>{p.func || 'لم تُحدد'}</dd></div>
            <div><dt>السلوك البديل</dt><dd>{p.replacement || 'لم يُحدد'}</dd></div>
            {p.prevention.length > 0 && <div><dt>الوقاية</dt><dd className="behaviour-chips">{p.prevention.map(x => <span key={x}>{x}</span>)}</dd></div>}
            {p.reinforcers.length > 0 && <div><dt>المعززات</dt><dd className="behaviour-chips">{p.reinforcers.map(x => <span key={x}>{x}</span>)}</dd></div>}
            {p.response && <div><dt>عند حدوث السلوك</dt><dd>{p.response}</dd></div>}
            <div><dt>المشاركون والمراجعة</dt><dd>{p.team || 'المعلم'}{p.review ? ` · المراجعة ${dateLabel(p.review)}` : ''}</dd></div>
          </dl>
          <figure className="behaviour-chart"><figcaption>التكرار في آخر 14 يومًا<b>{total ? countOf(total, 'مرة', 'مرتان', 'مرات') : 'لا ملاحظات'}</b></figcaption>
            <div className="behaviour-bars" role="img" aria-label={`تكرار «${p.target}» في آخر 14 يومًا: ${total} مرة`}>{days.map(d => <span key={d.date} title={`${dateLabel(d.date)}: ${d.count}`}><i style={{ blockSize: `${(d.count / peak) * 100}%` }}>{d.count > 0 && <b>{d.count}</b>}</i></span>)}</div>
            <p className="behaviour-axis"><span>{dateLabel(days[0].date)}</span><span>اليوم</span></p>
          </figure>
        </div>
        {noting === p.id && <div className="behaviour-note form-stack no-print"><div className="form-grid"><label>ماذا حدث قبل؟<input autoFocus maxLength={200} value={note.antecedent} onChange={e => setNote({ ...note, antecedent: e.target.value })} placeholder="مثلًا: طُلب منه الانتقال إلى الكتابة" /></label><label>ماذا حدث بعد؟<input maxLength={200} value={note.consequence} onChange={e => setNote({ ...note, consequence: e.target.value })} placeholder="مثلًا: أُعيد توجيهه بهدوء" /></label><label>المكان<select value={note.setting} onChange={e => setNote({ ...note, setting: e.target.value })}>{catalog.settings.map(x => <option key={x}>{x}</option>)}</select></label></div><div className="heading-actions"><button type="button" className="button primary" onClick={() => addNote(p, learner)}><Check size={16} />تسجيل مرة اليوم</button><button type="button" className="button secondary" onClick={() => setNoting('')}>إلغاء</button></div></div>}
        <div className="heading-actions no-print">{p.active && <button className="button primary" aria-expanded={noting === p.id} onClick={() => setNoting(noting === p.id ? '' : p.id)}><ClipboardPen size={16} />سجّل حدوثه</button>}<button className="button secondary" onClick={() => setDraft(p)}><Pencil size={16} />تعديل</button><button className="button secondary" onClick={() => store(plans.map(x => x.id === p.id ? { ...x, active: !x.active } : x))}>{p.active ? <><Pause size={16} />إيقاف</> : <><Play size={16} />تفعيل</>}</button><button className="button secondary" onClick={async () => { if (await confirmDialog(`حذف خطة «${p.target}»؟ ملاحظات السلوك تبقى في ملف الطالب.`, { ok: 'حذف الخطة' })) store(plans.filter(x => x.id !== p.id)); }}><Trash2 size={16} />حذف</button></div>
      </article>; })}</div> : !draft && <section className="panel desk-panel"><Empty title={data.learners.length ? 'لا خطط سلوك بعد' : 'أضف ملف طالب أولًا'} description={data.learners.length ? 'ابدأ بسلوك واحد محدد يمكن عدّه، واكتب السلوك البديل الذي تعلّمه مكانه.' : 'خطة السلوك تُكتب لطالب بعينه، فأضفه من «قائمة الطلاب» ثم عُد.'} /></section>}
  </>;
}
