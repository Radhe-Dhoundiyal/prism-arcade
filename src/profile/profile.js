import { getBrowserStorage, guardStorage } from '../core/storage.js';
export const ARCADE_PROFILE_STORAGE_KEY = 'prism-arcade-profile-v1';

export const DEFAULT_ARCADE_PROFILE = {
  totalPortalsVisited: 0,
  totalChallengesCompleted: 0,
  totalAchievementsEarned: 0,
  totalPlaySessions: 0,
  firstLaunchDate: null,
  lastLaunchDate: null,
  visitedPortals: {},
  theoremCardsOpened: 0,
};

function safeParseProfile(storage) {
  try {
    const saved = JSON.parse(storage.getItem(ARCADE_PROFILE_STORAGE_KEY));

    if (!saved || typeof saved !== 'object') {
      return DEFAULT_ARCADE_PROFILE;
    }

    return {
      ...DEFAULT_ARCADE_PROFILE,
      ...saved,
      visitedPortals: {
        ...DEFAULT_ARCADE_PROFILE.visitedPortals,
        ...saved.visitedPortals,
      },
    };
  } catch {
    return DEFAULT_ARCADE_PROFILE;
  }
}

export function loadArcadeProfile(storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  return safeParseProfile(storage);
}

export function saveArcadeProfile(profile, storage = getBrowserStorage()) {
  storage = guardStorage(storage);
  storage.setItem(ARCADE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function recordPlaySession(storage = getBrowserStorage(), now = new Date()) {
  const profile = loadArcadeProfile(storage);
  const launchDate = now.toISOString();
  const nextProfile = {
    ...profile,
    totalPlaySessions: profile.totalPlaySessions + 1,
    firstLaunchDate: profile.firstLaunchDate || launchDate,
    lastLaunchDate: launchDate,
  };

  saveArcadeProfile(nextProfile, storage);
  return nextProfile;
}

export function recordPortalVisit(portalId, storage = getBrowserStorage()) {
  const profile = loadArcadeProfile(storage);
  const visitedPortals = {
    ...profile.visitedPortals,
    [portalId]: true,
  };
  const nextProfile = {
    ...profile,
    visitedPortals,
    totalPortalsVisited: Object.values(visitedPortals).filter((value) => value === true).length,
  };

  saveArcadeProfile(nextProfile, storage);
  return nextProfile;
}

export function recordTheoremCardOpened(storage = getBrowserStorage()) {
  const profile = loadArcadeProfile(storage);
  const nextProfile = {
    ...profile,
    theoremCardsOpened: profile.theoremCardsOpened + 1,
  };

  saveArcadeProfile(nextProfile, storage);
  return nextProfile;
}

export function syncArcadeProfileSummary(summary, storage = getBrowserStorage()) {
  const profile = loadArcadeProfile(storage);
  const nextProfile = {
    ...profile,
    ...summary,
    totalPortalsVisited:
      summary.totalPortalsVisited ?? Object.values(profile.visitedPortals).filter(Boolean).length,
  };

  saveArcadeProfile(nextProfile, storage);
  return nextProfile;
}
