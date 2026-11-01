import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { assertWorkspace, migrateWorkspace, seedWorkspace, Workspace, Lesson, Learner, Observation, PracticeRecord } from '../../packages/domain';
import type { ContentPack } from '../../packages/domain/packs';
import { useSiteConfig } from './site';
import { latinizeContent } from '../../packages/domain/numbers';
import { withPlanning, type Iep, type WeeklyPlan } from '../../packages/domain/planning';
const KEY = 'tarbya.workspace.v1';
const ready = (w: Workspace): Workspace => ({ ...w, plans: w.plans ?? [], ieps: w.ieps ?? [] });
type Store = { data: Workspace; error: string; replaceData: (data: Workspace) => boolean; saveLesson: (lesson: Lesson) => void; saveLearner: (learner: Learner) => void; record: (value: Observation) => void; savePractice: (value: PracticeRecord) => boolean; savePack: (pack: ContentPack) => void; savePlan: (plan: WeeklyPlan) => void; removePlan: (id: string) => void; saveIep: (iep: Iep) => void; removePack: (id: string) => void; notify: (text: string) => void; notice: string; };
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
  const savePractice = (value: PracticeRecord) => {
    const next = { ...data, practiceSessions: [...(data.practiceSessions ?? []).filter(p => p.id !== value.id), value] };
    try { localStorage.setItem(KEY, JSON.stringify(next)); setData(next); setError(''); return true; }
    catch { setError('تعذّر حفظ التدريب على هذا الجهاز. حاول مرة أخرى قبل مغادرة الصفحة.'); return false; }
  };
  const replaceData = (next: Workspace) => {
    try { const clean=ready(latinizeContent(next)); localStorage.setItem(KEY,JSON.stringify(clean));setData(clean);setError('');return true; }
    catch { setError('تعذّر الحفظ على هذا الجهاز. لم تُستبدل البيانات.');return false; }
  };
  return <Context.Provider value={{ data, error, replaceData, saveLesson, saveLearner, record, savePractice, savePack, removePack, savePlan, removePlan, saveIep, notify: setNotice, notice }}>{children}</Context.Provider>;
}
export const useWorkspace = () => useContext(Context);
/** Teacher packs first, then the shared library the admin controls. */
export function useAllPacks() { const { data } = useWorkspace(); const { site } = useSiteConfig(); const own = data.packs ?? []; return { own, shared: site.catalog.packs, all: [...own, ...site.catalog.packs] }; }
export function exportWorkspace(data: Workspace) { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `tarbya-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
