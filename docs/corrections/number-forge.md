# When a residue shortcut failed

Number Forge / Software correction

This explains a later software fix, not a mistake in my original Problem 3 notebook. The original source files are preserved privately.

## Original sources

- [Official Problem 3, page 2 (context only)](../../public/research/availability.html?source=%2Fresearch%2Fprism-india-problem-set.pdf%23page%3D2) - Original reference: `/research/prism-india-problem-set.pdf#page=2`.
- [Original Problem 3 TeX (historical context, not attribution of this bug)](../../public/research/availability.html?source=%2Fresearch%2Fproblem-3-original.tex) - Original reference: `/research/problem-3-original.tex`. Section: Historical Problem 3 source; software generalization is a separate artifact.

## What the app tried to do

Number Forge looks for nonnegative combinations of generators. For a family {ma,mb,c}, where c is 1 modulo m, the app tried to use the residue to turn a three-generator question into a smaller two-generator one. That is useful, but a residue alone is not enough to prove a target impossible.

## The shortcut that went wrong

An earlier version of detectReduction used the smallest possible number of c terms for each residue. But the count can be r+mt, not just r. Those extra m copies of c may make new values reachable. A regression case using [6,7,10] exposed the gap. This was a later software mistake, not a claim made in my original Problem 3 notebook.

## Two targets it missed

For [6,7,10], let m=2, a=3, b=5, and c=7. Clearly 14=7+7 and 21=7+7+7 are reachable. The shortcut uses r=0 for 14 and r=1 for 21, leaving the quotient 7 in both cases. Since 7 is not a nonnegative combination of 3 and 5, the shortcut wrongly rejected both numbers.

## When the shortcut is safe

The app now certifies this reduction only if c can already be made from a and b. Then adding extra groups of m controllers cannot create anything outside the smaller semigroup. This is a sufficient condition, not a claim that every other reduction is impossible.

## Why that condition works

$$
\frac{n-rc}{m}=ax+by+ct
$$

Let `0 <= r < m` and let n have residue r modulo m. Because ma and mb are multiples of m while c is 1 modulo m, any representation must use r+mt copies of c for some t>=0. Dividing the rest by m gives (n-r*c)/m=ax+by+ct. Write S for the nonnegative combinations of a and b. So n is reachable exactly when this quotient belongs to `S+<c>`. If c is in S, then `S+<c>`=S, and any quotient in S gives a representation with r copies of c. A negative quotient cannot work.

For [6,7,10], c=7 is not in `<3,5>`, so the app does not issue this certificate. For the original named examples [9,15,25] and [9,21,49], m=3 and the reduced pairs are `<3,5>` and `<3,7>`. Their controllers, 25 and 49, belong to the corresponding smaller semigroups, so those reductions remain certified.

## What changed and what was checked

The app now accepts 14 and 21 for [6,7,10]. When the condition is not proved, it shows bounded reachability instead of claiming global impossibility. Independent coefficient enumeration compared 60 generator triples across 301 targets each. The original notebook solution was not changed: this fix concerns only the later generalized software.
