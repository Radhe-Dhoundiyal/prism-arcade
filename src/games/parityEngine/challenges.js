import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { filterKnownProgress } from '../../core/progress.js';
import {
  getDistributionAfterSteps,
  RANDOMIZER_PRESETS,
} from './logic.js';

export const PARITY_CHALLENGE_STORAGE_KEY = 'prism-parity-engine-challenge-v1';

export const PARITY_STARS = {
  none: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export const PARITY_ALLOWED_CONTROLS = {
  fairCoins: 'fair-coins',
  sevenSided: 'seven-sided',
  custom: 'custom',
};

export const PARITY_CHALLENGES = [
  {
    id: 'fair-coin-lock',
    title: 'Fair Coin Lock',
    n: 2026,
    targetEvenProbability: 1 / 4,
    tolerance: 0.0001,
    allowedControls: PARITY_ALLOWED_CONTROLS.fairCoins,
    lesson: 'Fair parity inputs collapse immediately to the stable one-quarter even probability.',
  },
  {
    id: 'seven-sided-balance',
    title: 'Seven-Sided Balance',
    n: 2026,
    targetEvenProbability: 4 / 15,
    tolerance: 0.001,
    allowedControls: PARITY_ALLOWED_CONTROLS.sevenSided,
    lesson: 'The 7-sided parity bias settles near the stationary even probability 4/15.',
  },
  {
    id: 'make-it-even-ish',
    title: 'Make It Even-ish',
    n: 20,
    targetEvenProbability: 0.5,
    tolerance: 0.02,
    allowedControls: PARITY_ALLOWED_CONTROLS.custom,
    lesson: 'Tune pA and pB until the final parity is nearly balanced.',
  },
  {
    id: 'make-it-rare',
    title: 'Make It Rare',
    n: 20,
    targetEvenProbability: 0.1,
    tolerance: 0.02,
    allowedControls: PARITY_ALLOWED_CONTROLS.custom,
    lesson: 'Make even outcomes rare by reducing the routes that land in the even state.',
  },
  {
    id: 'stationary-match',
    title: 'Stationary Match',
    n: 100,
    targetEvenProbability: 1 / 3,
    tolerance: 0.02,
    allowedControls: PARITY_ALLOWED_CONTROLS.custom,
    lesson: 'At larger n, the chain mostly reflects the stationary distribution.',
  },
  {
    id: 'design-your-chain',
    title: 'Design Your Chain',
    n: 50,
    targetEvenProbability: 0.4,
    tolerance: 0.02,
    allowedControls: PARITY_ALLOWED_CONTROLS.custom,
    lesson: 'Design a two-state Markov chain with the even probability you want.',
  },
];

export function getChallengePreset(challenge) {
  if (challenge.allowedControls === PARITY_ALLOWED_CONTROLS.sevenSided) {
    return RANDOMIZER_PRESETS.sevenSided;
  }

  return RANDOMIZER_PRESETS.fairCoins;
}

export function getChallengeDefaultControls(challenge) {
  if (challenge.allowedControls === PARITY_ALLOWED_CONTROLS.custom) {
    return {
      randomizerId: RANDOMIZER_PRESETS.custom.id,
      pA: 0.5,
      pB: 0.5,
    };
  }

  const preset = getChallengePreset(challenge);

  return {
    randomizerId: preset.id,
    pA: preset.pA,
    pB: preset.pB,
  };
}

export function evaluateParityChallenge(challenge, controls) {
  const exactEven = getDistributionAfterSteps({
    pA: controls.pA,
    pB: controls.pB,
    steps: challenge.n,
  })[0];
  const error = Math.abs(exactEven - challenge.targetEvenProbability);

  return {
    exactEven,
    error,
    success: error <= challenge.tolerance,
  };
}

export function getParityChallengeHint(challenge, evaluation) {
  if (challenge.allowedControls === PARITY_ALLOWED_CONTROLS.fairCoins) {
    return 'With fair coins, both rows of the transition matrix send probability 1/4 to Even after the first step.';
  }

  if (challenge.allowedControls === PARITY_ALLOWED_CONTROLS.sevenSided) {
    return 'For a 7-sided die, p = q = 4/7, and the stationary even probability is 4/15.';
  }

  if (!evaluation) {
    return 'For custom chains, adjust pB first: both next-even formulas are proportional to pB.';
  }

  if (evaluation.exactEven < challenge.targetEvenProbability) {
    return 'Your even probability is low. Try increasing pB first, since both E to E and O to E are proportional to pB.';
  }

  return 'Your even probability is high. Try reducing pB first, then fine-tune pA to change the balance between current states.';
}

export function getDefaultParityProgress() {
  return {
    completed: {},
    bestError: {},
    hintsUsed: {},
    highestStars: {},
  };
}

export function normalizeParityProgress(progress = {}) {
  progress = filterKnownProgress(progress, PARITY_CHALLENGES);
  return {
    completed: progress.completed && typeof progress.completed === 'object' ? progress.completed : {},
    bestError: progress.bestError && typeof progress.bestError === 'object' ? progress.bestError : {},
    hintsUsed: progress.hintsUsed && typeof progress.hintsUsed === 'object' ? progress.hintsUsed : {},
    highestStars:
      progress.highestStars && typeof progress.highestStars === 'object'
        ? progress.highestStars
        : {},
  };
}

export function loadParityChallengeProgress(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    const raw = storage.getItem(PARITY_CHALLENGE_STORAGE_KEY);

    return raw ? normalizeParityProgress(JSON.parse(raw)) : getDefaultParityProgress();
  } catch {
    return getDefaultParityProgress();
  }
}

export function saveParityChallengeProgress(progress, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(PARITY_CHALLENGE_STORAGE_KEY, JSON.stringify(normalizeParityProgress(progress)));
}

export function recordParityChallengeAttempt(progress, challengeId, evaluation) {
  const next = normalizeParityProgress(progress);
  const previousBest = next.bestError[challengeId];
  const stars = Number(evaluation.stars) || PARITY_STARS.none;

  return {
    ...next,
    completed: {
      ...next.completed,
      [challengeId]: Boolean(next.completed[challengeId] || evaluation.success),
    },
    bestError: {
      ...next.bestError,
      [challengeId]:
        typeof previousBest === 'number'
          ? Math.min(previousBest, evaluation.error)
          : evaluation.error,
    },
    highestStars: {
      ...next.highestStars,
      [challengeId]: Math.max(next.highestStars[challengeId] || PARITY_STARS.none, stars),
    },
  };
}

export function recordParityChallengeHint(progress, challengeId) {
  const next = normalizeParityProgress(progress);

  return {
    ...next,
    hintsUsed: {
      ...next.hintsUsed,
      [challengeId]: (next.hintsUsed[challengeId] || 0) + 1,
    },
  };
}

export function calculateParityChallengeStars(challenge, evaluation, hintsUsed = 0) {
  if (!evaluation.success) {
    return PARITY_STARS.none;
  }

  const goldThreshold = challenge.tolerance * 0.25;

  if (evaluation.error <= goldThreshold) {
    return PARITY_STARS.gold;
  }

  if ((Number(hintsUsed) || 0) === 0) {
    return PARITY_STARS.silver;
  }

  return PARITY_STARS.bronze;
}

export function isParityChallengeUnlocked(challengeId, progress) {
  const normalized = normalizeParityProgress(progress);
  const index = PARITY_CHALLENGES.findIndex((challenge) => challenge.id === challengeId);

  if (index <= 0) {
    return index === 0;
  }

  return Boolean(normalized.completed[PARITY_CHALLENGES[index - 1].id]);
}

export function getParityChallengeStatus(challengeId, progress) {
  const normalized = normalizeParityProgress(progress);

  if (normalized.completed[challengeId]) {
    return 'Completed';
  }

  return isParityChallengeUnlocked(challengeId, normalized) ? 'Unlocked' : 'Locked';
}

export function getParityChallengeExplanationCards(challenge) {
  const cards = [
    {
      title: 'Only parity matters.',
      body: 'The recurrence only needs to remember whether the current value is even or odd.',
    },
    {
      title: 'The process becomes a two-state Markov chain.',
      body: 'Once the current parity is known, the next parity is determined by the odd probabilities of a and b.',
    },
    {
      title: 'Long-term behavior is determined by the transition matrix.',
      body: 'Repeated steps multiply the Even/Odd distribution by the same transition matrix.',
    },
    {
      title: 'Stationary distributions describe equilibrium probabilities.',
      body: 'When the chain settles, the distribution is unchanged by one more transition.',
    },
  ];

  if (challenge.id === 'fair-coin-lock') {
    cards.push({
      title: 'Fair Coin Lock',
      body: 'With p = q = 1/2, both current states send probability pq = (1-p)q = 1/4 to Even, so P(s_n even) = 1/4 after the first step.',
    });
  }

  if (challenge.id === 'seven-sided-balance') {
    cards.push({
      title: 'Seven-Sided Balance',
      body: 'For a 7-sided die, p = q = 4/7. Solving the stationary equation gives Even probability 4/15.',
    });
  }

  return cards;
}
