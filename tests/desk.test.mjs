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
