import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { accountsAvailable, login, logout, me, pull, push, SyncError, type Teacher } from './teacherApi';
import { assertWorkspace, migrateWorkspace, seedWorkspace, Workspace, Lesson, Learner, Observation, PracticeRecord } from '../../packages/domain';
import type { ContentPack } from '../../packages/domain/packs';
import { useSiteConfig } from './site';
import { latinizeContent } from '../../packages/domain/numbers';
import { withPlanning, type Iep, type WeeklyPlan } from '../../packages/domain/planning';
import type { SpecialForm } from '../../packages/domain/forms';
const KEY = 'tarbya.workspace.v1';
// Which server revision this device last matched, and a fingerprint of the data at that moment. Lets a reload tell its own unsent edits from edits made elsewhere.
const MARK = 'tarbya.sync.mark';
const fingerprint = (json: string) => { let h = 5381; for (let i = 0; i < json.length; i++) h = (h * 33 + json.charCodeAt(i)) >>> 0; return `${json.length}:${h}`; };
const readMark = (): { rev: number; sig: string } | null => { try { return JSON.parse(localStorage.getItem(MARK) ?? 'null'); } catch { return null; } };
const writeMark = (rev: number, json: string) => { try { localStorage.setItem(MARK, JSON.stringify({ rev, sig: fingerprint(json) })); } catch { /* the next reload asks which copy to keep */ } };
export type SyncState = 'off' | 'saving' | 'saved' | 'conflict' | 'error';
const ready = (w: Workspace): Workspace => ({ ...w, plans: w.plans ?? [], ieps: w.ieps ?? [] });
type Store = { account: Teacher | null; sync: SyncState; syncMessage: string; signIn: (username: string, password: string) => Promise<void>; signOut: () => Promise<void>; reloadFromAccount: () => Promise<void>; data: Workspace; error: string; replaceData: (data: Workspace) => boolean; saveLesson: (lesson: Lesson) => void; saveLearner: (learner: Learner) => void; record: (value: Observation) => void; savePractice: (value: PracticeRecord) => boolean; savePack: (pack: ContentPack) => void; savePlan: (plan: WeeklyPlan) => void; removePlan: (id: string) => void; saveIep: (iep: Iep) => void; saveForm: (form: SpecialForm) => void; removeForm: (id: string) => void; removePack: (id: string) => void; notify: (text: string) => void; notice: string; };
const Context = createContext<Store>(null!);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState('');
  const [data, setData] = useState<Workspace>(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const parsed: unknown = JSON.parse(raw); if (!assertWorkspace(parsed)) throw new Error(); return ready(migrateWorkspace(latinizeContent(parsed))); } } catch { /* preserve failed storage until the user edits */ }
    return withPlanning(seedWorkspace());
  });
  const [notice, setNotice] = useState('');
  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw && !assertWorkspace(JSON.parse(raw))) setError('تعذّر قراءة البيانات المحفوظة. تظهر بيانات تجريبية؛ صدّر نسخة قبل إجراء تغييرات.'); } catch { setError('تعذّر الوصول إلى التخزين المحلي.'); } }, []);
  const commit = useCallback((update: (current: Workspace) => Workspace) => {
    setData(current => { const next = latinizeContent(update(current)); try { localStorage.setItem(KEY, JSON.stringify(next)); setError(''); } catch { setError('تعذّر الحفظ على هذا الجهاز. احتفظ بهذه الصفحة مفتوحة وصدّر نسخة من بياناتك.'); } return next; });
  }, []);
  useEffect(() => { const listener = (e: StorageEvent) => { if (e.key === KEY && e.newValue) { try { const value: unknown = JSON.parse(e.newValue); if (assertWorkspace(value)) setData(ready(latinizeContent(value))); } catch {} } }; window.addEventListener('storage', listener); return () => window.removeEventListener('storage', listener); }, []);
  useEffect(() => { if (notice) { const timer = window.setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); } }, [notice]);
  const saveLesson = (lesson: Lesson) => commit(s => ({ ...s, lessons: s.lessons.some(l => l.id === lesson.id) ? s.lessons.map(l => l.id === lesson.id ? lesson : l) : [lesson, ...s.lessons] }));
  const saveLearner = (learner: Learner) => commit(s => ({ ...s, learners: s.learners.some(l => l.id === learner.id) ? s.learners.map(l => l.id === learner.id ? learner : l) : [...s.learners, learner] }));
  const record = (value: Observation) => commit(s => ({ ...s, observations: [...s.observations, value] }));
  const savePack = (pack: ContentPack) => commit(s => ({ ...s, packs: (s.packs ?? []).some(p => p.id === pack.id) ? s.packs!.map(p => p.id === pack.id ? pack : p) : [pack, ...(s.packs ?? [])] }));
  const removePack = (id: string) => commit(s => ({ ...s, packs: (s.packs ?? []).filter(p => p.id !== id), lessons: s.lessons.map(l => l.packId === id ? { ...l, packId: undefined } : l) }));
  const savePlan = (plan: WeeklyPlan) => commit(s => ({ ...s, plans: (s.plans ?? []).some(p => p.id === plan.id) ? s.plans!.map(p => p.id === plan.id ? plan : p) : [plan, ...(s.plans ?? [])] }));
  const removePlan = (id: string) => commit(s => ({ ...s, plans: (s.plans ?? []).filter(p => p.id !== id) }));
  const saveIep = (iep: Iep) => commit(s => ({ ...s, ieps: (s.ieps ?? []).some(p => p.learnerId === iep.learnerId) ? s.ieps!.map(p => p.learnerId === iep.learnerId ? iep : p) : [...(s.ieps ?? []), iep] }));
  const saveForm = (form: SpecialForm) => commit(s => ({ ...s, forms: (s.forms ?? []).some(f => f.id === form.id) ? s.forms!.map(f => f.id === form.id ? form : f) : [form, ...(s.forms ?? [])] }));
  const removeForm = (id: string) => commit(s => ({ ...s, forms: (s.forms ?? []).filter(f => f.id !== id) }));
  const savePractice = (value: PracticeRecord) => {
    const next = { ...data, practiceSessions: [...(data.practiceSessions ?? []).filter(p => p.id !== value.id), value] };
    try { localStorage.setItem(KEY, JSON.stringify(next)); setData(next); setError(''); return true; }
    catch { setError('تعذّر حفظ التدريب على هذا الجهاز. حاول مرة أخرى قبل مغادرة الصفحة.'); return false; }
  };
  const replaceData = (next: Workspace) => {
    try { const clean=ready(latinizeContent(next)); localStorage.setItem(KEY,JSON.stringify(clean));setData(clean);setError('');return true; }
    catch { setError('تعذّر الحفظ على هذا الجهاز. لم تُستبدل البيانات.');return false; }
  };
  // Teacher account: the server copy is the reference, this browser keeps a working copy and sends changes 1.5 s after the last edit.
  const [account, setAccount] = useState<Teacher | null>(null); const [sync, setSync] = useState<SyncState>('off'); const [syncMessage, setSyncMessage] = useState('');
  const revision = useRef(0); const sent = useRef(''); const held = useRef(false);
  const adopt = (json: string, rev: number) => { const parsed: unknown = JSON.parse(json); if (!assertWorkspace(parsed)) throw new SyncError('نسخة الحساب غير صالحة.', 400); const clean = ready(migrateWorkspace(latinizeContent(parsed))); const text = JSON.stringify(clean); try { localStorage.setItem(KEY, text); } catch { /* still shown */ } sent.current = text; revision.current = rev; writeMark(rev, text); setData(clean); };
  const reconcile = useCallback(async (local: Workspace) => {
    const server = await pull(); const localJson = JSON.stringify(local); const mark = readMark(); revision.current = server.revision;
    held.current = false; setSyncMessage('');
    if (!server.json) { sent.current = ''; setSync('saving'); return; } // An empty account takes this device's data on the next save.
    const localChanged = fingerprint(localJson) !== mark?.sig; const serverChanged = server.revision !== mark?.rev;
    if (server.json === localJson || !localChanged) { adopt(server.json, server.revision); setSync('saved'); return; }
    if (!serverChanged) { sent.current = ''; setSync('saving'); return; }
    // Both sides changed, or this device never synced: only the teacher can say which copy is right.
    if (window.confirm('في حسابك نسخة محفوظة تختلف عن بيانات هذا الجهاز.\n\nموافق: افتح نسخة الحساب (تُستبدل بيانات هذا الجهاز).\nإلغاء: احتفظ ببيانات هذا الجهاز وارفعها إلى الحساب.')) { adopt(server.json, server.revision); setSync('saved'); }
    else { sent.current = ''; setSync('saving'); }
  }, []);
  useEffect(() => {
    if (!accountsAvailable) return;
    me().then(t => { if (!t) return; setAccount(t); return reconcile(data); }).catch((e: SyncError) => { setSync('error'); setSyncMessage(e.message); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!account || held.current) return;
    const json = JSON.stringify(data); if (json === sent.current) return;
    setSync('saving');
    const timer = window.setTimeout(async () => {
      try { revision.current = await push(json, revision.current); sent.current = json; writeMark(revision.current, json); setSync('saved'); setSyncMessage(''); }
      catch (e) { const err = e as SyncError; setSyncMessage(err.message); if (err.status === 409) { held.current = true; setSync('conflict'); } else if (err.status === 401) { setAccount(null); setSync('off'); } else setSync('error'); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [data, account]);
  const signIn = async (username: string, password: string) => { const t = await login(username, password); setAccount(t); await reconcile(data); };
  const signOut = async () => {
    if (sync === 'saving' || sync === 'error' || sync === 'conflict') { if (!window.confirm('بعض التعديلات لم تصل إلى حسابك بعد. هل تخرج وتفقدها؟')) return; }
    await logout(); setAccount(null); setSync('off'); setSyncMessage(''); held.current = false; sent.current = '';
    // Shared school devices: the teacher's pupils do not stay behind in this browser.
    try { localStorage.removeItem(KEY); localStorage.removeItem(MARK); } catch { /* nothing stored */ }
    setData(withPlanning(seedWorkspace()));
  };
  const reloadFromAccount = () => reconcile(data).catch((e: SyncError) => { setSync('error'); setSyncMessage(e.message); });
  return <Context.Provider value={{ account, sync, syncMessage, signIn, signOut, reloadFromAccount, data, error, replaceData, saveLesson, saveLearner, record, savePractice, savePack, removePack, savePlan, removePlan, saveIep, saveForm, removeForm, notify: setNotice, notice }}>{children}</Context.Provider>;
}
export const useWorkspace = () => useContext(Context);
/** Teacher packs first, then the shared library the admin controls. */
export function useAllPacks() { const { data } = useWorkspace(); const { site } = useSiteConfig(); const own = data.packs ?? []; return { own, shared: site.catalog.packs, all: [...own, ...site.catalog.packs] }; }
export function exportWorkspace(data: Workspace) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `tarbya-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
