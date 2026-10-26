import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { filterKnownProgress } from '../../core/progress.js';
import {
  analyzeLoops,
  applyThreeShift,
  createIdentityPermutation,
  formatCycleType,
  getAllThreeShiftMoves,
  ROTATION_DIRECTIONS,
} from './logic.js';

export const LOOP_STRINGS_CHALLENGE_STORAGE_KEY = 'prism-loop-strings-challenge-v1';
export const LOOP_STRINGS_BFS_MAX_N = 7;
export const LOOP_STRINGS_BFS_MAX_STATES = 6000;

export const LOOP_STARS = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const LOOP_TARGET_TYPES = {
  cycleType: 'cycleType',
  shortestLoop: 'shortestLoop',
  fullCycle: 'fullCycle',
  loopCount: 'loopCount',
};

export const LOOP_CHALLENGES = [
  {
    id: 'first-twist',
    title: 'First Twist',
    n: 3,
    targetType: LOOP_TARGET_TYPES.cycleType,
    targetValue: [3],
    lesson: 'A single 3-shift creates a 3-cycle.',
  },
  {
    id: 'two-loops',
    title: 'Two Loops',
    n: 4,
    targetType: LOOP_TARGET_TYPES.shortestLoop,
    targetValue: 2,
    lesson: 'Pair structures can appear through even permutations.',
  },
  {
    id: 'seven-cycle',
    title: 'Seven-Cycle',
    n: 7,
    targetType: LOOP_TARGET_TYPES.cycleType,
    targetValue: [7],
    lesson: 'A 7-cycle is even and reachable.',
  },
  {
    id: 'shortest-two',
    title: 'Shortest Two',
    n: 7,
    targetType: LOOP_TARGET_TYPES.shortestLoop,
    targetValue: 2,
    lesson: 'For n=7, shortest 2 comes from cycle type 2+2+3.',
  },
  {
    id: 'exact-type-223',
    title: 'Exact Type 2+2+3',
    n: 7,
    targetType: LOOP_TARGET_TYPES.cycleType,
    targetValue: [2, 2, 3],
    lesson: 'This is the counted case giving 105 loop groupings.',
  },
  {
    id: 'fewest-loops',
    title: 'Fewest Loops',
    n: 7,
    targetType: LOOP_TARGET_TYPES.loopCount,
    targetValue: 1,
    lesson: 'One loop means all strings are connected together.',
  },
];

function keyForPermutation(permutation) {
  return permutation.join(',');
}

function normalizeCycleType(cycleType) {
  return [...cycleType].map(Number).sort((a, b) => a - b);
}

export function getChallengeTargetLabel(challenge) {
  if (challenge.targetType === LOOP_TARGET_TYPES.cycleType) {
    return `Cycle type ${formatCycleType(normalizeCycleType(challenge.targetValue))}`;
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.shortestLoop) {
    return `Shortest loop size ${challenge.targetValue}`;
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.fullCycle) {
    return `One full ${challenge.n}-cycle`;
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.loopCount) {
    return `${challenge.targetValue} loop${challenge.targetValue === 1 ? '' : 's'}`;
  }

  return 'Unknown target';
}

export function doesPermutationMatchChallenge(permutation, challenge) {
  const analysis = analyzeLoops(permutation);

  if (challenge.targetType === LOOP_TARGET_TYPES.cycleType) {
    return (
      formatCycleType(analysis.cycleType) ===
      formatCycleType(normalizeCycleType(challenge.targetValue))
    );
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.shortestLoop) {
    return analysis.shortestLoopSize === challenge.targetValue;
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.fullCycle) {
    return analysis.loopCount === 1 && analysis.cycleType[0] === challenge.n;
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.loopCount) {
    return analysis.loopCount === challenge.targetValue;
  }

  return false;
}

export function getChallengeMissingMessage(permutation, challenge) {
  const analysis = analyzeLoops(permutation);
  const targetLabel = getChallengeTargetLabel(challenge);

  if (doesPermutationMatchChallenge(permutation, challenge)) {
    return 'Target reached.';
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.cycleType) {
    return `Target is ${targetLabel}; current cycle type is ${formatCycleType(analysis.cycleType)}.`;
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.shortestLoop) {
    return `Target is ${targetLabel}; current shortest loop is ${analysis.shortestLoopSize}.`;
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.fullCycle) {
    return `Target is ${targetLabel}; current loop count is ${analysis.loopCount}.`;
  }

  if (challenge.targetType === LOOP_TARGET_TYPES.loopCount) {
    return `Target is ${targetLabel}; current loop count is ${analysis.loopCount}.`;
  }

  return 'Target not reached yet.';
}

export function findChallengePath(
  startPermutation,
  challenge,
  {
    maxN = LOOP_STRINGS_BFS_MAX_N,
    maxStates = LOOP_STRINGS_BFS_MAX_STATES,
  } = {},
) {
  const start = [...startPermutation];
  maxN = Math.min(LOOP_STRINGS_BFS_MAX_N, Math.max(1, Number(maxN) || 1));
  maxStates = Math.min(LOOP_STRINGS_BFS_MAX_STATES, Math.max(1, Math.floor(Number(maxStates) || 1)));

  if (start.length > maxN) {
    return { available: false, reason: `Hints are capped at n <= ${maxN}.`, path: [] };
  }

  if (doesPermutationMatchChallenge(start, challenge)) {
    return { available: true, reason: 'Already at target.', path: [] };
  }

  const moves = getAllThreeShiftMoves(start.length);
  const queue = [{ permutation: start, path: [] }];
  const seen = new Set([keyForPermutation(start)]);

  for (let index = 0; index < queue.length && seen.size <= maxStates; index += 1) {
    const state = queue[index];

    for (const move of moves) {
      const next = applyThreeShift(state.permutation, move.labels, move.direction);
      const key = keyForPermutation(next);

      if (seen.has(key)) {
        continue;
      }

      if (seen.size >= maxStates) return { available: false, reason: `No path found within ${maxStates} states.`, path: [] };

      const path = [...state.path, { ...move, permutation: next }];

      if (doesPermutationMatchChallenge(next, challenge)) {
        return { available: true, reason: 'Path found.', path };
      }

      seen.add(key);
      queue.push({ permutation: next, path });
    }
  }

  return {
    available: false,
    reason: `No path found within ${maxStates} states.`,
    path: [],
  };
}

export function getDefaultLoopChallengeProgress() {
  return {
    completed: {},
    bestMoveCount: {},
    hintsUsed: {},
    highestStars: {},
  };
}

export function normalizeLoopChallengeProgress(saved) {
  saved = filterKnownProgress(saved, LOOP_CHALLENGES);
  const defaults = getDefaultLoopChallengeProgress();

  if (!saved || typeof saved !== 'object') {
    return defaults;
  }

  return {
    completed:
      saved.completed && typeof saved.completed === 'object' ? saved.completed : defaults.completed,
    bestMoveCount:
      saved.bestMoveCount && typeof saved.bestMoveCount === 'object'
        ? saved.bestMoveCount
        : defaults.bestMoveCount,
    hintsUsed:
      saved.hintsUsed && typeof saved.hintsUsed === 'object' ? saved.hintsUsed : defaults.hintsUsed,
    highestStars:
      saved.highestStars && typeof saved.highestStars === 'object'
        ? saved.highestStars
        : defaults.highestStars,
  };
}

export function loadLoopChallengeProgress(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    return normalizeLoopChallengeProgress(
      JSON.parse(storage?.getItem(LOOP_STRINGS_CHALLENGE_STORAGE_KEY) || 'null'),
    );
  } catch {
    return getDefaultLoopChallengeProgress();
  }
}

export function saveLoopChallengeProgress(progress, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  const normalized = normalizeLoopChallengeProgress(progress);
  storage?.setItem(LOOP_STRINGS_CHALLENGE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function recordLoopChallengeAttempt(progress, challengeId, attempt) {
  const normalized = normalizeLoopChallengeProgress(progress);
  const previousBest = normalized.bestMoveCount[challengeId];
  const moveCount = Number(attempt.moveCount) || 0;
  const hintsUsed = Number(attempt.hintsUsed) || 0;
  const stars = Number(attempt.stars) || LOOP_STARS.none;
  const nextBest =
    attempt.success && typeof previousBest === 'number'
      ? Math.min(previousBest, moveCount)
      : attempt.success
        ? moveCount
        : previousBest;

  return {
    completed: {
      ...normalized.completed,
      [challengeId]: Boolean(normalized.completed[challengeId] || attempt.success),
    },
    bestMoveCount: {
      ...normalized.bestMoveCount,
      ...(typeof nextBest === 'number' ? { [challengeId]: nextBest } : {}),
    },
    hintsUsed: {
      ...normalized.hintsUsed,
      [challengeId]: (normalized.hintsUsed[challengeId] || 0) + hintsUsed,
    },
    highestStars: {
      ...normalized.highestStars,
      [challengeId]: Math.max(normalized.highestStars[challengeId] || 0, stars),
    },
  };
}

export function recordLoopChallengeHint(progress, challengeId) {
  const normalized = normalizeLoopChallengeProgress(progress);

  return {
    ...normalized,
    hintsUsed: {
      ...normalized.hintsUsed,
      [challengeId]: (normalized.hintsUsed[challengeId] || 0) + 1,
    },
  };
}

export function isLoopChallengeUnlocked(challengeId, progress) {
  const normalized = normalizeLoopChallengeProgress(progress);
  const index = LOOP_CHALLENGES.findIndex((challenge) => challenge.id === challengeId);

  if (index <= 0) {
    return index === 0;
  }

  return Boolean(normalized.completed[LOOP_CHALLENGES[index - 1].id]);
}

export function getLoopChallengeStatus(challengeId, progress) {
  const normalized = normalizeLoopChallengeProgress(progress);

  if (normalized.completed[challengeId]) {
    return 'Completed';
  }

  return isLoopChallengeUnlocked(challengeId, normalized) ? 'Unlocked' : 'Locked';
}

export function getShortestKnownPathLength(challenge) {
  const path = findChallengePath(createIdentityPermutation(challenge.n), challenge);

  return path.available ? path.path.length : null;
}

export function calculateLoopChallengeStars(challenge, attempt) {
  if (!attempt.success) {
    return LOOP_STARS.none;
  }

  const shortestKnown = getShortestKnownPathLength(challenge);
  const noHints = (Number(attempt.hintsUsed) || 0) === 0;
  const moveCount = Number(attempt.moveCount) || 0;

  if (shortestKnown !== null && moveCount <= shortestKnown) {
    return LOOP_STARS.gold;
  }

  if (noHints) {
    return LOOP_STARS.silver;
  }

  return LOOP_STARS.bronze;
}

export function getLoopChallengeExplanationCards(challenge) {
  const cards = [
    'A 3-shift is a 3-cycle.',
    '3-cycles are even permutations.',
    'Loop groups are cycle decomposition.',
  ];

  if (challenge.n === 7) {
    cards.push('For n=7, shortest loop sizes can only be 1, 2, or 7.');
  }

  if (challenge.id === 'exact-type-223') {
    cards.push('This is the counted case: 105 loop groupings and 210 actual permutations.');
  }

  return cards;
}

export function validateLoopChallenges(challenges = LOOP_CHALLENGES) {
  return challenges.map((challenge) => {
    const path = findChallengePath(createIdentityPermutation(challenge.n), challenge);
    const validTarget =
      Number.isInteger(challenge.n) &&
      challenge.n >= 3 &&
      Object.values(LOOP_TARGET_TYPES).includes(challenge.targetType);

    return {
      id: challenge.id,
      valid: validTarget && path.available,
      pathLength: path.path.length,
      target: getChallengeTargetLabel(challenge),
    };
  });
}

export function getMoveLabel(move) {
  const direction =
    move.direction === ROTATION_DIRECTIONS.counterclockwise ? 'counterclockwise' : 'clockwise';

  return `${move.labels.join(', ')} ${direction}`;
}
