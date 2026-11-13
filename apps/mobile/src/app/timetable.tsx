import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subjects, uid } from '../../../../packages/domain';
import { defaultTimetable, schoolDay, weekDays, type TimetableSlot } from '../../../../packages/domain/desk';
import { today } from '../../../../packages/domain/planning';
import { Screen, Txt, Tap, Rise, Chips, Field, FormCard, Empty, Button, colors, styles } from '../components/ui';
import { useStore } from '../components/store';

/** The school week, Sunday to Thursday: one day at a time, a row per period. */
export default function Timetable() {
  const { data, saveDesk } = useStore();
  const table = data.desk?.timetable ?? defaultTimetable();
  const todayIndex = schoolDay(today());
  const [dayIndex, setDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ subject: '', place: '' });
  const slots = table.slots.filter(s => s.day === dayIndex);
  const at = (period: number) => slots.find(s => s.period === period);

  const open = (period: number) => {
    const slot = at(period);
    setDraft({ subject: slot?.subject ?? '', place: slot?.place ?? '' });
    setEditing(period);
  };
  const store = async (next: TimetableSlot[]) => {
    await saveDesk({ timetable: { ...table, slots: next } }).catch(() => {});
    setEditing(null);
  };
  const save = (period: number) => {
    const old = at(period);
    const slot: TimetableSlot = { ...(old ?? { id: uid(), day: dayIndex, period, learnerIds: [] }), subject: draft.subject.trim(), place: draft.place.trim() };
    return store(old ? table.slots.map(s => s.id === old.id ? slot : s) : [...table.slots, slot]);
  };

  return (
    <Screen subtitle="اختر اليوم، ثم اضغط الحصة لتكتب المادة والمكان.">
      <Chips label="اليوم" value={dayIndex} onChange={d => { setDayIndex(d); setEditing(null); }} options={weekDays.map((label, value) => ({ value, label: value === todayIndex ? `${label} · اليوم` : label }))} />
      {!slots.length && editing === null && <Empty icon="calendar-outline" title={`لا حصص يوم ${weekDays[dayIndex]}`} text="أضف الحصة الأولى، وأكمل الباقي من القائمة." action="أضف الحصة الأولى" onAction={() => open(0)} />}
      {Array.from({ length: table.periods }, (_, period) => {
        const slot = at(period);
        if (editing === period) return (
          <FormCard key={period} title={`الحصة ${period + 1} · ${weekDays[dayIndex]}`} onSave={() => save(period)} onCancel={() => setEditing(null)} canSave={!!draft.subject.trim()}>
            <Field label="المادة" value={draft.subject} onChangeText={subject => setDraft({ ...draft, subject })} placeholder="مثال: اللغة العربية" />
            <Chips value={draft.subject} onChange={subject => setDraft({ ...draft, subject })} options={subjects.map(s => ({ value: s as string, label: s }))} />
            <Field label="المكان" value={draft.place} onChangeText={place => setDraft({ ...draft, place })} placeholder="مثال: غرفة المصادر" />
            {slot && <Button secondary small title="إفراغ الحصة" icon="trash-outline" onPress={() => store(table.slots.filter(s => s.id !== slot.id))} />}
          </FormCard>
        );
        return (
          <Rise key={period} index={period}>
            <Tap accessibilityLabel={`الحصة ${period + 1}: ${slot ? `${slot.subject}${slot.place ? `، ${slot.place}` : ''}` : 'فارغة، اضغط للإضافة'}`} onPress={() => open(period)}>
              <View style={slot ? [styles.card, { paddingVertical: 14, marginBottom: 10 }] : { borderRadius: 20, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 10, borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed' }}>
                <View style={styles.row}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: slot ? colors.wine : colors.sand, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt bold style={{ fontSize: 18, color: slot ? colors.goldLight : colors.muted }}>{period + 1}</Txt>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt bold style={{ fontSize: 16, color: slot ? colors.ink : colors.muted }}>{slot?.subject ?? 'حصة فارغة'}</Txt>
                    <Txt style={styles.small}>{[table.times[period], slot?.place].filter(Boolean).join(' · ')}</Txt>
                  </View>
                  <Ionicons name={slot ? 'create-outline' : 'add'} size={20} color={colors.goldDeep} />
                </View>
              </View>
            </Tap>
          </Rise>
        );
      })}
    </Screen>
  );
}
