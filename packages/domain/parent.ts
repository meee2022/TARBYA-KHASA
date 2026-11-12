import type { Workspace } from './index.ts';
import type { ContentPack } from './packs.ts';
import { familyWeek } from './planning.ts';

/** The family portal: one link per pupil that the teacher hands to the family. It opens a read-only page about that child alone, and lets the family answer "we tried it at home". */
export const PARENT_TOKEN_RE = /^[a-f0-9]{48}$/;
export const parentToken = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export const parentUrl = (origin: string, token: string) => `${origin}/parent/${token}`;
export const MAX_PARENT_LINKS = 200;
export const MAX_PARENT_REPLIES = 50;
export const MAX_REPLY_TEXT = 300;

export type ParentChoice = 'yes' | 'help' | 'no';
export const parentChoices: ParentChoice[] = ['yes', 'help', 'no'];
export const parentChoiceLabels: Record<ParentChoice, string> = { yes: 'نجحت وحدها', help: 'نجحت بمساعدة', no: 'لم تنجح بعد' };
export interface ParentReply { id: string; learnerId: string; choice: ParentChoice; text: string; at: string; }
export interface ParentLink { learnerId: string; token: string; createdAt: string; }

export interface ParentView {
  child: string; grade: string; teacher: string; from: string; to: string; avatar: { avatarId?: string; initials: string; color: string };
  lessons: string[]; activities: { title: string; times: number }[]; words: string[];
  goals: { text: string; status: string }[]; strengths: string; home: string; note: string; empty: boolean;
}
/** What the family sees: the child's first name, this week, how each goal is going in family words, and the teacher's home task and note.
 *  Nothing else of the file travels: no needs, no access profile, no behaviour notes, no scores. */
export function parentView(w: Workspace, learnerId: string, teacher: string, packs: ContentPack[] = w.packs ?? [], now = new Date()): ParentView | null {
  const learner = w.learners.find(l => l.id === learnerId); if (!learner) return null;
  const week = familyWeek(w, learnerId, packs, now);
  return { child: learner.name.split(/\s|·/)[0], grade: learner.grade, teacher, avatar: { avatarId: learner.avatarId, initials: learner.initials, color: learner.color }, from: week.from, to: now.toISOString(), lessons: week.lessons, activities: week.activities, words: week.words, goals: week.goals, strengths: learner.strengths, home: learner.family?.home ?? '', note: learner.family?.note ?? '', empty: week.empty };
}
export const validParentReply = (choice: unknown, text: unknown): choice is ParentChoice => parentChoices.includes(choice as ParentChoice) && typeof text === 'string' && text.length <= MAX_REPLY_TEXT;
