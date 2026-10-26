import assert from 'node:assert/strict';
import { it } from 'node:test';
import { ARCADE_SAVE_KEYS, exportArcadeSave, importArcadeSave, resetArcadeProgress, validateArcadeSave } from '../src/core/saveManager.js';
import { getSaveSchemas, validateSaveRecord } from '../src/core/saveSchema.js';
import { guardStorage, getStorageWarnings, clearStorageWarnings } from '../src/core/storage.js';
import { getArcadeProgressSnapshot } from '../src/achievements/achievements.js';
import { ARCADE_PROFILE_STORAGE_KEY, loadArcadeProfile, recordPlaySession } from '../src/profile/profile.js';
import { BINARY_SHIFT_CHALLENGE_STORAGE_KEY } from '../src/games/binaryShift/challenges.js';
import { loadNumberForgeProgress, NUMBER_FORGE_CHALLENGE_STORAGE_KEY } from '../src/games/numberForge/challenges.js';

function memoryStorage() {
  const values = new Map();
  return { values, getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}
const envelope = (data, version = 2) => ({ version, data });

it('save schemas cover every managed key and accept real partial v1/v2 progress', () => {
  assert.deepEqual(Object.keys(getSaveSchemas()).sort(), [...ARCADE_SAVE_KEYS].sort());
  for (const [key, defaults] of Object.entries(getSaveSchemas())) {
    assert.equal(validateSaveRecord(key, defaults), true);
    assert.equal(validateSaveRecord(key, {}), true);
    assert.equal(validateSaveRecord(key, null), true);
  }
  const storage = memoryStorage();
  const progress = { completedLevels: { 'build-39': true }, bestMoves: { 'build-39': 2 }, hintsUsed: { 'build-39': true }, highestStars: { 'build-39': 1 } };
  importArcadeSave(envelope({ [NUMBER_FORGE_CHALLENGE_STORAGE_KEY]: progress }, 1), storage);
  assert.deepEqual(loadNumberForgeProgress(storage), progress);
  assert.equal(exportArcadeSave(storage).version, 2);
});

it('rejects unsupported versions, malformed types/counters and unsafe maps before any write', () => {
  const storage = memoryStorage(); storage.setItem(ARCADE_PROFILE_STORAGE_KEY, '{"totalPlaySessions":4}');
  const before = [...storage.values];
  for (const version of [0, 3, 999, '1', null, false]) assert.throws(() => importArcadeSave(envelope({}, version), storage), /version/);
  for (const value of [-1, 1.25, '4', true, null, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => importArcadeSave(envelope({ [ARCADE_PROFILE_STORAGE_KEY]: { totalPlaySessions: value } }), storage), /Invalid/);
  }
  for (const value of [[], 4, 'hello', { visitedPortals: [] }, { visitedPortals: { fake: 1 } }, { theoremCardsOpened: -2 }, { unknownField: 1 }]) {
    assert.throws(() => importArcadeSave(envelope({ [ARCADE_PROFILE_STORAGE_KEY]: value }), storage), /Invalid/);
  }
  assert.throws(() => validateArcadeSave('x'.repeat(2 * 1024 * 1024 + 1)), /budget/);
  assert.deepEqual([...storage.values], before);
});

it('preserves omitted/unknown keys and ignores unknown portal/challenge IDs for achievements', () => {
  const storage = memoryStorage(); storage.setItem('unrelated', 'untouched'); storage.setItem(ARCADE_PROFILE_STORAGE_KEY, '{"totalPlaySessions":4}');
  importArcadeSave(envelope({ unknown: { secret: 'not applied' } }), storage);
  assert.equal(storage.getItem('unknown'), null); assert.equal(loadArcadeProfile(storage).totalPlaySessions, 4);
  const fake = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`fake-${i}`, true]));
  importArcadeSave(envelope({ [ARCADE_PROFILE_STORAGE_KEY]: { visitedPortals: fake }, [BINARY_SHIFT_CHALLENGE_STORAGE_KEY]: { completed: fake } }), storage);
  const snapshot = getArcadeProgressSnapshot(storage);
  assert.equal(snapshot.totalPortalsVisited, 0); assert.equal(snapshot.totalChallengesCompleted, 0);
  resetArcadeProgress(storage); assert.equal(storage.getItem('unrelated'), 'untouched');
});

it('rolls import back after a one-shot write failure, preserving exact original bytes', () => {
  const storage = memoryStorage();
  const keys = ARCADE_SAVE_KEYS.slice(0, 3);
  keys.forEach((key) => storage.setItem(key, ' { } '));
  const before = [...storage.values]; let count = 0;
  const failing = { ...storage, setItem(key, value) { count += 1; if (count === 2) throw new Error('quota'); storage.setItem(key, value); } };
  assert.throws(() => importArcadeSave(envelope(Object.fromEntries(keys.map((key) => [key, {}]))), failing), /restored/);
  assert.deepEqual([...storage.values], before);
});

it('reports incomplete rollback honestly and returns raw recovery bytes on permanent storage failure', () => {
  const storage = memoryStorage(); const [first, second] = ARCADE_SAVE_KEYS;
  storage.setItem(first, ' { } '); storage.setItem(second, '{}'); let writes = 0; let caught;
  const failing = { ...storage, setItem(key, value) { writes += 1; if (writes >= 2) throw new Error('unavailable'); storage.setItem(key, value); } };
  try { importArcadeSave(envelope({ [first]: {}, [second]: {} }), failing); } catch (error) { caught = error; }
  assert.match(caught.message, /rollback was incomplete/); assert.ok(caught.rollbackFailures.includes(first));
  assert.equal(JSON.parse(caught.recoveryText).dataRaw[first], ' { } ');
});

it('rolls reset back after a remove failure and aborts before mutation if backup reads fail', () => {
  const storage = memoryStorage(); ARCADE_SAVE_KEYS.forEach((key) => storage.setItem(key, '{}'));
  const before = [...storage.values]; let removals = 0;
  const failing = { ...storage, removeItem(key) { removals += 1; if (removals === 3) throw new Error('blocked'); storage.removeItem(key); } };
  assert.throws(() => resetArcadeProgress(failing), /restored/);
  for (const [key, value] of before) assert.equal(storage.getItem(key), value);
  let writes = 0;
  const readFailure = { getItem() { throw new Error('read unavailable'); }, setItem() { writes += 1; }, removeItem() { writes += 1; } };
  assert.throws(() => resetArcadeProgress(readFailure), /read unavailable/); assert.equal(writes, 0);
});

it('exports corrupt raw records without crashing, and autosave never overwrites those originals', () => {
  clearStorageWarnings(); const storage = memoryStorage(); const raw = '{broken JSON';
  storage.setItem(ARCADE_PROFILE_STORAGE_KEY, raw);
  assert.equal(loadArcadeProfile(storage).totalPlaySessions, 0);
  recordPlaySession(storage); assert.equal(storage.getItem(ARCADE_PROFILE_STORAGE_KEY), raw);
  const exported = exportArcadeSave(storage); assert.equal(exported.recoveryRaw[ARCADE_PROFILE_STORAGE_KEY], raw);
  assert.equal(exported.data[ARCADE_PROFILE_STORAGE_KEY], null); assert.ok(exported.warnings[ARCADE_PROFILE_STORAGE_KEY]);
  assert.ok(getStorageWarnings().length > 0);
  const guarded = guardStorage({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
  assert.equal(guarded.setItem(ARCADE_PROFILE_STORAGE_KEY, '{}'), false);
  importArcadeSave(envelope({ [ARCADE_PROFILE_STORAGE_KEY]: {} }), storage);
  assert.equal(storage.getItem(ARCADE_PROFILE_STORAGE_KEY), '{}');
});
