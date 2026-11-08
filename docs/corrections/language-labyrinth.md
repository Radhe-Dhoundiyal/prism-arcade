# A counterexample changes the answer

Problem 5 / Mathematical correction

This note explains a later correction to my original answer. The notebook and TeX still show what I wrote at the time; private originals are not posted here.

## Earlier sources

These are edited public editions; the untouched files remain private.

- [Problem 5 solution (public TeX edition)](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/problem-5-solution.tex) — see *Initial Exploration*, Observations 1–2 and the conclusion.
- [Full notebook (public PDF edition)](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/problem-5-notebook.pdf)
- [Notebook page 15: my zero-answer argument](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/pages/language-labyrinth-15.webp)
- [Notebook page 16: observation summary](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/pages/language-labyrinth-16.webp)

The official Problem 5 statement is on page 3 of the [PRISM India](https://www.prism-india.org/) problem set, which is not reproduced here.

## The question

Start with a and b. Rule (b) puts c in front of a word. Rule (c) changes a split w|v into vwv, where w is nonempty and v can be empty. Rule (d) changes aw into wb. How many generated palindromes of length 10 contain both a and b?

## What my notes said

My Problem 5 TeX concluded that the answer was 0: I thought no palindrome could contain both a and b. It also observed that no generated word ends in c; that part was correct. The TeX explores ca -> aca and final letters. The zero-answer argument is on notebook page 15, with a summary on page 16. These are the written sources, not a claim about the order in which the ideas occurred.

## Where the argument breaks

A palindrome can start and end in b, so reaching a final b is not a contradiction. A finished word need not allow another use of rule (d); it only needs a legal path from an axiom. In particular, rule (c) can turn aca|b into b|aca|b. My original argument did not rule that out. When v is empty, rule (c) simply leaves the word unchanged.

## Building the counterexample

Every arrow below is one allowed rule. For rule (c), I have marked the split w|v, with w nonempty.

1. `a: axiom (a).`
2. `a -> ca: (b), prepend c.`
3. `ca -> aca: (c), w=c, v=a; vwv=a+c+a.`
4. `aca -> aaca: (c), w=ac, v=a; vwv=a+ac+a.`
5. `aaca -> acab: (d), a+w with w=aca; output aca+b.`
6. `acab -> bacab: (c), w=aca, v=b; output b+aca+b.`
7. `bacab -> acabbacab: (c), w=b, v=acab; output acab+b+acab.`
8. `acabbacab -> bacabbacab: (c), w=acabbaca, v=b; output b+acabbaca+b.`

## What this shows

Both `bacab` (length 5) and `bacabbacab` (length 10) are generated palindromes containing a and b. So the original zero claim is false. The observation about never ending in c is still true, though. The full length-10 count needs a separate check.

## Checking the count

The last-letter observation follows by induction. The starting words a and b do not end in c. Rule (b) keeps the last letter; rule (c) either keeps the word (empty v) or ends in the same last letter as v; rule (d) ends in b. None can produce a final c.

For the length-10 count, start with {a,b} and repeatedly apply rules (b), (c) for every split with nonempty w, and (d), keeping words of length at most 10. Rule (b) adds a letter, rule (c) adds |v| letters, and rule (d) keeps the length. Nothing shortens a word, so this search cannot miss a length-10 word by skipping a longer intermediate step.

A second check worked backwards through all 88,572 nonempty words over a,b,c of length 1-10. Reverse (b) removes a first c; reverse (d) changes u+b to a+u; reverse (c) removes a nonempty leading v when the remaining wv ends with that same v and w is nonempty. The check revisits same-length (d) predecessors until stable and ignores the empty-v identity. It found exactly the same 3,866 generated words. Of these, the following eight are mixed palindromes of length 10:

- `bacaaaacab`
- `bacabbacab`
- `bacaccacab`
- `baccaaccab`
- `baccccccab`
- `bbacaacabb`
- `bbaccccabb`
- `bbbaccabbb`

## Answer and limits

The corrected answer is 8, not 0. The counterexample disproves my earlier conjecture, and the two finite checks establish the length-10 count. They do not classify palindromes of every length. The game and challenges were updated after this correction; the original notes still show the mistake.
