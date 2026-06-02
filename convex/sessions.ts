import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// تسجيل نتيجة جلسة لعب
export const record = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", args);
  },
});

// كل جلسات طالب معيّن (لتقرير التطوّر)
export const byStudent = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .collect();
  },
});

// ملخّص لكل الطلاب: نسبة النجاح وعدد المحاولات
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    const students = await ctx.db.query("students").collect();
    const byStudent: Record<string, { score: number; total: number; count: number }> = {};
    for (const s of sessions) {
      const k = s.studentId as unknown as string;
      if (!byStudent[k]) byStudent[k] = { score: 0, total: 0, count: 0 };
      byStudent[k].score += s.score;
      byStudent[k].total += s.total;
      byStudent[k].count += 1;
    }
    return students.map((st) => {
      const agg = byStudent[st._id as unknown as string] ?? { score: 0, total: 0, count: 0 };
      return {
        studentId: st._id,
        name: st.name,
        category: st.category,
        sessions: agg.count,
        score: agg.score,
        total: agg.total,
        percent: agg.total > 0 ? Math.round((agg.score / agg.total) * 100) : 0,
      };
    });
  },
});
