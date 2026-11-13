import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uid } from '../../../../packages/domain';
import { defaultCatalog } from '../../../../packages/domain/catalog';
import { safeLink, youtubeId, type VideoItem } from '../../../../packages/domain/videos';
import { Screen, Txt, Card, Tap, Rise, Chips, Field, FormCard, Empty, Button, Tag, colors, styles } from '../components/ui';
import { useStore } from '../components/store';

const blank = (): VideoItem => ({ id: uid(), title: '', url: '', subject: defaultCatalog.subjects[0] ?? '', note: '', approved: false });

/** Links to teaching videos the teacher keeps. A video counts as ready for pupils only after the teacher has watched and approved it. */
export default function Videos() {
  const { data, saveDesk } = useStore();
  const videos = data.desk?.videos ?? [];
  const [draft, setDraft] = useState<VideoItem | null>(null);
  const [problem, setProblem] = useState('');
  const store = (next: VideoItem[]) => saveDesk({ videos: next }).catch(() => {});
  const add = async () => {
    if (!draft) return;
    const url = draft.url.trim();
    if (!safeLink(url)) return setProblem('الرابط يجب أن يبدأ بـ https:// وألا يحتوي على مسافات. لم يُحفظ المقطع.');
    await store([...videos, { ...draft, title: draft.title.trim(), url, note: draft.note.trim() }]);
    setDraft(null);
  };
  const start = () => { setProblem(''); setDraft(blank()); };

  return (
    <Screen subtitle="روابط المقاطع التعليمية. شاهد المقطع كاملًا ثم اعتمده قبل عرضه على الطلاب.">
      {draft
        ? <FormCard title="مقطع جديد" saveLabel="أضف المقطع" canSave={!!draft.title.trim() && !!draft.url.trim()} onSave={add} onCancel={() => setDraft(null)}>
            <Field label="عنوان المقطع" value={draft.title} onChangeText={title => setDraft({ ...draft, title })} placeholder="مثال: أغنية الحروف" />
            <Field label="الرابط" value={draft.url} onChangeText={url => { setDraft({ ...draft, url }); setProblem(''); }} placeholder="https://" />
            {!!problem && <Txt accessibilityRole="alert" bold style={{ color: colors.wine, fontSize: 13, marginTop: -8, marginBottom: 12 }}>{problem}</Txt>}
            <Chips label="المادة" value={draft.subject} onChange={subject => setDraft({ ...draft, subject })} options={defaultCatalog.subjects.map(s => ({ value: s, label: s }))} />
            <Field label="ملاحظة (اختياري)" value={draft.note} onChangeText={note => setDraft({ ...draft, note })} placeholder="مثال: من الدقيقة 1 إلى 3 فقط" />
          </FormCard>
        : videos.length > 0 && <View style={{ marginBottom: 16 }}><Button title="مقطع جديد" icon="add" onPress={start} /></View>}
      {!videos.length && !draft && <Empty icon="videocam-outline" title="لا مقاطع بعد" text="احفظ رابط مقطع تعليمي لتجده وقت الحصة." action="أضف مقطعًا" onAction={start} />}
      {videos.map((v, i) => (
        <Rise key={v.id} index={i}>
          <Card>
            <View style={styles.spread}>
              <Txt style={[styles.small, { color: colors.goldDeep, flex: 1 }]}>{v.subject}</Txt>
              <View style={styles.row}>
                {youtubeId(v.url) && <Tag label="يوتيوب" />}
                <Tag label={v.approved ? 'معتمد' : 'ينتظر المشاهدة'} tone={v.approved ? 'olive' : 'gold'} icon={v.approved ? 'checkmark-circle-outline' : 'time-outline'} />
              </View>
            </View>
            <Txt bold style={{ fontSize: 17, marginTop: 4 }}>{v.title}</Txt>
            {!!v.note && <Txt style={{ fontSize: 14, color: colors.muted }}>{v.note}</Txt>}
            <Tap accessibilityRole="checkbox" accessibilityState={{ checked: v.approved }} accessibilityLabel={`${v.approved ? 'إلغاء اعتماد' : 'اعتماد'}: ${v.title}`} onPress={() => store(videos.map(x => x.id === v.id ? { ...x, approved: !x.approved } : x))} style={[styles.row, { minHeight: 44, marginTop: 6 }]}>
              <Ionicons name={v.approved ? 'checkbox' : 'square-outline'} size={24} color={v.approved ? colors.green : colors.goldDeep} />
              <Txt style={{ fontSize: 14 }}>شاهدته كاملًا وهو مناسب للطلاب</Txt>
            </Tap>
            {safeLink(v.url)
              ? <Button secondary title="افتح المقطع" icon="open-outline" onPress={() => { Linking.openURL(v.url.trim()).catch(() => {}); }} />
              : <Txt style={[styles.small, { color: colors.wine, marginTop: 8 }]}>رابط هذا المقطع غير آمن، فلا يُفتح من التطبيق.</Txt>}
          </Card>
        </Rise>
      ))}
    </Screen>
  );
}
