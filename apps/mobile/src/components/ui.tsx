import { latinDigits } from '../../../../packages/domain/numbers';
import React, { ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, PressableProps, ScrollView, StyleSheet, Switch, SwitchProps, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Lesson, statusLabels } from '../../../../packages/domain';
import { day, today } from '../../../../packages/domain/planning';
import { useStore } from './store';

/** The Watad identity: deep maroon, gold, cream. The older names (wine, green, sage, rose, sand) are kept so every screen follows. */
export const colors = {
  wine: '#5c1523', wineDark: '#4a0f1b', wineDeep: '#3b0a14',
  gold: '#c9a96e', goldDeep: '#a8853a', goldLight: '#dfc48e',
  ink: '#2f241c', muted: '#7a6a58', line: '#ebe1cd', bg: '#fcf9f2', card: '#ffffff',
  green: '#5d6b3c', sage: '#eef0e2', rose: '#f6e9ea', sand: '#f7eedb', track: '#e6dcc8',
};
export type Icon = keyof typeof Ionicons.glyphMap;
export type Tone = 'wine' | 'olive' | 'gold' | 'neutral';
const tones: Record<Tone, { bg: string; fg: string }> = {
  wine: { bg: colors.rose, fg: colors.wine },
  olive: { bg: colors.sage, fg: colors.green },
  gold: { bg: colors.sand, fg: '#7a5c1c' },
  neutral: { bg: '#f1ece2', fg: colors.muted },
};

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled().then(v => { reduceMotion = v; }).catch(() => {});

export function Txt({ children, style, bold = false, accessibilityRole }: { children: ReactNode; style?: TextStyle | TextStyle[]; bold?: boolean; accessibilityRole?: 'header' | 'alert' }) {
  return (
    <Text accessibilityRole={accessibilityRole} style={[styles.text, bold && styles.bold, style]}>
      {React.Children.map(children, child => typeof child === 'string' ? latinDigits(child) : child)}
    </Text>
  );
}

/** A touchable that always answers the finger: it dims while pressed. */
export function Tap({ style, ...props }: PressableProps) {
  return <Pressable accessibilityRole="button" {...props} style={state => [typeof style === 'function' ? style(state) : style, state.pressed && styles.pressed]} />;
}

/** Fades and lifts its content in once; `index` staggers a list. Skipped when the device asks for less motion. */
export function Rise({ children, index = 0, style }: { children: ReactNode; index?: number; style?: ViewStyle }) {
  const [value] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(value, { toValue: 1, duration: 280, delay: Math.min(index, 8) * 45, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [value, index]);
  return <Animated.View style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{children}</Animated.View>;
}

export function Screen({ children, title, subtitle, header }: { children?: ReactNode; title?: string; subtitle?: string; header?: ReactNode }) {
  const { ready, error } = useStore();
  if (!ready) return <SafeAreaView style={styles.screen}><ActivityIndicator style={{ marginTop: 90 }} color={colors.wine} /><Txt style={{ textAlign: 'center', marginTop: 20 }}>جارٍ فتح مساحتك…</Txt></SafeAreaView>;
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {header}
        <View style={styles.content}>
          {title && <Txt accessibilityRole="header" bold style={styles.heading}>{title}</Txt>}
          {subtitle && <Txt style={styles.subtitle}>{subtitle}</Txt>}
          {error && <Card><Txt style={{ color: colors.wine }}>{error}</Txt></Card>}
          {children}
          <Txt style={styles.footnote}>نسخة تجريبية · البيانات على هذا الجهاز فقط</Txt>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ title, onPress, secondary, disabled, icon, small }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: Icon; small?: boolean }) {
  const fg = secondary ? colors.wine : '#fff';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondary, small && styles.buttonSmall, disabled && { opacity: .45 }, pressed && styles.pressedButton]}>
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Txt bold style={{ color: fg, fontSize: 14 }}>{title}</Txt>
    </Pressable>
  );
}

export function Badge({ status }: { status: Lesson['status'] }) {
  return <Tag label={statusLabels[status]} tone={status === 'approved' ? 'olive' : status === 'review' ? 'gold' : 'neutral'} />;
}

/** A small coloured label for a state. */
export function Tag({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: Icon }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon && <Ionicons name={icon} size={13} color={t.fg} />}
      <Txt bold style={{ color: t.fg, fontSize: 11, lineHeight: 18 }}>{label}</Txt>
    </View>
  );
}

/** The round coloured seat an icon sits in at the head of a card. */
export function Orb({ icon, tone = 'wine', size = 44 }: { icon: Icon; tone?: Tone; size?: number }) {
  const t = tones[tone];
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={size * .48} color={t.fg} /></View>;
}

export function Field({ label, value, onChangeText, multiline, numeric, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; multiline?: boolean; numeric?: boolean; placeholder?: string }) {
  return (
    <View style={{ gap: 8, marginBottom: 17 }}>
      <Txt bold style={{ fontSize: 13 }}>{label}</Txt>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline} keyboardType={numeric ? 'number-pad' : 'default'} placeholder={placeholder} placeholderTextColor="#a2937f" style={[styles.input, multiline && { minHeight: 100, textAlignVertical: 'top' }]} />
    </View>
  );
}

export function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && { borderColor: colors.wine, backgroundColor: colors.rose }, pressed && styles.pressed]}>
      <Txt style={{ color: selected ? colors.wine : colors.muted, fontSize: 13 }}>{label}</Txt>
      {selected && <Ionicons name="checkmark" size={17} color={colors.wine} />}
    </Pressable>
  );
}

/** The on-off switch in the identity colours: olive when on, a light neutral track when off. react-native-web paints the "on" state from its own props, so those are passed too. */
export function Toggle(props: SwitchProps) {
  const web = Platform.OS === 'web' ? { activeTrackColor: colors.green, activeThumbColor: colors.card } : {};
  return <Switch {...props} {...web} trackColor={{ true: colors.green, false: colors.track }} thumbColor={colors.card} ios_backgroundColor={colors.track} />;
}

/** One choice among a few, as pills that wrap. */
export function Chips<T extends string | number>({ label, options, value, onChange }: { label?: string; options: { value: T; label: string }[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <View style={{ marginBottom: 15 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label && <Txt bold style={{ fontSize: 13, marginBottom: 8 }}>{label}</Txt>}
      <View style={styles.chips}>
        {options.map(o => {
          const on = o.value === value;
          return (
            <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityLabel={o.label} accessibilityState={{ selected: on }} onPress={() => onChange(o.value)} style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}>
              <Txt bold={on} style={{ fontSize: 13, color: on ? '#fff' : colors.ink }}>{o.label}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A screen with nothing in it yet: what it is for, and the one thing to do next. */
export function Empty({ icon, title, text, action, onAction }: { icon: Icon; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
      <Orb icon={icon} tone="gold" size={64} />
      <Txt bold style={{ fontSize: 18, textAlign: 'center', marginTop: 14 }}>{title}</Txt>
      {text && <Txt style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>{text}</Txt>}
      {action && onAction && <View style={{ alignSelf: 'stretch', marginTop: 8 }}><Button title={action} icon="add" onPress={onAction} /></View>}
    </Card>
  );
}

/** A weekday and a date the way a teacher says it: «الخميس 13 نوفمبر». */
export const dayLabel = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`).toLocaleDateString('ar-QA-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }) : 'بلا موعد';
/** Day and month as digits, for tight rows: 13/11. */
export const shortDate = (date: string) => `${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`;
/** A pupil's first name, without the «تجريبي» mark of the demo files. */
export const firstName = (name: string) => name.split(/\s|·/)[0];

/** A date chosen without typing: step a day at a time, or jump with one tap. */
export function DateField({ label, value, onChange, optional }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean }) {
  const now = today();
  const step = (n: number) => onChange(day(value || now, n));
  const jumps: [string, string][] = [['اليوم', now], ['غدًا', day(now, 1)], ['بعد أسبوع', day(now, 7)], ['بعد شهر', day(now, 28)]];
  if (optional) jumps.push(['بلا موعد', '']);
  return (
    <View style={{ marginBottom: 15 }}>
      <Txt bold style={{ fontSize: 13, marginBottom: 8 }}>{label}</Txt>
      <View style={[styles.row, { marginBottom: 9 }]}>
        <Tap accessibilityLabel={`${label}: اليوم السابق`} onPress={() => step(-1)} style={styles.stepper}><Ionicons name="chevron-forward" size={20} color={colors.wine} /></Tap>
        <View style={styles.dateBox}><Txt bold style={{ textAlign: 'center', fontSize: 14 }}>{dayLabel(value)}</Txt></View>
        <Tap accessibilityLabel={`${label}: اليوم التالي`} onPress={() => step(1)} style={styles.stepper}><Ionicons name="chevron-back" size={20} color={colors.wine} /></Tap>
      </View>
      <View style={styles.chips}>
        {jumps.map(([text, date]) => (
          <Tap key={text} accessibilityLabel={`${label}: ${text}`} onPress={() => onChange(date)} style={[styles.chip, styles.chipQuiet, value === date && { borderColor: colors.gold, backgroundColor: colors.sand }]}>
            <Txt style={{ fontSize: 12, color: colors.ink }}>{text}</Txt>
          </Tap>
        ))}
      </View>
    </View>
  );
}

/** Picks one pupil; every list on the desk is about one pupil at a time, never a comparison. */
export function PupilChips({ value, onChange, label = 'الطالب' }: { value: string; onChange: (id: string) => void; label?: string }) {
  const { data } = useStore();
  return <Chips label={label} value={value} onChange={onChange} options={data.learners.map(l => ({ value: l.id, label: firstName(l.name) }))} />;
}

/** The frame of every small form on the desk: a title, the fields, save and cancel. */
export function FormCard({ title, children, onSave, onCancel, canSave = true, saveLabel = 'حفظ' }: { title: string; children: ReactNode; onSave: () => void; onCancel: () => void; canSave?: boolean; saveLabel?: string }) {
  return (
    <Rise>
      <Card style={{ borderTopWidth: 3, borderTopColor: colors.gold }}>
        <Txt bold style={{ fontSize: 18, marginBottom: 14 }}>{title}</Txt>
        {children}
        <View style={[styles.row, { marginTop: 4 }]}>
          <View style={{ flex: 1 }}><Button title={saveLabel} icon="checkmark" disabled={!canSave} onPress={onSave} /></View>
          <View style={{ flex: 1 }}><Button secondary title="إلغاء" onPress={onCancel} /></View>
        </View>
      </Card>
    </Rise>
  );
}

/** Numbered steps, one under the other. */
export function Steps({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 10 }}>
      {items.map((text, i) => (
        <View key={i} style={[styles.row, { alignItems: 'flex-start' }]}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center' }}>
            <Txt bold style={{ fontSize: 13, lineHeight: 20, color: colors.wine }}>{i + 1}</Txt>
          </View>
          <Txt style={{ flex: 1, fontSize: 14 }}>{text}</Txt>
        </View>
      ))}
    </View>
  );
}

/** Puts text on the clipboard where the browser allows it; false means the reader has to select and copy by hand. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await (globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } }).navigator!.clipboard!.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const shadow = { boxShadow: '0 1px 2px rgba(59, 10, 20, 0.05), 0 6px 16px rgba(59, 10, 20, 0.06), 0 18px 36px rgba(59, 10, 20, 0.04)' };
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 32, maxWidth: 850, width: '100%', alignSelf: 'center' },
  text: { fontFamily: 'Tajawal_500Medium', color: colors.ink, fontSize: 15, lineHeight: 25, textAlign: 'right', writingDirection: 'rtl' },
  bold: { fontFamily: 'Tajawal_700Bold' },
  heading: { fontSize: 26, lineHeight: 40, marginBottom: 4, color: colors.wine },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 24, marginBottom: 22 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, ...shadow },
  pressed: { opacity: .72 },
  pressedButton: { opacity: .85, transform: [{ scale: .985 }] },
  button: { minHeight: 50, borderRadius: 14, backgroundColor: colors.wine, padding: 13, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 10 },
  buttonSmall: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 14, marginTop: 0 },
  secondary: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.goldLight },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  input: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, backgroundColor: '#fff', minHeight: 49, padding: 13, fontFamily: 'Tajawal_500Medium', fontSize: 15, textAlign: 'right', writingDirection: 'rtl', color: colors.ink },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  spread: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  small: { color: colors.muted, fontSize: 12 },
  sectionTitle: { fontSize: 19, marginBottom: 14, marginTop: 10 },
  choice: { minHeight: 48, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 9 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, minWidth: 52, maxWidth: '100%', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.wine, borderColor: colors.wine },
  chipQuiet: { backgroundColor: colors.bg },
  stepper: { width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: colors.goldLight, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dateBox: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: colors.sand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  footnote: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 24 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line, marginVertical: 17 },
});
