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

test('reading supports show in the activity preview, and read-along without sound is flagged', async () => {
  const { describeAdaptation, adaptationConflicts, defaults } = await import('../packages/domain/index.ts');
  const access = { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: false, scanSeconds: 4, readAlong: true, easyFont: true, tint: 'mint', ruler: true };
  const shown = describeAdaptation({ ...defaults, access });
  for (const x of ['اقرئي معي بتظليل الكلمة', 'خط ميسّر للقراءة', 'خلفية مريحة للنص', 'مسطرة القراءة']) assert.ok(shown.includes(x), x);
  assert.ok(!describeAdaptation({ ...defaults, sound: false, access }).includes('اقرئي معي بتظليل الكلمة'));
  assert.ok(adaptationConflicts({ ...defaults, sound: false, access }).some(c => c.includes('اقرئي معي')));
  assert.ok(!adaptationConflicts({ ...defaults, access }).some(c => c.includes('اقرئي معي')));
});

test('vision supports show in the activity preview, and spoken descriptions without sound are flagged', async () => {
  const { describeAdaptation, adaptationConflicts, defaults } = await import('../packages/domain/index.ts');
  const access = { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: false, scanSeconds: 4, focusOne: true, highlight: 'yellow', describe: true };
  const shown = describeAdaptation({ ...defaults, access });
  for (const x of ['عنصر واحد بخلفية سادة', 'تمييز الهدف بالأصفر على أسود', 'وصف الصورة صوتيًا عند التركيز']) assert.ok(shown.includes(x), x);
  assert.ok(describeAdaptation({ ...defaults, access: { ...access, highlight: 'red' } }).includes('تمييز الهدف بالأحمر على أسود'));
  assert.ok(adaptationConflicts({ ...defaults, sound: false, access }).some(c => c.includes('وصف الصورة')));
});

test('attention supports show in the preview, and movement breaks are an admin list with defaults', async () => {
  const { describeAdaptation, defaults } = await import('../packages/domain/index.ts');
  const { validateCatalog, defaultCatalog } = await import('../packages/domain/catalog.ts');
  const access = { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: false, scanSeconds: 4, rounds: 5, workMinutes: 3, moveBreak: true, tokens: true };
  const shown = describeAdaptation({ ...defaults, access });
  for (const x of ['5 أسئلة في الجولة', 'مؤقت عمل 3 دقائق ثم استراحة', 'استراحة حركية مصوّرة', 'نجمة بعد كل إجابة صحيحة']) assert.ok(shown.includes(x), x);
  const { movement, ...older } = defaultCatalog;
  assert.ok(validateCatalog(older).movement.length > 0, 'settings saved before this list get the defaults');
  const edited = validateCatalog({ ...defaultCatalog, movement: [{ id: 'sit', label: 'ارفع يديك وأنت جالس', emoji: '🙌' }] });
  assert.deepEqual(edited.movement.map(m => m.label), ['ارفع يديك وأنت جالس']);
});

test('social stories are an admin list: defaults for older settings, edits kept, at most 12 pages', async () => {
  const { validateCatalog, defaultCatalog } = await import('../packages/domain/catalog.ts');
  const { stories, ...older } = defaultCatalog;
  assert.ok(validateCatalog(older).stories.length >= 3);
  const page = n => ({ id: `p${n}`, label: `صفحة ${n}.`, emoji: '🙂' });
  const out = validateCatalog({ ...defaultCatalog, stories: [{ id: 'mine', title: 'نزور المكتبة', pages: Array.from({ length: 15 }, (_, n) => page(n)) }] });
  assert.deepEqual([out.stories[0].title, out.stories[0].pages.length], ['نزور المكتبة', 12]);
  assert.throws(() => validateCatalog({ ...defaultCatalog, stories: [{ id: 'x', title: '', pages: [] }] }));
});

test('motor: the preview names one or two switches', async () => {
  const { describeAdaptation, defaults } = await import('../packages/domain/index.ts');
  const access = { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: true, scanSeconds: 4 };
  assert.ok(describeAdaptation({ ...defaults, scan: true, access }).includes('مسح بمفتاح واحد'));
  assert.ok(describeAdaptation({ ...defaults, scan: true, access: { ...access, switches: 2 } }).includes('مفتاحان: التالي والاختيار'));
});
