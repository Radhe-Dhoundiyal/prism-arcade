import { CAMPAIGN_LEVELS, isCampaignComplete, loadCampaignProgress } from '../games/gridDominion/campaign.js';
import {
  BINARY_SHIFT_CHALLENGES,
  loadBinaryShiftProgress,
} from '../games/binaryShift/challenges.js';
import {
  getUnlockedBinaryShiftAchievements,
  loadBinaryShiftStats,
} from '../games/binaryShift/stats.js';
import {
  BLACKBOARD_CHALLENGES,
  loadBlackboardChallengeProgress,
} from '../games/blackboardMoves/challenges.js';
import {
  getUnlockedBlackboardAchievements,
  loadBlackboardStats,
} from '../games/blackboardMoves/stats.js';
import {
  loadNumberForgeProgress,
  NUMBER_FORGE_CHALLENGES,
} from '../games/numberForge/challenges.js';
import {
  loadTemporalChallengeProgress,
  TEMPORAL_CHALLENGES,
} from '../games/temporalGraphs/challenges.js';
import {
  loadLoopChallengeProgress,
  LOOP_CHALLENGES,
} from '../games/loopStrings/challenges.js';
import {
  getUnlockedLoopAchievements,
  loadLoopStats,
} from '../games/loopStrings/stats.js';
import {
  loadParityChallengeProgress,
  PARITY_CHALLENGES,
} from '../games/parityEngine/challenges.js';
import {
  getUnlockedParityAchievements,
  loadParityStats,
} from '../games/parityEngine/stats.js';
import { getAchievementEligiblePortals, getPlayablePortals } from '../pages/lobbyData.js';
import { loadArcadeProfile } from '../profile/profile.js';
import { LANGUAGE_CHALLENGES, loadLanguageProgress } from '../games/languageLabyrinth/challenges.js';
import { getUnlockedLanguageAchievements, loadLanguageStats } from '../games/languageLabyrinth/stats.js';

export const PLAYABLE_PORTALS = getPlayablePortals();

export const AVAILABLE_PORTALS = getAchievementEligiblePortals();

export const GLOBAL_ACHIEVEMENTS = [
  {
    id: 'explorer',
    title: 'Explorer',
    description: 'Visit all available portals.',
  },
  {
    id: 'mathematician',
    title: 'Mathematician',
    description: 'Complete one challenge in every playable portal.',
  },
  {
    id: 'puzzle-solver',
    title: 'Puzzle Solver',
    description: 'Complete 10 total challenges.',
  },
  {
    id: 'theorem-hunter',
    title: 'Theorem Hunter',
    description: 'Open 10 theorem or insight cards.',
  },
  {
    id: 'master-of-three-worlds',
    title: 'Master of Three Worlds',
    description: 'Complete Grid Dominion, Temporal Graphs, and Number Forge challenge sets.',
  },
];

function countCompleted(completedLevels = {}, levels) {
  return levels.filter((level) => completedLevels[level.id] === true).length;
}

export function getArcadeProgressSnapshot(storage = window.localStorage) {
  const profile = loadArcadeProfile(storage);
  const languageProgress = loadLanguageProgress(storage);
  const languageCompleted = countCompleted(languageProgress.completed, LANGUAGE_CHALLENGES);
  const languageAchievementCount = getUnlockedLanguageAchievements(languageProgress, loadLanguageStats(storage)).length;
  const binaryProgress = loadBinaryShiftProgress(storage);
  const binaryStats = loadBinaryShiftStats(storage);
  const gridProgress = loadCampaignProgress(storage);
  const numberProgress = loadNumberForgeProgress(storage);
  const temporalProgress = loadTemporalChallengeProgress(storage);
  const blackboardProgress = loadBlackboardChallengeProgress(storage);
  const blackboardStats = loadBlackboardStats(storage);
  const loopProgress = loadLoopChallengeProgress(storage);
  const loopStats = loadLoopStats(storage);
  const parityProgress = loadParityChallengeProgress(storage);
  const parityStats = loadParityStats(storage);

  const binaryCompleted = countCompleted(binaryProgress.completed, BINARY_SHIFT_CHALLENGES);
  const gridCompleted = countCompleted(gridProgress.completedLevels, CAMPAIGN_LEVELS);
  const numberCompleted = countCompleted(numberProgress.completedLevels, NUMBER_FORGE_CHALLENGES);
  const temporalCompleted = countCompleted(temporalProgress.completedLevels, TEMPORAL_CHALLENGES);
  const blackboardCompleted = countCompleted(blackboardProgress.completed, BLACKBOARD_CHALLENGES);
  const loopCompleted = countCompleted(loopProgress.completed, LOOP_CHALLENGES);
  const parityCompleted = countCompleted(parityProgress.completed, PARITY_CHALLENGES);
  const binaryShiftAchievementCount = getUnlockedBinaryShiftAchievements(
    binaryProgress,
    binaryStats,
  ).length;
  const blackboardAchievementCount = getUnlockedBlackboardAchievements(
    blackboardProgress,
    blackboardStats,
  ).length;
  const loopAchievementCount = getUnlockedLoopAchievements(loopProgress, loopStats).length;
  const parityAchievementCount = getUnlockedParityAchievements(
    parityProgress,
    parityStats,
    PARITY_CHALLENGES,
  ).length;
  const portalChallengeCounts = {
    'language-labyrinth': languageCompleted,
    'binary-shift': binaryCompleted,
    'grid-dominion': gridCompleted,
    'number-forge': numberCompleted,
    'temporal-graphs': temporalCompleted,
    'blackboard-moves': blackboardCompleted,
    'loop-strings': loopCompleted,
    'parity-engine': parityCompleted,
  };
  const completedChallengePortals = Object.values(portalChallengeCounts).filter(
    (count) => count > 0,
  ).length;
  const totalChallengesCompleted =
    languageCompleted +
    binaryCompleted +
    gridCompleted +
    numberCompleted +
    temporalCompleted +
    blackboardCompleted +
    loopCompleted +
    parityCompleted;
  const totalPortalsVisited = AVAILABLE_PORTALS.filter((portal) => profile.visitedPortals?.[portal.id] === true).length;

  return {
    profile,
    totalPortalsVisited,
    playablePortals: PLAYABLE_PORTALS.length,
    totalChallengesCompleted,
    theoremCardsOpened: profile.theoremCardsOpened || 0,
    portalChallengeCounts,
    completedChallengePortals,
    binaryShiftAchievementCount,
    blackboardAchievementCount,
    loopAchievementCount,
    parityAchievementCount,
    languageAchievementCount,
    gridCampaignComplete: isCampaignComplete(gridProgress),
    temporalChallengeSetComplete: temporalCompleted === TEMPORAL_CHALLENGES.length,
    numberForgeChallengeSetComplete: numberCompleted === NUMBER_FORGE_CHALLENGES.length,
    blackboardChallengeSetComplete: blackboardCompleted === BLACKBOARD_CHALLENGES.length,
    loopChallengeSetComplete: loopCompleted === LOOP_CHALLENGES.length,
    challengeSetSizes: {
      'language-labyrinth': LANGUAGE_CHALLENGES.length,
      'binary-shift': BINARY_SHIFT_CHALLENGES.length,
      'grid-dominion': CAMPAIGN_LEVELS.length,
      'number-forge': NUMBER_FORGE_CHALLENGES.length,
      'temporal-graphs': TEMPORAL_CHALLENGES.length,
      'blackboard-moves': BLACKBOARD_CHALLENGES.length,
      'loop-strings': LOOP_CHALLENGES.length,
      'parity-engine': PARITY_CHALLENGES.length,
    },
  };
}

export function getAchievementProgress(achievement, snapshot) {
  if (achievement.id === 'explorer') {
    return {
      current: snapshot.totalPortalsVisited,
      target: AVAILABLE_PORTALS.length,
      unlocked: snapshot.totalPortalsVisited >= AVAILABLE_PORTALS.length,
    };
  }

  if (achievement.id === 'mathematician') {
    return {
      current: snapshot.completedChallengePortals,
      target: PLAYABLE_PORTALS.length,
      unlocked: snapshot.completedChallengePortals >= PLAYABLE_PORTALS.length,
    };
  }

  if (achievement.id === 'puzzle-solver') {
    return {
      current: snapshot.totalChallengesCompleted,
      target: 10,
      unlocked: snapshot.totalChallengesCompleted >= 10,
    };
  }

  if (achievement.id === 'theorem-hunter') {
    return {
      current: snapshot.theoremCardsOpened,
      target: 10,
      unlocked: snapshot.theoremCardsOpened >= 10,
    };
  }

  if (achievement.id === 'master-of-three-worlds') {
    const current = [
      snapshot.gridCampaignComplete,
      snapshot.temporalChallengeSetComplete,
      snapshot.numberForgeChallengeSetComplete,
    ].filter(Boolean).length;

    return {
      current,
      target: 3,
      unlocked: current === 3,
    };
  }

  return { current: 0, target: 1, unlocked: false };
}

export function getGlobalAchievementStates(storage = window.localStorage) {
  const snapshot = getArcadeProgressSnapshot(storage);

  return GLOBAL_ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    progress: getAchievementProgress(achievement, snapshot),
  }));
}

export function countUnlockedGlobalAchievements(storage = window.localStorage) {
  return getGlobalAchievementStates(storage).filter((achievement) => achievement.progress.unlocked)
    .length;
}
