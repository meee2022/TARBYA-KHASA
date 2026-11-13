import React from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notices, schoolDay } from '../../../../../packages/domain/desk';
import { today } from '../../../../../packages/domain/planning';
import { Screen, Txt, Card, Button, Badge, Tap, Rise, Orb, colors, styles, dayLabel } from '../../components/ui';
import { useStore } from '../../components/store';

/** The maroon band at the top of the home screen: the mark, the name, and what today holds. */
function Band() {
  const { data } = useStore();
  const insets = useSafeAreaInsets();
  const now = today();
  const desk = data.desk ?? {};
  const tiles: [value: number, label: string, to: '/notices' | '/timetable' | '/tasks'][] = [
    [notices(data, now).length, 'تنبيهات اليوم', '/notices'],
    [(desk.timetable?.slots ?? []).filter(s => s.day === schoolDay(now)).length, 'حصص اليوم', '/timetable'],
    [(desk.tasks ?? []).filter(t => !t.done).length, 'مهام مفتوحة', '/tasks'],
  ];
  return (
    <View style={{ backgroundColor: colors.wine, paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: colors.wineDark, top: -110, left: -80 }} />
      <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1.5, borderColor: colors.goldDeep, opacity: .5, bottom: -60, left: 40 }} />
      <Rise>
        <View style={styles.row}>
          <Image source={require('../../../assets/android-icon-foreground.png')} style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.wineDeep }} accessible accessibilityLabel="شعار وتد" />
          <View style={{ flex: 1 }}>
            <Txt bold style={{ color: colors.goldLight, fontSize: 13 }}>منصة وتد للتربية الخاصة</Txt>
            <Txt accessibilityRole="header" bold style={{ color: colors.bg, fontSize: 27, lineHeight: 40 }}>أهلًا بك في يومٍ جديد</Txt>
          </View>
        </View>
        <View style={{ width: 54, height: 3, borderRadius: 2, backgroundColor: colors.gold, alignSelf: 'flex-end', marginTop: 14, marginBottom: 10 }} />
        <Txt style={{ color: colors.goldLight, fontSize: 15 }}>لكلّ طالب، طريقٌ للتعلّم</Txt>
        <Txt style={{ color: colors.bg, fontSize: 12, opacity: .8 }}>{dayLabel(now)}</Txt>
      </Rise>
      <View style={[styles.row, { marginTop: 18, gap: 10 }]}>
        {tiles.map(([value, label, to], i) => (
          <Rise key={label} index={i + 1} style={{ flex: 1 }}>
            <Tap accessibilityLabel={`${label}: ${value}`} onPress={() => router.push(to)} style={{ minHeight: 78, borderRadius: 18, backgroundColor: colors.wineDeep, borderWidth: 1, borderColor: colors.wineDark, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <Txt bold style={{ fontSize: 24, lineHeight: 32, color: colors.goldLight }}>{value}</Txt>
              <Txt style={{ fontSize: 11, color: colors.bg, textAlign: 'center' }}>{label}</Txt>
            </Tap>
          </Rise>
        ))}
      </View>
    </View>
  );
}

export default function Home() {
  const { data } = useStore();
  const waiting = data.lessons.filter(l => l.status === 'review').length;
  return (
    <Screen header={<Band />}>
      <Rise index={2}>
        <Tap accessibilityLabel="مكتبي: الجدول والمهام والحضور وسجلات الطلاب" onPress={() => router.push('/desk')}>
          <Card style={{ borderRightWidth: 4, borderRightColor: colors.gold }}>
            <View style={styles.row}>
              <Orb icon="briefcase-outline" />
              <View style={{ flex: 1 }}>
                <Txt bold style={{ fontSize: 18 }}>مكتبي</Txt>
                <Txt style={styles.small}>الجدول، المهام، الحضور، التقييم، السلوك، الإحالات وملف الإنجاز.</Txt>
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.goldDeep} />
            </View>
          </Card>
        </Tap>
      </Rise>

      <Rise index={3}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <Image source={require('../../../assets/animals.png')} style={{ width: '100%', height: 180 }} resizeMode="cover" accessible accessibilityLabel="زرافة وفيل وطائر في الطبيعة" />
          <View style={{ padding: 20 }}>
            <Txt bold style={{ fontSize: 12, color: colors.green }}>جاهز لحصة مميزة</Txt>
            <Txt bold style={{ fontSize: 24, lineHeight: 36, marginTop: 4 }}>عالم صغير، اكتشافات كبيرة.</Txt>
            <Txt style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>اللغة الإنجليزية · الصف الثالث · 35 دقيقة</Txt>
            <Button title="استكشف تحضير الدرس" icon="arrow-back" onPress={() => router.push('/lesson/animals')} />
            <Button secondary title="الألعاب والوصول" icon="game-controller-outline" onPress={() => router.push('/games')} />
          </View>
        </Card>
      </Rise>

      <View style={styles.spread}>
        <Txt bold style={styles.sectionTitle}>من التحضير إلى التعلّم</Txt>
        <Tap accessibilityLabel="كل الدروس" onPress={() => router.push('/lessons')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={21} color={colors.wine} />
        </Tap>
      </View>
      {data.lessons.slice(0, 2).map((l, i) => (
        <Rise key={l.id} index={i + 4}>
          <Tap onPress={() => router.push(`/lesson/${l.id}`)} accessibilityLabel={l.title}>
            <Card>
              <Badge status={l.status} />
              <Txt bold style={{ fontSize: 19, marginTop: 8 }}>{l.title}</Txt>
              <Txt style={styles.small}>{l.subject} · {l.duration} دقيقة</Txt>
            </Card>
          </Tap>
        </Rise>
      ))}
      <Button title="تحضير درس جديد" icon="add" onPress={() => router.push('/edit/new')} />
      <Button secondary title="إنشاء عروض PowerPoint" icon="easel-outline" onPress={() => router.push('/presentations')} />
      <Button secondary title={`مراجعة التحضير (${waiting})`} icon="checkmark-done-outline" onPress={() => router.push('/review')} />

      <View style={[styles.row, { marginTop: 22, alignItems: 'flex-start' }]}>
        <Ionicons name="globe-outline" size={18} color={colors.goldDeep} style={{ marginTop: 3 }} />
        <Txt style={[styles.small, { flex: 1 }]}>النماذج الرسمية، والتحضير الأسبوعي، وطباعة أوراق العمل، ولوحة الإدارة، ومزامنة الحساب تُنجَز على موقع وتد.</Txt>
      </View>
    </Screen>
  );
}
