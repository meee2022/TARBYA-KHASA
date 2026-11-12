import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import JSZip from 'jszip';
import { defaultCatalog, validateCatalog } from '../packages/domain/catalog.ts';
import { seedWorkspace, defaults } from '../packages/domain/index.ts';
import { validateBackup, withoutLearner } from '../packages/domain/admin.ts';
import { checkIep, checkPlan, createIep, createPlan, draftErrors, fillPlan, goalFromDraft, goalProgress, goalSentence, learnerPath, lessonFromSession, newLongGoal, newShortGoal, spellingVariants, syncPaths, weekOf, withPlanning } from '../packages/domain/planning.ts';
import { escapeXml, goalReportBody, iepBody, packageParts, planBody } from '../packages/domain/docx.ts';

const animals = defaultCatalog.packs.find(p => p.id === 'pack-animals');
const seeded = () => withPlanning(seedWorkspace());
const obs = (goalId, correct, independent, total = 5, date = '2026-10-01', support = 'independent') => ({ id: date + correct, lessonId: 'x', learnerId: 'l', goalId, date, correct, independent, total, support, note: '' });
const texts = (issues, where) => issues.filter(i => !where || i.where === where).map(i => i.text).join(' | ');

test('a pack drafts five editable sessions that add up to the session length', () => {
  const plan = fillPlan(createPlan(defaultCatalog, 'اللغة الإنجليزية', '2026-11-01'), animals, defaultCatalog);
  assert.equal(plan.sessions.length, 5);
  assert.equal(plan.sessions[0].date, '2026-11-01');
  assert.equal(plan.sessions[4].date, '2026-11-05');
  assert.match(plan.sessions[0].objective, /cheetah/);
  assert.ok(plan.sessions.every(s => s.objective && s.warmup.teacher && s.content.student && s.closing.teacher && s.activity));
  assert.equal(new Set(plan.sessions.map(s => s.activity)).size > 1, true);
  assert.deepEqual(checkPlan(plan, { pack: animals, learners: [] }).filter(i => i.where.startsWith('session')), []);
});

test('an ordered skill pack only drafts activities that can actually run on it', () => {
  const wash = defaultCatalog.packs.find(p => p.id === 'pack-wash');
  const plan = fillPlan(createPlan(defaultCatalog, wash.subject, '2026-11-01'), wash, defaultCatalog);
  assert.ok(plan.sessions.some(s => s.activity === 'sequence'));
  assert.equal(texts(checkPlan(plan, { pack: wash, learners: [] })).includes('لا يعمل'), false);
});

test('two learners get different paths from their own profiles, never from a diagnosis', () => {
  const w = seedWorkspace(); const [a, b] = [w.learners.find(l => l.id === 'demo-5'), w.learners.find(l => l.id === 'demo-6')];
  assert.notEqual(learnerPath(a), learnerPath(b));
  assert.match(learnerPath(a), /بلا صوت/);
  assert.match(learnerPath(b), /اختيار مباشر/);
  const plan = syncPaths({ ...createPlan(defaultCatalog), learnerIds: [a.id] }, w.learners);
  const edited = { ...plan, paths: [{ learnerId: a.id, text: 'تعديل المعلم' }], learnerIds: [a.id, b.id] };
  const again = syncPaths(edited, w.learners);
  assert.equal(again.paths[0].text, 'تعديل المعلم', 'a teacher edit survives');
  assert.equal(again.paths.length, 2);
});

test('the checker finds the mistakes found in real hand-made files', () => {
  const w = seedWorkspace(); const base = fillPlan(createPlan(defaultCatalog, 'اللغة الإنجليزية', '2026-11-01'), animals, defaultCatalog);
  const plan = { ...base, year: '2026-2027', shortGoals: 'أن تتعرف على الحرف L في 4 من 5 محاولات', learnerIds: ['demo-5'], sessions: base.sessions.map((s, n) => n === 0 ? { ...s, objective: 'Cheeta والعام 2025-2026', content: { ...s.content, minutes: 40 } } : n === 1 ? { ...s, date: '2026-12-25', activity: 'listen' } : n === 2 ? { ...s, objective: 'نشاط عن الحرف M' } : s) };
  const issues = checkPlan(plan, { pack: animals, learners: w.learners });
  assert.match(texts(issues, 'spelling'), /Cheeta.*cheetah/);
  assert.match(texts(issues, 'header'), /2025-2026/);
  assert.match(texts(issues, 'session-0'), /مجموع الزمن 50/);
  assert.match(texts(issues, 'session-1'), /خارج الأسبوع/);
  assert.match(texts(issues, 'session-1'), /الاستماع لا يناسب/);
  assert.match(texts(issues, 'session-2'), /الحرف «m»/);
  assert.match(texts(issues, 'learners'), /بلا فيديو إشارة/);
});

test('spelling check stays quiet on correct words and does not touch the text', () => {
  assert.deepEqual(spellingVariants(['the cheetah and the giraffe run'], ['cheetah', 'giraffe']), []);
  assert.deepEqual(spellingVariants(['Cheeta', 'Cheetah']).length, 1);
});

test('the checker flags unsafe bag links', () => {
  const plan = { ...createPlan(defaultCatalog), bagLinks: [{ title: 'رابط', url: 'javascript:alert(1)' }] };
  assert.match(texts(checkPlan(plan, { learners: [] }), 'bag'), /ليس رابط ويب/);
});

test('reaching the criterion suggests, and only the teacher approves', () => {
  const goal = { id: 'g', text: 'x', subject: 's', target: 4, opportunities: 5, baseline: '' };
  assert.equal(goalProgress(goal, []).status, 'not-evaluated');
  assert.equal(goalProgress(goal, [obs('g', 2, 1, 5, '2026-10-01')]).status, 'training');
  const good = [obs('g', 4, 4, 5, '2026-10-01'), obs('g', 5, 4, 5, '2026-10-02')];
  assert.equal(goalProgress(goal, good).status, 'met');
  assert.equal(goalProgress({ ...goal, approvedAt: '2026-10-03' }, good).status, 'approved');
  assert.equal(goalProgress(goal, [obs('g', 5, 2, 5, '2026-10-01'), obs('g', 5, 2, 5, '2026-10-02')]).status, 'training', 'correct with help is not independent');
  const flat = [1, 2, 3, 4].map(n => obs('g', 2, 2, 5, `2026-10-0${n}`));
  assert.equal(goalProgress(goal, flat).status, 'review');
});

test('a goal that allows a prompt counts correct answers at that level only', () => {
  const goal = { id: 'g', text: 'x', subject: 's', target: 4, opportunities: 5, baseline: '', support: 'verbal', sessions: 1 };
  assert.equal(goalProgress(goal, [obs('g', 4, 0, 5, '2026-10-01', 'visual')]).status, 'met');
  assert.equal(goalProgress(goal, [obs('g', 4, 0, 5, '2026-10-01', 'physical')]).status, 'training');
});

test('goal builder writes the sentence and stores a measurable criterion', () => {
  const draft = { behaviour: 'أن يميّز الطالب الكلمة', condition: 'من بين خيارين', type: 'of', x: 4, y: 5, sessions: 2, support: 'verbal', subject: 'اللغة العربية', baseline: '' };
  assert.equal(goalSentence(draft), 'أن يميّز الطالب الكلمة من بين خيارين، 4 من 5 محاولات خلال جلستين، بتلميح لفظي.');
  const goal = goalFromDraft(draft);
  assert.deepEqual([goal.target, goal.opportunities, goal.support, goal.sessions], [4, 5, 'verbal', 2]);
  assert.deepEqual([goalFromDraft({ ...draft, type: 'streak', x: 3 }).opportunities, goalFromDraft({ ...draft, type: 'percent', x: 80 }).opportunities], [3, 100]);
  assert.equal(draftErrors(draft).length, 0);
  assert.ok(draftErrors({ ...draft, behaviour: ' ', x: 6 }).length >= 2);
});

test('IEP checks catch date, duplicate and criterion problems', () => {
  const iep = createIep('l', defaultCatalog); const long = { ...newLongGoal('academic', 'الرياضيات'), text: 'هدف', start: '2026-10-01', end: '2026-10-30' };
  const short = newShortGoal(long, defaultCatalog);
  long.shorts = [{ ...short, text: 'أن يعدّ', start: '2026-09-01' }, { ...short, id: 'b', text: 'أن يعدّ', end: '2026-09-02' }];
  const issues = checkIep({ ...iep, goals: [long], birthDate: '2099-01-01', nextReview: '2020-01-01' }, '2026-11-01');
  const goal = texts(issues, `goal-${long.id}`);
  assert.match(goal, /بلا معيار/); assert.match(goal, /خارج مدى/); assert.match(goal, /مكرر/); assert.match(goal, /قبل البدء/);
  assert.match(texts(issues, 'data'), /المستقبل/);
  assert.match(texts(issues, 'review'), /مضى/);
});

test('session becomes a lesson with the same goals', () => {
  const plan = { ...fillPlan(createPlan(defaultCatalog, 'اللغة الإنجليزية', '2026-11-01'), animals, defaultCatalog), goalIds: ['g1'], learnerIds: ['demo-1'] };
  const lesson = lessonFromSession(plan, 1);
  assert.equal(lesson.duration, 35); assert.deepEqual(lesson.goalIds, ['g1']); assert.equal(lesson.objective, plan.sessions[1].objective);
});

test('old workspaces and backups stay valid, and broken ones are refused', () => {
  const w = seedWorkspace(); assert.equal(validateBackup(w).plans, undefined);
  const full = seeded(); assert.equal(validateBackup(full).plans.length, 1);
  assert.throws(() => validateBackup({ ...full, plans: [{ id: 'x' }] }));
  assert.throws(() => validateBackup({ ...full, ieps: [{ learnerId: 'x' }] }));
  const real = withPlanning({ ...w, learners: [{ id: 'real', name: 'r', grade: '', initials: '', color: '', strengths: '', needs: '', preferences: defaults, goals: [] }], observations: [] });
  assert.deepEqual([real.plans, real.ieps, real.observations], [[], [], []], 'no demo records beside real learners');
  const again = withPlanning({ ...full, plans: [] }); assert.deepEqual(again.plans, [], 'a teacher who deleted the demo keeps it deleted');
});

test('deleting a learner removes their IEP and plan references', () => {
  const after = withoutLearner(seeded(), 'demo-1');
  assert.equal(after.ieps.length, 0);
  assert.equal(after.plans[0].learnerIds.includes('demo-1'), false);
  assert.equal(after.plans[0].paths.some(p => p.learnerId === 'demo-1'), false);
});

test('admin lists validate, and older settings gain the defaults', () => {
  const clean = validateCatalog({});
  assert.equal(clean.planPattern.length, 5); assert.ok(clean.goalBank.length > 5);
  assert.throws(() => validateCatalog({ strategies: [] }));
  assert.throws(() => validateCatalog({ planPattern: [{ objective: '' }] }));
  assert.throws(() => validateCatalog({ academicYear: '' }));
});

test('Word files hold the school sections, stay RTL, escape input and leave signatures blank', async () => {
  const w = seeded(); const learner = w.learners.find(l => l.id === 'demo-1');
  const iep = { ...w.ieps[0], summary: 'نص <script>&"' };
  const iepXml = packageParts(iepBody(iep, learner, defaultCatalog))['word/document.xml'];
  for (const part of ['أولًا: بيانات', 'ثانيًا: جدول', 'ثالثًا: مستوى', 'رابعًا:', 'خامسًا: الترتيبات', 'سادسًا', 'سابعًا', 'المصادقة والاعتماد', 'ثامنًا']) assert.ok(iepXml.includes(part), part);
  assert.ok(iepXml.includes('&lt;')); assert.ok(iepXml.includes('&amp;&quot;')); assert.equal(iepXml.includes('<script>'), false);
  const approval = iepXml.slice(iepXml.indexOf('مدير المدرسة'), iepXml.indexOf('ثامنًا'));
  assert.equal(/\d{4}-\d{2}/.test(approval), false, 'no generated approval date');
  assert.ok(iepXml.includes('w:bidiVisual')); assert.ok(iepXml.includes('w:orient="landscape"'));
  assert.equal(escapeXml('a\u0001b'), 'ab');
  const planXml = packageParts(planBody(w.plans[0], w.learners))['word/document.xml'];
  for (const part of ['استمارة تحضير', 'أسماء الطلبة', 'التهيئة', 'الغلق', 'التأمل الذاتي', 'المسارات الفردية']) assert.ok(planXml.includes(part), part);
  const report = packageParts(goalReportBody(learner, w.observations))['word/document.xml'];
  assert.ok(report.includes('تقرير الأهداف'));
  // python-docx is the independent reader here, since Word itself cannot run in tests.
  const dir = mkdtempSync(join(tmpdir(), 'docx-'));
  try {
    const zip = new JSZip(); for (const [name, body] of Object.entries(packageParts(iepBody(iep, learner, defaultCatalog)))) zip.file(name, body);
    const file = join(dir, 'iep.docx'); writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
    let out;
    try { out = execFileSync('python', ['-c', "import docx,sys; d=docx.Document(sys.argv[1]); print(len(d.tables), d.sections[0].orientation)", file], { encoding: 'utf8' }); }
    catch (error) { if (/No module named|ENOENT/.test(String(error.stderr ?? error.code ?? error))) return; throw error; }
    assert.match(out, /^\d+ LANDSCAPE/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('weeks start on Sunday', () => { assert.equal(weekOf('2026-11-04'), '2026-11-01'); });

test('help never counts as independent unless the goal allows it', () => {
  const goal = { id: 'g', text: 'x', subject: 's', target: 4, opportunities: 5, baseline: '', support: 'independent' };
  assert.notEqual(goalProgress(goal, [obs('g', 5, 0, 5, '2026-10-01'), obs('g', 5, 0, 5, '2026-10-02')]).status, 'met');
});

test('a broken backup that would crash a screen later is refused', () => {
  const full = seeded(); const [plan] = full.plans; const [iep] = full.ieps;
  for (const bad of [{ ...plan, bagLinks: [null] }, { ...plan, sessions: [] }, { ...plan, shortGoals: undefined }]) assert.throws(() => validateBackup({ ...full, plans: [bad] }));
  for (const bad of [{ ...iep, team: [{}] }, { ...iep, performance: { x: [{}] } }, { ...iep, goals: [{ ...iep.goals[0], shorts: [{}] }] }]) assert.throws(() => validateBackup({ ...full, ieps: [bad] }));
  assert.doesNotThrow(() => checkIep(validateBackup(full).ieps[0]));
});

test('the checker stays quiet on ordinary text', () => {
  assert.deepEqual(spellingVariants(['lions and lion, animal and animals'], ['lion', 'animal']), []);
  assert.deepEqual(spellingVariants(['boat'], ['goat']), []);
  const plan = { ...fillPlan(createPlan(defaultCatalog, 'اللغة الإنجليزية', '2026-11-01'), animals, defaultCatalog), shortGoals: 'أن يميّز الحرف L في 4 من 5 محاولات' };
  plan.sessions[0].objective = 'نشاط حرفة يدوية وحرفا بعد آخر والحرفي';
  assert.equal(texts(checkPlan(plan, { pack: animals, learners: [] }), 'session-0').includes('الحرف «'), false);
  const slash = { ...plan, year: '2026/2027', reflection: 'العام 2026-2027' };
  assert.equal(texts(checkPlan(slash, { pack: animals, learners: [] }), 'header').includes('النص يذكر'), false);
});

test('a new pack in another subject drops goals of the old subject', () => {
  const math = defaultCatalog.packs.find(p => p.id === 'pack-count');
  assert.deepEqual(fillPlan({ ...createPlan(defaultCatalog, 'اللغة الإنجليزية'), goalIds: ['g1'] }, math, defaultCatalog).goalIds, []);
  assert.deepEqual(fillPlan({ ...createPlan(defaultCatalog, math.subject), goalIds: ['g2'] }, math, defaultCatalog).goalIds, ['g2']);
});

test('a removed learner keeps an edited path but leaves the Word file', () => {
  const w = seeded(); const plan = { ...w.plans[0], paths: w.plans[0].paths.map(p => ({ ...p, text: 'نص معدل ' + p.learnerId })) };
  const without = syncPaths({ ...plan, learnerIds: plan.learnerIds.slice(1) }, w.learners);
  assert.equal(without.paths.length, plan.paths.length);
  assert.equal(planBody(without, w.learners).includes('نص معدل ' + plan.learnerIds[0]), false);
});

test('a renamed performance domain still reaches Word, and emoji survive', () => {
  const w = seeded(); const learner = w.learners.find(l => l.id === 'demo-1');
  const xml = iepBody({ ...w.ieps[0], performance: { 'مجال قديم': [{ strength: 'قوة', need: 'احتياج' }] } }, learner, defaultCatalog);
  assert.ok(xml.includes('مجال قديم'));
  assert.equal(escapeXml('a😀b'), 'a😀b');
});

test('family week: plain words, only this learner and this week, and words from the lesson pack', async () => {
  const { familyWeek, familyStatus } = await import('../packages/domain/planning.ts');
  const { seedWorkspace } = await import('../packages/domain/index.ts');
  const { defaultCatalog } = await import('../packages/domain/catalog.ts');
  const w = seedWorkspace(); const learner = w.learners[0]; const lesson = w.lessons.find(l => l.packId === 'pack-animals' && l.learnerIds.includes(learner.id));
  const now = new Date('2026-11-06T10:00:00Z');
  const recent = { id: 'o1', lessonId: lesson.id, learnerId: learner.id, goalId: learner.goals[0].id, date: '2026-11-04T09:00:00Z', correct: 3, total: 5, independent: 2, support: 'verbal', note: '' };
  const old = { ...recent, id: 'o2', date: '2026-10-01T09:00:00Z' };
  const other = { ...recent, id: 'o3', learnerId: 'someone-else' };
  const week = familyWeek({ ...w, observations: [recent, old, other], practiceSessions: [{ id: 'p1', gameId: 'g', title: 'ما اسم الصورة؟', learnerId: learner.id, date: '2026-11-05T09:00:00Z', attempts: [], access: {} }] }, learner.id, defaultCatalog.packs, now);
  assert.deepEqual(week.lessons, [lesson.title]);
  assert.deepEqual(week.activities, [{ title: 'ما اسم الصورة؟', times: 1 }]);
  assert.ok(week.words.includes('whale'));
  assert.ok(week.goals.every(g => Object.values(familyStatus).includes(g.status)));
  assert.equal(familyWeek({ ...w, observations: [old] }, learner.id, defaultCatalog.packs, now).empty, true);
});

test('goal progress separates baseline and maintenance, reports generalization and due probes', async () => {
  const { goalProgress } = await import('../packages/domain/planning.ts');
  const goal = { id: 'g', text: 'x', subject: 's', target: 4, opportunities: 5, baseline: '' };
  const obs = (date, correct, extra = {}) => ({ id: date, lessonId: 'l', learnerId: 'a', goalId: 'g', date: `${date}T09:00:00.000Z`, correct, independent: correct, total: 5, support: 'independent', note: '', ...extra });
  const rows = [obs('2026-10-01', 5, { phase: 'baseline' }), obs('2026-10-10', 4, { context: { setting: 'الفصل' } }), obs('2026-10-12', 4, { context: { setting: 'الفصل' } })];
  const p = goalProgress(goal, rows, '2026-10-13');
  assert.equal(p.status, 'met', 'a perfect baseline does not count toward the criterion');
  assert.equal(p.baseline.length, 1); assert.equal(p.teaching.length, 2);
  assert.equal(p.generalized, false, 'one setting only');
  assert.equal(goalProgress(goal, [...rows, obs('2026-10-14', 5, { context: { setting: 'البيت' } })], '2026-10-15').generalized, true);
  const approved = { ...goal, approvedAt: '2026-10-13' };
  assert.equal(goalProgress(approved, rows, '2026-10-20').probeDue, undefined, 'nothing due in the first two weeks');
  assert.equal(goalProgress(approved, rows, '2026-10-28').probeDue, '2026-10-27');
  const probed = [...rows, obs('2026-10-28', 2, { phase: 'maintenance' })];
  const q = goalProgress(approved, probed, '2026-10-29');
  assert.equal(q.probeDue, undefined); assert.equal(q.held, false, 'the probe fell under the criterion');
  assert.equal(q.status, 'approved', 'a maintenance probe never changes the goal status');
  assert.equal(goalProgress(approved, probed, '2026-11-25').probeDue, '2026-11-24', 'the six-week probe comes due on its own');
});

test('a session becomes a lesson that remembers its week, carries a kit by stage, and finds its neighbours', async () => {
  const { daySessions, kitFromPlan, kitProgress, lessonSiblings, weekSessions } = await import('../packages/domain/planning.ts');
  const plan = createPlan(defaultCatalog, 'العلوم', '2026-03-01');
  plan.sessions[0].warmup.arrangements = 'بطاقات A4، فيديو'; plan.sessions[0].closing.arrangements = 'الروبوت، فيديو';
  plan.bagLinks = [{ title: 'Wordwall', url: 'https://wordwall.net/x' }, { title: 'بلا رابط', url: '' }]; plan.bagItems = [{ text: 'آيباد', done: true }, { text: 'بطاقات A4', done: false }];
  const kit = kitFromPlan(plan, 0);
  assert.deepEqual(kit.map(k => [k.stage, k.title]), [['warmup', 'بطاقات A4'], ['warmup', 'فيديو'], ['closing', 'الروبوت'], ['content', 'Wordwall'], ['warmup', 'آيباد']], 'arrangements keep their stage, links go to content, bag items to warmup, repeats and empty links drop');
  assert.equal(kit.find(k => k.title === 'Wordwall').url, 'https://wordwall.net/x'); assert.equal(kit.find(k => k.title === 'آيباد').done, true);
  assert.deepEqual(kitProgress(kit), { done: 1, total: 5 }, 'the video named twice is packed once'); assert.deepEqual(kitProgress(undefined), { done: 0, total: 0 });
  const made = [0, 1, 2].map(n => lessonFromSession(plan, n));
  assert.equal(made[1].planId, plan.id); assert.equal(made[1].sessionIndex, 1); assert.equal(made[1].kit.length, 3, 'the second session has the week bag only: one link and two items');
  const { prev, next } = lessonSiblings(made[1], made); assert.equal(prev.id, made[0].id); assert.equal(next.id, made[2].id);
  assert.deepEqual(lessonSiblings({ ...made[0], planId: undefined }, made), { prev: undefined, next: undefined });
  const week = weekSessions([plan], '2026-03-01');
  assert.equal(week.length, 5); assert.equal(week[0].date, '2026-03-01'); assert.equal(week[4].sessions[0].index, 4); assert.equal(weekSessions([plan], '2026-03-08')[0].sessions.length, 0); assert.equal(daySessions([plan], '2026-03-03')[0].index, 2, 'a Saturday teacher still finds a session by its date');
});

test('a ministry form fills from the pupil, counts its progress, and exports every section to Word', async () => {
  const { createForm, formBody, formProgress, formTemplates, formKinds } = await import('../packages/domain/forms.ts');
  const { validateBackup } = await import('../packages/domain/admin.ts');
  const learner = seedWorkspace().learners[0];
  const form = createForm('services', learner);
  assert.equal(form.values.name, learner.name); assert.equal(form.learnerId, learner.id);
  const before = formProgress(form); assert.equal(before.done, 2);
  form.values.type = 'طلب جديد'; form.values.env = ['لجنة خاصة', 'أثاث معدّل']; form.values.reasons = 'نص';
  assert.equal(formProgress(form).done, 5);
  const body = formBody(form, '2026-2027');
  for (const s of formTemplates.services.sections) assert.ok(body.includes(escapeXml(s.title)), s.title);
  assert.ok(body.includes('☒ لجنة خاصة') && body.includes('☐ إضاءة خاصة'), 'checks print as boxes');
  const early = createForm('assessment-early'); early.values.gross1 = 'يتقنها بمساعدة';
  const sheet = formBody(early, '2026-2027'); assert.ok(sheet.includes('الركض والجري') && sheet.includes('يتقنها بمساعدة'), 'scale rows print with their headings');
  for (const kind of formKinds) { const ids = formTemplates[kind].sections.flatMap(s => s.fields.map(f => f.id)); assert.equal(new Set(ids).size, ids.length, `${kind} field ids are unique`); }
  const w = { ...seedWorkspace(), forms: [form] }; assert.equal(validateBackup(JSON.parse(JSON.stringify(w))).forms.length, 1);
  assert.throws(() => validateBackup(JSON.parse(JSON.stringify({ ...w, forms: [{ ...form, values: { x: 5 } }] }))), 'a non-string value is refused');
});

test('approving a plan freezes a numbered copy, and later edits are listed against it', async () => {
  const { approveIep, iepApproval, iepChanges, approvalLabel, reviewDue, IEP_VERSIONS_KEPT } = await import('../packages/domain/planning.ts');
  const long = { ...newLongGoal('academic', 'الرياضيات'), text: 'تعدّ حتى عشرة' };
  const draft = { ...createIep('l', defaultCatalog), summary: 'ملخص', goals: [long], classroom: ['مقعد قريب'] };
  assert.equal(iepApproval(draft).state, 'draft'); assert.equal(approvalLabel(draft), 'مسودة');
  const v1 = approveIep(draft, '2026-11-12T08:00:00.000Z');
  assert.deepEqual([iepApproval(v1).state, iepApproval(v1).version], ['approved', 1]);
  assert.equal(approveIep(v1), v1, 'approving an unchanged plan adds no copy');
  assert.equal(iepApproval({ ...v1, updatedAt: 'later' }).state, 'approved', 'a save time alone is not an edit');
  const short = { ...newShortGoal(long, defaultCatalog), text: 'تعدّ حتى خمسة' };
  const edited = { ...v1, summary: 'ملخص جديد', goals: [{ ...long, shorts: [short] }], classroom: ['مقعد قريب', 'وقت إضافي'] };
  assert.equal(iepApproval(edited).state, 'edited');
  assert.equal(v1.versions[0].plan.summary, 'ملخص', 'the approved copy does not change');
  const changes = iepChanges(edited.versions[0].plan, edited);
  assert.ok(changes.includes('تغيّر: ملخص الحالة')); assert.ok(changes.some(c => c.startsWith('هدف قصير جديد'))); assert.ok(changes.some(c => c.includes('وقت إضافي')));
  assert.deepEqual(iepChanges(v1.versions[0].plan, v1), []);
  const v2 = approveIep(edited, '2026-12-01T08:00:00.000Z');
  assert.deepEqual(v2.versions.map(v => v.v), [1, 2]);
  let many = v2; for (let i = 0; i < 12; i++) many = approveIep({ ...many, summary: `ملخص ${i}` });
  assert.equal(many.versions.length, IEP_VERSIONS_KEPT); assert.equal(many.versions.at(-1).v, 14);
  assert.equal(reviewDue({ ...draft, nextReview: '2026-11-20' }, '2026-11-12'), 8); assert.equal(reviewDue(draft, '2026-11-12'), null);
  const w = { ...seedWorkspace(), ieps: [v2] }; w.learners[0].id = 'l';
  assert.doesNotThrow(() => validateBackup(structuredClone(w)));
  assert.throws(() => validateBackup({ ...w, ieps: [{ ...v2, versions: [{ v: 1, at: 'x', plan: { learnerId: 'l' } }] }] }));
});

test('a weekly preparation reports the state of its seven stages and what each still lacks', async () => {
  const { planStages, planStageNames } = await import('../packages/domain/planning.ts');
  const blank = { ...createPlan(defaultCatalog), bagItems: [], bagLinks: [] };
  const start = planStages(blank);
  assert.equal(start.length, 7); assert.equal(planStageNames.length, 7);
  assert.deepEqual(start.map(s => s.state), ['none', 'none', 'none', 'none', 'none', 'none', 'none']);
  assert.ok(start.every(s => s.missing));
  assert.deepEqual(planStages(blank, [{ where: 'header', text: 'x' }, { where: 'session-0', text: 'y' }]).map(s => s.state), Array(7).fill('none'), 'notes on a stage not yet started do not flag it');
  const stage = { teacher: 'أعرض البطاقة', student: 'يشير', minutes: 10, arrangements: '', assessment: 'ملاحظة المعلم' };
  const full = { ...blank, title: 'حرف الباء', learnerIds: ['a'], goalIds: ['g'], shortGoals: 'يميّز الباء', bagItems: [{ text: 'بطاقات', done: false }], achieved: 'done', reflection: 'نجح التلميح البصري',
    sessions: blank.sessions.map(x => ({ ...x, objective: 'يميّز الحرف', warmup: stage, content: stage, closing: stage, done: true })) };
  assert.deepEqual(planStages(full).map(s => s.state), Array(7).fill('done'));
  assert.ok(planStages(full).every(s => s.missing === ''));
  const half = { ...full, shortGoals: '', sessions: full.sessions.map((x, n) => n ? x : { ...x, done: false }) };
  const states = planStages(half, [{ where: 'session-2', text: 'x' }, { where: 'bag', text: 'y' }]).map(s => s.state);
  assert.deepEqual(states, ['done', 'done', 'progress', 'review', 'review', 'done', 'progress']);
});
