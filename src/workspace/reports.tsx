import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileDown, FileText, Printer, Trash2 } from 'lucide-react';
import { countOf, dateLabel } from '../../packages/domain';
import { levelLabels, markLabels } from '../../packages/domain/desk';
import { goalStatusLabels, localDay, today } from '../../packages/domain/planning';
import { learnerReport, learnerReportBody } from '../../packages/domain/reports';
import { confirmDialog } from './confirm';
import { useWorkspace } from './store';
import { Avatar, Empty, PageHeading } from './Workspace';
import { archiveList, archiveRemove, archiveSave, downloadWord, type ArchiveEntry } from './word';
import './planning.css';
import './desk.css';

const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} ك.ب`;

/** One pupil on one page, from what is already recorded across the platform. */
function LearnerReportTab() {
  const { data, notify } = useWorkspace(); const [who, setWho] = useState(data.learners[0]?.id ?? ''); const [busy, setBusy] = useState(false); const now = today();
  const r = learnerReport(data, who, now);
  if (!r) return <section className="panel desk-panel"><Empty title="أضف ملف طالب أولًا" description="التقرير يُجمع من ملف الطالب وأهدافه وحضوره وتقييماته، فأضفه من «قائمة الطلاب» ثم عُد." /></section>;
  const word = async () => { setBusy(true); try { await downloadWord(`تقرير ${r.learner.name}`, learnerReportBody(r), 'تقرير طالب'); notify('نُزّل ملف Word وحُفظت نسخة في الأرشيف'); } catch { notify('تعذّر إنشاء الملف. حاول مرة أخرى.'); } finally { setBusy(false); } };
  const a = r.attendance; const no = (text: string) => <p className="muted report-none">{text}</p>;
  return <>
    <section className="panel desk-panel no-print"><div className="form-grid record-bar"><label>الطالب<select value={who} onChange={e => setWho(e.target.value)}>{data.learners.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><div className="heading-actions"><button className="button primary" disabled={busy} onClick={word}><FileDown size={17} />{busy ? 'جارٍ التجهيز…' : 'تصدير Word'}</button><button className="button secondary" onClick={() => window.print()}><Printer size={17} />طباعة</button></div></div></section>
    <article className="panel report-page">
      <header className="report-head"><Avatar learner={r.learner} /><div><h2>{r.learner.name}</h2><p className="muted">الصف {r.learner.grade} · {dateLabel(r.date)}</p></div><span className="plan-state">{r.plan}</span></header>
      <p className="info-note">يصف هذا التقرير ما سُجِّل عن الطالب وحده، ولا يقارنه بغيره.</p>
      <div className="report-grid">
        <section><h3>الحضور هذا الشهر</h3>{a.recorded ? <dl className="report-stats"><div><dt>{markLabels.present}</dt><dd>{a.present}</dd></div><div><dt>{markLabels.absent}</dt><dd>{a.absent}</dd></div><div><dt>{markLabels.late}</dt><dd>{a.late}</dd></div><div><dt>{markLabels.excused}</dt><dd>{a.excused}</dd></div><div><dt>النسبة</dt><dd>{a.rate}%</dd></div></dl> : no('لم يُسجَّل حضور هذا الشهر.')}</section>
        <section><h3>نقاط القوة والاحتياجات</h3><p>{r.learner.strengths || 'لم تُكتب نقاط القوة بعد.'}</p><p>{r.learner.needs || 'لم تُكتب الاحتياجات بعد.'}</p></section>
      </div>
      <section><h3>الأهداف الفردية</h3>{r.goals.length ? <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">الهدف</th><th scope="col">المادة</th><th scope="col">الحالة</th><th scope="col">الجلسات</th><th scope="col">آخر نتيجة</th></tr></thead><tbody>{r.goals.map((g, n) => <tr key={n}><th scope="row">{g.text}</th><td>{g.subject}</td><td><span className={`goal-state ${g.status}`}>{goalStatusLabels[g.status]}</span></td><td>{g.sessions}</td><td>{g.last || <span className="muted">لم يُقس</span>}</td></tr>)}</tbody></table></div> : no('لا أهداف فردية مسجلة.')}</section>
      <section><h3>مستويات الأداء</h3>{r.levels.length ? <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">المجال</th><th scope="col">المهارة</th><th scope="col">المستوى</th><th scope="col">بدأ من</th><th scope="col">التاريخ</th></tr></thead><tbody>{r.levels.map((l, n) => <tr key={n}><td>{l.domain}</td><th scope="row">{l.skill}</th><td><span className={`level-pill is-${l.level}`}>{levelLabels[l.level - 1]}</span></td><td>{l.from ? levelLabels[l.from - 1] : <span className="muted">قياس واحد</span>}</td><td>{dateLabel(l.date)}</td></tr>)}</tbody></table></div> : no('لا قياسات مسجلة.')}</section>
      <div className="report-grid">
        <section><h3>التحصيل حسب المادة</h3>{r.achievement.length ? <ul className="report-list">{r.achievement.map(c => <li key={c.subject}><strong>{c.subject}</strong><span>{c.average}% من {countOf(c.count, 'تقييم', 'تقييمين', 'تقييمات')}</span></li>)}</ul> : no('لا تقييمات بنسبة ومادة بعد.')}</section>
        <section><h3>خطط تعديل السلوك</h3>{r.behaviour.length ? <ul className="report-list">{r.behaviour.map((b, n) => <li key={n}><strong>{b.target}</strong><span>{b.active ? 'نشطة' : 'متوقفة'} · {b.count ? countOf(b.count, 'مرة', 'مرتان', 'مرات') : 'لا تكرار'} في آخر 14 يومًا</span></li>)}</ul> : no('لا خطط سلوك.')}</section>
        <section><h3>الإحالات</h3>{r.referrals.length ? <ul className="report-list">{r.referrals.map((x, n) => <li key={n}><strong>{x.to}</strong><span>{x.state} · {dateLabel(x.date)}</span></li>)}</ul> : no('لا إحالات.')}</section>
        <section><h3>أدلة من ملف الإنجاز</h3>{r.evidence.length ? <ul className="report-list">{r.evidence.map((e, n) => <li key={n}><strong>{e.title}</strong><span>{dateLabel(e.date)}{e.reviewed ? ' · مراجَع' : ''}</span></li>)}</ul> : no('لا أدلة بعد.')}</section>
      </div>
      <p className="no-print report-links"><Link className="text-link" to={`/learners/${r.learner.id}`}>ملف الطالب</Link><Link className="text-link" to={`/iep/${r.learner.id}`}>الخطة الفردية</Link><Link className="text-link" to={`/learners/${r.learner.id}/family`}>رسالة للأسرة</Link></p>
    </article>
  </>;
}

/** Every Word file exported from this browser, kept here as it was on the day, so it can be downloaded again unchanged. */
function ArchiveTab() {
  const { notify } = useWorkspace(); const [items, setItems] = useState<ArchiveEntry[]>(archiveList());
  useEffect(() => { const refresh = () => setItems(archiveList()); window.addEventListener('tarbya-archive', refresh); return () => window.removeEventListener('tarbya-archive', refresh); }, []);
  if (!items.length) return <section className="panel desk-panel"><Empty title="الأرشيف فارغ" description="كل ملف Word تصدّره من الخطط والتحضير والتقارير تُحفظ منه نسخة هنا على هذا الجهاز، لتنزيلها كما كانت يوم التصدير." /></section>;
  return <section className="panel desk-panel"><div className="section-heading"><h2>المستندات المُصدَّرة</h2><span className="desk-count">{countOf(items.length, 'مستند', 'مستندان', 'مستندات')}</span></div>
    <div className="desk-scroll"><table className="data-table"><thead><tr><th scope="col">المستند</th><th scope="col">النوع</th><th scope="col">التاريخ</th><th scope="col">الحجم</th><th scope="col"><span className="visually-hidden">إجراءات</span></th></tr></thead>
      <tbody>{items.map(d => <tr key={d.id}><th scope="row"><FileText size={16} aria-hidden="true" /> {d.name}</th><td>{d.kind}</td><td>{dateLabel(localDay(d.at))}</td><td>{kb(d.size)}</td><td><button type="button" className="icon-button" aria-label={`تنزيل ${d.name}`} onClick={async () => { if (!await archiveSave(d)) notify('لم نجد الملف على هذا الجهاز.'); }}><Download size={16} /></button><button type="button" className="icon-button" aria-label={`حذف ${d.name} من الأرشيف`} onClick={async () => { if (await confirmDialog(`حذف «${d.name}» من الأرشيف؟`, { ok: 'حذف' })) await archiveRemove(d.id); }}><Trash2 size={16} /></button></td></tr>)}</tbody></table></div>
    <p className="muted desk-note">الأرشيف محفوظ على هذا الجهاز فقط ولا يُرفع إلى أي خادم. تُحفظ آخر 40 مستندًا.</p></section>;
}

/** Reports and the archive of exported documents. */
export function ReportsPage() {
  const [tab, setTab] = useState<'report' | 'archive'>('report');
  return <>
    <PageHeading title="التقارير والأرشيف" description="تقرير شامل لكل طالب يُجمع مما سُجّل في المنصة، وأرشيف بكل ملف Word صدّرته كما كان يوم تصديره." />
    <div className="session-tabs desk-tabs no-print" role="tablist" aria-label="التقارير والأرشيف">{([['report', 'تقرير الطالب الشامل'], ['archive', 'أرشيف المستندات']] as const).map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{t}</button>)}</div>
    {tab === 'report' ? <LearnerReportTab /> : <ArchiveTab />}
  </>;
}
