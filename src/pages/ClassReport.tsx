import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { byKey } from "../categories";
import { hasConvex } from "../convexClient";
import { useSite } from "../useSite";
import { formatDate } from "../format";
import Logo from "../components/Logo";

export default function ClassReport() {
  const site = useSite();
  const summary = useQuery(api.sessions.summary, hasConvex ? {} : "skip");

  if (!hasConvex) return <div className="text-center text-slate-400 py-20">يلزم ربط Convex.</div>;
  if (!summary) return <div className="text-center text-slate-400 py-20">جارٍ التحميل…</div>;

  const color = (p: number) => (p >= 70 ? "#16a34a" : p >= 40 ? "#d97706" : "#dc2626");
  const active = summary.filter((r: any) => r.sessions > 0);
  const avg = active.length ? Math.round(active.reduce((a: number, r: any) => a + r.percent, 0) / active.length) : 0;
  const totalSessions = summary.reduce((a: number, r: any) => a + r.sessions, 0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link to="/reports" className="text-sm text-slate-500 hover:text-slate-700">→ رجوع للتقارير</Link>
        <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-brand text-white font-bold text-sm">
          🖨️ تصدير / طباعة PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-7">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-5">
          <Logo size={44} />
          <div>
            <div className="font-extrabold text-brand text-lg">{site.brandName}</div>
            <div className="text-xs text-grey">تقرير متابعة الفصل</div>
          </div>
          <div className="mr-auto text-xs text-slate-400">{formatDate(Date.now())}</div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="عدد الطلاب" value={String(summary.length)} />
          <Stat label="إجمالي الجلسات" value={String(totalSessions)} />
          <Stat label="متوسط الفصل" value={`${avg}%`} />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs border-b border-slate-200">
              <th className="text-right font-medium py-2">الطالب</th>
              <th className="text-right font-medium py-2">الفئة</th>
              <th className="text-center font-medium py-2">الأنشطة</th>
              <th className="text-center font-medium py-2">النسبة</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((r: any) => (
              <tr key={r.studentId} className="border-b border-slate-100">
                <td className="py-2 font-bold text-slate-700">{r.name}</td>
                <td className="py-2 text-slate-500">{byKey(r.category).label}</td>
                <td className="py-2 text-center text-slate-700">{r.sessions}</td>
                <td className="py-2 text-center font-bold" style={{ color: r.sessions ? color(r.percent) : "#94a3b8" }}>
                  {r.sessions ? `${r.percent}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-xs text-slate-400 mt-6 pt-4 border-t border-slate-200 text-center">{site.footer}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-xl font-extrabold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
