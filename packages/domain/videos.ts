/** A teaching video the teacher keeps a link to. It is shown to pupils only once the teacher has watched and approved it. */
export interface VideoItem { id: string; title: string; url: string; subject: string; note: string; approved: boolean; }

/** The video id when the link is a YouTube link in any of its usual shapes; otherwise nothing, and the link simply opens in a new tab. */
export function youtubeId(url: string): string | undefined {
  try {
    const u = new URL(url.trim()); if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
    const host = u.hostname.replace(/^(www|m)\./, '');
    const id = host === 'youtu.be' ? u.pathname.slice(1).split('/')[0] : host === 'youtube.com' || host === 'youtube-nocookie.com' ? (u.pathname === '/watch' ? u.searchParams.get('v') ?? '' : /^\/(embed|shorts|live)\/([^/]+)/.exec(u.pathname)?.[2] ?? '') : '';
    return /^[\w-]{6,20}$/.test(id) ? id : undefined;
  } catch { return undefined; }
}
export const safeLink = (url: string) => /^https:\/\/[^\s]+$/i.test(url.trim());

const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
/** Trust boundary for the synced workspace: shapes and sizes, and only https links. */
export const validVideos = (v: unknown): boolean => v === undefined || (Array.isArray(v) && v.length <= 500 && v.every((x: VideoItem) => !!x && str(x.id, 80) && str(x.title, 160) && str(x.url, 500) && safeLink(x.url) && str(x.subject, 80) && str(x.note, 400) && typeof x.approved === 'boolean'));
