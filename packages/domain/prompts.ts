/** The words a lesson fills in by itself. Any other word in braces is a blank the teacher types. */
export const promptFields = ['الدرس', 'المادة', 'الصف', 'الهدف'] as const;
const slot = /\{([^{}\n]{1,40})\}/g;

/** The blanks of a template the teacher has to type, each once, in order of appearance. */
export function promptBlanks(template: string): string[] {
  const known: readonly string[] = promptFields;
  return [...new Set([...template.matchAll(slot)].map(m => m[1].trim()))].filter(name => !known.includes(name));
}

/** The template with its words in braces replaced. A value that is missing stays on the page as a bracketed gap, so it is never silently dropped. */
export function fillPrompt(template: string, lesson: Record<string, string>, typed: Record<string, string> = {}): string {
  return template.replace(slot, (_, raw: string) => { const name = raw.trim(); const value = (lesson[name] ?? typed[name] ?? '').trim(); return value || `[${name}]`; });
}
