import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardCheck, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { countOf, uid, type Learner } from '../../packages/domain';
import { achievementOf, assessmentKinds, instrumentScore, levelLabels, type AssessmentKind, type Instrument, type PerformanceEntry } from '../../packages/domain/desk';
import { today } from '../../packages/domain/planning';
import { confirmDialog } from './confirm';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { Avatar, Empty } from './Workspace';

const first = (l: Learner) => l.name.split(/\s·/)[0];

/** The teacher's own measuring tools: a short test, a checklist or a performance task with its items and a pass mark set in advance. Using one writes a reading into the assessment log. */
export function InstrumentsTab() {
  const { data, saveDesk, notify } = useWorkspace(); const { site } = useSiteConfig(); const { catalog } = site;
  const tools = data.desk?.instruments ?? []; const log = data.desk?.performance ?? [];
  const blank = (): Instrument => ({ id: uid(), name: '', kind: catalog.instrumentKinds[0] ?? '', subject: catalog.subjects[0] ?? '', domain: catalog.performanceDomains[0] ?? '', skill: '', items: [], pass: 1 });
  const [draft, setDraft] = useState<Instrument | null>(null); const [itemsText, setItemsText] = useState('');
  const [use, setUse] = useState<{ tool: Instrument; learnerId: string; passed: number[]; kind: AssessmentKind; level: number; date: string } | null>(null);
  const edit = (t: Instrument) => { setUse(null); setDraft(t); setItemsText(t.items.join('\n')); };
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft) return; const items = itemsText.split('\n').map(x => x.trim().slice(0, 200)).filter(Boolean).slice(0, 30); if (!draft.name.trim() || !items.length) return;
    const t = { ...draft, name: draft.name.trim(), skill: draft.skill.trim() || draft.name.trim(), items, pass: Math.max(1, Math.min(items.length, draft.pass)) };
    saveDesk({ instruments: tools.some(x => x.id === t.id) ? tools.map(x => x.id === t.id ? t : x) : [...tools, t] }); setDraft(null); notify('حُفظت أداة القياس'); };
  const record = () => { if (!use) return; const score = instrumentScore(use.tool, use.passed.length);
    const entry: PerformanceEntry = { id: uid(), learnerId: use.learnerId, domain: use.tool.domain, skill: use.tool.skill, level: use.level, percent: score.percent, tool: use.tool.name, date: use.date, note: `${use.passed.length} من ${use.tool.items.length}. ${score.met ? 'تحقق المعيار' : 'لم يتحقق المعيار بعد'}.`, kind: use.kind, subject: use.tool.subject, instrumentId: use.tool.id };
    saveDesk({ performance: [...log, entry].slice(-3000) }); setUse(null); notify('سُجّلت النتيجة في سجل التقييم'); };
  const score = use ? instrumentScore(use.tool, use.passed.length) : null;
  return <>
    <div className="heading-actions desk-tab-actions"><button className="button primary" onClick={() => { setUse(null); setDraft(blank()); setItemsText(''); }}><Plus size={17} />أداة قياس جديدة</button></div>
    {draft && <form className="panel desk-panel desk-form" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{tools.some(t => t.id === draft.id) ? 'تعديل أداة القياس' : 'أداة قياس جديدة'}</h2></div>
      <div className="form-grid"><label>اسم الأداة<input required autoFocus maxLength={120} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="مثلًا: قائمة رصد أصوات الحروف" /></label><label>النوع<select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value })}>{[...new Set([...catalog.instrumentKinds, draft.kind])].filter(Boolean).map(k => <option key={k}>{k}</option>)}</select></label><label>المادة<select value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })}>{catalog.subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>المجال<select value={draft.domain} onChange={e => setDraft({ ...draft, domain: e.target.value })}>{catalog.performanceDomains.map(d => <option key={d}>{d}</option>)}</select></label><label>المهارة التي تقيسها<input maxLength={160} value={draft.skill} onChange={e => setDraft({ ...draft, skill: e.target.value })} placeholder="مثلًا: تمييز صوت الحرف في أول الكلمة" /></label><label>معيار النجاح: عدد البنود الصحيحة<input type="number" min={1} max={30} value={draft.pass} onChange={e => setDraft({ ...draft, pass: Math.max(1, Math.min(30, e.target.valueAsNumber || 1)) })} /></label></div>
      <label>البنود<small>بند في كل سطر، حتى 30 بندًا</small><textarea required rows={6} value={itemsText} onChange={e => setItemsText(e.target.value)} placeholder={'يشير إلى صورة تبدأ بصوت الباء\nينطق صوت الباء منفردًا\nيميّز الباء بين حرفين'} /></label>
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ الأداة</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {use && score && <section className="panel desk-panel desk-form instrument-use" ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{use.tool.name}</h2><span className={`plan-state ${score.met ? 'ok' : 'warn'}`}>{use.passed.length} من {use.tool.items.length} · {score.percent}% · {score.met ? 'تحقق المعيار' : 'لم يتحقق المعيار بعد'}</span></div>
      <div className="form-grid"><label>الطالب<select value={use.learnerId} onChange={e => setUse({ ...use, learnerId: e.target.value, passed: [] })}>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>نوع التقييم<select value={use.kind} onChange={e => setUse({ ...use, kind: e.target.value as AssessmentKind })}>{(Object.keys(assessmentKinds) as AssessmentKind[]).map(k => <option key={k} value={k}>{assessmentKinds[k]}</option>)}</select></label><label>مقدار المساعدة<select value={use.level} onChange={e => setUse({ ...use, level: Number(e.target.value) })}>{levelLabels.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}</select></label><label>التاريخ<input type="date" max={today()} value={use.date} onChange={e => e.target.value && setUse({ ...use, date: e.target.value })} /></label></div>
      <fieldset className="instrument-items"><legend>علّم البنود التي أدّاها الطالب صحيحة</legend>{use.tool.items.map((item, n) => <label key={n} className={use.passed.includes(n) ? 'is-on' : ''}><input type="checkbox" checked={use.passed.includes(n)} onChange={e => setUse({ ...use, passed: e.target.checked ? [...use.passed, n] : use.passed.filter(x => x !== n) })} /><span>{n + 1}</span>{item}</label>)}</fieldset>
      <div className="heading-actions"><button type="button" className="button primary" onClick={record}><Check size={17} />سجّل النتيجة</button><button type="button" className="button secondary" onClick={() => setUse(null)}>إلغاء</button></div></section>}
    {tools.length ? <div className="group-grid">{tools.map((t, i) => { const used = log.filter(e => e.instrumentId === t.id).length; return <article className="panel group-card instrument-card" key={t.id} style={{ '--i': i } as React.CSSProperties}>
      <header><span className="group-mark" aria-hidden="true"><ClipboardCheck size={22} /></span><div><h2>{t.name}</h2><p className="muted">{t.kind} · {t.subject}</p></div></header>
      <p className="instrument-skill">{t.skill}</p><ol>{t.items.slice(0, 5).map((x, n) => <li key={n}>{x}</li>)}</ol>{t.items.length > 5 && <p className="muted">و{countOf(t.items.length - 5, 'بند آخر', 'بندان آخران', 'بنود أخرى')}</p>}
      <p className="group-meta"><span>المعيار: {t.pass} من {t.items.length}</span><span>{used ? `استُخدمت ${countOf(used, 'مرة', 'مرتين', 'مرات')}` : 'لم تُستخدم بعد'}</span></p>
      <div className="heading-actions"><button className="button primary" disabled={!data.learners.length} onClick={() => { setDraft(null); setUse({ tool: t, learnerId: data.learners[0].id, passed: [], kind: 'formative', level: 3, date: today() }); }}><Play size={16} />استخدمها مع طالب</button><button className="button secondary" onClick={() => edit(t)}><Pencil size={16} />تعديل</button><button className="button secondary" onClick={async () => { if (await confirmDialog(`حذف الأداة «${t.name}»؟ النتائج المسجلة بها تبقى في السجل.`, { ok: 'حذف الأداة' })) saveDesk({ instruments: tools.filter(x => x.id !== t.id) }); }}><Trash2 size={16} />حذف</button></div>
    </article>; })}</div> : !draft && <section className="panel desk-panel"><Empty title="لا أدوات قياس بعد" description="أنشئ اختبارًا قصيرًا أو قائمة رصد ببنود ومعيار نجاح تحدده مسبقًا، ثم استخدمها مع أي طالب فتُحفظ نتيجتها في سجل التقييم." /></section>}
  </>;
}

/** Achievement by subject: for each pupil, the average of the last three scored readings in a subject. It lists pupils in the teacher's own order and never ranks them. */
export function AchievementTab() {
  const { data } = useWorkspace(); const log = data.desk?.performance ?? [];
  const rows = data.learners.map(l => ({ learner: l, cells: achievementOf(log, l.id) })); const subjects = [...new Set(rows.flatMap(r => Object.keys(r.cells)))];
  if (!subjects.length) return <section className="panel desk-panel"><Empty title="لا نتائج محسوبة بعد" description="يُحسب التحصيل من التقييمات التي لها مادة ونسبة. سجّلها من «السجل والمستويات» أو باستخدام أداة قياس." /></section>;
  return <section className="panel desk-panel"><div className="section-heading"><h2>التحصيل حسب المادة</h2><span className="desk-count">{countOf(subjects.length, 'مادة', 'مادتان', 'مواد')}</span></div>
    <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">الطالب</th>{subjects.map(s => <th scope="col" key={s}>{s}</th>)}</tr></thead>
      <tbody>{rows.map(({ learner, cells }) => <tr key={learner.id}><th scope="row"><Link className="achievement-who" to={`/learners/${learner.id}`}><Avatar learner={learner} size="small" />{first(learner)}</Link></th>{subjects.map(s => { const c = cells[s]; return <td key={s}>{c ? <span className="achievement-cell"><strong>{c.average}%</strong><small>من {countOf(c.count, 'تقييم', 'تقييمين', 'تقييمات')}</small></span> : <span className="muted">لا تقييم بعد</span>}</td>; })}</tr>)}</tbody></table></div>
    <p className="muted desk-note">متوسط آخر ثلاثة تقييمات لكل طالب في المادة. الجدول يصف كل طالب وحده، ولا يرتّب الطلاب ولا يقارن بينهم.</p></section>;
}
