import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULTS = {
  brandName: "تربية خاصة",
  heroTitle: "مولّد الأنشطة التفاعلية لطلاب التربية الخاصة",
  heroSubtitle:
    "منصّة تحوّل المادة التدريبية إلى أنشطة تفاعلية بأسئلة وتغذية راجعة مناسبة لكل فئة إعاقة، مع تقارير لمتابعة تطوّر الطلاب.",
  ctaPrimary: "إنشاء نشاط جديد",
  ctaSecondary: "استعراض الفئات",
  footer: "منصّة تربية خاصة — لدعم معلّمي التربية الخاصة.",
  primaryColor: "#8A1538",
  showCategories: true,
  steps: [
    { title: "رفع المادة", desc: "إدخال نص أو رفع ملف PDF واختيار الفئة المناسبة." },
    { title: "توليد النشاط", desc: "يُنتج النظام أسئلة وألعاباً وتغذية راجعة مناسبة للفئة." },
    { title: "متابعة التطوّر", desc: "تقارير بنسب النجاح وتقدّم كل طالب." },
  ],
};

// قراءة محتوى الموقع (يرجّع القيم الافتراضية إن لم يُحفظ شيء بعد)
export const get = query({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("siteContent").first();
    if (!doc) return { _id: null, ...DEFAULTS };
    return doc;
  },
});

// تحديث المحتوى (ينشئ المستند أول مرة)
export const update = mutation({
  args: {
    brandName: v.string(),
    heroTitle: v.string(),
    heroSubtitle: v.string(),
    ctaPrimary: v.string(),
    ctaSecondary: v.string(),
    footer: v.string(),
    primaryColor: v.string(),
    showCategories: v.boolean(),
    steps: v.array(v.object({ title: v.string(), desc: v.string() })),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.query("siteContent").first();
    if (doc) {
      await ctx.db.patch(doc._id, args);
      return doc._id;
    }
    return await ctx.db.insert("siteContent", args);
  },
});
