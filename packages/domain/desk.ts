import type { BehaviourNote, Workspace } from './index.ts';
import { validDistributions, type Distribution } from './distribution.ts';
import { referralsDue, validRecords, type Records } from './records.ts';

/** The teacher's working desk: her timetable, her own tasks, her groups, the daily register and where each pupil stands in each skill. */
export interface TimetableSlot { id: string; day: number; period: number; subject: string; place: string; learnerIds: string[]; lessonId?: string; }
export interface Timetable { periods: number; times: string[]; slots: TimetableSlot[]; }
export type TaskPriority = 'high' | 'mid' | 'low';
export interface Task { id: string; title: string; scope: 'daily' | 'weekly'; priority: TaskPriority; due: string; done: boolean; }
export interface Group { id: string; name: string; grade: string; learnerIds: string[]; subject: string; sessions: number; minutes: number; support: string; }
export type AttendanceMark = 'present' | 'absent' | 'late' | 'excused';
export interface AttendanceDay { date: string; marks: Record<string, { mark: AttendanceMark; note?: string }>; }
/** One reading of a skill. The level says how much help the pupil needs today; it is never a rank among pupils. */
export type AssessmentKind = 'pre' | 'formative' | 'final';
export const assessmentKinds: Record<AssessmentKind, string> = { pre: 'قبلي', formative: 'تكويني', final: 'ختامي' };
export interface PerformanceEntry { id: string; learnerId: string; domain: string; skill: string; level: number; percent?: number; tool: string; date: string; note: string; /** When in the teaching it was taken; a reading without it counts as formative. */ kind?: AssessmentKind; /** The school subject, when the reading counts toward achievement in it. */ subject?: string; instrumentId?: string; }
/** A measuring tool the teacher keeps: items to check and how many must be right to pass. */
export interface Instrument { id: string; name: string; kind: string; subject: string; domain: string; skill: string; items: string[]; pass: number; }
/** The score of one use of a tool: the share of items done right, and whether the pass mark set in advance was met. */
export const instrumentScore = (tool: Instrument, right: number) => ({ percent: tool.items.length ? Math.round(right / tool.items.length * 100) : 0, met: right >= tool.pass });
/** A pupil's achievement by subject: the average of the last three scored readings in each. Readings without a subject or a score are left out. */
export function achievementOf(entries: PerformanceEntry[], learnerId: string): Record<string, { average: number; count: number }> {
  const by: Record<string, PerformanceEntry[]> = {};
  for (const e of entries) if (e.learnerId === learnerId && e.subject && e.percent !== undefined) (by[e.subject] ??= []).push(e);
  return Object.fromEntries(Object.entries(by).map(([subject, list]) => { const last = list.sort((a, b) => a.date.localeCompare(b.date)).slice(-3); return [subject, { average: Math.round(last.reduce((t, e) => t + e.percent!, 0) / last.length), count: last.length }]; }));
}
export interface Desk extends Records { timetable?: Timetable; tasks?: Task[]; groups?: Group[]; attendance?: AttendanceDay[]; performance?: PerformanceEntry[]; behaviourPlans?: BehaviourPlan[]; distributions?: Distribution[]; instruments?: Instrument[]; }
/** One target behaviour for one pupil: what is seen and counted, what to teach instead, and how the room helps. The function is the teacher's working guess, never a diagnosis. */
export interface BehaviourPlan { id: string; learnerId: string; target: string; definition: string; baseline: string; goal: string; func: string; replacement: string; prevention: string[]; reinforcers: string[]; response: string; team: string; review: string; active: boolean; }

export const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
export const priorityLabels: Record<TaskPriority, string> = { high: 'عالية', mid: 'متوسطة', low: 'منخفضة' };
export const markLabels: Record<AttendanceMark, string> = { present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'مستأذن' };
export const marks = Object.keys(markLabels) as AttendanceMark[];
export const levelLabels = ['لا يؤدي المهارة بعد', 'بمساعدة كاملة', 'بمساعدة جزئية', 'بتلميح بسيط', 'مستقل'];
export const defaultTimetable = (): Timetable => ({ periods: 7, times: ['7:10', '7:55', '8:40', '9:45', '10:30', '11:15', '12:00'], slots: [] });

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
/** Sunday is 0 and Thursday is 4 in a school week; Friday and Saturday have no column. */
export const schoolDay = (date: string) => { const d = new Date(`${date}T12:00:00Z`).getUTCDay(); return d <= 4 ? d : -1; };

/** A pupil's register for one month. Late counts as attended; days with no mark are left out of the rate. */
export function attendanceSummary(days: AttendanceDay[], learnerId: string, month: string) {
  const count: Record<AttendanceMark, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const d of days) { const m = d.date.startsWith(month) ? d.marks[learnerId]?.mark : undefined; if (m) count[m]++; }
  const recorded = marks.reduce((t, m) => t + count[m], 0);
  return { ...count, recorded, rate: recorded ? Math.round((count.present + count.late) / recorded * 100) : null };
}

/** The latest reading of every skill for one pupil, newest first, with the level the skill started from when it was measured more than once. A reading older than 90 days is flagged so it is measured again, not trusted. */
export function latestLevels(entries: PerformanceEntry[], learnerId: string, now: string) {
  const latest = new Map<string, PerformanceEntry>(), first = new Map<string, PerformanceEntry>(); const key = (e: PerformanceEntry) => `${e.domain}|${e.skill}`;
  for (const e of entries) { if (e.learnerId !== learnerId) continue; const k = key(e); const had = latest.get(k); if (!had || e.date > had.date) latest.set(k, e); const was = first.get(k); if (!was || e.date < was.date) first.set(k, e); }
  return [...latest.values()].sort((a, b) => b.date.localeCompare(a.date)).map(e => { const start = first.get(key(e))!; return { ...e, stale: daysBetween(e.date, now) > 90, from: start.id === e.id ? undefined : start.level }; });
}

export interface Notice { id: string; kind: 'register' | 'goal' | 'review' | 'task' | 'pupil' | 'plan' | 'behaviour' | 'referral'; text: string; to: string; }
/** What needs the teacher today, worked out from her own data. Nothing here is sent anywhere. */
export function notices(w: Workspace, now: string): Notice[] {
  const out: Notice[] = []; const desk = w.desk ?? {};
  if (w.learners.length && schoolDay(now) >= 0 && !(desk.attendance ?? []).some(d => d.date === now)) out.push({ id: 'register', kind: 'register', text: 'لم يُسجَّل حضور اليوم بعد.', to: '/attendance' });
  for (const t of desk.tasks ?? []) if (!t.done && t.due && t.due < now) out.push({ id: `task-${t.id}`, kind: 'task', text: `مهمة تجاوزت موعدها: ${t.title}`, to: '/tasks' });
  const waiting = w.lessons.filter(l => l.status === 'review').length;
  if (waiting) out.push({ id: 'review', kind: 'review', text: waiting === 1 ? 'تحضير واحد ينتظر المراجعة.' : `${waiting} تحاضير تنتظر المراجعة.`, to: '/review' });
  for (const p of w.ieps ?? []) {
    const l = w.learners.find(x => x.id === p.learnerId); if (!l || !/^\d{4}-\d{2}-\d{2}$/.test(p.nextReview)) continue;
    const due = daysBetween(now, p.nextReview);
    if (due <= 14) out.push({ id: `plan-${p.learnerId}`, kind: 'plan', text: `${l.name.split(/\s|·/)[0]}: ${due < 0 ? 'مضى موعد مراجعة الخطة الفردية' : due === 0 ? 'مراجعة الخطة الفردية اليوم' : 'مراجعة الخطة الفردية خلال أسبوعين'}.`, to: `/iep/${p.learnerId}` });
  }
  for (const r of referralsDue(desk.referrals ?? [], now)) { const l = w.learners.find(x => x.id === r.learnerId); if (l) out.push({ id: `referral-${r.id}`, kind: 'referral', text: `${l.name.split(/\s|·/)[0]}: حان موعد متابعة الإحالة إلى ${r.to}.`, to: '/team' }); }
  for (const b of desk.behaviourPlans ?? []) {
    const l = w.learners.find(x => x.id === b.learnerId);
    if (l && b.active && b.review && b.review <= now) out.push({ id: `behaviour-${b.id}`, kind: 'behaviour', text: `${l.name.split(/\s|·/)[0]}: حان موعد مراجعة خطة السلوك «${b.target}».`, to: '/behaviour' });
  }
  for (const l of w.learners) {
    const name = l.name.split(/\s|·/)[0];
    if (!l.goals.length) { out.push({ id: `nogoal-${l.id}`, kind: 'pupil', text: `لا أهداف فردية بعد في ملف ${name}.`, to: `/learners/${l.id}` }); continue; }
    for (const g of l.goals) {
      if (g.approvedAt) continue;
      const last = w.observations.filter(o => o.goalId === g.id).reduce((d, o) => o.date > d ? o.date : d, '');
      if (!last || daysBetween(last.slice(0, 10), now) > 14) out.push({ id: `goal-${g.id}`, kind: 'goal', text: `${name}: هدف بلا قياس منذ أكثر من أسبوعين: ${g.text}`, to: `/learners/${l.id}` });
    }
  }
  return out;
}

/** How often the planned behaviour was noted on each of the last days, oldest first. Only notes recorded against the plan count. */
export function behaviourCounts(notes: BehaviourNote[] | undefined, planId: string, now: string, days = 14): { date: string; count: number }[] {
  return Array.from({ length: days }, (_, i) => { const date = new Date(Date.parse(`${now}T12:00:00Z`) - (days - 1 - i) * 86400000).toISOString().slice(0, 10); return { date, count: (notes ?? []).filter(n => n.planId === planId && n.date === date).length }; });
}

const str = (v: unknown, max = 400) => typeof v === 'string' && v.length <= max;
const ids = (v: unknown) => Array.isArray(v) && v.length <= 200 && v.every(x => str(x, 80));
/** Trust boundary for the synced workspace: shapes and sizes only, so a broken or oversized desk never reaches the account. */
export function validDesk(d: unknown): boolean {
  if (d === undefined) return true; if (!d || typeof d !== 'object') return false; const x = d as Desk;
  if (x.timetable !== undefined) { const t = x.timetable; if (!t || !Number.isInteger(t.periods) || t.periods < 1 || t.periods > 10 || !Array.isArray(t.times) || t.times.length > 10 || !t.times.every(s => str(s, 12)) || !Array.isArray(t.slots) || t.slots.length > 50 || !t.slots.every(s => str(s.id, 80) && Number.isInteger(s.day) && s.day >= 0 && s.day <= 4 && Number.isInteger(s.period) && s.period >= 0 && s.period < 10 && str(s.subject, 120) && str(s.place, 120) && ids(s.learnerIds) && (s.lessonId === undefined || str(s.lessonId, 80)))) return false; }
  if (x.tasks !== undefined && !(Array.isArray(x.tasks) && x.tasks.length <= 300 && x.tasks.every(t => str(t.id, 80) && str(t.title, 200) && ['daily', 'weekly'].includes(t.scope) && t.priority in priorityLabels && str(t.due, 10) && typeof t.done === 'boolean'))) return false;
  if (x.groups !== undefined && !(Array.isArray(x.groups) && x.groups.length <= 60 && x.groups.every(g => str(g.id, 80) && str(g.name, 80) && str(g.grade, 40) && ids(g.learnerIds) && str(g.subject, 80) && Number.isFinite(g.sessions) && Number.isFinite(g.minutes) && str(g.support, 60)))) return false;
  if (x.attendance !== undefined && !(Array.isArray(x.attendance) && x.attendance.length <= 400 && x.attendance.every(a => str(a.date, 10) && !!a.marks && typeof a.marks === 'object' && Object.values(a.marks).every(m => !!m && m.mark in markLabels && (m.note === undefined || str(m.note, 200)))))) return false;
  if (x.performance !== undefined && !(Array.isArray(x.performance) && x.performance.length <= 3000 && x.performance.every(p => str(p.id, 80) && str(p.learnerId, 80) && str(p.domain, 80) && str(p.skill, 160) && Number.isInteger(p.level) && p.level >= 1 && p.level <= 5 && (p.percent === undefined || (Number.isFinite(p.percent) && p.percent >= 0 && p.percent <= 100)) && str(p.tool, 80) && str(p.date, 10) && str(p.note, 400) && (p.kind === undefined || p.kind in assessmentKinds) && (p.subject === undefined || str(p.subject, 80)) && (p.instrumentId === undefined || str(p.instrumentId, 80))))) return false;
  if (!validDistributions(x.distributions) || !validRecords(x)) return false;
  if (x.instruments !== undefined && !(Array.isArray(x.instruments) && x.instruments.length <= 200 && x.instruments.every(t => !!t && str(t.id, 80) && str(t.name, 120) && str(t.kind, 60) && str(t.subject, 80) && str(t.domain, 80) && str(t.skill, 160) && Array.isArray(t.items) && t.items.length >= 1 && t.items.length <= 30 && t.items.every(i => str(i, 200)) && Number.isInteger(t.pass) && t.pass >= 1 && t.pass <= t.items.length))) return false;
  const list = (v: unknown) => Array.isArray(v) && v.length <= 30 && v.every(s => str(s, 120));
  if (x.behaviourPlans !== undefined && !(Array.isArray(x.behaviourPlans) && x.behaviourPlans.length <= 200 && x.behaviourPlans.every(b => !!b && str(b.id, 80) && str(b.learnerId, 80) && str(b.target, 160) && str(b.definition, 600) && str(b.baseline, 200) && str(b.goal, 200) && str(b.func, 120) && str(b.replacement, 300) && list(b.prevention) && list(b.reinforcers) && str(b.response, 800) && str(b.team, 200) && str(b.review, 10) && typeof b.active === 'boolean'))) return false;
  return true;
}
