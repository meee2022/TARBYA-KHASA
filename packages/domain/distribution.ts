import { uid } from './index.ts';
import type { UnitEntry } from './catalog.ts';
import { day, weekOf, type WeeklyPlan } from './planning.ts';
import { bar, label, para, table, title } from './docx.ts';

/** A unit or a topic placed on a run of term weeks. `unitId` ties it to a curriculum unit of the catalog, whose lessons then fill the weeks. */
export interface DistributionRow { id: string; title: string; from: number; to: number; unitId?: string; }
/** One subject of one grade laid over the weeks of a term. */
export interface Distribution { id: string; grade: string; subject: string; termStart: string; weeks: number; rows: DistributionRow[]; }
export const TERM_WEEKS = { min: 4, max: 40, usual: 18 };

export const createDistribution = (grade: string, subject: string, termStart: string): Distribution => ({ id: uid(), grade, subject, termStart: weekOf(termStart), weeks: TERM_WEEKS.usual, rows: [] });

/** The catalog's units laid end to end over the term, each given weeks in proportion to its lessons and never less than one. */
export function spreadUnits(units: UnitEntry[], weeks: number): DistributionRow[] {
  const list = units.slice(0, weeks); const size = (u: UnitEntry) => Math.max(1, u.lessons.length); const total = list.reduce((t, u) => t + size(u), 0);
  let used = 0, done = 0;
  return list.map((u, i) => {
    done += size(u); const left = list.length - i - 1;
    const to = left ? Math.min(weeks - left, Math.max(used + 1, Math.round(done / total * weeks))) : weeks;
    const row = { id: uid(), title: u.title, from: used + 1, to, unitId: u.id }; used = to; return row;
  });
}

export interface TermWeek { n: number; start: string; end: string; rows: DistributionRow[]; lessons: { title: string; objective: string }[]; planId?: string; }
/** The term week by week: its dates, what is taught in it, the catalog lessons that fall in it, and the preparation already written for that week. */
export function termWeeks(d: Distribution, units: UnitEntry[], plans: WeeklyPlan[] = []): TermWeek[] {
  return Array.from({ length: d.weeks }, (_, i) => {
    const n = i + 1, start = day(d.termStart, i * 7); const rows = d.rows.filter(r => r.from <= n && n <= r.to);
    const lessons = rows.flatMap(r => { const unit = units.find(u => u.id === r.unitId); if (!unit?.lessons.length) return []; const span = r.to - r.from + 1, at = n - r.from, len = unit.lessons.length;
      const a = Math.floor(at * len / span), b = Math.max(a + 1, Math.floor((at + 1) * len / span)); return unit.lessons.slice(a, b).map(l => ({ title: l.title, objective: l.objective })); });
    return { n, start, end: day(start, 4), rows, lessons, planId: plans.find(p => p.subject === d.subject && p.weekStart === start)?.id };
  });
}

/** What the teacher should look at before relying on the table: empty weeks, and rows that run backwards or past the term. */
export function distributionIssues(d: Distribution): string[] {
  const out: string[] = [];
  for (const r of d.rows) {
    const name = r.title.trim() || 'وحدة بلا اسم';
    if (r.from > r.to) out.push(`«${name}»: أسبوع البداية بعد أسبوع النهاية.`);
    else if (r.to > d.weeks) out.push(`«${name}» تمتد بعد آخر أسبوع في الفصل (${d.weeks}).`);
  }
  if (d.rows.length) { const empty = Array.from({ length: d.weeks }, (_, i) => i + 1).filter(n => !d.rows.some(r => r.from <= n && n <= r.to)); if (empty.length) out.push(`أسابيع بلا وحدة: ${empty.join('، ')}.`); }
  return out;
}

const dm = (date: string) => `${Number(date.slice(8))}/${Number(date.slice(5, 7))}`;
/** The term plan as a Word table: one row per week. */
export function distributionBody(d: Distribution, units: UnitEntry[]) {
  const weeks = termWeeks(d, units);
  return title(`الخطة الفصلية: ${d.subject}`) + para(`الصف ${d.grade} · ${d.weeks} أسبوعًا تبدأ في ${d.termStart}`, { center: true })
    + table([1, 2, 4, 6], [bar('توزيع المنهج على أسابيع الفصل', 4), [label('الأسبوع'), label('التاريخ'), label('الوحدة'), label('الدروس والأهداف')],
      ...weeks.map(w => [String(w.n), `${dm(w.start)} - ${dm(w.end)}`, w.rows.map(r => r.title).join('، '), w.lessons.map(l => l.objective ? `${l.title}: ${l.objective}` : l.title).join('\n')])]);
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const week = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= TERM_WEEKS.max;
/** Trust boundary for the synced workspace: shapes and sizes only. */
export const validDistributions = (v: unknown): boolean => v === undefined || (Array.isArray(v) && v.length <= 60 && v.every((d: Distribution) => !!d && str(d.id, 80) && str(d.grade, 40) && str(d.subject, 80) && /^\d{4}-\d{2}-\d{2}$/.test(String(d.termStart)) && Number.isInteger(d.weeks) && d.weeks >= TERM_WEEKS.min && d.weeks <= TERM_WEEKS.max
  && Array.isArray(d.rows) && d.rows.length <= 80 && d.rows.every(r => !!r && str(r.id, 80) && str(r.title, 160) && week(r.from) && week(r.to) && (r.unitId === undefined || str(r.unitId, 80)))));
