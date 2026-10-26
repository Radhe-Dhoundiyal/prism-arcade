import { generateLanguage } from './logic.js';

export const AUDITED_MIXED_PALINDROMES = [
  'bacaaaacab', 'bacabbacab', 'bacaccacab', 'baccaaccab',
  'baccccccab', 'bbacaacabb', 'bbaccccabb', 'bbbaccabbb',
];

export const LANGUAGE_THEOREMS = [
  'No generated word ends in c: the bases end in a or b; B preserves the last letter; C preserves it when v is nonempty and is unchanged when v is empty; D ends in b.',
  'Rule (b) prepends c.',
  'Rule (c) can create palindromic wrapping: acab = aca|b gives b|aca|b.',
  'Mixed a/b words exist: a -> ca -> aca -> cab.',
  'Mixed palindromes exist: bacab is a generated mixed palindrome.',
  'The original zero-answer conjecture is false under the official rules as written: bacabbacab is a length-10 mixed palindrome.',
];

export function getLanguageAudit() {
  const generation = generateLanguage(10);
  const byWord = new Map(generation.nodes.map((node) => [node.word, node]));
  const featured = ['bacab', 'bacabbacab'].map((word) => {
    const derivation = [];
    let node = byWord.get(word);
    while (node) {
      derivation.unshift(node);
      node = byWord.get(node.parent);
    }
    return { ...generation.words.find((entry) => entry.word === word), generated: byWord.has(word), derivation };
  });
  const mixedPalindromes = generation.words.filter((entry) => entry.length === 10 && entry.palindrome && entry.containsA && entry.containsB).map((entry) => entry.word).sort();
  return { featured, mixedPalindromes };
}
