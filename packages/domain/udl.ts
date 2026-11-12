import { createLesson, type Learner, type Lesson } from './index.ts';

/** What the platform can see in a lesson by itself. An item of the checklist tied to one of these is met without the teacher ticking it. */
export const udlSignals = ['kit', 'tiers', 'responses', 'questions', 'adaptations', 'warmup', 'goals'] as const;
export type UdlSignal = typeof udlSignals[number];
export const udlPrinciples = { representation: 'طرق العرض', action: 'طرق الأداء والتعبير', engagement: 'المشاركة والدافعية' } as const;
export type UdlPrinciple = keyof typeof udlPrinciples;
/** One line of the universal-design checklist. `sees` names what the platform looks for; without it the teacher ticks the line. */
export interface UdlItem { id: string; principle: UdlPrinciple; text: string; tip: string; sees?: UdlSignal; }

export const defaultUdl: UdlItem[] = [
  { id: 'udl-many-ways', principle: 'representation', text: 'يُعرض المحتوى بأكثر من طريقة: صورة ونص وصوت أو شيء محسوس', tip: 'أضف إلى حقيبة الدرس صورة أو مجسمًا أو مقطعًا، أو اربط الدرس بحزمة محتوى.', sees: 'kit' },
  { id: 'udl-short-instructions', principle: 'representation', text: 'التعليمات قصيرة ومصوّرة، وتُعاد عند الطلب', tip: 'اكتب كل تعليمة في خطوة واحدة، وضع بجانبها صورة أو إشارة.' },
  { id: 'udl-tiers', principle: 'representation', text: 'ما يُقدَّم مكتوب بثلاثة مستويات من المساعدة', tip: 'افتح محطات الدرس واكتب ما يُقدَّم بمساعدة كاملة وجزئية وباستقلالية.', sees: 'tiers' },
  { id: 'udl-responses', principle: 'action', text: 'يستطيع الطلاب أن يجيبوا بأكثر من وسيلة: إشارة أو ضغطة أو كلام', tip: 'حدّد في ملف كل طالب كيف يجيب، واقبل الإجابة بأي وسيلة منها.', sees: 'responses' },
  { id: 'udl-choice-task', principle: 'action', text: 'في الدرس تدريب يُحل بالاختيار أو الضغط، لا بالكتابة وحدها', tip: 'أضف أسئلة اختيار إلى الدرس، فتُحل بالضغط أو بالإشارة.', sees: 'questions' },
  { id: 'udl-adaptations', principle: 'action', text: 'تكييفات الدرس ووسائل الوصول مكتوبة قبل الحصة', tip: 'اكتب في خانة التكييفات ما يختلف لمن يحتاج وقتًا أو وسيلة أخرى.', sees: 'adaptations' },
  { id: 'udl-warmup', principle: 'engagement', text: 'التهيئة تربط الدرس بشيء يعرفه الطالب أو يحبه', tip: 'اختر تهيئة من البنك أو اكتب واحدة تبدأ من خبرة مألوفة.', sees: 'warmup' },
  { id: 'udl-pupil-choice', principle: 'engagement', text: 'للطالب اختيار داخل الحصة: النشاط أو ترتيبه أو المكافأة', tip: 'قدّم خيارين في محطة واحدة على الأقل، واترك للطالب أن يختار.' },
  { id: 'udl-goal', principle: 'engagement', text: 'الدرس مربوط بهدف فردي يعرف الطالب أنه يتقدم نحوه', tip: 'اربط الدرس بهدف من أهداف طلابه الفردية.', sees: 'goals' },
];

/** The signals present in this lesson. Reads only what the teacher wrote and the pupils' stated ways of answering, never a disability name. */
export function udlSeen(lesson: Lesson, learners: Learner[]): UdlSignal[] {
  const mine = learners.filter(l => lesson.learnerIds.includes(l.id)); const ways = new Set(mine.flatMap(l => l.preferences.responds ?? []));
  const tiers = Object.values(lesson.stationPlans ?? {}).some(p => Object.values(p?.tiers ?? {}).some(t => (t ?? '').trim()));
  // A new lesson starts with example text in the warm-up and the adaptations: only what the teacher wrote counts.
  const blank = createLesson(); const warm = lesson.warmup.trim(); const adapted = lesson.adaptations.trim();
  const seen: Record<UdlSignal, boolean> = { kit: (lesson.kit ?? []).length > 0 || !!lesson.packId, tiers, responses: ways.size >= 2, questions: lesson.questions.length > 0, adaptations: !!adapted && adapted !== blank.adaptations.trim(), warmup: !!warm && warm !== blank.warmup.trim(), goals: lesson.goalIds.length > 0 };
  return udlSignals.filter(s => seen[s]);
}

export interface UdlResult { items: (UdlItem & { met: boolean; seen: boolean })[]; byPrinciple: Record<UdlPrinciple, { met: number; total: number }>; met: number; total: number; }
/** The checklist applied to one lesson: a line is met when the platform sees it or the teacher ticked it. */
export function udlCheck(lesson: Lesson, learners: Learner[], list: UdlItem[] = defaultUdl): UdlResult {
  const seen = udlSeen(lesson, learners); const ticked = lesson.udl ?? [];
  const items = list.map(i => { const auto = !!i.sees && seen.includes(i.sees); return { ...i, seen: auto, met: auto || ticked.includes(i.id) }; });
  const byPrinciple = Object.fromEntries((Object.keys(udlPrinciples) as UdlPrinciple[]).map(p => { const mine = items.filter(i => i.principle === p); return [p, { met: mine.filter(i => i.met).length, total: mine.length }]; })) as UdlResult['byPrinciple'];
  return { items, byPrinciple, met: items.filter(i => i.met).length, total: items.length };
}
