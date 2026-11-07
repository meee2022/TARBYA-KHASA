import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, Link2Off, MessageCircle, RefreshCw, Trash2 } from 'lucide-react';
import { dateLabel, homeObservation, type Learner } from '../../packages/domain';
import { parentChoiceLabels, parentToken, parentUrl, type ParentLink, type ParentReply } from '../../packages/domain/parent';
import { accountsAvailable, dismissParentReply, issueParentLink, parentLinks, parentReplies, revokeParentLink, SyncError } from './teacherApi';
import { confirmDialog } from './confirm';
import { useWorkspace } from './store';
import './planning.css';

/** The teacher's side of the family portal: her links and the families' answers, loaded once she has an account. */
export function useParentPortal(enabled: boolean) {
  const [links, setLinks] = useState<ParentLink[]>([]); const [replies, setReplies] = useState<ParentReply[]>([]); const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const reload = useCallback(async () => {
    if (!enabled) return; setState('loading');
    try { const [l, r] = await Promise.all([parentLinks(), parentReplies()]); setLinks(l); setReplies(r); setState('ready'); } catch { setState('error'); }
  }, [enabled]);
  useEffect(() => { void reload(); }, [reload]);
  return { links, replies, state, reload };
}

export function ParentPortalCard({ learner }: { learner: Learner }) {
  const { account, record, notify } = useWorkspace(); const portal = useParentPortal(!!account);
  const [copied, setCopied] = useState(false); const [busy, setBusy] = useState(false);
  const link = portal.links.find(l => l.learnerId === learner.id); const replies = portal.replies.filter(r => r.learnerId === learner.id);
  const url = link ? parentUrl(window.location.origin, link.token) : '';
  const first = learner.name.split(/\s|·/)[0]; const goal = learner.goals.find(g => !g.approvedAt) ?? learner.goals[0];
  const run = async (work: () => Promise<unknown>, done: string) => { setBusy(true); try { await work(); await portal.reload(); if (done) notify(done); } catch (e) { notify(e instanceof SyncError ? e.message : 'تعذّر الاتصال بالخادم.'); } finally { setBusy(false); } };
  const issue = () => run(() => issueParentLink(learner.id, parentToken(crypto.getRandomValues(new Uint8Array(24)))), link ? 'أُنشئ رابط جديد، والرابط القديم لم يعد يعمل' : 'أُنشئ رابط ولي الأمر');
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { notify('انسخ الرابط من الحقل يدويًا'); } };
  const share = `https://wa.me/?text=${encodeURIComponent(`السلام عليكم، هذه صفحة ${first} الأسبوعية من المدرسة. تُفتح بهذا الرابط وحده، ولا تشاركوه مع غيركم:\n${url}`)}`;
  return <section className="panel profile-section spaced-panel parent-card">
    <div className="section-heading"><h2>بوابة ولي الأمر</h2><Link2 size={20} /></div>
    <p className="muted">رابط خاص يفتح صفحة أسبوعية عن {first} وحده: ما تعلّمه، وكيف تسير أهدافه بكلمات للأسرة، ومهمة البيت وملاحظتك من «رسالة للأسرة». يمكن للأسرة أن تجيب «جرّبناه في البيت». بلا حساب ولا كلمة مرور.</p>
    {!accountsAvailable ? <p className="info-note">تعمل البوابة مع خادم المنصة، وهو غير مفعّل في هذه النسخة.</p>
      : !account ? <p className="info-note">سجّل الدخول إلى حسابك من الإعدادات ليعمل الرابط من أي جهاز.</p>
      : portal.state === 'error' ? <p className="info-note">تعذّر تحميل روابط الأسر. حاول مرة أخرى بعد قليل.</p>
      : link ? <>
        <div className="parent-link-row"><input readOnly aria-label="رابط ولي الأمر" value={url} onFocus={e => e.currentTarget.select()} /><button type="button" className="button secondary" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'نُسخ' : 'نسخ'}</button></div>
        <div className="heading-actions"><a className="button primary" href={share} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />أرسله عبر واتساب</a><button type="button" className="button secondary" disabled={busy} onClick={async () => { if (await confirmDialog('رابط جديد؟ الرابط الحالي يتوقف فورًا، وتحتاج الأسرة إلى الرابط الجديد.', { ok: 'رابط جديد', danger: false })) void issue(); }}><RefreshCw size={16} />رابط جديد</button><button type="button" className="button secondary" disabled={busy} onClick={async () => { if (await confirmDialog('إيقاف رابط الأسرة؟ لن تُفتح الصفحة بعد الآن حتى تنشئ رابطًا جديدًا.', { ok: 'إيقاف الرابط' })) void run(() => revokeParentLink(learner.id), 'أُوقف رابط الأسرة'); }}><Link2Off size={16} />إيقاف</button></div>
        <small className="muted">أُنشئ {dateLabel(link.createdAt)}. أرسله لولي أمر {first} فقط؛ من يحمل الرابط يرى الصفحة.</small>
      </> : <div className="heading-actions"><button type="button" className="button primary" disabled={busy || portal.state === 'loading'} onClick={issue}><Link2 size={16} />أنشئ رابط ولي الأمر</button></div>}
    {replies.length > 0 && <>
      <h3 className="parent-replies-title">ما قالته الأسرة</h3>
      <ul className="abc-list parent-replies">{replies.map(r => <li key={r.id}><strong>{dateLabel(r.at)}</strong><span className={`goal-state reply-${r.choice}`}>{parentChoiceLabels[r.choice]}</span>{r.text && <span>«{r.text}»</span>}<div className="goal-card-actions heading-actions">{goal && <button type="button" className="button secondary" onClick={() => { record(homeObservation(learner.id, goal.id, r.choice, learner.family?.home || r.text)); void run(() => dismissParentReply(r.id), 'سُجّلت ملاحظة من البيت على الهدف'); }}><Check size={16} />سجّلها ملاحظة من البيت</button>}</div><button type="button" className="icon-button" aria-label="إزالة هذا الرد" onClick={() => void run(() => dismissParentReply(r.id), '')}><Trash2 size={15} /></button></li>)}</ul>
    </>}
  </section>;
}
