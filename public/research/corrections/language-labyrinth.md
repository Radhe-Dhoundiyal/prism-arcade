# A counterexample changes the answer

Problem 5 / Mathematical correction

Mathematical correction dossier. Historical originals remain private; this document presents the later correction, not an edited historical manuscript.

## Source References

- [Official Problem 5, page 3](../availability.html?source=%2Fresearch%2Fprism-india-problem-set.pdf%23page%3D3) - Original reference: `/research/prism-india-problem-set.pdf#page=3`.
- [Original TeX: Initial Exploration; Observations 1 and 2; Conclusion](../availability.html?source=%2Fresearch%2Fproblem-5-original.tex) - Original reference: `/research/problem-5-original.tex`. Section: Initial Exploration; Observation 1 (Suffix Invariant); Observation 2 (Palindromes with both letters); Conclusion.
- [Original rough notebook, page 1 onward (not transcribed)](../availability.html?source=%2Fresearch%2Fproblem-5-rough.pdf%23page%3D1) - Original reference: `/research/problem-5-rough.pdf#page=1`.
- [Original rough notebook, page 15: zero-answer argument](../availability.html?source=%2Fresearch%2Fproblem-5-rough.pdf%23page%3D15) - Original reference: `/research/problem-5-rough.pdf#page=15`.
- [Original rough notebook, page 16: observation summary](../availability.html?source=%2Fresearch%2Fproblem-5-rough.pdf%23page%3D16) - Original reference: `/research/problem-5-rough.pdf#page=16`.

## 1. Question and context

The official language starts with a and b. Rule (b): w becomes cw. Rule (c): a split wv with nonempty w becomes vwv; v may be empty. Rule (d): aw becomes wb. Count palindromes of length exactly 10 containing both a and b.




## 2. Original claim and source

Observation 2 of the preserved Problem 5 TeX claims that no generated palindrome contains both a and b; its Conclusion gives 0. Observation 1, that no word ends in c, is a separate valid claim. Source headings above locate these claims without inventing pagination for an uncompiled TeX file.




## 3. Evidence-supported development

The TeX starts with examples formed by prepending c and the transformation ca to aca. Its Key Turning Insight section switches to tracking the final letter. Notebook page 15 contains the beginning-with-b argument and answer 0; page 16 summarizes the three claimed observations. These references locate the written argument rather than establish when it was discovered.




## 4. The unjustified inference

Ending in b and hence beginning in b is compatible with being a mixed palindrome. Inability to apply rule (d) to that finished word is not a contradiction: membership requires a derivation, not future applicability of (d). Rule (c) can wrap a mixed predecessor with its suffix b: aca|b becomes b|aca|b. The argument never establishes that such wrapping is impossible. Also, when v is empty, rule (c) is the identity; this case needs no final letter of v.




## 5. Explicit derivations

Each arrow is one official rule application. For rule (c), the split w|v is shown explicitly; w is nonempty.

1. `a: axiom (a).`
2. `a -> ca: (b), prepend c.`
3. `ca -> aca: (c), w=c, v=a; vwv=a+c+a.`
4. `aca -> aaca: (c), w=ac, v=a; vwv=a+ac+a.`
5. `aaca -> acab: (d), a+w with w=aca; output aca+b.`
6. `acab -> bacab: (c), w=aca, v=b; output b+aca+b.`
7. `bacab -> acabbacab: (c), w=b, v=acab; output acab+b+acab.`
8. `acabbacab -> bacabbacab: (c), w=acabbaca, v=b; output b+acabbaca+b.`


## 6. Corrected statements

Mixed palindromes do exist: bacab has length 5; bacabbacab has length 10. Both read identically backwards and contain a and b. No generated word ends in c remains a valid unbounded invariant. The length-10 answer is 8, not 0.




## 7. Proof and bounded exhaustive evidence

Suffix proof by induction on derivations: a,b end in a or b; B preserves the last letter; for nonempty v, C ends in the last letter of v, the suffix of its predecessor; for empty v, C changes nothing; D appends b. Thus no generated word ends in c.

To exhaust length <=10, start with {a,b}, apply B, every nonempty-prefix split for C, and D until no new word of length <=10 is added. No rule shortens a word: B adds 1, C adds |v|, D preserves length. Thus a derivation of a word of length <=10 never needs a longer intermediate word, and finite closure is complete for this cap.

An independent inverse-rule check examines all 88,572 nonempty ternary words of lengths 1..10. Reverse B removes leading c; reverse D maps u+b to a+u; reverse C removes a nonempty leading v when the remaining wv ends in the same v and w is nonempty. Handle same-length D predecessors with visited states/fixed-point reachability; ignore empty-v identity. It agrees with all 3,866 generated words. The eight mixed length-10 palindromes are listed below. These are bounded exhaustive facts, not an unbounded classification of all palindromes.


- `bacaaaacab`
- `bacabbacab`
- `bacaccacab`
- `baccaaccab`
- `baccccccab`
- `bbacaacabb`
- `bbaccccabb`
- `bbbaccabbb`

## 8. Consequence for the answer

Under the official rules as supplied, exactly 8 length-10 mixed palindromes exist. The counterexamples refute the historical zero answer without changing any rule. They do not refute the no-final-c invariant.




## 9. Reasoning lesson

The final-letter invariant is true, but it does not rule out a palindrome starting and ending in b. One construction refutes the original claim. Exhaustive enumeration answers the separate length-10 counting question.




## 10. Correction history

The language engine and challenges were corrected after mixed-palindrome witnesses disproved the original zero claim. Independent forward generation and inverse-rule membership checks agreed on the eight length-10 mixed palindromes. The historical claim remains in the original work.



