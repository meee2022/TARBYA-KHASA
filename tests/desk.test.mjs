import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../packages/domain/index.ts';
import { attendanceSummary, behaviourCounts, latestLevels, notices, schoolDay, validDesk } from '../packages/domain/desk.ts';

test('the school week runs Sunday to Thursday', () => {
  assert.equal(schoolDay('2026-11-08'), 0); // Sunday
  assert.equal(schoolDay('2026-11-12'), 4); // Thursday
  assert.equal(schoolDay('2026-11-13'), -1); // Friday
});

test('attendance counts late as attended and leaves unrecorded days out of the rate', () => {
  const days = [
    { date: '2026-11-08', marks: { a: { mark: 'present' }, b: { mark: 'absent' } } },
    { date: '2026-11-09', marks: { a: { mark: 'late' } } },
    { date: '2026-11-10', marks: { a: { mark: 'absent' } } },
    { date: '2026-10-30', marks: { a: { mark: 'absent' } } },
  ];
  const a = attendanceSummary(days, 'a', '2026-11');
  assert.equal(a.recorded, 3); assert.equal(a.rate, 67);
  assert.equal(attendanceSummary(days, 'b', '2026-11').rate, 0);
  assert.equal(attendanceSummary(days, 'c', '2026-11').rate, null);
});

test('the latest reading of a skill wins, and an old one is flagged', () => {
  const e = (id, skill, date, level) => ({ id, learnerId: 'a', domain: 'القراءة', skill, level, tool: 'ملاحظة', date, note: '' });
  const rows = latestLevels([e('1', 'تمييز الحرف', '2026-06-01', 2), e('2', 'تمييز الحرف', '2026-11-01', 4), e('3', 'قراءة كلمة', '2026-05-01', 1), { ...e('4', 'تمييز الحرف', '2026-11-05', 5), learnerId: 'b' }], 'a', '2026-11-12');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].skill, 'تمييز الحرف'); assert.equal(rows[0].level, 4); assert.equal(rows[0].stale, false);
  assert.equal(rows[1].stale, true);
});

test('notices ask for today\'s register on a school day and flag an overdue task', () => {
  const w = seedWorkspace();
  const sunday = notices(w, '2026-11-08');
  assert.ok(sunday.some(n => n.kind === 'register'));
  assert.ok(!notices(w, '2026-11-13').some(n => n.kind === 'register'), 'no register on Friday');
  const done = { ...w, desk: { attendance: [{ date: '2026-11-08', marks: {} }], tasks: [{ id: 't', title: 'طباعة البطاقات', scope: 'daily', priority: 'high', due: '2026-11-01', done: false }] } };
  const list = notices(done, '2026-11-08');
  assert.ok(!list.some(n => n.kind === 'register'));
  assert.ok(list.some(n => n.kind === 'task'));
});

test('a desk is checked for shape and size before it is synced', () => {
  assert.equal(validDesk(undefined), true);
  assert.equal(validDesk({ tasks: [{ id: 't', title: 'x', scope: 'daily', priority: 'mid', due: '2026-11-08', done: false }] }), true);
  assert.equal(validDesk({ tasks: [{ id: 't', title: 'x', scope: 'yearly', priority: 'mid', due: '', done: false }] }), false);
  assert.equal(validDesk({ timetable: { periods: 20, times: [], slots: [] } }), false);
  assert.equal(validDesk({ performance: [{ id: 'p', learnerId: 'a', domain: 'd', skill: 's', level: 9, tool: 't', date: '2026-11-08', note: '' }] }), false);
  assert.equal(validDesk({ attendance: [{ date: '2026-11-08', marks: { a: { mark: 'here' } } }] }), false);
});

test('a behaviour plan counts only its own notes per day, and asks for review when its date comes', () => {
  const note = (date, planId) => ({ id: date + planId, date, antecedent: '', behaviour: 'ترك المقعد', consequence: '', planId });
  const rows = behaviourCounts([note('2026-11-12', 'p'), note('2026-11-12', 'p'), note('2026-11-10', 'p'), note('2026-11-12', 'other'), note('2026-10-01', 'p'), note('2026-11-11')], 'p', '2026-11-12');
  assert.equal(rows.length, 14); assert.equal(rows[0].date, '2026-10-30'); assert.equal(rows[13].count, 2); assert.equal(rows[11].count, 1); assert.equal(rows[12].count, 0);
  assert.equal(rows.reduce((t, r) => t + r.count, 0), 3);
  const plan = { id: 'p', learnerId: 'demo-1', target: 'ترك المقعد', definition: '', baseline: '', goal: '', func: '', replacement: '', prevention: [], reinforcers: [], response: '', team: '', review: '2026-11-10', active: true };
  const w = { ...seedWorkspace(), desk: { behaviourPlans: [plan] } };
  assert.ok(notices(w, '2026-11-12').some(n => n.kind === 'behaviour'));
  assert.ok(!notices({ ...w, desk: { behaviourPlans: [{ ...plan, active: false }] } }, '2026-11-12').some(n => n.kind === 'behaviour'));
  assert.equal(validDesk({ behaviourPlans: [plan] }), true);
  assert.equal(validDesk({ behaviourPlans: [{ ...plan, prevention: 'x' }] }), false);
});

test('a skill measured more than once shows the level it started from, and the kind of a reading is checked', () => {
  const e = (id, date, level, kind) => ({ id, learnerId: 'a', domain: 'القراءة', skill: 'تمييز الحرف', level, tool: 'ملاحظة', date, note: '', kind });
  const [row] = latestLevels([e('1', '2026-09-01', 2, 'pre'), e('2', '2026-10-01', 3), e('3', '2026-11-01', 4, 'final')], 'a', '2026-11-12');
  assert.equal(row.level, 4); assert.equal(row.from, 2);
  assert.equal(latestLevels([e('1', '2026-11-01', 2, 'pre')], 'a', '2026-11-12')[0].from, undefined);
  assert.equal(validDesk({ performance: [e('1', '2026-11-01', 2, 'pre')] }), true);
  assert.equal(validDesk({ performance: [e('1', '2026-11-01', 2, 'weekly')] }), false);
});

test('a term distribution spreads units over the weeks, names each week and finds its preparation', async () => {
  const { createDistribution, spreadUnits, termWeeks, distributionIssues, distributionBody, validDistributions } = await import('../packages/domain/distribution.ts');
  const lesson = (n) => ({ id: 'l' + n, title: 'درس ' + n, objective: 'هدف ' + n });
  const units = [{ id: 'u1', subject: 'اللغة العربية', grade: 'الأول', title: 'الحروف', lessons: [1, 2, 3, 4].map(lesson) }, { id: 'u2', subject: 'اللغة العربية', grade: 'الأول', title: 'الكلمات', lessons: [5, 6].map(lesson) }];
  const d = { ...createDistribution('الأول', 'اللغة العربية', '2026-09-01'), weeks: 6 };
  assert.equal(d.termStart, '2026-08-30', 'the term counts from the Sunday of that week');
  const rows = spreadUnits(units, 6);
  assert.deepEqual(rows.map(r => [r.from, r.to]), [[1, 4], [5, 6]]);
  const full = { ...d, rows };
  const weeks = termWeeks(full, units, [{ id: 'p1', subject: 'اللغة العربية', weekStart: '2026-09-06' }, { id: 'p2', subject: 'العلوم', weekStart: '2026-08-30' }]);
  assert.equal(weeks.length, 6); assert.deepEqual([weeks[0].start, weeks[0].end, weeks[5].start], ['2026-08-30', '2026-09-03', '2026-10-04']);
  assert.deepEqual(weeks.map(w => w.lessons.map(l => l.title).join('+')), ['درس 1', 'درس 2', 'درس 3', 'درس 4', 'درس 5', 'درس 6']);
  assert.equal(weeks[1].planId, 'p1'); assert.equal(weeks[0].planId, undefined, 'another subject does not count');
  assert.deepEqual(distributionIssues(full), []);
  const gaps = distributionIssues({ ...full, rows: [{ ...rows[0], to: 2 }, { ...rows[1], from: 6, to: 5 }, { id: 'x', title: 'زائدة', from: 6, to: 9 }] });
  assert.equal(gaps.length, 3); assert.ok(gaps.some(g => g.includes('3، 4، 5')));
  assert.equal(spreadUnits([...units, ...units, ...units], 4).length, 4); assert.ok(spreadUnits([...units, ...units, ...units], 4).every(r => r.from === r.to));
  assert.ok(distributionBody(full, units).includes('درس 6: هدف 6'));
  assert.equal(validDistributions([full]), true); assert.equal(validDistributions([{ ...full, weeks: 99 }]), false); assert.equal(validDesk({ distributions: [{ ...full, rows: [{ id: 'r', title: 'x', from: 0, to: 1 }] }] }), false);
});

test('an instrument scores against its pass mark, and achievement averages the last three scored readings per subject', async () => {
  const { instrumentScore, achievementOf } = await import('../packages/domain/desk.ts');
  const tool = { id: 't', name: 'قائمة رصد', kind: 'قائمة رصد', subject: 'اللغة العربية', domain: 'اللغة', skill: 'تمييز الحرف', items: ['أ', 'ب', 'ج', 'د', 'هـ'], pass: 4 };
  assert.deepEqual(instrumentScore(tool, 3), { percent: 60, met: false }); assert.deepEqual(instrumentScore(tool, 4), { percent: 80, met: true });
  const e = (id, date, percent, subject = 'اللغة العربية', learnerId = 'a') => ({ id, learnerId, domain: 'اللغة', skill: 's', level: 3, percent, tool: 'x', date, note: '', subject });
  const got = achievementOf([e('1', '2026-09-01', 20), e('2', '2026-10-01', 60), e('3', '2026-10-15', 70), e('4', '2026-11-01', 80), e('5', '2026-11-02', 90, 'الرياضيات'), e('6', '2026-11-03', 10, 'اللغة العربية', 'b'), e('7', '2026-11-04', undefined), { ...e('8', '2026-11-05', 100), subject: undefined }], 'a');
  assert.deepEqual(got, { 'اللغة العربية': { average: 70, count: 3 }, 'الرياضيات': { average: 90, count: 1 } });
  assert.deepEqual(achievementOf([], 'a'), {});
  assert.equal(validDesk({ instruments: [tool] }), true); assert.equal(validDesk({ instruments: [{ ...tool, pass: 9 }] }), false); assert.equal(validDesk({ instruments: [{ ...tool, items: [] }] }), false);
});

test('records are checked for shape, referrals come due, and training hours add up for the year', async () => {
  const { validRecords, referralsDue, trainingHours } = await import('../packages/domain/records.ts');
  const referral = { id: 'r', learnerId: 'demo-1', date: '2026-11-01', to: 'أخصائي النطق', reason: 'تأخر في النطق', state: 'open', followUp: '2026-11-10', reply: '' };
  assert.equal(referralsDue([referral, { ...referral, id: 'c', state: 'closed' }, { ...referral, id: 'l', followUp: '2026-12-01' }, { ...referral, id: 'n', followUp: '' }], '2026-11-12').length, 1);
  const w = { ...seedWorkspace(), desk: { referrals: [referral] } };
  assert.ok(notices(w, '2026-11-12').some(n => n.kind === 'referral')); assert.ok(!notices(w, '2026-11-05').some(n => n.kind === 'referral'));
  const items = [{ id: '1', section: 'courses', title: 'دورة', date: '2026-03-01', hours: 12, note: '' }, { id: '2', section: 'courses', title: 'دورة', date: '2025-03-01', hours: 5, note: '' }, { id: '3', section: 'awards', title: 'تكريم', date: '2026-05-01', hours: 9, note: '' }, { id: '4', section: 'courses', title: 'بلا ساعات', date: '2026-06-01', note: '' }];
  assert.equal(trainingHours(items, '2026'), 12);
  const good = { evidence: [{ id: 'e', learnerId: 'a', title: 'ورقة', date: '2026-11-01', note: '', reviewed: false }], portfolio: items, team: [{ id: 'm', name: 'أ', role: 'معلم الفصل', note: '' }], referrals: [referral], meetings: [{ id: 'g', kind: 'consent', date: '2026-11-01', topic: 'تصوير', attendees: '', notes: '', consent: 'yes' }] };
  assert.equal(validRecords(good), true); assert.equal(validDesk(good), true);
  assert.equal(validDesk({ referrals: [{ ...referral, state: 'lost' }] }), false); assert.equal(validDesk({ meetings: [{ ...good.meetings[0], consent: 'maybe' }] }), false);
  assert.equal(validDesk({ evidence: [{ ...good.evidence[0], reviewed: 'yes' }] }), false); assert.equal(validDesk({ portfolio: [{ ...items[0], section: 'other' }] }), false);
});

test('a pupil report gathers what is recorded about one pupil and builds a Word body', async () => {
  const { learnerReport, learnerReportBody } = await import('../packages/domain/reports.ts');
  const { packageParts } = await import('../packages/domain/docx.ts');
  const base = seedWorkspace(); const id = base.learners[0].id;
  const w = { ...base, desk: {
    attendance: [{ date: '2026-11-08', marks: { [id]: { mark: 'present' } } }, { date: '2026-11-09', marks: { [id]: { mark: 'absent' } } }],
    performance: [{ id: 'p1', learnerId: id, domain: 'اللغة', skill: 'تمييز الحرف', level: 2, percent: 40, tool: 'ملاحظة', date: '2026-09-01', note: '', kind: 'pre', subject: 'اللغة العربية' }, { id: 'p2', learnerId: id, domain: 'اللغة', skill: 'تمييز الحرف', level: 4, percent: 80, tool: 'ملاحظة', date: '2026-11-01', note: '', kind: 'final', subject: 'اللغة العربية' }],
    behaviourPlans: [{ id: 'b', learnerId: id, target: 'ترك المقعد', definition: '', baseline: '', goal: '', func: '', replacement: 'يرفع البطاقة', prevention: [], reinforcers: [], response: '', team: '', review: '', active: true }],
    evidence: [{ id: 'e', learnerId: id, title: 'ورقة عمل', date: '2026-11-05', note: '', reviewed: true }, { id: 'x', learnerId: 'other', title: 'ليست له', date: '2026-11-05', note: '', reviewed: false }],
    referrals: [{ id: 'r', learnerId: id, date: '2026-11-02', to: 'أخصائي النطق', reason: 'نطق الراء', state: 'open', followUp: '', reply: '' }],
  } };
  w.learners[0].behaviour = [{ id: 'n', date: '2026-11-11', antecedent: '', behaviour: 'ترك المقعد', consequence: '', planId: 'b' }];
  const r = learnerReport(w, id, '2026-11-12');
  assert.deepEqual([r.attendance.recorded, r.attendance.rate], [2, 50]);
  assert.equal(r.goals.length, w.learners[0].goals.length); assert.equal(r.levels.length, 1); assert.deepEqual([r.levels[0].level, r.levels[0].from], [4, 2]);
  assert.deepEqual(r.achievement, [{ subject: 'اللغة العربية', average: 60, count: 2 }]);
  assert.equal(r.behaviour[0].count, 1); assert.equal(r.evidence.length, 1); assert.equal(r.referrals[0].state, 'مفتوحة');
  assert.equal(learnerReport(w, 'missing', '2026-11-12'), undefined);
  const xml = packageParts(learnerReportBody(r))['word/document.xml'];
  for (const part of ['تقرير الطالب', 'الأهداف الفردية', 'مستويات الأداء', 'خطط تعديل السلوك', 'الإحالات', 'توقيع ولي الأمر']) assert.ok(xml.includes(part), part);
  const bare = learnerReport(base, id, '2026-11-12'); assert.equal(bare.plan.length > 0, true); assert.ok(packageParts(learnerReportBody(bare))['word/document.xml'].includes('لم يُسجَّل حضور هذا الشهر'));
});
