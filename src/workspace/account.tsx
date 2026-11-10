import { FormEvent, useState } from 'react';
import { Cloud, CloudOff, KeyRound, LogIn, LogOut, RefreshCw, UserPlus } from 'lucide-react';
import { useSiteConfig } from './site';
import { useWorkspace } from './store';
import { accountsAvailable, changePassword } from './teacherApi';

const states = { off: 'غير متصل بحساب', saving: 'جارٍ الحفظ في حسابك…', saved: 'محفوظ في حسابك', conflict: 'تغيّرت بياناتك من جهاز آخر', error: 'لم يصل آخر تعديل إلى حسابك' } as const;

/** Sign in, or create an account while sign-up is open, so the same learners and lessons open on any device. */
export function AccountPanel() {
  const { account, sync, syncMessage, signIn, signUp, signOut, reloadFromAccount } = useWorkspace(); const { site } = useSiteConfig(); const [mode, setMode] = useState<'in' | 'new'>('in');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState('');
  if (!accountsAvailable) return <section className="panel settings-panel account-panel"><h2><CloudOff size={20} aria-hidden="true" />حساب المعلم</h2><p>حسابات المعلمين تعمل على الموقع المنشور. هذه النسخة تحفظ على هذا الجهاز فقط.</p></section>;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError('');
    try { await signIn(String(f.get('username') ?? ''), String(f.get('password') ?? '')); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const change = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setBusy(true); setError(''); setDone('');
    try { await changePassword(String(f.get('current') ?? ''), String(f.get('password') ?? '')); form.reset(); setDone('تغيّرت كلمة المرور، وخرجت أجهزتك الأخرى.'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const join = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError('');
    try { await signUp(String(f.get('username') ?? '').trim(), String(f.get('name') ?? ''), String(f.get('password') ?? '')); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  if (!account) return <section className="panel settings-panel account-panel"><h2><LogIn size={20} aria-hidden="true" />حساب المعلم</h2>
    {site.teacherSignup && <div className="segmented account-mode" role="group" aria-label="الدخول أو حساب جديد"><button type="button" aria-pressed={mode === 'in'} className={mode === 'in' ? 'active' : ''} onClick={() => { setMode('in'); setError(''); }}>لديّ حساب</button><button type="button" aria-pressed={mode === 'new'} className={mode === 'new' ? 'active' : ''} onClick={() => { setMode('new'); setError(''); }}>حساب جديد</button></div>}
    {mode === 'new' && site.teacherSignup ? <>
      <p>أنشئ حسابك لتحفظ دروسك وملفات طلابك وتفتحها من أي جهاز.</p>
      <form className="account-form" onSubmit={join}><label>اسمك كما يظهر في المنصة<input name="name" autoComplete="name" required maxLength={80} /></label><label>اسم الدخول أو الإيميل<input name="username" autoComplete="username" required dir="ltr" maxLength={80} pattern="[A-Za-z0-9_.+@\-]{3,80}" title="إيميل، أو اسم إنجليزي من 3 أحرف بلا مسافات" /><small>إيميل، أو اسم إنجليزي من 3 أحرف بلا مسافات.</small></label><label>كلمة المرور<input name="password" type="password" autoComplete="new-password" required minLength={6} maxLength={128} /><small>6 أحرف على الأقل.</small></label><button className="button primary" disabled={busy}><UserPlus size={17} />{busy ? 'جارٍ إنشاء الحساب…' : 'إنشاء الحساب'}</button></form>
      {error && <p className="alert" role="alert">{error}</p>}
      <p className="account-local-hint">المنصة في فترة تجربة: جرّبها ببيانات غير حقيقية للطلاب، وما على هذا الجهاز من دروس يُحفظ في حسابك الجديد.</p>
    </> : <>
      <p>سجّل الدخول بحسابك لحفظ دروسك وملفات طلابك عبر الأجهزة.</p>
      <form className="account-form" onSubmit={submit}><label>اسم الدخول أو الإيميل<input name="username" autoComplete="username" required dir="ltr" maxLength={80} /></label><label>كلمة المرور<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label><button className="button primary" disabled={busy}><LogIn size={17} />{busy ? 'جارٍ الدخول…' : 'دخول'}</button></form>
      {error && <p className="alert" role="alert">{error}</p>}
      <p className="account-local-hint">بدون حساب تبقى البيانات على هذا الجهاز فقط.</p><details className="account-sync-help"><summary>ماذا يحدث عند أول دخول؟</summary><p>إذا اختلفت بيانات هذا الجهاز عن حسابك، ستُسأل أي النسختين تحتفظ بها.</p></details>
    </>}</section>;
  return <section className="panel settings-panel account-panel"><h2><Cloud size={20} aria-hidden="true" />حساب {account.name}</h2>
    <p className={`sync-state sync-${sync}`} role="status" aria-live="polite">{states[sync]}{syncMessage && sync !== 'conflict' && ` · ${syncMessage}`}</p>
    <div className="account-actions">{(sync === 'conflict' || sync === 'error') && <button className="button primary" onClick={() => void reloadFromAccount()}><RefreshCw size={17} />اختر النسخة الصحيحة</button>}<button className="button secondary" onClick={() => void signOut()}><LogOut size={17} />خروج ومسح نسخة هذا الجهاز</button></div>
    <p className="info-note">الصور والأصوات التي ترفعها تبقى على هذا الجهاز، ولا تنتقل مع الحساب حاليًا.</p>
    <details className="account-password"><summary><KeyRound size={16} aria-hidden="true" />تغيير كلمة المرور</summary><form className="account-form" onSubmit={change}><label>كلمة المرور الحالية<input name="current" type="password" autoComplete="current-password" required maxLength={128} /></label><label>كلمة المرور الجديدة (6 أحرف على الأقل)<input name="password" type="password" autoComplete="new-password" required minLength={6} maxLength={128} /></label><button className="button secondary" disabled={busy}>حفظ كلمة المرور</button></form>{done && <p role="status">{done}</p>}{error && <p className="alert" role="alert">{error}</p>}</details>
  </section>;
}
