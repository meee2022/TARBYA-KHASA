import { useEffect, useState } from 'react';

type Ask = { message: string; ok: string; danger: boolean; resolve: (yes: boolean) => void };
let pending: ((ask: Ask | null) => void) | null = null;

/** A styled, right-to-left confirmation that resolves to the teacher's answer. Replaces window.confirm for destructive actions. */
export function confirmDialog(message: string, options: { ok?: string; danger?: boolean } = {}) {
  return new Promise<boolean>(resolve => { if (!pending) { resolve(window.confirm(message)); return; } pending({ message, ok: options.ok ?? 'نعم', danger: options.danger ?? true, resolve }); });
}

/** Mounted once in the workspace shell. */
export function ConfirmHost() {
  const [ask, setAsk] = useState<Ask | null>(null);
  useEffect(() => { pending = setAsk; return () => { pending = null; }; }, []);
  useEffect(() => { if (!ask) return; const first = document.querySelector<HTMLButtonElement>('.confirm-dialog button.secondary'); first?.focus(); const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(false); } }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [ask]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = (yes: boolean) => { ask?.resolve(yes); setAsk(null); };
  if (!ask) return null;
  return <div className="confirm-backdrop" onClick={() => close(false)}><div className="confirm-dialog panel" role="alertdialog" aria-modal="true" aria-labelledby="confirm-text" dir="rtl" onClick={e => e.stopPropagation()}>
    <p id="confirm-text">{ask.message}</p>
    <div className="heading-actions"><button type="button" className="button secondary" onClick={() => close(false)}>إلغاء</button><button type="button" className={`button ${ask.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>{ask.ok}</button></div>
  </div></div>;
}
