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
export interface AccessSettings { large: boolean; contrast: boolean; textAlternative: boolean; speech: boolean; choices: 1 | 2 | 3 | 4; scan: boolean; scanSeconds: number; target?: 'normal' | 'large' | 'xl'; hand?: 'any' | 'right' | 'left'; steady?: boolean; instant?: boolean; dwell?: boolean; scanSpeak?: boolean; calm?: boolean; shortInstructions?: boolean; }
export const defaultAccess: AccessSettings = { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: false, scanSeconds: 4 };
export function gameOptions(round: GameRound, count: 1 | 2 | 3 | 4): Tile[] {
  // Stable across re-renders, varied across tasks: position must not reveal the answer.
  const offset = [...round.id].reduce((n, c) => n + c.codePointAt(0)!, 0);
  const rotate = (items: Tile[]) => items.length ? [...items.slice(offset % items.length), ...items.slice(0, offset % items.length)] : [];
  const distractors = round.options.filter(o => o.id !== round.answerId).slice(0, count - 1);
  return rotate(round.options.filter(o => o.id === round.answerId || distractors.includes(o)));
}
export interface PracticeAttempt { roundId: string; selected: string; correct: boolean; hintUsed: boolean; }
export function practiceSummary(attempts: PracticeAttempt[]) { return { total: attempts.length, correct: attempts.filter(a => a.correct).length, independent: attempts.filter(a => a.correct && !a.hintUsed).length, assisted: attempts.filter(a => a.hintUsed).length }; }
/** Starts a session from the learner's saved profile; the teacher can still adjust it before starting. */
export function accessFromPreferences(p: { largeText: boolean; highContrast: boolean; sound: boolean; reducedMotion: boolean; choices: 1 | 2 | 3 | 4; access?: AccessSettings; responds?: string[]; targetSize?: 'normal' | 'large' | 'xl'; hand?: 'any' | 'right' | 'left'; steady?: boolean; instant?: boolean; scan?: boolean; scanSpeak?: boolean; scanSeconds?: number; shortInstructions?: boolean }): AccessSettings {
  return { ...defaultAccess, ...p.access, large: p.largeText, contrast: p.highContrast, speech: p.sound, choices: p.choices, calm: p.reducedMotion, target: p.targetSize ?? 'normal', hand: p.hand ?? 'any', steady: !!p.steady, instant: !!p.instant, scan: !!p.scan || !!p.responds?.includes('switch'), scanSpeak: !!p.scanSpeak, dwell: !!p.responds?.includes('dwell'), scanSeconds: p.scanSeconds ?? p.access?.scanSeconds ?? defaultAccess.scanSeconds, shortInstructions: !!p.shortInstructions };
}
export function nextScanIndex(current: number, count: number) { return count > 0 ? (current + 1) % count : -1; }
