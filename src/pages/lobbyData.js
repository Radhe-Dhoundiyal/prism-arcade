import { BINARY_SHIFT_CHALLENGE_STORAGE_KEY } from '../games/binaryShift/challenges.js';
import { LANGUAGE_CHALLENGE_STORAGE_KEY } from '../games/languageLabyrinth/challenges.js';
import { LANGUAGE_STATS_STORAGE_KEY } from '../games/languageLabyrinth/stats.js';
import { BINARY_SHIFT_STATS_STORAGE_KEY } from '../games/binaryShift/stats.js';
import { BLACKBOARD_CHALLENGE_STORAGE_KEY } from '../games/blackboardMoves/challenges.js';
import { BLACKBOARD_STATS_STORAGE_KEY } from '../games/blackboardMoves/stats.js';
import { BLACKBOARD_CONJECTURE_STORAGE_KEY } from '../games/blackboardMoves/logic.js';
import { CAMPAIGN_STORAGE_KEY } from '../games/gridDominion/campaign.js';
import { GRID_DOMINION_STATS_KEY } from '../games/gridDominion/stats.js';
import { LOOP_STRINGS_CHALLENGE_STORAGE_KEY } from '../games/loopStrings/challenges.js';
import { LOOP_STRINGS_STATS_STORAGE_KEY } from '../games/loopStrings/stats.js';
import { NUMBER_FORGE_CHALLENGE_STORAGE_KEY } from '../games/numberForge/challenges.js';
import { NUMBER_FORGE_STATS_STORAGE_KEY } from '../games/numberForge/stats.js';
import { PARITY_CHALLENGE_STORAGE_KEY } from '../games/parityEngine/challenges.js';
import { PARITY_ENGINE_STATS_STORAGE_KEY } from '../games/parityEngine/stats.js';
import { TEMPORAL_CHALLENGE_STORAGE_KEY } from '../games/temporalGraphs/challenges.js';
import { TEMPORAL_STATS_STORAGE_KEY } from '../games/temporalGraphs/stats.js';

export const PORTAL_STATUS = {
  playable: 'Playable',
  playableExperimental: 'Playable / Experimental',
  experimental: 'Experimental',
  inDevelopment: 'In Development',
};

export const PORTALS = [
  {
    id: 'binary-shift',
    problemNumber: 1,
    title: 'Binary Shift',
    route: 'binary-shift',
    category: 'Number Theory',
    status: PORTAL_STATUS.playableExperimental,
    playable: true,
    experimental: true,
    description: 'Rotate binary digits and discover rare multiplication-shift numbers.',
    implementedFeatures: [
      'Explorer',
      'Special Number Challenge',
      'Challenge Map',
      'Stats and local achievements',
      'Divisibility Search',
      'Pattern Panel',
      'Bounds Tools',
    ],
    localStorageKeys: [BINARY_SHIFT_CHALLENGE_STORAGE_KEY, BINARY_SHIFT_STATS_STORAGE_KEY],
  },
  {
    id: 'parity-engine',
    problemNumber: 2,
    title: 'Parity Engine',
    route: 'parity-engine',
    category: 'Probability & Random Processes',
    status: PORTAL_STATUS.playableExperimental,
    playable: true,
    experimental: true,
    description: 'Design parity transitions and control a two-state Markov chain.',
    implementedFeatures: [
      'Markov Explorer',
      'Target Challenge',
      'Challenge Map',
      'Stats and local achievements',
      'Transition Matrix',
      'Simulation Comparator',
      'Step Visualizer',
    ],
    localStorageKeys: [PARITY_CHALLENGE_STORAGE_KEY, PARITY_ENGINE_STATS_STORAGE_KEY],
  },
  {
    id: 'number-forge',
    problemNumber: 3,
    title: 'Number Forge',
    route: 'number-forge',
    category: 'Number Theory',
    status: PORTAL_STATUS.playableExperimental,
    playable: true,
    experimental: true,
    description: 'Build numbers from generators and uncover hidden modular structure.',
    implementedFeatures: [
      'Explorer',
      'Target Challenge',
      'Reduction Engine',
      'Stats and local achievements',
    ],
    localStorageKeys: [NUMBER_FORGE_CHALLENGE_STORAGE_KEY, NUMBER_FORGE_STATS_STORAGE_KEY],
  },
  {
    id: 'grid-dominion',
    problemNumber: 4,
    title: 'Grid Dominion',
    route: 'grid-dominion',
    category: 'Strategy',
    status: PORTAL_STATUS.playable,
    playable: true,
    description: 'Build red and blue structures while fighting over mathematical balance.',
    implementedFeatures: [
      'Sandbox',
      'Local 2 Player',
      'Human vs AI',
      'Campaign',
      'Stats',
    ],
    localStorageKeys: [CAMPAIGN_STORAGE_KEY, GRID_DOMINION_STATS_KEY],
  },
  {
    id: 'language-labyrinth',
    problemNumber: 5,
    title: 'Language Labyrinth',
    route: 'language-labyrinth',
    category: 'Formal Languages',
    status: PORTAL_STATUS.playableExperimental,
    playable: true,
    experimental: true,
    description: 'Generate formal words, test conjectures, and hunt counterexamples.',
    implementedFeatures: [
      'Invariant Discovery Explorer',
      'Word Generation Engine',
      'Word Tree',
      'Invariant Scanner',
      'Conjecture Board',
      'Proof Hints',
      'Corrected Invariant Detective RC1',
      'Counterexample Gallery',
      'Stats and local achievements',
    ],
    localStorageKeys: [LANGUAGE_CHALLENGE_STORAGE_KEY, LANGUAGE_STATS_STORAGE_KEY],
  },
  {
    id: 'temporal-graphs',
    problemNumber: 6,
    title: 'Temporal Graphs',
    route: 'temporal-graphs',
    category: 'Graph Theory',
    status: PORTAL_STATUS.playableExperimental,
    playable: true,
    experimental: true,
    description: 'Trigger dormant winners by closing paths through time.',
    implementedFeatures: [
      'Explorer / Lab',
      'Trigger Challenge',
      'Challenge level map',
      'Stats',
    ],
    localStorageKeys: [TEMPORAL_CHALLENGE_STORAGE_KEY, TEMPORAL_STATS_STORAGE_KEY],
  },
  {
    id: 'loop-strings',
    problemNumber: 7,
    title: 'Loop Strings',
    route: 'loop-strings',
    category: 'Loop Structures',
    status: PORTAL_STATUS.playableExperimental,
    playable: true,
    experimental: true,
    description: 'Rotate string ends, create loops, and uncover permutation parity.',
    implementedFeatures: [
      'Explorer',
      'Cycle Type / Parity Analyzer',
      'Cycle Challenge',
      'Stats and local achievements',
    ],
    localStorageKeys: [LOOP_STRINGS_CHALLENGE_STORAGE_KEY, LOOP_STRINGS_STATS_STORAGE_KEY],
  },
  {
    id: 'blackboard-moves',
    problemNumber: 8,
    title: 'Blackboard Moves',
    route: 'blackboard-moves',
    category: 'Transformation Games',
    status: PORTAL_STATUS.playableExperimental,
    playable: true,
    experimental: true,
    description: 'Transform number states and learn why greedy strategy can fail.',
    implementedFeatures: [
      'Lab / Explorer',
      'Strategy Challenge',
      'Optimal path explainer',
      'Research mode',
      'Stats and local achievements',
    ],
    localStorageKeys: [BLACKBOARD_CHALLENGE_STORAGE_KEY, BLACKBOARD_STATS_STORAGE_KEY, BLACKBOARD_CONJECTURE_STORAGE_KEY],
  },
];

export const games = PORTALS;

export function getPlayablePortals(portals = PORTALS) {
  return portals.filter((portal) => portal.playable);
}

export function getAvailablePortals(portals = PORTALS) {
  return portals.filter((portal) => portal.route);
}

export function getAchievementEligiblePortals(portals = PORTALS) {
  return portals.filter((portal) => portal.route && portal.achievementEligible !== false);
}

export function getLobbyPlayableCount(portals = PORTALS) {
  return getPlayablePortals(portals).length;
}

export function getLobbyProgressPercent(portals = PORTALS) {
  return Number(((getLobbyPlayableCount(portals) / portals.length) * 100).toFixed(1));
}

export function getPortalStorageKeys(portals = PORTALS) {
  return portals.flatMap((portal) => portal.localStorageKeys);
}
