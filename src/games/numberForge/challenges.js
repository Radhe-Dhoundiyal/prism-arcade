import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import {
  analyzeReachability,
  detectReduction,
  getPrismResultCard,
  getReducedMissingValues,
  recoverRepresentation,
} from './logic.js';

export const NUMBER_FORGE_CHALLENGE_STORAGE_KEY = 'prism-number-forge-challenge-v1';

export const NUMBER_FORGE_CHALLENGES = [
  {
    id: 'build-39',
    title: 'Build 39',
    generators: [9, 15, 25],
    target: 39,
    moveLimit: 4,
    impossible: false,
    lesson: 'Start with a reachable target that can be made in several ways.',
  },
  {
    id: 'build-43',
    title: 'Build 43',
    generators: [9, 15, 25],
    target: 43,
    moveLimit: 3,
    impossible: false,
    lesson: 'The generator 25 changes the residue class mod 3.',
  },
  {
    id: 'prove-7',
    title: 'Prove 7 Impossible',
    generators: [9, 15, 25],
    target: 7,
    moveLimit: null,
    impossible: true,
    lesson: 'Small numbers below every generator can expose immediate impossibility.',
  },
  {
    id: 'build-72',
    title: 'Build 72',
    generators: [9, 15, 25],
    target: 72,
    moveLimit: 8,
    impossible: false,
    lesson: 'This is the threshold where the 9,15,25 forge settles into reachability.',
  },
  {
    id: 'prove-71',
    title: 'Find Why 71 Is Impossible',
    generators: [9, 15, 25],
    target: 71,
    moveLimit: null,
    impossible: true,
    lesson: 'Reduction explains the largest missed value for 9,15,25.',
  },
  {
    id: 'build-132',
    title: 'Build 132',
    generators: [9, 21, 49],
    target: 132,
    moveLimit: 8,
    impossible: false,
    lesson: 'This is the reachability threshold for the 9,21,49 forge.',
  },
  {
    id: 'prove-131',
    title: 'Prove 131 Impossible',
    generators: [9, 21, 49],
    target: 131,
    moveLimit: null,
    impossible: true,
    lesson: 'The reduced 3,7 forge explains why 131 is the last missed value.',
  },
  {
    id: 'free-100',
    title: 'Free Forge: Build 100',
    generators: [9, 15, 25],
    target: 100,
    moveLimit: null,
    impossible: false,
    lesson: 'Use the forge freely and find any construction.',
  },
];

export const DEFAULT_NUMBER_FORGE_PROGRESS = {
  completedLevels: {},
  bestMoves: {},
  hintsUsed: {},
  highestStars: {},
};

export function validateChallenge(challenge) {
  const analysis = analyzeReachability(challenge.generators, challenge.target);
  const representation = recoverRepresentation(analysis, challenge.target);
  const reachable = Boolean(representation);

  return {
    reachable,
    valid: reachable !== challenge.impossible,
    representation,
  };
}

export function getMinimumGeneratorCount(challenge) {
  if (challenge.impossible) {
    return null;
  }

  const target = challenge.target;
  const best = Array(target + 1).fill(Number.POSITIVE_INFINITY);
  best[0] = 0;

  for (let value = 0; value <= target; value += 1) {
    if (!Number.isFinite(best[value])) {
      continue;
    }

    challenge.generators.forEach((generator) => {
      const next = value + generator;

      if (next <= target) {
        best[next] = Math.min(best[next], best[value] + 1);
      }
    });
  }

  return Number.isFinite(best[target]) ? best[target] : null;
}

export function calculateChallengeStars(challenge, outcome) {
  if (!outcome.success) {
    return 0;
  }

  if (challenge.impossible) {
    if (outcome.reductionOpened) {
      return 3;
    }

    if (!outcome.hintUsed) {
      return 2;
    }

    return 1;
  }

  const minimumCount = getMinimumGeneratorCount(challenge);

  if (minimumCount !== null && outcome.moveCount <= minimumCount) {
    return 3;
  }

  if (!outcome.hintUsed) {
    return 2;
  }

  return 1;
}

export function getChallengeStatus(challenge, index, progress) {
  if (progress.completedLevels[challenge.id]) {
    return 'Completed';
  }

  if (index === 0 || progress.completedLevels[NUMBER_FORGE_CHALLENGES[index - 1]?.id]) {
    return 'Unlocked';
  }

  return 'Locked';
}

export function getInsightCard(challenge) {
  if (challenge.id === 'prove-7') {
    return '7 is impossible because the reduced forge 3a+5b cannot generate 1,2,4,7.';
  }

  if (challenge.id === 'prove-71') {
    return '71 is the largest missed value for the 9,15,25 forge.';
  }

  if (challenge.id === 'prove-131') {
    return '131 is the largest missed value for the 9,21,49 forge.';
  }

  const reduction = detectReduction(challenge.generators, Math.max(challenge.target, 200));
  const prismResult = getPrismResultCard(challenge.generators);

  if (prismResult) {
    return `For ${challenge.generators.join(',')}, every N >= ${prismResult.allReachableFrom} is reachable.`;
  }

  if (reduction) {
    return `The forge reduces to ${reduction.reducedGenerators.join('a + ')}b after choosing the residue controller.`;
  }

  return 'A number is reachable exactly when some nonnegative combination of the generators equals it.';
}

export function getImpossibleHint(challenge) {
  const reduction = detectReduction(challenge.generators, Math.max(challenge.target, 200));

  if (!reduction) {
    return 'No representation appears in the reachability analysis.';
  }

  return `Reduction: ${reduction.divisibleGenerators.join(', ')} are divisible by ${reduction.modulus}; ${reduction.controllerGenerator} controls residues. Reduced misses include ${getReducedMissingValues(reduction.reducedGenerators).join(', ')}.`;
}

export function evaluateChallengeAttempt(challenge, sum, declaredImpossible = false) {
  const { reachable } = validateChallenge(challenge);

  if (declaredImpossible) {
    return {
      success: !reachable,
      reason: reachable ? 'This number is reachable. Try building it.' : 'Correct: no representation exists.',
    };
  }

  if (!reachable) {
    return {
      success: false,
      reason: 'This is impossible. Declare it impossible when you are convinced.',
    };
  }

  return {
    success: sum === challenge.target,
    reason: sum === challenge.target
      ? 'Target forged exactly.'
      : `Current sum is ${Math.abs(challenge.target - sum)} away from the target.`,
  };
}

export function loadNumberForgeProgress(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    const saved = JSON.parse(storage.getItem(NUMBER_FORGE_CHALLENGE_STORAGE_KEY));

    if (!saved || typeof saved !== 'object') {
      return DEFAULT_NUMBER_FORGE_PROGRESS;
    }

    return {
      ...DEFAULT_NUMBER_FORGE_PROGRESS,
      ...saved,
      completedLevels: {
        ...DEFAULT_NUMBER_FORGE_PROGRESS.completedLevels,
        ...saved.completedLevels,
      },
      bestMoves: {
        ...DEFAULT_NUMBER_FORGE_PROGRESS.bestMoves,
        ...saved.bestMoves,
      },
      hintsUsed: {
        ...DEFAULT_NUMBER_FORGE_PROGRESS.hintsUsed,
        ...saved.hintsUsed,
      },
      highestStars: {
        ...DEFAULT_NUMBER_FORGE_PROGRESS.highestStars,
        ...saved.highestStars,
      },
    };
  } catch {
    return DEFAULT_NUMBER_FORGE_PROGRESS;
  }
}

export function saveNumberForgeProgress(progress, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(NUMBER_FORGE_CHALLENGE_STORAGE_KEY, JSON.stringify(progress));
}

export function completeNumberForgeChallenge(progress, challenge, moveCount, hintUsed, stars = 1) {
  return {
    ...progress,
    completedLevels: {
      ...progress.completedLevels,
      [challenge.id]: true,
    },
    bestMoves: {
      ...progress.bestMoves,
      [challenge.id]: Math.min(progress.bestMoves[challenge.id] ?? Number.POSITIVE_INFINITY, moveCount),
    },
    hintsUsed: {
      ...progress.hintsUsed,
      [challenge.id]: Boolean(progress.hintsUsed[challenge.id] || hintUsed),
    },
    highestStars: {
      ...progress.highestStars,
      [challenge.id]: Math.max(progress.highestStars[challenge.id] || 0, stars),
    },
  };
}
