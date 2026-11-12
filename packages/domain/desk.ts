import type { Workspace } from './index.ts';

/** The teacher's working desk: her timetable, her own tasks, her groups, the daily register and where each pupil stands in each skill. */
export interface TimetableSlot { id: string; day: number; period: number; subject: string; place: string; learnerIds: string[]; lessonId?: string; }
export interface Timetable { periods: number; times: string[]; slots: TimetableSlot[]; }
export type TaskPriority = 'high' | 'mid' | 'low';
export interface Task { id: string; title: string; scope: 'daily' | 'weekly'; priority: TaskPriority; due: string; done: boolean; }
export interface Group { id: string; name: string; grade: string; learnerIds: string[]; subject: string; sessions: number; minutes: number; support: string; }
export type AttendanceMark = 'present' | 'absent' | 'late' | 'excused';
export interface AttendanceDay { date: string; marks: Record<string, { mark: AttendanceMark; note?: string }>; }
/** One reading of a skill. The level says how much help the pupil needs today; it is never a rank among pupils. */
export interface PerformanceEntry { id: string; learnerId: string; domain: string; skill: string; level: number; percent?: number; tool: string; date: string; note: string; }
export interface Desk { timetable?: Timetable; tasks?: Task[]; groups?: Group[]; attendance?: AttendanceDay[]; performance?: PerformanceEntry[]; }

export const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
export const priorityLabels: Record<TaskPriority, string> = { high: 'عالية', mid: 'متوسطة', low: 'منخفضة' };
export const markLabels: Record<AttendanceMark, string> = { present: 'حاضرة', absent: 'غائبة', late: 'متأخرة', excused: 'مستأذنة' };
export const marks = Object.keys(markLabels) as AttendanceMark[];
export const levelLabels = ['لا تؤدي المهارة بعد', 'بمساعدة كاملة', 'بمساعدة جزئية', 'بتلميح بسيط', 'مستقلة'];
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

/** The latest reading of every skill for one pupil, newest first. A reading older than 90 days is flagged so it is measured again, not trusted. */
export function latestLevels(entries: PerformanceEntry[], learnerId: string, now: string) {
  const latest = new Map<string, PerformanceEntry>();
  for (const e of entries) { if (e.learnerId !== learnerId) continue; const key = `${e.domain}|${e.skill}`; const had = latest.get(key); if (!had || e.date > had.date) latest.set(key, e); }
  return [...latest.values()].sort((a, b) => b.date.localeCompare(a.date)).map(e => ({ ...e, stale: daysBetween(e.date, now) > 90 }));
}

export interface Notice { id: string; kind: 'register' | 'goal' | 'review' | 'task' | 'pupil'; text: string; to: string; }
/** What needs the teacher today, worked out from her own data. Nothing here is sent anywhere. */
export function notices(w: Workspace, now: string): Notice[] {
  const out: Notice[] = []; const desk = w.desk ?? {};
  if (w.learners.length && schoolDay(now) >= 0 && !(desk.attendance ?? []).some(d => d.date === now)) out.push({ id: 'register', kind: 'register', text: 'لم يُسجَّل حضور اليوم بعد.', to: '/attendance' });
  for (const t of desk.tasks ?? []) if (!t.done && t.due && t.due < now) out.push({ id: `task-${t.id}`, kind: 'task', text: `مهمة تجاوزت موعدها: ${t.title}`, to: '/tasks' });
  const waiting = w.lessons.filter(l => l.status === 'review').length;
  if (waiting) out.push({ id: 'review', kind: 'review', text: waiting === 1 ? 'تحضير واحد ينتظر المراجعة.' : `${waiting} تحاضير تنتظر المراجعة.`, to: '/review' });
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

const str = (v: unknown, max = 400) => typeof v === 'string' && v.length <= max;
const ids = (v: unknown) => Array.isArray(v) && v.length <= 200 && v.every(x => str(x, 80));
/** Trust boundary for the synced workspace: shapes and sizes only, so a broken or oversized desk never reaches the account. */
export function validDesk(d: unknown): boolean {
  if (d === undefined) return true; if (!d || typeof d !== 'object') return false; const x = d as Desk;
  if (x.timetable !== undefined) { const t = x.timetable; if (!t || !Number.isInteger(t.periods) || t.periods < 1 || t.periods > 10 || !Array.isArray(t.times) || t.times.length > 10 || !t.times.every(s => str(s, 12)) || !Array.isArray(t.slots) || t.slots.length > 50 || !t.slots.every(s => str(s.id, 80) && Number.isInteger(s.day) && s.day >= 0 && s.day <= 4 && Number.isInteger(s.period) && s.period >= 0 && s.period < 10 && str(s.subject, 120) && str(s.place, 120) && ids(s.learnerIds) && (s.lessonId === undefined || str(s.lessonId, 80)))) return false; }
  if (x.tasks !== undefined && !(Array.isArray(x.tasks) && x.tasks.length <= 300 && x.tasks.every(t => str(t.id, 80) && str(t.title, 200) && ['daily', 'weekly'].includes(t.scope) && t.priority in priorityLabels && str(t.due, 10) && typeof t.done === 'boolean'))) return false;
  if (x.groups !== undefined && !(Array.isArray(x.groups) && x.groups.length <= 60 && x.groups.every(g => str(g.id, 80) && str(g.name, 80) && str(g.grade, 40) && ids(g.learnerIds) && str(g.subject, 80) && Number.isFinite(g.sessions) && Number.isFinite(g.minutes) && str(g.support, 60)))) return false;
  if (x.attendance !== undefined && !(Array.isArray(x.attendance) && x.attendance.length <= 400 && x.attendance.every(a => str(a.date, 10) && !!a.marks && typeof a.marks === 'object' && Object.values(a.marks).every(m => !!m && m.mark in markLabels && (m.note === undefined || str(m.note, 200)))))) return false;
  if (x.performance !== undefined && !(Array.isArray(x.performance) && x.performance.length <= 3000 && x.performance.every(p => str(p.id, 80) && str(p.learnerId, 80) && str(p.domain, 80) && str(p.skill, 160) && Number.isInteger(p.level) && p.level >= 1 && p.level <= 5 && (p.percent === undefined || (Number.isFinite(p.percent) && p.percent >= 0 && p.percent <= 100)) && str(p.tool, 80) && str(p.date, 10) && str(p.note, 400)))) return false;
  return true;
}
