import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BINARY_SHIFT_CHALLENGES,
  BINARY_SHIFT_STARS,
  calculateBinaryShiftStars,
  evaluateBinaryShiftChallenge,
  getBinaryShiftHint,
  getBinaryShiftChallengeStatus,
  getDefaultBinaryShiftProgress,
  normalizeBinaryShiftProgress,
  recordBinaryShiftCompletion,
  recordBinaryShiftHint,
} from '../src/games/binaryShift/challenges.js';
import {
  countSpecialValuesBelow,
  evaluateBinaryShift,
  getDivisibilityRow,
  searchBinaryShift,
} from '../src/games/binaryShift/logic.js';
import {
  getDefaultBinaryShiftStats,
  getUnlockedBinaryShiftAchievements,
  recordBinaryShiftChallengeStats,
  recordBinaryShiftHintStat,
} from '../src/games/binaryShift/stats.js';

describe('Binary Shift explorer logic', () => {
  it('detects n=2, x=1 as special', () => {
    const result = evaluateBinaryShift({ n: 2, x: 1 });

    assert.equal(result.xBinary, '01');
    assert.equal(result.shiftedBinary, '10');
    assert.equal(result.product, 2n);
    assert.equal(result.special, true);
  });

  it('reports n=3 has no special integer x', () => {
    const row = getDivisibilityRow(3);

    assert.equal(row.divisor, 5n);
    assert.equal(row.mersenne, 7n);
    assert.equal(row.divisible, false);
    assert.equal(row.special, false);
  });

  it('reports n=4 has no special integer x', () => {
    const row = getDivisibilityRow(4);

    assert.equal(row.divisor, 7n);
    assert.equal(row.mersenne, 15n);
    assert.equal(row.divisible, false);
    assert.equal(row.special, false);
  });

  it('gets n=8, x=17 from the formula and verifies the shift', () => {
    const row = getDivisibilityRow(8);
    const result = evaluateBinaryShift({ n: 8, x: 17 });

    assert.equal(row.x, 17n);
    assert.equal(row.binaryX, '00010001');
    assert.equal(result.shiftedBinary, '10001000');
    assert.equal(result.product, 136n);
    assert.equal(result.special, true);
  });

  it('uses the divisibility condition 2n - 1 divides 2^n - 1', () => {
    assert.equal(getDivisibilityRow(2).divisible, true);
    assert.equal(getDivisibilityRow(8).divisible, true);
    assert.equal(getDivisibilityRow(9).divisible, false);
  });

  it('counts special x below 1000 as 1 and 17', () => {
    const values = countSpecialValuesBelow(1000n, 100);

    assert.deepEqual(values.map((row) => row.x), [1n, 17n]);
  });

  it('handles BigInt search through N=100 safely', () => {
    const rows = searchBinaryShift(100);

    assert.equal(rows.length, 99);
    assert.equal(rows.at(-1).n, 100);
    assert.equal(typeof rows.at(-1).mersenne, 'bigint');
    assert.equal(rows.some((row) => row.n === 8 && row.x === 17n), true);
  });
});

describe('Binary Shift Special Number Challenge logic', () => {
  it('defines valid starter challenge metadata', () => {
    assert.equal(BINARY_SHIFT_CHALLENGES.length, 6);

    BINARY_SHIFT_CHALLENGES.forEach((challenge) => {
      assert.equal(typeof challenge.id, 'string');
      assert.equal(typeof challenge.title, 'string');
      assert.equal(Number.isInteger(challenge.n), true);
      assert.equal(challenge.n >= 2, true);
      assert.equal(typeof challenge.lesson, 'string');
    });
  });

  it('accepts n=2 success with x=1', () => {
    const challenge = BINARY_SHIFT_CHALLENGES.find((item) => item.id === 'first-special');
    const result = evaluateBinaryShiftChallenge(challenge, { x: 1 });

    assert.equal(result.success, true);
    assert.equal(result.expectedX, 1n);
    assert.equal(result.evaluation.xBinary, '01');
  });

  it('accepts n=3 impossible declaration', () => {
    const challenge = BINARY_SHIFT_CHALLENGES.find((item) => item.id === 'no-solution');
    const result = evaluateBinaryShiftChallenge(challenge, { declareImpossible: true });

    assert.equal(result.success, true);
    assert.equal(result.solutionExists, false);
    assert.equal(result.expectedX, null);
  });

  it('accepts n=8 success with x=17', () => {
    const challenge = BINARY_SHIFT_CHALLENGES.find((item) => item.id === 'hidden-success');
    const result = evaluateBinaryShiftChallenge(challenge, { x: '17' });

    assert.equal(result.success, true);
    assert.equal(result.expectedX, 17n);
    assert.equal(result.evaluation.shiftedBinary, '10001000');
  });

  it('reveals hints progressively', () => {
    const challenge = BINARY_SHIFT_CHALLENGES.find((item) => item.id === 'hidden-success');

    assert.equal(getBinaryShiftHint(challenge, 1), '2n - 1 = 15.');
    assert.match(getBinaryShiftHint(challenge, 2), /15 divides 255/);
    assert.match(getBinaryShiftHint(challenge, 3), /x = .*17/);
  });

  it('records challenge completions and hint counts', () => {
    const base = getDefaultBinaryShiftProgress();
    const hintedOnce = recordBinaryShiftHint(base, 'hidden-success');
    const hintedTwice = recordBinaryShiftHint(hintedOnce, 'hidden-success');
    const completed = recordBinaryShiftCompletion(hintedTwice, 'hidden-success');
    const normalized = normalizeBinaryShiftProgress({
      completed: { 'first-special': true },
    });

    assert.equal(hintedOnce.hintsUsed['hidden-success'], 1);
    assert.equal(hintedTwice.hintsUsed['hidden-success'], 2);
    assert.equal(completed.completed['hidden-success'], true);
    assert.equal(normalized.completed['first-special'], true);
    assert.deepEqual(normalized.hintsUsed, {});
  });

  it('calculates stars from successful attempts and hint usage', () => {
    const challenge = BINARY_SHIFT_CHALLENGES[0];
    const success = evaluateBinaryShiftChallenge(challenge, { x: 1 });
    const failure = evaluateBinaryShiftChallenge(challenge, { x: 2 });

    assert.equal(calculateBinaryShiftStars(success, 0), BINARY_SHIFT_STARS.gold);
    assert.equal(calculateBinaryShiftStars(success, 1), BINARY_SHIFT_STARS.silver);
    assert.equal(calculateBinaryShiftStars(success, 2), BINARY_SHIFT_STARS.bronze);
    assert.equal(calculateBinaryShiftStars(failure, 0), BINARY_SHIFT_STARS.none);
  });

  it('unlocks challenges sequentially', () => {
    let progress = getDefaultBinaryShiftProgress();

    assert.equal(getBinaryShiftChallengeStatus('first-special', progress), 'Unlocked');
    assert.equal(getBinaryShiftChallengeStatus('no-solution', progress), 'Locked');

    progress = recordBinaryShiftCompletion(progress, 'first-special');

    assert.equal(getBinaryShiftChallengeStatus('first-special', progress), 'Completed');
    assert.equal(getBinaryShiftChallengeStatus('no-solution', progress), 'Unlocked');
    assert.equal(getBinaryShiftChallengeStatus('another-failure', progress), 'Locked');
  });

  it('updates Binary Shift stats from attempts and hints', () => {
    const challenge = BINARY_SHIFT_CHALLENGES[0];
    const result = evaluateBinaryShiftChallenge(challenge, { x: 1 });
    const beforeProgress = getDefaultBinaryShiftProgress();
    const afterProgress = recordBinaryShiftCompletion(
      beforeProgress,
      challenge.id,
      result,
      BINARY_SHIFT_STARS.gold,
    );
    const stats = recordBinaryShiftChallengeStats(
      getDefaultBinaryShiftStats(),
      beforeProgress,
      afterProgress,
      result,
      BINARY_SHIFT_STARS.gold,
    );
    const hinted = recordBinaryShiftHintStat(stats);

    assert.equal(stats.challengeAttempts, 1);
    assert.equal(stats.challengesCompleted, 1);
    assert.equal(stats.correctXSubmissions, 1);
    assert.equal(stats.goldCompletions, 1);
    assert.equal(hinted.hintsUsed, 1);
  });

  it('unlocks local Binary Shift achievements', () => {
    const progress = normalizeBinaryShiftProgress({
      completed: Object.fromEntries(BINARY_SHIFT_CHALLENGES.map((challenge) => [challenge.id, true])),
      hintsUsed: { 'hidden-success': 2 },
    });
    const stats = {
      ...getDefaultBinaryShiftStats(),
      correctImpossibleDeclarations: 1,
    };
    const achievements = getUnlockedBinaryShiftAchievements(progress, stats);

    assert.deepEqual(
      achievements.map((achievement) => achievement.id),
      [
        'first-shift',
        'impossible-detector',
        'hidden-success',
        'formula-finder',
        'binary-master',
      ],
    );
  });
});
