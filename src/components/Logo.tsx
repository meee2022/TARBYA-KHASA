// شعار مستوحى من هوية قطر للتعليم — شيفرون عنابي فوق درجات رمادية
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="49" fill="#fff" stroke="#E7E7E8" strokeWidth="2" />
      {/* الشيفرون العنابي العلوي */}
      <path d="M50 24 L78 50 H64 L50 37 L36 50 H22 Z" fill="#8A1538" />
      {/* درجات رمادية */}
      <path d="M50 44 L78 70 H64 L50 57 L36 70 H22 Z" fill="#58595B" />
      <path d="M50 58 L72 78 H60 L50 69 L40 78 H28 Z" fill="#9A9B9D" />
    </svg>
  );
}
