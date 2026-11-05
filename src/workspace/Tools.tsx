import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Check, CircleDot, Hand, HeartHandshake, Lock, Plus, RotateCcw, Save, Star, Timer, Wind, X } from 'lucide-react';
import { art } from '../../packages/domain/catalog';
import { LearnerSupports } from '../../packages/domain';
import { accessFromPreferences, defaultAccess } from '../../packages/domain/games';
import type { SocialStory, SymbolEntry } from '../../packages/domain/catalog';
import { numberLocale } from '../../packages/domain/numbers';
import { useWorkspace } from './store';
import { useSiteConfig } from './site';
import { Brand, Empty, PageHeading } from './Workspace';
import { accessClass, CommunicationBoard, HoldButton, SocialStoryView, steadyTap, SymbolArt, useDwell, useSpeech, useSwitchScan, WorkTimer } from './accessibility';
import './games.css';
import './packs.css';

const tools = [
  { id: 'schedule', title: 'الجدول المصوّر', text: 'خطوات اليوم بالصور: الآن والتالي وما انتهى. يقلل القلق ويوضح ما سيحدث.' },
  { id: 'first-then', title: 'أولاً ثم', text: 'نشاط مطلوب يتبعه نشاط محبب، بأبسط صورة ممكنة.' },
  { id: 'tokens', title: 'لوحة التعزيز', text: 'يجمع الطالب رموزًا نحو ما اختاره، ولا تُسحب الرموز أبدًا.' },
  { id: 'communication', title: 'لوحة التواصل', text: 'رموز يختارها المعلم لكل طالب، تُنطق وتُعرض كبيرة.' },
  { id: 'calm', title: 'ركن الهدوء', text: 'تنفس مرئي وعدّ بصري وما يحبه الطالب، عند الحاجة إلى التنظيم.' },
  { id: 'stories', title: 'القصص الاجتماعية', text: 'صفحات مصوّرة قصيرة بلغة حرفية، تُقرأ قبل نشاط جديد أو موقف متوقع.' },
  { id: 'routine', title: 'روتين الصباح', text: 'اليوم والتاريخ والطقس وقوانين الصف وقيمة الأسبوع، بضغطات قليلة.' },
] as const;

export function ToolsHub() {
  const { data, saveLearner, notify } = useWorkspace(); const { site } = useSiteConfig();
  const [learnerId, setLearnerId] = useState(data.learners[0]?.id ?? ''); const learner = data.learners.find(l => l.id === learnerId);
  const [draft, setDraft] = useState<LearnerSupports>(learner?.supports ?? {});
  useEffect(() => setDraft(learner?.supports ?? {}), [learnerId]); // eslint-disable-line react-hooks/exhaustive-deps
  const { activities, rewards, communication } = site.catalog;
  const toggle = (key: 'schedule' | 'communication', id: string, on: boolean) => setDraft(d => ({ ...d, [key]: on ? [...(d[key] ?? []), id] : (d[key] ?? []).filter(x => x !== id) }));
  return <><PageHeading banner="banner-tools" title="أدوات دعم الطالب" description="جهّزها لكل طالب مرة واحدة، ثم افتحها بملء الشاشة وقت الحاجة. أدوات تعليمية وليست علاجًا." />
    <div className="toolbar"><label>الطالب<select value={learnerId} onChange={e => setLearnerId(e.target.value)}>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label></div>
    {!learner ? <Empty title="أضف ملف طالب أولًا" description="تُحفظ الأدوات داخل ملف كل طالب." /> : <>
      <div className="tool-grid">{tools.map(({ id, title, text }, n) => <Link key={id} className="tool-card rise-in" style={{ animationDelay: `${n * 40}ms` }} to={`/support/${id}?learner=${learnerId}`}><img src={art(id === 'stories' ? 'book' : `tool-${id}`)} alt="" /><h2>{title}</h2><p>{text}</p><strong>افتح للطالب<ArrowLeft size={16} /></strong></Link>)}</div>
      <section className="panel profile-section spaced-panel"><div className="section-heading"><h2>تجهيز الأدوات لهذا الطالب</h2><HeartHandshake size={20} /></div>
        <h3 className="tool-heading">جدول اليوم</h3><SymbolPicker entries={activities} selected={draft.schedule ?? []} onToggle={(id, on) => toggle('schedule', id, on)} />
        <div className="form-grid tool-form"><label>أولاً<select value={draft.first ?? ''} onChange={e => setDraft(d => ({ ...d, first: e.target.value }))}><option value="">اختر نشاطًا</option>{activities.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label><label>ثم<select value={draft.then ?? ''} onChange={e => setDraft(d => ({ ...d, then: e.target.value }))}><option value="">اختر نشاطًا</option>{[...rewards, ...activities].map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label><label>أعمل من أجل<select value={draft.reward ?? ''} onChange={e => setDraft(d => ({ ...d, reward: e.target.value }))}><option value="">يختار الطالب</option>{rewards.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label><label>عدد الرموز<select value={draft.tokenGoal ?? 3} onChange={e => setDraft(d => ({ ...d, tokenGoal: Number(e.target.value) }))}>{[1, 2, 3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}</select></label><label>ما يحبه في ركن الهدوء<select value={draft.favourite ?? ''} onChange={e => setDraft(d => ({ ...d, favourite: e.target.value }))}><option value="">بدون</option>{rewards.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label></div>
        <h3 className="tool-heading">رموز لوحة التواصل</h3><SymbolPicker entries={communication} selected={draft.communication ?? communication.slice(0, 6).map(c => c.id)} onToggle={(id, on) => setDraft(d => { const current = d.communication ?? communication.slice(0, 6).map(c => c.id); return { ...d, communication: on ? [...current, id] : current.filter(x => x !== id) }; })} />
        <button className="button primary" onClick={() => { saveLearner({ ...learner, supports: draft }); notify('حُفظت أدوات الطالب'); }}><Save size={17} />حفظ في ملف الطالب</button>
      </section></>}
    <p className="tool-footnote"><Hand size={16} aria-hidden="true" /><Link to="/admin">تُدار القوائم والرموز من لوحة الإدارة.</Link></p>
  </>;
}
function SymbolPicker({ entries, selected, onToggle }: { entries: SymbolEntry[]; selected: string[]; onToggle: (id: string, on: boolean) => void }) {
  return <div className="symbol-picker">{entries.map(e => { const on = selected.includes(e.id); return <button type="button" key={e.id} aria-pressed={on} className={on ? 'active' : ''} onClick={() => onToggle(e.id, !on)}><SymbolArt entry={e} />{e.label}{on && <Check size={15} aria-hidden="true" />}</button>; })}</div>;
}
export function StudentTool() {
  const { tool } = useParams(); const [params] = useSearchParams(); const { data } = useWorkspace(); const { site } = useSiteConfig();
  const learner = data.learners.find(l => l.id === params.get('learner')); const info = tools.find(t => t.id === tool);
  const access = useMemo(() => learner ? accessFromPreferences(learner.preferences) : { ...defaultAccess, target: 'large' as const }, [learner]);
  const root = useRef<HTMLDivElement>(null); const tap = useMemo(() => steadyTap(access.steady), [access.steady]); const [scan, setScan] = useState(access.scan); const speech = useSpeech(); const [step, setStep] = useState(0);
  useSwitchScan(root, scan, access.scanSeconds, `${tool}-${step}`, () => setScan(false), access.scanSpeak ? speech.speak : undefined, access.switches === 2);
  useDwell(root, !!access.dwell);
  if (!info) return <div className="learning-room" dir="rtl"><Empty title="الأداة غير موجودة" description="عد إلى أدوات دعم الطالب." /><Link className="button secondary" to="/tools">العودة</Link></div>;
  const c = site.catalog; const s = learner?.supports ?? {}; const lookup = (id?: string) => [...c.activities, ...c.rewards].find(a => a.id === id);
  const talk = (text: string) => { if (access.speech) speech.speak(text); };
  return <div ref={root} dir="rtl" onClickCapture={tap} onClick={() => setStep(n => n + 1)} className={`learning-room student-tool play-room ${accessClass(access)}`}>
    <header className="learning-topbar"><Brand /><HoldButton className="teacher-corner" onOpen={() => { window.location.assign('/tools'); }}><Lock size={15} aria-hidden="true" />خروج المعلم</HoldButton></header>
    <main className="tool-stage">
      {tool === 'schedule' && <Schedule items={(s.schedule ?? []).map(lookup).filter((x): x is SymbolEntry => !!x)} talk={talk} />}
      {tool === 'first-then' && <FirstThen first={lookup(s.first)} then={lookup(s.then)} talk={talk} />}
      {tool === 'tokens' && <Tokens goal={s.tokenGoal ?? 3} rewards={c.rewards} preset={s.reward} talk={talk} />}
      {tool === 'communication' && <CommunicationBoard tiles={s.communication ? c.communication.filter(t => s.communication!.includes(t.id)) : c.communication} sound={access.speech} onBreak={() => undefined} onRepeat={() => undefined} />}
      {tool === 'calm' && <Calm favourite={c.rewards.find(r => r.id === s.favourite)} still={!!access.calm} />}
      {tool === 'stories' && <Stories stories={c.stories} sound={access.speech} />}
      {tool === 'routine' && <Routine weather={c.weather} rules={c.rules} values={c.values} talk={talk} />}
    </main>
  </div>;
}
function Tile({ entry, className = '' }: { entry: SymbolEntry; className?: string }) { return <div className={`big-symbol ${className}`}><SymbolArt entry={entry} /><strong>{entry.label}</strong></div>; }
function Schedule({ items, talk }: { items: SymbolEntry[]; talk: (t: string) => void }) {
  const [done, setDone] = useState(0); const [warning, setWarning] = useState(false); const next = items[done + 1];
  const advance = () => { const n = done + 1; setDone(n); setWarning(false); talk(n < items.length ? `انتهينا. الآن ${items[n].label}` : 'انتهينا من جدول اليوم. أحسنت'); };
  if (!items.length) return <Empty title="الجدول فارغ" description="جهّزه من صفحة أدوات دعم الطالب." />;
  return <><h1 className="tool-title">{done < items.length ? `الآن: ${items[done].label}` : 'انتهينا'}</h1><ol className="schedule-strip">{items.map((item, n) => <li key={item.id} className={n < done ? 'is-done' : n === done ? 'is-now' : ''} aria-current={n === done ? 'step' : undefined}><SymbolArt entry={item} /><strong>{item.label}</strong><small>{n < done ? 'انتهى' : n === done ? 'الآن' : n === done + 1 ? 'التالي' : ''}</small></li>)}</ol>{warning && next && <div className="transition-warning" role="status"><SymbolArt entry={next} /><strong>بعد دقيقة ننتقل إلى: {next.label}</strong><WorkTimer minutes={1} running onEnd={advance} /></div>}<div className="tool-actions">{next && !warning && <button data-scan className="button secondary tool-big" onClick={() => { setWarning(true); talk(`بعد دقيقة ننتقل إلى ${next.label}`); }}><Timer size={24} />نبّه: بعد دقيقة</button>}{done < items.length ? <button data-scan className="button primary tool-big" onClick={advance}><Check size={26} />انتهيت من هذه الخطوة</button> : <button data-scan className="button secondary tool-big" onClick={() => setDone(0)}><RotateCcw size={24} />من جديد</button>}</div></>;
}
function FirstThen({ first, then, talk }: { first?: SymbolEntry; then?: SymbolEntry; talk: (t: string) => void }) {
  const [finished, setFinished] = useState(false);
  if (!first || !then) return <Empty title="لم تُجهَّز اللوحة بعد" description="اختر «أولاً» و«ثم» من صفحة أدوات دعم الطالب." />;
  return <><div className="first-then"><div className={finished ? 'is-done' : 'is-now'}><h2>أولاً</h2><Tile entry={first} />{finished && <Check size={40} aria-hidden="true" />}</div><ArrowLeft size={54} aria-hidden="true" /><div className={finished ? 'is-now' : ''}><h2>ثم</h2><Tile entry={then} /></div></div><div className="tool-actions"><button data-scan className="button primary tool-big" onClick={() => { setFinished(!finished); talk(finished ? `أولاً ${first.label}` : `أحسنت. الآن ${then.label}`); }}>{finished ? <><RotateCcw size={24} />من جديد</> : <><Check size={26} />انتهيت</>}</button></div></>;
}
function Tokens({ goal, rewards, preset, talk }: { goal: number; rewards: SymbolEntry[]; preset?: string; talk: (t: string) => void }) {
  const [reward, setReward] = useState(preset ?? ''); const [count, setCount] = useState(0); const chosen = rewards.find(r => r.id === reward); const full = count >= goal;
  if (!chosen) return <><h1 className="tool-title">ماذا تريد أن تكسب؟</h1><div className="big-choices">{rewards.map(r => <button data-scan key={r.id} onClick={() => { setReward(r.id); talk(r.label); }}><SymbolArt entry={r} />{r.label}</button>)}</div></>;
  return <><h1 className="tool-title">{full ? `أحسنت! حان وقت: ${chosen.label}` : `أعمل من أجل: ${chosen.label}`}</h1><div className="token-row" role="img" aria-label={`${count} من ${goal} رموز`}>{Array.from({ length: goal }, (_, n) => <span key={n} className={n < count ? 'earned' : ''}><Star size={46} fill={n < count ? 'currentColor' : 'none'} aria-hidden="true" /></span>)}</div><Tile entry={chosen} className={full ? 'celebrate' : ''} /><div className="tool-actions">{full ? <button data-scan className="button secondary tool-big" onClick={() => setCount(0)}><RotateCcw size={24} />جولة جديدة</button> : <button data-scan className="button primary tool-big" onClick={() => { const next = count + 1; setCount(next); talk(next >= goal ? `أحسنت. حان وقت ${chosen.label}` : 'أحسنت'); }}><Plus size={26} />أضف رمزًا</button>}</div></>;
}
function Calm({ favourite, still }: { favourite?: SymbolEntry; still: boolean }) {
  const [minutes, setMinutes] = useState(0); const [left, setLeft] = useState(0); const [phase, setPhase] = useState(0); const [more, setMore] = useState(false);
  useEffect(() => { if (still) return; const t = window.setInterval(() => setPhase(p => (p + 1) % 2), 4000); return () => clearInterval(t); }, [still]);
  useEffect(() => { if (!left) return; const t = window.setTimeout(() => setLeft(l => l - 1), 1000); return () => clearTimeout(t); }, [left]);
  return <div className="calm-corner"><h1 className="tool-title">نهدأ معًا</h1><div className={`breath ${still ? 'still' : phase ? 'out' : 'in'}`} aria-hidden="true"><Wind size={44} strokeWidth={1.3} /></div><p className="calm-word" aria-live="off">{still ? 'شهيق بطيء، ثم زفير بطيء' : phase ? 'أُخرج الهواء ببطء' : 'آخذ نفسًا ببطء'}</p>{!more && <button data-scan className="button secondary tool-big" onClick={() => setMore(true)}>ما يساعدني</button>}{more && favourite && <Tile entry={favourite} />}
    {more && <div className="calm-timer"><h2><Timer size={20} aria-hidden="true" />عدّ مرئي اختياري</h2><div className="tool-actions">{[1, 2, 3, 5].map(m => <button data-scan key={m} className={`button secondary ${minutes === m && left ? 'is-active' : ''}`} onClick={() => { setMinutes(m); setLeft(m * 60); }}>{m} د</button>)}{left > 0 && <button data-scan className="button secondary" onClick={() => setLeft(0)}><X size={18} />إيقاف</button>}</div>{left > 0 && <div className="visual-timer" style={{ '--left': `${left / (minutes * 60) * 360}deg` } as React.CSSProperties} role="timer" aria-label={`تبقى ${Math.ceil(left / 60)} دقيقة`}><CircleDot size={20} aria-hidden="true" /></div>}</div>}</div>;
}
function Routine({ weather, rules, values, talk }: { weather: SymbolEntry[]; rules: SymbolEntry[]; values: SymbolEntry[]; talk: (t: string) => void }) {
  const today = new Date(); const day = today.toLocaleDateString(numberLocale, { weekday: 'long' }); const date = today.toLocaleDateString(numberLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  const [step, setStep] = useState(0); const [picked, setPicked] = useState(''); const [value] = useState(() => values[Math.floor(today.getTime() / 604800000) % Math.max(1, values.length)]);
  const steps = ['اليوم', 'الطقس', 'القوانين', 'القيمة'];
  return <><ol className="routine-steps">{steps.map((s, n) => <li key={s} className={n === step ? 'is-now' : n < step ? 'is-done' : ''} aria-current={n === step ? 'step' : undefined}>{s}</li>)}</ol>
    {step === 0 && <div className="routine-day"><CalendarCheck size={60} strokeWidth={1.3} aria-hidden="true" /><h1 className="tool-title">{day}</h1><p>{date}</p><button data-scan className="button secondary" onClick={() => talk(`اليوم ${day}، ${date}`)}>استمع</button></div>}
    {step === 1 && <><h1 className="tool-title">كيف الطقس اليوم؟</h1><div className="big-choices">{weather.map(w => <button data-scan key={w.id} aria-pressed={picked === w.id} className={picked === w.id ? 'active' : ''} onClick={() => { setPicked(w.id); talk(w.label); }}><SymbolArt entry={w} />{w.label}</button>)}</div></>}
    {step === 2 && <><h1 className="tool-title">قوانين صفنا</h1><div className="big-choices">{rules.map(r => <button data-scan key={r.id} onClick={() => talk(r.label)}><SymbolArt entry={r} />{r.label}</button>)}</div></>}
    {step === 3 && value && <><h1 className="tool-title">قيمة الأسبوع</h1><Tile entry={value} /></>}
    <div className="tool-actions">{step > 0 && <button data-scan className="button secondary tool-big" onClick={() => setStep(s => s - 1)}>السابق</button>}{step < steps.length - 1 && <button data-scan className="button primary tool-big" onClick={() => setStep(s => s + 1)}>التالي</button>}</div></>;
}
function Stories({ stories, sound }: { stories: SocialStory[]; sound: boolean }) {
  const [open, setOpen] = useState<SocialStory>(); const ready = stories.filter(s => s.pages.length);
  if (open) return <SocialStoryView story={open} sound={sound} doneLabel="انتهت القصة" onDone={() => setOpen(undefined)} />;
  if (!ready.length) return <Empty title="لا توجد قصص" description="أضف قصة اجتماعية من لوحة الإدارة." />;
  return <><h1 className="tool-title">اختر قصة</h1><div className="big-choices">{ready.map(s => <button data-scan key={s.id} onClick={() => setOpen(s)}><SymbolArt entry={s.pages[0]} /><span>{s.title}</span></button>)}</div></>;
}
