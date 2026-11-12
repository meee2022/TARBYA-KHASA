import type { ContentPack, TemplateId, TemplateInfo } from './packs.ts';
import type { Preferences, Support } from './index.ts';

export interface SymbolEntry { id: string; label: string; emoji: string; imageId?: string; }
/** A short pictured story read before a new activity or an expected situation. Each page is one picture and one literal sentence. */
export interface SocialStory { id: string; title: string; pages: SymbolEntry[]; }
export interface AvatarEntry { id: string; imageId: string; }
export interface SupportEntry { id: Support; label: string; enabled: boolean; }
export interface ProfilePreset { id: string; label: string; description: string; settings: Partial<Preferences>; }
export interface PlanPatternStage { teacher: string; student: string; }
export interface PlanPatternSession { objective: string; activity: TemplateId; warmup: PlanPatternStage; content: PlanPatternStage; closing: PlanPatternStage; }
export interface GoalBankEntry { id: string; subject: string; behaviour: string; condition: string; }
/** One ministry standard for a subject and grade. The teacher ties lessons and goals to it; the list itself comes from the admin console. */
export interface StandardEntry { id: string; subject: string; grade: string; code: string; text: string; }
/** An outside search the lesson page offers with the lesson's title filled in: a video channel, a worksheet site. {q} marks where the words go. */
export interface LinkSource { id: string; label: string; url: string; kind: 'video' | 'worksheet' | 'site'; }
/** A ready opening for a lesson. An empty subject or grade means it suits any. The bank belongs to the admin; the teacher picks from it and edits. */
export interface WarmupEntry { id: string; subject: string; grade: string; title: string; text: string; }
/** One lesson of a unit, written station by station. Only the title and the objective are required. */
export interface CurriculumLesson { id: string; title: string; objective: string; warmup?: string; teaching?: string; practice?: string; independent?: string; assessment?: string; closing?: string; }
/** A unit of one subject in one grade. The teacher opens a lesson from it as an editable draft. */
export interface UnitEntry { id: string; subject: string; grade: string; title: string; lessons: CurriculumLesson[]; }
export const linkKindLabels: Record<LinkSource['kind'], string> = { video: 'فيديو', worksheet: 'أوراق عمل', site: 'موقع' };
export const searchUrl = (source: LinkSource, words: string) => source.url.replace('{q}', encodeURIComponent(words.trim()).replace(/%20/g, '+'));
export const planningLists = { settings: 'أماكن الملاحظة', people: 'من كان مع الطالب', materials: 'وسيلة الملاحظة', strategies: 'إستراتيجيات التدريس', teachingAids: 'الوسائل والترتيبات', assessmentTools: 'أدوات التقييم', classroomAccommodations: 'تسهيلات البيئة الصفية', assessmentAccommodations: 'تسهيلات التقييم', curriculumAccommodations: 'تسهيلات المنهاج', supportLevels: 'مستويات الدعم', curriculumTypes: 'أنواع المنهاج', performanceDomains: 'مجالات الأداء', reviewReasons: 'أسباب مراجعة الخطة', reviewParties: 'أطراف مراجعة الخطة', behaviourFunctions: 'وظائف السلوك المفترضة', behaviourPrevention: 'إستراتيجيات وقائية للسلوك' } as const;
export type PlanningList = keyof typeof planningLists;
export interface Catalog extends Record<PlanningList, string[]> {
  academicYear: string; planPattern: PlanPatternSession[]; goalBank: GoalBankEntry[]; standards: StandardEntry[]; linkSources: LinkSource[]; warmups: WarmupEntry[]; units: UnitEntry[];
  subjects: string[]; grades: string[]; support: SupportEntry[]; templates: TemplateInfo[]; packs: ContentPack[]; presets: ProfilePreset[];
  avatars: AvatarEntry[]; communication: SymbolEntry[]; activities: SymbolEntry[]; rewards: SymbolEntry[]; rules: SymbolEntry[]; values: SymbolEntry[]; weather: SymbolEntry[]; movement: SymbolEntry[]; stories: SocialStory[];
}
export const symbolLists = { communication: 'لوحة التواصل', activities: 'أنشطة الجدول المصوّر', rewards: 'خيارات التعزيز', rules: 'قوانين الصف', values: 'قيم الأسبوع', weather: 'حالات الطقس', movement: 'الاستراحات الحركية' } as const;
export type SymbolList = keyof typeof symbolLists;

export const art = (name: string) => `/images/content/${name}.webp`;
const symbols = (prefix: string, rows: [string, string, string][]): SymbolEntry[] => rows.map(([id, label, emoji]) => ({ id, label, emoji, imageId: art(`${prefix}-${id}`) }));
const item = (id: string, text: string, emoji: string, picture: string, extra: { description?: string; group?: string } = {}) => ({ id, text, emoji, imageId: art(picture), ...extra });
const stamp = '2026-11-01T00:00:00.000Z';

// First-run content only. Everything here is editable or removable from the admin console.
export const defaultCatalog: Catalog = {
  subjects: ['اللغة الإنجليزية', 'اللغة العربية', 'الرياضيات', 'العلوم', 'التربية الإسلامية', 'الدراسات الاجتماعية', 'المهارات الحياتية'],
  grades: ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'],
  support: [
    { id: 'independent', label: 'باستقلالية', enabled: true }, { id: 'visual', label: 'بتلميح بصري', enabled: true }, { id: 'gesture', label: 'بإيماءة أو إشارة', enabled: true },
    { id: 'verbal', label: 'بتلميح لفظي', enabled: true }, { id: 'model', label: 'بنموذج', enabled: true }, { id: 'partial', label: 'بمساعدة جسدية جزئية', enabled: true },
    { id: 'physical', label: 'بمساعدة جسدية كاملة', enabled: true }, { id: 'not-observed', label: 'لم تُلاحظ الاستجابة', enabled: true },
  ],
  templates: ([
    ['cards', 'بطاقات تعلّم', 'أي ضغطة تُظهر البطاقة التالية بالصورة والكلمة والصوت. مناسبة للتعريف ولتعلّم وسيلة الإدخال.', 'التعرّف والسبب والنتيجة', 'blue'],
    ['choose-word', 'ما اسم الصورة؟', 'تظهر صورة ويختار الطالب اسمها.', 'ربط الصورة بالكلمة', 'sage'],
    ['choose-picture', 'أين الصورة؟', 'تظهر كلمة ويختار الطالب صورتها.', 'تمييز مدلول الكلمة', 'rose'],
    ['listen', 'أسمع وأختار', 'يستمع الطالب ثم يختار الصورة. لا يناسب من لا يعتمد على السمع.', 'الفهم السمعي', 'sand'],
    ['repeat', 'أسمع وأكرر', 'يسمع الطالب الكلمة بصوت المعلم ويكررها، والمعلم يسجّل المحاولة بالضغط. لا تقييم آلي للنطق.', 'النطق والتقليد', 'rose'],
    ['door', 'خلف الباب', 'يفتح الطالب بابًا ويكتشف ما خلفه، ثم يختار اسمه.', 'التشويق والتسمية', 'sand'],
    ['match', 'طابق بالنقر', 'يضغط الكلمة ثم صورتها، دون أي سحب.', 'المطابقة', 'sage'],
    ['memory', 'بطاقات الذاكرة', 'يبحث عن كل بطاقتين متشابهتين، بدءًا من زوجين.', 'الانتباه والذاكرة', 'blue'],
    ['puzzle', 'ركّب الصورة', 'يختار القطعة ثم مكانها، بقطع قليلة وبلا سحب.', 'الإدراك البصري', 'rose'],
    ['build', 'ركّب الكلمة', 'يضغط الحروف بالترتيب لتكوين الكلمة.', 'القراءة والتهجئة', 'sage'],
    ['classify', 'لكل شيء مجموعته', 'يضع كل عنصر في مجموعته بضغطة واحدة.', 'التصنيف', 'sand'],
    ['sequence', 'خطوتي التالية', 'يرتّب خطوات المهارة خطوة واحدة في كل مرة.', 'التسلسل والاستقلالية', 'blue'],
    ['robot', 'وجّه الروبوت', 'يحرّك الروبوت بالأسهم الكبيرة أو بمفتاح واحد نحو الإجابة.', 'التآزر والتوجيه', 'rose'],
    ['braille', 'اكتشف خلية برايل', 'يكوّن خمسة أحرف عربية بالنقاط الست، مع وصف مواضعها.', 'التعرّف إلى رموز برايل', 'rose'],
  ] as [TemplateId, string, string, string, string][]).map(([id, title, description, skill, color]) => ({ id, title, description, skill, color, enabled: true, imageId: art(id === 'repeat' ? 'tpl-listen' : `tpl-${id}`) })),
  packs: [
    { id: 'pack-animals', title: 'الحيوانات البرية', subject: 'اللغة الإنجليزية', language: 'en', ordered: false, updatedAt: stamp, items: [item('a1', 'whale', '🐋', 'whale', { description: 'حيوان ضخم يعيش في البحر' }), item('a2', 'giraffe', '🦒', 'giraffe', { description: 'حيوان له رقبة طويلة' }), item('a3', 'hippo', '🦛', 'hippo', { description: 'حيوان ضخم يحب الماء' }), item('a4', 'cheetah', '🐆', 'cheetah', { description: 'حيوان سريع جدًا' }), item('a5', 'crocodile', '🐊', 'crocodile', { description: 'حيوان له فك طويل وأسنان' }), item('a6', 'elephant', '🐘', 'elephant', { description: 'حيوان له خرطوم' }), item('a7', 'bird', '🐦', 'bird', { description: 'حيوان له جناحان' })] },
    { id: 'pack-words-ar', title: 'كلمات من حولي', subject: 'اللغة العربية', language: 'ar', ordered: false, updatedAt: stamp, items: [item('w1', 'باب', '🚪', 'door'), item('w2', 'بيت', '🏠', 'house'), item('w3', 'قلم', '✏️', 'pencil'), item('w4', 'كتاب', '📖', 'book'), item('w5', 'شمس', '☀️', 'sun'), item('w6', 'ماء', '💧', 'drop')] },
    { id: 'pack-count', title: 'نعدّ حتى خمسة', subject: 'الرياضيات', language: 'ar', ordered: false, updatedAt: stamp, items: [item('n1', '1', '🍎', 'apple1'), item('n2', '2', '🍎🍎', 'apple2'), item('n3', '3', '🍎🍎🍎', 'apple3'), item('n4', '4', '🍎🍎🍎🍎', 'apple4'), item('n5', '5', '🍎🍎🍎🍎🍎', 'apple5')] },
    { id: 'pack-count-10', title: 'نعدّ من ستة إلى عشرة', subject: 'الرياضيات', language: 'ar', ordered: false, updatedAt: stamp, items: [6, 7, 8, 9, 10].map(n => ({ id: `n${n}`, text: String(n), emoji: '🍊'.repeat(n), description: `${n} برتقالات` })) },
    { id: 'pack-dice', title: 'كم نقطة؟ (بلا عدّ)', subject: 'الرياضيات', language: 'ar', ordered: false, updatedAt: stamp, items: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'].map((face, i) => ({ id: `d${i + 1}`, text: String(i + 1), emoji: face, description: `وجه نرد فيه ${i + 1} نقاط` })) },
    { id: 'pack-words-harakat', title: 'كلمات بالحركات', subject: 'اللغة العربية', language: 'ar', ordered: false, updatedAt: stamp, items: [item('k1', 'بَيْت', '🏠', 'house'), item('k2', 'قَلَم', '✏️', 'pencil'), item('k3', 'شَمْس', '☀️', 'sun'), item('k4', 'كِتَاب', '📖', 'book'), item('k5', 'وَرْد', '🌸', 'flower'), item('k6', 'بَاب', '🚪', 'door')] },
    { id: 'pack-living', title: 'حيّ أم غير حيّ؟', subject: 'العلوم', language: 'ar', ordered: false, updatedAt: stamp, items: [item('l1', 'قطة', '🐈', 'cat', { group: 'كائن حي' }), item('l2', 'شجرة', '🌳', 'tree', { group: 'كائن حي' }), item('l3', 'زهرة', '🌸', 'flower', { group: 'كائن حي' }), item('l4', 'كرسي', '🪑', 'chair', { group: 'شيء غير حي' }), item('l5', 'قلم', '✏️', 'pencil', { group: 'شيء غير حي' }), item('l6', 'حجر', '🪨', 'stone', { group: 'شيء غير حي' })] },
    { id: 'pack-wash', title: 'أغسل يدي', subject: 'المهارات الحياتية', language: 'ar', ordered: true, updatedAt: stamp, items: [item('h1', 'أبلّل يدي بالماء', '💧', 'wash1'), item('h2', 'أضع الصابون وأفرك يدي', '🧼', 'wash2'), item('h3', 'أشطف الصابون بالماء', '🚰', 'wash3'), item('h4', 'أجفّف يدي', '🧻', 'wash4')] },
    { id: 'pack-travel', title: 'أجهّز حقيبة السفر', subject: 'المهارات الحياتية', language: 'ar', ordered: true, updatedAt: stamp, items: [item('t1', 'أفتح الحقيبة', '🧳', 'travel1'), item('t2', 'أطوي ملابسي', '👕', 'travel2'), item('t3', 'أضع الملابس في الحقيبة', '🎒', 'travel3'), item('t4', 'أغلق الحقيبة', '🔒', 'travel4')] },
  ],
  presets: [
    { id: 'calm', label: 'هدوء وتركيز', description: 'خيارات أقل، بلا حركة، مع تأكيد الإجابة.', settings: { choices: 2, reducedMotion: true, instant: false } },
    { id: 'visual', label: 'بصري أولًا', description: 'نص وصور أكبر مع تباين وقراءة صوتية.', settings: { largeText: true, highContrast: true, sound: true, targetSize: 'xl', choices: 2, understands: ['audio', 'model'] } },
    { id: 'hearing', label: 'بدون اعتماد على السمع', description: 'تعليمات وتغذية راجعة مكتوبة ومصوّرة.', settings: { sound: false, understands: ['picture', 'text', 'model'] } },
    { id: 'motor', label: 'يد واحدة وأهداف كبيرة', description: 'أهداف كبيرة، منع الضغط المكرر، واختيار مباشر.', settings: { targetSize: 'xl', steady: true, instant: true, choices: 2 } },
    { id: 'switch', label: 'مفتاح واحد', description: 'تنقّل تلقائي بين الأزرار وقراءة كل زر.', settings: { responds: ['switch'], scan: true, scanSpeak: true, sound: true, choices: 2, targetSize: 'large' } },
    { id: 'aac', label: 'تواصل بالصور', description: 'الإجابة بالصورة أو الإشارة، ويسجّلها المعلم.', settings: { response: 'point', responds: ['point'], understands: ['picture', 'model'], choices: 2 } },
  ],
  avatars: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ id: `avatar${n}`, imageId: art(`avatar${n}`) })),
  communication: symbols('c', [['help', 'أحتاج مساعدة', '🙋'], ['break', 'أحتاج استراحة', '⏸️'], ['repeat', 'أعد التعليمات', '🔁'], ['done', 'انتهيت', '✅'], ['yes', 'نعم', '👍'], ['no', 'لا', '✋'], ['water', 'أريد ماء', '💧'], ['toilet', 'دورة المياه', '🚻'], ['hurt', 'أشعر بألم', '🤕'], ['happy', 'أنا سعيد', '😊'], ['sad', 'أنا حزين', '😢'], ['loud', 'الصوت عالٍ', '🔇']]),
  activities: symbols('a', [['circle', 'الروتين الصباحي', '🌤️'], ['read', 'نقرأ', '📖'], ['write', 'نكتب', '✏️'], ['math', 'نعدّ', '🔢'], ['game', 'نلعب نشاطًا', '🎮'], ['video', 'نشاهد', '🎬'], ['hands', 'نشاط يدوي', '✂️'], ['move', 'نتحرك', '🤸'], ['snack', 'نأكل', '🍎'], ['wash', 'نغسل أيدينا', '🧼'], ['break', 'استراحة', '🛋️'], ['home', 'نعود إلى البيت', '🏠']]),
  stories: [
    { id: 'line', title: 'نقف في الطابور', pages: [{ id: 'p1', label: 'عندما ينتهي الدرس نخرج من الفصل.', emoji: '🚪' }, { id: 'p2', label: 'نقف واحدًا خلف الآخر.', emoji: '🧍' }, { id: 'p3', label: 'أترك مسافة صغيرة بيني وبين صديقي.', emoji: '↔️' }, { id: 'p4', label: 'نمشي عندما يمشي المعلم.', emoji: '🚶' }, { id: 'p5', label: 'إذا احتجت مساعدة أرفع يدي.', emoji: '✋' }] },
    { id: 'change', title: 'نغيّر النشاط', pages: [{ id: 'p1', label: 'أحيانًا ينتهي نشاط ويبدأ نشاط آخر.', emoji: '🔁' }, { id: 'p2', label: 'المعلم يخبرني قبل التغيير بدقيقة.', emoji: '⏳' }, { id: 'p3', label: 'أنظر إلى الجدول لأعرف ما التالي.', emoji: '🗓️' }, { id: 'p4', label: 'إذا شعرت بالضيق أطلب استراحة.', emoji: '⏸️' }] },
    { id: 'visitor', title: 'زائر في الفصل', pages: [{ id: 'p1', label: 'اليوم يأتي شخص جديد إلى الفصل.', emoji: '🧑' }, { id: 'p2', label: 'الزائر يجلس ويشاهد.', emoji: '🪑' }, { id: 'p3', label: 'أكمل عملي كالعادة.', emoji: '✏️' }, { id: 'p4', label: 'يمكنني أن أقول مرحبًا أو أن ألوّح بيدي.', emoji: '👋' }] },
  ],
  // Seated and standing options: the teacher keeps only what each learner's body allows.
  movement: [{ id: 'stretch', label: 'قف ومدّ يديك إلى الأعلى', emoji: '🙆' }, { id: 'shoulders', label: 'حرّك كتفيك إلى الأعلى ثم إلى الأسفل', emoji: '🤷' }, { id: 'breathe', label: 'تنفّس ببطء ثلاث مرات', emoji: '🌬️' }, { id: 'clap', label: 'صفّق خمس مرات', emoji: '👏' }, { id: 'march', label: 'امشِ في مكانك عشر خطوات', emoji: '🚶' }],
  rewards: symbols('r', [['tablet', 'وقت على الجهاز', '📱'], ['song', 'أغنية مفضلة', '🎵'], ['color', 'تلوين', '🎨'], ['walk', 'جولة قصيرة', '🚶'], ['puzzle', 'لعبة تركيب', '🧩'], ['book', 'قصة', '📚'], ['star', 'ملصق نجمة', '⭐']]),
  rules: symbols('rule', [['listen', 'أنتبه للمعلم', '👂'], ['hand', 'أرفع يدي', '✋'], ['sit', 'أجلس في مكاني', '🪑'], ['kind', 'أتعامل بلطف', '🤝'], ['tidy', 'أرتّب أدواتي', '🧹']]),
  values: symbols('v', [['thanks', 'الشكر', '🙏'], ['honesty', 'الصدق', '💎'], ['help', 'التعاون', '🤝'], ['respect', 'الاحترام', '🌟'], ['patience', 'الصبر', '🌱']]),
  academicYear: '2026-2027',
  // Empty until the coordinator sends the ministry's standards; the admin pastes them per subject and grade.
  standards: [],
  // A first-run sample for one subject and one grade, so the path from grade and subject to a lesson can be tried. It is not curriculum coverage; the admin replaces it.
  warmups: [
    { id: 'wu-schedule', subject: '', grade: '', title: 'جدول الحصة المصوّر', text: 'أعرض جدول الحصة بالصور: الآن، التالي، ثم النشاط المحبب. يشير الطالب إلى ما سنبدأ به.' },
    { id: 'wu-box', subject: '', grade: '', title: 'صندوق المفاجأة', text: 'أُخرج من الصندوق غرضًا مرتبطًا بالدرس. يلمسه الطالب ويسمّيه، أو يختار صورته من بديلين.' },
    { id: 'wu-move', subject: '', grade: '', title: 'حركة وإيقاع', text: 'ثلاث حركات قصيرة مع العدّ: تصفيق، وقوف، جلوس. ثم نجلس للدرس.' },
    { id: 'wu-letters', subject: 'اللغة العربية', grade: '', title: 'نشيد الحروف', text: 'نردد نشيد الحروف مع بطاقات كبيرة، وأتوقف عند حرف الدرس ليكمل الطالب صوته أو يشير إليه.' },
    { id: 'wu-count', subject: 'الرياضيات', grade: '', title: 'نعدّ ما حولنا', text: 'نعدّ أغراضًا حقيقية من الصف حتى خمسة، ويلمس الطالب كل غرض أثناء العدّ.' },
    { id: 'wu-hello', subject: 'اللغة الإنجليزية', grade: '', title: 'أغنية الترحيب', text: 'نغنّي أغنية الترحيب القصيرة بالإنجليزية، ويلوّح كل طالب عند سماع اسمه.' },
    { id: 'wu-picture', subject: 'العلوم', grade: '', title: 'ماذا في الصورة؟', text: 'أعرض صورة واحدة من الدرس وأسأل: ماذا ترى؟ يجيب الطالب بكلمة أو إشارة أو باختيار بطاقة.' },
  ],
  units: [
    { id: 'unit-ar1-letters', subject: 'اللغة العربية', grade: 'الأول', title: 'الحروف وأصواتها', lessons: [
      { id: 'cl-ba', title: 'حرف الباء', objective: 'أن يميّز الطالب صوت الباء في أول الكلمة ويشير إلى صورتها، في 4 من 5 محاولات.',
        warmup: 'نردد نشيد الحروف، ثم أُخرج من الصندوق ثلاثة أشياء تبدأ بالباء: بطة، باب، برتقالة، وأسمّيها بصوت واضح.',
        teaching: 'أعرض بطاقة الحرف وأنطق صوته، ثم أنمذج: «بـ… بطة». أكرر مع كل صورة وأترك وقتًا ليكرر الطالب أو يشير.',
        practice: 'أعرض صورتين، واحدة منهما تبدأ بالباء. يختار الطالب معي، وأقلل التلميح في كل محاولة.',
        independent: 'يفرز الطالب بطاقات الصور في سلّتين: تبدأ بالباء، ولا تبدأ بالباء.',
        assessment: 'خمس محاولات بصور جديدة. أسجّل الإجابة ونوع المساعدة في كل محاولة.',
        closing: 'نراجع الأشياء الثلاثة الأولى، ويختار الطالب ما أحبه منها.' },
      { id: 'cl-mim', title: 'حرف الميم', objective: 'أن يميّز الطالب صوت الميم في أول الكلمة ويشير إلى صورتها، في 4 من 5 محاولات.',
        warmup: 'أعرض مرآة صغيرة، وننطق «مممم» ونلاحظ انطباق الشفتين. ثم أسمّي: موز، مفتاح، ماء.',
        teaching: 'أعرض بطاقة الحرف وأنمذج: «مـ… موز». أقارن بصوت الباء من الدرس السابق بمثال واحد.',
        practice: 'أعرض صورتين، واحدة تبدأ بالميم. يختار الطالب معي، وأقلل التلميح تدريجيًا.',
        independent: 'يلصق الطالب صور الكلمات التي تبدأ بالميم على لوحة الحرف.',
        assessment: 'خمس محاولات بصور جديدة. أسجّل الإجابة ونوع المساعدة في كل محاولة.',
        closing: 'نقول معًا كلمات الدرس، ويشير الطالب إلى صورته المفضلة.' },
    ] },
    { id: 'unit-ar1-words', subject: 'اللغة العربية', grade: 'الأول', title: 'كلمات من حولي', lessons: [
      { id: 'cl-class', title: 'أشياء في صفي', objective: 'أن يسمّي الطالب أربعة أشياء في الصف أو يشير إليها عند سماع اسمها، في 4 من 5 محاولات.',
        warmup: 'نتجول في الصف جولة قصيرة، وألمس كل غرض وأسمّيه: كرسي، باب، كتاب، قلم.',
        teaching: 'أعرض صورة كل غرض بجانب الغرض الحقيقي، وأسمّيه ثم أنتظر أن يكرر الطالب أو يشير.',
        practice: 'أقول الاسم ويختار الطالب الصورة من بديلين، ثم من ثلاثة عندما يستعد.',
        independent: 'يطابق الطالب بطاقات الصور مع الأغراض الحقيقية في الصف.',
        assessment: 'أسمّي خمسة أغراض بترتيب مختلف، وأسجّل الإجابة ونوع المساعدة.',
        closing: 'يختار الطالب غرضًا واحدًا ويخبرنا باسمه بوسيلته.' },
    ] },
  ],
  linkSources: [{ id: 'qatar-edu-youtube', label: 'قناة قطر للتعليم على يوتيوب', url: 'https://www.youtube.com/results?search_query=%D9%82%D9%86%D8%A7%D8%A9+%D9%82%D8%B7%D8%B1+%D9%84%D9%84%D8%AA%D8%B9%D9%84%D9%8A%D9%85+{q}', kind: 'video' }, { id: 'liveworksheets', label: 'أوراق عمل تفاعلية جاهزة', url: 'https://www.liveworksheets.com/worksheets/search?q={q}', kind: 'worksheet' }],
  settings: ['غرفة المصادر', 'الفصل', 'الساحة', 'المقصف', 'البيت'],
  people: ['معلم التربية الخاصة', 'معلم الفصل', 'مساعد المعلم', 'الأسرة', 'زميل'],
  materials: ['الشاشة', 'بطاقات', 'محسوسات', 'كتاب', 'الموقف الحقيقي'],
  strategies: ['التعلم متعدد الحواس', 'النمذجة ثم التدريب الموجّه', 'تحليل المهارة', 'التعلم باللعب', 'التدريب المباشر', 'التكرار والمراجعة', 'التلقين التدريجي', 'التكنولوجيا المساعدة'],
  teachingAids: ['بطاقات مصوّرة A4', 'نشاط المنصة على الآيباد', 'مجسمات ووسائل يدوية', 'أوراق عمل من الحزمة', 'فيديو تعليمي قصير', 'لوحة التواصل بالصور', 'الجدول المصوّر', 'مؤقت مرئي'],
  assessmentTools: ['ملاحظة المعلم', 'أسئلة شفوية أو بالإشارة', 'ورقة عمل', 'نشاط على المنصة', 'أداء عملي', 'قائمة تحليل المهارة'],
  classroomAccommodations: ['الجلوس قريبًا من المعلم وبعيدًا عن المشتتات', 'تقسيم الحصة إلى فترات قصيرة مع استراحات', 'استخدام جدول مصوّر للحصة', 'إتاحة ركن هادئ عند الحاجة', 'تكبير المواد البصرية', 'وضع الأدوات في جهة اليد المستخدمة'],
  assessmentAccommodations: ['تبسيط صياغة الأسئلة', 'زمن إضافي', 'إجابة شفوية أو بالإشارة أو بالضغط', 'قراءة الأسئلة للطالب', 'عدد أقل من الخيارات', 'تقييم على فترات متعددة'],
  curriculumAccommodations: ['تبسيط المفاهيم بما يناسب مستوى الطالب', 'تقليل كمية المفردات مع الحفاظ على الهدف', 'الاعتماد على الصور والمحسوسات', 'التدرج من المحسوس إلى المجرد', 'ربط المحتوى بالحياة اليومية'],
  supportLevels: ['دعم بسيط', 'دعم متوسط', 'دعم مكثف'],
  curriculumTypes: ['المنهاج العام', 'منهاج معدّل', 'منهاج مكيّف', 'منهاج مهارات حياتية'],
  performanceDomains: ['المهارات المعرفية والأكاديمية', 'المهارات اللغوية والتواصلية', 'المهارات الحركية', 'المهارات الاجتماعية', 'المهارات السلوكية والانفعالية', 'المهارات الاستقلالية'],
  behaviourFunctions: ['لجذب الانتباه', 'للتهرب من مهمة أو موقف', 'للحصول على شيء مرغوب', 'حسي أو تنظيم ذاتي', 'غير واضحة بعد، تحتاج ملاحظة'],
  behaviourPrevention: ['جدول مصوّر لليوم', 'تنبيه قبل الانتقال', 'تقسيم المهمة إلى خطوات', 'خياران محددان', 'استراحات حركية قصيرة', 'تقليل المشتتات', 'قصة اجتماعية', 'ركن هادئ', 'تعزيز السلوك البديل فورًا', 'قواعد الصف مصوّرة'],
  reviewReasons: ['تقييم الأهداف', 'تحديث طرق التدريس', 'تعديل التقييم', 'إضافة خدمات جديدة', 'أخرى'],
  reviewParties: ['معلم التربية الخاصة', 'منسق التربية الخاصة', 'معلم الفصل', 'ولي الأمر', 'أخصائي نفسي', 'أخصائي خدمات مساندة'],
  goalBank: ([
    ['اللغة الإنجليزية', 'يميّز الطالب مدلول الكلمة', 'عند عرض الصورة وخيارين'], ['اللغة الإنجليزية', 'يسمّي الطالب الصورة', 'بالكلمة أو الإشارة'], ['اللغة الإنجليزية', 'يقرأ الطالب الكلمة', 'من بطاقة مكتوبة'],
    ['اللغة العربية', 'يميّز الطالب صوت الحرف', 'في بداية كلمة مألوفة'], ['اللغة العربية', 'يختار الطالب الكلمة', 'التي تبدأ بالحرف المحدد'], ['اللغة العربية', 'يركّب الطالب الكلمة', 'من حروفها بالضغط'],
    ['الرياضيات', 'يعدّ الطالب مجموعة', 'حتى خمسة عناصر بالمحسوسات'], ['الرياضيات', 'يطابق الطالب العدد بالكمية', 'عند عرض صورة'],
    ['العلوم', 'يصنّف الطالب الأمثلة', 'إلى مجموعتين بالصور'],
    ['المهارات الحياتية', 'يؤدي الطالب خطوات غسل اليدين', 'بالترتيب وباستخدام الجدول المصوّر'], ['المهارات الحياتية', 'يطلب الطالب الاستراحة', 'باستخدام بطاقة أو رمز'], ['المهارات الحياتية', 'يرتّب الطالب أدواته', 'بعد انتهاء النشاط'],
  ] as [string, string, string][]).map(([subject, behaviour, condition], n) => ({ id: `bank-${n}`, subject, behaviour, condition })),
  planPattern: [
    { objective: 'أن يميّز الطالب مدلول الكلمات ({words}) عند عرض الصور، في 4 من 5 محاولات.', activity: 'cards', warmup: { teacher: 'أعرض جدول الحصة والقوانين المصوّرة، ثم أربط موضوع «{title}» بخبرة مألوفة.', student: 'ينظر إلى الجدول ويختار ما يعرفه عن الموضوع بالطريقة التي تناسبه.' }, content: { teacher: 'أقدّم الكلمات ({words}) واحدة واحدة بالصورة والكلمة والصوت، وأنمذج الاستجابة.', student: 'يتفاعل مع البطاقات، ويكرر أو يشير أو يضغط.' }, closing: { teacher: 'أراجع كلمتين بالبطاقات وأسجّل مقدار المساعدة.', student: 'يختار البطاقة المفضلة ويعبّر عنها.' } },
    { objective: 'أن يربط الطالب الكلمة بصورتها، في 4 من 5 محاولات.', activity: 'choose-picture', warmup: { teacher: 'أراجع كلمات الجلسة السابقة بلعبة سريعة.', student: 'يشير إلى الصورة عند سماع الكلمة أو رؤيتها.' }, content: { teacher: 'أعرض الكلمة وأقدّم خيارات مصوّرة بعدد يناسب ملف كل طالب، وأتدرج في التلميح.', student: 'يختار الصورة المناسبة بوسيلة الإجابة المحددة له.' }, closing: { teacher: 'أقدّم ورقة عمل قصيرة من الحزمة.', student: 'يدائر أو يشير أو يلصق الإجابة.' } },
    { objective: 'أن يطابق الطالب الكلمات بالصور، في 4 من 5 محاولات.', activity: 'match', warmup: { teacher: 'أعرض صورة ناقصة وأسأل عن اسمها.', student: 'يكمل الصورة أو يذكر اسمها.' }, content: { teacher: 'أنمذج المطابقة بمثال واحد، ثم أتيح التدريب بالبطاقات وعلى الجهاز.', student: 'يطابق بالضغط على الكلمة ثم صورتها، بلا سحب.' }, closing: { teacher: 'أوجّه نشاطًا جماعيًا قصيرًا بالبطاقات.', student: 'يشارك زميله في مطابقة كلمة واحدة.' } },
    { objective: 'أن يقرأ الطالب الكلمات أو يركّبها، في 3 من 5 محاولات.', activity: 'build', warmup: { teacher: 'أقرأ قصة قصيرة تتضمن كلمات الدرس.', student: 'يستمع أو يتابع بالصور ويشير عند ظهور الكلمة.' }, content: { teacher: 'أقدّم الكلمة وأحللها إلى حروف، وأتدرج من النموذج إلى الاستقلالية.', student: 'يركّب الكلمة حرفًا بعد حرف أو يختارها من بديلين.' }, closing: { teacher: 'أقدّم نشاطًا تعاونيًا هادئًا بلا ترتيب للطلاب.', student: 'يشارك وفق الدور المناسب له.' } },
    { objective: 'أن يوظّف الطالب كلمات الدرس في التقويم الختامي، في 4 من 5 محاولات.', activity: 'choose-word', warmup: { teacher: 'أعرض فيديو قصيرًا أو صورًا تلخص الدرس.', student: 'يشاهد ويذكر ما يعرفه.' }, content: { teacher: 'أقدّم تقويمًا قصيرًا بأسئلة مصوّرة، وأسجّل الاستجابة ومقدار المساعدة.', student: 'يجيب بوسيلته المحددة، باستقلالية قدر الإمكان.' }, closing: { teacher: 'أراجع مع كل طالب ما أنجزه، وأحدد ما يحتاج تدريبًا إضافيًا.', student: 'يختار النشاط الذي أحبه.' } },
  ],
  weather: symbols('w', [['sun', 'مشمس', '☀️'], ['cloud', 'غائم', '☁️'], ['rain', 'ممطر', '🌧️'], ['wind', 'عاصف', '💨'], ['hot', 'حار', '🥵'], ['cool', 'معتدل', '🍃']]),
};

const text = (v: unknown, max: number, name: string) => { if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`راجع الحقل: ${name}.`); return v.trim(); };
const opt = (v: unknown, max: number) => { if (v === undefined || v === '') return undefined; if (typeof v !== 'string' || v.length > max) throw new Error('راجع حقول الحزمة.'); return v.trim() || undefined; };
export const mediaPath = /^(\/api\/media\/[a-f\d]{32}|\/images\/content\/[a-z\d-]+\.webp|https:\/\/[a-z\d-]+\.convex\.cloud\/api\/storage\/[a-f\d-]{36}|http:\/\/127\.0\.0\.1:\d+\/api\/storage\/[a-f\d-]{36})$/;
const media = (v: unknown) => { if (v === undefined || v === '') return undefined; if (typeof v !== 'string' || !mediaPath.test(v)) throw new Error('وسائط الحزم المشتركة يجب أن تُرفع من لوحة الإدارة.'); return v; };
const list = <T,>(v: unknown, max: number, name: string, fn: (x: Record<string, unknown>) => T): T[] => { if (!Array.isArray(v) || v.length > max) throw new Error(`راجع قائمة: ${name}.`); return v.map(x => { if (!x || typeof x !== 'object') throw new Error(`راجع قائمة: ${name}.`); return fn(x as Record<string, unknown>); }); };
const unique = <T extends { id: string }>(rows: T[], name: string) => { if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error(`يوجد عنصر مكرر في: ${name}.`); return rows; };

/** Trust boundary for admin edits. Unknown fields are dropped, and missing sections fall back to the defaults. */
export function validateCatalog(input: unknown): Catalog {
  const v = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof Catalog, unknown>>;
  const d = defaultCatalog;
  const longStrings = (x: unknown, name: string) => { if (!Array.isArray(x) || !x.length || x.length > 80) throw new Error(`راجع قائمة: ${name}.`); return [...new Set(x.map(s => text(s, 200, name)))]; };
  const planning = Object.fromEntries((Object.keys(planningLists) as PlanningList[]).map(k => [k, longStrings(v[k] ?? d[k], planningLists[k])])) as Record<PlanningList, string[]>;
  const academicYear = text(v.academicYear ?? d.academicYear, 20, 'العام الأكاديمي');
  const patternStage = (r: unknown) => { const s = (r ?? {}) as Record<string, unknown>; return { teacher: text(s.teacher, 500, 'قالب التحضير'), student: text(s.student, 500, 'قالب التحضير') }; };
  const planPattern = list(v.planPattern ?? d.planPattern, 10, 'قالب التحضير', r => ({ objective: text(r.objective, 400, 'قالب التحضير'), activity: (d.templates.some(t => t.id === r.activity) ? r.activity : 'cards') as TemplateId, warmup: patternStage(r.warmup), content: patternStage(r.content), closing: patternStage(r.closing) }));
  const goalBank = unique(list(v.goalBank ?? d.goalBank, 300, 'بنك الأهداف', r => ({ id: text(r.id, 64, 'بنك الأهداف'), subject: text(r.subject, 60, 'بنك الأهداف'), behaviour: text(r.behaviour, 200, 'بنك الأهداف'), condition: opt(r.condition, 200) ?? '' })), 'بنك الأهداف');
  const standards = unique(list(v.standards ?? d.standards, 3000, 'معايير الوزارة', r => ({ id: text(r.id, 64, 'معايير الوزارة'), subject: text(r.subject, 60, 'معايير الوزارة'), grade: text(r.grade, 60, 'معايير الوزارة'), code: opt(r.code, 40) ?? '', text: text(r.text, 400, 'نص المعيار') })), 'معايير الوزارة');
  const station = (r: Record<string, unknown>) => Object.fromEntries((['warmup', 'teaching', 'practice', 'independent', 'assessment', 'closing'] as const).map(k => [k, opt(r[k], 1200)]).filter(([, x]) => x));
  const warmups = unique(list(v.warmups ?? d.warmups, 300, 'بنك التهيئة', r => ({ id: text(r.id, 64, 'بنك التهيئة'), subject: opt(r.subject, 60) ?? '', grade: opt(r.grade, 60) ?? '', title: text(r.title, 80, 'عنوان التهيئة'), text: text(r.text, 600, 'نص التهيئة') })), 'بنك التهيئة');
  const units = unique(list(v.units ?? d.units, 400, 'وحدات المنهج', r => ({ id: text(r.id, 64, 'وحدات المنهج'), subject: text(r.subject, 60, 'مادة الوحدة'), grade: text(r.grade, 60, 'صف الوحدة'), title: text(r.title, 120, 'عنوان الوحدة'), lessons: unique(list(r.lessons ?? [], 60, 'دروس الوحدة', l => ({ id: text(l.id, 64, 'دروس الوحدة'), title: text(l.title, 160, 'عنوان الدرس'), objective: text(l.objective, 500, 'هدف الدرس'), ...station(l) }) as CurriculumLesson), 'دروس الوحدة') })), 'وحدات المنهج');
  const linkSources = unique(list(v.linkSources ?? d.linkSources, 20, 'المصادر الخارجية', r => { const url = text(r.url, 300, 'رابط المصدر'); if (!/^https:\/\//.test(url) || !url.includes('{q}')) throw new Error('رابط المصدر يبدأ بـ https ويحتوي {q} مكان كلمة البحث.'); return { id: text(r.id, 64, 'المصادر الخارجية'), label: text(r.label, 80, 'اسم المصدر'), url, kind: (['video', 'worksheet', 'site'].includes(r.kind as string) ? r.kind : 'site') as LinkSource['kind'] }; }), 'المصادر الخارجية');
  const strings = (x: unknown, name: string) => { if (!Array.isArray(x) || !x.length || x.length > 60) throw new Error(`راجع قائمة: ${name}.`); return [...new Set(x.map(s => text(s, 60, name)))]; };
  const symbolsOf = (x: unknown, name: string) => unique(list(x, 60, name, r => ({ id: text(r.id, 64, name), label: text(r.label, 60, name), emoji: text(r.emoji, 24, name), imageId: media(r.imageId) })), name);
  const support = unique(list(v.support ?? d.support, 8, 'سلم المساعدة', r => { const base = d.support.find(s => s.id === r.id); if (!base) throw new Error('سلم المساعدة يحتوي نوعًا غير معروف.'); return { id: base.id, label: text(r.label, 60, 'سلم المساعدة'), enabled: base.id === 'independent' || base.id === 'not-observed' ? true : r.enabled !== false }; }), 'سلم المساعدة');
  if (support.length !== d.support.length) throw new Error('سلم المساعدة ناقص.');
  const templates = d.templates.map(base => { const r = (Array.isArray(v.templates) ? v.templates : []).find((t: { id?: string }) => t?.id === base.id) as Partial<TemplateInfo> | undefined; return r ? { ...base, title: text(r.title, 60, 'اسم النشاط'), description: text(r.description, 240, 'وصف النشاط'), enabled: r.enabled !== false, imageId: media(r.imageId) ?? base.imageId } : base; });
  const packs = unique(list(v.packs ?? d.packs, 200, 'الحزم', r => ({
    id: text(r.id, 64, 'الحزمة'), title: text(r.title, 120, 'عنوان الحزمة'), subject: text(r.subject, 60, 'مادة الحزمة'), language: r.language === 'en' ? 'en' as const : 'ar' as const, ordered: r.ordered === true, updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt.slice(0, 40) : stamp,
    items: unique(list(r.items, 100, 'عناصر الحزمة', i => ({ id: text(i.id, 64, 'العنصر'), text: text(i.text, 120, 'نص العنصر'), emoji: opt(i.emoji, 24), description: opt(i.description, 200), group: opt(i.group, 60), imageId: media(i.imageId), audioId: media(i.audioId), signId: media(i.signId) })), 'عناصر الحزمة'),
  })), 'الحزم');
  const presets = unique(list(v.presets ?? d.presets, 30, 'الملفات الجاهزة', r => { const base = d.presets.find(p => p.id === r.id); if (!base) throw new Error('ملف جاهز غير معروف.'); return { ...base, label: text(r.label, 60, 'الملف الجاهز'), description: text(r.description, 200, 'الملف الجاهز') }; }), 'الملفات الجاهزة');
  const avatars = unique(list(v.avatars ?? d.avatars, 60, 'الصور الرمزية', r => ({ id: text(r.id, 64, 'الصورة'), imageId: media(r.imageId)! })), 'الصور الرمزية');
  return { ...planning, academicYear, planPattern, goalBank, standards, linkSources, warmups, units, avatars, subjects: strings(v.subjects ?? d.subjects, 'المواد'), grades: strings(v.grades ?? d.grades, 'الصفوف'), support, templates, packs, presets, communication: symbolsOf(v.communication ?? d.communication, symbolLists.communication), activities: symbolsOf(v.activities ?? d.activities, symbolLists.activities), rewards: symbolsOf(v.rewards ?? d.rewards, symbolLists.rewards), rules: symbolsOf(v.rules ?? d.rules, symbolLists.rules), values: symbolsOf(v.values ?? d.values, symbolLists.values), weather: symbolsOf(v.weather ?? d.weather, symbolLists.weather), movement: symbolsOf(v.movement ?? d.movement, symbolLists.movement), stories: unique(list(v.stories ?? d.stories, 40, 'القصص الاجتماعية', r => ({ id: text(r.id, 64, 'القصص الاجتماعية'), title: text(r.title, 80, 'عنوان القصة'), pages: symbolsOf(r.pages, 'صفحات القصة').slice(0, 12) })), 'القصص الاجتماعية') };
}
