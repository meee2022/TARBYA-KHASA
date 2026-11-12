import { useEffect, useState, type FormEvent } from 'react';
import { Check, Download, FileLock2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { countOf, dateLabel, type Learner } from '../../packages/domain';
import { today } from '../../packages/domain/planning';
import { confirmDialog } from './confirm';
import { deleteMedia, mediaUrl, storeMedia } from './media';
import { useWorkspace } from './store';
import { Empty, PageHeading } from './Workspace';
import './planning.css';
import './desk.css';

/** One confidential paper about a pupil. The record and the file both stay in this browser: neither is part of the workspace, so neither syncs nor enters a backup. */
export interface ConfidentialDoc { id: string; learnerId: string; category: string; title: string; date: string; note: string; file: string; size: number; }
export const confidentialCategories = ['تشخيصي', 'أكاديمي', 'وظيفي', 'طبي', 'موافقات'];
const KEY = 'tarbya.confidential.v1'; const MAX_BYTES = 10 * 1024 * 1024; const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const readList = (): ConfidentialDoc[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const kb = (n: number) => n >= 1048576 ? `${(n / 1048576).toFixed(1)} م.ب` : `${Math.max(1, Math.round(n / 1024))} ك.ب`;
const first = (l?: Learner) => l ? l.name.split(/\s·/)[0] : 'طالب محذوف';

/** The confidential file: diagnostic, academic, functional and medical papers and consents, kept on the teacher's device only. */
export function ConfidentialPage() {
  const { data, notify } = useWorkspace(); const [docs, setDocs] = useState<ConfidentialDoc[]>(readList); const [who, setWho] = useState(data.learners[0]?.id ?? ''); const now = today();
  const [draft, setDraft] = useState<{ category: string; title: string; date: string; note: string } | null>(null); const [file, setFile] = useState<File | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const write = (next: ConfidentialDoc[]) => { try { localStorage.setItem(KEY, JSON.stringify(next)); setDocs(next); return true; } catch { return false; } };
  useEffect(() => { const sync = (e: StorageEvent) => { if (e.key === KEY) setDocs(readList()); }; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync); }, []);
  const pick = (f: File | undefined) => { setError(''); if (!f) { setFile(null); return; } if (!TYPES.includes(f.type)) { setFile(null); setError('الملف يجب أن يكون PDF أو صورة (JPG أو PNG أو WebP).'); return; } if (f.size > MAX_BYTES) { setFile(null); setError('حجم الملف أكبر من 10 ميغابايت. اختر ملفًا أصغر.'); return; } setFile(f); };
  const save = async (e: FormEvent) => {
    e.preventDefault(); if (!draft?.title.trim() || !who) return; if (!file) { setError('اختر ملف المستند.'); return; }
    setBusy(true);
    try { const id = await storeMedia(file, false); const doc: ConfidentialDoc = { id, learnerId: who, category: draft.category, title: draft.title.trim(), date: draft.date, note: draft.note.trim(), file: file.name.slice(0, 160), size: file.size };
      if (!write([doc, ...docs])) { await deleteMedia(id).catch(() => undefined); setError('تعذّر الحفظ على هذا الجهاز. قد تكون مساحة التخزين ممتلئة.'); return; }
      setDraft(null); setFile(null); notify('حُفظ المستند على هذا الجهاز فقط'); }
    catch { setError('تعذّر حفظ الملف على هذا الجهاز.'); } finally { setBusy(false); }
  };
  const open = async (d: ConfidentialDoc) => { const url = await mediaUrl(d.id).catch(() => undefined); if (!url) { notify('لم نجد الملف على هذا الجهاز.'); return; } const a = document.createElement('a'); a.href = url; a.download = d.file || d.title; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const remove = async (d: ConfidentialDoc) => { if (!await confirmDialog(`حذف «${d.title}» نهائيًا من هذا الجهاز؟ لا توجد نسخة أخرى منه في المنصة.`, { ok: 'حذف المستند' })) return; await deleteMedia(d.id).catch(() => undefined); write(readList().filter(x => x.id !== d.id)); };
  const known = new Set(data.learners.map(l => l.id)); const mine = docs.filter(d => d.learnerId === who).sort((a, b) => b.date.localeCompare(a.date)); const orphans = docs.filter(d => !known.has(d.learnerId));
  return <>
    <PageHeading title="الملف السري" description="الأوراق التشخيصية والأكاديمية والوظيفية والطبية والموافقات لكل طالب، محفوظة على هذا الجهاز وحده." />
    <p className="info-note confidential-note"><ShieldCheck size={18} aria-hidden="true" />هذه المستندات لا تُرفع إلى أي خادم، ولا تدخل في حسابك ولا في النسخة الاحتياطية، ولا يراها أحد من جهاز آخر. إن مسحت بيانات المتصفح أو غيّرت الجهاز فلن تجدها، فاحتفظ بالأصل الورقي.</p>
    {data.learners.length ? <>
      <section className="panel desk-panel"><div className="form-grid record-bar"><label>الطالب<select value={who} onChange={e => { setWho(e.target.value); setDraft(null); setError(''); }}>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><div className="heading-actions"><button className="button primary" onClick={() => { setError(''); setFile(null); setDraft({ category: confidentialCategories[0], title: '', date: now, note: '' }); }}><Plus size={17} />مستند جديد</button></div></div></section>
      {draft && <form className="panel desk-panel desk-form" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>مستند جديد لـ{first(data.learners.find(l => l.id === who))}</h2></div>
        <div className="form-grid"><label>النوع<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{confidentialCategories.map(c => <option key={c}>{c}</option>)}</select></label><label>العنوان<input required autoFocus maxLength={160} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="مثلًا: تقرير تقييم النطق" /></label><label>تاريخ المستند<input type="date" max={now} value={draft.date} onChange={e => e.target.value && setDraft({ ...draft, date: e.target.value })} /></label><label>الملف<small>PDF أو صورة، حتى 10 ميغابايت</small><input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e => pick(e.target.files?.[0])} aria-invalid={!!error} /></label></div>
        <label>ملاحظة<textarea rows={2} maxLength={400} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="من أصدره، وما يهمّ منه في الخطة" /></label>
        {error && <p className="alert" role="alert">{error}</p>}
        <div className="heading-actions"><button className="button primary" disabled={busy}><Check size={17} />{busy ? 'جارٍ الحفظ…' : 'حفظ على هذا الجهاز'}</button><button type="button" className="button secondary" onClick={() => { setDraft(null); setError(''); }}>إلغاء</button></div></form>}
      {mine.length ? confidentialCategories.map(c => { const items = mine.filter(d => d.category === c); if (!items.length) return null; return <section className="panel desk-panel record-section" key={c}><div className="section-heading"><h2>{c}</h2><span className="desk-count">{countOf(items.length, 'مستند', 'مستندان', 'مستندات')}</span></div>
        <ul className="desk-list">{items.map(d => <li key={d.id}><span className="confidential-mark" aria-hidden="true"><FileLock2 size={20} /></span><div><strong>{d.title}</strong><small>{dateLabel(d.date)} · {kb(d.size)}{d.note ? ` · ${d.note}` : ''}</small></div><button type="button" className="icon-button" aria-label={`تنزيل ${d.title}`} onClick={() => open(d)}><Download size={16} /></button><button type="button" className="icon-button" aria-label={`حذف ${d.title}`} onClick={() => remove(d)}><Trash2 size={16} /></button></li>)}</ul></section>; })
        : !draft && <section className="panel desk-panel"><Empty title="لا مستندات لهذا الطالب على هذا الجهاز" description="أضف التقرير أو الموافقة كملف PDF أو صورة، فتجده هنا عند الحاجة دون أن يغادر جهازك." /></section>}
      {orphans.length > 0 && <section className="panel desk-panel record-section"><div className="section-heading"><h2>مستندات لطلاب حُذفت ملفاتهم</h2><span className="desk-count">{orphans.length}</span></div><ul className="desk-list">{orphans.map(d => <li key={d.id}><div><strong>{d.title}</strong><small>{d.category} · {dateLabel(d.date)}</small></div><button type="button" className="icon-button" aria-label={`حذف ${d.title}`} onClick={() => remove(d)}><Trash2 size={16} /></button></li>)}</ul></section>}
    </> : <section className="panel desk-panel"><Empty title="أضف ملف طالب أولًا" description="المستندات السرية تُحفظ لطالب بعينه، فأضفه من «قائمة الطلاب» ثم عُد." /></section>}
  </>;
}
