import { useMemo, useState } from 'react';
import MathEquation from '../../components/MathEquation.jsx';
import { numberForgeInsight } from '../../research/editorial.js';
import { ResearchLink } from '../../research/ResearchPanel.jsx';
import {
  completeNumberForgeChallenge,
  calculateChallengeStars,
  evaluateChallengeAttempt,
  getChallengeStatus,
  getImpossibleHint,
  getInsightCard,
  loadNumberForgeProgress,
  NUMBER_FORGE_CHALLENGES,
  saveNumberForgeProgress,
  validateChallenge,
} from './challenges.js';
import {
  getUnlockedAchievements,
  loadNumberForgeStats,
  recordNumberForgeAttempt,
  saveNumberForgeStats,
} from './stats.js';
import {
  analyzeReachability,
  analyzeResidueClasses,
  detectReduction,
  getModularExplanation,
  getParityCounts,
  getPrismResultCard,
  getReachabilityRows,
  getReachabilityStats,
  recoverRepresentation,
  suggestModuli,
} from './logic.js';
import { recordTheoremCardOpened } from '../../profile/profile.js';

const DEFAULT_GENERATORS = '9, 15, 25';
const DEFAULT_TARGET = 43;
const DEFAULT_MAX = 200;
const GENERATOR_PRESETS = [
  { id: 'default', label: '9,15,25', value: '9, 15, 25' },
  { id: 'alt-prism', label: '9,21,49', value: '9, 21, 49' },
  { id: 'three-five', label: '3,5', value: '3, 5' },
  { id: 'three-seven', label: '3,7', value: '3, 7' },
  { id: 'custom', label: 'Custom', value: null },
];
const NUMBER_FORGE_MODES = {
  explorer: 'explorer',
  challenge: 'challenge',
};

function parseGeneratorText(text) {
  if (text.length > 500) return [];
  return text
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(Number);
}

function formatGap(gap) {
  if (!gap.length) {
    return 'None';
  }

  return gap.start === gap.end
    ? `${gap.start} (length 1)`
    : `${gap.start}-${gap.end} (length ${gap.length})`;
}

function formatSet(values) {
  return values.length ? `{${values.join(', ')}}` : '{}';
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

export default function NumberForge({ onBack }) {
  const [mode, setMode] = useState(NUMBER_FORGE_MODES.explorer);
  const [generatorText, setGeneratorText] = useState(DEFAULT_GENERATORS);
  const [targetText, setTargetText] = useState(String(DEFAULT_TARGET));
  const [maxText, setMaxText] = useState(String(DEFAULT_MAX));
  const [selectedPresetId, setSelectedPresetId] = useState('default');
  const [modulusText, setModulusText] = useState('3');
  const [tableVisible, setTableVisible] = useState(false);
  const [largestMessage, setLargestMessage] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeAdditions, setChallengeAdditions] = useState([]);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeHint, setChallengeHint] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [reductionOpened, setReductionOpened] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState(() => loadNumberForgeProgress());
  const [forgeStats, setForgeStats] = useState(() => loadNumberForgeStats());

  const generatorInputError = !generatorText.trim() || generatorText.length > 500 || parseGeneratorText(generatorText).length > 12 ||
    parseGeneratorText(generatorText).some((value) => !Number.isSafeInteger(value) || value < 1);
  const generators = useMemo(() => generatorInputError ? [] : parseGeneratorText(generatorText), [generatorText, generatorInputError]);
  const maxValue = Math.max(0, Math.min(10000, Math.floor(Number(maxText) || 0)));
  const target = Number(targetText);
  const targetInputValid = /^\d+$/.test(targetText.trim()) && Number.isSafeInteger(target) && target >= 0;
  const analysis = useMemo(
    () => analyzeReachability(generators, maxValue),
    [generators, maxValue],
  );
  const stats = useMemo(() => getReachabilityStats(analysis), [analysis]);
  const suggestedModuli = useMemo(() => suggestModuli(analysis.generators), [analysis.generators]);
  const modulus = Math.max(1, Math.min(128, Math.floor(Number(modulusText) || suggestedModuli[0] || 1)));
  const residueClasses = useMemo(
    () => analyzeResidueClasses(analysis, modulus),
    [analysis, modulus],
  );
  const modularExplanation = useMemo(
    () => getModularExplanation(analysis.generators, modulus),
    [analysis.generators, modulus],
  );
  const parityCounts = useMemo(() => getParityCounts(analysis), [analysis]);
  const reduction = useMemo(
    () => detectReduction(analysis.generators, analysis.max),
    [analysis.generators, analysis.max],
  );
  const prismResult = useMemo(
    () => getPrismResultCard(analysis.generators),
    [analysis.generators],
  );
  const representation = useMemo(
    () => recoverRepresentation(analysis, target),
    [analysis, target],
  );
  const rows = useMemo(() => getReachabilityRows(analysis), [analysis]);
  const targetInRange = targetInputValid && target <= analysis.max;
  const targetReachable = !generatorInputError && targetInRange && analysis.reachable[target];
  const densityPercent = (stats.density * 100).toFixed(1);
  const challenge = NUMBER_FORGE_CHALLENGES[challengeIndex];
  const challengeSum = challengeAdditions.reduce((sum, value) => sum + value, 0);
  const challengeDistance = challenge.target - challengeSum;
  const challengeValidation = useMemo(() => validateChallenge(challenge), [challenge]);
  const achievements = useMemo(
    () => getUnlockedAchievements(challengeProgress, forgeStats),
    [challengeProgress, forgeStats],
  );

  const resetChallengeRun = () => {
    setChallengeAdditions([]);
    setChallengeMessage('');
    setChallengeResult(null);
    setChallengeHint('');
    setHintUsed(false);
    setReductionOpened(false);
  };

  const startChallenge = (index) => {
    setChallengeIndex(index);
    resetChallengeRun();
  };

  const recordAttempt = (result, declaredImpossible) => {
    const outcome = {
      success: result.success,
      declaredImpossible,
      hintUsed,
      reductionOpened,
      moveCount: challengeAdditions.length,
      stars: calculateChallengeStars(challenge, {
        success: result.success,
        hintUsed,
        reductionOpened,
        moveCount: challengeAdditions.length,
      }),
    };

    setForgeStats((stats) => {
      const next = recordNumberForgeAttempt(stats, outcome);
      saveNumberForgeStats(next);
      return next;
    });

    if (!result.success) {
      setChallengeResult({
        ...outcome,
        reason: result.reason,
      });
      return;
    }

    setChallengeProgress((progress) => {
      const next = completeNumberForgeChallenge(
        progress,
        challenge,
        challengeAdditions.length,
        hintUsed,
        outcome.stars,
      );

      saveNumberForgeProgress(next);
      return next;
    });

    setChallengeResult({
      ...outcome,
      reason: result.reason,
      expression: challengeAdditions.join(' + '),
      insight: getInsightCard(challenge),
    });
    recordTheoremCardOpened();
  };

  const submitChallenge = () => {
    const result = evaluateChallengeAttempt(challenge, challengeSum, false);
    setChallengeMessage(result.reason);
    recordAttempt(result, false);
  };

  const declareImpossible = () => {
    const result = evaluateChallengeAttempt(challenge, challengeSum, true);
    setChallengeMessage(result.reason);
    recordAttempt(result, true);
  };

  const showChallengeHint = () => {
    setHintUsed(true);

    if (challengeValidation.reachable) {
      setChallengeHint(`One construction: ${challengeValidation.representation.join(' + ')}`);
      return;
    }

    setChallengeHint(getImpossibleHint(challenge));
  };

  const openReductionExplanation = () => {
    setReductionOpened(true);
    setChallengeHint(getImpossibleHint(challenge));
  };

  const nextChallenge = () => {
    startChallenge(Math.min(challengeIndex + 1, NUMBER_FORGE_CHALLENGES.length - 1));
  };

  const handleFindLargest = () => {
    setLargestMessage(
      stats.largestUnreachable === null
        ? 'Every number in the current range is reachable.'
        : `Largest unreachable currently found: ${stats.largestUnreachable}`,
    );
  };

  const handleExport = async () => {
    const payload = JSON.stringify(
      {
        generators: analysis.generators,
        max: analysis.max,
        rows,
        stats,
      },
      null,
      2,
    );

    try {
      await navigator.clipboard?.writeText(payload);
      setExportMessage('Reachability data copied.');
    } catch {
      setExportMessage('Reachability data prepared.');
    }
  };

  const handlePreset = (preset) => {
    setSelectedPresetId(preset.id);

    if (preset.value) {
      const nextGenerators = parseGeneratorText(preset.value);
      const nextSuggestions = suggestModuli(nextGenerators);

      setGeneratorText(preset.value);
      setModulusText(String(nextSuggestions[0] || 1));
      setLargestMessage('');
      setExportMessage('');
    }
  };

  return (
    <main className="arcade-shell game-page number-forge-page">
      <header className="game-topbar">
        <button
          className="ghost-action"
          data-testid="nav-back-lobby"
          onClick={onBack}
          aria-label="Back to lobby"
        >
          <span aria-hidden="true">&lt;-</span>
          Lobby
        </button>
        <div>
          <p className="problem-label">Problem 3</p>
          <h1>Number Forge</h1>
        </div>
        <button
          className="ghost-action"
          data-testid="number-forge-reset"
          onClick={() => {
            setGeneratorText(DEFAULT_GENERATORS);
            setSelectedPresetId('default');
            setModulusText('3');
            setTargetText(String(DEFAULT_TARGET));
            setMaxText(String(DEFAULT_MAX));
            setTableVisible(false);
            setLargestMessage('');
            setExportMessage('');
          }}
        >
          Reset
        </button>
      </header>

      <section className="game-layout forge-layout">
        <aside className="control-panel">
          <section>
            <h2>Mode</h2>
            <div className="segmented-control" role="group" aria-label="Number Forge mode">
              <button
                className={mode === NUMBER_FORGE_MODES.explorer ? 'is-selected' : ''}
                data-testid="number-forge-mode-explorer"
                onClick={() => setMode(NUMBER_FORGE_MODES.explorer)}
              >
                Explorer
              </button>
              <button
                className={mode === NUMBER_FORGE_MODES.challenge ? 'is-selected' : ''}
                data-testid="number-forge-mode-challenge"
                onClick={() => setMode(NUMBER_FORGE_MODES.challenge)}
              >
                Target Challenge
              </button>
            </div>
          </section>
          {mode === NUMBER_FORGE_MODES.challenge ? (
            <>
              <section className="campaign-map-card">
                <h2>Challenge List</h2>
                <div className="campaign-level-list forge-challenge-list">
                  {NUMBER_FORGE_CHALLENGES.map((level, index) => {
                    const status = getChallengeStatus(level, index, challengeProgress);
                    const isLocked = status === 'Locked';
                    const stars = challengeProgress.highestStars[level.id] || 0;

                    return (
                      <button
                        className={[
                          index === challengeIndex ? 'is-selected' : '',
                          `is-${status.toLowerCase()}`,
                        ].join(' ')}
                        disabled={isLocked}
                        data-testid={`number-forge-challenge-${level.id}`}
                        key={level.id}
                        onClick={() => startChallenge(index)}
                        type="button"
                      >
                        <span>#{index + 1}</span>
                        <strong>{level.title}</strong>
                        <em>{status}</em>
                        <span>Target {level.target}</span>
                        <span>{level.generators.join(', ')}</span>
                        <span>Best {challengeProgress.bestMoves[level.id] ?? '-'}</span>
                        <span className="map-stars">
                          <StarDisplay rating={stars} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <>
          <section>
            <h2>Generator Set</h2>
            <div className="challenge-presets forge-presets">
              {GENERATOR_PRESETS.map((preset) => (
                <button
                  className={selectedPresetId === preset.id ? 'is-selected' : ''}
                  key={preset.id}
                  onClick={() => handlePreset(preset)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="temporal-field">
              Generators
              <input
                onChange={(event) => {
                  setGeneratorText(event.target.value);
                  setSelectedPresetId('custom');
                }}
                value={generatorText}
              />
            </label>
            <p className="panel-note">Use commas or spaces. Default generators are 9, 15, and 25.</p>
            <div className="generator-chip-row">
              {analysis.generators.map((generator) => (
                <span key={generator}>{generator}</span>
              ))}
            </div>
          </section>

          <section>
            <h2>Target Number</h2>
            <label className="temporal-field">
              n
              <input
                min="0"
                onChange={(event) => setTargetText(event.target.value)}
                type="number"
                value={targetText}
              />
            </label>
            <label className="temporal-field">
              Number line max
              <input
                min="0"
                onChange={(event) => setMaxText(event.target.value)}
                type="number"
                value={maxText}
              />
            </label>
          </section>

          <section>
            <h2>Exploration Tools</h2>
            <div className="timeline-actions">
              <button onClick={() => setTableVisible((value) => !value)}>
                Generate Reachability Table
              </button>
              <button onClick={handleFindLargest}>Find Largest Unreachable</button>
              <button onClick={handleExport}>Export Reachability Data</button>
            </div>
            {largestMessage && <p className="panel-note">{largestMessage}</p>}
            {exportMessage && <p className="panel-note">{exportMessage}</p>}
          </section>

          <section>
            <h2>Residue Class Explorer</h2>
            <label className="temporal-field">
              Modulus m
              <input
                min="1"
                onChange={(event) => setModulusText(event.target.value)}
                type="number"
                value={modulusText}
              />
            </label>
            <div className="generator-chip-row">
              {suggestedModuli.map((suggestion) => (
                <button
                  className={suggestion === modulus ? 'is-selected' : ''}
                  key={suggestion}
                  onClick={() => setModulusText(String(suggestion))}
                  type="button"
                >
                  mod {suggestion}
                </button>
              ))}
            </div>
          </section>
            </>
          )}
        </aside>

        <section className="board-stage forge-stage" aria-label="Number Forge explorer">
          {mode === NUMBER_FORGE_MODES.challenge ? (
            <div className="forge-challenge-stage">
              <div className="forge-result-card">
                <p className="problem-label">
                  {challenge.impossible ? 'Impossible Challenge' : 'Target Challenge'}
                </p>
                <h2>{challenge.title}</h2>
                <p className="panel-note">{challenge.lesson}</p>
                <div className="challenge-meta-grid">
                  <span>Target {challenge.target}</span>
                  <span>Current {challengeSum}</span>
                  <span>Distance {challengeDistance}</span>
                  <span>Move limit {challenge.moveLimit ?? 'None'}</span>
                </div>
              </div>

              <div className="forge-result-card">
                <h2>{challengeSum}</h2>
                <p className="forge-construction">
                  {challengeAdditions.length ? challengeAdditions.join(' + ') : 'Start forging...'}
                </p>
                <div className="generator-button-grid">
                  {challenge.generators.map((generator) => (
                    <button
                      key={generator}
                      data-testid={`number-forge-generator-${generator}`}
                      onClick={() => {
                        setChallengeAdditions((values) => [...values, generator]);
                        setChallengeMessage('');
                      }}
                      type="button"
                    >
                      +{generator}
                    </button>
                  ))}
                </div>
                <div className="campaign-actions">
                  <button
                    disabled={!challengeAdditions.length}
                    data-testid="number-forge-challenge-undo"
                    onClick={() => setChallengeAdditions((values) => values.slice(0, -1))}
                  >
                    Undo
                  </button>
                  <button data-testid="number-forge-challenge-reset" onClick={resetChallengeRun}>
                    Reset
                  </button>
                  <button data-testid="number-forge-challenge-submit" onClick={submitChallenge}>
                    Submit
                  </button>
                  <button
                    data-testid="number-forge-declare-impossible"
                    onClick={declareImpossible}
                  >
                    Declare Impossible
                  </button>
                  {challenge.impossible && (
                    <button
                      data-testid="number-forge-open-reduction"
                      onClick={openReductionExplanation}
                    >
                      Open Reduction Explanation
                    </button>
                  )}
                  <button data-testid="number-forge-challenge-hint" onClick={showChallengeHint}>
                    Hint
                  </button>
                </div>
                {challengeMessage && <p className="panel-note">{challengeMessage}</p>}
                {challengeHint && <p className="panel-note">{numberForgeInsight(challenge, challengeHint)}</p>}
              </div>
              {challengeResult && (
                <div
                  className={`campaign-result ${challengeResult.success ? 'is-success' : 'is-failure'}`}
                >
                  {challengeResult.success ? (
                    <>
                      <h3>Challenge Complete</h3>
                      <p>Expression found: {challengeResult.expression || 'Declared impossible'}</p>
                      <p>Generators used: {challengeResult.moveCount}</p>
                      <div className="result-stars">
                        <span>Stars earned</span>
                        <StarDisplay rating={challengeResult.stars} />
                      </div>
                      <p>{challenge.lesson}</p>
                      <div className="theorem-card">
                        <h3>Mathematical Insight</h3>
                        <p>{numberForgeInsight(challenge, challengeResult.insight)}</p>
                      </div>
                      <div className="campaign-actions">
                        <button
                          disabled={challengeIndex === NUMBER_FORGE_CHALLENGES.length - 1}
                          data-testid="number-forge-next-challenge"
                          onClick={nextChallenge}
                        >
                          Next Challenge
                        </button>
                        <button data-testid="number-forge-replay-challenge" onClick={resetChallengeRun}>
                          Replay Challenge
                        </button>
                        <button
                          data-testid="number-forge-return-explorer"
                          onClick={() => setMode(NUMBER_FORGE_MODES.explorer)}
                        >
                          Return to Explorer
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>Not Yet</h3>
                      <p>Current sum: {challengeSum}</p>
                      <p>Distance from target: {Math.abs(challengeDistance)}</p>
                      <p>{challengeResult.reason}</p>
                      <p>Use the hint if the modular structure is not visible yet.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
          <div className="forge-result-card">
            <p className="problem-label">Target {targetInputValid ? `#${target}` : 'not checked'}</p>
            <h2>{generatorInputError || !targetInRange ? 'Not checked' : targetReachable ? 'Reachable' : 'Unreachable'}</h2>
            {generatorInputError && <p role="alert">Enter one to twelve positive integers below 2^53, using at most 500 characters.</p>}
            {targetReachable ? (
              <p className="forge-construction">{representation.join(' + ') || '0'}</p>
            ) : (
              <p className="forge-construction">{generatorInputError || !targetInRange ? 'No representation check performed.' : 'No representation found.'}</p>
            )}
            {!targetInRange && (
              <p className="panel-note">{targetInputValid ? `This target is outside 0-${analysis.max}. The largest supported range ends at 10,000.` : 'Enter a nonnegative whole-number target without exponent notation.'}</p>
            )}
          </div>

          <div className="number-line-panel">
            <div className="number-line-heading">
              <span>0</span>
              <strong>Reachability Number Line</strong>
              <span>{analysis.max}</span>
            </div>
            <div className="number-line-grid">
              {analysis.reachable.map((isReachable, value) => (
                <button
                  aria-label={`${value} is ${isReachable ? 'reachable' : 'unreachable'}`}
                  className={[
                    'number-cell',
                    isReachable ? 'is-reachable' : 'is-unreachable',
                    value === target ? 'is-target' : '',
                  ].join(' ')}
                  key={value}
                  onClick={() => setTargetText(String(value))}
                  title={`${value}: ${isReachable ? 'reachable' : 'unreachable'}`}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
            </>
          )}
        </section>

        <aside className="score-panel">
          {mode === NUMBER_FORGE_MODES.challenge ? (
            <>
              <section>
                <h2>Challenge Analysis</h2>
                <dl className="score-grid">
                  <div>
                    <dt>Reachable?</dt>
                    <dd>{challengeValidation.reachable ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt>Moves</dt>
                    <dd>{challengeAdditions.length}</dd>
                  </div>
                  <div>
                    <dt>Best moves</dt>
                    <dd>{challengeProgress.bestMoves[challenge.id] ?? '-'}</dd>
                  </div>
                  <div>
                    <dt>Hint used</dt>
                    <dd>{challengeProgress.hintsUsed[challenge.id] || hintUsed ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              </section>
              <section className="strategy-panel temporal-stats-panel">
                <h2>Forge Statistics</h2>
                <dl className="score-grid">
                  <div>
                    <dt>Attempts</dt>
                    <dd>{forgeStats.challengesAttempted}</dd>
                  </div>
                  <div>
                    <dt>Completed</dt>
                    <dd>{forgeStats.challengesCompleted}</dd>
                  </div>
                  <div>
                    <dt>Correct impossible</dt>
                    <dd>{forgeStats.impossibleDeclarationsCorrect}</dd>
                  </div>
                  <div>
                    <dt>Wrong impossible</dt>
                    <dd>{forgeStats.impossibleDeclarationsIncorrect}</dd>
                  </div>
                  <div>
                    <dt>Hints used</dt>
                    <dd>{forgeStats.hintsUsed}</dd>
                  </div>
                  <div>
                    <dt>Gold completions</dt>
                    <dd>{forgeStats.bestGoldCompletions}</dd>
                  </div>
                </dl>
              </section>
              <section className="strategy-panel">
                <h2>Achievements</h2>
                {achievements.length ? (
                  <div className="achievement-list">
                    {achievements.map((achievement) => (
                      <div key={achievement.id}>
                        <strong>{achievement.title}</strong>
                        <span>{achievement.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Complete a challenge to unlock achievements.</p>
                )}
              </section>
              <section className="strategy-panel">
                <h2>Challenge Rule</h2>
                {challenge.impossible ? (
                  <p>This target is unreachable. Your goal is to identify it as impossible.</p>
                ) : (
                  <p>Reach the target exactly by adding generators.</p>
                )}
              </section>
            </>
          ) : (
            <>
          <section>
            <h2>Pattern Panel</h2>
            <dl className="score-grid">
              <div>
                  <dt>Largest unreachable in computed range</dt>
                <dd>{stats.largestUnreachable ?? 'None'}</dd>
              </div>
              <div>
                <dt>Density</dt>
                <dd>{densityPercent}%</dd>
              </div>
              <div>
                <dt>Reachable</dt>
                <dd>{stats.reachableCount}/{stats.totalCount}</dd>
              </div>
              <div>
                <dt>Longest gap</dt>
                <dd>{formatGap(stats.longestGap)}</dd>
              </div>
            </dl>
          </section>

          <section className="strategy-panel">
            <h2>Analysis</h2>
            <p>Reachable? {generatorInputError || !targetInRange ? 'Not checked for this input' : targetReachable ? 'Yes' : 'No'}</p>
            {targetReachable ? (
              <p>One construction: {representation.join(' + ') || '0'}</p>
            ) : (
              <p>{generatorInputError || !targetInRange ? 'No representation check performed.' : 'No representation found.'}</p>
            )}
          </section>

          <section className="strategy-panel parity-panel">
            <h2>Parity Counts</h2>
            <dl className="score-grid">
              <div>
                <dt>Unreachable odd</dt>
                <dd>{parityCounts.unreachableOdd}</dd>
              </div>
              <div>
                <dt>Unreachable even</dt>
                <dd>{parityCounts.unreachableEven}</dd>
              </div>
              <div>
                <dt>Reachable odd</dt>
                <dd>{parityCounts.reachableOdd}</dd>
              </div>
              <div>
                <dt>Reachable even</dt>
                <dd>{parityCounts.reachableEven}</dd>
              </div>
            </dl>
          </section>

          <section className="strategy-panel modular-explanation-panel">
            <h2>Modular Explanation</h2>
            <ul className="modular-residue-list">
              {modularExplanation.residues.map(({ generator, residue }) => (
                <li key={generator}>
                  {generator} = {residue} mod {modularExplanation.modulus}
                </li>
              ))}
            </ul>
            <p>{modularExplanation.summary}</p>
          </section>

          <section className="strategy-panel reduction-engine-panel">
            <ResearchLink portalId="number-forge">Investigate the reduction / Software Correction</ResearchLink>
            <h2>Reduction Engine</h2>
            {reduction ? (
              <>
                <MathEquation id="semigroup" />
                <dl className="reduction-summary">
                  <div>
                    <dt>Modulus</dt>
                    <dd>{reduction.modulus}</dd>
                  </div>
                  <div>
                    <dt>Divisible generators</dt>
                    <dd>{reduction.divisibleGenerators.join(', ')}</dd>
                  </div>
                  <div>
                    <dt>Residue controller</dt>
                    <dd>{reduction.controllerGenerator}</dd>
                  </div>
                  <div>
                    <dt>Reduced generator set</dt>
                    <dd>{reduction.reducedGenerators.join(', ')}</dd>
                  </div>
                </dl>
                <div className="reduction-equation">
                  <p>
                    N = {reduction.divisibleGenerators.join('a + ')}b +{' '}
                    {reduction.controllerGenerator}c
                  </p>
                  <p>
                    N = {reduction.modulus}({reduction.reducedGenerators.join('a + ')}b) +{' '}
                    {reduction.controllerGenerator}c
                  </p>
                  <p>
                    Since {reduction.controllerGenerator} = 1 mod {reduction.modulus}, c controls
                    N mod {reduction.modulus}.
                  </p>
                </div>
                <div className="reduced-forge-card">
                  <h3>Reduced Forge</h3>
                  <p>
                    {reduction.reducedGenerators.join('a + ')}b misses{' '}
                    {formatSet(reduction.reducedMissingValues)}
                  </p>
                </div>
                <div className="reduction-residue-list">
                  {reduction.residueClasses.map((entry) => (
                    <div key={entry.residue}>
                      <strong>Residue {entry.residue}</strong>
                      <span>Smallest c: {entry.controllerCount}</span>
                      <span>Base offset: {entry.baseOffset}</span>
                      <span>Reduced equation: {entry.reducedEquation}</span>
                      <span>Lifted misses: {formatSet(entry.liftedMissingValues)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p>No certified reduction applies. Knowing the controller's residue is not enough; its extra multiples must already lie in the reduced semigroup.</p>
            )}
          </section>

          {prismResult && (
            <section className="strategy-panel prism-result-panel">
              <h2>PRISM Result</h2>
              <dl className="score-grid">
                <div>
                  <dt>Missed odd</dt>
                  <dd>{prismResult.missedOdd}</dd>
                </div>
                <div>
                  <dt>Missed even</dt>
                  <dd>{prismResult.missedEven}</dd>
                </div>
                <div>
                  <dt>Largest missed</dt>
                  <dd>{prismResult.largestMissed}</dd>
                </div>
                <div>
                  <dt>All reachable from</dt>
                  <dd>{prismResult.allReachableFrom}</dd>
                </div>
              </dl>
              <p>All N &gt;= {prismResult.allReachableFrom} are reachable.</p>
            </section>
          )}

          <section className="strategy-panel residue-panel">
            <h2>Residue Classes mod {modulus}</h2>
            <div tabIndex={0} className="residue-table">
              {residueClasses.map((entry) => (
                <div key={entry.residue}>
                  <strong>r = {entry.residue}</strong>
                  <span>Reachable: {entry.reachableNumbers.join(', ') || 'None'}</span>
                  <span>Unreachable: {entry.unreachableNumbers.join(', ') || 'None'}</span>
                  <span>Smallest reachable: {entry.smallestReachable ?? 'None'}</span>
                  <span>Largest unreachable: {entry.largestUnreachable ?? 'None'}</span>
                </div>
              ))}
            </div>
          </section>

          {tableVisible && (
            <section className="strategy-panel reachability-table-section">
              <h2>Reachability Table</h2>
              <div className="reachability-table">
                {rows.map((row) => (
                  <div className={row.reachable ? 'is-reachable' : 'is-unreachable'} key={row.value}>
                    <span>{row.value}</span>
                    <strong>{row.reachable ? 'Yes' : 'No'}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
