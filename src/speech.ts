// وحدة القراءة الصوتية (Text-to-Speech) عبر متصفح المستخدم — تختار صوتاً عربياً إن وُجد
let arVoice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = window.speechSynthesis.getVoices();
  arVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("ar")) ?? null;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string) {
  if (!isSpeechSupported() || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  if (arVoice) u.voice = arVoice;
  u.rate = 0.92; // أبطأ قليلاً ليكون أوضح للطلاب
  u.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function stopSpeak() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

// يبني نص قراءة للسؤال مع خياراته
export function questionToSpeech(prompt: string, options: string[]): string {
  const opts = options.map((o, i) => `الخيار ${i + 1}: ${o}`).join("، ");
  return `${prompt}. ${opts}`;
}

// قراءة نص مع إبلاغ موضع الحرف الجاري نطقه (لتظليل الكلمة) — قارئ ميسّر
export function speakHighlighted(
  text: string,
  onCharIndex: (charIndex: number) => void,
  onEnd?: () => void
) {
  if (!isSpeechSupported() || !text) {
    onEnd?.();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  if (arVoice) u.voice = arVoice;
  u.rate = 0.88;
  u.onboundary = (e) => {
    if (typeof e.charIndex === "number") onCharIndex(e.charIndex);
  };
  u.onend = () => {
    onCharIndex(-1);
    onEnd?.();
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// تحويل موضع الحرف إلى رقم الكلمة
export function wordIndexFromChar(text: string, charIndex: number): number {
  if (charIndex < 0) return -1;
  const words = text.split(" ");
  let pos = 0;
  for (let i = 0; i < words.length; i++) {
    const end = pos + words[i].length;
    if (charIndex >= pos && charIndex <= end) return i;
    pos = end + 1;
  }
  return -1;
}
