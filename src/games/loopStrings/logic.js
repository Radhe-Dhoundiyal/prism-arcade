export const ROTATION_DIRECTIONS = {
  clockwise: 'clockwise',
  counterclockwise: 'counterclockwise',
};

export const REACHABLE_ENUMERATION_MAX_N = 7;
export const CYCLE_TYPE_EXPLORER_MAX_N = 12;

export function createIdentityPermutation(n) {
  const size = Math.max(1, Math.min(CYCLE_TYPE_EXPLORER_MAX_N, Math.floor(Number(n) || 1)));
  return Array.from({ length: size }, (_, index) => index + 1);
}

export function normalizePermutation(permutation) {
  if (!Array.isArray(permutation)) {
    throw new Error('Permutation must be an array.');
  }

  const values = permutation.map(Number);
  const seen = new Set(values);

  if (
    !values.length || values.length > CYCLE_TYPE_EXPLORER_MAX_N ||
    values.some((value) => !Number.isInteger(value) || value < 1 || value > values.length) ||
    seen.size !== values.length
  ) {
    throw new Error('Permutation must contain each label from 1 to n exactly once.');
  }

  return values;
}

function normalizeShiftLabels(labels, n) {
  const values = labels.map(Number);
  const seen = new Set(values);

  if (
    values.length !== 3 ||
    seen.size !== 3 ||
    values.some((value) => !Number.isInteger(value) || value < 1 || value > n)
  ) {
    throw new Error('A 3-shift requires three distinct right-end labels.');
  }

  return values;
}

export function applyThreeShift(permutation, labels, direction = ROTATION_DIRECTIONS.clockwise) {
  if (!Object.values(ROTATION_DIRECTIONS).includes(direction)) throw new Error('Invalid rotation direction.');
  const current = normalizePermutation(permutation);
  const selected = normalizeShiftLabels(labels, current.length);
  const positions = selected.map((label) => current.indexOf(label));
  const next = [...current];

  if (direction === ROTATION_DIRECTIONS.counterclockwise) {
    next[positions[0]] = selected[1];
    next[positions[1]] = selected[2];
    next[positions[2]] = selected[0];
    return next;
  }

  next[positions[0]] = selected[2];
  next[positions[1]] = selected[0];
  next[positions[2]] = selected[1];
  return next;
}

export function invertThreeShiftMove(move) {
  return {
    labels: move.labels,
    direction:
      move.direction === ROTATION_DIRECTIONS.counterclockwise
        ? ROTATION_DIRECTIONS.clockwise
        : ROTATION_DIRECTIONS.counterclockwise,
  };
}

export function undoThreeShift(permutation, move) {
  const inverse = invertThreeShiftMove(move);
  return applyThreeShift(permutation, inverse.labels, inverse.direction);
}

export function getPermutationParity(permutation) {
  const values = normalizePermutation(permutation);
  let inversions = 0;

  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if (values[i] > values[j]) {
        inversions += 1;
      }
    }
  }

  return inversions % 2 === 0 ? 'even' : 'odd';
}

export function getCycleTypeFromCycles(cycles) {
  return cycles.map((cycle) => cycle.length).sort((a, b) => a - b);
}

export function countEvenLengthParts(cycleType) {
  return cycleType.filter((part) => part % 2 === 0).length;
}

export function getParityFromCycleType(cycleType) {
  return countEvenLengthParts(cycleType) % 2 === 0 ? 'even' : 'odd';
}

export function isReachableCycleType(cycleType) {
  return getParityFromCycleType(cycleType) === 'even';
}

export function getCycles(permutation) {
  const values = normalizePermutation(permutation);
  const visited = new Set();
  const cycles = [];

  values.forEach((_, index) => {
    const start = index + 1;

    if (visited.has(start)) {
      return;
    }

    const cycle = [];
    let current = start;

    while (!visited.has(current)) {
      visited.add(current);
      cycle.push(current);
      current = values[current - 1];
    }

    cycles.push(cycle);
  });

  return cycles;
}

export function analyzeLoops(permutation) {
  const cycles = getCycles(permutation);
  const sizes = getCycleTypeFromCycles(cycles);
  const parityFromCycleType = getParityFromCycleType(sizes);

  return {
    permutation: normalizePermutation(permutation),
    cycles,
    loopCount: cycles.length,
    shortestLoopSize: sizes[0] || 0,
    longestLoopSize: sizes.at(-1) || 0,
    sizeMultiset: sizes,
    cycleType: sizes,
    evenLengthCycleCount: countEvenLengthParts(sizes),
    parity: getPermutationParity(permutation),
    parityFromCycleType,
    reachableByThreeShifts: parityFromCycleType === 'even',
  };
}

export function formatCycle(cycle) {
  return `(${cycle.join(' ')})`;
}

export function formatCycleDecomposition(cycles) {
  return cycles.map(formatCycle).join('');
}

export function formatCycleType(cycleType) {
  return cycleType.join(' + ');
}

export function generateIntegerPartitions(n, minPart = 1) {
  const size = Math.max(0, Math.floor(Number(n) || 0));
  if (!Number.isInteger(minPart) || minPart < 1 || size > CYCLE_TYPE_EXPLORER_MAX_N) throw new RangeError('Partition budget: n <= 12, positive integer parts.');

  if (size === 0) {
    return [[]];
  }

  const partitions = [];

  for (let part = minPart; part <= size; part += 1) {
    generateIntegerPartitions(size - part, part).forEach((tail) => {
      partitions.push([part, ...tail]);
    });
  }

  return partitions;
}

export function getReachableCycleTypes(n) {
  return generateIntegerPartitions(n).filter(isReachableCycleType);
}

export function getPossibleShortestLoopSizes(n) {
  const byShortest = new Map();

  getReachableCycleTypes(n).forEach((cycleType) => {
    const shortest = cycleType[0];
    const cycleTypes = byShortest.get(shortest) || [];
    cycleTypes.push(cycleType);
    byShortest.set(shortest, cycleTypes);
  });

  return [...byShortest.entries()]
    .sort(([a], [b]) => a - b)
    .map(([shortestLoopSize, cycleTypes]) => ({
      shortestLoopSize,
      cycleTypes,
    }));
}

export function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > CYCLE_TYPE_EXPLORER_MAX_N) throw new RangeError('Exact numeric factorial budget is integer n <= 12.');
  let total = 1;

  for (let value = 2; value <= n; value += 1) {
    total *= value;
  }

  return total;
}

function getPartCounts(cycleType) {
  return cycleType.reduce((counts, part) => {
    counts.set(part, (counts.get(part) || 0) + 1);
    return counts;
  }, new Map());
}

export function countLoopGroupingsForCycleType(n, cycleType) {
  const denominator = [...getPartCounts(cycleType).entries()].reduce(
    (product, [part, count]) => product * (factorial(part) ** count) * factorial(count),
    1,
  );

  return factorial(n) / denominator;
}

export function countPermutationsForCycleType(n, cycleType) {
  const denominator = [...getPartCounts(cycleType).entries()].reduce(
    (product, [part, count]) => product * (part ** count) * factorial(count),
    1,
  );

  return factorial(n) / denominator;
}

export function countConfigurationsByShortestLoop(n, shortestLoopSize) {
  const size = Math.max(1, Math.floor(Number(n) || 1));
  const target = Math.max(1, Math.floor(Number(shortestLoopSize) || 1));
  const cycleTypes = getReachableCycleTypes(size).filter((cycleType) => cycleType[0] === target);
  const rows = cycleTypes.map((cycleType) => {
    const groupingCount = countLoopGroupingsForCycleType(size, cycleType);
    const permutationCount = countPermutationsForCycleType(size, cycleType);

    return {
      cycleType,
      groupingCount,
      permutationCount,
    };
  });

  return {
    n: size,
    shortestLoopSize: target,
    cycleTypes,
    rows,
    groupingCount: rows.reduce((sum, row) => sum + row.groupingCount, 0),
    permutationCount: rows.reduce((sum, row) => sum + row.permutationCount, 0),
  };
}

export function getGeneralNExplorerRows(maxN = CYCLE_TYPE_EXPLORER_MAX_N) {
  const limit = Math.max(3, Math.min(CYCLE_TYPE_EXPLORER_MAX_N, Math.floor(Number(maxN) || CYCLE_TYPE_EXPLORER_MAX_N)));

  return Array.from({ length: limit - 2 }, (_, index) => {
    const n = index + 3;
    const possibleShortest = getPossibleShortestLoopSizes(n);

    return {
      n,
      possibleShortestLoopSizes: possibleShortest.map((entry) => entry.shortestLoopSize),
      reachableCycleTypeCount: getReachableCycleTypes(n).length,
    };
  });
}

export function getAllThreeShiftMoves(n) {
  if (!Number.isInteger(n) || n < 1 || n > CYCLE_TYPE_EXPLORER_MAX_N) throw new RangeError('3-shift move generation requires integer n from 1 to 12.');
  const moves = [];

  for (let a = 1; a <= n - 2; a += 1) {
    for (let b = a + 1; b <= n - 1; b += 1) {
      for (let c = b + 1; c <= n; c += 1) {
        moves.push({ labels: [a, b, c], direction: ROTATION_DIRECTIONS.clockwise });
        moves.push({ labels: [a, b, c], direction: ROTATION_DIRECTIONS.counterclockwise });
      }
    }
  }

  return moves;
}

function keyForPermutation(permutation) {
  return permutation.join(',');
}

export function enumerateReachablePermutations(n, maxN = REACHABLE_ENUMERATION_MAX_N) {
  const size = Math.max(1, Math.floor(Number(n) || 1));

  if (size > Math.min(REACHABLE_ENUMERATION_MAX_N, maxN)) {
    return {
      available: false,
      n: size,
      maxN,
      reachableCount: 0,
      possibleShortestLoopSizes: [],
      states: [],
    };
  }

  const start = createIdentityPermutation(size);
  const moves = getAllThreeShiftMoves(size);
  const queue = [start];
  const seen = new Map([[keyForPermutation(start), start]]);

  for (let index = 0; index < queue.length; index += 1) {
    const state = queue[index];

    moves.forEach((move) => {
      const next = applyThreeShift(state, move.labels, move.direction);
      const key = keyForPermutation(next);

      if (!seen.has(key)) {
        seen.set(key, next);
        queue.push(next);
      }
    });
  }

  const shortestSizes = new Set();
  seen.forEach((state) => {
    shortestSizes.add(analyzeLoops(state).shortestLoopSize);
  });

  return {
    available: true,
    n: size,
    maxN,
    reachableCount: seen.size,
    possibleShortestLoopSizes: [...shortestSizes].sort((a, b) => a - b),
    states: [...seen.values()],
  };
}

export function getRandomThreeShift(permutation, random = Math.random) {
  const current = normalizePermutation(permutation);
  const labels = [...current];

  for (let index = labels.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [labels[index], labels[swapIndex]] = [labels[swapIndex], labels[index]];
  }

  return {
    labels: labels.slice(0, 3),
    direction:
      random() < 0.5 ? ROTATION_DIRECTIONS.clockwise : ROTATION_DIRECTIONS.counterclockwise,
  };
}

export function applyRandomShifts(permutation, count, random = Math.random) {
  let current = normalizePermutation(permutation);
  const history = [];
  const shiftCount = current.length < 3 ? 0 : Math.max(0, Math.min(100, Math.floor(Number(count) || 0)));

  for (let index = 0; index < shiftCount; index += 1) {
    const move = getRandomThreeShift(current, random);
    current = applyThreeShift(current, move.labels, move.direction);
    history.push({
      moveNumber: index + 1,
      ...move,
      permutation: current,
    });
  }

  return { permutation: current, history };
}

export function searchShortestLoopByRandomShifts({
  n,
  shiftCount = 12,
  trials = 120,
  random = Math.random,
}) {
  const size = Math.max(1, Math.floor(Number(n) || 1));
  const totalTrials = Math.max(1, Math.min(120, Math.floor(Number(trials) || 1)));
  let best = null;

  for (let trial = 1; trial <= totalTrials; trial += 1) {
    const result = applyRandomShifts(createIdentityPermutation(size), shiftCount, random);
    const analysis = analyzeLoops(result.permutation);

    if (!best || analysis.shortestLoopSize < best.analysis.shortestLoopSize) {
      best = {
        trial,
        permutation: result.permutation,
        history: result.history,
        analysis,
      };
    }
  }

  return best;
}
