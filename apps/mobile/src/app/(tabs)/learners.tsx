import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Txt, Card, Tap, Rise, colors, styles } from '../../components/ui';
import { useStore } from '../../components/store';

export default function Learners() {
  const { data } = useStore();
  return (
    <Screen title="لكل طالب مساره" subtitle="نقاط قوته، احتياجاته، وأهدافه الفردية.">
      {data.learners.map((s, i) => (
        <Rise key={s.id} index={i}>
          <Tap accessibilityLabel={`ملف ${s.name}`} onPress={() => router.push(`/learner/${s.id}`)}>
            <Card>
              <View style={styles.row}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt bold style={{ fontSize: 24, lineHeight: 34, color: colors.wine }}>{s.initials}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt bold style={{ fontSize: 19 }}>{s.name}</Txt>
                  <Txt style={styles.small}>الصف {s.grade} · {s.goals.length} أهداف</Txt>
                </View>
                <Ionicons name="chevron-back" size={20} color={colors.goldDeep} />
              </View>
              <Txt style={{ color: colors.muted, fontSize: 13, marginTop: 14 }}>{s.strengths}</Txt>
            </Card>
          </Tap>
        </Rise>
      ))}
    </Screen>
  );
}
