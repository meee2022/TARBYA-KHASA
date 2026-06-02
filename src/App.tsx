import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { hasConvex } from "./convexClient";
import { useSite } from "./useSite";
import Logo from "./components/Logo";
import Home from "./pages/Home";
import CategoriesPage from "./pages/CategoriesPage";
import Generate from "./pages/Generate";
import Play from "./pages/Play";
import Reports from "./pages/Reports";
import StudentReport from "./pages/StudentReport";
import Admin from "./pages/Admin";

const tabs = [
  { to: "/", label: "الرئيسية", end: true },
  { to: "/categories", label: "الفئات" },
  { to: "/generate", label: "توليد نشاط" },
  { to: "/reports", label: "التقارير" },
  { to: "/admin", label: "لوحة التحكم" },
];

export default function App() {
  const site = useSite();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    root.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="h-1 bg-brand" />
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/70 shadow-soft sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-5">
          <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
            <Logo size={40} />
            <div className="leading-tight">
              <div className="font-extrabold text-lg text-brand">{site.brandName}</div>
              <div className="text-[11px] text-grey -mt-0.5">منصّة الأنشطة التفاعلية</div>
            </div>
          </NavLink>
          <nav className="flex gap-1 flex-wrap">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-bold transition ${
                    isActive
                      ? "bg-brand text-white shadow-soft"
                      : "text-grey-dark hover:bg-brand-light hover:text-brand"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
            <button
              onClick={toggleTheme}
              className="px-2.5 py-1.5 rounded-lg text-grey-dark hover:bg-brand-light hover:text-brand transition"
              title={dark ? "الوضع النهاري" : "الوضع الليلي"}
              aria-label="تبديل الوضع الليلي"
            >
              {dark ? "☀️" : "🌙"}
            </button>
          </nav>
        </div>
      </header>

      {!hasConvex && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <div className="max-w-5xl mx-auto px-4 py-2">
            ⚠️ لم يتم ربط الـ Backend بعد. ضعي رابط Convex في ملف <code>.env.local</code> باسم
            <code className="mx-1">VITE_CONVEX_URL</code>.
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-7 w-full flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/play/:id" element={<Play />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/report/:id" element={<StudentReport />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <footer className="bg-grey-dark text-white/80 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-center gap-3 text-sm text-center">
          <Logo size={28} />
          <span>{site.footer}</span>
        </div>
      </footer>
    </div>
  );
}
