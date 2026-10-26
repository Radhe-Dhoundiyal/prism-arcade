export const MIXED_PALINDROMES = ['bacaaaacab', 'bacabbacab', 'bacaccacab', 'baccaaccab', 'baccccccab', 'bbacaacabb', 'bbaccccabb', 'bbbaccabbb'];

export const DOSSIERS = [
  {
    id: 'language-correction', portalId: 'language-labyrinth', title: 'A counterexample changes the answer',
    subtitle: 'Problem 5 / Mathematical correction', kind: 'mathematical correction',
    document: '/research/corrections/language-labyrinth.md',
    sources: [
      { label: 'Official Problem 5, page 3', url: '/research/prism-india-problem-set.pdf', page: 3 },
      { label: 'Original TeX: Initial Exploration; Observations 1 and 2; Conclusion', url: '/research/problem-5-original.tex', section: 'Initial Exploration; Observation 1 (Suffix Invariant); Observation 2 (Palindromes with both letters); Conclusion' },
      { label: 'Original rough notebook, page 1 onward (not transcribed)', url: '/research/problem-5-rough.pdf', page: 1 },
      { label: 'Original rough notebook, page 15: zero-answer argument', url: '/research/problem-5-rough.pdf', page: 15, claimScan: true },
      { label: 'Original rough notebook, page 16: observation summary', url: '/research/problem-5-rough.pdf', page: 16, claimScan: true },
    ],
    sections: [
      { title: '1. Question and context', paragraphs: ['The official language starts with a and b. Rule (b): w becomes cw. Rule (c): a split wv with nonempty w becomes vwv; v may be empty. Rule (d): aw becomes wb. Count palindromes of length exactly 10 containing both a and b.'] },
      { title: '2. Original claim and source', paragraphs: ['Observation 2 of the preserved Problem 5 TeX claims that no generated palindrome contains both a and b; its Conclusion gives 0. Observation 1, that no word ends in c, is a separate valid claim. Source headings above locate these claims without inventing pagination for an uncompiled TeX file.'] },
      { title: '3. Evidence-supported development', paragraphs: ['The TeX starts with examples formed by prepending c and the transformation ca to aca. Its Key Turning Insight section switches to tracking the final letter. Notebook page 15 contains the beginning-with-b argument and answer 0; page 16 summarizes the three claimed observations. These references locate the written argument rather than establish when it was discovered.'] },
      { title: '4. The unjustified inference', paragraphs: ['Ending in b and hence beginning in b is compatible with being a mixed palindrome. Inability to apply rule (d) to that finished word is not a contradiction: membership requires a derivation, not future applicability of (d). Rule (c) can wrap a mixed predecessor with its suffix b: aca|b becomes b|aca|b. The argument never establishes that such wrapping is impossible. Also, when v is empty, rule (c) is the identity; this case needs no final letter of v.'] },
      { title: '5. Explicit derivations', derivation: true, paragraphs: ['Each arrow is one official rule application. For rule (c), the split w|v is shown explicitly; w is nonempty.'], steps: [
        'a: axiom (a).',
        'a -> ca: (b), prepend c.',
        'ca -> aca: (c), w=c, v=a; vwv=a+c+a.',
        'aca -> aaca: (c), w=ac, v=a; vwv=a+ac+a.',
        'aaca -> acab: (d), a+w with w=aca; output aca+b.',
        'acab -> bacab: (c), w=aca, v=b; output b+aca+b.',
        'bacab -> acabbacab: (c), w=b, v=acab; output acab+b+acab.',
        'acabbacab -> bacabbacab: (c), w=acabbaca, v=b; output b+acabbaca+b.',
      ] },
      { title: '6. Corrected statements', paragraphs: ['Mixed palindromes do exist: bacab has length 5; bacabbacab has length 10. Both read identically backwards and contain a and b. No generated word ends in c remains a valid unbounded invariant. The length-10 answer is 8, not 0.'] },
      { title: '7. Proof and bounded exhaustive evidence', paragraphs: [
        'Suffix proof by induction on derivations: a,b end in a or b; B preserves the last letter; for nonempty v, C ends in the last letter of v, the suffix of its predecessor; for empty v, C changes nothing; D appends b. Thus no generated word ends in c.',
        'To exhaust length <=10, start with {a,b}, apply B, every nonempty-prefix split for C, and D until no new word of length <=10 is added. No rule shortens a word: B adds 1, C adds |v|, D preserves length. Thus a derivation of a word of length <=10 never needs a longer intermediate word, and finite closure is complete for this cap.',
        'An independent inverse-rule check examines all 88,572 nonempty ternary words of lengths 1..10. Reverse B removes leading c; reverse D maps u+b to a+u; reverse C removes a nonempty leading v when the remaining wv ends in the same v and w is nonempty. Handle same-length D predecessors with visited states/fixed-point reachability; ignore empty-v identity. It agrees with all 3,866 generated words. The eight mixed length-10 palindromes are listed below. These are bounded exhaustive facts, not an unbounded classification of all palindromes.',
      ], list: MIXED_PALINDROMES },
      { title: '8. Consequence for the answer', paragraphs: ['Under the official rules as supplied, exactly 8 length-10 mixed palindromes exist. The counterexamples refute the historical zero answer without changing any rule. They do not refute the no-final-c invariant.'] },
      { title: '9. Reasoning lesson', paragraphs: ['The final-letter invariant is true, but it does not rule out a palindrome starting and ending in b. One construction refutes the original claim. Exhaustive enumeration answers the separate length-10 counting question.'] },
      { title: '10. Correction history', paragraphs: ['The language engine and challenges were corrected after mixed-palindrome witnesses disproved the original zero claim. Independent forward generation and inverse-rule membership checks agreed on the eight length-10 mixed palindromes. The historical claim remains in the original work.'] },
    ],
  },
  {
    id: 'temporal-correction', portalId: 'temporal-graphs', title: 'Already winning is not newly winning',
    subtitle: 'Problem 6 / Mathematical correction', kind: 'mathematical correction',
    document: '/research/corrections/temporal-graphs.md',
    sources: [
      { label: 'Official Problem 6, page 3', url: '/research/prism-india-problem-set.pdf', page: 3 },
      { label: 'Original TeX: Construction with arbitrarily many simultaneous winners, Steps 1-3', url: '/research/problem-6-original.tex', section: 'Construction with arbitrarily many simultaneous winners; Integer-coordinate version; Steps 1-3; Conclusion' },
      { label: 'Original rough notebook, page 1 onward (not transcribed)', url: '/research/problem-6-rough.pdf', page: 1 },
      { label: 'Original rough notebook, page 7: partitioned rectangle and repeated wins', url: '/research/problem-6-rough.pdf', page: 7, claimScan: true },
      { label: 'Original rough notebook, page 8: unbounded conclusion', url: '/research/problem-6-rough.pdf', page: 8, claimScan: true },
    ],
    sections: [
      { title: '1. Question and context', paragraphs: ['One participant joins per day and owns one previously unassigned undirected unit edge. Integer-coordinate endpoints are required in the lattice version. An owner wins as soon as their endpoints have a simple path made entirely of edges assigned on strictly later days. The corrected result concerns participants becoming winners on the same day; the cumulative number of winners is a different quantity.'] },
      { title: '2. Original claim and source', paragraphs: ['The original Problem 6 TeX claims no finite maximum of simultaneous winners, including the lattice case. Its Construction section builds early vertical rungs, later horizontal rails, and a final far-end vertical trigger. The final Conclusion says arbitrarily many players win on the same day.'] },
      { title: '3. Evidence-supported development', paragraphs: ['The Exploration and first observations section starts with loops, then looks for one trigger that benefits many earlier participants. Its Winning criterion correctly expresses the rule as later-edge connectivity, and Steps 1-3 give the ladder construction. Notebook page 7 describes earlier owners winning again while another wins for the first time; page 8 concludes that simultaneous winners are unbounded. The distinction needed for the correction is visible in those pages.'] },
      { title: '4. Exact failure of the ladder argument', paragraphs: ['Number early rungs by k=0..N-1 in their assignment order. After all rails are present but before the far-end trigger, every rung k<N-1 already has a later-only path: go along the bottom rail to rung k+1, cross that later rung, and return along the top rail. All these edges joined later than rung k. Existence of another path via the final trigger does not prove its owner first wins then. Only the latest early rung may newly win on the final day.'] },
      { title: '5. Small counterexample to the intended timing', steps: [
        'Day 1: rung (0,0)-(0,1). Day 2: rung (1,0)-(1,1).',
        'Day 3: bottom (0,0)-(1,0). Day 4: top (0,1)-(1,1).',
        'At day 4, day-1 owner already wins via edge days 3,2,4. All exceed 1.',
        'Day 5: bottom (1,0)-(2,0). Day 6: top (1,1)-(2,1).',
        'Day 7: final rung (2,0)-(2,1). Day-2 owner now wins via edge days 5,7,6. Day-1 owner is not a new winner. Cumulative winners=2; newly winning owners=1.',
      ], paragraphs: ['Every listed edge is unique, has length 1, and has integer-coordinate endpoints. This N=2 example isolates the failure without using duplicate days or invalid diagonals.'] },
      { title: '6. Corrected theorem', paragraphs: ['At most one participant becomes a winner on any day. The bound is attained by a unit square, both with and without the lattice restriction. Cumulative winners over many days can be arbitrarily numerous, for example by completing disjoint squares successively.'] },
      { title: '7. Complete reverse-forest proof', paragraphs: [
        'Fix a finite daily prefix graph with E edges, V incident vertices and k connected components. Process its edges in decreasing join-day order. Maintain connected components, accepting an edge exactly when it joins different components. An edge is rejected exactly when its endpoints already connect through later edges, so exactly its owner is a winner.',
        'The accepted edges form a spanning forest. They are acyclic by construction and connect each original component: a rejected edge has an already accepted path. Thus exactly V-k edges are accepted, and the number of winning owners is W=E-V+k.',
        'Insert the next unique edge. With no new vertices, k either stays the same (within a component) or decreases by 1 (joining two components), so W increases by 1 or 0. With one new vertex, V increases by 1 and k is unchanged, so W is unchanged. With two new vertices, V increases by 2 and k increases by 1, so W is unchanged. These cases exhaust a non-loop edge.',
        'An existing winner keeps its witnessing later-edge path when another edge is added. Consequently the increment in W counts newly winning owners, not winners replacing other winners. That increment is at most 1. The newest owner cannot already win because no later edge exists. Geometry is not used in the upper bound.',
        'Attainment: assign the four sides of a unit square on four consecutive days. When the fourth side arrives, the first side has the simple alternative path using days 2,3,4, and it is the only newly winning owner. The construction also works without the lattice restriction. Therefore the maximum newly winning count is exactly 1.',
      ] },
      { title: '8. Consequence for the answer', paragraphs: ['For simultaneous first-time wins, the answer is 1 in both versions. For all owners who have won by a given date, no fixed bound exists. The manuscript establishes final-day connectivity for many owners, which addresses the latter cumulative count, not its claimed simultaneous first-time event.'] },
      { title: '9. Reasoning lesson', paragraphs: ['Finding a path on the last day does not show that it first became valid then. Checking earlier prefixes separates new winners from owners who had already won. The forest identity bounds how many new winners one edge can create.'] },
      { title: '10. Correction history', paragraphs: ['The correction distinguishes newly winning owners from cumulative winners. Software targets were corrected to 1 and checked against 2,709 independent graph-prefix cases. The failed construction remains documented in the historical work.'] },
    ],
  },
  {
    id: 'number-forge-correction', portalId: 'number-forge', title: 'A residue is not a closure certificate',
    subtitle: 'Number Forge / Software correction', kind: 'engineering correction',
    document: '/research/corrections/number-forge.md',
    sources: [
      { label: 'Official Problem 3, page 2 (context only)', url: '/research/prism-india-problem-set.pdf', page: 2 },
      { label: 'Original Problem 3 TeX (historical context, not attribution of this bug)', url: '/research/problem-3-original.tex', section: 'Historical Problem 3 source; software generalization is a separate artifact' },
    ],
    sections: [
      { title: '1. Question and context', paragraphs: ['The software explores nonnegative combinations of integer generators and tries to reduce a family {ma,mb,c}, with c congruent to 1 modulo m, to a smaller two-generator problem. Global reachability claims require more than a residue calculation.'] },
      { title: '2. Original software claim', paragraphs: ['An earlier software generalization treated the minimal controller count for each residue as sufficient, even when further groups of m controllers create new reduced values. The error was in the Number Forge detectReduction implementation, not a claim established by the original notebook.'] },
      { title: '3. Evidence-supported development', paragraphs: ['Regression checks using [6,7,10] exposed the missing closure condition. The software now certifies the reduction only under a proven sufficient condition. The original Problem 3 notebook concerns the named PRISM examples, not this later software generalization.'] },
      { title: '4. Incorrect assumption', paragraphs: ['In residue r, the number of controllers can be r+mt, not only r. For n=ma*x+mb*y+c*(r+mt), division gives (n-r*c)/m=a*x+b*y+c*t. Ignoring t is sound only if additional c terms introduce no new reduced values. The old residue-only argument did not establish that closure.'] },
      { title: '5. Explicit counterexamples', paragraphs: ['For generators [6,7,10], take m=2, a=3, b=5, controller c=7. Both 14=7+7 and 21=7+7+7 are reachable. Minimal-controller reduction in residue 0 for 14 or residue 1 for 21 leaves quotient 7, which is not in the semigroup generated by 3 and 5. Thus the unqualified reduction falsely rejects both targets.'] },
      { title: '6. Correct sufficient condition', paragraphs: ['The minimal-controller reduction is certified here only when c is already a nonnegative combination of a and b. This condition is sufficient; a different reduction might work when it fails. Without a certificate, the app reports bounded reachability rather than a global impossibility result.'] },
      { title: '7. Complete conditional proof', equation: 'semigroup', paragraphs: ['Let 0<=r<m and n have residue r modulo m. Because ma,mb vanish modulo m and c is 1 modulo m, every representation uses r+mt controllers for some t>=0. Therefore n is representable if and only if (n-r*c)/m belongs to S+<c>. If c belongs to S, closure gives S+<c>=S. Conversely, any quotient in S gives a representation using exactly r controllers. Negative quotients cannot represent nonnegative combinations. This proves the reduction precisely under the stated sufficient condition.', 'For [6,7,10], 7 is not in <3,5>, so this certificate is refused. For the named PRISM cases [9,15,25] and [9,21,49], m=3 gives reduced semigroups <3,5> and <3,7>; controllers 25 and 49 belong to them. Their certified reductions are preserved. Bounded tests separately compare 60 triples x301 targets with independent coefficient enumeration.'] },
      { title: '8. Consequence for software answers', paragraphs: ['14 and 21 must be reachable for [6,7,10]. Lack of this particular certificate is not evidence that a target is unreachable. No conclusion about an error in the original Problem 3 notebook follows from a defect in a later software generalization.'] },
      { title: '9. Reasoning lesson', paragraphs: ['A congruence class controls a count modulo m, not its full value. State a theorem with its closure assumptions and keep exact bounded calculations distinct from global certificates.'] },
      { title: '10. Correction history', paragraphs: ['The generalized reduction was repaired and checked against independent coefficient enumeration. This correction concerns the software; the original notebook and historical solution remain unchanged.'] },
    ],
  },
];

export const getDossier = (portalId) => DOSSIERS.find((entry) => entry.portalId === portalId) ?? null;
export const JOURNEY_STAGES = [
  ['Original Question', 'notebook'], ['Original Exploration', 'notebook'], ['Key Conjecture', 'investigation'],
  ['Mathematical Investigation', 'investigation'], ['Proof or Counterexample', 'proof'], ['Verified Conclusion', 'proof'],
];

export function sourceHref(source) {
  return source.page ? `${source.url}#page=${source.page}` : source.url;
}
