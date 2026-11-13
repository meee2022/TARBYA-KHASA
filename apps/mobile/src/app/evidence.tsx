import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { uid } from '../../../../packages/domain';
import type { Evidence } from '../../../../packages/domain/records';
import { today } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Tap, Rise, Chips, Field, FormCard, DateField, PupilChips, Empty, Button, Tag, colors, styles, dayLabel, firstName } from '../components/ui';
import { useStore } from '../components/store';

/** Evidence of one pupil's learning: a title, a date and a note. The work itself stays with the teacher; the record only describes it. */
export default function EvidenceScreen() {
  const { data, saveDesk } = useStore();
  const all = data.desk?.evidence ?? [];
  const now = today();
  const [learnerId, setLearnerId] = useState(data.learners[0]?.id ?? '');
  const [draft, setDraft] = useState<Evidence | null>(null);
  const learner = data.learners.find(l => l.id === learnerId);
  const mine = all.filter(e => e.learnerId === learnerId).sort((a, b) => b.date.localeCompare(a.date));
  const blank = (): Evidence => ({ id: uid(), learnerId, title: '', date: now, note: '', reviewed: false });
  const store = (next: Evidence[]) => saveDesk({ evidence: next }).catch(() => {});
  const add = async () => {
    if (!draft) return;
    await store([...all, { ...draft, title: draft.title.trim(), note: draft.note.trim(), date: draft.date || now }]);
    setDraft(null);
  };

  if (!learner) return (
    <Screen>
      <Empty icon="folder-open-outline" title="لا طلاب بعد" text="تُحفظ الشواهد في ملف طالب." action="افتح الطلاب" onAction={() => router.push('/learners')} />
    </Screen>
  );
  const goals = [{ value: '', label: 'بلا هدف' }, ...learner.goals.map(g => ({ value: g.id, label: g.text }))];
  return (
    <Screen subtitle="شواهد تعلّم كل طالب: ماذا أنجز، ومتى، وبأي هدف يرتبط.">
      <PupilChips value={learnerId} onChange={id => { setLearnerId(id); setDraft(null); }} />
      {draft
        ? <FormCard title={`شاهد جديد · ${firstName(learner.name)}`} saveLabel="أضف الشاهد" canSave={!!draft.title.trim()} onSave={add} onCancel={() => setDraft(null)}>
            <Field label="العنوان" value={draft.title} onChangeText={title => setDraft({ ...draft, title })} placeholder="مثال: ورقة عمل مطابقة الحروف" />
            <DateField label="التاريخ" value={draft.date} onChange={date => setDraft({ ...draft, date })} />
            <Field multiline label="ملاحظة" value={draft.note} onChangeText={note => setDraft({ ...draft, note })} placeholder="ماذا يُظهر هذا الشاهد؟" />
            <Chips label="الهدف المرتبط (اختياري)" value={draft.goalId ?? ''} onChange={goalId => setDraft({ ...draft, goalId: goalId || undefined })} options={goals} />
          </FormCard>
        : mine.length > 0 && <View style={{ marginBottom: 16 }}><Button title="شاهد جديد" icon="add" onPress={() => setDraft(blank())} /></View>}
      {!mine.length && !draft && <Empty icon="folder-open-outline" title={`لا شواهد في ملف ${firstName(learner.name)} بعد`} text="أضف أول شاهد: عمل أنجزه الطالب، أو موقف يدل على تعلّمه." action="أضف شاهدًا" onAction={() => setDraft(blank())} />}
      {mine.map((e, i) => {
        const goal = learner.goals.find(g => g.id === e.goalId);
        return (
          <Rise key={e.id} index={i}>
            <Card>
              <View style={styles.spread}>
                <Txt style={[styles.small, { flex: 1 }]}>{dayLabel(e.date)}</Txt>
                {e.reviewed && <Tag label="رُوجع" tone="olive" icon="checkmark-circle-outline" />}
              </View>
              <Txt bold style={{ fontSize: 17, marginTop: 4 }}>{e.title}</Txt>
              {!!e.note && <Txt style={{ fontSize: 14, color: colors.muted }}>{e.note}</Txt>}
              {goal && <Txt style={[styles.small, { marginTop: 6, color: colors.goldDeep }]}>الهدف: {goal.text}</Txt>}
              <Tap accessibilityRole="checkbox" accessibilityState={{ checked: e.reviewed }} accessibilityLabel={`${e.reviewed ? 'إلغاء المراجعة' : 'تمت المراجعة'}: ${e.title}`} onPress={() => store(all.map(x => x.id === e.id ? { ...x, reviewed: !x.reviewed } : x))} style={[styles.row, { minHeight: 44, marginTop: 8 }]}>
                <Ionicons name={e.reviewed ? 'checkbox' : 'square-outline'} size={24} color={e.reviewed ? colors.green : colors.goldDeep} />
                <Txt style={{ fontSize: 14 }}>{e.reviewed ? 'تمت مراجعته' : 'علّمه كمُراجَع'}</Txt>
              </Tap>
            </Card>
          </Rise>
        );
      })}
    </Screen>
  );
}
