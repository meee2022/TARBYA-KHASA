import { CSSProperties, PointerEvent as ReactPointerEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Video } from 'lucide-react';
export function SymbolArt({ entry }: { entry: { emoji: string; imageId?: string } }) { return entry.imageId ? <img className="symbol-art" src={entry.imageId} alt="" /> : <span className="tile-emoji" aria-hidden="true">{entry.emoji}</span>; }
import { AccessSettings, nextScanIndex, Tile } from '../../packages/domain/games';
import type { SymbolEntry } from '../../packages/domain/catalog';
import { playMedia, stopMedia, useMediaUrl } from './media';

/** Picture of a pack item: uploaded image first, then emoji. Decorative: the owner sets the accessible name. */
export function TilePicture({ tile, className = '' }: { tile: Pick<Tile, 'emoji' | 'imageId'>; className?: string }) {
  const url = useMediaUrl(tile.imageId);
  if (url) return <img className={`tile-picture ${className}`} src={url} alt="" />;
  return tile.emoji ? <span className={`tile-emoji ${className}`} aria-hidden="true">{tile.emoji}</span> : null;
}
/** Picture and/or word. Without a visible word, the accessible name still carries it for screen readers. */
export function TileFace({ tile, textAlternative = false }: { tile: Tile; textAlternative?: boolean }) {
  const label = textAlternative && tile.hideLabel && tile.description ? tile.description : tile.label;
  return <><TilePicture tile={tile} />{tile.hideLabel && !textAlternative ? <span className="visually-hidden">{label}</span> : <span className="tile-label" dir="auto" lang={tile.lang}>{label}</span>}</>;
}
export function SignVideo({ id }: { id?: string }) {
  const url = useMediaUrl(id); const [open, setOpen] = useState(false);
  if (!url) return null;
  return <div className="sign-video"><button type="button" data-scan className="button secondary" onClick={() => setOpen(o => !o)} aria-expanded={open}><Video size={18} />{open ? 'إخفاء الإشارة' : 'شاهد بالإشارة'}</button>{open && <video src={url} controls muted loop autoPlay playsInline />}</div>;
}
const voice = (lang: 'ar' | 'en') => lang === 'en' ? 'en-GB' : 'ar-QA';
export function useSpeech() {
  const [error, setError] = useState('');
  useEffect(() => () => { window.speechSynthesis?.cancel(); stopMedia(); }, []);
  const stop = useCallback(() => { window.speechSynthesis?.cancel(); stopMedia(); }, []);
  /** Speaks each part in its own language, so an English word never gets an Arabic voice. */
  const say = useCallback((...parts: { text: string; lang?: 'ar' | 'en' }[]) => {
    if (!('speechSynthesis' in window)) { setError('الصوت غير متاح هنا. جميع التعليمات ظاهرة كتابةً.'); return; }
    window.speechSynthesis.cancel(); stopMedia(); setError('');
    const voices = window.speechSynthesis.getVoices();
    const missing = parts.find(p => voices.length && !voices.some(v => v.lang.toLowerCase().startsWith(p.lang ?? 'ar')));
    if (missing) setError(`لا يوجد صوت ${missing.lang === 'en' ? 'إنجليزي' : 'عربي'} على هذا الجهاز. سجّل صوت المعلم للكلمة، أو استخدم النص المكتوب.`);
    for (const part of parts) {
      const speech = new SpeechSynthesisUtterance(part.text); speech.lang = voice(part.lang ?? 'ar'); speech.rate = .8;
      speech.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') setError('تعذّر تشغيل الصوت. يمكنك استخدام التعليمات المكتوبة.'); };
      window.speechSynthesis.speak(speech);
    }
  }, []);
  const speak = useCallback((text: string, lang: 'ar' | 'en' = 'ar') => say({ text, lang }), [say]);
  /** The teacher's recording wins over the synthetic voice; a failed recording falls back to it. */
  const sayTile = useCallback((tile: Pick<Tile, 'label' | 'audioId' | 'lang'>) => { if (tile.audioId) { window.speechSynthesis?.cancel(); playMedia(tile.audioId).catch(() => speak(tile.label, tile.lang)); } else speak(tile.label, tile.lang); }, [speak]);
  return { say, speak, sayTile, error, stop };
}
export function useSwitchScan(root: RefObject<HTMLElement>, enabled: boolean, seconds: number, stepKey: string, stop: () => void, announce?: (text: string) => void) {
  const spoken = useRef(announce); spoken.current = announce;
  const halt = useRef(stop); halt.current = stop;
  useEffect(() => {
    if (!enabled || !root.current) return;
    let cursor = -1; let active: HTMLButtonElement | undefined;
    const clear = () => { active?.removeAttribute('data-scanning'); };
    const advance = () => {
      if (root.current?.querySelector('dialog[open]')) return; // The teacher is working: do not move focus under the panel.
      const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>('button[data-scan]:not(:disabled)') ?? [])].filter(el => el.getClientRects().length);
      clear(); cursor = nextScanIndex(cursor, buttons.length); active = buttons[cursor];
      active?.setAttribute('data-scanning', 'true'); active?.focus({ preventScroll: false });
      // Never talk over feedback the student is still hearing.
      if (active && !window.speechSynthesis?.speaking) spoken.current?.(active.getAttribute('aria-label') || active.textContent || '');
    };
    advance();
    const timer = window.setInterval(advance, Math.max(2, seconds) * 1000);
    // On document: pressing a button can disable it and drop focus out of the room, and the next press must still count.
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('dialog')) return;
      if (e.key === 'Escape') { e.preventDefault(); halt.current(); return; }
      if ((e.key === ' ' || e.key === 'Enter') && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) { e.preventDefault(); if (!e.repeat) active?.click(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearInterval(timer); clear(); document.removeEventListener('keydown', onKey); };
  }, [root, enabled, seconds, stepKey]);
}
/** Selects a button after the pointer rests on it: for head pointers, eye gaze or limited hand strength. */
export function useDwell(root: RefObject<HTMLElement>, enabled: boolean, ms = 1500) {
  useEffect(() => {
    const element = root.current;
    if (!enabled || !element) return;
    let timer = 0; let target: HTMLElement | null = null;
    const clear = () => { clearTimeout(timer); target?.removeAttribute('data-dwelling'); target = null; };
    const over = (e: PointerEvent) => {
      const next = (e.target as HTMLElement).closest<HTMLElement>('button[data-scan]:not(:disabled)');
      if (next === target) return;
      clear(); if (!next) return;
      target = next; next.setAttribute('data-dwelling', 'true');
      timer = window.setTimeout(() => { const pressed = target; clear(); pressed?.click(); }, ms);
    };
    element.addEventListener('pointerover', over); element.addEventListener('pointerleave', clear);
    return () => { clear(); element.removeEventListener('pointerover', over); element.removeEventListener('pointerleave', clear); };
  }, [root, enabled, ms]);
}
/** Ignores a second press right after the first, for tremor or repeated taps. Works at the capture phase on any button. */
export function steadyTap(enabled: boolean | undefined) {
  let last = 0;
  return (e: React.MouseEvent) => {
    if (!enabled || !(e.target as HTMLElement).closest('button')) return;
    if (e.timeStamp - last < 700) { e.stopPropagation(); e.preventDefault(); return; }
    last = e.timeStamp;
  };
}
export function accessClass(a: AccessSettings) { return ['access-room', a.large && 'learning-large', a.contrast && 'learning-contrast', a.target && a.target !== 'normal' && `target-${a.target}`, a.hand && a.hand !== 'any' && `hand-${a.hand}`, a.calm && 'calm-room'].filter(Boolean).join(' '); }
/** A deliberate hold, so a student's stray tap cannot open teacher controls. Keyboard and assistive clicks open directly. */
export function HoldButton({ onOpen, children, className = '', style }: { onOpen: () => void; children: React.ReactNode; className?: string; style?: CSSProperties }) {
  const timer = useRef(0);
  const start = (e: ReactPointerEvent) => { if (e.button) return; timer.current = window.setTimeout(onOpen, 800); };
  const cancel = () => clearTimeout(timer.current);
  return <button type="button" style={style} className={`hold-button ${className}`} title="اضغط مطولًا" onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onContextMenu={e => e.preventDefault()} onClick={e => { if (e.detail === 0) onOpen(); }}>{children}</button>;
}
export function CommunicationBoard({ tiles, sound, onBreak, onRepeat, onRequest, collapsible, startOpen }: { tiles: SymbolEntry[]; sound: boolean; onBreak: () => void; onRepeat: () => void; onRequest?: (label: string) => void; collapsible?: boolean; startOpen?: boolean }) {
  const [message, setMessage] = useState(''); const { speak, error } = useSpeech(); const [open, setOpen] = useState(!collapsible || !!startOpen);
  if (!tiles.length) return null;
  // Closed by default during a task so it never competes with it, one press away; learners who rely on it start open.
  if (!open) return <div className="communication-toggle"><button data-scan className="button secondary" aria-expanded="false" onClick={() => setOpen(true)}><MessageCircle size={20} />أعبّر بطريقتي</button></div>;
  return <section className="communication-board" aria-label="لوحة التواصل"><div className="communication-heading"><h2>أعبّر بطريقتي</h2><p>اضغط الرسالة، أو أشر إليها ليختارها المعلّم.</p>{collapsible && <button data-scan className="button secondary" aria-expanded="true" onClick={() => setOpen(false)}>إخفاء</button>}</div><div className="communication-tiles">{tiles.map(tile => <button data-scan key={tile.id} onClick={() => { setMessage(tile.label); onRequest?.(tile.label); if (tile.id === 'repeat') { onRepeat(); return; } if (tile.id === 'break') onBreak(); if (sound) speak(tile.label); }}><SymbolArt entry={tile} /><span>{tile.label}</span></button>)}</div><p className="communication-message" role="status" aria-live="polite">{message || 'رسالتك ستظهر هنا.'}{error && `. ${error}`}</p></section>;
}
