import { Link } from 'react-router-dom';
import { ArrowLeft, Gamepad2, Target } from 'lucide-react';
import { dateLabel, describeAdaptation, type Learner } from '../../packages/domain';
import { classAnalytics } from '../../packages/domain/analytics';
import { useWorkspace } from './store';
import { Avatar } from './Workspace';
import './planning.css';

const pct = (n: number | null) => n === null ? 'لا بيانات بعد' : `${n}%`;
/** One card per pupil: goals, independence, before and after, mastery by subject, the adaptation profile. In the teacher's order, no ranking. */
export function ClassOverview({ learners }: { learners: Learner[] }) {
  const { data } = useWorkspace(); const rows = classAnalytics(learners, data.observations, data.practiceSessions ?? []);
  if (!learners.length) return null;
  return <section className="panel spaced-panel class-overview"><div className="section-heading"><h2>نظرة على كل طالبة</h2><span className="muted">نسب لكل طالبة على حدته، ولا ترتيب بينهم</span></div>
    <div className="analytics-grid">{rows.map(r => { const l = learners.find(x => x.id === r.learnerId)!; return <article key={r.learnerId} className="analytics-card"><header><Avatar learner={l} size="small" /><div><strong>{l.name}</strong><small>{r.lastSeen ? `آخر نشاط ${dateLabel(r.lastSeen)}` : 'لا ملاحظات بعد'}</small></div></header>
      <dl className="analytics-stats"><div><dt>أهداف محققة</dt><dd>{r.goalsMet} من {r.goalsTotal}</dd></div><div><dt>استقلالية</dt><dd>{pct(r.independence)}</dd></div><div><dt>قبل ثم بعد</dt><dd>{r.before === null ? 'لا بيانات بعد' : <>{r.before}% <ArrowLeft size={14} aria-hidden="true" /> {r.after === null ? 'بعد 3 جلسات' : `${r.after}%`}</>}</dd></div><div><dt>تدريب بالألعاب</dt><dd><Gamepad2 size={14} aria-hidden="true" /> {r.practice30} في 30 يومًا</dd></div></dl>
      {r.subjects.length > 0 && <div className="analytics-subjects">{r.subjects.map(s => <div key={s.subject}><span>{s.subject}<small>{s.observations} ملاحظة</small></span><div className="kit-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.rate} aria-label={`إتقان ${s.subject}`}><i style={{ width: `${s.rate}%` }} /></div><b>{s.rate}%</b></div>)}</div>}
      <div className="analytics-profile"><Target size={14} aria-hidden="true" /><span>نمط التكيّف:</span><div className="chips">{describeAdaptation(l.preferences).slice(0, 5).map(x => <span key={x}>{x}</span>)}</div></div>
      <Link className="text-link" to={`/learners/${l.id}`}>ملف الطالبة<ArrowLeft size={15} /></Link></article>; })}</div>
    <p className="muted analytics-note">قبل: متوسط خط الأساس إن وُجد، وإلا أول ملاحظتين. بعد: آخر ثلاث ملاحظات. الإتقان نسبة الصحيح في ملاحظات أهداف المادة. كلها مؤشرات للمعلمة والمنسق، لا حكمًا على الطالبة.</p>
  </section>;
}
