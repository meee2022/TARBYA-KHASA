// تنسيق التاريخ بالعربية من توقيت Convex (_creationTime بالميلي ثانية)
export function formatDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}
