import { useEffect, useRef, useState } from 'react';
import { Accessibility, Contrast, Square, Type, Volume2 } from 'lucide-react';
import './accessBar.css';

type TextSize = 'normal' | 'large' | 'larger';
interface Choices { text: TextSize; contrast: boolean; }
const KEY = 'tarbya.access';
const sizes: [TextSize, string][] = [['normal', 'عادي'], ['large', 'كبير'], ['larger', 'أكبر']];

function saved(): Choices { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return { text: sizes.some(s => s[0] === v.text) ? v.text : 'normal', contrast: v.contrast === true }; } catch { return { text: 'normal', contrast: false }; } }
function apply(c: Choices) { const root = document.documentElement; if (c.text === 'normal') delete root.dataset.textSize; else root.dataset.textSize = c.text; if (c.contrast) root.dataset.contrast = 'high'; else delete root.dataset.contrast; }
apply(saved());

/** Short pieces a speech engine reads without cutting off: one sentence or line at a time. */
export function readingChunks(text: string, max = 180): string[] {
  const out: string[] = [];
  for (const line of text.split(/\n+/).map(x => x.trim()).filter(Boolean)) for (const sentence of line.split(/(?<=[.؟!؛:])\s+/)) { let rest = sentence.trim(); while (rest.length > max) { const cut = rest.lastIndexOf(' ', max); const at = cut > 40 ? cut : max; out.push(rest.slice(0, at)); rest = rest.slice(at).trim(); } if (rest) out.push(rest); }
  return out;
}

/** Reading comfort for whoever is at the screen: larger text, stronger contrast, and the page read aloud. Kept on this device. */
export function AccessBar() {
  const [open, setOpen] = useState(false); const [choices, setChoices] = useState<Choices>(saved); const [reading, setReading] = useState(false); const box = useRef<HTMLDivElement>(null); const run = useRef(0);
  const canRead = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const set = (change: Partial<Choices>) => { const next = { ...choices, ...change }; setChoices(next); apply(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: applies for this visit only */ } };
  const stop = () => { run.current++; window.speechSynthesis?.cancel(); setReading(false); };
  const read = () => {
    const main = document.getElementById('workspace-main'); if (!main || !canRead) return;
    const chunks = readingChunks(main.innerText).slice(0, 400); if (!chunks.length) return;
    window.speechSynthesis.cancel(); const mine = ++run.current; setReading(true);
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('ar'));
    const next = (n: number) => { if (mine !== run.current) return; if (n >= chunks.length) { setReading(false); return; } const u = new SpeechSynthesisUtterance(chunks[n]); u.lang = voice?.lang ?? 'ar-SA'; if (voice) u.voice = voice; u.rate = 0.95; u.onend = () => next(n + 1); u.onerror = () => { if (mine === run.current) setReading(false); }; window.speechSynthesis.speak(u); };
    next(0);
  };
  useEffect(() => () => { run.current++; window.speechSynthesis?.cancel(); }, []);
  useEffect(() => { if (!open) return; const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); }; const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; document.addEventListener('mousedown', away); document.addEventListener('keydown', key); return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key); }; }, [open]);
  const changed = choices.text !== 'normal' || choices.contrast || reading;
  return <div className="access-bar" ref={box}>
    <button type="button" className={`access-toggle ${changed ? 'is-on' : ''}`} aria-expanded={open} aria-controls="access-panel" onClick={() => setOpen(o => !o)}><Accessibility size={20} aria-hidden="true" /><span>إتاحة الوصول</span></button>
    {open && <div id="access-panel" className="access-panel" role="group" aria-label="إتاحة الوصول">
      <div className="access-row"><span><Type size={17} aria-hidden="true" />حجم النص</span><div className="access-sizes" role="radiogroup" aria-label="حجم النص">{sizes.map(([value, label]) => <button key={value} type="button" role="radio" aria-checked={choices.text === value} className={choices.text === value ? 'active' : ''} onClick={() => set({ text: value })}>{label}</button>)}</div></div>
      <button type="button" className="access-switch" role="switch" aria-checked={choices.contrast} onClick={() => set({ contrast: !choices.contrast })}><span><Contrast size={17} aria-hidden="true" />تباين أعلى</span><i aria-hidden="true" /></button>
      {canRead && <button type="button" className={`access-read ${reading ? 'is-reading' : ''}`} onClick={reading ? stop : read}>{reading ? <><Square size={16} aria-hidden="true" />أوقف القراءة</> : <><Volume2 size={17} aria-hidden="true" />اقرأ الصفحة بصوت</>}</button>}
      <p>تُحفظ اختياراتك على هذا الجهاز.</p>
    </div>}
  </div>;
}
