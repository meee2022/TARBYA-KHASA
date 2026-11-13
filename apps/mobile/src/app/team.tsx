import React, { useState } from 'react';
import { View } from 'react-native';
import { uid } from '../../../../packages/domain';
import { referralStates, referralsDue, type Referral, type ReferralState, type TeamMember } from '../../../../packages/domain/records';
import { day, today } from '../../../../packages/domain/planning';
import { Screen, Txt, Card, Rise, Chips, Field, FormCard, DateField, PupilChips, Empty, Button, Tag, Orb, colors, styles, dayLabel, firstName } from '../components/ui';
import { useStore } from '../components/store';

const states = (Object.keys(referralStates) as ReferralState[]).map(value => ({ value, label: referralStates[value] }));

/** The support team around the pupils, and the referrals sent to it: who, why, and when to follow up. */
export default function Team() {
  const { data, saveDesk } = useStore();
  const team = data.desk?.team ?? [];
  const referrals = data.desk?.referrals ?? [];
  const now = today();
  const due = new Set(referralsDue(referrals, now).map(r => r.id));
  const [member, setMember] = useState<TeamMember | null>(null);
  const [draft, setDraft] = useState<Referral | null>(null);
  const blank = (): Referral => ({ id: uid(), learnerId: data.learners[0]?.id ?? '', date: now, to: '', reason: '', state: 'open', followUp: day(now, 7), reply: '' });

  const addMember = async () => {
    if (!member) return;
    await saveDesk({ team: [...team, { ...member, name: member.name.trim(), role: member.role.trim() }] }).catch(() => {});
    setMember(null);
  };
  const addReferral = async () => {
    if (!draft) return;
    await saveDesk({ referrals: [...referrals, { ...draft, to: draft.to.trim(), reason: draft.reason.trim() }] }).catch(() => {});
    setDraft(null);
  };
  const setState = (id: string, state: ReferralState) => saveDesk({ referrals: referrals.map(r => r.id === id ? { ...r, state } : r) }).catch(() => {});
  const ordered = [...referrals].sort((a, b) => Number(a.state === 'closed') - Number(b.state === 'closed') || b.date.localeCompare(a.date));

  return (
    <Screen subtitle="من يساند الطالب، وما أُحيل إليه، ومتى تُتابَع الإحالة.">
      <Txt bold style={styles.sectionTitle}>الإحالات</Txt>
      {draft
        ? <FormCard title="إحالة جديدة" saveLabel="أضف الإحالة" canSave={!!draft.learnerId && !!draft.to.trim() && !!draft.reason.trim()} onSave={addReferral} onCancel={() => setDraft(null)}>
            <PupilChips value={draft.learnerId} onChange={learnerId => setDraft({ ...draft, learnerId })} />
            <Field label="إلى من؟" value={draft.to} onChangeText={to => setDraft({ ...draft, to })} placeholder="مثال: اختصاصي النطق" />
            {team.length > 0 && <Chips value={draft.to} onChange={to => setDraft({ ...draft, to })} options={team.map(m => ({ value: m.role || m.name, label: m.role || m.name }))} />}
            <Field multiline label="سبب الإحالة" value={draft.reason} onChangeText={reason => setDraft({ ...draft, reason })} placeholder="صف الموقف الذي دعا إلى الإحالة" />
            <DateField optional label="موعد المتابعة" value={draft.followUp} onChange={followUp => setDraft({ ...draft, followUp })} />
          </FormCard>
        : referrals.length > 0 && data.learners.length > 0 && <View style={{ marginBottom: 16 }}><Button title="إحالة جديدة" icon="add" onPress={() => setDraft(blank())} /></View>}
      {!referrals.length && !draft && <Empty icon="git-network-outline" title="لا إحالات بعد" text="سجّل الإحالة وموعد متابعتها، فيذكّرك التطبيق حين يحين." action={data.learners.length ? 'أضف إحالة' : undefined} onAction={() => setDraft(blank())} />}
      {ordered.map((r, i) => {
        const learner = data.learners.find(l => l.id === r.learnerId);
        return (
          <Rise key={r.id} index={i}>
            <Card style={[r.state === 'closed' ? { opacity: .75 } : {}, due.has(r.id) ? { borderRightWidth: 4, borderRightColor: colors.wine } : {}]}>
              <View style={styles.spread}>
                <Txt style={[styles.small, { color: colors.goldDeep, flex: 1 }]}>{learner ? firstName(learner.name) : 'طالب غير موجود'} · {dayLabel(r.date)}</Txt>
                {due.has(r.id) && <Tag label="حان موعد المتابعة" tone="wine" icon="time-outline" />}
              </View>
              <Txt bold style={{ fontSize: 17, marginTop: 4 }}>إلى: {r.to}</Txt>
              <Txt style={{ fontSize: 14, color: colors.muted }}>{r.reason}</Txt>
              <Txt style={[styles.small, { marginVertical: 8 }]}>المتابعة: {r.followUp ? dayLabel(r.followUp) : 'بلا موعد'}</Txt>
              {!!r.reply && <Txt style={{ fontSize: 13, marginBottom: 8 }}>الرد: {r.reply}</Txt>}
              <Chips label="حالة الإحالة" value={r.state} onChange={state => setState(r.id, state)} options={states} />
            </Card>
          </Rise>
        );
      })}

      <Txt bold style={styles.sectionTitle}>فريق الدعم</Txt>
      {member
        ? <FormCard title="عضو جديد في الفريق" saveLabel="أضف العضو" canSave={!!member.name.trim() && !!member.role.trim()} onSave={addMember} onCancel={() => setMember(null)}>
            <Field label="الاسم" value={member.name} onChangeText={name => setMember({ ...member, name })} placeholder="اسم العضو" />
            <Field label="الدور" value={member.role} onChangeText={role => setMember({ ...member, role })} placeholder="مثال: اختصاصي العلاج الوظيفي" />
          </FormCard>
        : team.length > 0 && <View style={{ marginBottom: 16 }}><Button secondary title="عضو جديد" icon="person-add-outline" onPress={() => setMember({ id: uid(), name: '', role: '', note: '' })} /></View>}
      {!team.length && !member && <Empty icon="people-outline" title="لا أعضاء في الفريق بعد" text="أضف من يساند طلابك: اختصاصي، مرشد، منسق." action="أضف عضوًا" onAction={() => setMember({ id: uid(), name: '', role: '', note: '' })} />}
      {team.map((m, i) => (
        <Rise key={m.id} index={i}>
          <Card style={{ paddingVertical: 14, marginBottom: 10 }}>
            <View style={styles.row}>
              <Orb icon="person-outline" tone="olive" />
              <View style={{ flex: 1 }}>
                <Txt bold style={{ fontSize: 16 }}>{m.name}</Txt>
                <Txt style={styles.small}>{[m.role, m.note].filter(Boolean).join(' · ')}</Txt>
              </View>
            </View>
          </Card>
        </Rise>
      ))}
    </Screen>
  );
}
