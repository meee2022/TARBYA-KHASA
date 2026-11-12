import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../packages/domain/index.ts';
import { SPECIALIST_TOKEN_RE, specialistView, validSpecialistNote } from '../packages/domain/specialist.ts';
import { parentToken } from '../packages/domain/parent.ts';
import { ROOM_CODE_RE, pupilView, roomCode, roomFromLesson, roomSummary, validRoomSetup } from '../packages/domain/room.ts';

test('a specialist sees the report but never the pupil file, the family link or behaviour notes', () => {
  const w = seedWorkspace(); const l = w.learners[0];
  l.behaviour = [{ id: 'n', date: '2026-11-11', antecedent: 'سر قبل', behaviour: 'سلوك سري', consequence: 'سر بعد' }]; l.family = { home: 'مهمة بيت سرية', note: 'ملاحظة أسرة سرية' };
  const view = specialistView(w, l.id, 'أ. نورة', '2026-11-12'); const json = JSON.stringify(view);
  assert.equal(view.child.name, l.name); assert.equal(view.teacher, 'أ. نورة'); assert.equal(view.goals.length, l.goals.length);
  assert.equal('learner' in view, false);
  for (const secret of ['سلوك سري', 'سر قبل', 'مهمة بيت سرية', 'ملاحظة أسرة سرية', '"preferences"', '"goals":[{"id"']) assert.equal(json.includes(secret), false, secret);
  assert.equal(specialistView(w, 'missing', 'x', '2026-11-12'), null);
  assert.equal(SPECIALIST_TOKEN_RE.test(parentToken(new Uint8Array(24).fill(7))), true); assert.equal(SPECIALIST_TOKEN_RE.test('short'), false);
  assert.equal(validSpecialistNote('أخصائي النطق', 'يحتاج جلستين أسبوعيًا'), true); assert.equal(validSpecialistNote('', 'نص'), false); assert.equal(validSpecialistNote('أ', 'نص طويل'), false); assert.equal(validSpecialistNote('أخصائي', 'x'.repeat(1201)), false);
});

test('a live room is built from a lesson, hides the answer until revealed, and counts each pupil alone', () => {
  const w = seedWorkspace(); const lesson = { ...w.lessons[0], learnerIds: w.learners.slice(0, 3).map(l => l.id), questions: [{ id: 'q1', prompt: 'أين القطة؟', options: ['قطة', 'كلب'], answer: 0 }, { id: 'q2', prompt: 'أين الكلب؟', options: ['قطة', 'كلب', 'سمكة'], answer: 1 }, { id: 'bad', prompt: '', options: ['أ', 'ب'], answer: 0 }] };
  const setup = roomFromLesson(lesson, w.learners);
  assert.equal(setup.questions.length, 2, 'a question without a prompt is left out'); assert.equal(setup.seats.length, 3);
  assert.equal(setup.seats[0].label.includes('تجريبي'), false, 'a seat shows the first name only');
  assert.equal(validRoomSetup(setup.title, setup.questions, setup.seats), true);
  assert.equal(validRoomSetup(setup.title, [], setup.seats), false); assert.equal(validRoomSetup(setup.title, setup.questions, []), false);
  assert.equal(validRoomSetup(setup.title, [{ ...setup.questions[0], answer: 5 }], setup.seats), false); assert.equal(validRoomSetup(setup.title, setup.questions, [setup.seats[0], setup.seats[0]]), false, 'the same pupil twice');
  const code = roomCode(Uint8Array.from([0, 31, 62, 93, 124, 255])); assert.equal(ROOM_CODE_RE.test(code), true); assert.equal(code.length, 6); assert.equal(/[O0I1]/.test(code), false);
  const lobby = pupilView(setup.title, setup.questions, setup.seats, { index: -1, revealed: false, ended: false }); assert.equal(lobby.question, undefined); assert.equal(lobby.total, 2);
  const asked = pupilView(setup.title, setup.questions, setup.seats, { index: 0, revealed: false, ended: false }); assert.equal('answer' in asked.question, false, 'the answer is not sent before it is revealed'); assert.equal(JSON.stringify(asked).includes('"answer"'), false);
  const shown = pupilView(setup.title, setup.questions, setup.seats, { index: 0, revealed: true, ended: false }); assert.equal(shown.question.answer, 0);
  assert.equal(pupilView(setup.title, setup.questions, setup.seats, { index: 1, revealed: true, ended: true }).question, undefined);
  const [a, b, c] = setup.seats; const sum = roomSummary(setup.questions, setup.seats, [{ seat: a.id, q: 0, selected: 0 }, { seat: a.id, q: 1, selected: 1 }, { seat: b.id, q: 0, selected: 1 }, { seat: 'stranger', q: 0, selected: 0 }, { seat: b.id, q: 9, selected: 0 }]);
  assert.deepEqual(sum.map(r => [r.seat.id, r.answered, r.correct]), [[a.id, 2, 2], [b.id, 1, 0], [c.id, 0, 0]]);
});
