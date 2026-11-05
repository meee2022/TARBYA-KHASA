// Pure rules shared by the Convex admin functions, kept free of Convex imports so tests can run them.

export const SESSION_MS = 8 * 3600000;
export const ATTEMPT_WINDOW_MS = 15 * 60000;
export const MAX_ATTEMPTS = 5;
export const MAX_ADMINS = 20;
export const MAX_SITE_BYTES = 900 * 1024;
export const MEDIA_LIMIT = 30 * 1024 * 1024;
export const TEACHER_SESSION_MS = 12 * 3600000;
export const MAX_TEACHERS = 500;
// Convex documents stop at 1 MiB; teacher pictures and recordings stay in the browser and are not part of this.
export const MAX_WORKSPACE_BYTES = 900 * 1024;
export const AI_DAILY_LIMIT = 30;

/** A plain login name or an email address. The email is only a login name: nothing is ever sent to it. */
export const validUsername = (value: unknown) => typeof value === 'string' && value.length <= 80 && (/^[a-zA-Z0-9_.-]{3,40}$/.test(value) || /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(value));

export type Credentials = { username: string; name: string; password: string };
export function readCredentials(body: { username?: unknown; name?: unknown; password?: unknown }): Credentials {
  const { username, name, password } = body;
  if (typeof username !== 'string' || !validUsername(username) || typeof password !== 'string' || password.length < 12 || password.length > 128 || typeof name !== 'string' || !name.trim() || name.length > 80)
    throw new Error('اكتب إيميلًا صحيحًا أو اسم دخول إنجليزيًا من 3 إلى 40 حرفًا، واسمًا ظاهرًا، وكلمة مرور من 12 إلى 128 حرفًا.');
  return { username: username.toLowerCase(), name: name.trim(), password };
}
export const validPasswordLength = (password: unknown) => typeof password === 'string' && password.length >= 12 && password.length <= 128;

const startsWith = (bytes: Uint8Array, ...values: number[]) => values.every((value, n) => bytes[n] === value);
const ascii = (bytes: Uint8Array, from: number, text: string) => [...text].every((c, n) => bytes[from + n] === c.charCodeAt(0));
const webm = (b: Uint8Array) => startsWith(b, 0x1a, 0x45, 0xdf, 0xa3);
// A declared type or extension proves nothing, so uploads must also match their first bytes.
export const MEDIA_TYPES: Record<string, (bytes: Uint8Array) => boolean> = {
  'image/jpeg': b => startsWith(b, 0xff, 0xd8, 0xff),
  'image/png': b => startsWith(b, 0x89, 0x50, 0x4e, 0x47),
  'audio/webm': webm,
  'video/webm': webm,
  'audio/mp4': b => ascii(b, 4, 'ftyp'),
  'video/mp4': b => ascii(b, 4, 'ftyp'),
  'audio/ogg': b => ascii(b, 0, 'OggS'),
  'audio/mpeg': b => ascii(b, 0, 'ID3') || b[0] === 0xff,
};
export function mediaProblem(type: string, size: number, head: Uint8Array) {
  const matches = Object.prototype.hasOwnProperty.call(MEDIA_TYPES, type) ? MEDIA_TYPES[type] : undefined;
  if (!matches) return 'نوع الملف غير مسموح.';
  if (size > MEDIA_LIMIT) return 'الملف أكبر من 30 ميجابايت.';
  if (head.length < 12 || !matches(head)) return 'محتوى الملف لا يطابق نوعه.';
  return null;
}
