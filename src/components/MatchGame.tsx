import { useMemo, useState } from "react";

interface Q {
  prompt: string;
  options: string[];
  answerIndex: number;
}

// لعبة توصيل: انقري سؤالاً ثم إجابته الصحيحة لربطهما
export default function MatchGame({
  questions,
  colors,
  fontScale,
  onComplete,
}: {
  questions: Q[];
  colors: { border: string; bg: string; tag: string };
  fontScale: number;
  onComplete: (score: number, total: number) => void;
}) {
  const total = questions.length;
  // الإجابات مخلوطة مع الحفاظ على رقم السؤال الأصلي
  const answers = useMemo(() => {
    const arr = questions.map((q, qi) => ({ qi, text: q.options[q.answerIndex] }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(((i * 9301 + 49297) % 233280) / 233280 * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [questions]);

  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [erred, setErred] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<number | null>(null);

  const fs = (b: number) => `${b * fontScale}px`;

  const tapAnswer = (qi: number) => {
    if (selected === null || matched.has(qi)) return;
    if (qi === selected) {
      const m = new Set(matched); m.add(qi); setMatched(m);
      setSelected(null);
      if (m.size === total) onComplete(total - erred.size, total);
    } else {
      setErred((p) => new Set(p).add(selected));
      setFlash(qi);
      setTimeout(() => setFlash(null), 350);
    }
  };

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4 text-center">انقر السؤال ثم إجابته الصحيحة لتوصيلهما 🔗</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {questions.map((q, qi) => {
            const done = matched.has(qi);
            const sel = selected === qi;
            return (
              <button
                key={qi}
                disabled={done}
                onClick={() => setSelected(sel ? null : qi)}
                className="w-full text-right rounded-xl border-2 p-3 font-medium transition"
                style={{
                  fontSize: fs(15),
                  borderColor: done ? "#16a34a" : sel ? colors.border : "#e2e8f0",
                  background: done ? "#f0fdf4" : sel ? colors.bg : "#fff",
                  opacity: done ? 0.7 : 1,
                }}
              >
                {q.prompt} {done && "✅"}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {answers.map((a) => {
            const done = matched.has(a.qi);
            const isFlash = flash === a.qi;
            return (
              <button
                key={a.qi}
                disabled={done}
                onClick={() => tapAnswer(a.qi)}
                className="w-full text-right rounded-xl border-2 p-3 font-medium transition"
                style={{
                  fontSize: fs(15),
                  borderColor: done ? "#16a34a" : isFlash ? "#dc2626" : colors.tag,
                  background: done ? "#f0fdf4" : isFlash ? "#fef2f2" : "#fff",
                  opacity: done ? 0.7 : 1,
                }}
              >
                {a.text} {done && "✅"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
