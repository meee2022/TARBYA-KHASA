import { mutation } from "./_generated/server";

// زرع بيانات تجريبية للعرض — قابل لإعادة التشغيل بدون تكرار
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const marker = "__seeded__";
    const existing = await ctx.db.query("students").collect();
    if (existing.some((s) => s.notes === marker)) {
      return { skipped: true };
    }

    const students = [
      { name: "أحمد محمد", category: "autism", grade: "الأول" },
      { name: "سارة علي", category: "intellectual", grade: "الثاني" },
      { name: "خالد إبراهيم", category: "learning", grade: "الثالث" },
      { name: "نورة سعد", category: "hearing", grade: "الأول" },
      { name: "يوسف حسن", category: "visual", grade: "الثاني" },
      { name: "ليان عمر", category: "motor", grade: "الثالث" },
    ];
    const studentIds: Record<string, any> = {};
    for (const s of students) {
      studentIds[s.name] = await ctx.db.insert("students", { ...s, notes: marker });
    }

    const fb = { correct: "أحسنت! إجابة صحيحة 🌟", wrong: "لا بأس، حاول مرة أخرى 💪" };

    const activities = [
      {
        title: "نتعلّم عن الحيوانات",
        category: "intellectual",
        gameType: "mcq",
        difficulty: "easy",
        questions: [
          { prompt: "ماذا تأكل القطة؟", options: ["السمك", "الحجر"], answerIndex: 0 },
          { prompt: "أين يعيش السمك؟", options: ["في الماء", "في الشجرة"], answerIndex: 0 },
          { prompt: "ماذا يقول الكلب؟", options: ["مياو", "هوهو"], answerIndex: 1 },
        ],
      },
      {
        title: "الألوان من حولنا",
        category: "autism",
        gameType: "mcq",
        difficulty: "easy",
        questions: [
          { prompt: "ما لون السماء؟", options: ["أزرق", "أحمر"], answerIndex: 0 },
          { prompt: "ما لون التفاحة؟", options: ["أحمر", "أزرق"], answerIndex: 0 },
          { prompt: "ما لون العشب؟", options: ["أخضر", "أصفر"], answerIndex: 0 },
        ],
      },
      {
        title: "توصيل الحيوان بصوته",
        category: "hearing",
        gameType: "match",
        difficulty: "medium",
        questions: [
          { prompt: "القطة", options: ["مياو", "هوهو"], answerIndex: 0 },
          { prompt: "الكلب", options: ["هوهو", "مياو"], answerIndex: 0 },
          { prompt: "البقرة", options: ["موو", "كوكو"], answerIndex: 0 },
        ],
      },
    ];
    const activityIds: any[] = [];
    for (const a of activities) {
      activityIds.push(await ctx.db.insert("activities", { ...a, sourceText: "بيانات تجريبية", feedback: fb }));
    }

    // جلسات بنتائج متنوّعة
    const sessions = [
      { student: "سارة علي", act: 0, score: 3, total: 3, cat: "intellectual" },
      { student: "سارة علي", act: 0, score: 2, total: 3, cat: "intellectual" },
      { student: "أحمد محمد", act: 1, score: 3, total: 3, cat: "autism" },
      { student: "أحمد محمد", act: 1, score: 2, total: 3, cat: "autism" },
      { student: "نورة سعد", act: 2, score: 2, total: 3, cat: "hearing" },
      { student: "خالد إبراهيم", act: 0, score: 1, total: 3, cat: "learning" },
      { student: "يوسف حسن", act: 1, score: 3, total: 3, cat: "visual" },
    ];
    for (const s of sessions) {
      await ctx.db.insert("sessions", {
        studentId: studentIds[s.student],
        activityId: activityIds[s.act],
        category: s.cat,
        score: s.score,
        total: s.total,
        answers: [],
      });
    }

    return { skipped: false, students: students.length, activities: activities.length, sessions: sessions.length };
  },
});
