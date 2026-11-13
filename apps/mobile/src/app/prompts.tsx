import React, { useState } from 'react';
import { Platform, Share, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { countOf } from '../../../../packages/domain';
import { defaultCatalog } from '../../../../packages/domain/catalog';
import { fillPrompt, promptBlanks } from '../../../../packages/domain/prompts';
import { Screen, Txt, Card, Tap, Rise, Chips, Field, Button, Empty, colors, styles, copyText } from '../components/ui';
import { useStore } from '../components/store';

/** The prompt lab: ready requests filled from one of the teacher's lessons, to hand to whichever writing assistant the school allows. Nothing is sent from here. */
export default function Prompts() {
  const { data } = useStore();
  const all = defaultCatalog.prompts;
  const [pick, setPick] = useState(all[0]?.id ?? '');
  const [lessonId, setLessonId] = useState(data.lessons[0]?.id ?? '');
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState('');
  const prompt = all.find(p => p.id === pick) ?? all[0];
  const lesson = data.lessons.find(l => l.id === lessonId);
  if (!prompt) return (
    <Screen>
      <Empty icon="chatbox-ellipses-outline" title="لا أوامر بعد" text="تُضاف الأوامر الجاهزة من لوحة الإدارة على الموقع." />
    </Screen>
  );
  const fields = { 'الدرس': lesson?.title ?? '', 'المادة': lesson?.subject ?? '', 'الصف': lesson?.grade ?? '', 'الهدف': lesson?.objective ?? '' };
  const blanks = promptBlanks(prompt.template);
  const text = fillPrompt(prompt.template, fields, typed);
  const gaps = (text.match(/\[[^\]\n]{1,40}\]/g) ?? []).length;
  const handOver = async () => {
    if (Platform.OS === 'web') return setCopied(await copyText(text) ? 'نُسخ النص. الصقه في مساعد الكتابة الذي تسمح به مدرستك.' : 'تعذّر النسخ تلقائيًا. حدّد النص في الخانة وانسخه.');
    try { await Share.share({ message: text }); } catch { setCopied('تعذّرت المشاركة. حاول مرة أخرى.'); }
  };

  return (
    <Screen subtitle="طلبات مكتوبة بعناية تُملأ من درسك، لتنسخها إلى مساعد الكتابة الذي تسمح به مدرستك. لا يُرسَل شيء من التطبيق.">
      <Txt bold style={{ fontSize: 13, marginBottom: 8 }}>الأمر</Txt>
      {all.map((p, i) => {
        const on = p.id === prompt.id;
        return (
          <Rise key={p.id} index={i}>
            <Tap accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`الأمر: ${p.title}`} onPress={() => { setPick(p.id); setTyped({}); setCopied(''); }}
              style={{ minHeight: 56, borderRadius: 16, borderWidth: 1.5, borderColor: on ? colors.wine : colors.line, backgroundColor: on ? colors.rose : colors.card, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Txt bold style={{ fontSize: 15, color: on ? colors.wine : colors.ink }}>{p.title}</Txt>
                  <Txt style={styles.small}>{p.purpose}</Txt>
                </View>
                {on && <Ionicons name="checkmark-circle" size={22} color={colors.wine} />}
              </View>
            </Tap>
          </Rise>
        );
      })}
      <View style={{ height: 10 }} />
      <Chips label="الدرس" value={lessonId} onChange={v => { setLessonId(v); setCopied(''); }} options={[...data.lessons.map(l => ({ value: l.id, label: l.title || 'مسودة بلا عنوان' })), { value: '', label: 'بلا درس' }]} />
      {blanks.map(name => <Field key={name} label={name} value={typed[name] ?? ''} onChangeText={v => { setTyped({ ...typed, [name]: v }); setCopied(''); }} placeholder={`اكتب: ${name}`} />)}

      <Card style={{ borderTopWidth: 3, borderTopColor: colors.gold }}>
        <Txt bold style={{ fontSize: 16, marginBottom: 8 }}>النص الجاهز</Txt>
        {Platform.OS === 'web'
          ? <TextInput accessibilityLabel="النص الجاهز" multiline readOnly value={text} style={[styles.input, { height: 230, textAlignVertical: 'top', fontSize: 14, lineHeight: 24 }]} />
          : <Txt style={{ fontSize: 14 }}>{text}</Txt>}
        {gaps > 0 && <Txt style={{ color: colors.wine, fontSize: 12, marginTop: 8 }}>بقي في النص {countOf(gaps, 'فراغ', 'فراغان', 'فراغات')} بين قوسين. اختر درسًا أو املأ الخانات أعلاه.</Txt>}
        <Button title={Platform.OS === 'web' ? 'نسخ' : 'مشاركة النص'} icon={Platform.OS === 'web' ? 'copy-outline' : 'share-outline'} onPress={handOver} />
        {!!copied && <Txt style={[styles.small, { marginTop: 8 }]}>{copied}</Txt>}
      </Card>
    </Screen>
  );
}
