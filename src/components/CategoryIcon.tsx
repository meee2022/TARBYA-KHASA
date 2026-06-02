import { CategoryKey } from "../categories";

// أيقونات خطية مرسومة لكل فئة — ترث اللون من currentColor (العنابي)
export default function CategoryIcon({ k, size = 26 }: { k: CategoryKey; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (k) {
    case "autism": // قطعة بازل
      return (
        <svg {...p}>
          <path d="M9 4.5a1.5 1.5 0 1 1 3 0c0 .8.6 1 1.2 1H16a1 1 0 0 1 1 1v2.3c0 .6.2 1.2 1 1.2a1.5 1.5 0 1 1 0 3c-.8 0-1 .6-1 1.2V18a1 1 0 0 1-1 1h-2.3c-.6 0-1.2.2-1.2 1a1.5 1.5 0 1 1-3 0c0-.8-.6-1-1.2-1H5a1 1 0 0 1-1-1v-2.8c0-.6-.4-.8-1-.8a1.5 1.5 0 1 1 0-3c.6 0 1-.2 1-.8V6a1 1 0 0 1 1-1h2.8c.6 0 1.2-.2 1.2-.5Z" />
        </svg>
      );
    case "intellectual": // دماغ
      return (
        <svg {...p}>
          <path d="M12 5.5a3 3 0 0 0-5.5 1.7A3 3 0 0 0 5 12a3 3 0 0 0 1.5 4 3 3 0 0 0 5.5 1.5Z" />
          <path d="M12 5.5a3 3 0 0 1 5.5 1.7A3 3 0 0 1 19 12a3 3 0 0 1-1.5 4A3 3 0 0 1 12 17.5Z" />
          <path d="M12 5.5v12" />
        </svg>
      );
    case "learning": // كتاب
      return (
        <svg {...p}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5Z" />
          <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5A1.5 1.5 0 0 1 20 20.5Z" />
        </svg>
      );
    case "hearing": // أذن
      return (
        <svg {...p}>
          <path d="M7 9a5 5 0 0 1 10 0c0 2.5-2 3.3-2.8 4.5-.6.9-.5 1.7-1.2 2.4" />
          <path d="M9 17.5a2 2 0 0 0 3.2.3" />
          <path d="M10 9a2 2 0 0 1 3.6-1.2" />
        </svg>
      );
    case "visual": // عين
      return (
        <svg {...p}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      );
    case "motor": // كرسي متحرك
      return (
        <svg {...p}>
          <circle cx="11" cy="16" r="4.2" />
          <circle cx="11" cy="5" r="1.6" />
          <path d="M11 7.5V12h4l2.5 4.5" />
          <path d="M11 12h-2" />
          <circle cx="18.5" cy="18.5" r="1" />
        </svg>
      );
    default:
      return null;
  }
}
