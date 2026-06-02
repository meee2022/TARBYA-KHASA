import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CATEGORIES, byKey } from "../categories";
import { hasConvex } from "../convexClient";
import { useSite, SITE_DEFAULTS, SiteContent } from "../useSite";
import BarChart from "../components/BarChart";
import CategoryIcon from "../components/CategoryIcon";
import EmptyState from "../components/EmptyState";
import { formatDate } from "../format";
import { useToast } from "../Toast";

type Tab = "overview" | "students" | "activities" | "content" | "settings";

const DIFF_LABEL: Record<string, string> = { easy: "سهل", medium: "متوسط", advanced: "متقدّم" };

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "overview", label: "نظرة عامة", icon: "📊" },
  { key: "students", label: "الطلاب", icon: "👨‍🎓" },
  { key: "activities", label: "الأنشطة", icon: "🎮" },
  { key: "content", label: "محتوى الموقع", icon: "✏️" },
  { key: "settings", label: "الإعدادات", icon: "⚙️" },
];

const DEFAULT_PASSCODE = "tarbya2025";
const getPasscode = () => localStorage.getItem("admin_pass") || DEFAULT_PASSCODE;

function PasscodeGate({ onOk }: { onOk: () => void }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    if (val === getPasscode()) onOk();
    else setErr(true);
  };
  return (
    <div className="max-w-sm mx-auto mt-16 bg-white rounded-2xl border border-slate-200 shadow-card p-7 text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand-light text-brand grid place-items-center mx-auto mb-3 text-2xl">🔒</div>
      <h2 className="font-extrabold text-slate-800 text-lg mb-1">لوحة التحكم محمية</h2>
      <p className="text-sm text-slate-500 mb-4">أدخل كلمة المرور للدخول</p>
      <input
        type="password"
        value={val}
        onChange={(e) => { setVal(e.target.value); setErr(false); }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="inp text-center mb-2"
        placeholder="كلمة المرور"
        autoFocus
      />
      {err && <div className="text-red-600 text-sm mb-2">كلمة المرور غير صحيحة</div>}
      <button onClick={submit} className="w-full py-2.5 rounded-xl bg-brand text-white font-bold">دخول</button>
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("admin_ok") === "1");

  if (!hasConvex)
    return <div className="text-center text-slate-400 py-20">يلزم ربط Convex لاستخدام لوحة التحكم.</div>;

  if (!unlocked)
    return <PasscodeGate onOk={() => { sessionStorage.setItem("admin_ok", "1"); setUnlocked(true); }} />;

  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-5">
      <aside className="space-y-1 h-fit bg-white rounded-2xl border border-slate-200 p-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
              tab === t.key ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </aside>
      <div>
        {tab === "overview" && <Overview />}
        {tab === "students" && <StudentsAdmin />}
        {tab === "activities" && <ActivitiesAdmin />}
        {tab === "content" && <ContentEditor />}
        {tab === "settings" && <Settings />}
      </div>
    </div>
  );
}

/* ---------------- نظرة عامة ---------------- */
function Overview() {
  const summary = useQuery(api.sessions.summary, {});
  const students = useQuery(api.students.list, {});
  const activities = useQuery(api.activities.list, {});

  const totalSessions = summary?.reduce((a: number, r: any) => a + r.sessions, 0) ?? 0;
  const avg =
    summary && summary.length > 0
      ? Math.round(summary.reduce((a: number, r: any) => a + r.percent, 0) / summary.filter((r: any) => r.sessions > 0).length || 0)
      : 0;

  // متوسط النجاح لكل فئة
  const perCat = CATEGORIES.map((c) => {
    const rows = (summary ?? []).filter((r: any) => r.category === c.key && r.sessions > 0);
    const v = rows.length ? Math.round(rows.reduce((a: number, r: any) => a + r.percent, 0) / rows.length) : 0;
    return { label: c.label, value: v, color: "#8A1538" };
  }).filter((x) => x.value > 0);

  const cards = [
    { label: "الطلاب", value: students?.length ?? 0, icon: "👨‍🎓" },
    { label: "الأنشطة", value: activities?.length ?? 0, icon: "🎮" },
    { label: "الجلسات", value: totalSessions, icon: "🎯" },
    { label: "متوسط النجاح", value: `${isNaN(avg) ? 0 : avg}%`, icon: "📈" },
  ];

  return (
    <div className="space-y-5">
      <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 shadow-soft p-4">
            <div className="text-2xl">{c.icon}</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{c.value}</div>
            <div className="text-xs text-slate-400">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Bento: الرسم البياني (أوسع) + أعلى الطلاب */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
          <div className="font-bold text-slate-700 mb-3">متوسط النجاح حسب الفئة</div>
          <BarChart data={perCat} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
          <div className="font-bold text-slate-700 mb-3">أعلى الطلاب أداءً</div>
        <div className="space-y-2">
          {(summary ?? [])
            .filter((r: any) => r.sessions > 0)
            .sort((a: any, b: any) => b.percent - a.percent)
            .slice(0, 5)
            .map((r: any) => (
              <div key={r.studentId} className="flex items-center gap-3">
                <span className="text-brand"><CategoryIcon k={r.category} size={20} /></span>
                <span className="font-medium text-slate-700 text-sm w-32 truncate">{r.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${r.percent}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-600 w-10">{r.percent}%</span>
              </div>
            ))}
          {(summary ?? []).filter((r: any) => r.sessions > 0).length === 0 && (
            <div className="text-sm text-slate-400">لا توجد جلسات بعد.</div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- إدارة الطلاب ---------------- */
function StudentsAdmin() {
  const students = useQuery(api.students.list, {});
  const add = useMutation(api.students.add);
  const remove = useMutation(api.students.remove);
  const toast = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("autism");
  const [grade, setGrade] = useState("");

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid md:grid-cols-4 gap-3 items-end">
        <Field label="الاسم">
          <input value={name} onChange={(e) => setName(e.target.value)} className="inp" placeholder="اسم الطالب" />
        </Field>
        <Field label="الفئة">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="inp">
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="الصف">
          <input value={grade} onChange={(e) => setGrade(e.target.value)} className="inp" placeholder="اختياري" />
        </Field>
        <button
          onClick={async () => { if (name.trim()) { await add({ name: name.trim(), category, grade: grade.trim() || undefined }); setName(""); setGrade(""); toast("تمت إضافة الطالب"); } }}
          className="py-2.5 rounded-xl bg-brand text-white font-bold h-fit"
        >
          إضافة طالب
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-2">
        {students?.map((s: any) => {
          const c = byKey(s.category);
          return (
            <div key={s._id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-light text-brand grid place-items-center shrink-0"><CategoryIcon k={s.category} size={20} /></span>
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">{s.name}</div>
                <div className="text-xs text-slate-400">{c.label}{s.grade ? ` · ${s.grade}` : ""}</div>
              </div>
              <button
                onClick={() => { if (confirm(`هل تريد حذف الطالب «${s.name}»؟`)) { remove({ id: s._id }); toast("تم حذف الطالب", "info"); } }}
                className="mr-auto text-sm text-red-500 hover:text-red-700"
              >
                حذف
              </button>
            </div>
          );
        })}
      </div>
      {students?.length === 0 && <EmptyState icon="👨‍🎓" title="لا يوجد طلاب بعد" hint="أضف أول طالب من النموذج بالأعلى." />}
    </div>
  );
}

/* ---------------- إدارة الأنشطة ---------------- */
function ActivitiesAdmin() {
  const activities = useQuery(api.activities.list, {});
  const remove = useMutation(api.activities.remove);
  const rename = useMutation(api.activities.updateTitle);
  const duplicate = useMutation(api.activities.duplicate);
  const toast = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = (activities ?? []).filter(
    (a: any) => (filter === "all" || a.category === filter) && a.title.includes(search.trim())
  );

  return (
    <div className="space-y-3">
      {/* شريط البحث والفلترة */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ابحث باسم النشاط…"
          className="inp flex-1 min-w-[160px]"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="inp w-auto">
          <option value="all">كل الفئات</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {activities && filtered.length === 0 && (
        <EmptyState icon="🎮" title="لا توجد أنشطة مطابقة" hint="ولّد نشاطاً جديداً أو غيّر معايير البحث." />
      )}

      {filtered.map((a: any) => {
        const c = byKey(a.category);
        const isPreview = preview === a._id;
        return (
          <div key={a._id} className="bg-white border border-slate-200 shadow-soft rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-light text-brand grid place-items-center shrink-0"><CategoryIcon k={a.category} size={20} /></span>
              {editing === a._id ? (
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="inp flex-1" />
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 truncate">{a.title}</div>
                  <div className="text-xs text-slate-400">{c.label} · {a.questions.length} أسئلة{a.difficulty ? ` · ${DIFF_LABEL[a.difficulty] ?? ""}` : ""} · {formatDate(a._creationTime)}</div>
                </div>
              )}
              <div className="flex gap-2 text-sm shrink-0">
                {editing === a._id ? (
                  <button onClick={async () => { await rename({ id: a._id, title }); setEditing(null); toast("تم حفظ الاسم"); }} className="text-emerald-600 font-bold">حفظ</button>
                ) : (
                  <button onClick={() => { setEditing(a._id); setTitle(a.title); }} className="text-slate-500 hover:text-slate-700">تعديل</button>
                )}
                <button onClick={() => setPreview(isPreview ? null : a._id)} className="text-slate-500 hover:text-slate-700">{isPreview ? "إخفاء" : "معاينة"}</button>
                <Link to={`/play/${a._id}`} className="text-blue-600 hover:text-blue-800">تشغيل</Link>
                <button onClick={async () => { await duplicate({ id: a._id }); toast("تم تكرار النشاط"); }} className="text-brand hover:text-brand-dark">تكرار</button>
                <button onClick={() => { if (confirm(`هل تريد حذف النشاط «${a.title}»؟`)) { remove({ id: a._id }); toast("تم حذف النشاط", "info"); } }} className="text-red-500 hover:text-red-700">حذف</button>
              </div>
            </div>

            {isPreview && (
              <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                {a.questions.map((q: any, i: number) => (
                  <div key={i} className="text-sm bg-slate-50 rounded-lg p-2.5">
                    <div className="font-bold text-slate-700">{i + 1}. {q.prompt}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {q.options.map((o: string, j: number) => (
                        <span key={j} className={`text-xs px-2 py-0.5 rounded-md ${j === q.answerIndex ? "bg-emerald-100 text-emerald-700 font-bold" : "bg-white border border-slate-200 text-slate-500"}`}>
                          {o}{j === q.answerIndex ? " ✓" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- محرّر محتوى الموقع ---------------- */
function ContentEditor() {
  const site = useSite();
  const save = useMutation(api.site.update);
  const toast = useToast();
  const [form, setForm] = useState<SiteContent>(site);

  // مزامنة النموذج مع المحتوى المحفوظ عند تحميله أو تغيّره
  useEffect(() => {
    setForm(site);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site._id, site.heroTitle, site.brandName]);

  const set = (k: keyof SiteContent, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const { _id, ...rest } = form;
    await save(rest as any);
    toast("تم حفظ تغييرات المحتوى");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <Field label="اسم المنصّة (يظهر في الشريط العلوي)">
          <input value={form.brandName} onChange={(e) => set("brandName", e.target.value)} className="inp" />
        </Field>
        <Field label="العنوان الرئيسي">
          <input value={form.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} className="inp" />
        </Field>
        <Field label="النص التعريفي">
          <textarea value={form.heroSubtitle} onChange={(e) => set("heroSubtitle", e.target.value)} rows={3} className="inp" />
        </Field>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="زر رئيسي"><input value={form.ctaPrimary} onChange={(e) => set("ctaPrimary", e.target.value)} className="inp" /></Field>
          <Field label="زر ثانوي"><input value={form.ctaSecondary} onChange={(e) => set("ctaSecondary", e.target.value)} className="inp" /></Field>
        </div>
        <Field label="تذييل الصفحة">
          <input value={form.footer} onChange={(e) => set("footer", e.target.value)} className="inp" />
        </Field>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="اللون الرئيسي">
            <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-10 w-full rounded-lg border border-slate-300" />
          </Field>
          <label className="flex items-center gap-2 mt-7">
            <input type="checkbox" checked={form.showCategories} onChange={(e) => set("showCategories", e.target.checked)} />
            <span className="text-sm text-slate-600">إظهار قسم الفئات في الرئيسية</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="font-bold text-slate-700">خطوات «كيف يعمل»</div>
        {form.steps.map((s, i) => (
          <div key={i} className="grid md:grid-cols-2 gap-2">
            <input value={s.title} onChange={(e) => { const st = [...form.steps]; st[i] = { ...st[i], title: e.target.value }; set("steps", st); }} className="inp" placeholder="العنوان" />
            <input value={s.desc} onChange={(e) => { const st = [...form.steps]; st[i] = { ...st[i], desc: e.target.value }; set("steps", st); }} className="inp" placeholder="الوصف" />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={submit} className="px-6 py-2.5 rounded-xl bg-brand text-white font-bold">حفظ التغييرات</button>
      </div>
    </div>
  );
}

/* ---------------- الإعدادات ---------------- */
function Settings() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-sm text-slate-600 leading-relaxed">
        <div className="font-bold text-slate-800 text-base">حالة النظام</div>
        <Row k="قاعدة البيانات" v="Convex — متصلة ✅" />
        <Row k="توليد المحتوى" v="Claude API (claude-opus-4-8)" />
        <Row k="الفئات المدعومة" v={`${CATEGORIES.length} فئات`} />
      </div>
      <PasscodeChanger />
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 leading-relaxed">
        <div className="font-bold mb-1">مفتاح Claude API</div>
        يُضبط من الطرفية بأمان (لا يظهر في الواجهة):
        <pre dir="ltr" className="bg-amber-100 rounded-lg p-2 mt-2 text-xs overflow-auto">npx convex env set ANTHROPIC_API_KEY &lt;key&gt;</pre>
      </div>
    </div>
  );
}

function PasscodeChanger() {
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
      <div className="font-bold text-slate-800">كلمة مرور لوحة التحكم</div>
      <p className="text-xs text-slate-400">الكلمة الافتراضية: <span dir="ltr">{DEFAULT_PASSCODE}</span> — يُنصح بتغييرها.</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="inp"
          placeholder="كلمة المرور الجديدة"
        />
        <button
          onClick={() => { if (val.trim().length >= 4) { localStorage.setItem("admin_pass", val.trim()); setVal(""); setMsg(true); setTimeout(() => setMsg(false), 2000); } }}
          className="px-4 rounded-xl bg-brand text-white font-bold whitespace-nowrap"
        >
          حفظ
        </button>
      </div>
      {msg && <div className="text-emerald-600 text-sm">✅ تم تغيير كلمة المرور</div>}
    </div>
  );
}

/* ---------------- عناصر مساعدة ---------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-500 block mb-1">{label}</span>
      {children}
    </label>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-slate-400">{k}</span>
      <span className="font-medium text-slate-700">{v}</span>
    </div>
  );
}
