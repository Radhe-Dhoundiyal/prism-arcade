import { MAX_SAVE_BYTES, getSaveSchemas, validateSaveRecord } from './saveSchema.js';

const warnings = new Map();
const wrappers = new WeakMap();
function warn(key, reason) {
  const message = `${key}: ${reason}`;
  if (warnings.get(key) === message) return;
  warnings.set(key, message);
  if (typeof window !== 'undefined') queueMicrotask(() => window.dispatchEvent(new CustomEvent('prism-storage-warning')));
}
export function getStorageWarnings() { return [...warnings.values()]; }
export function clearStorageWarnings() { warnings.clear(); }

const unavailable = {
  getItem: () => null,
  setItem: () => { throw new Error('Browser storage is unavailable.'); },
  removeItem: () => { throw new Error('Browser storage is unavailable.'); },
};
export function getBrowserStorage() {
  try { return globalThis.localStorage || unavailable; }
  catch { warn('storage', 'unavailable; progress cannot be persisted'); return unavailable; }
}

export function guardStorage(storage = getBrowserStorage()) {
  if (!storage) storage = unavailable;
  if (wrappers.has(storage)) return wrappers.get(storage);
  const guarded = {
    getItem(key) {
      try {
        const raw = storage.getItem(key);
        if (raw !== null && Object.hasOwn(getSaveSchemas(), key)) {
          if (raw.length > MAX_SAVE_BYTES) throw new Error('Record exceeds size budget.');
          validateSaveRecord(key, JSON.parse(raw));
        }
        return raw;
      } catch { warn(key, 'stored progress is unreadable or invalid; original bytes retained for recovery export'); return null; }
    },
    setItem(key, value) {
      try {
        if (Object.hasOwn(getSaveSchemas(), key)) {
          validateSaveRecord(key, JSON.parse(value));
          const previous = storage.getItem(key);
          if (previous !== null) validateSaveRecord(key, JSON.parse(previous));
        }
        storage.setItem(key, value);
        return true;
      } catch { warn(key, 'progress was not saved; export recovery data before explicitly importing or resetting'); return false; }
    },
    removeItem(key) {
      try { storage.removeItem(key); return true; }
      catch { warn(key, 'progress could not be removed'); return false; }
    },
  };
  wrappers.set(storage, guarded); wrappers.set(guarded, guarded);
  return guarded;
}
