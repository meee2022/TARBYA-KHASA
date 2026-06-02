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
