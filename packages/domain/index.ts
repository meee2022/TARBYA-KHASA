export const subjects = ['اللغة الإنجليزية', 'اللغة العربية', 'الرياضيات', 'العلوم', 'التربية الإسلامية', 'الدراسات الاجتماعية', 'المهارات الحياتية'] as const;
export type Subject = string;
export type Status = 'draft' | 'review' | 'approved';
export type Support = 'independent' | 'visual' | 'gesture' | 'verbal' | 'model' | 'partial' | 'physical' | 'not-observed';
export const supportOrder: Support[] = ['independent', 'visual', 'gesture', 'verbal', 'model', 'partial', 'physical'];
export const supportLabels: Record<Support, string> = { independent: 'باستقلالية', visual: 'بتلميح بصري', gesture: 'بإيماءة أو إشارة', verbal: 'بتلميح لفظي', model: 'بنموذج', partial: 'بمساعدة جسدية جزئية', physical: 'بمساعدة جسدية كاملة', 'not-observed': 'لم تُلاحظ الاستجابة' };
export const statusLabels: Record<Status, string> = { draft: 'مسودة', review: 'بانتظار المراجعة', approved: 'جاهز للتدريس' };
import type { AccessSettings, PracticeAttempt } from './games';
import type { ContentPack } from './packs';
import type { Iep, WeeklyPlan } from './planning';
export type Understanding = 'text' | 'picture' | 'audio' | 'sign' | 'model';
export type ResponseWay = 'touch' | 'point' | 'speech' | 'write' | 'practical' | 'switch' | 'dwell';
export const understandingLabels: Record<Understanding, string> = { text: 'نص مكتوب', picture: 'صورة أو رمز', audio: 'صوت', sign: 'لغة الإشارة', model: 'نموذج عملي' };
export const responseLabels: Record<ResponseWay, string> = { touch: 'لمس أو لوحة مفاتيح', point: 'إشارة يسجّلها المعلم', speech: 'كلام', write: 'كتابة', practical: 'أداء عملي', switch: 'مفتاح واحد', dwell: 'تثبيت المؤشر على الزر' };
export interface Preferences { largeText: boolean; highContrast: boolean; sound: boolean; reducedMotion: boolean; choices: 1 | 2 | 3 | 4; response: 'touch' | 'point'; access?: AccessSettings; understands?: Understanding[]; responds?: ResponseWay[]; targetSize?: 'normal' | 'large' | 'xl'; hand?: 'any' | 'right' | 'left'; steady?: boolean; instant?: boolean; scan?: boolean; scanSpeak?: boolean; scanSeconds?: number; shortInstructions?: boolean; }
/** Per-learner boards for the student tools. Lists hold catalog ids. */
export interface LearnerSupports { schedule?: string[]; first?: string; then?: string; tokenGoal?: number; reward?: string; communication?: string[]; favourite?: string; }
export interface Goal { id: string; text: string; subject: Subject; target: number; opportunities: number; baseline: string; support?: Support; sessions?: number; approvedAt?: string; steps?: string[]; }
export interface Learner { id: string; name: string; grade: string; initials: string; color: string; strengths: string; needs: string; preferences: Preferences; goals: Goal[]; supports?: LearnerSupports; avatarId?: string; }
export interface Question { id: string; prompt: string; options: string[]; answer: number; target?: string; }
export interface Lesson { id: string; title: string; subject: Subject; grade: string; duration: number; learnerIds: string[]; goalIds: string[]; objective: string; warmup: string; teaching: string; practice: string; closing: string; adaptations: string; source: string; sourceText: string; language: 'ar' | 'en'; status: Status; reviewNote: string; questions: Question[]; updatedAt: string; packId?: string; }
export interface Trial { questionId: string; selected: number | null; correct: boolean; support: Support; }
export interface Observation { id: string; lessonId: string; learnerId: string; goalId: string; date: string; correct: number; total: number; independent: number; support: Support; note: string; responses?: Trial[]; unobserved?: number; }
export function summarizeTrials(trials: Trial[]) {
  const observed = trials.filter(t => t.support !== 'not-observed');
  // The session carries the most intensive help that was actually used.
  const support: Support = observed.length ? supportOrder[Math.max(...observed.map(t => supportOrder.indexOf(t.support)))] : 'not-observed';
  return { total: observed.length, correct: observed.filter(t => t.correct).length, independent: observed.filter(t => t.correct && t.support === 'independent').length, unobserved: trials.length - observed.length, support };
}
export interface PracticeRecord { id: string; gameId: string; title?: string; learnerId: string; date: string; attempts: PracticeAttempt[]; access: AccessSettings; }
export interface Workspace { version: 1; learners: Learner[]; lessons: Lesson[]; observations: Observation[]; practiceSessions?: PracticeRecord[]; packs?: ContentPack[]; plans?: WeeklyPlan[]; ieps?: Iep[]; }
export const defaults: Preferences = { largeText: false, highContrast: false, sound: true, reducedMotion: true, choices: 3, response: 'touch', understands: ['picture', 'text'], responds: ['touch'], targetSize: 'normal', hand: 'any', steady: false, instant: false };
/** Arabic counting: one and two have their own forms. */
export const countOf = (n: number, one: string, two: string, many: string) => n === 1 ? `${one} واحد` : n === 2 ? two : `${n} ${many}`;
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const dateLabel = (value: string) => new Date(value).toLocaleDateString('ar-QA-u-nu-latn', { day: 'numeric', month: 'long' });
export function createLesson(subject: Subject = 'اللغة الإنجليزية'): Lesson {
  return { id: uid(), title: '', subject, grade: 'الثالث', duration: 35, learnerIds: [], goalIds: [], objective: '', warmup: 'أعرض جدول الحصة المصوّر، وأتيح للطالب اختيار وسيلة الاستجابة المناسبة.', teaching: 'أقدّم مثالًا واحدًا واضحًا، ثم أعرض مثالًا آخر مع وقت كافٍ للمعالجة.', practice: 'أقدّم محاولات قصيرة مرتبطة بالهدف، وأسجّل الاستجابة ونوع التلميح بصورة منفصلة.', closing: 'أراجع ما تعلّمناه بمثال مألوف، وأتيح للطالب الإشارة إلى ما يفضّله.', adaptations: 'تعليمات قصيرة، بدائل واضحة، وقت معالجة مرن، واستراحة عند الحاجة.', source: '', sourceText: '', language: subject === 'اللغة الإنجليزية' ? 'en' : 'ar', status: 'draft', reviewNote: '', questions: [], updatedAt: new Date().toISOString() };
}
const animals: Question[] = [
  { id: 'q1', prompt: 'Which animal has a long neck?', options: ['Giraffe', 'Elephant', 'Bird'], answer: 0 },
  { id: 'q2', prompt: 'Which animal has a trunk?', options: ['Bird', 'Elephant', 'Giraffe'], answer: 1 },
  { id: 'q3', prompt: 'Which animal has wings?', options: ['Elephant', 'Giraffe', 'Bird'], answer: 2 },
  { id: 'q4', prompt: 'Choose the word: giraffe', options: ['Elephant', 'Giraffe', 'Bird'], answer: 1 },
  { id: 'q5', prompt: 'Choose the word: elephant', options: ['Elephant', 'Bird', 'Giraffe'], answer: 0 },
];
export function seedWorkspace(): Workspace {
  const learners: Learner[] = [
    { id: 'demo-1', avatarId: 'avatar1', name: 'سارة · تجريبي', initials: 'س', grade: 'الثالث', color: 'rose', strengths: 'تستمتع بالقصص المصوّرة وتتعرف إلى الحيوانات المألوفة.', needs: 'تعليمات من خطوة واحدة، وقت للمعالجة، وإتاحة الإجابة بالإشارة.', preferences: { ...defaults, choices: 2, response: 'point', understands: ['picture', 'model'], responds: ['point'], shortInstructions: true }, supports: { schedule: ['circle', 'read', 'game', 'break', 'home'], first: 'read', then: 'tablet', tokenGoal: 3, reward: 'tablet', communication: ['help', 'break', 'done', 'yes', 'no', 'water'] }, goals: [{ id: 'g1', text: 'تميّز مفردات الحيوانات من بين بديلين', subject: 'اللغة الإنجليزية', target: 4, opportunities: 5, baseline: 'تتعرف إلى مفردتين من خلال الصور.' }, { id: 'g2', text: 'تعدّ مجموعة حتى خمسة عناصر', subject: 'الرياضيات', target: 4, opportunities: 5, baseline: 'تعدّ حتى ثلاثة عناصر بالمحسوسات.' }] },
    { id: 'demo-2', avatarId: 'avatar2', name: 'عمر · تجريبي', initials: 'ع', grade: 'الثالث', color: 'sage', strengths: 'يستجيب للمحسوسات والأنشطة ذات التسلسل الواضح.', needs: 'نص كبير، مساحة اختيار واسعة، وإعادة الاستماع عند الطلب.', preferences: { ...defaults, largeText: true, highContrast: true, targetSize: 'xl', choices: 2, understands: ['audio', 'model'], responds: ['touch', 'speech'] }, supports: { schedule: ['circle', 'read', 'move', 'home'], first: 'write', then: 'song', tokenGoal: 4, reward: 'song' }, goals: [{ id: 'g3', text: 'يربط اسم الحيوان بصفته المميّزة', subject: 'اللغة الإنجليزية', target: 4, opportunities: 5, baseline: 'يربط مثالًا مألوفًا بمساعدة لفظية.' }] },
    { id: 'demo-3', avatarId: 'avatar3', name: 'مريم · تجريبي', initials: 'م', grade: 'الرابع', color: 'sand', strengths: 'تحب تركيب الكلمات والمشاركة في الروتين اليومي.', needs: 'تقليل المشتتات، تسلسل بصري، وخيار الإجابة دون صوت.', preferences: { ...defaults, sound: true, choices: 2, understands: ['picture', 'text'], shortInstructions: true }, supports: { schedule: ['circle', 'read', 'break', 'game', 'move', 'home'], first: 'read', then: 'move', tokenGoal: 3, reward: 'walk', favourite: 'color' }, goals: [{ id: 'g4', text: 'تختار الكلمة التي تبدأ بالحرف المحدد', subject: 'اللغة العربية', target: 4, opportunities: 5, baseline: 'تميّز صوت حرفين مألوفين.' }] },
    { id: 'demo-5', avatarId: 'avatar5', name: 'نور · تجريبي', initials: 'ن', grade: 'الخامس', color: 'blue', strengths: 'قوية بصريًا وتحب التنظيم والبطاقات.', needs: 'تعليمات مكتوبة ومصوّرة، وتغذية راجعة مرئية، دون اعتماد على السمع.', preferences: { ...defaults, sound: false, understands: ['picture', 'text', 'sign'], responds: ['touch', 'write'] }, goals: [{ id: 'g6', text: 'تربط مفردات الحيوانات بصورها', subject: 'اللغة الإنجليزية', target: 4, opportunities: 5, baseline: 'تربط ثلاث مفردات بصورها.' }] },
    { id: 'demo-6', avatarId: 'avatar6', name: 'ليان · تجريبي', initials: 'ل', grade: 'الرابع', color: 'rose', strengths: 'مثابرة وتحب الأنشطة القصيرة.', needs: 'تستخدم يدًا واحدة: أزرار كبيرة قريبة، وضغطة واحدة، ومنع الضغط المكرر.', preferences: { ...defaults, targetSize: 'xl', hand: 'right', steady: true, instant: true, choices: 2, understands: ['picture', 'text', 'audio'] }, goals: [{ id: 'g7', text: 'تختار اسم الحيوان من بين خيارين', subject: 'اللغة الإنجليزية', target: 3, opportunities: 3, baseline: 'تختار بمساعدة لفظية.' }] },
    { id: 'demo-4', avatarId: 'avatar4', name: 'يوسف · تجريبي', initials: 'ي', grade: 'الثاني', color: 'blue', strengths: 'يفضّل التجربة العملية والفرز حسب اللون والشكل.', needs: 'فترات عمل قصيرة وبديل للإجابة الحركية الدقيقة.', preferences: { ...defaults, choices: 2, scan: true, scanSpeak: true, scanSeconds: 6, targetSize: 'large', responds: ['switch'], understands: ['picture', 'audio'] }, goals: [{ id: 'g5', text: 'يميّز الكائن الحي من الأشياء غير الحية', subject: 'العلوم', target: 3, opportunities: 4, baseline: 'يفرز مثالين بمساعدة النموذج.' }] },
  ];
  const make = (id: string, title: string, subject: Subject, status: Status, ids: string[], goals: string[], objective: string, questions: Question[]) => ({ ...createLesson(subject), id, title, status, learnerIds: ids, goalIds: goals, objective, questions, source: 'محتوى تجريبي للمراجعة التربوية', updatedAt: new Date().toISOString() });
  const lessons = [
    { ...make('animals', 'عالم الحيوانات', 'اللغة الإنجليزية', 'approved', ['demo-1', 'demo-2', 'demo-5', 'demo-6'], ['g1', 'g3', 'g6', 'g7'], 'أن يميّز الطالب مفردات الحيوانات وصفاتها في 4 من 5 محاولات، مع تسجيل مقدار المساعدة.', animals), warmup: 'أعرض صورة حيوانات هادئة وأسأل: ماذا تلاحظ؟ أقبل الإشارة أو تسمية الحيوان.', teaching: 'أعرض giraffe ثم elephant ثم bird. أربط كل مفردة بصفة واضحة: long neck، trunk، wings.', practice: 'أقدّم خمس محاولات قصيرة. لكل طالب نسخته من النشاط وفق ملفه، والهدف واحد.', closing: 'يختار الطالب حيوانه المفضّل، ثم نراجع مفردة واحدة بصورة أو كلمة.', source: 'مستوحى من بنية تحضير We love animals؛ أسئلة تجريبية جديدة', packId: 'pack-animals', adaptations: 'بديلان أو ثلاثة حسب ملف الطالب. تقبّل الإشارة. الصوت اختياري. لا يوجد عدّ تنازلي أو مؤثرات مفاجئة.' },
    make('numbers', 'نعدّ ونكتشف', 'الرياضيات', 'draft', ['demo-1'], ['g2'], 'يعدّ الطالب مجموعات من عنصر واحد إلى خمسة عناصر، في 4 من 5 محاولات.', [{ id: 'n1', prompt: 'كم نقطة ترى؟ ● ● ●', options: ['2', '3', '4'], answer: 1 }, { id: 'n2', prompt: 'ما العدد الذي يأتي بعد 4؟', options: ['3', '5', '2'], answer: 1 }]),
    make('letters', 'رحلة مع الحروف', 'اللغة العربية', 'review', ['demo-3'], ['g4'], 'تختار الطالبة كلمة تبدأ بحرف الباء من بين ثلاث كلمات.', [{ id: 'a1', prompt: 'أي كلمة تبدأ بحرف الباء؟', options: ['باب', 'قلم', 'شمس'], answer: 0 }]),
    make('science', 'حيّ أم غير حيّ؟', 'العلوم', 'approved', ['demo-4'], ['g5'], 'يفرز الطالب أمثلة الكائنات الحية من الأشياء غير الحية.', [{ id: 's1', prompt: 'اختر كائنًا حيًا', options: ['شجرة', 'كرسي', 'قلم'], answer: 0 }, { id: 's2', prompt: 'اختر شيئًا غير حيّ', options: ['قطة', 'حجر', 'زهرة'], answer: 1 }]),
  ];
  return migrateWorkspace({ version: 1, learners, lessons, observations: [] });
}
export function validateLesson(lesson: Lesson, learners: Learner[]): string[] {
  const errors: string[] = [];
  if (!lesson.title.trim()) errors.push('أضف عنوان الدرس.');
  if (!lesson.objective.trim()) errors.push('اكتب هدفًا قابلًا للملاحظة.');
  if (!Number.isFinite(lesson.duration) || lesson.duration < 5 || lesson.duration > 180) errors.push('مدة الحصة يجب أن تكون بين 5 و180 دقيقة.');
  if (!lesson.learnerIds.length) errors.push('اختر طالبًا واحدًا على الأقل.');
  if (!lesson.goalIds.length) errors.push('اربط الدرس بهدف فردي واحد على الأقل.');
  const validGoals = learners.filter(s => lesson.learnerIds.includes(s.id)).flatMap(s => s.goals.filter(g => g.subject === lesson.subject).map(g => g.id));
  if (lesson.goalIds.some(g => !validGoals.includes(g))) errors.push('يوجد هدف لا ينتمي للمادة أو للطلاب المحددين.');
  if ([lesson.warmup, lesson.teaching, lesson.practice, lesson.closing].some(t => !t.trim())) errors.push('أكمل مراحل الحصة الأربع.');
  lesson.questions.forEach((q, i) => { if (!q.prompt.trim() || q.options.length < 2 || q.options.some(o => !o.trim()) || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) errors.push(`راجع السؤال ${i + 1} ومفتاح إجابته.`); });
  return errors;
}
export function transitionLesson(lesson: Lesson, status: Status, learners: Learner[], note = ''): Lesson {
  if (status !== 'draft') { const errors = validateLesson(lesson, learners); if (errors.length) throw new Error(errors.join(' ')); }
  if (status === 'approved' && lesson.status !== 'review') throw new Error('أرسل التحضير إلى المراجعة أولًا.');
  if (status === 'draft' && lesson.status === 'review' && !note.trim()) throw new Error('أضف سبب الإرجاع لمساعدة المعلم.');
  return { ...lesson, status, reviewNote: note, updatedAt: new Date().toISOString() };
}
export function questionOptions(q: Question, count: 1 | 2 | 3 | 4) {
  const distractors = q.options.map((_, i) => i).filter(i => i !== q.answer).slice(0, count - 1);
  return q.options.map((text, index) => ({ text, index })).filter(o => o.index === q.answer || distractors.includes(o.index));
}
const seededPacks: Record<string, string> = { animals: 'pack-animals', letters: 'pack-words-ar', science: 'pack-living' };
/** Brings older saved workspaces up to the current shape without touching teacher edits. */
export function migrateWorkspace(w: Workspace): Workspace { return { ...w, packs: w.packs ?? [], learners: w.learners.map(l => l.avatarId || !/^demo-[1-6]$/.test(l.id) ? l : { ...l, avatarId: `avatar${l.id.slice(5)}` }), lessons: w.lessons.map(l => l.packId || !seededPacks[l.id] ? l : { ...l, packId: seededPacks[l.id] }) }; }
/** Plain-language summary of how an activity changes for this learner. */
export function describeAdaptation(p: Preferences): string[] {
  if (p.access?.quiet) p = { ...p, sound: false, reducedMotion: true, access: { ...p.access, vibrate: false } };
  const out = [p.choices === 1 ? 'خيار واحد: تعلّم بلا خطأ' : p.choices === 2 ? 'خياران' : `${p.choices} خيارات`];
  if (p.targetSize === 'large') out.push('أزرار كبيرة');
  if (p.targetSize === 'xl') out.push('أزرار كبيرة جدًا');
  if (p.hand === 'right') out.push('الأزرار جهة اليد اليمنى');
  if (p.hand === 'left') out.push('الأزرار جهة اليد اليسرى');
  if (p.largeText) out.push('نص أكبر');
  if (p.highContrast) out.push('تباين مرتفع');
  out.push(p.sound ? 'صوت عند الطلب' : 'بلا صوت');
  if (p.steady) out.push('منع الضغط المكرر');
  if (p.instant) out.push('اختيار مباشر');
  if (p.scan) out.push(p.access?.switches === 2 ? 'مفتاحان: التالي والاختيار' : 'مسح بمفتاح واحد');
  if (p.responds?.includes('dwell')) out.push('اختيار بالتثبيت');
  if (p.response === 'point') out.push('يشير والمعلم يسجّل');
  if (p.shortInstructions) out.push('تعليمة قصيرة');
  const r = p.access;
  if (r?.readAlong && p.sound) out.push('اقرأ معي بتظليل الكلمة');
  if (r?.easyFont) out.push('خط ميسّر للقراءة');
  if (r?.spacing) out.push('تباعد أوسع للأسطر والكلمات');
  if (r?.tint && r.tint !== 'none') out.push('خلفية مريحة للنص');
  if (r?.ruler) out.push('مسطرة القراءة');
  if (r?.focusOne) out.push('عنصر واحد بخلفية سادة');
  if (r?.highlight === 'yellow') out.push('تمييز الهدف بالأصفر على أسود');
  if (r?.highlight === 'red') out.push('تمييز الهدف بالأحمر على أسود');
  if (r?.describe && p.sound) out.push('وصف الصورة صوتيًا عند التركيز');
  if (r?.level === 'symbol') out.push('المستوى الثاني: رمز وكلمة');
  if (r?.level === 'word') out.push('المستوى الثالث: كلمة فقط');
  if (r?.model) out.push('نمذجة السؤال الأول قبل البدء');
  if (r?.repeatMissed) out.push('إعادة ما أخطأ فيه في آخر الجولة');
  if (r?.quiet) out.push('وضع حسي هادئ: بلا صوت ولا حركة ولا اهتزاز');
  if (r?.rounds) out.push(`${r.rounds} أسئلة في الجولة`);
  if (r?.workMinutes) out.push(`مؤقت عمل ${r.workMinutes} دقائق ثم استراحة`);
  if (r?.moveBreak) out.push('استراحة حركية مصوّرة');
  if (r?.tokens) out.push('نجمة بعد كل إجابة صحيحة');
  if (p.understands?.includes('sign')) out.push('فيديو الإشارة ظاهر تلقائيًا');
  if (r?.vibrate ?? !p.sound) out.push('اهتزاز خفيف عند الإجابة');
  return out;
}
/** Combinations a teacher probably did not intend. Advice only: nothing is changed automatically. */
export function adaptationConflicts(p: Preferences): string[] {
  const out: string[] = []; const u = p.understands ?? [];
  if (!u.length) out.push('لم تحدد كيف يفهم الطالب التعليمات.');
  if (!p.sound && u.length === 1 && u[0] === 'audio') out.push('الصوت متوقف، بينما الصوت هو الطريقة الوحيدة المحددة لفهم التعليمات.');
  if (u.includes('sign') && !u.includes('picture') && !u.includes('text')) out.push('تحتاج لغة الإشارة إلى فيديو لكل عنصر. أضف صورة أو نصًا كبديل عندما لا يتوفر الفيديو.');
  if (p.responds?.includes('switch') && !p.scan) out.push('اخترت الإجابة بمفتاح واحد دون تفعيل المسح التلقائي.');
  if (p.access?.describe && !p.sound) out.push('وصف الصورة صوتيًا يحتاج الصوت، والصوت متوقف لهذا الطالب.');
  if (p.access?.readAlong && !p.sound) out.push('«اقرأ معي» يحتاج الصوت، والصوت متوقف لهذا الطالب.');
  if (p.response === 'point' && p.instant) out.push('الاختيار المباشر يسجّل الضغطة فورًا، بينما الطالب يشير والمعلم يضغط: تأكد أن هذا ما تريد.');
  return out;
}
export function assertWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false;
  const v = value as Workspace;
  return v.version === 1 && Array.isArray(v.learners) && Array.isArray(v.lessons) && Array.isArray(v.observations) && v.learners.every(s => typeof s.id === 'string' && typeof s.name === 'string' && Array.isArray(s.goals) && !!s.preferences) && v.lessons.every(l => typeof l.id === 'string' && typeof l.title === 'string' && Array.isArray(l.questions) && Array.isArray(l.learnerIds) && Array.isArray(l.goalIds));
}
