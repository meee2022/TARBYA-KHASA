import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { uid } from '../../../../packages/domain';
import { defaultCatalog } from '../../../../packages/domain/catalog';
import { assessmentKinds, latestLevels, levelLabels, type AssessmentKind, type PerformanceEntry } from '../../../../packages/domain/desk';
import { today } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Rise, Chips, Field, FormCard, DateField, PupilChips, Empty, Button, Tag, Tone, colors, styles, dayLabel, firstName } from '../components/ui';
import { useStore } from '../components/store';

const levelTone = (level: number): Tone => level >= 5 ? 'olive' : level >= 3 ? 'gold' : 'neutral';
const kinds = (Object.keys(assessmentKinds) as AssessmentKind[]).map(value => ({ value, label: assessmentKinds[value] }));
const levels = levelLabels.map((label, i) => ({ value: i + 1, label }));

/** Where one pupil stands in each skill: the latest reading, and the level the skill started from. A level says how much help is needed today; it is never a rank. */
export default function Assessment() {
  const { data, saveDesk } = useStore();
  const entries = data.desk?.performance ?? [];
  const now = today();
  const [learnerId, setLearnerId] = useState(data.learners[0]?.id ?? '');
  const blank = () => ({ domain: defaultCatalog.performanceDomains[0] ?? '', skill: '', level: 3, percent: '', kind: 'formative' as AssessmentKind, date: now, note: '' });
  const [draft, setDraft] = useState<ReturnType<typeof blank> | null>(null);
  const learner = data.learners.find(l => l.id === learnerId);
  const latest = latestLevels(entries, learnerId, now);
  const percent = draft?.percent.trim() ? Number(draft.percent) : undefined;
  const percentOk = percent === undefined || (Number.isFinite(percent) && percent >= 0 && percent <= 100);

  const add = async () => {
    if (!draft) return;
    const entry: PerformanceEntry = { id: uid(), learnerId, domain: draft.domain, skill: draft.skill.trim(), level: draft.level, tool: '', date: draft.date || now, note: draft.note.trim(), kind: draft.kind, ...(percent === undefined ? {} : { percent }) };
    await saveDesk({ performance: [...entries, entry] }).catch(() => {});
    setDraft(null);
  };

  if (!learner) return (
    <Screen>
      <Empty icon="stats-chart-outline" title="لا طلاب بعد" text="يُسجَّل التقييم في ملف طالب." action="افتح الطلاب" onAction={() => router.push('/learners')} />
    </Screen>
  );
  return (
    <Screen subtitle="آخر قراءة لكل مهارة، ومن أين بدأت. المستوى يصف مقدار المساعدة اليوم.">
      <PupilChips value={learnerId} onChange={id => { setLearnerId(id); setDraft(null); }} />
      {draft
        ? <FormCard title={`قراءة جديدة · ${firstName(learner.name)}`} saveLabel="أضف القراءة" canSave={!!draft.skill.trim() && percentOk} onSave={add} onCancel={() => setDraft(null)}>
            <Chips label="المجال" value={draft.domain} onChange={domain => setDraft({ ...draft, domain })} options={defaultCatalog.performanceDomains.map(d => ({ value: d, label: d }))} />
            <Field label="المهارة" value={draft.skill} onChangeText={skill => setDraft({ ...draft, skill })} placeholder="مثال: يقرأ كلمات من ثلاثة حروف" />
            <Chips label="المستوى" value={draft.level} onChange={level => setDraft({ ...draft, level })} options={levels} />
            <Field numeric label="النسبة المئوية (اختياري)" value={draft.percent} onChangeText={v => setDraft({ ...draft, percent: v })} placeholder="من 0 إلى 100" />
            {!percentOk && <Txt style={{ color: colors.wine, fontSize: 12, marginTop: -10, marginBottom: 12 }}>اكتب رقمًا بين 0 و100.</Txt>}
            <Chips label="نوع التقييم" value={draft.kind} onChange={kind => setDraft({ ...draft, kind })} options={kinds} />
            <DateField label="التاريخ" value={draft.date} onChange={date => setDraft({ ...draft, date })} />
            <Field label="ملاحظة (اختياري)" value={draft.note} onChangeText={note => setDraft({ ...draft, note })} placeholder="وصف الموقف باختصار" />
          </FormCard>
        : latest.length > 0 && <View style={{ marginBottom: 16 }}><Button title="قراءة جديدة" icon="add" onPress={() => setDraft(blank())} /></View>}
      {!latest.length && !draft && <Empty icon="stats-chart-outline" title={`لا قراءات في ملف ${firstName(learner.name)} بعد`} text="سجّل أول قراءة لمهارة واحدة، فيظهر مستواها هنا." action="أضف قراءة" onAction={() => setDraft(blank())} />}
      {latest.map((e, i) => (
        <Rise key={e.id} index={i}>
          <Card style={{ paddingVertical: 16, marginBottom: 12 }}>
            <Txt style={[styles.small, { color: colors.goldDeep }]}>{e.domain}</Txt>
            <Txt bold style={{ fontSize: 17, marginBottom: 8 }}>{e.skill}</Txt>
            <View style={[styles.row, { flexWrap: 'wrap', gap: 8 }]}>
              <Tag label={levelLabels[e.level - 1]} tone={levelTone(e.level)} />
              <Tag label={assessmentKinds[e.kind ?? 'formative']} />
              {e.percent !== undefined && <Tag label={`${e.percent}%`} tone="gold" />}
              {e.stale && <Tag label="قراءة قديمة، يُعاد قياسها" tone="wine" icon="time-outline" />}
            </View>
            <Txt style={[styles.small, { marginTop: 8 }]}>{e.from === undefined ? 'قراءة واحدة حتى الآن' : `بدأت المهارة من: ${levelLabels[e.from - 1]}`} · {dayLabel(e.date)}</Txt>
            {!!e.note && <Txt style={{ fontSize: 13, marginTop: 6 }}>{e.note}</Txt>}
          </Card>
        </Rise>
      ))}
    </Screen>
  );
}
