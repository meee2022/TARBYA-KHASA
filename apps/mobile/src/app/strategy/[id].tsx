import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { defaultCatalog } from '../../../../../packages/domain/catalog';
import { Screen, Txt, Card, Rise, Empty, Steps, colors, styles } from '../../components/ui';

function Part({ title, index, children }: { title: string; index: number; children: ReactNode }) {
  return (
    <Rise index={index}>
      <Card>
        <Txt bold style={{ fontSize: 16, color: colors.wine, marginBottom: 10 }}>{title}</Txt>
        {children}
      </Card>
    </Rise>
  );
}

/** One strategy in full: what it is, when it fits, the steps, how to adapt it, what goes wrong, and how to tell it worked. */
export default function Strategy() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = defaultCatalog.strategyGuide.find(x => x.id === id);
  if (!s) return (
    <Screen>
      <Empty icon="library-outline" title="لم نجد هذه الاستراتيجية" action="افتح الموسوعة" onAction={() => router.replace('/strategies')} />
    </Screen>
  );
  return (
    <Screen title={s.title} subtitle={s.summary}>
      <Part title="متى تُستخدم؟" index={0}><Txt style={{ fontSize: 14 }}>{s.when}</Txt></Part>
      <Part title="الخطوات" index={1}><Steps items={s.steps} /></Part>
      {s.adaptations.length > 0 && (
        <Part title="التكييف حسب الحاجة" index={2}>
          <View style={{ gap: 12 }}>
            {s.adaptations.map(a => (
              <View key={a.need} style={{ borderRightWidth: 3, borderRightColor: colors.gold, paddingRight: 12 }}>
                <Txt bold style={{ fontSize: 14 }}>{a.need}</Txt>
                <Txt style={{ fontSize: 14, color: colors.muted }}>{a.text}</Txt>
              </View>
            ))}
          </View>
        </Part>
      )}
      {s.mistakes.length > 0 && (
        <Part title="أخطاء شائعة" index={3}>
          <View style={{ gap: 8 }}>
            {s.mistakes.map(m => (
              <View key={m} style={[styles.row, { alignItems: 'flex-start' }]}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.wine, marginTop: 9 }} />
                <Txt style={{ flex: 1, fontSize: 14 }}>{m}</Txt>
              </View>
            ))}
          </View>
        </Part>
      )}
      <Part title="كيف أعرف أنها نجحت؟" index={4}><Txt style={{ fontSize: 14 }}>{s.measure}</Txt></Part>
    </Screen>
  );
}
