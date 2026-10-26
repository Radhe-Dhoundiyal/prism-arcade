import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import {
  describeWord,
  everyGeneratedMixedWordEndsInB,
  everyGeneratedWordAvoidsFinalC,
  generateLanguage,
  isGeneratedWord,
  scanLanguageInvariants,
} from './logic.js';

export const LANGUAGE_CHALLENGE_STORAGE_KEY = 'prism-language-labyrinth-challenge-v1';
export const LANGUAGE_CHALLENGE_SEARCH_CAP = 10;

export const LANGUAGE_ANSWERS = {
  true: 'always-true',
  false: 'false',
  unknown: 'unknown',
};

export const LANGUAGE_CHALLENGES = [
  {
    id: 'no-final-c',
    title: 'No Final C',
    statement: 'No generated word ends in c.',
    expectedAnswer: LANGUAGE_ANSWERS.true,
    proofKind: 'final-letter',
    lesson: 'Bases end in a or b. Rule B preserves the last letter. Rule C preserves it for nonempty v and changes nothing for empty v. Rule D ends in b. Induction excludes final c.',
    hints: [
      'Inspect the Ending in c statistic.',
      'Track the last letter through rules B, C, and D.',
      'Rules B and C preserve the old final letter, and rule D creates a final b.',
    ],
  },
  {
    id: 'front-c-explosion',
    title: 'Front C Explosion',
    statement: 'For every generated word w, cw is also generated.',
    expectedAnswer: LANGUAGE_ANSWERS.true,
    proofKind: 'rule-b',
    lesson: 'Rule (b) directly prepends c.',
    hints: [
      'Look for pairs such as a and ca, b and cb.',
      'Rule (b) is the only rule you need to inspect.',
      'If w is generated, rule (b) immediately gives cw.',
    ],
  },
  {
    id: 'find-length-three-palindrome',
    title: 'Find a Palindrome',
    statement: 'There exists a palindrome in L of length 3.',
    expectedAnswer: LANGUAGE_ANSWERS.true,
    proofKind: 'witness',
    requiresWord: true,
    witnessChecks: ['generated', 'palindrome', 'length-3'],
    lesson: 'Short experiments can produce witnesses before a proof is needed.',
    examples: ['aca', 'bcb'],
    hints: [
      'Inspect palindromes in the word table at max length 3.',
      'Try applying rule (c) to ca or cb.',
      'aca and bcb are generated length-3 palindromes.',
    ],
  },
  {
    id: 'mixed-word-exists',
    title: 'Mixed Word Exists',
    statement: 'There exists a generated word containing both a and b.',
    expectedAnswer: LANGUAGE_ANSWERS.true,
    proofKind: 'witness',
    requiresWord: true,
    witnessChecks: ['generated', 'mixed-ab'],
    lesson: 'A single generated mixed word disproves the negation.',
    examples: ['cab'],
    hints: [
      'Inspect the Words with a,b statistic.',
      'Apply rule (d) after finding a generated word that starts with a.',
      'cab is generated and contains both a and b.',
    ],
  },
  {
    id: 'mixed-word-ending-a',
    title: 'Mixed Word Ending A',
    statement: 'There exists a generated word containing both a and b that ends in a.',
    expectedAnswer: LANGUAGE_ANSWERS.false,
    proofKind: 'mixed-final-b',
    lesson: 'Words ending in a contain no b: this holds for the bases and is preserved by B and C; D always ends in b. Together with the absence of final c, every mixed a/b word ends in b.',
    hints: [
      'Compare Words with a,b against Ending in a examples.',
      'Track what happens after rule (d).',
      'Once both a and b appear, the final letter is forced to be b.',
    ],
  },
  {
    id: 'palindrome-with-a-and-b',
    title: 'Palindrome With Both A and B',
    statement: 'There exists a palindrome in L containing both a and b.',
    expectedAnswer: LANGUAGE_ANSWERS.true,
    proofKind: 'witness',
    requiresWord: true,
    witnessChecks: ['generated', 'palindrome', 'mixed-ab'],
    lesson: 'The first conjecture is too strong: mixed palindromes do appear once c is allowed.',
    examples: ['bacab'],
    hints: [
      'Inspect Palindrome with a,b.',
      'Look near length 5 before jumping to length 10.',
      'bacab is a generated palindrome containing both a and b.',
    ],
  },
  {
    id: 'length-ten-mixed-palindrome',
    title: 'Length 10 Target',
    statement: 'There exists a length-10 palindrome in L containing both a and b.',
    expectedAnswer: LANGUAGE_ANSWERS.true,
    proofKind: 'witness',
    requiresWord: true,
    witnessChecks: ['generated', 'palindrome', 'mixed-ab', 'length-10'],
    examples: ['bacabbacab'],
    lesson: 'bacabbacab refutes the original zero-answer conjecture under the official rules. The exhaustive audited search finds 8 length-10 mixed palindromes.',
    hints: [
      'Inspect length-10 palindromes containing a and b.',
      'Use rule (c) to wrap a suitable generated suffix.',
      'bacabbacab is a generated length-10 mixed palindrome.',
    ],
  },
];

export function getDefaultLanguageProgress() {
  return {
    completed: {},
    hintsUsed: {},
    counterexamplesSubmitted: {},
    highestStars: {},
  };
}

export function normalizeLanguageProgress(progress = {}) {
  progress = progress && typeof progress === 'object' ? progress : {};
  const ids = LANGUAGE_CHALLENGES.map((challenge) => challenge.id);
  const normalizeMap = (source, normalize) => Object.fromEntries(ids.filter((id) => Object.hasOwn(source || {}, id)).map((id) => [id, normalize(source[id])]));
  return {
    ...getDefaultLanguageProgress(),
    ...progress,
    completed: normalizeMap(progress.completed, (value) => value === true),
    hintsUsed: normalizeMap(progress.hintsUsed, (value) => Math.min(3, Math.max(0, Math.trunc(Number(value) || 0)))),
    counterexamplesSubmitted: normalizeMap(progress.counterexamplesSubmitted, (value) => typeof value === 'string' ? value : ''),
    highestStars: normalizeMap(progress.highestStars, (value) => Math.min(3, Math.max(0, Math.trunc(Number(value) || 0)))),
  };
}

function getStorage(storage) {
  if (storage) {
    return storage;
  }

  return typeof window === 'undefined' ? null : getBrowserStorage();
}

export function loadLanguageProgress(storage) {
  storage = guardStorage(storage);
  const targetStorage = getStorage(storage);

  if (!targetStorage) {
    return getDefaultLanguageProgress();
  }

  try {
    return normalizeLanguageProgress(
      JSON.parse(targetStorage.getItem(LANGUAGE_CHALLENGE_STORAGE_KEY) || '{}'),
    );
  } catch {
    return getDefaultLanguageProgress();
  }
}

export function saveLanguageProgress(progress, storage) {
  storage = guardStorage(storage);
  const targetStorage = getStorage(storage);

  if (!targetStorage) {
    return;
  }

  targetStorage.setItem(
    LANGUAGE_CHALLENGE_STORAGE_KEY,
    JSON.stringify(normalizeLanguageProgress(progress)),
  );
}

export function recordLanguageHint(progress, challengeId) {
  const normalized = normalizeLanguageProgress(progress);
  const current = normalized.hintsUsed[challengeId] || 0;

  return {
    ...normalized,
    hintsUsed: {
      ...normalized.hintsUsed,
      [challengeId]: Math.min(3, current + 1),
    },
  };
}

export function recordLanguageCompletion(progress, challenge, submittedWord = '', stars = 1) {
  const normalized = normalizeLanguageProgress(progress);
  const word = submittedWord.trim();
  const counterexamplesSubmitted = { ...normalized.counterexamplesSubmitted };

  if (word) {
    counterexamplesSubmitted[challenge.id] = word;
  }

  return {
    ...normalized,
    completed: {
      ...normalized.completed,
      [challenge.id]: true,
    },
    counterexamplesSubmitted,
    highestStars: { ...normalized.highestStars, [challenge.id]: Math.max(normalized.highestStars[challenge.id] || 0, stars) },
  };
}

export function getLanguageChallengeStatus(id, progress) {
  const index = LANGUAGE_CHALLENGES.findIndex((challenge) => challenge.id === id);
  if (index < 0) return 'Locked';
  const normalized = normalizeLanguageProgress(progress);
  if (normalized.completed[id]) return 'Completed';
  return index === 0 || LANGUAGE_CHALLENGES.slice(0, index).every((challenge) => normalized.completed[challenge.id]) ? 'Unlocked' : 'Locked';
}

export function calculateLanguageStars(result, hintsUsed, challenge) {
  if (!result.success || (challenge.requiresWord && !result.witness?.ok)) return 0;
  return hintsUsed === 0 ? 3 : hintsUsed <= 1 ? 2 : 1;
}

export function getLanguageHint(challenge, level) {
  return challenge.hints[Math.max(0, Math.min(challenge.hints.length - 1, level - 1))];
}

export function findGeneratedWord(predicate, maxLength = LANGUAGE_CHALLENGE_SEARCH_CAP) {
  return generateLanguage(maxLength).words.find(predicate) || null;
}

function validateWitness(challenge, word, maxLength) {
  const cleanWord = word.trim();

  if (!cleanWord) {
    return {
      ok: false,
      reason: 'This challenge needs a generated example word.',
    };
  }

  if (!/^[abc]+$/.test(cleanWord)) {
    return {
      ok: false,
      reason: 'Words in this language can use only a, b, and c.',
    };
  }

  if (cleanWord.length > LANGUAGE_CHALLENGE_SEARCH_CAP) {
    return { ok: false, reason: 'Witnesses are limited to length 10 for the audited search.' };
  }

  if (!isGeneratedWord(cleanWord, maxLength)) {
    return {
      ok: false,
      reason: `${cleanWord} was not generated within the current safe cap.`,
    };
  }

  const description = describeWord(cleanWord);

  if (challenge.witnessChecks.includes('length-10') && description.length !== 10) {
    return { ok: false, reason: `${cleanWord} has length ${description.length}, not 10.` };
  }

  if (challenge.witnessChecks.includes('palindrome') && !description.palindrome) {
    return {
      ok: false,
      reason: `${cleanWord} is generated, but it is not a palindrome.`,
    };
  }

  if (challenge.witnessChecks.includes('length-3') && description.length !== 3) {
    return {
      ok: false,
      reason: `${cleanWord} is generated, but its length is ${description.length}, not 3.`,
    };
  }

  if (challenge.witnessChecks.includes('mixed-ab') && (!description.containsA || !description.containsB)) {
    return {
      ok: false,
      reason: `${cleanWord} is generated, but it does not contain both a and b.`,
    };
  }

  if (challenge.witnessChecks.includes('no-c') && description.containsC) {
    return {
      ok: false,
      reason: `${cleanWord} is generated, but it contains c.`,
    };
  }

  return {
    ok: true,
    word: cleanWord,
    description,
  };
}

function validateProofKind(challenge, maxLength) {
  if (challenge.proofKind === 'final-letter') {
    return everyGeneratedWordAvoidsFinalC(maxLength);
  }

  if (challenge.proofKind === 'rule-b') {
    return true;
  }

  if (challenge.proofKind === 'mixed-final-b') {
    return everyGeneratedMixedWordEndsInB(maxLength);
  }

  return false;
}

export function evaluateLanguageChallenge({
  challenge,
  answer,
  word = '',
  explanation = '',
}) {
  const cleanMaxLength = LANGUAGE_CHALLENGE_SEARCH_CAP;
  const generation = generateLanguage(cleanMaxLength);
  const scan = scanLanguageInvariants(generation.words);

  if (!challenge) {
    return { success: false, reason: 'Choose a challenge first.' };
  }

  if (answer !== challenge.expectedAnswer) {
    if (answer === LANGUAGE_ANSWERS.unknown) {
      return {
        success: false,
        reason: 'The current challenge has enough structure to decide; unknown is not supported here.',
        scan,
      };
    }

    return {
      success: false,
      reason: 'That choice does not match the generated evidence and invariant checks.',
      scan,
    };
  }

  if (challenge.requiresWord) {
    const witness = validateWitness(challenge, word, cleanMaxLength);

    if (!witness.ok) {
      return {
        success: false,
        reason: witness.reason,
        scan,
      };
    }

    return {
      success: true,
      resultType: 'counterexample-found',
      reason: `${witness.word} is a generated witness for the statement.`,
      witness,
      scan,
    };
  }

  if (challenge.expectedAnswer === LANGUAGE_ANSWERS.true && explanation.trim().length < 12) {
    return {
      success: false,
      reason: 'Give a short rule-based explanation before confirming this invariant.',
      scan,
    };
  }

  if (challenge.expectedAnswer === LANGUAGE_ANSWERS.false && explanation.trim().length < 8) {
    return {
      success: false,
      reason: 'Give a short invariant-based explanation before declaring this impossible.',
      scan,
    };
  }

  if (!validateProofKind(challenge, cleanMaxLength)) {
    return {
      success: false,
      reason: 'The safe-cap invariant check did not support this proof path.',
      scan,
    };
  }

  return {
    success: true,
    resultType: 'invariant-confirmed',
    reason:
      challenge.expectedAnswer === LANGUAGE_ANSWERS.true
        ? 'Decision agrees with the rule-based result. Your explanation is recorded, not automatically proved.'
        : 'Decision agrees with the invariant: words ending in a contain no b (preserved by B and C; D ends in b). Your explanation is not automatically proved.',
    scan,
  };
}
