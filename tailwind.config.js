/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Tajawal"', "system-ui", "sans-serif"],
      },
      colors: {
        // هوية قطر للتعليم — العنابي والرمادي
        brand: {
          DEFAULT: "#8A1538",
          dark: "#6E1029",
          light: "#FAEEF1",
          50: "#FCF4F6",
        },
        grey: {
          DEFAULT: "#58595B",
          dark: "#3F4042",
        },
      },
      boxShadow: {
        soft: "0 2px 12px -4px rgba(15,23,42,0.08)",
        card: "0 1px 3px rgba(15,23,42,0.06), 0 8px 24px -12px rgba(15,23,42,0.10)",
      },
    },
  },
  plugins: [],
};
