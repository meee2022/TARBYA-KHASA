import test from 'node:test';
import assert from 'node:assert/strict';
import { createLesson } from '../packages/domain/index.ts';
import { defaultCatalog, validateCatalog } from '../packages/domain/catalog.ts';
import { journey, lessonFromCurriculum, warmupsFor } from '../packages/domain/journey.ts';

test('an older lesson shows its four stations and their minutes add up to the lesson', () => {
  const lesson = { ...createLesson(), duration: 35 };
  const rows = journey(lesson);
  assert.deepEqual(rows.map(r => r.id), ['warmup', 'teaching', 'practice', 'closing']);
  assert.equal(rows.reduce((t, r) => t + r.minutes, 0), 35);
  assert.equal(rows[0].start, 0); assert.equal(rows[1].start, rows[0].minutes);
});

test('optional stations appear once written, and minutes the teacher set are kept', () => {
  const lesson = { ...createLesson(), duration: 40, independent: 'يفرز البطاقات', assessment: 'خمس محاولات', stationPlans: { warmup: { minutes: 3 }, teaching: { tiers: { full: 'نموذج كامل' } } } };
  const rows = journey(lesson);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].minutes, 3);
  assert.equal(rows.reduce((t, r) => t + r.minutes, 0), 40);
  assert.equal(rows[1].tiers.full, 'نموذج كامل');
  assert.ok(rows.every(r => Number.isInteger(r.minutes) && r.minutes >= 0));
});

test('the warm-up bank offers the subject match before the general ones and hides other subjects', () => {
  const got = warmupsFor(defaultCatalog.warmups, 'الرياضيات', 'الأول').map(w => w.id);
  assert.equal(got[0], 'wu-count');
  assert.ok(got.includes('wu-schedule'));
  assert.ok(!got.includes('wu-letters'));
});

test('a curriculum entry becomes an editable draft with all its stations', () => {
  const unit = defaultCatalog.units.find(u => u.subject === 'اللغة العربية' && u.grade === 'الأول');
  const lesson = lessonFromCurriculum(unit, unit.lessons[0]);
  assert.equal(lesson.status, 'draft'); assert.equal(lesson.grade, 'الأول'); assert.equal(lesson.subject, 'اللغة العربية');
  assert.equal(journey(lesson).length, 6);
  assert.deepEqual(lesson.learnerIds, []);
});

test('the catalog keeps units and warm-ups through validation and rejects a unit without a title', () => {
  const clean = validateCatalog(structuredClone(defaultCatalog));
  assert.equal(clean.units.length, defaultCatalog.units.length);
  assert.equal(clean.warmups.length, defaultCatalog.warmups.length);
  assert.equal(validateCatalog({}).units.length, defaultCatalog.units.length);
  const bad = structuredClone(defaultCatalog); bad.units[0].title = '';
  assert.throws(() => validateCatalog(bad));
});

test('a deck built from a lesson tags each slide with its station, in teaching order', async () => {
  const { deckFromLesson } = await import('../packages/domain/presentations.ts');
  const unit = defaultCatalog.units[0];
  const lesson = { ...lessonFromCurriculum(unit, unit.lessons[0]), questions: [{ id: 'q1', prompt: 'أين الباء؟', options: ['بطة', 'قلم'], answer: 0 }] };
  const tagged = deckFromLesson(lesson).slides.map(s => s.station).filter(Boolean);
  assert.deepEqual([...new Set(tagged)], ['warmup', 'teaching', 'practice', 'independent', 'assessment', 'closing']);
});

test('the catalog carries the strategy encyclopedia and the prompt lab through validation, in generic wording', async () => {
  const { fillPrompt, promptBlanks } = await import('../packages/domain/prompts.ts');
  const clean = validateCatalog(structuredClone(defaultCatalog));
  assert.equal(clean.strategyGuide.length, 16); assert.equal(clean.prompts.length, defaultCatalog.prompts.length);
  assert.equal(validateCatalog({}).strategyGuide.length, 16, 'a saved catalog without the new lists gets the defaults');
  const all = JSON.stringify([clean.strategyGuide, clean.prompts]);
  assert.equal(/طالبة|معلمة|طالبات|معلمات/.test(all), false);
  const bad = structuredClone(defaultCatalog); bad.strategyGuide[0].steps = [];
  assert.throws(() => validateCatalog(bad));
  const dup = structuredClone(defaultCatalog); dup.prompts[1].id = dup.prompts[0].id;
  assert.throws(() => validateCatalog(dup));
  const t = 'درس «{الدرس}» في {المادة} للصف {الصف}. الهدف: {الهدف}. الموقف: {الموقف}. مرة أخرى {الدرس}.';
  assert.deepEqual(promptBlanks(t), ['الموقف']);
  const out = fillPrompt(t, { 'الدرس': 'حرف الباء', 'المادة': 'اللغة العربية', 'الصف': 'الأول', 'الهدف': 'يميّز الباء' }, { 'الموقف': 'زيارة المكتبة' });
  assert.equal(out, 'درس «حرف الباء» في اللغة العربية للصف الأول. الهدف: يميّز الباء. الموقف: زيارة المكتبة. مرة أخرى حرف الباء.');
  assert.ok(fillPrompt(t, {}, {}).includes('[الدرس]'), 'an empty field stays visible as a bracketed gap');
});
