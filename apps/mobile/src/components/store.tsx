import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { assertWorkspace, seedWorkspace, Workspace, Lesson, Learner, Observation, PracticeRecord } from '../../../../packages/domain';
import { latinizeContent } from '../../../../packages/domain/numbers';
const KEY = 'tarbya.native.v1';
type Store = { data: Workspace; ready: boolean; error: string; saveLesson: (l: Lesson) => Promise<void>; saveLearner: (l: Learner) => Promise<void>; record: (o: Observation) => Promise<void>; savePractice: (p: PracticeRecord) => Promise<void> };
const Context = createContext<Store>(null!);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Workspace>(seedWorkspace); const [ready, setReady] = useState(false); const [error, setError] = useState('');
  useEffect(() => { AsyncStorage.getItem(KEY).then(raw => { if (raw) { const parsed: unknown = JSON.parse(raw); if (!assertWorkspace(parsed)) throw new Error(); setData(latinizeContent(parsed)); } }).catch(() => setError('تعذّر قراءة البيانات المحفوظة على الجهاز.')).finally(() => setReady(true)); }, []);
  async function commit(input: Workspace) { const next = latinizeContent(input); try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); setData(next); setError(''); } catch { setError('تعذّر حفظ التغييرات على الجهاز. حاول مرة أخرى.'); throw new Error('تعذّر الحفظ'); } }
  const saveLesson = (l: Lesson) => commit({ ...data, lessons: data.lessons.some(x => x.id === l.id) ? data.lessons.map(x => x.id === l.id ? l : x) : [l, ...data.lessons] });
  const saveLearner = (l: Learner) => commit({ ...data, learners: data.learners.map(x => x.id === l.id ? l : x) });
  const record = (o: Observation) => commit({ ...data, observations: [...data.observations, o] });
  const savePractice = (p: PracticeRecord) => commit({ ...data, practiceSessions: [...(data.practiceSessions ?? []), p] });
  return <Context.Provider value={{ data, ready, error, saveLesson, saveLearner, record, savePractice }}>{ready ? children : <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#f7f8f3' }}><ActivityIndicator color="#801b3b" /></View>}</Context.Provider>;
}
export const useStore = () => useContext(Context);
