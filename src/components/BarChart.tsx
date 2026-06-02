interface Bar {
  label: string;
  value: number; // 0..100
  color?: string;
}

// رسم بياني بسيط بالأعمدة باستخدام SVG — بدون مكتبات خارجية
export default function BarChart({ data, height = 180 }: { data: Bar[]; height?: number }) {
  if (data.length === 0) return <div className="text-slate-400 text-sm">لا توجد بيانات.</div>;
  const w = Math.max(data.length * 70, 240);
  const pad = 28;
  const chartH = height - pad;
  const bw = w / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {[0, 25, 50, 75, 100].map((g) => {
        const y = chartH - (g / 100) * chartH + 4;
        return (
          <g key={g}>
            <line x1={0} x2={w} y1={y} y2={y} stroke="#eef2f7" strokeWidth={1} />
            <text x={w - 2} y={y - 2} fontSize={9} fill="#94a3b8" textAnchor="end">{g}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const barH = (Math.max(0, Math.min(100, d.value)) / 100) * chartH;
        const x = i * bw + bw * 0.2;
        const bwidth = bw * 0.6;
        const y = chartH - barH + 4;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bwidth} height={barH} rx={4} fill={d.color ?? "#1e293b"} />
            <text x={x + bwidth / 2} y={y - 4} fontSize={10} fill="#334155" textAnchor="middle" fontWeight="bold">
              {Math.round(d.value)}%
            </text>
            <text x={x + bwidth / 2} y={height - 6} fontSize={10} fill="#64748b" textAnchor="middle">
              {d.label.length > 8 ? d.label.slice(0, 8) + "…" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
