import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Printer } from 'lucide-react';
import { dateLabel } from '../../packages/domain';
import { familyWeek } from '../../packages/domain/planning';
import { useAllPacks, useWorkspace } from './store';
import { Empty, PageHeading } from './Workspace';
import './packs.css';

/** A one-page weekly letter for the family, printed by the teacher. Nothing here is saved or sent anywhere. */
export default function FamilyReport() {
  const { id } = useParams(); const { data } = useWorkspace(); const { all } = useAllPacks();
  const learner = data.learners.find(l => l.id === id); const [note, setNote] = useState(''); const [home, setHome] = useState('');
  const week = useMemo(() => learner ? familyWeek(data, learner.id, all) : undefined, [data, learner, all]);
  if (!learner || !week) return <Empty title="الملف غير موجود" description="عد إلى قائمة الطلاب." />;
  const first = learner.name.split(/\s|·/)[0];
  return <>
    <Link className="back-link" to={`/learners/${learner.id}`}><ArrowRight size={16} />ملف الطالب</Link>
    <PageHeading title="رسالة أسبوعية للأسرة" description="صفحة واحدة تُطبع أو تُحفظ PDF. تكتب فيها المعلمة ملاحظتها، ولا يُحفظ شيء منها ولا يُرسل."><button className="button primary" onClick={() => window.print()}><Printer size={17} />طباعة أو حفظ PDF</button></PageHeading>
    <article className="sheet-page family-letter" dir="rtl">
      <header><p className="family-date">من {dateLabel(week.from)} إلى {dateLabel(new Date().toISOString())}</p><h2>إلى أسرة {first}</h2><p>نشارككم ما عملنا عليه هذا الأسبوع، وما يمكن أن يساعد في البيت.</p></header>
      {week.empty ? <p className="family-empty">لم تُسجَّل أنشطة هذا الأسبوع بعد.</p> : <section><h3>ماذا تعلّمنا</h3><ul>{week.lessons.map(t => <li key={t}>{t}</li>)}{week.activities.map(a => <li key={a.title}>{a.title}{a.times > 1 ? ` (${a.times} مرات)` : ''}</li>)}</ul></section>}
      {!!week.goals.length && <section><h3>كيف تسير الأهداف</h3><ul className="family-goals">{week.goals.map(g => <li key={g.text}><span>{g.text}</span><strong>{g.status}</strong></li>)}</ul></section>}
      {!!week.words.length && <section><h3>كلمات نردّدها في البيت</h3><p className="family-words">{week.words.map(w => <span key={w} dir="auto">{w}</span>)}</p></section>}
      {learner.strengths && <section><h3>ما يحبه ويستمتع به</h3><p>{learner.strengths}</p></section>}
      <section><h3>جرّبوا في البيت</h3><textarea aria-label="اقتراح للبيت" rows={2} value={home} onChange={e => setHome(e.target.value)} placeholder="مثال: اسألوه عن حيوانه المفضّل، واقبلوا الإجابة بالإشارة إلى الصورة." /></section>
      <section><h3>ملاحظة المعلمة</h3><textarea aria-label="ملاحظة المعلمة" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="اكتبي ملاحظة قصيرة إيجابية ومحددة." /></section>
      <footer>هذه رسالة للتواصل بين المدرسة والبيت، وليست تقييمًا رسميًا.</footer>
    </article>
  </>;
}
