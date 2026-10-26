import assert from 'node:assert/strict';
import { it } from 'node:test';
import * as bb from '../src/games/blackboardMoves/logic.js';
import * as nf from '../src/games/numberForge/logic.js';
import * as bs from '../src/games/binaryShift/logic.js';
import * as pe from '../src/games/parityEngine/logic.js';
import * as tg from '../src/games/temporalGraphs/logic.js';
import { TEMPORAL_CHALLENGES, getChallengeGraph } from '../src/games/temporalGraphs/challenges.js';
import * as ls from '../src/games/loopStrings/logic.js';
import { LOOP_CHALLENGES, findChallengePath, doesPermutationMatchChallenge } from '../src/games/loopStrings/challenges.js';
import { generateLanguage } from '../src/games/languageLabyrinth/logic.js';

function validateBlackboardPath(initial, path) {
  let state = initial.slice();
  for (const entry of path) {
    const { aIndex: i, bIndex: j } = entry.move;
    assert.notEqual(i, j);
    assert.ok(Number.isInteger(i) && i >= 0 && i < state.length);
    assert.ok(Number.isInteger(j) && j >= 0 && j < state.length);
    const a = state[i]; const b = state[j];
    assert.ok(a >= b && b >= 1, `Illegal indexed move on ${state}`);
    assert.equal(entry.move.a, a); assert.equal(entry.move.b, b);
    state[i] = a + b; state[j] = b - 1;
    assert.deepEqual(entry.board, state);
  }
  assert.ok(state.filter((value) => value > 0).length <= 1);
  return state;
}

it('independently verifies Blackboard counts and every indexed optimal/greedy transition', () => {
  const cache = new Map();
  function reference(state) {
    const key = JSON.stringify(state);
    if (cache.has(key)) return cache.get(key);
    assert.ok(cache.size < 100000, 'Reference budget');
    const lengths = [];
    for (let i = 0; i < state.length; i += 1) for (let j = i + 1; j < state.length; j += 1) {
      if (Math.min(state[i], state[j]) < 1) continue;
      const next = state.slice();
      const larger = state[i] >= state[j] ? i : j; const smaller = larger === i ? j : i;
      next[larger] = state[i] + state[j]; next[smaller] = Math.min(state[i], state[j]) - 1;
      lengths.push(reference(next));
    }
    const result = lengths.length ? [1 + Math.min(...lengths.map((x) => x[0])), 1 + Math.max(...lengths.map((x) => x[1]))] : [0, 0];
    cache.set(key, result); return result;
  }
  const states = [[4, 5, 5], [5, 4, 5], [5, 5, 4]];
  for (let a = 0; a <= 3; a += 1) for (let b = 0; b <= 3; b += 1) for (let c = 0; c <= 3; c += 1) states.push([a, b, c]);
  const shared = new Map();
  for (const state of states) {
    const result = bb.searchMoveRange(state, shared);
    assert.deepEqual([result.minMoves, result.maxMoves], reference(state));
    assert.equal(result.minPath.length, result.minMoves); assert.equal(result.maxPath.length, result.maxMoves);
    assert.deepEqual(validateBlackboardPath(state, result.minPath), result.minTerminalBoard);
    assert.deepEqual(validateBlackboardPath(state, result.maxPath), result.maxTerminalBoard);
    for (const strategy of Object.values(bb.GREEDY_STRATEGIES)) {
      const greedy = bb.playStrategyToTerminal(state, strategy, 200, () => 0.25);
      validateBlackboardPath(state, greedy.path); assert.ok(greedy.moves <= result.maxMoves);
    }
    for (const strategy of [bb.GREEDY_STRATEGIES.largestLargest, bb.GREEDY_STRATEGIES.largestSmallest, bb.GREEDY_STRATEGIES.closestPair]) {
      assert.doesNotThrow(() => bb.detectGreedyDivergence(state, strategy));
    }
  }
  assert.equal(bb.searchMaxMoves([4, 5, 5]).path.length, 19);
  assert.throws(() => bb.applyMove([0, 5, 5], { aIndex: 1, bIndex: 0, a: 5, b: 4 }), /Illegal/);
  assert.throws(() => bb.applyMove([4, 5], { aIndex: 0, bIndex: 0, a: 4, b: 4 }), /Illegal/);
  for (const state of [[25, 30, 45], Array(100).fill(0), [Infinity], [1.5, 2]]) assert.equal(bb.canSearchState(state), false);
  assert.throws(() => bb.searchMaxMoves([1000000, 1000000]), /unavailable/);
  console.log('Blackboard independent coverage:', states.length, 'initial states; reference states', cache.size);
});

function coefficientSums(generators, limit) {
  const sums = new Set();
  function visit(index, total) {
    if (index === generators.length) { sums.add(total); return; }
    for (let value = total; value <= limit; value += generators[index]) visit(index + 1, value);
  }
  visit(0, 0); return sums;
}

it('independently verifies Number Forge reductions and bounded/global distinctions', () => {
  const sets = [[6, 7, 10], [4, 6, 10], [9, 15, 25], [9, 21, 49]];
  for (let a = 2; a <= 7; a += 1) for (let b = a + 1; b <= 8; b += 1) for (let c = b + 1; c <= 9; c += 1) sets.push([a, b, c]);
  for (const generators of sets) {
    const expected = coefficientSums(generators, 300);
    const actual = nf.analyzeReachability(generators, 300);
    for (let n = 0; n <= 300; n += 1) assert.equal(actual.reachable[n], expected.has(n), `${generators}: ${n}`);
    const reduction = nf.detectReduction(generators, 300);
    if (reduction) for (const residue of reduction.residueClasses) for (const missing of residue.liftedMissingValues) assert.equal(expected.has(missing), false, `${generators}: false miss ${missing}`);
  }
  assert.equal(nf.detectReduction([6, 7, 10]), null);
  assert.equal(nf.analyzeReachability([6, 7, 10], 30).reachable[14], true);
  assert.equal(nf.analyzeReachability([6, 7, 10], 30).reachable[21], true);
  assert.throws(() => nf.getReducedMissingValues([4, 6]), /coprime/);
  for (const generators of [[9, 15, 25], [9, 21, 49]]) {
    const sums = coefficientSums(generators, 500);
    const misses = Array.from({ length: 500 }, (_, i) => i + 1).filter((n) => !sums.has(n));
    const card = nf.getPrismResultCard(generators);
    assert.equal(misses.at(-1), card.largestMissed);
    assert.equal(misses.filter((n) => n % 2).length, card.missedOdd);
    assert.equal(misses.filter((n) => n % 2 === 0).length, card.missedEven);
    // A full block of min(generator) reachable numbers proves the tail by addition.
    for (let n = card.allReachableFrom; n < card.allReachableFrom + 9; n += 1) assert.ok(sums.has(n));
  }
  console.log('Number Forge independent coverage:', sets.length, 'triples x 301 targets');
});

it('independently brute-forces Binary Shift and rejects malformed inputs without exceptions', () => {
  for (let n = 1; n <= 12; n += 1) {
    const expected = [];
    for (let x = 1; x < 2 ** n; x += 1) {
      const rotated = (x % 2) * 2 ** (n - 1) + Math.floor(x / 2);
      if (n * x < 2 ** n && n * x === rotated) expected.push(BigInt(x));
    }
    const row = bs.getDivisibilityRow(n);
    assert.deepEqual(row.special ? [row.x] : [], expected);
  }
  for (const x of ['', '-1', '1.5', '1e2', 'NaN', 'Infinity', '0x11', '9'.repeat(10000), 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const result = bs.evaluateBinaryShift({ n: 8, x }); assert.equal(result.valid, false, String(x).slice(0, 20));
  }
  for (const n of ['', '-1', '1.5', '1e2', 'Infinity', '999999999999']) assert.equal(bs.evaluateBinaryShift({ n, x: 1 }).valid, false);
  assert.equal(bs.evaluateBinaryShift({ n: 8, x: 17 }).special, true);
  assert.deepEqual(bs.searchBinaryShift(Infinity), []);
  const large = bs.evaluateBinaryShift({ n: 512, x: (1n << 511n) + 1n });
  assert.equal(BigInt(`0b${large.productBinary}`), large.product);
});

it('independently checks Parity finite steps, initial states, periodicity and workload', () => {
  for (const p of [0, 0.2, 0.5, 1]) for (const q of [0, 0.3, 4 / 7, 1]) for (const start of [0, 1]) {
    let distribution = [start === 0 ? 1 : 0, start === 1 ? 1 : 0];
    for (let n = 0; n <= 30; n += 1) {
      const actual = pe.getDistributionAfterSteps({ pA: p, pB: q, steps: n, initialDistribution: start ? [0, 1] : [1, 0] });
      assert.ok(Math.abs(actual[0] - distribution[0]) < 1e-12);
      const next = [0, 0];
      for (const s of [0, 1]) for (const a of [0, 1]) for (const b of [0, 1]) {
        const t = s + a; const outcome = (t % 2 === 0 ? t + 1 : t + b) % 2;
        next[outcome] += distribution[s] * (a ? p : 1 - p) * (b ? q : 1 - q);
      }
      distribution = next;
    }
  }
  const odd = pe.runParitySimulation({ pA: 0, pB: 1, n: 0, trials: 10, initialParity: pe.PARITY_STATES.odd });
  assert.equal(odd.exactEven, 0); assert.equal(odd.simulatedEven, 0);
  assert.match(pe.getChainBehavior({ pA: 0, pB: 1 }), /does not converge/);
  assert.equal(pe.getStationaryDistribution({ pA: 1, pB: 1 }), null);
  const capped = pe.runParitySimulation({ pA: 1, pB: 1, n: Infinity, trials: Infinity, rng: () => 0 });
  assert.ok(capped.n * capped.trials <= 5000000); assert.equal(capped.bounded, true);
});

function reverseForestWinners(graph) {
  const parent = new Map(graph.nodes.map((node) => [node.id, node.id]));
  const root = (node) => { while (parent.get(node) !== node) node = parent.get(node); return node; };
  const winners = [];
  for (const edge of [...graph.edges].sort((a, b) => b.day - a.day)) {
    const a = root(edge.source); const b = root(edge.target);
    if (a === b) winners.push(edge.id); else parent.set(a, b);
  }
  return winners.sort();
}

it('verifies Temporal unique-day mathematics, unit-lattice fixtures and every displayed activation path', () => {
  let comparisons = 0;
  for (const challenge of TEMPORAL_CHALLENGES) {
    const graph = getChallengeGraph(challenge);
    assert.equal(new Set(graph.edges.map((edge) => edge.day)).size, graph.edges.length);
    for (const edge of [...graph.edges, ...challenge.candidateTriggers]) {
      const a = graph.nodes.find((node) => node.id === edge.source); const b = graph.nodes.find((node) => node.id === edge.target);
      assert.ok(Number.isInteger(a.gridX) && Number.isInteger(a.gridY));
      assert.equal(Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY), 1);
    }
    for (const candidate of challenge.candidateTriggers) {
      const result = tg.analyzeCandidateTrigger(graph, candidate);
      const after = { ...graph, edges: [...graph.edges, result.triggerEdge] };
      const before = new Set(reverseForestWinners(graph));
      const expected = reverseForestWinners(after).filter((id) => !before.has(id));
      assert.deepEqual([...result.activatedEdgeKeys].sort(), expected);
      assert.equal(result.activationCount, expected.length); assert.ok(result.activationCount <= 1);
      assert.ok(result.activationCount >= challenge.targetActivations);
      for (const { edge, path } of result.activationPaths) {
        assert.equal(path.nodePath[0], edge.source); assert.equal(path.nodePath.at(-1), edge.target);
        assert.equal(new Set(path.nodePath).size, path.nodePath.length);
        for (let i = 0; i < path.edgePath.length; i += 1) {
          const step = after.edges.find((e) => e.id === path.edgePath[i]);
          assert.ok(step.day > edge.day);
          assert.deepEqual([step.source, step.target].sort(), [path.nodePath[i], path.nodePath[i + 1]].sort());
        }
      }
    }
  }
  let seed = 7;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  const nodes = Array.from({ length: 9 }, (_, i) => ({ id: String(i) }));
  for (let sample = 0; sample < 200; sample += 1) {
    const pairs = [];
    for (let i = 0; i < 9; i += 1) for (let j = i + 1; j < 9; j += 1) if (random() < 0.35) pairs.push([i, j]);
    const edges = pairs.map(([a, b], i) => ({ id: `s${i}`, day: i + 1, source: String(a), target: String(b) }));
    let previous = new Set();
    for (let count = 0; count <= edges.length; count += 1) {
      const graph = { nodes, edges: edges.slice(0, count) }; const actual = tg.analyzeTemporalGraph(graph);
      const expected = reverseForestWinners(graph);
      assert.deepEqual([...actual.winningEdgeKeys].sort(), expected);
      assert.equal(actual.winnerCount, actual.cycleCount);
      assert.ok(expected.filter((id) => !previous.has(id)).length <= 1);
      for (const old of previous) assert.ok(expected.includes(old));
      previous = new Set(expected); comparisons += 1;
    }
  }
  assert.throws(() => tg.analyzeTemporalGraph({ nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }], edges: [
    { day: 1, source: 'A', target: 'B' }, { day: 1, source: 'B', target: 'C' },
  ] }), /one unique/);
  console.log('Temporal reverse-forest independent comparisons:', comparisons);
});

it('independently verifies Loop Strings permutations and all starter BFS witnesses', () => {
  for (let n = 3; n <= 7; n += 1) {
    let evens = 0;
    function visit(prefix, remaining) {
      if (remaining.length) { for (const x of remaining) visit([...prefix, x], remaining.filter((y) => y !== x)); return; }
      let cycles = 0; const seen = new Set();
      for (let label = 1; label <= n; label += 1) {
        if (seen.has(label)) continue; cycles += 1;
        let current = label; while (!seen.has(current)) { seen.add(current); current = prefix[current - 1]; }
      }
      const even = (n - cycles) % 2 === 0; if (even) evens += 1;
      assert.equal(ls.getPermutationParity(prefix), even ? 'even' : 'odd');
    }
    visit([], Array.from({ length: n }, (_, i) => i + 1));
    assert.equal(ls.enumerateReachablePermutations(n).reachableCount, evens);
  }
  for (const challenge of LOOP_CHALLENGES) {
    let state = Array.from({ length: challenge.n }, (_, i) => i + 1);
    const witness = findChallengePath(state, challenge); assert.equal(witness.available, true);
    for (const move of witness.path) {
      const positions = move.labels.map((label) => state.indexOf(label)); assert.equal(new Set(positions).size, 3);
      const [a, b, c] = move.labels; const replacement = move.direction === 'clockwise' ? [c, a, b] : [b, c, a];
      positions.forEach((position, index) => { state[position] = replacement[index]; });
      assert.deepEqual(state, move.permutation);
    }
    assert.equal(doesPermutationMatchChallenge(state, challenge), true);
  }
  assert.throws(() => ls.normalizePermutation([1.5, 2, 3]), /Permutation/);
  assert.equal(ls.enumerateReachablePermutations(8, 100).available, false);
});

it('independent inverse-rule Language membership agrees through length 10, including all eight mixed palindromes', () => {
  const memo = new Map();
  function member(word) {
    if (word === 'a' || word === 'b') return true;
    if (!word.length) return false;
    if (memo.has(word)) return memo.get(word);
    let result = word[0] === 'c' && member(word.slice(1));
    if (!result && word.endsWith('b')) result = member(`a${word.slice(0, -1)}`);
    for (let size = 1; !result && size * 2 < word.length; size += 1) {
      const v = word.slice(0, size);
      if (word.endsWith(v)) result = member(word.slice(size, -size) + v);
    }
    memo.set(word, Boolean(result)); return Boolean(result);
  }
  const generated = generateLanguage(10); const words = new Set(generated.nodes.map((node) => node.word));
  let comparisons = 0;
  function visit(word, remaining) {
    if (word) { assert.equal(words.has(word), member(word), word); comparisons += 1; }
    if (remaining) for (const c of 'abc') visit(word + c, remaining - 1);
  }
  visit('', 10); assert.equal(comparisons, 88572);
  for (const node of generated.nodes) {
    if (!node.parent) { assert.ok(['a', 'b'].includes(node.word)); continue; }
    const p = node.parent;
    if (node.rule === 'B') assert.equal(node.word, 'c' + p);
    else if (node.rule === 'D') { assert.equal(p[0], 'a'); assert.equal(node.word, p.slice(1) + 'b'); }
    else { assert.equal(node.rule, 'C'); assert.ok(Array.from({ length: p.length }, (_, i) => p.slice(i + 1) + p).includes(node.word)); }
  }
  const mixed = [...words].filter((word) => word.length === 10 && word.includes('a') && word.includes('b') && word === [...word].reverse().join('')).sort();
  assert.equal(mixed.length, 8); assert.ok(words.has('bacab')); assert.ok(words.has('bacabbacab'));
  assert.ok([...words].every((word) => !word.endsWith('c')));
  assert.ok([...words].every((word) => !word.includes('a') || !word.includes('b') || word.includes('c')));
  assert.equal(generateLanguage(100000).maxLength, 10);
  console.log('Language inverse comparisons:', comparisons, 'generated:', words.size, 'mixed palindromes:', JSON.stringify(mixed));
});
