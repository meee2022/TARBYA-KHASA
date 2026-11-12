import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Printer } from 'lucide-react';
import { dateLabel, supportLabels, supportOrder } from '../../packages/domain';
import { goalProgress } from '../../packages/domain/planning';
import { useWorkspace } from './store';
import { useSiteConfig } from './site';
import { Empty, PageHeading } from './Workspace';
import './packs.css';

/** A paper trial sheet for one pupil: ten boxes per goal, the prompt scale as a legend. For the lesson where the screen is not the tool. */
export function DataSheet() {
  const { id } = useParams(); const { data } = useWorkspace(); const { site } = useSiteConfig();
  const learner = data.learners.find(l => l.id === id);
  if (!learner) return <Empty title="الملف غير موجود" description="عد إلى قائمة الطلاب." />;
  const levels = site.catalog.support.filter(s => s.enabled && s.id !== 'not-observed');
  const goals = learner.goals.filter(g => !g.approvedAt);
  return <>
    <Link className="back-link no-print" to={`/learners/${learner.id}`}><ArrowRight size={16} />ملف الطالب</Link>
    <PageHeading title="ورقة تسجيل المحاولات" description="تُطبع قبل الحصة: صفّ لكل هدف، وعشر محاولات، ورمز المساعدة في كل خانة. تُنقل الأرقام بعدها إلى «تسجيل ملاحظة»."><button className="button primary" onClick={() => window.print()}><Printer size={17} />طباعة</button></PageHeading>
    <article className="sheet-page data-sheet" dir="rtl">
      <header className="sheet-head"><div><strong>{learner.name}</strong><span>الصف {learner.grade}</span></div><div><span>التاريخ: ________</span><span>المكان: ________</span><span>مع: ________</span></div></header>
      {goals.length ? goals.map(g => <section key={g.id} className="data-goal"><h2>{g.text}</h2><p className="muted">المعيار: {g.target} من {g.opportunities}{g.baseline ? ` · خط الأساس: ${g.baseline}` : ''}</p>
        <table className="trial-table"><thead><tr><th scope="row">المحاولة</th>{Array.from({ length: 10 }, (_, n) => <th key={n} scope="col">{n + 1}</th>)}</tr></thead><tbody><tr><th scope="row">صحيح؟</th>{Array.from({ length: 10 }, (_, n) => <td key={n} />)}</tr><tr><th scope="row">المساعدة</th>{Array.from({ length: 10 }, (_, n) => <td key={n} />)}</tr></tbody></table>
        {g.steps?.length ? <ol className="data-steps">{g.steps.map((s, n) => <li key={n}>{s} <span>____</span></li>)}</ol> : null}
      </section>) : <p className="family-empty">لا توجد أهداف قيد التدريب.</p>}
      <footer className="data-legend"><strong>رموز المساعدة:</strong> {levels.map((l, n) => <span key={l.id}>{String.fromCharCode(0x0661 + n).normalize()}{' '}= {l.label}</span>)}<span>✓ = صحيح · ✗ = غير صحيح · — = لم تُلاحظ</span></footer>
    </article>
  </>;
}

/** A certificate for a goal the teacher approved: the pupil's pseudonym, the skill, the date. Printed, handed over, kept. */
export function Certificate() {
  const { id, goalId } = useParams(); const { data } = useWorkspace(); const { site } = useSiteConfig();
  const learner = data.learners.find(l => l.id === id); const goal = learner?.goals.find(g => g.id === goalId);
  if (!learner || !goal) return <Empty title="الهدف غير موجود" description="عد إلى ملف الطالب." />;
  const p = goalProgress(goal, data.observations); const first = learner.name.split(/\s|·/)[0];
  const best = p.teaching.length ? Math.max(...p.teaching.map(o => o.correct)) : 0;
  const level = p.last ? supportLabels[supportOrder.includes(p.last.support) ? p.last.support : 'independent'] : '';
  return <>
    <Link className="back-link no-print" to={`/learners/${learner.id}`}><ArrowRight size={16} />ملف الطالب</Link>
    <PageHeading title="شهادة إنجاز" description="للطالب وأسرته: ما تعلّمه، بلا درجات ولا مقارنة. تُطبع بالاسم الذي تعرفه الأسرة."><button className="button primary" onClick={() => window.print()}><Printer size={17} />طباعة</button></PageHeading>
    {!goal.approvedAt && <p className="info-note no-print">هذا الهدف لم يُعتمد بعد. يمكنك طباعة الشهادة عند الاعتماد، أو الآن لتشجيع الطالب على خطوة كبيرة.</p>}
    <article className="sheet-page certificate" dir="rtl">
      <div className="certificate-frame"><img src="/images/content/ui-rosette.webp" alt="" /><p className="certificate-brand">{site.brandName}</p><h2>شهادة إنجاز</h2><p className="certificate-to">تُمنح إلى</p><p className="certificate-name">{first}</p><p className="certificate-text">لأنك تعلّمت: <strong>{goal.text}</strong></p>{best > 0 && <p className="certificate-text">وأجبت {best} من {goal.opportunities} {level ? `${level}` : ''}</p>}<p className="certificate-date">{dateLabel(goal.approvedAt ? `${goal.approvedAt}T12:00:00.000Z` : new Date().toISOString())}</p><div className="certificate-sign"><span>المعلم: ______________</span><span>الأسرة: ______________</span></div></div>
    </article>
  </>;
}
