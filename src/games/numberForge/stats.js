import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { NUMBER_FORGE_CHALLENGES } from './challenges.js';

export const NUMBER_FORGE_STATS_STORAGE_KEY = 'prism-number-forge-stats-v1';

export const DEFAULT_NUMBER_FORGE_STATS = {
  challengesAttempted: 0,
  challengesCompleted: 0,
  impossibleDeclarationsCorrect: 0,
  impossibleDeclarationsIncorrect: 0,
  hintsUsed: 0,
  totalGeneratorsPlaced: 0,
  bestGoldCompletions: 0,
};

export const FORGE_ACHIEVEMENTS = [
  {
    id: 'first-construction',
    title: 'First Construction',
    description: 'Complete your first challenge.',
  },
  {
    id: 'impossible-detector',
    title: 'Impossible Detector',
    description: 'Correctly solve one impossible challenge.',
  },
  {
    id: 'reductionist',
    title: 'Reductionist',
    description: 'Use a Reduction Engine hint.',
  },
  {
    id: 'perfect-forge',
    title: 'Perfect Forge',
    description: 'Earn your first Gold star.',
  },
  {
    id: 'master-smith',
    title: 'Master Smith',
    description: 'Complete all starter challenges.',
  },
];

export function loadNumberForgeStats(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    const saved = JSON.parse(storage.getItem(NUMBER_FORGE_STATS_STORAGE_KEY));

    if (!saved || typeof saved !== 'object') {
      return DEFAULT_NUMBER_FORGE_STATS;
    }

    return {
      ...DEFAULT_NUMBER_FORGE_STATS,
      ...saved,
    };
  } catch {
    return DEFAULT_NUMBER_FORGE_STATS;
  }
}

export function saveNumberForgeStats(stats, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(NUMBER_FORGE_STATS_STORAGE_KEY, JSON.stringify(stats));
}

export function recordNumberForgeAttempt(stats, outcome) {
  return {
    ...stats,
    challengesAttempted: stats.challengesAttempted + 1,
    challengesCompleted: stats.challengesCompleted + (outcome.success ? 1 : 0),
    impossibleDeclarationsCorrect:
      stats.impossibleDeclarationsCorrect +
      (outcome.declaredImpossible && outcome.success ? 1 : 0),
    impossibleDeclarationsIncorrect:
      stats.impossibleDeclarationsIncorrect +
      (outcome.declaredImpossible && !outcome.success ? 1 : 0),
    hintsUsed: stats.hintsUsed + (outcome.hintUsed ? 1 : 0),
    totalGeneratorsPlaced: stats.totalGeneratorsPlaced + outcome.moveCount,
    bestGoldCompletions: stats.bestGoldCompletions + (outcome.stars === 3 && outcome.success ? 1 : 0),
  };
}

export function getUnlockedAchievements(progress, stats) {
  const completedIds = NUMBER_FORGE_CHALLENGES.filter((challenge) => progress.completedLevels[challenge.id] === true).map((challenge) => challenge.id);
  const impossibleIds = new Set(
    NUMBER_FORGE_CHALLENGES.filter((challenge) => challenge.impossible).map((challenge) => challenge.id),
  );
  const goldCount = NUMBER_FORGE_CHALLENGES.filter((challenge) => progress.highestStars?.[challenge.id] >= 3).length;

  return FORGE_ACHIEVEMENTS.filter((achievement) => {
    if (achievement.id === 'first-construction') {
      return completedIds.length > 0;
    }

    if (achievement.id === 'impossible-detector') {
      return completedIds.some((id) => impossibleIds.has(id));
    }

    if (achievement.id === 'reductionist') {
      return stats.hintsUsed > 0;
    }

    if (achievement.id === 'perfect-forge') {
      return goldCount > 0;
    }

    if (achievement.id === 'master-smith') {
      return completedIds.length === NUMBER_FORGE_CHALLENGES.length;
    }

    return false;
  });
}
