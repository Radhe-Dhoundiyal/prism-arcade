import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { filterKnownProgress } from '../../core/progress.js';
import {
  applyMove,
  canonicalBoardKey,
  generateLegalMoves,
  GREEDY_STRATEGIES,
  playGreedyToTerminal,
  searchMoveRange,
} from './logic.js';

export const BLACKBOARD_CHALLENGE_STORAGE_KEY = 'prism-blackboard-moves-challenge-v1';

export const BLACKBOARD_OBJECTIVES = {
  tutorial: 'tutorial',
  maximize: 'maximize',
  minimize: 'minimize',
  beatGreedy: 'beat-greedy',
  forecastTrap: 'forecast-trap',
};

export const BLACKBOARD_STARS = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const BLACKBOARD_CHALLENGES = [
  {
    id: 'tutorial-111',
    title: 'Tutorial: Forced Terminal Path',
    startState: [1, 1, 1],
    objectiveType: BLACKBOARD_OBJECTIVES.tutorial,
    targetMoves: 2,
    lesson: 'Every move is terminal-forcing here. Use it to feel the rule before optimizing.',
  },
  {
    id: 'maximize-22',
    title: 'Maximize: Twin Twos',
    startState: [2, 2],
    objectiveType: BLACKBOARD_OBJECTIVES.maximize,
    targetMoves: 2,
    lesson: 'Try to reach the exact maximum move count.',
  },
  {
    id: 'minimize-23',
    title: 'Minimize: Small Split',
    startState: [2, 3],
    objectiveType: BLACKBOARD_OBJECTIVES.minimize,
    targetMoves: 2,
    lesson: 'End the process in as few moves as exact search allows.',
  },
  {
    id: 'beat-greedy-455',
    title: 'Beat Greedy: 4,5,5',
    startState: [4, 5, 5],
    objectiveType: BLACKBOARD_OBJECTIVES.beatGreedy,
    targetMoves: 9,
    lesson: 'Largest-largest gets 9 moves. Find a longer terminal path.',
  },
  {
    id: 'forecast-trap-455',
    title: 'Forecast Trap: 4,5,5',
    startState: [4, 5, 5],
    objectiveType: BLACKBOARD_OBJECTIVES.forecastTrap,
    targetMoves: null,
    lesson: 'After your first move, select the next move that preserves the best future maximum.',
  },
  {
    id: 'prism-start-456',
    title: 'PRISM Start: 4,5,6',
    startState: [4, 5, 6],
    objectiveType: BLACKBOARD_OBJECTIVES.maximize,
    targetMoves: 19,
    lesson: 'Explore a PRISM-sized start state and try to match the exact maximum when available.',
  },
];

export function getDefaultBlackboardChallengeProgress() {
  return {
    completed: {},
    bestMoveCount: {},
    hintsUsed: {},
    highestStars: {},
  };
}

export function normalizeBlackboardChallengeProgress(saved) {
  saved = filterKnownProgress(saved, BLACKBOARD_CHALLENGES);
  const defaults = getDefaultBlackboardChallengeProgress();

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

export function loadBlackboardChallengeProgress(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    return normalizeBlackboardChallengeProgress(
      JSON.parse(storage?.getItem(BLACKBOARD_CHALLENGE_STORAGE_KEY) || 'null'),
    );
  } catch {
    return getDefaultBlackboardChallengeProgress();
  }
}

export function saveBlackboardChallengeProgress(
  progress,
  storage = getBrowserStorage(),
) {
  storage = guardStorage(storage);
  const normalized = normalizeBlackboardChallengeProgress(progress);

  storage?.setItem(BLACKBOARD_CHALLENGE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function recordBlackboardChallengeAttempt(progress, challengeId, attempt) {
  const normalized = normalizeBlackboardChallengeProgress(progress);
  const previousBest = normalized.bestMoveCount[challengeId];
  const moveCount = Number(attempt.moveCount) || 0;
  const hintsUsed = Number(attempt.hintsUsed) || 0;
  const stars = Number(attempt.stars) || BLACKBOARD_STARS.none;

  return {
    completed: {
      ...normalized.completed,
      [challengeId]: Boolean(normalized.completed[challengeId] || attempt.success),
    },
    bestMoveCount: {
      ...normalized.bestMoveCount,
      [challengeId]:
        typeof previousBest === 'number'
          ? Math.max(previousBest, moveCount)
          : moveCount,
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

export function isBlackboardChallengeUnlocked(challengeId, progress) {
  const index = BLACKBOARD_CHALLENGES.findIndex((challenge) => challenge.id === challengeId);

  if (index <= 0) {
    return index === 0;
  }

  return Boolean(progress.completed[BLACKBOARD_CHALLENGES[index - 1].id]);
}

export function getBlackboardChallengeSummary(challenge) {
  const range = searchMoveRange(challenge.startState);
  const greedy = playGreedyToTerminal(
    challenge.startState,
    GREEDY_STRATEGIES.largestLargest,
  );

  return {
    minMoves: range.minMoves,
    maxMoves: range.maxMoves,
    greedyLargestLargestMoves: greedy.moves,
  };
}

export function calculateBlackboardChallengeStars(challenge, attempt, summary = getBlackboardChallengeSummary(challenge)) {
  if (!attempt.success) {
    return BLACKBOARD_STARS.none;
  }

  const noHints = (Number(attempt.hintsUsed) || 0) === 0;
  let gold = false;

  if (
    challenge.objectiveType === BLACKBOARD_OBJECTIVES.maximize ||
    challenge.objectiveType === BLACKBOARD_OBJECTIVES.tutorial
  ) {
    gold = attempt.moveCount >= summary.maxMoves;
  } else if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.minimize) {
    gold = attempt.moveCount <= summary.minMoves;
  } else if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.beatGreedy) {
    gold = attempt.moveCount >= summary.maxMoves;
  } else if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.forecastTrap) {
    gold = Boolean(attempt.forecastMaxOptimal);
  }

  if (gold) {
    return BLACKBOARD_STARS.gold;
  }

  if (noHints) {
    return BLACKBOARD_STARS.silver;
  }

  return BLACKBOARD_STARS.bronze;
}

export function getChallengeExplanationCards(challenge, result, summary = getBlackboardChallengeSummary(challenge)) {
  const cards = [
    'Optimal play depends on preserving future legal moves.',
  ];

  if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.beatGreedy) {
    cards.unshift('The largest-looking move is not always globally best.');
  }

  if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.forecastTrap) {
    cards.unshift('A locally good move can reduce future branching.');
  }

  if (challenge.startState.join(',') === '4,5,5') {
    cards.push(
      `Largest-largest greedy reaches ${summary.greedyLargestLargestMoves} moves, but optimal play reaches ${summary.maxMoves}.`,
    );
  }

  if (result?.success) {
    cards.push('Your result met the exact-search objective for this prototype challenge.');
  }

  return cards;
}

export function validateBlackboardChallengeTargets(challenges = BLACKBOARD_CHALLENGES) {
  return challenges.map((challenge) => {
    const summary = getBlackboardChallengeSummary(challenge);
    let valid = true;

    if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.maximize) {
      valid = challenge.targetMoves === summary.maxMoves;
    } else if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.minimize) {
      valid = challenge.targetMoves === summary.minMoves;
    } else if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.beatGreedy) {
      valid = challenge.targetMoves === summary.greedyLargestLargestMoves;
    } else if (challenge.objectiveType === BLACKBOARD_OBJECTIVES.tutorial) {
      valid = challenge.targetMoves === summary.maxMoves;
    }

    return {
      id: challenge.id,
      valid,
      ...summary,
    };
  });
}

export function analyzeExactChallengeBranches(board) {
  const parentRange = searchMoveRange(board);
  const branches = generateLegalMoves(board).map((move) => {
    const resultingState = applyMove(board, move);
    const childRange = searchMoveRange(resultingState);
    const totalMaxMoves = 1 + childRange.maxMoves;

    return {
      move,
      chosenPair: [move.a, move.b],
      producedPair: [move.a + move.b, move.b - 1],
      resultingState,
      maxMoves: childRange.maxMoves,
      totalMaxMoves,
      optimalForMax: totalMaxMoves === parentRange.maxMoves,
    };
  });

  return {
    parentMaxMoves: parentRange.maxMoves,
    branches: branches.sort(
      (left, right) =>
        right.maxMoves - left.maxMoves ||
        canonicalBoardKey(left.resultingState).localeCompare(canonicalBoardKey(right.resultingState)),
    ),
  };
}

export function isForecastMaxOptimalMove(board, move) {
  if (!move) {
    return false;
  }

  const resultingStateKey = canonicalBoardKey(applyMove(board, move));
  const branch = analyzeExactChallengeBranches(board).branches.find(
    (candidate) =>
      canonicalBoardKey(candidate.resultingState) === resultingStateKey &&
      candidate.chosenPair[0] === move.a &&
      candidate.chosenPair[1] === move.b,
  );

  return Boolean(branch?.optimalForMax);
}
