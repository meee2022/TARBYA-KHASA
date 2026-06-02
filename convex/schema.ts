import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// نموذج البيانات الأساسي للمنصة
export default defineSchema({
  // الطلاب
  students: defineTable({
    name: v.string(),
    category: v.string(), // مفتاح الفئة: autism | intellectual | learning | hearing | visual | motor
    grade: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_category", ["category"]),

  // الأنشطة المولّدة من المادة التدريبية
  activities: defineTable({
    title: v.string(),
    category: v.string(),
    sourceText: v.string(), // المادة التي تم التوليد منها
    gameType: v.string(), // mcq | truefalse | match
    difficulty: v.optional(v.string()), // easy | medium | advanced
    questions: v.array(
      v.object({
        prompt: v.string(),
        options: v.array(v.string()),
        answerIndex: v.number(),
        imageHint: v.optional(v.string()),
      })
    ),
    feedback: v.object({
      correct: v.string(),
      wrong: v.string(),
    }),
  }).index("by_category", ["category"]),

  // محتوى الموقع القابل للتحكم من لوحة الإدارة (مستند واحد فقط)
  siteContent: defineTable({
    brandName: v.string(),
    heroTitle: v.string(),
    heroSubtitle: v.string(),
    ctaPrimary: v.string(),
    ctaSecondary: v.string(),
    footer: v.string(),
    primaryColor: v.string(),
    showCategories: v.boolean(),
    steps: v.array(v.object({ title: v.string(), desc: v.string() })),
  }),

  // جلسات اللعب واستجابات الطلاب
  sessions: defineTable({
    studentId: v.id("students"),
    activityId: v.id("activities"),
    category: v.string(),
    score: v.number(),
    total: v.number(),
    answers: v.array(
      v.object({
        questionIndex: v.number(),
        chosenIndex: v.number(),
        correct: v.boolean(),
      })
    ),
  })
    .index("by_student", ["studentId"])
    .index("by_category", ["category"]),
});
