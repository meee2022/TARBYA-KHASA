import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Check, ClipboardCheck, ClipboardList, ListChecks, Pencil, Plus, Printer, Settings2, Target, Trash2, UserRound, Users } from 'lucide-react';
import { countOf, dateLabel, uid, type Learner } from '../../packages/domain';
import { attendanceSummary, defaultTimetable, latestLevels, levelLabels, markLabels, marks, notices, priorityLabels, schoolDay, weekDays, type AttendanceMark, type Group, type PerformanceEntry, type Task, type TaskPriority, type Timetable, type TimetableSlot } from '../../packages/domain/desk';
import { checkIep, today } from '../../packages/domain/planning';
import { confirmDialog } from './confirm';
import { Chip } from './fields';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { Avatar, Empty, PageHeading } from './Workspace';
import './desk.css';

const first = (l: Learner) => l.name.split(/\s·/)[0];
function LearnerChips({ learners, value, onChange }: { learners: Learner[]; value: string[]; onChange: (ids: string[]) => void }) {
  return <div className="seg" role="group" aria-label="الطالبات"><span className="seg-label">الطالبات</span>{learners.length ? <div className="option-chips">{learners.map(l => <Chip key={l.id} on={value.includes(l.id)} label={first(l)} onClick={() => onChange(value.includes(l.id) ? value.filter(x => x !== l.id) : [...value, l.id])} />)}</div> : <small className="seg-hint">أضيفي طالبة من «قائمة الطالبات» أولًا.</small>}</div>;
}

/** The week on one page: periods down, days across. A cell holds the subject, the place and who attends. */
export function TimetablePage() {
  const { data, saveDesk } = useWorkspace(); const { site } = useSiteConfig();
  const table = data.desk?.timetable ?? defaultTimetable(); const [cell, setCell] = useState<{ day: number; period: number } | null>(null); const [setup, setSetup] = useState(false);
  const now = schoolDay(today()); const save = (t: Timetable) => saveDesk({ timetable: t });
  const at = (day: number, period: number) => table.slots.find(s => s.day === day && s.period === period);
  const put = (slot: TimetableSlot | null) => { if (!cell) return; save({ ...table, slots: [...table.slots.filter(s => !(s.day === cell.day && s.period === cell.period)), ...(slot ? [slot] : [])] }); setCell(null); };
  const filled = table.slots.filter(s => s.period < table.periods).length;
  return <>
    <PageHeading title="جدول الحصص الأسبوعي" description="حصصك من الأحد إلى الخميس. اضغطي أي خانة لتكتبي المادة والمكان والطالبات."><button className="button secondary" onClick={() => setSetup(s => !s)}><Settings2 size={17} />عدد الحصص وأوقاتها</button><button className="button secondary" onClick={() => window.print()}><Printer size={17} />طباعة</button></PageHeading>
    {setup && <section className="panel desk-panel no-print"><div className="section-heading"><h2>عدد الحصص وأوقاتها</h2></div><div className="form-grid"><label>عدد الحصص في اليوم<input type="number" min="1" max="10" value={table.periods} onChange={e => save({ ...table, periods: Math.max(1, Math.min(10, e.target.valueAsNumber || 1)) })} /></label><label>بداية كل حصة، بفاصلة بين وقت وآخر<input dir="ltr" value={table.times.join(', ')} onChange={e => save({ ...table, times: e.target.value.split(/[,،]/).map(x => x.trim().slice(0, 12)).filter(Boolean).slice(0, 10) })} placeholder="7:10, 7:55, 8:40" /></label></div></section>}
    <section className="panel desk-panel"><div className="section-heading"><h2>هذا الأسبوع</h2><span className="desk-count">{countOf(filled, 'حصة', 'حصتان', 'حصص')}</span></div>
      <div className="desk-scroll"><table className="data-table timetable"><thead><tr><th scope="col">الحصة</th>{weekDays.map((d, i) => <th key={d} scope="col" className={i === now ? 'is-today' : ''}>{d}{i === now && <small>اليوم</small>}</th>)}</tr></thead>
        <tbody>{Array.from({ length: table.periods }, (_, p) => <tr key={p}><th scope="row"><strong>{p + 1}</strong>{table.times[p] && <small dir="ltr">{table.times[p]}</small>}</th>{weekDays.map((d, day) => { const s = at(day, p); const who = s ? data.learners.filter(l => s.learnerIds.includes(l.id)) : [];
          return <td key={d} className={day === now ? 'is-today' : ''}><button type="button" className={`slot ${s ? 'is-filled' : ''} ${cell?.day === day && cell.period === p ? 'is-open' : ''}`} onClick={() => setCell({ day, period: p })} aria-label={s ? `${d}، الحصة ${p + 1}: ${s.subject}. تعديل` : `${d}، الحصة ${p + 1}: فارغة. إضافة`}>{s ? <><strong>{s.subject}</strong>{s.place && <small>{s.place}</small>}{who.length > 0 && <span>{who.map(first).join('، ')}</span>}</> : <Plus size={16} aria-hidden="true" />}</button></td>; })}</tr>)}</tbody></table></div>
    </section>
    {cell && <SlotForm key={`${cell.day}-${cell.period}`} title={`${weekDays[cell.day]} · الحصة ${cell.period + 1}`} slot={at(cell.day, cell.period)} day={cell.day} period={cell.period} learners={data.learners} subjects={site.catalog.subjects} places={site.catalog.settings} lessons={data.lessons.map(l => ({ id: l.id, title: l.title || 'درس بلا عنوان' }))} onSave={put} onClose={() => setCell(null)} />}
  </>;
}
function SlotForm({ title, slot, day, period, learners, subjects, places, lessons, onSave, onClose }: { title: string; slot?: TimetableSlot; day: number; period: number; learners: Learner[]; subjects: string[]; places: string[]; lessons: { id: string; title: string }[]; onSave: (slot: TimetableSlot | null) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<TimetableSlot>(slot ?? { id: uid(), day, period, subject: '', place: '', learnerIds: [] });
  return <form className="panel desk-panel desk-form no-print" ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })} onSubmit={e => { e.preventDefault(); if (draft.subject.trim()) onSave({ ...draft, subject: draft.subject.trim(), place: draft.place.trim() }); }}>
    <div className="section-heading"><h2>{title}</h2></div>
    <div className="form-grid"><label>المادة أو النشاط<input required autoFocus maxLength={120} list="slot-subjects" value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} /><datalist id="slot-subjects">{subjects.map(s => <option key={s} value={s} />)}</datalist></label><label>المكان<input maxLength={120} list="slot-places" value={draft.place} onChange={e => setDraft({ ...draft, place: e.target.value })} /><datalist id="slot-places">{places.map(s => <option key={s} value={s} />)}</datalist></label><label>الدرس المحضّر لهذه الحصة<select value={draft.lessonId ?? ''} onChange={e => setDraft({ ...draft, lessonId: e.target.value || undefined })}><option value="">بلا ربط</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label></div>
    <LearnerChips learners={learners} value={draft.learnerIds} onChange={ids => setDraft({ ...draft, learnerIds: ids })} />
    <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ الحصة</button>{slot && <button type="button" className="button secondary" onClick={() => onSave(null)}><Trash2 size={16} />تفريغ الخانة</button>}{draft.lessonId && <Link className="button secondary" to={`/lessons/${draft.lessonId}`}>فتح الدرس<ArrowLeft size={16} /></Link>}<button type="button" className="button secondary" onClick={onClose}>إلغاء</button></div>
  </form>;
}

/** Her own to-do list, and beside it the work the platform knows is unfinished, so nothing is typed twice. */
export function TasksPage() {
  const { data, saveDesk } = useWorkspace(); const tasks = data.desk?.tasks ?? []; const now = today();
  const [title, setTitle] = useState(''); const [priority, setPriority] = useState<TaskPriority>('mid'); const [scope, setScope] = useState<Task['scope']>('daily'); const [due, setDue] = useState(now);
  const save = (next: Task[]) => saveDesk({ tasks: next });
  const add = (e: FormEvent) => { e.preventDefault(); if (!title.trim()) return; save([{ id: uid(), title: title.trim(), scope, priority, due, done: false }, ...tasks]); setTitle(''); };
  const order = { high: 0, mid: 1, low: 2 }; const open = tasks.filter(t => !t.done).sort((a, b) => order[a.priority] - order[b.priority] || a.due.localeCompare(b.due)); const done = tasks.filter(t => t.done);
  const unfinished = [...data.lessons.filter(l => l.status === 'draft').map(l => ({ id: `l-${l.id}`, text: `تحضير لم يُرسل للمراجعة: ${l.title || 'درس بلا عنوان'}`, to: `/lessons/${l.id}/edit` })), ...data.lessons.filter(l => l.status === 'review').map(l => ({ id: `r-${l.id}`, text: `تحضير ينتظر المراجعة: ${l.title}`, to: '/review' })), ...(data.ieps ?? []).filter(p => checkIep(p).length > 0).map(p => ({ id: `p-${p.learnerId}`, text: `خطة فردية ناقصة: ${data.learners.find(l => l.id === p.learnerId)?.name ?? 'طالبة'}`, to: `/iep/${p.learnerId}` }))];
  const row = (t: Task) => <li key={t.id} className={t.done ? 'is-done' : ''}><button type="button" role="checkbox" aria-checked={t.done} aria-label={`${t.done ? 'إعادة فتح' : 'إنهاء'} المهمة: ${t.title}`} className="kit-check" onClick={() => save(tasks.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}>{t.done && <Check size={16} />}</button><div><strong>{t.title}</strong><small><span className={`task-priority is-${t.priority}`}>{priorityLabels[t.priority]}</span>{t.scope === 'daily' ? 'يومية' : 'أسبوعية'}{t.due && <span className={!t.done && t.due < now ? 'is-late' : ''}> · {dateLabel(t.due)}{!t.done && t.due < now ? ' · تجاوزت موعدها' : ''}</span>}</small></div><button type="button" className="icon-button" aria-label={`حذف المهمة: ${t.title}`} onClick={() => save(tasks.filter(x => x.id !== t.id))}><Trash2 size={16} /></button></li>;
  return <>
    <PageHeading title="المهام والأعمال غير المكتملة" description="مهامك التي تكتبينها، وما تعرف المنصة أنه لم يكتمل من تحاضير وخطط." />
    <div className="desk-two"><div>
      <form className="panel desk-panel desk-form" onSubmit={add}><div className="section-heading"><h2>مهمة جديدة</h2></div><label>ما المطلوب؟<input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="مثلًا: طباعة بطاقات درس الأحد" /></label><div className="form-grid"><label>الأولوية<select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>{(Object.keys(priorityLabels) as TaskPriority[]).map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}</select></label><label>النوع<select value={scope} onChange={e => setScope(e.target.value as Task['scope'])}><option value="daily">يومية</option><option value="weekly">أسبوعية</option></select></label><label>الموعد<input type="date" value={due} onChange={e => setDue(e.target.value)} /></label></div><div><button className="button primary" disabled={!title.trim()}><Plus size={17} />أضيفي المهمة</button></div></form>
      <section className="panel desk-panel"><div className="section-heading"><h2>مهامي</h2><span className="desk-count">{countOf(open.length, 'مهمة مفتوحة', 'مهمتان مفتوحتان', 'مهام مفتوحة')}</span></div>{tasks.length ? <ul className="desk-list task-list">{open.map(row)}{done.map(row)}</ul> : <Empty title="لا مهام بعد" description="اكتبي أول مهمة في النموذج أعلاه، وتبقى معك حتى تنهيها." />}</section>
    </div><aside className="panel desk-panel"><div className="section-heading"><h2>أعمال لم تكتمل</h2><ListChecks size={20} aria-hidden="true" /></div>{unfinished.length ? <ul className="desk-list">{unfinished.map(u => <li key={u.id}><Link to={u.to}><span>{u.text}</span><ArrowLeft size={16} aria-hidden="true" /></Link></li>)}</ul> : <p className="muted desk-note">كل التحاضير والخطط مكتملة الآن.</p>}</aside></div>
  </>;
}

const noticeIcon = { register: ClipboardCheck, goal: Target, review: ListChecks, task: CalendarClock, pupil: UserRound, plan: ClipboardList };
/** Alerts worked out from the teacher's own data: the register, goals left unmeasured, work waiting for review. */
export function NotificationsPage() {
  const { data } = useWorkspace(); const list = notices(data, today());
  return <>
    <PageHeading title="التنبيهات والإشعارات" description="ما يحتاج انتباهك اليوم، محسوبًا من بياناتك أنتِ. لا يُرسل شيء خارج المنصة." />
    <section className="panel desk-panel"><div className="section-heading"><h2>اليوم</h2><span className="desk-count">{countOf(list.length, 'تنبيه', 'تنبيهان', 'تنبيهات')}</span></div>{list.length ? <ul className="desk-list notice-list">{list.map((n, i) => { const Icon = noticeIcon[n.kind]; return <li key={n.id} style={{ '--i': i } as React.CSSProperties}><Link to={n.to}><Icon size={20} aria-hidden="true" /><span>{n.text}</span><ArrowLeft size={16} aria-hidden="true" /></Link></li>; })}</ul> : <Empty title="لا تنبيهات الآن" description="سُجّل الحضور، والأهداف مقيسة حديثًا، ولا تحضير ينتظر." />}</section>
  </>;
}
export const useNoticeCount = () => { const { data } = useWorkspace(); return notices(data, today()).length; };

/** Groups and classes: who learns together, and the defaults a new preparation for them starts from. */
export function GroupsPage() {
  const { data, saveDesk } = useWorkspace(); const { site } = useSiteConfig(); const groups = data.desk?.groups ?? [];
  const blank = (): Group => ({ id: uid(), name: '', grade: site.catalog.grades[0] ?? '', learnerIds: [], subject: site.catalog.subjects[0] ?? '', sessions: 5, minutes: 40, support: site.catalog.supportLevels[0] ?? '' });
  const [draft, setDraft] = useState<Group | null>(null);
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft?.name.trim()) return; const g = { ...draft, name: draft.name.trim() }; saveDesk({ groups: groups.some(x => x.id === g.id) ? groups.map(x => x.id === g.id ? g : x) : [...groups, g] }); setDraft(null); };
  return <>
    <PageHeading title="المجموعات والفصول" description="من يتعلمن معًا، والمادة وعدد الجلسات ومدتها لكل مجموعة."><button className="button primary" onClick={() => setDraft(blank())}><Plus size={17} />مجموعة جديدة</button></PageHeading>
    {draft && <form className="panel desk-panel desk-form" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{groups.some(g => g.id === draft.id) ? 'تعديل المجموعة' : 'مجموعة جديدة'}</h2></div>
      <div className="form-grid"><label>اسم المجموعة أو الفصل<input required autoFocus maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="مثلًا: مجموعة القراءة أ" /></label><label>الصف<select value={draft.grade} onChange={e => setDraft({ ...draft, grade: e.target.value })}>{site.catalog.grades.map(g => <option key={g}>{g}</option>)}</select></label><label>المادة<select value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })}>{site.catalog.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>مستوى الدعم<select value={draft.support} onChange={e => setDraft({ ...draft, support: e.target.value })}>{site.catalog.supportLevels.map(s => <option key={s}>{s}</option>)}</select></label><label>عدد الجلسات في الأسبوع<input type="number" min="1" max="10" value={draft.sessions} onChange={e => setDraft({ ...draft, sessions: e.target.valueAsNumber || 1 })} /></label><label>مدة الجلسة بالدقائق<input type="number" min="5" max="180" value={draft.minutes} onChange={e => setDraft({ ...draft, minutes: e.target.valueAsNumber || 5 })} /></label></div>
      <LearnerChips learners={data.learners} value={draft.learnerIds} onChange={ids => setDraft({ ...draft, learnerIds: ids })} />
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ المجموعة</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {groups.length ? <div className="group-grid">{groups.map((g, i) => { const who = data.learners.filter(l => g.learnerIds.includes(l.id)); return <article className="panel group-card" key={g.id} style={{ '--i': i } as React.CSSProperties}>
      <header><span className="group-mark" aria-hidden="true"><Users size={22} /></span><div><h2>{g.name}</h2><p className="muted">الصف {g.grade} · {g.subject}</p></div></header>
      <div className="group-avatars">{who.length ? who.map(l => <Link key={l.id} to={`/learners/${l.id}`} title={l.name}><Avatar learner={l} size="small" /><span>{first(l)}</span></Link>) : <span className="muted">لا طالبات بعد</span>}</div>
      <p className="group-meta"><span>{countOf(g.sessions, 'جلسة', 'جلستان', 'جلسات')} في الأسبوع</span><span>{g.minutes} دقيقة</span>{g.support && <span>{g.support}</span>}</p>
      <div className="heading-actions"><button className="button secondary" onClick={() => setDraft(g)}><Pencil size={16} />تعديل</button><button className="button secondary" onClick={async () => { if (await confirmDialog(`حذف المجموعة «${g.name}»؟ ملفات الطالبات تبقى كما هي.`, { ok: 'حذف المجموعة' })) saveDesk({ groups: groups.filter(x => x.id !== g.id) }); }}><Trash2 size={16} />حذف</button></div>
    </article>; })}</div> : !draft && <section className="panel desk-panel"><Empty title="لا مجموعات بعد" description="أنشئي مجموعة لطالبات يتعلمن معًا، فتجدينها جاهزة عند التحضير والحضور." /></section>}
  </>;
}

/** The daily register, one tap per pupil, and the month in numbers. */
export function AttendancePage() {
  const { data, saveDesk } = useWorkspace(); const days = data.desk?.attendance ?? []; const [date, setDate] = useState(today());
  const record = days.find(d => d.date === date); const month = date.slice(0, 7);
  const write = (marksOfDay: Record<string, { mark: AttendanceMark; note?: string }>) => saveDesk({ attendance: [...days.filter(d => d.date !== date), { date, marks: marksOfDay }].sort((a, b) => a.date.localeCompare(b.date)).slice(-400) });
  const set = (id: string, mark: AttendanceMark) => write({ ...record?.marks, [id]: { ...record?.marks[id], mark } });
  const taken = data.learners.filter(l => record?.marks[l.id]).length;
  return <>
    <PageHeading title="الحضور اليومي" description="ضغطة واحدة لكل طالبة، وملخص الشهر في الأسفل."><button className="button secondary" onClick={() => window.print()}><Printer size={17} />طباعة</button></PageHeading>
    {data.learners.length ? <>
      <section className="panel desk-panel"><div className="section-heading"><h2>سجل اليوم</h2><span className="desk-count">{taken} من {data.learners.length}</span></div>
        <div className="attendance-bar no-print"><label>التاريخ<input type="date" value={date} max={today()} onChange={e => e.target.value && setDate(e.target.value)} /></label><button className="button secondary" onClick={() => write(Object.fromEntries(data.learners.map(l => [l.id, { ...record?.marks[l.id], mark: 'present' as const }])))}><Check size={17} />الكل حاضرات</button></div>
        <ul className="desk-list attendance-list">{data.learners.map(l => { const m = record?.marks[l.id]; return <li key={l.id}><Link to={`/learners/${l.id}`} className="attendance-who"><Avatar learner={l} size="small" /><strong>{l.name}</strong></Link><div className="segmented attendance-marks" role="group" aria-label={`حضور ${l.name}`}>{marks.map(k => <button key={k} type="button" aria-pressed={m?.mark === k} className={m?.mark === k ? `active is-${k}` : ''} onClick={() => set(l.id, k)}>{markLabels[k]}</button>)}</div><input className="attendance-note" aria-label={`ملاحظة على حضور ${l.name}`} placeholder="ملاحظة" maxLength={200} disabled={!m} value={m?.note ?? ''} onChange={e => m && write({ ...record!.marks, [l.id]: { ...m, note: e.target.value || undefined } })} /></li>; })}</ul>
      </section>
      <section className="panel desk-panel"><div className="section-heading"><h2>ملخص الشهر</h2><span className="muted" dir="ltr">{month}</span></div>
        <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">الطالبة</th><th scope="col">أيام مسجلة</th>{marks.map(k => <th key={k} scope="col">{markLabels[k]}</th>)}<th scope="col">نسبة الحضور</th></tr></thead><tbody>{data.learners.map(l => { const s = attendanceSummary(days, l.id, month); return <tr key={l.id}><th scope="row">{l.name}</th><td>{s.recorded}</td>{marks.map(k => <td key={k}>{s[k]}</td>)}<td>{s.rate === null ? <span className="muted">لا تسجيل</span> : <span className={`rate ${s.rate < 80 ? 'is-low' : ''}`}>{s.rate}%</span>}</td></tr>; })}</tbody></table></div>
        <p className="muted desk-note">النسبة = الحاضرة والمتأخرة من الأيام المسجلة. اليوم الذي لم يُسجَّل لا يدخل في الحساب.</p></section>
    </> : <section className="panel desk-panel"><Empty title="لا طالبات بعد" description="أضيفي طالباتك من «قائمة الطالبات» ليظهر سجل الحضور." /></section>}
  </>;
}

/** Where a pupil stands in each skill today: the latest reading per skill, and the readings before it. */
export function PerformancePage() {
  const { data, saveDesk } = useWorkspace(); const { site } = useSiteConfig(); const all = data.desk?.performance ?? []; const now = today();
  const [learnerId, setLearnerId] = useState(data.learners[0]?.id ?? ''); const learner = data.learners.find(l => l.id === learnerId);
  const blank = (): PerformanceEntry => ({ id: uid(), learnerId, domain: site.catalog.performanceDomains[0] ?? '', skill: '', level: 3, tool: site.catalog.assessmentTools[0] ?? '', date: now, note: '' });
  const [draft, setDraft] = useState<PerformanceEntry | null>(null);
  const latest = latestLevels(all, learnerId, now); const history = all.filter(e => e.learnerId === learnerId).sort((a, b) => b.date.localeCompare(a.date));
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft?.skill.trim()) return; saveDesk({ performance: [...all, { ...draft, learnerId, skill: draft.skill.trim(), note: draft.note.trim() }].slice(-3000) }); setDraft(null); };
  return <>
    <PageHeading title="مستويات الأداء الحالية" description="آخر قياس لكل مهارة عند كل طالبة. المستوى يصف مقدار المساعدة اليوم، ولا يقارن طالبة بأخرى.">{learner && <button className="button primary" onClick={() => setDraft(blank())}><Plus size={17} />تسجيل مستوى</button>}</PageHeading>
    {data.learners.length ? <>
      <section className="panel desk-panel"><label className="desk-pick">الطالبة<select value={learnerId} onChange={e => { setLearnerId(e.target.value); setDraft(null); }}>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label></section>
      {draft && <form className="panel desk-panel desk-form" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>تسجيل مستوى لـ{learner ? first(learner) : 'الطالبة'}</h2></div>
        <div className="form-grid"><label>المجال<select value={draft.domain} onChange={e => setDraft({ ...draft, domain: e.target.value })}>{site.catalog.performanceDomains.map(d => <option key={d}>{d}</option>)}</select></label><label>المهارة<input required autoFocus maxLength={160} value={draft.skill} onChange={e => setDraft({ ...draft, skill: e.target.value })} placeholder="مثلًا: تمييز صوت الحرف في أول الكلمة" /></label><label>المستوى<select value={draft.level} onChange={e => setDraft({ ...draft, level: Number(e.target.value) })}>{levelLabels.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}</select></label><label>النسبة ٪ (اختياري)<input type="number" min="0" max="100" value={draft.percent ?? ''} onChange={e => setDraft({ ...draft, percent: e.target.value === '' ? undefined : Math.max(0, Math.min(100, e.target.valueAsNumber || 0)) })} /></label><label>أداة التقييم<select value={draft.tool} onChange={e => setDraft({ ...draft, tool: e.target.value })}>{site.catalog.assessmentTools.map(t => <option key={t}>{t}</option>)}</select></label><label>التاريخ<input type="date" max={now} value={draft.date} onChange={e => e.target.value && setDraft({ ...draft, date: e.target.value })} /></label></div>
        <label>ملاحظات<textarea rows={2} maxLength={400} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label>
        <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ المستوى</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
      <section className="panel desk-panel"><div className="section-heading"><h2>المستوى الحالي</h2><span className="desk-count">{countOf(latest.length, 'مهارة', 'مهارتان', 'مهارات')}</span></div>
        {latest.length ? <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">المجال</th><th scope="col">المهارة</th><th scope="col">المستوى</th><th scope="col">النسبة</th><th scope="col">الأداة</th><th scope="col">التاريخ</th></tr></thead><tbody>{latest.map(e => <tr key={e.id}><td>{e.domain}</td><th scope="row">{e.skill}</th><td><span className={`level-pill is-${e.level}`}>{levelLabels[e.level - 1]}</span></td><td>{e.percent === undefined ? <span className="muted">لم تُسجَّل</span> : `${e.percent}%`}</td><td>{e.tool}</td><td>{dateLabel(e.date)}{e.stale && <span className="stale-pill">قديم، يُعاد قياسه</span>}</td></tr>)}</tbody></table></div> : <Empty title="لا مستويات مسجلة بعد" description="سجّلي أول مستوى لمهارة واحدة، فيظهر هنا ويُستفاد منه في الخطة والتحضير." />}
        {history.length > latest.length && <details className="desk-history"><summary>السجل الكامل ({history.length})</summary><ul className="desk-list">{history.map(e => <li key={e.id}><div><strong>{e.skill}</strong><small>{e.domain} · {levelLabels[e.level - 1]} · {dateLabel(e.date)}{e.note ? ` · ${e.note}` : ''}</small></div><button type="button" className="icon-button" aria-label={`حذف قياس ${e.skill} بتاريخ ${e.date}`} onClick={() => saveDesk({ performance: all.filter(x => x.id !== e.id) })}><Trash2 size={16} /></button></li>)}</ul></details>}
      </section>
    </> : <section className="panel desk-panel"><Empty title="لا طالبات بعد" description="أضيفي طالباتك من «قائمة الطالبات» لتسجّلي مستوياتهن." /></section>}
  </>;
}
