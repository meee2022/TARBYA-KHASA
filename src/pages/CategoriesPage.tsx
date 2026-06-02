import { useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES, CategoryKey } from "../categories";
import CategoryIcon from "../components/CategoryIcon";

export default function CategoriesPage() {
  const [active, setActive] = useState<CategoryKey>("autism");
  const cat = CATEGORIES.find((c) => c.key === active)!;
  const c = cat.colors;

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-5">
      <div className="flex flex-col gap-2">
        {CATEGORIES.map((cc) => {
          const isActive = cc.key === active;
          return (
            <button
              key={cc.key}
              onClick={() => setActive(cc.key)}
              className={`text-right px-4 py-3 rounded-xl border font-bold transition flex items-center gap-2.5 ${
                isActive ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-600 hover:border-brand/40"
              }`}
            >
              <CategoryIcon k={cc.key} size={22} />
              {cc.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl p-5 border border-slate-200 bg-white shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-brand-light text-brand grid place-items-center shrink-0">
              <CategoryIcon k={cat.key} size={26} />
            </div>
            <div className="text-xl font-extrabold text-slate-800">{cat.label}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {cat.chars.map((x) => (
              <span key={x} className="px-3 py-1 rounded-full text-xs font-bold bg-brand-light text-brand">
                {x}
              </span>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="font-bold text-slate-700 mb-2">✅ ما يجب مراعاته</div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              {cat.activity.map((x) => (
                <li key={x} className="pr-2 border-r-2 border-brand/40">{x}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="font-bold text-slate-700 mb-2">⛔ ما يجب تجنّبه</div>
            <ul className="space-y-1.5 text-sm text-slate-500">
              {cat.avoid.map((x) => (
                <li key={x}>— {x}</li>
              ))}
            </ul>
          </div>
        </div>

        <Link
          to="/generate"
          className="block text-center rounded-xl py-3 font-bold bg-brand text-white hover:bg-brand-dark transition"
        >
          إنشاء نشاط لهذه الفئة ↗
        </Link>
      </div>
    </div>
  );
}
