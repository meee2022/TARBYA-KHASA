export type GameKind = 'match' | 'classify' | 'sequence' | 'braille';
export type SymbolName = 'fish' | 'bird' | 'leaf' | 'book' | 'cup' | 'water' | 'hand' | 'soap' | 'towel' | 'help' | 'pause' | 'repeat' | 'yes' | 'no';
export interface Tile { id: string; label: string; symbol?: SymbolName; description?: string; emoji?: string; imageId?: string; audioId?: string; signId?: string; hideLabel?: boolean; lang?: 'ar' | 'en'; }
export interface GameRound { id: string; prompt: string; target?: Tile; options: Tile[]; answerId: string; hint: string; board?: Tile[]; reveal?: boolean; listen?: Tile; }
export interface GameDefinition { id: GameKind; title: string; description: string; skill: string; color: string; rounds: GameRound[]; }
export const brailleLetters = [
  { letter: 'ا', name: 'ألف دون همزة', dots: [1] },
  { letter: 'ب', name: 'باء', dots: [1, 2] },
  { letter: 'ت', name: 'تاء', dots: [2, 3, 4, 5] },
  { letter: 'ج', name: 'جيم', dots: [2, 4, 5] },
  { letter: 'د', name: 'دال', dots: [1, 4, 5] },
] as const;
// Reading orientation: 1/2/3 on the left, 4/5/6 on the right. Never mirror with RTL.
export const brailleReadingOrder = [1, 2, 3, 4, 5, 6];
export function brailleCharacter(dots: readonly number[]) {
  if (dots.some(n => !Number.isInteger(n) || n < 1 || n > 6)) throw new Error('خلية التدريب تتكوّن من ست نقاط فقط.');
  return String.fromCodePoint(0x2800 + [...new Set(dots)].reduce((mask, dot) => mask | (1 << (dot - 1)), 0));
}
export function matchesBraille(actual: number[], expected: readonly number[]) { return actual.length === new Set(actual).size && actual.length === expected.length && expected.every(n => actual.includes(n)); }
const fish: Tile = { id: 'fish', label: 'سمكة', symbol: 'fish', description: 'سمكة لها زعانف وذيل' };
const bird: Tile = { id: 'bird', label: 'طائر', symbol: 'bird', description: 'طائر له جناحان ومنقار' };
const leaf: Tile = { id: 'leaf', label: 'نبتة', symbol: 'leaf', description: 'نبتة لها أوراق' };
const book: Tile = { id: 'book', label: 'كتاب', symbol: 'book', description: 'كتاب مفتوح له صفحات' };
const cup: Tile = { id: 'cup', label: 'كوب', symbol: 'cup', description: 'كوب له مقبض' };
const objects = [fish, bird, leaf, book, cup];
const wash: Tile[] = [
  { id: 'wet', label: 'أبلّل يدي بالماء', symbol: 'water' },
  { id: 'soap', label: 'أضع الصابون وأفرك يدي', symbol: 'soap' },
  { id: 'rinse', label: 'أشطف الصابون بالماء', symbol: 'hand' },
  { id: 'dry', label: 'أجفّف يدي', symbol: 'towel' },
];
export const games: GameDefinition[] = [
  { id: 'match', title: 'ابحث عن الشبيه', description: 'مطابقة رمز بآخر، مع وصف لفظي بديل عند الحاجة.', skill: 'المطابقة والتمييز', color: 'sage', rounds: objects.slice(0, 4).map((t, i) => ({ id: `match-${t.id}`, prompt: 'اختر الرمز المطابق للبطاقة.', target: t, options: [objects[(i + 2) % objects.length], t, objects[(i + 1) % objects.length]], answerId: t.id, hint: `ابحث عن ${t.label}. ${t.description}.` })) },
  { id: 'classify', title: 'لكل شيء مجموعته', description: 'صنّف أمثلة إلى حي وغير حي، بضغطة واحدة.', skill: 'التصنيف في العلوم', color: 'sand', rounds: objects.map(t => ({ id: `classify-${t.id}`, prompt: `أين نضع ${t.label}؟`, target: t, options: [{ id: 'living', label: 'كائن حي', symbol: 'leaf' }, { id: 'object', label: 'شيء غير حي', symbol: 'book' }], answerId: ['fish', 'bird', 'leaf'].includes(t.id) ? 'living' : 'object', hint: ['fish', 'bird', 'leaf'].includes(t.id) ? 'هذا المثال ينمو ويحتاج إلى الماء أو الغذاء.' : 'هذا الشيء لا ينمو ولا يحتاج إلى الغذاء.' })) },
  { id: 'sequence', title: 'خطوتي التالية', description: 'رتّب خطوات غسل اليدين، خطوة واحدة في كل مرة.', skill: 'التسلسل والاستقلالية', color: 'blue', rounds: wash.map((t, i) => ({ id: `sequence-${i}`, prompt: i === 0 ? 'بماذا أبدأ غسل يدي؟' : `بعد «${wash[i - 1].label}»، ماذا أفعل؟`, options: [wash[(i + 2) % 4], t, wash[(i + 1) % 4]], answerId: t.id, hint: `الخطوة ${i + 1}: ${t.label}.` })) },
  { id: 'braille', title: 'اكتشف خلية برايل', description: 'كوّن خمسة أحرف عربية بالنقاط الست، مع وصف مواضعها.', skill: 'التعرّف إلى رموز برايل', color: 'rose', rounds: brailleLetters.map((l, i) => ({ id: `braille-${i}`, prompt: `كوّن حرف ${l.name}: ${l.letter}`, options: [], answerId: l.letter, hint: `النقاط المطلوبة لحرف ${l.name}: ${l.dots.join('، ')}.` })) },
];
export const communicationTiles: Tile[] = [
  { id: 'help', label: 'أحتاج مساعدة', symbol: 'help' },
  { id: 'break', label: 'أحتاج استراحة', symbol: 'pause' },
  { id: 'repeat', label: 'أعد التعليمات', symbol: 'repeat' },
  { id: 'water', label: 'أريد ماء', symbol: 'water' },
  { id: 'yes', label: 'نعم', symbol: 'yes' },
  { id: 'no', label: 'لا', symbol: 'no' },
];
export interface AccessSettings { large: boolean; contrast: boolean; textAlternative: boolean; speech: boolean; choices: 1 | 2 | 3 | 4; scan: boolean; scanSeconds: number; target?: 'normal' | 'large' | 'xl'; hand?: 'any' | 'right' | 'left'; steady?: boolean; instant?: boolean; dwell?: boolean; scanSpeak?: boolean; calm?: boolean; shortInstructions?: boolean; easyFont?: boolean; spacing?: boolean; tint?: ReadingTint; ruler?: boolean; readAlong?: boolean; sign?: boolean; vibrate?: boolean; focusOne?: boolean; highlight?: 'none' | 'yellow' | 'red'; describe?: boolean; rounds?: number; workMinutes?: number; moveBreak?: boolean; tokens?: boolean; quiet?: boolean; story?: string; level?: 'photo' | 'symbol' | 'word'; model?: boolean; repeatMissed?: boolean; switches?: 1 | 2; }
/** Quiet sensory mode: sound, motion and vibration off in one switch. The teacher's other choices come back when it is turned off. */
export function withQuiet(a: AccessSettings): AccessSettings { return a.quiet ? { ...a, speech: false, calm: true, vibrate: false } : a; }
/** A soft paper colour behind what the student reads, for learners who find white glare tiring. */
/** Exactly n rounds: a shorter round for a short attention span, or a repeat of the same items when the pack has fewer. */
export function fitRounds<T extends { id: string }>(rounds: T[], n?: number): T[] {
  if (!n || !rounds.length) return rounds;
  return Array.from({ length: n }, (_, i) => i < rounds.length ? rounds[i] : { ...rounds[i % rounds.length], id: `${rounds[i % rounds.length].id}~${Math.floor(i / rounds.length)}` });
}
/** The same pack at three levels: real picture and word, symbol and word, then the word alone. A picture that is the answer stays a picture. */
export function tileAtLevel(t: Tile, level?: AccessSettings['level']): Tile {
  if (level === 'symbol' && t.emoji) return { ...t, imageId: undefined };
  if (level === 'word' && !t.hideLabel) return { ...t, imageId: undefined, emoji: undefined };
  return t;
}
export function roundAtLevel(r: GameRound, level?: AccessSettings['level']): GameRound {
  return !level || level === 'photo' ? r : { ...r, target: r.target && tileAtLevel(r.target, level), options: r.options.map(o => tileAtLevel(o, level)) };
}
/** Items answered wrong on the first try, once each, to practise again at the end of the round. */
export function missedRounds<T extends { id: string }>(rounds: T[], attempts: PracticeAttempt[]): T[] {
  const missed = new Set(attempts.filter(a => !a.correct && !a.repeat).map(a => a.roundId));
  return rounds.filter(r => missed.has(r.id));
}
/** The lesson's own words for the communication board: every item the activity uses, once, with its word visible. */
export function lessonWords(rounds: GameRound[], max = 12): Tile[] {
  const seen = new Map<string, Tile>();
  for (const r of rounds) for (const t of [r.target, r.listen, ...r.options, ...(r.board ?? [])]) if (t && !seen.has(t.id)) seen.set(t.id, { ...t, hideLabel: false });
  return [...seen.values()].slice(0, max);
}
/** Stable shuffle: order is fixed for a round, so it does not jump on re-render, and differs between rounds. */
export function arrange<T>(items: T[], seed: string) {
  const out = [...items]; let n = [...seed].reduce((sum, c) => sum * 31 + c.codePointAt(0)! >>> 0, 7);
  for (let i = out.length - 1; i > 0; i--) { n = (n * 1103515245 + 12345) >>> 0; const j = n % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
/** One attempt per tile on a board: correct unless the tile was ever part of a wrong try. */
export const boardAttempt = (round: GameRound, tile: Tile, wrong: Set<string>, hinted: boolean): PracticeAttempt => ({ roundId: `${round.id}-${tile.id}`, selected: tile.id, correct: !wrong.has(tile.id), hintUsed: hinted });
/** Puzzle pieces in a mixed order that is never already solved. */
export function puzzleOrder(seed: string, count = 4) { const mixed = arrange(Array.from({ length: count }, (_, i) => i), seed); return mixed.every((p, i) => p === i) ? [1, 0, 3, 2] : mixed; }
export type ReadingTint = 'none' | 'sepia' | 'mint';
/** Words to speak and highlight one at a time, each with its own voice language, so a mixed Arabic and English line reads correctly. */
export function readingWords(text: string): { text: string; lang: 'ar' | 'en' }[] { return text.split(/\s+/).filter(Boolean).map(w => ({ text: w, lang: /[A-Za-z]/.test(w) && !/\p{Script=Arabic}/u.test(w) ? 'en' : 'ar' })); }
export const defaultAccess: AccessSettings = { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: false, scanSeconds: 4 };
export function gameOptions(round: GameRound, count: 1 | 2 | 3 | 4): Tile[] {
  // Stable across re-renders, varied across tasks: position must not reveal the answer.
  const offset = [...round.id].reduce((n, c) => n + c.codePointAt(0)!, 0);
  const rotate = (items: Tile[]) => items.length ? [...items.slice(offset % items.length), ...items.slice(0, offset % items.length)] : [];
  const distractors = round.options.filter(o => o.id !== round.answerId).slice(0, count - 1);
  return rotate(round.options.filter(o => o.id === round.answerId || distractors.includes(o)));
}
/** `repeat` marks a second try at a missed item at the end of the round: practice, kept out of the summary. */
export interface PracticeAttempt { roundId: string; selected: string; correct: boolean; hintUsed: boolean; repeat?: boolean; }
export function practiceSummary(all: PracticeAttempt[]) { const attempts = all.filter(a => !a.repeat); return { total: attempts.length, correct: attempts.filter(a => a.correct).length, independent: attempts.filter(a => a.correct && !a.hintUsed).length, assisted: attempts.filter(a => a.hintUsed).length }; }
/** Starts a session from the learner's saved profile; the teacher can still adjust it before starting. */
export function accessFromPreferences(p: { largeText: boolean; highContrast: boolean; sound: boolean; reducedMotion: boolean; choices: 1 | 2 | 3 | 4; access?: AccessSettings; responds?: string[]; targetSize?: 'normal' | 'large' | 'xl'; hand?: 'any' | 'right' | 'left'; steady?: boolean; instant?: boolean; scan?: boolean; scanSpeak?: boolean; scanSeconds?: number; shortInstructions?: boolean; understands?: string[] }): AccessSettings {
  return withQuiet({ ...defaultAccess, ...p.access, large: p.largeText, contrast: p.highContrast, speech: p.sound, choices: p.choices, calm: p.reducedMotion, target: p.targetSize ?? 'normal', hand: p.hand ?? 'any', steady: !!p.steady, instant: !!p.instant, scan: !!p.scan || !!p.responds?.includes('switch'), scanSpeak: !!p.scanSpeak, dwell: !!p.responds?.includes('dwell'), scanSeconds: p.scanSeconds ?? p.access?.scanSeconds ?? defaultAccess.scanSeconds, shortInstructions: !!p.shortInstructions, sign: !!p.understands?.includes('sign'), vibrate: p.access?.vibrate ?? !p.sound });
}
export function nextScanIndex(current: number, count: number) { return count > 0 ? (current + 1) % count : -1; }
