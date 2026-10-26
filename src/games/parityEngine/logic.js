export const PARITY_STATES = {
  even: 'Even',
  odd: 'Odd',
};

export const RANDOMIZER_PRESETS = {
  fairCoins: {
    id: 'fair-coins',
    title: 'Fair coins',
    pA: 0.5,
    pB: 0.5,
    description: 'a and b are each odd with probability 1/2.',
  },
  sevenSided: {
    id: 'seven-sided',
    title: '7-sided dice parity',
    pA: 4 / 7,
    pB: 4 / 7,
    description: 'A 7-sided die has 4 odd faces and 3 even faces.',
  },
  custom: {
    id: 'custom',
    title: 'Custom probabilities',
    pA: 0.5,
    pB: 0.5,
    description: 'Set p = P(a is odd) and q = P(b is odd).',
  },
};

export function clampProbability(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(1, number));
}

export function createTransitionMatrix({ pA, pB }) {
  const p = clampProbability(pA);
  const q = clampProbability(pB);
  const evenToEven = p * q;
  const oddToEven = (1 - p) * q;

  return [
    [evenToEven, 1 - evenToEven],
    [oddToEven, 1 - oddToEven],
  ];
}

export function stepDistribution(distribution, matrix) {
  const [even, odd] = distribution;

  return [
    even * matrix[0][0] + odd * matrix[1][0],
    even * matrix[0][1] + odd * matrix[1][1],
  ];
}

export function getDistributionAfterSteps({
  pA,
  pB,
  steps,
  initialDistribution = [1, 0],
}) {
  const matrix = createTransitionMatrix({ pA, pB });
  const totalSteps = Math.max(0, Math.min(1e9, Math.floor(Number(steps) || 0)));
  const a = matrix[0][0];
  const b = matrix[1][0];
  const lambda = a - b;
  // E_(n+1) = b + (a-b) E_n. Identity and period-two chains are
  // retained, not incorrectly replaced by a stationary limit.
  const stationaryEven = lambda === 1 ? initialDistribution[0] : b / (1 - lambda);
  const even = stationaryEven + (initialDistribution[0] - stationaryEven) * lambda ** totalSteps;
  return [even, 1 - even];
}

export function getChainBehavior({ pA, pB }) {
  const matrix = createTransitionMatrix({ pA, pB });
  const lambda = matrix[0][0] - matrix[1][0];
  if (lambda === 1) return 'Identity chain: every distribution is stationary; the initial distribution is preserved.';
  if (lambda === -1) return 'Period-two chain: a stationary distribution exists, but an even or odd start oscillates and does not converge.';
  return 'Finite-step probabilities converge to the unique stationary distribution; stationary does not mean equal at every finite step.';
}

export function getStationaryDistribution({ pA, pB }) {
  const matrix = createTransitionMatrix({ pA, pB });
  const evenToEven = matrix[0][0];
  const oddToEven = matrix[1][0];
  const denominator = 1 - evenToEven + oddToEven;

  if (Math.abs(denominator) < Number.EPSILON) {
    return null;
  }

  const even = oddToEven / denominator;

  return [even, 1 - even];
}

export function getRandomizerById(id) {
  return (
    Object.values(RANDOMIZER_PRESETS).find((preset) => preset.id === id) ||
    RANDOMIZER_PRESETS.fairCoins
  );
}

export function randomParity(probabilityOdd, rng = Math.random) {
  return rng() < clampProbability(probabilityOdd) ? PARITY_STATES.odd : PARITY_STATES.even;
}

export function getNextParity({ currentParity, aParity, bParity }) {
  const tParity = currentParity === aParity ? PARITY_STATES.even : PARITY_STATES.odd;

  if (tParity === PARITY_STATES.even) {
    return {
      tParity,
      nextParity: PARITY_STATES.odd,
    };
  }

  return {
    tParity,
    nextParity: bParity === PARITY_STATES.odd ? PARITY_STATES.even : PARITY_STATES.odd,
  };
}

export function runSingleTrajectory({
  pA,
  pB,
  steps,
  initialParity = PARITY_STATES.even,
  rng = Math.random,
}) {
  const totalSteps = Math.max(0, Math.min(10000, Math.floor(Number(steps) || 0)));
  const rows = [];
  let currentParity = initialParity;

  for (let index = 0; index < totalSteps; index += 1) {
    const aParity = randomParity(pA, rng);
    const bParity = randomParity(pB, rng);
    const { tParity, nextParity } = getNextParity({ currentParity, aParity, bParity });

    rows.push({
      step: index + 1,
      currentParity,
      aParity,
      tParity,
      bParity,
      nextParity,
    });
    currentParity = nextParity;
  }

  return rows;
}

export function runParitySimulation({
  pA,
  pB,
  n,
  trials,
  initialParity = PARITY_STATES.even,
  rng = Math.random,
}) {
  const steps = Math.max(0, Math.min(10000, Math.floor(Number(n) || 0)));
  const totalTrials = Math.max(1, Math.min(10000, Math.floor(5000000 / Math.max(1, steps)), Math.floor(Number(trials) || 1)));
  let evenCount = 0;

  for (let trial = 0; trial < totalTrials; trial += 1) {
    let finalParity = initialParity;
    for (let step = 0; step < steps; step += 1) {
      const aParity = randomParity(pA, rng);
      const bParity = randomParity(pB, rng);
      finalParity = getNextParity({ currentParity: finalParity, aParity, bParity }).nextParity;
    }

    if (finalParity === PARITY_STATES.even) {
      evenCount += 1;
    }
  }

  const simulatedEven = evenCount / totalTrials;
  const exactEven = getDistributionAfterSteps({ pA, pB, steps,
    initialDistribution: initialParity === PARITY_STATES.even ? [1, 0] : [0, 1] })[0];

  return {
    trials: totalTrials,
    n: steps,
    bounded: steps !== Number(n) || totalTrials !== Number(trials),
    evenCount,
    oddCount: totalTrials - evenCount,
    simulatedEven,
    simulatedOdd: 1 - simulatedEven,
    exactEven,
    exactOdd: 1 - exactEven,
    error: Math.abs(simulatedEven - exactEven),
  };
}

export function formatProbability(value, digits = 4) {
  return clampProbability(value).toFixed(digits);
}
