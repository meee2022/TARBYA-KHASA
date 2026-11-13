import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { defaultCatalog } from '../../../../packages/domain/catalog';
import { udlCheck, udlPrinciples, type UdlPrinciple } from '../../../../packages/domain/udl';
import { Screen, Txt, Card, Tap, Rise, Chips, Empty, Tag, colors, styles } from '../components/ui';
import { useStore } from '../components/store';

/** The universal-design checklist for one lesson. A line the platform can see in the lesson is met and locked; the rest are ticked by the teacher and kept with the lesson. */
export default function Udl() {
  const { data, saveLesson } = useStore();
  const [lessonId, setLessonId] = useState(data.lessons[0]?.id ?? '');
  const lesson = data.lessons.find(l => l.id === lessonId) ?? data.lessons[0];
  if (!lesson) return (
    <Screen>
      <Empty icon="checkmark-done-circle-outline" title="لا دروس بعد" text="حضّر درسًا ثم افحصه هنا." action="تحضير درس جديد" onAction={() => router.push('/edit/new')} />
    </Screen>
  );
  const result = udlCheck(lesson, data.learners, defaultCatalog.udl);
  const toggle = (id: string) => {
    const ticked = lesson.udl ?? [];
    saveLesson({ ...lesson, udl: ticked.includes(id) ? ticked.filter(x => x !== id) : [...ticked, id] }).catch(() => {});
  };

  return (
    <Screen subtitle="هل يصل الدرس إلى كل طالب؟ ما تراه المنصة في الدرس يُحسب تلقائيًا، والباقي تؤشّره أنت.">
      <Chips label="الدرس" value={lesson.id} onChange={setLessonId} options={data.lessons.map(l => ({ value: l.id, label: l.title || 'مسودة بلا عنوان' }))} />
      <Card style={{ backgroundColor: colors.wine }}>
        <View style={styles.spread}>
          <View style={{ flex: 1 }}>
            <Txt bold style={{ color: colors.bg, fontSize: 18 }}>{lesson.title || 'مسودة بلا عنوان'}</Txt>
            <Txt style={{ color: colors.goldLight, fontSize: 13 }}>البنود المتحققة</Txt>
          </View>
          <Txt bold accessibilityRole="header" style={{ color: colors.goldLight, fontSize: 24, lineHeight: 34 }}>{result.met} من {result.total}</Txt>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.wineDeep, marginTop: 12, flexDirection: 'row-reverse' }}>
          <View style={{ width: `${result.total ? Math.round(result.met / result.total * 100) : 0}%`, height: 8, borderRadius: 4, backgroundColor: colors.gold }} />
        </View>
      </Card>
      {(Object.keys(udlPrinciples) as UdlPrinciple[]).map((principle, i) => (
        <Rise key={principle} index={i}>
          <Card>
            <View style={[styles.spread, { marginBottom: 6 }]}>
              <Txt bold style={{ fontSize: 17, color: colors.wine, flex: 1 }}>{udlPrinciples[principle]}</Txt>
              <Tag label={`${result.byPrinciple[principle].met} من ${result.byPrinciple[principle].total}`} tone={result.byPrinciple[principle].met === result.byPrinciple[principle].total ? 'olive' : 'gold'} />
            </View>
            {result.items.filter(item => item.principle === principle).map(item => {
              const row = (
                <View style={[styles.row, { alignItems: 'flex-start', minHeight: 48, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line }]}>
                  <Ionicons name={item.seen ? 'lock-closed' : item.met ? 'checkbox' : 'square-outline'} size={item.seen ? 20 : 24} color={item.met ? colors.green : colors.goldDeep} style={{ marginTop: 2, width: 26, textAlign: 'center' }} />
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontSize: 14 }}>{item.text}</Txt>
                    {item.seen
                      ? <Txt style={[styles.small, { color: colors.green }]}>تراه المنصة في الدرس</Txt>
                      : !item.met && <Txt style={styles.small}>{item.tip}</Txt>}
                  </View>
                </View>
              );
              return item.seen
                ? <View key={item.id} accessible accessibilityLabel={`متحقق تلقائيًا: ${item.text}`}>{row}</View>
                : <Tap key={item.id} accessibilityRole="checkbox" accessibilityState={{ checked: item.met }} accessibilityLabel={item.text} onPress={() => toggle(item.id)}>{row}</Tap>;
            })}
          </Card>
        </Rise>
      ))}
    </Screen>
  );
}
