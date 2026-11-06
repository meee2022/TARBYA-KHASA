import { uid, type Learner } from './index.ts';
import { bar, check, label, para, table, title } from './docx.ts';

/** The ministry's special-education forms, as fields the teacher fills on screen and exports to Word. The wording follows the forms she sent (2025-2026). */
export type FormKind = 'services' | 'handover' | 'assessment-early' | 'assessment-upper';
export type FieldKind = 'text' | 'date' | 'long' | 'choice' | 'checks';
export interface FormField { id: string; label: string; kind?: FieldKind; options?: readonly string[]; hint?: string; }
export interface FormSection { id: string; title: string; note?: string; fields: FormField[]; scale?: readonly string[]; }
export interface FormTemplate { kind: FormKind; title: string; short: string; description: string; sections: FormSection[]; }
export interface SpecialForm { id: string; kind: FormKind; learnerId?: string; values: Record<string, string | string[]>; updatedAt: string; }

const f = (id: string, label: string, kind: FieldKind = 'text', options?: readonly string[], hint?: string): FormField => ({ id, label, kind, options, hint });
const rows = (prefix: string, items: string[]): FormField[] => items.map((label, n) => ({ id: `${prefix}${n + 1}`, label, kind: 'choice' }));
export const yesNo = ['نعم', 'لا'] as const;
export const mastery = ['يتقنها جيدًا', 'يتقنها بمساعدة', 'لم يتقنها'] as const;
const signatures: FormSection = { id: 'sign', title: 'الاعتماد', note: 'التوقيعات تبقى يدوية على النسخة المطبوعة؛ لا تُولَّد.', fields: [f('coordinator', 'منسق/ة التربية الخاصة'), f('principal', 'مدير/ة المدرسة'), f('supervisor', 'موجه/ة التربية الخاصة'), f('date', 'التاريخ', 'date')] };

const student = (extra: FormField[] = []): FormSection => ({ id: 'student', title: 'بيانات الطالب', fields: [f('name', 'اسم الطالب/ة'), f('school', 'المدرسة'), f('schoolType', 'نوع المدرسة', 'choice', ['حكومية', 'خاصة', 'دولية']), f('grade', 'الصف الدراسي'), ...extra] });

const assessmentHead: FormSection[] = [
  { id: 'student', title: 'البيانات الأساسية للطالب', fields: [f('requestDate', 'تاريخ الطلب', 'date'), f('name', 'الاسم الكامل'), f('qid', 'الرقم الشخصي'), f('hc', 'الرقم الصحي'), f('nationality', 'الجنسية'), f('dob', 'تاريخ الميلاد', 'date'), f('school', 'المدرسة'), f('grade', 'الصف')] },
  { id: 'contact', title: 'عنوان السكن وأرقام التواصل', fields: [f('city', 'المدينة'), f('street', 'الشارع'), f('zone', 'المنطقة'), f('house', 'رقم المنزل'), f('father', 'جوال الأب'), f('mother', 'جوال الأم')] },
  { id: 'request', title: 'تفاصيل التقييم المطلوب', note: 'يُشترط تحديد نوع التقييم؛ إعادة التقييم الوظيفي تحتاج مرور ثلاث سنوات على آخر تقييم، ومؤشرات واضحة على تغيّر الحالة، وموافقة ولي الأمر، وتوصية موجه التربية الخاصة.', fields: [f('diagnosis', 'تشخيص الطالب المحدَّد في التقرير المرفق'), f('reportSource', 'مصدر التقرير'), f('reportDate', 'تاريخ التقرير', 'date'), f('type', 'نوع طلب التقييم', 'choice', ['تقييم مستجد (أول مرة من جميع المراحل)', 'إعادة تقييم تقارير من جهات أخرى (الصحة المدرسية، الشفلح، سدرة…)', 'إعادة تقييم وظيفي (ثلاث سنوات أو أكثر على التقييم السابق)']), f('coordinator', 'منسق التربية الخاصة'), f('coordinatorPhone', 'جوال المنسق'), f('supervisor', 'موجّه التربية الخاصة')] },
  { id: 'consent', title: 'إقرار ولي الأمر', note: 'يُقرّ ولي الأمر بالموافقة على التقييم من فريق مركز المها للرعاية التخصصية، والالتزام بالمواعيد، وأن البيانات تُستخدم لأغراض تربوية وتشخيصية بسرية.', fields: [f('guardian', 'اسم ولي الأمر'), f('guardianQid', 'الرقم الشخصي لولي الأمر'), f('agree', 'القرار', 'choice', ['أوافق', 'لا أوافق'])] },
];
const assessmentTail: FormSection[] = [
  { id: 'summary', title: 'ملخص مشكلة الطالب واحتياجاته', note: 'تُعبّأ بمعرفة منسق أو معلم التربية الخاصة بعد تحليل احتياجات الطالب.', fields: [f('summary', 'ملخص المشكلة والاحتياجات', 'long'), f('actions', 'الإجراءات والخطط التي تمت للطالب (بالتفصيل)', 'long'), f('people', 'الأشخاص القائمون على هذه الإجراءات', 'long'), f('actionDates', 'تواريخ الإجراءات', 'long')] },
  { id: 'attachments', title: 'المرفقات المطلوبة', note: 'لا يُعتمد الطلب دون المرفقات كاملة، ويُدخل إلكترونيًا عبر النموذج المعتمد ضمن المدة التي تعلنها إدارة التربية الخاصة والتعليم الدامج.', fields: [f('attached', 'ما أُرفق', 'checks', ['صورة من البطاقة الصحية للطالب', 'طلب تقييم وظيفي حديث', 'استمارات الملاحظة أو التقارير الأكاديمية', 'نسخة من محضر لجنة التربية الخاصة بالإجراءات المتخذة', 'تقرير التقييم السابق أو التقرير الطبي مترجمًا أو ملخصًا بالعربية'])] },
  { ...signatures, fields: [f('coordinatorName', 'اسم منسق التربية الخاصة'), f('principal', 'مدير المدرسة'), f('date', 'التاريخ', 'date')] },
];

export const formTemplates: Record<FormKind, FormTemplate> = {
  services: { kind: 'services', title: 'نموذج طلب خدمات التربية الخاصة', short: 'طلب خدمات', description: 'طلب جديد، أو تعديل مستوى الدعم، أو غلق الخدمات، مع الترتيبات والتسهيلات في الاختبار.', sections: [
    { id: 'type', title: 'نوع الطلب', fields: [f('type', 'نوع الطلب', 'choice', ['طلب جديد', 'تعديل مستوى الدعم', 'غلق خدمات التربية الخاصة'])] },
    student([f('qid', 'الرقم الشخصي'), f('supportLevel', 'مستوى الدعم', 'choice', ['الأول', 'الثاني', 'الثالث'])]),
    { id: 'change', title: 'التعديل أو الغلق', note: 'تُعبّأ عند اختيار تعديل مستوى الدعم أو الغلق، ويُرفق إقرار ولي الأمر بالموافقة.', fields: [f('from', 'من المستوى', 'choice', ['الأول', 'الثاني', 'الثالث']), f('to', 'إلى المستوى', 'choice', ['الأول', 'الثاني', 'الثالث']), f('reasons', 'الأسباب ومبررات التعديل أو الغلق', 'long'), f('hadAcc', 'هل تلقى الترتيبات سابقًا؟', 'choice', yesNo), f('prevAcc', 'نوع الترتيبات والتسهيلات السابقة', 'long'), f('wantedAcc', 'نوع الترتيبات والتسهيلات المطلوبة', 'long')] },
    { id: 'exam', title: 'محتوى الاختبار للطالب', fields: [f('content', 'محتوى الاختبار', 'choice', ['محتوى الصف الدراسي', 'محتوى مكيّف', 'محتوى بديل'])] },
    { id: 'acc', title: 'الترتيبات والتسهيلات', fields: [
      f('env', 'بيئة الاختبار', 'checks', ['لجنة خاصة', 'لجنة خاصة بمقاعد منفصلة بعيدة عن التشتت', 'أثاث معدّل', 'إضاءة خاصة']),
      f('paper', 'ورقة الاختبار', 'checks', ['طباعة ورقة الأسئلة بحجم أكبر A3', 'زيادة المسافات بين الأسئلة', 'تقليل عدد الأسئلة في الصفحة', 'تعديل شكل الورقة (حجم ولون الخط، خلفية الورقة)']),
      f('time', 'زمن الاختبار', 'checks', ['وقت إضافي نصف ساعة عند الضرورة', 'وقت إضافي نصف ساعة في الاختبارات الشفهية', 'استراحات وقت الاختبار في مكان منفصل']),
      f('support', 'الإرشادات والدعم داخل الاختبار', 'checks', ['قراءة الاختبار (إجهاد في العين)', 'قراءة التوجيهات بعدد أكثر من المرات المحددة', 'إعطاء التوجيهات لكل صفحة من الأسئلة', 'قراءة التوجيهات بلغة الإشارة', 'قراءة الاختبار شفويًا للطالب بشكل فردي', 'قراءة الاختبار شفويًا عند الضرورة', 'المساعدة عندما يتعلق التقييم بالسلامة (معمل العلوم)', 'ناسخ']),
      f('tech', 'التكنولوجيا الداعمة', 'checks', ['برايل', 'آلة حاسبة أو ناطقة', 'جهاز مكبّر', 'مترجم لغة إشارة للتعليمات الشفوية والنصوص السماعية'])] },
    signatures,
  ] },
  handover: { kind: 'handover', title: 'نموذج تسليم واستلام ملفات طلبة ذوي الإعاقة', short: 'تسليم الملفات', description: 'عند انتقال الطالب بين مدرستين: من سلّم، ومن استلم، وأي ملفات وصلت.', sections: [
    { id: 'student', title: 'بيانات الطالب', fields: [f('name', 'اسم الطالب/ة'), f('grade', 'الصف الحالي'), f('fromSchool', 'المدرسة المنتقل منها'), f('fromType', 'نوع المدرسة', 'choice', ['حكومية', 'خاصة', 'دولية']), f('toSchool', 'المدرسة المنتقل إليها'), f('toType', 'نوع المدرسة', 'choice', ['حكومية', 'خاصة', 'دولية'])] },
    { id: 'giver', title: 'مسؤول التسليم', fields: [f('giverName', 'الاسم'), f('giverRole', 'المسمى الوظيفي')] },
    { id: 'taker', title: 'مسؤول الاستلام', fields: [f('takerName', 'الاسم'), f('takerRole', 'المسمى الوظيفي'), f('day', 'اليوم'), f('date', 'التاريخ', 'date')] },
    { id: 'files', title: 'المستندات والملفات المستلمة', note: 'ما لم يُؤشَّر عليه يُعدّ غير موجود أو غير مستلم.', fields: [f('secret', 'الملف السري', 'checks', ['استمارة بيانات الطالب / البطاقة التعريفية', 'تقارير طبية', 'تقارير أكاديمية', 'صور من جميع الشهادات المدرسية', 'اجتماعات لجنة التربية الخاصة بالطالب', 'طلب التقييم الشامل', 'التواصل مع ولي الأمر']), f('portfolio', 'ملف الإنجاز', 'checks', ['خطة الدعم', 'الترتيبات والتسهيلات', 'نماذج من أوراق العمل للطالب', 'نماذج من أنشطة الطالب', 'نماذج من الاختبارات الشهرية والفصلية'])] },
  ] },
  'assessment-upper': { kind: 'assessment-upper', title: 'استمارة طلب تقييم وظيفي (المستوى الثالث إلى الثاني عشر)', short: 'تقييم وظيفي (3–12)', description: 'بيانات الطالب ونوع التقييم وإقرار ولي الأمر، ثم الكشف المسحي المدرسي بنعم/لا.', sections: [
    ...assessmentHead,
    { id: 'motor', title: 'الكشف المسحي: الحركة', scale: yesNo, fields: rows('motor', ['صعوبات في السيطرة على الحركات اللاإرادية', 'صعوبات في التوازن، ومشيته غير عادية', 'صعوبات في أداء أنشطة الحياة اليومية', 'صعوبة في المهارات الحركية الكبرى (الجلوس دون مساعدة، المشي، القفز، الانحناء)', 'صعوبات في المهارات الحركية الدقيقة والتآزر البصري الحركي (المسك، القص، الكتابة)', 'صعوبات في التنفس وتنظيم النفس خلال التحدث']) },
    { id: 'senses', title: 'الكشف المسحي: الحواس', scale: yesNo, fields: rows('sense', ['صعوبات في السمع', 'يجيب عن الأسئلة بموضوع آخر لا علاقة له بالسؤال', 'يحتاج إلى مزيد من التكرار والإعادة في الصف', 'يبقي الكتاب بعيدًا جدًا أو قريبًا جدًا عن عينيه أثناء القراءة']) },
    { id: 'cognitive', title: 'الكشف المسحي: ذهنيًا', scale: yesNo, fields: rows('cog', ['يأخذ وقتًا أطول لتعلم الأشياء مقارنة بأقرانه', 'مشاكل في الفهم والاستيعاب', 'مشاكل في الذاكرة القصيرة والطويلة', 'مشاكل في الانتباه والتركيز']) },
    { id: 'communication', title: 'الكشف المسحي: التواصل', scale: yesNo, fields: rows('com', ['يدرك المفاهيم اللغوية الشائعة (الصفات، الكميات، الضمائر، النفي)', 'القدرة على استرجاع المعلومات', 'القدرة على فهم التعليمات المتعددة', 'القدرة على التواصل لفظيًا بطلاقة', 'يستخدم التواصل غير اللفظي أو بدائل أخرى للتواصل']) },
    { id: 'social', title: 'الكشف المسحي: اجتماعيًا وسلوكيًا', scale: yesNo, fields: [...rows('soc', ['يظهر السلوك العدواني', 'لديه صعوبة في المخالطة مع الزملاء', 'صعوبة في اتباع قواعد الألعاب الجماعية مع الأقران', 'يظهر حركة زائدة']), f('socOther', 'سلوكيات أخرى غير مرغوبة', 'long')] },
    { id: 'learning', title: 'الكشف المسحي: الصعوبات التعليمية', scale: yesNo, fields: [...rows('learn', ['صعوبة في الاحتفاظ بالانتباه لإنجاز مهمة', 'صعوبة في إتمام مهمة في المهلة المحددة', 'صعوبة في النسخ عن اللوح دون نسيان أحرف أو كلمات', 'يكتب الأحرف والأرقام معكوسة', 'نوعية الخط والالتزام بالسطر غير مناسبة', 'صعوبة في القراءة', 'صعوبة في الرياضيات وحل المشكلات الحسابية البسيطة']), f('learnOther', 'صعوبات أخرى', 'long'), f('notes', 'ملاحظات أخرى', 'long')] },
    ...assessmentTail,
  ] },
  'assessment-early': { kind: 'assessment-early', title: 'استمارة طلب تقييم وظيفي (الروضة إلى المستوى الثاني)', short: 'تقييم وظيفي (روضة–2)', description: 'بيانات الطالب ونوع التقييم وإقرار ولي الأمر، ثم كشف مسحي بالمهارات: يتقنها جيدًا، بمساعدة، لم يتقنها.', sections: [
    ...assessmentHead,
    { id: 'gross', title: 'المهارات الحركية الكبرى', scale: mastery, fields: rows('gross', ['الركض والجري', 'ألعاب الكرة والتقاطها', 'القفز والتقلب', 'ألعاب جماعية', 'اللياقة البدنية', 'المشي بمفرده']) },
    { id: 'fine', title: 'المهارات الحركية الدقيقة', scale: mastery, fields: rows('fine', ['يمسك الأشياء براحة اليد', 'ينقل الأشياء من يد إلى أخرى', 'يمسك الأشياء بالإبهام والأصابع', 'يضغط على زر', 'يضع مكعبات داخل صندوق', 'إنارة وإطفاء الكهرباء', 'يبني برجًا من 3 مكعبات وأكثر', 'يدخل الخيط بالخرز']) },
    { id: 'social', title: 'مهارات التفاعل الاجتماعي', scale: mastery, fields: rows('soc', ['يبتسم استجابة لتعابير وجوه الآخرين', 'يحيّي الآخرين بالإشارة', 'يحيّي الآخرين بالكلام', 'يصافح الآخرين', 'يحاول المشاركة في الأحاديث', 'يشكر الآخرين بالإشارة والقول', 'يمتنع عن الأعمال غير اللائقة أمام الآخرين', 'يشارك اللعب مع الآخرين', 'يشارك في الأنشطة الخارجية والداخلية']) },
    { id: 'receptive', title: 'مهارات اللغة الاستيعابية', scale: mastery, fields: rows('rec', ['الاستجابة عند النداء باسمه', 'التمييز بين المفردات', 'الاستجابة للتعليمات والأوامر', 'يحدد أجزاء الجسم الكبيرة والصغيرة', 'يطيع الأوامر (اركض، اجلس)', 'يشير إلى الأشياء المألوفة عندما يُطلب منه']) },
    { id: 'expressive', title: 'المهارات اللغوية التعبيرية والتواصل', scale: mastery, fields: rows('exp', ['ينطق أصواتًا مختلفة', 'يقلد أصوات بعض الكلمات', 'ينطق أول كلمة تدل على شخص أو شيء', 'يسمي الأشياء المرغوبة (أكل، عصير…)', 'يسمي الأشياء عندما تُعرض عليه', 'يعرف الأفعال والأحوال في الصور', 'التواصل السمعي', 'التواصل البصري', 'التواصل باللمس', 'التواصل الحس-حركي', 'التواصل بالتذوق']) },
    { id: 'sensory', title: 'المهارات الحسية', scale: mastery, fields: rows('sen', ['التركيز السمعي', 'التمييز السمعي بين الأصوات والمفردات', 'الذاكرة السمعية', 'الاستيعاب السمعي', 'التركيز البصري', 'التمييز البصري', 'الذاكرة البصرية', 'الاستيعاب البصري', 'التآزر البصري والسمعي والحركي']) },
    { id: 'cognitive', title: 'المهارات المعرفية والإدراكية', scale: mastery, fields: rows('cog', ['ربط تسلسل أحداث من خلال صور', 'ينفذ المهارات التي تعلمها في حياته اليومية', 'القدرة على الانتباه والتركيز داخل الغرفة الصفية', 'يطيع الأوامر والإرشادات', 'المشاركة ضمن الجماعة لفترات مناسبة', 'حفظ الأرقام والحروف', 'حفظ أناشيد بسيطة', 'حفظ سور قرآنية قصيرة', 'اللعب التخيلي', 'يقدم أفكارًا مبتكرة لحل المشاكل البسيطة', 'المحاكاة والتقليد من خلال نموذج', 'يستجيب لأمر واحد', 'يستجيب لأكثر من أمرين', 'يطلب الذهاب إلى الحمام', 'يستخدم الحمام دون مساعدة', 'يرتدي ملابسه دون مساعدة', 'يغسل وجهه بالماء دون مساعدة', 'تعميم الخبرة على خبرات جديدة مشابهة', 'نقل الخبرة من خلال الأقران']) },
    { id: 'academic', title: 'المهارات الأكاديمية الأساسية', scale: mastery, fields: [...rows('aca', ['يقرأ الحروف الهجائية بمساعدة', 'يقرأ كلمة واحدة', 'يمسك القلم وحده مسكة صحيحة', 'يرسم خطًا مستقيمًا', 'يرسم خطًا متعرجًا', 'يكتب الحرف من نموذج', 'يكتب حرفًا من ذاكرته دون مساعدة', 'يكتب كلمة دون مساعدة', 'التعرف على الأرقام', 'التعرف على مدلول الأرقام', 'يسمي إشارة الجمع', 'يجمع رقمين ضمن (1-9)', 'يسمي إشارة الطرح', 'يطرح رقمين ضمن (1-9)']), f('level', 'المستوى العام للطالب (تقرير مبسط)', 'long')] },
    { id: 'other', title: 'مهارات أخرى', scale: mastery, fields: rows('oth', ['التلوين ضمن الحيز', 'اللصق والقص', 'يستخدم الألوان المائية', 'فتح الحاسوب وإغلاقه', 'يستخدم الحاسوب في الأنشطة واللعب', 'يعرف اسمه ومعلوماته الشخصية', 'يعرف مدرسته ومكان سكنه', 'يسمي الأشياء في البيئة المحيطة', 'يعرف دينه واسم النبي ونسبه', 'يعرف عدد صلواته', 'تقليد الحركات', 'أداء الأدوار', 'الرقص مع الإيقاع', 'الغناء والأناشيد', 'استخدام الأدوات']) },
    ...assessmentTail,
  ] },
};
export const formKinds = Object.keys(formTemplates) as FormKind[];

export function createForm(kind: FormKind, learner?: Learner): SpecialForm {
  const values: SpecialForm['values'] = learner ? { name: learner.name, grade: learner.grade } : {};
  return { id: uid(), kind, learnerId: learner?.id, values, updatedAt: new Date().toISOString() };
}
/** How much of the form is filled: fields with any value over all fields. */
export function formProgress(form: SpecialForm) {
  const fields = formTemplates[form.kind].sections.flatMap(s => s.fields);
  const done = fields.filter(x => { const v = form.values[x.id]; return Array.isArray(v) ? v.length > 0 : !!(v && v.trim()); }).length;
  return { done, total: fields.length };
}
const shown = (field: FormField, v: string | string[] | undefined) => field.kind === 'checks' ? (field.options ?? []).map(o => check(Array.isArray(v) && v.includes(o), o)).join('   ') : Array.isArray(v) ? v.join('، ') : v ?? '';
/** The filled form as Word, section by section, in the order of the ministry's paper. */
export function formBody(form: SpecialForm, year: string) {
  const t = formTemplates[form.kind];
  let out = title(`${t.title} - العام الأكاديمي ${year}`);
  for (const s of t.sections) {
    const body = s.scale
      ? [[label('المهارة', 1), ...s.scale.map(x => label(x, 1))], ...s.fields.filter(x => x.kind === 'choice').map(x => [x.label, ...s.scale!.map(o => ({ t: form.values[x.id] === o ? '☒' : '☐', center: true }))])]
      : s.fields.map(x => [label(x.label, 1), { t: shown(x, form.values[x.id]), span: 3 }]);
    const long = s.scale ? s.fields.filter(x => x.kind !== 'choice').map(x => [label(x.label, 1), { t: shown(x, form.values[x.id]), span: s.scale!.length }]) : [];
    const cols = s.scale ? [4, ...s.scale.map(() => 1)] : [1, 1, 1, 1];
    out += table(cols, [bar(s.title, cols.length), ...body, ...long]);
    if (s.note) out += para(s.note, { size: 20 });
  }
  return out;
}
