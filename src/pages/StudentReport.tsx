import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { byKey } from "../categories";
import { hasConvex } from "../convexClient";
import { useSite } from "../useSite";
import { formatDate } from "../format";
import Logo from "../components/Logo";
import CategoryIcon from "../components/CategoryIcon";

export default function StudentReport() {
  const { id } = useParams();
  const site = useSite();
  const students = useQuery(api.students.list, hasConvex ? {} : "skip");
  const sessions = useQuery(api.sessions.byStudent, hasConvex && id ? ({ studentId: id } as any) : "skip");
  const activities = useQuery(api.activities.list, hasConvex ? {} : "skip");

  if (!hasConvex) return <div className="text-center text-slate-400 py-20">يلزم ربط Convex.</div>;
  const student = students?.find((s: any) => s._id === id);
  if (students && !student) return <div className="text-center text-slate-400 py-20">الطالب غير موجود.</div>;
  if (!student || !sessions) return <div className="text-center text-slate-400 py-20">جارٍ التحميل…</div>;

  const cat = byKey(student.category);
  const actTitle = (aid: string) => activities?.find((a: any) => a._id === aid)?.title ?? "نشاط";
  const totScore = sessions.reduce((a: number, s: any) => a + s.score, 0);
  const totMax = sessions.reduce((a: number, s: any) => a + s.total, 0);
  const percent = totMax > 0 ? Math.round((totScore / totMax) * 100) : 0;
  const color = (p: number) => (p >= 70 ? "#16a34a" : p >= 40 ? "#d97706" : "#dc2626");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link to="/reports" className="text-sm text-slate-500 hover:text-slate-700">→ رجوع للتقارير</Link>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-sm">
          🖨️ تصدير / طباعة PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-7">
        {/* ترويسة التقرير */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-5">
          <Logo size={44} />
          <div>
            <div className="font-extrabold text-brand text-lg">{site.brandName}</div>
            <div className="text-xs text-grey">تقرير متابعة الطالب</div>
          </div>
          <div className="mr-auto text-xs text-slate-400">{formatDate(Date.now())}</div>
        </div>

        {/* بيانات الطالب */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-light text-brand grid place-items-center shrink-0">
            <CategoryIcon k={student.category as any} size={28} />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-800">{student.name}</div>
            <div className="text-sm text-slate-500">{cat.label}{student.grade ? ` · ${student.grade}` : ""}</div>
          </div>
          <div className="mr-auto text-center">
            <div className="text-3xl font-extrabold" style={{ color: color(percent) }}>{percent}%</div>
            <div className="text-xs text-slate-400">المعدّل العام</div>
          </div>
        </div>

        {/* ملخّص */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="عدد الأنشطة" value={String(sessions.length)} />
          <Stat label="إجابات صحيحة" value={String(totScore)} />
          <Stat label="إجمالي الأسئلة" value={String(totMax)} />
        </div>

        {/* جدول الجلسات */}
        <div className="font-bold text-slate-700 mb-2">سجلّ الجلسات</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs border-b border-slate-200">
              <th className="text-right font-medium py-2">التاريخ</th>
              <th className="text-right font-medium py-2">النشاط</th>
              <th className="text-center font-medium py-2">النتيجة</th>
              <th className="text-center font-medium py-2">النسبة</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s: any) => {
              const p = Math.round((s.score / s.total) * 100);
              return (
                <tr key={s._id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">{formatDate(s._creationTime)}</td>
                  <td className="py-2 text-slate-700">{actTitle(s.activityId)}</td>
                  <td className="py-2 text-center text-slate-700">{s.score}/{s.total}</td>
                  <td className="py-2 text-center font-bold" style={{ color: color(p) }}>{p}%</td>
                </tr>
              );
            })}
            {sessions.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-slate-400">لا توجد جلسات بعد.</td></tr>
            )}
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
