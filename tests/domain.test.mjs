import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace, createLesson, validateLesson, transitionLesson, questionOptions, assertWorkspace, summarizeTrials } from '../packages/domain/index.ts';
test('all seeded lessons have valid links and activity answer keys', () => {
  const data = seedWorkspace();
  for (const l of data.lessons) assert.deepEqual(validateLesson(l, data.learners), [], l.id);
});
test('review refuses incomplete drafts and approval requires review', () => {
  const data = seedWorkspace();
  assert.throws(() => transitionLesson(createLesson(), 'review', data.learners));
  assert.throws(() => transitionLesson(data.lessons[0], 'approved', data.learners));
  const reviewed = transitionLesson(data.lessons[1], 'review', data.learners);
  assert.equal(transitionLesson(reviewed, 'approved', data.learners).status, 'approved');
  assert.throws(() => transitionLesson(reviewed, 'draft', data.learners));
  assert.equal(transitionLesson(reviewed, 'draft', data.learners, 'راجع المثال').reviewNote, 'راجع المثال');
});
test('goals must belong to selected learners and the subject', () => {
  const data = seedWorkspace();
  assert.ok(validateLesson({ ...data.lessons[0], goalIds: ['g4'] }, data.learners).length);
  assert.ok(validateLesson({ ...data.lessons[0], duration: NaN }, data.learners).length);
});
test('two-choice adaptation always retains the correct option and original index', () => {
  for (let answer = 0; answer < 3; answer++) {
    const q = { id: 'q', prompt: 'question', options: ['a', 'b', 'c'], answer };
    const options = questionOptions(q, 2);
    assert.equal(options.length, 2);
    assert.equal(options.find(o => o.index === answer).text, q.options[answer]);
  }
});
test('profiles have independent preferences and storage rejects malformed roots', () => {
  const data = seedWorkspace(); data.learners[0].preferences.sound = false;
  assert.equal(data.learners[1].preferences.sound, true);
  assert.equal(assertWorkspace(data), true);
  assert.equal(assertWorkspace({ version: 1 }), false);
  assert.equal(assertWorkspace(null), false);
});
test('unobserved responses are excluded from the scored denominator, prompted answers are not independent', () => {
  const result = summarizeTrials([{ questionId: '1', selected: 0, correct: true, support: 'independent' }, { questionId: '2', selected: 1, correct: true, support: 'model' }, { questionId: '3', selected: null, correct: false, support: 'not-observed' }]);
  assert.deepEqual(result, { correct: 2, total: 2, independent: 1, unobserved: 1, support: 'model' });
});
