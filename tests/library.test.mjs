import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../packages/domain/index.ts';
import { defaultCatalog, searchUrl, validateCatalog } from '../packages/domain/catalog.ts';
import { validateBackup } from '../packages/domain/admin.ts';
import { importShared, MAX_SHARED_BYTES, sharedFromDeck, sharedFromLesson, sharedFromPack, validSharedPayload } from '../packages/domain/shared.ts';
import { deckFromLesson } from '../packages/domain/presentations.ts';
import { addClassEvent, currentSession, MAX_CLASS_EVENTS, sessionMinutes, sessionOpen, starsByLearner, totalStars } from '../packages/domain/classroom.ts';
import { learnerAnalytics, classAnalytics } from '../packages/domain/analytics.ts';

const seed = seedWorkspace();
const lesson = { ...seed.lessons[0], learnerIds: ['x'], goalIds: ['g'], status: 'approved', reviewNote: 'ok', planId: 'p', sessionIndex: 2, classLog: [{ id: 'e', at: '2026-11-07T08:00:00.000Z', kind: 'star', learnerId: 'x' }], kit: [{ id: 'k', stage: 'content', title: 'فيديو', url: 'https://example.com', done: true }] };

test('a shared lesson carries no pupil, goal, plan or class data, and imports as a fresh draft', () => {
  const payload = sharedFromLesson(lesson);
  const copy = JSON.parse(payload.json);
  assert.deepEqual([copy.learnerIds, copy.goalIds, copy.status, copy.reviewNote, copy.planId, copy.sessionIndex, copy.classLog], [[], [], 'draft', '', undefined, undefined, undefined]);
  assert.equal(copy.kit[0].done, false, 'kit links travel, unticked');
  assert.equal(payload.summary, lesson.objective.slice(0, 300));
  assert.ok(validSharedPayload(payload));
  const imported = importShared('lesson', payload.json, '2026-11-08T00:00:00.000Z');
  assert.equal(imported.kind, 'lesson');
  assert.notEqual(imported.lesson.id, lesson.id);
  assert.equal(imported.lesson.updatedAt, '2026-11-08T00:00:00.000Z');
});

test('a shared pack keeps server media only; a shared deck loses its lesson link', () => {
  const pack = { id: 'p', title: 'حزمة', subject: 'العلوم', language: 'ar', ordered: false, updatedAt: 'now', items: [{ id: 'a', text: 'قط', imageId: '/api/media/' + 'a'.repeat(32), audioId: '/images/content/animal-cat.webp' }] };
  const item = JSON.parse(sharedFromPack(pack, 'الأول').json).items[0];
  assert.equal(item.imageId, undefined, 'browser-only media is dropped');
  assert.equal(item.audioId, '/images/content/animal-cat.webp');
  const deck = { ...deckFromLesson(seed.lessons[0]), reviewed: true };
  const shared = sharedFromDeck(deck);
  assert.equal(JSON.parse(shared.json).lessonId, undefined);
  const back = importShared('deck', shared.json);
  assert.equal(back.kind, 'deck'); assert.equal(back.deck.reviewed, false); assert.notEqual(back.deck.id, deck.id);
});

test('the server refuses shared items of unknown kind, oversize, or broken shape', () => {
  const good = sharedFromLesson(lesson);
  assert.equal(validSharedPayload({ ...good, kind: 'learner' }), false);
  assert.equal(validSharedPayload({ ...good, json: 'x'.repeat(MAX_SHARED_BYTES + 1) }), false);
  assert.equal(validSharedPayload({ ...good, json: '{"title":1}' }), false);
  assert.equal(validSharedPayload({ ...good, json: 'not json' }), false);
  assert.equal(validSharedPayload({ ...good, title: '  ' }), false);
  assert.equal(validSharedPayload({ kind: 'pack', title: 'ح', subject: 's', grade: '', summary: '', json: JSON.stringify({ title: 'ح', subject: 's', items: [{ id: 'a', text: 'ب' }] }) }), true);
});

test('ministry standards start empty, validate when pasted, and link sources need https with {q}', () => {
  assert.deepEqual(validateCatalog(defaultCatalog).standards, []);
  const edited = validateCatalog({ ...defaultCatalog, standards: [{ id: 's1', subject: 'اللغة العربية', grade: 'الأول', code: 'ع.١.١', text: 'يقرأ الحروف' }, { id: 's2', subject: 'الرياضيات', grade: 'الثاني', text: 'يعد إلى 20' }] });
  assert.equal(edited.standards.length, 2); assert.equal(edited.standards[1].code, '');
  assert.throws(() => validateCatalog({ ...defaultCatalog, standards: [{ id: 's1', subject: 'x', grade: 'y', text: '' }] }));
  assert.throws(() => validateCatalog({ ...defaultCatalog, standards: [{ id: 'dup', subject: 'x', grade: 'y', text: 'a' }, { id: 'dup', subject: 'x', grade: 'y', text: 'b' }] }), /مكرر/);
  const older = { ...defaultCatalog }; delete older.linkSources; delete older.standards;
  assert.equal(validateCatalog(older).linkSources.length, 2, 'settings saved before this list get the defaults');
  assert.throws(() => validateCatalog({ ...defaultCatalog, linkSources: [{ id: 'a', label: 'x', url: 'http://example.com/{q}', kind: 'site' }] }), /https/);
  assert.throws(() => validateCatalog({ ...defaultCatalog, linkSources: [{ id: 'a', label: 'x', url: 'https://example.com/', kind: 'site' }] }), /\{q\}/);
  assert.equal(validateCatalog({ ...defaultCatalog, linkSources: [{ id: 'a', label: 'x', url: 'https://example.com/{q}', kind: 'nonsense' }] }).linkSources[0].kind, 'site');
  assert.equal(searchUrl({ id: 'a', label: 'x', url: 'https://example.com/s?q={q}', kind: 'site' }, 'عالم الحيوانات'), 'https://example.com/s?q=%D8%B9%D8%A7%D9%84%D9%85+%D8%A7%D9%84%D8%AD%D9%8A%D9%88%D8%A7%D9%86%D8%A7%D8%AA');
});

test('the class board counts stars since the last start, caps the log, and measures the session', () => {
  let l = { ...seed.lessons[0], classLog: undefined };
  l = addClassEvent(l, { kind: 'star', learnerId: 'a', at: '2026-11-07T07:00:00.000Z' });
  l = addClassEvent(l, { kind: 'start', at: '2026-11-07T08:00:00.000Z' });
  l = addClassEvent(l, { kind: 'star', learnerId: 'a', at: '2026-11-07T08:05:00.000Z' });
  l = addClassEvent(l, { kind: 'star', learnerId: 'b', at: '2026-11-07T08:06:00.000Z' });
  l = addClassEvent(l, { kind: 'note', text: '  صار كذا  ', at: '2026-11-07T08:07:00.000Z' });
  let now = currentSession(l.classLog);
  assert.equal(now.length, 4, 'the star before the start does not count');
  assert.ok(sessionOpen(now));
  assert.deepEqual(starsByLearner(now), { a: 1, b: 1 }); assert.equal(totalStars(now), 2);
  assert.equal(now[3].text, 'صار كذا');
  l = addClassEvent(l, { kind: 'end', at: '2026-11-07T08:40:00.000Z' });
  now = currentSession(l.classLog);
  assert.equal(sessionMinutes(now), 40); assert.equal(sessionOpen(now), false);
  for (let i = 0; i < MAX_CLASS_EVENTS + 20; i++) l = addClassEvent(l, { kind: 'star', learnerId: 'a' });
  assert.equal(l.classLog.length, MAX_CLASS_EVENTS);
  assert.equal(currentSession([], '2026-11-07').length, 0);
  assert.ok(validateBackup({ ...seed, lessons: [l] }), 'backups accept the class log');
  assert.throws(() => validateBackup({ ...seed, lessons: [{ ...l, classLog: [{ id: 'x', at: 'now', kind: 'rank' }] }] }));
});

test('analytics read each pupil alone: before and after, mastery by subject, in the teacher order', () => {
  const learner = { ...seed.learners[0], goals: [{ id: 'g1', text: 'هدف', subject: 'اللغة العربية', target: 4, opportunities: 5, baseline: '' }, { id: 'g2', text: 'هدف 2', subject: 'الرياضيات', target: 4, opportunities: 5, baseline: '', approvedAt: '2026-10-01' }] };
  const obs = (n, correct, total, independent, extra = {}) => ({ id: `o${n}`, lessonId: 'l', learnerId: learner.id, goalId: 'g1', date: `2026-10-${String(n).padStart(2, '0')}T08:00:00.000Z`, correct, total, independent, support: 'independent', note: '', ...extra });
  const observations = [obs(1, 1, 5, 0, { phase: 'baseline' }), obs(2, 2, 5, 1), obs(3, 3, 5, 2), obs(4, 4, 5, 4), obs(5, 5, 5, 5, { goalId: 'g2' })];
  const a = learnerAnalytics(learner, observations, [{ id: 'p', gameId: 'cards', learnerId: learner.id, date: new Date().toISOString(), attempts: [] }], new Date('2026-10-10'));
  assert.equal(a.goalsMet, 1); assert.equal(a.goalsTotal, 2);
  assert.equal(a.before, 20, 'baseline probes make the before figure');
  assert.equal(a.after, 80, 'the last three sessions make the after figure');
  assert.equal(a.independence, 48);
  assert.deepEqual(a.subjects.map(s => [s.subject, s.rate]), [['اللغة العربية', 50], ['الرياضيات', 100]]);
  assert.equal(a.practice30, 1);
  const empty = learnerAnalytics({ ...learner, id: 'none' }, observations);
  assert.deepEqual([empty.before, empty.after, empty.independence, empty.lastSeen], [null, null, null, null]);
  const order = classAnalytics([{ ...learner, id: 'z' }, learner], observations).map(r => r.learnerId);
  assert.deepEqual(order, ['z', learner.id], 'never sorted by a figure');
});
