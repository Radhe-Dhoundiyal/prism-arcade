import { getBrowserStorage, guardStorage } from '../../core/storage.js';
export const TEMPORAL_STATS_STORAGE_KEY = 'prism-temporal-graphs-stats-v1';

export const DEFAULT_TEMPORAL_STATS = {
  challengeAttempts: 0,
  challengeCompletions: 0,
  totalActivationsTriggered: 0,
  bestSingleTriggerActivation: 0,
  goldCompletions: 0,
  labGraphsExported: 0,
  labGraphsImported: 0,
};

export function loadTemporalStats(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    const saved = JSON.parse(storage.getItem(TEMPORAL_STATS_STORAGE_KEY));

    if (!saved || typeof saved !== 'object') {
      return DEFAULT_TEMPORAL_STATS;
    }

    return {
      ...DEFAULT_TEMPORAL_STATS,
      ...saved,
    };
  } catch {
    return DEFAULT_TEMPORAL_STATS;
  }
}

export function saveTemporalStats(stats, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(TEMPORAL_STATS_STORAGE_KEY, JSON.stringify(stats));
}

export function recordChallengeAttempt(stats, activationCount, success, starRating) {
  if (!Number.isInteger(activationCount) || activationCount < 0 || activationCount > 1) throw new RangeError('Official distinct-day triggers activate at most one new owner.');
  return {
    ...stats,
    challengeAttempts: stats.challengeAttempts + 1,
    challengeCompletions: stats.challengeCompletions + (success ? 1 : 0),
    totalActivationsTriggered: stats.totalActivationsTriggered + activationCount,
    bestSingleTriggerActivation: Math.max(stats.bestSingleTriggerActivation, activationCount),
    goldCompletions: stats.goldCompletions + (success && starRating === 3 ? 1 : 0),
  };
}

export function recordLabExport(stats) {
  return {
    ...stats,
    labGraphsExported: stats.labGraphsExported + 1,
  };
}

export function recordLabImport(stats) {
  return {
    ...stats,
    labGraphsImported: stats.labGraphsImported + 1,
  };
}
