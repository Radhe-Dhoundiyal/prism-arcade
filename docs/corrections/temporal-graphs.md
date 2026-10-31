# Already winning is not newly winning

Problem 6 / Mathematical correction

Mathematical correction dossier. Historical originals remain private; this document presents the later correction, not an edited historical manuscript.

## Source References

- [Official Problem 6, page 3](../../public/research/availability.html?source=%2Fresearch%2Fprism-india-problem-set.pdf%23page%3D3) - Original reference: `/research/prism-india-problem-set.pdf#page=3`.
- [Original TeX: Construction with arbitrarily many simultaneous winners, Steps 1-3](../../public/research/availability.html?source=%2Fresearch%2Fproblem-6-original.tex) - Original reference: `/research/problem-6-original.tex`. Section: Construction with arbitrarily many simultaneous winners; Integer-coordinate version; Steps 1-3; Conclusion.
- [Original rough notebook, page 1 onward (not transcribed)](../../public/research/availability.html?source=%2Fresearch%2Fproblem-6-rough.pdf%23page%3D1) - Original reference: `/research/problem-6-rough.pdf#page=1`.
- [Original rough notebook, page 7: partitioned rectangle and repeated wins](../../public/research/availability.html?source=%2Fresearch%2Fproblem-6-rough.pdf%23page%3D7) - Original reference: `/research/problem-6-rough.pdf#page=7`.
- [Original rough notebook, page 8: unbounded conclusion](../../public/research/availability.html?source=%2Fresearch%2Fproblem-6-rough.pdf%23page%3D8) - Original reference: `/research/problem-6-rough.pdf#page=8`.

## The question: first-time wins

One participant joins per day and owns one previously unassigned undirected unit edge. Integer-coordinate endpoints are required in the lattice version. An owner wins as soon as their endpoints have a simple path made entirely of edges assigned on strictly later days. The corrected result concerns participants becoming winners on the same day; the cumulative number of winners is a different quantity.

## The original ladder claim

The original Problem 6 TeX claims no finite maximum of simultaneous winners, including the lattice case. Its Construction section builds early vertical rungs, later horizontal rails, and a final far-end vertical trigger. The final Conclusion says arbitrarily many players win on the same day.

## What the original work records

The Exploration and first observations section starts with loops, then looks for one trigger that benefits many earlier participants. Its Winning criterion correctly expresses the rule as later-edge connectivity, and Steps 1-3 give the ladder construction. Notebook page 7 describes earlier owners winning again while another wins for the first time; page 8 concludes that simultaneous winners are unbounded. The distinction needed for the correction is visible in those pages.

## Why the ladder argument failed

Number early rungs by k=0..N-1 in their assignment order. After all rails are present but before the far-end trigger, every rung k<N-1 already has a later-only path: go along the bottom rail to rung k+1, cross that later rung, and return along the top rail. All these edges joined later than rung k. Existence of another path via the final trigger does not prove its owner first wins then. Only the latest early rung may newly win on the final day.

## A two-rung counterexample

Every listed edge is unique, has length 1, and has integer-coordinate endpoints. This N=2 example isolates the failure without using duplicate days or invalid diagonals.

1. `Day 1: rung (0,0)-(0,1). Day 2: rung (1,0)-(1,1).`
2. `Day 3: bottom (0,0)-(1,0). Day 4: top (0,1)-(1,1).`
3. `At day 4, day-1 owner already wins via edge days 3,2,4. All exceed 1.`
4. `Day 5: bottom (1,0)-(2,0). Day 6: top (1,1)-(2,1).`
5. `Day 7: final rung (2,0)-(2,1). Day-2 owner now wins via edge days 5,7,6. Day-1 owner is not a new winner. Cumulative winners=2; newly winning owners=1.`

## The corrected theorem

At most one participant becomes a winner on any day. The bound is attained by a unit square, both with and without the lattice restriction. Cumulative winners over many days can be arbitrarily numerous, for example by completing disjoint squares successively.

## The reverse-forest proof

Fix a finite daily prefix graph with E edges, V incident vertices and k connected components. Process its edges in decreasing join-day order. Maintain connected components, accepting an edge exactly when it joins different components. An edge is rejected exactly when its endpoints already connect through later edges, so exactly its owner is a winner.

The accepted edges form a spanning forest. They are acyclic by construction and connect each original component: a rejected edge has an already accepted path. Thus exactly V-k edges are accepted, and the number of winning owners is W=E-V+k.

Insert the next unique edge. With no new vertices, k either stays the same (within a component) or decreases by 1 (joining two components), so W increases by 1 or 0. With one new vertex, V increases by 1 and k is unchanged, so W is unchanged. With two new vertices, V increases by 2 and k increases by 1, so W is unchanged. These cases exhaust a non-loop edge.

An existing winner keeps its witnessing later-edge path when another edge is added. Consequently the increment in W counts newly winning owners, not winners replacing other winners. That increment is at most 1. The newest owner cannot already win because no later edge exists. Geometry is not used in the upper bound.

Attainment: assign the four sides of a unit square on four consecutive days. When the fourth side arrives, the first side has the simple alternative path using days 2,3,4, and it is the only newly winning owner. The construction also works without the lattice restriction. Therefore the maximum newly winning count is exactly 1.

## First-time and cumulative winners

For simultaneous first-time wins, the answer is 1 in both versions. For all owners who have won by a given date, no fixed bound exists. The manuscript establishes final-day connectivity for many owners, which addresses the latter cumulative count, not its claimed simultaneous first-time event.

## Why the timing matters

Finding a path on the last day does not show that it first became valid then. Checking earlier prefixes separates new winners from owners who had already won. The forest identity bounds how many new winners one edge can create.

## How the correction was checked

The correction distinguishes newly winning owners from cumulative winners. Software targets were corrected to 1 and checked against 2,709 independent graph-prefix cases. The failed construction remains documented in the historical work.
