import { ReactNode } from "react";

// ترويسة موحّدة للصفحات: أيقونة + عنوان + وصف + إجراءات اختيارية
export default function PageHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-brand-light text-brand grid place-items-center text-xl shadow-soft">
          {icon}
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-grey">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
