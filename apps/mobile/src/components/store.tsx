import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { assertWorkspace, seedWorkspace, Workspace, Lesson, Learner, Observation, PracticeRecord } from '../../../../packages/domain';
import { latinizeContent } from '../../../../packages/domain/numbers';
import type { Desk } from '../../../../packages/domain/desk';
const KEY = 'tarbya.native.v1';
type Store = { data: Workspace; ready: boolean; error: string; saveLesson: (l: Lesson) => Promise<void>; saveLearner: (l: Learner) => Promise<void>; record: (o: Observation) => Promise<void>; savePractice: (p: PracticeRecord) => Promise<void>;
  /** Merges a change into the teacher's desk (timetable, tasks, register and the rest). Every desk field is optional, so an older saved workspace needs no migration. */
  saveDesk: (patch: Partial<Desk>) => Promise<void>;
  /** Replaces everything on this device with an imported workspace. The caller validates it first. */
  replaceAll: (w: Workspace) => Promise<void> };
const Context = createContext<Store>(null!);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace>(seedWorkspace); const [ready, setReady] = useState(false); const [error, setError] = useState('');
  useEffect(() => { AsyncStorage.getItem(KEY).then(raw => { if (raw) { const parsed: unknown = JSON.parse(raw); if (!assertWorkspace(parsed)) throw new Error(); setData(latinizeContent(parsed)); } }).catch(() => setError('تعذّر قراءة البيانات المحفوظة على الجهاز.')).finally(() => setReady(true)); }, []);
  async function commit(input: Workspace) { const next = latinizeContent(input); try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); setData(next); setError(''); } catch { setError('تعذّر حفظ التغييرات على الجهاز. حاول مرة أخرى.'); throw new Error('تعذّر الحفظ'); } }
  const saveLesson = (l: Lesson) => commit({ ...data, lessons: data.lessons.some(x => x.id === l.id) ? data.lessons.map(x => x.id === l.id ? l : x) : [l, ...data.lessons] });
  const saveLearner = (l: Learner) => commit({ ...data, learners: data.learners.map(x => x.id === l.id ? l : x) });
  const record = (o: Observation) => commit({ ...data, observations: [...data.observations, o] });
  const savePractice = (p: PracticeRecord) => commit({ ...data, practiceSessions: [...(data.practiceSessions ?? []), p] });
  const saveDesk = (patch: Partial<Desk>) => commit({ ...data, desk: { ...data.desk, ...patch } });
  return <Context.Provider value={{ data, ready, error, saveLesson, saveLearner, record, savePractice, saveDesk, replaceAll: commit }}>{ready ? children : <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#fcf9f2' }}><ActivityIndicator color="#5c1523" /></View>}</Context.Provider>;
}
export const useStore = () => useContext(Context);
