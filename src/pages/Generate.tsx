import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CATEGORIES, CategoryKey } from "../categories";
import { hasConvex } from "../convexClient";
import { extractText } from "../extractText";
import CategoryIcon from "../components/CategoryIcon";
import { formatDate } from "../format";

const GAME_TYPES = [
  { key: "mcq", label: "اختيار من متعدد" },
  { key: "truefalse", label: "صح / خطأ" },
  { key: "match", label: "توصيل / مطابقة" },
];

export default function Generate() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryKey>("autism");
  const [gameType, setGameType] = useState("mcq");
  const [difficulty, setDifficulty] = useState("easy");
  const [num, setNum] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const t = await extractText(file);
      if (!t.trim()) setError("لم يُعثر على نص قابل للقراءة في الملف (قد يكون PDF صورة).");
      else setText(t.slice(0, 8000));
    } catch (err: any) {
      setError(err?.message ?? "تعذّر قراءة الملف.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const generate = useAction(api.activities.generate);
  const recent = useQuery(api.activities.list, hasConvex ? {} : "skip");

  const submit = async () => {
    setError(null);
    if (text.trim().length < 20) {
      setError("يرجى إدخال مادة تدريبية أطول (20 حرفاً على الأقل).");
      return;
    }
    setBusy(true);
    try {
      const res = await generate({ category, sourceText: text, numQuestions: num, gameType, difficulty });
      navigate(`/play/${res.activityId}`);
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ أثناء التوليد.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-5">
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-brand text-white grid place-items-center text-xs font-bold">١</span>
              <label className="font-bold text-slate-800">اختيار الفئة</label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => {
                const isA = c.key === category;
                return (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2 transition ${
                      isA ? "border-brand bg-brand-light text-brand" : "border-slate-200 bg-white text-slate-600 hover:border-brand/40"
                    }`}
                  >
                    <CategoryIcon k={c.key} size={20} /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="font-bold text-slate-700 block mb-2">نوع اللعبة</label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2"
              >
                {GAME_TYPES.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-2">مستوى الصعوبة</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="advanced">متقدّم</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-2">عدد الأسئلة</label>
              <input
                type="number"
                min={2}
                max={10}
                value={num}
                onChange={(e) => setNum(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-2 w-24"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand text-white grid place-items-center text-xs font-bold">٢</span>
                المادة التدريبية
              </label>
              <label className="text-sm px-3 py-1.5 rounded-lg bg-brand-light hover:bg-brand-light cursor-pointer font-bold text-brand">
                {uploading ? "جارٍ القراءة…" : "📎 رفع PDF / TXT"}
                <input type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={onFile} className="hidden" disabled={uploading} />
              </label>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder="أدخل نص الدرس أو المحتوى التدريبي هنا، أو ارفع ملفاً…"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 leading-relaxed"
            />
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

          <button
            onClick={submit}
            disabled={busy || !hasConvex}
            className="w-full py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "جارٍ التوليد…" : "✨ توليد النشاط"}
          </button>
          {!hasConvex && (
            <p className="text-xs text-amber-600 text-center">يلزم ربط Convex أولاً لتفعيل التوليد.</p>
          )}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="font-bold text-slate-700">أنشطة سابقة</div>
        {!recent && <div className="text-sm text-slate-400">…</div>}
        {recent && recent.length === 0 && <div className="text-sm text-slate-400">لا توجد أنشطة بعد.</div>}
        {recent?.map((a: any) => (
          <button
            key={a._id}
            onClick={() => navigate(`/play/${a._id}`)}
            className="w-full text-right bg-white border border-slate-200 rounded-xl p-3 hover:shadow-sm"
          >
            <div className="font-medium text-slate-800 text-sm">{a.title}</div>
            <div className="text-xs text-slate-400">
              {CATEGORIES.find((c) => c.key === a.category)?.label} · {a.questions.length} أسئلة · {formatDate(a._creationTime)}
            </div>
          </button>
        ))}
      </aside>
    </div>
  );
}
