import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { approvalLabel, goalProgress, goalStatusLabels, iepApproval, today, type Achieved } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Rise, Empty, Tag, Tone, colors, styles, dayLabel } from '../components/ui';
import { useStore } from '../components/store';

const resultLabel: Record<Achieved, string> = { '': 'قيد العمل', done: 'تحقق', not: 'لم يتحقق بعد' };
const resultTone: Record<Achieved, Tone> = { '': 'neutral', done: 'olive', not: 'gold' };
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** The individual plans, to read on the go: where each stands, its next review, and its goals. Writing and approving happen on the web site. */
export default function Ieps() {
  const { data } = useStore();
  const now = today();
  const plans = (data.ieps ?? []).flatMap(iep => { const learner = data.learners.find(l => l.id === iep.learnerId); return learner ? [{ iep, learner }] : []; });
  return (
    <Screen subtitle="للقراءة فقط. تُكتب الخطة وتُعتمد على موقع وتد.">
      {!plans.length && <Empty icon="document-text-outline" title="لا خطط فردية على هذا الجهاز" text="استورد نسخة من الموقع لتظهر خططه هنا." action="استيراد نسخة من الموقع" onAction={() => router.push('/transfer')} />}
      {plans.map(({ iep, learner }, i) => {
        const state = iepApproval(iep).state;
        const reviewDue = isDate(iep.nextReview) && iep.nextReview <= now;
        return (
          <Rise key={iep.learnerId} index={i}>
            <Card>
              <View style={styles.spread}>
                <Txt bold style={{ fontSize: 19, flex: 1 }}>{learner.name}</Txt>
                <Tag label={approvalLabel(iep)} tone={state === 'approved' ? 'olive' : state === 'edited' ? 'gold' : 'neutral'} />
              </View>
              <Txt style={[styles.small, reviewDue ? { color: colors.wine } : {}]}>
                المراجعة القادمة: {isDate(iep.nextReview) ? dayLabel(iep.nextReview) : 'لم تُحدَّد'}{reviewDue ? ' · حان موعدها' : ''}
              </Txt>
              {!iep.goals.length && <Txt style={[styles.small, { marginTop: 10 }]}>لا أهداف بعيدة المدى في الخطة بعد.</Txt>}
              {iep.goals.map(g => (
                <View key={g.id} style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line }}>
                  <View style={styles.spread}>
                    <Txt style={[styles.small, { color: colors.goldDeep, flex: 1 }]}>هدف بعيد المدى · {g.kind === 'academic' ? g.subject || 'أكاديمي' : 'مهارات حياتية'}</Txt>
                    <Tag label={resultLabel[g.result]} tone={resultTone[g.result]} />
                  </View>
                  <Txt bold style={{ fontSize: 16, marginTop: 4 }}>{g.text}</Txt>
                  {g.shorts.map(s => {
                    const tracked = s.trackedGoalId ? learner.goals.find(x => x.id === s.trackedGoalId) : undefined;
                    return (
                      <View key={s.id} style={[styles.row, { alignItems: 'flex-start', marginTop: 10 }]}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.result === 'done' ? colors.green : colors.gold, marginTop: 9 }} />
                        <View style={{ flex: 1 }}>
                          <Txt style={{ fontSize: 14 }}>{s.text}</Txt>
                          <Txt style={styles.small}>{resultLabel[s.result]}{tracked ? ` · القياس: ${goalStatusLabels[goalProgress(tracked, data.observations, now).status]}` : ''}</Txt>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </Card>
          </Rise>
        );
      })}
    </Screen>
  );
}
