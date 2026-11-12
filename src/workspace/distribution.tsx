import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarPlus, Check, ChevronLeft, FileDown, Plus, Printer, Trash2, Wand2 } from 'lucide-react';
import { countOf, dateLabel, uid } from '../../packages/domain';
import { createDistribution, distributionBody, distributionIssues, spreadUnits, TERM_WEEKS, termWeeks, type Distribution, type DistributionRow } from '../../packages/domain/distribution';
import { createPlan, today, weekOf } from '../../packages/domain/planning';
import { confirmDialog } from './confirm';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { Empty, PageHeading } from './Workspace';
import { downloadWord } from './word';
import './desk.css';

const clampWeek = (n: number, max: number) => Math.max(1, Math.min(max, Math.round(n) || 1));

/** The curriculum of one subject laid over the weeks of a term. Each week leads to its weekly preparation, so the term plan and the weekly work stay one thing. */
export function DistributionPage() {
  const { data, saveDesk, savePlan, notify } = useWorkspace(); const { site } = useSiteConfig(); const { catalog } = site; const navigate = useNavigate();
  const all = data.desk?.distributions ?? []; const [openId, setOpenId] = useState(all[0]?.id ?? ''); const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ grade: string; subject: string; termStart: string } | null>(null);
  const dist = all.find(d => d.id === openId) ?? all[0];
  const store = (next: Distribution[]) => saveDesk({ distributions: next });
  const update = (change: Partial<Distribution>) => dist && store(all.map(d => d.id === dist.id ? { ...d, ...change } : d));
  const setRow = (id: string, change: Partial<DistributionRow>) => dist && update({ rows: dist.rows.map(r => r.id === id ? { ...r, ...change } : r) });
  const create = (e: FormEvent) => { e.preventDefault(); if (!draft) return; const d = createDistribution(draft.grade, draft.subject, draft.termStart || today()); store([...all, d]); setOpenId(d.id); setDraft(null); notify('أُنشئ التوزيع. أضف الوحدات أو وزّعها من المنهج.'); };
  const units = dist ? catalog.units.filter(u => u.grade === dist.grade && u.subject === dist.subject) : [];
  const spread = async () => { if (!dist) return; if (dist.rows.length && !await confirmDialog('توزيع وحدات المنهج يستبدل الوحدات المكتوبة في هذا الجدول. متابعة؟', { ok: 'وزّع الوحدات', danger: false })) return; update({ rows: spreadUnits(units, dist.weeks) }); notify('وُزّعت وحدات المنهج على أسابيع الفصل. عدّل الأسابيع كما تريد.'); };
  const prepare = (start: string, topic: string) => { if (!dist) return; const plan = { ...createPlan(catalog, dist.subject, start), title: topic }; savePlan(plan); notify('بدأ تحضير هذا الأسبوع من التوزيع الفصلي.'); navigate(`/plans/${plan.id}`); };
  const word = async () => { if (!dist) return; setBusy(true); try { await downloadWord(`الخطة الفصلية ${dist.subject} الصف ${dist.grade}`, distributionBody(dist, catalog.units), 'خطة فصلية'); notify('نُزّل ملف Word'); } catch { notify('تعذّر إنشاء الملف. حاول مرة أخرى.'); } finally { setBusy(false); } };
  const weeks = dist ? termWeeks(dist, catalog.units, data.plans ?? []) : []; const issues = dist ? distributionIssues(dist) : []; const thisWeek = weekOf(today());
  return <>
    <PageHeading title="التوزيع الفصلي للمنهج" description="وزّع وحدات المادة على أسابيع الفصل، ومن كل أسبوع ابدأ تحضيره. الجدول يُطبع أو يُصدَّر Word.">
      <button className="button primary no-print" onClick={() => setDraft({ grade: catalog.grades[0] ?? '', subject: catalog.subjects[0] ?? '', termStart: today() })}><Plus size={17} />توزيع جديد</button>
      {dist && <><button className="button secondary no-print" disabled={busy} onClick={word}><FileDown size={17} />{busy ? 'جارٍ التجهيز…' : 'تصدير Word'}</button><button className="button secondary no-print" onClick={() => window.print()}><Printer size={17} />طباعة</button></>}
    </PageHeading>
    {draft && <form className="panel desk-panel desk-form no-print" onSubmit={create} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>توزيع جديد</h2></div>
      <div className="form-grid"><label>الصف<select value={draft.grade} onChange={e => setDraft({ ...draft, grade: e.target.value })}>{catalog.grades.map(g => <option key={g}>{g}</option>)}</select></label><label>المادة<select value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })}>{catalog.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>بداية الفصل<small>يبدأ العدّ من يوم الأحد في ذلك الأسبوع</small><input type="date" required value={draft.termStart} onChange={e => setDraft({ ...draft, termStart: e.target.value })} /></label></div>
      <div className="heading-actions"><button className="button primary"><Check size={17} />إنشاء التوزيع</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {dist ? <>
      <section className="panel desk-panel no-print"><div className="section-heading"><h2>{dist.subject} · الصف {dist.grade}</h2><span className="desk-count">{countOf(dist.rows.length, 'وحدة', 'وحدتان', 'وحدات')}</span></div>
        <div className="form-grid dist-settings">{all.length > 1 && <label>التوزيع<select value={dist.id} onChange={e => setOpenId(e.target.value)}>{all.map(d => <option key={d.id} value={d.id}>{d.subject} · الصف {d.grade}</option>)}</select></label>}<label>بداية الفصل<input type="date" value={dist.termStart} onChange={e => e.target.value && update({ termStart: weekOf(e.target.value) })} /></label><label>عدد الأسابيع<input type="number" min={TERM_WEEKS.min} max={TERM_WEEKS.max} value={dist.weeks} onChange={e => update({ weeks: Math.max(TERM_WEEKS.min, Math.min(TERM_WEEKS.max, e.target.valueAsNumber || TERM_WEEKS.usual)) })} /></label></div>
        {dist.rows.length > 0 && <div className="desk-scroll"><table className="data-table dist-rows"><thead><tr><th scope="col">الوحدة أو الموضوع</th><th scope="col">من الأسبوع</th><th scope="col">إلى الأسبوع</th><th scope="col"><span className="visually-hidden">حذف</span></th></tr></thead><tbody>{dist.rows.map(r => <tr key={r.id}><td><input aria-label="اسم الوحدة" maxLength={160} value={r.title} onChange={e => setRow(r.id, { title: e.target.value })} placeholder="مثلًا: الحروف القمرية" /></td><td><input aria-label={`أسبوع بداية ${r.title}`} type="number" min={1} max={dist.weeks} value={r.from} onChange={e => setRow(r.id, { from: clampWeek(e.target.valueAsNumber, TERM_WEEKS.max) })} /></td><td><input aria-label={`أسبوع نهاية ${r.title}`} type="number" min={1} max={dist.weeks} value={r.to} onChange={e => setRow(r.id, { to: clampWeek(e.target.valueAsNumber, TERM_WEEKS.max) })} /></td><td><button type="button" className="icon-button" aria-label={`حذف ${r.title || 'الوحدة'}`} onClick={() => update({ rows: dist.rows.filter(x => x.id !== r.id) })}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>}
        {issues.length > 0 && <div className="check-notes" role="status">{issues.map(i => <p key={i}>{i}</p>)}</div>}
        <div className="heading-actions"><button type="button" className="button secondary" onClick={() => { const from = Math.min(dist.weeks, Math.max(0, ...dist.rows.map(r => r.to)) + 1); update({ rows: [...dist.rows, { id: uid(), title: '', from, to: from }] }); }}><Plus size={16} />أضف وحدة</button>{units.length > 0 && <button type="button" className="button secondary" onClick={spread}><Wand2 size={16} />وزّع وحدات المنهج ({units.length})</button>}<button type="button" className="button secondary" onClick={async () => { if (await confirmDialog(`حذف توزيع ${dist.subject} للصف ${dist.grade}؟ التحضيرات الأسبوعية تبقى كما هي.`, { ok: 'حذف التوزيع' })) { store(all.filter(d => d.id !== dist.id)); setOpenId(''); } }}><Trash2 size={16} />حذف التوزيع</button></div>
        {!units.length && <p className="muted desk-note">لا وحدات لهذا الصف والمادة في مكتبة المناهج بعد، فاكتب الوحدات هنا. إدارة المنصة تضيف وحدات المنهج ودروسه.</p>}
      </section>
      <section className="panel desk-panel dist-term"><div className="section-heading"><h2>الخطة الفصلية</h2><span className="desk-count">{countOf(dist.weeks, 'أسبوع', 'أسبوعان', 'أسابيع')}</span></div>
        <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">الأسبوع</th><th scope="col">التاريخ</th><th scope="col">الوحدة</th><th scope="col">الدروس والأهداف</th><th scope="col" className="no-print">التحضير</th></tr></thead>
          <tbody>{weeks.map(w => <tr key={w.n} className={w.start === thisWeek ? 'is-now' : ''}><th scope="row">{w.n}{w.start === thisWeek && <small>هذا الأسبوع</small>}</th><td>{dateLabel(w.start)}</td><td>{w.rows.length ? w.rows.map(r => r.title || 'وحدة بلا اسم').join('، ') : <span className="muted">لم تُحدَّد وحدة</span>}</td><td>{w.lessons.length ? <ul className="dist-lessons">{w.lessons.map((l, n) => <li key={n}><strong>{l.title}</strong>{l.objective && <span>{l.objective}</span>}</li>)}</ul> : <span className="muted">{w.rows.length ? 'تُكتب في التحضير' : 'لا شيء بعد'}</span>}</td><td className="no-print">{w.planId ? <Link className="text-link" to={`/plans/${w.planId}`}>افتح التحضير<ChevronLeft size={14} /></Link> : w.rows.length ? <button type="button" className="text-link" onClick={() => prepare(w.start, w.rows.map(r => r.title).filter(Boolean).join('، '))}><CalendarPlus size={15} />حضّر هذا الأسبوع</button> : <span className="muted">بعد تحديد الوحدة</span>}</td></tr>)}</tbody></table></div>
      </section>
    </> : !draft && <section className="panel desk-panel"><Empty title="لا توزيع فصلي بعد" description="أنشئ توزيعًا لمادة وصف، ثم وزّع وحدات المنهج على أسابيع الفصل لترى الخطة كاملة." /></section>}
  </>;
}
