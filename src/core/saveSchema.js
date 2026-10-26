import { DEFAULT_ARCADE_PROFILE, ARCADE_PROFILE_STORAGE_KEY } from '../profile/profile.js';
import { DEFAULT_CAMPAIGN_PROGRESS, CAMPAIGN_STORAGE_KEY } from '../games/gridDominion/campaign.js';
import { DEFAULT_GRID_DOMINION_STATS, GRID_DOMINION_STATS_KEY } from '../games/gridDominion/stats.js';
import { getDefaultBinaryShiftProgress, BINARY_SHIFT_CHALLENGE_STORAGE_KEY } from '../games/binaryShift/challenges.js';
import { getDefaultBinaryShiftStats, BINARY_SHIFT_STATS_STORAGE_KEY } from '../games/binaryShift/stats.js';
import { getDefaultBlackboardChallengeProgress, BLACKBOARD_CHALLENGE_STORAGE_KEY } from '../games/blackboardMoves/challenges.js';
import { DEFAULT_BLACKBOARD_STATS, BLACKBOARD_STATS_STORAGE_KEY } from '../games/blackboardMoves/stats.js';
import { BLACKBOARD_CONJECTURE_STORAGE_KEY } from '../games/blackboardMoves/logic.js';
import { DEFAULT_NUMBER_FORGE_PROGRESS, NUMBER_FORGE_CHALLENGE_STORAGE_KEY } from '../games/numberForge/challenges.js';
import { DEFAULT_NUMBER_FORGE_STATS, NUMBER_FORGE_STATS_STORAGE_KEY } from '../games/numberForge/stats.js';
import { getDefaultParityProgress, PARITY_CHALLENGE_STORAGE_KEY } from '../games/parityEngine/challenges.js';
import { getDefaultParityStats, PARITY_ENGINE_STATS_STORAGE_KEY } from '../games/parityEngine/stats.js';
import { getDefaultLoopChallengeProgress, LOOP_STRINGS_CHALLENGE_STORAGE_KEY } from '../games/loopStrings/challenges.js';
import { getDefaultLoopStats, LOOP_STRINGS_STATS_STORAGE_KEY } from '../games/loopStrings/stats.js';
import { getDefaultLanguageProgress, LANGUAGE_CHALLENGE_STORAGE_KEY } from '../games/languageLabyrinth/challenges.js';
import { getDefaultLanguageStats, LANGUAGE_STATS_STORAGE_KEY } from '../games/languageLabyrinth/stats.js';
import { DEFAULT_TEMPORAL_CHALLENGE_PROGRESS, TEMPORAL_CHALLENGE_STORAGE_KEY } from '../games/temporalGraphs/challenges.js';
import { DEFAULT_TEMPORAL_STATS, TEMPORAL_STATS_STORAGE_KEY } from '../games/temporalGraphs/stats.js';

export const MAX_SAVE_BYTES = 2 * 1024 * 1024;
export const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const counter = (value) => Number.isSafeInteger(value) && value >= 0;
const probability = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

// Resolved lazily: persistence consumers also import the guard. No storage is
// read, or imported module binding inspected, during module initialization.
export function getSaveSchemas() {
  return {
    [ARCADE_PROFILE_STORAGE_KEY]: DEFAULT_ARCADE_PROFILE,
    [CAMPAIGN_STORAGE_KEY]: DEFAULT_CAMPAIGN_PROGRESS,
    [GRID_DOMINION_STATS_KEY]: DEFAULT_GRID_DOMINION_STATS,
    [BINARY_SHIFT_CHALLENGE_STORAGE_KEY]: getDefaultBinaryShiftProgress(),
    [BINARY_SHIFT_STATS_STORAGE_KEY]: getDefaultBinaryShiftStats(),
    [BLACKBOARD_CHALLENGE_STORAGE_KEY]: getDefaultBlackboardChallengeProgress(),
    [BLACKBOARD_STATS_STORAGE_KEY]: DEFAULT_BLACKBOARD_STATS,
    [BLACKBOARD_CONJECTURE_STORAGE_KEY]: {},
    [NUMBER_FORGE_CHALLENGE_STORAGE_KEY]: DEFAULT_NUMBER_FORGE_PROGRESS,
    [NUMBER_FORGE_STATS_STORAGE_KEY]: DEFAULT_NUMBER_FORGE_STATS,
    [PARITY_CHALLENGE_STORAGE_KEY]: getDefaultParityProgress(),
    [PARITY_ENGINE_STATS_STORAGE_KEY]: getDefaultParityStats(),
    [LOOP_STRINGS_CHALLENGE_STORAGE_KEY]: getDefaultLoopChallengeProgress(),
    [LOOP_STRINGS_STATS_STORAGE_KEY]: getDefaultLoopStats(),
    [LANGUAGE_CHALLENGE_STORAGE_KEY]: getDefaultLanguageProgress(),
    [LANGUAGE_STATS_STORAGE_KEY]: getDefaultLanguageStats(),
    [TEMPORAL_CHALLENGE_STORAGE_KEY]: DEFAULT_TEMPORAL_CHALLENGE_PROGRESS,
    [TEMPORAL_STATS_STORAGE_KEY]: DEFAULT_TEMPORAL_STATS,
  };
}

function validMapValue(field, value, key) {
  if (key === NUMBER_FORGE_CHALLENGE_STORAGE_KEY && field === 'hintsUsed') return typeof value === 'boolean';
  if (['completed', 'completedLevels', 'visitedPortals'].includes(field)) return typeof value === 'boolean';
  if (field === 'stars') return isRecord(value) && Object.keys(value).every((key) => ['bronze', 'silver', 'gold'].includes(key) && typeof value[key] === 'boolean');
  if (field === 'highestStars') return counter(value) && value <= 3;
  if (field === 'bestError') return probability(value);
  if (field === 'counterexamplesSubmitted') return typeof value === 'string' && /^[abc]{0,10}$/.test(value);
  if (field === 'bestAnswerStatus') return ['Correct x', 'Correct impossible'].includes(value);
  return counter(value);
}

export function validateSaveRecord(key, value) {
  const template = getSaveSchemas()[key];
  if (!template) throw new Error(`Unknown managed key: ${key}`);
  if (value === null) return true;
  if (!isRecord(value)) throw new Error(`Invalid ${key}: expected an object.`);
  if (key === BLACKBOARD_CONJECTURE_STORAGE_KEY) {
    if (Object.keys(value).length > 100 || Object.entries(value).some(([id, entry]) => !/^[a-z0-9-]{1,80}$/.test(id) || typeof entry !== 'boolean')) throw new Error('Invalid Blackboard conjecture selections.');
    return true;
  }
  if (JSON.stringify(value).length > MAX_SAVE_BYTES) throw new Error('Save record exceeds the size budget.');
  for (const [field, entry] of Object.entries(value)) {
    if (!Object.hasOwn(template, field)) throw new Error(`Invalid ${key}: unknown field ${field}.`);
    const expected = template[field];
    let valid;
    if (isRecord(expected)) {
      valid = isRecord(entry) && Object.keys(entry).length <= 200 && Object.entries(entry).every(([id, item]) =>
        /^[a-z0-9-]{1,80}$/.test(id) && !['constructor', 'prototype', '__proto__'].includes(id) && validMapValue(field, item, key));
    } else if (expected === null) {
      valid = field === 'bestErrorAchieved' ? entry === null || probability(entry)
        : entry === null || (typeof entry === 'string' && entry.length <= 40 && Number.isFinite(Date.parse(entry)));
    } else if (typeof expected === 'boolean') valid = typeof entry === 'boolean';
    else valid = counter(entry) && (field !== 'unlockedLevel' || (entry >= 1 && entry <= 100));
    if (!valid) throw new Error(`Invalid ${key}.${field}: wrong type or out-of-range value.`);
  }
  return true;
}
