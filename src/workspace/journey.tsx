import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Clock3, ExternalLink, Layers, PencilLine, Sparkles } from 'lucide-react';
import { countOf, createLesson, type KitItem, type KitStage, type Lesson, type Subject } from '../../packages/domain';
import type { WarmupEntry } from '../../packages/domain/catalog';
import { hasTiers, journey, lessonFromCurriculum, stations, tierHints, tierLabels, tiers, warmupsFor, type StationId, type StationPlan, type Tier } from '../../packages/domain/journey';
import { confirmDialog } from './confirm';
import { Seg } from './fields';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { Empty } from './Workspace';
import './journey.css';

const minutesWord = (n: number) => n === 2 ? 'دقيقتان' : n >= 3 && n <= 10 ? 'دقائق' : 'دقيقة';
const minutesLabel = (n: number) => n === 2 ? 'دقيقتان' : `${n} ${minutesWord(n)}`;
const kitStage = (id: StationId): KitStage => id === 'warmup' ? 'warmup' : id === 'closing' ? 'closing' : 'content';

/** The lesson as a walk: stations down a line, each with its minutes, what happens in it, and what is offered at the chosen level of support. */
export function JourneyTimeline({ lesson, kit = [] }: { lesson: Lesson; kit?: KitItem[] }) {
  const rows = journey(lesson); const [tier, setTier] = useState<Tier>('partial'); const seen = new Set<KitStage>();
  return <section className="panel journey">
    <div className="section-heading"><h2>مسار الحصة</h2><span className="journey-total"><Clock3 size={16} aria-hidden="true" />{minutesLabel(lesson.duration)} · {countOf(rows.length, 'محطة', 'محطتان', 'محطات')}</span></div>
    {rows.some(hasTiers) && <div className="journey-tiers no-print"><Seg label="اعرض ما يُقدَّم بمستوى" value={tier} options={tiers.map(t => [t, tierLabels[t]] as const)} onChange={setTier} hint="المستوى يصف النشاط لا الطالب. اختر لكل طالب ما يناسبه اليوم." /></div>}
    <ol className="journey-line">{rows.map((r, i) => {
      // Kit items are filed under three stages; the middle ones are listed once, under the first middle station.
      const stage = kitStage(r.id); const items = seen.has(stage) ? [] : kit.filter(k => k.stage === stage); seen.add(stage); const note = (r.tiers[tier] ?? '').trim();
      return <li key={r.id} style={{ '--i': i } as React.CSSProperties}>
        <span className="journey-node" aria-hidden="true">{i + 1}</span>
        <div className="journey-time"><strong>{r.minutes}</strong><small>{minutesWord(r.minutes)}</small><span>من الدقيقة {r.start}</span></div>
        <div className="journey-card"><h3>{r.title}</h3><p>{r.text}</p>
          {note && <p className="journey-tier"><b>{tierLabels[tier]}</b>{note}</p>}
          {items.length > 0 && <ul className="journey-kit">{items.map(k => <li key={k.id} className={k.done ? 'is-done' : ''}>{k.url ? <a href={k.url} target="_blank" rel="noreferrer">{k.title}<ExternalLink size={13} aria-hidden="true" /></a> : k.title}</li>)}</ul>}
        </div></li>;
    })}</ol>
  </section>;
}

/** The stations step of the lesson editor: text and minutes per station, a ready warm-up from the bank, and what each level of support gets. */
export function StationsEditor({ lesson, onChange }: { lesson: Lesson; onChange: (patch: Partial<Lesson>) => void }) {
  const { site } = useSiteConfig(); const plans = lesson.stationPlans ?? {}; const rows = journey(lesson); const bank = warmupsFor(site.catalog.warmups, lesson.subject, lesson.grade);
  const plan = (id: StationId, change: StationPlan) => onChange({ stationPlans: { ...plans, [id]: { ...plans[id], ...change } } });
  const set = stations.reduce((t, s) => t + (plans[s.id]?.minutes ?? 0), 0);
  const pick = async (w: WarmupEntry) => {
    const now = lesson.warmup.trim(); const known = !now || now === createLesson().warmup || bank.some(x => x.text === now);
    if (known || await confirmDialog('استبدال نص التهيئة الحالي بالتهيئة المختارة من البنك؟', { ok: 'استبدال', danger: false })) onChange({ warmup: w.text });
  };
  return <div className="form-stack stations-editor">
    {stations.map((s, i) => { const p = plans[s.id] ?? {}; const auto = rows.find(r => r.id === s.id)?.minutes; const written = tiers.filter(t => (p.tiers?.[t] ?? '').trim()).length;
      return <fieldset key={s.id} className="station-field"><legend><span aria-hidden="true">{i + 1}</span>{s.title}{s.optional && <small>اختيارية</small>}</legend>
        <p className="seg-hint">{s.hint}</p>
        {s.id === 'warmup' && bank.length > 0 && <label className="station-bank"><span><Sparkles size={15} aria-hidden="true" />من بنك التهيئة</span><select value="" onChange={e => { const w = bank.find(x => x.id === e.target.value); if (w) void pick(w); }}><option value="">اختر تهيئة جاهزة…</option>{bank.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}</select></label>}
        <div className="station-row">
          <label>ماذا يحدث في هذه المحطة؟<textarea rows={3} maxLength={1200} value={lesson[s.id] ?? ''} onChange={e => onChange({ [s.id]: e.target.value } as Partial<Lesson>)} /></label>
          <label className="station-minutes">الدقائق<input type="number" min="0" max="120" inputMode="numeric" placeholder={auto !== undefined ? String(auto) : '0'} value={p.minutes ?? ''} onChange={e => plan(s.id, { minutes: e.target.value === '' ? undefined : Math.max(0, Math.min(120, e.target.valueAsNumber || 0)) })} /><small>{p.minutes === undefined ? 'تلقائي' : 'محدد'}</small></label>
        </div>
        <details className="station-tiers"><summary><Layers size={15} aria-hidden="true" />مستويات الدعم في هذه المحطة{written > 0 && <b>{written} من 3</b>}<ChevronDown size={16} aria-hidden="true" /></summary>
          <div className="station-tier-grid">{tiers.map(t => <label key={t}>{tierLabels[t]}<small>{tierHints[t]}</small><textarea rows={3} maxLength={600} value={p.tiers?.[t] ?? ''} onChange={e => plan(s.id, { tiers: { ...p.tiers, [t]: e.target.value } })} /></label>)}</div>
        </details>
      </fieldset>; })}
    <label>التكييفات ووسائل الوصول<small>حدّد الفروق لكل طالب بدل تكرار التحضير</small><textarea rows={3} value={lesson.adaptations} onChange={e => onChange({ adaptations: e.target.value })} /></label>
    {set > lesson.duration ? <div role="alert" className="alert">الدقائق المحددة للمحطات ({set}) أكثر من زمن الحصة ({lesson.duration}). قلّل دقائق محطة أو زد زمن الحصة من الخطوة الأولى.</div>
      : <div className="info-note">زمن الحصة {minutesLabel(lesson.duration)}. المحطة التي تتركها «تلقائي» تأخذ نصيبها مما يتبقى، والمحطة الاختيارية الفارغة لا تظهر في الدرس.</div>}
  </div>;
}

/** Units and lessons the administration entered for a grade and a subject, and the warm-up bank beside them. Opening one makes an editable draft. */
export function CurriculumShelf({ grade, subject }: { grade: string; subject: string }) {
  const { saveLesson, notify } = useWorkspace(); const { site } = useSiteConfig(); const navigate = useNavigate();
  const units = site.catalog.units.filter(u => (!grade || u.grade === grade) && (subject === 'all' || u.subject === subject));
  const bank = subject === 'all' ? [] : warmupsFor(site.catalog.warmups, subject, grade);
  const open = (lesson: Lesson, message: string) => { saveLesson(lesson); notify(message); navigate(`/lessons/${lesson.id}/edit`); };
  return <div className="curriculum">
    {units.map(unit => <section className="panel curriculum-unit" key={unit.id}>
      <div className="section-heading"><div><h2>{unit.title}</h2><p className="muted">{unit.subject} · الصف {unit.grade}</p></div><span className="journey-total">{countOf(unit.lessons.length, 'درس', 'درسان', 'دروس')}</span></div>
      <ol className="curriculum-lessons">{unit.lessons.map((entry, n) => { const rows = journey(lessonFromCurriculum(unit, entry));
        return <li key={entry.id} style={{ '--i': n } as React.CSSProperties}><details>
          <summary><span className="journey-node" aria-hidden="true">{n + 1}</span><span className="curriculum-title"><strong>{entry.title}</strong><small>{entry.objective}</small></span><span className="curriculum-count">{countOf(rows.length, 'محطة', 'محطتان', 'محطات')}<ChevronDown size={16} aria-hidden="true" /></span></summary>
          <ol className="station-preview">{rows.map(r => <li key={r.id}><b>{r.title}</b><span>{r.text}</span></li>)}</ol>
        </details><button type="button" className="button primary" onClick={() => open(lessonFromCurriculum(unit, entry), 'أُضيف الدرس إلى تحضيراتك. اختر الطلاب وراجع المحطات.')}><PencilLine size={16} />حضّر هذا الدرس</button></li>; })}</ol>
    </section>)}
    {!units.length && <Empty title={grade ? `لا وحدات للصف ${grade}${subject === 'all' ? '' : ` في ${subject}`} بعد` : 'اختر الصف ثم المادة'} description="وحدات المنهج ودروسه تضيفها إدارة المنصة. إلى أن تُضاف، حضّر درسك من صفحة الدروس واستعن ببنك التهيئة." />}
    {bank.length > 0 && <section className="panel curriculum-warmups"><div className="section-heading"><div><h2>بنك التهيئة</h2><p className="muted">افتتاحيات جاهزة لمادة {subject}. اختر واحدة وابدأ بها درسًا جديدًا، أو خذها من محرر الدرس.</p></div></div>
      <ul>{bank.map(w => <li key={w.id}><div><strong>{w.title}</strong><p>{w.text}</p></div><button type="button" className="button secondary" onClick={() => open({ ...createLesson(subject as Subject), grade: grade || createLesson().grade, warmup: w.text }, 'بدأ درس جديد بهذه التهيئة.')}>درس جديد بها</button></li>)}</ul>
    </section>}
  </div>;
}

/** Where the lesson is while the slides are on screen: the stations in order, the one being taught and the one after it. */
export function StationRail({ slides, active }: { slides: { station?: StationId }[]; active: number }) {
  const order = stations.filter(s => slides.some(x => x.station === s.id)); if (!order.length) return null;
  const now = slides.slice(0, active + 1).reverse().find(s => s.station)?.station; const at = order.findIndex(s => s.id === now);
  return <ol className="station-rail" aria-label="محطات الحصة">{order.map((s, i) => <li key={s.id} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} aria-current={i === at ? 'step' : undefined}><small>{i === at ? 'الآن' : i === at + 1 ? 'التالي' : i < at ? 'تمّت' : ''}</small>{s.title}</li>)}</ol>;
}
