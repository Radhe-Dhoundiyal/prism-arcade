import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LANGUAGE_ANSWERS,
  LANGUAGE_CHALLENGES,
  evaluateLanguageChallenge,
  getDefaultLanguageProgress,
  recordLanguageCompletion,
  recordLanguageHint,
} from '../src/games/languageLabyrinth/challenges.js';
import {
  applyRuleB,
  applyRuleC,
  applyRuleD,
  detectCandidateInvariants,
  everyGeneratedMixedWordEndsInB,
  generateLanguage,
  isPalindrome,
  noGeneratedCFreeWordContainsBothAAndB,
  noGeneratedPalindromeContainsBothAAndB,
  scanLanguageInvariants,
} from '../src/games/languageLabyrinth/logic.js';

describe('Language Labyrinth generation logic', () => {
  it('starts from the base words a and b', () => {
    const generation = generateLanguage(1);

    assert.deepEqual(
      generation.nodes.map((node) => node.word),
      ['a', 'b'],
    );
    assert.equal(generation.nodes.every((node) => node.rule === 'Base'), true);
  });

  it('applies Rule B by prefixing c', () => {
    assert.deepEqual(applyRuleB('a'), ['ca']);
    assert.deepEqual(applyRuleB('bcb'), ['cbcb']);
  });

  it('applies Rule C across nonempty prefix splits', () => {
    assert.deepEqual(applyRuleC('ca'), ['aca']);
    assert.deepEqual(applyRuleC('cab'), ['abcab', 'bcab']);
  });

  it('applies Rule D only to words beginning with a', () => {
    assert.deepEqual(applyRuleD('a'), ['b']);
    assert.deepEqual(applyRuleD('aca'), ['cab']);
    assert.deepEqual(applyRuleD('ca'), []);
  });

  it('generates all reachable words up to a small length cap', () => {
    const generation = generateLanguage(3);
    const words = generation.nodes.map((node) => node.word);

    assert.deepEqual(words, ['a', 'b', 'ca', 'cb', 'cca', 'aca', 'ccb', 'bcb', 'cab']);
    assert.deepEqual(
      generation.nodes.find((node) => node.word === 'aca'),
      {
        id: 'aca',
        word: 'aca',
        parent: 'ca',
        rule: 'C',
        depth: 2,
      },
    );
    assert.equal(words.every((word) => word.length <= 3), true);
  });

  it('detects palindromes', () => {
    assert.equal(isPalindrome('aca'), true);
    assert.equal(isPalindrome('bcccb'), true);
    assert.equal(isPalindrome('cab'), false);
  });

  it('scans invariant-oriented counts', () => {
    const scan = scanLanguageInvariants(generateLanguage(3).words);

    assert.equal(scan.totalWords, 9);
    assert.equal(scan.endingInA, 4);
    assert.equal(scan.endingInB, 5);
    assert.equal(scan.endingInC, 0);
    assert.equal(scan.startingWithC, 5);
    assert.equal(scan.palindromes, 4);
    assert.equal(scan.palindromesContainingBothAAndB, 0);
    assert.equal(scan.wordsContainingBothAAndB, 1);
  });

  it('finds no generated word ending in c for small caps', () => {
    for (let maxLength = 1; maxLength <= 7; maxLength += 1) {
      const scan = scanLanguageInvariants(generateLanguage(maxLength).words);

      assert.equal(scan.endingInC, 0, `cap ${maxLength}`);
    }
  });

  it('reports candidate invariants as empirical observations only', () => {
    const scan = scanLanguageInvariants(generateLanguage(3).words);

    assert.deepEqual(detectCandidateInvariants(scan), [
      'No generated word ends in c.',
      'No palindrome containing both a and b found.',
    ]);
  });
});

describe('Language Labyrinth Invariant Detective challenge logic', () => {
  it('defines valid starter challenge metadata', () => {
    assert.equal(LANGUAGE_CHALLENGES.length, 7);
    LANGUAGE_CHALLENGES.forEach((challenge) => {
      assert.equal(typeof challenge.id, 'string');
      assert.equal(typeof challenge.title, 'string');
      assert.equal(typeof challenge.statement, 'string');
      assert.equal(typeof challenge.lesson, 'string');
      assert.equal(challenge.hints.length, 3);
      assert.equal(Object.values(LANGUAGE_ANSWERS).includes(challenge.expectedAnswer), true);
    });
  });

  it('confirms the final-c invariant challenge with a rule explanation', () => {
    const challenge = LANGUAGE_CHALLENGES.find((level) => level.id === 'no-final-c');
    const result = evaluateLanguageChallenge({
      challenge,
      answer: LANGUAGE_ANSWERS.true,
      explanation: 'Rules B and C preserve final letters; rule D creates a final b.',
    });

    assert.equal(result.success, true);
    assert.equal(result.resultType, 'invariant-confirmed');
    assert.equal(result.scan.endingInC, 0);
  });

  it('validates that mixed word existence has a generated witness', () => {
    const challenge = LANGUAGE_CHALLENGES.find((level) => level.id === 'mixed-word-exists');
    const result = evaluateLanguageChallenge({
      challenge,
      answer: LANGUAGE_ANSWERS.true,
      word: 'cab',
    });

    assert.equal(result.success, true);
    assert.equal(result.resultType, 'counterexample-found');
    assert.equal(result.witness.description.containsA, true);
    assert.equal(result.witness.description.containsB, true);
  });

  it('validates the adjusted length-3 palindrome challenge with generated witnesses', () => {
    const challenge = LANGUAGE_CHALLENGES.find(
      (level) => level.id === 'find-length-three-palindrome',
    );
    const result = evaluateLanguageChallenge({
      challenge,
      answer: LANGUAGE_ANSWERS.true,
      word: 'aca',
    });

    assert.equal(result.success, true);
    assert.equal(result.witness.description.length, 3);
    assert.equal(result.witness.description.palindrome, true);
  });

  it('rejects invalid witness words with specific support reasons', () => {
    const challenge = LANGUAGE_CHALLENGES.find(
      (level) => level.id === 'find-length-three-palindrome',
    );
    const notGenerated = evaluateLanguageChallenge({
      challenge,
      answer: LANGUAGE_ANSWERS.true,
      word: 'abc',
    });
    const notPalindrome = evaluateLanguageChallenge({
      challenge,
      answer: LANGUAGE_ANSWERS.true,
      word: 'cab',
    });

    assert.match(notGenerated.reason, /not generated/);
    assert.match(notPalindrome.reason, /not a palindrome/);
  });

  it('rules out mixed words ending in a under the invariant helper', () => {
    const challenge = LANGUAGE_CHALLENGES.find((level) => level.id === 'mixed-word-ending-a');
    const result = evaluateLanguageChallenge({
      challenge,
      answer: LANGUAGE_ANSWERS.false,
      explanation: 'Every generated mixed a/b word is forced to end in b.',
    });

    assert.equal(everyGeneratedMixedWordEndsInB(10), true);
    assert.equal(result.success, true);
  });

  it('adjusts the mixed-palindrome challenge because generated witnesses exist', () => {
    const challenge = LANGUAGE_CHALLENGES.find((level) => level.id === 'palindrome-with-a-and-b');
    const result = evaluateLanguageChallenge({
      challenge,
      answer: LANGUAGE_ANSWERS.true,
      word: 'bacab',
    });

    assert.equal(noGeneratedPalindromeContainsBothAAndB(10), false);
    assert.equal(result.success, true);
    assert.equal(result.witness.description.palindrome, true);
    assert.equal(result.witness.description.containsA, true);
    assert.equal(result.witness.description.containsB, true);
  });

  it('solves the corrected length-10 mixed-palindrome target with a witness', () => {
    const challenge = LANGUAGE_CHALLENGES.find((level) => level.id === 'length-ten-mixed-palindrome');
    const result = evaluateLanguageChallenge({
      challenge,
      answer: LANGUAGE_ANSWERS.true,
      word: 'bacabbacab',
    });

    assert.equal(challenge.statement, 'There exists a length-10 palindrome in L containing both a and b.');
    assert.equal(noGeneratedCFreeWordContainsBothAAndB(10), true);
    assert.equal(result.success, true);
  });

  it('records hints, completions, and submitted witnesses locally', () => {
    const challenge = LANGUAGE_CHALLENGES.find((level) => level.id === 'mixed-word-exists');
    const hinted = recordLanguageHint(getDefaultLanguageProgress(), challenge.id);
    const completed = recordLanguageCompletion(hinted, challenge, 'cab');

    assert.equal(completed.hintsUsed[challenge.id], 1);
    assert.equal(completed.completed[challenge.id], true);
    assert.equal(completed.counterexamplesSubmitted[challenge.id], 'cab');
  });
});
