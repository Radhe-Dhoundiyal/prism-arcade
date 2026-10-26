import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getLanguageAudit, AUDITED_MIXED_PALINDROMES, LANGUAGE_THEOREMS } from '../src/games/languageLabyrinth/audit.js';
import { LANGUAGE_CHALLENGES, LANGUAGE_CHALLENGE_STORAGE_KEY, calculateLanguageStars, evaluateLanguageChallenge, getLanguageChallengeStatus, getDefaultLanguageProgress, normalizeLanguageProgress, recordLanguageCompletion, recordLanguageHint } from '../src/games/languageLabyrinth/challenges.js';
import { LANGUAGE_STATS_STORAGE_KEY, getDefaultLanguageStats, getUnlockedLanguageAchievements, recordLanguageAttempt, recordLanguageStat } from '../src/games/languageLabyrinth/stats.js';
import { exportArcadeSave, importArcadeSave, resetArcadeProgress } from '../src/core/saveManager.js';

test('RC1 audit exactly reproduces the eight length-10 mixed palindromes and derivations', () => {
  const audit = getLanguageAudit();
  assert.deepEqual(audit.mixedPalindromes, AUDITED_MIXED_PALINDROMES);
  for (const featured of audit.featured) {
    assert.equal(featured.generated && featured.palindrome && featured.containsA && featured.containsB, true);
    assert.equal(featured.derivation[0].word, 'a');
    for (let index = 1; index < featured.derivation.length; index++) {
      const node = featured.derivation[index];
      const parent = featured.derivation[index - 1].word;
      assert.equal(node.parent, parent);
      if (node.rule === 'B') assert.equal(node.word, `c${parent}`);
      if (node.rule === 'D') { assert.equal(parent[0], 'a'); assert.equal(node.word, `${parent.slice(1)}b`); }
      if (node.rule === 'C') assert.equal(Array.from({ length: parent.length }, (_, i) => parent.slice(i + 1) + parent).includes(node.word), true);
    }
  }
  assert.equal(audit.featured[1].length, 10);
});

test('RC1 theorem cards and observations omit the false universal claim', () => {
  const source = readFileSync(new URL('../src/games/languageLabyrinth/LanguageLabyrinth.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source + LANGUAGE_THEOREMS.join(' '), /No palindrome (?:in L )?contains both a and b/i);
  assert.match(LANGUAGE_THEOREMS.join(' '), /zero-answer conjecture is false/);
});

test('RC1 stars require success and valid witnesses, and preserve best rating', () => {
  const challenge = LANGUAGE_CHALLENGES[2];
  const success = evaluateLanguageChallenge({ challenge, answer: 'always-true', word: 'aca' });
  assert.equal(calculateLanguageStars(success, 0, challenge), 3);
  assert.equal(calculateLanguageStars(success, 1, challenge), 2);
  assert.equal(calculateLanguageStars(success, 2, challenge), 1);
  assert.equal(calculateLanguageStars({ success: true }, 0, challenge), 0);
  assert.equal(calculateLanguageStars({ success: false }, 0, challenge), 0);
  const progress = recordLanguageCompletion(getDefaultLanguageProgress(), challenge, 'aca', 3);
  assert.equal(recordLanguageCompletion(progress, challenge, 'aca', 1).highestStars[challenge.id], 3);
});

test('RC1 sequential unlocks and migration do not credit the replaced V1 final question', () => {
  let progress = getDefaultLanguageProgress();
  assert.equal(getLanguageChallengeStatus(LANGUAGE_CHALLENGES[0].id, progress), 'Unlocked');
  assert.equal(getLanguageChallengeStatus(LANGUAGE_CHALLENGES[1].id, progress), 'Locked');
  progress = recordLanguageCompletion(progress, LANGUAGE_CHALLENGES[0]);
  assert.equal(getLanguageChallengeStatus(LANGUAGE_CHALLENGES[0].id, progress), 'Completed');
  assert.equal(getLanguageChallengeStatus(LANGUAGE_CHALLENGES[1].id, progress), 'Unlocked');
  assert.deepEqual(normalizeLanguageProgress({ completed: { 'length-ten-target': true } }).completed, {});
  assert.deepEqual(normalizeLanguageProgress(null), getDefaultLanguageProgress());
  for (let i = 0; i < 8; i++) progress = recordLanguageHint(progress, LANGUAGE_CHALLENGES[0].id);
  assert.equal(progress.hintsUsed['no-final-c'], 3);
});

test('RC1 stats distinguish attempts, invalid witnesses, unique completions and golds', () => {
  const challenge = LANGUAGE_CHALLENGES[5];
  const previous = getDefaultLanguageProgress();
  const result = evaluateLanguageChallenge({ challenge, answer: 'always-true', word: 'bacab' });
  const progress = recordLanguageCompletion(previous, challenge, 'bacab', 3);
  let stats = recordLanguageAttempt(getDefaultLanguageStats(), previous, progress, challenge, result, 'bacab');
  stats = recordLanguageAttempt(stats, progress, progress, challenge, result, 'bacab');
  stats = recordLanguageAttempt(stats, progress, progress, challenge, { success: false }, 'abc');
  assert.equal(stats.challengeAttempts, 3);
  assert.equal(stats.challengesCompleted, 1);
  assert.equal(stats.goldCompletions, 1);
  assert.equal(stats.correctWitnesses, 2);
  assert.equal(stats.incorrectWitnesses, 1);
  assert.equal(stats.witnessesSubmitted, 3);
  stats = recordLanguageStat(stats, 'explorerGenerationsRun');
  stats = recordLanguageStat(stats, 'proofHintsOpened');
  stats = recordLanguageStat(stats, 'hintsUsed');
  assert.equal(stats.proofHintsOpened, 1);
  assert.equal(stats.hintsUsed, 1);
  const completed = { ...progress, completed: { ...progress.completed, 'no-final-c': true, 'length-ten-mixed-palindrome': true } };
  assert.deepEqual(getUnlockedLanguageAchievements(completed, stats).map((entry) => entry.title), ['First Word', 'Invariant Detective', 'Witness Finder', 'Counterexample Hunter', 'Length Ten Hunter', 'Gold Logician']);
});

test('RC1 global save exports, restores, and resets both Language Labyrinth keys', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  storage.setItem(LANGUAGE_CHALLENGE_STORAGE_KEY, JSON.stringify({ completed: { 'no-final-c': true } }));
  storage.setItem(LANGUAGE_STATS_STORAGE_KEY, JSON.stringify({ challengeAttempts: 3 }));
  const save = exportArcadeSave(storage);
  assert.equal(save.data[LANGUAGE_CHALLENGE_STORAGE_KEY].completed['no-final-c'], true);
  assert.equal(save.data[LANGUAGE_STATS_STORAGE_KEY].challengeAttempts, 3);
  resetArcadeProgress(storage);
  assert.equal(values.size, 0);
  importArcadeSave(save, storage);
  assert.equal(JSON.parse(storage.getItem(LANGUAGE_STATS_STORAGE_KEY)).challengeAttempts, 3);
});
