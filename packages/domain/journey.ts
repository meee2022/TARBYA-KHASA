import { createLesson, type Lesson, type Subject } from './index.ts';
import type { CurriculumLesson, UnitEntry, WarmupEntry } from './catalog.ts';

/** The six stations of a support lesson, in teaching order. The first, second, third and last reuse the lesson's long-standing text fields. */
export type StationId = 'warmup' | 'teaching' | 'practice' | 'independent' | 'assessment' | 'closing';
/** What is offered in the activity at each level. It describes the task, never the pupil, and is never inferred from a diagnosis. */
export type Tier = 'full' | 'partial' | 'independent';
export interface StationPlan { minutes?: number; tiers?: Partial<Record<Tier, string>>; }

export const stations: { id: StationId; title: string; hint: string; share: number; optional?: boolean }[] = [
  { id: 'warmup', title: 'التهيئة', hint: 'تقديم الروتين وربط الدرس بخبرة مألوفة', share: 12 },
  { id: 'teaching', title: 'الشرح والنمذجة', hint: 'ماذا يفعل المعلم؟ وكيف يستجيب الطالب؟', share: 25 },
  { id: 'practice', title: 'تدريب موجَّه', hint: 'محاولات قصيرة مع المعلم، والمساعدة تقل تدريجيًا', share: 23 },
  { id: 'independent', title: 'تدريب مستقل', hint: 'يجرّب الطالب وحده بالوسيلة المناسبة له', share: 18, optional: true },
  { id: 'assessment', title: 'التقويم', hint: 'كيف نعرف أن الهدف تحقق؟', share: 12, optional: true },
  { id: 'closing', title: 'غلق الحصة', hint: 'مراجعة واختيار يعبّر عن التعلّم', share: 10 },
];
export const stationIds = stations.map(s => s.id);
export const tiers: Tier[] = ['full', 'partial', 'independent'];
export const tierLabels: Record<Tier, string> = { full: 'دعم كامل', partial: 'دعم جزئي', independent: 'باستقلالية' };
export const tierHints: Record<Tier, string> = { full: 'نموذج كامل وبديلان', partial: 'تلميح ثم محاولة', independent: 'المهمة كما هي' };

export interface Station { id: StationId; title: string; text: string; minutes: number; start: number; tiers: Partial<Record<Tier, string>>; }

/** The lesson as the teacher walks it: stations in order with their minutes and the minute each one starts at. An optional station left empty is not shown. */
export function journey(lesson: Lesson): Station[] {
  const used = stations.filter(s => !s.optional || (lesson[s.id] ?? '').trim());
  const plans = lesson.stationPlans ?? {};
  const fixed = (id: StationId) => { const m = plans[id]?.minutes; return Number.isFinite(m) && m! > 0 ? Math.round(m!) : undefined; };
  const free = used.filter(s => fixed(s.id) === undefined);
  const left = Math.max(0, (Number.isFinite(lesson.duration) ? lesson.duration : 0) - used.reduce((t, s) => t + (fixed(s.id) ?? 0), 0));
  // Largest remainder: the shared minutes are whole numbers and still add up to what is left.
  const shares = free.reduce((t, s) => t + s.share, 0) || 1;
  const exact = free.map(s => left * s.share / shares); const whole = exact.map(Math.floor);
  let spare = left - whole.reduce((t, n) => t + n, 0);
  for (const i of exact.map((x, i) => [x - whole[i], i] as const).sort((a, b) => b[0] - a[0]).map(x => x[1])) { if (spare-- <= 0) break; whole[i]++; }
  let start = 0;
  return used.map(s => {
    const minutes = fixed(s.id) ?? whole[free.indexOf(s)];
    const row = { id: s.id, title: s.title, text: (lesson[s.id] ?? '').trim(), minutes, start, tiers: plans[s.id]?.tiers ?? {} };
    start += minutes; return row;
  });
}

export const hasTiers = (station: Station) => tiers.some(t => (station.tiers[t] ?? '').trim());

/** Warm-ups offered for a lesson: those written for its subject and grade first, then the ones for any subject or any grade. */
export function warmupsFor(bank: WarmupEntry[], subject: string, grade: string): WarmupEntry[] {
  const fits = (w: WarmupEntry) => (!w.subject || w.subject === subject) && (!w.grade || w.grade === grade);
  const rank = (w: WarmupEntry) => (w.subject ? 0 : 2) + (w.grade ? 0 : 1);
  return bank.filter(fits).sort((a, b) => rank(a) - rank(b));
}

export const unitsFor = (units: UnitEntry[], subject: string, grade: string) => units.filter(u => u.subject === subject && u.grade === grade);

/** A draft lesson from a curriculum entry. The teacher still chooses the pupils, ties the goals and reviews every line before teaching. */
export function lessonFromCurriculum(unit: UnitEntry, entry: CurriculumLesson): Lesson {
  const base = createLesson(unit.subject as Subject);
  const text = (id: StationId) => entry[id]?.trim();
  return {
    ...base, title: entry.title, grade: unit.grade, objective: entry.objective, source: `${unit.title} · ${unit.subject} · الصف ${unit.grade}`,
    warmup: text('warmup') ?? base.warmup, teaching: text('teaching') ?? base.teaching, practice: text('practice') ?? base.practice, closing: text('closing') ?? base.closing,
    independent: text('independent'), assessment: text('assessment'),
  };
}
