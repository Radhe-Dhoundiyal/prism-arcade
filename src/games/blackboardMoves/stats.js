import { getBrowserStorage, guardStorage } from '../../core/storage.js';
export const BLACKBOARD_STATS_STORAGE_KEY = 'prism-blackboard-moves-stats-v1';

export const DEFAULT_BLACKBOARD_STATS = {
  challengeAttempts: 0,
  challengesCompleted: 0,
  hintsUsed: 0,
  optimalCompletions: 0,
  totalMovesPlayed: 0,
  greedyBeatenCount: 0,
  labExperimentsRun: 0,
};

export const BLACKBOARD_ACHIEVEMENTS = [
  {
    id: 'first-move',
    title: 'First Move',
    description: 'Make your first blackboard move.',
  },
  {
    id: 'greedy-breaker',
    title: 'Greedy Breaker',
    description: 'Beat largest-largest greedy.',
  },
  {
    id: 'future-planner',
    title: 'Future Planner',
    description: 'Complete Forecast Trap.',
  },
  {
    id: 'optimalist',
    title: 'Optimalist',
    description: 'Earn your first Gold star.',
  },
  {
    id: 'researcher',
    title: 'Researcher',
    description: 'Run a Research Mode experiment.',
  },
];

export function loadBlackboardStats(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    const saved = JSON.parse(storage.getItem(BLACKBOARD_STATS_STORAGE_KEY));

    if (!saved || typeof saved !== 'object') {
      return DEFAULT_BLACKBOARD_STATS;
    }

    return {
      ...DEFAULT_BLACKBOARD_STATS,
      ...saved,
    };
  } catch {
    return DEFAULT_BLACKBOARD_STATS;
  }
}

export function saveBlackboardStats(stats, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(BLACKBOARD_STATS_STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

export function recordBlackboardMove(stats) {
  return {
    ...stats,
    totalMovesPlayed: stats.totalMovesPlayed + 1,
  };
}

export function recordBlackboardChallengeAttempt(stats, outcome) {
  return {
    ...stats,
    challengeAttempts: stats.challengeAttempts + 1,
    challengesCompleted: stats.challengesCompleted + (outcome.success ? 1 : 0),
    hintsUsed: stats.hintsUsed,
    optimalCompletions:
      stats.optimalCompletions + (outcome.success && outcome.stars === 3 ? 1 : 0),
    totalMovesPlayed: stats.totalMovesPlayed,
    greedyBeatenCount:
      stats.greedyBeatenCount + (outcome.success && outcome.beatGreedy ? 1 : 0),
  };
}

export function recordBlackboardHintUsed(stats) {
  return {
    ...stats,
    hintsUsed: stats.hintsUsed + 1,
  };
}

export function recordBlackboardLabExperiment(stats) {
  return {
    ...stats,
    labExperimentsRun: stats.labExperimentsRun + 1,
  };
}

export function getUnlockedBlackboardAchievements(progress, stats) {
  const goldCount = Object.values(progress.highestStars || {}).filter((stars) => stars >= 3).length;

  return BLACKBOARD_ACHIEVEMENTS.filter((achievement) => {
    if (achievement.id === 'first-move') {
      return stats.totalMovesPlayed > 0;
    }

    if (achievement.id === 'greedy-breaker') {
      return stats.greedyBeatenCount > 0;
    }

    if (achievement.id === 'future-planner') {
      return Boolean(progress.completed?.['forecast-trap-455']);
    }

    if (achievement.id === 'optimalist') {
      return goldCount > 0;
    }

    if (achievement.id === 'researcher') {
      return stats.labExperimentsRun > 0;
    }

    return false;
  });
}
