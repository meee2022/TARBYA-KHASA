import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { countOf, uid, type BehaviourNote, type Learner } from '../../../../packages/domain';
import { defaultCatalog } from '../../../../packages/domain/catalog';
import { behaviourCounts, type BehaviourPlan } from '../../../../packages/domain/desk';
import { day, today } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Rise, Field, FormCard, DateField, PupilChips, Empty, Button, Tag, colors, styles, dayLabel, firstName } from '../components/ui';
import { useStore } from '../components/store';

/** Fourteen thin bars, oldest on the right: how often the behaviour was noted each day. */
function Counts({ counts }: { counts: { date: string; count: number }[] }) {
  const top = Math.max(1, ...counts.map(c => c.count));
  const total = counts.reduce((t, c) => t + c.count, 0);
  return (
    <View accessible accessibilityLabel={`سُجّل ${total} مرة في آخر 14 يومًا`} style={{ marginVertical: 12 }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 4, height: 46 }}>
        {counts.map(c => <View key={c.date} style={{ flex: 1, height: c.count ? 8 + 38 * c.count / top : 4, borderRadius: 4, backgroundColor: c.count ? colors.gold : colors.line }} />)}
      </View>
      <Txt style={[styles.small, { marginTop: 6 }]}>{total ? `${countOf(total, 'مرة', 'مرتان', 'مرات')} في آخر 14 يومًا` : 'لم يُسجَّل في آخر 14 يومًا'}</Txt>
    </View>
  );
}

/** Behaviour plans: one card per target behaviour. The count comes from the pupil's own behaviour notes, so nothing is recorded twice. */
export default function Behaviour() {
  const { data, saveDesk, saveLearner } = useStore();
  const plans = data.desk?.behaviourPlans ?? [];
  const now = today();
  const functions = defaultCatalog.behaviourFunctions;
  const blank = (): BehaviourPlan => ({ id: uid(), learnerId: data.learners[0]?.id ?? '', target: '', definition: '', baseline: '', goal: '', func: functions[functions.length - 1] ?? '', replacement: '', prevention: [], reinforcers: [], response: '', team: '', review: day(now, 28), active: true });
  const [draft, setDraft] = useState<BehaviourPlan | null>(null);
  const [noting, setNoting] = useState('');
  const [note, setNote] = useState({ antecedent: '', consequence: '' });
  const put = (change: Partial<BehaviourPlan>) => setDraft(d => d && { ...d, ...change });
  const store = (next: BehaviourPlan[]) => saveDesk({ behaviourPlans: next }).catch(() => {});

  const save = async () => {
    if (!draft) return;
    await store([...plans, { ...draft, target: draft.target.trim(), definition: draft.definition.trim(), replacement: draft.replacement.trim() }]);
    setDraft(null);
  };
  const addNote = async (p: BehaviourPlan, learner: Learner) => {
    const entry: BehaviourNote = { id: uid(), date: now, antecedent: note.antecedent.trim(), behaviour: p.target, consequence: note.consequence.trim(), planId: p.id };
    await saveLearner({ ...learner, behaviour: [...(learner.behaviour ?? []), entry] }).catch(() => {});
    setNoting('');
    setNote({ antecedent: '', consequence: '' });
  };
  const ordered = [...plans].sort((a, b) => Number(b.active) - Number(a.active));

  if (!data.learners.length) return (
    <Screen>
      <Empty icon="shield-checkmark-outline" title="لا طلاب بعد" text="تُكتب خطة السلوك لطالب له ملف." action="افتح الطلاب" onAction={() => router.push('/learners')} />
    </Screen>
  );
  return (
    <Screen subtitle="خطة لكل سلوك مستهدف: ما نراه ونعدّه، وما نعلّمه بديلًا عنه.">
      <View style={[styles.row, { alignItems: 'flex-start', marginBottom: 16 }]}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.green} style={{ marginTop: 3 }} />
        <Txt style={[styles.small, { flex: 1 }]}>نصف الموقف لا الطالب. سبب السلوك فرضية من الملاحظة تُراجَع مع الفريق والأسرة، وليست تشخيصًا.</Txt>
      </View>
      {draft
        ? <FormCard title="خطة سلوك جديدة" saveLabel="احفظ الخطة" canSave={!!draft.target.trim() && !!draft.definition.trim() && !!draft.replacement.trim() && !!draft.review} onSave={save} onCancel={() => setDraft(null)}>
            <PupilChips value={draft.learnerId} onChange={learnerId => put({ learnerId })} />
            <Field label="السلوك المستهدف" value={draft.target} onChangeText={target => put({ target })} placeholder="مثال: مغادرة المقعد أثناء الشرح" />
            <Field multiline label="تعريفه: ما الذي نراه ونعدّه؟" value={draft.definition} onChangeText={definition => put({ definition })} placeholder="وصف يمكن لأي ملاحظ أن يعدّه" />
            <Field label="السلوك البديل" value={draft.replacement} onChangeText={replacement => put({ replacement })} placeholder="مثال: رفع بطاقة «أحتاج استراحة»" />
            <Field label="الوضع الحالي (اختياري)" value={draft.baseline} onChangeText={baseline => put({ baseline })} placeholder="مثال: 6 مرات في الحصة" />
            <Field label="الهدف (اختياري)" value={draft.goal} onChangeText={goal => put({ goal })} placeholder="مثال: مرتان أو أقل في الحصة" />
            <DateField label="موعد المراجعة" value={draft.review} onChange={review => put({ review })} />
          </FormCard>
        : plans.length > 0 && <View style={{ marginBottom: 16 }}><Button title="خطة جديدة" icon="add" onPress={() => setDraft(blank())} /></View>}
      {!plans.length && !draft && <Empty icon="shield-checkmark-outline" title="لا خطط سلوك بعد" text="ابدأ بسلوك واحد يمكن ملاحظته وعدّه." action="أضف خطة" onAction={() => setDraft(blank())} />}
      {ordered.map((p, i) => {
        const learner = data.learners.find(l => l.id === p.learnerId);
        if (!learner) return null;
        const due = p.active && !!p.review && p.review <= now;
        return (
          <Rise key={p.id} index={i}>
            <Card style={p.active ? {} : { opacity: .7 }}>
              <View style={styles.spread}>
                <Txt style={[styles.small, { color: colors.goldDeep }]}>{firstName(learner.name)}</Txt>
                {p.active ? due ? <Tag label="حان موعد المراجعة" tone="wine" icon="time-outline" /> : <Tag label="فعّالة" tone="olive" /> : <Tag label="متوقفة" />}
              </View>
              <Txt bold style={{ fontSize: 18, marginTop: 4 }}>{p.target}</Txt>
              <Txt style={{ fontSize: 13, color: colors.muted }}>{p.definition}</Txt>
              <Counts counts={behaviourCounts(learner.behaviour, p.id, now)} />
              <Txt style={{ fontSize: 13 }}>البديل: {p.replacement}</Txt>
              <Txt style={styles.small}>المراجعة: {dayLabel(p.review)}</Txt>
              {noting === p.id
                ? <View style={{ marginTop: 14 }}>
                    <Field label="ما الذي سبقه؟ (اختياري)" value={note.antecedent} onChangeText={antecedent => setNote({ ...note, antecedent })} placeholder="مثال: طُلب منه الانتقال إلى نشاط جديد" />
                    <Field label="ما الذي تلاه؟ (اختياري)" value={note.consequence} onChangeText={consequence => setNote({ ...note, consequence })} placeholder="مثال: أُعطي استراحة قصيرة" />
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}><Button title="احفظ الملاحظة" icon="checkmark" onPress={() => addNote(p, learner)} /></View>
                      <View style={{ flex: 1 }}><Button secondary title="إلغاء" onPress={() => setNoting('')} /></View>
                    </View>
                  </View>
                : <View style={styles.row}>
                    {p.active && <View style={{ flex: 2 }}><Button title="سجّل حدوثه" icon="add-circle-outline" onPress={() => { setNote({ antecedent: '', consequence: '' }); setNoting(p.id); }} /></View>}
                    <View style={{ flex: 1 }}><Button secondary title={p.active ? 'إيقاف' : 'تفعيل'} onPress={() => store(plans.map(x => x.id === p.id ? { ...x, active: !x.active } : x))} /></View>
                  </View>}
            </Card>
          </Rise>
        );
      })}
    </Screen>
  );
}
