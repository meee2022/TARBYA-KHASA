import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Award, Check, CheckCircle2, ExternalLink, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { countOf, dateLabel, uid, type Learner } from '../../packages/domain';
import { portfolioSections, trainingHours, type Evidence, type PortfolioItem, type PortfolioSection } from '../../packages/domain/records';
import { today } from '../../packages/domain/planning';
import { confirmDialog } from './confirm';
import { useWorkspace } from './store';
import { Avatar, Empty, PageHeading } from './Workspace';
import './planning.css';
import './desk.css';

const first = (l: Learner) => l.name.split(/\s·/)[0];
const safe = (url?: string) => !!url && /^https?:\/\//i.test(url);

/** Evidence of each pupil's learning, tied to a goal where there is one. */
function EvidenceTab() {
  const { data, saveDesk, notify } = useWorkspace(); const all = data.desk?.evidence ?? []; const now = today();
  const [who, setWho] = useState(''); const [draft, setDraft] = useState<Evidence | null>(null);
  const blank = (): Evidence => ({ id: uid(), learnerId: who || data.learners[0]?.id || '', title: '', date: now, note: '', reviewed: false });
  const store = (next: Evidence[]) => saveDesk({ evidence: next });
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft?.title.trim() || !draft.learnerId) return; const item = { ...draft, title: draft.title.trim(), note: draft.note.trim(), link: draft.link?.trim() || undefined, goalId: draft.goalId || undefined }; store(all.some(x => x.id === item.id) ? all.map(x => x.id === item.id ? item : x) : [item, ...all]); setDraft(null); notify('حُفظ الدليل في ملف الإنجاز'); };
  const shown = all.filter(e => !who || e.learnerId === who).sort((a, b) => b.date.localeCompare(a.date)); const goals = data.learners.find(l => l.id === draft?.learnerId)?.goals ?? [];
  if (!data.learners.length) return <section className="panel desk-panel"><Empty title="أضف ملف طالب أولًا" description="أدلة التعلّم تُحفظ في ملف إنجاز طالب بعينه، فأضفه من «قائمة الطلاب» ثم عُد." /></section>;
  return <>
    <section className="panel desk-panel no-print"><div className="form-grid record-bar"><label>الطالب<select value={who} onChange={e => setWho(e.target.value)}><option value="">كل الطلاب</option>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><div className="heading-actions"><button className="button primary" onClick={() => setDraft(blank())}><Plus size={17} />دليل جديد</button></div></div></section>
    {draft && <form className="panel desk-panel desk-form no-print" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{all.some(x => x.id === draft.id) ? 'تعديل الدليل' : 'دليل إنجاز جديد'}</h2></div>
      <div className="form-grid"><label>الطالب<select value={draft.learnerId} onChange={e => setDraft({ ...draft, learnerId: e.target.value, goalId: undefined })}>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>العنوان<input required autoFocus maxLength={160} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="مثلًا: ورقة عمل مطابقة الحروف" /></label><label>التاريخ<input type="date" max={now} value={draft.date} onChange={e => e.target.value && setDraft({ ...draft, date: e.target.value })} /></label><label>الهدف المرتبط<select value={draft.goalId ?? ''} onChange={e => setDraft({ ...draft, goalId: e.target.value || undefined })}><option value="">بلا هدف محدد</option>{goals.map(g => <option key={g.id} value={g.id}>{g.text}</option>)}</select></label></div>
      <label>الوصف<small>ماذا فعل الطالب، وبأي قدر من المساعدة</small><textarea rows={3} maxLength={800} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label>
      <label>رابط (اختياري)<small>الصور والملفات تبقى عندك؛ ضع رابطها إن كانت في مكان محفوظ</small><input dir="ltr" type="url" maxLength={500} value={draft.link ?? ''} onChange={e => setDraft({ ...draft, link: e.target.value })} placeholder="https://" /></label>
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ الدليل</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {shown.length ? <ul className="record-list">{shown.map((e, i) => { const learner = data.learners.find(l => l.id === e.learnerId); const goal = learner?.goals.find(g => g.id === e.goalId); return <li className="panel record-card" key={e.id} style={{ '--i': i } as React.CSSProperties}>
      <header>{learner && <Link to={`/learners/${learner.id}`}><Avatar learner={learner} size="small" /></Link>}<div><h2>{e.title}</h2><p className="muted">{learner ? first(learner) : 'طالب محذوف'} · {dateLabel(e.date)}</p></div><span className={`plan-state ${e.reviewed ? 'ok' : ''}`}>{e.reviewed ? 'مراجَع' : 'ينتظر المراجعة'}</span></header>
      {goal && <p className="record-goal"><strong>الهدف:</strong> {goal.text}</p>}{e.note && <p>{e.note}</p>}
      <div className="heading-actions no-print">{safe(e.link) && <a className="button secondary" href={e.link} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />فتح الرابط</a>}<button className="button secondary" onClick={() => store(all.map(x => x.id === e.id ? { ...x, reviewed: !x.reviewed } : x))}><CheckCircle2 size={16} />{e.reviewed ? 'تراجع عن المراجعة' : 'راجعته'}</button><button className="button secondary" onClick={() => setDraft(e)}><Pencil size={16} />تعديل</button><button className="button secondary" onClick={async () => { if (await confirmDialog(`حذف الدليل «${e.title}»؟`, { ok: 'حذف الدليل' })) store(all.filter(x => x.id !== e.id)); }}><Trash2 size={16} />حذف</button></div>
    </li>; })}</ul> : !draft && <section className="panel desk-panel"><Empty title="لا أدلة بعد" description="سجّل ما يدل على تعلّم الطالب: ورقة عمل، أداء عملي، أو ملاحظة، واربطه بهدفه الفردي." /></section>}
  </>;
}

/** The teacher's own portfolio: training, initiatives, recognition and samples of work, ready to print for the yearly appraisal. */
function TeacherTab() {
  const { data, saveDesk, notify } = useWorkspace(); const all = data.desk?.portfolio ?? []; const now = today(); const year = now.slice(0, 4);
  const [draft, setDraft] = useState<PortfolioItem | null>(null);
  const store = (next: PortfolioItem[]) => saveDesk({ portfolio: next });
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft?.title.trim()) return; const item = { ...draft, title: draft.title.trim(), note: draft.note.trim(), hours: draft.section === 'courses' ? draft.hours : undefined }; store(all.some(x => x.id === item.id) ? all.map(x => x.id === item.id ? item : x) : [item, ...all]); setDraft(null); notify('أُضيف إلى ملف إنجازك'); };
  const hours = trainingHours(all, year);
  return <>
    <section className="panel desk-panel"><div className="section-heading"><h2>ملف إنجاز المعلم</h2><span className="desk-count">{countOf(all.length, 'عنصر', 'عنصران', 'عناصر')}</span></div>
      <p className="record-summary"><span><Award size={18} aria-hidden="true" />{hours ? `${hours} ساعة تدريبية في ${year}` : `لا ساعات تدريبية مسجلة في ${year}`}</span></p>
      <div className="heading-actions no-print"><button className="button primary" onClick={() => setDraft({ id: uid(), section: 'courses', title: '', date: now, note: '' })}><Plus size={17} />إضافة إنجاز</button><button className="button secondary" onClick={() => window.print()}><Printer size={17} />طباعة الملف</button></div></section>
    {draft && <form className="panel desk-panel desk-form no-print" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{all.some(x => x.id === draft.id) ? 'تعديل الإنجاز' : 'إنجاز جديد'}</h2></div>
      <div className="form-grid"><label>القسم<select value={draft.section} onChange={e => setDraft({ ...draft, section: e.target.value as PortfolioSection })}>{(Object.keys(portfolioSections) as PortfolioSection[]).map(k => <option key={k} value={k}>{portfolioSections[k]}</option>)}</select></label><label>العنوان<input required autoFocus maxLength={160} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="مثلًا: دورة التواصل البديل" /></label><label>التاريخ<input type="date" value={draft.date} onChange={e => e.target.value && setDraft({ ...draft, date: e.target.value })} /></label>{draft.section === 'courses' && <label>عدد الساعات<input type="number" min={0} max={1000} value={draft.hours ?? ''} onChange={e => setDraft({ ...draft, hours: e.target.value === '' ? undefined : Math.max(0, Math.min(1000, e.target.valueAsNumber || 0)) })} /></label>}</div>
      <label>تفاصيل<textarea rows={3} maxLength={800} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="الجهة، وما طبّقته في صفك" /></label>
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {all.length ? (Object.keys(portfolioSections) as PortfolioSection[]).map(k => { const items = all.filter(i => i.section === k).sort((a, b) => b.date.localeCompare(a.date)); if (!items.length) return null; return <section className="panel desk-panel record-section" key={k}><div className="section-heading"><h2>{portfolioSections[k]}</h2><span className="desk-count">{items.length}</span></div>
      <ul className="desk-list">{items.map(i => <li key={i.id}><div><strong>{i.title}</strong><small>{dateLabel(i.date)}{i.hours ? ` · ${i.hours} ساعة` : ''}{i.note ? ` · ${i.note}` : ''}</small></div><button type="button" className="icon-button no-print" aria-label={`تعديل ${i.title}`} onClick={() => setDraft(i)}><Pencil size={16} /></button><button type="button" className="icon-button no-print" aria-label={`حذف ${i.title}`} onClick={async () => { if (await confirmDialog(`حذف «${i.title}» من ملف الإنجاز؟`, { ok: 'حذف' })) store(all.filter(x => x.id !== i.id)); }}><Trash2 size={16} /></button></li>)}</ul></section>; })
      : !draft && <section className="panel desk-panel"><Empty title="ملف إنجازك فارغ" description="وثّق دوراتك ومبادراتك وما كُرّمت به ونماذج من عملك، ليكون جاهزًا عند التقييم السنوي." /></section>}
  </>;
}

/** Portfolios: the pupils' evidence of learning and the teacher's own record of work. */
export function PortfolioPage() {
  const [tab, setTab] = useState<'pupils' | 'teacher'>('pupils');
  return <>
    <PageHeading title="ملفات الإنجاز" description="أدلة تعلّم كل طالب مرتبطة بأهدافه، وملف إنجازك أنت جاهز للطباعة عند التقييم السنوي." />
    <div className="session-tabs desk-tabs no-print" role="tablist" aria-label="ملفات الإنجاز">{([['pupils', 'إنجاز الطلاب'], ['teacher', 'إنجاز المعلم']] as const).map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{t}</button>)}</div>
    {tab === 'pupils' ? <EvidenceTab /> : <TeacherTab />}
  </>;
}
