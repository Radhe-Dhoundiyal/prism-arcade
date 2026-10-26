import { useEffect, useMemo, useState } from 'react';
import {
  getArcadeProgressSnapshot,
  getGlobalAchievementStates,
} from '../achievements/achievements.js';
import {
  importArcadeSave,
  resetArcadeProgress,
  serializeArcadeSave,
} from '../core/saveManager.js';
import { syncArcadeProfileSummary } from '../profile/profile.js';
import { games, getLobbyPlayableCount, getLobbyProgressPercent } from './lobbyData.js';
import PortalPreview from '../components/PortalPreview.jsx';
import { PORTAL_INTRODUCTIONS } from '../research/editorial.js';

export default function Lobby({
  onPlayGridDominion,
  onExploreParityEngine,
  onExploreNumberForge,
  onExploreLanguageLabyrinth,
  onExploreTemporalGraphs,
  onExploreBlackboardMoves,
  onExploreBinaryShift,
  onExploreLoopStrings,
}) {
  const playableCount = getLobbyPlayableCount(games);
  const startedCount = games.filter((game) => game.playable || game.experimental).length;
  const progressPercent = getLobbyProgressPercent(games);
  const [saveText, setSaveText] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const snapshot = useMemo(() => getArcadeProgressSnapshot(), [refreshKey]);
  const achievements = useMemo(() => getGlobalAchievementStates(), [refreshKey]);
  const unlockedAchievementCount =
    achievements.filter((achievement) => achievement.progress.unlocked).length +
    snapshot.binaryShiftAchievementCount +
    snapshot.blackboardAchievementCount +
    snapshot.loopAchievementCount +
    snapshot.parityAchievementCount +
    snapshot.languageAchievementCount;
  const portalCategories = [
    ['Strategy', games.filter((game) => game.category === 'Strategy')],
    [
      'Probability & Random Processes',
      games.filter((game) => game.category === 'Probability & Random Processes'),
    ],
    ['Transformation Games', games.filter((game) => game.category === 'Transformation Games')],
    ['Graph Theory', games.filter((game) => game.category === 'Graph Theory')],
    ['Loop Structures', games.filter((game) => game.category === 'Loop Structures')],
    ['Number Theory', games.filter((game) => game.category === 'Number Theory')],
    ['Formal Languages', games.filter((game) => game.category === 'Formal Languages')],
    ['Future Portals', games.filter((game) => game.category === 'Future Portals')],
  ];

  useEffect(() => {
    syncArcadeProfileSummary({
      totalChallengesCompleted: snapshot.totalChallengesCompleted,
      totalAchievementsEarned: unlockedAchievementCount,
      totalPortalsVisited: snapshot.totalPortalsVisited,
    });
  }, [snapshot.totalChallengesCompleted, snapshot.totalPortalsVisited, unlockedAchievementCount]);

  const handleExportSave = async () => {
    const serialized = serializeArcadeSave();

    setSaveText(serialized);

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(serialized);
        setSaveMessage('Arcade save exported and copied. Check warnings/recoveryRaw if any stored records were invalid.');
      } else setSaveMessage('Arcade save exported below.');
    } catch {
      setSaveMessage('Arcade save exported below.');
    }
  };

  const handleImportSave = () => {
    try {
      importArcadeSave(saveText);
      setSaveMessage('Arcade save imported.');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setSaveMessage(error.message);
      if (error.recoveryText) setSaveText(error.recoveryText);
    }
  };

  const handleResetSave = () => {
    if (!window.confirm('Reset all PRISM Arcade progress on this device?')) {
      return;
    }

    try {
      resetArcadeProgress();
      setSaveText('');
      setSaveMessage('Arcade progress reset.');
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setSaveMessage(error.message);
      if (error.recoveryText) setSaveText(error.recoveryText);
    }
  };

  const portalActions = {
    'binary-shift': onExploreBinaryShift,
    'parity-engine': onExploreParityEngine,
    'number-forge': onExploreNumberForge,
    'language-labyrinth': onExploreLanguageLabyrinth,
    'grid-dominion': onPlayGridDominion,
    'temporal-graphs': onExploreTemporalGraphs,
    'blackboard-moves': onExploreBlackboardMoves,
    'loop-strings': onExploreLoopStrings,
  };

  return (
    <main className="arcade-shell lobby-page">
      <section className="lobby-hero">
        <div className="brand-mark" aria-hidden="true">
          P
        </div>
        <div>
          <h1>PRISM Arcade</h1>
          <p>An Interactive Mathematical Discovery Studio</p>
        </div>
      </section>

      <section className="lobby-stats" aria-label="Arcade progress">
        <div>
          <span>Started portals</span>
          <strong>{startedCount}</strong>
        </div>
        <div>
          <span>Playable portals</span>
          <strong>{playableCount}</strong>
        </div>
        <div>
          <span>Portal Coverage</span>
          <strong>{progressPercent}%</strong>
        </div>
      </section>

      <section className="portal-grid" aria-label="PRISM problem games">
        {games.map((game) => (
          <article
            className={`portal-card ${game.playable ? 'is-playable' : ''}`}
            data-portal-id={game.id}
            data-testid={`portal-card-problem-${game.problemNumber}`}
            key={game.id}
          >
            <span data-testid={`portal-card-${game.id}`} hidden />
            <div className="portal-card__number">Problem {game.problemNumber}</div>
            <span
              className={`status-badge status-${game.status
                .toLowerCase()
                .replaceAll(' ', '-')
                .replaceAll('/', '')}`}
            >
              {game.status}
            </span>
            <h2>{game.title}</h2>
            <PortalPreview portalId={game.id} />
            {game.description && <p className="portal-card__description">{PORTAL_INTRODUCTIONS[game.id] ?? game.description}</p>}
            <div className="portal-progress">
              <span>{snapshot.portalChallengeCounts[game.id] ?? 0} / {snapshot.challengeSetSizes[game.id] ?? 0} challenges</span>
              <progress aria-label={`${game.title} challenge progress`} value={snapshot.portalChallengeCounts[game.id] ?? 0} max={snapshot.challengeSetSizes[game.id] || 1} />
            </div>
            <div className="portal-card__orbit" aria-hidden="true" />
            {game.playable ? (
              <button
                className={`primary-action ${game.experimental ? 'secondary-action' : ''}`}
                data-portal-id={game.id}
                data-testid={`portal-action-problem-${game.problemNumber}`}
                onClick={portalActions[game.route]}
              >
                <span data-testid={`portal-action-${game.id}`}>
                  {game.experimental ? 'Play & explore' : 'Play now'}
                </span>
              </button>
            ) : game.experimental ? (
              <button
                className="primary-action secondary-action"
                data-portal-id={game.id}
                data-testid={`portal-action-problem-${game.problemNumber}`}
                onClick={portalActions[game.route]}
              >
                <span data-testid={`portal-action-${game.id}`}>Explore now</span>
              </button>
            ) : (
              <span className="soon-label">Coming soon</span>
            )}
          </article>
        ))}
      </section>
      <section className="discovery-progress" aria-label="Your discovery progress">
        <div><span>Your investigation</span><strong>{snapshot.totalChallengesCompleted} challenges completed</strong></div>
        <div><span>Next achievement</span><strong>{achievements.find((entry) => !entry.progress.unlocked)?.title ?? 'All current global milestones reached'}</strong>
          <p>{achievements.find((entry) => !entry.progress.unlocked)?.description ?? 'Continue exploring the eight laboratories.'}</p></div>
      </section>
      <details className="lobby-secondary">
      <summary>Profile, achievements and save settings</summary>
      <section className="arcade-dashboard" aria-label="Arcade Overview">
        <section className="arcade-panel">
          <h2>Arcade Overview</h2>
          <dl className="arcade-overview-grid">
            <div>
              <dt>Portals Started</dt>
              <dd>{startedCount}</dd>
            </div>
            <div>
              <dt>Playable Portals</dt>
              <dd>{playableCount}</dd>
            </div>
            <div>
              <dt>Challenges Completed</dt>
              <dd>{snapshot.totalChallengesCompleted}</dd>
            </div>
            <div>
              <dt>Achievements Earned</dt>
              <dd>{unlockedAchievementCount}</dd>
            </div>
          </dl>
        </section>

        <section className="arcade-panel" aria-label="Arcade Profile panel">
          <h2>Arcade Profile</h2>
          <dl className="profile-list">
            <div>
              <dt>Total play sessions</dt>
              <dd>{snapshot.profile.totalPlaySessions}</dd>
            </div>
            <div>
              <dt>First launch</dt>
              <dd>{snapshot.profile.firstLaunchDate?.slice(0, 10) || '-'}</dd>
            </div>
            <div>
              <dt>Last launch</dt>
              <dd>{snapshot.profile.lastLaunchDate?.slice(0, 10) || '-'}</dd>
            </div>
            <div>
              <dt>Theorem cards opened</dt>
              <dd>{snapshot.theoremCardsOpened}</dd>
            </div>
            <div>
              <dt>Portals visited</dt>
              <dd>{snapshot.totalPortalsVisited}</dd>
            </div>
          </dl>
        </section>
      </section>

      <section className="arcade-dashboard" aria-label="Arcade systems">
        <section className="arcade-panel">
          <h2>Global Achievements</h2>
          <div className="global-achievement-list">
            {achievements.map((achievement) => (
              <article
                className={achievement.progress.unlocked ? 'is-unlocked' : 'is-locked'}
                data-testid={`achievement-${achievement.id}`}
                key={achievement.id}
              >
                <strong>{achievement.title}</strong>
                <span>{achievement.description}</span>
                <em>
                  {achievement.progress.unlocked ? 'Unlocked' : 'Locked'} -{' '}
                  {Math.min(achievement.progress.current, achievement.progress.target)} /{' '}
                  {achievement.progress.target}
                </em>
              </article>
            ))}
          </div>
        </section>

        <section className="arcade-panel settings-panel">
          <h2>Settings</h2>
          <div className="campaign-actions">
            <button data-testid="export-arcade-save" onClick={handleExportSave}>
              Export Arcade Save
            </button>
            <button data-testid="import-arcade-save" onClick={handleImportSave}>
              Import Arcade Save
            </button>
            <button data-testid="reset-arcade-progress" onClick={handleResetSave}>
              Reset Arcade Progress
            </button>
          </div>
          <textarea
            aria-label="Arcade save data"
            className="graph-json"
            data-testid="arcade-save-text"
            onChange={(event) => setSaveText(event.target.value)}
            placeholder="Exported save data appears here. Paste save data here to import."
            value={saveText}
          />
          {saveMessage && <p className="panel-note" role="status">{saveMessage}</p>}
        </section>
      </section>

      <section className="portal-categories" aria-label="Portal categories">
        {portalCategories.map(([category, categoryGames]) => (
          <section className="arcade-panel" key={category}>
            <h2>{category}</h2>
            <ul>
              {categoryGames.map((game) => (
                <li key={game.id}>
                  <strong>{game.title}</strong>
                  <span>{game.status}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>

      </details>
    </main>
  );
}
