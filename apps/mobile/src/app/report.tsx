import React, { ReactNode, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { countOf } from '../../../../packages/domain';
import { levelLabels, markLabels, marks } from '../../../../packages/domain/desk';
import { goalStatusLabels, today } from '../../../../packages/domain/planning';
import { learnerReport } from '../../../../packages/domain/reports';
import { Screen, Txt, Card, Rise, PupilChips, Empty, Tag, Tone, colors, styles, dayLabel } from '../components/ui';
import { useStore } from '../components/store';

function Section({ title, index, empty, children }: { title: string; index: number; empty?: string; children?: ReactNode }) {
  return (
    <Rise index={index}>
      <Card>
        <Txt bold accessibilityRole="header" style={{ fontSize: 16, color: colors.wine, marginBottom: 6 }}>{title}</Txt>
        {empty ? <Txt style={styles.small}>{empty}</Txt> : children}
      </Card>
    </Rise>
  );
}
const Line = ({ children, first }: { children: ReactNode; first: boolean }) => <View style={{ paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line }}>{children}</View>;
const statusTone: Record<keyof typeof goalStatusLabels, Tone> = { 'not-evaluated': 'neutral', training: 'gold', met: 'olive', approved: 'olive', review: 'wine' };

/** Everything recorded about one pupil on one page, to read before a meeting. It describes the pupil alone and compares them with no one. */
export default function Report() {
  const { data } = useStore();
  const [learnerId, setLearnerId] = useState(data.learners[0]?.id ?? '');
  const r = learnerReport(data, learnerId, today());
  if (!r) return (
    <Screen>
      <Empty icon="reader-outline" title="لا طلاب بعد" text="يُبنى التقرير من ملف طالب." action="افتح الطلاب" onAction={() => router.push('/learners')} />
    </Screen>
  );
  const a = r.attendance;
  return (
    <Screen subtitle="يصف هذا التقرير ما سُجِّل عن الطالب وحده، ولا يقارنه بغيره. للقراءة فقط؛ التصدير والطباعة على موقع وتد.">
      <PupilChips value={learnerId} onChange={setLearnerId} />
      <Rise>
        <Card style={{ backgroundColor: colors.wine }}>
          <Txt bold style={{ color: colors.bg, fontSize: 20 }}>{r.learner.name}</Txt>
          <Txt style={{ color: colors.goldLight, fontSize: 13 }}>الصف {r.learner.grade} · {dayLabel(r.date)}</Txt>
          <Txt style={{ color: colors.bg, fontSize: 13, marginTop: 6 }}>الخطة الفردية: {r.plan}</Txt>
        </Card>
      </Rise>

      <Section title="حضور هذا الشهر" index={1} empty={a.recorded ? undefined : 'لم يُسجَّل حضور هذا الشهر.'}>
        <View style={[styles.row, { gap: 8, marginTop: 4 }]}>
          {marks.map(m => (
            <View key={m} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, backgroundColor: colors.sand }}>
              <Txt bold style={{ fontSize: 18, color: colors.wine }}>{a[m]}</Txt>
              <Txt style={{ fontSize: 11, color: colors.muted }}>{markLabels[m]}</Txt>
            </View>
          ))}
        </View>
        <Txt style={[styles.small, { marginTop: 8 }]}>نسبة الحضور {a.rate}% من {countOf(a.recorded, 'يوم مسجل', 'يومين مسجلين', 'أيام مسجلة')}.</Txt>
      </Section>

      <Section title="الأهداف الفردية" index={2} empty={r.goals.length ? undefined : 'لا أهداف فردية مسجلة.'}>
        {r.goals.map((g, n) => (
          <Line key={n} first={!n}>
            <Txt style={{ fontSize: 14 }}>{g.text}</Txt>
            <View style={[styles.row, { flexWrap: 'wrap', gap: 8, marginTop: 6 }]}>
              <Tag label={goalStatusLabels[g.status]} tone={statusTone[g.status]} />
              <Txt style={styles.small}>{g.subject} · {g.sessions ? countOf(g.sessions, 'جلسة', 'جلستان', 'جلسات') : 'لا جلسات'} · آخر نتيجة: {g.last || 'لم يُقس'}</Txt>
            </View>
          </Line>
        ))}
      </Section>

      <Section title="مستويات الأداء" index={3} empty={r.levels.length ? undefined : 'لا قياسات مسجلة.'}>
        {r.levels.map((l, n) => (
          <Line key={n} first={!n}>
            <Txt style={[styles.small, { color: colors.goldDeep }]}>{l.domain}</Txt>
            <Txt bold style={{ fontSize: 14 }}>{l.skill}</Txt>
            <View style={[styles.row, { flexWrap: 'wrap', gap: 8, marginTop: 6 }]}>
              <Tag label={levelLabels[l.level - 1]} tone={l.level >= 5 ? 'olive' : l.level >= 3 ? 'gold' : 'neutral'} />
              {l.stale && <Tag label="قياس قديم" tone="wine" />}
              <Txt style={styles.small}>{l.from ? `بدأ من: ${levelLabels[l.from - 1]}` : 'قياس واحد'} · {l.kind} · {dayLabel(l.date)}</Txt>
            </View>
          </Line>
        ))}
      </Section>

      <Section title="التحصيل حسب المادة" index={4} empty={r.achievement.length ? undefined : 'لا تقييمات بنسبة ومادة بعد.'}>
        {r.achievement.map((c, n) => (
          <Line key={c.subject} first={!n}>
            <View style={styles.spread}>
              <Txt bold style={{ fontSize: 14, flex: 1 }}>{c.subject}</Txt>
              <Txt style={styles.small}>{c.average}% من {countOf(c.count, 'تقييم', 'تقييمين', 'تقييمات')}</Txt>
            </View>
          </Line>
        ))}
      </Section>

      <Section title="خطط السلوك" index={5} empty={r.behaviour.length ? undefined : 'لا خطط سلوك لهذا الطالب.'}>
        {r.behaviour.map((b, n) => (
          <Line key={n} first={!n}>
            <View style={styles.spread}>
              <Txt bold style={{ fontSize: 14, flex: 1 }}>{b.target}</Txt>
              <Tag label={b.active ? 'فعّالة' : 'متوقفة'} tone={b.active ? 'olive' : 'neutral'} />
            </View>
            <Txt style={styles.small}>البديل: {b.replacement} · {b.count ? countOf(b.count, 'مرة', 'مرتان', 'مرات') : 'لم يُسجَّل'} في آخر 14 يومًا</Txt>
          </Line>
        ))}
      </Section>

      <Section title="الإحالات" index={6} empty={r.referrals.length ? undefined : 'لا إحالات لهذا الطالب.'}>
        {r.referrals.map((x, n) => (
          <Line key={n} first={!n}>
            <View style={styles.spread}>
              <Txt bold style={{ fontSize: 14, flex: 1 }}>إلى: {x.to}</Txt>
              <Tag label={x.state} tone="gold" />
            </View>
            <Txt style={styles.small}>{x.reason} · {dayLabel(x.date)}</Txt>
          </Line>
        ))}
      </Section>

      <Section title="شواهد من ملف الإنجاز" index={7} empty={r.evidence.length ? undefined : 'لا شواهد في ملف الإنجاز بعد.'}>
        {r.evidence.map((e, n) => (
          <Line key={n} first={!n}>
            <View style={styles.spread}>
              <Txt bold style={{ fontSize: 14, flex: 1 }}>{e.title}</Txt>
              <Tag label={e.reviewed ? 'رُوجع' : 'ينتظر المراجعة'} tone={e.reviewed ? 'olive' : 'neutral'} />
            </View>
            <Txt style={styles.small}>{dayLabel(e.date)}</Txt>
          </Line>
        ))}
      </Section>
    </Screen>
  );
}
