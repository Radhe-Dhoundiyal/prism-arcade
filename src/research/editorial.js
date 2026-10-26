// Display copy is separate from the pinned mathematical and challenge records.
export const PORTAL_INTRODUCTIONS = {
  'binary-shift': 'Move the last binary digit to the front. When does that equal multiplication by n?',
  'parity-engine': 'Follow even and odd outcomes through a two-state Markov chain.',
  'number-forge': 'Build integers from a few generators, then investigate the gaps.',
  'grid-dominion': 'Place either color. Player 1 wants unequal line counts; Player 2 wants a balance.',
  'language-labyrinth': 'Generate words, test conjectures, and check what the rules really imply.',
  'temporal-graphs': 'Join one edge each day. Find whose endpoints connect through later edges.',
  'loop-strings': 'Rotate three string ends and trace the cycles they form.',
  'blackboard-moves': 'Choose a pair, change the board, and compare greedy play with optimal paths.',
};

export const RESEARCH_NARRATIVES = {
  'binary-shift': { question: 'For which n can multiplying an n-bit number by n move its last bit to the front?',
    quantities: 'Track x, its final bit, and the value of the rotated string.',
    insight: 'Writing the rotation as an equation gives x = (2^n - 1)/(2n - 1). An integer solution therefore depends on divisibility.',
    correction: 'The rotation equation is unchanged. The software now rejects malformed inputs before converting them to BigInt.',
    verification: 'Direct integer rotations were checked independently for 8,178 candidates with n from 1 to 12. The interface also supports exact BigInt calculations within its stated limits.' },
  'parity-engine': { question: 'How does the parity of the recurrence change after n steps?',
    quantities: 'Only the current parity and the odd probabilities of a and b are needed.',
    insight: 'The recurrence has just two states: Even and Odd. Its finite-step distribution need not equal its stationary distribution.',
    correction: 'Simulation and analytic comparison now use the same initial parity. Identity and alternating chains are labeled separately because their limiting behavior differs.',
    verification: 'An independent four-outcome recurrence checks 32 probability/start combinations through step 30. Displayed probabilities use floating-point arithmetic; simulations are estimates.' },
  'number-forge': { question: 'Which integers can be written as nonnegative combinations of the generators?',
    quantities: 'Compare reachable values, residue classes, and the assumptions behind a reduction.',
    insight: 'A controller determines the residue, but its extra multiples can still change reachability. The reduction needs a closure condition.',
    correction: 'The old generalized reduction wrongly excluded 14 and 21 for [6,7,10]. This was a software error, not evidence that the original notebook was wrong.',
    verification: 'Independent coefficient enumeration checks 60 triples and 301 targets per triple. For the two PRISM examples, a full reachable block proves the infinite tail.' },
  'grid-dominion': { question: 'Can the player to move force equal or unequal final line counts?',
    quantities: 'The score difference is blue edges minus red edges. Either player may use either color.',
    insight: 'Colors are tools, not teams. Player 1 wins when the final difference is nonzero; Player 2 wins when it is zero.',
    correction: 'An alpha-beta caching defect was corrected by storing only exact search results. Larger boards still use a labeled heuristic.',
    verification: 'The independent oracle agrees on 17,450 board/turn predictions and 32,284 Hard move selections in the tested domain. This is not an exhaustive check of larger boards.' },
  'language-labyrinth': { question: 'How many generated length-10 palindromes contain both a and b?',
    quantities: 'Track final letters, word lengths, and whether a proposed palindrome has a legal derivation.',
    insight: 'bacab follows from the official rules and is a palindrome containing a and b. It disproves the original no-mixed-palindrome conjecture.',
    correction: 'The original answer was 0. The corrected answer is 8. The final-letter invariant remains true, but it does not exclude a palindrome beginning and ending in b.',
    verification: 'All 88,572 nonempty words over a, b, c through length 10 were checked independently. Both methods give the same 3,866 generated words: 23 mixed palindromes across lengths 1-10, of which 8 have length exactly 10.' },
  'temporal-graphs': { question: 'How many participants can first become winners on the same day?',
    quantities: 'Separate owners who have already won from owners whose first winning path appears today.',
    insight: 'Process edges from newest to oldest. An edge rejected by the spanning-forest construction belongs to a winning owner.',
    correction: 'Earlier rungs in the original ladder can already win before the last bridge arrives. At most one owner first wins per day, although the cumulative number of winners can grow without bound.',
    verification: 'An independent reverse-forest calculation agrees on 2,709 graph prefixes. Every challenge path uses only later edges, and every challenge fixture uses unit lattice edges.' },
  'loop-strings': { question: 'Which loop structures can be formed by rotating three right endpoints at a time?',
    quantities: 'After tying the endpoints, loops are the cycles of the resulting permutation.',
    insight: 'Each 3-shift is a 3-cycle, so it preserves even permutation parity. For n >= 3, the 3-cycles generate every even permutation.',
    correction: 'The parity argument is unchanged. Fractional permutation inputs are rejected and search limits cannot be raised by caller options.',
    verification: 'Independent enumeration checks all 5,910 permutations for n from 3 to 7. Every starter solution path is replayed using independent rotations; larger BFS searches are not claimed.' },
  'blackboard-moves': { question: 'How long can the process last, and when does greedy play fall short?',
    quantities: 'Track the current entries, legal pairs, and the number of moves still possible.',
    insight: 'For [4,5,5], largest-largest greedy stops after 9 moves, while a legal optimal path lasts 19. The first move can agree even when later choices diverge.',
    correction: 'The software once reused token indices after sorting a board. It now reconstructs each witness on the actual board, where those indices are meaningful.',
    verification: 'Independent searches check 67 starting boards and 4,768 ordered reference states, replaying every optimal and sampled greedy transition. Exact-search caps remain unchanged.' },
};

export function languageResultHeading(result, { witnessRefutesStatement = false } = {}) {
  if (!result?.success) return 'Not supported yet';
  if (result.witness?.ok) return witnessRefutesStatement ? 'Counterexample found' : 'Witness verified';
  return 'Invariant confirmed';
}

export function mixedPalindromeLabels(maxLength) {
  return { through: `Mixed palindromes, lengths 1-${maxLength}`, exactly: `Mixed palindromes, length exactly ${maxLength}` };
}

export const LANGUAGE_WITNESS_LESSONS = {
  'find-length-three-palindrome': 'A generated palindrome of length 3 proves this existence claim. It does not classify palindromes of other lengths.',
  'mixed-word-exists': 'For example, a -> ca -> aca -> cab is a legal derivation. cab contains both a and b, so one witness settles the existence claim.',
  'palindrome-with-a-and-b': 'bacab confirms that a mixed palindrome exists. It also refutes the original conjecture that no mixed palindrome can be generated.',
  'length-ten-mixed-palindrome': 'bacabbacab confirms this existence claim. The separate exhaustive count gives 8 mixed palindromes of length exactly 10.',
};

export function parityLesson(challenge) {
  return challenge.id === 'stationary-match'
    ? 'For a convergent chain, a large n can bring the finite-step probability close to its stationary value. Identity and alternating chains need separate treatment.'
    : challenge.lesson;
}

export function numberForgeInsight(challenge, original) {
  return challenge.id === 'prove-7'
    ? '7 is smaller than each generator: 9, 15 and 25. Any nonzero sum of these generators is at least 9, so 7 is unreachable.'
    : original;
}
