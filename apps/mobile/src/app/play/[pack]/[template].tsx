import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Switch, Text, Vibration, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { uid } from '../../../../../../packages/domain';
import { defaultCatalog } from '../../../../../../packages/domain/catalog';
import { accessFromPreferences, AccessSettings, defaultAccess, fitRounds, gameOptions, GameRound, lessonWords, missedRounds, PracticeAttempt, practiceSummary, roundAtLevel, Tile } from '../../../../../../packages/domain/games';
import { PlayableGame, playablePack, shortPrompts, templateBlocker } from '../../../../../../packages/domain/packs';
import { Button, Card, Choice, colors, Screen, styles, Txt } from '../../../components/ui';
import { CommunicationBoard, nativeTemplates, say, sayTile, TileArt } from '../../../components/learning';
import { useStore } from '../../../components/store';
import { BuildBoard, MatchBoard, MemoryBoard, PuzzleBoard, RobotBoard } from '../../../components/boards';

/** A pack activity on the device, built by the same domain code as the website. */
export default function PackActivity() {
  const { pack: packId, template } = useLocalSearchParams<{ pack: string; template: string }>();
  const { data } = useStore();
  const pack = [...(data.packs ?? []), ...defaultCatalog.packs].find(p => p.id === packId);
  const info = defaultCatalog.templates.find(t => t.id === template);
  if (!pack || !info || !nativeTemplates.includes(info.id)) return <Screen title="النشاط غير متاح" subtitle="هذا النشاط على الموقع فقط حاليًا." />;
  const blocker = templateBlocker(info.id, pack);
  if (blocker) return <Screen title={info.title} subtitle={blocker} />;
  return <Setup build={choices => playablePack(pack, info, choices)} />;
}

const toggles: [keyof AccessSettings, string][] = [['large', 'نص أكبر'], ['contrast', 'تباين مرتفع'], ['speech', 'قراءة صوتية'], ['textAlternative', 'وصف نصي بدل الصورة'], ['shortInstructions', 'تعليمة قصيرة'], ['repeatMissed', 'إعادة ما أخطأ فيه في آخر الجولة'], ['vibrate', 'اهتزاز عند الإجابة']];

function Setup({ build }: { build: (choices: number) => PlayableGame }) {
  const { data } = useStore(); const [learnerId, setLearnerId] = useState(''); const [access, setAccess] = useState<AccessSettings>({ ...defaultAccess }); const [started, setStarted] = useState(0);
  const game = useMemo(() => { const g = build(access.choices); return { ...g, rounds: fitRounds(g.rounds, access.rounds).map(r => roundAtLevel(r, access.level)) }; }, [build, access.choices, access.rounds, access.level]);
  const needsSound = (game.template === 'listen' || game.template === 'repeat') && !access.speech;
  if (started) return <Player key={started} game={game} access={access} learnerId={learnerId} onRestart={() => setStarted(0)} />;
  return <Screen title={game.title} subtitle={`${game.rounds.length} مهام قصيرة، بلا مؤقّت.`}>
    <Card><Txt bold style={styles.sectionTitle}>ملف الطالب</Txt>
      <Choice label="تجربة دون ملف" selected={!learnerId} onPress={() => { setLearnerId(''); setAccess({ ...defaultAccess }); }} />
      {data.learners.map(s => <Choice key={s.id} label={s.name} selected={s.id === learnerId} onPress={() => { setLearnerId(s.id); setAccess(accessFromPreferences(s.preferences)); }} />)}</Card>
    <Card><Txt bold style={styles.sectionTitle}>ما يحتاجه الآن</Txt>
      {toggles.map(([key, label]) => <View key={key} style={ps.toggle}><Txt style={{ flex: 1 }}>{label}</Txt><Switch accessibilityLabel={label} value={!!access[key]} onValueChange={v => setAccess(a => ({ ...a, [key]: v }))} /></View>)}
      <Txt bold style={{ marginTop: 16 }}>عدد الخيارات</Txt><View style={ps.row}>{([1, 2, 3, 4] as const).map(n => <Choice key={n} label={n === 1 ? 'خيار واحد' : `${n}`} selected={access.choices === n} onPress={() => setAccess(a => ({ ...a, choices: n }))} />)}</View>
      <Txt bold style={{ marginTop: 16 }}>مستوى العرض</Txt><View style={ps.row}>{([['photo', 'صورة وكلمة'], ['symbol', 'رمز وكلمة'], ['word', 'كلمة فقط']] as const).map(([v, l]) => <Choice key={v} label={l} selected={(access.level ?? 'photo') === v} onPress={() => setAccess(a => ({ ...a, level: v }))} />)}</View></Card>
    {needsSound && <Card><Txt style={{ color: colors.wine }}>هذا النشاط يحتاج الصوت. لطالب لا يعتمد على السمع، اختر «أين الصورة؟».</Txt></Card>}
    <Button title="نبدأ النشاط" icon="play" disabled={needsSound || !game.rounds.length} onPress={() => setStarted(Date.now())} />
  </Screen>;
}

function Player({ game, access, learnerId, onRestart }: { game: PlayableGame; access: AccessSettings; learnerId: string; onRestart: () => void }) {
  const { savePractice } = useStore();
  const [rounds, setRounds] = useState(game.rounds); const [index, setIndex] = useState(0); const [choice, setChoice] = useState(''); const [checked, setChecked] = useState(false); const [opened, setOpened] = useState(false);
  const [hint, setHint] = useState(false); const [attempts, setAttempts] = useState<PracticeAttempt[]>([]); const [done, setDone] = useState(false); const [paused, setPaused] = useState(false); const [message, setMessage] = useState(''); const [saved, setSaved] = useState(false);
  const round: GameRound | undefined = rounds[index]; const options = useMemo(() => round ? gameOptions(round, access.choices) : [], [round, access.choices]); const words = useMemo(() => lessonWords(game.rounds), [game.rounds]);
  const shown = round ? access.shortInstructions ? shortPrompts[game.template] ?? round.prompt : round.prompt : '';
  const ink = access.contrast ? '#000' : colors.ink; const big = access.large ? 1.3 : 1;
  useEffect(() => () => { Speech.stop(); }, []);
  useEffect(() => { if (!round || done || paused) return; AccessibilityInfo.announceForAccessibility(shown); if (game.template === 'repeat' && round.target) void sayTile(round.target, access.speech); }, [index, done, paused]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!round && !done) return <Screen title="لا توجد مهام" />;
  const tell = (text: string) => { setMessage(text); void say(text, access.speech); };
  const record = (list: PracticeAttempt[]) => setAttempts(a => [...a, ...list.map(x => index >= game.rounds.length ? { ...x, repeat: true } : x)]);
  const settle = (correct: boolean, text: string) => { setChecked(true); if (access.vibrate) Vibration.vibrate(correct ? 60 : [0, 30, 90, 30]); tell(text); };
  const answer = (id: string) => { if (checked || !round) return; const correct = id === round.answerId; record([{ roundId: round.id, selected: id, correct, hintUsed: hint || options.length === 1 }]); settle(correct, correct ? 'أحسنت.' : `لنتعلّمها معًا. ${round.hint}`); };
  const rate = (said: 'yes' | 'help' | 'no') => { if (checked || !round) return; record([{ roundId: round.id, selected: said, correct: said !== 'no', hintUsed: said === 'help' }]); settle(said !== 'no', said === 'no' ? `نحاول مرة أخرى لاحقًا. الكلمة: ${round.target?.label ?? ''}` : 'أحسنت.'); };
  const next = () => {
    Speech.stop(); const again = access.repeatMissed && rounds.length === game.rounds.length ? missedRounds(rounds, attempts) : [];
    if (again.length && index + 1 === rounds.length) { setRounds(r => [...r, ...again.map(x => ({ ...x, id: `${x.id}~again` }))]); setIndex(i => i + 1); }
    else if (index + 1 === rounds.length) setDone(true); else setIndex(i => i + 1);
    setChoice(''); setChecked(false); setHint(false); setOpened(false); setMessage('');
  };
  if (done) { const summary = practiceSummary(attempts); return <Screen title="لكل محاولة قيمة" subtitle={`أنهيت ${rounds.length} مهام في ${game.title}.`}><Card>{game.template !== 'cards' && <><Txt bold style={{ fontSize: 24 }}>المحاولة الأولى الصحيحة: {summary.correct} من {summary.total}</Txt><Txt style={{ marginTop: 12 }}>صحيحة دون تلميح: {summary.independent}</Txt></>}<Txt style={{ color: colors.muted, marginVertical: 20 }}>النتيجة للتدريب، ولا تثبت وحدها تحقق هدف فردي.</Txt>
    {learnerId && <Button title={saved ? 'حُفظ سجل التدريب' : 'حفظ سجل التدريب في ملف الطالب'} disabled={saved} onPress={() => { void savePractice({ id: uid(), gameId: game.id, title: game.title, learnerId, date: new Date().toISOString(), attempts, access }).then(() => setSaved(true)); }} />}
    <Button secondary title="جولة جديدة" icon="refresh" onPress={onRestart} /></Card></Screen>; }
  if (paused) return <Screen title="نأخذ استراحة" subtitle="لا يوجد مؤقّت. عد عندما تكون مستعدًا."><Button title="أنا مستعد للعودة" icon="play-outline" onPress={() => setPaused(false)} /></Screen>;
  const isCards = game.template === 'cards'; const isRepeat = game.template === 'repeat'; const isRobot = game.template === 'robot'; const usesBoard = !!round!.board; const showOptions = options.length > 0 && !isRobot && (!round!.reveal || opened);
  const boardProps = { round: round!, hinted: hint, big, ink, speakTile: (t: Tile) => void sayTile(t, access.speech), say: tell, onDone: (result: PracticeAttempt[], text: string) => { record(result); settle(true, text); } };
  const name = (t: Tile) => t.hideLabel ? t.description || t.label : access.textAlternative && t.description ? `${t.label}. ${t.description}` : t.label;
  return <Screen key={`task-${index}`}>
    <View style={styles.spread}><Txt style={styles.small}>الخطوة {index + 1} من {rounds.length}</Txt><Button secondary title="استراحة" icon="pause" onPress={() => { Speech.stop(); setPaused(true); }} /></View>
    <View style={[ps.task, access.contrast && { borderColor: '#000' }]}>
      <Txt accessibilityRole="header" bold style={{ fontSize: 26 * big, lineHeight: 42 * big, color: ink, textAlign: 'center' }}>{shown}</Txt>
      {round!.listen ? <Button secondary title="استمع إلى الكلمة" icon="volume-medium-outline" onPress={() => void sayTile(round!.listen!, true)} />
        : round!.target && !usesBoard && (!round!.reveal || opened) && <Pressable accessibilityRole={isCards ? 'button' : 'image'} accessibilityLabel={isCards ? `${round!.target.label}. اضغط للتالية` : name(round!.target)} disabled={!isCards} onPress={next} style={[ps.target, access.contrast && { backgroundColor: '#fff', borderWidth: 2, borderColor: '#000' }]}>
          {!(access.textAlternative && round!.target.hideLabel) && <TileArt tile={round!.target} size={130 * big} />}{(!round!.target.hideLabel || access.textAlternative) && <Txt bold style={{ fontSize: 28 * big, lineHeight: 42 * big, color: ink, textAlign: 'center' }}>{access.textAlternative && round!.target.hideLabel ? round!.target.description ?? round!.target.label : round!.target.label}</Txt>}</Pressable>}
      {round!.reveal && !opened && <Button title="افتح الباب" icon="key-outline" onPress={() => setOpened(true)} />}
      {(isRepeat || isCards) && access.speech && round!.target && <Button secondary title="استمع" icon="volume-medium-outline" onPress={() => void sayTile(round!.target!, true)} />}
      {showOptions && <View style={{ gap: 14, marginTop: 20 }}>{options.map(tile => <Pressable key={tile.id} accessibilityRole="button" accessibilityLabel={name(tile)} accessibilityState={{ selected: choice === tile.id, disabled: checked }} disabled={checked} onPress={() => { setChoice(tile.id); if (access.speech && !tile.hideLabel) void sayTile(tile, true); if (access.instant) answer(tile.id); }}
        style={[ps.option, { minHeight: 110 * big, borderColor: access.contrast ? '#000' : choice === tile.id ? colors.wine : '#adbd9b', backgroundColor: choice === tile.id ? access.contrast ? '#000' : colors.rose : '#fff' }, checked && tile.id === round!.answerId && { borderColor: colors.green, borderWidth: 4 }]}>
        <TileArt tile={tile} size={72 * big} />{!tile.hideLabel && <Txt bold style={{ fontSize: 24 * big, lineHeight: 36 * big, flex: 1, color: choice === tile.id && access.contrast ? '#fff' : ink }}>{tile.label}</Txt>}</Pressable>)}</View>}
      {game.template === 'match' && <MatchBoard key={round!.id} {...boardProps} />}{game.template === 'memory' && <MemoryBoard key={round!.id} {...boardProps} />}{game.template === 'puzzle' && <PuzzleBoard key={round!.id} {...boardProps} />}{game.template === 'build' && <BuildBoard key={round!.id} {...boardProps} />}
      {isRobot && <RobotBoard key={round!.id} options={options} disabled={checked} onSelect={t => { setChoice(t.id); answer(t.id); }} />}
      {isRepeat && !checked && <View style={ps.rate} accessibilityLabel="تسجيل المعلم للمحاولة"><Txt style={styles.small}>للمعلم:</Txt><Button title="قالها" icon="checkmark" onPress={() => rate('yes')} /><Button secondary title="قالها بمساعدة" icon="hand-left-outline" onPress={() => rate('help')} /><Button secondary title="لم يقلها بعد" icon="refresh" onPress={() => rate('no')} /></View>}
      {!isCards && !isRepeat && !checked && <><Button secondary title="أرني تلميحًا" icon="bulb-outline" onPress={() => { setHint(true); tell(round!.hint); }} />{!access.instant && !usesBoard && !isRobot && <Button title="تحقّق" icon="checkmark" disabled={!choice} onPress={() => answer(choice)} />}</>}
      {checked && <Button title={index + 1 === rounds.length ? 'أنهيت النشاط' : 'الخطوة التالية'} icon="chevron-back" onPress={next} />}
      <Text accessibilityLiveRegion="polite" style={[ps.feedback, { color: ink, fontSize: 18 * big }]}>{message}</Text>
    </View>
    <CommunicationBoard sound={access.speech} contrast={access.contrast} words={words} onBreak={() => setPaused(true)} onRepeat={() => tell(shown)} />
  </Screen>;
}
const ps = StyleSheet.create({ task: { marginTop: 20, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 20, backgroundColor: '#fff' }, target: { backgroundColor: '#eff4e6', padding: 22, borderRadius: 16, marginTop: 18, alignItems: 'center', gap: 12 }, option: { flexDirection: 'row-reverse', alignItems: 'center', gap: 18, padding: 18, borderWidth: 2, borderRadius: 16 }, feedback: { fontFamily: 'Tajawal_500Medium', textAlign: 'center', marginTop: 16, lineHeight: 30 }, toggle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.line }, row: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 }, rate: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: colors.sand, gap: 6 } });
