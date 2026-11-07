import { uid, type Lesson } from './index.ts';
import { mediaPath } from './catalog.ts';
import type { ContentPack } from './packs.ts';
import { isDeck, type Deck } from './presentations.ts';

/** The teachers' shared library: a copy of a lesson, a deck or a pack that any teacher with an account can import. Nothing about a pupil travels with it. */
export type SharedKind = 'lesson' | 'deck' | 'pack';
export const sharedKinds: SharedKind[] = ['lesson', 'deck', 'pack'];
export const sharedKindLabels: Record<SharedKind, string> = { lesson: 'تحضير درس', deck: 'عرض تقديمي', pack: 'حزمة محتوى' };
export interface SharedMeta { id: string; kind: SharedKind; title: string; subject: string; grade: string; summary: string; teacherName: string; createdAt: string; mine: boolean; }
export interface SharedPayload { kind: SharedKind; title: string; subject: string; grade: string; summary: string; json: string; }
export const MAX_SHARED_BYTES = 300 * 1024;

const trimTo = (s: string, n: number) => s.trim().slice(0, n);
const serverMedia = (v?: string) => v && mediaPath.test(v) && !v.startsWith('/api/media/') ? v : undefined;

/** The lesson without its pupils, goals, plan slot, class log and review state. The kit stays, unticked, because its links are the point of sharing. */
export function sharedFromLesson(lesson: Lesson): SharedPayload {
  const copy: Lesson = { ...lesson, learnerIds: [], goalIds: [], status: 'draft', reviewNote: '', planId: undefined, sessionIndex: undefined, classLog: undefined, kit: lesson.kit?.map(k => ({ ...k, done: false })) };
  return { kind: 'lesson', title: trimTo(lesson.title, 160), subject: trimTo(lesson.subject, 60), grade: trimTo(lesson.grade, 60), summary: trimTo(lesson.objective, 300), json: JSON.stringify(copy) };
}
export function sharedFromDeck(deck: Deck): SharedPayload {
  const copy: Deck = { ...deck, lessonId: undefined, reviewed: false };
  return { kind: 'deck', title: trimTo(deck.title, 160), subject: trimTo(deck.subject, 60), grade: trimTo(deck.grade, 60), summary: trimTo(`${deck.slides.length} شريحة`, 300), json: JSON.stringify(copy) };
}
/** Pictures and recordings saved in the teacher's own browser cannot be seen by others, so only server media travels. */
export function sharedFromPack(pack: ContentPack, grade = ''): SharedPayload {
  const copy: ContentPack = { ...pack, items: pack.items.map(i => ({ ...i, imageId: serverMedia(i.imageId), audioId: serverMedia(i.audioId), signId: serverMedia(i.signId) })) };
  return { kind: 'pack', title: trimTo(pack.title, 160), subject: trimTo(pack.subject, 60), grade: trimTo(grade, 60), summary: trimTo(pack.items.map(i => i.text).join('، '), 300), json: JSON.stringify(copy) };
}

/** Shape check for what another teacher published. The importer then gives it a fresh id so it never collides with the teacher's own work. */
export function validSharedPayload(p: unknown): p is SharedPayload {
  if (!p || typeof p !== 'object') return false;
  const v = p as SharedPayload;
  if (!sharedKinds.includes(v.kind) || typeof v.json !== 'string' || v.json.length > MAX_SHARED_BYTES) return false;
  if (![v.title, v.subject, v.grade, v.summary].every(s => typeof s === 'string' && s.length <= 300) || !v.title.trim()) return false;
  try { return importShared(v.kind, v.json) !== null; } catch { return false; }
}
export type Imported = { kind: 'lesson'; lesson: Lesson } | { kind: 'deck'; deck: Deck } | { kind: 'pack'; pack: ContentPack };
export function importShared(kind: SharedKind, json: string, now = new Date().toISOString()): Imported | null {
  const value: unknown = JSON.parse(json);
  if (!value || typeof value !== 'object') return null;
  if (kind === 'lesson') {
    const l = value as Lesson;
    if (typeof l.title !== 'string' || !Array.isArray(l.questions) || typeof l.subject !== 'string' || typeof l.grade !== 'string') return null;
    return { kind, lesson: { ...l, id: uid(), learnerIds: [], goalIds: [], status: 'draft', reviewNote: '', planId: undefined, sessionIndex: undefined, classLog: undefined, updatedAt: now } };
  }
  if (kind === 'deck') return isDeck(value) ? { kind, deck: { ...value, id: uid(), lessonId: undefined, reviewed: false, updatedAt: now } } : null;
  const p = value as ContentPack;
  if (typeof p.title !== 'string' || typeof p.subject !== 'string' || !Array.isArray(p.items) || !p.items.every(i => i && typeof i.id === 'string' && typeof i.text === 'string')) return null;
  return { kind, pack: { ...p, id: uid(), updatedAt: now } };
}
