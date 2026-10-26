export const BLACKBOARD_CONJECTURE_STORAGE_KEY = 'prism-blackboard-conjectures-v1';

export const GREEDY_STRATEGIES = {
  largestLargest: 'largest-largest',
  largestSmallest: 'largest-smallest',
  closestPair: 'closest-pair',
  random: 'random',
};

export const INVARIANT_CANDIDATES = [
  { id: 'sum-mod-2', label: 'Sum mod 2', value: (quantities) => quantities.sum % 2 },
  { id: 'sum-mod-3', label: 'Sum mod 3', value: (quantities) => quantities.sum % 3 },
  { id: 'sum-mod-4', label: 'Sum mod 4', value: (quantities) => quantities.sum % 4 },
  { id: 'sum-mod-5', label: 'Sum mod 5', value: (quantities) => quantities.sum % 5 },
  {
    id: 'squares-mod-2',
    label: 'Sum of squares mod 2',
    value: (quantities) => quantities.sumSquares % 2,
  },
  {
    id: 'squares-mod-3',
    label: 'Sum of squares mod 3',
    value: (quantities) => quantities.sumSquares % 3,
  },
  {
    id: 'squares-mod-5',
    label: 'Sum of squares mod 5',
    value: (quantities) => quantities.sumSquares % 5,
  },
  {
    id: 'positive-parity',
    label: 'Positive count parity',
    value: (quantities) => quantities.positiveCount % 2,
  },
  {
    id: 'zero-parity',
    label: 'Zero count parity',
    value: (quantities) => quantities.zerosCount % 2,
  },
];

export const EXPERIMENT_FAMILIES = {
  triples: 'triples',
  consecutive: 'consecutive',
  fixedLength: 'fixed-length',
};

export const FORMULA_CANDIDATES = {
  sum: 'sum',
  sumMinusPositiveCount: 'sum-minus-positive-count',
  sumMinusLength: 'sum-minus-length',
  max: 'max',
  exceptMax: 'except-max',
};

export const HEATMAP_METRICS = {
  maxMoves: 'maxMoves',
  minMoves: 'minMoves',
  range: 'range',
  terminalCount: 'terminalCount',
};

export const RESEARCH_FAMILIES = {
  triples: 'research-triples',
  consecutive: 'research-consecutive',
  random: 'research-random',
};

export const RESEARCH_FILTERS = {
  all: 'all',
  rangeAtLeast: 'range-at-least',
  rangeZero: 'range-zero',
  maxEqualsMin: 'max-equals-min',
};

const RESEARCH_PREDICTORS = [
  { key: 'sum', label: 'sum' },
  { key: 'sumSquares', label: 'sumSquares' },
  { key: 'sumCubes', label: 'sumCubes' },
  { key: 'maxValue', label: 'maxValue' },
  { key: 'positiveCount', label: 'positiveCount' },
  { key: 'zeros', label: 'zeros' },
];

const RESEARCH_TARGETS = [
  { key: 'minMoves', label: 'minMoves' },
  { key: 'maxMoves', label: 'maxMoves' },
  { key: 'range', label: 'range' },
];

export function normalizeBoard(values) {
  return values
    .map(Number)
    .filter((value) => Number.isSafeInteger(value) && value >= 0);
}

export function parseBoardText(text) {
  return normalizeBoard(
    text
      .split(/[\s,]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

export function getBoardStats(board) {
  const normalized = normalizeBoard(board);
  const positiveEntries = normalized.filter((value) => value >= 1);

  return {
    sum: normalized.reduce((total, value) => total + value, 0),
    sumSquares: normalized.reduce((total, value) => total + value ** 2, 0),
    sumCubes: normalized.reduce((total, value) => total + value ** 3, 0),
    positiveCount: positiveEntries.length,
    maxValue: normalized.length ? Math.max(...normalized) : 0,
    zerosCount: normalized.filter((value) => value === 0).length,
    legalMoveCount: generateLegalMoves(normalized).length,
  };
}

export function generateLegalMoves(board) {
  const normalized = normalizeBoard(board);
  const moves = [];

  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const left = normalized[i];
      const right = normalized[j];

      if (left < 1 || right < 1) {
        continue;
      }

      const aIndex = left >= right ? i : j;
      const bIndex = left >= right ? j : i;
      const a = normalized[aIndex];
      const b = normalized[bIndex];

      moves.push({
        id: `${aIndex}-${bIndex}`,
        indices: [aIndex, bIndex],
        aIndex,
        bIndex,
        a,
        b,
        resultValues: [a + b, b - 1],
      });
    }
  }

  return moves;
}

export function applyMove(board, move) {
  const normalized = normalizeBoard(board);
  const nextBoard = [...normalized];

  if (!move || !Number.isInteger(move.aIndex) || !Number.isInteger(move.bIndex) ||
      move.aIndex === move.bIndex || nextBoard[move.aIndex] !== move.a ||
      nextBoard[move.bIndex] !== move.b || !(move.a >= move.b && move.b >= 1) ||
      !Number.isSafeInteger(move.a + move.b)) {
    throw new Error('Illegal move.');
  }

  nextBoard[move.aIndex] = move.a + move.b;
  nextBoard[move.bIndex] = move.b - 1;

  return nextBoard;
}

export function isTerminal(board) {
  return generateLegalMoves(board).length === 0;
}

export function createMoveRecord(moveNumber, boardBefore, move) {
  const boardAfter = applyMove(boardBefore, move);
  const beforeStats = getBoardStats(boardBefore);
  const afterStats = getBoardStats(boardAfter);

  return {
    moveNumber,
    selectedPair: [move.a, move.b],
    selectedIndices: [move.aIndex, move.bIndex],
    producedPair: [move.a + move.b, move.b - 1],
    resultingBoard: boardAfter,
    deltas: {
      sum: afterStats.sum - beforeStats.sum,
      sumSquares: afterStats.sumSquares - beforeStats.sumSquares,
      sumCubes: afterStats.sumCubes - beforeStats.sumCubes,
      positiveCount: afterStats.positiveCount - beforeStats.positiveCount,
    },
    ...afterStats,
  };
}

export function canonicalBoardKey(board) {
  return normalizeBoard(board)
    .sort((left, right) => left - right)
    .join(',');
}

function compareLargestLargest(left, right) {
  return right.a - left.a || right.b - left.b || left.aIndex - right.aIndex;
}

function compareLargestSmallest(left, right) {
  return right.a - left.a || left.b - right.b || left.aIndex - right.aIndex;
}

function compareClosestPair(left, right) {
  return Math.abs(left.a - left.b) - Math.abs(right.a - right.b) || left.a - right.a;
}

export function chooseGreedyMove(board, strategy, random = Math.random) {
  const moves = generateLegalMoves(board);

  if (!moves.length) {
    return null;
  }

  if (strategy === GREEDY_STRATEGIES.random) {
    return moves[Math.floor(random() * moves.length)];
  }

  const sorted = [...moves];

  if (strategy === GREEDY_STRATEGIES.largestSmallest) {
    sorted.sort(compareLargestSmallest);
  } else if (strategy === GREEDY_STRATEGIES.closestPair) {
    sorted.sort(compareClosestPair);
  } else {
    sorted.sort(compareLargestLargest);
  }

  return sorted[0];
}

export function canSearchState(board) {
  const stats = getBoardStats(board);

  return board.length <= 5 && stats.sum <= 30 &&
    board.every((value) => Number.isSafeInteger(value) && value >= 0);
}

export function searchMaxMoves(board, memo = new Map()) {
  const range = searchMoveRange(board, memo);
  return { maxMoves: range.maxMoves, path: range.maxPath, terminalBoard: range.maxTerminalBoard };
}

export function searchMoveRange(board, memo = new Map()) {
  if (!canSearchState(board)) throw new RangeError('Exact search unavailable: at most five entries and sum 30.');
  return searchContinuationRange(board, memo);
}

// Only internal, legally derived continuations bypass the initial-sum gate.
// They retain the same expansion/depth budgets and safe-integer move checks.
function searchContinuationRange(board, memo = new Map()) {
  const normalized = normalizeBoard(board);
  let expanded = 0;
  function solve(state, depth = 0) {
    if (depth > 256 || expanded >= 50000) throw new RangeError('Exact search budget exceeded; no result claimed.');
    const key = `counts:${canonicalBoardKey(state)}`;
    if (memo.has(key)) return memo.get(key);
    expanded += 1;
    const moves = generateLegalMoves(state);
    const children = moves.map((move) => solve(applyMove(state, move), depth + 1));
    const result = children.length ? {
      minMoves: 1 + Math.min(...children.map((child) => child.minMoves)),
      maxMoves: 1 + Math.max(...children.map((child) => child.maxMoves)),
    } : { minMoves: 0, maxMoves: 0 };
    memo.set(key, result);
    return result;
  }
  const counts = solve(normalized);
  function reconstruct(field) {
    let state = normalized;
    const path = [];
    let remaining = counts[field];
    while (remaining > 0) {
      const move = generateLegalMoves(state).find((candidate) =>
        solve(applyMove(state, candidate))[field] === remaining - 1);
      if (!move) throw new Error('No legal exact witness transition.');
      state = applyMove(state, move);
      path.push({ move, board: state });
      remaining -= 1;
    }
    if (!isTerminal(state)) throw new Error('Exact witness did not terminate.');
    return { path, terminalBoard: state };
  }
  const min = reconstruct('minMoves');
  const max = reconstruct('maxMoves');
  return { ...counts, minPath: min.path, maxPath: max.path,
    minTerminalBoard: min.terminalBoard, maxTerminalBoard: max.terminalBoard };
}

export function getQuantityTimeline(initialBoard, moveHistory) {
  return [
    {
      moveNumber: 0,
      board: normalizeBoard(initialBoard),
      quantities: getBoardStats(initialBoard),
    },
    ...moveHistory.map((entry) => ({
      moveNumber: entry.moveNumber,
      board: entry.resultingBoard,
      quantities: getBoardStats(entry.resultingBoard),
    })),
  ];
}

export function getQuantityChanges(initialBoard, moveHistory) {
  const timeline = getQuantityTimeline(initialBoard, moveHistory);
  const current = timeline[timeline.length - 1];
  const previous = timeline[timeline.length - 2] || current;

  return {
    current: current.quantities,
    previous: previous.quantities,
    deltas: {
      sum: current.quantities.sum - previous.quantities.sum,
      sumSquares: current.quantities.sumSquares - previous.quantities.sumSquares,
      sumCubes: current.quantities.sumCubes - previous.quantities.sumCubes,
      maxValue: current.quantities.maxValue - previous.quantities.maxValue,
      positiveCount: current.quantities.positiveCount - previous.quantities.positiveCount,
      zerosCount: current.quantities.zerosCount - previous.quantities.zerosCount,
      legalMoveCount: current.quantities.legalMoveCount - previous.quantities.legalMoveCount,
    },
  };
}

export function analyzeInvariantCandidates(initialBoard, moveHistory) {
  const timeline = getQuantityTimeline(initialBoard, moveHistory);
  const initialQuantities = timeline[0].quantities;

  return INVARIANT_CANDIDATES.map((candidate) => {
    const initialValue = candidate.value(initialQuantities);
    const brokenEntry = timeline.find(
      (entry) => candidate.value(entry.quantities) !== initialValue,
    );

    return {
      id: candidate.id,
      label: candidate.label,
      initialValue,
      currentValue: candidate.value(timeline[timeline.length - 1].quantities),
      changed: Boolean(brokenEntry),
      preserved: !brokenEntry,
      brokenAtMove: brokenEntry?.moveNumber ?? null,
    };
  });
}

export function playGreedyToTerminal(board, strategy, maxSteps = 200) {
  return playStrategyToTerminal(board, strategy, maxSteps, () => 0);
}

export function playStrategyToTerminal(board, strategy, maxSteps = 200, random = Math.random) {
  maxSteps = Math.max(0, Math.min(200, Math.floor(Number(maxSteps) || 0)));
  let currentBoard = normalizeBoard(board);
  const path = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const move = chooseGreedyMove(currentBoard, strategy, random);

    if (!move) {
      break;
    }

    currentBoard = applyMove(currentBoard, move);
    path.push({ move, board: currentBoard });
  }

  return {
    moves: path.length,
    path,
    terminalBoard: currentBoard,
    stoppedEarly: generateLegalMoves(currentBoard).length > 0,
  };
}

function createSeededRandom(seed) {
  let value = seed || 1;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function hashBoard(board, salt = 0) {
  return normalizeBoard(board).reduce(
    (hash, value, index) => (hash * 31 + value * 17 + index + salt) >>> 0,
    2166136261,
  );
}

export function generateStateGraph(board, maxStates = 300) {
  maxStates = Math.max(1, Math.min(1000, Math.floor(Number(maxStates) || 300)));
  if (!canSearchState(board)) return { nodes: [], edges: [], totalStates: 0, terminalStates: 0, longestPath: 0, truncated: true };
  const startBoard = normalizeBoard(board);
  const startKey = canonicalBoardKey(startBoard);
  const queue = [startBoard];
  const seen = new Map([[startKey, startBoard]]);
  const edges = [];
  const depth = new Map([[startKey, 0]]);
  let truncated = false;

  while (queue.length && seen.size <= maxStates) {
    const currentBoard = queue.shift();
    const fromKey = canonicalBoardKey(currentBoard);
    const currentDepth = depth.get(fromKey) || 0;

    generateLegalMoves(currentBoard).forEach((move) => {
      const nextBoard = applyMove(currentBoard, move);
      const toKey = canonicalBoardKey(nextBoard);

      if (!seen.has(toKey)) {
        if (seen.size >= maxStates) { truncated = true; return; }
        seen.set(toKey, nextBoard);
        depth.set(toKey, currentDepth + 1);
        queue.push(nextBoard);
      }
      edges.push({ from: fromKey, to: toKey, move: [move.a, move.b] });
    });
  }

  const nodes = [...seen.entries()].map(([key, state]) => ({
    key,
    state,
    terminal: isTerminal(state),
    depth: depth.get(key) || 0,
  }));
  const terminalStates = nodes.filter((node) => node.terminal);

  return {
    nodes,
    edges,
    totalStates: nodes.length,
    terminalStates: terminalStates.length,
    longestPath: nodes.reduce((max, node) => Math.max(max, node.depth), 0),
    truncated,
  };
}

export function recoverTerminalPaths(board) {
  const normalized = normalizeBoard(board);
  const range = searchMoveRange(normalized);

  return {
    startState: normalized,
    shortestPath: range.minPath,
    longestPath: range.maxPath,
    shortestMoves: range.minMoves,
    longestMoves: range.maxMoves,
    shortestTerminalBoard: range.minTerminalBoard,
    longestTerminalBoard: range.maxTerminalBoard,
  };
}

function describePath(initialBoard, path) {
  let currentBoard = normalizeBoard(initialBoard);

  return path.map((entry, index) => {
    const state = currentBoard;
    const described = {
      moveNumber: index + 1,
      state,
      chosenPair: [entry.move.a, entry.move.b],
      producedPair: [entry.move.a + entry.move.b, entry.move.b - 1],
      resultingState: entry.board,
      move: entry.move,
    };

    currentBoard = entry.board;
    return described;
  });
}

function moveOutcomeSignature(entry) {
  if (!entry) {
    return '';
  }

  const resultingState = entry.resultingState || entry.board;

  return `${entry.move.a},${entry.move.b}->${canonicalBoardKey(resultingState)}`;
}

export function getOptimalPathExplanation(board) {
  const normalized = normalizeBoard(board);

  if (!canResearchExactState(normalized)) {
    return {
      available: false,
      reason: 'Exact path unavailable: state too large.',
      startState: normalized,
    };
  }

  const range = searchMoveRange(normalized);

  return {
    available: true,
    startState: normalized,
    minMoves: range.minMoves,
    maxMoves: range.maxMoves,
    minTerminalBoard: range.minTerminalBoard,
    maxTerminalBoard: range.maxTerminalBoard,
    minPath: describePath(normalized, range.minPath),
    maxPath: describePath(normalized, range.maxPath),
  };
}

export function replayGreedyComparisons(board) {
  const normalized = normalizeBoard(board);
  const optimal = getOptimalPathExplanation(normalized);
  const optimalMaxMoves = optimal.available ? optimal.maxMoves : null;
  const strategies = [
    { id: GREEDY_STRATEGIES.largestLargest, label: 'largest-largest' },
    { id: GREEDY_STRATEGIES.largestSmallest, label: 'largest-smallest' },
    { id: GREEDY_STRATEGIES.closestPair, label: 'closest-pair' },
    { id: GREEDY_STRATEGIES.random, label: 'random sample' },
  ];

  return strategies.map((strategy) => {
    const result = playStrategyToTerminal(
      normalized,
      strategy.id,
      200,
      createSeededRandom(hashBoard(normalized, strategy.label.length)),
    );

    return {
      ...strategy,
      totalMoves: result.moves,
      terminalState: result.terminalBoard,
      ratioToOptimalMax: optimalMaxMoves ? result.moves / optimalMaxMoves : null,
      path: describePath(normalized, result.path),
      stoppedEarly: result.stoppedEarly,
    };
  });
}

export function analyzeFirstMoveBranches(board) {
  const normalized = normalizeBoard(board);

  if (!canResearchExactState(normalized)) {
    return {
      available: false,
      reason: 'Exact path unavailable: state too large.',
      branches: [],
    };
  }

  const parentRange = searchMoveRange(normalized);
  const branches = generateLegalMoves(normalized).map((move) => {
    const resultingState = applyMove(normalized, move);
    const childRange = searchMoveRange(resultingState);
    const totalMinMoves = 1 + childRange.minMoves;
    const totalMaxMoves = 1 + childRange.maxMoves;

    return {
      chosenPair: [move.a, move.b],
      producedPair: [move.a + move.b, move.b - 1],
      resultingState,
      minMoves: childRange.minMoves,
      maxMoves: childRange.maxMoves,
      totalMinMoves,
      totalMaxMoves,
      optimalForMax: totalMaxMoves === parentRange.maxMoves,
      optimalForMin: totalMinMoves === parentRange.minMoves,
    };
  });

  return {
    available: true,
    parentMinMoves: parentRange.minMoves,
    parentMaxMoves: parentRange.maxMoves,
    branches: branches.sort(
      (left, right) =>
        right.maxMoves - left.maxMoves ||
        right.minMoves - left.minMoves ||
        canonicalBoardKey(left.resultingState).localeCompare(canonicalBoardKey(right.resultingState)),
    ),
  };
}

export function detectGreedyDivergence(board, strategy = GREEDY_STRATEGIES.largestLargest) {
  const normalized = normalizeBoard(board);
  const optimal = getOptimalPathExplanation(normalized);

  if (!optimal.available) {
    return {
      available: false,
      reason: optimal.reason,
    };
  }

  const greedyResult = playStrategyToTerminal(normalized, strategy, 200, createSeededRandom(hashBoard(normalized, 7)));
  const greedyPath = describePath(normalized, greedyResult.path);
  const maxLength = Math.max(greedyPath.length, optimal.maxPath.length);

  for (let index = 0; index < maxLength; index += 1) {
    const greedyEntry = greedyPath[index];
    const optimalEntry = optimal.maxPath[index];

    if (moveOutcomeSignature(greedyEntry) !== moveOutcomeSignature(optimalEntry)) {
      const greedyFuture = greedyEntry?.resultingState
        ? searchContinuationRange(greedyEntry.resultingState).maxMoves
        : null;
      const optimalFuture = optimalEntry?.resultingState
        ? searchContinuationRange(optimalEntry.resultingState).maxMoves
        : null;

      return {
        available: true,
        diverged: true,
        strategy,
        moveNumber: index + 1,
        greedyChoice: greedyEntry
          ? {
              chosenPair: greedyEntry.chosenPair,
              producedPair: greedyEntry.producedPair,
              resultingState: greedyEntry.resultingState,
              futureMaxMoves: greedyFuture,
            }
          : null,
        optimalChoice: optimalEntry
          ? {
              chosenPair: optimalEntry.chosenPair,
              producedPair: optimalEntry.producedPair,
              resultingState: optimalEntry.resultingState,
              futureMaxMoves: optimalFuture,
            }
          : null,
      };
    }
  }

  return {
    available: true,
    diverged: false,
    strategy,
    message: 'Greedy follows the displayed optimal maximum path for every compared move.',
  };
}

function combinationsWithReplacement(length, maxValue, minValue = 1, prefix = []) {
  if (prefix.length === length) {
    return [prefix];
  }

  const states = [];

  for (let value = minValue; value <= maxValue; value += 1) {
    states.push(...combinationsWithReplacement(length, maxValue, value, [...prefix, value]));
  }

  return states;
}

export function generateExperimentStates({ family, maxValue = 8, length = 3 }) {
  const safeMax = Math.max(1, Math.min(12, Math.floor(Number(maxValue) || 8)));
  const safeLength = Math.max(1, Math.min(5, Math.floor(Number(length) || 3)));

  if (family === EXPERIMENT_FAMILIES.consecutive) {
    return Array.from({ length: safeMax }, (_, index) =>
      Array.from({ length: index + 1 }, (__, innerIndex) => innerIndex + 1),
    );
  }

  if (family === EXPERIMENT_FAMILIES.fixedLength) {
    return combinationsWithReplacement(safeLength, safeMax);
  }

  return combinationsWithReplacement(3, safeMax);
}

export function evaluateFormula(formula, board) {
  const normalized = normalizeBoard(board);
  const stats = getBoardStats(normalized);

  if (formula === FORMULA_CANDIDATES.sumMinusPositiveCount) {
    return stats.sum - stats.positiveCount;
  }

  if (formula === FORMULA_CANDIDATES.sumMinusLength) {
    return stats.sum - normalized.length;
  }

  if (formula === FORMULA_CANDIDATES.max) {
    return stats.maxValue;
  }

  if (formula === FORMULA_CANDIDATES.exceptMax) {
    return stats.sum - stats.maxValue;
  }

  return stats.sum;
}

export function computeExperimentResult(board, memo = new Map()) {
  const normalized = normalizeBoard(board);
  const stats = getBoardStats(normalized);
  let range;
  try { range = searchMoveRange(normalized, memo); }
  catch (error) {
    return { startState: normalized, startKey: canonicalBoardKey(normalized), minMoves: null, maxMoves: null,
      range: null, sum: stats.sum, max: stats.maxValue, positiveCount: stats.positiveCount,
      terminalCount: null, skipped: true, skipReason: error.message, graphTruncated: true };
  }
  const graph = generateStateGraph(normalized, 600);
  const largestLargest = playGreedyToTerminal(normalized, GREEDY_STRATEGIES.largestLargest);
  const largestSmallest = playGreedyToTerminal(normalized, GREEDY_STRATEGIES.largestSmallest);

  return {
    startState: normalized,
    startKey: canonicalBoardKey(normalized),
    minMoves: range.minMoves,
    maxMoves: range.maxMoves,
    range: range.maxMoves - range.minMoves,
    sum: stats.sum,
    max: stats.maxValue,
    positiveCount: stats.positiveCount,
    terminalCount: graph.terminalStates,
    largestLargestMoves: largestLargest.moves,
    largestSmallestMoves: largestSmallest.moves,
    largestLargestOptimal: largestLargest.moves === range.maxMoves,
    largestSmallestOptimal: largestSmallest.moves === range.maxMoves,
    graphTruncated: graph.truncated,
  };
}

export function generateTripleHeatmapSlice({
  maxValue = 8,
  fixedZ = 3,
  metric = HEATMAP_METRICS.maxMoves,
} = {}) {
  const safeMax = Math.max(1, Math.min(12, Math.floor(Number(maxValue) || 8)));
  const safeZ = Math.max(1, Math.min(safeMax, Math.floor(Number(fixedZ) || safeMax)));
  const safeMetric = Object.values(HEATMAP_METRICS).includes(metric)
    ? metric
    : HEATMAP_METRICS.maxMoves;
  const memo = new Map();
  const rows = [];
  const values = [];

  for (let y = 1; y <= safeZ; y += 1) {
    const cells = [];

    for (let x = 1; x <= safeZ; x += 1) {
      if (x > y) {
        cells.push(null);
        continue;
      }

      const result = computeExperimentResult([x, y, safeZ], memo);
      if (result.skipped) { cells.push(null); continue; }
      const value = result[safeMetric];

      values.push(value);
      cells.push({
        x,
        y,
        z: safeZ,
        state: [x, y, safeZ],
        value,
        minMoves: result.minMoves,
        maxMoves: result.maxMoves,
        range: result.range,
        terminalCount: result.terminalCount,
      });
    }

    rows.push({ y, cells });
  }

  return {
    maxValue: safeMax,
    fixedZ: safeZ,
    metric: safeMetric,
    xLabels: Array.from({ length: safeZ }, (_, index) => index + 1),
    rows,
    minValue: values.length ? Math.min(...values) : 0,
    maxValueInSlice: values.length ? Math.max(...values) : 0,
  };
}

export function generateConsecutiveSetPlotData(maxValue = 8) {
  const safeMax = Math.max(1, Math.min(12, Math.floor(Number(maxValue) || 8)));
  const memo = new Map();

  return Array.from({ length: safeMax }, (_, index) => {
    const n = index + 1;
    const state = Array.from({ length: n }, (__, stateIndex) => stateIndex + 1);

    if (n > 5 || !canSearchState(state)) {
      return {
        n,
        state,
        minMoves: null,
        maxMoves: null,
        range: null,
        fixedCount: false,
        capped: true,
      };
    }

    const result = computeExperimentResult(state, memo);

    return {
      n,
      state,
      minMoves: result.minMoves,
      maxMoves: result.maxMoves,
      range: result.range,
      fixedCount: result.minMoves === result.maxMoves,
      capped: false,
    };
  });
}

export function canResearchExactState(board) {
  const normalized = normalizeBoard(board);
  const stats = getBoardStats(normalized);

  if (normalized.length <= 3) {
    return stats.sum <= 15;
  }

  return normalized.length <= 5 && stats.sum <= 15;
}

function generateRandomResearchStates(maxValue, maxLength, sampleCount) {
  const safeMax = Math.max(1, Math.min(8, Math.floor(Number(maxValue) || 5)));
  const safeLength = Math.max(1, Math.min(5, Math.floor(Number(maxLength) || 3)));
  const safeSamples = Math.max(1, Math.min(120, Math.floor(Number(sampleCount) || 24)));
  const states = [];
  const seen = new Set();
  const random = createSeededRandom(safeMax * 1009 + safeLength * 101 + safeSamples);
  let attempts = 0;

  while (states.length < safeSamples && attempts < safeSamples * 30) {
    attempts += 1;
    const length = 1 + Math.floor(random() * safeLength);
    const state = Array.from({ length }, () => 1 + Math.floor(random() * safeMax)).sort(
      (left, right) => left - right,
    );
    const key = canonicalBoardKey(state);

    if (!seen.has(key)) {
      seen.add(key);
      states.push(state);
    }
  }

  return states;
}

export function generateResearchStates({
  family = RESEARCH_FAMILIES.triples,
  maxValue = 5,
  length = 3,
  sampleCount = 24,
} = {}) {
  const safeMax = Math.max(1, Math.min(8, Math.floor(Number(maxValue) || 5)));
  const safeLength = Math.max(1, Math.min(5, Math.floor(Number(length) || 3)));

  if (family === RESEARCH_FAMILIES.consecutive) {
    return Array.from({ length: safeMax }, (_, index) =>
      Array.from({ length: index + 1 }, (__, innerIndex) => innerIndex + 1),
    );
  }

  if (family === RESEARCH_FAMILIES.random) {
    return generateRandomResearchStates(safeMax, safeLength, sampleCount);
  }

  return combinationsWithReplacement(3, safeMax);
}

export function compareStrategies(board, optimalMaxMoves, randomTrials = 12) {
  const normalized = normalizeBoard(board);
  const strategies = [
    ['largestLargest', GREEDY_STRATEGIES.largestLargest],
    ['largestSmallest', GREEDY_STRATEGIES.largestSmallest],
    ['closestPair', GREEDY_STRATEGIES.closestPair],
  ];
  const comparisons = {};

  strategies.forEach(([key, strategy]) => {
    const result = playStrategyToTerminal(normalized, strategy);

    comparisons[key] = {
      moves: result.moves,
      ratio: optimalMaxMoves ? result.moves / optimalMaxMoves : 1,
      stoppedEarly: result.stoppedEarly,
    };
  });

  const trialCount = Math.max(1, Math.min(40, Math.floor(Number(randomTrials) || 12)));
  const randomMoves = Array.from({ length: trialCount }, (_, index) =>
    playStrategyToTerminal(
      normalized,
      GREEDY_STRATEGIES.random,
      200,
      createSeededRandom(hashBoard(normalized, index + 1)),
    ).moves,
  );
  const randomAverage =
    randomMoves.reduce((total, moves) => total + moves, 0) / randomMoves.length;

  comparisons.randomAverage = {
    moves: randomAverage,
    ratio: optimalMaxMoves ? randomAverage / optimalMaxMoves : 1,
    trials: trialCount,
  };

  return comparisons;
}

export function computeResearchResult(board, memo = new Map()) {
  const normalized = normalizeBoard(board);
  const stats = getBoardStats(normalized);

  if (!canResearchExactState(normalized)) {
    return {
      state: normalized,
      startKey: canonicalBoardKey(normalized),
      skipped: true,
      skipReason: 'Exact search capped for this state.',
      sum: stats.sum,
      sumSquares: stats.sumSquares,
      sumCubes: stats.sumCubes,
      maxValue: stats.maxValue,
      positiveCount: stats.positiveCount,
      zeros: stats.zerosCount,
      minMoves: null,
      maxMoves: null,
      range: null,
      strategies: null,
    };
  }

  const range = searchMoveRange(normalized, memo);

  return {
    state: normalized,
    startKey: canonicalBoardKey(normalized),
    skipped: false,
    sum: stats.sum,
    sumSquares: stats.sumSquares,
    sumCubes: stats.sumCubes,
    maxValue: stats.maxValue,
    positiveCount: stats.positiveCount,
    zeros: stats.zerosCount,
    minMoves: range.minMoves,
    maxMoves: range.maxMoves,
    range: range.maxMoves - range.minMoves,
    strategies: compareStrategies(normalized, range.maxMoves),
  };
}

export function runResearchExperiment(options = {}) {
  const states = generateResearchStates(options);
  const maxResults = Math.max(1, Math.min(180, Math.floor(Number(options.sampleCount) || 80)));
  const memo = new Map();
  const results = states.slice(0, maxResults).map((state) => computeResearchResult(state, memo));

  return {
    family: options.family || RESEARCH_FAMILIES.triples,
    results,
    computed: results.filter((result) => !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length,
  };
}

function pearsonCorrelation(pairs) {
  if (pairs.length < 2) {
    return 0;
  }

  const meanX = pairs.reduce((total, pair) => total + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((total, pair) => total + pair.y, 0) / pairs.length;
  let numerator = 0;
  let xSquare = 0;
  let ySquare = 0;

  pairs.forEach((pair) => {
    const xDelta = pair.x - meanX;
    const yDelta = pair.y - meanY;

    numerator += xDelta * yDelta;
    xSquare += xDelta ** 2;
    ySquare += yDelta ** 2;
  });

  const denominator = Math.sqrt(xSquare * ySquare);

  return denominator ? numerator / denominator : 0;
}

function rankValues(values) {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const ranks = Array(values.length);

  for (let index = 0; index < sorted.length; index += 1) {
    let end = index;

    while (end + 1 < sorted.length && sorted[end + 1].value === sorted[index].value) {
      end += 1;
    }

    const rank = (index + end + 2) / 2;

    for (let rankIndex = index; rankIndex <= end; rankIndex += 1) {
      ranks[sorted[rankIndex].index] = rank;
    }

    index = end;
  }

  return ranks;
}

export function rankCorrelation(pairs) {
  if (pairs.length < 2) {
    return 0;
  }

  const xRanks = rankValues(pairs.map((pair) => pair.x));
  const yRanks = rankValues(pairs.map((pair) => pair.y));

  return pearsonCorrelation(xRanks.map((x, index) => ({ x, y: yRanks[index] })));
}

export function mineResearchPatterns(results) {
  const computed = results.filter((result) => !result.skipped);
  const candidates = [];

  RESEARCH_PREDICTORS.forEach((predictor) => {
    RESEARCH_TARGETS.forEach((target) => {
      const pairs = computed.map((result) => ({
        x: result[predictor.key],
        y: result[target.key],
      }));

      candidates.push({
        predictor: predictor.key,
        predictorLabel: predictor.label,
        target: target.key,
        targetLabel: target.label,
        exactMatches: computed.filter((result) => result[predictor.key] === result[target.key])
          .length,
        pearson: pearsonCorrelation(pairs),
        rank: rankCorrelation(pairs),
      });
    });
  });

  return candidates.sort(
    (left, right) =>
      Math.max(Math.abs(right.pearson), Math.abs(right.rank)) -
        Math.max(Math.abs(left.pearson), Math.abs(left.rank)) ||
      right.exactMatches - left.exactMatches,
  );
}

export function filterResearchResults(results, filter = RESEARCH_FILTERS.all, rangeThreshold = 1) {
  const computed = results.filter((result) => !result.skipped);

  if (filter === RESEARCH_FILTERS.rangeAtLeast) {
    return computed.filter((result) => result.range >= rangeThreshold);
  }

  if (filter === RESEARCH_FILTERS.rangeZero || filter === RESEARCH_FILTERS.maxEqualsMin) {
    return computed.filter((result) => result.range === 0);
  }

  return computed;
}

export function generateResearchConjectures(results, minedPatterns = mineResearchPatterns(results)) {
  const computed = results.filter((result) => !result.skipped);
  const observations = [];

  minedPatterns.slice(0, 6).forEach((pattern) => {
    const strength = Math.max(Math.abs(pattern.pearson), Math.abs(pattern.rank));

    if (strength >= 0.92) {
      observations.push(
        `Among tested states, ${pattern.targetLabel} strongly correlates with ${pattern.predictorLabel} (Pearson ${pattern.pearson.toFixed(2)}, rank ${pattern.rank.toFixed(2)}).`,
      );
    } else if (strength >= 0.75) {
      observations.push(
        `Among tested states, ${pattern.targetLabel} appears related to ${pattern.predictorLabel} (Pearson ${pattern.pearson.toFixed(2)}, rank ${pattern.rank.toFixed(2)}).`,
      );
    }
  });

  const fixedCount = computed.filter((result) => result.range === 0).length;

  if (computed.length && fixedCount) {
    observations.push(
      `Among tested states, ${fixedCount} of ${computed.length} states have minMoves equal to maxMoves.`,
    );
  }

  const equalEntryStates = computed.filter((result) =>
    result.state.every((value) => value === result.state[0]),
  );

  if (equalEntryStates.length) {
    const averageRange =
      equalEntryStates.reduce((total, result) => total + result.range, 0) / equalEntryStates.length;

    observations.push(
      `Among tested equal-entry states, the average range is ${averageRange.toFixed(2)} moves.`,
    );
  }

  if (!observations.length) {
    observations.push('Among tested states, no simple empirical predictor is dominant yet.');
  }

  return observations.slice(0, 10);
}

export function exportResearchCsv(results) {
  const header = 'state,sum,sumSquares,positiveCount,minMoves,maxMoves,range';
  const rows = results.map((result) =>
    [
      `"${result.state.join(' ')}"`,
      result.sum,
      result.sumSquares,
      result.positiveCount,
      result.skipped ? '' : result.minMoves,
      result.skipped ? '' : result.maxMoves,
      result.skipped ? '' : result.range,
    ].join(','),
  );

  return [header, ...rows].join('\n');
}

export function exportResearchJson(results) {
  return JSON.stringify(
    results.map((result) => ({
      state: result.state,
      sum: result.sum,
      sumSquares: result.sumSquares,
      positiveCount: result.positiveCount,
      minMoves: result.minMoves,
      maxMoves: result.maxMoves,
      range: result.range,
      skipped: result.skipped,
    })),
    null,
    2,
  );
}

export function runBatchExperiment(options) {
  const states = generateExperimentStates(options);
  const memo = new Map();
  const maxResults = Math.max(1, Math.min(250, options.maxResults || 160));

  return states.slice(0, maxResults).map((state) => computeExperimentResult(state, memo));
}

function allEqual(results, selector) {
  return results.length > 0 && results.every((result) => selector(result));
}

function correlationMatches(results, selector) {
  return results.length > 0 && results.every((result) => result.maxMoves === selector(result));
}

export function findExperimentPatterns(results) {
  results = results.filter((result) => !result.skipped);
  const observations = [];

  if (correlationMatches(results, (result) => result.sum)) {
    observations.push('maxMoves exactly matches initial sum for this batch.');
  }

  if (correlationMatches(results, (result) => result.sum - result.positiveCount)) {
    observations.push('maxMoves exactly matches sum - positiveCount for this batch.');
  }

  if (correlationMatches(results, (result) => result.max)) {
    observations.push('maxMoves exactly matches the largest initial value for this batch.');
  }

  if (allEqual(results, (result) => result.minMoves === result.maxMoves)) {
    observations.push('Every tested state has minMoves == maxMoves.');
  }

  if (allEqual(results, (result) => result.largestLargestOptimal)) {
    observations.push('Greedy largest/largest matches optimal maxMoves on every tested state.');
  }

  if (allEqual(results, (result) => result.largestSmallestOptimal)) {
    observations.push('Greedy largest/smallest matches optimal maxMoves on every tested state.');
  }

  return {
    detected: observations.length > 0,
    observations,
  };
}

export function testFormulaCandidate(results, formula) {
  results = results.filter((result) => !result.skipped);
  const comparisons = results.map((result) => {
    const predicted = evaluateFormula(formula, result.startState);

    return {
      startState: result.startState,
      predicted,
      actual: result.maxMoves,
      difference: result.maxMoves - predicted,
      matches: predicted === result.maxMoves,
    };
  });
  const mismatches = comparisons.filter((comparison) => !comparison.matches);

  return {
    formula,
    exactMatches: comparisons.length - mismatches.length,
    mismatches: mismatches.length,
    counterexamples: mismatches.slice(0, 5),
  };
}

export function getFormulaCounterexampleDetail(counterexample) {
  const state = normalizeBoard(counterexample?.startState || []);
  const range = searchMoveRange(state);

  return {
    startState: state,
    formulaValue: counterexample?.predicted ?? null,
    actualMaxMoves: range.maxMoves,
    difference:
      typeof counterexample?.predicted === 'number'
        ? range.maxMoves - counterexample.predicted
        : null,
    optimalPath: range.maxPath,
    terminalBoard: range.maxTerminalBoard,
  };
}

export function sortExperimentResults(results, sortKey) {
  const sorted = [...results];

  if (sortKey === 'range') {
    return sorted.sort((left, right) => right.range - left.range || left.startKey.localeCompare(right.startKey));
  }

  if (sortKey === 'sum') {
    return sorted.sort((left, right) => right.sum - left.sum || left.startKey.localeCompare(right.startKey));
  }

  if (sortKey === 'start') {
    return sorted.sort((left, right) => left.startKey.localeCompare(right.startKey));
  }

  return sorted.sort((left, right) => right.maxMoves - left.maxMoves || left.startKey.localeCompare(right.startKey));
}

export function exportExperimentJson(results) {
  return JSON.stringify(results, null, 2);
}

export function exportExperimentCsv(results) {
  const header = 'startState,minMoves,maxMoves,range,sum,max,positiveCount,terminalCount';
  const rows = results.map((result) =>
    [
      `"${result.startState.join(' ')}"`,
      result.minMoves,
      result.maxMoves,
      result.range,
      result.sum,
      result.max,
      result.positiveCount,
      result.terminalCount,
    ].join(','),
  );

  return [header, ...rows].join('\n');
}
