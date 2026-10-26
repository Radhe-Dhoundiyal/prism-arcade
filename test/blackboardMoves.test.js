import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  analyzeExactChallengeBranches,
  BLACKBOARD_CHALLENGES,
  BLACKBOARD_OBJECTIVES,
  calculateBlackboardChallengeStars,
  getDefaultBlackboardChallengeProgress,
  isBlackboardChallengeUnlocked,
  isForecastMaxOptimalMove,
  recordBlackboardChallengeAttempt,
  validateBlackboardChallengeTargets,
} from '../src/games/blackboardMoves/challenges.js';
import {
  DEFAULT_BLACKBOARD_STATS,
  getUnlockedBlackboardAchievements,
  recordBlackboardChallengeAttempt as recordBlackboardStatsAttempt,
  recordBlackboardLabExperiment,
  recordBlackboardMove,
} from '../src/games/blackboardMoves/stats.js';
import {
  analyzeInvariantCandidates,
  analyzeFirstMoveBranches,
  applyMove,
  canSearchState,
  chooseGreedyMove,
  createMoveRecord,
  detectGreedyDivergence,
  EXPERIMENT_FAMILIES,
  exportResearchCsv,
  exportResearchJson,
  exportExperimentCsv,
  filterResearchResults,
  findExperimentPatterns,
  FORMULA_CANDIDATES,
  generateResearchConjectures,
  generateConsecutiveSetPlotData,
  generateExperimentStates,
  generateResearchStates,
  generateStateGraph,
  generateLegalMoves,
  generateTripleHeatmapSlice,
  getFormulaCounterexampleDetail,
  getBoardStats,
  getOptimalPathExplanation,
  getQuantityChanges,
  GREEDY_STRATEGIES,
  HEATMAP_METRICS,
  isTerminal,
  mineResearchPatterns,
  parseBoardText,
  playGreedyToTerminal,
  recoverTerminalPaths,
  replayGreedyComparisons,
  RESEARCH_FAMILIES,
  RESEARCH_FILTERS,
  runBatchExperiment,
  runResearchExperiment,
  searchMoveRange,
  searchMaxMoves,
  compareStrategies,
  testFormulaCandidate,
} from '../src/games/blackboardMoves/logic.js';

describe('Blackboard Moves logic', () => {
  it('generates legal unordered moves from positive entries only', () => {
    const moves = generateLegalMoves([4, 5, 0, 6]);

    assert.equal(moves.length, 3);
    assert.deepEqual(
      moves.map((move) => [move.a, move.b]),
      [
        [5, 4],
        [6, 4],
        [6, 5],
      ],
    );
  });

  it('applies a move and keeps zero visible', () => {
    const [move] = generateLegalMoves([2, 1]);

    assert.deepEqual(applyMove([2, 1], move), [3, 0]);
  });

  it('updates total sum by b minus 1 under the stated move rule', () => {
    const board = [4, 5, 6];
    const move = generateLegalMoves(board)[0];
    const before = getBoardStats(board);
    const after = getBoardStats(applyMove(board, move));

    assert.equal(after.sum, before.sum + move.b - 1);
  });

  it('detects terminal boards', () => {
    assert.equal(isTerminal([7, 0, 0]), true);
    assert.equal(isTerminal([7, 1, 0]), false);
  });

  it('finds brute-force maxima for tiny examples', () => {
    assert.equal(searchMaxMoves([1, 1]).maxMoves, 1);
    assert.equal(searchMaxMoves([2, 1]).maxMoves, 1);
    assert.equal(searchMaxMoves([2, 2]).maxMoves, 2);
  });

  it('chooses greedy strategies deterministically when requested', () => {
    const largestLargest = chooseGreedyMove([4, 5, 6], GREEDY_STRATEGIES.largestLargest);
    const largestSmallest = chooseGreedyMove([4, 5, 6], GREEDY_STRATEGIES.largestSmallest);
    const closestPair = chooseGreedyMove([4, 5, 6], GREEDY_STRATEGIES.closestPair);

    assert.deepEqual([largestLargest.a, largestLargest.b], [6, 5]);
    assert.deepEqual([largestSmallest.a, largestSmallest.b], [6, 4]);
    assert.deepEqual([closestPair.a, closestPair.b], [5, 4]);
  });

  it('parses custom lists and gates search for large states', () => {
    assert.deepEqual(parseBoardText('4, 5 0 x -1 6'), [4, 5, 0, 6]);
    assert.equal(canSearchState([25, 30, 45]), false);
    assert.equal(canSearchState([10, 10, 10, 10, 10, 10]), false);
  });

  it('tracks quantities and changes after each move', () => {
    const board = [1, 1];
    const move = generateLegalMoves(board)[0];
    const record = createMoveRecord(1, board, move);
    const quantities = getQuantityChanges(board, [record]);

    assert.equal(quantities.current.sum, 2);
    assert.equal(quantities.current.sumSquares, 4);
    assert.equal(quantities.current.sumCubes, 8);
    assert.equal(quantities.current.positiveCount, 1);
    assert.equal(quantities.current.zerosCount, 1);
    assert.equal(quantities.current.legalMoveCount, 0);
    assert.equal(quantities.deltas.sumSquares, 2);
    assert.equal(record.deltas.positiveCount, -1);
  });

  it('monitors candidate modular invariants', () => {
    const board = [2, 2];
    const move = generateLegalMoves(board)[0];
    const record = createMoveRecord(1, board, move);
    const candidates = analyzeInvariantCandidates(board, [record]);
    const sumMod2 = candidates.find((candidate) => candidate.id === 'sum-mod-2');
    const zeroParity = candidates.find((candidate) => candidate.id === 'zero-parity');

    assert.equal(sumMod2.preserved, false);
    assert.equal(sumMod2.brokenAtMove, 1);
    assert.equal(zeroParity.preserved, true);
  });

  it('generates reachable state graphs for tiny boards', () => {
    const graph = generateStateGraph([1, 1, 1]);

    assert.equal(graph.totalStates, 3);
    assert.equal(graph.terminalStates, 1);
    assert.equal(graph.longestPath, 2);
    assert.equal(graph.edges.length, 4);
  });

  it('computes minimum and maximum move ranges', () => {
    const range = searchMoveRange([2, 2]);

    assert.equal(range.minMoves, 2);
    assert.equal(range.maxMoves, 2);
    assert.deepEqual(range.maxTerminalBoard, [5, 0]);
  });

  it('generates batch experiment families', () => {
    assert.equal(
      generateExperimentStates({ family: EXPERIMENT_FAMILIES.triples, maxValue: 3 }).length,
      10,
    );
    assert.deepEqual(
      generateExperimentStates({ family: EXPERIMENT_FAMILIES.consecutive, maxValue: 3 }),
      [[1], [1, 2], [1, 2, 3]],
    );
    assert.deepEqual(
      generateExperimentStates({
        family: EXPERIMENT_FAMILIES.fixedLength,
        maxValue: 2,
        length: 2,
      }),
      [[1, 1], [1, 2], [2, 2]],
    );
  });

  it('computes experiment results with greedy optimal comparison', () => {
    const [result] = runBatchExperiment({
      family: EXPERIMENT_FAMILIES.fixedLength,
      maxValue: 1,
      length: 2,
    });

    assert.deepEqual(result.startState, [1, 1]);
    assert.equal(result.minMoves, 1);
    assert.equal(result.maxMoves, 1);
    assert.equal(result.terminalCount, 1);
    assert.equal(result.largestLargestOptimal, true);
    assert.equal(result.largestSmallestOptimal, true);
  });

  it('detects formula mismatches and exports CSV', () => {
    const results = runBatchExperiment({
      family: EXPERIMENT_FAMILIES.fixedLength,
      maxValue: 2,
      length: 2,
    });
    const formula = testFormulaCandidate(results, FORMULA_CANDIDATES.sumMinusPositiveCount);
    const csv = exportExperimentCsv(results);

    assert.equal(formula.exactMatches, 2);
    assert.equal(formula.mismatches, 1);
    assert.deepEqual(formula.counterexamples[0].startState, [1, 1]);
    assert.equal(csv.includes('startState,minMoves,maxMoves'), true);
    assert.equal(csv.includes('"1 1",1,1'), true);
  });

  it('finds simple patterns without overclaiming absent ones', () => {
    const results = runBatchExperiment({
      family: EXPERIMENT_FAMILIES.fixedLength,
      maxValue: 2,
      length: 2,
    });
    const patterns = findExperimentPatterns(results);

    assert.equal(patterns.detected, true);
    assert.equal(
      patterns.observations.some((observation) => observation.includes('minMoves == maxMoves')),
      true,
    );
    assert.equal(
      patterns.observations.some((observation) => observation.includes('Greedy largest/largest')),
      true,
    );
  });

  it('generates heatmap slices for fixed-z triples', () => {
    const slice = generateTripleHeatmapSlice({
      maxValue: 3,
      fixedZ: 3,
      metric: HEATMAP_METRICS.maxMoves,
    });

    assert.equal(slice.fixedZ, 3);
    assert.deepEqual(slice.xLabels, [1, 2, 3]);
    assert.equal(slice.rows.length, 3);
    assert.equal(slice.rows[0].cells[1], null);
    assert.deepEqual(slice.rows[2].cells[0].state, [1, 3, 3]);
    assert.equal(slice.rows[2].cells[2].value, searchMoveRange([3, 3, 3]).maxMoves);
    assert.equal(slice.maxValueInSlice >= slice.minValue, true);
  });

  it('generates consecutive set plot data', () => {
    const plot = generateConsecutiveSetPlotData(8);

    assert.deepEqual(
      plot.slice(0, 4).map((entry) => entry.state),
      [[1], [1, 2], [1, 2, 3], [1, 2, 3, 4]],
    );
    assert.deepEqual(
      plot.slice(0, 4).map((entry) => [entry.n, entry.minMoves, entry.maxMoves, entry.range]),
      plot.slice(0, 4).map((entry) => {
        const range = searchMoveRange(entry.state);
        return [entry.n, range.minMoves, range.maxMoves, range.maxMoves - range.minMoves];
      }),
    );
    assert.equal(plot[0].fixedCount, true);
    assert.equal(plot[7].capped, true);
    assert.equal(plot[7].maxMoves, null);
  });

  it('recovers shortest and longest terminal paths', () => {
    const paths = recoverTerminalPaths([1, 1, 1]);

    assert.equal(paths.shortestMoves, 2);
    assert.equal(paths.longestMoves, 2);
    assert.equal(paths.shortestPath.length, 2);
    assert.equal(paths.longestPath.length, 2);
    assert.equal(paths.shortestTerminalBoard.filter((value) => value > 0).length, 1);
    assert.equal(paths.longestTerminalBoard.filter((value) => value > 0).length, 1);
  });

  it('prepares counterexample load data with an optimal path', () => {
    const results = runBatchExperiment({
      family: EXPERIMENT_FAMILIES.fixedLength,
      maxValue: 2,
      length: 2,
    });
    const formula = testFormulaCandidate(results, FORMULA_CANDIDATES.sumMinusPositiveCount);
    const detail = getFormulaCounterexampleDetail(formula.counterexamples[0]);

    assert.deepEqual(detail.startState, [1, 1]);
    assert.equal(detail.formulaValue, 0);
    assert.equal(detail.actualMaxMoves, 1);
    assert.equal(detail.difference, 1);
    assert.equal(detail.optimalPath.length, 1);
  });

  it('computes research correlations and rank correlations', () => {
    const research = runResearchExperiment({
      family: RESEARCH_FAMILIES.triples,
      maxValue: 3,
      sampleCount: 10,
    });
    const patterns = mineResearchPatterns(research.results);
    const maxBySquares = patterns.find(
      (pattern) => pattern.predictor === 'sumSquares' && pattern.target === 'maxMoves',
    );

    assert.equal(research.computed, 10);
    assert.equal(patterns.length, 18);
    assert.equal(typeof maxBySquares.pearson, 'number');
    assert.equal(typeof maxBySquares.rank, 'number');
    assert.equal(Math.abs(maxBySquares.pearson) <= 1, true);
    assert.equal(Math.abs(maxBySquares.rank) <= 1, true);
  });

  it('compares strategies against optimal max moves', () => {
    const range = searchMoveRange([1, 1, 1]);
    const strategies = compareStrategies([1, 1, 1], range.maxMoves, 4);

    assert.equal(strategies.largestLargest.moves, 2);
    assert.equal(strategies.largestLargest.ratio, 1);
    assert.equal(strategies.largestSmallest.ratio, 1);
    assert.equal(strategies.closestPair.ratio, 1);
    assert.equal(strategies.randomAverage.trials, 4);
  });

  it('exports research data and filters important state families', () => {
    const research = runResearchExperiment({
      family: RESEARCH_FAMILIES.triples,
      maxValue: 3,
      sampleCount: 10,
    });
    const csv = exportResearchCsv(research.results);
    const json = exportResearchJson(research.results);
    const rangeStates = filterResearchResults(
      research.results,
      RESEARCH_FILTERS.rangeAtLeast,
      1,
    );
    const fixedStates = filterResearchResults(research.results, RESEARCH_FILTERS.maxEqualsMin);

    assert.equal(csv.includes('state,sum,sumSquares,positiveCount,minMoves,maxMoves,range'), true);
    assert.equal(csv.includes('"1 1 1",3,3,3,2,2,0'), true);
    assert.equal(JSON.parse(json)[0].state.length, 3);
    assert.equal(rangeStates.every((result) => result.range >= 1), true);
    assert.equal(fixedStates.every((result) => result.minMoves === result.maxMoves), true);
  });

  it('formats cautious research conjectures without proof claims', () => {
    const research = runResearchExperiment({
      family: RESEARCH_FAMILIES.triples,
      maxValue: 3,
      sampleCount: 10,
    });
    const conjectures = generateResearchConjectures(research.results);

    assert.equal(conjectures.length > 0, true);
    assert.equal(conjectures.every((statement) => statement.startsWith('Among tested')), true);
    assert.equal(conjectures.some((statement) => /proof|proves|theorem/i.test(statement)), false);
  });

  it('generates bounded random research states', () => {
    const states = generateResearchStates({
      family: RESEARCH_FAMILIES.random,
      maxValue: 4,
      length: 3,
      sampleCount: 8,
    });

    assert.equal(states.length <= 8, true);
    assert.equal(states.every((state) => state.length <= 3), true);
    assert.equal(states.every((state) => state.every((value) => value >= 1 && value <= 4)), true);
  });

  it('recovers explained minimum and maximum paths', () => {
    const explanation = getOptimalPathExplanation([1, 1, 1]);

    assert.equal(explanation.available, true);
    assert.equal(explanation.minMoves, 2);
    assert.equal(explanation.maxMoves, 2);
    assert.deepEqual(explanation.minPath[0].state, [1, 1, 1]);
    assert.deepEqual(explanation.minPath[0].chosenPair, [1, 1]);
    assert.deepEqual(explanation.minPath[0].producedPair, [2, 0]);
    assert.deepEqual(explanation.maxPath.at(-1).resultingState, [3, 0, 0]);
  });

  it('replays greedy paths with ratios to optimal max', () => {
    const replays = replayGreedyComparisons([1, 1, 1]);
    const largestLargest = replays.find((replay) => replay.id === GREEDY_STRATEGIES.largestLargest);
    const randomReplay = replays.find((replay) => replay.id === GREEDY_STRATEGIES.random);

    assert.equal(replays.length, 4);
    assert.equal(largestLargest.totalMoves, 2);
    assert.equal(largestLargest.ratioToOptimalMax, 1);
    assert.deepEqual(largestLargest.terminalState, [3, 0, 0]);
    assert.equal(randomReplay.path.length, randomReplay.totalMoves);
  });

  it('detects first greedy divergence from optimal maximum path', () => {
    const divergence = detectGreedyDivergence([4, 5, 5], GREEDY_STRATEGIES.largestLargest);

    assert.equal(divergence.available, true);
    assert.equal(divergence.diverged, true);
    assert.equal(divergence.moveNumber >= 1, true);
    assert.equal(Array.isArray(divergence.greedyChoice.chosenPair), true);
    assert.equal(Array.isArray(divergence.optimalChoice.chosenPair), true);
    assert.equal(typeof divergence.greedyChoice.futureMaxMoves, 'number');
    assert.equal(typeof divergence.optimalChoice.futureMaxMoves, 'number');
  });

  it('sorts first-move branch analysis by child max moves', () => {
    const analysis = analyzeFirstMoveBranches([4, 5, 5]);

    assert.equal(analysis.available, true);
    assert.equal(analysis.branches.length, generateLegalMoves([4, 5, 5]).length);
    assert.equal(
      analysis.branches.every((branch, index, branches) =>
        index === 0 || branches[index - 1].maxMoves >= branch.maxMoves,
      ),
      true,
    );
    assert.equal(analysis.branches.some((branch) => branch.optimalForMax), true);
    assert.equal(analysis.branches.some((branch) => branch.optimalForMin), true);
  });

  it('defines valid Strategy Challenge metadata with exact targets', () => {
    const validations = validateBlackboardChallengeTargets();

    assert.equal(BLACKBOARD_CHALLENGES.length, 6);
    assert.equal(validations.every((validation) => validation.valid), true);
    assert.equal(
      BLACKBOARD_CHALLENGES.every(
        (challenge) =>
          challenge.id &&
          challenge.title &&
          challenge.lesson &&
          challenge.startState.every((value) => Number.isInteger(value) && value >= 1),
      ),
      true,
    );
    assert.equal(
      BLACKBOARD_CHALLENGES.some(
        (challenge) => challenge.objectiveType === BLACKBOARD_OBJECTIVES.forecastTrap,
      ),
      true,
    );
  });

  it('[4,5,5] largest-largest greedy count is 9', () => {
    const greedy = playGreedyToTerminal([4, 5, 5], GREEDY_STRATEGIES.largestLargest);

    assert.equal(greedy.moves, 9);
  });

  it('[4,5,5] maximum exact count is 19', () => {
    const range = searchMoveRange([4, 5, 5]);

    assert.equal(range.maxMoves, 19);
  });

  it('forecast trap accepts a max-optimal second move', () => {
    const firstMove = generateLegalMoves([4, 5, 5]).find(
      (move) => move.a === 5 && move.b === 5,
    );
    const afterFirst = applyMove([4, 5, 5], firstMove);
    const branches = analyzeExactChallengeBranches(afterFirst);
    const optimalSecond = branches.branches.find((branch) => branch.optimalForMax).move;
    const nonOptimalSecond = branches.branches.find((branch) => !branch.optimalForMax).move;

    assert.deepEqual(afterFirst, [4, 10, 4]);
    assert.equal(isForecastMaxOptimalMove(afterFirst, optimalSecond), true);
    assert.equal(isForecastMaxOptimalMove(afterFirst, nonOptimalSecond), false);
  });

  it('records Strategy Challenge progress without losing previous attempts', () => {
    const empty = getDefaultBlackboardChallengeProgress();
    const first = recordBlackboardChallengeAttempt(empty, 'beat-greedy-455', {
      success: false,
      moveCount: 10,
      hintsUsed: 1,
    });
    const second = recordBlackboardChallengeAttempt(first, 'beat-greedy-455', {
      success: true,
      moveCount: 14,
      hintsUsed: 2,
    });

    assert.equal(first.completed['beat-greedy-455'], false);
    assert.equal(second.completed['beat-greedy-455'], true);
    assert.equal(second.bestMoveCount['beat-greedy-455'], 14);
    assert.equal(second.hintsUsed['beat-greedy-455'], 3);
  });

  it('calculates Strategy Challenge stars by objective', () => {
    const maximize = BLACKBOARD_CHALLENGES.find((challenge) => challenge.id === 'beat-greedy-455');
    const minimize = BLACKBOARD_CHALLENGES.find((challenge) => challenge.id === 'minimize-23');
    const forecast = BLACKBOARD_CHALLENGES.find((challenge) => challenge.id === 'forecast-trap-455');

    assert.equal(
      calculateBlackboardChallengeStars(maximize, {
        success: true,
        moveCount: 19,
        hintsUsed: 2,
      }),
      3,
    );
    assert.equal(
      calculateBlackboardChallengeStars(minimize, {
        success: true,
        moveCount: 2,
        hintsUsed: 0,
      }),
      3,
    );
    assert.equal(
      calculateBlackboardChallengeStars(forecast, {
        success: true,
        moveCount: 1,
        hintsUsed: 1,
        forecastMaxOptimal: true,
      }),
      3,
    );
    assert.equal(
      calculateBlackboardChallengeStars(maximize, {
        success: true,
        moveCount: 10,
        hintsUsed: 0,
      }),
      2,
    );
  });

  it('unlocks Strategy Challenges sequentially', () => {
    const empty = getDefaultBlackboardChallengeProgress();
    const afterTutorial = recordBlackboardChallengeAttempt(empty, 'tutorial-111', {
      success: true,
      moveCount: 2,
      hintsUsed: 0,
      stars: 3,
    });

    assert.equal(isBlackboardChallengeUnlocked('tutorial-111', empty), true);
    assert.equal(isBlackboardChallengeUnlocked('maximize-22', empty), false);
    assert.equal(isBlackboardChallengeUnlocked('maximize-22', afterTutorial), true);
    assert.equal(isBlackboardChallengeUnlocked('minimize-23', afterTutorial), false);
  });

  it('updates Blackboard stats and local achievements', () => {
    const progress = recordBlackboardChallengeAttempt(
      getDefaultBlackboardChallengeProgress(),
      'forecast-trap-455',
      {
        success: true,
        moveCount: 1,
        hintsUsed: 0,
        stars: 3,
      },
    );
    const stats = recordBlackboardLabExperiment(
      recordBlackboardStatsAttempt(recordBlackboardMove(DEFAULT_BLACKBOARD_STATS), {
        success: true,
        hintsUsed: 0,
        stars: 3,
        beatGreedy: true,
      }),
    );
    const achievementIds = getUnlockedBlackboardAchievements(progress, stats).map(
      (achievement) => achievement.id,
    );

    assert.equal(stats.challengeAttempts, 1);
    assert.equal(stats.challengesCompleted, 1);
    assert.equal(stats.totalMovesPlayed, 1);
    assert.equal(stats.greedyBeatenCount, 1);
    assert.equal(stats.labExperimentsRun, 1);
    assert.deepEqual(achievementIds, [
      'first-move',
      'greedy-breaker',
      'future-planner',
      'optimalist',
      'researcher',
    ]);
  });
});
