import { useState } from 'react';
import { Check, ChevronDown, Copy, Lightbulb, Printer, Search } from 'lucide-react';
import { countOf } from '../../packages/domain';
import { fillPrompt, promptBlanks } from '../../packages/domain/prompts';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { Empty, PageHeading } from './Workspace';
import './knowledge.css';

/** The strategy encyclopedia: each strategy explained the same way, searchable, printable. The content comes from the admin catalog. */
export function StrategiesPage() {
  const { site } = useSiteConfig(); const all = site.catalog.strategyGuide; const [query, setQuery] = useState(''); const [open, setOpen] = useState(all[0]?.id ?? '');
  const q = query.trim(); const shown = q ? all.filter(s => [s.title, s.summary, s.when, ...s.steps].join(' ').includes(q)) : all;
  return <>
    <PageHeading title="موسوعة الاستراتيجيات" description="كل استراتيجية بالترتيب نفسه: ما هي، متى تناسب، خطواتها، كيف تُكيَّف، ما يُخطأ فيه، وكيف نعرف أنها نجحت."><button className="button secondary no-print" onClick={() => window.print()}><Printer size={17} />طباعة</button></PageHeading>
    <section className="panel knowledge-bar no-print"><label className="knowledge-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="ابحث في الاستراتيجيات" value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث باسم الاستراتيجية أو بكلمة من خطواتها" /></label><span className="desk-count">{countOf(shown.length, 'استراتيجية', 'استراتيجيتان', 'استراتيجيات')}</span></section>
    {shown.length ? <div className="strategy-list">{shown.map((s, i) => { const on = open === s.id; return <article className={`panel strategy-card ${on ? 'is-open' : ''}`} key={s.id} style={{ '--i': i } as React.CSSProperties}>
      <button type="button" className="strategy-head" aria-expanded={on} onClick={() => setOpen(on ? '' : s.id)}><span className="strategy-mark" aria-hidden="true"><Lightbulb size={22} /></span><span className="strategy-title"><strong>{s.title}</strong><small>{s.summary}</small></span><ChevronDown size={20} aria-hidden="true" /></button>
      <div className="strategy-body" hidden={!on}>
        <section><h3>متى تناسب؟</h3><p>{s.when}</p></section>
        <section><h3>الخطوات</h3><ol>{s.steps.map((x, n) => <li key={n}>{x}</li>)}</ol></section>
        {s.adaptations.length > 0 && <section><h3>كيف تُكيَّف؟</h3><dl>{s.adaptations.map((a, n) => <div key={n}><dt>{a.need}</dt><dd>{a.text}</dd></div>)}</dl></section>}
        {s.mistakes.length > 0 && <section><h3>أخطاء شائعة</h3><ul>{s.mistakes.map((x, n) => <li key={n}>{x}</li>)}</ul></section>}
        <section className="strategy-measure"><h3>كيف نعرف أنها نجحت؟</h3><p>{s.measure}</p></section>
      </div></article>; })}</div>
      : <section className="panel desk-panel"><Empty title={all.length ? 'لا استراتيجية بهذه الكلمة' : 'الموسوعة فارغة'} description={all.length ? 'جرّب كلمة أخرى، أو امسح البحث لترى كل الاستراتيجيات.' : 'تضيف إدارة المنصة الاستراتيجيات من لوحة الإدارة.'} /></section>}
  </>;
}

/** The prompt lab: ready requests filled from one of the teacher's lessons, to copy into whichever writing assistant the school allows. Nothing is sent from here. */
export function PromptLabPage() {
  const { data, notify } = useWorkspace(); const { site } = useSiteConfig(); const all = site.catalog.prompts;
  const [pick, setPick] = useState(all[0]?.id ?? ''); const [lessonId, setLessonId] = useState(data.lessons[0]?.id ?? ''); const [typed, setTyped] = useState<Record<string, string>>({}); const [copied, setCopied] = useState(false);
  const prompt = all.find(p => p.id === pick) ?? all[0]; const lesson = data.lessons.find(l => l.id === lessonId);
  if (!prompt) return <><PageHeading title="مختبر الأوامر" description="طلبات جاهزة تُملأ من درسك وتُنسخ." /><section className="panel desk-panel"><Empty title="لا أوامر بعد" description="تضيف إدارة المنصة الأوامر الجاهزة من لوحة الإدارة." /></section></>;
  const fields = { 'الدرس': lesson?.title ?? '', 'المادة': lesson?.subject ?? '', 'الصف': lesson?.grade ?? '', 'الهدف': lesson?.objective ?? '' };
  const blanks = promptBlanks(prompt.template); const text = fillPrompt(prompt.template, fields, typed); const gaps = (text.match(/\[[^\]\n]{1,40}\]/g) ?? []).length;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); notify('نُسخ النص. الصقه في المساعد الذي تسمح به مدرستك.'); } catch { notify('تعذّر النسخ. حدّد النص وانسخه يدويًا.'); } };
  return <>
    <PageHeading title="مختبر الأوامر" description="طلبات مكتوبة بعناية تُملأ من درسك، فتنسخها إلى أي مساعد كتابة تسمح به مدرستك. لا يُرسل شيء من المنصة." />
    <div className="prompt-layout">
      <aside className="panel prompt-list" aria-label="الأوامر الجاهزة">{all.map(p => <button type="button" key={p.id} className={p.id === prompt.id ? 'active' : ''} aria-pressed={p.id === prompt.id} onClick={() => { setPick(p.id); setTyped({}); }}><strong>{p.title}</strong><small>{p.purpose}</small></button>)}</aside>
      <section className="panel prompt-work"><div className="section-heading"><h2>{prompt.title}</h2></div>
        <div className="form-grid"><label>الدرس الذي يُملأ منه<select value={lessonId} onChange={e => setLessonId(e.target.value)}><option value="">بلا درس، سأكتب بنفسي</option>{data.lessons.map(l => <option key={l.id} value={l.id}>{l.title || 'درس بلا عنوان'}</option>)}</select></label>{blanks.map(b => <label key={b}>{b}<input maxLength={300} value={typed[b] ?? ''} onChange={e => setTyped({ ...typed, [b]: e.target.value })} /></label>)}</div>
        <label className="prompt-text">النص الجاهز للنسخ<textarea readOnly rows={9} value={text} onFocus={e => e.currentTarget.select()} /></label>
        {gaps > 0 && <p className="check-notes" role="status">في النص {countOf(gaps, 'خانة فارغة', 'خانتان فارغتان', 'خانات فارغة')} بين قوسين. اختر درسًا له عنوان وهدف، أو اكتبها بعد اللصق.</p>}
        <div className="heading-actions"><button type="button" className="button primary" onClick={copy}>{copied ? <><Check size={17} />نُسخ</> : <><Copy size={17} />انسخ النص</>}</button></div>
        <p className="info-note">لا تكتب في الطلب اسم طالب أو تشخيصه أو أي معلومة تعرّف به. راجع ما يكتبه المساعد قبل استخدامه: أنت من يقرر ما يناسب طلابك.</p>
      </section>
    </div>
  </>;
}
