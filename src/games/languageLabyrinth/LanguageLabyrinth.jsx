import { useMemo, useState } from 'react';
import { ResearchLink } from '../../research/ResearchPanel.jsx';
import { languageResultHeading, mixedPalindromeLabels, LANGUAGE_WITNESS_LESSONS } from '../../research/editorial.js';
import {
  LANGUAGE_ANSWERS,
  LANGUAGE_CHALLENGES,
  LANGUAGE_CHALLENGE_SEARCH_CAP,
  evaluateLanguageChallenge,
  calculateLanguageStars,
  getLanguageChallengeStatus,
  getLanguageHint,
  loadLanguageProgress,
  recordLanguageCompletion,
  recordLanguageHint,
  saveLanguageProgress,
} from './challenges.js';
import {
  DEFAULT_LANGUAGE_MAX_LENGTH,
  detectCandidateInvariants,
  generateLanguage,
  scanLanguageInvariants,
} from './logic.js';
import { getLanguageAudit, LANGUAGE_THEOREMS } from './audit.js';
import { getUnlockedLanguageAchievements, loadLanguageStats, saveLanguageStats, recordLanguageStat, recordLanguageAttempt } from './stats.js';

const STARTER_OBSERVATIONS = [
  'No generated word ends in c.',
  'Every generated mixed a/b word appears to end in b.',
  'c-free mixed palindromes appear restricted.',
];

const PROOF_HINTS = [
  'Track only the final letter.',
  'Check how each rule changes the last letter.',
  'Can any rule create a word ending in c?',
  'What happens after rule (d)?',
];

const SORTERS = {
  word: (entry) => entry.word,
  length: (entry) => entry.length,
  startsWith: (entry) => entry.startsWith,
  endsWith: (entry) => entry.endsWith,
  palindrome: (entry) => Number(entry.palindrome),
  containsA: (entry) => Number(entry.containsA),
  containsB: (entry) => Number(entry.containsB),
  containsC: (entry) => Number(entry.containsC),
};

const LANGUAGE_MODES = {
  explorer: 'explorer',
  detective: 'detective',
};

function YesNo({ value }) {
  return <span className={value ? 'language-yes' : 'language-no'}>{value ? 'Yes' : 'No'}</span>;
}

function SortButton({ active, children, direction, onClick }) {
  return (
    <button className={active ? 'is-active-sort' : ''} onClick={onClick} type="button">
      {children}
      {active ? ` ${direction === 'asc' ? 'up' : 'down'}` : ''}
    </button>
  );
}

export default function LanguageLabyrinth({ onBack }) {
  const [mode, setMode] = useState(LANGUAGE_MODES.explorer);
  const [maxLengthText, setMaxLengthText] = useState(String(DEFAULT_LANGUAGE_MAX_LENGTH));
  const [generatedMaxLength, setGeneratedMaxLength] = useState(DEFAULT_LANGUAGE_MAX_LENGTH);
  const [sortKey, setSortKey] = useState('length');
  const [sortDirection, setSortDirection] = useState('asc');
  const [wordPage, setWordPage] = useState(0);
  const [treePage, setTreePage] = useState(0);
  const [hintCount, setHintCount] = useState(1);
  const [observationText, setObservationText] = useState('');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [challengeWord, setChallengeWord] = useState('');
  const [challengeExplanation, setChallengeExplanation] = useState('');
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeProgress, setChallengeProgress] = useState(() => loadLanguageProgress());
  const [stats, setStats] = useState(() => loadLanguageStats());
  const audit = useMemo(() => getLanguageAudit(), []);
  const achievements = getUnlockedLanguageAchievements(challengeProgress, stats);
  const persistStats = (next) => { setStats(next); saveLanguageStats(next); };

  const generation = useMemo(
    () => generateLanguage(generatedMaxLength),
    [generatedMaxLength],
  );
  const scan = useMemo(() => scanLanguageInvariants(generation.words), [generation.words]);
  const candidates = useMemo(() => detectCandidateInvariants(scan), [scan]);
  const challenge = LANGUAGE_CHALLENGES[challengeIndex];
  const challengeHintsUsed = challengeProgress.hintsUsed[challenge.id] || 0;
  const visibleChallengeHints = Array.from({ length: challengeHintsUsed }, (_, index) =>
    getLanguageHint(challenge, index + 1),
  );
  const sortedWords = useMemo(() => {
    const sorter = SORTERS[sortKey] || SORTERS.length;

    return [...generation.words].sort((a, b) => {
      const left = sorter(a);
      const right = sorter(b);
      const comparison =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right));

      if (comparison === 0) {
        return a.word.localeCompare(b.word);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [generation.words, sortDirection, sortKey]);

  const updateSort = (nextKey) => {
    setWordPage(0);
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDirection('asc');
  };

  const handleGenerate = () => {
    const parsed = Math.max(1, Math.min(10, Math.trunc(Number(maxLengthText) || DEFAULT_LANGUAGE_MAX_LENGTH)));

    setGeneratedMaxLength(parsed);
    setMaxLengthText(String(parsed)); setWordPage(0); setTreePage(0);
    persistStats(recordLanguageStat(stats, 'explorerGenerationsRun'));
  };

  const selectChallenge = (index) => {
    if (getLanguageChallengeStatus(LANGUAGE_CHALLENGES[index].id, challengeProgress) === 'Locked') return;
    setChallengeIndex(index);
    setChallengeAnswer('');
    setChallengeWord('');
    setChallengeExplanation('');
    setChallengeResult(null);
  };

  const persistProgress = (nextProgress) => {
    setChallengeProgress(nextProgress);
    saveLanguageProgress(nextProgress);
  };

  const handleChallengeHint = () => {
    if (challengeHintsUsed >= 3) return;
    persistProgress(recordLanguageHint(challengeProgress, challenge.id));
    persistStats(recordLanguageStat(stats, 'hintsUsed'));
  };

  const handleChallengeSubmit = () => {
    const result = evaluateLanguageChallenge({
      challenge,
      answer: challengeAnswer,
      word: challengeWord,
      explanation: challengeExplanation,
    });

    setChallengeResult(result);

    const stars = calculateLanguageStars(result, challengeHintsUsed, challenge);
    const next = result.success ? recordLanguageCompletion(challengeProgress, challenge, result.witness?.word || '', stars) : challengeProgress;
    persistStats(recordLanguageAttempt(stats, challengeProgress, next, challenge, result, challengeWord));
    if (result.success) persistProgress(next);
  };

  return (
    <main className="arcade-shell language-labyrinth-page">
      <header className="game-topbar">
        <button className="ghost-action" data-testid="language-return-lobby" onClick={onBack}>
          Back to Lobby
        </button>
        <div>
          <span className="problem-label">Problem 5</span>
          <h1>Language Labyrinth</h1>
          <p>Generate words, test a conjecture, then check what the rules can prove.</p>
        </div>
        <span className="status-badge status-experimental">Playable / Experimental</span>
      </header>

      <div className="binary-mode-tabs language-mode-tabs segmented-control" aria-label="Language Labyrinth modes">
        <button
          className={mode === LANGUAGE_MODES.explorer ? 'is-selected' : ''}
          data-testid="language-mode-explorer"
          onClick={() => setMode(LANGUAGE_MODES.explorer)}
          type="button"
        >
          Explorer
        </button>
        <button
          className={mode === LANGUAGE_MODES.detective ? 'is-selected' : ''}
          data-testid="language-mode-detective"
          onClick={() => setMode(LANGUAGE_MODES.detective)}
          type="button"
        >
          Invariant Detective
        </button>
      </div>

      {mode === LANGUAGE_MODES.explorer && (
        <>
      <section className="arcade-dashboard language-control-row">
        <article className="arcade-panel">
          <h2>Explorer Controls</h2>
          <div className="binary-input-grid">
            <label className="temporal-field">
              Max length
              <input
                data-testid="language-max-length"
                min="1"
                onChange={(event) => setMaxLengthText(event.target.value)}
                type="number"
                value={maxLengthText}
              />
            </label>
            <button
              className="primary-action secondary-action"
              data-testid="language-generate"
              onClick={handleGenerate}
              type="button"
            >
              Generate
            </button>
          </div>
          <p className="panel-note">
            Generated from base words a and b with rules B, C, and D up to length {generation.maxLength}.
          </p>
        </article>

        <article className="arcade-panel" data-testid="language-invariant-scanner">
          <h2>Invariant Scanner</h2>
          <p className="panel-note">Generated words of lengths 1-{generation.maxLength}. A mixed word contains both a and b.</p>
          <dl className="arcade-overview-grid language-scan-grid">
            <div>
              <dt>Total words</dt>
              <dd>{scan.totalWords}</dd>
            </div>
            <div>
              <dt>Ending in a</dt>
              <dd>{scan.endingInA}</dd>
            </div>
            <div>
              <dt>Ending in b</dt>
              <dd>{scan.endingInB}</dd>
            </div>
            <div>
              <dt>Ending in c</dt>
              <dd>{scan.endingInC}</dd>
            </div>
            <div>
              <dt>Starting with a</dt>
              <dd>{scan.startingWithA}</dd>
            </div>
            <div>
              <dt>Starting with b</dt>
              <dd>{scan.startingWithB}</dd>
            </div>
            <div>
              <dt>Starting with c</dt>
              <dd>{scan.startingWithC}</dd>
            </div>
            <div>
              <dt>Palindromes</dt>
              <dd>{scan.palindromes}</dd>
            </div>
            <div>
              <dt>{mixedPalindromeLabels(generation.maxLength).through}</dt>
              <dd>{scan.palindromesContainingBothAAndB}</dd>
            </div>
            <div>
              <dt>{mixedPalindromeLabels(generation.maxLength).exactly}</dt>
              <dd>{generation.words.filter((entry) => entry.length === generation.maxLength && entry.palindrome && entry.containsA && entry.containsB).length}</dd>
            </div>
            <div>
              <dt>Words containing both a and b</dt>
              <dd>{scan.wordsContainingBothAAndB}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="arcade-dashboard language-lab-grid">
        <article className="arcade-panel">
          <h2>Word Table</h2>
          <div className="page-controls" aria-label="Word table pages">
            <button aria-label="Previous word page" disabled={wordPage === 0} onClick={() => setWordPage((page) => page - 1)}>&larr;</button>
            <span>{wordPage + 1} / {Math.ceil(sortedWords.length / 100)} ({sortedWords.length} words)</span>
            <button aria-label="Next word page" disabled={(wordPage + 1) * 100 >= sortedWords.length} onClick={() => setWordPage((page) => page + 1)}>&rarr;</button>
          </div>
          <div tabIndex={0} className="experiment-table-wrap" data-testid="language-word-table">
            <table className="experiment-table language-word-table">
              <thead>
                <tr>
                  <th><SortButton active={sortKey === 'word'} direction={sortDirection} onClick={() => updateSort('word')}>Word</SortButton></th>
                  <th><SortButton active={sortKey === 'length'} direction={sortDirection} onClick={() => updateSort('length')}>Length</SortButton></th>
                  <th><SortButton active={sortKey === 'startsWith'} direction={sortDirection} onClick={() => updateSort('startsWith')}>Starts</SortButton></th>
                  <th><SortButton active={sortKey === 'endsWith'} direction={sortDirection} onClick={() => updateSort('endsWith')}>Ends</SortButton></th>
                  <th><SortButton active={sortKey === 'palindrome'} direction={sortDirection} onClick={() => updateSort('palindrome')}>Palindrome?</SortButton></th>
                  <th><SortButton active={sortKey === 'containsA'} direction={sortDirection} onClick={() => updateSort('containsA')}>Has a?</SortButton></th>
                  <th><SortButton active={sortKey === 'containsB'} direction={sortDirection} onClick={() => updateSort('containsB')}>Has b?</SortButton></th>
                  <th><SortButton active={sortKey === 'containsC'} direction={sortDirection} onClick={() => updateSort('containsC')}>Has c?</SortButton></th>
                </tr>
              </thead>
              <tbody>
                {sortedWords.slice(wordPage * 100, (wordPage + 1) * 100).map((entry) => (
                  <tr key={entry.word}>
                    <td>{entry.word}</td>
                    <td>{entry.length}</td>
                    <td>{entry.startsWith}</td>
                    <td>{entry.endsWith}</td>
                    <td><YesNo value={entry.palindrome} /></td>
                    <td><YesNo value={entry.containsA} /></td>
                    <td><YesNo value={entry.containsB} /></td>
                    <td><YesNo value={entry.containsC} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="arcade-panel">
          <h2>Word Tree</h2>
          <div className="page-controls" aria-label="Word tree pages">
            <button aria-label="Previous tree page" disabled={treePage === 0} onClick={() => setTreePage((page) => page - 1)}>&larr;</button>
            <span>{treePage + 1} / {Math.ceil(generation.nodes.length / 100)}</span>
            <button aria-label="Next tree page" disabled={(treePage + 1) * 100 >= generation.nodes.length} onClick={() => setTreePage((page) => page + 1)}>&rarr;</button>
          </div>
          <ol tabIndex={0} className="language-tree" data-testid="language-word-tree">
            {generation.nodes.slice(treePage * 100, (treePage + 1) * 100).map((node) => (
              <li key={node.word} style={{ '--depth': node.depth }}>
                <strong>{node.word}</strong>
                <span>{node.rule === 'Base' ? 'base word' : `Rule ${node.rule} from ${node.parent}`}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="arcade-dashboard">
        <article className="arcade-panel" data-testid="language-conjecture-board">
          <h2>Conjecture Board</h2>
          <div className="conjecture-list">
            {STARTER_OBSERVATIONS.map((observation) => (
              <label key={observation}>
                <input type="checkbox" />
                {observation}
              </label>
            ))}
          </div>
          <textarea
            aria-label="Write observations"
            className="graph-json"
            onChange={(event) => setObservationText(event.target.value)}
            placeholder="Write your own observation. Example: what changes when the cap grows?"
            value={observationText}
          />
        </article>

        <article className="arcade-panel" data-testid="language-pattern-detector">
          <h2>Pattern Detector</h2>
          <div className="language-candidate-list">
            {candidates.length ? (
              candidates.map((candidate) => (
                <div className="theorem-card" key={candidate}>
                  <h3>Candidate invariant:</h3>
                  <p>{candidate}</p>
                  <span>Empirical observation only. This is not a proof.</span>
                </div>
              ))
            ) : (
              <p className="panel-note">No zero-count candidate invariants detected at this cap.</p>
            )}
          </div>
        </article>
      </section>

      <section className="arcade-panel" data-testid="language-proof-hints">
        <div className="binary-search-heading">
          <div>
            <h2>Proof Insight Panel</h2>
            <p className="panel-note">Reveal hints gradually. The full proof is intentionally left for discovery.</p>
          </div>
          <button
            className="primary-action secondary-action"
            disabled={hintCount >= PROOF_HINTS.length}
            onClick={() => { setHintCount((count) => Math.min(PROOF_HINTS.length, count + 1)); persistStats(recordLanguageStat(stats, 'proofHintsOpened')); }}
            type="button"
          >
            Reveal next hint
          </button>
        </div>
        <ol className="binary-hint-list language-hint-list">
          {PROOF_HINTS.slice(0, hintCount).map((hint, index) => (
            <li key={hint}>
              <strong>Hint {index + 1}</strong>
              <span>{hint}</span>
            </li>
          ))}
        </ol>
      </section>
        </>
      )}

      {mode === LANGUAGE_MODES.detective && (
        <section className="arcade-dashboard language-detective-layout" data-testid="language-detective-mode">
          <article className="arcade-panel">
            <h2>Challenge Map</h2>
            <div className="binary-challenge-list language-challenge-list">
              {LANGUAGE_CHALLENGES.map((level, index) => (
                <button
                  className={`${index === challengeIndex ? 'is-selected' : ''} ${
                    challengeProgress.completed[level.id] ? 'is-completed' : ''
                  }`}
                  data-testid={`language-challenge-${level.id}`}
                  disabled={getLanguageChallengeStatus(level.id, challengeProgress) === 'Locked'}
                  key={level.id}
                  onClick={() => selectChallenge(index)}
                  type="button"
                >
                  <span>Level {index + 1}</span>
                  <strong>{level.title}</strong>
                  <em>{level.statement}</em>
                  <em>{getLanguageChallengeStatus(level.id, challengeProgress)}</em>
                  <em>Hints: {challengeProgress.hintsUsed[level.id] || 0} / 3</em>
                  <em>Witness: {challengeProgress.counterexamplesSubmitted[level.id] || '-'}</em>
                  <em aria-label={`${challengeProgress.highestStars[level.id] || 0} stars`}>Stars: {['None', 'Bronze', 'Silver', 'Gold'][challengeProgress.highestStars[level.id] || 0]}</em>
                </button>
              ))}
            </div>
          </article>

          <article className="arcade-panel" data-testid="language-current-challenge">
            <div className="binary-challenge-heading">
              <span>Invariant Detective</span>
              <h3>{challenge.title}</h3>
              <p>{challenge.statement}</p>
            </div>

            <fieldset className="language-answer-grid">
              <legend>Decision</legend>
              <label>
                <input
                  checked={challengeAnswer === LANGUAGE_ANSWERS.true}
                  name="language-answer"
                  onChange={() => setChallengeAnswer(LANGUAGE_ANSWERS.true)}
                  type="radio"
                />
                True / exists
              </label>
              <label>
                <input
                  checked={challengeAnswer === LANGUAGE_ANSWERS.false}
                  name="language-answer"
                  onChange={() => setChallengeAnswer(LANGUAGE_ANSWERS.false)}
                  type="radio"
                />
                False / impossible
              </label>
              <label>
                <input
                  checked={challengeAnswer === LANGUAGE_ANSWERS.unknown}
                  name="language-answer"
                  onChange={() => setChallengeAnswer(LANGUAGE_ANSWERS.unknown)}
                  type="radio"
                />
                Unknown from current evidence
              </label>
            </fieldset>

            <div className="binary-input-grid">
              <label className="temporal-field">
                Generated word or witness
                <input
                  data-testid="language-challenge-word"
                  onChange={(event) => setChallengeWord(event.target.value)}
                  placeholder={challenge.examples?.[0] || 'optional'}
                  value={challengeWord}
                />
              </label>
              <label className="temporal-field">
                Rule-based explanation (recorded, not machine-verified proof)
                <textarea
                  className="graph-json language-explanation-input"
                  data-testid="language-challenge-explanation"
                  onChange={(event) => setChallengeExplanation(event.target.value)}
                  placeholder="Name the rule or invariant you are using."
                  value={challengeExplanation}
                />
              </label>
            </div>

            <div className="binary-challenge-actions campaign-actions">
              <button
                className="primary-action"
                data-testid="language-submit-challenge"
                disabled={!challengeAnswer}
                onClick={handleChallengeSubmit}
                type="button"
              >
                Check
              </button>
              <button
                className="secondary-action"
                data-testid="language-hint-challenge"
                disabled={challengeHintsUsed >= 3}
                onClick={handleChallengeHint}
                type="button"
              >
                Hint
              </button>
            </div>

            {visibleChallengeHints.length > 0 && (
              <ol className="binary-hint-list language-hint-list">
                {visibleChallengeHints.map((hint, index) => (
                  <li key={hint}>
                    <strong>Hint {index + 1}</strong>
                    <span>{hint}</span>
                  </li>
                ))}
              </ol>
            )}

            {challengeResult && (
              <section
                className={`campaign-result ${challengeResult.success ? 'is-success' : 'is-failure'}`}
                data-testid="language-challenge-result"
              >
                <h3>
                  {languageResultHeading(challengeResult)}
                </h3>
                <p>{challengeResult.reason}</p>
                {challengeResult.success && (
                  <div className="theorem-card">
                    <h3>Rule-based result</h3>
                    <p>{LANGUAGE_WITNESS_LESSONS[challenge.id] ?? challenge.lesson}</p>
                    <span>
                      Lengths 1-{LANGUAGE_CHALLENGE_SEARCH_CAP}: {challengeResult.scan.totalWords} generated words;{' '}
                      {challengeResult.scan.endingInC} end in c; {challengeResult.scan.palindromesContainingBothAAndB} mixed palindromes.{' '}
                      Exactly length 10: {audit.mixedPalindromes.length} mixed palindromes.
                    </span>
                  </div>
                )}
              </section>
            )}
          </article>
        </section>
      )}
      <section className="language-audit" data-testid="language-counterexample-gallery">
        <h2>Counterexample Gallery</h2>
        <ResearchLink portalId="language-labyrinth">Follow the counterexample / Correction Dossier</ResearchLink>
        <p>bacab is both generated and a mixed palindrome. It is a witness for existence and a counterexample to the original claim that no such word exists.</p>
        <div className="language-featured">
          {audit.featured.map((entry) => <article key={entry.word}>
            <h3>{entry.word}</h3>
            <p>Generated? {entry.generated ? 'Yes' : 'No'} | Palindrome? {entry.palindrome ? 'Yes' : 'No'} | Length: {entry.length} | Contains a and b: {entry.containsA && entry.containsB ? 'Yes' : 'No'}</p>
            <ol>{entry.derivation.map((node) => <li key={node.word}><code>{node.word}</code> - {node.parent ? `Rule ${node.rule} from ${node.parent}` : 'Axiom (a)'}</li>)}</ol>
          </article>)}
        </div>
        <h3>Audited length-10 mixed palindromes: {audit.mixedPalindromes.length}</h3>
        <p>There are 8 generated length-10 mixed palindromes in the exhaustive search through length 10.</p>
        <ul className="language-audit-words">{audit.mixedPalindromes.map((word) => <li key={word}><code>{word}</code></li>)}</ul>
        <ul>{LANGUAGE_THEOREMS.map((theorem) => <li key={theorem}>{theorem}</li>)}</ul>
      </section>
      <section className="arcade-dashboard" aria-label="Language Labyrinth progress">
        <section className="arcade-panel"><h2>Statistics</h2><dl className="profile-list">{Object.entries(stats).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, ' $1')}</dt><dd>{value}</dd></div>)}</dl></section>
        <section className="arcade-panel" data-testid="language-achievements"><h2>Local Achievements</h2>{achievements.length ? <ul>{achievements.map((achievement) => <li key={achievement.id}>{achievement.title}</li>)}</ul> : <p className="panel-note">No achievements unlocked yet.</p>}</section>
      </section>
    </main>
  );
}
