import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { PARITY_ALLOWED_CONTROLS, PARITY_STARS, normalizeParityProgress } from './challenges.js';

export const PARITY_ENGINE_STATS_STORAGE_KEY = 'prism-parity-engine-stats-v1';

export function getDefaultParityStats() {
  return {
    challengeAttempts: 0,
    challengesCompleted: 0,
    hintsUsed: 0,
    goldCompletions: 0,
    simulationsRun: 0,
    totalProbabilityEvaluations: 0,
    bestErrorAchieved: null,
  };
}

export function normalizeParityStats(saved) {
  const defaults = getDefaultParityStats();

  if (!saved || typeof saved !== 'object') {
    return defaults;
  }

  const bestError =
    typeof saved.bestErrorAchieved === 'number' && Number.isFinite(saved.bestErrorAchieved)
      ? saved.bestErrorAchieved
      : null;

  return {
    challengeAttempts: Number(saved.challengeAttempts) || 0,
    challengesCompleted: Number(saved.challengesCompleted) || 0,
    hintsUsed: Number(saved.hintsUsed) || 0,
    goldCompletions: Number(saved.goldCompletions) || 0,
    simulationsRun: Number(saved.simulationsRun) || 0,
    totalProbabilityEvaluations: Number(saved.totalProbabilityEvaluations) || 0,
    bestErrorAchieved: bestError,
  };
}

export function loadParityStats(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    return normalizeParityStats(
      JSON.parse(storage?.getItem(PARITY_ENGINE_STATS_STORAGE_KEY) || 'null'),
    );
  } catch {
    return getDefaultParityStats();
  }
}

export function saveParityStats(stats, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  const normalized = normalizeParityStats(stats);
  storage?.setItem(PARITY_ENGINE_STATS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function getParityChallengeStatsSummary(progress, stats) {
  const normalizedProgress = normalizeParityProgress(progress);
  const normalizedStats = normalizeParityStats(stats);
  const errors = Object.values(normalizedProgress.bestError).filter(
    (error) => typeof error === 'number' && Number.isFinite(error),
  );

  return {
    ...normalizedStats,
    challengesCompleted: Object.values(normalizedProgress.completed).filter(Boolean).length,
    goldCompletions: Object.values(normalizedProgress.highestStars).filter(
      (stars) => stars >= PARITY_STARS.gold,
    ).length,
    bestErrorAchieved:
      errors.length > 0
        ? Math.min(...errors)
        : normalizedStats.bestErrorAchieved,
  };
}

export function recordParityChallengeStats(stats, progress, evaluation) {
  const normalized = normalizeParityStats(stats);
  const summary = getParityChallengeStatsSummary(progress, normalized);
  const error = typeof evaluation?.error === 'number' ? evaluation.error : null;

  return {
    ...summary,
    challengeAttempts: normalized.challengeAttempts + 1,
    totalProbabilityEvaluations: normalized.totalProbabilityEvaluations + 1,
    bestErrorAchieved:
      error === null
        ? summary.bestErrorAchieved
        : summary.bestErrorAchieved === null
          ? error
          : Math.min(summary.bestErrorAchieved, error),
  };
}

export function recordParityHintUsed(stats) {
  const normalized = normalizeParityStats(stats);

  return {
    ...normalized,
    hintsUsed: normalized.hintsUsed + 1,
  };
}

export function recordParitySimulationRun(stats) {
  const normalized = normalizeParityStats(stats);

  return {
    ...normalized,
    simulationsRun: normalized.simulationsRun + 1,
  };
}

export const PARITY_ACHIEVEMENTS = [
  {
    id: 'markov-beginner',
    title: 'Markov Beginner',
    description: 'Complete your first Parity Engine challenge.',
  },
  {
    id: 'probability-tuner',
    title: 'Probability Tuner',
    description: 'Complete a custom slider challenge.',
  },
  {
    id: 'exact-thinker',
    title: 'Exact Thinker',
    description: 'Earn your first Gold star.',
  },
  {
    id: 'stationary-hunter',
    title: 'Stationary Hunter',
    description: 'Complete Stationary Match.',
  },
  {
    id: 'chain-designer',
    title: 'Chain Designer',
    description: 'Complete Design Your Chain.',
  },
];

export function getUnlockedParityAchievements(progress, stats, challenges = []) {
  const normalizedProgress = normalizeParityProgress(progress);
  const summary = getParityChallengeStatsSummary(normalizedProgress, stats);
  const completedCustom = challenges.some(
    (challenge) =>
      challenge.allowedControls === PARITY_ALLOWED_CONTROLS.custom &&
      normalizedProgress.completed[challenge.id],
  );

  return PARITY_ACHIEVEMENTS.filter((achievement) => {
    if (achievement.id === 'markov-beginner') {
      return summary.challengesCompleted > 0;
    }

    if (achievement.id === 'probability-tuner') {
      return completedCustom;
    }

    if (achievement.id === 'exact-thinker') {
      return summary.goldCompletions > 0;
    }

    if (achievement.id === 'stationary-hunter') {
      return Boolean(normalizedProgress.completed['stationary-match']);
    }

    if (achievement.id === 'chain-designer') {
      return Boolean(normalizedProgress.completed['design-your-chain']);
    }

    return false;
  });
}
