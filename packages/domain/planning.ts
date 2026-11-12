import { countOf, describeAdaptation, responseLabels, supportLabels, supportOrder, understandingLabels, uid, type Goal, type KitItem, type Learner, type Lesson, type Observation, type Phase, type Support, type Workspace } from './index.ts';
import { defaultCatalog, type Catalog, type PlanPatternSession } from './catalog.ts';
import { templateBlocker, type ContentPack, type TemplateId } from './packs.ts';

export type StageKey = 'warmup' | 'content' | 'closing';
export const stageLabels: Record<StageKey, string> = { warmup: 'التهيئة', content: 'المحتوى', closing: 'الغلق' };
export const stageKeys: StageKey[] = ['warmup', 'content', 'closing'];
export interface PlanStage { teacher: string; student: string; minutes: number; arrangements: string; assessment: string; }
export interface PlanSession { id: string; date: string; objective: string; warmup: PlanStage; content: PlanStage; closing: PlanStage; activity?: TemplateId; lessonId?: string; done?: boolean; }
export interface LearnerPath { learnerId: string; text: string; }
export type Achieved = '' | 'done' | 'not';
export interface WeeklyPlan {
  id: string; title: string; subject: string; field: string; year: string; weekStart: string; weekEnd: string; supportLevel: string; sessionLength: number;
  learnerIds: string[]; goalIds: string[]; packId?: string; shortGoals: string; sessions: PlanSession[]; paths: LearnerPath[]; individual: string; skillGoal: string;
  bagLinks: { title: string; url: string }[]; bagItems: { text: string; done: boolean }[]; achieved: Achieved; reflection: string; updatedAt: string;
}
export interface IepShortGoal { id: string; text: string; strategy: string; arrangements: string; assessment: string; start: string; end: string; result: Achieved; trackedGoalId?: string; }
export interface IepLongGoal { id: string; kind: 'academic' | 'life'; subject: string; unit: string; text: string; start: string; end: string; result: Achieved; shorts: IepShortGoal[]; }
export interface IepReview { id: string; date: string; reasons: string[]; parties: string[]; notes: string; }
export interface Iep {
  learnerId: string; year: string; school: string; schoolType: string; birthDate: string; age: string; curriculum: string; disability: string; supportLevel: string; summary: string;
  services: { periods: string; scientific: boolean; literary: boolean; skills: boolean; sessions: string; speech: boolean; physical: boolean; occupational: boolean };
  performance: Record<string, { strength: string; need: string }[]>; goals: IepLongGoal[]; classroom: string[]; assessmentAcc: string[]; curriculumAcc: string[];
  tech: { tool: string; purpose: string }[]; team: { name: string; role: string }[]; reviews: IepReview[]; nextReview: string; updatedAt: string;
  /** Approved copies, oldest first. An approved copy never changes; editing the plan afterwards only makes the live plan differ from it. */
  versions?: IepVersion[];
}
export type IepContent = Omit<Iep, 'versions' | 'updatedAt'>;
export interface IepVersion { v: number; at: string; plan: IepContent; }
export interface Issue { where: string; text: string; }
export const issuesLabel = (n: number) => countOf(n, 'تنبيه', 'تنبيهان', 'تنبيهات');
/** Keeps a date or year range in order inside Arabic text. */
export const ltr = (text: string) => `\u2066${text}\u2069`;

export const day = (date: string, add = 0) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + add); return d.toISOString().slice(0, 10); };
const valid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);
export const today = () => new Date().toLocaleDateString('en-CA');
/** The school week starts on Sunday. */
export function weekOf(date: string) { const d = new Date(`${date}T12:00:00Z`); return day(date, -d.getUTCDay()); }
const stage = (minutes: number, teacher = '', student = ''): PlanStage => ({ teacher, student, minutes, arrangements: '', assessment: '' });

export function createPlan(catalog: Catalog, subject = catalog.subjects[0] ?? '', start = weekOf(today())): WeeklyPlan {
  const sessions = Array.from({ length: 5 }, (_, n): PlanSession => ({ id: uid(), date: day(start, n), objective: '', warmup: stage(5), content: stage(25), closing: stage(5) }));
  return { id: uid(), title: '', subject, field: 'تعليمي', year: catalog.academicYear, weekStart: start, weekEnd: day(start, 4), supportLevel: catalog.supportLevels[0] ?? '', sessionLength: 35, learnerIds: [], goalIds: [], shortGoals: '', sessions, paths: [], individual: '', skillGoal: '', bagLinks: [], bagItems: [], achieved: '', reflection: '', updatedAt: new Date().toISOString() };
}
const orderedOrder: TemplateId[] = ['cards', 'sequence', 'sequence', 'cards', 'sequence'];
/** Drafts the five sessions from the admin's pattern. A teacher edits the result; nothing here is final. */
export function fillPlan(plan: WeeklyPlan, pack: ContentPack, catalog: Catalog): WeeklyPlan {
  const words = pack.items.slice(0, 8).map(i => i.text).join('، ');
  const put = (text: string) => text.split('{words}').join(words).split('{title}').join(pack.title);
  const enabled = catalog.templates.filter(t => t.enabled).map(t => t.id);
  const pick = (wanted: TemplateId, n: number) => { const first = pack.ordered ? orderedOrder[n] : wanted; return [first, wanted, 'cards' as TemplateId].find(t => enabled.includes(t) && !templateBlocker(t, pack)); };
  const session = (old: PlanSession, row: PlanPatternSession | undefined, n: number): PlanSession => {
    if (!row) return old;
    const aids = catalog.teachingAids.slice(0, 2).join('، ');
    const part = (key: StageKey): PlanStage => ({ ...old[key], teacher: put(row[key].teacher), student: put(row[key].student), arrangements: aids, assessment: key === 'warmup' ? '' : catalog.assessmentTools[n % catalog.assessmentTools.length] ?? '' });
    return { ...old, objective: put(row.objective), activity: pick(row.activity, n), warmup: part('warmup'), content: part('content'), closing: part('closing') };
  };
  return { ...plan, packId: pack.id, title: plan.title || pack.title, subject: pack.subject, goalIds: pack.subject === plan.subject ? plan.goalIds : [], shortGoals: put(catalog.planPattern[0]?.objective ?? ''), sessions: plan.sessions.map((s, n) => session(s, catalog.planPattern[n], n)), bagItems: plan.bagItems.length ? plan.bagItems : catalog.teachingAids.slice(0, 4).map(text => ({ text, done: false })), updatedAt: new Date().toISOString() };
}
/** One lesson, and what differs for this learner. Built from their profile, never from a diagnosis. */
export function learnerPath(l: Learner) {
  const p = l.preferences; const parts = [describeAdaptation(p).join('، ')];
  if (p.understands?.length) parts.push(`تفهم عبر: ${p.understands.map(u => understandingLabels[u]).join('، ')}`);
  if (p.responds?.length) parts.push(`تجيب عبر: ${p.responds.map(r => responseLabels[r]).join('، ')}`);
  if (l.needs) parts.push(`لماذا: ${l.needs}`);
  return parts.join('. ');
}
export function syncPaths(plan: WeeklyPlan, learners: Learner[]): WeeklyPlan { const missing = plan.learnerIds.filter(id => !plan.paths.some(p => p.learnerId === id)); return { ...plan, paths: [...plan.paths, ...missing.map(id => { const l = learners.find(x => x.id === id); return { learnerId: id, text: l ? learnerPath(l) : '' }; })] }; }
/** Turns one planned session into a runnable lesson with the same goals. */
export function lessonFromSession(plan: WeeklyPlan, n: number) {
  const s = plan.sessions[n];
  return { id: uid(), title: `${plan.title} · الجلسة ${n + 1}`, subject: plan.subject, duration: s.warmup.minutes + s.content.minutes + s.closing.minutes, learnerIds: plan.learnerIds, goalIds: plan.goalIds, objective: s.objective, warmup: s.warmup.teacher, teaching: s.content.teacher, practice: s.content.student, closing: s.closing.teacher, adaptations: plan.paths.filter(p => plan.learnerIds.includes(p.learnerId)).map(p => p.text).join('\n'), packId: plan.packId, source: 'من التحضير الأسبوعي', planId: plan.id, sessionIndex: n, kit: kitFromPlan(plan, n) };
}
/** The lesson's kit, drawn from the week's bag and the session's arrangements: each item sits in the stage where it is used. */
export function kitFromPlan(plan: WeeklyPlan, n: number): KitItem[] {
  const s = plan.sessions[n]; const seen = new Set<string>(); const kit: KitItem[] = [];
  // One line per thing, in the first stage that needs it: the same cards are not packed three times.
  const add = (stage: KitItem['stage'], title: string, extra: Partial<KitItem> = {}) => { const key = title.trim(); if (!key || seen.has(key)) return; seen.add(key); kit.push({ id: uid(), stage, title: key, done: false, ...extra }); };
  for (const key of stageKeys) for (const part of s[key].arrangements.split(/[،,\n]/)) add(key, part);
  for (const link of plan.bagLinks) if (link.url) add('content', link.title || link.url, { url: link.url, task: 'يُفتح من هنا أثناء المحتوى' });
  for (const item of plan.bagItems) add('warmup', item.text, { task: 'يُجهَّز قبل الحصة', done: item.done });
  return kit;
}
export const kitProgress = (kit: KitItem[] = []) => ({ done: kit.filter(k => k.done).length, total: kit.length });
/** Every session planned for one date, from every plan. */
export const daySessions = (plans: WeeklyPlan[], date: string) => plans.flatMap(plan => plan.sessions.map((session, index) => ({ plan, session, index })).filter(x => x.session.date === date));
/** The sessions of one week, Sunday to Thursday, from every plan that touches it. */
export function weekSessions(plans: WeeklyPlan[], weekStart: string) {
  return Array.from({ length: 5 }, (_, n) => { const date = day(weekStart, n); return { date, sessions: daySessions(plans, date) }; });
}
/** The lesson before and after this one in the same weekly plan. */
export function lessonSiblings(lesson: Lesson, lessons: Lesson[]) {
  if (!lesson.planId || lesson.sessionIndex === undefined) return { prev: undefined, next: undefined };
  const at = (n: number) => lessons.find(l => l.planId === lesson.planId && l.sessionIndex === n);
  return { prev: at(lesson.sessionIndex - 1), next: at(lesson.sessionIndex + 1) };
}

export function createIep(learnerId: string, catalog: Catalog): Iep {
  return { learnerId, year: catalog.academicYear, school: '', schoolType: '', birthDate: '', age: '', curriculum: catalog.curriculumTypes[0] ?? '', disability: '', supportLevel: catalog.supportLevels[0] ?? '', summary: '', services: { periods: '', scientific: false, literary: false, skills: false, sessions: '', speech: false, physical: false, occupational: false }, performance: {}, goals: [], classroom: [], assessmentAcc: [], curriculumAcc: [], tech: [], team: [], reviews: [], nextReview: '', updatedAt: new Date().toISOString() };
}
/** How many approved copies a plan keeps. Older ones drop off so the synced workspace stays small. */
export const IEP_VERSIONS_KEPT = 8;
const contentOf = ({ versions: _v, updatedAt: _u, ...plan }: Iep): IepContent => plan;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Where the plan stands: never approved, approved as it is now, or edited since its last approval. Derived, so it cannot drift from the copies. */
export function iepApproval(iep: Iep): { state: 'draft' | 'approved' | 'edited'; version: number; at: string } {
  const last = iep.versions?.[iep.versions.length - 1];
  return last ? { state: same(last.plan, contentOf(iep)) ? 'approved' : 'edited', version: last.v, at: last.at } : { state: 'draft', version: 0, at: '' };
}
export const approvalLabel = (iep: Iep) => { const a = iepApproval(iep); return a.state === 'draft' ? 'مسودة' : a.state === 'approved' ? `معتمدة · الإصدار ${a.version}` : `عُدّلت بعد الإصدار ${a.version}`; };
/** Freezes the plan as it is now into a new numbered copy. Approving an unchanged plan again adds nothing. */
export function approveIep(iep: Iep, now = new Date().toISOString()): Iep {
  const a = iepApproval(iep); if (a.state === 'approved') return iep;
  return { ...iep, versions: [...(iep.versions ?? []), { v: a.version + 1, at: now, plan: structuredClone(contentOf(iep)) }].slice(-IEP_VERSIONS_KEPT) };
}
const fieldNames: [keyof IepContent, string][] = [['year', 'العام الأكاديمي'], ['school', 'المدرسة'], ['schoolType', 'نوع المدرسة'], ['birthDate', 'تاريخ الميلاد'], ['age', 'العمر'], ['curriculum', 'نوع المنهاج'], ['disability', 'نوع الإعاقة'], ['supportLevel', 'مستوى الدعم'], ['summary', 'ملخص الحالة'], ['services', 'الجدول والخدمات'], ['performance', 'الأداء الحالي'], ['tech', 'التكنولوجيا المساندة'], ['team', 'فريق العمل'], ['reviews', 'سجل المراجعات'], ['nextReview', 'موعد المراجعة القادمة']];
const quote = (text: string) => `«${text.trim().slice(0, 70) || 'بلا نص'}»`;
/** What changed between an approved copy and the plan now, in the teacher's words. Empty when nothing changed. */
export function iepChanges(before: IepContent, now: Iep): string[] {
  const out: string[] = [];
  for (const [key, name] of fieldNames) if (!same(before[key], now[key])) out.push(`تغيّر: ${name}`);
  for (const g of now.goals) {
    const old = before.goals.find(x => x.id === g.id);
    if (!old) { out.push(`هدف بعيد المدى جديد: ${quote(g.text)}`); continue; }
    const { shorts: _a, ...head } = g; const { shorts: _b, ...oldHead } = old;
    if (!same(head, oldHead)) out.push(`عُدّل الهدف بعيد المدى: ${quote(g.text)}`);
    for (const s of g.shorts) { const was = old.shorts.find(x => x.id === s.id); if (!was) out.push(`هدف قصير جديد: ${quote(s.text)}`); else if (!same(was, s)) out.push(`عُدّل الهدف القصير: ${quote(s.text)}`); }
    for (const s of old.shorts) if (!g.shorts.some(x => x.id === s.id)) out.push(`حُذف الهدف القصير: ${quote(s.text)}`);
  }
  for (const g of before.goals) if (!now.goals.some(x => x.id === g.id)) out.push(`حُذف الهدف بعيد المدى: ${quote(g.text)}`);
  for (const [key, name] of [['classroom', 'ترتيبات البيئة الصفية'], ['assessmentAcc', 'ترتيبات التقييم'], ['curriculumAcc', 'ترتيبات المنهاج']] as const) {
    const added = now[key].filter(x => !before[key].includes(x)), removed = before[key].filter(x => !now[key].includes(x));
    if (added.length) out.push(`أُضيف إلى ${name}: ${added.join('، ')}`);
    if (removed.length) out.push(`حُذف من ${name}: ${removed.join('، ')}`);
  }
  return out;
}
/** Days until the next review: negative when it has passed, null when no date is set. */
export const reviewDue = (iep: Iep, now = today()) => /^\d{4}-\d{2}-\d{2}$/.test(iep.nextReview) ? Math.round((Date.parse(iep.nextReview) - Date.parse(now)) / 864e5) : null;
export const newLongGoal = (kind: IepLongGoal['kind'], subject: string): IepLongGoal => ({ id: uid(), kind, subject, unit: '', text: '', start: '', end: '', result: '', shorts: [] });
export const newShortGoal = (long: IepLongGoal, catalog: Catalog): IepShortGoal => ({ id: uid(), text: '', strategy: catalog.strategies[0] ?? '', arrangements: catalog.teachingAids[0] ?? '', assessment: catalog.assessmentTools[0] ?? '', start: long.start, end: long.end, result: '' });

// Goals
export type CriterionType = 'of' | 'streak' | 'percent';
export interface GoalDraft { behaviour: string; condition: string; type: CriterionType; x: number; y: number; sessions: number; support: Support; subject: string; baseline: string; }
export function goalCriterion(d: Pick<GoalDraft, 'type' | 'x' | 'y' | 'sessions'>) {
  const main = d.type === 'streak' ? `${d.x} محاولات متتالية` : d.type === 'percent' ? `بنسبة ${d.x}%` : `${d.x} من ${d.y} محاولات`;
  return d.sessions === 2 ? `${main} خلال جلستين` : d.sessions > 2 ? `${main} خلال ${d.sessions} جلسات` : main;
}
export const goalSentence = (d: GoalDraft) => `أن ${d.behaviour.trim().replace(/^أن\s+/, '')}${d.condition.trim() ? ` ${d.condition.trim()}` : ''}، ${goalCriterion(d)}، ${supportLabels[d.support]}.`;
export function goalFromDraft(d: GoalDraft): Goal {
  const target = d.x; const opportunities = d.type === 'streak' ? d.x : d.type === 'percent' ? 100 : d.y;
  return { id: uid(), text: goalSentence(d), subject: d.subject, target, opportunities, baseline: d.baseline, support: d.support, sessions: d.sessions };
}
export function draftErrors(d: GoalDraft) {
  const out: string[] = [];
  if (!d.behaviour.trim()) out.push('اكتبي السلوك الذي نلاحظه.');
  if (!Number.isInteger(d.x) || d.x < 1 || (d.type === 'percent' && d.x > 100)) out.push('راجعي رقم المعيار.');
  if (d.type === 'of' && (!Number.isInteger(d.y) || d.y < d.x)) out.push('عدد النجاح لا يتجاوز عدد المحاولات.');
  if (!Number.isInteger(d.sessions) || d.sessions < 1) out.push('عدد الجلسات يبدأ من 1.');
  return out;
}
export type GoalStatus = 'not-evaluated' | 'training' | 'met' | 'approved' | 'review';
export const goalStatusLabels: Record<GoalStatus, string> = { 'not-evaluated': 'لم يُقيَّم', training: 'قيد التدريب', met: 'البيانات تشير لتحقق المعيار', approved: 'اعتمدته المعلمة', review: 'يحتاج مراجعة' };
/** What the records say. Reaching the criterion is only ever a suggestion: approval is the teacher's click. */
export const phaseOf = (o: Observation): Phase => o.phase ?? 'intervention';
/** Maintenance probes after approval: two and six weeks later, each due until a maintenance record lands on or after it. */
export const probeOffsets = [14, 42];
export function goalProgress(goal: Goal, observations: Observation[], now = today()) {
  const rows = observations.filter(o => o.goalId === goal.id && o.total > 0).sort((a, b) => a.date.localeCompare(b.date));
  const limit = goal.support ? supportOrder.indexOf(goal.support) : 0;
  const counted = (o: Observation) => { const rank = supportOrder.indexOf(o.support); return limit > 0 && rank >= 0 && rank <= limit ? o.correct : o.independent; };
  const score = (o: Observation) => counted(o) / o.total; const need = goal.target / goal.opportunities; const window = goal.sessions ?? 2;
  // Only teaching sessions decide the criterion. Baseline shows where we started; maintenance shows whether it held.
  const teaching = rows.filter(o => phaseOf(o) === 'intervention'); const baseline = rows.filter(o => phaseOf(o) === 'baseline'); const maintenance = rows.filter(o => phaseOf(o) === 'maintenance');
  const scores = teaching.map(score);
  const met = teaching.length >= window && scores.slice(-window).every(s => s >= need);
  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
  // ponytail: first-two vs last-two is a coarse trend check, use a real slope once schools collect longer series.
  const flat = teaching.length >= 4 && mean(scores.slice(-2)) <= mean(scores.slice(0, 2));
  const status: GoalStatus = goal.approvedAt ? 'approved' : !rows.length ? 'not-evaluated' : met ? 'met' : flat ? 'review' : 'training';
  // Generalization: the criterion was reached in at least two different settings, or with two different people.
  const strong = teaching.filter(o => score(o) >= need); const settings = new Set(strong.map(o => o.context?.setting).filter(Boolean)); const people = new Set(strong.map(o => o.context?.person).filter(Boolean));
  const generalized = settings.size >= 2 || people.size >= 2;
  const held = maintenance.length ? maintenance.every(o => score(o) >= need) : undefined;
  const probeDue = goal.approvedAt ? probeOffsets.map(n => day(goal.approvedAt!, n)).find(due => due <= now && !maintenance.some(o => o.date.slice(0, 10) >= due)) : undefined;
  return { status, rows, need, last: rows[rows.length - 1], teaching, baseline, maintenance, generalized, contexts: settings.size + people.size, held, probeDue };
}

// Consistency checks. Advice only: nothing is ever corrected silently.
function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let prev = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const keep = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = keep; } }
  return row[b.length];
}
const latinWords = (text: string) => text.match(/[A-Za-z]{4,}/g) ?? [];
/** Near-identical spellings of one word, such as Cheeta and Cheetah. */
export function spellingVariants(texts: string[], known: string[] = []) {
  // ponytail: Latin words only, Arabic near-pairs like بيت/بنت are real different words. Add a dictionary if schools ask.
  const plural = (a: string, b: string) => a + 's' === b || b + 's' === a || a + 'es' === b || b + 'es' === a;
  const seen = new Map<string, string>(); texts.flatMap(latinWords).forEach(w => { if (!seen.has(w.toLowerCase())) seen.set(w.toLowerCase(), w); });
  const words = [...seen.keys()]; const anchors = known.flatMap(latinWords).map(w => w.toLowerCase()); const out: [string, string][] = [];
  for (const w of words) { const match = w.length >= 5 ? anchors.find(a => a !== w && !plural(a, w) && distance(a, w) === 1) : undefined; if (match && !anchors.includes(w)) out.push([seen.get(w)!, match]); }
  for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) { const [a, b] = [words[i], words[j]]; if (a.length >= 5 && !plural(a, b) && distance(a, b) === 1 && !anchors.includes(a) && !anchors.includes(b)) out.push([seen.get(a)!, seen.get(b)!]); }
  return out;
}
const yearOf = (y: string) => y.replace(/\s/g, '').replace(/[–/]/, '-');
const otherYears = (text: string, year: string) => [...new Set((text.match(/20\d\d\s*[-–/]\s*20\d\d/g) ?? []).map(yearOf))].filter(y => y !== yearOf(year));
const letterIn = (text: string) => [...text.matchAll(/(?<![\u0621-\u064A])(?:\u0627\u0644\u062d\u0631\u0641|\u062d\u0631\u0641)(?:\s+|\s*[(\u00ab"]\s*)([A-Za-z\u0621-\u064A])(?=[\s)\u00bb",.\u060c-]|$)/g)].map(m => m[1].toLowerCase());
const measurable = (text: string) => /\d|جميع|كل /.test(text);

export function checkPlan(plan: WeeklyPlan, ctx: { pack?: ContentPack; learners: Learner[] }): Issue[] {
  const out: Issue[] = []; const add = (where: string, text: string) => out.push({ where, text });
  const { pack } = ctx; const learners = ctx.learners.filter(l => plan.learnerIds.includes(l.id));
  const sessionText = (s: PlanSession) => [s.objective, ...stageKeys.flatMap(k => [s[k].teacher, s[k].student, s[k].arrangements, s[k].assessment])].join(' ');
  if (!plan.title.trim()) add('header', 'أضيفي موضوع الدرس.');
  if (valid(plan.weekStart) && valid(plan.weekEnd) && plan.weekEnd < plan.weekStart) add('header', 'نهاية الأسبوع قبل بدايته.');
  if (!plan.learnerIds.length) add('learners', 'اختاري طالبةً واحدًا على الأقل.');
  for (const y of otherYears([plan.title, plan.shortGoals, plan.reflection, plan.individual, ...plan.sessions.map(sessionText)].join(' '), plan.year)) add('header', `النص يذكر العام ${ltr(y)}، بينما عام الاستمارة ${ltr(plan.year)}.`);
  if (plan.shortGoals.trim() && !measurable(plan.shortGoals)) add('goals', 'الأهداف بلا معيار رقمي. أضيفي مثل: 4 من 5 محاولات.');
  for (const [a, b] of spellingVariants([plan.title, plan.shortGoals, ...plan.sessions.map(sessionText)], pack?.items.map(i => i.text) ?? [])) add('spelling', `«${a}» قريبة من «${b}». هل هي الكلمة نفسها؟`);
  const goalLetters = letterIn(plan.shortGoals);
  plan.sessions.forEach((s, n) => {
    const where = `session-${n}`; const sum = stageKeys.reduce((t, k) => t + (Number(s[k].minutes) || 0), 0);
    if (sum !== plan.sessionLength) add(where, `مجموع الزمن ${sum} دقيقة، وزمن الجلسة ${plan.sessionLength}.`);
    if (!s.objective.trim()) add(where, 'لا يوجد هدف لهذه الجلسة.');
    if (valid(s.date) && valid(plan.weekStart) && valid(plan.weekEnd) && (s.date < plan.weekStart || s.date > plan.weekEnd)) add(where, 'تاريخ الجلسة خارج الأسبوع المحدد.');
    if (s.date && plan.sessions.findIndex(x => x.date === s.date) !== n) add(where, 'هذا التاريخ مستخدم في جلسة أخرى.');
    if (goalLetters.length) for (const l of letterIn(sessionText(s))) if (!goalLetters.includes(l)) add(where, `النشاط يذكر الحرف «${l}»، والهدف عن «${goalLetters.join('، ')}».`);
    if (s.activity && pack) { const block = templateBlocker(s.activity, pack); if (block) add(where, `النشاط المختار لا يعمل مع هذه الحزمة: ${block}`); }
    if (s.activity === 'listen') for (const l of learners) if (!l.preferences.sound) add(where, `نشاط الاستماع لا يناسب ${l.name}: الصوت متوقف في ملفها.`);
  });
  if (pack) for (const l of learners) {
    const u = l.preferences.understands ?? [];
    const noPicture = pack.items.filter(i => !i.imageId && !i.emoji).length;
    if (noPicture && u.includes('picture') && !u.includes('text')) add('learners', `${l.name} تعتمد على الصور، و${noPicture} عناصر في الحزمة بلا صورة.`);
    const noSign = pack.items.filter(i => !i.signId).length;
    if (noSign && u.includes('sign')) add('learners', `${l.name} تستخدم الإشارة، و${noSign} عناصر بلا فيديو إشارة.`);
  }
  for (const l of learners) if (!l.goals.some(g => g.subject === plan.subject)) add('learners', `${l.name} ليس لها هدف في مادة ${plan.subject}.`);
  for (const link of plan.bagLinks) if (link.url && !/^https?:\/\//i.test(link.url)) add('bag', `الرابط «${link.title || link.url}» ليس رابط ويب صالحًا.`);
  return out;
}
export function checkIep(iep: Iep, now = today()): Issue[] {
  const out: Issue[] = []; const add = (where: string, text: string) => out.push({ where, text });
  if (!iep.summary.trim()) add('data', 'ملخص الحالة فارغ.');
  if (valid(iep.birthDate) && iep.birthDate > now) add('data', 'تاريخ الميلاد في المستقبل.');
  const all = [iep.summary, ...iep.goals.flatMap(g => [g.unit, g.text, ...g.shorts.map(s => s.text)]), ...Object.values(iep.performance).flat().flatMap(r => [r.strength, r.need])];
  for (const y of otherYears(all.join(' '), iep.year)) add('data', `النص يذكر العام ${ltr(y)}، بينما عام الخطة ${ltr(iep.year)}.`);
  for (const [a, b] of spellingVariants(all)) add('goals', `«${a}» قريبة من «${b}». هل هي الكلمة نفسها؟`);
  if (!Object.values(iep.performance).flat().some(r => r.strength.trim() || r.need.trim())) add('performance', 'لم يُوثَّق الأداء الحالي بعد.');
  if (!iep.goals.length) add('goals', 'لا توجد أهداف بعد.');
  const seen = new Set<string>();
  for (const g of iep.goals) {
    const where = `goal-${g.id}`;
    if (!g.text.trim()) add(where, 'اكتبي نص الهدف بعيد المدى.');
    if (!g.shorts.length) add(where, 'أضيفي هدفًا قصير المدى واحدًا على الأقل.');
    if (valid(g.start) && valid(g.end) && g.end < g.start) add(where, 'تاريخ الانتهاء قبل تاريخ البدء.');
    for (const s of g.shorts) {
      if (s.text.trim() && !measurable(s.text)) add(where, `بلا معيار رقمي: «${s.text.slice(0, 50)}».`);
      if (valid(s.start) && valid(s.end) && s.end < s.start) add(where, `تاريخ الانتهاء قبل البدء: «${s.text.slice(0, 50)}».`);
      if (valid(s.start) && valid(g.start) && s.start < g.start || valid(s.end) && valid(g.end) && s.end > g.end) add(where, `تواريخ الهدف القصير خارج مدى الهدف البعيد: «${s.text.slice(0, 50)}».`);
      const key = s.text.trim(); if (key && seen.has(key)) add(where, `هدف مكرر: «${key.slice(0, 50)}».`); seen.add(key);
    }
  }
  if (!iep.classroom.length && !iep.assessmentAcc.length && !iep.curriculumAcc.length) add('accommodations', 'لم تُحدَّد ترتيبات وتسهيلات.');
  if (!iep.team.some(t => t.name.trim())) add('team', 'أضيفي فريق العمل.');
  if (valid(iep.nextReview) && iep.nextReview < now) add('review', 'موعد المراجعة القادمة مضى.');
  return out;
}

// Demo content: fictional learners only, so a first look shows the whole flow.
const animalsId = 'plan-animals';
function demoPlan(learners: Learner[]): WeeklyPlan {
  const pack = defaultCatalog.packs.find(p => p.id === 'pack-animals')!;
  const ids = ['demo-1', 'demo-2', 'demo-5', 'demo-6'].filter(id => learners.some(l => l.id === id));
  const plan = fillPlan({ ...createPlan(defaultCatalog, pack.subject), id: animalsId, title: 'We love animals', learnerIds: ids, goalIds: learners.filter(l => ids.includes(l.id)).flatMap(l => l.goals.filter(g => g.subject === pack.subject).map(g => g.id)) }, pack, defaultCatalog);
  return { ...syncPaths(plan, learners), individual: 'تدريب فردي قصير على الكلمات التي لم تثبت بعد، بالوسيلة المحددة في مسار كل طالبة.', skillGoal: 'أن ترتّب الطالبة أدواتها بعد انتهاء النشاط.', bagLinks: [] };
}
function demoIep(learner: Learner, catalog: Catalog): Iep {
  const long = newLongGoal('academic', 'اللغة الإنجليزية');
  return { ...createIep(learner.id, catalog), school: 'مدرسة تجريبية', age: '8 سنوات', summary: 'ملف خيالي لعرض المنصة. تتواصل بالصور والإشارة، وتحتاج تعليمات من خطوة واحدة.', services: { periods: '5', scientific: false, literary: true, skills: false, sessions: '2', speech: true, physical: false, occupational: false },
    performance: { [catalog.performanceDomains[0]]: [{ strength: 'تتعرف إلى الحيوانات المألوفة من الصور.', need: 'زيادة المفردات الإنجليزية.' }], [catalog.performanceDomains[1]]: [{ strength: 'تعبّر عن احتياجاتها بالإشارة.', need: 'استخدام لوحة التواصل باستقلالية.' }] },
    goals: [{ ...long, unit: 'We love animals', text: 'أن تسمّي الطالبة خمسة حيوانات بالإشارة أو بالكلمة.', start: weekOf(today()), end: day(weekOf(today()), 25), shorts: [{ ...newShortGoal(long, catalog), text: learner.goals[0]?.text ?? '', start: weekOf(today()), end: day(weekOf(today()), 11), trackedGoalId: learner.goals[0]?.id }] }],
    classroom: catalog.classroomAccommodations.slice(0, 2), assessmentAcc: catalog.assessmentAccommodations.slice(0, 2), curriculumAcc: catalog.curriculumAccommodations.slice(0, 1), tech: [{ tool: 'لوحة التواصل في المنصة', purpose: 'التعبير عن الاحتياجات بالصور' }], team: [{ name: 'اسم خيالي', role: 'معلمة التربية الخاصة' }], nextReview: day(today(), 30) };
}
function demoObservations(w: Workspace): Observation[] {
  const goal = w.learners.find(l => l.id === 'demo-1')?.goals[0]; if (!goal) return [];
  const settings = ['غرفة المصادر', 'غرفة المصادر', 'غرفة المصادر', 'الفصل', 'غرفة المصادر'];
  const base: Observation = { id: 'demo-obs-base', lessonId: 'manual', learnerId: 'demo-1', goalId: goal.id, date: `${day(today(), -18)}T09:00:00.000Z`, correct: 1, independent: 0, total: 5, support: 'verbal', note: 'قياس قبل البدء: سجل خيالي.', phase: 'baseline', context: { setting: 'غرفة المصادر', person: 'معلمة التربية الخاصة', material: 'بطاقات' }, source: 'manual' };
  return [base, ...([[1, 0], [2, 1], [3, 2], [4, 4], [4, 4]] as const).map(([correct, independent], n): Observation => ({ id: `demo-obs-${n}`, lessonId: 'animals', learnerId: 'demo-1', goalId: goal.id, date: `${day(today(), (n - 5) * 3)}T09:00:00.000Z`, correct, independent, total: 5, support: (independent === correct ? 'independent' : 'verbal') as Support, note: 'سجل خيالي لعرض التقرير.', phase: 'intervention', context: { setting: settings[n], person: n === 3 ? 'معلمة الفصل' : 'معلمة التربية الخاصة', material: 'الشاشة' }, source: 'session' }))];
}
/** Older saved workspaces gain the new sections. Demo records appear only beside the fictional learners. */
export function withPlanning(w: Workspace, catalog: Catalog = defaultCatalog): Workspace {
  if (w.plans && w.ieps) return w;
  const hasDemo = w.learners.some(l => l.id === 'demo-1');
  return { ...w, plans: w.plans ?? (hasDemo ? [demoPlan(w.learners)] : []), ieps: w.ieps ?? (hasDemo ? [demoIep(w.learners.find(l => l.id === 'demo-1')!, catalog)] : []), observations: hasDemo && !w.observations.length && !w.plans ? demoObservations(w) : w.observations };
}

/** Goal progress in words a family can read: no scores, no comparison with other children. */
export const familyStatus: Record<GoalStatus, string> = { 'not-evaluated': 'بدأنا العمل عليه', training: 'نتدرّب عليه', met: 'نرى تقدمًا واضحًا', approved: 'تحقق، ونبني عليه', review: 'نجرّب طريقة أخرى' };
/** A week for the family: what was practised, how each goal is going, and words to repeat at home. */
export function familyWeek(w: Workspace, learnerId: string, packs: ContentPack[], now = new Date()) {
  const from = new Date(now.getTime() - 7 * 864e5).toISOString(); const learner = w.learners.find(l => l.id === learnerId);
  const mine = w.observations.filter(o => o.learnerId === learnerId);
  const seen = mine.filter(o => o.date >= from); const practice = (w.practiceSessions ?? []).filter(p => p.learnerId === learnerId && p.date >= from);
  const lessons = [...new Set(seen.map(o => o.lessonId))].map(id => w.lessons.find(l => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l);
  const activities = [...practice.reduce((m, p) => m.set(p.title ?? p.gameId, (m.get(p.title ?? p.gameId) ?? 0) + 1), new Map<string, number>())].map(([title, times]) => ({ title, times }));
  const words = [...new Set(lessons.flatMap(l => packs.find(p => p.id === l.packId)?.items.map(i => i.text) ?? []))].slice(0, 12);
  const goals = (learner?.goals ?? []).map(g => ({ text: g.text, status: familyStatus[goalProgress(g, mine).status] }));
  return { from, lessons: lessons.map(l => l.title), activities, words, goals, empty: !seen.length && !practice.length };
}
