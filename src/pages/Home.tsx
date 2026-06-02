import { Link } from "react-router-dom";
import { CATEGORIES } from "../categories";
import { useSite } from "../useSite";
import CategoryIcon from "../components/CategoryIcon";

export default function Home() {
  const site = useSite();
  const primary = site.primaryColor || "#1e293b";

  return (
    <div className="space-y-8">
      <section
        className="rounded-3xl p-10 text-center text-white shadow-card relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, #5a0e24 100%)` }}
      >
        <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute -right-8 -bottom-12 w-52 h-52 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-3">{site.heroTitle}</h1>
          <p className="text-white/85 max-w-2xl mx-auto leading-relaxed">{site.heroSubtitle}</p>
          <div className="flex gap-3 justify-center mt-7 flex-wrap">
            <Link to="/generate" className="px-6 py-3 rounded-xl bg-white font-extrabold hover:bg-white/90 transition" style={{ color: primary }}>
              {site.ctaPrimary}
            </Link>
            <Link to="/categories" className="px-6 py-3 rounded-xl bg-white/15 text-white font-bold hover:bg-white/25 transition border border-white/25">
              {site.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {site.showCategories && (
        <section>
          <h2 className="font-bold text-slate-800 mb-4 text-lg">الفئات المدعومة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <Link
                key={c.key}
                to="/generate"
                className="lift group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft hover:border-brand"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-light text-brand grid place-items-center shrink-0 transition group-hover:bg-brand group-hover:text-white">
                  <CategoryIcon k={c.key} size={26} />
                </div>
                <div className="font-bold text-slate-800 group-hover:text-brand transition">{c.label}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid md:grid-cols-3 gap-4">
        {site.steps.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
            <div className="w-8 h-8 rounded-full text-white grid place-items-center font-bold mb-2" style={{ background: primary }}>
              {i + 1}
            </div>
            <div className="font-bold text-slate-800">{s.title}</div>
            <div className="text-sm text-slate-500 mt-1">{s.desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
