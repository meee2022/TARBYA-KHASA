import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet, AccessibilityInfo, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { communicationTiles, SymbolName, Tile } from '../../../../packages/domain/games';
import type { TemplateId } from '../../../../packages/domain/packs';
import { colors, Txt } from './ui';
export function LearningSymbol({ name, size = 52, color = colors.green }: { name?: SymbolName; size?: number; color?: string }) {
  const symbols = { bird: 'bird', fish: 'fish', leaf: 'leaf', book: 'book-open-variant', cup: 'coffee-outline', water: 'water', hand: 'hand-back-right-outline', soap: 'hand-wash', towel: 'rectangle-outline', help: 'help-circle-outline', pause: 'pause', repeat: 'replay', yes: 'check', no: 'close' } as const;
  return <View accessible={false} importantForAccessibility="no-hide-descendants"><MaterialCommunityIcons name={name ? symbols[name] : 'book-open-variant'} size={size} color={color} /></View>;
}
export async function say(text: string, enabled: boolean) {
  // Let the system reader announce the live region instead of overlapping speech.
  if (await AccessibilityInfo.isScreenReaderEnabled()) { AccessibilityInfo.announceForAccessibility(text); return; }
  if (!enabled) return;
  try {
    await Speech.stop(); Speech.speak(text, { language: 'ar-QA', rate: .8, onError: () => Alert.alert('الصوت غير متاح', 'يمكنك استخدام الرسالة المكتوبة على الشاشة.') });
  } catch { Alert.alert('الصوت غير متاح', 'يمكنك استخدام الرسالة المكتوبة على الشاشة.'); }
}
// Shared pack pictures live on the website; teacher uploads stay in that browser and are not on this device.
export const SITE = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://tarbyakhassa.netlify.app';
/** Pack activities the app plays: all of the website's pack activities. */
export const nativeTemplates: TemplateId[] = ['cards', 'choose-word', 'choose-picture', 'listen', 'door', 'repeat', 'match', 'memory', 'puzzle', 'build', 'classify', 'sequence', 'robot'];
export function TileArt({ tile, size = 96 }: { tile: Pick<Tile, 'emoji' | 'imageId'>; size?: number }) {
  const uri = tile.imageId?.startsWith('/') ? SITE + tile.imageId : tile.imageId?.startsWith('https://') ? tile.imageId : undefined;
  if (uri) return <Image accessible={false} source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" />;
  return tile.emoji ? <Text accessible={false} style={{ fontSize: size * .6, lineHeight: size * .8 }}>{tile.emoji}</Text> : null;
}
/** Speaks a pack word in its own language, so an English word never gets an Arabic voice. */
export async function sayTile(tile: Pick<Tile, 'label' | 'lang'>, enabled: boolean) {
  if (await AccessibilityInfo.isScreenReaderEnabled()) { AccessibilityInfo.announceForAccessibility(tile.label); return; }
  if (!enabled) return;
  await Speech.stop(); Speech.speak(tile.label, { language: tile.lang === 'en' ? 'en-GB' : 'ar-QA', rate: .8 });
}
export function CommunicationBoard({ sound, onBreak, onRepeat, contrast = false, words }: { sound: boolean; onBreak: () => void; onRepeat: () => void; contrast?: boolean; words?: Tile[] }) {
  const [message, setMessage] = useState('');
  return <View style={supportStyles.board}><Txt bold style={{ fontSize: 21, marginBottom: 10, color: contrast ? '#000' : colors.ink }}>أعبّر بطريقتي</Txt><View style={supportStyles.grid}>{communicationTiles.map(tile => <Pressable key={tile.id} accessibilityRole="button" accessibilityLabel={tile.label} style={[supportStyles.message, contrast && { borderColor: '#000' }]} onPress={() => { setMessage(tile.label); if (tile.id === 'repeat') { onRepeat(); return; } void say(tile.label, sound); if (tile.id === 'break') onBreak(); }}><LearningSymbol name={tile.symbol} size={29} color={contrast ? '#000' : colors.green} /><Txt bold style={{ fontSize: 16, textAlign: 'center', color: contrast ? '#000' : colors.ink }}>{tile.label}</Txt></Pressable>)}</View>{!!words?.length && <><Txt bold style={{ fontSize: 17, marginTop: 18, marginBottom: 10, color: contrast ? '#000' : colors.ink }}>كلمات الدرس</Txt><View style={supportStyles.grid}>{words.map(w => <Pressable key={w.id} accessibilityRole="button" accessibilityLabel={w.label} style={[supportStyles.message, contrast && { borderColor: '#000' }]} onPress={() => { setMessage(w.label); void sayTile(w, sound); }}><TileArt tile={w} size={56} /><Txt bold style={{ fontSize: 16, textAlign: 'center', color: contrast ? '#000' : colors.ink }}>{w.label}</Txt></Pressable>)}</View></>}<Text accessibilityLiveRegion="polite" style={supportStyles.messageText}>{message}</Text></View>;
}
const supportStyles = StyleSheet.create({ board: { marginTop: 25, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 20 }, grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 }, message: { flexGrow: 1, flexBasis: '45%', minHeight: 108, borderWidth: 1, borderColor: '#b6c5a7', borderRadius: 12, backgroundColor: '#fff', padding: 16, alignItems: 'center', justifyContent: 'center', gap: 13 }, messageText: { fontFamily: 'Tajawal_500Medium', color: colors.ink, fontSize: 16, textAlign: 'right', marginTop: 15 } });
