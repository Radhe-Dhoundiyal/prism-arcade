import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { analyzeCandidateTrigger } from './logic.js';
import { createLatticeLadder, UNIT_SQUARE } from './lattice.js';

export const TEMPORAL_CHALLENGE_STORAGE_KEY = 'prism-temporal-graphs-challenge-v1';

const TEMPORAL_CHALLENGE_DEFINITIONS = [
  { ...UNIT_SQUARE, id: 'first-loop', title: 'First Loop',
    lesson: 'Close a unit square to activate its earliest owner.', targetActivations: 1,
    edges: UNIT_SQUARE.edges.slice(0, 3),
    candidateTriggers: [{ id: 't1', source: 'D', target: 'A', day: 4, label: 'Close D-A' }] },
  ...[
    ['two-sleeping-loops', 'Two Ordered Loops', 2],
    ['shared-trigger', 'Shared Trigger Audit', 3],
    ['ladder-trigger', 'Ladder Trigger', 4],
    ['large-ladder', 'Large Ladder', 5],
  ].map(([id, title, rungs]) => ({
    ...createLatticeLadder(rungs), id, title, targetActivations: 1, ladderExplanation: true,
    lesson: 'Distinct join days matter: earlier rungs may already have won. Find the one newly activated owner.',
  })),
];

export const DEFAULT_TEMPORAL_CHALLENGE_PROGRESS = {
  unlockedLevel: 1,
  completedLevels: {},
  bestActivationCount: {},
};

export function getChallengeGraph(challenge) {
  return {
    id: challenge.id,
    name: challenge.title,
    description: challenge.lesson,
    nodes: challenge.nodes,
    edges: challenge.edges,
  };
}

export function getMaxActivationCount(challenge) {
  const graph = getChallengeGraph(challenge);

  return Math.max(
    0,
    ...challenge.candidateTriggers.map(
      (candidate) => analyzeCandidateTrigger(graph, candidate).activationCount,
    ),
  );
}

export function getChallengeStarRating(challenge, activationCount) {
  if (!Number.isInteger(activationCount) || activationCount < 0 || activationCount > 1) return 0;
  if (activationCount < challenge.targetActivations) {
    return 0;
  }

  const maxActivationCount = getMaxActivationCount(challenge);
  const silverThreshold = challenge.targetActivations + 1;

  if (activationCount >= maxActivationCount) {
    return 3;
  }

  if (silverThreshold <= maxActivationCount && activationCount >= silverThreshold) {
    return 2;
  }

  return 1;
}

export function getChallengeStatus(challenge, progress) {
  if (progress.completedLevels[challenge.id]) {
    return 'Completed';
  }

  if (challenge.number <= progress.unlockedLevel) {
    return 'Unlocked';
  }

  return 'Locked';
}

export function loadTemporalChallengeProgress(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    const saved = JSON.parse(storage.getItem(TEMPORAL_CHALLENGE_STORAGE_KEY));

    if (!saved || typeof saved !== 'object') {
      return DEFAULT_TEMPORAL_CHALLENGE_PROGRESS;
    }

    return {
      ...DEFAULT_TEMPORAL_CHALLENGE_PROGRESS,
      ...saved,
      completedLevels: {
        ...DEFAULT_TEMPORAL_CHALLENGE_PROGRESS.completedLevels,
        ...saved.completedLevels,
      },
      bestActivationCount: {
        ...DEFAULT_TEMPORAL_CHALLENGE_PROGRESS.bestActivationCount,
        ...saved.bestActivationCount,
      },
    };
  } catch {
    return DEFAULT_TEMPORAL_CHALLENGE_PROGRESS;
  }
}

export function saveTemporalChallengeProgress(progress, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(TEMPORAL_CHALLENGE_STORAGE_KEY, JSON.stringify(progress));
}

export function completeTemporalChallenge(progress, challenge, activationCount) {
  if (activationCount !== 1) return progress;
  return {
    ...progress,
    unlockedLevel: Math.max(
      progress.unlockedLevel,
      Math.min(challenge.number + 1, TEMPORAL_CHALLENGES.length),
    ),
    completedLevels: {
      ...progress.completedLevels,
      [challenge.id]: true,
    },
    bestActivationCount: {
      ...progress.bestActivationCount,
      [challenge.id]: Math.max(
        progress.bestActivationCount[challenge.id] || 0,
        activationCount,
      ),
    },
  };
}

export const TEMPORAL_CHALLENGES = TEMPORAL_CHALLENGE_DEFINITIONS.map((challenge, index) => ({
  ...challenge,
  number: index + 1,
}));
