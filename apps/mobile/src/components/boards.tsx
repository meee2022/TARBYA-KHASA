import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { arrange, boardAttempt, GameRound, PracticeAttempt, puzzleOrder, Tile } from '../../../../packages/domain/games';
import { wordLetters } from '../../../../packages/domain/packs';
import { colors, Txt } from './ui';
import { SITE, TileArt } from './learning';

// The same board games as the website, drawn with native buttons so TalkBack, VoiceOver and Switch Access reach every piece.
export type BoardProps = { round: GameRound; hinted: boolean; big: number; ink: string; speakTile: (tile: Tile) => void; onDone: (attempts: PracticeAttempt[], message: string) => void; say: (text: string) => void };

function Piece({ label, selected, solved, disabled, onPress, children, style }: { label: string; selected?: boolean; solved?: boolean; disabled?: boolean; onPress: () => void; children: React.ReactNode; style?: object }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[bs.piece, selected && bs.selected, solved && bs.solved, style]}>{children}{solved && <Ionicons name="checkmark-circle" size={24} color={colors.green} style={bs.tick} />}</Pressable>;
}

export function MatchBoard({ round, hinted, big, ink, speakTile, onDone, say }: BoardProps) {
  const tiles = round.board!; const pictures = useMemo(() => arrange(tiles, round.id), [tiles, round.id]);
  const [word, setWord] = useState(''); const [done, setDone] = useState<string[]>([]); const [wrong] = useState(() => new Set<string>());
  const press = (tile: Tile) => {
    if (!word) { say('اختر الكلمة أولًا.'); return; }
    if (tile.id !== word) { wrong.add(word); say('لنحاول مرة أخرى.'); return; }
    const next = [...done, tile.id]; setDone(next); setWord(''); speakTile(tile);
    if (next.length === tiles.length) onDone(tiles.map(t => boardAttempt(round, t, wrong, hinted || tiles.length === 1)), 'طابقت كل البطاقات. أحسنت.');
  };
  return <View style={bs.columns}>
    <View style={bs.column} accessibilityLabel="الكلمات">{tiles.map(t => <Piece key={t.id} label={done.includes(t.id) ? `${t.label}، تمت مطابقتها` : t.label} selected={word === t.id} solved={done.includes(t.id)} disabled={done.includes(t.id)} onPress={() => setWord(t.id)}><Txt bold style={{ fontSize: 22 * big, lineHeight: 34 * big, color: ink, textAlign: 'center' }}>{t.label}</Txt></Piece>)}</View>
    <View style={bs.column} accessibilityLabel="الصور">{pictures.map(t => <Piece key={t.id} label={done.includes(t.id) ? `${t.label}، تمت مطابقتها` : `صورة: ${t.description ?? t.label}`} solved={done.includes(t.id)} disabled={done.includes(t.id)} onPress={() => press(t)}><TileArt tile={t} size={70 * big} /></Piece>)}</View>
  </View>;
}

export function MemoryBoard({ round, big, ink, speakTile, onDone, say }: BoardProps) {
  const tiles = round.board!; const cards = useMemo(() => arrange(tiles.flatMap(t => [{ key: `${t.id}-a`, tile: t }, { key: `${t.id}-b`, tile: t }]), round.id), [tiles, round.id]);
  const [open, setOpen] = useState<string[]>([]); const [found, setFound] = useState<string[]>([]); const [wrong] = useState(() => new Set<string>());
  const press = (key: string, tile: Tile) => {
    if (open.length === 2) { setOpen([key]); return; } // A mismatched pair stays visible until the next press: no timer to beat.
    const next = [...open, key]; setOpen(next); speakTile(tile);
    if (next.length < 2) return;
    const first = cards.find(c => c.key === next[0])!.tile;
    if (first.id !== tile.id) { wrong.add(first.id); wrong.add(tile.id); say('ليستا متشابهتين. افتح بطاقة أخرى عندما تكون مستعدًا.'); return; }
    const solved = [...found, tile.id]; setFound(solved); setOpen([]);
    if (solved.length === tiles.length) onDone(tiles.map(t => boardAttempt(round, t, wrong, true)), 'وجدت كل الأزواج. أحسنت.');
  };
  return <View style={bs.grid}>{cards.map(({ key, tile }, n) => { const shown = open.includes(key) || found.includes(tile.id); return <Piece key={key} style={bs.card} label={shown ? tile.label : `بطاقة ${n + 1} مغلقة`} solved={found.includes(tile.id)} disabled={found.includes(tile.id) || open.includes(key)} onPress={() => press(key, tile)}>{shown ? <><TileArt tile={tile} size={56 * big} /><Txt bold style={{ color: ink, textAlign: 'center' }}>{tile.label}</Txt></> : <Ionicons name="star" size={40} color={colors.wine} />}</Piece>; })}</View>;
}

export function PuzzleBoard({ round, hinted, speakTile, onDone, say }: BoardProps) {
  const tile = round.board![0]; const pieces = useMemo(() => puzzleOrder(round.id), [round.id]);
  const [piece, setPiece] = useState<number | null>(null); const [placed, setPlaced] = useState<number[]>([]); const [mistake, setMistake] = useState(false);
  const place = (slot: number) => {
    if (piece === null) { say('اختر قطعة أولًا.'); return; }
    if (piece !== slot) { setMistake(true); say('هذه القطعة لها مكان آخر.'); return; }
    const next = [...placed, slot]; setPlaced(next); setPiece(null);
    if (next.length === 4) { speakTile(tile); onDone([{ roundId: round.id, selected: tile.id, correct: !mistake, hintUsed: hinted }], `اكتملت الصورة: ${tile.label}.`); }
  };
  const uri = tile.imageId?.startsWith('/') ? SITE + tile.imageId : undefined; const S = 110;
  // One quarter of the picture: a window half the picture's size, with the picture shifted inside it.
  const part = (n: number) => uri ? <View style={{ width: S, height: S, overflow: 'hidden' }}><Image source={{ uri }} style={{ width: S * 2, height: S * 2, transform: [{ translateX: n % 2 ? -S : 0 }, { translateY: n > 1 ? -S : 0 }] }} resizeMode="cover" /></View> : <Txt bold style={{ fontSize: 30 }}>{n + 1}</Txt>;
  return <View style={{ gap: 18, alignItems: 'center' }}>
    <View style={bs.frame} accessibilityLabel="مكان القطع">{[0, 1, 2, 3].map(n => <Piece key={n} style={bs.slot} label={placed.includes(n) ? `المكان ${n + 1}، مكتمل` : `المكان ${n + 1}`} disabled={placed.includes(n)} onPress={() => place(n)}>{placed.includes(n) && part(n)}</Piece>)}</View>
    <View style={bs.pieces} accessibilityLabel="القطع">{pieces.filter(p => !placed.includes(p)).map(p => <Piece key={p} style={bs.slot} label={`قطعة ${p + 1}`} selected={piece === p} onPress={() => setPiece(p)}>{part(p)}</Piece>)}</View>
  </View>;
}

export function BuildBoard({ round, hinted, big, ink, speakTile, onDone, say }: BoardProps) {
  const tile = round.board![0]; const letters = useMemo(() => wordLetters(tile.label), [tile.label]);
  const shuffled = useMemo(() => arrange(letters.map((letter, i) => ({ letter, i })), round.id), [letters, round.id]);
  const [used, setUsed] = useState<number[]>([]); const [mistake, setMistake] = useState(false);
  const press = (entry: { letter: string; i: number }) => {
    if (entry.letter !== letters[used.length]) { setMistake(true); say('جرّب حرفًا آخر.'); return; }
    const next = [...used, entry.i]; setUsed(next);
    if (next.length === letters.length) { speakTile(tile); onDone([{ roundId: round.id, selected: tile.id, correct: !mistake, hintUsed: hinted }], `ركّبت كلمة ${tile.label}.`); }
  };
  return <View style={{ alignItems: 'center', gap: 16 }}><TileArt tile={tile} size={110 * big} />
    <Txt accessibilityRole="header" bold style={{ fontSize: 40 * big, lineHeight: 56 * big, color: ink, writingDirection: tile.lang === 'en' ? 'ltr' : 'rtl' }}>{letters.slice(0, used.length).join('')}{'•'.repeat(letters.length - used.length)}</Txt>
    <View style={[bs.pieces, { flexDirection: tile.lang === 'en' ? 'row' : 'row-reverse' }]} accessibilityLabel="الحروف">{shuffled.map(entry => <Piece key={entry.i} style={bs.letter} label={`الحرف ${entry.letter}`} disabled={used.includes(entry.i)} onPress={() => press(entry)}><Txt bold style={{ fontSize: 34 * big, lineHeight: 46 * big, color: ink }}>{entry.letter}</Txt></Piece>)}</View></View>;
}

/** Answers sit on the grid corners; the robot's cell is the selection. Arrow buttons work with touch and switch access. */
export function RobotBoard({ options, disabled, onSelect }: { options: Tile[]; disabled: boolean; onSelect: (tile: Tile) => void }) {
  const spots = [[0, 0], [2, 0], [0, 2], [2, 2]]; const placed = options.map((tile, i) => ({ tile, x: spots[i][0], y: spots[i][1] }));
  const [pos, setPos] = useState({ x: 1, y: 1 });
  const move = (dx: number, dy: number) => { const next = { x: Math.max(0, Math.min(2, pos.x + dx)), y: Math.max(0, Math.min(2, pos.y + dy)) }; setPos(next); const hit = placed.find(s => s.x === next.x && s.y === next.y); if (hit) onSelect(hit.tile); };
  const arrow = (label: string, icon: keyof typeof Ionicons.glyphMap, dx: number, dy: number) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => move(dx, dy)} style={bs.arrow}><Ionicons name={icon} size={34} color="#fff" /></Pressable>;
  return <View style={{ alignItems: 'center', gap: 18 }}>
    <View style={bs.robotGrid} accessibilityLabel={`الروبوت في الصف ${pos.y + 1} والعمود ${pos.x + 1}`}>{Array.from({ length: 9 }, (_, n) => { const x = n % 3; const y = Math.floor(n / 3); const spot = placed.find(s => s.x === x && s.y === y); const here = pos.x === x && pos.y === y; return <View key={n} accessible={!!spot || here} accessibilityLabel={[spot?.tile.label, here && 'الروبوت هنا'].filter(Boolean).join('، ')} style={[bs.cell, here && { backgroundColor: colors.rose, borderColor: colors.wine }]}>{spot && <TileArt tile={spot.tile} size={52} />}{here && <Ionicons name="hardware-chip" size={here && spot ? 22 : 40} color={colors.wine} />}</View>; })}</View>
    <View style={{ alignItems: 'center', gap: 8 }}>{arrow('إلى الأعلى', 'arrow-up', 0, -1)}<View style={{ flexDirection: 'row', gap: 8 }}>{arrow('إلى اليسار', 'arrow-back', -1, 0)}{arrow('إلى الأسفل', 'arrow-down', 0, 1)}{arrow('إلى اليمين', 'arrow-forward', 1, 0)}</View></View>
  </View>;
}

const bs = StyleSheet.create({
  piece: { minHeight: 76, padding: 12, borderRadius: 16, borderWidth: 2, borderColor: '#adbd9b', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 6 },
  selected: { borderColor: colors.wine, backgroundColor: colors.rose, borderWidth: 3 }, solved: { borderColor: colors.green, backgroundColor: colors.sage },
  tick: { position: 'absolute', top: 6, left: 6 },
  columns: { flexDirection: 'row-reverse', gap: 14, marginTop: 18 }, column: { flex: 1, gap: 12 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 18, justifyContent: 'center' }, card: { width: '46%', aspectRatio: 1 },
  frame: { width: 248, flexDirection: 'row', flexWrap: 'wrap', gap: 4, direction: 'ltr' }, pieces: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  slot: { width: 120, height: 120, padding: 3 }, letter: { width: 76, height: 76 },
  robotGrid: { width: 252, flexDirection: 'row', flexWrap: 'wrap', gap: 6, direction: 'ltr' }, cell: { width: 80, height: 80, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.wine, alignItems: 'center', justifyContent: 'center' },
});
