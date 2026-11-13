import React, { useState } from 'react';
import { Platform, Share, TextInput, View } from 'react-native';
import { countOf, type Workspace } from '../../../../packages/domain';
import { validateBackup } from '../../../../packages/domain/admin';
import { Screen, Txt, Card, Rise, Button, Orb, colors, styles, copyText } from '../components/ui';
import { useStore } from '../components/store';

// ponytail: counts UTF-16 units, not bytes; close enough for a guard that only keeps a runaway paste away from the parser.
const MAX_LENGTH = 4 * 1024 * 1024;
const box = [styles.input, { height: 150, textAlignVertical: 'top' as const, textAlign: 'left' as const, writingDirection: 'ltr' as const, fontSize: 12, lineHeight: 18 }];

const summary = (w: Workspace) => [
  countOf(w.learners.length, 'طالب', 'طالبان', 'طلاب'),
  countOf(w.lessons.length, 'درس', 'درسان', 'دروس'),
  countOf((w.plans ?? []).length, 'تحضير أسبوعي', 'تحضيران أسبوعيان', 'تحاضير أسبوعية'),
  countOf((w.ieps ?? []).length, 'خطة فردية', 'خطتان فرديتان', 'خطط فردية'),
].join('، ');

/** Moves the workspace between the web site and this device as text the teacher copies and pastes. Nothing is sent to any server. */
export default function Transfer() {
  const { data, replaceAll } = useStore();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Workspace | null>(null);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState('');
  const [exported, setExported] = useState('');
  const [copied, setCopied] = useState('');

  const check = () => {
    setDone(''); setPending(null);
    if (text.length > MAX_LENGTH) return setProblem('النص أكبر من 4 ميغابايت. لم تتغيّر بياناتك.');
    try {
      setPending(validateBackup(JSON.parse(text)));
      setProblem('');
    } catch {
      setProblem('النص ليس نسخة سليمة من مساحة العمل. لم تتغيّر بياناتك.');
    }
  };
  const replace = async () => {
    if (!pending) return;
    try {
      await replaceAll(pending);
      setDone(`تم الاستيراد: ${summary(pending)}.`);
      setText('');
    } catch {
      setProblem('تعذّر حفظ النسخة على الجهاز. لم تتغيّر بياناتك.');
    }
    setPending(null);
  };
  const share = async () => {
    const json = JSON.stringify(data);
    setCopied('');
    if (Platform.OS === 'web') return setExported(json);
    try { await Share.share({ message: json }); } catch { setExported(json); }
  };
  const copy = async () => {
    setCopied(await copyText(exported) ? 'نُسخ النص. الصقه في خانة الاستيراد على الموقع.' : 'تعذّر النسخ تلقائيًا. حدّد النص في الخانة وانسخه.');
  };

  return (
    <Screen subtitle="انقل مساحة عملك بين موقع وتد وهذا الجهاز نصًّا تنسخه وتلصقه. لا يُرسَل شيء إلى أي خادم.">
      <Rise>
        <Card>
          <View style={[styles.row, { marginBottom: 12 }]}>
            <Orb icon="download-outline" tone="gold" />
            <View style={{ flex: 1 }}>
              <Txt bold style={{ fontSize: 18 }}>استيراد نسخة من الموقع</Txt>
              <Txt style={styles.small}>الصق نص النسخة الاحتياطية التي يصدّرها الموقع.</Txt>
            </View>
          </View>
          <TextInput accessibilityLabel="نص النسخة الاحتياطية" multiline autoCapitalize="none" autoCorrect={false} value={text} onChangeText={v => { setText(v); setPending(null); setProblem(''); }} placeholder="الصق النص هنا" placeholderTextColor={colors.muted} style={box} />
          {!!problem && <Txt accessibilityRole="alert" bold style={{ color: colors.wine, fontSize: 13, marginTop: 10 }}>{problem}</Txt>}
          {!!done && <Txt bold style={{ color: colors.green, fontSize: 13, marginTop: 10 }}>{done}</Txt>}
          {pending
            ? <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: colors.sand }}>
                <Txt bold style={{ fontSize: 14 }}>النسخة سليمة: {summary(pending)}.</Txt>
                <Txt style={{ fontSize: 13 }}>الاستيراد يستبدل كل ما على هذا الجهاز الآن، ولا يمكن التراجع عنه.</Txt>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}><Button title="نعم، استبدل البيانات" onPress={replace} /></View>
                  <View style={{ flex: 1 }}><Button secondary title="إلغاء" onPress={() => setPending(null)} /></View>
                </View>
              </View>
            : <Button title="استيراد" icon="download-outline" disabled={!text.trim()} onPress={check} />}
        </Card>
      </Rise>

      <Rise index={1}>
        <Card>
          <View style={[styles.row, { marginBottom: 4 }]}>
            <Orb icon="share-outline" tone="olive" />
            <View style={{ flex: 1 }}>
              <Txt bold style={{ fontSize: 18 }}>تصدير نسخة من هذا الجهاز</Txt>
              <Txt style={styles.small}>الآن على الجهاز: {summary(data)}.</Txt>
            </View>
          </View>
          <Button secondary title="تصدير النسخة" icon="share-outline" onPress={share} />
          {!!exported && (
            <View style={{ marginTop: 14 }}>
              <TextInput accessibilityLabel="نسخة هذا الجهاز" multiline readOnly selectTextOnFocus value={exported} style={box} />
              <Button title="نسخ" icon="copy-outline" onPress={copy} />
              {!!copied && <Txt style={[styles.small, { marginTop: 8 }]}>{copied}</Txt>}
            </View>
          )}
        </Card>
      </Rise>
    </Screen>
  );
}
