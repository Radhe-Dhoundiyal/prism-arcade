# Mathematical Scope

This edition uses original software explanations and executable rules rather than distributing the official problem paper. The external source is the [PRISM India website](https://www.prism-india.org/). No permission to redistribute that paper is inferred.

- Binary Shift uses integer bit rotation and BigInt divisibility. Search is bounded; the binary equation must also satisfy its original width conditions.
- Parity Engine distinguishes finite-step probability from a stationary distribution. Periodic chains can oscillate and identity chains have no unique stationary limit. Analytic results use floating-point evaluation, not symbolic arithmetic.
- Number Forge computes bounded reachability and displays a generalized reduction only with its sufficient closure certificate. A bounded miss does not prove global impossibility. [Reduction argument](../public/research/corrections/number-forge.md).
- Grid Dominion treats red and blue as tools available to either player. Difference is blue edges minus red edges. At the end, nonzero means Player 1 wins; zero means Player 2 wins. Perfect prediction is restricted to the exact-search domain; larger Hard play is heuristic.
- Language Labyrinth checks constructive word membership and finite closure. There are 23 mixed palindromes across lengths 1-10 and eight at exactly length 10. The final-letter invariant does not imply an absence of mixed palindromes. [Witnesses and count](../public/research/corrections/language-labyrinth.md).
- Temporal Graphs distinguishes cumulative winners from owners first winning today. Reverse-forest counting bounds the latter by one per insertion under distinct edge times. [Counting argument](../public/research/corrections/temporal-graphs.md).
- Loop Strings relates endpoint rotations to even permutations and their cycles. Finite BFS paths and counting tools have explicit size limits.
- Blackboard Moves compares indexed legal witnesses with greedy strategies. From [4,5,5], the maximum is 19 moves while largest-largest greedy gives 9; this is not a universal bound for arbitrary boards.

Independent regression domains remain: Grid's declared board/turn cases, 67 Blackboard starting states, 60 Number Forge triples, 2,709 Temporal graph prefixes, 5,910 Loop permutations, 8,178 Binary candidates and all 88,572 nonempty ternary words through length 10. These are coverage statements, not full formal verification.
