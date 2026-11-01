import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRounds, questionsFromPack, templateBlocker, itemsFromText, wordLetters } from '../packages/domain/packs.ts';
import { defaultCatalog, validateCatalog } from '../packages/domain/catalog.ts';
import { defaultSite, validateSite } from '../packages/domain/site.ts';
import { accessFromPreferences, gameOptions } from '../packages/domain/games.ts';
import { adaptationConflicts, defaults, describeAdaptation, migrateWorkspace, questionOptions, seedWorkspace, summarizeTrials, validateLesson } from '../packages/domain/index.ts';
import { validateBackup } from '../packages/domain/admin.ts';
import { createAdminService } from '../server/admin.mjs';

const pack = id => defaultCatalog.packs.find(p => p.id === id);
const animals = pack('pack-animals');
const answerable = ['choose-word', 'choose-picture', 'listen', 'door', 'robot', 'sequence', 'classify'];

test('every template that a seeded pack allows produces rounds with a valid answer at every choice count', () => {
  for (const p of defaultCatalog.packs) for (const t of defaultCatalog.templates) {
    if (templateBlocker(t.id, p)) continue;
    const rounds = buildRounds(p, t.id, 3);
    assert.ok(rounds.length, `${p.id}/${t.id}`);
    assert.equal(new Set(rounds.map(r => r.id)).size, rounds.length);
    if (!answerable.includes(t.id)) continue;
    for (const count of [1, 2, 3, 4]) {
      const positions = new Set();
      for (const round of rounds) {
        const options = gameOptions(round, count);
        assert.ok(options.length <= count);
        assert.equal(options.filter(o => o.id === round.answerId).length, 1, `${p.id}/${t.id} answer stays at ${count}`);
        positions.add(options.findIndex(o => o.id === round.answerId));
      }
      if (count > 1 && rounds.length > 3 && t.id !== 'classify') assert.ok(positions.size > 1, `${p.id}/${t.id} position must not reveal the answer`);
    }
  }
});
test('the question never shows what it is measuring', () => {
  const pictureToWord = buildRounds(animals, 'choose-word', 3)[0];
  assert.equal(pictureToWord.target.hideLabel, true, 'picture question hides the word');
  assert.ok(pictureToWord.options.every(o => !o.emoji && !o.imageId), 'word options carry no picture');
  const wordToPicture = buildRounds(animals, 'choose-picture', 3)[0];
  assert.ok(!wordToPicture.target.emoji, 'word question hides the picture');
  assert.ok(wordToPicture.options.every(o => o.hideLabel), 'picture options hide the word');
  assert.ok(!buildRounds(animals, 'listen', 3)[0].target, 'listening shows neither');
  assert.equal(wordToPicture.options[0].label, 'whale', 'hidden labels stay available to screen readers');
});
test('templates explain why they cannot run instead of failing later', () => {
  const empty = { ...animals, items: [] };
  for (const t of ['cards', 'match', 'classify', 'sequence', 'puzzle', 'build']) assert.ok(templateBlocker(t, empty), t);
  assert.ok(templateBlocker('sequence', animals)); assert.equal(templateBlocker('sequence', pack('pack-wash')), null);
  assert.ok(templateBlocker('classify', animals)); assert.equal(templateBlocker('classify', pack('pack-living')), null);
  assert.ok(templateBlocker('match', { ...animals, items: animals.items.map(i => ({ ...i, emoji: undefined, imageId: undefined })) }), 'no pictures');
});
test('match boards follow the choice count, and word building accepts only single short words', () => {
  assert.equal(buildRounds(animals, 'match', 2)[0].board.length, 2);
  assert.equal(buildRounds(animals, 'match', 4)[0].board.length, 4);
  assert.deepEqual(buildRounds(animals, 'match', 3).flatMap(r => r.board.map(t => t.id)), animals.items.map(i => i.id), 'no item is dropped');
  assert.deepEqual(wordLetters('باب'), ['ب', 'ا', 'ب']);
  assert.deepEqual(wordLetters('two words'), []);
});
test('pack questions are valid lesson questions with a varied answer position', () => {
  const questions = questionsFromPack(animals);
  assert.equal(questions.length, animals.items.length);
  for (const q of questions) { assert.equal(q.options[q.answer], q.target); assert.equal(new Set(q.options).size, q.options.length); }
  assert.ok(new Set(questions.map(q => q.answer)).size > 1);
  const data = seedWorkspace();
  assert.deepEqual(validateLesson({ ...data.lessons[0], questions }, data.learners), []);
  assert.deepEqual(questionsFromPack({ ...animals, items: animals.items.slice(0, 1) }), [], 'one picture is not a question');
});
test('errorless and reduced choices always keep the answer', () => {
  for (let answer = 0; answer < 4; answer++) {
    const q = { id: 'q', prompt: 'p', options: ['a', 'b', 'c', 'd'], answer };
    assert.deepEqual(questionOptions(q, 1).map(o => o.index), [answer]);
    assert.equal(questionOptions(q, 2).length, 2);
    assert.equal(questionOptions(q, 4).length, 4);
    assert.ok(questionOptions(q, 3).some(o => o.index === answer));
  }
});
test('a session reports the most intensive help used across the extended scale', () => {
  const trial = support => ({ questionId: 'q', selected: 0, correct: true, support });
  assert.equal(summarizeTrials([trial('independent'), trial('visual')]).support, 'visual');
  assert.equal(summarizeTrials([trial('partial'), trial('verbal')]).support, 'partial');
  assert.equal(summarizeTrials([trial('not-observed')]).support, 'not-observed');
  assert.equal(summarizeTrials([trial('gesture')]).independent, 0);
});
test('profiles combine independently, and learner settings carry into the activity', () => {
  const access = accessFromPreferences({ ...defaults, targetSize: 'xl', hand: 'left', steady: true, responds: ['switch', 'dwell'], choices: 1 });
  assert.deepEqual([access.target, access.hand, access.steady, access.scan, access.dwell, access.choices], ['xl', 'left', true, true, true, 1]);
  const summary = describeAdaptation({ ...defaults, sound: false, hand: 'right', choices: 1 });
  assert.ok(summary.includes('بلا صوت')); assert.ok(summary.includes('خيار واحد: تعلّم بلا خطأ'));
  assert.ok(adaptationConflicts({ ...defaults, sound: false, understands: ['audio'] }).length);
  assert.deepEqual(adaptationConflicts(defaults), []);
});
test('no preset is named after a diagnosis', () => {
  const diagnoses = /توحد|داون|شلل|إعاقة|فرط|تشتت|صمم|كفيف/;
  for (const p of defaultCatalog.presets) assert.ok(!diagnoses.test(p.label + p.description), p.label);
});
test('old saved data upgrades without losing edits, and backups with packs validate', () => {
  const data = seedWorkspace();
  const old = { ...data, packs: undefined, lessons: data.lessons.map(({ packId, ...l }) => l) };
  const upgraded = migrateWorkspace(old);
  assert.equal(upgraded.lessons.find(l => l.id === 'animals').packId, 'pack-animals');
  assert.deepEqual(upgraded.packs, []);
  assert.equal(migrateWorkspace({ ...data, lessons: [{ ...data.lessons[0], packId: 'mine' }] }).lessons[0].packId, 'mine');
  assert.ok(validateBackup({ ...data, packs: [animals] }));
  assert.throws(() => validateBackup({ ...data, packs: [{ id: 'x' }] }));
});
test('catalog validation rejects bad admin input and tolerates settings saved before the catalog existed', () => {
  assert.deepEqual(validateCatalog(undefined).subjects, defaultCatalog.subjects);
  const { catalog, ...legacy } = structuredClone(defaultSite); legacy.games = { match: true };
  assert.ok(validateSite(legacy).catalog.packs.length, 'older settings file still loads');
  assert.throws(() => validateCatalog({ subjects: [] }));
  assert.throws(() => validateCatalog({ packs: [{ ...animals, items: [{ id: 'a', text: 'x', imageId: 'javascript:alert(1)' }] }] }), 'shared media must be server media');
  assert.throws(() => validateCatalog({ packs: [{ ...animals, items: [{ id: 'a', text: 'x', imageId: 'local-123' }] }] }), 'device-only media cannot be shared');
  assert.throws(() => validateCatalog({ activities: [{ id: 'a', label: 'x', emoji: 'y' }, { id: 'a', label: 'z', emoji: 'y' }] }), 'duplicate ids');
  assert.throws(() => validateCatalog({ support: defaultCatalog.support.slice(1) }), 'scale stays complete');
  const off = validateCatalog({ support: defaultCatalog.support.map(s => ({ ...s, enabled: false })) });
  assert.equal(off.support.find(s => s.id === 'independent').enabled, true);
  assert.equal(off.support.find(s => s.id === 'verbal').enabled, false);
  assert.equal(validateCatalog({ templates: [{ id: 'memory', title: 'ذاكرة', description: 'وصف', enabled: false }] }).templates.find(t => t.id === 'memory').enabled, false);
  assert.ok(validateCatalog({ templates: [{ id: 'evil', title: 'x', description: 'y' }] }).templates.every(t => t.id !== 'evil'));
});
test('text entry splits lines and drops blanks', () => {
  let n = 0; assert.deepEqual(itemsFromText('a\n\n  b \n', () => String(n++)), [{ id: '0', text: 'a' }, { id: '1', text: 'b' }]);
});
test('shared media needs a session, checks real content, and is served safely', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tarbya-media-'));
  const service = createAdminService({ file: join(dir, 'admin.json') });
  const call = (path, { method = 'GET', headers = {}, body } = {}) => new Promise(resolve => {
    const chunks = body ? [body] : [];
    const req = { url: path, method, headers: { host: 'localhost:5173', ...headers }, socket: { remoteAddress: '127.0.0.1' }, async *[Symbol.asyncIterator]() { yield* chunks; } };
    let status = 0; let head = {}; const res = { setHeader: (k, v) => { head[k] = v; }, writeHead: (s, h) => { status = s; head = { ...head, ...h }; }, end: data => resolve({ status, head, data }) };
    service.handler(req, res);
  });
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  try {
    assert.equal((await call('/api/admin/media', { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: jpeg })).status, 401, 'needs a session');
    const setup = await call('/api/admin/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: Buffer.from(JSON.stringify({ username: 'tester', name: 'T', password: 'a-long-test-password' })) });
    const cookie = setup.head['Set-Cookie'].split(';')[0];
    const auth = type => ({ 'content-type': type, cookie });
    assert.equal((await call('/api/admin/media', { method: 'POST', headers: auth('image/svg+xml'), body: Buffer.from('<svg onload="x"></svg>xxxxxx') })).status, 415, 'svg refused');
    assert.equal((await call('/api/admin/media', { method: 'POST', headers: auth('image/jpeg'), body: Buffer.from('<html>not an image</html>') })).status, 415, 'content must match its type');
    const saved = await call('/api/admin/media', { method: 'POST', headers: auth('image/jpeg'), body: jpeg });
    assert.equal(saved.status, 201);
    const url = JSON.parse(saved.data).url; assert.match(url, /^\/api\/media\/[a-f\d]{32}$/);
    const served = await call(url);
    assert.equal(served.status, 200); assert.equal(served.head['Content-Type'], 'image/jpeg'); assert.equal(served.head['X-Content-Type-Options'], 'nosniff'); assert.match(served.head['Content-Security-Policy'], /sandbox/);
    // A dropped connection mid-upload used to reject outside any handler and kill the whole server.
    const aborted = { url: '/api/admin/media', method: 'POST', headers: { host: 'localhost:5173', ...auth('image/jpeg') }, socket: { remoteAddress: '127.0.0.1' }, async *[Symbol.asyncIterator]() { yield jpeg; throw Object.assign(new Error('aborted'), { code: 'ECONNRESET' }); } };
    await assert.doesNotReject(service.handler(aborted, { destroyed: true, setHeader() {}, writeHead() {}, end() {} }));
    assert.equal((await call('/api/media/..%2Fadmin.json')).status, 404, 'no path escape');
    assert.equal((await call('/api/media/' + 'a'.repeat(32))).status, 404);
    assert.ok(validateCatalog({ packs: [{ ...animals, items: [{ id: 'a', text: 'x', imageId: url }] }] }));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
