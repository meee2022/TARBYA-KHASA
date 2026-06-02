// بيانات الفئات والألوان — مصدر واحد للحقيقة في كل التطبيق
export type CategoryKey =
  | "autism"
  | "intellectual"
  | "learning"
  | "hearing"
  | "visual"
  | "motor";

export interface Category {
  key: CategoryKey;
  label: string;
  emoji: string;
  colors: { border: string; bg: string; text: string; tag: string };
  chars: string[];
  activity: string[];
  avoid: string[];
  // تكييف واجهة الطالب
  ui: { fontScale: number; bigButtons: boolean; speak: boolean; minimal: boolean };
}

export const CATEGORIES: Category[] = [
  {
    key: "autism",
    label: "اضطراب طيف التوحد",
    emoji: "🧩",
    colors: { border: "#534AB7", bg: "#EEEDFE", text: "#3C3489", tag: "#AFA9EC" },
    chars: ["يحتاج روتيناً ثابتاً", "حساسية حسية عالية", "قوة بصرية ممتازة", "صعوبة في التعليمات الطويلة"],
    activity: ["خطوة واحدة واضحة", "تعليمات مصورة بدون نص كثير", "ألوان هادئة", "تعزيز فوري ثابت"],
    avoid: ["أصوات مفاجئة", "تعليمات شفهية طويلة", "ازدحام بصري"],
    ui: { fontScale: 1.05, bigButtons: true, speak: false, minimal: true },
  },
  {
    key: "intellectual",
    label: "الإعاقة الذهنية",
    emoji: "🧠",
    colors: { border: "#0F6E56", bg: "#E1F5EE", text: "#085041", tag: "#5DCAA5" },
    chars: ["مدى انتباه محدود", "يحتاج تكراراً مستمراً", "يستجيب جيداً للتعزيز", "يفضل المحتوى الملموس"],
    activity: ["جمل قصيرة جداً", "صور كبيرة", "اختيار من 2", "شهادة تحفيزية"],
    avoid: ["نصوص طويلة", "أكثر من فكرة معاً", "أسئلة مفتوحة"],
    ui: { fontScale: 1.15, bigButtons: true, speak: true, minimal: true },
  },
  {
    key: "learning",
    label: "صعوبات التعلم",
    emoji: "📖",
    colors: { border: "#854F0B", bg: "#FAEEDA", text: "#633806", tag: "#EF9F27" },
    chars: ["ذكاء طبيعي مع صعوبة قراءة/كتابة", "يحتاج وقتاً أطول", "استجابة للصوت والحركة", "ثقة منخفضة أحياناً"],
    activity: ["خط كبير واضح", "تعليمات صوتية مع النص", "وقت مرن", "تعزيز على المحاولة"],
    avoid: ["ضغط الوقت", "إملاء يدوي", "مقارنة بالآخرين"],
    ui: { fontScale: 1.2, bigButtons: false, speak: true, minimal: false },
  },
  {
    key: "hearing",
    label: "الإعاقة السمعية",
    emoji: "👂",
    colors: { border: "#185FA5", bg: "#E6F1FB", text: "#0C447C", tag: "#85B7EB" },
    chars: ["يعتمد على البصر", "تمييز بصري عالٍ", "قد يحتاج لغة الإشارة", "استجابة قوية للمرئي"],
    activity: ["محتوى بصري كامل", "تعليمات مكتوبة", "تعزيز بصري", "رموز وصور"],
    avoid: ["محتوى صوتي فقط", "تعليمات شفهية بدون نص", "تعزيز صوتي وحيد"],
    ui: { fontScale: 1.1, bigButtons: false, speak: false, minimal: false },
  },
  {
    key: "visual",
    label: "الإعاقة البصرية",
    emoji: "👁",
    colors: { border: "#993C1D", bg: "#FAECE7", text: "#712B13", tag: "#F0997B" },
    chars: ["يعتمد على السمع واللمس", "يحتاج خطاً كبيراً جداً", "استجابة للمحتوى الصوتي", "قد يستخدم قارئ شاشة"],
    activity: ["خط ضخم", "تباين عالٍ جداً", "وصف صوتي", "أزرار كبيرة"],
    avoid: ["صور بدون نص بديل", "ألوان متقاربة", "عناصر صغيرة"],
    ui: { fontScale: 1.4, bigButtons: true, speak: true, minimal: true },
  },
  {
    key: "motor",
    label: "الإعاقة الحركية",
    emoji: "♿",
    colors: { border: "#3B6D11", bg: "#EAF3DE", text: "#27500A", tag: "#97C459" },
    chars: ["صعوبة في الكتابة/الكيبورد", "قد يستخدم أدوات مساعدة", "أداء أبطأ", "يحتاج تفاعلاً بسيطاً"],
    activity: ["أزرار كبيرة جداً", "اختيار بدل الكتابة", "وقت مرن", "بدون سحب معقد"],
    avoid: ["دقة حركية عالية", "ضغط الوقت", "إجابات تُكتب يدوياً"],
    ui: { fontScale: 1.1, bigButtons: true, speak: false, minimal: false },
  },
];

export const byKey = (k: string) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[0];
