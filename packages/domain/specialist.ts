import type { Workspace } from './index.ts';
import { learnerReport, type LearnerReport } from './reports.ts';

/** The specialist's link uses the same kind of token as the family's: 48 hex characters from the browser's random source. */
export const SPECIALIST_TOKEN_RE = /^[a-f0-9]{48}$/;
export const MAX_SPECIALIST_LINKS = 200;
export const MAX_SPECIALIST_NOTES = 50;
export interface SpecialistLink { learnerId: string; token: string; createdAt: string; }
/** A recommendation a specialist wrote from their link. */
export interface SpecialistNote { id: string; learnerId: string; who: string; text: string; at: string; }
export const specialistUrl = (origin: string, token: string) => `${origin}/specialist/${token}`;

/** What a specialist sees: the pupil's report without the pupil's file itself. Behaviour notes, the family link and the teacher's free notes never leave. */
export type SpecialistView = Omit<LearnerReport, 'learner'> & { teacher: string; child: { name: string; grade: string; initials: string; color: string; avatarId?: string; strengths: string; needs: string } };
export function specialistView(w: Workspace, learnerId: string, teacher: string, now: string): SpecialistView | null {
  const r = learnerReport(w, learnerId, now); if (!r) return null;
  const { learner, ...rest } = r;
  return { ...rest, teacher, child: { name: learner.name, grade: learner.grade, initials: learner.initials, color: learner.color, avatarId: learner.avatarId, strengths: learner.strengths, needs: learner.needs } };
}

/** A recommendation needs who wrote it (name or role) and something to say. */
export const validSpecialistNote = (who: unknown, text: unknown) => typeof who === 'string' && who.trim().length >= 2 && who.length <= 80 && typeof text === 'string' && text.trim().length >= 3 && text.length <= 1200;
