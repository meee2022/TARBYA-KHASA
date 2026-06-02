import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CATEGORIES, byKey } from "../categories";
import { hasConvex } from "../convexClient";
import BarChart from "../components/BarChart";
import CategoryIcon from "../components/CategoryIcon";
import { formatDate } from "../format";
import { Link } from "react-router-dom";

export default function Reports() {
  const summary = useQuery(api.sessions.summary, hasConvex ? {} : "skip");
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useQuery(
    api.sessions.byStudent,
    hasConvex && openId ? ({ studentId: openId } as any) : "skip"
  );

  if (!hasConvex) return <div className="text-slate-400 py-20 text-center">يلزم ربط Convex لعرض التقارير.</div>;

  const color = (p: number) => (p >= 70 ? "#16a34a" : p >= 40 ? "#d97706" : "#dc2626");
  const active = (summary ?? []).filter((r: any) => r.sessions > 0);
  const chartData = active
    .sort((a: any, b: any) => b.percent - a.percent)
    .slice(0, 8)
    .map((r: any) => ({ label: r.name, value: r.percent, color: "#8A1538" }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <h1 className="text-xl font-extrabold text-slate-800">تقارير المتابعة</h1>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-sm"
        >
          🖨️ تصدير / طباعة PDF
        </button>
      </div>

      {!summary && <div className="text-slate-400">…</div>}
      {summary && active.length === 0 && (
        <div className="text-slate-400">لا توجد بيانات بعد — أضيفي طلاباً ونفّذي أنشطة أولاً.</div>
      )}

      {active.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="font-bold text-slate-700 mb-3">نسب النجاح حسب الطالب</div>
          <BarChart data={chartData} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {summary?.map((r: any) => {
          const c = byKey(r.category);
          const open = openId === r.studentId;
          return (
            <div key={r.studentId} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-brand-light text-brand grid place-items-center shrink-0">
                  <CategoryIcon k={r.category} size={22} />
                </span>
                <div>
                  <div className="font-bold text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-400">{c.label} · {r.sessions} نشاط</div>
                </div>
                <div className="mr-auto text-2xl font-extrabold" style={{ color: color(r.percent) }}>{r.percent}%</div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${r.percent}%`, background: color(r.percent) }} />
              </div>
              {r.sessions > 0 && (
                <div className="flex items-center gap-3 mt-2 print:hidden">
                  <button
                    onClick={() => setOpenId(open ? null : r.studentId)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    {open ? "إخفاء الجلسات" : "عرض الجلسات"}
                  </button>
                  <Link to={`/report/${r.studentId}`} className="text-xs text-brand font-bold hover:underline">
                    تقرير PDF ←
                  </Link>
                </div>
              )}
              {open && (
                <div className="mt-2 space-y-1">
                  {!detail && <div className="text-xs text-slate-400">…</div>}
                  {detail?.map((s: any, idx: number) => {
                    const p = Math.round((s.score / s.total) * 100);
                    return (
                      <div key={s._id} className="text-xs flex justify-between items-center bg-slate-50 rounded px-2 py-1">
                        <span>{formatDate(s._creationTime)}</span>
                        <span className="font-bold" style={{ color: color(p) }}>{s.score}/{s.total} ({p}%)</span>
                      </div>
                    );
                  })}
                  {detail && detail.length === 0 && <div className="text-xs text-slate-400">لا جلسات.</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
