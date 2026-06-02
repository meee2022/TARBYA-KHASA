import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { byKey } from "../categories";
import { hasConvex } from "../convexClient";
import MatchGame from "../components/MatchGame";
import CategoryIcon from "../components/CategoryIcon";
import { speak, stopSpeak, questionToSpeech, isSpeechSupported } from "../speech";

const BRAND = { border: "#8A1538", bg: "#FAEEF1", tag: "#8A1538" };

export default function Play() {
  const { id } = useParams();
  const activity = useQuery(api.activities.get, hasConvex && id ? ({ id } as any) : "skip");
  const students = useQuery(api.students.list, hasConvex ? {} : "skip");
  const record = useMutation(api.sessions.record);

  const [studentId, setStudentId] = useState<string>("");
  const [qi, setQi] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionIndex: number; chosenIndex: number; correct: boolean }[]>([]);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [readAloud, setReadAloud] = useState(false);

  const cat = useMemo(() => (activity ? byKey(activity.category) : null), [activity]);

  // تفعيل القراءة تلقائياً للفئات التي تعتمد على الصوت
  useEffect(() => {
    if (cat) setReadAloud(cat.ui.speak);
  }, [cat]);

  // قراءة السؤال وخياراته تلقائياً عند ظهوره
  useEffect(() => {
    if (!readAloud || !activity || result) return;
    if (activity.gameType === "match") return;
    const q = activity.questions[qi];
    if (q) speak(questionToSpeech(q.prompt, q.options));
    return () => stopSpeak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qi, readAloud, activity, result]);

  // قراءة النتيجة صوتياً عند الانتهاء
  useEffect(() => {
    if (result && readAloud) {
      const p = Math.round((result.score / result.total) * 100);
      speak(`${p >= 60 ? "أحسنت" : "محاولة جيدة"}. نتيجتك ${result.score} من ${result.total}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // إيقاف القراءة عند مغادرة الصفحة
  useEffect(() => () => stopSpeak(), []);

  if (!hasConvex) return <Empty msg="يلزم ربط Convex لعرض النشاط." />;
  if (activity === undefined) return <Empty msg="جارٍ التحميل…" />;
  if (activity === null) return <Empty msg="النشاط غير موجود." />;

  const ui = cat!.ui;
  const c = cat!.colors;
  const isMatch = activity.gameType === "match" && activity.questions.length >= 2;

  const saveResult = async (score: number, total: number, ans: typeof answers) => {
    setResult({ score, total });
    if (studentId) {
      await record({
        studentId: studentId as any,
        activityId: activity._id,
        category: activity.category,
        score,
        total,
        answers: ans,
      });
      setSaved(true);
    }
  };

  /* ---------- شاشة النتيجة ---------- */
  if (result) {
    const percent = Math.round((result.score / result.total) * 100);
    return (
      <div className="max-w-xl mx-auto text-center bg-white rounded-2xl border border-slate-200 p-8 animate-pop">
        <div className="text-6xl mb-3">{percent >= 60 ? "🎉" : "💪"}</div>
        <h2 className="text-2xl font-extrabold text-brand">
          {percent >= 60 ? "أحسنت!" : "محاولة جيدة!"}
        </h2>
        <p className="text-slate-500 mt-2">النتيجة: {result.score} من {result.total} ({percent}%)</p>
        {studentId ? (
          <p className="text-sm text-emerald-600 mt-3">{saved ? "✅ تم حفظ النتيجة في التقارير" : ""}</p>
        ) : (
          <p className="text-sm text-amber-600 mt-3">لم يُختر طالب، لذا لم تُحفظ النتيجة.</p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/reports" className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold">التقارير</Link>
          <Link to="/generate" className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">نشاط جديد</Link>
        </div>
      </div>
    );
  }

  const fs = (base: number) => `${base * ui.fontScale}px`;
  const btnPad = ui.bigButtons ? "py-5 px-6" : "py-3 px-4";
  const q = activity.questions[qi];

  const choose = (i: number) => {
    if (chosen !== null) return;
    const correct = i === q.answerIndex;
    setChosen(i);
    setAnswers((p) => [...p, { questionIndex: qi, chosenIndex: i, correct }]);
    if (readAloud) speak(correct ? activity.feedback.correct : activity.feedback.wrong);
  };

  const next = async () => {
    if (qi + 1 < activity.questions.length) {
      setQi(qi + 1);
      setChosen(null);
    } else {
      const finalAnswers = answers;
      await saveResult(finalAnswers.filter((a) => a.correct).length, activity.questions.length, finalAnswers);
    }
  };

  const Header = (
    <div className="rounded-2xl p-3 mb-4 border border-slate-200 bg-brand-light flex items-center gap-2 flex-wrap">
      <span className="text-brand"><CategoryIcon k={cat!.key} size={22} /></span>
      <span className="font-bold text-brand">{cat!.label}</span>
      {isSpeechSupported() && (
        <button
          onClick={() => { setReadAloud((v) => !v); stopSpeak(); }}
          className={`text-sm px-3 py-1.5 rounded-lg font-bold transition ${
            readAloud ? "bg-brand text-white" : "bg-white text-brand border border-brand/30"
          }`}
          title="القراءة الصوتية"
        >
          {readAloud ? "🔊 القراءة مفعّلة" : "🔇 تفعيل القراءة"}
        </button>
      )}
      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="mr-auto border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
      >
        <option value="">— اختيار الطالب لحفظ النتيجة —</option>
        {students?.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
    </div>
  );

  /* ---------- لعبة التوصيل ---------- */
  if (isMatch) {
    return (
      <div className="max-w-2xl mx-auto">
        {Header}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-1" style={{ fontSize: fs(20) }}>{activity.title}</h2>
          <MatchGame
            questions={activity.questions}
            colors={BRAND}
            fontScale={ui.fontScale}
            onComplete={(score, total) => saveResult(score, total, [])}
          />
        </div>
      </div>
    );
  }

  /* ---------- اختيار من متعدد / صح وخطأ ---------- */
  return (
    <div className="max-w-2xl mx-auto">
      {Header}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="text-sm text-slate-400 mb-3">سؤال {qi + 1} من {activity.questions.length}</div>

        <div className="flex items-start gap-2 mb-6">
          <h2 className="font-bold text-slate-800 leading-relaxed" style={{ fontSize: fs(22) }}>{q.prompt}</h2>
          {isSpeechSupported() && (
            <button
              onClick={() => speak(questionToSpeech(q.prompt, q.options))}
              className="text-2xl shrink-0 hover:scale-110 transition"
              title="استمع للسؤال والخيارات"
            >
              🔊
            </button>
          )}
        </div>

        <div className="grid gap-3">
          {q.options.map((opt: string, i: number) => {
            const isChosen = chosen === i;
            const isCorrect = i === q.answerIndex;
            let style: React.CSSProperties = { borderColor: "#e2e8f0", background: "#fff" };
            if (chosen !== null) {
              if (isCorrect) style = { borderColor: "#16a34a", background: "#f0fdf4" };
              else if (isChosen) style = { borderColor: "#dc2626", background: "#fef2f2" };
            }
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={chosen !== null}
                className={`text-right rounded-xl border-2 font-medium transition flex items-center gap-3 ${btnPad}`}
                style={{ ...style, fontSize: fs(18) }}
              >
                {readAloud && isSpeechSupported() && chosen === null && (
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); speak(opt); }}
                    className="text-xl shrink-0 hover:scale-125 transition cursor-pointer"
                    title="استمع لهذا الخيار"
                  >
                    🔊
                  </span>
                )}
                <span className="flex-1">{opt}</span>
                {chosen !== null && isCorrect && " ✅"}
                {chosen !== null && isChosen && !isCorrect && " ❌"}
              </button>
            );
          })}
        </div>

        {chosen !== null && (
          <div className="mt-5 animate-pop">
            <div
              className="rounded-xl p-4 font-bold text-center"
              style={chosen === q.answerIndex ? { background: "#f0fdf4", color: "#166534" } : { background: "#fef2f2", color: "#991b1b" }}
            >
              {chosen === q.answerIndex ? activity.feedback.correct : activity.feedback.wrong}
            </div>
            <button onClick={next} className="w-full mt-4 py-3 rounded-xl bg-brand text-white font-bold">
              {qi + 1 < activity.questions.length ? "السؤال التالي ←" : "إنهاء النشاط"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-center text-slate-400 py-20">{msg}</div>;
}
