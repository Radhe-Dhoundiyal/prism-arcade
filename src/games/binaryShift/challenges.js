import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { filterKnownProgress } from '../../core/progress.js';
import {
  evaluateBinaryShift,
  formatBigInt,
  getDivisibilityRow,
} from './logic.js';

export const BINARY_SHIFT_CHALLENGE_STORAGE_KEY = 'prism-binary-shift-challenge-v1';

export const BINARY_SHIFT_STARS = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const BINARY_SHIFT_CHALLENGES = [
  {
    id: 'first-special',
    title: 'First Special',
    n: 2,
    lesson: 'The smallest case shows the rule exactly: 01 rotates to 10.',
  },
  {
    id: 'no-solution',
    title: 'No Solution',
    n: 3,
    lesson: 'Not every n creates an integer from the divisibility formula.',
  },
  {
    id: 'another-failure',
    title: 'Another Failure',
    n: 4,
    lesson: 'The obstruction is arithmetic, not a failure to search long enough.',
  },
  {
    id: 'hidden-success',
    title: 'Hidden Success',
    n: 8,
    lesson: 'A later success appears when 2n - 1 divides 2^n - 1.',
  },
  {
    id: 'search-case',
    title: 'Search Case',
    n: 10,
    lesson: 'Use the formula before trying to guess a binary string.',
  },
  {
    id: 'large-case',
    title: 'Large Case',
    n: 16,
    lesson: 'BigInt arithmetic keeps the same divisibility test reliable.',
  },
];

export function getDefaultBinaryShiftProgress() {
  return {
    completed: {},
    hintsUsed: {},
    bestAnswerStatus: {},
    highestStars: {},
  };
}

export function normalizeBinaryShiftProgress(value) {
  value = filterKnownProgress(value, BINARY_SHIFT_CHALLENGES);
  return {
    ...getDefaultBinaryShiftProgress(),
    ...(value && typeof value === 'object' ? value : {}),
    completed: {
      ...(value && typeof value.completed === 'object' ? value.completed : {}),
    },
    hintsUsed: {
      ...(value && typeof value.hintsUsed === 'object' ? value.hintsUsed : {}),
    },
    bestAnswerStatus: {
      ...(value && typeof value.bestAnswerStatus === 'object' ? value.bestAnswerStatus : {}),
    },
    highestStars: {
      ...(value && typeof value.highestStars === 'object' ? value.highestStars : {}),
    },
  };
}

export function loadBinaryShiftProgress(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  if (!storage) {
    return getDefaultBinaryShiftProgress();
  }

  try {
    return normalizeBinaryShiftProgress(
      JSON.parse(storage.getItem(BINARY_SHIFT_CHALLENGE_STORAGE_KEY) || 'null'),
    );
  } catch {
    return getDefaultBinaryShiftProgress();
  }
}

export function saveBinaryShiftProgress(progress, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  if (!storage) {
    return;
  }

  storage.setItem(
    BINARY_SHIFT_CHALLENGE_STORAGE_KEY,
    JSON.stringify(normalizeBinaryShiftProgress(progress)),
  );
}

export function calculateBinaryShiftStars(result, hintsUsed = 0) {
  if (!result?.success) {
    return BINARY_SHIFT_STARS.none;
  }

  if (hintsUsed <= 0) {
    return BINARY_SHIFT_STARS.gold;
  }

  if (hintsUsed <= 1) {
    return BINARY_SHIFT_STARS.silver;
  }

  return BINARY_SHIFT_STARS.bronze;
}

export function getBinaryShiftAnswerStatus(result) {
  if (!result?.success) {
    return null;
  }

  return result.solutionExists ? 'Correct x' : 'Correct impossible';
}

export function recordBinaryShiftCompletion(
  progress,
  challengeId,
  result = null,
  stars = BINARY_SHIFT_STARS.bronze,
) {
  const normalized = normalizeBinaryShiftProgress(progress);
  const previousStars = normalized.highestStars[challengeId] || BINARY_SHIFT_STARS.none;
  const answerStatus = getBinaryShiftAnswerStatus(result) || normalized.bestAnswerStatus[challengeId];

  return {
    ...normalized,
    completed: {
      ...normalized.completed,
      [challengeId]: true,
    },
    bestAnswerStatus: {
      ...normalized.bestAnswerStatus,
      ...(answerStatus ? { [challengeId]: answerStatus } : {}),
    },
    highestStars: {
      ...normalized.highestStars,
      [challengeId]: Math.max(previousStars, stars),
    },
  };
}

export function recordBinaryShiftHint(progress, challengeId) {
  const normalized = normalizeBinaryShiftProgress(progress);
  const currentHints = normalized.hintsUsed[challengeId] || 0;

  return {
    ...normalized,
    hintsUsed: {
      ...normalized.hintsUsed,
      [challengeId]: Math.min(3, currentHints + 1),
    },
  };
}

export function getBinaryShiftHint(challenge, hintLevel) {
  const row = getDivisibilityRow(challenge.n);

  if (hintLevel <= 1) {
    return `2n - 1 = ${formatBigInt(row.divisor)}.`;
  }

  if (hintLevel === 2) {
    return `Check whether ${formatBigInt(row.divisor)} divides ${formatBigInt(row.mersenne)}.`;
  }

  return row.divisible
    ? `x = (2^n - 1)/(2n - 1) = ${formatBigInt(row.x)}.`
    : `(2^n - 1)/(2n - 1) is not an integer, so no special x exists.`;
}

export function isBinaryShiftChallengeUnlocked(challengeId, progress, challenges = BINARY_SHIFT_CHALLENGES) {
  const normalized = normalizeBinaryShiftProgress(progress);
  const index = challenges.findIndex((challenge) => challenge.id === challengeId);

  if (index <= 0) {
    return index === 0;
  }

  return Boolean(normalized.completed[challenges[index - 1].id]);
}

export function getBinaryShiftChallengeStatus(challengeId, progress, challenges = BINARY_SHIFT_CHALLENGES) {
  const normalized = normalizeBinaryShiftProgress(progress);

  if (normalized.completed[challengeId]) {
    return 'Completed';
  }

  return isBinaryShiftChallengeUnlocked(challengeId, normalized, challenges) ? 'Unlocked' : 'Locked';
}

export function evaluateBinaryShiftChallenge(challenge, attempt) {
  const row = getDivisibilityRow(challenge.n);
  const solutionExists = row.special;

  if (attempt.declareImpossible) {
    return {
      challengeId: challenge.id,
      success: !solutionExists,
      solutionExists,
      expectedX: row.x,
      reason: solutionExists
        ? `A solution exists: x = ${formatBigInt(row.x)}.`
        : 'Correct. The divisibility condition fails, so no special x exists.',
      explanation: row,
    };
  }

  const evaluation = evaluateBinaryShift({ n: challenge.n, x: attempt.x });
  const success = solutionExists && evaluation.special && evaluation.x === row.x;

  return {
    challengeId: challenge.id,
    success,
    solutionExists,
    expectedX: row.x,
    evaluation,
    reason: success
      ? `Correct. x = ${formatBigInt(row.x)} is n-binarily special.`
      : solutionExists
        ? 'That x is not special for this n.'
        : 'No special x exists for this n. Declare impossible.',
    explanation: row,
  };
}
