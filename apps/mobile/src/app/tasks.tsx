import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uid } from '../../../../packages/domain';
import { priorityLabels, type Task, type TaskPriority } from '../../../../packages/domain/desk';
import { today } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Tap, Rise, Chips, Field, FormCard, DateField, Empty, Button, Tag, Tone, colors, styles, dayLabel } from '../components/ui';
import { useStore } from '../components/store';

const priorityTone: Record<TaskPriority, Tone> = { high: 'wine', mid: 'gold', low: 'neutral' };
const priorities = (Object.keys(priorityLabels) as TaskPriority[]).map(value => ({ value, label: priorityLabels[value] }));
const scopes: { value: Task['scope']; label: string }[] = [{ value: 'daily', label: 'يومية' }, { value: 'weekly', label: 'أسبوعية' }];
const blank = (): Task => ({ id: uid(), title: '', scope: 'daily', priority: 'mid', due: today(), done: false });

/** The teacher's own to-do list: add, tick, delete. A task past its date is said plainly. */
export default function Tasks() {
  const { data, saveDesk } = useStore();
  const tasks = data.desk?.tasks ?? [];
  const now = today();
  const [draft, setDraft] = useState<Task | null>(null);
  const [removing, setRemoving] = useState('');
  const store = (next: Task[]) => saveDesk({ tasks: next }).catch(() => {});
  const add = async () => { if (!draft) return; await store([...tasks, { ...draft, title: draft.title.trim() }]); setDraft(null); };
  const open = tasks.filter(t => !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const done = tasks.filter(t => t.done);

  const row = (t: Task, i: number) => {
    const late = !t.done && !!t.due && t.due < now;
    return (
      <Rise key={t.id} index={i}>
        <Card style={[{ paddingVertical: 14, marginBottom: 10 }, late ? { borderRightWidth: 4, borderRightColor: colors.wine } : {}]}>
          <View style={styles.row}>
            <Tap accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={`${t.done ? 'إعادة فتح المهمة' : 'إنجاز المهمة'}: ${t.title}`} onPress={() => store(tasks.map(x => x.id === t.id ? { ...x, done: !x.done } : x))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={t.done ? 'checkmark-circle' : 'ellipse-outline'} size={30} color={t.done ? colors.green : colors.goldDeep} />
            </Tap>
            <View style={{ flex: 1 }}>
              <Txt bold style={{ fontSize: 16, color: t.done ? colors.muted : colors.ink, textDecorationLine: t.done ? 'line-through' : 'none' }}>{t.title}</Txt>
              <Txt style={[styles.small, late ? { color: colors.wine } : {}]}>{late ? `تجاوزت موعدها: ${dayLabel(t.due)}` : t.due ? dayLabel(t.due) : 'بلا موعد'} · {t.scope === 'daily' ? 'يومية' : 'أسبوعية'}</Txt>
            </View>
            {removing === t.id
              ? <Button small title="تأكيد الحذف" onPress={() => { setRemoving(''); store(tasks.filter(x => x.id !== t.id)); }} />
              : <Tap accessibilityLabel={`حذف: ${t.title}`} onPress={() => setRemoving(t.id)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="trash-outline" size={20} color={colors.muted} /></Tap>}
          </View>
          {!t.done && <View style={[styles.row, { marginTop: 6, paddingRight: 56 }]}><Tag label={`أولوية ${priorityLabels[t.priority]}`} tone={priorityTone[t.priority]} />{late && <Tag label="متأخرة" tone="wine" icon="alert-circle-outline" />}</View>}
        </Card>
      </Rise>
    );
  };

  return (
    <Screen subtitle="ما عليك اليوم وهذا الأسبوع.">
      {draft
        ? <FormCard title="مهمة جديدة" saveLabel="أضف المهمة" canSave={!!draft.title.trim()} onSave={add} onCancel={() => setDraft(null)}>
            <Field label="المهمة" value={draft.title} onChangeText={title => setDraft({ ...draft, title })} placeholder="مثال: تجهيز بطاقات الحروف" />
            <Chips label="الأولوية" value={draft.priority} onChange={priority => setDraft({ ...draft, priority })} options={priorities} />
            <Chips label="النوع" value={draft.scope} onChange={scope => setDraft({ ...draft, scope })} options={scopes} />
            <DateField optional label="الموعد" value={draft.due} onChange={due => setDraft({ ...draft, due })} />
          </FormCard>
        : tasks.length > 0 && <View style={{ marginBottom: 16 }}><Button title="مهمة جديدة" icon="add" onPress={() => setDraft(blank())} /></View>}
      {!tasks.length && !draft && <Empty icon="checkbox-outline" title="لا مهام بعد" text="اكتب أول مهمة، وحدّد موعدها وأولويتها." action="أضف مهمة" onAction={() => setDraft(blank())} />}
      {open.map(row)}
      {done.length > 0 && <Txt bold style={[styles.sectionTitle, { fontSize: 15, color: colors.muted }]}>منجزة ({done.length})</Txt>}
      {done.map(row)}
    </Screen>
  );
}
