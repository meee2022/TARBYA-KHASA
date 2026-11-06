import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaProblem, MEDIA_LIMIT, readCredentials, validPasswordLength } from '../convex/adminRules.ts';
import { mediaPath } from '../packages/domain/catalog.ts';
import { defaultSite, validateSite } from '../packages/domain/site.ts';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

test('admin credentials follow the same rules as the local server', () => {
  const good = { username: 'Head.Teacher', name: ' اسم ', password: 'x'.repeat(12) };
  assert.deepEqual(readCredentials(good), { username: 'head.teacher', name: 'اسم', password: good.password });
  for (const bad of [{ ...good, username: 'ab' }, { ...good, username: 'a b c' }, { ...good, name: ' ' }, { ...good, password: 'short' }, { ...good, password: 'x'.repeat(129) }, { ...good, password: 1 }]) assert.throws(() => readCredentials(bad));
  assert.equal(validPasswordLength('x'.repeat(11)), false);
  assert.equal(validPasswordLength('x'.repeat(12)), true);
});

test('an email works as the login name, and only a well-formed one', () => {
  const good = { username: 'Head.Teacher+1@Example.com', name: 'اسم', password: 'x'.repeat(12) };
  assert.equal(readCredentials(good).username, 'head.teacher+1@example.com');
  for (const username of ['a@b', '@example.com', 'a@@example.com', 'a b@example.com', 'a@example..com', 'a<b>@example.com', `${'x'.repeat(80)}@example.com`]) assert.throws(() => readCredentials({ ...good, username }), undefined, username);
});

test('uploads must match their declared type by content, not by label', () => {
  assert.equal(mediaProblem('image/jpeg', 100, jpeg), null);
  assert.match(mediaProblem('image/jpeg', 100, new TextEncoder().encode('<html><script>x')), /لا يطابق/);
  assert.match(mediaProblem('image/svg+xml', 100, jpeg), /غير مسموح/);
  assert.match(mediaProblem('constructor', 100, jpeg), /غير مسموح/);
  assert.match(mediaProblem('', 100, jpeg), /غير مسموح/);
  assert.match(mediaProblem('image/jpeg', MEDIA_LIMIT + 1, jpeg), /30/);
  assert.match(mediaProblem('image/jpeg', 2, jpeg.subarray(0, 2)), /لا يطابق/);
  assert.equal(mediaProblem('video/mp4', 100, new TextEncoder().encode('\0\0\0\x18ftypisom')), null);
});

test('only storage files from Convex count as shared media', () => {
  const id = '0123abcd-0123-4abc-8def-0123456789ab';
  assert.ok(mediaPath.test(`https://brainy-skunk-540.convex.cloud/api/storage/${id}`));
  assert.ok(mediaPath.test(`http://127.0.0.1:3210/api/storage/${id}`));
  assert.ok(mediaPath.test('/images/content/banner-plans.webp'));
  for (const bad of [`https://evil.example/api/storage/${id}`, `https://x.convex.cloud.evil.example/api/storage/${id}`, `https://x.convex.cloud/api/storage/${id}/../x`, `http://evil.example:3210/api/storage/${id}`, 'javascript:alert(1)']) assert.equal(mediaPath.test(bad), false, bad);
});

test('settings validate without structuredClone, as in the Convex runtime', () => {
  const saved = globalThis.structuredClone; globalThis.structuredClone = undefined;
  try { assert.equal(validateSite(JSON.parse(JSON.stringify(defaultSite))).brandName, defaultSite.brandName); }
  finally { globalThis.structuredClone = saved; }
});

test('legacy saved site JSON restores missing editor lists without discarding school edits', () => {
  const legacy = structuredClone(defaultSite);
  legacy.revision = 7;
  legacy.brandName = 'منصة المدرسة';
  legacy.catalog.subjects = ['مادة مخصصة'];
  delete legacy.catalog.movement;
  delete legacy.catalog.stories;
  const restored = validateSite(JSON.parse(JSON.stringify(legacy)));
  assert.ok(restored.catalog.movement.length > 0);
  assert.ok(restored.catalog.stories.length > 0);
  assert.deepEqual(restored.catalog.subjects, ['مادة مخصصة']);
  assert.equal(restored.brandName, legacy.brandName);
  assert.equal(restored.revision, 7);
  // Optional undefined fields added by normalization do not change the persisted pack data.
  assert.deepEqual(JSON.parse(JSON.stringify(restored.catalog.packs)), JSON.parse(JSON.stringify(legacy.catalog.packs)));
});
