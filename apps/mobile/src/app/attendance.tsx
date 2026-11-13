import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { attendanceSummary, markLabels, marks, schoolDay, type AttendanceDay, type AttendanceMark } from '../../../../packages/domain/desk';
import { today } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Tap, Rise, Empty, Button, Tag, colors, styles, dayLabel } from '../components/ui';
import { useStore } from '../components/store';

/** Today's register: one tap per pupil. The month's count sits under each name, each pupil on their own. */
export default function Attendance() {
  const { data, saveDesk } = useStore();
  const days = data.desk?.attendance ?? [];
  const now = today();
  const register = days.find(d => d.date === now);
  const put = (next: AttendanceDay) => saveDesk({ attendance: register ? days.map(d => d.date === now ? next : d) : [...days, next] }).catch(() => {});
  const mark = (learnerId: string, value: AttendanceMark) => put({ date: now, marks: { ...register?.marks, [learnerId]: { ...register?.marks[learnerId], mark: value } } });
  const allPresent = () => put({ date: now, marks: Object.fromEntries(data.learners.map(l => [l.id, { ...register?.marks[l.id], mark: 'present' as const }])) });
  const recorded = data.learners.filter(l => register?.marks[l.id]).length;

  if (!data.learners.length) return (
    <Screen>
      <Empty icon="people-circle-outline" title="لا طلاب بعد" text="يظهر سجل الحضور عند وجود ملفات طلاب." action="افتح الطلاب" onAction={() => router.push('/learners')} />
    </Screen>
  );
  return (
    <Screen subtitle={`${dayLabel(now)}${schoolDay(now) < 0 ? ' · عطلة نهاية الأسبوع' : ''}`}>
      <Card style={{ backgroundColor: colors.sand }}>
        <View style={styles.spread}>
          <Txt bold style={{ flex: 1 }}>{recorded ? `سُجّل ${recorded} من ${data.learners.length}` : 'لم يُسجَّل حضور اليوم بعد'}</Txt>
          {recorded === data.learners.length && <Tag label="اكتمل السجل" tone="olive" icon="checkmark-circle-outline" />}
        </View>
        <Button title="الكل حاضرون" icon="checkmark-done-outline" onPress={allPresent} />
      </Card>
      {data.learners.map((l, i) => {
        const current = register?.marks[l.id]?.mark;
        const month = attendanceSummary(days, l.id, now.slice(0, 7));
        return (
          <Rise key={l.id} index={i}>
            <Card style={{ paddingVertical: 16, marginBottom: 12 }}>
              <Txt bold style={{ fontSize: 17, marginBottom: 10 }}>{l.name}</Txt>
              <View style={[styles.row, { gap: 6 }]} accessibilityRole="radiogroup" accessibilityLabel={`حضور ${l.name}`}>
                {marks.map(m => {
                  const on = current === m;
                  const fill = m === 'present' ? colors.green : m === 'absent' ? colors.wine : colors.goldDeep;
                  return (
                    <Tap key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${l.name}: ${markLabels[m]}`} onPress={() => mark(l.id, m)}
                      style={{ flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1.5, borderColor: on ? fill : colors.line, backgroundColor: on ? fill : colors.card, alignItems: 'center', justifyContent: 'center' }}>
                      <Txt bold={on} style={{ fontSize: 13, color: on ? colors.card : colors.ink }}>{markLabels[m]}</Txt>
                    </Tap>
                  );
                })}
              </View>
              <Txt style={[styles.small, { marginTop: 10 }]}>
                {month.recorded
                  ? `هذا الشهر: ${marks.map(m => `${markLabels[m]} ${month[m]}`).join(' · ')} · نسبة الحضور ${month.rate}%`
                  : 'لا أيام مسجلة هذا الشهر بعد.'}
              </Txt>
            </Card>
          </Rise>
        );
      })}
    </Screen>
  );
}
