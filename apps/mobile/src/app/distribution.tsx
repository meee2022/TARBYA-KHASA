import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { defaultCatalog } from '../../../../packages/domain/catalog';
import { termWeeks } from '../../../../packages/domain/distribution';
import { day, ltr, today } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Rise, Chips, Empty, Tag, colors, styles, shortDate } from '../components/ui';
import { useStore } from '../components/store';

/** The term week by week, to read on the go: dates, units and lessons, with this week marked. Built and edited on the web site. */
export default function DistributionScreen() {
  const { data } = useStore();
  const list = data.desk?.distributions ?? [];
  const now = today();
  const [id, setId] = useState(list[0]?.id ?? '');
  const current = list.find(d => d.id === id) ?? list[0];

  if (!current) return (
    <Screen subtitle="للقراءة فقط. يُبنى التوزيع على موقع وتد.">
      <Empty icon="grid-outline" title="لا توزيع فصلي على هذا الجهاز" text="استورد نسخة من الموقع ليظهر توزيعه هنا." action="استيراد نسخة من الموقع" onAction={() => router.push('/transfer')} />
    </Screen>
  );
  const weeks = termWeeks(current, defaultCatalog.units, data.plans ?? []);
  return (
    <Screen subtitle="للقراءة فقط. يُبنى التوزيع على موقع وتد.">
      {list.length > 1 && <Chips label="المادة" value={current.id} onChange={setId} options={list.map(d => ({ value: d.id, label: `${d.subject} · ${d.grade}` }))} />}
      <Card style={{ backgroundColor: colors.wine }}>
        <Txt bold style={{ color: colors.bg, fontSize: 19 }}>{current.subject}</Txt>
        <Txt style={{ color: colors.goldLight, fontSize: 13 }}>الصف {current.grade} · {current.weeks} أسبوعًا تبدأ في {shortDate(current.termStart)}</Txt>
      </Card>
      {weeks.map((w, i) => {
        const isNow = w.start <= now && now <= day(w.start, 6);
        return (
          <Rise key={w.n} index={i}>
            <Card style={[{ paddingVertical: 16, marginBottom: 12 }, isNow ? { borderWidth: 2, borderColor: colors.gold, backgroundColor: colors.sand } : {}]}>
              <View style={styles.spread}>
                <Txt bold style={{ fontSize: 16, color: colors.wine }}>الأسبوع {w.n}</Txt>
                <View style={styles.row}>
                  {isNow && <Tag label="هذا الأسبوع" tone="wine" />}
                  {w.planId && <Tag label="له تحضير" tone="olive" />}
                  <Txt style={styles.small}>{ltr(`${shortDate(w.start)} - ${shortDate(w.end)}`)}</Txt>
                </View>
              </View>
              {w.rows.length
                ? <Txt bold style={{ fontSize: 15, marginTop: 6 }}>{w.rows.map(r => r.title.trim() || 'وحدة بلا اسم').join('، ')}</Txt>
                : <Txt style={[styles.small, { marginTop: 6 }]}>لا وحدة في هذا الأسبوع.</Txt>}
              {w.lessons.map((l, n) => (
                <View key={`${l.title}-${n}`} style={[styles.row, { alignItems: 'flex-start', marginTop: 8 }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold, marginTop: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontSize: 14 }}>{l.title}</Txt>
                    {!!l.objective && <Txt style={styles.small}>{l.objective}</Txt>}
                  </View>
                </View>
              ))}
            </Card>
          </Rise>
        );
      })}
    </Screen>
  );
}
