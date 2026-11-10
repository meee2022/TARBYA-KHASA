import { latinizeContent } from './numbers.ts';
import type { Lesson } from './index';

export type SlideKind = 'cover' | 'concept' | 'choice' | 'practice' | 'break' | 'closing';
export type DeckTheme = 'calm' | 'wine' | 'contrast';
export interface Slide {
  id: string; kind: SlideKind; title: string; body: string; options: string[];
  answer: number | null; notes: string; image?: string; imageAlt?: string;
}
export interface Deck {
  id: string; title: string; subject: string; grade: string; language: 'ar' | 'en';
  theme: DeckTheme; largeText: boolean; slides: Slide[]; updatedAt: string;
  origin: 'template' | 'ai'; reviewed: boolean; lessonId?: string;
}
export interface AuthorRequest {
  task: 'presentation' | 'lesson'; title: string; subject: string; grade: string;
  language: 'ar' | 'en'; sourceText: string; objective: string;
  instructions: string; slideCount: number; choices: 2 | 3;
}
export interface PlanDraft {
  objective: string; warmup: string; teaching: string; practice: string;
  closing: string; adaptations: string;
  questions: { prompt: string; options: string[]; answer: number }[];
}
export const slideLabels: Record<SlideKind, string> = { cover: 'الغلاف', concept: 'نتعلّم', choice: 'اختر الإجابة', practice: 'نجرب معًا', break: 'استراحة', closing: 'نراجع' };
export const deckThemes = {
  calm: { name: 'حديقة هادئة', background: 'F4F6ED', ink: '293E2C', accent: '426849', soft: 'E5EDDC' },
  wine: { name: 'هوية المنصة', background: 'FCF9F2', ink: '2A1418', accent: '5C1523', soft: 'F5EDD8' },
  contrast: { name: 'وضوح عالٍ', background: 'FFFFFF', ink: '000000', accent: '000000', soft: 'F0F0F0' },
} as const;
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function newSlide(kind: SlideKind = 'concept'): Slide {
  return { id: makeId(), kind, title: slideLabels[kind], body: '', options: kind === 'choice' ? ['', ''] : [], answer: kind === 'choice' ? 0 : null, notes: '' };
}
// Preserve all content by splitting it; never silently truncate a teacher's lesson.
export function splitSlideText(text: string, limit = 240): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean); const pages: string[] = []; let page = '';
  for (const word of words) {
    if (page && page.length + word.length + 1 > limit) { pages.push(page); page = ''; }
    page += (page ? ' ' : '') + word;
  }
  if (page) pages.push(page);
  return pages;
}
export function deckFromLesson(input: Lesson, theme: DeckTheme = 'calm'): Deck {
  const lesson = latinizeContent(input);
  if (lesson.sourceText.length > 16000) throw new Error('المصدر طويل لعرض واحد. اختصر نص المصدر إلى جزء من الدرس (حتى 16000 حرف) من محرر التحضير ثم حاول مجددًا.');
  const en = lesson.language === 'en';
  const slides: Slide[] = [{ ...newSlide('cover'), title: lesson.title || 'درس جديد', body: `${lesson.subject} · الصف ${lesson.grade}` }];
  const add = (kind: SlideKind, title: string, content: string, notes = '') => {
    for (const [i, body] of splitSlideText(content).entries()) slides.push({ ...newSlide(kind), title: title + (i ? ` (${i + 1})` : ''), body, notes });
  };
  add('concept', en ? 'Our goal' : 'ماذا سنتعلّم؟', lesson.objective);
  // Teacher-facing preparation is in notes, never mistaken for student-facing text.
  slides.push({ ...newSlide('practice'), title: en ? 'Let’s begin' : 'نبدأ معًا', body: en ? 'Look, listen, or point. Take your time.' : 'شاهد أو استمع أو أشر. خذ وقتك.', notes: lesson.warmup });
  const content = lesson.sourceText.trim();
  if (content) add('concept', lesson.title, content, lesson.teaching);
  else slides.push({ ...newSlide('concept'), title: lesson.title, body: en ? 'Add one idea or example here.' : 'اكتب هنا فكرة واحدة أو مثالًا من الدرس.', notes: lesson.teaching });
  slides.push({ ...newSlide('practice'), title: en ? 'Let’s try' : 'نجرب معًا', body: en ? 'Show what you learned. You can ask for help.' : 'أرني ما تعلّمته. يمكنك طلب المساعدة.', notes: lesson.practice });
  slides.push({ ...newSlide('break'), title: en ? 'A little break' : 'نأخذ استراحة', body: en ? 'We continue when you are ready.' : 'نكمل عندما تكون مستعدًا. لا يوجد مؤقّت.' });
  for (const q of lesson.questions) slides.push({ ...newSlide('choice'), title: q.prompt, options: [...q.options], answer: q.answer, notes: lesson.adaptations });
  slides.push({ ...newSlide('closing'), title: en ? 'What did you learn?' : 'ماذا تعلّمت اليوم؟', body: en ? 'Tell, point, or show an example.' : 'قل أو أشر أو اعرض مثالًا. لكل محاولة قيمة.', notes: lesson.closing });
  if (slides.length > 80) throw new Error('المحتوى يتجاوز 80 شريحة. قسّم المصدر والأسئلة إلى دروس أقصر قبل إنشاء العرض.');
  return { lessonId: lesson.id, id: makeId(), title: lesson.title || 'عرض جديد', subject: lesson.subject, grade: lesson.grade, language: lesson.language, theme, largeText: true, slides, updatedAt: new Date().toISOString(), origin: 'template', reviewed: false };
}
export function validateDeck(deck: Deck): string[] {
  const errors: string[] = [];
  if (!deck.title.trim()) errors.push('أضف عنوانًا للعرض.');
  if (!deck.slides.length) errors.push('أضف شريحة واحدة على الأقل.');
  if (deck.slides.length > 80) errors.push('قسّم المحتوى إلى عروض أقصر؛ الحد 80 شريحة.');
  deck.slides.forEach((s, i) => {
    const prefix = `الشريحة ${i + 1}: `;
    if (!s.title.trim() || s.title.length > 100) errors.push(prefix + 'العنوان مطلوب وبحد أقصى 100 حرف.');
    if (s.body.length > 300) errors.push(prefix + 'وزّع النص على شرائح؛ الحد 300 حرف.');
    if (s.kind === 'choice' && (s.options.length < 2 || s.options.length > 3 || s.options.some(o => !o.trim() || o.length > 80) || !Number.isInteger(s.answer) || s.answer! < 0 || s.answer! >= s.options.length)) errors.push(prefix + 'أكمل بديلين أو ثلاثة وحدد الإجابة الصحيحة؛ كل بديل حتى 80 حرفًا.');
    if (s.image && !s.imageAlt?.trim()) errors.push(prefix + 'اكتب وصفًا للصورة.');
  });
  return errors;
}
export function isDeck(value: unknown): value is Deck {
  if (!value || typeof value !== 'object') return false;
  const d = value as Deck;
  return typeof d.id === 'string' && typeof d.title === 'string' && typeof d.subject === 'string' && typeof d.grade === 'string' && ['ar','en'].includes(d.language) && ['calm','wine','contrast'].includes(d.theme) && Array.isArray(d.slides) && d.slides.length <= 80 && d.slides.every(s => s && typeof s.id === 'string' && Object.prototype.hasOwnProperty.call(slideLabels,s.kind) && typeof s.title === 'string' && typeof s.body === 'string' && typeof s.notes === 'string' && Array.isArray(s.options) && s.options.every(o => typeof o === 'string'));
}
export function deckFromAI(value: unknown, request: AuthorRequest): Deck {
  const v = value as { slides?: Slide[] };
  if (!v || !Array.isArray(v.slides) || v.slides.length !== request.slideCount) throw new Error('الرد لا يحتوي عدد الشرائح المطلوب. أعد المحاولة.');
  const slides = v.slides.map((s: Slide) => ({ id: makeId(), kind: s.kind, title: s.title, body: s.body, options: s.options, answer: s.answer, notes: s.notes }));
  const deck: Deck = { id: makeId(), title: request.title, subject: request.subject, grade: request.grade, language: request.language, theme: 'calm', largeText: true, slides, origin: 'ai', reviewed: false, updatedAt: new Date().toISOString() };
  if (!isDeck(deck) || validateDeck(deck).length) throw new Error('الرد غير مكتمل أو نصوصه طويلة. لم يُستبدل عملك؛ أعد المحاولة.');
  return latinizeContent(deck);
}
export function parsePlan(value: unknown): PlanDraft {
  const p = value as PlanDraft;
  if (!p || ['objective','warmup','teaching','practice','closing','adaptations'].some(k => typeof p[k as keyof PlanDraft] !== 'string' || !(p[k as keyof PlanDraft] as string).trim() || (p[k as keyof PlanDraft] as string).length > 1800) || !Array.isArray(p.questions) || p.questions.length < 1 || p.questions.length > 8 || p.questions.some(q => !q || typeof q.prompt !== 'string' || !q.prompt.trim() || q.prompt.length > 200 || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 3 || q.options.some(o => typeof o !== 'string' || !o.trim() || o.length > 100) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)) throw new Error('مسودة التحضير غير مكتملة. أعد المحاولة؛ بياناتك لم تتغيّر.');
  return latinizeContent(Object.fromEntries(['objective','warmup','teaching','practice','closing','adaptations','questions'].map(k => [k,p[k as keyof PlanDraft]])) as unknown as PlanDraft);
}
