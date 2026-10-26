import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { LOOP_STARS, normalizeLoopChallengeProgress } from './challenges.js';

export const LOOP_STRINGS_STATS_STORAGE_KEY = 'prism-loop-strings-stats-v1';

export function getDefaultLoopStats() {
  return {
    challengeAttempts: 0,
    challengesCompleted: 0,
    hintsUsed: 0,
    goldCompletions: 0,
    totalShiftsMade: 0,
    explorerShiftsMade: 0,
    bfsSolutionsViewed: 0,
    sevenCycleCreated: false,
  };
}

export function normalizeLoopStats(saved) {
  const defaults = getDefaultLoopStats();

  if (!saved || typeof saved !== 'object') {
    return defaults;
  }

  return {
    challengeAttempts: Number(saved.challengeAttempts) || 0,
    challengesCompleted: Number(saved.challengesCompleted) || 0,
    hintsUsed: Number(saved.hintsUsed) || 0,
    goldCompletions: Number(saved.goldCompletions) || 0,
    totalShiftsMade: Number(saved.totalShiftsMade) || 0,
    explorerShiftsMade: Number(saved.explorerShiftsMade) || 0,
    bfsSolutionsViewed: Number(saved.bfsSolutionsViewed) || 0,
    sevenCycleCreated: Boolean(saved.sevenCycleCreated),
  };
}

export function loadLoopStats(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    return normalizeLoopStats(
      JSON.parse(storage?.getItem(LOOP_STRINGS_STATS_STORAGE_KEY) || 'null'),
    );
  } catch {
    return getDefaultLoopStats();
  }
}

export function saveLoopStats(stats, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  const normalized = normalizeLoopStats(stats);
  storage?.setItem(LOOP_STRINGS_STATS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function recordLoopShift(stats, { explorer = false, cycleType = [] } = {}) {
  const normalized = normalizeLoopStats(stats);

  return {
    ...normalized,
    totalShiftsMade: normalized.totalShiftsMade + 1,
    explorerShiftsMade: normalized.explorerShiftsMade + (explorer ? 1 : 0),
    sevenCycleCreated:
      normalized.sevenCycleCreated || (cycleType.length === 1 && cycleType[0] === 7),
  };
}

export function recordLoopChallengeStats(stats, progress, attempt) {
  const normalized = normalizeLoopStats(stats);
  const normalizedProgress = normalizeLoopChallengeProgress(progress);

  return {
    ...normalized,
    challengeAttempts: normalized.challengeAttempts + 1,
    challengesCompleted: Object.values(normalizedProgress.completed).filter(Boolean).length,
    goldCompletions: Object.values(normalizedProgress.highestStars).filter(
      (stars) => stars >= LOOP_STARS.gold,
    ).length,
    sevenCycleCreated:
      normalized.sevenCycleCreated ||
      Boolean(attempt?.cycleType?.length === 1 && attempt.cycleType[0] === 7),
  };
}

export function recordLoopHint(stats) {
  const normalized = normalizeLoopStats(stats);

  return {
    ...normalized,
    hintsUsed: normalized.hintsUsed + 1,
  };
}

export function recordLoopSolutionViewed(stats) {
  const normalized = normalizeLoopStats(stats);

  return {
    ...normalized,
    bfsSolutionsViewed: normalized.bfsSolutionsViewed + 1,
  };
}

export const LOOP_ACHIEVEMENTS = [
  {
    id: 'first-twist-shift',
    title: 'First Twist',
    description: 'Perform your first 3-shift.',
  },
  {
    id: 'cycle-hunter',
    title: 'Cycle Hunter',
    description: 'Complete your first Loop Strings challenge.',
  },
  {
    id: 'parity-master',
    title: 'Parity Master',
    description: 'Complete a challenge without hints.',
  },
  {
    id: 'seven-connected',
    title: 'Seven Connected',
    description: 'Create a 7-cycle.',
  },
  {
    id: 'minimal-loops',
    title: 'Minimal Loops',
    description: 'Complete Fewest Loops.',
  },
];

export function getUnlockedLoopAchievements(progress, stats) {
  const normalizedProgress = normalizeLoopChallengeProgress(progress);
  const normalizedStats = normalizeLoopStats(stats);
  const completedCount = Object.values(normalizedProgress.completed).filter(Boolean).length;

  return LOOP_ACHIEVEMENTS.filter((achievement) => {
    if (achievement.id === 'first-twist-shift') {
      return normalizedStats.totalShiftsMade > 0;
    }

    if (achievement.id === 'cycle-hunter') {
      return completedCount > 0;
    }

    if (achievement.id === 'parity-master') {
      return Object.values(normalizedProgress.highestStars).some(
        (stars) => stars >= LOOP_STARS.silver,
      );
    }

    if (achievement.id === 'seven-connected') {
      return normalizedStats.sevenCycleCreated || Boolean(normalizedProgress.completed['seven-cycle']);
    }

    if (achievement.id === 'minimal-loops') {
      return Boolean(normalizedProgress.completed['fewest-loops']);
    }

    return false;
  });
}

export function getLoopChallengeStatsSummary(progress, stats) {
  const normalizedProgress = normalizeLoopChallengeProgress(progress);
  const normalizedStats = normalizeLoopStats(stats);

  return {
    ...normalizedStats,
    challengesCompleted: Object.values(normalizedProgress.completed).filter(Boolean).length,
    goldCompletions: Object.values(normalizedProgress.highestStars).filter(
      (stars) => stars >= LOOP_STARS.gold,
    ).length,
  };
}
