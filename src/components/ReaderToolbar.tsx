import { useEffect, useState } from "react";

export interface ReaderPrefs {
  scale: number; // مضاعف حجم النص
  gap: boolean; // تباعد الأسطر
  dys: boolean; // تباعد الحروف (عسر القراءة)
  tint: "none" | "sepia" | "mint"; // خلفية مريحة
  focus: boolean; // وضع التركيز
  easyFont: boolean; // خط ميسّر للقراءة
  ruler: boolean; // مسطرة القراءة (خط التركيز)
}

const DEFAULTS: ReaderPrefs = { scale: 1, gap: false, dys: false, tint: "none", focus: false, easyFont: false, ruler: false };

// مكدّس الخط الميسّر: لاتيني (OpenDyslexic) + عربي واضح (Noto Naskh)
export const EASY_FONT = '"OpenDyslexic", "Noto Naskh Arabic", "Tajawal", sans-serif';

export function loadReaderPrefs(): ReaderPrefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("reader_prefs") || "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(loadReaderPrefs);
  useEffect(() => {
    localStorage.setItem("reader_prefs", JSON.stringify(prefs));
  }, [prefs]);
  const set = (p: Partial<ReaderPrefs>) => setPrefs((v) => ({ ...v, ...p }));
  return { prefs, set };
}

// أنماط الخلفية المريحة
export const TINTS: Record<ReaderPrefs["tint"], string> = {
  none: "",
  sepia: "#fbf3e3",
  mint: "#eaf6ef",
};

export default function ReaderToolbar({
  prefs,
  set,
}: {
  prefs: ReaderPrefs;
  set: (p: Partial<ReaderPrefs>) => void;
}) {
  const Btn = ({ active, onClick, children, title }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1.5 rounded-lg text-sm font-bold border transition ${
        active ? "bg-brand text-white border-brand" : "bg-white text-slate-600 border-slate-200 hover:border-brand/40"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-4">
      <span className="text-xs font-bold text-grey ml-1">📖 القارئ الميسّر:</span>

      {/* حجم النص */}
      <div className="flex items-center gap-1">
        <Btn onClick={() => set({ scale: Math.max(0.8, +(prefs.scale - 0.15).toFixed(2)) })} title="تصغير">أ−</Btn>
        <span className="text-xs text-slate-400 w-8 text-center">{Math.round(prefs.scale * 100)}%</span>
        <Btn onClick={() => set({ scale: Math.min(2, +(prefs.scale + 0.15).toFixed(2)) })} title="تكبير">أ+</Btn>
      </div>

      <Btn active={prefs.gap} onClick={() => set({ gap: !prefs.gap })} title="تباعد الأسطر">↕ الأسطر</Btn>
      <Btn active={prefs.dys} onClick={() => set({ dys: !prefs.dys })} title="تباعد الحروف">حـ ـر ـف</Btn>
      <Btn active={prefs.easyFont} onClick={() => set({ easyFont: !prefs.easyFont })} title="خط ميسّر للقراءة">🔤 خط ميسّر</Btn>
      <Btn active={prefs.focus} onClick={() => set({ focus: !prefs.focus })} title="وضع التركيز">🎯 تركيز</Btn>
      <Btn active={prefs.ruler} onClick={() => set({ ruler: !prefs.ruler })} title="مسطرة القراءة (خط التركيز)">📏 مسطرة</Btn>

      {/* خلفية مريحة */}
      <div className="flex items-center gap-1">
        <Btn active={prefs.tint === "none"} onClick={() => set({ tint: "none" })} title="افتراضي">عادي</Btn>
        <Btn active={prefs.tint === "sepia"} onClick={() => set({ tint: "sepia" })} title="بيج">بيج</Btn>
        <Btn active={prefs.tint === "mint"} onClick={() => set({ tint: "mint" })} title="أخضر فاتح">أخضر</Btn>
      </div>
    </div>
  );
}
