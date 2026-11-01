import { countOf, describeAdaptation, responseLabels, supportLabels, supportOrder, understandingLabels, uid, type Goal, type Learner, type Observation, type Support, type Workspace } from './index.ts';
import { defaultCatalog, type Catalog, type PlanPatternSession } from './catalog.ts';
import { templateBlocker, type ContentPack, type TemplateId } from './packs.ts';

export type StageKey = 'warmup' | 'content' | 'closing';
export const stageLabels: Record<StageKey, string> = { warmup: 'التهيئة', content: 'المحتوى', closing: 'الغلق' };
export const stageKeys: StageKey[] = ['warmup', 'content', 'closing'];
export interface PlanStage { teacher: string; student: string; minutes: number; arrangements: string; assessment: string; }
export interface PlanSession { id: string; date: string; objective: string; warmup: PlanStage; content: PlanStage; closing: PlanStage; activity?: TemplateId; }
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
}
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
  if (p.understands?.length) parts.push(`يفهم عبر: ${p.understands.map(u => understandingLabels[u]).join('، ')}`);
  if (p.responds?.length) parts.push(`يجيب عبر: ${p.responds.map(r => responseLabels[r]).join('، ')}`);
  if (l.needs) parts.push(`لماذا: ${l.needs}`);
  return parts.join('. ');
}
export function syncPaths(plan: WeeklyPlan, learners: Learner[]): WeeklyPlan { const missing = plan.learnerIds.filter(id => !plan.paths.some(p => p.learnerId === id)); return { ...plan, paths: [...plan.paths, ...missing.map(id => { const l = learners.find(x => x.id === id); return { learnerId: id, text: l ? learnerPath(l) : '' }; })] }; }
/** Turns one planned session into a runnable lesson with the same goals. */
export function lessonFromSession(plan: WeeklyPlan, n: number) {
  const s = plan.sessions[n];
  return { id: uid(), title: `${plan.title} · الجلسة ${n + 1}`, subject: plan.subject, duration: s.warmup.minutes + s.content.minutes + s.closing.minutes, learnerIds: plan.learnerIds, goalIds: plan.goalIds, objective: s.objective, warmup: s.warmup.teacher, teaching: s.content.teacher, practice: s.content.student, closing: s.closing.teacher, adaptations: plan.paths.filter(p => plan.learnerIds.includes(p.learnerId)).map(p => p.text).join('\n'), packId: plan.packId, source: 'من التحضير الأسبوعي' };
}

export function createIep(learnerId: string, catalog: Catalog): Iep {
  return { learnerId, year: catalog.academicYear, school: '', schoolType: '', birthDate: '', age: '', curriculum: catalog.curriculumTypes[0] ?? '', disability: '', supportLevel: catalog.supportLevels[0] ?? '', summary: '', services: { periods: '', scientific: false, literary: false, skills: false, sessions: '', speech: false, physical: false, occupational: false }, performance: {}, goals: [], classroom: [], assessmentAcc: [], curriculumAcc: [], tech: [], team: [], reviews: [], nextReview: '', updatedAt: new Date().toISOString() };
}
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
  if (!d.behaviour.trim()) out.push('اكتب السلوك الذي نلاحظه.');
  if (!Number.isInteger(d.x) || d.x < 1 || (d.type === 'percent' && d.x > 100)) out.push('راجع رقم المعيار.');
  if (d.type === 'of' && (!Number.isInteger(d.y) || d.y < d.x)) out.push('عدد النجاح لا يتجاوز عدد المحاولات.');
  if (!Number.isInteger(d.sessions) || d.sessions < 1) out.push('عدد الجلسات يبدأ من 1.');
  return out;
}
export type GoalStatus = 'not-evaluated' | 'training' | 'met' | 'approved' | 'review';
export const goalStatusLabels: Record<GoalStatus, string> = { 'not-evaluated': 'لم يُقيَّم', training: 'قيد التدريب', met: 'البيانات تشير لتحقق المعيار', approved: 'اعتمده المعلم', review: 'يحتاج مراجعة' };
/** What the records say. Reaching the criterion is only ever a suggestion: approval is the teacher's click. */
export function goalProgress(goal: Goal, observations: Observation[]) {
  const rows = observations.filter(o => o.goalId === goal.id && o.total > 0).sort((a, b) => a.date.localeCompare(b.date));
  const limit = goal.support ? supportOrder.indexOf(goal.support) : 0;
  const counted = (o: Observation) => { const rank = supportOrder.indexOf(o.support); return limit > 0 && rank >= 0 && rank <= limit ? o.correct : o.independent; };
  const scores = rows.map(o => counted(o) / o.total); const need = goal.target / goal.opportunities; const window = goal.sessions ?? 2;
  const met = rows.length >= window && scores.slice(-window).every(s => s >= need);
  const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
  // ponytail: first-two vs last-two is a coarse trend check, use a real slope once schools collect longer series.
  const flat = rows.length >= 4 && mean(scores.slice(-2)) <= mean(scores.slice(0, 2));
  const status: GoalStatus = goal.approvedAt ? 'approved' : !rows.length ? 'not-evaluated' : met ? 'met' : flat ? 'review' : 'training';
  return { status, rows, need, last: rows[rows.length - 1] };
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
  if (!plan.title.trim()) add('header', 'أضف موضوع الدرس.');
  if (valid(plan.weekStart) && valid(plan.weekEnd) && plan.weekEnd < plan.weekStart) add('header', 'نهاية الأسبوع قبل بدايته.');
  if (!plan.learnerIds.length) add('learners', 'اختر طالبًا واحدًا على الأقل.');
  for (const y of otherYears([plan.title, plan.shortGoals, plan.reflection, plan.individual, ...plan.sessions.map(sessionText)].join(' '), plan.year)) add('header', `النص يذكر العام ${ltr(y)}، بينما عام الاستمارة ${ltr(plan.year)}.`);
  if (plan.shortGoals.trim() && !measurable(plan.shortGoals)) add('goals', 'الأهداف بلا معيار رقمي. أضف مثل: 4 من 5 محاولات.');
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
    if (s.activity === 'listen') for (const l of learners) if (!l.preferences.sound) add(where, `نشاط الاستماع لا يناسب ${l.name}: الصوت متوقف في ملفه.`);
  });
  if (pack) for (const l of learners) {
    const u = l.preferences.understands ?? [];
    const noPicture = pack.items.filter(i => !i.imageId && !i.emoji).length;
    if (noPicture && u.includes('picture') && !u.includes('text')) add('learners', `${l.name} يعتمد على الصور، و${noPicture} عناصر في الحزمة بلا صورة.`);
    const noSign = pack.items.filter(i => !i.signId).length;
    if (noSign && u.includes('sign')) add('learners', `${l.name} يستخدم الإشارة، و${noSign} عناصر بلا فيديو إشارة.`);
  }
  for (const l of learners) if (!l.goals.some(g => g.subject === plan.subject)) add('learners', `${l.name} ليس له هدف في مادة ${plan.subject}.`);
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
    if (!g.text.trim()) add(where, 'اكتب نص الهدف بعيد المدى.');
    if (!g.shorts.length) add(where, 'أضف هدفًا قصير المدى واحدًا على الأقل.');
    if (valid(g.start) && valid(g.end) && g.end < g.start) add(where, 'تاريخ الانتهاء قبل تاريخ البدء.');
    for (const s of g.shorts) {
      if (s.text.trim() && !measurable(s.text)) add(where, `بلا معيار رقمي: «${s.text.slice(0, 50)}».`);
      if (valid(s.start) && valid(s.end) && s.end < s.start) add(where, `تاريخ الانتهاء قبل البدء: «${s.text.slice(0, 50)}».`);
      if (valid(s.start) && valid(g.start) && s.start < g.start || valid(s.end) && valid(g.end) && s.end > g.end) add(where, `تواريخ الهدف القصير خارج مدى الهدف البعيد: «${s.text.slice(0, 50)}».`);
      const key = s.text.trim(); if (key && seen.has(key)) add(where, `هدف مكرر: «${key.slice(0, 50)}».`); seen.add(key);
    }
  }
  if (!iep.classroom.length && !iep.assessmentAcc.length && !iep.curriculumAcc.length) add('accommodations', 'لم تُحدَّد ترتيبات وتسهيلات.');
  if (!iep.team.some(t => t.name.trim())) add('team', 'أضف فريق العمل.');
  if (valid(iep.nextReview) && iep.nextReview < now) add('review', 'موعد المراجعة القادمة مضى.');
  return out;
}

// Demo content: fictional learners only, so a first look shows the whole flow.
const animalsId = 'plan-animals';
function demoPlan(learners: Learner[]): WeeklyPlan {
  const pack = defaultCatalog.packs.find(p => p.id === 'pack-animals')!;
  const ids = ['demo-1', 'demo-2', 'demo-5', 'demo-6'].filter(id => learners.some(l => l.id === id));
  const plan = fillPlan({ ...createPlan(defaultCatalog, pack.subject), id: animalsId, title: 'We love animals', learnerIds: ids, goalIds: learners.filter(l => ids.includes(l.id)).flatMap(l => l.goals.filter(g => g.subject === pack.subject).map(g => g.id)) }, pack, defaultCatalog);
  return { ...syncPaths(plan, learners), individual: 'تدريب فردي قصير على الكلمات التي لم تثبت بعد، بالوسيلة المحددة في مسار كل طالب.', skillGoal: 'أن يرتّب الطالب أدواته بعد انتهاء النشاط.', bagLinks: [] };
}
function demoIep(learner: Learner, catalog: Catalog): Iep {
  const long = newLongGoal('academic', 'اللغة الإنجليزية');
  return { ...createIep(learner.id, catalog), school: 'مدرسة تجريبية', age: '8 سنوات', summary: 'ملف خيالي لعرض المنصة. تتواصل بالصور والإشارة، وتحتاج تعليمات من خطوة واحدة.', services: { periods: '5', scientific: false, literary: true, skills: false, sessions: '2', speech: true, physical: false, occupational: false },
    performance: { [catalog.performanceDomains[0]]: [{ strength: 'تتعرف إلى الحيوانات المألوفة من الصور.', need: 'زيادة المفردات الإنجليزية.' }], [catalog.performanceDomains[1]]: [{ strength: 'تعبّر عن احتياجاتها بالإشارة.', need: 'استخدام لوحة التواصل باستقلالية.' }] },
    goals: [{ ...long, unit: 'We love animals', text: 'أن تسمّي الطالبة خمسة حيوانات بالإشارة أو بالكلمة.', start: weekOf(today()), end: day(weekOf(today()), 25), shorts: [{ ...newShortGoal(long, catalog), text: learner.goals[0]?.text ?? '', start: weekOf(today()), end: day(weekOf(today()), 11), trackedGoalId: learner.goals[0]?.id }] }],
    classroom: catalog.classroomAccommodations.slice(0, 2), assessmentAcc: catalog.assessmentAccommodations.slice(0, 2), curriculumAcc: catalog.curriculumAccommodations.slice(0, 1), tech: [{ tool: 'لوحة التواصل في المنصة', purpose: 'التعبير عن الاحتياجات بالصور' }], team: [{ name: 'اسم خيالي', role: 'معلم التربية الخاصة' }], nextReview: day(today(), 30) };
}
function demoObservations(w: Workspace): Observation[] {
  const goal = w.learners.find(l => l.id === 'demo-1')?.goals[0]; if (!goal) return [];
  return ([[1, 0], [2, 1], [3, 2], [4, 4], [4, 4]] as const).map(([correct, independent], n) => ({ id: `demo-obs-${n}`, lessonId: 'animals', learnerId: 'demo-1', goalId: goal.id, date: `${day(today(), (n - 5) * 3)}T09:00:00.000Z`, correct, independent, total: 5, support: (independent === correct ? 'independent' : 'verbal') as Support, note: 'سجل خيالي لعرض التقرير.' }));
}
/** Older saved workspaces gain the new sections. Demo records appear only beside the fictional learners. */
export function withPlanning(w: Workspace, catalog: Catalog = defaultCatalog): Workspace {
  if (w.plans && w.ieps) return w;
  const hasDemo = w.learners.some(l => l.id === 'demo-1');
  return { ...w, plans: w.plans ?? (hasDemo ? [demoPlan(w.learners)] : []), ieps: w.ieps ?? (hasDemo ? [demoIep(w.learners.find(l => l.id === 'demo-1')!, catalog)] : []), observations: hasDemo && !w.observations.length && !w.plans ? demoObservations(w) : w.observations };
}
