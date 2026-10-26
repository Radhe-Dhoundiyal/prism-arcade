import assert from 'node:assert/strict';
import { it } from 'node:test';
import { runMathTask } from '../src/core/runMathTask.js';
import { executeMathTask } from '../src/core/mathTasks.js';
import { createGridDominionOracle } from './helpers/gridDominionOracle.js';
import { CAMPAIGN_LEVELS } from '../src/games/gridDominion/campaign.js';
import { createBoard } from '../src/games/gridDominion/logic.js';
import { PARITY_CHALLENGES, evaluateParityChallenge } from '../src/games/parityEngine/challenges.js';
import { findChallengePath } from '../src/games/loopStrings/challenges.js';
import { getUnlockedLoopAchievements, getDefaultLoopStats } from '../src/games/loopStrings/stats.js';
import { getUnlockedAchievements, DEFAULT_NUMBER_FORGE_STATS } from '../src/games/numberForge/stats.js';
import { getChallengeStarRating, TEMPORAL_CHALLENGES, loadTemporalChallengeProgress } from '../src/games/temporalGraphs/challenges.js';
import { DEFAULT_TEMPORAL_STATS, recordChallengeAttempt } from '../src/games/temporalGraphs/stats.js';
import { suggestModuli, analyzeResidueClasses, analyzeReachability } from '../src/games/numberForge/logic.js';
import { generateStateGraph } from '../src/games/blackboardMoves/logic.js';
import { normalizeImportedGraph } from '../src/games/temporalGraphs/editor.js';

it('worker transport cleans up on success, abort, post/response failures and unsupported Worker', async () => {
  const original = globalThis.Worker; const instances = [];
  class FakeWorker {
    constructor() { instances.push(this); }
    terminate() { this.terminated = true; }
    postMessage({ operation, payload }) {
      if (operation === 'clone-error') throw new Error('Cannot clone');
      if (operation === 'wait') return;
      queueMicrotask(() => this.onmessage({ data: { ok: true, result: executeMathTask(operation, payload) } }));
    }
  }
  try {
    globalThis.Worker = FakeWorker;
    const result = await runMathTask('grid-predict', { board: createBoard(2, 3), currentPlayer: 1 });
    assert.equal(result, 'Player 2'); assert.equal(instances.at(-1).terminated, true);
    const controller = new AbortController(); const pending = runMathTask('wait', {}, { signal: controller.signal }); controller.abort();
    await assert.rejects(pending, { name: 'AbortError' }); assert.equal(instances.at(-1).terminated, true);
    await assert.rejects(runMathTask('clone-error', {}), /Cannot clone/); assert.equal(instances.at(-1).terminated, true);
    const failedResponse = runMathTask('wait', {}); instances.at(-1).onmessageerror();
    await assert.rejects(failedResponse, /decoded/); assert.equal(instances.at(-1).terminated, true);
    globalThis.Worker = undefined; await assert.rejects(runMathTask('grid-predict', {}), /Worker support/);
  } finally { globalThis.Worker = original; }
});

it('every Grid campaign objective is attainable and the final human role can win against perfect play', () => {
  for (const level of CAMPAIGN_LEVELS) {
    const board = createBoard(level.rows, level.cols);
    const oracle = createGridDominionOracle(level.rows, level.cols);
    if (level.objectiveType === 'humanWins') assert.equal(oracle.winner(board, 1), `Player ${level.humanPlayer}`);
    if (level.objectiveType === 'nonzeroDifference') assert.equal(oracle.winner(board, 1), 'Player 1');
    if (level.objectiveType === 'zeroDifference') {
      // Cooperative local mode admits a no-edge alternating checkerboard.
      const checkerboard = board.map((row, r) => row.map((_, c) => (r + c) % 2 ? 'blue' : 'red'));
      assert.equal(oracle.score(checkerboard), 0);
    }
  }
});

it('every Parity custom target has an analytic control witness, including stationary-match', () => {
  for (const challenge of PARITY_CHALLENGES) {
    const controls = challenge.allowedControls === 'fair-coins' ? { pA: 0.5, pB: 0.5 }
      : challenge.allowedControls === 'seven-sided' ? { pA: 4 / 7, pB: 4 / 7 }
        : { pA: 0.5, pB: 2 * challenge.targetEvenProbability };
    assert.equal(evaluateParityChallenge(challenge, controls).success, true, challenge.id);
  }
});

it('unknown challenge IDs cannot unlock local mastery or gold achievements', () => {
  const unknown = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`unknown-${i}`, true]));
  const stars = Object.fromEntries(Object.keys(unknown).map((id) => [id, 3]));
  assert.deepEqual(getUnlockedLoopAchievements({ completed: unknown, highestStars: stars }, getDefaultLoopStats()), []);
  assert.deepEqual(getUnlockedAchievements({ completedLevels: unknown, highestStars: stars }, DEFAULT_NUMBER_FORGE_STATS), []);
});

it('legacy Temporal counters remain readable but cannot be awarded as new official multi-activations', () => {
  assert.equal(getChallengeStarRating(TEMPORAL_CHALLENGES[0], 2), 0);
  assert.throws(() => recordChallengeAttempt(DEFAULT_TEMPORAL_STATS, 3, true, 3), /at most one/);
  const legacy = { unlockedLevel: 5, completedLevels: { 'large-ladder': true }, bestActivationCount: { 'large-ladder': 5 } };
  assert.equal(loadTemporalChallengeProgress({ getItem: () => JSON.stringify(legacy) }).bestActivationCount['large-ladder'], 5);
});

it('public workload options cannot override Loop BFS or Number Forge residue budgets', () => {
  assert.equal(findChallengePath([1, 2, 3, 4, 5, 6, 7, 8], { targetType: 'fullCycle', n: 8 }, { maxN: 100, maxStates: Infinity }).available, false);
  assert.ok(analyzeResidueClasses(analyzeReachability([3, 5], 100), Infinity).length <= 128);
  assert.ok(suggestModuli(Array.from({ length: 100 }, (_, i) => i + 2)).length > 0);
  const graph = generateStateGraph([4, 5, 5], 2);
  assert.ok(graph.nodes.length <= 2); assert.equal(graph.truncated, true);
  const keys = new Set(graph.nodes.map((node) => node.key));
  assert.ok(graph.edges.every((edge) => keys.has(edge.from) && keys.has(edge.to)));
  assert.throws(() => normalizeImportedGraph({ nodes: ['A', 'B'], edges: [{ source: 'A', target: 'B', day: -1 }] }), /positive integer day/);
});
