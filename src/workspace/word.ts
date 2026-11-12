import { packageParts } from '../../packages/domain/docx';
import { deleteMedia, mediaUrl, storeMedia } from './media';

/** One exported Word file kept on this device: the record lives in local storage, the file itself beside the teacher's media. */
export interface ArchiveEntry { id: string; name: string; kind: string; at: string; size: number; }
const KEY = 'tarbya.archive.v1'; const KEPT = 40;
export const archiveList = (): ArchiveEntry[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const archiveWrite = (list: ArchiveEntry[]) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* the archive is a convenience: the export itself already succeeded */ } window.dispatchEvent(new Event('tarbya-archive')); };
export async function archiveRemove(id: string) { await deleteMedia(id).catch(() => undefined); archiveWrite(archiveList().filter(d => d.id !== id)); }

const fileName = (name: string) => `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'ملف'}.docx`;
function save(url: string, name: string) { const a = document.createElement('a'); a.href = url; a.download = fileName(name); a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
/** Downloads an archived file again, exactly as it was exported. */
export async function archiveSave(entry: ArchiveEntry) { const url = await mediaUrl(entry.id).catch(() => undefined); if (!url) return false; save(url, entry.name); return true; }

/** Builds the .docx on this device and keeps a copy in the device archive. Nothing is uploaded. */
export async function downloadWord(name: string, body: string, kind = 'مستند') {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const [path, content] of Object.entries(packageParts(body))) zip.file(path, content);
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  save(URL.createObjectURL(blob), name);
  try {
    const id = await storeMedia(blob, false); const list = [{ id, name, kind, at: new Date().toISOString(), size: blob.size }, ...archiveList()];
    for (const old of list.slice(KEPT)) await deleteMedia(old.id).catch(() => undefined);
    archiveWrite(list.slice(0, KEPT));
  } catch { /* a full or unavailable device store must not fail the download */ }
}
