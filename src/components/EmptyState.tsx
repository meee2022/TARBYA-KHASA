import { ReactNode } from "react";

// حالة فراغ أنيقة: أيقونة كبيرة + رسالة + إجراء اختياري
export default function EmptyState({
  icon = "📭",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-light text-brand grid place-items-center text-3xl mx-auto mb-3">
        {icon}
      </div>
      <div className="font-bold text-slate-700">{title}</div>
      {hint && <div className="text-sm text-slate-400 mt-1">{hint}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
