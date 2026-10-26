import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateChallengeStars,
  completeNumberForgeChallenge,
  DEFAULT_NUMBER_FORGE_PROGRESS,
  evaluateChallengeAttempt,
  getChallengeStatus,
  loadNumberForgeProgress,
  NUMBER_FORGE_CHALLENGES,
  saveNumberForgeProgress,
  validateChallenge,
} from '../src/games/numberForge/challenges.js';
import {
  DEFAULT_NUMBER_FORGE_STATS,
  getUnlockedAchievements,
  recordNumberForgeAttempt,
} from '../src/games/numberForge/stats.js';
import {
  analyzeReachability,
  analyzeResidueClasses,
  detectReduction,
  findLargestUnreachable,
  getParityCounts,
  getPrismResultCard,
  getReachabilityStats,
  getReducedMissingValues,
  normalizeGenerators,
  recoverRepresentation,
  suggestModuli,
} from '../src/games/numberForge/logic.js';

describe('Number Forge explorer logic', () => {
  it('normalizes positive integer generators', () => {
    assert.deepEqual(normalizeGenerators([25, 9, 15, 9, 0, -3, 2.5, '15']), [9, 15, 25]);
  });

  it('computes reachability for default generators', () => {
    const analysis = analyzeReachability([9, 15, 25], 50);

    assert.equal(analysis.reachable[0], true);
    assert.equal(analysis.reachable[1], false);
    assert.equal(analysis.reachable[9], true);
    assert.equal(analysis.reachable[43], true);
  });

  it('recovers one representation for a reachable number', () => {
    const analysis = analyzeReachability([9, 15, 25], 50);

    assert.deepEqual(recoverRepresentation(analysis, 43), [9, 9, 25]);
    assert.deepEqual(recoverRepresentation(analysis, 0), []);
    assert.equal(recoverRepresentation(analysis, 44), null);
  });

  it('finds the largest unreachable value in the current range', () => {
    const analysis = analyzeReachability([3, 5], 20);

    assert.equal(findLargestUnreachable(analysis), 7);
  });

  it('summarizes density and longest unreachable gap', () => {
    const analysis = analyzeReachability([4, 6], 12);
    const stats = getReachabilityStats(analysis);

    assert.equal(stats.largestUnreachable, 11);
    assert.equal(stats.reachableCount, 6);
    assert.deepEqual(stats.longestGap, {
      start: 1,
      end: 3,
      length: 3,
    });
  });

  it('suggests modulus 3 for PRISM-style generator sets', () => {
    assert.equal(suggestModuli([9, 15, 25]).includes(3), true);
    assert.equal(suggestModuli([9, 21, 49]).includes(3), true);
    assert.equal(suggestModuli([9, 15, 25])[0], 3);
  });

  it('analyzes residue classes for a small range', () => {
    const analysis = analyzeReachability([3, 5], 12);
    const residues = analyzeResidueClasses(analysis, 3);

    assert.deepEqual(residues[0].reachableNumbers, [0, 3, 6, 9, 12]);
    assert.deepEqual(residues[1].unreachableNumbers, [1, 4, 7]);
    assert.equal(residues[2].smallestReachable, 5);
    assert.equal(residues[2].largestUnreachable, 2);
  });

  it('counts reachable and unreachable parity for the default set', () => {
    const analysis = analyzeReachability([9, 15, 25], 50);
    const counts = getParityCounts(analysis);

    assert.deepEqual(counts, {
      unreachableOdd: 16,
      unreachableEven: 16,
      reachableOdd: 9,
      reachableEven: 10,
    });
  });

  it('keeps reachability working across preset generator sets', () => {
    const defaultAnalysis = analyzeReachability([9, 15, 25], 80);
    const alternateAnalysis = analyzeReachability([9, 21, 49], 80);
    const smallAnalysis = analyzeReachability([3, 7], 20);

    assert.equal(defaultAnalysis.reachable[43], true);
    assert.equal(alternateAnalysis.reachable[79], true);
    assert.equal(smallAnalysis.reachable[17], true);
  });

  it('detects the PRISM reduction for 9,15,25', () => {
    const reduction = detectReduction([9, 15, 25], 200);

    assert.equal(reduction.modulus, 3);
    assert.deepEqual(reduction.divisibleGenerators, [9, 15]);
    assert.equal(reduction.controllerGenerator, 25);
    assert.deepEqual(reduction.reducedGenerators, [3, 5]);
    assert.deepEqual(reduction.residueClasses[2].liftedMissingValues, [53, 56, 62, 71]);
  });

  it('detects the PRISM reduction for 9,21,49', () => {
    const reduction = detectReduction([9, 21, 49], 200);

    assert.equal(reduction.modulus, 3);
    assert.deepEqual(reduction.divisibleGenerators, [9, 21]);
    assert.equal(reduction.controllerGenerator, 49);
    assert.deepEqual(reduction.reducedGenerators, [3, 7]);
  });

  it('computes reduced missing values for 3,5 and 3,7', () => {
    assert.deepEqual(getReducedMissingValues([3, 5]), [1, 2, 4, 7]);
    assert.deepEqual(getReducedMissingValues([3, 7]), [1, 2, 4, 5, 8, 11]);
  });

  it('reports exact PRISM result cards', () => {
    assert.deepEqual(getPrismResultCard([9, 15, 25]), {
      missedOdd: 18,
      missedEven: 18,
      largestMissed: 71,
      allReachableFrom: 72,
    });
    assert.deepEqual(getPrismResultCard([9, 21, 49]), {
      missedOdd: 33,
      missedEven: 33,
      largestMissed: 131,
      allReachableFrom: 132,
    });
    assert.equal(getPrismResultCard([3, 5]), null);
  });

  it('defines valid Target Challenge metadata', () => {
    assert.equal(NUMBER_FORGE_CHALLENGES.length, 8);
    NUMBER_FORGE_CHALLENGES.forEach((challenge) => {
      const validation = validateChallenge(challenge);

      assert.equal(validation.valid, true);
      assert.equal(validation.reachable, !challenge.impossible);
      assert.equal(challenge.generators.length > 0, true);
    });
  });

  it('evaluates reachable challenge success condition', () => {
    const challenge = NUMBER_FORGE_CHALLENGES.find((level) => level.id === 'build-43');

    assert.equal(evaluateChallengeAttempt(challenge, 43).success, true);
    assert.equal(evaluateChallengeAttempt(challenge, 34).success, false);
  });

  it('evaluates impossible challenge declarations', () => {
    const impossible = NUMBER_FORGE_CHALLENGES.find((level) => level.id === 'prove-7');

    assert.equal(evaluateChallengeAttempt(impossible, 0, true).success, true);
    assert.equal(evaluateChallengeAttempt(impossible, 7, false).success, false);
  });

  it('rejects declare impossible for reachable targets', () => {
    const challenge = NUMBER_FORGE_CHALLENGES.find((level) => level.id === 'build-39');
    const result = evaluateChallengeAttempt(challenge, 0, true);

    assert.equal(result.success, false);
    assert.equal(result.reason, 'This number is reachable. Try building it.');
  });

  it('loads, saves, and completes Number Forge challenge progress', () => {
    let value = null;
    const storage = {
      getItem: () => value,
      setItem: (_key, nextValue) => {
        value = nextValue;
      },
    };
    const challenge = NUMBER_FORGE_CHALLENGES[0];
    const progress = completeNumberForgeChallenge(
      DEFAULT_NUMBER_FORGE_PROGRESS,
      challenge,
      3,
      true,
    );
    const improved = completeNumberForgeChallenge(progress, challenge, 2, false);

    saveNumberForgeProgress(improved, storage);

    assert.deepEqual(loadNumberForgeProgress(storage), improved);
    assert.equal(improved.completedLevels[challenge.id], true);
    assert.equal(improved.bestMoves[challenge.id], 2);
    assert.equal(improved.hintsUsed[challenge.id], true);
  });

  it('calculates stars for reachable challenges', () => {
    const challenge = NUMBER_FORGE_CHALLENGES.find((level) => level.id === 'build-43');

    assert.equal(calculateChallengeStars(challenge, {
      success: true,
      hintUsed: true,
      reductionOpened: false,
      moveCount: 3,
    }), 3);
    assert.equal(calculateChallengeStars(challenge, {
      success: true,
      hintUsed: false,
      reductionOpened: false,
      moveCount: 4,
    }), 2);
    assert.equal(calculateChallengeStars(challenge, {
      success: true,
      hintUsed: true,
      reductionOpened: false,
      moveCount: 4,
    }), 1);
  });

  it('calculates impossible challenge stars', () => {
    const challenge = NUMBER_FORGE_CHALLENGES.find((level) => level.id === 'prove-71');

    assert.equal(calculateChallengeStars(challenge, {
      success: true,
      hintUsed: false,
      reductionOpened: true,
      moveCount: 0,
    }), 3);
    assert.equal(calculateChallengeStars(challenge, {
      success: true,
      hintUsed: false,
      reductionOpened: false,
      moveCount: 0,
    }), 2);
    assert.equal(calculateChallengeStars(challenge, {
      success: true,
      hintUsed: true,
      reductionOpened: false,
      moveCount: 0,
    }), 1);
  });

  it('updates Number Forge challenge stats', () => {
    const stats = recordNumberForgeAttempt(DEFAULT_NUMBER_FORGE_STATS, {
      success: true,
      declaredImpossible: true,
      hintUsed: true,
      moveCount: 0,
      stars: 3,
    });
    const failed = recordNumberForgeAttempt(stats, {
      success: false,
      declaredImpossible: true,
      hintUsed: false,
      moveCount: 2,
      stars: 0,
    });

    assert.equal(failed.challengesAttempted, 2);
    assert.equal(failed.challengesCompleted, 1);
    assert.equal(failed.impossibleDeclarationsCorrect, 1);
    assert.equal(failed.impossibleDeclarationsIncorrect, 1);
    assert.equal(failed.hintsUsed, 1);
    assert.equal(failed.totalGeneratorsPlaced, 2);
    assert.equal(failed.bestGoldCompletions, 1);
  });

  it('unlocks achievements from progress and stats', () => {
    const progress = {
      ...DEFAULT_NUMBER_FORGE_PROGRESS,
      completedLevels: Object.fromEntries(NUMBER_FORGE_CHALLENGES.map((challenge) => [challenge.id, true])),
      highestStars: { [NUMBER_FORGE_CHALLENGES[0].id]: 3 },
    };
    const stats = {
      ...DEFAULT_NUMBER_FORGE_STATS,
      hintsUsed: 1,
    };
    const achievementIds = getUnlockedAchievements(progress, stats).map((achievement) => achievement.id);

    assert.deepEqual(achievementIds, [
      'first-construction',
      'impossible-detector',
      'reductionist',
      'perfect-forge',
      'master-smith',
    ]);
  });

  it('reports sequential challenge progression status', () => {
    const progress = completeNumberForgeChallenge(
      DEFAULT_NUMBER_FORGE_PROGRESS,
      NUMBER_FORGE_CHALLENGES[0],
      3,
      false,
      3,
    );

    assert.equal(getChallengeStatus(NUMBER_FORGE_CHALLENGES[0], 0, progress), 'Completed');
    assert.equal(getChallengeStatus(NUMBER_FORGE_CHALLENGES[1], 1, progress), 'Unlocked');
    assert.equal(getChallengeStatus(NUMBER_FORGE_CHALLENGES[2], 2, progress), 'Locked');
  });
});
