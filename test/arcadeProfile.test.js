import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  countUnlockedGlobalAchievements,
  getArcadeProgressSnapshot,
  getGlobalAchievementStates,
} from '../src/achievements/achievements.js';
import {
  ARCADE_SAVE_KEYS,
  exportArcadeSave,
  importArcadeSave,
  resetArcadeProgress,
  serializeArcadeSave,
  validateArcadeSave,
} from '../src/core/saveManager.js';
import { CAMPAIGN_LEVELS, CAMPAIGN_STORAGE_KEY } from '../src/games/gridDominion/campaign.js';
import {
  BINARY_SHIFT_CHALLENGES,
  BINARY_SHIFT_CHALLENGE_STORAGE_KEY,
} from '../src/games/binaryShift/challenges.js';
import { BINARY_SHIFT_STATS_STORAGE_KEY } from '../src/games/binaryShift/stats.js';
import { LANGUAGE_CHALLENGES, LANGUAGE_CHALLENGE_STORAGE_KEY } from '../src/games/languageLabyrinth/challenges.js';
import { LANGUAGE_STATS_STORAGE_KEY } from '../src/games/languageLabyrinth/stats.js';
import {
  BLACKBOARD_CHALLENGES,
  BLACKBOARD_CHALLENGE_STORAGE_KEY,
} from '../src/games/blackboardMoves/challenges.js';
import { BLACKBOARD_STATS_STORAGE_KEY } from '../src/games/blackboardMoves/stats.js';
import {
  NUMBER_FORGE_CHALLENGES,
  NUMBER_FORGE_CHALLENGE_STORAGE_KEY,
} from '../src/games/numberForge/challenges.js';
import {
  TEMPORAL_CHALLENGES,
  TEMPORAL_CHALLENGE_STORAGE_KEY,
} from '../src/games/temporalGraphs/challenges.js';
import {
  LOOP_CHALLENGES,
  LOOP_STRINGS_CHALLENGE_STORAGE_KEY,
} from '../src/games/loopStrings/challenges.js';
import { LOOP_STRINGS_STATS_STORAGE_KEY } from '../src/games/loopStrings/stats.js';
import {
  PARITY_CHALLENGES,
  PARITY_CHALLENGE_STORAGE_KEY,
} from '../src/games/parityEngine/challenges.js';
import { PARITY_ENGINE_STATS_STORAGE_KEY } from '../src/games/parityEngine/stats.js';
import {
  ARCADE_PROFILE_STORAGE_KEY,
  loadArcadeProfile,
  recordPlaySession,
  recordPortalVisit,
  recordTheoremCardOpened,
  syncArcadeProfileSummary,
} from '../src/profile/profile.js';
import {
  games,
  getAchievementEligiblePortals,
  getPlayablePortals,
  getLobbyPlayableCount,
  getLobbyProgressPercent,
} from '../src/pages/lobbyData.js';

function createStorage() {
  const values = new Map();

  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

describe('Arcade profile and global achievements', () => {
  it('records sessions, unique portal visits, and theorem card openings', () => {
    const storage = createStorage();
    const now = new Date('2026-06-15T10:00:00.000Z');

    recordPlaySession(storage, now);
    recordPortalVisit('number-forge', storage);
    recordPortalVisit('number-forge', storage);
    recordPortalVisit('grid-dominion', storage);
    recordTheoremCardOpened(storage);

    const profile = loadArcadeProfile(storage);

    assert.equal(profile.totalPlaySessions, 1);
    assert.equal(profile.firstLaunchDate, now.toISOString());
    assert.equal(profile.lastLaunchDate, now.toISOString());
    assert.equal(profile.totalPortalsVisited, 2);
    assert.equal(profile.theoremCardsOpened, 1);
  });

  it('derives global achievement progress from portal saves', () => {
    const storage = createStorage();

    storage.setItem(
      ARCADE_PROFILE_STORAGE_KEY,
      JSON.stringify({
        visitedPortals: {
          'binary-shift': true,
          'parity-engine': true,
          'grid-dominion': true,
          'number-forge': true,
          'temporal-graphs': true,
          'blackboard-moves': true,
          'loop-strings': true,
        },
        theoremCardsOpened: 10,
      }),
    );
    storage.setItem(
      BINARY_SHIFT_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completed: Object.fromEntries(BINARY_SHIFT_CHALLENGES.map((level) => [level.id, true])),
        hintsUsed: { 'hidden-success': 2 },
        highestStars: Object.fromEntries(BINARY_SHIFT_CHALLENGES.map((level) => [level.id, 3])),
      }),
    );
    storage.setItem(
      BINARY_SHIFT_STATS_STORAGE_KEY,
      JSON.stringify({
        correctImpossibleDeclarations: 1,
      }),
    );
    storage.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        completedLevels: Object.fromEntries(CAMPAIGN_LEVELS.map((level) => [level.id, true])),
      }),
    );
    storage.setItem(
      NUMBER_FORGE_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completedLevels: Object.fromEntries(
          NUMBER_FORGE_CHALLENGES.map((level) => [level.id, true]),
        ),
      }),
    );
    storage.setItem(
      TEMPORAL_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completedLevels: Object.fromEntries(TEMPORAL_CHALLENGES.map((level) => [level.id, true])),
      }),
    );
    storage.setItem(
      BLACKBOARD_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completed: Object.fromEntries(BLACKBOARD_CHALLENGES.map((level) => [level.id, true])),
        highestStars: Object.fromEntries(BLACKBOARD_CHALLENGES.map((level) => [level.id, 3])),
      }),
    );
    storage.setItem(
      BLACKBOARD_STATS_STORAGE_KEY,
      JSON.stringify({
        totalMovesPlayed: 1,
        greedyBeatenCount: 1,
        labExperimentsRun: 1,
      }),
    );
    storage.setItem(
      LOOP_STRINGS_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completed: Object.fromEntries(LOOP_CHALLENGES.map((level) => [level.id, true])),
        highestStars: Object.fromEntries(LOOP_CHALLENGES.map((level) => [level.id, 3])),
      }),
    );
    storage.setItem(
      LOOP_STRINGS_STATS_STORAGE_KEY,
      JSON.stringify({
        totalShiftsMade: 1,
        sevenCycleCreated: true,
      }),
    );
    storage.setItem(
      PARITY_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completed: Object.fromEntries(PARITY_CHALLENGES.map((level) => [level.id, true])),
        highestStars: Object.fromEntries(PARITY_CHALLENGES.map((level) => [level.id, 3])),
      }),
    );
    storage.setItem(
      PARITY_ENGINE_STATS_STORAGE_KEY,
      JSON.stringify({
        challengeAttempts: 6,
        simulationsRun: 1,
      }),
    );

    const snapshot = getArcadeProgressSnapshot(storage);
    const achievements = getGlobalAchievementStates(storage);
    const achievementMap = Object.fromEntries(
      achievements.map((achievement) => [achievement.id, achievement]),
    );

    storage.setItem(LANGUAGE_CHALLENGE_STORAGE_KEY, JSON.stringify({ completed: Object.fromEntries(LANGUAGE_CHALLENGES.map((level) => [level.id, true])) }));
    recordPortalVisit('language-labyrinth', storage);
    const integrated = getArcadeProgressSnapshot(storage);
    const integratedAchievements = Object.fromEntries(getGlobalAchievementStates(storage).map((entry) => [entry.id, entry]));
    assert.equal(integrated.playablePortals, 8);
    assert.equal(integrated.totalChallengesCompleted, 49);
    assert.equal(integrated.portalChallengeCounts['language-labyrinth'], 7);
    assert.equal(integratedAchievements.explorer.progress.unlocked, true);
    assert.equal(integratedAchievements.mathematician.progress.unlocked, true);
    assert.equal(snapshot.totalChallengesCompleted, 42);
    assert.equal(snapshot.binaryShiftAchievementCount, 5);
    assert.equal(snapshot.blackboardAchievementCount, 5);
    assert.equal(snapshot.loopAchievementCount, 5);
    assert.equal(snapshot.parityAchievementCount, 5);
    assert.equal(achievementMap.explorer.progress.current, 7);
    assert.equal(achievementMap.explorer.progress.target, 8);
    assert.equal(achievementMap.mathematician.progress.current, 7);
    assert.equal(achievementMap.mathematician.progress.target, 8);
    assert.equal(achievementMap['puzzle-solver'].progress.current, 42);
    assert.equal(achievementMap['theorem-hunter'].progress.current, 10);
    assert.equal(achievementMap['master-of-three-worlds'].progress.current, 3);
    assert.equal(achievementMap['master-of-three-worlds'].progress.target, 3);
    assert.equal(countUnlockedGlobalAchievements(storage), 5);
    assert.deepEqual(
      achievements.map((achievement) => achievement.progress.unlocked),
      [false, false, true, true, true],
    );
  });

  it('keeps global achievements coherent with eight playable portals', () => {
    const storage = createStorage();

    storage.setItem(
      ARCADE_PROFILE_STORAGE_KEY,
      JSON.stringify({
        visitedPortals: {
          'grid-dominion': true,
          'number-forge': true,
          'temporal-graphs': true,
          'blackboard-moves': true,
          'loop-strings': true,
        },
      }),
    );
    storage.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        completedLevels: Object.fromEntries(CAMPAIGN_LEVELS.map((level) => [level.id, true])),
      }),
    );
    storage.setItem(
      NUMBER_FORGE_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completedLevels: Object.fromEntries(
          NUMBER_FORGE_CHALLENGES.map((level) => [level.id, true]),
        ),
      }),
    );
    storage.setItem(
      TEMPORAL_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completedLevels: Object.fromEntries(TEMPORAL_CHALLENGES.map((level) => [level.id, true])),
      }),
    );
    storage.setItem(
      PARITY_CHALLENGE_STORAGE_KEY,
      JSON.stringify({
        completed: { 'fair-coin-lock': true },
        highestStars: { 'fair-coin-lock': 3 },
      }),
    );

    const achievements = Object.fromEntries(
      getGlobalAchievementStates(storage).map((achievement) => [achievement.id, achievement]),
    );

    assert.equal(achievements.explorer.progress.target, 8);
    assert.equal(achievements.explorer.progress.unlocked, false);
    assert.equal(achievements.mathematician.progress.current, 4);
    assert.equal(achievements.mathematician.progress.target, 8);
    assert.equal(achievements.mathematician.progress.unlocked, false);
    assert.equal(achievements['master-of-three-worlds'].progress.target, 3);
    assert.equal(achievements['master-of-three-worlds'].progress.unlocked, true);
  });

  it('syncs profile summary totals without losing private counters', () => {
    const storage = createStorage();

    recordPortalVisit('number-forge', storage);
    recordTheoremCardOpened(storage);
    syncArcadeProfileSummary(
      {
        totalChallengesCompleted: 4,
        totalAchievementsEarned: 2,
      },
      storage,
    );

    const profile = loadArcadeProfile(storage);

    assert.equal(profile.totalPortalsVisited, 1);
    assert.equal(profile.totalChallengesCompleted, 4);
    assert.equal(profile.totalAchievementsEarned, 2);
    assert.equal(profile.theoremCardsOpened, 1);
  });
});

describe('Arcade save manager', () => {
  it('exports, imports, and resets all centralized progress keys', () => {
    const storage = createStorage();
    const nextStorage = createStorage();

    storage.setItem(ARCADE_PROFILE_STORAGE_KEY, JSON.stringify({ totalPlaySessions: 2 }));
    storage.setItem(BINARY_SHIFT_CHALLENGE_STORAGE_KEY, JSON.stringify({ completed: { 'first-special': true } }));
    storage.setItem(BINARY_SHIFT_STATS_STORAGE_KEY, JSON.stringify({ challengeAttempts: 1 }));
    storage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify({ unlockedLevel: 3 }));
    storage.setItem(BLACKBOARD_CHALLENGE_STORAGE_KEY, JSON.stringify({ completed: { 'tutorial-111': true } }));
    storage.setItem(BLACKBOARD_STATS_STORAGE_KEY, JSON.stringify({ challengeAttempts: 1 }));
    storage.setItem(LOOP_STRINGS_CHALLENGE_STORAGE_KEY, JSON.stringify({ completed: { 'first-twist': true } }));
    storage.setItem(LOOP_STRINGS_STATS_STORAGE_KEY, JSON.stringify({ challengeAttempts: 1 }));
    storage.setItem(PARITY_CHALLENGE_STORAGE_KEY, JSON.stringify({ completed: { 'fair-coin-lock': true } }));
    storage.setItem(PARITY_ENGINE_STATS_STORAGE_KEY, JSON.stringify({ challengeAttempts: 1 }));

    const exported = exportArcadeSave(storage);
    const serialized = serializeArcadeSave(storage);

    assert.equal(exported.version, 2);
    assert.equal(exported.data[ARCADE_PROFILE_STORAGE_KEY].totalPlaySessions, 2);
    assert.equal(exported.data[BINARY_SHIFT_CHALLENGE_STORAGE_KEY].completed['first-special'], true);
    assert.equal(exported.data[BINARY_SHIFT_STATS_STORAGE_KEY].challengeAttempts, 1);
    assert.equal(exported.data[BLACKBOARD_CHALLENGE_STORAGE_KEY].completed['tutorial-111'], true);
    assert.equal(exported.data[BLACKBOARD_STATS_STORAGE_KEY].challengeAttempts, 1);
    assert.equal(exported.data[LOOP_STRINGS_CHALLENGE_STORAGE_KEY].completed['first-twist'], true);
    assert.equal(exported.data[LOOP_STRINGS_STATS_STORAGE_KEY].challengeAttempts, 1);
    assert.equal(exported.data[PARITY_CHALLENGE_STORAGE_KEY].completed['fair-coin-lock'], true);
    assert.equal(exported.data[PARITY_ENGINE_STATS_STORAGE_KEY].challengeAttempts, 1);
    assert.equal(ARCADE_SAVE_KEYS.every((key) => Object.hasOwn(exported.data, key)), true);

    importArcadeSave(serialized, nextStorage);
    assert.equal(
      JSON.parse(nextStorage.getItem(ARCADE_PROFILE_STORAGE_KEY)).totalPlaySessions,
      2,
    );
    assert.equal(
      JSON.parse(nextStorage.getItem(BINARY_SHIFT_CHALLENGE_STORAGE_KEY)).completed['first-special'],
      true,
    );
    assert.equal(JSON.parse(nextStorage.getItem(CAMPAIGN_STORAGE_KEY)).unlockedLevel, 3);
    assert.equal(
      JSON.parse(nextStorage.getItem(BLACKBOARD_CHALLENGE_STORAGE_KEY)).completed['tutorial-111'],
      true,
    );
    assert.equal(
      JSON.parse(nextStorage.getItem(LOOP_STRINGS_CHALLENGE_STORAGE_KEY)).completed['first-twist'],
      true,
    );
    assert.equal(
      JSON.parse(nextStorage.getItem(PARITY_CHALLENGE_STORAGE_KEY)).completed['fair-coin-lock'],
      true,
    );

    resetArcadeProgress(nextStorage);
    assert.equal(nextStorage.getItem(ARCADE_PROFILE_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(BINARY_SHIFT_CHALLENGE_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(BINARY_SHIFT_STATS_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(CAMPAIGN_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(BLACKBOARD_CHALLENGE_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(BLACKBOARD_STATS_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(LOOP_STRINGS_CHALLENGE_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(LOOP_STRINGS_STATS_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(PARITY_CHALLENGE_STORAGE_KEY), null);
    assert.equal(nextStorage.getItem(PARITY_ENGINE_STATS_STORAGE_KEY), null);
  });

  it('rejects invalid save imports before applying changes', () => {
    const storage = createStorage();

    storage.setItem(ARCADE_PROFILE_STORAGE_KEY, JSON.stringify({ totalPlaySessions: 2 }));

    assert.throws(
      () => importArcadeSave('{not-json', storage),
      /not valid JSON/,
    );
    assert.throws(
      () => importArcadeSave(JSON.stringify({ version: 1 }), storage),
      /missing data field/,
    );
    assert.equal(
      JSON.parse(storage.getItem(ARCADE_PROFILE_STORAGE_KEY)).totalPlaySessions,
      2,
    );
  });

  it('imports missing keys and unknown keys safely', () => {
    const storage = createStorage();
    const save = {
      version: 1,
      exportedAt: '2026-06-15T00:00:00.000Z',
      data: {
        [ARCADE_PROFILE_STORAGE_KEY]: { totalPlaySessions: 4 },
        'unknown-prism-key': { should: 'ignore' },
      },
    };

    const parsed = importArcadeSave(save, storage);

    assert.equal(validateArcadeSave(save), parsed);
    assert.equal(
      JSON.parse(storage.getItem(ARCADE_PROFILE_STORAGE_KEY)).totalPlaySessions,
      4,
    );
    assert.equal(storage.getItem('unknown-prism-key'), null);
    assert.equal(storage.getItem(BLACKBOARD_CHALLENGE_STORAGE_KEY), null);
  });

  it('reset clears every known save key', () => {
    const storage = createStorage();

    ARCADE_SAVE_KEYS.forEach((key) => storage.setItem(key, JSON.stringify({ saved: true })));
    resetArcadeProgress(storage);

    assert.equal(ARCADE_SAVE_KEYS.every((key) => storage.getItem(key) === null), true);
  });

  it('reports eight started portals, eight playable portals, and 100 percent progress', () => {
    const playableCount = getLobbyPlayableCount(games);
    const progressPercent = getLobbyProgressPercent(games);
    const binaryShift = games.find((game) => game.problemNumber === 1);
    const languageLabyrinth = games.find((game) => game.problemNumber === 5);
    const parityEngine = games.find((game) => game.problemNumber === 2);
    const blackboard = games.find((game) => game.problemNumber === 8);
    const loopStrings = games.find((game) => game.problemNumber === 7);
    const startedCount = games.filter((game) => game.playable || game.experimental).length;

    assert.equal(startedCount, 8);
    assert.equal(playableCount, 8);
    assert.equal(progressPercent, 100);
    assert.equal(binaryShift.status, 'Playable / Experimental');
    assert.equal(binaryShift.category, 'Number Theory');
    assert.equal(binaryShift.route, 'binary-shift');
    assert.equal(binaryShift.playable, true);
    assert.equal(binaryShift.experimental, true);
    assert.deepEqual(binaryShift.localStorageKeys, [
      BINARY_SHIFT_CHALLENGE_STORAGE_KEY,
      BINARY_SHIFT_STATS_STORAGE_KEY,
    ]);
    assert.equal(parityEngine.status, 'Playable / Experimental');
    assert.equal(parityEngine.category, 'Probability & Random Processes');
    assert.equal(parityEngine.route, 'parity-engine');
    assert.equal(parityEngine.playable, true);
    assert.equal(parityEngine.experimental, true);
    assert.deepEqual(parityEngine.localStorageKeys, [
      PARITY_CHALLENGE_STORAGE_KEY,
      PARITY_ENGINE_STATS_STORAGE_KEY,
    ]);
    assert.equal(languageLabyrinth.status, 'Playable / Experimental');
    assert.equal(languageLabyrinth.category, 'Formal Languages');
    assert.equal(languageLabyrinth.route, 'language-labyrinth');
    assert.equal(languageLabyrinth.playable, true);
    assert.equal(languageLabyrinth.experimental, true);
    assert.notEqual(languageLabyrinth.achievementEligible, false);
    assert.deepEqual(languageLabyrinth.localStorageKeys, [LANGUAGE_CHALLENGE_STORAGE_KEY, LANGUAGE_STATS_STORAGE_KEY]);
    assert.equal(blackboard.status, 'Playable / Experimental');
    assert.equal(blackboard.category, 'Transformation Games');
    assert.equal(loopStrings.status, 'Playable / Experimental');
    assert.equal(loopStrings.category, 'Loop Structures');
    assert.equal(loopStrings.playable, true);
    assert.equal(loopStrings.experimental, true);
  });

  it('keeps playable portal metadata complete and centralized', () => {
    const requiredFields = [
      'id',
      'problemNumber',
      'title',
      'route',
      'category',
      'status',
      'description',
      'implementedFeatures',
      'localStorageKeys',
    ];

    getPlayablePortals(games).forEach((portal) => {
      requiredFields.forEach((field) => {
        assert.equal(Object.hasOwn(portal, field), true, `${portal.id} missing ${field}`);
      });
      assert.equal(Boolean(portal.route), true);
      assert.equal(portal.implementedFeatures.length > 0, true);
      assert.equal(portal.localStorageKeys.length > 0, true);
    });
  });

  it('includes Language Labyrinth in global achievement targets in RC1', () => {
    const achievementPortals = getAchievementEligiblePortals(games);

    assert.equal(achievementPortals.length, 8);
    assert.equal(
      achievementPortals.some((portal) => portal.id === 'language-labyrinth'),
      true,
    );
  });

  it('includes Loop Strings keys in centralized save keys', () => {
    assert.equal(ARCADE_SAVE_KEYS.includes(LOOP_STRINGS_CHALLENGE_STORAGE_KEY), true);
    assert.equal(ARCADE_SAVE_KEYS.includes(LOOP_STRINGS_STATS_STORAGE_KEY), true);
  });

  it('includes Binary Shift keys in centralized save keys', () => {
    assert.equal(ARCADE_SAVE_KEYS.includes(BINARY_SHIFT_CHALLENGE_STORAGE_KEY), true);
    assert.equal(ARCADE_SAVE_KEYS.includes(BINARY_SHIFT_STATS_STORAGE_KEY), true);
  });

  it('includes Parity Engine keys in centralized save keys', () => {
    assert.equal(ARCADE_SAVE_KEYS.includes(PARITY_CHALLENGE_STORAGE_KEY), true);
    assert.equal(ARCADE_SAVE_KEYS.includes(PARITY_ENGINE_STATS_STORAGE_KEY), true);
  });
});
