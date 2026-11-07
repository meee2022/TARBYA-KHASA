import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace } from '../packages/domain/index.ts';
import { MAX_REPLY_TEXT, PARENT_TOKEN_RE, parentToken, parentUrl, parentView, validParentReply } from '../packages/domain/parent.ts';

const seed = seedWorkspace();

test('the family page carries the first name, the week and the goals in family words, and nothing private', () => {
  const learner = { ...seed.learners[0], needs: 'سر', behaviour: [{ id: 'b', date: '2026-11-01', antecedent: 'a', behaviour: 'b', consequence: 'c' }], family: { home: 'جرّبوا العدّ', note: 'أحسنت هذا الأسبوع', updatedAt: 'now' } };
  const w = { ...seed, learners: [learner], observations: [{ id: 'o', lessonId: seed.lessons[0].id, learnerId: learner.id, goalId: 'g1', date: new Date().toISOString(), correct: 4, total: 5, independent: 4, support: 'independent', note: 'ملاحظة خاصة' }] };
  const view = parentView(w, learner.id, 'أ. منى');
  assert.equal(view.child, 'سارة', 'first name only, no demo tag');
  assert.equal(view.teacher, 'أ. منى');
  assert.deepEqual(view.lessons, [seed.lessons[0].title]);
  assert.equal(view.goals.length, 2); assert.ok(view.goals.every(g => typeof g.status === 'string' && !/\d/.test(g.status)), 'no figures, only family words');
  assert.equal(view.home, 'جرّبوا العدّ'); assert.equal(view.note, 'أحسنت هذا الأسبوع'); assert.equal(view.empty, false);
  const text = JSON.stringify(view);
  for (const secret of ['سر', 'ملاحظة خاصة', 'antecedent', 'preferences', 'needs', 'correct', 'demo-1']) assert.equal(text.includes(secret), false, `${secret} must not travel`);
  assert.equal(/\d/.test(JSON.stringify(view.goals)), false, 'no scores reach the family');
  assert.equal(parentView(w, 'nobody', 'x'), null);
});

test('parent tokens are 48 hex characters, links point at /parent, and replies are bounded', () => {
  const token = parentToken(new Uint8Array(24).fill(255));
  assert.equal(token, 'f'.repeat(48)); assert.ok(PARENT_TOKEN_RE.test(token));
  assert.equal(PARENT_TOKEN_RE.test('F'.repeat(48)), false); assert.equal(PARENT_TOKEN_RE.test('a'.repeat(47)), false);
  assert.equal(parentUrl('https://example.com', token), `https://example.com/parent/${token}`);
  assert.ok(validParentReply('yes', '')); assert.ok(validParentReply('no', 'ك'.repeat(MAX_REPLY_TEXT)));
  assert.equal(validParentReply('maybe', ''), false); assert.equal(validParentReply('yes', 'ك'.repeat(MAX_REPLY_TEXT + 1)), false); assert.equal(validParentReply('yes', 5), false);
});
