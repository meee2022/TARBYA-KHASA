import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { defaultCatalog } from '../../../../packages/domain/catalog';
import { Screen, Txt, Card, Tap, Rise, Field, Empty, colors, styles } from '../components/ui';

/** The strategy guide: search by a word, tap a strategy to read how to run it. */
export default function Strategies() {
  const [query, setQuery] = useState('');
  const word = query.trim();
  const list = defaultCatalog.strategyGuide.filter(s => !word || `${s.title} ${s.summary} ${s.when}`.includes(word));
  return (
    <Screen subtitle="استراتيجيات تدريس مشروحة: متى تناسب، وكيف تُنفَّذ، وكيف تُكيَّف.">
      <Field label="ابحث في الاستراتيجيات" value={query} onChangeText={setQuery} placeholder="مثال: الانتقال، التعزيز، القراءة" />
      {!list.length && <Empty icon="search-outline" title="لا استراتيجية بهذه الكلمة" text="جرّب كلمة أقصر أو كلمة أخرى." action="امسح البحث" onAction={() => setQuery('')} />}
      {list.map((s, i) => (
        <Rise key={s.id} index={i}>
          <Tap accessibilityLabel={`استراتيجية: ${s.title}`} onPress={() => router.push(`/strategy/${s.id}`)}>
            <Card style={{ paddingVertical: 16, marginBottom: 12 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Txt bold style={{ fontSize: 17 }}>{s.title}</Txt>
                  <Txt style={{ fontSize: 13, color: colors.muted }}>{s.summary}</Txt>
                </View>
                <Ionicons name="chevron-back" size={20} color={colors.goldDeep} />
              </View>
            </Card>
          </Tap>
        </Rise>
      ))}
    </Screen>
  );
}
