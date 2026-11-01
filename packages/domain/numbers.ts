export function latinDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, c => String(c.charCodeAt(0) - (c.charCodeAt(0) >= 0x06f0 ? 0x06f0 : 0x0660)));
}
/** Normalize display/content values, preserving record identifiers and references. */
export function latinizeContent<T>(value: T, key = ''): T {
  if (/^(id|.*Id|.*Ids|image|uri|url|password|token)$/i.test(key)) return value;
  if (typeof value === 'string') return latinDigits(value) as T;
  if (Array.isArray(value)) return value.map(v => latinizeContent(v, key)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, latinizeContent(v,k)])) as T;
  return value;
}
export const numberLocale = 'ar-QA-u-nu-latn';
