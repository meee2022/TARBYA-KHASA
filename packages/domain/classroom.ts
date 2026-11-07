import { uid, type ClassEvent, type ClassEventKind, type Lesson } from './index.ts';
import { numberLocale } from './numbers.ts';

/** The live class board: group stars, movement breaks and "this happened" notes, kept on the lesson. A record of moments, never a judgement of a child. */
export const classEventLabels: Record<ClassEventKind, string> = { start: 'بدأت الحصة', star: 'نجمة', break: 'استراحة حركة', note: 'ملاحظة', end: 'انتهت الحصة' };
export const MAX_CLASS_EVENTS = 300;
export const groupTargets = [5, 10, 15, 20] as const;

export function addClassEvent(lesson: Lesson, event: Omit<ClassEvent, 'id' | 'at'> & { at?: string }): Lesson {
  const next: ClassEvent = { id: uid(), at: event.at ?? new Date().toISOString(), kind: event.kind, ...(event.learnerId ? { learnerId: event.learnerId } : {}), ...(event.text?.trim() ? { text: event.text.trim().slice(0, 300) } : {}) };
  // ponytail: the oldest moments fall off at 300; a term of daily classes stays well under that per lesson.
  return { ...lesson, classLog: [...(lesson.classLog ?? []), next].slice(-MAX_CLASS_EVENTS), updatedAt: next.at };
}
export const removeClassEvent = (lesson: Lesson, id: string): Lesson => ({ ...lesson, classLog: (lesson.classLog ?? []).filter(e => e.id !== id) });

/** Events of the class in progress: from the last "start" on. Before any start, today's events. */
export function currentSession(log: ClassEvent[] = [], today = new Date().toISOString().slice(0, 10)): ClassEvent[] {
  const start = log.map(e => e.kind).lastIndexOf('start');
  if (start >= 0) return log.slice(start);
  return log.filter(e => e.at.slice(0, 10) === today);
}
export const sessionOpen = (events: ClassEvent[]) => events.length > 0 && events[0].kind === 'start' && events[events.length - 1].kind !== 'end';
export function starsByLearner(events: ClassEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) if (e.kind === 'star' && e.learnerId) out[e.learnerId] = (out[e.learnerId] ?? 0) + 1;
  return out;
}
export const totalStars = (events: ClassEvent[]) => events.filter(e => e.kind === 'star').length;
export function sessionMinutes(events: ClassEvent[]): number | null {
  const start = events.find(e => e.kind === 'start'); if (!start) return null;
  const end = [...events].reverse().find(e => e.kind === 'end') ?? events[events.length - 1];
  return Math.max(0, Math.round((Date.parse(end.at) - Date.parse(start.at)) / 60000));
}
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(numberLocale, { hour: '2-digit', minute: '2-digit' });
