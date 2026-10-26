import { getBrowserStorage, guardStorage } from '../../core/storage.js';
export const GRID_DOMINION_STATS_KEY = 'prism-grid-dominion-stats-v1';

export const DEFAULT_GRID_DOMINION_STATS = {
  gamesPlayed: 0,
  player1Wins: 0,
  player2Wins: 0,
  aiGamesPlayed: 0,
  campaignLevelsCompleted: 0,
};

export function loadGridDominionStats(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  try {
    const saved = JSON.parse(storage.getItem(GRID_DOMINION_STATS_KEY));

    if (!saved || typeof saved !== 'object') {
      return DEFAULT_GRID_DOMINION_STATS;
    }

    return {
      ...DEFAULT_GRID_DOMINION_STATS,
      ...saved,
    };
  } catch {
    return DEFAULT_GRID_DOMINION_STATS;
  }
}

export function saveGridDominionStats(stats, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(GRID_DOMINION_STATS_KEY, JSON.stringify(stats));
}

export function recordFinishedGame(stats, { winner, mode, completedCampaignLevel = false }) {
  return {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
    player1Wins: stats.player1Wins + (winner === 'Player 1' ? 1 : 0),
    player2Wins: stats.player2Wins + (winner === 'Player 2' ? 1 : 0),
    aiGamesPlayed: stats.aiGamesPlayed + (mode === 'ai' ? 1 : 0),
    campaignLevelsCompleted:
      stats.campaignLevelsCompleted + (completedCampaignLevel ? 1 : 0),
  };
}
