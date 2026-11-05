import { CSSProperties, Fragment, PointerEvent as ReactPointerEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, MessageCircle, Minimize2, Video, Volume2 } from 'lucide-react';
export function SymbolArt({ entry }: { entry: { emoji: string; imageId?: string } }) { return entry.imageId ? <img className="symbol-art" src={entry.imageId} alt="" /> : <span className="tile-emoji" aria-hidden="true">{entry.emoji}</span>; }
import { AccessSettings, nextScanIndex, readingWords, Tile } from '../../packages/domain/games';
import type { SocialStory, SymbolEntry } from '../../packages/domain/catalog';
import { playMedia, stopMedia, useMediaUrl } from './media';

/** Picture of a pack item: uploaded image first, then emoji. Decorative: the owner sets the accessible name. */
export function TilePicture({ tile, className = '' }: { tile: Pick<Tile, 'emoji' | 'imageId'>; className?: string }) {
  const url = useMediaUrl(tile.imageId);
  if (url) return <img className={`tile-picture ${className}`} src={url} alt="" />;
  return tile.emoji ? <span className={`tile-emoji ${className}`} aria-hidden="true">{tile.emoji}</span> : null;
}
/** Picture and/or word. A picture without a visible word is named by its description, so a screen reader user meets the picture, not its answer. */
export function TileFace({ tile, textAlternative = false }: { tile: Tile; textAlternative?: boolean }) {
  const label = textAlternative && tile.hideLabel && tile.description ? tile.description : tile.label;
  return <><TilePicture tile={tile} />{tile.hideLabel && !textAlternative ? <span className="visually-hidden">{tile.description || label}</span> : <span className="tile-label" dir="auto" lang={tile.lang}>{label}</span>}</>;
}
/** Opens by itself for a learner who understands through sign, and can be enlarged. */
export function SignVideo({ id, auto = false }: { id?: string; auto?: boolean }) {
  const url = useMediaUrl(id); const [open, setOpen] = useState(auto); const [big, setBig] = useState(false);
  if (!url) return null;
  return <div className={`sign-video ${big ? 'is-big' : ''}`}><div className="sign-video-actions"><button type="button" data-scan className="button secondary" onClick={() => setOpen(o => !o)} aria-expanded={open}><Video size={18} />{open ? 'إخفاء الإشارة' : 'شاهد بالإشارة'}</button>{open && <button type="button" data-scan className="button secondary" aria-pressed={big} onClick={() => setBig(b => !b)}>{big ? <Minimize2 size={18} /> : <Maximize2 size={18} />}{big ? 'تصغير الفيديو' : 'تكبير الفيديو'}</button>}</div>{open && <video src={url} controls muted loop autoPlay playsInline />}</div>;
}
/** A social story, one page at a time: one picture, one literal sentence, and the same buttons in the same place on every page. */
export function SocialStoryView({ story, sound, onDone, doneLabel = 'أنا مستعد' }: { story: SocialStory; sound: boolean; onDone: () => void; doneLabel?: string }) {
  const [page, setPage] = useState(0); const { speak } = useSpeech(); const heading = useRef<HTMLHeadingElement>(null);
  const p = story.pages[page]; const last = page === story.pages.length - 1;
  useEffect(() => { heading.current?.focus(); if (sound && p) speak(p.label); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null;
  return <section className="social-story rise-in" aria-label={`قصة: ${story.title}`}><p className="story-title">{story.title} · {page + 1} من {story.pages.length}</p>
    <div className="story-page"><SymbolArt entry={p} /><h1 ref={heading} tabIndex={-1}>{p.label}</h1></div>
    <div className="story-actions"><button data-scan className="button secondary" disabled={!page} onClick={() => setPage(n => n - 1)}>السابق</button>{sound && <button data-scan className="button secondary" onClick={() => speak(p.label)}><Volume2 size={20} />استمع</button>}<button data-scan className="button primary" onClick={() => last ? onDone() : setPage(n => n + 1)}>{last ? doneLabel : 'التالي'}</button></div></section>;
}
/** A bar that empties during work time, then asks for a break. It never ends a task or costs anything. */
export function WorkTimer({ minutes, running, onEnd }: { minutes: number; running: boolean; onEnd: () => void }) {
  const total = minutes * 60; const [left, setLeft] = useState(total); const end = useRef(onEnd); end.current = onEnd;
  useEffect(() => { if (!running) return; const t = window.setInterval(() => setLeft(l => l - 1), 1000); return () => clearInterval(t); }, [running]);
  useEffect(() => { if (left <= 0) { setLeft(total); end.current(); } }, [left, total]);
  return <div className="work-timer" role="img" aria-label={`وقت العمل: باقي ${Math.ceil(left / 60)} دقيقة`}><span style={{ width: `${left / total * 100}%` }} /></div>;
}
/** A short pulse after an answer, for learners who do not hear the feedback. Silently does nothing where unsupported, such as iPhone Safari. */
export function buzz(on: boolean | undefined, correct: boolean) { if (on) navigator.vibrate?.(correct ? 60 : [30, 90, 30]); }
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
  /** Reads one word at a time so the shown word can be highlighted: many Arabic voices never report word boundaries. */
  const readAlong = useCallback((text: string, onWord: (index: number) => void) => {
    if (!('speechSynthesis' in window)) { setError('الصوت غير متاح هنا. جميع التعليمات ظاهرة كتابةً.'); return; }
    window.speechSynthesis.cancel(); stopMedia(); setError('');
    const words = readingWords(text);
    words.forEach((word, i) => {
      const speech = new SpeechSynthesisUtterance(word.text); speech.lang = voice(word.lang); speech.rate = .7;
      speech.onstart = () => onWord(i);
      speech.onerror = () => onWord(-1);
      if (i === words.length - 1) speech.onend = () => onWord(-1);
      window.speechSynthesis.speak(speech);
    });
  }, []);
  return { say, speak, sayTile, readAlong, error, stop };
}
/** One switch: the highlight moves by itself and Space or Enter selects. Two switches: Space moves, Enter selects, nothing moves by itself. */
export function useSwitchScan(root: RefObject<HTMLElement>, enabled: boolean, seconds: number, stepKey: string, stop: () => void, announce?: (text: string) => void, two = false) {
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
    const timer = two ? 0 : window.setInterval(advance, Math.max(2, seconds) * 1000);
    // On document: pressing a button can disable it and drop focus out of the room, and the next press must still count.
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('dialog')) return;
      if (e.key === 'Escape') { e.preventDefault(); halt.current(); return; }
      if ((e.key === ' ' || e.key === 'Enter') && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) { e.preventDefault(); if (e.repeat) return; if (two && e.key === ' ') advance(); else active?.click(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearInterval(timer); clear(); document.removeEventListener('keydown', onKey); };
  }, [root, enabled, seconds, stepKey, two]);
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
export function accessClass(a: AccessSettings) { return ['access-room', a.large && 'learning-large', a.contrast && 'learning-contrast', a.target && a.target !== 'normal' && `target-${a.target}`, a.hand && a.hand !== 'any' && `hand-${a.hand}`, a.calm && 'calm-room', a.easyFont && 'reading-easy', a.spacing && 'reading-spaced', a.tint && a.tint !== 'none' && `reading-tint-${a.tint}`, a.focusOne && 'focus-one', a.highlight && a.highlight !== 'none' && `highlight-${a.highlight}`, a.quiet && 'sensory-quiet'].filter(Boolean).join(' '); }
/** Text the student reads, split into words so «اقرأ معي» can light up the word being spoken. */
export function ReadingText({ text, word }: { text: string; word: number }) {
  return <>{readingWords(text).map((w, i) => <Fragment key={i}>{i ? ' ' : ''}<span lang={w.lang} className={i === word ? 'read-word' : undefined}>{w.text}</span></Fragment>)}</>;
}
/** Dims everything above and below one band. Follows the pointer, and the focused button for keyboard and switch users. */
export function ReadingRuler() {
  const [y, setY] = useState(() => window.innerHeight / 3);
  useEffect(() => {
    const move = (e: PointerEvent) => setY(e.clientY);
    const focus = (e: FocusEvent) => { const r = (e.target as Element).getBoundingClientRect?.(); if (r) setY(r.top + r.height / 2); };
    window.addEventListener('pointermove', move); document.addEventListener('focusin', focus);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('focusin', focus); };
  }, []);
  return <div className="reading-ruler" aria-hidden="true" style={{ '--ruler-y': `${y}px` } as CSSProperties} />;
}
/** A deliberate hold, so a student's stray tap cannot open teacher controls. Keyboard and assistive clicks open directly. */
export function HoldButton({ onOpen, children, className = '', style }: { onOpen: () => void; children: React.ReactNode; className?: string; style?: CSSProperties }) {
  const timer = useRef(0);
  const start = (e: ReactPointerEvent) => { if (e.button) return; timer.current = window.setTimeout(onOpen, 800); };
  const cancel = () => clearTimeout(timer.current);
  return <button type="button" style={style} className={`hold-button ${className}`} title="اضغط مطولًا" onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onContextMenu={e => e.preventDefault()} onClick={e => { if (e.detail === 0) onOpen(); }}>{children}</button>;
}
export function CommunicationBoard({ tiles, words, sound, onBreak, onRepeat, onRequest, collapsible, startOpen }: { tiles: SymbolEntry[]; words?: Tile[]; sound: boolean; onBreak: () => void; onRepeat: () => void; onRequest?: (label: string) => void; collapsible?: boolean; startOpen?: boolean }) {
  const [message, setMessage] = useState(''); const { speak, sayTile, error } = useSpeech(); const [open, setOpen] = useState(!collapsible || !!startOpen);
  if (!tiles.length && !words?.length) return null;
  // Closed by default during a task so it never competes with it, one press away; learners who rely on it start open.
  if (!open) return <div className="communication-toggle"><button data-scan className="button secondary" aria-expanded="false" onClick={() => setOpen(true)}><MessageCircle size={20} />أعبّر بطريقتي</button></div>;
  return <section className="communication-board" aria-label="لوحة التواصل"><div className="communication-heading"><h2>أعبّر بطريقتي</h2><p>اضغط الرسالة، أو أشر إليها ليختارها المعلّم.</p>{collapsible && <button data-scan className="button secondary" aria-expanded="true" onClick={() => setOpen(false)}>إخفاء</button>}</div><div className="communication-tiles">{tiles.map(tile => <button data-scan key={tile.id} onClick={() => { setMessage(tile.label); onRequest?.(tile.label); if (tile.id === 'repeat') { onRepeat(); return; } if (tile.id === 'break') onBreak(); if (sound) speak(tile.label); }}><SymbolArt entry={tile} /><span>{tile.label}</span></button>)}</div>{!!words?.length && <><h3 className="communication-words-title">كلمات الدرس</h3><div className="communication-tiles">{words.map(w => <button data-scan key={w.id} onClick={() => { setMessage(w.label); onRequest?.(w.label); if (sound) sayTile(w); }}><TilePicture tile={w} /><span dir="auto" lang={w.lang}>{w.label}</span></button>)}</div></>}<p className="communication-message" role="status" aria-live="polite">{message || 'رسالتك ستظهر هنا.'}{error && `. ${error}`}</p></section>;
}
