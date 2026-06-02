import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// إرشادات التصميم لكل فئة — تُحقن في رسالة Claude لضبط نوع الأسئلة والتغذية الراجعة
const CATEGORY_GUIDE: Record<string, string> = {
  autism:
    "طالب توحد: تعليمات قصيرة جداً وخطوة واحدة لكل سؤال، لغة مباشرة وملموسة، تجنّب التجريد والسخرية، تغذية راجعة ثابتة ومتوقّعة ومشجّعة.",
  intellectual:
    "إعاقة ذهنية: جمل قصيرة جداً وبسيطة، خيارات قليلة (2 إلى 3 فقط)، ربط بالحياة اليومية، تكرار المفهوم، تغذية راجعة فورية ومباشرة.",
  learning:
    "صعوبات تعلم: المحتوى مناسب لذكاء طبيعي لكن قسّم المهمة لخطوات، تجنّب الإملاء والكتابة الطويلة، شجّع على المحاولة لا النتيجة فقط.",
  hearing:
    "إعاقة سمعية: كل شيء بصري ومكتوب، لا تعتمد على أي مؤثر صوتي، استخدم وصفاً مرئياً واضحاً، تغذية راجعة بصرية.",
  visual:
    "إعاقة بصرية: نصوص واضحة عالية التباين بدون اعتماد على الصور، صف أي مشهد بالكلمات، تغذية راجعة لفظية واضحة.",
  motor:
    "إعاقة حركية: اختيار من متعدد بدون كتابة، خيارات واضحة قليلة العدد، تفاعل بسيط بأقل عدد خطوات.",
};

// توليد نشاط من مادة تدريبية عبر Claude API
export const generate = action({
  args: {
    category: v.string(),
    sourceText: v.string(),
    numQuestions: v.optional(v.number()),
    gameType: v.optional(v.string()),
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "مفتاح ANTHROPIC_API_KEY غير مضبوط. أضِفه في إعدادات Convex: npx convex env set ANTHROPIC_API_KEY <key>"
      );
    }

    const n = args.numQuestions ?? 5;
    const gameType = args.gameType ?? "mcq";
    const difficulty = args.difficulty ?? "easy";
    const guide = CATEGORY_GUIDE[args.category] ?? "";
    const diffGuide: Record<string, string> = {
      easy: "مستوى سهل: مفردات بسيطة جداً وأسئلة مباشرة قصيرة.",
      medium: "مستوى متوسط: أسئلة تتطلب فهماً وربطاً بسيطاً بين الأفكار.",
      advanced: "مستوى متقدم: أسئلة تحليلية تتطلب استنتاجاً، مع مراعاة قدرات الفئة.",
    };

    const system =
      "أنت مساعد متخصص في التربية الخاصة. مهمتك تحويل مادة تدريبية إلى نشاط تفاعلي مناسب تماماً لفئة الإعاقة المحددة. " +
      "أعِد فقط JSON صالح بدون أي نص إضافي أو علامات markdown.";

    const userPrompt = `الفئة: ${args.category}
إرشادات التصميم لهذه الفئة: ${guide}
مستوى الصعوبة: ${diffGuide[difficulty] ?? diffGuide.easy}

المادة التدريبية:
"""${args.sourceText.slice(0, 6000)}"""

ولّد نشاطاً تفاعلياً من نوع "${gameType}" يحتوي على ${n} أسئلة مناسبة تماماً لهذه الفئة.
أعِد JSON بهذا الشكل بالضبط:
{
  "title": "عنوان قصير للنشاط",
  "questions": [
    { "prompt": "نص السؤال", "options": ["خيار1","خيار2"], "answerIndex": 0, "imageHint": "وصف صورة مقترحة أو فارغ" }
  ],
  "feedback": { "correct": "جملة تعزيز عند الإجابة الصحيحة", "wrong": "جملة تشجيع لطيفة عند الخطأ" }
}
كل الأسئلة والخيارات والتغذية الراجعة بالعربية الفصحى المبسّطة.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`فشل استدعاء Claude API: ${res.status} ${t}`);
    }

    const data = await res.json();
    let text: string = data?.content?.[0]?.text ?? "";
    // تنظيف أي أسوار markdown محتملة
    text = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error("تعذّر تحليل ردّ Claude كـ JSON: " + text.slice(0, 300));
    }

    const activityId = await ctx.runMutation(api.activities.save, {
      title: parsed.title ?? "نشاط بدون عنوان",
      category: args.category,
      sourceText: args.sourceText.slice(0, 6000),
      gameType,
      difficulty,
      questions: (parsed.questions ?? []).map((q: any) => ({
        prompt: String(q.prompt ?? ""),
        options: (q.options ?? []).map((o: any) => String(o)),
        answerIndex: Number(q.answerIndex ?? 0),
        imageHint: q.imageHint ? String(q.imageHint) : undefined,
      })),
      feedback: {
        correct: String(parsed.feedback?.correct ?? "أحسنت! 🌟"),
        wrong: String(parsed.feedback?.wrong ?? "حاول مرة أخرى، أنت قريب 💪"),
      },
    });

    return { activityId };
  },
});

export const save = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    sourceText: v.string(),
    gameType: v.string(),
    difficulty: v.optional(v.string()),
    questions: v.array(
      v.object({
        prompt: v.string(),
        options: v.array(v.string()),
        answerIndex: v.number(),
        imageHint: v.optional(v.string()),
      })
    ),
    feedback: v.object({ correct: v.string(), wrong: v.string() }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", args);
  },
});

export const list = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("activities")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("activities").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("activities") },
  handler: async (ctx, args) => {
    // حذف الجلسات المرتبطة بالنشاط أولاً
    const related = await ctx.db.query("sessions").collect();
    for (const s of related) {
      if (s.activityId === args.id) await ctx.db.delete(s._id);
    }
    await ctx.db.delete(args.id);
  },
});

export const updateTitle = mutation({
  args: { id: v.id("activities"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title });
  },
});
