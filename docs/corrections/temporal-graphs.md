# Already winning is not newly winning

Problem 6 / Mathematical correction

This note explains a later correction to my original answer. The notebook and TeX still show what I wrote at the time; private originals are not posted here.

## Original sources

- [Official Problem 6, page 3](../../public/research/availability.html?source=%2Fresearch%2Fprism-india-problem-set.pdf%23page%3D3) - Original reference: `/research/prism-india-problem-set.pdf#page=3`.
- [Original TeX: Construction with arbitrarily many simultaneous winners, Steps 1-3](../../public/research/availability.html?source=%2Fresearch%2Fproblem-6-original.tex) - Original reference: `/research/problem-6-original.tex`. Section: Construction with arbitrarily many simultaneous winners; Integer-coordinate version; Steps 1-3; Conclusion.
- [Original rough notebook, page 1 onward (not transcribed)](../../public/research/availability.html?source=%2Fresearch%2Fproblem-6-rough.pdf%23page%3D1) - Original reference: `/research/problem-6-rough.pdf#page=1`.
- [Original rough notebook, page 7: partitioned rectangle and repeated wins](../../public/research/availability.html?source=%2Fresearch%2Fproblem-6-rough.pdf%23page%3D7) - Original reference: `/research/problem-6-rough.pdf#page=7`.
- [Original rough notebook, page 8: unbounded conclusion](../../public/research/availability.html?source=%2Fresearch%2Fproblem-6-rough.pdf%23page%3D8) - Original reference: `/research/problem-6-rough.pdf#page=8`.

## The question

Each day one player claims a new undirected unit edge. A player wins when their edge endpoints can be joined by a simple path made only of edges claimed on later days. The lattice version requires integer-coordinate endpoints. The important word is first: how many players can become winners on the same day?

## What the ladder argument claimed

My original Problem 6 solution built early vertical rungs, later horizontal rails, and a final rung at the far end. I concluded that arbitrarily many owners would win together, even on the integer lattice. The TeX gives the construction in Steps 1-3. Notebook page 7 mentions owners winning again while another first wins; page 8 gives the unbounded conclusion. The problem is in that difference between winning again and winning for the first time.

## Where the timing goes wrong

Call the early rungs 0 through N-1 in the order they were added. Before the final rung appears, rung k (for `k < N-1`) already has a path using newer edges: along the lower rail, across rung k+1, then back along the upper rail. A second path on the final day does not make that owner a new winner. At most the latest early rung is newly winning then.

## A two-rung example

All seven edges are distinct unit edges with integer-coordinate endpoints. This small case shows the timing error without relying on diagonals or repeated edges.

1. Day 1: rung (0,0)-(0,1). Day 2: rung (1,0)-(1,1).
2. Day 3: bottom (0,0)-(1,0). Day 4: top (0,1)-(1,1).
3. At day 4, day-1 owner already wins via edge days 3,2,4. All exceed 1.
4. Day 5: bottom (1,0)-(2,0). Day 6: top (1,1)-(2,1).
5. Day 7: final rung (2,0)-(2,1). Day-2 owner now wins via edge days 5,7,6. Day-1 owner is not a new winner. Cumulative winners=2; newly winning owners=1.

## The corrected answer

At most one player first becomes a winner on any day. A unit square reaches that bound, with or without the lattice restriction. However, the total number of people who have won by some day can grow without bound: keep finishing separate squares on later days.

## Why the bound is one

Take the graph after any day, with E edges, V vertices incident to those edges, and k connected components. Now read its edges backwards in time. Keep an edge if it joins two components that were disconnected so far. If its endpoints were already connected, its owner has a path made of later edges and is a winner.

The kept edges form a spanning forest: they never close a cycle, and each skipped edge already has a path through kept edges. A spanning forest has V-k edges. So the total number of winning owners is W=E-V+k.

What happens when a new edge is added? If both endpoints already exist, V stays the same and k either stays the same or drops by one; W goes up by at most one. If the edge introduces one new vertex, V goes up by one and k stays the same, leaving W unchanged. If both vertices are new, V goes up by two and k by one, again leaving W unchanged. These are all the cases for a new non-loop edge.

Once someone wins, their path made of later edges remains available. So an increase in W counts first-time winners rather than replacing old winners. That increase is at most one. The newest player cannot win immediately because there are no edges assigned after theirs. None of this upper-bound argument needs geometry.

For equality, add the four sides of a unit square on four days. On day 4, the owner of the first side gains the path along sides 2, 3 and 4, and no other owner first wins. Thus the maximum is exactly one.

## Checks and limits

The game was updated to use the first-time bound of 1. Later independent checks agreed on 2,709 graph prefixes. These finite tests support the implementation; the forest argument above proves the bound. The old ladder claim remains visible in the original notes.
