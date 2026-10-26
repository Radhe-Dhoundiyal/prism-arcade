import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_GRID_DOMINION_STATS,
  loadGridDominionStats,
  recordFinishedGame,
  saveGridDominionStats,
} from '../src/games/gridDominion/stats.js';

function createMemoryStorage(initialValue = null) {
  let value = initialValue;

  return {
    getItem() {
      return value;
    },
    setItem(_key, nextValue) {
      value = nextValue;
    },
  };
}

describe('Grid Dominion lifetime statistics', () => {
  it('records completed games, winners, AI games, and campaign levels', () => {
    const afterSandbox = recordFinishedGame(DEFAULT_GRID_DOMINION_STATS, {
      winner: 'Player 1',
      mode: 'local',
      completedCampaignLevel: false,
    });
    const afterCampaignAi = recordFinishedGame(afterSandbox, {
      winner: 'Player 2',
      mode: 'ai',
      completedCampaignLevel: true,
    });

    assert.deepEqual(afterCampaignAi, {
      gamesPlayed: 2,
      player1Wins: 1,
      player2Wins: 1,
      aiGamesPlayed: 1,
      campaignLevelsCompleted: 1,
    });
  });

  it('loads and saves from the dedicated localStorage key', () => {
    const storage = createMemoryStorage();
    const stats = {
      gamesPlayed: 4,
      player1Wins: 3,
      player2Wins: 1,
      aiGamesPlayed: 2,
      campaignLevelsCompleted: 5,
    };

    saveGridDominionStats(stats, storage);

    assert.deepEqual(loadGridDominionStats(storage), stats);
  });
});
