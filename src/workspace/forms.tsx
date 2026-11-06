import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, FileDown, FileSignature, Plus, Printer, Trash2 } from 'lucide-react';
import { confirmDialog } from './confirm';
import { countOf, dateLabel } from '../../packages/domain';
import { createForm, formBody, formKinds, formProgress, formTemplates, type FormField, type FormKind, type SpecialForm } from '../../packages/domain/forms';
import { useWorkspace } from './store';
import { useSiteConfig } from './site';
import { Avatar, Empty, PageHeading } from './Workspace';
import { Chip, Seg } from './fields';
import { downloadWord } from './word';
import './planning.css';

/** The ministry's forms: start one for a pupil, fill it on screen, export it to Word for the official copy. */
export function FormsList() {
  const { data, saveForm } = useWorkspace(); const navigate = useNavigate(); const [learnerId, setLearnerId] = useState('');
  const forms = [...(data.forms ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const start = (kind: FormKind) => { const form = createForm(kind, data.learners.find(l => l.id === learnerId)); saveForm(form); navigate(`/forms/${form.id}`); };
  return <><PageHeading banner="banner-iep" title="استمارات التربية الخاصة" description="طلب الخدمات، وطلب التقييم الوظيفي، وتسليم الملفات، تُعبّأ هنا وتُصدَّر Word بالترتيب نفسه. التوقيعات تبقى يدوية." />
    <section className="panel door-panel"><div className="section-heading"><h2>استمارة جديدة</h2><label className="forms-learner">للطالب<select value={learnerId} onChange={e => setLearnerId(e.target.value)}><option value="">دون ربط بملف</option>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label></div>
      <div className="tool-grid">{formKinds.map(kind => { const t = formTemplates[kind]; return <button type="button" key={kind} className="tool-card form-card" onClick={() => start(kind)}><FileSignature size={22} /><h2>{t.short}</h2><p>{t.description}</p><strong><Plus size={15} />ابدأ</strong></button>; })}</div>
      <p className="info-note">النموذج المعتمد يُدخل إلكترونيًا لدى إدارة التربية الخاصة والتعليم الدامج؛ ما تملؤه هنا نسخة مرتبة تُنقل منها البيانات وتُحفظ في ملف الطالب على هذا الجهاز.</p></section>
    <section className="panel door-panel"><div className="section-heading"><h2>استماراتي</h2><span className="muted">{countOf(forms.length, 'استمارة', 'استمارتان', 'استمارات')}</span></div>
      {forms.length ? <ul className="door-list">{forms.map(form => { const t = formTemplates[form.kind]; const who = data.learners.find(l => l.id === form.learnerId); const p = formProgress(form); return <li key={form.id}><Link to={`/forms/${form.id}`}>{who ? <Avatar learner={who} size="small" /> : <FileSignature size={20} />}<span><strong>{t.short}{who ? ` · ${who.name.split(' ·')[0]}` : ''}</strong><small>{String(form.values.name || '') || 'بلا اسم بعد'} · {p.done} من {p.total} حقلًا · {dateLabel(form.updatedAt)}</small></span><ChevronLeft size={18} /></Link></li>; })}</ul> : <Empty title="لا استمارات بعد" description="ابدأ واحدة من الأعلى؛ تُحفظ تلقائيًا على هذا الجهاز." />}</section></>;
}

export function FormEditor() {
  const { id } = useParams(); const { data, saveForm, removeForm, notify } = useWorkspace(); const { site } = useSiteConfig(); const navigate = useNavigate();
  const form = (data.forms ?? []).find(f => f.id === id); const [step, setStep] = useState(0); const [busy, setBusy] = useState(false);
  if (!form) return <Empty title="الاستمارة غير موجودة" description="افتحها من قائمة الاستمارات." />;
  const t = formTemplates[form.kind]; const section = t.sections[Math.min(step, t.sections.length - 1)]; const who = data.learners.find(l => l.id === form.learnerId); const progress = formProgress(form);
  const set = (fieldId: string, value: string | string[]) => saveForm({ ...form, values: { ...form.values, [fieldId]: value }, updatedAt: new Date().toISOString() });
  const filled = (s: typeof section) => s.fields.filter(x => { const v = form.values[x.id]; return Array.isArray(v) ? v.length > 0 : !!(v && v.trim()); }).length;
  const word = async () => { setBusy(true); try { await downloadWord(`${t.short} ${String(form.values.name || '')}`, formBody(form, site.catalog.academicYear)); notify('نُزّل ملف Word'); } catch { notify('تعذّر إنشاء الملف. حاول مرة أخرى.'); } finally { setBusy(false); } };
  const field = (x: FormField) => {
    const v = form.values[x.id];
    if (section.scale && x.kind === 'choice') return <Seg key={x.id} label={x.label} value={typeof v === 'string' ? v : ''} options={section.scale.map(o => [o, o] as const)} onChange={o => set(x.id, o)} />;
    if (x.kind === 'choice') return <Seg key={x.id} label={x.label} value={typeof v === 'string' ? v : ''} options={(x.options ?? []).map(o => [o, o] as const)} onChange={o => set(x.id, o)} hint={x.hint} />;
    if (x.kind === 'checks') { const list = Array.isArray(v) ? v : []; return <div className="seg" role="group" aria-label={x.label} key={x.id}><span className="seg-label">{x.label}</span><div className="option-chips">{(x.options ?? []).map(o => <Chip key={o} on={list.includes(o)} label={o} onClick={() => set(x.id, list.includes(o) ? list.filter(i => i !== o) : [...list, o])} />)}</div></div>; }
    if (x.kind === 'long') return <label key={x.id}>{x.label}<textarea dir="auto" rows={3} value={typeof v === 'string' ? v : ''} onChange={e => set(x.id, e.target.value)} /></label>;
    return <label key={x.id}>{x.label}<input dir={x.kind === 'date' ? 'ltr' : 'auto'} type={x.kind === 'date' ? 'date' : 'text'} maxLength={200} value={typeof v === 'string' ? v : ''} onChange={e => set(x.id, e.target.value)} /></label>;
  };
  const shortFields = section.fields.filter(x => !x.kind || x.kind === 'text' || x.kind === 'date');
  return <><Link to="/forms" className="back-link"><ArrowRight size={16} />كل الاستمارات</Link>
    <PageHeading title={t.title} description={`${who ? `${who.name} · ` : ''}مُلئ ${progress.done} من ${progress.total} حقلًا. يُحفظ كل تعديل تلقائيًا على هذا الجهاز.`}><button className="button primary" disabled={busy} onClick={word}><FileDown size={17} />{busy ? 'جارٍ التجهيز…' : 'تصدير Word'}</button><button className="button secondary" onClick={() => window.print()}><Printer size={17} />طباعة</button><button className="button secondary" onClick={async () => { if (await confirmDialog(`حذف هذه الاستمارة (${t.short})؟`, { ok: 'حذف' })) { removeForm(form.id); navigate('/forms'); } }}><Trash2 size={17} />حذف</button></PageHeading>
    <div className="editor-layout"><aside className="editor-steps no-print">{t.sections.map((s, i) => { const n = filled(s); return <button key={s.id} className={step === i ? 'active' : ''} aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)}><span>{i + 1}</span><div><strong>{s.title}</strong><small>{n ? `${n} من ${s.fields.length}` : 'لم يُملأ بعد'}</small></div><ChevronLeft size={15} /></button>; })}</aside>
      <div className="editor-content"><section className="panel editor-panel form-section"><h2>{section.title}</h2>{section.note && <p className="info-note">{section.note}</p>}
        <div className="form-stack">{shortFields.length > 0 && <div className="form-grid">{shortFields.map(field)}</div>}{section.fields.filter(x => !shortFields.includes(x)).map(field)}</div>
        <div className="editor-navigation"><button className="button secondary" disabled={step === 0} onClick={() => setStep(x => x - 1)}>السابق</button><button className="button primary" disabled={step === t.sections.length - 1} onClick={() => setStep(x => x + 1)}>التالي<ChevronLeft size={17} /></button></div></section>
        <section className="panel form-print print-only" aria-hidden="true">{t.sections.map(s => <div key={s.id}><h3>{s.title}</h3>{s.fields.map(x => { const v = form.values[x.id]; const text = Array.isArray(v) ? v.join('، ') : v; return text ? <p key={x.id}><strong>{x.label}:</strong> {text}</p> : null; })}</div>)}</section></div></div></>;
}
