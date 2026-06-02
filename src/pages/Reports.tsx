import { useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { byKey } from "../categories";
import { hasConvex } from "../convexClient";
import BarChart from "../components/BarChart";
import CategoryIcon from "../components/CategoryIcon";
import { formatDate } from "../format";

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
    .slice()
    .sort((a: any, b: any) => b.percent - a.percent)
    .slice(0, 8)
    .map((r: any) => ({ label: r.name, value: r.percent, color: "#8A1538" }));

  const totalSessions = (summary ?? []).reduce((a: number, r: any) => a + r.sessions, 0);
  const avg = active.length ? Math.round(active.reduce((a: number, r: any) => a + r.percent, 0) / active.length) : 0;

  return (
    <div className="space-y-5">
      {/* الترويسة */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-brand-light text-brand grid place-items-center text-xl shadow-soft">📊</span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">تقارير المتابعة</h1>
            <p className="text-sm text-grey">متابعة تطوّر الطلاب عبر الأنشطة</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl bg-brand text-white font-bold text-sm shadow-soft hover:bg-brand-dark transition"
        >
          🖨️ تصدير / طباعة PDF
        </button>
      </div>

      {!summary && (
        <div className="grid md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-soft p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton w-11 h-11 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-1/2" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
              <div className="skeleton h-2.5 w-full mt-4" />
            </div>
          ))}
        </div>
      )}
      {summary && active.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
          لا توجد بيانات بعد — أضِف طلاباً ونفّذ أنشطة أولاً.
        </div>
      )}

      {active.length > 0 && (
        <>
          {/* بطاقات الملخّص */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryStat icon="👨‍🎓" value={String(active.length)} label="طلاب نشطون" />
            <SummaryStat icon="🎯" value={String(totalSessions)} label="إجمالي الجلسات" />
            <SummaryStat icon="📈" value={`${avg}%`} label="متوسط النجاح" />
          </div>

          {/* الرسم البياني */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-soft p-5">
            <div className="font-bold text-slate-800 mb-4">نسب النجاح حسب الطالب</div>
            <BarChart data={chartData} />
          </div>
        </>
      )}

      {/* بطاقات الطلاب */}
      <div className="stagger grid md:grid-cols-2 gap-3">
        {summary?.map((r: any) => {
          const c = byKey(r.category);
          const open = openId === r.studentId;
          return (
            <div key={r.studentId} className="bg-white border border-slate-200 rounded-2xl shadow-soft p-5">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-brand-light text-brand grid place-items-center shrink-0">
                  <CategoryIcon k={r.category} size={22} />
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 truncate">{r.name}</div>
                  <div className="text-xs text-slate-400">{c.label} · {r.sessions} نشاط</div>
                </div>
                <div className="mr-auto text-left">
                  <div className="text-2xl font-extrabold leading-none" style={{ color: color(r.percent) }}>{r.percent}%</div>
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${r.percent}%`, background: color(r.percent) }} />
              </div>
              {r.sessions > 0 && (
                <div className="flex items-center gap-4 mt-3 print:hidden">
                  <button onClick={() => setOpenId(open ? null : r.studentId)} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                    {open ? "إخفاء الجلسات ▲" : "عرض الجلسات ▼"}
                  </button>
                  <Link to={`/report/${r.studentId}`} className="text-xs text-brand font-bold hover:underline mr-auto">
                    تقرير PDF ←
                  </Link>
                </div>
              )}
              {open && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  {!detail && <div className="text-xs text-slate-400">…</div>}
                  {detail?.map((s: any) => {
                    const p = Math.round((s.score / s.total) * 100);
                    return (
                      <div key={s._id} className="text-xs flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-500">{formatDate(s._creationTime)}</span>
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

function SummaryStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-soft p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xl font-extrabold text-slate-800 leading-none">{value}</div>
        <div className="text-xs text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  );
}
