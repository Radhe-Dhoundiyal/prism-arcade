import { useMemo, useState } from 'react';
import MathEquation from '../../components/MathEquation.jsx';
import { parityLesson } from '../../research/editorial.js';
import { useMathJob } from '../../core/useMathJob.js';
import {
  evaluateParityChallenge,
  calculateParityChallengeStars,
  getChallengeDefaultControls,
  getParityChallengeExplanationCards,
  getParityChallengeHint,
  getParityChallengeStatus,
  isParityChallengeUnlocked,
  loadParityChallengeProgress,
  PARITY_ALLOWED_CONTROLS,
  PARITY_CHALLENGES,
  PARITY_STARS,
  recordParityChallengeAttempt,
  recordParityChallengeHint,
  saveParityChallengeProgress,
} from './challenges.js';
import {
  createTransitionMatrix,
  formatProbability,
  getDistributionAfterSteps,
  getChainBehavior,
  getRandomizerById,
  getStationaryDistribution,
  RANDOMIZER_PRESETS,
  runParitySimulation,
  runSingleTrajectory,
} from './logic.js';
import {
  getParityChallengeStatsSummary,
  getUnlockedParityAchievements,
  loadParityStats,
  recordParityChallengeStats,
  recordParityHintUsed,
  recordParitySimulationRun,
  saveParityStats,
} from './stats.js';

const RANDOMIZER_IDS = [
  RANDOMIZER_PRESETS.fairCoins.id,
  RANDOMIZER_PRESETS.sevenSided.id,
  RANDOMIZER_PRESETS.custom.id,
];
const PARITY_MODES = {
  explorer: 'explorer',
  challenge: 'challenge',
};

function StarDisplay({ rating }) {
  return (
    <span className="star-rating" aria-label={`${rating} star rating`}>
      {[PARITY_STARS.bronze, PARITY_STARS.silver, PARITY_STARS.gold].map((star) => (
        <span className={star <= rating ? 'is-earned' : ''} key={star}>
          {star <= rating ? '*' : '-'}
        </span>
      ))}
    </span>
  );
}

function PercentInput({ label, testId, value, onChange }) {
  return (
    <label className="temporal-field">
      {label}
      <input
        data-testid={testId}
        max="1"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        step="0.01"
        type="number"
        value={value}
      />
    </label>
  );
}

function MatrixTable({ matrix }) {
  return (
    <table className="experiment-table parity-matrix-table" data-testid="parity-transition-matrix">
      <thead>
        <tr>
          <th>Current</th>
          <th>Next Even</th>
          <th>Next Odd</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Even</td>
          <td>{formatProbability(matrix[0][0])}</td>
          <td>{formatProbability(matrix[0][1])}</td>
        </tr>
        <tr>
          <td>Odd</td>
          <td>{formatProbability(matrix[1][0])}</td>
          <td>{formatProbability(matrix[1][1])}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function ParityEngine({ onBack }) {
  const [mode, setMode] = useState(PARITY_MODES.explorer);
  const [randomizerId, setRandomizerId] = useState(RANDOMIZER_PRESETS.fairCoins.id);
  const [customPA, setCustomPA] = useState('0.5');
  const [customPB, setCustomPB] = useState('0.5');
  const [nText, setNText] = useState('2026');
  const [trialText, setTrialText] = useState('2000');
  const [trajectoryStepsText, setTrajectoryStepsText] = useState('12');
  const [simulationResult, setSimulationResult] = useState(null);
  const simulationJob = useMathJob();
  const [trajectory, setTrajectory] = useState(() =>
    runSingleTrajectory({
      pA: RANDOMIZER_PRESETS.fairCoins.pA,
      pB: RANDOMIZER_PRESETS.fairCoins.pB,
      steps: 12,
    }),
  );
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeControls, setChallengeControls] = useState(() =>
    getChallengeDefaultControls(PARITY_CHALLENGES[0]),
  );
  const [challengeProgress, setChallengeProgress] = useState(() => loadParityChallengeProgress());
  const [parityStats, setParityStats] = useState(() => loadParityStats());
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeHint, setChallengeHint] = useState('');

  const selectedPreset = getRandomizerById(randomizerId);
  const probabilities = {
    pA: randomizerId === RANDOMIZER_PRESETS.custom.id ? Number(customPA) : selectedPreset.pA,
    pB: randomizerId === RANDOMIZER_PRESETS.custom.id ? Number(customPB) : selectedPreset.pB,
  };
  const n = Math.max(0, Math.min(1e9, Math.floor(Number(nText) || 0)));
  const matrix = useMemo(() => createTransitionMatrix(probabilities), [probabilities.pA, probabilities.pB]);
  const distribution = useMemo(
    () => getDistributionAfterSteps({ ...probabilities, steps: n }),
    [probabilities.pA, probabilities.pB, n],
  );
  const stationary = useMemo(
    () => getStationaryDistribution(probabilities),
    [probabilities.pA, probabilities.pB],
  );
  const challenge = PARITY_CHALLENGES[challengeIndex];
  const challengeMatrix = useMemo(
    () => createTransitionMatrix(challengeControls),
    [challengeControls.pA, challengeControls.pB],
  );
  const challengeEvaluation = useMemo(
    () => evaluateParityChallenge(challenge, challengeControls),
    [challenge, challengeControls.pA, challengeControls.pB],
  );
  const isCustomChallenge = challenge.allowedControls === PARITY_ALLOWED_CONTROLS.custom;
  const currentChallengeHints = challengeProgress.hintsUsed[challenge.id] || 0;
  const currentStarRating = calculateParityChallengeStars(
    challenge,
    challengeEvaluation,
    currentChallengeHints,
  );
  const parityStatsSummary = useMemo(
    () => getParityChallengeStatsSummary(challengeProgress, parityStats),
    [challengeProgress, parityStats],
  );
  const unlockedParityAchievements = useMemo(
    () => getUnlockedParityAchievements(challengeProgress, parityStats, PARITY_CHALLENGES),
    [challengeProgress, parityStats],
  );

  const runSimulation = () => {
    simulationJob.run('parity-simulation', {
      ...probabilities,
      n,
      trials: trialText,
    }, (result) => {
    const nextStats = recordParitySimulationRun(parityStats);

    setSimulationResult(result);
    setParityStats(nextStats);
    saveParityStats(nextStats);
    });
  };

  const generateTrajectory = () => {
    setTrajectory(
      runSingleTrajectory({
        ...probabilities,
        steps: trajectoryStepsText,
      }),
    );
  };

  const selectChallenge = (index) => {
    const nextChallenge = PARITY_CHALLENGES[index];

    if (!nextChallenge || !isParityChallengeUnlocked(nextChallenge.id, challengeProgress)) {
      return;
    }

    setChallengeIndex(index);
    setChallengeControls(getChallengeDefaultControls(nextChallenge));
    setChallengeResult(null);
    setChallengeHint('');
  };

  const setChallengeProbability = (key, value) => {
    setChallengeControls((current) => ({
      ...current,
      [key]: Number(value),
    }));
    setChallengeResult(null);
  };

  const submitChallenge = () => {
    const evaluationWithStars = {
      ...challengeEvaluation,
      stars: currentStarRating,
    };
    const nextProgress = recordParityChallengeAttempt(
      challengeProgress,
      challenge.id,
      evaluationWithStars,
    );
    const nextStats = recordParityChallengeStats(parityStats, nextProgress, challengeEvaluation);

    saveParityChallengeProgress(nextProgress);
    saveParityStats(nextStats);
    setChallengeProgress(nextProgress);
    setParityStats(nextStats);
    setChallengeResult(evaluationWithStars);
  };

  const showChallengeHint = () => {
    const nextProgress = recordParityChallengeHint(challengeProgress, challenge.id);
    const nextStats = recordParityHintUsed(parityStats);

    saveParityChallengeProgress(nextProgress);
    saveParityStats(nextStats);
    setChallengeProgress(nextProgress);
    setParityStats(nextStats);
    setChallengeHint(getParityChallengeHint(challenge, challengeEvaluation));
  };

  return (
    <main className="arcade-shell parity-engine-page">
      <header className="game-topbar">
        <button className="ghost-action" data-testid="nav-back-lobby" onClick={onBack}>
          Back to Lobby
        </button>
        <div>
          <span className="problem-label">Problem 2</span>
          <h1>Parity Engine</h1>
          <p>Track even and odd outcomes, then compare finite-step probabilities with stationary behavior.</p>
        </div>
        <span className="status-badge status-playable--experimental">Playable / Experimental</span>
      </header>

      <nav className="segmented-control blackboard-mode-tabs parity-mode-tabs" aria-label="Parity Engine modes">
        <button
          className={mode === PARITY_MODES.explorer ? 'is-active' : ''}
          data-testid="parity-mode-explorer"
          onClick={() => setMode(PARITY_MODES.explorer)}
          type="button"
        >
          Explorer
        </button>
        <button
          className={mode === PARITY_MODES.challenge ? 'is-active' : ''}
          data-testid="parity-mode-challenge"
          onClick={() => setMode(PARITY_MODES.challenge)}
          type="button"
        >
          Target Challenge
        </button>
      </nav>

      {mode === PARITY_MODES.explorer ? (
        <>
      <section className="arcade-dashboard parity-layout">
        <section className="arcade-panel">
          <h2>Randomizer</h2>
          <div className="parity-randomizer-grid" data-testid="parity-randomizer-panel">
            {RANDOMIZER_IDS.map((id) => {
              const preset = getRandomizerById(id);

              return (
                <button
                  className={randomizerId === id ? 'is-selected' : ''}
                  data-testid={`parity-randomizer-${id}`}
                  key={id}
                  onClick={() => setRandomizerId(id)}
                  type="button"
                >
                  <strong>{preset.title}</strong>
                  <span>{preset.description}</span>
                </button>
              );
            })}
          </div>

          {randomizerId === RANDOMIZER_PRESETS.custom.id && (
            <div className="parity-custom-grid">
              <PercentInput
                label="pA = P(a is odd)"
                onChange={setCustomPA}
                testId="parity-custom-pa"
                value={customPA}
              />
              <PercentInput
                label="pB = P(b is odd)"
                onChange={setCustomPB}
                testId="parity-custom-pb"
                value={customPB}
              />
            </div>
          )}
        </section>

        <section className="arcade-panel">
          <h2>Markov Analysis</h2>
          <div tabIndex={0} className="experiment-table-wrap">
            <MatrixTable matrix={matrix} />
          </div>
          <dl className="arcade-overview-grid parity-probability-grid">
            <div>
              <dt>n</dt>
              <dd>{n}</dd>
            </div>
            <div>
              <dt>Distribution vector</dt>
              <dd data-testid="parity-distribution-vector">
                [{formatProbability(distribution[0])}, {formatProbability(distribution[1])}]
              </dd>
            </div>
            <div>
              <dt>P(s_n even)</dt>
              <dd data-testid="parity-exact-even">{formatProbability(distribution[0])}</dd>
            </div>
            <div>
              <dt>P(s_n odd)</dt>
              <dd data-testid="parity-exact-odd">{formatProbability(distribution[1])}</dd>
            </div>
            <div>
              <dt>Stationary even</dt>
              <dd data-testid="parity-stationary-even">
                {stationary ? formatProbability(stationary[0]) : 'N/A'}
              </dd>
            </div>
            <div>
              <dt>Stationary odd</dt>
              <dd>{stationary ? formatProbability(stationary[1]) : 'N/A'}</dd>
            </div>
          </dl>
          <p>{getChainBehavior(probabilities)}</p>
        </section>
      </section>

      <section className="arcade-dashboard parity-layout">
        <section className="arcade-panel">
          <h2>Simulation</h2>
          {simulationJob.busy && <p role="status">Simulating in background. <button onClick={simulationJob.cancel}>Cancel simulation</button></p>}
          {simulationJob.error && <p role="alert">{simulationJob.error}</p>}
          <div className="parity-simulation-controls">
            <label className="temporal-field">
              n
              <input
                data-testid="parity-n-input"
                min="0"
                onChange={(event) => setNText(event.target.value)}
                type="number"
                value={nText}
              />
            </label>
            <label className="temporal-field">
              Trials
              <input
                data-testid="parity-trials-input"
                min="1"
                onChange={(event) => setTrialText(event.target.value)}
                type="number"
                value={trialText}
              />
            </label>
            <button data-testid="parity-run-simulation" onClick={runSimulation} type="button">
              Run Simulation
            </button>
          </div>

          {simulationResult && <p role="status">Simulation: n={simulationResult.n}, trials={simulationResult.trials}.{simulationResult.bounded ? ' Resource limits applied.' : ''}</p>}
          {simulationResult && (
            <dl className="arcade-overview-grid parity-probability-grid" data-testid="parity-simulation-result">
              <div>
                <dt>Analytic P(even)</dt>
                <dd>{formatProbability(simulationResult.exactEven)}</dd>
              </div>
              <div>
                <dt>Simulated P(even)</dt>
                <dd>{formatProbability(simulationResult.simulatedEven)}</dd>
              </div>
              <div>
                <dt>Error</dt>
                <dd>{simulationResult.error.toFixed(4)}</dd>
              </div>
              <div>
                <dt>Even / Odd trials</dt>
                <dd>{simulationResult.evenCount} / {simulationResult.oddCount}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="arcade-panel">
          <h2>Probability Panel</h2>
          <div className="theorem-card">
            <h3>State reduction</h3>
            <p>The next parity depends only on whether the current value is even or odd.</p>
          </div>
          <div className="theorem-card">
            <h3>Custom formula</h3>
            <p>Let p = P(a is odd) and q = P(b is odd). Then E to E = pq and O to E = (1-p)q.</p>
            <MathEquation id="parity" />
          </div>
          <div className="theorem-card">
            <h3>Preset facts</h3>
            <p>Fair coins give P(s_n even) = 1/4 for n &gt;= 1. 7-sided dice give stationary even probability 4/15.</p>
          </div>
        </section>
      </section>

      <section className="arcade-panel">
        <div className="panel-heading-row">
          <h2>Step Visualizer</h2>
          <div className="parity-step-controls">
            <label className="temporal-field">
              Steps
              <input
                data-testid="parity-trajectory-steps"
                min="1"
                onChange={(event) => setTrajectoryStepsText(event.target.value)}
                type="number"
                value={trajectoryStepsText}
              />
            </label>
            <button data-testid="parity-generate-trajectory" onClick={generateTrajectory} type="button">
              Generate Trajectory
            </button>
          </div>
        </div>

        <div className="parity-trajectory-line" data-testid="parity-trajectory-line">
          {trajectory.length
            ? [trajectory[0].currentParity, ...trajectory.map((row) => row.nextParity)].join(' -> ')
            : 'Even'}
        </div>
        <div tabIndex={0} className="experiment-table-wrap">
          <table className="experiment-table" data-testid="parity-trajectory-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>s parity</th>
                <th>a parity</th>
                <th>t parity</th>
                <th>b parity</th>
                <th>next s parity</th>
              </tr>
            </thead>
            <tbody>
              {trajectory.map((row) => (
                <tr key={row.step}>
                  <td>{row.step}</td>
                  <td>{row.currentParity}</td>
                  <td>{row.aParity}</td>
                  <td>{row.tParity}</td>
                  <td>{row.bParity}</td>
                  <td>{row.nextParity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
        </>
      ) : (
        <>
          <section className="arcade-dashboard parity-layout">
            <section className="arcade-panel">
              <h2>Challenge Map</h2>
              <div className="parity-challenge-list" data-testid="parity-challenge-list">
                {PARITY_CHALLENGES.map((item, index) => {
                  const completed = Boolean(challengeProgress.completed[item.id]);
                  const bestError = challengeProgress.bestError[item.id];
                  const hintsUsed = challengeProgress.hintsUsed[item.id] || 0;
                  const status = getParityChallengeStatus(item.id, challengeProgress);
                  const locked = status === 'Locked';
                  const starRating = challengeProgress.highestStars[item.id] || PARITY_STARS.none;

                  return (
                    <button
                      className={[
                        index === challengeIndex ? 'is-selected' : '',
                        completed ? 'is-completed' : '',
                        locked ? 'is-locked' : '',
                      ].filter(Boolean).join(' ')}
                      data-testid={`parity-challenge-${item.id}`}
                      disabled={locked}
                      key={item.id}
                      onClick={() => selectChallenge(index)}
                      type="button"
                    >
                      <span>Level {index + 1} - {status}</span>
                      <strong>{item.title}</strong>
                      <em>Target {formatProbability(item.targetEvenProbability)} at n = {item.n}</em>
                      <em>
                        Best error:{' '}
                        {typeof bestError === 'number' ? bestError.toFixed(4) : '-'}
                      </em>
                      <em>Hint used: {hintsUsed > 0 ? 'Yes' : 'No'}</em>
                      <StarDisplay rating={starRating} />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="arcade-panel">
              <h2>Target Challenge</h2>
              <div className="parity-challenge-heading">
                <span>{isCustomChallenge ? 'Custom controls' : 'Preset locked'}</span>
                <h3>{challenge.title}</h3>
                <p>{parityLesson(challenge)}</p>
              </div>
              <dl className="arcade-overview-grid parity-probability-grid">
                <div>
                  <dt>n</dt>
                  <dd data-testid="parity-challenge-n">{challenge.n}</dd>
                </div>
                <div>
                  <dt>Target P(even)</dt>
                  <dd data-testid="parity-challenge-target">
                    {formatProbability(challenge.targetEvenProbability)}
                  </dd>
                </div>
                <div>
                  <dt>Current analytic probability</dt>
                  <dd data-testid="parity-challenge-current">
                    {formatProbability(challengeEvaluation.exactEven)}
                  </dd>
                </div>
                <div>
                  <dt>Error</dt>
                  <dd data-testid="parity-challenge-error">
                    {challengeEvaluation.error.toFixed(4)}
                  </dd>
                </div>
                <div>
                  <dt>Tolerance</dt>
                  <dd>{challenge.tolerance}</dd>
                </div>
                <div>
                  <dt>Gold threshold</dt>
                  <dd>{(challenge.tolerance * 0.25).toFixed(4)}</dd>
                </div>
                <div>
                  <dt>pA / pB</dt>
                  <dd data-testid="parity-challenge-probabilities">
                    {formatProbability(challengeControls.pA)} / {formatProbability(challengeControls.pB)}
                  </dd>
                </div>
              </dl>
            </section>
          </section>

          <section className="arcade-dashboard parity-layout">
            <section className="arcade-panel">
              <h2>Allowed Controls</h2>
              {isCustomChallenge ? (
                <div className="parity-slider-grid">
                  <label>
                    pA = P(a is odd)
                    <input
                      data-testid="parity-challenge-pa"
                      max="1"
                      min="0"
                      onChange={(event) => setChallengeProbability('pA', event.target.value)}
                      step="0.01"
                      type="range"
                      value={challengeControls.pA}
                    />
                    <span>{formatProbability(challengeControls.pA)}</span>
                  </label>
                  <label>
                    pB = P(b is odd)
                    <input
                      data-testid="parity-challenge-pb"
                      max="1"
                      min="0"
                      onChange={(event) => setChallengeProbability('pB', event.target.value)}
                      step="0.01"
                      type="range"
                      value={challengeControls.pB}
                    />
                    <span>{formatProbability(challengeControls.pB)}</span>
                  </label>
                </div>
              ) : (
                <div className="theorem-card">
                  <h3>Preset randomizer</h3>
                  <p>
                    This challenge uses {getRandomizerById(challengeControls.randomizerId).title}.
                    The probabilities are locked so you can verify the known result.
                  </p>
                </div>
              )}

              <div className="campaign-actions">
                <button data-testid="parity-challenge-hint" onClick={showChallengeHint} type="button">
                  Hint
                </button>
                <button data-testid="parity-challenge-submit" onClick={submitChallenge} type="button">
                  Check Target
                </button>
              </div>
              {challengeHint && <p className="panel-note" role="status">{challengeHint}</p>}
            </section>

            <section className="arcade-panel">
              <h2>Live Transition Matrix</h2>
              <div tabIndex={0} className="experiment-table-wrap">
                <MatrixTable matrix={challengeMatrix} />
              </div>
            </section>
          </section>

          <section className="arcade-dashboard parity-layout">
            <section className="arcade-panel">
              <h2>Statistics</h2>
              <dl className="arcade-overview-grid parity-probability-grid" data-testid="parity-stats-panel">
                <div>
                  <dt>Attempts</dt>
                  <dd>{parityStatsSummary.challengeAttempts}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{parityStatsSummary.challengesCompleted}</dd>
                </div>
                <div>
                  <dt>Hints used</dt>
                  <dd>{parityStatsSummary.hintsUsed}</dd>
                </div>
                <div>
                  <dt>Gold</dt>
                  <dd>{parityStatsSummary.goldCompletions}</dd>
                </div>
                <div>
                  <dt>Simulations</dt>
                  <dd>{parityStatsSummary.simulationsRun}</dd>
                </div>
                <div>
                  <dt>Evaluations</dt>
                  <dd>{parityStatsSummary.totalProbabilityEvaluations}</dd>
                </div>
                <div>
                  <dt>Best error</dt>
                  <dd>
                    {typeof parityStatsSummary.bestErrorAchieved === 'number'
                      ? parityStatsSummary.bestErrorAchieved.toFixed(4)
                      : '-'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="arcade-panel">
              <h2>Local Achievements</h2>
              <div className="achievement-list" data-testid="parity-achievement-list">
                {unlockedParityAchievements.length > 0 ? (
                  unlockedParityAchievements.map((achievement) => (
                    <div data-testid={`parity-achievement-${achievement.id}`} key={achievement.id}>
                      <strong>{achievement.title}</strong>
                      <span>{achievement.description}</span>
                    </div>
                  ))
                ) : (
                  <p className="panel-note">Complete a target to unlock Parity Engine achievements.</p>
                )}
              </div>
            </section>
          </section>

          {challengeResult && (
            <section
              className={`campaign-result ${challengeResult.success ? 'is-success' : 'is-failure'}`}
              data-testid="parity-challenge-result"
            >
              <h3>{challengeResult.success ? 'Target reached' : 'Target not reached'}</h3>
              {challengeResult.success ? (
                <>
                  <p>You tuned the transition probabilities of a two-state Markov chain.</p>
                  <div className="result-stars">
                    <span>Stars earned</span>
                    <StarDisplay rating={challengeResult.stars} />
                  </div>
                  <div className="parity-explanation-grid">
                    {getParityChallengeExplanationCards(challenge).map((card) => (
                      <div className="theorem-card" key={card.title}>
                        <h3>{card.title}</h3>
                        <p>{card.body}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p>
                  Current error is {challengeResult.error.toFixed(4)}.{' '}
                  {getParityChallengeHint(challenge, challengeResult)}
                </p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
