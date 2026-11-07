import { ConvexError } from 'convex/values';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { convex } from '../convexClient';
import { validateSite } from '../../packages/domain/site';

export const usesConvex = !!convex;
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

// ponytail: sessionStorage is readable by page scripts; an httpOnly cookie is not practical across the site and Convex domains. Sessions end with the tab and after 8 hours. Use Convex Auth when teacher accounts arrive.
const KEY = 'tarbya.admin.session';
const readToken = () => { try { return sessionStorage.getItem(KEY) ?? ''; } catch { return ''; } };
const keepToken = (token: string) => { try { if (token) sessionStorage.setItem(KEY, token); else sessionStorage.removeItem(KEY); } catch { /* The session then lasts until this page reloads. */ } };
let memory = '';
const token = () => memory || readToken();
const remember = (value: string) => { memory = value; keepToken(value); };

type Body = Record<string, string>;
async function route(path: string, body: Body) {
  const client = convex!;
  // Older saved catalogs predate some optional lists. Normalize them before editors read their lengths.
  const site = (json: string) => validateSite(JSON.parse(json));
  switch (path) {
    case 'session': { const s = await client.query(api.admin.session, token() ? { token: token() } : {}); if (!s.user) remember(''); return s; }
    case 'state': { const { json, ...rest } = await client.query(api.admin.state, { token: token() }); return { ...rest, site: site(json) }; }
    case 'setup': { const r = await client.action(api.adminAuth.setup, { code: body.code ?? '', username: body.username, name: body.name, password: body.password }); remember(r.token); return { user: r.user }; }
    case 'login': { const r = await client.action(api.adminAuth.login, { username: body.username, password: body.password }); remember(r.token); return { user: r.user }; }
    case 'logout': { await client.mutation(api.admin.logout, { token: token() }); remember(''); return { ok: true }; }
    case 'settings': return { site: site(await client.mutation(api.admin.saveSettings, { token: token(), json: JSON.stringify(body) })) };
    case 'users/create': return client.action(api.adminAuth.createUser, { token: token(), username: body.username, name: body.name, password: body.password });
    case 'users/toggle': { await client.mutation(api.admin.toggleUser, { token: token(), id: body.id }); return { ok: true }; }
    case 'teachers/create': return client.action(api.adminAuth.createTeacher, { token: token(), username: body.username, name: body.name, password: body.password });
    case 'teachers/toggle': { await client.mutation(api.teacher.toggleTeacher, { token: token(), id: body.id }); return { ok: true }; }
    case 'teachers/password': return client.action(api.adminAuth.resetTeacherPassword, { token: token(), id: body.id, password: body.password });
    case 'teachers/remove': { await client.mutation(api.teacher.removeTeacher, { token: token(), id: body.id }); return { ok: true }; }
    case 'shared/list': return { items: await client.query(api.shared.adminList, { token: token() }) };
    case 'shared/remove': { await client.mutation(api.shared.adminRemove, { token: token(), id: body.id }); return { ok: true }; }
    case 'password': { const r = await client.action(api.adminAuth.changePassword, { token: token(), current: body.current, password: body.password }); remember(r.token); return { ok: true }; }
    default: throw new ApiError('الإجراء غير موجود.', 404);
  }
}
const asApiError = (e: unknown) => {
  if (e instanceof ApiError) return e;
  if (e instanceof ConvexError && e.data && typeof e.data === 'object') return new ApiError(String(e.data.message), Number(e.data.status));
  return new Error('تعذّر الاتصال بخدمة الإدارة. تحقق من الإنترنت ثم أعد المحاولة.');
};
export async function convexAdmin(path: string, body?: unknown) {
  try { return await route(path, (body ?? {}) as Body); } catch (e) { throw asApiError(e); }
}
/** Uploads to Convex storage, then has the server check the file before giving back its address. */
export async function uploadShared(blob: Blob) {
  try {
    const client = convex!;
    const url = await client.mutation(api.admin.generateUploadUrl, { token: token() });
    const type = blob.type.split(';')[0];
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': type }, body: blob });
    if (!response.ok) throw new ApiError('تعذّر رفع الملف.', response.status);
    const { storageId } = await response.json() as { storageId: Id<'_storage'> };
    return (await client.action(api.adminAuth.registerMedia, { token: token(), storageId })).url;
  } catch (e) { throw asApiError(e); }
}
