import { Check } from 'lucide-react';

/** An on/off option as a pill. A row of these replaces a column of checkboxes. */
export const Chip = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => <button type="button" className="option-chip" aria-pressed={on} onClick={onClick}>{on && <Check size={15} aria-hidden="true" />}{label}</button>;

/** One choice from a short list, as a row of pills. Replaces a select of six options or fewer, so every choice is visible and one tap away. */
export function Seg<T extends string | number>({ label, value, options, onChange, hint }: { label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void; hint?: string }) {
  return <div className="seg" role="group" aria-label={label}><span className="seg-label" aria-hidden="true">{label}</span>
    <div className="option-chips">{options.map(([v, text]) => <button type="button" key={String(v)} className="option-chip" aria-pressed={v === value} onClick={() => onChange(v)}>{text}</button>)}</div>
    {hint && <small className="seg-hint">{hint}</small>}</div>;
}
