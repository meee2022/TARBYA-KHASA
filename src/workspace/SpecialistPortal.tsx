import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Send } from 'lucide-react';
import { countOf, dateLabel } from '../../packages/domain';
import { art } from '../../packages/domain/catalog';
import { levelLabels, markLabels } from '../../packages/domain/desk';
import { goalStatusLabels } from '../../packages/domain/planning';
import type { SpecialistView } from '../../packages/domain/specialist';
import { accountsAvailable, specialistNote, specialistPage, SyncError } from './teacherApi';
import { useSiteConfig } from './site';
import { Avatar } from './Workspace';
import './parent.css';
import './planning.css';
import './desk.css';

/** The specialist's page: opened from the link the teacher sent, no account. One pupil's report to read, and a place to leave a recommendation. */
export default function SpecialistPortal() {
  // Rendered outside the workspace's <Routes>, so the token is read from the path itself.
  const token = useLocation().pathname.split('/')[2] ?? ''; const { site } = useSiteConfig();
  const [view, setView] = useState<SpecialistView | null | undefined>(accountsAvailable ? undefined : null);
  useEffect(() => { if (!accountsAvailable) return; specialistPage(token).then(setView).catch(() => setView(null)); }, [token]);
  useEffect(() => { if (view) document.title = `تقرير ${view.child.name} · ${site.brandName}`; }, [view, site.brandName]);
  return <div className="studio parent-portal specialist-portal" dir="rtl">
    <header className="parent-top"><span className="brand-wordmark" role="img" aria-label={site.brandName} /><span className="eyebrow">بوابة الأخصائي</span></header>
    <main className="parent-main">
      {view === undefined && <div className="parent-skeleton" aria-busy="true" aria-label="جارٍ التحميل"><i /><i /><i /></div>}
      {view === null && <section className="panel parent-invalid rise-in"><img src={art('ui-sprout')} alt="" /><h1>هذا الرابط لم يعد صالحًا</h1><p>{accountsAvailable ? 'ربما أنشأ المعلم رابطًا جديدًا، أو أوقف هذا الرابط. اطلب الرابط الجديد من معلم الدعم.' : 'بوابة الأخصائي غير متاحة في هذه النسخة من المنصة.'}</p></section>}
      {view && <Page view={view} token={token} />}
    </main>
    <footer className="parent-foot"><span>{site.brandName}</span><span>هذه الصفحة للتواصل المهني داخل فريق الطالب. لا تشارك الرابط مع غير المعنيين به.</span></footer>
  </div>;
}

function Page({ view, token }: { view: SpecialistView; token: string }) {
  const [who, setWho] = useState(''); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState('');
  const a = view.attendance; const none = (t: string) => <p className="muted report-none">{t}</p>;
  const send = async () => { if (who.trim().length < 2 || text.trim().length < 3) { setError('اكتب اسمك أو دورك، ثم التوصية.'); return; } setBusy(true); setError(''); try { await specialistNote(token, who, text); setSent(true); setText(''); } catch (e) { setError(e instanceof SyncError ? e.message : 'تعذّر الإرسال. حاول مرة أخرى.'); } finally { setBusy(false); } };
  return <>
    <article className="panel report-page rise-in">
      <header className="report-head"><Avatar learner={view.child} /><div><h1>{view.child.name}</h1><p className="muted">الصف {view.child.grade} · مع {view.teacher} · {dateLabel(view.date)}</p></div><span className="plan-state">{view.plan}</span></header>
      <p className="info-note">يصف هذا التقرير ما سجّله المعلم عن الطالب وحده، ولا يقارنه بغيره. ليس تشخيصًا ولا تقييمًا رسميًا.</p>
      <div className="report-grid">
        <section><h3>نقاط القوة والاحتياجات</h3><p>{view.child.strengths || 'لم تُكتب نقاط القوة بعد.'}</p><p>{view.child.needs || 'لم تُكتب الاحتياجات بعد.'}</p></section>
        <section><h3>الحضور هذا الشهر</h3>{a.recorded ? <dl className="report-stats"><div><dt>{markLabels.present}</dt><dd>{a.present}</dd></div><div><dt>{markLabels.absent}</dt><dd>{a.absent}</dd></div><div><dt>{markLabels.late}</dt><dd>{a.late}</dd></div><div><dt>{markLabels.excused}</dt><dd>{a.excused}</dd></div><div><dt>النسبة</dt><dd>{a.rate}%</dd></div></dl> : none('لم يُسجَّل حضور هذا الشهر.')}</section>
      </div>
      <section><h3>الأهداف الفردية</h3>{view.goals.length ? <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">الهدف</th><th scope="col">المادة</th><th scope="col">الحالة</th><th scope="col">آخر نتيجة</th></tr></thead><tbody>{view.goals.map((g, n) => <tr key={n}><th scope="row">{g.text}</th><td>{g.subject}</td><td><span className={`goal-state ${g.status}`}>{goalStatusLabels[g.status]}</span></td><td>{g.last || <span className="muted">لم يُقس</span>}</td></tr>)}</tbody></table></div> : none('لا أهداف فردية مسجلة.')}</section>
      <section><h3>مستويات الأداء</h3>{view.levels.length ? <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">المجال</th><th scope="col">المهارة</th><th scope="col">المستوى</th><th scope="col">بدأ من</th></tr></thead><tbody>{view.levels.map((l, n) => <tr key={n}><td>{l.domain}</td><th scope="row">{l.skill}</th><td><span className={`level-pill is-${l.level}`}>{levelLabels[l.level - 1]}</span></td><td>{l.from ? levelLabels[l.from - 1] : <span className="muted">قياس واحد</span>}</td></tr>)}</tbody></table></div> : none('لا قياسات مسجلة.')}</section>
      <div className="report-grid">
        <section><h3>خطط تعديل السلوك</h3>{view.behaviour.length ? <ul className="report-list">{view.behaviour.map((b, n) => <li key={n}><strong>{b.target}</strong><span>{b.replacement ? `البديل: ${b.replacement} · ` : ''}{b.count ? countOf(b.count, 'مرة', 'مرتان', 'مرات') : 'لا تكرار'} في آخر 14 يومًا</span></li>)}</ul> : none('لا خطط سلوك.')}</section>
        <section><h3>الإحالات</h3>{view.referrals.length ? <ul className="report-list">{view.referrals.map((x, n) => <li key={n}><strong>{x.to}</strong><span>{x.reason} · {x.state}</span></li>)}</ul> : none('لا إحالات.')}</section>
      </div>
    </article>
    <section className="panel parent-section rise-in specialist-note"><h2>توصيتك للمعلم</h2><p className="muted">تصل إلى معلم الطالب وحده. اكتب ما لاحظته وما تقترحه، دون بيانات تعرّف بالطالب خارج المدرسة.</p>
      {sent && <p className="parent-sent" role="status"><Check size={17} aria-hidden="true" />وصلت توصيتك إلى المعلم. يمكنك إرسال أخرى.</p>}
      <div className="form-stack"><label>اسمك أو دورك<input value={who} maxLength={80} onChange={e => setWho(e.target.value)} placeholder="مثلًا: أخصائي النطق" /></label><label>التوصية<textarea rows={4} value={text} maxLength={1200} onChange={e => setText(e.target.value)} placeholder="ما لاحظته، وما تقترح أن يُجرَّب في الحصص القادمة" /></label></div>
      {error && <p className="alert" role="alert">{error}</p>}
      <button type="button" className="button primary" disabled={busy} onClick={send}><Send size={16} />{busy ? 'جارٍ الإرسال…' : 'أرسل التوصية'}</button>
    </section>
  </>;
}
