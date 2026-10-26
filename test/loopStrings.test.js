import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateLoopChallengeStars,
  doesPermutationMatchChallenge,
  findChallengePath,
  getDefaultLoopChallengeProgress,
  getLoopChallengeStatus,
  loadLoopChallengeProgress,
  LOOP_CHALLENGES,
  LOOP_STARS,
  LOOP_STRINGS_CHALLENGE_STORAGE_KEY,
  LOOP_TARGET_TYPES,
  recordLoopChallengeAttempt,
  recordLoopChallengeHint,
  saveLoopChallengeProgress,
  validateLoopChallenges,
} from '../src/games/loopStrings/challenges.js';
import {
  getDefaultLoopStats,
  getUnlockedLoopAchievements,
  recordLoopChallengeStats,
  recordLoopHint,
  recordLoopShift,
  recordLoopSolutionViewed,
} from '../src/games/loopStrings/stats.js';
import {
  analyzeLoops,
  applyThreeShift,
  countConfigurationsByShortestLoop,
  createIdentityPermutation,
  enumerateReachablePermutations,
  formatCycleType,
  generateIntegerPartitions,
  getAllThreeShiftMoves,
  getCycleTypeFromCycles,
  getPermutationParity,
  getPossibleShortestLoopSizes,
  getReachableCycleTypes,
  getParityFromCycleType,
  isReachableCycleType,
  ROTATION_DIRECTIONS,
  undoThreeShift,
} from '../src/games/loopStrings/logic.js';

describe('Loop Strings explorer logic', () => {
  it('applies clockwise and counterclockwise 3-shifts to selected right ends', () => {
    const identity = createIdentityPermutation(4);

    assert.deepEqual(
      applyThreeShift(identity, [1, 2, 3], ROTATION_DIRECTIONS.clockwise),
      [3, 1, 2, 4],
    );
    assert.deepEqual(
      applyThreeShift(identity, [1, 2, 3], ROTATION_DIRECTIONS.counterclockwise),
      [2, 3, 1, 4],
    );
  });

  it('recovers state by applying the inverse 3-shift', () => {
    const identity = createIdentityPermutation(5);
    const move = { labels: [1, 3, 5], direction: ROTATION_DIRECTIONS.clockwise };
    const shifted = applyThreeShift(identity, move.labels, move.direction);

    assert.deepEqual(undoThreeShift(shifted, move), identity);
  });

  it('computes cycle decomposition and shortest loop size', () => {
    const analysis = analyzeLoops([3, 2, 7, 5, 4, 6, 1]);

    assert.deepEqual(analysis.cycles, [[1, 3, 7], [2], [4, 5], [6]]);
    assert.equal(analysis.loopCount, 4);
    assert.equal(analysis.shortestLoopSize, 1);
    assert.equal(analysis.longestLoopSize, 3);
    assert.deepEqual(analysis.sizeMultiset, [1, 1, 2, 3]);
  });

  it('extracts cycle type as a sorted partition', () => {
    const cycles = [[1, 3, 7], [2], [4, 5], [6]];

    assert.deepEqual(getCycleTypeFromCycles(cycles), [1, 1, 2, 3]);
    assert.equal(formatCycleType([2, 2, 3]), '2 + 2 + 3');
  });

  it('derives parity from the number of even-length cycles', () => {
    assert.equal(getParityFromCycleType([1, 1, 2, 3]), 'odd');
    assert.equal(getParityFromCycleType([2, 2, 3]), 'even');
    assert.equal(isReachableCycleType([2, 2, 3]), true);
    assert.equal(isReachableCycleType([2, 5]), false);
  });

  it('gets possible shortest loop sizes for n=7 from reachable cycle types', () => {
    const possible = getPossibleShortestLoopSizes(7);

    assert.deepEqual(
      possible.map((entry) => entry.shortestLoopSize),
      [1, 2, 7],
    );
    assert.deepEqual(
      possible
        .find((entry) => entry.shortestLoopSize === 2)
        .cycleTypes,
      [[2, 2, 3]],
    );
  });

  it('counts shortest-loop configurations by grouping and permutation order', () => {
    const result = countConfigurationsByShortestLoop(7, 2);

    assert.deepEqual(result.cycleTypes, [[2, 2, 3]]);
    assert.equal(result.groupingCount, 105);
    assert.equal(result.permutationCount, 210);
  });

  it('generates valid partitions and filters reachable cycle types by parity', () => {
    assert.deepEqual(generateIntegerPartitions(4), [[1, 1, 1, 1], [1, 1, 2], [1, 3], [2, 2], [4]]);
    assert.deepEqual(getReachableCycleTypes(4), [[1, 1, 1, 1], [1, 3], [2, 2]]);
  });

  it('enumerates reachable states for small n by 3-shifts', () => {
    const result = enumerateReachablePermutations(4);

    assert.equal(result.available, true);
    assert.equal(result.reachableCount, 12);
    assert.deepEqual(result.possibleShortestLoopSizes, [1, 2]);
  });

  it('does not enumerate states beyond the small-n cap', () => {
    const result = enumerateReachablePermutations(8);

    assert.equal(result.available, false);
    assert.equal(result.maxN, 7);
  });

  it('keeps every 3-shift even as a permutation', () => {
    const identity = createIdentityPermutation(5);

    getAllThreeShiftMoves(5).forEach((move) => {
      const shifted = applyThreeShift(identity, move.labels, move.direction);

      assert.equal(getPermutationParity(shifted), 'even');
    });
  });
});

describe('Loop Strings Cycle Challenge logic', () => {
  function createStorage() {
    const values = new Map();

    return {
      getItem: (key) => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    };
  }

  it('defines valid starter challenge metadata', () => {
    assert.equal(LOOP_CHALLENGES.length, 6);
    assert.deepEqual(
      validateLoopChallenges().map((entry) => entry.valid),
      [true, true, true, true, true, true],
    );
    assert.equal(
      LOOP_CHALLENGES.every((challenge) =>
        Object.values(LOOP_TARGET_TYPES).includes(challenge.targetType),
      ),
      true,
    );
  });

  it('matches the First Twist target cycle type 3', () => {
    const challenge = LOOP_CHALLENGES.find((item) => item.id === 'first-twist');
    const permutation = applyThreeShift(
      createIdentityPermutation(3),
      [1, 2, 3],
      ROTATION_DIRECTIONS.clockwise,
    );

    assert.equal(doesPermutationMatchChallenge(permutation, challenge), true);
    assert.equal(doesPermutationMatchChallenge(createIdentityPermutation(3), challenge), false);
  });

  it('matches shortest loop 2 for n=7', () => {
    const challenge = LOOP_CHALLENGES.find((item) => item.id === 'shortest-two');
    const permutation = [2, 1, 4, 3, 6, 7, 5];

    assert.deepEqual(analyzeLoops(permutation).cycleType, [2, 2, 3]);
    assert.equal(doesPermutationMatchChallenge(permutation, challenge), true);
  });

  it('finds a BFS path for First Twist', () => {
    const challenge = LOOP_CHALLENGES.find((item) => item.id === 'first-twist');
    const path = findChallengePath(createIdentityPermutation(challenge.n), challenge);

    assert.equal(path.available, true);
    assert.equal(path.path.length, 1);
    assert.equal(doesPermutationMatchChallenge(path.path[0].permutation, challenge), true);
  });

  it('loads, saves, and records challenge progress locally', () => {
    const storage = createStorage();
    let progress = getDefaultLoopChallengeProgress();

    progress = recordLoopChallengeHint(progress, 'first-twist');
    progress = recordLoopChallengeAttempt(progress, 'first-twist', {
      success: true,
      moveCount: 1,
      hintsUsed: 0,
    });

    saveLoopChallengeProgress(progress, storage);
    const loaded = loadLoopChallengeProgress(storage);

    assert.equal(loaded.completed['first-twist'], true);
    assert.equal(loaded.bestMoveCount['first-twist'], 1);
    assert.equal(loaded.hintsUsed['first-twist'], 1);
    assert.equal(storage.getItem(LOOP_STRINGS_CHALLENGE_STORAGE_KEY).includes('first-twist'), true);
  });

  it('calculates challenge stars from completion, hints, and BFS length', () => {
    const challenge = LOOP_CHALLENGES.find((item) => item.id === 'first-twist');

    assert.equal(
      calculateLoopChallengeStars(challenge, { success: false, moveCount: 1, hintsUsed: 0 }),
      LOOP_STARS.none,
    );
    assert.equal(
      calculateLoopChallengeStars(challenge, { success: true, moveCount: 2, hintsUsed: 1 }),
      LOOP_STARS.bronze,
    );
    assert.equal(
      calculateLoopChallengeStars(challenge, { success: true, moveCount: 2, hintsUsed: 0 }),
      LOOP_STARS.silver,
    );
    assert.equal(
      calculateLoopChallengeStars(challenge, { success: true, moveCount: 1, hintsUsed: 0 }),
      LOOP_STARS.gold,
    );
  });

  it('unlocks Loop Strings challenges sequentially', () => {
    let progress = getDefaultLoopChallengeProgress();

    assert.equal(getLoopChallengeStatus('first-twist', progress), 'Unlocked');
    assert.equal(getLoopChallengeStatus('two-loops', progress), 'Locked');

    progress = recordLoopChallengeAttempt(progress, 'first-twist', {
      success: true,
      moveCount: 1,
      stars: LOOP_STARS.gold,
    });

    assert.equal(getLoopChallengeStatus('first-twist', progress), 'Completed');
    assert.equal(getLoopChallengeStatus('two-loops', progress), 'Unlocked');
  });

  it('updates Loop Strings stats and local achievements', () => {
    let stats = getDefaultLoopStats();
    let progress = getDefaultLoopChallengeProgress();

    stats = recordLoopShift(stats, { explorer: true, cycleType: [7] });
    stats = recordLoopHint(stats);
    stats = recordLoopSolutionViewed(stats);
    progress = recordLoopChallengeAttempt(progress, 'first-twist', {
      success: true,
      moveCount: 1,
      stars: LOOP_STARS.gold,
    });
    progress = recordLoopChallengeAttempt(progress, 'fewest-loops', {
      success: true,
      moveCount: 3,
      stars: LOOP_STARS.silver,
    });
    stats = recordLoopChallengeStats(stats, progress, { cycleType: [7] });

    assert.equal(stats.totalShiftsMade, 1);
    assert.equal(stats.explorerShiftsMade, 1);
    assert.equal(stats.hintsUsed, 1);
    assert.equal(stats.bfsSolutionsViewed, 1);
    assert.equal(stats.challengesCompleted, 2);
    assert.equal(stats.goldCompletions, 1);
    assert.deepEqual(
      getUnlockedLoopAchievements(progress, stats).map((achievement) => achievement.id),
      [
        'first-twist-shift',
        'cycle-hunter',
        'parity-master',
        'seven-connected',
        'minimal-loops',
      ],
    );
  });
});
