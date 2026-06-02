import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { hasConvex } from "./convexClient";

export interface SiteContent {
  _id: string | null;
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  footer: string;
  primaryColor: string;
  showCategories: boolean;
  steps: { title: string; desc: string }[];
}

export const SITE_DEFAULTS: SiteContent = {
  _id: null,
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

export function useSite(): SiteContent {
  const data = useQuery(api.site.get, hasConvex ? {} : "skip");
  return (data as SiteContent) ?? SITE_DEFAULTS;
}
