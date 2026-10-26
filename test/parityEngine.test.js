import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createTransitionMatrix,
  getDistributionAfterSteps,
  getStationaryDistribution,
  RANDOMIZER_PRESETS,
  runParitySimulation,
} from '../src/games/parityEngine/logic.js';
import {
  calculateParityChallengeStars,
  evaluateParityChallenge,
  getChallengeDefaultControls,
  getParityChallengeStatus,
  PARITY_ALLOWED_CONTROLS,
  PARITY_CHALLENGES,
  PARITY_STARS,
  recordParityChallengeAttempt,
  recordParityChallengeHint,
} from '../src/games/parityEngine/challenges.js';
import {
  getUnlockedParityAchievements,
  recordParityChallengeStats,
  recordParityHintUsed,
  recordParitySimulationRun,
} from '../src/games/parityEngine/stats.js';

function approximatelyEqual(actual, expected, epsilon = 1e-12) {
  assert.equal(Math.abs(actual - expected) <= epsilon, true, `${actual} != ${expected}`);
}

describe('Parity Engine Markov logic', () => {
  it('computes the fair coin transition matrix', () => {
    const matrix = createTransitionMatrix(RANDOMIZER_PRESETS.fairCoins);

    assert.deepEqual(matrix, [
      [0.25, 0.75],
      [0.25, 0.75],
    ]);
  });

  it('gets exact P(s_2026 even) = 1/4 for fair coins', () => {
    const [even, odd] = getDistributionAfterSteps({
      ...RANDOMIZER_PRESETS.fairCoins,
      steps: 2026,
    });

    approximatelyEqual(even, 0.25);
    approximatelyEqual(odd, 0.75);
  });

  it('computes the 7-sided dice parity transition matrix', () => {
    const matrix = createTransitionMatrix(RANDOMIZER_PRESETS.sevenSided);

    approximatelyEqual(matrix[0][0], 16 / 49);
    approximatelyEqual(matrix[0][1], 33 / 49);
    approximatelyEqual(matrix[1][0], 12 / 49);
    approximatelyEqual(matrix[1][1], 37 / 49);
  });

  it('gets stationary even probability 4/15 for 7-sided dice', () => {
    const stationary = getStationaryDistribution(RANDOMIZER_PRESETS.sevenSided);

    approximatelyEqual(stationary[0], 4 / 15);
    approximatelyEqual(stationary[1], 11 / 15);
  });

  it('returns valid probabilities from the simulation helper', () => {
    let seed = 3;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const result = runParitySimulation({
      ...RANDOMIZER_PRESETS.fairCoins,
      n: 8,
      trials: 50,
      rng,
    });

    assert.equal(result.trials, 50);
    assert.equal(result.evenCount + result.oddCount, 50);
    assert.equal(result.simulatedEven >= 0 && result.simulatedEven <= 1, true);
    assert.equal(result.simulatedOdd >= 0 && result.simulatedOdd <= 1, true);
    assert.equal(result.exactEven >= 0 && result.exactEven <= 1, true);
    assert.equal(result.error >= 0 && result.error <= 1, true);
  });
});

describe('Parity Engine Target Challenge logic', () => {
  it('defines valid starter challenge metadata', () => {
    assert.equal(PARITY_CHALLENGES.length, 6);

    PARITY_CHALLENGES.forEach((challenge) => {
      assert.equal(typeof challenge.id, 'string');
      assert.equal(typeof challenge.title, 'string');
      assert.equal(Number.isInteger(challenge.n), true);
      assert.equal(challenge.n > 0, true);
      assert.equal(challenge.targetEvenProbability >= 0, true);
      assert.equal(challenge.targetEvenProbability <= 1, true);
      assert.equal(challenge.tolerance > 0, true);
      assert.equal(Object.values(PARITY_ALLOWED_CONTROLS).includes(challenge.allowedControls), true);
      assert.equal(typeof challenge.lesson, 'string');
    });
  });

  it('fair coin challenge computes 1/4 and succeeds', () => {
    const challenge = PARITY_CHALLENGES.find((item) => item.id === 'fair-coin-lock');
    const evaluation = evaluateParityChallenge(challenge, getChallengeDefaultControls(challenge));

    approximatelyEqual(evaluation.exactEven, 1 / 4);
    assert.equal(evaluation.success, true);
  });

  it('seven-sided challenge computes approximately 4/15 and succeeds', () => {
    const challenge = PARITY_CHALLENGES.find((item) => item.id === 'seven-sided-balance');
    const evaluation = evaluateParityChallenge(challenge, getChallengeDefaultControls(challenge));

    approximatelyEqual(evaluation.exactEven, 4 / 15, 1e-12);
    assert.equal(evaluation.success, true);
  });

  it('checks success using the challenge tolerance', () => {
    const challenge = PARITY_CHALLENGES.find((item) => item.id === 'make-it-even-ish');
    const success = evaluateParityChallenge(challenge, {
      randomizerId: RANDOMIZER_PRESETS.custom.id,
      pA: 0.5,
      pB: 1,
    });
    const failure = evaluateParityChallenge(challenge, {
      randomizerId: RANDOMIZER_PRESETS.custom.id,
      pA: 0.5,
      pB: 0.2,
    });

    assert.equal(success.success, true);
    assert.equal(failure.success, false);
  });

  it('records best error, completions, and hints without losing prior progress', () => {
    const challenge = PARITY_CHALLENGES[0];
    const first = recordParityChallengeAttempt({}, challenge.id, {
      error: 0.05,
      success: false,
    });
    const hinted = recordParityChallengeHint(first, challenge.id);
    const second = recordParityChallengeAttempt(hinted, challenge.id, {
      error: 0.001,
      success: true,
    });

    assert.equal(second.completed[challenge.id], true);
    assert.equal(second.bestError[challenge.id], 0.001);
    assert.equal(second.hintsUsed[challenge.id], 1);
  });

  it('calculates stars from completion, hints, and gold error threshold', () => {
    const challenge = PARITY_CHALLENGES.find((item) => item.id === 'make-it-even-ish');

    assert.equal(
      calculateParityChallengeStars(challenge, { success: false, error: 0.5 }, 0),
      PARITY_STARS.none,
    );
    assert.equal(
      calculateParityChallengeStars(challenge, { success: true, error: 0.019 }, 1),
      PARITY_STARS.bronze,
    );
    assert.equal(
      calculateParityChallengeStars(challenge, { success: true, error: 0.019 }, 0),
      PARITY_STARS.silver,
    );
    assert.equal(
      calculateParityChallengeStars(challenge, { success: true, error: 0.005 }, 2),
      PARITY_STARS.gold,
    );
  });

  it('unlocks Parity Engine challenges sequentially', () => {
    const empty = {};
    const first = PARITY_CHALLENGES[0];
    const second = PARITY_CHALLENGES[1];

    assert.equal(getParityChallengeStatus(first.id, empty), 'Unlocked');
    assert.equal(getParityChallengeStatus(second.id, empty), 'Locked');

    const progress = recordParityChallengeAttempt(empty, first.id, {
      success: true,
      error: 0,
      stars: PARITY_STARS.gold,
    });

    assert.equal(getParityChallengeStatus(first.id, progress), 'Completed');
    assert.equal(getParityChallengeStatus(second.id, progress), 'Unlocked');
    assert.equal(progress.highestStars[first.id], PARITY_STARS.gold);
  });

  it('updates Parity Engine stats and local achievements', () => {
    const fairCoin = PARITY_CHALLENGES[0];
    const custom = PARITY_CHALLENGES.find((item) => item.id === 'design-your-chain');
    let progress = {};
    let stats = recordParitySimulationRun({});

    progress = recordParityChallengeAttempt(progress, fairCoin.id, {
      success: true,
      error: 0,
      stars: PARITY_STARS.gold,
    });
    stats = recordParityChallengeStats(stats, progress, { error: 0 });
    stats = recordParityHintUsed(stats);
    progress = recordParityChallengeAttempt(progress, custom.id, {
      success: true,
      error: 0.001,
      stars: PARITY_STARS.gold,
    });
    stats = recordParityChallengeStats(stats, progress, { error: 0.001 });

    assert.equal(stats.challengeAttempts, 2);
    assert.equal(stats.challengesCompleted, 2);
    assert.equal(stats.hintsUsed, 1);
    assert.equal(stats.goldCompletions, 2);
    assert.equal(stats.simulationsRun, 1);
    assert.equal(stats.totalProbabilityEvaluations, 2);
    assert.equal(stats.bestErrorAchieved, 0);
    assert.deepEqual(
      getUnlockedParityAchievements(progress, stats, PARITY_CHALLENGES).map(
        (achievement) => achievement.id,
      ),
      ['markov-beginner', 'probability-tuner', 'exact-thinker', 'chain-designer'],
    );
  });
});
