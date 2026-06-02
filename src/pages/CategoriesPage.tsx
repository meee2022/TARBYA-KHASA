import { useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES, CategoryKey, Category } from "../categories";
import CategoryIcon from "../components/CategoryIcon";

// مؤشرات تكيّف الواجهة المستخرجة من إعدادات الفئة
function adaptationPills(cat: Category) {
  const p: { icon: string; label: string }[] = [];
  if (cat.ui.speak) p.push({ icon: "🔊", label: "قراءة صوتية" });
  if (cat.ui.fontScale >= 1.15) p.push({ icon: "🔠", label: "خط أكبر" });
  if (cat.ui.bigButtons) p.push({ icon: "⬛", label: "أزرار كبيرة" });
  if (cat.ui.minimal) p.push({ icon: "🎯", label: "محتوى مبسّط" });
  return p;
}

export default function CategoriesPage() {
  const [active, setActive] = useState<CategoryKey>("autism");
  const cat = CATEGORIES.find((c) => c.key === active)!;
  const pills = adaptationPills(cat);

  return (
    <div className="grid md:grid-cols-[250px_1fr] gap-6">
      {/* القائمة الجانبية */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-grey px-1 mb-1">فئات الإعاقة</h2>
        {CATEGORIES.map((cc) => {
          const isActive = cc.key === active;
          return (
            <button
              key={cc.key}
              onClick={() => setActive(cc.key)}
              className={`group text-right px-3 py-3 rounded-2xl border font-bold transition flex items-center gap-3 ${
                isActive
                  ? "border-brand bg-brand text-white shadow-card"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:bg-brand-light"
              }`}
            >
              <span
                className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 transition ${
                  isActive ? "bg-white/20 text-white" : "bg-brand-light text-brand group-hover:bg-white"
                }`}
              >
                <CategoryIcon k={cc.key} size={20} />
              </span>
              <span className="flex-1">{cc.label}</span>
            </button>
          );
        })}
      </div>

      {/* لوحة التفاصيل */}
      <div className="space-y-5">
        {/* الترويسة */}
        <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-card bg-white">
          <div className="p-6 bg-gradient-to-l from-brand-light to-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand text-white grid place-items-center shrink-0 shadow-card">
                <CategoryIcon k={cat.key} size={34} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-800">{cat.label}</div>
                <div className="text-sm text-grey mt-0.5">خصائص الفئة ومتطلبات التصميم</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {cat.chars.map((x) => (
                <span key={x} className="px-3 py-1.5 rounded-full text-xs font-bold bg-white text-brand border border-brand/15">
                  {x}
                </span>
              ))}
            </div>
          </div>

          {/* مؤشرات تكيّف الواجهة */}
          {pills.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-grey ml-1">تتكيّف الأنشطة تلقائياً:</span>
              {pills.map((p) => (
                <span key={p.label} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                  <span>{p.icon}</span> {p.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* بطاقتا المراعاة والتجنّب */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center text-sm">✓</span>
              <div className="font-bold text-slate-800">ما يجب مراعاته</div>
            </div>
            <ul className="space-y-2.5">
              {cat.activity.map((x) => (
                <li key={x} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="text-emerald-500 mt-0.5 shrink-0">●</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 grid place-items-center text-sm">✕</span>
              <div className="font-bold text-slate-800">ما يجب تجنّبه</div>
            </div>
            <ul className="space-y-2.5">
              {cat.avoid.map((x) => (
                <li key={x} className="flex items-start gap-2 text-sm text-slate-500">
                  <span className="text-rose-400 mt-0.5 shrink-0">●</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* زر الإجراء */}
        <Link
          to="/generate"
          className="flex items-center justify-center gap-2 rounded-2xl py-4 font-bold bg-brand text-white hover:bg-brand-dark transition shadow-card"
        >
          إنشاء نشاط لهذه الفئة
          <span>↗</span>
        </Link>
      </div>
    </div>
  );
}
