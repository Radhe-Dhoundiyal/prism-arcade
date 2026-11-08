export const MIXED_PALINDROMES = ['bacaaaacab', 'bacabbacab', 'bacaccacab', 'baccaaccab', 'baccccccab', 'bbacaacabb', 'bbaccccabb', 'bbbaccabbb'];

export const DOSSIERS = [
  {
    id: 'language-correction', portalId: 'language-labyrinth', title: 'A counterexample changes the answer',
    subtitle: 'Problem 5 / Mathematical correction', kind: 'mathematical correction',
    document: '/research/corrections/language-labyrinth.md',
    sources: [
      { label: 'Official Problem 5, page 3', url: '/research/prism-india-problem-set.pdf', page: 3 },
      { label: 'Problem 5 solution (public TeX edition)', url: '/research/problem-5-original.tex', section: 'Initial Exploration; Observation 1 (Suffix Invariant); Observation 2 (Palindromes with both letters); Conclusion' },
      { label: 'Notebook (public PDF edition), from page 1', url: '/research/problem-5-rough.pdf', page: 1 },
      { label: 'Notebook page 15: zero-answer argument', url: '/research/problem-5-rough.pdf', page: 15, claimScan: true },
      { label: 'Notebook page 16: observation summary', url: '/research/problem-5-rough.pdf', page: 16, claimScan: true },
    ],
    sections: [
      { title: '1. The question', paragraphs: ['Start with a and b. Rule (b) puts c in front of a word. Rule (c) changes a split w|v into vwv, where w is nonempty and v can be empty. Rule (d) changes aw into wb. How many generated palindromes of length 10 contain both a and b?'] },
      { title: '2. What my notes said', paragraphs: ['My Problem 5 TeX concluded that the answer was 0: I thought no palindrome could contain both a and b. It also observed that no generated word ends in c; that part was correct. The TeX explores ca -> aca and final letters. The zero-answer argument is on notebook page 15, with a summary on page 16. These are the written sources, not a claim about the order in which the ideas occurred.'] },
      { title: '3. Where the argument breaks', paragraphs: ['A palindrome can start and end in b, so reaching a final b is not a contradiction. A finished word need not allow another use of rule (d); it only needs a legal path from an axiom. In particular, rule (c) can turn aca|b into b|aca|b. My original argument did not rule that out. When v is empty, rule (c) simply leaves the word unchanged.'] },
      { title: '4. Building the counterexample', derivation: true, paragraphs: ['Every arrow below is one allowed rule. For rule (c), I have marked the split w|v, with w nonempty.'], steps: [
        'a: axiom (a).',
        'a -> ca: (b), prepend c.',
        'ca -> aca: (c), w=c, v=a; vwv=a+c+a.',
        'aca -> aaca: (c), w=ac, v=a; vwv=a+ac+a.',
        'aaca -> acab: (d), a+w with w=aca; output aca+b.',
        'acab -> bacab: (c), w=aca, v=b; output b+aca+b.',
        'bacab -> acabbacab: (c), w=b, v=acab; output acab+b+acab.',
        'acabbacab -> bacabbacab: (c), w=acabbaca, v=b; output b+acabbaca+b.',
      ] },
      { title: '5. What this shows', paragraphs: ['Both bacab (length 5) and bacabbacab (length 10) are generated palindromes containing a and b. So the original zero claim is false. The observation about never ending in c is still true, though. The full length-10 count needs a separate check.'] },
      { title: '6. Checking the count', paragraphs: [
        'The last-letter observation follows by induction. The starting words a and b do not end in c. Rule (b) keeps the last letter; rule (c) either keeps the word (empty v) or ends in the same last letter as v; rule (d) ends in b. None can produce a final c.',
        'For the length-10 count, start with {a,b} and repeatedly apply rules (b), (c) for every split with nonempty w, and (d), keeping words of length at most 10. Rule (b) adds a letter, rule (c) adds |v| letters, and rule (d) keeps the length. Nothing shortens a word, so this search cannot miss a length-10 word by skipping a longer intermediate step.',
        'A second check worked backwards through all 88,572 nonempty words over a,b,c of length 1-10. Reverse (b) removes a first c; reverse (d) changes u+b to a+u; reverse (c) removes a nonempty leading v when the remaining wv ends with that same v and w is nonempty. The check revisits same-length (d) predecessors until stable and ignores the empty-v identity. It found exactly the same 3,866 generated words. Of these, the following eight are mixed palindromes of length 10:',
      ], list: MIXED_PALINDROMES },
      { title: '7. Answer and limits', paragraphs: ['The corrected answer is 8, not 0. The counterexample disproves my earlier conjecture, and the two finite checks establish the length-10 count. They do not classify palindromes of every length. The game and challenges were updated after this correction; the original notes still show the mistake.'] },
    ],
  },
  {
    id: 'temporal-correction', portalId: 'temporal-graphs', title: 'Already winning is not newly winning',
    subtitle: 'Problem 6 / Mathematical correction', kind: 'mathematical correction',
    document: '/research/corrections/temporal-graphs.md',
    sources: [
      { label: 'Official Problem 6, page 3', url: '/research/prism-india-problem-set.pdf', page: 3 },
      { label: 'Problem 6 solution (public TeX edition)', url: '/research/problem-6-original.tex', section: 'Construction with arbitrarily many simultaneous winners; Integer-coordinate version; Steps 1-3; Conclusion' },
      { label: 'Notebook (public PDF edition), from page 1', url: '/research/problem-6-rough.pdf', page: 1 },
      { label: 'Notebook page 7: ladder and repeated wins', url: '/research/problem-6-rough.pdf', page: 7, claimScan: true },
      { label: 'Notebook page 8: unbounded conclusion', url: '/research/problem-6-rough.pdf', page: 8, claimScan: true },
    ],
    sections: [
      { title: '1. The question', paragraphs: ['Each day one player claims a new undirected unit edge. A player wins when their edge endpoints can be joined by a simple path made only of edges claimed on later days. The lattice version requires integer-coordinate endpoints. The important word is first: how many players can become winners on the same day?'] },
      { title: '2. What the ladder argument claimed', paragraphs: ['My original Problem 6 solution built early vertical rungs, later horizontal rails, and a final rung at the far end. I concluded that arbitrarily many owners would win together, even on the integer lattice. The TeX gives the construction in Steps 1-3. Notebook page 7 mentions owners winning again while another first wins; page 8 gives the unbounded conclusion. The problem is in that difference between winning again and winning for the first time.'] },
      { title: '3. Where the timing goes wrong', paragraphs: ['Call the early rungs 0 through N-1 in the order they were added. Before the final rung appears, rung k (for k<N-1) already has a path using newer edges: along the lower rail, across rung k+1, then back along the upper rail. A second path on the final day does not make that owner a new winner. At most the latest early rung is newly winning then.'] },
      { title: '4. A two-rung example', steps: [
        'Day 1: rung (0,0)-(0,1). Day 2: rung (1,0)-(1,1).',
        'Day 3: bottom (0,0)-(1,0). Day 4: top (0,1)-(1,1).',
        'At day 4, day-1 owner already wins via edge days 3,2,4. All exceed 1.',
        'Day 5: bottom (1,0)-(2,0). Day 6: top (1,1)-(2,1).',
        'Day 7: final rung (2,0)-(2,1). Day-2 owner now wins via edge days 5,7,6. Day-1 owner is not a new winner. Cumulative winners=2; newly winning owners=1.',
      ], paragraphs: ['All seven edges are distinct unit edges with integer-coordinate endpoints. This small case shows the timing error without relying on diagonals or repeated edges.'] },
      { title: '5. The corrected answer', paragraphs: ['At most one player first becomes a winner on any day. A unit square reaches that bound, with or without the lattice restriction. However, the total number of people who have won by some day can grow without bound: keep finishing separate squares on later days.'] },
      { title: '6. Why the bound is one', paragraphs: [
        'Take the graph after any day, with E edges, V vertices incident to those edges, and k connected components. Now read its edges backwards in time. Keep an edge if it joins two components that were disconnected so far. If its endpoints were already connected, its owner has a path made of later edges and is a winner.',
        'The kept edges form a spanning forest: they never close a cycle, and each skipped edge already has a path through kept edges. A spanning forest has V-k edges. So the total number of winning owners is W=E-V+k.',
        'What happens when a new edge is added? If both endpoints already exist, V stays the same and k either stays the same or drops by one; W goes up by at most one. If the edge introduces one new vertex, V goes up by one and k stays the same, leaving W unchanged. If both vertices are new, V goes up by two and k by one, again leaving W unchanged. These are all the cases for a new non-loop edge.',
        'Once someone wins, their path made of later edges remains available. So an increase in W counts first-time winners rather than replacing old winners. That increase is at most one. The newest player cannot win immediately because there are no edges assigned after theirs. None of this upper-bound argument needs geometry.',
        'For equality, add the four sides of a unit square on four days. On day 4, the owner of the first side gains the path along sides 2, 3 and 4, and no other owner first wins. Thus the maximum is exactly one.',
      ] },
      { title: '7. Checks and limits', paragraphs: ['The game was updated to use the first-time bound of 1. Later independent checks agreed on 2,709 graph prefixes. These finite tests support the implementation; the forest argument above proves the bound. The old ladder claim remains visible in the original notes.'] },
    ],
  },
  {
    id: 'number-forge-correction', portalId: 'number-forge', title: 'When a residue shortcut failed',
    subtitle: 'Number Forge / Software correction', kind: 'engineering correction',
    document: '/research/corrections/number-forge.md',
    sources: [
      { label: 'Official Problem 3, page 2 (context only)', url: '/research/prism-india-problem-set.pdf', page: 2 },
      { label: 'Problem 3 solution (public TeX edition; earlier named cases)', url: '/research/problem-3-original.tex', section: 'Historical Problem 3 source; software generalization is a separate artifact' },
    ],
    sections: [
      { title: '1. What the app tried to do', paragraphs: ['Number Forge looks for nonnegative combinations of generators. For a family {ma,mb,c}, where c is 1 modulo m, the app tried to use the residue to turn a three-generator question into a smaller two-generator one. That is useful, but a residue alone is not enough to prove a target impossible.'] },
      { title: '2. The shortcut that went wrong', paragraphs: ['An earlier version of detectReduction used the smallest possible number of c terms for each residue. But the count can be r+mt, not just r. Those extra m copies of c may make new values reachable. A regression case using [6,7,10] exposed the gap. This was a later software mistake, not a claim made in my original Problem 3 notebook.'] },
      { title: '3. Two targets it missed', paragraphs: ['For [6,7,10], let m=2, a=3, b=5, and c=7. Clearly 14=7+7 and 21=7+7+7 are reachable. The shortcut uses r=0 for 14 and r=1 for 21, leaving the quotient 7 in both cases. Since 7 is not a nonnegative combination of 3 and 5, the shortcut wrongly rejected both numbers.'] },
      { title: '4. When the shortcut is safe', paragraphs: ['The app now certifies this reduction only if c can already be made from a and b. Then adding extra groups of m controllers cannot create anything outside the smaller semigroup. This is a sufficient condition, not a claim that every other reduction is impossible.'] },
      { title: '5. Why that condition works', equation: 'semigroup', paragraphs: ['Let 0<=r<m and let n have residue r modulo m. Because ma and mb are multiples of m while c is 1 modulo m, any representation must use r+mt copies of c for some t>=0. Dividing the rest by m gives (n-r*c)/m=ax+by+ct. Write S for the nonnegative combinations of a and b. So n is reachable exactly when this quotient belongs to S+<c>. If c is in S, then S+<c>=S, and any quotient in S gives a representation with r copies of c. A negative quotient cannot work.', 'For [6,7,10], c=7 is not in <3,5>, so the app does not issue this certificate. For the original named examples [9,15,25] and [9,21,49], m=3 and the reduced pairs are <3,5> and <3,7>. Their controllers, 25 and 49, belong to the corresponding smaller semigroups, so those reductions remain certified.'] },
      { title: '6. What changed and what was checked', paragraphs: ['The app now accepts 14 and 21 for [6,7,10]. When the condition is not proved, it shows bounded reachability instead of claiming global impossibility. Independent coefficient enumeration compared 60 generator triples across 301 targets each. The original notebook solution was not changed: this fix concerns only the later generalized software.'] },
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
