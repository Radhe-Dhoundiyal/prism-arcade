import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { BINARY_SHIFT_CHALLENGES } from './challenges.js';

export const BINARY_SHIFT_STATS_STORAGE_KEY = 'prism-binary-shift-stats-v1';

export function getDefaultBinaryShiftStats() {
  return {
    challengeAttempts: 0,
    challengesCompleted: 0,
    correctXSubmissions: 0,
    correctImpossibleDeclarations: 0,
    incorrectSubmissions: 0,
    hintsUsed: 0,
    goldCompletions: 0,
    searchesRun: 0,
    boundsChecksRun: 0,
  };
}

export function normalizeBinaryShiftStats(value) {
  const defaults = getDefaultBinaryShiftStats();
  const source = value && typeof value === 'object' ? value : {};

  return Object.fromEntries(
    Object.entries(defaults).map(([key, defaultValue]) => [
      key,
      Number.isFinite(Number(source[key])) ? Math.max(0, Math.trunc(Number(source[key]))) : defaultValue,
    ]),
  );
}

export function loadBinaryShiftStats(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  if (!storage) {
    return getDefaultBinaryShiftStats();
  }

  try {
    return normalizeBinaryShiftStats(
      JSON.parse(storage.getItem(BINARY_SHIFT_STATS_STORAGE_KEY) || 'null'),
    );
  } catch {
    return getDefaultBinaryShiftStats();
  }
}

export function saveBinaryShiftStats(stats, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  if (!storage) {
    return;
  }

  storage.setItem(BINARY_SHIFT_STATS_STORAGE_KEY, JSON.stringify(normalizeBinaryShiftStats(stats)));
}

export function recordBinaryShiftChallengeStats(stats, previousProgress, nextProgress, result, stars) {
  const normalized = normalizeBinaryShiftStats(stats);
  const wasCompleted = Boolean(previousProgress.completed[result.challengeId]);
  const isCompleted = Boolean(nextProgress.completed[result.challengeId]);
  const previousGold = (previousProgress.highestStars[result.challengeId] || 0) >= 3;
  const nextGold = stars >= 3;

  return {
    ...normalized,
    challengeAttempts: normalized.challengeAttempts + 1,
    challengesCompleted: normalized.challengesCompleted + (!wasCompleted && isCompleted ? 1 : 0),
    correctXSubmissions:
      normalized.correctXSubmissions + (result.success && result.solutionExists ? 1 : 0),
    correctImpossibleDeclarations:
      normalized.correctImpossibleDeclarations + (result.success && !result.solutionExists ? 1 : 0),
    incorrectSubmissions: normalized.incorrectSubmissions + (result.success ? 0 : 1),
    goldCompletions: normalized.goldCompletions + (!previousGold && nextGold ? 1 : 0),
  };
}

export function recordBinaryShiftHintStat(stats) {
  const normalized = normalizeBinaryShiftStats(stats);

  return {
    ...normalized,
    hintsUsed: normalized.hintsUsed + 1,
  };
}

export function recordBinaryShiftSearchRun(stats) {
  const normalized = normalizeBinaryShiftStats(stats);

  return {
    ...normalized,
    searchesRun: normalized.searchesRun + 1,
  };
}

export function recordBinaryShiftBoundsCheck(stats) {
  const normalized = normalizeBinaryShiftStats(stats);

  return {
    ...normalized,
    boundsChecksRun: normalized.boundsChecksRun + 1,
  };
}

export const BINARY_SHIFT_ACHIEVEMENTS = [
  {
    id: 'first-shift',
    title: 'First Shift',
    description: 'Complete the first Binary Shift challenge.',
    unlocked: (progress) => Boolean(progress.completed['first-special']),
  },
  {
    id: 'impossible-detector',
    title: 'Impossible Detector',
    description: 'Correctly declare an impossible Binary Shift target.',
    unlocked: (_progress, stats) => stats.correctImpossibleDeclarations > 0,
  },
  {
    id: 'hidden-success',
    title: 'Hidden Success',
    description: 'Solve the n = 8 Binary Shift challenge.',
    unlocked: (progress) => Boolean(progress.completed['hidden-success']),
  },
  {
    id: 'formula-finder',
    title: 'Formula Finder',
    description: 'Use the divisibility criterion hint.',
    unlocked: (progress) => Object.values(progress.hintsUsed || {}).some((hintLevel) => hintLevel >= 2),
  },
  {
    id: 'binary-master',
    title: 'Binary Master',
    description: 'Complete every starter Binary Shift challenge.',
    unlocked: (progress) =>
      BINARY_SHIFT_CHALLENGES.every((challenge) => Boolean(progress.completed[challenge.id])),
  },
];

export function getUnlockedBinaryShiftAchievements(progress, stats) {
  return BINARY_SHIFT_ACHIEVEMENTS.filter((achievement) =>
    achievement.unlocked(progress, normalizeBinaryShiftStats(stats)),
  );
}

