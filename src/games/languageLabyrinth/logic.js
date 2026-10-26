export const DEFAULT_LANGUAGE_MAX_LENGTH = 10;
export const BASE_WORDS = ['a', 'b'];

export function normalizeMaxLength(value, fallback = DEFAULT_LANGUAGE_MAX_LENGTH) {
  const maxLength = Math.trunc(Number(value));

  if (!Number.isFinite(maxLength)) {
    return fallback;
  }

  return Math.max(1, Math.min(DEFAULT_LANGUAGE_MAX_LENGTH, maxLength));
}

export function isPalindrome(word) {
  const cleanWord = String(word || '');

  return cleanWord === cleanWord.split('').reverse().join('');
}

export function describeWord(word) {
  const cleanWord = String(word || '');

  return {
    word: cleanWord,
    length: cleanWord.length,
    startsWith: cleanWord[0] || '',
    endsWith: cleanWord.at(-1) || '',
    palindrome: isPalindrome(cleanWord),
    containsA: cleanWord.includes('a'),
    containsB: cleanWord.includes('b'),
    containsC: cleanWord.includes('c'),
  };
}

export function applyRuleB(word) {
  return [`c${word}`];
}

export function applyRuleC(word) {
  const cleanWord = String(word || '');
  const results = [];

  for (let split = 1; split <= cleanWord.length; split += 1) {
    const w = cleanWord.slice(0, split);
    const v = cleanWord.slice(split);
    const nextWord = `${v}${w}${v}`;

    if (nextWord !== cleanWord) {
      results.push(nextWord);
    }
  }

  return [...new Set(results)];
}

export function applyRuleD(word) {
  const cleanWord = String(word || '');

  if (!cleanWord.startsWith('a')) {
    return [];
  }

  return [`${cleanWord.slice(1)}b`];
}

export function getRuleApplications(word) {
  return [
    ...applyRuleB(word).map((nextWord) => ({ word: nextWord, rule: 'B' })),
    ...applyRuleC(word).map((nextWord) => ({ word: nextWord, rule: 'C' })),
    ...applyRuleD(word).map((nextWord) => ({ word: nextWord, rule: 'D' })),
  ];
}

export function generateLanguage(maxLength = DEFAULT_LANGUAGE_MAX_LENGTH) {
  const cleanMaxLength = normalizeMaxLength(maxLength);
  const nodes = [];
  const seen = new Map();
  const queue = [];

  BASE_WORDS.forEach((word) => {
    if (word.length > cleanMaxLength) {
      return;
    }

    const node = {
      id: word,
      word,
      parent: null,
      rule: 'Base',
      depth: 0,
    };

    seen.set(word, node);
    nodes.push(node);
    queue.push(node);
  });

  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index];

    getRuleApplications(node.word).forEach((application) => {
      if (application.word.length > cleanMaxLength || seen.has(application.word)) {
        return;
      }

      const nextNode = {
        id: application.word,
        word: application.word,
        parent: node.word,
        rule: application.rule,
        depth: node.depth + 1,
      };

      seen.set(application.word, nextNode);
      nodes.push(nextNode);
      queue.push(nextNode);
    });
  }

  return {
    maxLength: cleanMaxLength,
    nodes,
    words: nodes.map((node) => describeWord(node.word)),
  };
}

export function scanLanguageInvariants(words) {
  const describedWords = words.map((entry) =>
    typeof entry === 'string' ? describeWord(entry) : entry,
  );
  const countWhere = (predicate) => describedWords.filter(predicate).length;

  return {
    totalWords: describedWords.length,
    endingInA: countWhere((entry) => entry.endsWith === 'a'),
    endingInB: countWhere((entry) => entry.endsWith === 'b'),
    endingInC: countWhere((entry) => entry.endsWith === 'c'),
    startingWithA: countWhere((entry) => entry.startsWith === 'a'),
    startingWithB: countWhere((entry) => entry.startsWith === 'b'),
    startingWithC: countWhere((entry) => entry.startsWith === 'c'),
    palindromes: countWhere((entry) => entry.palindrome),
    palindromesContainingBothAAndB: countWhere(
      (entry) => entry.palindrome && entry.containsA && entry.containsB,
    ),
    wordsContainingBothAAndB: countWhere((entry) => entry.containsA && entry.containsB),
  };
}

export function isGeneratedWord(word, maxLength = DEFAULT_LANGUAGE_MAX_LENGTH) {
  const cleanWord = String(word || '').trim();

  if (!cleanWord || cleanWord.length > DEFAULT_LANGUAGE_MAX_LENGTH || !/^[abc]+$/.test(cleanWord)) {
    return false;
  }

  return generateLanguage(Math.max(cleanWord.length, normalizeMaxLength(maxLength))).nodes.some(
    (node) => node.word === cleanWord,
  );
}

export function everyGeneratedWordAvoidsFinalC(maxLength = DEFAULT_LANGUAGE_MAX_LENGTH) {
  return scanLanguageInvariants(generateLanguage(maxLength).words).endingInC === 0;
}

export function everyGeneratedMixedWordEndsInB(maxLength = DEFAULT_LANGUAGE_MAX_LENGTH) {
  return generateLanguage(maxLength).words.every((entry) => {
    if (!entry.containsA || !entry.containsB) {
      return true;
    }

    return entry.endsWith === 'b';
  });
}

export function noGeneratedPalindromeContainsBothAAndB(maxLength = DEFAULT_LANGUAGE_MAX_LENGTH) {
  return (
    scanLanguageInvariants(generateLanguage(maxLength).words).palindromesContainingBothAAndB === 0
  );
}

export function noGeneratedCFreeWordContainsBothAAndB(maxLength = DEFAULT_LANGUAGE_MAX_LENGTH) {
  return generateLanguage(maxLength).words.every((entry) => {
    if (!entry.containsA || !entry.containsB) {
      return true;
    }

    return entry.containsC;
  });
}

export function detectCandidateInvariants(scan) {
  const candidates = [];

  if (scan.endingInC === 0) {
    candidates.push('No generated word ends in c.');
  }

  if (scan.palindromesContainingBothAAndB === 0) {
    candidates.push('No palindrome containing both a and b found.');
  }

  return candidates;
}
