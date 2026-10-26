import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TEMPORAL_DATASETS } from '../src/games/temporalGraphs/data.js';
import {
  completeTemporalChallenge,
  DEFAULT_TEMPORAL_CHALLENGE_PROGRESS,
  getChallengeGraph,
  getChallengeStarRating,
  getChallengeStatus,
  getMaxActivationCount,
  loadTemporalChallengeProgress,
  saveTemporalChallengeProgress,
  TEMPORAL_CHALLENGES,
} from '../src/games/temporalGraphs/challenges.js';
import {
  addEdge,
  addNode,
  deleteNode,
  normalizeImportedGraph,
  updateEdgeDay,
} from '../src/games/temporalGraphs/editor.js';
import {
  analyzeTemporalGraph,
  analyzeCandidateTrigger,
  analyzeTriggerEdge,
  findActivationPath,
  getTemporalEdgeKey,
  getVisibleEdges,
} from '../src/games/temporalGraphs/logic.js';
import { TEMPORAL_PRESETS } from '../src/games/temporalGraphs/presets.js';
import {
  DEFAULT_TEMPORAL_STATS,
  loadTemporalStats,
  recordChallengeAttempt,
  recordLabExport,
  recordLabImport,
  saveTemporalStats,
} from '../src/games/temporalGraphs/stats.js';

describe('Temporal Graphs explorer logic', () => {
  it('reveals Dataset A cycle and winning Day 1 owner at Day 4', () => {
    const dataset = TEMPORAL_DATASETS[0];
    const analysis = analyzeTemporalGraph(dataset, 4);

    assert.equal(analysis.nodes.length, 4);
    assert.equal(analysis.edges.length, 4);
    assert.equal(analysis.cycleCount, 1);
    assert.deepEqual(analysis.winningPlayers, ['Day 1']);
    assert.equal(analysis.winningEdgeKeys.has(getTemporalEdgeKey(dataset.edges[0])), true);
  });

  it('limits visible edges by day', () => {
    assert.deepEqual(
      getVisibleEdges(TEMPORAL_DATASETS[0], 2).map((edge) => `${edge.source}-${edge.target}`),
      ['A-B', 'B-C'],
    );
  });

  it('detects multiple cycle owners in Dataset B', () => {
    const analysis = analyzeTemporalGraph(TEMPORAL_DATASETS[1]);

    assert.equal(analysis.cycleCount, 3);
    assert.equal(analysis.winnerCount > 1, true);
  });

  it('supports pure graph editing helpers', () => {
    const graph = { id: 'custom', name: 'Custom', nodes: [], edges: [] };
    const withA = addNode(graph, { x: 10, y: 20 });
    const withB = addNode(withA, { x: 80, y: 20 });
    const withEdge = addEdge(withB, 'A', 'B');
    const edited = updateEdgeDay(withEdge, 'e1', 4);

    assert.equal(edited.nodes.length, 2);
    assert.deepEqual(edited.edges[0], {
      id: 'e1',
      day: 4,
      source: 'A',
      target: 'B',
    });
    assert.equal(deleteNode(edited, 'A').edges.length, 0);
  });

  it('normalizes imported level JSON', () => {
    const graph = normalizeImportedGraph(
      JSON.stringify({
        nodes: ['A', 'B'],
        edges: [{ source: 'A', target: 'B', day: 2 }],
      }),
    );

    assert.equal(graph.nodes.length, 2);
    assert.equal(graph.edges[0].id, 'e1');
    assert.equal(graph.edges[0].day, 2);
  });

  it('computes trigger activation by pretending an edge is final', () => {
    const graph = TEMPORAL_PRESETS.find((preset) => preset.id === 'trigger-edge-example');
    const trigger = analyzeTriggerEdge(graph, 'e7');

    assert.equal(trigger.triggerEdge.id, 'e7');
    assert.equal(trigger.activationCount > 0, true);
  });

  it('returns no activation path for a non-winner', () => {
    const graph = {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        { id: 'e1', day: 1, source: 'A', target: 'B' },
        { id: 'e2', day: 2, source: 'B', target: 'C' },
      ],
    };

    assert.equal(findActivationPath(graph, graph.edges[0]), null);
  });

  it('returns a simple later-edge path for a cycle winner', () => {
    const graph = {
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      edges: [
        { id: 'e1', day: 1, source: 'A', target: 'B' },
        { id: 'e2', day: 2, source: 'B', target: 'C' },
        { id: 'e3', day: 3, source: 'C', target: 'A' },
      ],
    };
    const path = findActivationPath(graph, graph.edges[0]);

    assert.deepEqual(path.nodePath, ['A', 'C', 'B']);
    assert.deepEqual(path.edgePath, ['e3', 'e2']);
    assert.deepEqual(path.dayPath, [3, 2]);
    assert.equal(new Set(path.nodePath).size, path.nodePath.length);
  });

  it('defines five valid trigger challenges', () => {
    assert.equal(TEMPORAL_CHALLENGES.length, 5);
    TEMPORAL_CHALLENGES.forEach((challenge, index) => {
      const nodeIds = new Set(challenge.nodes.map((node) => node.id));

      assert.equal(challenge.number, index + 1);
      assert.equal(challenge.candidateTriggers.length > 0, true);
      challenge.edges.forEach((edge) => {
        assert.equal(nodeIds.has(edge.source), true);
        assert.equal(nodeIds.has(edge.target), true);
      });
      challenge.candidateTriggers.forEach((edge) => {
        assert.equal(nodeIds.has(edge.source), true);
        assert.equal(nodeIds.has(edge.target), true);
      });
    });
  });

  it('validates every trigger challenge target against its candidate triggers', () => {
    TEMPORAL_CHALLENGES.forEach((challenge) => {
      const nodeIds = new Set(challenge.nodes.map((node) => node.id));
      const candidateActivationCounts = challenge.candidateTriggers.map(
        (candidate) => analyzeCandidateTrigger(getChallengeGraph(challenge), candidate).activationCount,
      );

      challenge.candidateTriggers.forEach((candidate) => {
        assert.equal(nodeIds.has(candidate.source), true);
        assert.equal(nodeIds.has(candidate.target), true);
      });
      assert.equal(getMaxActivationCount(challenge) >= challenge.targetActivations, true);
      assert.equal(
        candidateActivationCounts.some((count) => count >= challenge.targetActivations),
        true,
      );
    });
  });

  it('Level 1 trigger activates one winner', () => {
    const challenge = TEMPORAL_CHALLENGES[0];
    const result = analyzeCandidateTrigger(getChallengeGraph(challenge), challenge.candidateTriggers[0]);

    assert.equal(result.activationCount, 1);
  });

  it('candidate trigger activation path includes the trigger edge when needed', () => {
    const challenge = TEMPORAL_CHALLENGES[0];
    const result = analyzeCandidateTrigger(getChallengeGraph(challenge), challenge.candidateTriggers[0]);
    const [activation] = result.activationPaths;

    assert.equal(result.activationCount, 1);
    assert.equal(activation.edgeKey, 'e1');
    assert.deepEqual(activation.path.nodePath, ['A', 'D', 'C', 'B']);
    assert.equal(activation.path.edgePath.includes('t1'), true);
    assert.equal(activation.path.dayPath.every((day) => day > activation.edge.day), true);
  });

  it('Level 3 distinct-day trigger activates only the last dormant owner', () => {
    const challenge = TEMPORAL_CHALLENGES[2];
    const bestCount = getMaxActivationCount(challenge);
    const sharedTrigger = challenge.candidateTriggers.find((candidate) => candidate.id === 't1');
    const result = analyzeCandidateTrigger(getChallengeGraph(challenge), sharedTrigger);

    assert.equal(bestCount, 1);
    assert.equal(result.activationCount, 1);
    assert.deepEqual([...result.activatedEdgeKeys], ['e3']);
  });

  it('ladder triggers activate the expected number of winners', () => {
    const ladder = TEMPORAL_CHALLENGES[3];
    const largeLadder = TEMPORAL_CHALLENGES[4];

    assert.equal(
      analyzeCandidateTrigger(getChallengeGraph(ladder), ladder.candidateTriggers[0]).activationCount,
      1,
    );
    assert.equal(
      analyzeCandidateTrigger(getChallengeGraph(largeLadder), largeLadder.candidateTriggers[0])
        .activationCount,
      1,
    );
  });

  it('computes maximum activation counts across candidate triggers', () => {
    assert.equal(getMaxActivationCount(TEMPORAL_CHALLENGES[0]), 1);
    assert.equal(getMaxActivationCount(TEMPORAL_CHALLENGES[2]), 1);
    assert.equal(getMaxActivationCount(TEMPORAL_CHALLENGES[3]), 1);
    assert.equal(getMaxActivationCount(TEMPORAL_CHALLENGES[4]), 1);
  });

  it('rates challenge stars from activation count', () => {
    const silverPossibleLevel = {
      ...TEMPORAL_CHALLENGES[3],
      targetActivations: 1,
    };

    assert.equal(getChallengeStarRating(TEMPORAL_CHALLENGES[0], 0), 0);
    assert.equal(getChallengeStarRating(TEMPORAL_CHALLENGES[0], 1), 3);
    assert.equal(getChallengeStarRating(silverPossibleLevel, 1), 3);
    assert.equal(getChallengeStarRating(silverPossibleLevel, 2), 0);
    assert.equal(getChallengeStarRating(silverPossibleLevel, 3), 0);
  });

  it('ladder trigger returns a valid path for the newly activated rung', () => {
    const ladder = TEMPORAL_CHALLENGES[3];
    const trigger = ladder.candidateTriggers[0];
    const result = analyzeCandidateTrigger(getChallengeGraph(ladder), trigger);

    assert.equal(result.activationPaths.length, 1);
    result.activationPaths.forEach((activation) => {
      assert.equal(activation.path.edgePath.includes(trigger.id), true);
      assert.equal(activation.path.nodePath.includes('T4'), true);
      assert.equal(activation.path.nodePath.includes('B4'), true);
      assert.equal(new Set(activation.path.nodePath).size, activation.path.nodePath.length);
      assert.equal(activation.path.dayPath.every((day) => day > activation.edge.day), true);
    });
  });

  it('loads, saves, and completes trigger challenge progress', () => {
    let value = null;
    const storage = {
      getItem: () => value,
      setItem: (_key, nextValue) => {
        value = nextValue;
      },
    };
    const progress = completeTemporalChallenge(
      DEFAULT_TEMPORAL_CHALLENGE_PROGRESS,
      TEMPORAL_CHALLENGES[0],
      1,
    );

    saveTemporalChallengeProgress(progress, storage);

    assert.deepEqual(loadTemporalChallengeProgress(storage), progress);
    assert.equal(progress.unlockedLevel, 2);
    assert.equal(progress.completedLevels[TEMPORAL_CHALLENGES[0].id], true);
    assert.equal(progress.bestActivationCount[TEMPORAL_CHALLENGES[0].id], 1);
  });

  it('preserves best activation count and reports challenge status', () => {
    const first = TEMPORAL_CHALLENGES[0];
    const second = TEMPORAL_CHALLENGES[1];
    const third = TEMPORAL_CHALLENGES[2];
    const progress = completeTemporalChallenge(
      {
        ...DEFAULT_TEMPORAL_CHALLENGE_PROGRESS,
        bestActivationCount: { [first.id]: 2 },
      },
      first,
      1,
    );

    assert.equal(progress.unlockedLevel, 2);
    assert.equal(progress.bestActivationCount[first.id], 2);
    assert.equal(getChallengeStatus(first, progress), 'Completed');
    assert.equal(getChallengeStatus(second, progress), 'Unlocked');
    assert.equal(getChallengeStatus(third, progress), 'Locked');
  });

  it('loads, saves, and records Temporal Graphs stats', () => {
    let value = null;
    const storage = {
      getItem: () => value,
      setItem: (_key, nextValue) => {
        value = nextValue;
      },
    };
    const stats = recordLabImport(
      recordLabExport(
        recordChallengeAttempt(
          recordChallengeAttempt(DEFAULT_TEMPORAL_STATS, 0, false, 0),
          1,
          true,
          3,
        ),
      ),
    );

    saveTemporalStats(stats, storage);

    assert.deepEqual(loadTemporalStats(storage), stats);
    assert.equal(stats.challengeAttempts, 2);
    assert.equal(stats.challengeCompletions, 1);
    assert.equal(stats.totalActivationsTriggered, 1);
    assert.equal(stats.bestSingleTriggerActivation, 1);
    assert.equal(stats.goldCompletions, 1);
    assert.equal(stats.labGraphsExported, 1);
    assert.equal(stats.labGraphsImported, 1);
  });
});
