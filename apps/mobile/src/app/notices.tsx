import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { notices, type Notice } from '../../../../packages/domain/desk';
import { today } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Tap, Rise, Empty, Orb, Icon, Tone, colors, styles } from '../components/ui';
import { useStore } from '../components/store';

const look: Record<Notice['kind'], { icon: Icon; tone: Tone; name: string }> = {
  register: { icon: 'people-circle-outline', tone: 'wine', name: 'الحضور' },
  task: { icon: 'checkbox-outline', tone: 'gold', name: 'مهمة' },
  review: { icon: 'checkmark-done-outline', tone: 'olive', name: 'مراجعة التحضير' },
  plan: { icon: 'document-text-outline', tone: 'wine', name: 'الخطة الفردية' },
  referral: { icon: 'git-network-outline', tone: 'gold', name: 'إحالة' },
  behaviour: { icon: 'shield-checkmark-outline', tone: 'olive', name: 'خطة سلوك' },
  pupil: { icon: 'person-outline', tone: 'neutral', name: 'ملف طالب' },
  goal: { icon: 'flag-outline', tone: 'gold', name: 'هدف فردي' },
};

/** The site's addresses differ from the app's in two places; a notice whose screen the app lacks is shown without a link. */
function routeOf(to: string): string | undefined {
  if (to.startsWith('/iep/')) return '/ieps';
  if (to.startsWith('/learners/')) return `/learner/${to.slice('/learners/'.length)}`;
  return ['/attendance', '/tasks', '/review', '/team', '/behaviour'].includes(to) ? to : undefined;
}

/** What needs the teacher today, worked out on the device from the workspace. Nothing is sent anywhere. */
export default function Notices() {
  const { data } = useStore();
  const list = notices(data, today());
  return (
    <Screen subtitle="ما يحتاج نظرك اليوم، محسوبًا من بياناتك على هذا الجهاز.">
      {!list.length && <Empty icon="notifications-off-outline" title="لا تنبيهات اليوم" text="كل شيء في موعده." action="العودة إلى مكتبي" onAction={() => router.back()} />}
      {list.map((n, i) => {
        const to = routeOf(n.to);
        const body = (
          <Card style={{ paddingVertical: 16, marginBottom: 12 }}>
            <View style={styles.row}>
              <Orb icon={look[n.kind].icon} tone={look[n.kind].tone} />
              <View style={{ flex: 1 }}>
                <Txt style={[styles.small, { color: colors.goldDeep }]}>{look[n.kind].name}</Txt>
                <Txt style={{ fontSize: 15 }}>{n.text}</Txt>
              </View>
              {to && <Ionicons name="chevron-back" size={20} color={colors.goldDeep} />}
            </View>
          </Card>
        );
        return <Rise key={n.id} index={i}>{to ? <Tap accessibilityLabel={n.text} onPress={() => router.push(to as never)}>{body}</Tap> : body}</Rise>;
      })}
    </Screen>
  );
}
