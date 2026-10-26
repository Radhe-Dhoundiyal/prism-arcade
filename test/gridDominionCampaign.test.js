import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_DIFFICULTIES } from '../src/games/gridDominion/ai.js';
import {
  CAMPAIGN_LEVELS,
  DEFAULT_CAMPAIGN_PROGRESS,
  getCampaignStats,
  getLevelStars,
  getObjectiveMet,
  isCampaignComplete,
  loadCampaignProgress,
  saveCampaignProgress,
} from '../src/games/gridDominion/campaign.js';

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

describe('Grid Dominion campaign definitions', () => {
  it('defines five ordered discovery levels with fixed boards', () => {
    assert.deepEqual(
      CAMPAIGN_LEVELS.map((level) => [level.number, level.rows, level.cols]),
      [
        [1, 1, 1],
        [2, 1, 2],
        [3, 1, 3],
        [4, 2, 2],
        [5, 3, 3],
      ],
    );
    assert.equal(CAMPAIGN_LEVELS[4].mode, 'ai');
    assert.equal(CAMPAIGN_LEVELS[4].aiDifficulty, AI_DIFFICULTIES.hard);
  });

  it('evaluates level objectives without changing Grid Dominion winner rules', () => {
    assert.equal(
      getObjectiveMet(CAMPAIGN_LEVELS[2], { difference: 1 }, 'Player 1', 1),
      true,
    );
    assert.equal(
      getObjectiveMet(CAMPAIGN_LEVELS[3], { difference: 0 }, 'Player 2', 1),
      true,
    );
    assert.equal(
      getObjectiveMet(CAMPAIGN_LEVELS[4], { difference: 1 }, 'Player 1', 1),
      true,
    );
    assert.equal(
      getObjectiveMet(CAMPAIGN_LEVELS[4], { difference: 0 }, 'Player 2', 1),
      false,
    );
  });

  it('loads, saves, and summarizes campaign progress', () => {
    const storage = createMemoryStorage();
    const progress = {
      ...DEFAULT_CAMPAIGN_PROGRESS,
      unlockedLevel: 3,
      completedLevels: {
        [CAMPAIGN_LEVELS[0].id]: true,
        [CAMPAIGN_LEVELS[1].id]: true,
      },
      totalMovesPlayed: 3,
      totalGamesFinished: 2,
    };

    saveCampaignProgress(progress, storage);

    assert.deepEqual(loadCampaignProgress(storage), progress);
    assert.deepEqual(getCampaignStats(progress), {
      levelsCompleted: 2,
      totalMovesPlayed: 3,
      totalGamesFinished: 2,
    });
    assert.equal(isCampaignComplete(progress), false);
  });

  it('awards bronze for completion and gold for defeating Hard AI', () => {
    assert.deepEqual(
      getLevelStars(CAMPAIGN_LEVELS[4], true, 'Player 1', 1, AI_DIFFICULTIES.hard),
      {
        bronze: true,
        silver: true,
        gold: true,
      },
    );
  });
});
