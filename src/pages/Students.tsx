import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CATEGORIES } from "../categories";
import { hasConvex } from "../convexClient";

export default function Students() {
  const students = useQuery(api.students.list, hasConvex ? {} : "skip");
  const add = useMutation(api.students.add);
  const remove = useMutation(api.students.remove);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("autism");
  const [grade, setGrade] = useState("");

  const submit = async () => {
    if (!name.trim()) return;
    await add({ name: name.trim(), category, grade: grade.trim() || undefined });
    setName("");
    setGrade("");
  };

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 h-fit">
        <div className="font-bold text-slate-700">إضافة طالب</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الطالب"
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
        >
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <input
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="الصف (اختياري)"
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
        />
        <button
          onClick={submit}
          disabled={!hasConvex}
          className="w-full py-2.5 rounded-xl bg-brand text-white font-bold disabled:opacity-50"
        >
          إضافة
        </button>
      </div>

      <div className="space-y-2">
        {!students && <div className="text-slate-400">…</div>}
        {students && students.length === 0 && <div className="text-slate-400">لا يوجد طلاب بعد.</div>}
        {students?.map((s: any) => {
          const c = CATEGORIES.find((x) => x.key === s.category);
          return (
            <div key={s._id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">{c?.emoji}</span>
              <div>
                <div className="font-bold text-slate-800">{s.name}</div>
                <div className="text-xs text-slate-400">{c?.label}{s.grade ? ` · ${s.grade}` : ""}</div>
              </div>
              <button
                onClick={() => remove({ id: s._id })}
                className="mr-auto text-sm text-red-500 hover:text-red-700"
              >
                حذف
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
