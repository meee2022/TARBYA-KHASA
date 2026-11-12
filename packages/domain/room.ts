import type { Learner, Lesson } from './index.ts';

/** The live room: the teacher opens a lesson's questions on the pupils' own devices, moves through them, and sees each answer as it arrives. */
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
export const ROOM_HOURS = 4; export const MAX_ROOM_QUESTIONS = 30; export const MAX_ROOM_SEATS = 20;
/** Six characters without the look-alikes (no O, 0, I, 1), read aloud easily across a classroom. */
export const roomCode = (bytes: Uint8Array) => Array.from(bytes.slice(0, 6), b => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join('');
export const roomUrl = (origin: string, code: string) => `${origin}/room/${code}`;

export interface RoomQuestion { prompt: string; options: string[]; answer: number; }
/** A place in the room: the pupil's first name and picture as the teacher keeps them, so a pupil finds themself without typing. */
export interface RoomSeat { id: string; label: string; initials: string; color: string; avatarId?: string; }
export interface RoomAnswer { seat: string; q: number; selected: number; }

/** What a lesson puts in a room: its questions, and a seat for each of its pupils. */
export function roomFromLesson(lesson: Lesson, learners: Learner[]): { title: string; questions: RoomQuestion[]; seats: RoomSeat[] } {
  const questions = lesson.questions.filter(q => q.prompt.trim() && q.options.filter(o => o.trim()).length >= 2).slice(0, MAX_ROOM_QUESTIONS).map(q => ({ prompt: q.prompt.trim(), options: q.options.map(o => o.trim()), answer: q.answer }));
  const seats = learners.filter(l => lesson.learnerIds.includes(l.id)).slice(0, MAX_ROOM_SEATS).map(l => ({ id: l.id, label: l.name.split(/\s|·/)[0], initials: l.initials, color: l.color, avatarId: l.avatarId }));
  return { title: lesson.title.trim() || 'درس بلا عنوان', questions, seats };
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
/** Trust boundary on the server: the shape and size of what a teacher opens a room with. */
export function validRoomSetup(title: unknown, questions: unknown, seats: unknown): boolean {
  return str(title, 200)
    && Array.isArray(questions) && questions.length >= 1 && questions.length <= MAX_ROOM_QUESTIONS && questions.every((q: RoomQuestion) => !!q && str(q.prompt, 400) && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 4 && q.options.every(o => str(o, 160)) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
    && Array.isArray(seats) && seats.length >= 1 && seats.length <= MAX_ROOM_SEATS && new Set(seats.map((s: RoomSeat) => s?.id)).size === seats.length && seats.every((s: RoomSeat) => !!s && str(s.id, 80) && str(s.label, 60) && typeof s.initials === 'string' && s.initials.length <= 6 && typeof s.color === 'string' && s.color.length <= 20 && (s.avatarId === undefined || str(s.avatarId, 200)));
}

/** Where the room stands. `index` is -1 before the first question; a question's answer is shown to pupils only once revealed. */
export interface RoomPhase { index: number; revealed: boolean; ended: boolean; }
/** What a pupil's device is told: never the right answer before the teacher reveals it. */
export interface RoomPupilView extends RoomPhase { title: string; seats: RoomSeat[]; total: number; question?: { prompt: string; options: string[]; answer?: number }; }
export function pupilView(title: string, questions: RoomQuestion[], seats: RoomSeat[], phase: RoomPhase): RoomPupilView {
  const q = phase.ended ? undefined : questions[phase.index];
  return { ...phase, title, seats, total: questions.length, question: q && { prompt: q.prompt, options: q.options, ...(phase.revealed ? { answer: q.answer } : {}) } };
}

/** Each pupil's own count at the end, in seat order. It places no pupil above another. */
export function roomSummary(questions: RoomQuestion[], seats: RoomSeat[], answers: RoomAnswer[]): { seat: RoomSeat; answered: number; correct: number }[] {
  return seats.map(seat => { const mine = answers.filter(a => a.seat === seat.id && questions[a.q]); return { seat, answered: mine.length, correct: mine.filter(a => questions[a.q].answer === a.selected).length }; });
}
