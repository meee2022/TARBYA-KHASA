import type { Learner, Workspace } from './index.ts';
import { attendanceSummary, achievementOf, behaviourCounts, latestLevels, levelLabels, markLabels, assessmentKinds } from './desk.ts';
import { approvalLabel, goalProgress, goalStatusLabels, type GoalStatus } from './planning.ts';
import { referralStates } from './records.ts';
import { bar, label, para, table, title } from './docx.ts';

/** Everything the platform knows about one pupil, gathered for a single page: for the family meeting, the specialist, or the school file. It describes the pupil alone and compares them with no one. */
export interface LearnerReport {
  learner: Learner; date: string; month: string;
  plan: string;
  attendance: { recorded: number; present: number; absent: number; late: number; excused: number; rate: number | null };
  goals: { text: string; subject: string; status: GoalStatus; sessions: number; last: string }[];
  levels: { domain: string; skill: string; level: number; from?: number; kind: string; date: string; stale: boolean }[];
  achievement: { subject: string; average: number; count: number }[];
  behaviour: { target: string; replacement: string; active: boolean; count: number }[];
  evidence: { title: string; date: string; reviewed: boolean }[];
  referrals: { to: string; reason: string; state: string; date: string }[];
}

export function learnerReport(w: Workspace, learnerId: string, now: string): LearnerReport | undefined {
  const learner = w.learners.find(l => l.id === learnerId); if (!learner) return undefined;
  const desk = w.desk ?? {}; const month = now.slice(0, 7); const iep = w.ieps?.find(p => p.learnerId === learnerId);
  return {
    learner, date: now, month, plan: iep ? approvalLabel(iep) : 'لا خطة فردية بعد',
    attendance: attendanceSummary(desk.attendance ?? [], learnerId, month),
    goals: learner.goals.map(g => { const p = goalProgress(g, w.observations, now); return { text: g.text, subject: g.subject, status: p.status, sessions: p.rows.length, last: p.last ? `${p.last.correct} من ${p.last.total}` : '' }; }),
    levels: latestLevels(desk.performance ?? [], learnerId, now).map(e => ({ domain: e.domain, skill: e.skill, level: e.level, from: e.from, kind: assessmentKinds[e.kind ?? 'formative'], date: e.date, stale: e.stale })),
    achievement: Object.entries(achievementOf(desk.performance ?? [], learnerId)).map(([subject, c]) => ({ subject, ...c })),
    behaviour: (desk.behaviourPlans ?? []).filter(b => b.learnerId === learnerId).map(b => ({ target: b.target, replacement: b.replacement, active: b.active, count: behaviourCounts(learner.behaviour, b.id, now).reduce((t, d) => t + d.count, 0) })),
    evidence: (desk.evidence ?? []).filter(e => e.learnerId === learnerId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map(e => ({ title: e.title, date: e.date, reviewed: e.reviewed })),
    referrals: (desk.referrals ?? []).filter(r => r.learnerId === learnerId).sort((a, b) => b.date.localeCompare(a.date)).map(r => ({ to: r.to, reason: r.reason, state: referralStates[r.state], date: r.date })),
  };
}

const none = (span: number, text: string) => [{ t: text, span }];
/** The same report as a Word document. Signature lines stay empty for the school to sign by hand. */
export function learnerReportBody(r: LearnerReport) {
  const a = r.attendance;
  return title(`تقرير الطالب: ${r.learner.name}`) + para(`الصف ${r.learner.grade} · ${r.date}. يصف هذا التقرير ما سُجِّل عن الطالب وحده، ولا يقارنه بغيره.`, { center: true })
    + table([2, 4, 2, 4], [bar('ملخص', 4), [label('الخطة الفردية'), r.plan, label(`حضور شهر ${r.month}`), a.recorded ? `${markLabels.present} ${a.present}، ${markLabels.absent} ${a.absent}، ${markLabels.late} ${a.late}، ${markLabels.excused} ${a.excused} · النسبة ${a.rate}%` : 'لم يُسجَّل حضور هذا الشهر'], [label('نقاط القوة'), r.learner.strengths, label('الاحتياجات'), r.learner.needs]])
    + table([6, 2, 2, 2], [bar('الأهداف الفردية', 4), [label('الهدف'), label('المادة'), label('الحالة'), label('آخر نتيجة')], ...(r.goals.length ? r.goals.map(g => [g.text, g.subject, goalStatusLabels[g.status], g.last || 'لم يُقس']) : [none(4, 'لا أهداف فردية مسجلة.')])])
    + table([3, 4, 2, 2, 1], [bar('مستويات الأداء', 5), [label('المجال'), label('المهارة'), label('المستوى'), label('بدأ من'), label('النوع')], ...(r.levels.length ? r.levels.map(l => [l.domain, l.skill, levelLabels[l.level - 1], l.from ? levelLabels[l.from - 1] : 'قياس واحد', l.kind]) : [none(5, 'لا قياسات مسجلة.')])])
    + (r.achievement.length ? table([4, 2, 2], [bar('التحصيل حسب المادة', 3), [label('المادة'), label('المتوسط'), label('عدد التقييمات')], ...r.achievement.map(c => [c.subject, `${c.average}%`, String(c.count)])]) : '')
    + (r.behaviour.length ? table([4, 4, 2, 2], [bar('خطط تعديل السلوك', 4), [label('السلوك المستهدف'), label('السلوك البديل'), label('الحالة'), label('في آخر 14 يومًا')], ...r.behaviour.map(b => [b.target, b.replacement, b.active ? 'نشطة' : 'متوقفة', `${b.count} مرة`])]) : '')
    + (r.referrals.length ? table([2, 3, 5, 2], [bar('الإحالات', 4), [label('التاريخ'), label('إلى'), label('السبب'), label('الحالة')], ...r.referrals.map(x => [x.date, x.to, x.reason, x.state])]) : '')
    + (r.evidence.length ? table([6, 2, 2], [bar('أدلة من ملف الإنجاز', 3), [label('الدليل'), label('التاريخ'), label('المراجعة')], ...r.evidence.map(e => [e.title, e.date, e.reviewed ? 'مراجَع' : 'ينتظر المراجعة'])]) : '')
    + table([1, 1], [[label('توقيع المعلم'), label('توقيع ولي الأمر')], [' \n ', ' \n ']]);
}
