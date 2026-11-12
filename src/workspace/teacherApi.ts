import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
import { convex } from '../convexClient';
import type { SharedPayload } from '../../packages/domain/shared';
import type { ParentChoice } from '../../packages/domain/parent';
import type { RoomQuestion, RoomSeat } from '../../packages/domain/room';

/** Teacher accounts live on Convex only; without it the workspace stays on this device. */
export const accountsAvailable = !!convex;
export type Teacher = { username: string; name: string };

// ponytail: sessionStorage ends the session with the tab, which suits shared school devices; a stolen tab still has it for 12 hours at most.
const KEY = 'tarbya.teacher.session';
export const teacherToken = () => { try { return sessionStorage.getItem(KEY) ?? ''; } catch { return ''; } };
const keep = (token: string) => { try { if (token) sessionStorage.setItem(KEY, token); else sessionStorage.removeItem(KEY); } catch { /* the session then ends with this page */ } };

export class SyncError extends Error { constructor(message: string, public status: number) { super(message); } }
async function call<T>(run: () => Promise<T>): Promise<T> {
  try { return await run(); }
  catch (e) {
    if (e instanceof ConvexError && e.data && typeof e.data === 'object') throw new SyncError(String(e.data.message), Number(e.data.status));
    throw new SyncError('تعذّر الاتصال بالخادم. تبقى تعديلاتك على هذا الجهاز حتى يعود الاتصال.', 0);
  }
}
export const me = () => teacherToken() ? call(() => convex!.query(api.teacher.me, { token: teacherToken() })) : Promise.resolve(null);
export async function login(username: string, password: string) { const r = await call(() => convex!.action(api.adminAuth.teacherLogin, { username, password })); keep(r.token); return r.teacher; }
export async function signup(username: string, name: string, password: string) { const r = await call(() => convex!.action(api.adminAuth.teacherSignup, { username, name, password })); keep(r.token); return r.teacher; }
export async function logout() { const token = teacherToken(); keep(''); if (token) await call(() => convex!.mutation(api.teacher.logout, { token })).catch(() => undefined); }
export const pull = () => call(() => convex!.query(api.teacher.workspace, { token: teacherToken() }));
export const push = (json: string, revision: number) => call(() => convex!.mutation(api.teacher.saveWorkspace, { token: teacherToken(), json, revision }));
export async function changePassword(current: string, password: string) { const r = await call(() => convex!.action(api.adminAuth.teacherChangePassword, { token: teacherToken(), current, password })); keep(r.token); }
export const aiReady = () => call(() => convex!.query(api.teacher.aiReady, {}));
export const listShared = () => call(() => convex!.query(api.shared.list, { token: teacherToken() }));
export const getShared = (id: string) => call(() => convex!.query(api.shared.get, { token: teacherToken(), id }));
export const publishShared = (payload: SharedPayload) => call(() => convex!.mutation(api.shared.publish, { token: teacherToken(), ...payload }));
export const removeShared = (id: string) => call(() => convex!.mutation(api.shared.remove, { token: teacherToken(), id }));
export const generateDraft = async (request: unknown) => JSON.parse(await call(() => convex!.action(api.author.generate, { token: teacherToken(), request })));
// The family portal: links the teacher issued, and the families' short answers. `parentPage` and `parentReply` need no session, only the link.
export const parentLinks = () => call(() => convex!.query(api.parent.links, { token: teacherToken() }));
export const issueParentLink = (learnerId: string, parentToken: string) => call(() => convex!.mutation(api.parent.issue, { token: teacherToken(), learnerId, parentToken }));
export const revokeParentLink = (learnerId: string) => call(() => convex!.mutation(api.parent.revoke, { token: teacherToken(), learnerId }));
export const parentReplies = () => call(() => convex!.query(api.parent.replies, { token: teacherToken() }));
export const dismissParentReply = (id: string) => call(() => convex!.mutation(api.parent.dismissReply, { token: teacherToken(), id }));
export const parentPage = (token: string) => call(() => convex!.query(api.parent.view, { token }));
export const parentReply = (token: string, choice: ParentChoice, text: string) => call(() => convex!.mutation(api.parent.reply, { token, choice, text }));

// The specialist portal: links the teacher issued and the recommendations left through them. `specialistPage` and `specialistNote` need no session, only the link.
export const specialistLinks = () => call(() => convex!.query(api.specialist.links, { token: teacherToken() }));
export const issueSpecialistLink = (learnerId: string, linkToken: string) => call(() => convex!.mutation(api.specialist.issue, { token: teacherToken(), learnerId, linkToken }));
export const revokeSpecialistLink = (learnerId: string) => call(() => convex!.mutation(api.specialist.revoke, { token: teacherToken(), learnerId }));
export const specialistNotes = () => call(() => convex!.query(api.specialist.notes, { token: teacherToken() }));
export const dismissSpecialistNote = (id: string) => call(() => convex!.mutation(api.specialist.dismissNote, { token: teacherToken(), id }));
export const specialistPage = (token: string) => call(() => convex!.query(api.specialist.view, { token }));
export const specialistNote = (token: string, who: string, text: string) => call(() => convex!.mutation(api.specialist.note, { token, who, text }));

// The live room. The teacher's calls carry the session; a pupil's device carries only the room code.
export const openRoom = (code: string, title: string, questions: RoomQuestion[], seats: RoomSeat[]) => call(() => convex!.mutation(api.room.open, { token: teacherToken(), code, title, questions: JSON.stringify(questions), seats: JSON.stringify(seats) }));
export const currentRoom = () => call(() => convex!.query(api.room.current, { token: teacherToken() }));
export const stepRoom = (code: string, action: 'next' | 'reveal' | 'end') => call(() => convex!.mutation(api.room.step, { token: teacherToken(), code, action }));
export const closeRoom = (code: string) => call(() => convex!.mutation(api.room.close, { token: teacherToken(), code }));
export const answerRoom = (code: string, seat: string, q: number, selected: number) => call(() => convex!.mutation(api.room.answer, { code, seat, q, selected }));
/** Live subscriptions: the callback runs with every change on the server, and the returned function stops listening. */
export function watchBoard(code: string, onChange: (board: Awaited<ReturnType<typeof boardOnce>> | null) => void) { const w = convex!.watchQuery(api.room.board, { token: teacherToken(), code }); const read = () => { try { onChange(w.localQueryResult() ?? null); } catch { onChange(null); } }; read(); return w.onUpdate(read); }
export function watchRoom(code: string, onChange: (room: Awaited<ReturnType<typeof roomOnce>> | null | undefined) => void) { const w = convex!.watchQuery(api.room.join, { code }); const read = () => { try { onChange(w.localQueryResult()); } catch { onChange(null); } }; read(); return w.onUpdate(read); }
const boardOnce = (code: string) => convex!.query(api.room.board, { token: teacherToken(), code });
const roomOnce = (code: string) => convex!.query(api.room.join, { code });
