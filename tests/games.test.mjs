import test from 'node:test';
import assert from 'node:assert/strict';
import { games, gameOptions, brailleLetters, brailleCharacter, matchesBraille, practiceSummary, nextScanIndex } from '../packages/domain/games.ts';

test('five Arabic Braille letters match the published dot patterns and Unicode cells', () => {
  assert.deepEqual(brailleLetters.map(l => [l.letter, [...l.dots], brailleCharacter(l.dots)]), [
    ['ا', [1], '⠁'], ['ب', [1, 2], '⠃'], ['ت', [2, 3, 4, 5], '⠞'], ['ج', [2, 4, 5], '⠚'], ['د', [1, 4, 5], '⠙'],
  ]);
  assert.equal(brailleCharacter([6, 1]), '⠡');
  assert.equal(matchesBraille([5, 1, 4], [1, 4, 5]), true);
  assert.equal(matchesBraille([1, 1], [1, 2]), false);
  assert.equal(matchesBraille([], [1]), false);
  assert.throws(() => brailleCharacter([7]));
  assert.throws(() => brailleCharacter([1.5]));
});
test('every task has a unique identity and valid answer after reducing options', () => {
  const ids = games.flatMap(g => g.rounds.map(r => r.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const game of games.filter(g => g.id !== 'braille')) {
    for (const count of [2, 3]) {
      const positions = new Set();
      for (const round of game.rounds) {
        const options = gameOptions(round, count);
        assert.ok(options.length <= count);
        assert.equal(new Set(options.map(o => o.id)).size, options.length);
        assert.equal(options.filter(o => o.id === round.answerId).length, 1);
        assert.deepEqual(gameOptions(round, count), options, 'order must remain stable during a task');
        positions.add(options.findIndex(o => o.id === round.answerId));
      }
      assert.ok(positions.size > 1, `${game.id}: correct answer must not always occupy the same position`);
    }
  }
});
test('hinted correct answers remain correct but are excluded from the no-hint subtotal', () => {
  const attempts = [{ roundId: '1', selected: 'x', correct: true, hintUsed: false }, { roundId: '2', selected: 'x', correct: true, hintUsed: true }, { roundId: '3', selected: 'x', correct: false, hintUsed: false }];
  assert.deepEqual(practiceSummary(attempts), { total: 3, correct: 2, independent: 1, assisted: 1 });
  assert.deepEqual(practiceSummary([]), { total: 0, correct: 0, independent: 0, assisted: 0 });
});
test('switch scanning wraps and tolerates changing or empty targets', () => {
  assert.equal(nextScanIndex(-1, 4), 0);
  assert.equal(nextScanIndex(3, 4), 0);
  assert.equal(nextScanIndex(5, 2), 0);
  assert.equal(nextScanIndex(0, 0), -1);
});

test('read-along splits mixed Arabic and English into words with their own voice', async () => {
  const { readingWords, accessFromPreferences } = await import('../packages/domain/games.ts');
  assert.deepEqual(readingWords('  اختر صورة  cat الآن '), [{ text: 'اختر', lang: 'ar' }, { text: 'صورة', lang: 'ar' }, { text: 'cat', lang: 'en' }, { text: 'الآن', lang: 'ar' }]);
  assert.deepEqual(readingWords(''), []);
  // Reading supports saved on the learner reach the activity.
  const a = accessFromPreferences({ largeText: false, highContrast: false, sound: true, reducedMotion: false, choices: 2, access: { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: false, scanSeconds: 4, readAlong: true, easyFont: true, tint: 'sepia', ruler: true, spacing: true } });
  assert.deepEqual([a.readAlong, a.easyFont, a.tint, a.ruler, a.spacing, a.choices], [true, true, 'sepia', true, true, 2]);
});

test('hearing: sign learners get the video open, and vibration defaults on only when sound is off', async () => {
  const { accessFromPreferences } = await import('../packages/domain/games.ts');
  const base = { largeText: false, highContrast: false, reducedMotion: false, choices: 3 };
  assert.equal(accessFromPreferences({ ...base, sound: true, understands: ['sign', 'picture'] }).sign, true);
  assert.equal(accessFromPreferences({ ...base, sound: true, understands: ['picture'] }).sign, false);
  assert.equal(accessFromPreferences({ ...base, sound: false }).vibrate, true);
  assert.equal(accessFromPreferences({ ...base, sound: true }).vibrate, false);
  // The teacher's choice wins over the default, both ways.
  const access = { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: false, scanSeconds: 4 };
  assert.equal(accessFromPreferences({ ...base, sound: false, access: { ...access, vibrate: false } }).vibrate, false);
  assert.equal(accessFromPreferences({ ...base, sound: true, access: { ...access, vibrate: true } }).vibrate, true);
});

test('attention: a round can be shortened or lengthened to an exact number of tasks with unique ids', async () => {
  const { fitRounds } = await import('../packages/domain/games.ts');
  const rounds = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(fitRounds(rounds, undefined), rounds);
  assert.deepEqual(fitRounds(rounds, 2).map(r => r.id), ['a', 'b']);
  const long = fitRounds(rounds, 7).map(r => r.id);
  assert.deepEqual(long, ['a', 'b', 'c', 'a~1', 'b~1', 'c~1', 'a~2']);
  assert.equal(new Set(long).size, 7);
  assert.deepEqual(fitRounds([], 5), []);
});

test('quiet sensory mode turns sound, motion and vibration off together, and only while it is on', async () => {
  const { accessFromPreferences, withQuiet } = await import('../packages/domain/games.ts');
  const base = { largeText: false, highContrast: false, reducedMotion: false, choices: 3, sound: true };
  const access = { large: false, contrast: false, textAlternative: false, speech: true, choices: 3, scan: false, scanSeconds: 4, vibrate: true };
  const q = accessFromPreferences({ ...base, access: { ...access, quiet: true } });
  assert.deepEqual([q.speech, q.calm, q.vibrate], [false, true, false]);
  const off = accessFromPreferences({ ...base, access: { ...access, quiet: false } });
  assert.deepEqual([off.speech, off.calm, off.vibrate], [true, false, true]);
  assert.equal(withQuiet(access), access);
});

test('cognitive: three levels of the same item, missed items repeated once, repeats kept out of the summary', async () => {
  const { tileAtLevel, roundAtLevel, missedRounds, practiceSummary } = await import('../packages/domain/games.ts');
  const word = { id: 'w', label: 'whale', emoji: '🐋', imageId: '/images/content/whale.webp' };
  const picture = { ...word, hideLabel: true };
  assert.deepEqual([tileAtLevel(word, 'photo').imageId, tileAtLevel(word, 'symbol').imageId, tileAtLevel(word, 'symbol').emoji], [word.imageId, undefined, '🐋']);
  assert.deepEqual([tileAtLevel(word, 'word').imageId, tileAtLevel(word, 'word').emoji], [undefined, undefined]);
  assert.equal(tileAtLevel(picture, 'word'), picture, 'a picture that is the answer stays a picture');
  const round = { id: 'r', prompt: 'x', target: picture, options: [word], answerId: 'w', hint: '' };
  assert.equal(roundAtLevel(round, 'photo'), round);
  assert.equal(roundAtLevel(round, 'word').options[0].emoji, undefined);
  const attempts = [{ roundId: 'a', selected: 'x', correct: false, hintUsed: false }, { roundId: 'b', selected: 'y', correct: true, hintUsed: false }, { roundId: 'a~again', selected: 'a', correct: true, hintUsed: false, repeat: true }];
  assert.deepEqual(missedRounds([{ id: 'a' }, { id: 'b' }], attempts).map(r => r.id), ['a']);
  assert.deepEqual(practiceSummary(attempts), { total: 2, correct: 1, independent: 1, assisted: 0 });
});

test('short instructions are three words or fewer for every activity', async () => {
  const { shortPrompts } = await import('../packages/domain/packs.ts');
  for (const [id, text] of Object.entries(shortPrompts)) assert.ok(text.split(/\s+/).length <= 3, `${id}: ${text}`);
});

test('speech: the board gets the lesson words once each, and listen-and-repeat builds one round per item', async () => {
  const { lessonWords } = await import('../packages/domain/games.ts');
  const { playablePack } = await import('../packages/domain/packs.ts');
  const { defaultCatalog } = await import('../packages/domain/catalog.ts');
  const pack = defaultCatalog.packs[0];
  const info = defaultCatalog.templates.find(t => t.id === 'repeat');
  assert.ok(info, 'the activity is in the catalog');
  const game = playablePack(pack, info, 3);
  assert.equal(game.rounds.length, pack.items.length);
  assert.ok(game.rounds.every(r => r.target && !r.target.hideLabel && r.options.length === 0));
  const choose = playablePack(pack, defaultCatalog.templates.find(t => t.id === 'choose-word'), 3);
  const words = lessonWords(choose.rounds);
  assert.equal(new Set(words.map(w => w.id)).size, words.length);
  assert.ok(words.every(w => !w.hideLabel && w.label));
  assert.ok(words.length <= 12);
});
