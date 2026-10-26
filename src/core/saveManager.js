import { getPortalStorageKeys } from '../pages/lobbyData.js';
import { ARCADE_PROFILE_STORAGE_KEY } from '../profile/profile.js';
import { MAX_SAVE_BYTES, isRecord, validateSaveRecord } from './saveSchema.js';
import { getBrowserStorage } from './storage.js';

export const ARCADE_SAVE_VERSION = 2;
export const ARCADE_SAVE_KEYS = [ARCADE_PROFILE_STORAGE_KEY, ...getPortalStorageKeys()];

export function validateArcadeSave(rawSave) {
  let parsed = rawSave;
  if (typeof rawSave === 'string') {
    if (rawSave.length > MAX_SAVE_BYTES) throw new Error('Invalid arcade save: exceeds 2 MiB import budget.');
    try { parsed = JSON.parse(rawSave); }
    catch { throw new Error('Invalid arcade save: the import text is not valid JSON.'); }
  }
  if (!isRecord(parsed)) throw new Error('Invalid arcade save: expected a save object.');
  if (!Object.hasOwn(parsed, 'version')) throw new Error('Invalid arcade save: missing version field.');
  if (![1, ARCADE_SAVE_VERSION].includes(parsed.version)) throw new Error('Invalid arcade save: unsupported version.');
  if (!Object.hasOwn(parsed, 'data')) throw new Error('Invalid arcade save: missing data field.');
  if (!isRecord(parsed.data)) throw new Error('Invalid arcade save: data must be an object.');
  if (JSON.stringify(parsed).length > MAX_SAVE_BYTES) throw new Error('Invalid arcade save: exceeds import budget.');
  for (const key of ARCADE_SAVE_KEYS) {
    if (Object.hasOwn(parsed.data, key)) validateSaveRecord(key, parsed.data[key]);
  }
  return parsed;
}

export function exportArcadeSave(storage = getBrowserStorage()) {
  const data = {}; const recoveryRaw = {}; const warnings = {};
  for (const key of ARCADE_SAVE_KEYS) {
    let raw;
    try {
      raw = storage.getItem(key);
      const value = raw === null ? null : JSON.parse(raw);
      validateSaveRecord(key, value);
      data[key] = value;
    } catch {
      data[key] = null;
      if (typeof raw === 'string') recoveryRaw[key] = raw;
      warnings[key] = 'Unreadable or invalid stored record; original bytes retained in recoveryRaw when readable.';
    }
  }
  return { version: ARCADE_SAVE_VERSION, exportedAt: new Date().toISOString(), data,
    ...(Object.keys(warnings).length ? { warnings, recoveryRaw } : {}) };
}

export function serializeArcadeSave(storage = getBrowserStorage()) {
  return JSON.stringify(exportArcadeSave(storage), null, 2);
}

function applyTransaction(changes, storage) {
  const backup = new Map(changes.map(([key]) => [key, storage.getItem(key)]));
  const attempted = [];
  try {
    for (const [key, value] of changes) {
      attempted.push(key);
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
  } catch (cause) {
    const rollbackFailures = [];
    for (const key of attempted.reverse()) {
      try {
        const old = backup.get(key);
        if (old === null) storage.removeItem(key); else storage.setItem(key, old);
      } catch { rollbackFailures.push(key); }
    }
    const error = new Error(rollbackFailures.length
      ? 'Storage operation failed and rollback was incomplete. Keep the raw recovery text below.'
      : 'Storage operation failed; previous progress was restored.');
    error.cause = cause;
    error.rollbackFailures = rollbackFailures;
    error.recoveryText = JSON.stringify({ type: 'PRISM_RAW_STORAGE_RECOVERY', version: 1,
      dataRaw: Object.fromEntries(backup) }, null, 2);
    throw error;
  }
}

export function importArcadeSave(rawSave, storage = getBrowserStorage()) {
  const parsed = validateArcadeSave(rawSave);
  const changes = ARCADE_SAVE_KEYS.filter((key) => Object.hasOwn(parsed.data, key))
    .map((key) => [key, parsed.data[key] === null ? null : JSON.stringify(parsed.data[key])]);
  applyTransaction(changes, storage);
  return parsed;
}

export function resetArcadeProgress(storage = getBrowserStorage()) {
  applyTransaction(ARCADE_SAVE_KEYS.map((key) => [key, null]), storage);
}

