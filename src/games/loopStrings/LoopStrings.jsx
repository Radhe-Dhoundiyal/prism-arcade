import { useMemo, useState } from 'react';
import { ResearchLink } from '../../research/ResearchPanel.jsx';
import {
  calculateLoopChallengeStars,
  doesPermutationMatchChallenge,
  findChallengePath,
  getChallengeMissingMessage,
  getLoopChallengeExplanationCards,
  getLoopChallengeStatus,
  getChallengeTargetLabel,
  getShortestKnownPathLength,
  getMoveLabel,
  isLoopChallengeUnlocked,
  loadLoopChallengeProgress,
  LOOP_CHALLENGES,
  LOOP_STARS,
  recordLoopChallengeAttempt,
  recordLoopChallengeHint,
  saveLoopChallengeProgress,
} from './challenges.js';
import {
  getLoopChallengeStatsSummary,
  getUnlockedLoopAchievements,
  loadLoopStats,
  recordLoopChallengeStats,
  recordLoopHint,
  recordLoopShift,
  recordLoopSolutionViewed,
  saveLoopStats,
} from './stats.js';
import {
  analyzeLoops,
  applyRandomShifts,
  applyThreeShift,
  countConfigurationsByShortestLoop,
  createIdentityPermutation,
  CYCLE_TYPE_EXPLORER_MAX_N,
  enumerateReachablePermutations,
  formatCycleDecomposition,
  formatCycleType,
  getGeneralNExplorerRows,
  getPossibleShortestLoopSizes,
  getRandomThreeShift,
  REACHABLE_ENUMERATION_MAX_N,
  ROTATION_DIRECTIONS,
  searchShortestLoopByRandomShifts,
  undoThreeShift,
} from './logic.js';

const N_PRESETS = [4, 5, 7, 10];
const DEFAULT_N = 7;
const LOOP_MODES = {
  explorer: 'explorer',
  challenge: 'challenge',
};
const LOOP_COLORS = [
  '#45f0ff',
  '#ffd166',
  '#7bf1a8',
  '#ff4f6f',
  '#9f8cff',
  '#ff9f66',
  '#64d2ff',
  '#f78bd8',
];

function formatPermutation(permutation) {
  return `[${permutation.join(', ')}]`;
}

function getDirectionLabel(direction) {
  return direction === ROTATION_DIRECTIONS.counterclockwise ? 'counterclockwise' : 'clockwise';
}

function StarDisplay({ rating }) {
  return (
    <span className="star-rating" aria-label={`${rating} star rating`}>
      {[1, 2, 3].map((star) => (
        <span className={star <= rating ? 'is-earned' : ''} key={star}>
          {star <= rating ? '*' : '-'}
        </span>
      ))}
    </span>
  );
}

function MovePathList({ path }) {
  if (!path?.length) {
    return <p className="panel-note">No shifts needed from this state.</p>;
  }

  return (
    <ol className="loop-solution-list">
      {path.map((move, index) => (
        <li key={`${index}-${move.labels.join('-')}-${move.direction}`}>
          <strong>Move {index + 1}</strong>
          <span>{getMoveLabel(move)}</span>
          <em>{formatPermutation(move.permutation)}</em>
        </li>
      ))}
    </ol>
  );
}

function LoopConnectionDiagram({ analysis }) {
  const loopByLabel = new Map();

  analysis.cycles.forEach((cycle, cycleIndex) => {
    cycle.forEach((label) => {
      loopByLabel.set(label, cycleIndex);
    });
  });

  const n = analysis.permutation.length;

  return (
    <div className="loop-diagram" style={{ '--loop-count': n }}>
      <div className="loop-row-label">Left ends</div>
      <div className="loop-row loop-left-row">
        {analysis.permutation.map((_, index) => {
          const label = index + 1;
          const color = LOOP_COLORS[loopByLabel.get(label) % LOOP_COLORS.length];

          return (
            <div className="loop-node" style={{ '--loop-color': color }} key={label}>
              {label}
            </div>
          );
        })}
      </div>
      <svg
        className="loop-connection-svg"
        viewBox={`0 0 ${n * 100} 110`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {analysis.permutation.map((rightLabel, leftIndex) => {
          const rightIndex = analysis.permutation.indexOf(leftIndex + 1);
          const color = LOOP_COLORS[loopByLabel.get(leftIndex + 1) % LOOP_COLORS.length];

          return (
            <line
              key={`${leftIndex}-${rightLabel}`}
              x1={leftIndex * 100 + 50}
              y1="6"
              x2={rightIndex * 100 + 50}
              y2="104"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.86"
            />
          );
        })}
      </svg>
      <div className="loop-row-label">Right ends</div>
      <div className="loop-row loop-right-row">
        {analysis.permutation.map((label) => {
          const color = LOOP_COLORS[loopByLabel.get(label) % LOOP_COLORS.length];

          return (
            <div className="loop-node" style={{ '--loop-color': color }} key={label}>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoopGroups({ cycles }) {
  return (
    <div className="loop-group-list">
      {cycles.map((cycle, index) => (
        <div
          className="loop-group"
          style={{ '--loop-color': LOOP_COLORS[index % LOOP_COLORS.length] }}
          key={cycle.join('-')}
        >
          <strong>{cycle.length}-loop</strong>
          <span>{`${cycle.join(' -> ')} -> ${cycle[0]}`}</span>
        </div>
      ))}
    </div>
  );
}

export default function LoopStrings({ onBack }) {
  const [mode, setMode] = useState(LOOP_MODES.explorer);
  const [nText, setNText] = useState(String(DEFAULT_N));
  const [permutation, setPermutation] = useState(() => createIdentityPermutation(DEFAULT_N));
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [direction, setDirection] = useState(ROTATION_DIRECTIONS.clockwise);
  const [moveHistory, setMoveHistory] = useState([]);
  const [randomShiftCount, setRandomShiftCount] = useState('12');
  const [searchTrialCount, setSearchTrialCount] = useState('120');
  const [selectedShortestText, setSelectedShortestText] = useState('2');
  const [experimentMessage, setExperimentMessage] = useState('');
  const [shortestSearchResult, setShortestSearchResult] = useState(null);
  const [enumeration, setEnumeration] = useState(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengePermutation, setChallengePermutation] = useState(() =>
    createIdentityPermutation(LOOP_CHALLENGES[0].n),
  );
  const [challengeSelectedLabels, setChallengeSelectedLabels] = useState([]);
  const [challengeDirection, setChallengeDirection] = useState(ROTATION_DIRECTIONS.clockwise);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeHint, setChallengeHint] = useState('');
  const [challengeHintsThisRun, setChallengeHintsThisRun] = useState(0);
  const [solutionPath, setSolutionPath] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(() => loadLoopChallengeProgress());
  const [loopStats, setLoopStats] = useState(() => loadLoopStats());

  const analysis = useMemo(() => analyzeLoops(permutation), [permutation]);
  const challenge = LOOP_CHALLENGES[challengeIndex];
  const challengeAnalysis = useMemo(
    () => analyzeLoops(challengePermutation),
    [challengePermutation],
  );
  const challengeTargetLabel = getChallengeTargetLabel(challenge);
  const loopStatsSummary = useMemo(
    () => getLoopChallengeStatsSummary(challengeProgress, loopStats),
    [challengeProgress, loopStats],
  );
  const loopAchievements = useMemo(
    () => getUnlockedLoopAchievements(challengeProgress, loopStats),
    [challengeProgress, loopStats],
  );
  const possibleShortestLoopSizes = useMemo(
    () => getPossibleShortestLoopSizes(permutation.length),
    [permutation.length],
  );
  const selectedShortest = Math.max(1, Math.floor(Number(selectedShortestText) || 1));
  const shortestCountResult = useMemo(
    () => countConfigurationsByShortestLoop(permutation.length, selectedShortest),
    [permutation.length, selectedShortest],
  );
  const generalRows = useMemo(
    () => getGeneralNExplorerRows(CYCLE_TYPE_EXPLORER_MAX_N),
    [],
  );

  const setN = (nextN) => {
    const normalized = Math.max(
      3,
      Math.min(CYCLE_TYPE_EXPLORER_MAX_N, Math.floor(Number(nextN) || DEFAULT_N)),
    );

    setNText(String(normalized));
    setPermutation(createIdentityPermutation(normalized));
    setSelectedLabels([]);
    setMoveHistory([]);
    setExperimentMessage('');
    setShortestSearchResult(null);
    setEnumeration(null);
  };

  const toggleSelectedLabel = (label) => {
    setSelectedLabels((current) => {
      if (current.includes(label)) {
        return current.filter((value) => value !== label);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, label];
    });
  };

  const recordMove = (move, nextPermutation) => {
    const entry = {
      moveNumber: moveHistory.length + 1,
      labels: move.labels,
      direction: move.direction,
      permutation: nextPermutation,
    };

    setMoveHistory((history) => [...history, entry]);
  };

  const updateLoopStats = (updater) => {
    setLoopStats((stats) => {
      const next = updater(stats);
      saveLoopStats(next);
      return next;
    });
  };

  const applySelectedShift = () => {
    if (selectedLabels.length !== 3) {
      setExperimentMessage('Select exactly three distinct right ends first.');
      return;
    }

    const move = { labels: selectedLabels, direction };
    const next = applyThreeShift(permutation, move.labels, move.direction);

    setPermutation(next);
    recordMove(move, next);
    updateLoopStats((stats) =>
      recordLoopShift(stats, { explorer: true, cycleType: analyzeLoops(next).cycleType }),
    );
    setSelectedLabels([]);
    setExperimentMessage('3-shift applied.');
  };

  const undoLastShift = () => {
    const lastMove = moveHistory.at(-1);

    if (!lastMove) {
      return;
    }

    setPermutation((current) => undoThreeShift(current, lastMove));
    setMoveHistory((history) => history.slice(0, -1));
    setSelectedLabels([]);
    setExperimentMessage('Last shift undone.');
  };

  const resetExplorer = () => {
    setN(Number(nText));
  };

  const applyRandomShift = () => {
    const move = getRandomThreeShift(permutation);
    const next = applyThreeShift(permutation, move.labels, move.direction);

    setPermutation(next);
    recordMove(move, next);
    updateLoopStats((stats) =>
      recordLoopShift(stats, { explorer: true, cycleType: analyzeLoops(next).cycleType }),
    );
    setSelectedLabels([]);
    setExperimentMessage(`Random ${getDirectionLabel(move.direction)} shift applied.`);
  };

  const randomizeWithKShifts = () => {
    const result = applyRandomShifts(permutation, randomShiftCount);
    const offset = moveHistory.length;

    setPermutation(result.permutation);
    updateLoopStats((stats) =>
      result.history.reduce(
        (currentStats, entry) =>
          recordLoopShift(currentStats, {
            explorer: true,
            cycleType: analyzeLoops(entry.permutation).cycleType,
          }),
        stats,
      ),
    );
    setMoveHistory((history) => [
      ...history,
      ...result.history.map((entry, index) => ({
        ...entry,
        moveNumber: offset + index + 1,
      })),
    ]);
    setSelectedLabels([]);
    setExperimentMessage(`${result.history.length} random shifts applied.`);
  };

  const searchShortestLoop = () => {
    const result = searchShortestLoopByRandomShifts({
      n: permutation.length,
      shiftCount: randomShiftCount,
      trials: searchTrialCount,
    });

    setShortestSearchResult(result);
    setExperimentMessage(
      `Best random trial found shortest loop size ${result.analysis.shortestLoopSize}.`,
    );
  };

  const runEnumeration = () => {
    const result = enumerateReachablePermutations(permutation.length);

    setEnumeration(result);
    setExperimentMessage(
      result.available
        ? `Enumerated ${result.reachableCount} reachable permutations.`
        : `Enumeration is capped at n <= ${result.maxN}.`,
    );
  };

  const resetChallengeRun = (nextChallenge = challenge) => {
    setChallengePermutation(createIdentityPermutation(nextChallenge.n));
    setChallengeSelectedLabels([]);
    setChallengeDirection(ROTATION_DIRECTIONS.clockwise);
    setChallengeHistory([]);
    setChallengeResult(null);
    setChallengeHint('');
    setChallengeHintsThisRun(0);
    setSolutionPath(null);
  };

  const selectChallenge = (index) => {
    const nextChallenge = LOOP_CHALLENGES[index];

    if (!isLoopChallengeUnlocked(nextChallenge.id, challengeProgress)) {
      return;
    }

    setChallengeIndex(index);
    resetChallengeRun(nextChallenge);
  };

  const toggleChallengeLabel = (label) => {
    setChallengeSelectedLabels((current) => {
      if (current.includes(label)) {
        return current.filter((value) => value !== label);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, label];
    });
  };

  const applyChallengeShift = () => {
    if (challengeSelectedLabels.length !== 3) {
      setChallengeHint('Select exactly three distinct right ends first.');
      return;
    }

    const move = { labels: challengeSelectedLabels, direction: challengeDirection };
    const next = applyThreeShift(challengePermutation, move.labels, move.direction);

    setChallengePermutation(next);
    updateLoopStats((stats) =>
      recordLoopShift(stats, { explorer: false, cycleType: analyzeLoops(next).cycleType }),
    );
    setChallengeHistory((history) => [
      ...history,
      {
        moveNumber: history.length + 1,
        ...move,
        permutation: next,
      },
    ]);
    setChallengeSelectedLabels([]);
    setChallengeResult(null);
    setSolutionPath(null);
    setChallengeHint('3-shift applied.');
  };

  const undoChallengeShift = () => {
    const lastMove = challengeHistory.at(-1);

    if (!lastMove) {
      return;
    }

    setChallengePermutation((current) => undoThreeShift(current, lastMove));
    setChallengeHistory((history) => history.slice(0, -1));
    setChallengeSelectedLabels([]);
    setChallengeResult(null);
    setSolutionPath(null);
    setChallengeHint('Last shift undone.');
  };

  const submitChallenge = () => {
    const success = doesPermutationMatchChallenge(challengePermutation, challenge);
    const stars = calculateLoopChallengeStars(challenge, {
      success,
      moveCount: challengeHistory.length,
      hintsUsed: challengeHintsThisRun,
    });
    const nextProgress = recordLoopChallengeAttempt(challengeProgress, challenge.id, {
      success,
      moveCount: challengeHistory.length,
      hintsUsed: 0,
      stars,
    });

    saveLoopChallengeProgress(nextProgress);
    setChallengeProgress(nextProgress);
    updateLoopStats((stats) =>
      recordLoopChallengeStats(stats, nextProgress, {
        cycleType: challengeAnalysis.cycleType,
      }),
    );
    setChallengeResult({
      success,
      stars,
      message: getChallengeMissingMessage(challengePermutation, challenge),
      decomposition: formatCycleDecomposition(challengeAnalysis.cycles),
      explanationCards: success ? getLoopChallengeExplanationCards(challenge) : [],
    });
    setSolutionPath(null);
  };

  const showHint = () => {
    const path = findChallengePath(challengePermutation, challenge);

    if (path.available && path.path.length) {
      const [move] = path.path;
      setChallengeHint(`Try ${getMoveLabel(move)}.`);
    } else {
      setChallengeHint(path.reason);
    }

    const nextProgress = recordLoopChallengeHint(challengeProgress, challenge.id);
    saveLoopChallengeProgress(nextProgress);
    setChallengeProgress(nextProgress);
    setChallengeHintsThisRun((count) => count + 1);
    updateLoopStats(recordLoopHint);
  };

  const showSolutionPath = () => {
    const start = challengeResult?.success
      ? createIdentityPermutation(challenge.n)
      : challengePermutation;
    const path = findChallengePath(start, challenge);

    setSolutionPath(path.available ? path.path : []);
    setChallengeHint(path.reason);
    updateLoopStats(recordLoopSolutionViewed);
  };

  return (
    <main className="arcade-shell loop-strings-page">
      <header className="game-topbar">
        <div>
          <span className="problem-label">Problem 7</span>
          <h1>Loop Strings</h1>
          <p>Rotate three right endpoints and trace the loops formed by the resulting permutation.</p>
        </div>
        <button className="ghost-action" data-testid="loop-back-lobby" onClick={onBack}>
          Back to Lobby
        </button>
      </header>

      <nav className="segmented-control blackboard-mode-tabs loop-mode-tabs" aria-label="Loop Strings modes">
        <button
          className={mode === LOOP_MODES.explorer ? 'is-active' : ''}
          data-testid="loop-mode-explorer"
          onClick={() => setMode(LOOP_MODES.explorer)}
          type="button"
        >
          Explorer
        </button>
        <button
          className={mode === LOOP_MODES.challenge ? 'is-active' : ''}
          data-testid="loop-mode-challenge"
          onClick={() => setMode(LOOP_MODES.challenge)}
          type="button"
        >
          Cycle Challenge
        </button>
      </nav>

      {mode === LOOP_MODES.explorer ? (
        <>
      <section className="arcade-dashboard loop-layout">
        <section className="arcade-panel">
          <h2>Explorer Controls</h2>
          <div className="loop-control-grid">
            <label className="temporal-field">
              n
              <input
                data-testid="loop-n-input"
                min="3"
                max={CYCLE_TYPE_EXPLORER_MAX_N}
                onBlur={() => setN(nText)}
                onChange={(event) => setNText(event.target.value)}
                type="number"
                value={nText}
              />
            </label>
            <div className="loop-preset-row" aria-label="n presets">
              {N_PRESETS.map((preset) => (
                <button
                  className={permutation.length === preset ? 'is-selected' : ''}
                  key={preset}
                  onClick={() => setN(preset)}
                  type="button"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="loop-selector">
            <p>Select three right-end labels in rotation order.</p>
            <div className="loop-token-row">
              {permutation.map((label) => (
                <button
                  className={selectedLabels.includes(label) ? 'is-selected' : ''}
                  data-testid={`loop-label-${label}`}
                  key={label}
                  onClick={() => toggleSelectedLabel(label)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="segmented-control loop-direction-tabs">
              <button
                className={direction === ROTATION_DIRECTIONS.clockwise ? 'is-active' : ''}
                data-testid="loop-direction-clockwise"
                onClick={() => setDirection(ROTATION_DIRECTIONS.clockwise)}
                type="button"
              >
                Clockwise
              </button>
              <button
                className={direction === ROTATION_DIRECTIONS.counterclockwise ? 'is-active' : ''}
                data-testid="loop-direction-counterclockwise"
                onClick={() => setDirection(ROTATION_DIRECTIONS.counterclockwise)}
                type="button"
              >
                Counterclockwise
              </button>
            </div>
            <div className="campaign-actions">
              <button data-testid="loop-apply-shift" onClick={applySelectedShift}>Apply 3-shift</button>
              <button data-testid="loop-undo-shift" disabled={!moveHistory.length} onClick={undoLastShift}>Undo</button>
              <button data-testid="loop-reset" onClick={resetExplorer}>Reset</button>
              <button data-testid="loop-random-shift" onClick={applyRandomShift}>Random 3-shift</button>
            </div>
          </div>
          {experimentMessage && <p className="panel-note" role="status">{experimentMessage}</p>}
        </section>

        <section className="arcade-panel">
          <h2>Loop Analysis</h2>
          <dl className="arcade-overview-grid">
            <div>
              <dt>Permutation</dt>
              <dd data-testid="loop-permutation">{formatPermutation(analysis.permutation)}</dd>
            </div>
            <div>
              <dt>Cycles</dt>
              <dd data-testid="loop-cycles">{formatCycleDecomposition(analysis.cycles)}</dd>
            </div>
            <div>
              <dt>Number of loops</dt>
              <dd>{analysis.loopCount}</dd>
            </div>
            <div>
              <dt>Shortest loop</dt>
              <dd data-testid="loop-shortest">{analysis.shortestLoopSize}</dd>
            </div>
            <div>
              <dt>Longest loop</dt>
              <dd>{analysis.longestLoopSize}</dd>
            </div>
            <div>
              <dt>Size multiset</dt>
              <dd>{analysis.sizeMultiset.join(', ')}</dd>
            </div>
          </dl>
        </section>
      </section>

      <section className="arcade-dashboard loop-layout">
        <section className="arcade-panel">
          <h2>Cycle Type Analyzer</h2>
          <dl className="arcade-overview-grid">
            <div>
              <dt>Cycle decomposition</dt>
              <dd data-testid="loop-analyzer-cycles">
                {formatCycleDecomposition(analysis.cycles)}
              </dd>
            </div>
            <div>
              <dt>Cycle type</dt>
              <dd data-testid="loop-cycle-type">{formatCycleType(analysis.cycleType)}</dd>
            </div>
            <div>
              <dt>Shortest loop</dt>
              <dd>{analysis.shortestLoopSize}</dd>
            </div>
            <div>
              <dt>Permutation parity</dt>
              <dd data-testid="loop-parity">
                {analysis.parity === 'even' ? 'Even' : 'Odd'}
              </dd>
            </div>
            <div>
              <dt>Reachable by 3-shifts?</dt>
              <dd data-testid="loop-reachable">
                {analysis.reachableByThreeShifts ? 'Yes' : 'No'}
              </dd>
            </div>
            <div>
              <dt>Even-length cycles</dt>
              <dd data-testid="loop-even-cycle-count">{analysis.evenLengthCycleCount}</dd>
            </div>
          </dl>
          <p className="panel-note">
            A permutation is even iff it has an even number of even-length cycles.
          </p>
        </section>

        <section className="arcade-panel">
          <h2>Possible Shortest Loop Sizes</h2>
          <p className="panel-note" data-testid="loop-possible-shortest-summary">
            {possibleShortestLoopSizes.map((entry) => entry.shortestLoopSize).join(', ')}
          </p>
          <div className="loop-shortest-list" data-testid="loop-possible-shortest">
            {possibleShortestLoopSizes.map((entry) => (
              <article key={entry.shortestLoopSize}>
                <strong>Shortest {entry.shortestLoopSize}</strong>
                <span>
                  {entry.cycleTypes.map((cycleType) => formatCycleType(cycleType)).join('; ')}
                </span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="arcade-panel">
        <h2>String Arrangement</h2>
        <ResearchLink portalId="loop-strings" view="proof">Connect cycles to permutation parity</ResearchLink>
        <LoopConnectionDiagram analysis={analysis} />
        <LoopGroups cycles={analysis.cycles} />
      </section>

      <section className="arcade-dashboard loop-layout">
        <section className="arcade-panel">
          <h2>Experiment Tools</h2>
          <div className="loop-experiment-controls">
            <label className="temporal-field">
              Random shifts
              <input
                min="1"
                onChange={(event) => setRandomShiftCount(event.target.value)}
                type="number"
                value={randomShiftCount}
              />
            </label>
            <label className="temporal-field">
              Search trials
              <input
                min="1"
                onChange={(event) => setSearchTrialCount(event.target.value)}
                type="number"
                value={searchTrialCount}
              />
            </label>
            <div className="campaign-actions">
              <button data-testid="loop-randomize-k" onClick={randomizeWithKShifts}>Randomize with k shifts</button>
              <button data-testid="loop-search-shortest" onClick={searchShortestLoop}>Search shortest loop</button>
              <button data-testid="loop-enumerate" onClick={runEnumeration}>Generate reachable permutations</button>
            </div>
          </div>

          {shortestSearchResult && (
            <div className="loop-result-card">
              <strong>Best random trial {shortestSearchResult.trial}</strong>
              <span>Permutation: {formatPermutation(shortestSearchResult.permutation)}</span>
              <span>
                Cycles: {formatCycleDecomposition(shortestSearchResult.analysis.cycles)}
              </span>
            </div>
          )}

          {enumeration && (
            <div className="loop-result-card" data-testid="loop-enumeration-result">
              {enumeration.available ? (
                <>
                  <strong>Reachable permutations: {enumeration.reachableCount}</strong>
                  <span>
                    Possible shortest loop sizes:{' '}
                    {enumeration.possibleShortestLoopSizes.join(', ')}
                  </span>
                </>
              ) : (
                <>
                  <strong>Enumeration unavailable for n = {enumeration.n}</strong>
                  <span>Current cap: n {'<='} {REACHABLE_ENUMERATION_MAX_N}</span>
                </>
              )}
            </div>
          )}
        </section>

        <section className="arcade-panel">
          <h2>Count Configurations by Shortest Loop</h2>
          <div className="loop-experiment-controls">
            <label className="temporal-field">
              Shortest loop k
              <input
                data-testid="loop-count-k"
                min="1"
                max={permutation.length}
                onChange={(event) => setSelectedShortestText(event.target.value)}
                type="number"
                value={selectedShortestText}
              />
            </label>
            <div className="loop-result-card" data-testid="loop-count-result">
              <strong>k = {shortestCountResult.shortestLoopSize}</strong>
              <span>
                Supporting cycle types:{' '}
                {shortestCountResult.rows.length
                  ? shortestCountResult.rows
                    .map((row) => formatCycleType(row.cycleType))
                    .join('; ')
                  : 'none'}
              </span>
              <span>Loop grouping count: {shortestCountResult.groupingCount}</span>
              <span>Permutation count: {shortestCountResult.permutationCount}</span>
            </div>
          </div>
          {shortestCountResult.rows.length > 0 && (
            <div tabIndex={0} className="experiment-table-wrap loop-count-table-wrap">
              <table className="experiment-table">
                <thead>
                  <tr>
                    <th>Cycle type</th>
                    <th>Grouping count</th>
                    <th>Permutation count</th>
                  </tr>
                </thead>
                <tbody>
                  {shortestCountResult.rows.map((row) => (
                    <tr key={formatCycleType(row.cycleType)}>
                      <td>{formatCycleType(row.cycleType)}</td>
                      <td>{row.groupingCount}</td>
                      <td>{row.permutationCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <section className="arcade-dashboard loop-layout">
        <section className="arcade-panel">
          <h2>General n Explorer</h2>
          <div tabIndex={0} className="experiment-table-wrap">
            <table className="experiment-table">
              <thead>
                <tr>
                  <th>n</th>
                  <th>Possible shortest loop sizes</th>
                  <th>Reachable cycle types</th>
                </tr>
              </thead>
              <tbody>
                {generalRows.map((row) => (
                  <tr key={row.n}>
                    <td>{row.n}</td>
                    <td>{row.possibleShortestLoopSizes.join(', ')}</td>
                    <td>{row.reachableCycleTypeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="arcade-panel">
          <h2>Theorem / Insight Cards</h2>
          <div className="loop-insight-grid">
            <article>3-shifts are 3-cycles.</article>
            <article>3-cycles are even permutations.</article>
            <article>Loops after tying are cycles of the permutation.</article>
            <article>Reachable configurations are exactly even permutations, since 3-cycles generate A_n for n &gt;= 3.</article>
          </div>
        </section>
      </section>

      <section className="arcade-panel">
        <h2>Move History</h2>
        {moveHistory.length ? (
          <div tabIndex={0} className="experiment-table-wrap">
            <table className="experiment-table">
              <thead>
                <tr>
                  <th>Move</th>
                  <th>Selected labels</th>
                  <th>Direction</th>
                  <th>Resulting permutation</th>
                </tr>
              </thead>
              <tbody>
                {moveHistory.map((move) => (
                  <tr key={move.moveNumber}>
                    <td>{move.moveNumber}</td>
                    <td>{move.labels.join(', ')}</td>
                    <td>{getDirectionLabel(move.direction)}</td>
                    <td>{formatPermutation(move.permutation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="panel-note">No shifts applied yet.</p>
        )}
      </section>
        </>
      ) : (
        <>
          <section className="arcade-dashboard loop-layout">
            <section className="arcade-panel">
              <h2>Challenge Map</h2>
              <div className="loop-challenge-list">
                {LOOP_CHALLENGES.map((item, index) => {
                  const status = getLoopChallengeStatus(item.id, challengeProgress);
                  const isLocked = status === 'Locked';
                  const bestMoveCount = challengeProgress.bestMoveCount[item.id];
                  const stars = challengeProgress.highestStars[item.id] || LOOP_STARS.none;

                  return (
                    <button
                      className={[
                        index === challengeIndex ? 'is-selected' : '',
                        isLocked ? 'is-locked' : '',
                        status === 'Completed' ? 'is-completed' : '',
                      ].filter(Boolean).join(' ')}
                      data-testid={`loop-challenge-${item.id}`}
                      disabled={isLocked}
                      key={item.id}
                      onClick={() => selectChallenge(index)}
                      type="button"
                    >
                      <span>Level {index + 1}</span>
                      <strong>{item.title}</strong>
                      <em>n = {item.n} - {getChallengeTargetLabel(item)}</em>
                      <em>Status: {status}</em>
                      <em>
                        Best: {typeof bestMoveCount === 'number' ? `${bestMoveCount} moves` : '-'}
                      </em>
                      <em>Hint used: {challengeProgress.hintsUsed[item.id] ? 'Yes' : 'No'}</em>
                      <StarDisplay rating={stars} />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="arcade-panel">
              <h2>Cycle Challenge</h2>
              <div className="loop-challenge-heading">
                <span>n = {challenge.n}</span>
                <h3>{challenge.title}</h3>
                <p>{challenge.lesson}</p>
              </div>
              <dl className="arcade-overview-grid">
                <div>
                  <dt>Target</dt>
                  <dd data-testid="loop-challenge-target">{challengeTargetLabel}</dd>
                </div>
                <div>
                  <dt>Current cycle type</dt>
                  <dd data-testid="loop-challenge-cycle-type">
                    {formatCycleType(challengeAnalysis.cycleType)}
                  </dd>
                </div>
                <div>
                  <dt>Current shortest loop</dt>
                  <dd>{challengeAnalysis.shortestLoopSize}</dd>
                </div>
                <div>
                  <dt>Current loop count</dt>
                  <dd>{challengeAnalysis.loopCount}</dd>
                </div>
              </dl>
            </section>
          </section>

          <section className="arcade-dashboard loop-layout">
            <section className="arcade-panel">
              <h2>Shift Controls</h2>
              <div className="loop-selector">
                <p>Select three right-end labels in rotation order.</p>
                <div className="loop-token-row">
                  {challengePermutation.map((label) => (
                    <button
                      className={challengeSelectedLabels.includes(label) ? 'is-selected' : ''}
                      data-testid={`loop-challenge-label-${label}`}
                      key={label}
                      onClick={() => toggleChallengeLabel(label)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="segmented-control loop-direction-tabs">
                  <button
                    className={challengeDirection === ROTATION_DIRECTIONS.clockwise ? 'is-active' : ''}
                    data-testid="loop-challenge-direction-clockwise"
                    onClick={() => setChallengeDirection(ROTATION_DIRECTIONS.clockwise)}
                    type="button"
                  >
                    Clockwise
                  </button>
                  <button
                    className={
                      challengeDirection === ROTATION_DIRECTIONS.counterclockwise
                        ? 'is-active'
                        : ''
                    }
                    data-testid="loop-challenge-direction-counterclockwise"
                    onClick={() => setChallengeDirection(ROTATION_DIRECTIONS.counterclockwise)}
                    type="button"
                  >
                    Counterclockwise
                  </button>
                </div>
                <div className="campaign-actions">
                  <button data-testid="loop-challenge-apply" onClick={applyChallengeShift}>Apply 3-shift</button>
                  <button disabled={!challengeHistory.length} onClick={undoChallengeShift}>Undo</button>
                  <button data-testid="loop-challenge-reset" onClick={() => resetChallengeRun()}>Reset</button>
                  <button data-testid="loop-challenge-hint" onClick={showHint}>Hint</button>
                  <button data-testid="loop-challenge-submit" onClick={submitChallenge}>Submit</button>
                </div>
              </div>
              {challengeHint && <p className="panel-note" role="status">{challengeHint}</p>}
            </section>

            <section className="arcade-panel">
              <h2>Current Loops</h2>
              <LoopConnectionDiagram analysis={challengeAnalysis} />
              <LoopGroups cycles={challengeAnalysis.cycles} />
            </section>
          </section>

          {challengeResult && (
            <section
              className={`campaign-result ${challengeResult.success ? 'is-success' : 'is-failure'}`}
              data-testid="loop-challenge-result"
            >
              <h3>{challengeResult.success ? 'Target reached' : 'Target not reached'}</h3>
              <p>{challengeResult.message}</p>
              <p>Final cycle decomposition: {challengeResult.decomposition}</p>
              {challengeResult.success && (
                <div className="result-stars">
                  <span>Stars earned</span>
                  <StarDisplay rating={challengeResult.stars} />
                </div>
              )}
              <div className="campaign-actions">
                <button data-testid="loop-challenge-solution" onClick={showSolutionPath}>
                  Show solution path
                </button>
              </div>
              <div className="blackboard-explanation-cards">
                {challengeResult.explanationCards.map((card) => (
                  <article className="theorem-card" key={card}>
                    <h3>Theorem Lens</h3>
                    <p>{card}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {solutionPath && (
            <section className="arcade-panel" data-testid="loop-challenge-solution-path">
              <h2>Solution Path</h2>
              <MovePathList path={solutionPath} />
            </section>
          )}

          <section className="arcade-panel">
            <h2>Challenge Move History</h2>
            {challengeHistory.length ? (
              <div tabIndex={0} className="experiment-table-wrap">
                <table className="experiment-table">
                  <thead>
                    <tr>
                      <th>Move</th>
                      <th>Selected labels</th>
                      <th>Direction</th>
                      <th>Resulting permutation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challengeHistory.map((move) => (
                      <tr key={move.moveNumber}>
                        <td>{move.moveNumber}</td>
                        <td>{move.labels.join(', ')}</td>
                        <td>{getDirectionLabel(move.direction)}</td>
                        <td>{formatPermutation(move.permutation)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="panel-note">No challenge shifts applied yet.</p>
            )}
          </section>

          <section className="arcade-dashboard loop-layout">
            <section className="arcade-panel">
              <h2>Statistics</h2>
              <dl className="arcade-overview-grid">
                <div>
                  <dt>Attempts</dt>
                  <dd>{loopStatsSummary.challengeAttempts}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{loopStatsSummary.challengesCompleted}</dd>
                </div>
                <div>
                  <dt>Hints used</dt>
                  <dd>{loopStatsSummary.hintsUsed}</dd>
                </div>
                <div>
                  <dt>Gold completions</dt>
                  <dd>{loopStatsSummary.goldCompletions}</dd>
                </div>
                <div>
                  <dt>Total shifts</dt>
                  <dd>{loopStatsSummary.totalShiftsMade}</dd>
                </div>
                <div>
                  <dt>Explorer shifts</dt>
                  <dd>{loopStatsSummary.explorerShiftsMade}</dd>
                </div>
                <div>
                  <dt>BFS solutions viewed</dt>
                  <dd>{loopStatsSummary.bfsSolutionsViewed}</dd>
                </div>
              </dl>
            </section>

            <section className="arcade-panel">
              <h2>Local Achievements</h2>
              <div className="global-achievement-list">
                {loopAchievements.length ? (
                  loopAchievements.map((achievement) => (
                    <article className="is-unlocked" key={achievement.id}>
                      <strong>{achievement.title}</strong>
                      <span>{achievement.description}</span>
                      <em>Unlocked</em>
                    </article>
                  ))
                ) : (
                  <p className="panel-note">No Loop Strings achievements unlocked yet.</p>
                )}
              </div>
            </section>
          </section>
        </>
      )}
    </main>
  );
}
