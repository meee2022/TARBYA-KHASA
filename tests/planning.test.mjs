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
