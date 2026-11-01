import { useEffect, useState } from 'react';
import { uid } from '../../packages/domain';

// Teacher media stays in this browser (IndexedDB). Shared-pack media goes to the admin server.
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('tarbya-media', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('files');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('files', mode);
    const request = action(tx.objectStore('files'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error ?? request.error); };
  });
}
export const isShared = (id?: string) => !!id && (id.startsWith('/api/media/') || id.startsWith('/images/'));
export async function mediaUrl(id: string) {
  if (isShared(id)) return id;
  const blob = await run<Blob | undefined>('readonly', s => s.get(id));
  return blob ? URL.createObjectURL(blob) : undefined;
}
export function useMediaUrl(id?: string) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let alive = true; let created: string | undefined;
    if (!id) { setUrl(undefined); return; }
    mediaUrl(id).then(next => { if (alive) { created = next; setUrl(next); } else if (next && !isShared(id)) URL.revokeObjectURL(next); }).catch(() => setUrl(undefined));
    return () => { alive = false; if (created && !isShared(id)) URL.revokeObjectURL(created); };
  }, [id]);
  return url;
}
export async function deleteMedia(id?: string) { if (id && !isShared(id)) await run('readwrite', s => s.delete(id)); }
export async function storeMedia(blob: Blob, shared: boolean) {
  if (shared) {
    const response = await fetch('/api/admin/media', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': blob.type.split(';')[0] }, body: blob });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'تعذّر رفع الملف.');
    return payload.url as string;
  }
  const id = `local-${uid()}`;
  await run('readwrite', s => s.put(blob, id));
  return id;
}
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
/** Re-encoding drops location and other EXIF metadata, removes active content, and keeps storage small. */
export async function prepareImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('اختر صورة JPG أو PNG أو WEBP.');
  if (file.size > 15 * 1024 * 1024) throw new Error('الصورة أكبر من 15 ميجابايت.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('تعذّر قراءة الصورة.'); });
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d')!; context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذّر تجهيز الصورة.')), 'image/jpeg', .85));
}
export function checkVideo(file: File) {
  if (!['video/mp4', 'video/webm'].includes(file.type)) throw new Error('اختر فيديو MP4 أو WEBM.');
  if (file.size > 30 * 1024 * 1024) throw new Error('الفيديو أكبر من 30 ميجابايت.');
  return file;
}
let current: HTMLAudioElement | undefined; let release: (() => void) | undefined; let token = 0;
export function stopMedia() { token++; current?.pause(); current = undefined; release?.(); release = undefined; }
/** Resolves false if a newer play or stop replaced this one, so callers do not fall back to another voice. */
export async function playMedia(id: string) {
  stopMedia();
  const mine = token;
  const url = await mediaUrl(id);
  if (mine !== token) { if (url && !isShared(id)) URL.revokeObjectURL(url); return false; }
  if (!url) throw new Error('missing');
  const audio = new Audio(url); current = audio;
  release = isShared(id) ? undefined : () => URL.revokeObjectURL(url);
  audio.onended = () => { if (mine === token) stopMedia(); };
  try { await audio.play(); return true; }
  catch (e) { if (mine !== token || (e as Error).name === 'AbortError') return false; throw e; }
}
/** Records from the microphone; stops itself at the limit so a forgotten recording cannot fill storage. */
export async function startRecording(onDone: (blob: Blob) => void, seconds = 20) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const type = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); clearTimeout(timer); onDone(new Blob(chunks, { type: recorder.mimeType })); };
  const timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, seconds * 1000);
  recorder.start();
  return () => { if (recorder.state === 'recording') recorder.stop(); };
}
