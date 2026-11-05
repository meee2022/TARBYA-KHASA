import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

type Choice = 'system' | 'light' | 'dark';
const KEY = 'tarbya.theme';
const night = window.matchMedia('(prefers-color-scheme: dark)');

function saved(): Choice { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; } }
function apply(choice: Choice) { document.documentElement.dataset.theme = choice === 'system' ? (night.matches ? 'dark' : 'light') : choice; }

// index.html applies the choice before first paint; this keeps "system" in step when the device switches.
night.addEventListener('change', () => { if (saved() === 'system') apply('system'); });

const options = [{ value: 'system', label: 'مثل الجهاز', icon: Monitor }, { value: 'light', label: 'نهاري', icon: Sun }, { value: 'dark', label: 'ليلي', icon: Moon }] as const;

/** Light, dark, or follow the device. Applies to the teacher's pages; play rooms and printed sheets keep their daylight colors. */
export function ThemePanel() {
  const [choice, setChoice] = useState<Choice>(saved);
  const pick = (value: Choice) => { setChoice(value); try { if (value === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, value); } catch { /* private mode: applies for this visit only */ } apply(value); };
  return <section className="panel settings-panel theme-panel"><h2>مظهر الصفحات</h2><p>الوضع الليلي يريح العين في الإضاءة الخافتة. غرف اللعب وأوراق الطباعة تبقى بألوانها النهارية.</p>
    <div className="theme-options" role="radiogroup" aria-label="مظهر الصفحات">{options.map(({ value, label, icon: Icon }) => <button key={value} type="button" role="radio" aria-checked={choice === value} className={choice === value ? 'active' : ''} onClick={() => pick(value)}><Icon size={18} aria-hidden="true" />{label}</button>)}</div>
  </section>;
}
