import { useEffect, useRef, useState } from 'react';
import { confirmDialog } from './confirm';
import { Award, CheckCircle2, ClipboardPen, FileDown, Plus, RotateCcw, Shuffle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { phaseLabels, summarizeTrials, uid, type Goal, type Learner, type Phase, type Support } from '../../packages/domain';
import { draftErrors, goalCriterion, goalFromDraft, goalProgress, goalSentence, goalStatusLabels, today, type CriterionType, type GoalDraft } from '../../packages/domain/planning';
import { goalReportBody } from '../../packages/domain/docx';
import { useWorkspace } from './store';
import { useSiteConfig } from './site';
import { downloadWord } from './word';

/** أن + السلوك + الشرط + المعيار + المساعدة */
export function GoalBuilder({ subject: initial, onAdd, submitLabel = 'إضافة الهدف' }: { subject?: string; onAdd: (goal: Goal) => void; submitLabel?: string }) {
  const { site } = useSiteConfig(); const { subjects, goalBank, support } = site.catalog;
  const blank = (s: string): GoalDraft => ({ behaviour: '', condition: '', type: 'of', x: 4, y: 5, sessions: 2, support: 'independent', subject: s, baseline: '' });
  const [d, setD] = useState<GoalDraft>(blank(initial ?? subjects[0] ?? '')); const [steps, setSteps] = useState(''); const [errors, setErrors] = useState<string[]>([]);
  const set = (change: Partial<GoalDraft>) => setD(x => ({ ...x, ...change }));
  const bank = goalBank.filter(b => b.subject === d.subject);
  const submit = () => { const found = draftErrors(d); setErrors(found); if (found.length) return; const list = steps.split('\n').map(x => x.trim()).filter(Boolean); onAdd({ ...goalFromDraft(d), ...(list.length ? { steps: list } : {}) }); setD(blank(d.subject)); setSteps(''); };
  return <div className="goal-builder">
    {bank.length > 0 && <div className="bank-row" role="group" aria-label="بنك الأهداف"><small>من بنك الأهداف:</small>{bank.map(b => <button type="button" key={b.id} className="preset-chip" onClick={() => set({ behaviour: b.behaviour, condition: b.condition })}>{b.behaviour}</button>)}</div>}
    <div className="form-grid"><label>المادة<select value={d.subject} onChange={e => set({ subject: e.target.value })}>{subjects.map(x => <option key={x}>{x}</option>)}</select></label><label>السلوك الذي نلاحظه<input value={d.behaviour} placeholder="يميّز الطالب الكلمة" onChange={e => set({ behaviour: e.target.value })} /></label><label>الشرط<input value={d.condition} placeholder="عند عرض الصورة وخيارين" onChange={e => set({ condition: e.target.value })} /></label><label>أقصى مساعدة مقبولة<select value={d.support} onChange={e => set({ support: e.target.value as Support })}>{support.filter(x => x.enabled && x.id !== 'not-observed').map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>
    <div className="criterion-row"><label>المعيار<select value={d.type} onChange={e => set({ type: e.target.value as CriterionType })}><option value="of">عدد من محاولات</option><option value="streak">محاولات متتالية</option><option value="percent">نسبة مئوية</option></select></label><label>{d.type === 'percent' ? 'النسبة' : 'النجاح'}<input type="number" min={1} value={d.x} onChange={e => set({ x: e.target.valueAsNumber })} /></label>{d.type === 'of' && <label>من محاولات<input type="number" min={1} value={d.y} onChange={e => set({ y: e.target.valueAsNumber })} /></label>}<label>خلال جلسات<input type="number" min={1} value={d.sessions} onChange={e => set({ sessions: e.target.valueAsNumber })} /></label></div>
    <label>الأداء الحالي<input value={d.baseline} onChange={e => set({ baseline: e.target.value })} /></label>
    <label>تحليل المهارة (اختياري)<small>خطوة في كل سطر، لتسجّل مقدار المساعدة في كل خطوة.</small><textarea rows={3} value={steps} onChange={e => setSteps(e.target.value)} /></label>
    <p className="goal-preview" aria-live="polite">{d.behaviour.trim() ? goalSentence(d) : `أن … ، ${goalCriterion(d)}`}</p>
    {errors.map(x => <p key={x} role="alert" className="alert">{x}</p>)}
    <button type="button" className="button secondary" onClick={submit}><Plus size={16} />{submitLabel}</button></div>;
}

/** Records what happened away from the screen: speech, writing, practical skills. */
export function RecordGoal({ learner, goal, onClose, phase: initialPhase }: { learner: Learner; goal: Goal; onClose: () => void; phase?: Phase }) {
  const { record, notify } = useWorkspace(); const { site } = useSiteConfig(); const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const levels = site.catalog.support.filter(x => x.enabled);
  const [date, setDate] = useState(today()); const [note, setNote] = useState(''); const [correct, setCorrect] = useState(0); const [independent, setIndependent] = useState(0); const [total, setTotal] = useState(goal.opportunities <= 20 ? goal.opportunities : 5); const [support, setSupport] = useState<Support>('independent');
  const [steps, setSteps] = useState<Support[]>((goal.steps ?? []).map(() => 'not-observed')); const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>(initialPhase ?? (goal.approvedAt ? 'maintenance' : 'intervention')); const [context, setContext] = useState({ setting: site.catalog.settings[0] ?? '', person: site.catalog.people[0] ?? '', material: site.catalog.materials[1] ?? '' });
  const save = () => {
    const base = { id: uid(), lessonId: 'manual', learnerId: learner.id, goalId: goal.id, date: `${date}T12:00:00.000Z`, note, phase, context, source: 'manual' as const };
    if (goal.steps?.length) { const responses = goal.steps.map((questionId, n) => ({ questionId, selected: null, correct: steps[n] !== 'not-observed', support: steps[n] })); const sum = summarizeTrials(responses); if (!sum.total) { setError('حدد مقدار المساعدة في خطوة واحدة على الأقل.'); return; } record({ ...base, ...sum, responses }); }
    else { if (![correct, independent, total].every(Number.isInteger) || total < 1 || correct < 0 || independent < 0 || correct > total || independent > correct) { setError('راجع الأرقام: المستقل لا يتجاوز الصحيح، والصحيح لا يتجاوز المحاولات.'); return; } record({ ...base, correct, independent, total, support }); }
    notify('سُجّلت الملاحظة'); onClose();
  };
  return <dialog ref={ref} className="teacher-dialog record-dialog" onClose={onClose}><h2>تسجيل ملاحظة</h2><p>{goal.text}</p><div className="form-stack"><label>التاريخ<input type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} /></label>
    {goal.steps?.length ? <ol className="step-record">{goal.steps.map((step, n) => <li key={n}><span>{step}</span><select aria-label={`مقدار المساعدة في: ${step}`} value={steps[n]} onChange={e => setSteps(steps.map((x, i) => i === n ? e.target.value as Support : x))}>{levels.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></li>)}</ol>
      : <><div className="criterion-row"><label>المحاولات<input type="number" min={1} value={total} onChange={e => setTotal(e.target.valueAsNumber)} /></label><label>الصحيح<input type="number" min={0} value={correct} onChange={e => setCorrect(e.target.valueAsNumber)} /></label><label>الصحيح باستقلالية<input type="number" min={0} value={independent} onChange={e => setIndependent(e.target.valueAsNumber)} /></label></div><label>أكثر مساعدة استُخدمت<select value={support} onChange={e => setSupport(e.target.value as Support)}>{levels.filter(x => x.id !== 'not-observed').map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label></>}
    <fieldset className="context-row"><legend>أين ومع من؟</legend><label>المكان<select value={context.setting} onChange={e => setContext(c => ({ ...c, setting: e.target.value }))}>{site.catalog.settings.map(x => <option key={x}>{x}</option>)}</select></label><label>مع من<select value={context.person} onChange={e => setContext(c => ({ ...c, person: e.target.value }))}>{site.catalog.people.map(x => <option key={x}>{x}</option>)}</select></label><label>الوسيلة<select value={context.material} onChange={e => setContext(c => ({ ...c, material: e.target.value }))}>{site.catalog.materials.map(x => <option key={x}>{x}</option>)}</select></label></fieldset>
    <label>مرحلة القياس<select value={phase} onChange={e => setPhase(e.target.value as Phase)}>{(Object.keys(phaseLabels) as Phase[]).map(k => <option key={k} value={k}>{phaseLabels[k]}</option>)}</select><small>{phase === 'baseline' ? 'قبل التدريس: يظهر على الرسم كنقطة بداية ولا يُحسب في المعيار.' : phase === 'maintenance' ? 'بعد الاعتماد: هل بقيت المهارة؟ لا يغيّر حالة الهدف.' : 'جلسة تدريس: تُحسب في المعيار.'}</small></label>
    <label>ملاحظة<input value={note} onChange={e => setNote(e.target.value)} /></label>{error && <p role="alert" className="alert">{error}</p>}<div className="heading-actions"><button type="button" className="button primary" onClick={save}>حفظ</button><button type="button" className="button secondary" onClick={onClose}>إلغاء</button></div></div></dialog>;
}

/** Independent correct over correct with help, one column per recorded session. */
function GoalChart({ goal, rows, need }: { goal: Goal; rows: ReturnType<typeof goalProgress>['rows']; need: number }) {
  const H = 120; const W = 26; const gap = 10; const shown = rows.slice(-12); const width = Math.max(shown.length * (W + gap), 200);
  const describe = shown.map(o => `${o.date.slice(0, 10)} (${phaseLabels[o.phase ?? 'intervention']}): ${o.correct} صحيح، منها ${o.independent} باستقلالية، من ${o.total}`).join('. ');
  return <figure className="goal-chart"><svg viewBox={`0 0 ${width} ${H + 22}`} role="img" aria-label={`${goal.text}. المعيار ${Math.round(need * 100)}%. ${describe}`}>
    {shown.map((o, n) => { const x = n * (W + gap); const help = (o.correct - o.independent) / o.total * H; const own = o.independent / o.total * H; const phase = o.phase ?? 'intervention'; const edge = n > 0 && (shown[n - 1].phase ?? 'intervention') !== phase; return <g key={o.id} className={`phase-${phase}`}><title>{`${o.date.slice(0, 10)} · ${phaseLabels[phase]}${o.context?.setting ? ` · ${o.context.setting}` : ''}: ${o.correct} صحيح، منها ${o.independent} باستقلالية، من ${o.total}`}</title>{edge && <line className="chart-phase" x1={x - gap / 2} x2={x - gap / 2} y1={0} y2={H} />}<rect className="chart-rest" x={x} y={0} width={W} height={H} rx={4} />{help > 2 && <rect className="chart-help" x={x} y={H - own - help} width={W} height={help - 2} rx={4} />}{own > 0 && <rect className="chart-own" x={x} y={H - own} width={W} height={own} rx={4} />}<text x={x + W / 2} y={H + 16} textAnchor="middle">{o.date.slice(5, 10).replace('-', '/')}</text></g>; })}
    <line className="chart-need" x1={0} x2={width} y1={H - need * H} y2={H - need * H} /></svg>
    <figcaption><span><i className="key-own" />باستقلالية</span><span><i className="key-help" />صحيح بمساعدة</span><span><i className="key-need" />المعيار {Math.round(need * 100)}%</span>{shown.some(o => o.phase === 'baseline') && <span><i className="key-baseline" />خط الأساس</span>}{shown.some(o => o.phase === 'maintenance') && <span><i className="key-maintenance" />احتفاظ</span>}</figcaption></figure>;
}

export function GoalReports({ learners }: { learners: Learner[] }) {
  const { data, saveLearner, notify } = useWorkspace(); const { site } = useSiteConfig(); const [recording, setRecording] = useState<{ learner: Learner; goal: Goal; phase?: Phase } | null>(null);
  const supportName = (id: string) => site.catalog.support.find(x => x.id === id)?.label ?? id;
  const setGoal = (l: Learner, g: Goal, change: Partial<Goal>) => saveLearner({ ...l, goals: l.goals.map(x => x.id === g.id ? { ...x, ...change } : x) });
  return <section className="goal-reports">{learners.filter(l => l.goals.length).map(l => <div className="panel goal-learner" key={l.id}><div className="section-heading"><h2>{l.name}</h2><button className="button secondary" onClick={async () => { await downloadWord(`تقرير أهداف ${l.name}`, goalReportBody(l, data.observations, supportName)); notify('نُزّل تقرير Word'); }}><FileDown size={16} />تقرير Word</button></div>
    <div className="goal-cards">{l.goals.map(g => { const p = goalProgress(g, data.observations); return <article className="goal-card" key={g.id}><div className="goal-card-top"><span className={`goal-state ${p.status}`}>{goalStatusLabels[p.status]}</span><small>{g.subject}</small></div><h3>{g.text}</h3>{p.rows.length ? <GoalChart goal={g} rows={p.rows} need={p.need} /> : <p className="muted">لا توجد ملاحظات بعد. خط الأساس: {g.baseline || 'لم يُوثَّق'}</p>}
      {p.status === 'met' && <p className="info-note">{p.generalized ? 'البيانات تشير إلى تحقق المعيار في أكثر من موقف. يمكنك الاعتماد.' : 'البيانات تشير إلى تحقق المعيار في موقف واحد. سجّل ملاحظة في مكان آخر أو مع شخص آخر قبل الاعتماد.'}</p>}{p.status === 'review' && <p className="info-note">الأرقام لم تتغير كثيرًا. قد يفيد تغيير الطريقة أو الوسيلة أو خطوات الهدف.</p>}
      {p.status === 'training' && p.teaching.length > 0 && p.contexts < 2 && <p className="muted"><Shuffle size={14} aria-hidden="true" /> جرّب المهارة في مكان آخر أو مع شخص آخر، ليظهر التعميم على الرسم.</p>}
      {g.approvedAt && p.probeDue && <p className="info-note probe-due">حان قياس الاحتفاظ: هل بقيت المهارة بعد الاعتماد؟ <button className="text-link" onClick={() => setRecording({ learner: l, goal: g, phase: 'maintenance' })}>سجّل قياسًا</button></p>}{g.approvedAt && p.held === false && <p className="alert">قياس الاحتفاظ تحت المعيار. قد تحتاج المهارة إلى مراجعة قصيرة.</p>}{g.approvedAt && p.held && <p className="muted">المهارة باقية بعد الاعتماد.</p>}
      <div className="goal-card-actions"><button className="button secondary" onClick={() => setRecording({ learner: l, goal: g })}><ClipboardPen size={16} />تسجيل ملاحظة</button>{p.status === 'met' && <button className={`button ${p.generalized ? 'primary' : 'secondary'}`} onClick={async () => { if (!p.generalized && !await confirmDialog('لم تُسجَّل المهارة بعد في موقف ثانٍ. تعتمد التحقق على أي حال؟', { ok: 'أعتمد', danger: false })) return; setGoal(l, g, { approvedAt: today() }); notify('اعتمدت تحقق الهدف. سيُطلب قياس احتفاظ بعد أسبوعين.'); }}><CheckCircle2 size={16} />أعتمد التحقق</button>}{g.approvedAt && <Link className="button secondary" to={`/learners/${l.id}/certificate/${g.id}`}><Award size={16} />شهادة إنجاز</Link>}{g.approvedAt && <button className="button secondary" onClick={() => setGoal(l, g, { approvedAt: undefined })}><RotateCcw size={16} />إلغاء الاعتماد</button>}</div></article>; })}</div></div>)}
    {recording && <RecordGoal learner={recording.learner} goal={recording.goal} phase={recording.phase} onClose={() => setRecording(null)} />}</section>;
}
