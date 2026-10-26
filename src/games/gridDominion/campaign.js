import { getBrowserStorage, guardStorage } from '../../core/storage.js';
import { AI_DIFFICULTIES } from './ai.js';

export const CAMPAIGN_STORAGE_KEY = 'prism-grid-dominion-campaign-v1';

export const CAMPAIGN_LEVELS = [
  {
    id: 'empty-board',
    number: 1,
    rows: 1,
    cols: 1,
    title: 'A Game With No Edges',
    lesson: [
      'No lines can ever be formed.',
      'Therefore redEdges = blueEdges = 0.',
      'Player 2 always wins.',
    ],
    objective: 'Finish the board and observe the result.',
  },
  {
    id: 'first-symmetry',
    number: 2,
    rows: 1,
    cols: 2,
    title: 'The Simplest Connection',
    lesson: [
      'Only one possible edge exists.',
      'Small boards can often be analyzed completely.',
    ],
    objective: 'Play until completion.',
  },
  {
    id: 'center-cell',
    number: 3,
    rows: 1,
    cols: 3,
    title: 'Breaking Symmetry',
    lesson: [
      'Odd-length boards have a unique center.',
      'The center often becomes strategically important.',
    ],
    objective: 'Create a nonzero final difference.',
    objectiveType: 'nonzeroDifference',
  },
  {
    id: 'pairing-ideas',
    number: 4,
    rows: 2,
    cols: 2,
    title: 'Balanced Responses',
    lesson: ['Even-cell boards often support pairing strategies.'],
    objective: 'Try to finish with difference = 0.',
    objectiveType: 'zeroDifference',
  },
  {
    id: 'center-fight',
    number: 5,
    rows: 3,
    cols: 3,
    title: 'The First Real Battlefield',
    lesson: [
      'Unique center cell.',
      'More possible edges.',
      'Symmetry becomes harder to maintain.',
    ],
    objective: 'Win against the AI.',
    objectiveType: 'humanWins',
    mode: 'ai',
    humanPlayer: 1,
    aiDifficulty: AI_DIFFICULTIES.hard,
  },
];

export const DEFAULT_CAMPAIGN_PROGRESS = {
  unlockedLevel: 1,
  completedLevels: {},
  stars: {},
  totalMovesPlayed: 0,
  totalGamesFinished: 0,
};

export function isCampaignComplete(progress) {
  return CAMPAIGN_LEVELS.every((level) => progress.completedLevels[level.id]);
}

export function getCampaignStats(progress) {
  return {
    levelsCompleted: CAMPAIGN_LEVELS.filter((level) => progress.completedLevels[level.id]).length,
    totalMovesPlayed: progress.totalMovesPlayed,
    totalGamesFinished: progress.totalGamesFinished,
  };
}

export function loadCampaignProgress(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    const saved = JSON.parse(storage.getItem(CAMPAIGN_STORAGE_KEY));

    if (!saved || typeof saved !== 'object') {
      return DEFAULT_CAMPAIGN_PROGRESS;
    }

    return {
      ...DEFAULT_CAMPAIGN_PROGRESS,
      ...saved,
      completedLevels: {
        ...DEFAULT_CAMPAIGN_PROGRESS.completedLevels,
        ...saved.completedLevels,
      },
      stars: {
        ...DEFAULT_CAMPAIGN_PROGRESS.stars,
        ...saved.stars,
      },
    };
  } catch {
    return DEFAULT_CAMPAIGN_PROGRESS;
  }
}

export function saveCampaignProgress(progress, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress));
}

export function getObjectiveMet(level, score, winner, humanPlayer) {
  if (!winner) {
    return false;
  }

  if (level.objectiveType === 'nonzeroDifference') {
    return score.difference !== 0;
  }

  if (level.objectiveType === 'zeroDifference') {
    return score.difference === 0;
  }

  if (level.objectiveType === 'humanWins') {
    return winner === `Player ${humanPlayer}`;
  }

  return true;
}

export function getLevelStars(level, objectiveMet, winner, humanPlayer, aiDifficulty) {
  const stars = {
    bronze: true,
    silver: objectiveMet,
    gold: false,
  };

  if (level.objectiveType === 'humanWins') {
    stars.gold = winner === `Player ${humanPlayer}` && aiDifficulty === AI_DIFFICULTIES.hard;
  }

  return stars;
}
