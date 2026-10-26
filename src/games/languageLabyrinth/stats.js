import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { normalizeLanguageProgress } from './challenges.js';

export const LANGUAGE_STATS_STORAGE_KEY = 'prism-language-labyrinth-stats-v1';
export const getDefaultLanguageStats = () => ({
  challengeAttempts: 0, challengesCompleted: 0, hintsUsed: 0,
  witnessesSubmitted: 0, correctWitnesses: 0, incorrectWitnesses: 0,
  goldCompletions: 0, explorerGenerationsRun: 0, proofHintsOpened: 0,
});

export function normalizeLanguageStats(value) {
  return Object.fromEntries(Object.keys(getDefaultLanguageStats()).map((key) => [key,
    Number.isFinite(Number(value?.[key])) ? Math.max(0, Math.trunc(Number(value[key]))) : 0,
  ]));
}

export function loadLanguageStats(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try { return normalizeLanguageStats(JSON.parse(storage?.getItem(LANGUAGE_STATS_STORAGE_KEY) || 'null')); }
  catch { return getDefaultLanguageStats(); }
}

export function saveLanguageStats(stats, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage?.setItem(LANGUAGE_STATS_STORAGE_KEY, JSON.stringify(normalizeLanguageStats(stats)));
}

export function recordLanguageStat(stats, key) {
  const next = normalizeLanguageStats(stats);
  if (Object.hasOwn(next, key)) next[key] += 1;
  return next;
}

export function recordLanguageAttempt(stats, previous, nextProgress, challenge, result, word) {
  const next = recordLanguageStat(stats, 'challengeAttempts');
  const before = normalizeLanguageProgress(previous);
  const after = normalizeLanguageProgress(nextProgress);
  if (!before.completed[challenge.id] && after.completed[challenge.id]) next.challengesCompleted += 1;
  if ((before.highestStars[challenge.id] || 0) < 3 && after.highestStars[challenge.id] === 3) next.goldCompletions += 1;
  if (challenge.requiresWord && word.trim()) {
    next.witnessesSubmitted += 1;
    next[result.success && result.witness?.ok ? 'correctWitnesses' : 'incorrectWitnesses'] += 1;
  }
  return next;
}

export function getUnlockedLanguageAchievements(progress, stats) {
  const normalized = normalizeLanguageProgress(progress);
  const values = normalizeLanguageStats(stats);
  const earned = [
    ['first-word', 'First Word', values.explorerGenerationsRun > 0],
    ['invariant-detective', 'Invariant Detective', normalized.completed['no-final-c']],
    ['witness-finder', 'Witness Finder', values.correctWitnesses > 0],
    ['counterexample-hunter', 'Counterexample Hunter', normalized.completed['palindrome-with-a-and-b']],
    ['length-ten-hunter', 'Length Ten Hunter', normalized.completed['length-ten-mixed-palindrome']],
    ['gold-logician', 'Gold Logician', Object.values(normalized.highestStars).some((stars) => stars === 3)],
  ];
  return earned.filter(([, , unlocked]) => unlocked).map(([id, title]) => ({ id, title }));
}
