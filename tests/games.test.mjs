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
