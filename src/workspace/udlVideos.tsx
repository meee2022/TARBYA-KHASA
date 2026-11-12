import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, CheckCircle2, ExternalLink, Eye, PencilLine, Play, Plus, ShieldCheck, Trash2, Video } from 'lucide-react';
import { countOf, uid } from '../../packages/domain';
import { udlCheck, udlPrinciples, type UdlPrinciple } from '../../packages/domain/udl';
import { safeLink, youtubeId, type VideoItem } from '../../packages/domain/videos';
import { confirmDialog } from './confirm';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { Empty, PageHeading } from './Workspace';
import './knowledge.css';
import './desk.css';

/** The universal-design check of one lesson: what the platform already sees in it, what the teacher confirms, and what to add. */
export function UdlPage() {
  const { data, saveLesson } = useWorkspace(); const { site } = useSiteConfig(); const [params, setParams] = useSearchParams();
  const lesson = data.lessons.find(l => l.id === params.get('lesson')) ?? data.lessons[0];
  if (!lesson) return <><PageHeading title="التصميم الشامل للتعلّم" description="فحص لكل درس: هل يصل إلى كل طالب، ويتيح له أن يجيب بطريقته، ويشدّه إلى المشاركة؟" /><section className="panel desk-panel"><Empty title="لا دروس بعد" description="حضّر درسًا من «الدروس والحصص»، ثم افحصه هنا." /></section></>;
  const result = udlCheck(lesson, data.learners, site.catalog.udl); const ticked = lesson.udl ?? [];
  const toggle = (id: string) => saveLesson({ ...lesson, udl: ticked.includes(id) ? ticked.filter(x => x !== id) : [...ticked, id], updatedAt: new Date().toISOString() });
  return <>
    <PageHeading title="التصميم الشامل للتعلّم" description="فحص لكل درس: هل يصل إلى كل طالب، ويتيح له أن يجيب بطريقته، ويشدّه إلى المشاركة؟ ما تراه المنصة في الدرس يُعلَّم وحده."><Link className="button secondary no-print" to={`/lessons/${lesson.id}/edit`}><PencilLine size={17} />افتح محرر الدرس</Link></PageHeading>
    <section className="panel desk-panel udl-pick"><div className="form-grid record-bar"><label>الدرس<select value={lesson.id} onChange={e => setParams({ lesson: e.target.value })}>{data.lessons.map(l => <option key={l.id} value={l.id}>{l.title || 'درس بلا عنوان'}</option>)}</select></label><div className={`udl-score ${result.met === result.total ? 'is-full' : ''}`} role="status"><strong>{result.met} من {result.total}</strong><span>{result.met === result.total ? 'الدرس يغطي كل البنود' : 'بنود متحققة في هذا الدرس'}</span></div></div></section>
    <div className="udl-grid">{(Object.keys(udlPrinciples) as UdlPrinciple[]).map((p, n) => { const mine = result.items.filter(i => i.principle === p); const c = result.byPrinciple[p]; return <section className="panel udl-card" key={p} style={{ '--i': n } as React.CSSProperties}>
      <header><h2>{udlPrinciples[p]}</h2><span className={`plan-state ${c.met === c.total ? 'ok' : c.met ? 'warn' : ''}`}>{c.met} من {c.total}</span></header>
      <div className="udl-meter" aria-hidden="true"><i style={{ inlineSize: `${c.total ? c.met / c.total * 100 : 0}%` }} /></div>
      <ul>{mine.map(i => <li key={i.id} className={i.met ? 'is-met' : ''}><label><input type="checkbox" checked={i.met} disabled={i.seen} onChange={() => toggle(i.id)} /><span>{i.text}</span></label>{i.seen ? <small className="udl-seen"><Eye size={14} aria-hidden="true" />ظاهر في درسك</small> : !i.met && <small className="udl-tip">{i.tip}</small>}</li>)}</ul>
    </section>; })}</div>
  </>;
}

/** The video library: links the teacher collected, each approved before it reaches a lesson. YouTube plays here without leaving the page; nothing loads until the teacher presses play. */
export function VideosPage() {
  const { data, saveDesk, saveLesson, notify } = useWorkspace(); const { site } = useSiteConfig(); const all = data.desk?.videos ?? [];
  const [draft, setDraft] = useState<VideoItem | null>(null); const [playing, setPlaying] = useState(''); const [subject, setSubject] = useState(''); const [error, setError] = useState('');
  const store = (next: VideoItem[]) => saveDesk({ videos: next });
  const save = (e: FormEvent) => { e.preventDefault(); if (!draft?.title.trim()) return; const url = draft.url.trim(); if (!safeLink(url)) { setError('اكتب رابطًا كاملًا يبدأ بـ https://'); return; } const v = { ...draft, title: draft.title.trim(), url, note: draft.note.trim() }; store(all.some(x => x.id === v.id) ? all.map(x => x.id === v.id ? v : x) : [v, ...all]); setDraft(null); setError(''); notify('حُفظ الفيديو. شاهده ثم اعتمده قبل استخدامه مع الطلاب.'); };
  const toKit = (v: VideoItem, lessonId: string) => { const lesson = data.lessons.find(l => l.id === lessonId); if (!lesson) return; if ((lesson.kit ?? []).some(k => k.url === v.url)) { notify('الفيديو موجود في حقيبة هذا الدرس.'); return; } saveLesson({ ...lesson, kit: [...(lesson.kit ?? []), { id: uid(), stage: 'content', title: v.title, url: v.url, done: false }], updatedAt: new Date().toISOString() }); notify(`أُضيف إلى حقيبة درس «${lesson.title || 'بلا عنوان'}»`); };
  const shown = all.filter(v => !subject || v.subject === subject); const subjects = [...new Set(all.map(v => v.subject).filter(Boolean))];
  return <>
    <PageHeading title="مكتبة الفيديو" description="روابط الفيديو التعليمية التي تجمعها، مصنّفة بالمادة. شاهد كل فيديو واعتمده، ثم أضفه إلى حقيبة الدرس."><button className="button primary" onClick={() => { setError(''); setDraft({ id: uid(), title: '', url: '', subject: site.catalog.subjects[0] ?? '', note: '', approved: false }); }}><Plus size={17} />فيديو جديد</button></PageHeading>
    {draft && <form className="panel desk-panel desk-form" onSubmit={save} ref={el => el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}><div className="section-heading"><h2>{all.some(x => x.id === draft.id) ? 'تعديل الفيديو' : 'فيديو جديد'}</h2></div>
      <div className="form-grid"><label>العنوان<input required autoFocus maxLength={160} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="مثلًا: أنشودة الحروف" /></label><label>الرابط<input required dir="ltr" type="url" maxLength={500} value={draft.url} onChange={e => { setError(''); setDraft({ ...draft, url: e.target.value }); }} placeholder="https://" aria-invalid={!!error} /></label><label>المادة<select value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })}>{site.catalog.subjects.map(s => <option key={s}>{s}</option>)}</select></label></div>
      <label>ملاحظة<small>متى يُعرض، وأي جزء منه</small><textarea rows={2} maxLength={400} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="heading-actions"><button className="button primary"><Check size={17} />حفظ الفيديو</button><button type="button" className="button secondary" onClick={() => setDraft(null)}>إلغاء</button></div></form>}
    {all.length > 0 && subjects.length > 1 && <section className="panel knowledge-bar"><label className="video-filter">المادة<select value={subject} onChange={e => setSubject(e.target.value)}><option value="">كل المواد</option>{subjects.map(s => <option key={s}>{s}</option>)}</select></label><span className="desk-count">{countOf(shown.length, 'فيديو', 'فيديوان', 'فيديوهات')}</span></section>}
    {shown.length ? <div className="video-grid">{shown.map((v, i) => { const yt = youtubeId(v.url); return <article className="panel video-card" key={v.id} style={{ '--i': i } as React.CSSProperties}>
      <div className="video-frame">{playing === v.id && yt ? <iframe title={v.title} src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0&autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <button type="button" className="video-poster" disabled={!yt} onClick={() => setPlaying(v.id)} aria-label={yt ? `شغّل ${v.title} هنا` : `${v.title}: يُفتح في صفحة جديدة`}>{yt ? <Play size={34} aria-hidden="true" /> : <Video size={34} aria-hidden="true" />}<span>{yt ? 'شاهده هنا' : 'يُفتح في صفحة جديدة'}</span></button>}</div>
      <header><div><h2>{v.title}</h2><p className="muted">{v.subject}</p></div><span className={`plan-state ${v.approved ? 'ok' : 'warn'}`}>{v.approved ? 'معتمد' : 'ينتظر اعتمادك'}</span></header>
      {v.note && <p className="video-note">{v.note}</p>}
      <div className="heading-actions"><a className="button secondary" href={v.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} />افتح الرابط</a><button className="button secondary" onClick={() => store(all.map(x => x.id === v.id ? { ...x, approved: !x.approved } : x))}>{v.approved ? <><ShieldCheck size={16} />ألغِ الاعتماد</> : <><CheckCircle2 size={16} />شاهدته وأعتمده</>}</button><button className="icon-button" aria-label={`تعديل ${v.title}`} onClick={() => { setError(''); setDraft(v); }}><PencilLine size={16} /></button><button className="icon-button" aria-label={`حذف ${v.title}`} onClick={async () => { if (await confirmDialog(`حذف «${v.title}» من المكتبة؟ يبقى في حقائب الدروس التي أُضيف إليها.`, { ok: 'حذف الفيديو' })) store(all.filter(x => x.id !== v.id)); }}><Trash2 size={16} /></button></div>
      {v.approved ? data.lessons.length > 0 && <label className="video-kit">أضفه إلى حقيبة درس<select value="" onChange={e => { if (e.target.value) toKit(v, e.target.value); }}><option value="">اختر الدرس…</option>{data.lessons.map(l => <option key={l.id} value={l.id}>{l.title || 'درس بلا عنوان'}</option>)}</select></label> : <p className="muted video-wait">يُضاف إلى حقيبة الدرس بعد اعتماده.</p>}
    </article>; })}</div> : !draft && <section className="panel desk-panel"><Empty title={all.length ? 'لا فيديو في هذه المادة' : 'المكتبة فارغة'} description={all.length ? 'اختر مادة أخرى أو «كل المواد».' : 'أضف رابط فيديو تعليمي، شاهده كاملًا، ثم اعتمده ليصبح جاهزًا لحقيبة الدرس.'} /></section>}
  </>;
}
