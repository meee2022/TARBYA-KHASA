import { useEffect, useState } from "react";

// مسطرة القراءة: شريط أفقي يضيء السطر الحالي ويعتّم ما حوله، يتبع المؤشر/اللمس
export default function FocusLine() {
  const [y, setY] = useState(() => (typeof window !== "undefined" ? window.innerHeight / 2 : 300));
  const band = 64;

  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      const cy = "touches" in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;
      if (typeof cy === "number") setY(cy);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", move, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", move);
    };
  }, []);

  const top = Math.max(0, y - band / 2);
  return (
    <div className="fixed inset-0 z-40 pointer-events-none" aria-hidden>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: top, background: "rgba(15,12,16,0.42)" }} />
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          right: 0,
          height: band,
          background: "rgba(253,230,138,0.14)",
          borderTop: "2px solid rgba(138,21,56,0.45)",
          borderBottom: "2px solid rgba(138,21,56,0.45)",
        }}
      />
      <div style={{ position: "absolute", top: top + band, left: 0, right: 0, bottom: 0, background: "rgba(15,12,16,0.42)" }} />
    </div>
  );
}
