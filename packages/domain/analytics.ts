import type { Learner, Observation, PracticeRecord } from './index.ts';
import { goalProgress } from './planning.ts';

/** Per-pupil figures for the teacher and coordinator. Each pupil is read on their own: nothing here orders children against each other. */
export interface SubjectMastery { subject: string; observations: number; rate: number; }
export interface LearnerAnalytics {
  learnerId: string; goalsMet: number; goalsTotal: number; observations: number;
  independence: number | null; before: number | null; after: number | null;
  subjects: SubjectMastery[]; practice30: number; lastSeen: string | null;
}
const rate = (rows: Observation[]) => { const total = rows.reduce((n, o) => n + o.total, 0); return total ? Math.round(rows.reduce((n, o) => n + o.correct, 0) / total * 100) : null; };

export function learnerAnalytics(learner: Learner, observations: Observation[], practice: PracticeRecord[] = [], now = new Date()): LearnerAnalytics {
  const mine = observations.filter(o => o.learnerId === learner.id && o.total > 0).sort((a, b) => a.date.localeCompare(b.date));
  const goalsMet = learner.goals.filter(g => g.approvedAt || goalProgress(g, observations).status === 'met').length;
  const total = mine.reduce((n, o) => n + o.total, 0);
  const independence = total ? Math.round(mine.reduce((n, o) => n + o.independent, 0) / total * 100) : null;
  // Before: the baseline probes when there are any, else the first two sessions. After: the last three sessions, only once there is something to compare.
  const baseline = mine.filter(o => o.phase === 'baseline');
  const before = rate(baseline.length ? baseline : mine.slice(0, 2));
  const after = mine.length >= 3 ? rate(mine.slice(-3)) : null;
  const bySubject = new Map<string, Observation[]>();
  for (const o of mine) { const subject = learner.goals.find(g => g.id === o.goalId)?.subject; if (!subject) continue; bySubject.set(subject, [...(bySubject.get(subject) ?? []), o]); }
  const subjects = [...bySubject].map(([subject, rows]) => ({ subject, observations: rows.length, rate: rate(rows) ?? 0 }));
  const since = new Date(now.getTime() - 30 * 864e5).toISOString();
  const practice30 = practice.filter(p => p.learnerId === learner.id && p.date >= since).length;
  const last = [mine[mine.length - 1]?.date, ...practice.filter(p => p.learnerId === learner.id).map(p => p.date)].filter((d): d is string => !!d).sort().pop() ?? null;
  return { learnerId: learner.id, goalsMet, goalsTotal: learner.goals.length, observations: mine.length, independence, before, after, subjects, practice30, lastSeen: last };
}
/** In the teacher's own order, never sorted by any figure. */
export const classAnalytics = (learners: Learner[], observations: Observation[], practice: PracticeRecord[] = [], now = new Date()) => learners.map(l => learnerAnalytics(l, observations, practice, now));
