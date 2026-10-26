import { useMemo, useState } from 'react';
import MathEquation from '../../components/MathEquation.jsx';
import {
  BINARY_SHIFT_CHALLENGES,
  BINARY_SHIFT_STARS,
  calculateBinaryShiftStars,
  evaluateBinaryShiftChallenge,
  getBinaryShiftHint,
  getBinaryShiftChallengeStatus,
  loadBinaryShiftProgress,
  recordBinaryShiftCompletion,
  recordBinaryShiftHint,
  saveBinaryShiftProgress,
} from './challenges.js';
import {
  countSpecialValuesBelow,
  evaluateBinaryShift,
  formatBigInt,
  searchBinaryShift,
} from './logic.js';
import {
  getUnlockedBinaryShiftAchievements,
  loadBinaryShiftStats,
  recordBinaryShiftBoundsCheck,
  recordBinaryShiftChallengeStats,
  recordBinaryShiftHintStat,
  recordBinaryShiftSearchRun,
  saveBinaryShiftStats,
} from './stats.js';

const DEFAULT_N = '8';
const DEFAULT_X = '17';
const DEFAULT_SEARCH_N = '50';
const BINARY_SHIFT_MODES = {
  explorer: 'explorer',
  challenge: 'challenge',
};

function BitRow({ label, bits }) {
  return (
    <div className="binary-bit-row">
      <span>{label}</span>
      <div>
        {bits.split('').map((bit, index) => (
          <strong className={index === 0 || index === bits.length - 1 ? 'is-edge-bit' : ''} key={`${bit}-${index}`}>
            {bit}
          </strong>
        ))}
      </div>
    </div>
  );
}

function VerdictPill({ pass, children }) {
  return <span className={pass ? 'binary-check is-pass' : 'binary-check is-fail'}>{children}</span>;
}

function ValuesFound({ title, rows, testId }) {
  return (
    <div className="theorem-card" data-testid={testId}>
      <h3>{title}</h3>
      <p>
        {rows.length
          ? rows.map((row) => `${formatBigInt(row.x)} (n=${row.n}, ${row.binaryX})`).join(', ')
          : 'No values found in the current search range.'}
      </p>
    </div>
  );
}

function StarDisplay({ rating }) {
  return (
    <span className="star-rating" aria-label={`${rating} star rating`}>
      {[BINARY_SHIFT_STARS.bronze, BINARY_SHIFT_STARS.silver, BINARY_SHIFT_STARS.gold].map((star) => (
        <span className={star <= rating ? 'is-earned' : ''} key={star}>
          {star <= rating ? '*' : '-'}
        </span>
      ))}
    </span>
  );
}

function SuccessPanel({ result }) {
  const x = result.expectedX;
  const evaluation = result.evaluation || evaluateBinaryShift({ n: result.explanation.n, x });

  return (
    <section className="campaign-result is-success" data-testid="binary-shift-challenge-result">
      <h3>Challenge complete</h3>
      <p>{result.reason}</p>
      {x !== null && (
        <>
          <dl className="arcade-overview-grid binary-result-grid">
            <div>
              <dt>x</dt>
              <dd>{formatBigInt(x)}</dd>
            </div>
            <div>
              <dt>Binary x</dt>
              <dd>{evaluation.xBinary}</dd>
            </div>
            <div>
              <dt>Shifted</dt>
              <dd>{evaluation.shiftedBinary}</dd>
            </div>
            <div>
              <dt>n x</dt>
              <dd>{formatBigInt(evaluation.product)}</dd>
            </div>
          </dl>
          <div className="theorem-card">
            <h3>Divisibility explanation</h3>
            <p>
              {formatBigInt(result.explanation.divisor)} divides{' '}
              {formatBigInt(result.explanation.mersenne)}, so x ={' '}
              {formatBigInt(result.explanation.mersenne)} / {formatBigInt(result.explanation.divisor)}
              {' '}= {formatBigInt(x)}.
            </p>
          </div>
        </>
      )}
      {x === null && (
        <div className="theorem-card">
          <h3>Divisibility explanation</h3>
          <p>
            {formatBigInt(result.explanation.divisor)} does not divide{' '}
            {formatBigInt(result.explanation.mersenne)}, so no integer x can satisfy the shift rule.
          </p>
        </div>
      )}
      <div className="binary-explanation-grid">
        <div className="theorem-card">
          <h3>The final bit must be 1.</h3>
          <p>A leading 1 appears after the shift, so the original last bit cannot be 0.</p>
        </div>
        <div className="theorem-card">
          <h3>The shift equation gives x = (2^n - 1)/(2n - 1).</h3>
          <p>Moving the final bit to the front turns the binary rotation into a divisibility test.</p>
        </div>
        <div className="theorem-card">
          <h3>A solution exists exactly when (2n - 1) divides (2^n - 1).</h3>
          <p>Here 2n means 2*n, so the divisor is {formatBigInt(result.explanation.divisor)}.</p>
        </div>
        {result.explanation.n === 2 && (
          <div className="theorem-card">
            <h3>First shift</h3>
            <p>For n = 2, x = 1 has binary form 01, and 01 shifts to 10.</p>
          </div>
        )}
        {result.explanation.n === 8 && (
          <div className="theorem-card">
            <h3>Hidden success</h3>
            <p>For n = 8, x = 17 has binary form 00010001, shifting to 10001000.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function BinaryShift({ onBack }) {
  const [mode, setMode] = useState(BINARY_SHIFT_MODES.explorer);
  const [nText, setNText] = useState(DEFAULT_N);
  const [xText, setXText] = useState(DEFAULT_X);
  const [searchNText, setSearchNText] = useState(DEFAULT_SEARCH_N);
  const [countMaxNText, setCountMaxNText] = useState('100');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeXText, setChallengeXText] = useState('');
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(() => loadBinaryShiftProgress());
  const [binaryStats, setBinaryStats] = useState(() => loadBinaryShiftStats());

  const evaluation = useMemo(
    () => evaluateBinaryShift({ n: nText, x: xText }),
    [nText, xText],
  );
  const searchRows = useMemo(() => searchBinaryShift(searchNText), [searchNText]);
  const valuesBelowThousand = useMemo(
    () => countSpecialValuesBelow(1000n, countMaxNText),
    [countMaxNText],
  );
  const valuesBelowTenMillion = useMemo(
    () => countSpecialValuesBelow(10000000n, countMaxNText),
    [countMaxNText],
  );
  const challenge = BINARY_SHIFT_CHALLENGES[challengeIndex];
  const challengeHintsUsed = challengeProgress.hintsUsed[challenge.id] || 0;
  const visibleHints = Array.from({ length: challengeHintsUsed }, (_, index) =>
    getBinaryShiftHint(challenge, index + 1),
  );
  const unlockedAchievements = useMemo(
    () => getUnlockedBinaryShiftAchievements(challengeProgress, binaryStats),
    [challengeProgress, binaryStats],
  );

  const selectChallenge = (index) => {
    const nextChallenge = BINARY_SHIFT_CHALLENGES[index];

    if (!nextChallenge || getBinaryShiftChallengeStatus(nextChallenge.id, challengeProgress) === 'Locked') {
      return;
    }

    setChallengeIndex(index);
    setChallengeXText('');
    setChallengeResult(null);
  };

  const persistProgress = (nextProgress) => {
    setChallengeProgress(nextProgress);
    saveBinaryShiftProgress(nextProgress);
  };

  const persistStats = (nextStats) => {
    setBinaryStats(nextStats);
    saveBinaryShiftStats(nextStats);
  };

  const completeIfSuccessful = (result) => {
    const hintsUsed = challengeProgress.hintsUsed[challenge.id] || 0;
    const stars = calculateBinaryShiftStars(result, hintsUsed);
    const resultWithStars = {
      ...result,
      stars,
    };

    if (result.success) {
      const nextProgress = recordBinaryShiftCompletion(
        challengeProgress,
        challenge.id,
        resultWithStars,
        stars,
      );
      const nextStats = recordBinaryShiftChallengeStats(
        binaryStats,
        challengeProgress,
        nextProgress,
        resultWithStars,
        stars,
      );

      persistProgress(nextProgress);
      persistStats(nextStats);
      setChallengeResult(resultWithStars);
      return;
    }

    persistStats(
      recordBinaryShiftChallengeStats(
        binaryStats,
        challengeProgress,
        challengeProgress,
        resultWithStars,
        stars,
      ),
    );
    setChallengeResult(resultWithStars);
  };

  const checkChallenge = () => {
    completeIfSuccessful(
      evaluateBinaryShiftChallenge(challenge, {
        x: challengeXText,
        declareImpossible: false,
      }),
    );
  };

  const declareImpossible = () => {
    completeIfSuccessful(
      evaluateBinaryShiftChallenge(challenge, {
        declareImpossible: true,
      }),
    );
  };

  const showHint = () => {
    persistProgress(recordBinaryShiftHint(challengeProgress, challenge.id));
    persistStats(recordBinaryShiftHintStat(binaryStats));
  };

  const runSearch = () => {
    persistStats(recordBinaryShiftSearchRun(binaryStats));
  };

  const runBoundsCheck = () => {
    persistStats(recordBinaryShiftBoundsCheck(binaryStats));
  };

  return (
    <main className="arcade-shell binary-shift-page">
      <header className="game-topbar">
        <button className="ghost-action" data-testid="nav-back-lobby" onClick={onBack} type="button">
          Back to Lobby
        </button>
        <div>
          <span className="problem-label">Problem 1</span>
          <h1>Binary Shift</h1>
          <p>Move the last bit to the front. When does that equal multiplication by n?</p>
        </div>
        <span className="status-badge status-playable--experimental">Playable / Experimental</span>
      </header>

      <nav className="segmented-control binary-mode-tabs" aria-label="Binary Shift modes">
        <button
          className={mode === BINARY_SHIFT_MODES.explorer ? 'is-selected' : ''}
          data-testid="binary-shift-mode-explorer"
          onClick={() => setMode(BINARY_SHIFT_MODES.explorer)}
          type="button"
        >
          Explorer
        </button>
        <button
          className={mode === BINARY_SHIFT_MODES.challenge ? 'is-selected' : ''}
          data-testid="binary-shift-mode-challenge"
          onClick={() => setMode(BINARY_SHIFT_MODES.challenge)}
          type="button"
        >
          Special Number Challenge
        </button>
      </nav>

      {mode === BINARY_SHIFT_MODES.explorer ? (
        <>
          <section className="arcade-dashboard binary-layout">
            <section className="arcade-panel">
              <h2>Explorer</h2>
              <div className="binary-input-grid">
                <label className="temporal-field">
                  n
                  <input
                    data-testid="binary-shift-n-input"
                    min="1"
                    onChange={(event) => setNText(event.target.value)}
                    type="number"
                    value={nText}
                  />
                </label>
                <label className="temporal-field">
                  x
                  <input
                    data-testid="binary-shift-x-input"
                    min="1"
                    onChange={(event) => setXText(event.target.value)}
                    type="number"
                    value={xText}
                  />
                </label>
              </div>

              <dl className="arcade-overview-grid binary-result-grid" data-testid="binary-shift-verdict">
                <div>
                  <dt>x</dt>
                  <dd>{formatBigInt(evaluation.x)}</dd>
                </div>
                <div>
                  <dt>n x</dt>
                  <dd>{formatBigInt(evaluation.product)}</dd>
                </div>
                <div>
                  <dt>2^n</dt>
                  <dd>{formatBigInt(evaluation.bound)}</dd>
                </div>
                <div>
                  <dt>Shifted value</dt>
                  <dd>{formatBigInt(evaluation.shiftedValue)}</dd>
                </div>
              </dl>

              <div className="binary-check-list">
                <VerdictPill pass={evaluation.xInBounds}>x &lt; 2^n</VerdictPill>
                <VerdictPill pass={evaluation.productInBounds}>n x &lt; 2^n</VerdictPill>
                <VerdictPill pass={evaluation.productMatchesShift}>n x equals shifted result</VerdictPill>
                <VerdictPill pass={evaluation.lastBitIsOne}>last bit is 1</VerdictPill>
              </div>

              <div
                className={`campaign-result ${evaluation.special ? 'is-success' : 'is-failure'}`}
                data-testid="binary-shift-final-verdict"
              >
                <h3>{!evaluation.valid ? 'Invalid input' : evaluation.special ? 'Special' : 'Not special'}</h3>
                {!evaluation.valid ? <p role="alert">{evaluation.error}</p> : <p>
                  Divisibility condition:{' '}
                  {formatBigInt(evaluation.formulaDivisor)} divides {formatBigInt(evaluation.formulaDividend)}
                  {' '}is {evaluation.formulaDivisible ? 'true' : 'false'}.
                </p>}
              </div>
            </section>

            <section className="arcade-panel">
              <h2>Shift Visualization</h2>
              <div className="binary-shift-visual" data-testid="binary-shift-visualization">
                <BitRow label="x bits" bits={evaluation.xBinary} />
                <BitRow label="shifted" bits={evaluation.shiftedBinary} />
                <BitRow label="n x" bits={evaluation.productBinary} />
              </div>
              <div className="theorem-card">
                <h3>Multiplication check</h3>
                <p>
                  {formatBigInt(evaluation.x)} x {evaluation.n} = {formatBigInt(evaluation.product)}.
                  The shifted binary value is {formatBigInt(evaluation.shiftedValue)}.
                </p>
              </div>
              <div className="theorem-card">
                <h3>Formula</h3>
                <p>A special number ends in 1. The rotation equation then gives:</p>
                <MathEquation id="binary" />
              </div>
            </section>
          </section>

          <section className="arcade-panel">
            <div className="panel-heading-row binary-search-heading">
              <h2>Pattern Panel</h2>
              <label className="temporal-field">
                Search through N
                <input
                  data-testid="binary-shift-search-n"
                  min="2"
                  onChange={(event) => setSearchNText(event.target.value)}
                  type="number"
                  value={searchNText}
                />
              </label>
              <button data-testid="binary-shift-run-search" onClick={runSearch} type="button">
                Run Search
              </button>
            </div>
            <div tabIndex={0} className="experiment-table-wrap">
              <table className="experiment-table binary-search-table" data-testid="binary-shift-search-table">
                <thead>
                  <tr>
                    <th>n</th>
                    <th>2^n - 1</th>
                    <th>2n - 1</th>
                    <th>Divisible?</th>
                    <th>x</th>
                    <th>Binary x</th>
                    <th>Special?</th>
                  </tr>
                </thead>
                <tbody>
                  {searchRows.map((row) => (
                    <tr className={row.knownSmallExample ? 'is-known-example' : ''} key={row.n}>
                      <td>{row.n}</td>
                      <td>{formatBigInt(row.mersenne)}</td>
                      <td>{formatBigInt(row.divisor)}</td>
                      <td>{row.divisible ? 'Yes' : 'No'}</td>
                      <td>{formatBigInt(row.x)}</td>
                      <td>{row.binaryX}</td>
                      <td>{row.special ? 'Special' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="arcade-dashboard binary-layout">
            <section className="arcade-panel">
              <h2>Bounds Tools</h2>
              <label className="temporal-field">
                Search n up to
                <input
                  data-testid="binary-shift-count-max-n"
                  min="2"
                  onChange={(event) => setCountMaxNText(event.target.value)}
                  type="number"
                value={countMaxNText}
              />
            </label>
              <div className="campaign-actions">
                <button data-testid="binary-shift-run-bounds" onClick={runBoundsCheck} type="button">
                  Run Bounds Check
                </button>
              </div>
              <ValuesFound
                rows={valuesBelowThousand}
                testId="binary-shift-count-1000"
                title={`Special x < 1000: ${valuesBelowThousand.length}`}
              />
              <ValuesFound
                rows={valuesBelowTenMillion}
                testId="binary-shift-count-10000000"
                title={`Special x < 10,000,000: ${valuesBelowTenMillion.length}`}
              />
            </section>

            <section className="arcade-panel">
              <h2>Known Small Examples</h2>
              <div className="binary-example-grid">
                <button
                  data-testid="binary-shift-example-n2"
                  onClick={() => {
                    setNText('2');
                    setXText('1');
                  }}
                  type="button"
                >
                  <strong>n = 2, x = 1</strong>
                  <span>01 shifts to 10</span>
                </button>
                <button
                  data-testid="binary-shift-example-n8"
                  onClick={() => {
                    setNText('8');
                    setXText('17');
                  }}
                  type="button"
                >
                  <strong>n = 8, x = 17</strong>
                  <span>00010001 shifts to 10001000</span>
                </button>
              </div>
            </section>
          </section>
        </>
      ) : (
        <>
          <section className="arcade-dashboard binary-layout">
            <section className="arcade-panel">
              <h2>Challenge List</h2>
              <div className="binary-challenge-list" data-testid="binary-shift-challenge-list">
                {BINARY_SHIFT_CHALLENGES.map((item, index) => {
                  const completed = Boolean(challengeProgress.completed[item.id]);
                  const hints = challengeProgress.hintsUsed[item.id] || 0;
                  const status = getBinaryShiftChallengeStatus(item.id, challengeProgress);
                  const locked = status === 'Locked';
                  const answerStatus = challengeProgress.bestAnswerStatus[item.id] || '-';
                  const starRating = challengeProgress.highestStars[item.id] || BINARY_SHIFT_STARS.none;

                  return (
                    <button
                      className={[
                        index === challengeIndex ? 'is-selected' : '',
                        completed ? 'is-completed' : '',
                        locked ? 'is-locked' : '',
                      ].filter(Boolean).join(' ')}
                      data-testid={`binary-shift-challenge-${item.id}`}
                      disabled={locked}
                      key={item.id}
                      onClick={() => selectChallenge(index)}
                      type="button"
                    >
                      <span>Level {index + 1} - {status}</span>
                      <strong>{item.title}</strong>
                      <em>n = {item.n}</em>
                      <em>Best answer: {answerStatus}</em>
                      <em>Hint level used: {hints}/3</em>
                      <StarDisplay rating={starRating} />
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="arcade-panel">
              <h2>Special Number Challenge</h2>
              <div className="binary-challenge-heading">
                <span>Target n = {challenge.n}</span>
                <h3>{challenge.title}</h3>
                <p>{challenge.lesson}</p>
              </div>
              <label className="temporal-field">
                Candidate x
                <input
                  data-testid="binary-shift-challenge-x-input"
                  min="1"
                  onChange={(event) => {
                    setChallengeXText(event.target.value);
                    setChallengeResult(null);
                  }}
                  type="number"
                  value={challengeXText}
                />
              </label>
              <div className="campaign-actions binary-challenge-actions">
                <button data-testid="binary-shift-challenge-check" onClick={checkChallenge} type="button">
                  Check
                </button>
                <button
                  data-testid="binary-shift-challenge-impossible"
                  onClick={declareImpossible}
                  type="button"
                >
                  Declare Impossible
                </button>
                <button data-testid="binary-shift-challenge-hint" onClick={showHint} type="button">
                  Hint
                </button>
              </div>
            </section>
          </section>

          <section className="arcade-dashboard binary-layout">
            <section className="arcade-panel">
              <h2>Hints</h2>
              {visibleHints.length ? (
                <ol className="binary-hint-list" data-testid="binary-shift-hint-list">
                  {visibleHints.map((hint, index) => (
                    <li key={hint}>
                      <strong>Hint {index + 1}</strong>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="panel-note">Use hints to reveal the divisibility test one step at a time.</p>
              )}
            </section>

            <section className="arcade-panel">
              <h2>Result</h2>
              {challengeResult ? (
                challengeResult.success ? (
                  <>
                    <SuccessPanel result={challengeResult} />
                    <div className="result-stars">
                      <span>Stars earned</span>
                      <StarDisplay rating={challengeResult.stars} />
                    </div>
                  </>
                ) : (
                  <section className="campaign-result is-failure" data-testid="binary-shift-challenge-result">
                    <h3>Not yet</h3>
                    <p>{challengeResult.reason}</p>
                  </section>
                )
              ) : (
                <p className="panel-note">
                  Enter x if a solution exists, or declare impossible if the divisibility condition fails.
                </p>
              )}
            </section>
          </section>

          <section className="arcade-dashboard binary-layout">
            <section className="arcade-panel">
              <h2>Statistics</h2>
              <dl className="arcade-overview-grid binary-result-grid" data-testid="binary-shift-stats-panel">
                <div>
                  <dt>Attempts</dt>
                  <dd>{binaryStats.challengeAttempts}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{binaryStats.challengesCompleted}</dd>
                </div>
                <div>
                  <dt>Correct x</dt>
                  <dd>{binaryStats.correctXSubmissions}</dd>
                </div>
                <div>
                  <dt>Correct impossible</dt>
                  <dd>{binaryStats.correctImpossibleDeclarations}</dd>
                </div>
                <div>
                  <dt>Incorrect</dt>
                  <dd>{binaryStats.incorrectSubmissions}</dd>
                </div>
                <div>
                  <dt>Hints</dt>
                  <dd>{binaryStats.hintsUsed}</dd>
                </div>
                <div>
                  <dt>Gold</dt>
                  <dd>{binaryStats.goldCompletions}</dd>
                </div>
                <div>
                  <dt>Search / Bounds</dt>
                  <dd>{binaryStats.searchesRun} / {binaryStats.boundsChecksRun}</dd>
                </div>
              </dl>
            </section>

            <section className="arcade-panel">
              <h2>Local Achievements</h2>
              <div className="achievement-list" data-testid="binary-shift-achievement-list">
                {unlockedAchievements.length ? (
                  unlockedAchievements.map((achievement) => (
                    <div data-testid={`binary-shift-achievement-${achievement.id}`} key={achievement.id}>
                      <strong>{achievement.title}</strong>
                      <span>{achievement.description}</span>
                    </div>
                  ))
                ) : (
                  <p className="panel-note">Complete a special-number challenge to unlock achievements.</p>
                )}
              </div>
            </section>
          </section>
        </>
      )}
    </main>
  );
}
