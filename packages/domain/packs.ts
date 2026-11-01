import type { GameRound, Tile } from './games.ts';
import type { Question } from './index.ts';

export interface PackItem { id: string; text: string; emoji?: string; imageId?: string; audioId?: string; signId?: string; description?: string; group?: string; }
export interface ContentPack { id: string; title: string; subject: string; language: 'ar' | 'en'; ordered: boolean; items: PackItem[]; updatedAt: string; }
export type TemplateId = 'cards' | 'choose-word' | 'choose-picture' | 'listen' | 'door' | 'match' | 'memory' | 'puzzle' | 'build' | 'classify' | 'sequence' | 'robot' | 'braille';
export interface TemplateInfo { id: TemplateId; title: string; description: string; skill: string; color: string; enabled: boolean; imageId?: string; }
export interface PlayableGame { id: string; template: TemplateId; title: string; description: string; skill: string; color: string; language: 'ar' | 'en'; rounds: GameRound[]; }

const hasPicture = (i: PackItem) => !!(i.emoji || i.imageId);
const groupsOf = (p: ContentPack) => [...new Set(p.items.map(i => i.group?.trim()).filter(Boolean))] as string[];

/** Why a template cannot run on this pack, or null when it can. */
export function templateBlocker(template: TemplateId, pack: ContentPack): string | null {
  const pictured = pack.items.filter(hasPicture).length;
  if (template === 'braille') return 'لا يعتمد هذا النشاط على حزمة.';
  if (template === 'cards') return pack.items.length ? null : 'أضف عنصرًا واحدًا على الأقل.';
  if (template === 'classify') return groupsOf(pack).length >= 2 && pack.items.every(i => i.group?.trim()) ? null : 'حدّد مجموعة لكل عنصر، ومجموعتين على الأقل.';
  if (template === 'sequence') return pack.ordered && pack.items.length >= 2 ? null : 'فعّل «عناصر مرتبة» وأضف خطوتين على الأقل.';
  if (template === 'build') return pack.items.some(i => wordLetters(i.text).length >= 2) ? null : 'أضف كلمات من حرفين إلى عشرة أحرف.';
  if (template === 'puzzle') return pictured ? null : 'أضف صورة لعنصر واحد على الأقل.';
  return pictured >= 2 ? null : 'أضف صورًا لعنصرين على الأقل.';
}

export const wordLetters = (text: string) => { const letters = Array.from(text.trim()); return letters.length <= 10 && !letters.includes(' ') ? letters : []; };

const word = (i: PackItem, p: ContentPack): Tile => ({ id: i.id, label: i.text, lang: p.language, audioId: i.audioId, signId: i.signId, description: i.description });
const full = (i: PackItem, p: ContentPack): Tile => ({ ...word(i, p), emoji: i.emoji, imageId: i.imageId });
const picture = (i: PackItem, p: ContentPack): Tile => ({ ...full(i, p), hideLabel: true });
const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, n) => items.slice(n * size, (n + 1) * size));
// The answer stays first here; gameOptions rotates it per round so position never reveals it.
const withDistractors = (items: PackItem[], index: number, make: (i: PackItem) => Tile) => [0, 1, 2, 3].slice(0, items.length).map(n => make(items[(index + n) % items.length]));
const clue = (i: PackItem, fallback: string) => i.description || fallback;
const spell = (i: PackItem) => `تبدأ بـ «${Array.from(i.text)[0] ?? ''}».`;

export function buildRounds(pack: ContentPack, template: TemplateId, choices: number): GameRound[] {
  const p = pack; const items = p.items.filter(i => i.text.trim()); const pictured = items.filter(hasPicture); const rid = (n: number | string) => `${p.id}-${template}-${n}`;
  const blank = { options: [] as Tile[], answerId: '' };
  switch (template) {
    case 'cards': return items.map((i, n) => ({ ...blank, id: rid(n), prompt: 'اضغط لنرى البطاقة التالية', target: full(i, p), hint: clue(i, i.text) }));
    case 'choose-word': return pictured.map((i, n) => ({ id: rid(n), prompt: 'اختر الاسم المناسب للصورة', target: picture(i, p), options: withDistractors(pictured, n, x => word(x, p)), answerId: i.id, hint: clue(i, spell(i)) }));
    case 'choose-picture': return pictured.map((i, n) => ({ id: rid(n), prompt: 'اختر الصورة المناسبة', target: word(i, p), options: withDistractors(pictured, n, x => picture(x, p)), answerId: i.id, hint: clue(i, 'انظر إلى الصور واحدة واحدة.') }));
    case 'listen': return pictured.map((i, n) => ({ id: rid(n), prompt: 'استمع، ثم اختر الصورة', listen: word(i, p), options: withDistractors(pictured, n, x => picture(x, p)), answerId: i.id, hint: clue(i, spell(i)) }));
    case 'door': return pictured.map((i, n) => ({ id: rid(n), prompt: 'افتح الباب، ثم اختر الاسم', reveal: true, target: picture(i, p), options: withDistractors(pictured, n, x => word(x, p)), answerId: i.id, hint: clue(i, spell(i)) }));
    case 'robot': return pictured.map((i, n) => ({ id: rid(n), prompt: 'حرّك الروبوت إلى الصورة المناسبة', target: word(i, p), options: withDistractors(pictured, n, x => picture(x, p)), answerId: i.id, hint: clue(i, 'حرّك الروبوت خطوة خطوة.') }));
    case 'match': return chunk(pictured, Math.min(4, Math.max(1, choices))).map((board, n) => ({ ...blank, id: rid(n), prompt: 'اضغط الكلمة، ثم اضغط صورتها', board: board.map(i => full(i, p)), hint: 'ابدأ بكلمة تعرفها.' }));
    case 'memory': return chunk(pictured, Math.min(4, Math.max(2, choices))).map((board, n) => ({ ...blank, id: rid(n), prompt: 'افتح بطاقتين متشابهتين', board: board.map(i => full(i, p)), hint: 'تذكّر مكان البطاقة التي رأيتها.' }));
    case 'puzzle': return pictured.map((i, n) => ({ ...blank, id: rid(n), prompt: 'اختر القطعة، ثم مكانها', board: [full(i, p)], hint: 'ابدأ بقطعة تعرف مكانها.' }));
    case 'build': return items.filter(i => wordLetters(i.text).length >= 2).map((i, n) => ({ ...blank, id: rid(n), prompt: 'ركّب الكلمة حرفًا بعد حرف', board: [full(i, p)], hint: clue(i, spell(i)) }));
    case 'classify': { const groups = groupsOf(p); return items.map((i, n) => ({ id: rid(n), prompt: 'إلى أي مجموعة ينتمي؟', target: full(i, p), options: [i.group!.trim(), ...groups.filter(g => g !== i.group!.trim())].map(g => ({ id: g, label: g, lang: p.language })), answerId: i.group!.trim(), hint: clue(i, 'فكّر في صفة واحدة تميّزه.') })); }
    case 'sequence': return items.map((i, n) => ({ id: rid(n), prompt: n === 0 ? 'ما الخطوة الأولى؟' : `بعد «${items[n - 1].text}»، ما الخطوة التالية؟`, options: withDistractors(items, n, x => full(x, p)), answerId: i.id, hint: clue(i, `هذه الخطوة رقم ${n + 1}.`) }));
    default: return [];
  }
}
export function playablePack(pack: ContentPack, info: TemplateInfo, choices: number): PlayableGame {
  return { id: `${pack.id}:${info.id}`, template: info.id, title: `${info.title} · ${pack.title}`, description: info.description, skill: info.skill, color: info.color, language: pack.language, rounds: buildRounds(pack, info.id, choices) };
}

/** Picture questions for a lesson. The correct position varies per question. */
export function questionsFromPack(pack: ContentPack): Question[] {
  const items = pack.items.filter(hasPicture);
  const size = Math.min(3, items.length);
  return size < 2 ? [] : items.map((item, n) => {
    const others = [1, 2, 3, 4].map(k => items[(n + k) % items.length]).filter(o => o.id !== item.id).slice(0, size - 1);
    const answer = n % size;
    const options = others.map(o => o.text); options.splice(answer, 0, item.text);
    return { id: `${pack.id}-q-${n}`, prompt: pack.language === 'en' ? 'What is this?' : 'ما هذا؟', target: item.text, options, answer };
  });
}
export const findItem = (pack: ContentPack | undefined, text: string | undefined) => text === undefined ? undefined : pack?.items.find(i => i.text.trim().toLowerCase() === text.trim().toLowerCase());
export const itemsFromText = (text: string, uid: () => string): PackItem[] => text.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 100).map(line => ({ id: uid(), text: line }));
export const missingPictures = (pack: ContentPack) => pack.items.filter(i => !hasPicture(i)).length;
