import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, HeartHandshake, Hourglass, Send, ThumbsUp } from 'lucide-react';
import { dateLabel } from '../../packages/domain';
import { art } from '../../packages/domain/catalog';
import { parentChoiceLabels, type ParentChoice, type ParentView } from '../../packages/domain/parent';
import { accountsAvailable, parentPage, parentReply, SyncError } from './teacherApi';
import { useSiteConfig } from './site';
import { Avatar } from './Workspace';
import './parent.css';

const icons: Record<ParentChoice, typeof ThumbsUp> = { yes: ThumbsUp, help: HeartHandshake, no: Hourglass };

/** The family's page: opened from the link the teacher sent, no account. One child, this week, and a way to say "we tried it". */
export default function ParentPortal() {
  // Rendered outside the workspace's <Routes>, so the token is read from the path itself.
  const token = useLocation().pathname.split('/')[2] ?? ''; const { site } = useSiteConfig();
  const [view, setView] = useState<ParentView | null | undefined>(accountsAvailable ? undefined : null);
  useEffect(() => { if (!accountsAvailable) return; parentPage(token).then(setView).catch(() => setView(null)); }, [token]);
  useEffect(() => { if (view) document.title = `أسبوع ${view.child} · ${site.brandName}`; }, [view, site.brandName]);
  return <div className="studio parent-portal" dir="rtl">
    <header className="parent-top"><span className="brand-wordmark" role="img" aria-label={site.brandName} /><span className="eyebrow">بوابة الأسرة</span></header>
    <main className="parent-main">
      {view === undefined && <div className="parent-skeleton" aria-busy="true" aria-label="جارٍ التحميل"><i /><i /><i /></div>}
      {view === null && <section className="panel parent-invalid rise-in"><img src={art('ui-sprout')} alt="" /><h1>هذا الرابط لم يعد صالحًا</h1><p>{accountsAvailable ? 'ربما أنشأت المعلمة رابطًا جديدًا، أو أوقفت هذا الرابط. اطلبوا الرابط الجديد من معلمة الدعم.' : 'بوابة الأسرة غير متاحة في هذه النسخة من المنصة.'}</p></section>}
      {view && <Page view={view} token={token} />}
    </main>
    <footer className="parent-foot"><span>{site.brandName}</span><span>هذه الصفحة للتواصل بين المدرسة والبيت، وليست تقييمًا رسميًا. لا تشاركوا الرابط مع غيركم.</span></footer>
  </div>;
}

function Page({ view, token }: { view: ParentView; token: string }) {
  const [choice, setChoice] = useState<ParentChoice | null>(null); const [text, setText] = useState(''); const [sent, setSent] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!choice) return; setBusy(true); setError('');
    try { await parentReply(token, choice, text); setSent(true); setText(''); setChoice(null); } catch (e) { setError(e instanceof SyncError ? e.message : 'تعذّر الإرسال. حاولوا مرة أخرى.'); } finally { setBusy(false); }
  };
  let n = 0; const step = () => ({ style: { animationDelay: `${n++ * 70}ms` } });
  return <>
    <section className="parent-hero rise-in" {...step()}>
      <Avatar learner={view.avatar} size="large" />
      <div><span className="eyebrow">من {dateLabel(view.from)} إلى {dateLabel(view.to)}</span><h1>أسبوع {view.child}</h1><p>الصف {view.grade} · مع {view.teacher}. نشارككم ما عملنا عليه، وما يمكن أن يساعد في البيت.</p></div>
    </section>
    <section className="panel parent-section rise-in" {...step()}><h2>ماذا تعلّمنا هذا الأسبوع</h2>
      {view.empty ? <p className="muted">لم تُسجَّل أنشطة هذا الأسبوع بعد. تعود الصفحة بما تعلّمناه بعد الحصص القادمة.</p>
        : <ul className="parent-list">{view.lessons.map(t => <li key={t}>{t}</li>)}{view.activities.map(a => <li key={a.title}>{a.title}{a.times > 1 ? ` (${a.times} مرات)` : ''}</li>)}</ul>}
    </section>
    {view.goals.length > 0 && <section className="panel parent-section rise-in" {...step()}><h2>كيف تسير الأهداف</h2><ul className="parent-goals">{view.goals.map(g => <li key={g.text}><span>{g.text}</span><strong>{g.status}</strong></li>)}</ul></section>}
    {view.words.length > 0 && <section className="panel parent-section rise-in" {...step()}><h2>كلمات نردّدها في البيت</h2><p className="family-words">{view.words.map(w => <span key={w} dir="auto">{w}</span>)}</p></section>}
    {view.strengths && <section className="panel parent-section rise-in" {...step()}><h2>ما تحبه وتستمتع به</h2><p>{view.strengths}</p></section>}
    {(view.home || view.note) && <section className="parent-home rise-in" {...step()}>{view.home && <div><h2>جرّبوا في البيت</h2><p>{view.home}</p></div>}{view.note && <div><h2>ملاحظة المعلمة</h2><p>{view.note}</p></div>}</section>}
    <section className="panel parent-section parent-reply rise-in" {...step()} aria-labelledby="reply-title">
      <h2 id="reply-title">جرّبتم مهمة البيت؟</h2><p className="muted">إجابة واحدة تكفي، وتصل إلى المعلمة وحدها.</p>
      {sent && <p className="parent-thanks" role="status"><Check size={18} aria-hidden="true" />شكرًا لكم، وصلت إجابتكم إلى المعلمة.</p>}
      <div className="parent-choices" role="group" aria-label="كيف سارت المهمة">{(Object.keys(parentChoiceLabels) as ParentChoice[]).map(c => { const Icon = icons[c]; return <button type="button" key={c} className={`parent-choice ${choice === c ? 'on' : ''}`} aria-pressed={choice === c} onClick={() => { setChoice(c); setSent(false); }}><Icon size={26} aria-hidden="true" /><span>{parentChoiceLabels[c]}</span></button>; })}</div>
      <label>كلمة للمعلمة (اختياري)<input value={text} maxLength={300} onChange={e => setText(e.target.value)} placeholder="مثال: أحبّت اللعبة وطلبت إعادتها" /></label>
      {error && <p className="conflict-note" role="alert">{error}</p>}
      <button type="button" className="button primary" disabled={!choice || busy} onClick={send}><Send size={16} />أرسلوا للمعلمة</button>
    </section>
  </>;
}
