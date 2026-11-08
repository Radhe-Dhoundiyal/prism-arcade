# PRISM Arcade

PRISM Arcade turns eight PRISM India problems into interactive mathematical experiments. Explore binary rotations, probability, graph games and formal languages; test conjectures, inspect counterexamples and follow the reasoning behind the results.

**Live demo:** [Play all eight PRISM Arcade portals](https://prism-arcade-live.vercel.app/).

## From Notebook to Game

I started by working through the PRISM India problems on paper. Some ideas led to proofs; others led to conjectures, mistakes and counterexamples. The games gave me a way to test those ideas more systematically.

I used AI tools, including Codex, for software implementation, debugging, later mathematical verification and editorial preparation. The notebooks retain my historical claims, including mistakes; later verification and corrections are documented separately. See [provenance](docs/provenance.md) for the attribution and source history.

Earlier software development took place in a private working repository in June 2026, before this public release.

In Language Labyrinth, I originally answered 0. A later counterexample showed why that was wrong, and two different checks found eight length-10 palindromes containing both `a` and `b`. That does not tell us what happens at every length. I explain the mistake and the count in the [correction notes](docs/corrections/language-labyrinth.md).

## Preview

| Eight playable portals | A verified Language Labyrinth witness |
| --- | --- |
| [![Desktop lobby with all eight mathematical portals](docs/media/lobby.png)](docs/media/lobby.png) | [![Length-10 palindrome bacabbacab accepted as a generated witness](docs/media/language.png)](docs/media/language.png) |
| Blackboard: greedy versus optimal | Loop Strings: permutations and cycles |
| [![Legal Blackboard replay with exact and greedy comparisons](docs/media/blackboard.png)](docs/media/blackboard.png) | [![Loop Strings matching-label diagram after a three-endpoint rotation](docs/media/loops.png)](docs/media/loops.png) |

## The Portals

| Problem | Environment | Mathematical focus |
| --- | --- | --- |
| 1 | Binary Shift | Binary rotation, divisibility and bounded search |
| 2 | Parity Engine | Markov probabilities and simulation |
| 3 | Number Forge | Reachability, gaps and certified reductions |
| 4 | Grid Dominion | Adversarial play, symmetry and edge balance |
| 5 | Language Labyrinth | Generated words, witnesses and invariant challenges |
| 6 | Temporal Graphs | Later-edge paths and newly winning owners |
| 7 | Loop Strings | Endpoint rotations, permutation parity and cycles |
| 8 | Blackboard Moves | Legal replay, greedy strategies and exact search |

All eight portals are playable. Some experiments use bounded searches or heuristic methods, and challenge progress is tracked separately.

## Exploration and Research

The Research Journey includes seven notebooks (72 page positions) and seven solutions. You can see my early attempts, including mistakes. Some public pages leave out the original problem statement or use a clearly labeled replacement; unedited originals are private. I have no earlier notebook or completed solution for Problem 8.

The [live Research Journey](https://prism-arcade-live.vercel.app/) loads these pages when needed. The research files are hosted separately from the code, so local builds without them show availability notices. See [research delivery](docs/research-availability.md).

### Follow a problem from notebook to game

Here are four examples connecting my earlier notes to the games and later corrections:

- **Grid Dominion:** My [earlier notebook](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/problem-4-notebook.pdf) and [solution](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/problem-4-solution.tex) explore 180° rotation, opposite-color pairings, and edge balance. Compare the [edge-counting rules](src/games/gridDominion/logic.js), [playable game](https://prism-arcade-live.vercel.app/#grid-dominion), and [independent bounded search checks](test/gridDominionOracle.test.js). The Hard AI search is a later software feature.
- **Number Forge:** The [original solution](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/problem-3-solution.tex) works through residues modulo 3 for (9, 15, 25) and (9, 21, 49). The [reachability engine](src/games/numberForge/logic.js) and [tests](test/numberForge.test.js) explore these ideas. A [later correction](docs/corrections/number-forge.md) concerns a generalized software reduction, **not** an error in the original named-case work.
- **Language Labyrinth:** [Notebook page 15](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/pages/language-labyrinth-15.webp) preserves my mistaken zero-answer argument. The [word generator](src/games/languageLabyrinth/logic.js) makes counterexamples testable; the [correction](docs/corrections/language-labyrinth.md) explains the later verification that exactly eight mixed palindromes have length 10.
- **Temporal Graphs:** [Notebook page 7](https://lhxs4gvzybfjtuwr.public.blob.vercel-storage.com/research/v1/pages/temporal-graphs-7.webp) records the ladder investigation. The [edge-trigger analysis](src/games/temporalGraphs/logic.js) distinguishes owners who win for the first time from those who already won; the [later correction](docs/corrections/temporal-graphs.md) explains the reverse-forest argument.

## Implementation

The app uses React and Vite, with JavaScript logic for each game. Larger searches run in workers, and independent mathematical checks test the results. Progress and saves stay in the browser; there is no account system or leaderboard.

## Run Locally

Use Node.js 22.12 or newer:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the URL Vite prints. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Test and Build

```sh
npm test
npm run verify:content
npm run build
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort
```

`npm test` includes the mathematical and save tests. To run those subsets alone, use `npm run test:math` or `npm run test:save`. With the production preview running, use `npm run smoke` and `npm run smoke:research`. See [verification](docs/verification.md) for details.

See [architecture](docs/architecture.md), [mathematical scope](docs/mathematics.md), [provenance](docs/provenance.md) and [limitations](docs/limitations.md). Finite searches are not proofs for all cases, and heuristic moves are not always optimal.

## Credits and Rights

The source problems are from [PRISM India](https://www.prism-india.org/). This is an independent project, without organizer endorsement. The complete official problem-set PDF and excluded statement material are not distributed.

Software rights held by Radhe Dhoundiyal are released under the [MIT License](LICENSE), subject to the [license scope](docs/licensing.md). Research documents and preview media have separately reserved rights, not a blanket MIT grant. See [research rights](RESEARCH_NOTICE.md) and [third-party notices](THIRD_PARTY_NOTICES.md). PRISM India's statements and organizer diagrams are not licensed through this project.
