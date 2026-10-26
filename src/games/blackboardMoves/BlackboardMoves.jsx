import { useEffect, useMemo, useState } from 'react';
import PathReplay from '../../components/PathReplay.jsx';
import { ResearchLink } from '../../research/ResearchPanel.jsx';
import { useMathJob } from '../../core/useMathJob.js';
import { runMathTask } from '../../core/runMathTask.js';
import {
  analyzeExactChallengeBranches,
  BLACKBOARD_CHALLENGES,
  BLACKBOARD_OBJECTIVES,
  calculateBlackboardChallengeStars,
  getChallengeExplanationCards,
  getBlackboardChallengeSummary,
  isBlackboardChallengeUnlocked,
  isForecastMaxOptimalMove,
  loadBlackboardChallengeProgress,
  recordBlackboardChallengeAttempt as recordBlackboardChallengeProgressAttempt,
  saveBlackboardChallengeProgress,
} from './challenges.js';
import {
  getUnlockedBlackboardAchievements,
  loadBlackboardStats,
  recordBlackboardChallengeAttempt as recordBlackboardStatsAttempt,
  recordBlackboardHintUsed,
  recordBlackboardLabExperiment,
  recordBlackboardMove,
  saveBlackboardStats,
} from './stats.js';
import {
  analyzeInvariantCandidates,
  analyzeFirstMoveBranches,
  canSearchState,
  chooseGreedyMove,
  createMoveRecord,
  detectGreedyDivergence,
  EXPERIMENT_FAMILIES,
  exportExperimentCsv,
  exportExperimentJson,
  exportResearchCsv,
  exportResearchJson,
  filterResearchResults,
  findExperimentPatterns,
  FORMULA_CANDIDATES,
  generateResearchConjectures,
  generateConsecutiveSetPlotData,
  generateStateGraph,
  generateLegalMoves,
  generateTripleHeatmapSlice,
  getFormulaCounterexampleDetail,
  getBoardStats,
  getOptimalPathExplanation,
  getQuantityChanges,
  GREEDY_STRATEGIES,
  HEATMAP_METRICS,
  isTerminal,
  playGreedyToTerminal,
  parseBoardText,
  replayGreedyComparisons,
  recoverTerminalPaths,
  RESEARCH_FAMILIES,
  RESEARCH_FILTERS,
  mineResearchPatterns,
  runBatchExperiment,
  runResearchExperiment,
  searchMoveRange,
  sortExperimentResults,
  testFormulaCandidate,
} from './logic.js';

import { BLACKBOARD_CONJECTURE_STORAGE_KEY as CONJECTURE_STORAGE_KEY } from './logic.js';
import { getBrowserStorage, guardStorage } from '../../core/storage.js';

const BLACKBOARD_MODES = {
  lab: 'lab',
  challenge: 'challenge',
};

const PRESETS = [
  { id: 'small', label: '4,5,6', board: [4, 5, 6] },
  { id: 'large', label: '25,30,45', board: [25, 30, 45] },
  { id: 'range', label: '1,2,3,...,n', board: [1, 2, 3, 4, 5] },
  { id: 'custom', label: 'Custom', board: [4, 5, 6] },
];

const STRATEGIES = [
  {
    id: GREEDY_STRATEGIES.largestLargest,
    label: 'Largest a, largest b',
  },
  {
    id: GREEDY_STRATEGIES.largestSmallest,
    label: 'Largest a, smallest b',
  },
  {
    id: GREEDY_STRATEGIES.closestPair,
    label: 'Closest pair',
  },
  {
    id: GREEDY_STRATEGIES.random,
    label: 'Random legal move',
  },
];

const TINY_STATE_PRESETS = ['1,1', '1,2', '2,2', '1,1,1'];

const CONJECTURES = [
  { id: 'sum-parity', label: 'Sum parity preserved' },
  { id: 'terminal-count-state', label: 'Terminal move count depends only on initial state' },
  { id: 'positive-monotonic', label: 'Positive count monotonic' },
  { id: 'other', label: 'Other' },
];

const FORMULAS = [
  { id: FORMULA_CANDIDATES.sum, label: 'sum' },
  { id: FORMULA_CANDIDATES.sumMinusPositiveCount, label: 'sum - positiveCount' },
  { id: FORMULA_CANDIDATES.sumMinusLength, label: 'sum - numberOfEntries' },
  { id: FORMULA_CANDIDATES.max, label: 'max' },
  { id: FORMULA_CANDIDATES.exceptMax, label: 'sum of entries except max' },
];

const HEATMAP_OPTIONS = [
  { id: HEATMAP_METRICS.maxMoves, label: 'maxMoves' },
  { id: HEATMAP_METRICS.minMoves, label: 'minMoves' },
  { id: HEATMAP_METRICS.range, label: 'range' },
  { id: HEATMAP_METRICS.terminalCount, label: 'terminalCount' },
];

const RESEARCH_FAMILY_OPTIONS = [
  { id: RESEARCH_FAMILIES.triples, label: 'All triples [x,y,z]' },
  { id: RESEARCH_FAMILIES.consecutive, label: 'Consecutive [1..n]' },
  { id: RESEARCH_FAMILIES.random, label: 'Random states' },
];

const RESEARCH_FILTER_OPTIONS = [
  { id: RESEARCH_FILTERS.all, label: 'All computed states' },
  { id: RESEARCH_FILTERS.rangeAtLeast, label: 'range >= X' },
  { id: RESEARCH_FILTERS.rangeZero, label: 'range == 0' },
  { id: RESEARCH_FILTERS.maxEqualsMin, label: 'maxMoves = minMoves' },
];

function formatBoard(board) {
  return board.join(', ');
}

function formatDelta(value) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function formatObjective(objectiveType) {
  if (objectiveType === BLACKBOARD_OBJECTIVES.beatGreedy) {
    return 'Beat greedy';
  }

  if (objectiveType === BLACKBOARD_OBJECTIVES.forecastTrap) {
    return 'Forecast trap';
  }

  return objectiveType.charAt(0).toUpperCase() + objectiveType.slice(1);
}

function StarDisplay({ rating = 0 }) {
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

function loadConjectures() {
  try {
    const saved = JSON.parse(guardStorage(getBrowserStorage()).getItem(CONJECTURE_STORAGE_KEY));

    if (!saved || typeof saved !== 'object') {
      return {};
    }

    return saved;
  } catch {
    return {};
  }
}

function saveConjectures(conjectures) {
  guardStorage(getBrowserStorage()).setItem(CONJECTURE_STORAGE_KEY, JSON.stringify(conjectures));
}

export default function BlackboardMoves({ onBack }) {
  const [initialBoard, setInitialBoard] = useState(PRESETS[0].board);
  const [board, setBoard] = useState(PRESETS[0].board);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [history, setHistory] = useState([]);
  const [presetId, setPresetId] = useState('small');
  const [customText, setCustomText] = useState('4, 5, 6');
  const [rangeN, setRangeN] = useState(5);
  const [searchResult, setSearchResult] = useState(null);
  const [stateGraph, setStateGraph] = useState(null);
  const [conjectures, setConjectures] = useState(() => loadConjectures());
  const [experimentFamily, setExperimentFamily] = useState(EXPERIMENT_FAMILIES.triples);
  const [experimentMax, setExperimentMax] = useState(8);
  const [experimentLength, setExperimentLength] = useState(3);
  const [experimentResults, setExperimentResults] = useState([]);
  const [experimentSort, setExperimentSort] = useState('maxMoves');
  const [formulaId, setFormulaId] = useState(FORMULA_CANDIDATES.sumMinusPositiveCount);
  const [heatmapN, setHeatmapN] = useState(5);
  const [heatmapZ, setHeatmapZ] = useState(5);
  const [heatmapMetric, setHeatmapMetric] = useState(HEATMAP_METRICS.maxMoves);
  const [selectedHeatmapCell, setSelectedHeatmapCell] = useState(null);
  const [consecutivePlotN, setConsecutivePlotN] = useState(5);
  const [selectedCounterexample, setSelectedCounterexample] = useState(null);
  const [researchFamily, setResearchFamily] = useState(RESEARCH_FAMILIES.triples);
  const [researchN, setResearchN] = useState(5);
  const [researchK, setResearchK] = useState(3);
  const [researchSamples, setResearchSamples] = useState(35);
  const [researchResults, setResearchResults] = useState([]);
  const [researchSummary, setResearchSummary] = useState(null);
  const [researchFilter, setResearchFilter] = useState(RESEARCH_FILTERS.all);
  const [researchRangeThreshold, setResearchRangeThreshold] = useState(1);
  const [exportText, setExportText] = useState('');
  const [message, setMessage] = useState('');
  const job = useMathJob();
  const [mode, setMode] = useState(BLACKBOARD_MODES.lab);
  const [activeChallengeId, setActiveChallengeId] = useState(BLACKBOARD_CHALLENGES[0].id);
  const [challengeBoard, setChallengeBoard] = useState(BLACKBOARD_CHALLENGES[0].startState);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [challengeSelectedIndices, setChallengeSelectedIndices] = useState([]);
  const [challengeHintsVisible, setChallengeHintsVisible] = useState(false);
  const [challengeHintsUsed, setChallengeHintsUsed] = useState(0);
  const [challengeResult, setChallengeResult] = useState(null);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [challengeProgress, setChallengeProgress] = useState(() =>
    loadBlackboardChallengeProgress(),
  );
  const [blackboardStats, setBlackboardStats] = useState(() => loadBlackboardStats());

  const legalMoves = useMemo(() => generateLegalMoves(board), [board]);
  const stats = useMemo(() => getBoardStats(board), [board]);
  const quantityChanges = useMemo(
    () => getQuantityChanges(initialBoard, history),
    [history, initialBoard],
  );
  const invariantCandidates = useMemo(
    () => analyzeInvariantCandidates(initialBoard, history),
    [history, initialBoard],
  );
  const terminal = useMemo(() => isTerminal(board), [board]);
  const selectedMove = useMemo(() => {
    if (selectedIndices.length !== 2) {
      return null;
    }

    return legalMoves.find((move) => {
      const moveIndices = [move.aIndex, move.bIndex].sort((left, right) => left - right);
      const chosenIndices = [...selectedIndices].sort((left, right) => left - right);

      return moveIndices[0] === chosenIndices[0] && moveIndices[1] === chosenIndices[1];
    }) || null;
  }, [legalMoves, selectedIndices]);
  const searchEnabled = canSearchState(board);
  const graphEnabled = stats.sum <= 12 && board.length <= 4;
  const sortedExperimentResults = useMemo(
    () => sortExperimentResults(experimentResults, experimentSort),
    [experimentResults, experimentSort],
  );
  const experimentPatterns = useMemo(
    () => findExperimentPatterns(experimentResults),
    [experimentResults],
  );
  const formulaResult = useMemo(
    () => testFormulaCandidate(experimentResults, formulaId),
    [experimentResults, formulaId],
  );
  const [heatmapSlice, setHeatmapSlice] = useState(() => generateTripleHeatmapSlice({ maxValue: 1, fixedZ: 1 }));
  const [consecutivePlotData, setConsecutivePlotData] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    runMathTask('blackboard-heatmap', { maxValue: heatmapN, fixedZ: heatmapZ, metric: heatmapMetric }, { signal: controller.signal })
      .then(setHeatmapSlice).catch((error) => { if (error.name !== 'AbortError') setMessage(error.message); });
    return () => controller.abort();
  }, [heatmapMetric, heatmapN, heatmapZ]);
  useEffect(() => {
    const controller = new AbortController();
    runMathTask('blackboard-consecutive', { maxValue: consecutivePlotN }, { signal: controller.signal })
      .then(setConsecutivePlotData).catch((error) => { if (error.name !== 'AbortError') setMessage(error.message); });
    return () => controller.abort();
  }, [consecutivePlotN]);
  useEffect(() => { job.cancel(); }, [board, job.cancel]);
  const graphNodesByDepth = useMemo(() => {
    if (!stateGraph) {
      return [];
    }

    const groups = new Map();

    stateGraph.nodes.forEach((node) => {
      if (!groups.has(node.depth)) {
        groups.set(node.depth, []);
      }

      groups.get(node.depth).push(node);
    });

    return [...groups.entries()]
      .sort(([left], [right]) => left - right)
      .map(([depth, nodes]) => ({
        depth,
        nodes: nodes.sort((left, right) => left.key.localeCompare(right.key)),
      }));
  }, [stateGraph]);
  const researchPatterns = useMemo(
    () => mineResearchPatterns(researchResults),
    [researchResults],
  );
  const filteredResearchResults = useMemo(
    () => filterResearchResults(researchResults, researchFilter, researchRangeThreshold),
    [researchFilter, researchRangeThreshold, researchResults],
  );
  const researchConjectures = useMemo(
    () => generateResearchConjectures(researchResults, researchPatterns),
    [researchPatterns, researchResults],
  );
  const optimalExplanation = useMemo(() => getOptimalPathExplanation(board), [board]);
  const greedyReplays = useMemo(() => replayGreedyComparisons(board), [board]);
  const branchAnalysis = useMemo(() => analyzeFirstMoveBranches(board), [board]);
  const divergenceReports = useMemo(
    () =>
      [
        GREEDY_STRATEGIES.largestLargest,
        GREEDY_STRATEGIES.largestSmallest,
        GREEDY_STRATEGIES.closestPair,
      ].map((strategy) => detectGreedyDivergence(board, strategy)),
    [board],
  );
  const activeChallenge = useMemo(
    () =>
      BLACKBOARD_CHALLENGES.find((challenge) => challenge.id === activeChallengeId) ||
      BLACKBOARD_CHALLENGES[0],
    [activeChallengeId],
  );
  const challengeLegalMoves = useMemo(
    () => generateLegalMoves(challengeBoard),
    [challengeBoard],
  );
  const challengeTerminal = useMemo(() => isTerminal(challengeBoard), [challengeBoard]);
  const challengeSelectedMove = useMemo(() => {
    if (challengeSelectedIndices.length !== 2) {
      return null;
    }

    return (
      challengeLegalMoves.find((move) => {
        const moveIndices = [move.aIndex, move.bIndex].sort((left, right) => left - right);
        const chosenIndices = [...challengeSelectedIndices].sort((left, right) => left - right);

        return moveIndices[0] === chosenIndices[0] && moveIndices[1] === chosenIndices[1];
      }) || null
    );
  }, [challengeLegalMoves, challengeSelectedIndices]);
  const challengeSummary = useMemo(
    () => getBlackboardChallengeSummary(activeChallenge),
    [activeChallenge],
  );
  const challengeHintBranches = useMemo(
    () => analyzeExactChallengeBranches(challengeBoard),
    [challengeBoard],
  );
  const challengeLargestLargestMove = useMemo(
    () => chooseGreedyMove(challengeBoard, GREEDY_STRATEGIES.largestLargest),
    [challengeBoard],
  );
  const blackboardAchievements = useMemo(
    () => getUnlockedBlackboardAchievements(challengeProgress, blackboardStats),
    [blackboardStats, challengeProgress],
  );

  const resetToBoard = (nextBoard, nextPresetId = presetId) => {
    setInitialBoard(nextBoard);
    setBoard(nextBoard);
    setSelectedIndices([]);
    setHistory([]);
    setPresetId(nextPresetId);
    setSearchResult(null);
    setStateGraph(null);
    setSelectedCounterexample(null);
    setMessage('');
  };

  const handlePreset = (preset) => {
    if (preset.id === 'range') {
      const nextBoard = Array.from({ length: rangeN }, (_, index) => index + 1);
      resetToBoard(nextBoard, preset.id);
      return;
    }

    if (preset.id === 'custom') {
      const parsed = parseBoardText(customText);
      if (customText.length > 500 || parsed.length > 12 || !parsed.length) {
        setMessage('Enter one to twelve nonnegative safe integers, within 500 characters.'); return;
      }
      resetToBoard(parsed.length ? parsed : [0], preset.id);
      return;
    }

    resetToBoard(preset.board, preset.id);
  };

  const handleTokenClick = (index) => {
    if (board[index] < 1) {
      return;
    }

    setSelectedIndices((current) => {
      if (current.includes(index)) {
        return current.filter((value) => value !== index);
      }

      return [...current, index].slice(-2);
    });
    setMessage('');
  };

  const applySelectedMove = (move) => {
    if (!move) {
      setMessage('Select two positive tokens to create a legal move.');
      return;
    }

    const record = createMoveRecord(history.length + 1, board, move);

    setHistory((current) => [...current, record]);
    setBoard(record.resultingBoard);
    setSelectedIndices([]);
    setSearchResult(null);
    setStateGraph(null);
    setSelectedCounterexample(null);
    setMessage(`Move ${record.moveNumber}: ${move.a}, ${move.b} -> ${move.a + move.b}, ${move.b - 1}`);
    setBlackboardStats((stats) => saveBlackboardStats(recordBlackboardMove(stats)));
  };

  const handleUndo = () => {
    if (!history.length) {
      return;
    }

    const nextHistory = history.slice(0, -1);

    setHistory(nextHistory);
    setBoard(nextHistory.length ? nextHistory[nextHistory.length - 1].resultingBoard : initialBoard);
    setSelectedIndices([]);
    setSearchResult(null);
    setStateGraph(null);
    setSelectedCounterexample(null);
    setMessage('Last move undone.');
  };

  const handleReset = () => {
    setBoard(initialBoard);
    setSelectedIndices([]);
    setHistory([]);
    setSearchResult(null);
    setStateGraph(null);
    setSelectedCounterexample(null);
    setMessage('Board reset.');
  };

  const handleGreedy = (strategy) => {
    const move = chooseGreedyMove(board, strategy);

    if (!move) {
      setMessage('No legal move is available.');
      return;
    }

    applySelectedMove(move);
  };

  const handleSearch = () => {
    if (!searchEnabled) {
      setMessage('Exact search requires sum <= 30 and at most five entries.');
      return;
    }

    job.run('blackboard-range', { board }, (range) => {
    setSearchResult({
      ...range,
      greedyComparisons: STRATEGIES.filter((strategy) => strategy.id !== GREEDY_STRATEGIES.random)
        .map((strategy) => ({
          ...strategy,
          result: playGreedyToTerminal(board, strategy.id),
        })),
    });
    setMessage('Search complete.');
    });
  };

  const handleStateGraph = () => {
    if (!graphEnabled) {
      setMessage('State graph is enabled for tiny boards only.');
      return;
    }

    job.run('blackboard-graph', { board }, (result) => {
      setStateGraph(result); setMessage('State graph generated.');
    });
  };

  const toggleConjecture = (id) => {
    const next = {
      ...conjectures,
      [id]: !conjectures[id],
    };

    setConjectures(next);
    saveConjectures(next);
  };

  const handleRunExperiment = () => {
    job.run('blackboard-batch', {
      family: experimentFamily,
      maxValue: experimentMax,
      length: experimentLength,
      maxResults: 180,
    }, (results) => {
    setExperimentResults(results);
    setExportText('');
    setSelectedCounterexample(null);
    setMessage(`Experiment complete: ${results.filter((result) => !result.skipped).length} states computed; ${results.filter((result) => result.skipped).length} capped.`);
    });
  };

  const handleCounterexample = (counterexample) => {
    const detail = getFormulaCounterexampleDetail(counterexample);

    setInitialBoard(detail.startState);
    setBoard(detail.startState);
    setCustomText(formatBoard(detail.startState));
    setPresetId('custom');
    setSelectedIndices([]);
    setHistory([]);
    setSearchResult(null);
    setStateGraph(null);
    setSelectedCounterexample(detail);
    setMessage(`Loaded counterexample ${formatBoard(detail.startState)}.`);
  };

  const handleExportExperiment = async (format) => {
    const payload =
      format === 'csv'
        ? exportExperimentCsv(experimentResults)
        : exportExperimentJson(experimentResults);

    setExportText(payload);

    try {
      await navigator.clipboard?.writeText(payload);
      setMessage(`Experiment ${format.toUpperCase()} copied.`);
    } catch {
      setMessage(`Experiment ${format.toUpperCase()} prepared.`);
    }
  };

  const handleRunResearch = () => {
    job.run('blackboard-research', {
      family: researchFamily,
      maxValue: researchN,
      length: researchK,
      sampleCount: researchSamples,
    }, (research) => {
    setResearchResults(research.results);
    setResearchSummary(research);
    setExportText('');
    setBlackboardStats((stats) => saveBlackboardStats(recordBlackboardLabExperiment(stats)));
    setMessage(
      `Research complete: ${research.computed} states computed, ${research.skipped} capped.`,
    );
    });
  };

  const handleExportResearch = async (format) => {
    const payload =
      format === 'csv' ? exportResearchCsv(researchResults) : exportResearchJson(researchResults);

    setExportText(payload);

    try {
      await navigator.clipboard?.writeText(payload);
      setMessage(`Research ${format.toUpperCase()} copied.`);
    } catch {
      setMessage(`Research ${format.toUpperCase()} prepared.`);
    }
  };

  const saveChallengeProgress = (nextProgress) => {
    setChallengeProgress(saveBlackboardChallengeProgress(nextProgress));
  };

  const saveStats = (nextStats) => {
    setBlackboardStats(saveBlackboardStats(nextStats));
  };

  const resetChallenge = (challenge = activeChallenge) => {
    setActiveChallengeId(challenge.id);
    setChallengeBoard(challenge.startState);
    setChallengeHistory([]);
    setChallengeSelectedIndices([]);
    setChallengeHintsVisible(false);
    setChallengeHintsUsed(0);
    setChallengeResult(null);
    setChallengeMessage('');
  };

  const handleChallengeTokenClick = (index) => {
    if (challengeBoard[index] < 1 || challengeResult) {
      return;
    }

    setChallengeSelectedIndices((current) => {
      if (current.includes(index)) {
        return current.filter((value) => value !== index);
      }

      return [...current, index].slice(-2);
    });
    setChallengeMessage('');
  };

  const applyChallengeMove = (move) => {
    if (!move) {
      setChallengeMessage('Select two positive tokens to create a legal move.');
      return;
    }

    const record = createMoveRecord(challengeHistory.length + 1, challengeBoard, move);

    setChallengeHistory((current) => [...current, record]);
    setChallengeBoard(record.resultingBoard);
    setChallengeSelectedIndices([]);
    setChallengeResult(null);
    setChallengeMessage(
      `Move ${record.moveNumber}: ${move.a}, ${move.b} -> ${move.a + move.b}, ${move.b - 1}`,
    );
    saveStats(recordBlackboardMove(blackboardStats));
  };

  const handleChallengeUndo = () => {
    if (!challengeHistory.length || challengeResult) {
      return;
    }

    const nextHistory = challengeHistory.slice(0, -1);

    setChallengeHistory(nextHistory);
    setChallengeBoard(
      nextHistory.length
        ? nextHistory[nextHistory.length - 1].resultingBoard
        : activeChallenge.startState,
    );
    setChallengeSelectedIndices([]);
    setChallengeMessage('Last challenge move undone.');
  };

  const revealChallengeHint = () => {
    setChallengeHintsVisible(true);
    setChallengeHintsUsed((current) => current + 1);
    saveStats(recordBlackboardHintUsed(blackboardStats));
  };

  const completeChallengeAttempt = (result) => {
    const starAttempt = {
      ...result,
      moveCount: result.playerMoves,
      hintsUsed: challengeHintsUsed,
    };
    const stars = calculateBlackboardChallengeStars(activeChallenge, starAttempt, challengeSummary);
    const resultWithStars = {
      ...result,
      stars,
      explanationCards: getChallengeExplanationCards(activeChallenge, result, challengeSummary),
    };
    const nextProgress = recordBlackboardChallengeProgressAttempt(challengeProgress, activeChallenge.id, {
      success: result.success,
      moveCount: result.playerMoves,
      hintsUsed: challengeHintsUsed,
      stars,
    });

    saveChallengeProgress(nextProgress);
    saveStats(
      recordBlackboardStatsAttempt(blackboardStats, {
        success: result.success,
        hintsUsed: challengeHintsUsed,
        stars,
        beatGreedy: activeChallenge.objectiveType === BLACKBOARD_OBJECTIVES.beatGreedy,
      }),
    );
    setChallengeResult(resultWithStars);
  };

  const handleSubmitChallenge = () => {
    if (activeChallenge.objectiveType === BLACKBOARD_OBJECTIVES.forecastTrap) {
      if (challengeHistory.length < 1 || !challengeSelectedMove) {
        setChallengeMessage('Make one move, then select the forecast move to check.');
        return;
      }

      const branches = analyzeExactChallengeBranches(challengeBoard);
      const selectedResult = applyMove(challengeBoard, challengeSelectedMove);
      const selectedBranch = branches.branches.find(
        (branch) =>
          branch.chosenPair[0] === challengeSelectedMove.a &&
          branch.chosenPair[1] === challengeSelectedMove.b &&
          formatBoard(branch.resultingState) === formatBoard(selectedResult),
      );
      const success = isForecastMaxOptimalMove(challengeBoard, challengeSelectedMove);

      completeChallengeAttempt({
        success,
        playerMoves: challengeHistory.length,
        optimalMin: challengeSummary.minMoves,
        optimalMax: challengeSummary.maxMoves,
        greedyMoves: challengeSummary.greedyLargestLargestMoves,
        forecastMaxOptimal: success,
        explanation: success
          ? `Correct forecast. This move preserves ${selectedBranch?.maxMoves ?? 'the best'} future moves from the current branch.`
          : `This forecast gives future max ${selectedBranch?.maxMoves ?? 'unknown'}; a top branch preserves ${branches.branches[0]?.maxMoves ?? 'more'} future moves.`,
      });
      return;
    }

    if (!challengeTerminal) {
      setChallengeMessage('Reach a terminal board before submitting this challenge.');
      return;
    }

    const playerMoves = challengeHistory.length;
    let success = false;

    if (activeChallenge.objectiveType === BLACKBOARD_OBJECTIVES.minimize) {
      success = playerMoves <= challengeSummary.minMoves;
    } else if (activeChallenge.objectiveType === BLACKBOARD_OBJECTIVES.beatGreedy) {
      success = playerMoves > challengeSummary.greedyLargestLargestMoves;
    } else {
      success = playerMoves >= challengeSummary.maxMoves;
    }

    completeChallengeAttempt({
      success,
      playerMoves,
      optimalMin: challengeSummary.minMoves,
      optimalMax: challengeSummary.maxMoves,
      greedyMoves: challengeSummary.greedyLargestLargestMoves,
      forecastMaxOptimal: false,
      explanation: success
        ? 'Your terminal path met the objective under exact comparison.'
        : 'Exact comparison says this path missed the target. Try using the branch hints before committing early moves.',
    });
  };

  return (
    <main className="arcade-shell game-page blackboard-page">
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
          <p className="problem-label">Problem 8</p>
          <h1>Blackboard Moves</h1>
        </div>
        <button
          className="ghost-action"
          data-testid="blackboard-reset"
          onClick={handleReset}
          aria-label="Reset blackboard"
        >
          Reset
        </button>
      </header>

      <nav className="segmented-control blackboard-mode-tabs" aria-label="Blackboard Moves modes">
        <button
          className={mode === BLACKBOARD_MODES.lab ? 'is-selected' : ''}
          data-testid="blackboard-mode-lab"
          onClick={() => setMode(BLACKBOARD_MODES.lab)}
          type="button"
        >
          Lab / Explorer
        </button>
        <button
          className={mode === BLACKBOARD_MODES.challenge ? 'is-selected' : ''}
          data-testid="blackboard-mode-challenge"
          onClick={() => setMode(BLACKBOARD_MODES.challenge)}
          type="button"
        >
          Strategy Challenge
        </button>
      </nav>

      {mode === BLACKBOARD_MODES.challenge ? (
        <section
          className="game-layout blackboard-layout blackboard-challenge-layout"
          data-testid="blackboard-strategy-challenge"
        >
          <aside className="control-panel">
            <section>
              <h2>Challenge Map</h2>
              <div className="blackboard-challenge-list">
                {BLACKBOARD_CHALLENGES.map((challenge, index) => {
                  const unlocked = isBlackboardChallengeUnlocked(challenge.id, challengeProgress);
                  const completed = Boolean(challengeProgress.completed[challenge.id]);
                  const status = completed ? 'Completed' : unlocked ? 'Unlocked' : 'Locked';
                  const stars = challengeProgress.highestStars[challenge.id] || 0;

                  return (
                    <button
                      className={[
                        activeChallenge.id === challenge.id ? 'is-selected' : '',
                        completed ? 'is-completed' : '',
                        !unlocked ? 'is-locked' : '',
                      ].join(' ')}
                      data-testid={`blackboard-challenge-${challenge.id}`}
                      disabled={!unlocked}
                      key={challenge.id}
                      onClick={() => resetChallenge(challenge)}
                      type="button"
                    >
                      <span className="challenge-map-number">Level {index + 1}</span>
                      <strong>{challenge.title}</strong>
                      <span>{formatObjective(challenge.objectiveType)}</span>
                      <span>Start: {formatBoard(challenge.startState)}</span>
                      <span>Status: {status}</span>
                      <span>Best: {challengeProgress.bestMoveCount[challenge.id] ?? '-'}</span>
                      <span>
                        Hints:{' '}
                        {(challengeProgress.hintsUsed[challenge.id] || 0) > 0 ? 'used' : 'clean'}
                      </span>
                      <span className="map-stars">
                        <StarDisplay rating={stars} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2>Objective</h2>
              <p className="panel-note">{activeChallenge.lesson}</p>
              <dl className="score-grid">
                <div>
                  <dt>Start</dt>
                  <dd>{formatBoard(activeChallenge.startState)}</dd>
                </div>
                <div>
                  <dt>Objective</dt>
                  <dd>{activeChallenge.objectiveType}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>
                    {activeChallenge.objectiveType === BLACKBOARD_OBJECTIVES.beatGreedy
                      ? `more than ${activeChallenge.targetMoves}`
                      : activeChallenge.targetMoves ?? 'max-optimal branch'}
                  </dd>
                </div>
                <div>
                  <dt>Hints used</dt>
                  <dd>{challengeHintsUsed}</dd>
                </div>
              </dl>
              <div className="timeline-actions">
                <button data-testid="blackboard-challenge-hint" onClick={revealChallengeHint}>
                  Show Hint
                </button>
                <button
                  data-testid="blackboard-challenge-reset"
                  onClick={() => resetChallenge(activeChallenge)}
                >
                  Restart
                </button>
              </div>
            </section>

            {challengeHintsVisible && (
              <section className="strategy-panel" data-testid="blackboard-challenge-hints">
                <h2>Branch Hint</h2>
                <div className="comparison-list">
                  {challengeHintBranches.branches.slice(0, 3).map((branch) => (
                    <p key={`${branch.chosenPair.join('-')}-${formatBoard(branch.resultingState)}`}>
                      ({branch.chosenPair.join(', ')}) leaves future max {branch.maxMoves}
                      {branch.optimalForMax ? ' - max-optimal' : ''}
                    </p>
                  ))}
                </div>
                <p className="panel-note">
                  Largest-largest chooses{' '}
                  {challengeLargestLargestMove
                    ? `(${challengeLargestLargestMove.a}, ${challengeLargestLargestMove.b})`
                    : 'nothing'}
                  {challengeLargestLargestMove &&
                  isForecastMaxOptimalMove(challengeBoard, challengeLargestLargestMove)
                    ? ', which is safe for max play here.'
                    : ', which is dangerous for max play here.'}
                </p>
              </section>
            )}
          </aside>

          <section className="board-stage forge-stage blackboard-stage" aria-label="Challenge board">
            <div className="forge-result-card">
              <p className="problem-label">Strategy Challenge</p>
              <h2>{activeChallenge.title}</h2>
              <p className="panel-note">{activeChallenge.lesson}</p>
            </div>

            <div className="blackboard-token-grid" data-testid="blackboard-challenge-board">
              {challengeBoard.map((value, index) => (
                <button
                  aria-label={`Challenge token ${index + 1}, value ${value}${value === 0 ? ', inactive' : ''}`}
                  className={[
                    'blackboard-token',
                    value === 0 ? 'is-inactive' : '',
                    challengeSelectedIndices.includes(index) ? 'is-selected' : '',
                  ].join(' ')}
                  data-testid={`blackboard-challenge-token-${index}`}
                  disabled={value === 0 || Boolean(challengeResult)}
                  key={`${index}-${value}`}
                  onClick={() => handleChallengeTokenClick(index)}
                  type="button"
                >
                  <strong>{value}</strong>
                  <span>{value === 0 ? 'inactive' : `#${index + 1}`}</span>
                </button>
              ))}
            </div>

            {challengeSelectedMove ? (
              <p className="prediction-line">
                Selected: ({challengeSelectedMove.a}, {challengeSelectedMove.b}) {'->'}{' '}
                {challengeSelectedMove.a + challengeSelectedMove.b}, {challengeSelectedMove.b - 1}
              </p>
            ) : (
              <p className="panel-note">
                {activeChallenge.objectiveType === BLACKBOARD_OBJECTIVES.forecastTrap &&
                challengeHistory.length >= 1
                  ? 'Select the next move, then check whether it preserves the best future.'
                  : 'Select two positive tokens and apply the move.'}
              </p>
            )}

            {challengeMessage && (
              <p className="prediction-line" role="status">
                {challengeMessage}
              </p>
            )}

            <div className="timeline-actions">
              <button
                data-testid="blackboard-challenge-apply"
                disabled={
                  !challengeSelectedMove ||
                  Boolean(challengeResult) ||
                  (activeChallenge.objectiveType === BLACKBOARD_OBJECTIVES.forecastTrap &&
                    challengeHistory.length >= 1)
                }
                onClick={() => applyChallengeMove(challengeSelectedMove)}
              >
                Apply Move
              </button>
              <button
                data-testid="blackboard-challenge-undo"
                disabled={!challengeHistory.length || Boolean(challengeResult)}
                onClick={handleChallengeUndo}
              >
                Undo
              </button>
              <button data-testid="blackboard-challenge-submit" onClick={handleSubmitChallenge}>
                {activeChallenge.objectiveType === BLACKBOARD_OBJECTIVES.forecastTrap
                  ? 'Check Forecast'
                  : 'Submit Terminal Path'}
              </button>
            </div>

            <section className="number-line-panel">
              <div className="number-line-heading">
                <span>Moves</span>
                <strong>History</strong>
                <span data-testid="blackboard-challenge-move-count">
                  {challengeHistory.length}
                </span>
              </div>
              <ol className="move-history blackboard-history">
                {challengeHistory.length === 0 && <li className="empty-history">No moves yet</li>}
                {challengeHistory.map((entry) => (
                  <li key={entry.moveNumber}>
                    <span className="move-main">
                      #{entry.moveNumber}: ({entry.selectedPair.join(', ')}) {'->'}{' '}
                      {formatBoard(entry.resultingBoard)}
                    </span>
                    <span className="move-score">
                      Produced ({entry.producedPair.join(', ')}) | Delta sum{' '}
                      {formatDelta(entry.deltas.sum)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </section>

          <aside className="score-panel">
            <section>
              <h2>Exact Baseline</h2>
              <dl className="score-grid">
                <div>
                  <dt>Optimal min</dt>
                  <dd>{challengeSummary.minMoves}</dd>
                </div>
                <div>
                  <dt>Optimal max</dt>
                  <dd>{challengeSummary.maxMoves}</dd>
                </div>
                <div>
                  <dt>Largest-largest</dt>
                  <dd>{challengeSummary.greedyLargestLargestMoves}</dd>
                </div>
                <div>
                  <dt>Terminal?</dt>
                  <dd>{challengeTerminal ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </section>

            {challengeResult && (
              <section className="strategy-panel" data-testid="blackboard-challenge-result">
                <h2>{challengeResult.success ? 'Success' : 'Try Again'}</h2>
                <div className="result-stars">
                  <strong>Stars earned</strong>
                  <StarDisplay rating={challengeResult.stars} />
                </div>
                <dl className="score-grid">
                  <div>
                    <dt>Your moves</dt>
                    <dd>{challengeResult.playerMoves}</dd>
                  </div>
                  <div>
                    <dt>Optimal min</dt>
                    <dd>{challengeResult.optimalMin}</dd>
                  </div>
                  <div>
                    <dt>Optimal max</dt>
                    <dd>{challengeResult.optimalMax}</dd>
                  </div>
                  <div>
                    <dt>Greedy LL</dt>
                    <dd>{challengeResult.greedyMoves}</dd>
                  </div>
                </dl>
                <p>{challengeResult.explanation}</p>
                <div
                  className="blackboard-explanation-cards"
                  data-testid="blackboard-explanation-cards"
                >
                  {challengeResult.explanationCards.map((card) => (
                    <article className="theorem-card" key={card}>
                      <h3>Strategy Note</h3>
                      <p>{card}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section className="strategy-panel">
              <h2>Progress</h2>
              <dl className="score-grid">
                <div>
                  <dt>Completed</dt>
                  <dd>{challengeProgress.completed[activeChallenge.id] ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Best moves</dt>
                  <dd>{challengeProgress.bestMoveCount[activeChallenge.id] ?? '-'}</dd>
                </div>
                <div>
                  <dt>Saved hints</dt>
                  <dd>{challengeProgress.hintsUsed[activeChallenge.id] ?? 0}</dd>
                </div>
              </dl>
            </section>

            <section className="strategy-panel temporal-stats-panel" data-testid="blackboard-stats-panel">
              <h2>Statistics</h2>
              <dl className="score-grid">
                <div>
                  <dt>Attempts</dt>
                  <dd>{blackboardStats.challengeAttempts}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{blackboardStats.challengesCompleted}</dd>
                </div>
                <div>
                  <dt>Hints used</dt>
                  <dd>{blackboardStats.hintsUsed}</dd>
                </div>
                <div>
                  <dt>Gold paths</dt>
                  <dd>{blackboardStats.optimalCompletions}</dd>
                </div>
                <div>
                  <dt>Moves played</dt>
                  <dd>{blackboardStats.totalMovesPlayed}</dd>
                </div>
                <div>
                  <dt>Greedy beaten</dt>
                  <dd>{blackboardStats.greedyBeatenCount}</dd>
                </div>
                <div>
                  <dt>Research runs</dt>
                  <dd>{blackboardStats.labExperimentsRun}</dd>
                </div>
              </dl>
            </section>

            <section className="strategy-panel">
              <h2>Blackboard Achievements</h2>
              {blackboardAchievements.length ? (
                <div className="achievement-list" data-testid="blackboard-achievements">
                  {blackboardAchievements.map((achievement) => (
                    <div key={achievement.id}>
                      <strong>{achievement.title}</strong>
                      <span>{achievement.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="panel-note">Play a move or finish a challenge to unlock achievements.</p>
              )}
            </section>
          </aside>
        </section>
      ) : (
      <section className="game-layout blackboard-layout">
        <aside className="control-panel">
          <section>
            <h2>Starting Multiset</h2>
            <div className="challenge-presets">
              {PRESETS.map((preset) => (
                <button
                  className={presetId === preset.id ? 'is-selected' : ''}
                  data-testid={`blackboard-preset-${preset.id}`}
                  key={preset.id}
                  onClick={() => handlePreset(preset)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="temporal-field">
              n for 1,2,3,...,n
              <input
                data-testid="blackboard-range-input"
                min="1"
                max="20"
                onChange={(event) => setRangeN(Math.max(1, Number(event.target.value) || 1))}
                type="number"
                value={rangeN}
              />
            </label>
            <label className="temporal-field">
              Custom list
              <input
                data-testid="blackboard-custom-input"
                onChange={(event) => setCustomText(event.target.value)}
                value={customText}
              />
            </label>
            <div className="generator-chip-row">
              {TINY_STATE_PRESETS.map((preset) => (
                <button
                  data-testid={`blackboard-tiny-${preset.replaceAll(',', '-')}`}
                  key={preset}
                  onClick={() => {
                    setCustomText(preset);
                    resetToBoard(parseBoardText(preset), 'custom');
                  }}
                  type="button"
                >
                  {preset}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2>Move Controls</h2>
            <div className="timeline-actions">
              <button
                data-testid="blackboard-apply-move"
                disabled={!selectedMove}
                onClick={() => applySelectedMove(selectedMove)}
              >
                Apply Selected Move
              </button>
              <button data-testid="blackboard-undo" disabled={!history.length} onClick={handleUndo}>
                Undo Move
              </button>
              <button data-testid="blackboard-reset-controls" onClick={handleReset}>
                Reset
              </button>
            </div>
            {selectedMove ? (
              <p className="prediction-line">
                Selected move: {selectedMove.a}, {selectedMove.b} {'->'}{' '}
                {selectedMove.a + selectedMove.b}, {selectedMove.b - 1}
              </p>
            ) : (
              <p className="panel-note">Choose two positive tokens. Zeros stay visible but inactive.</p>
            )}
          </section>

          <section>
            <h2>Greedy Auto-Play</h2>
            <div className="challenge-presets">
              {STRATEGIES.map((strategy) => (
                <button
                  data-testid={`blackboard-greedy-${strategy.id}`}
                  disabled={terminal}
                  key={strategy.id}
                  onClick={() => handleGreedy(strategy.id)}
                  type="button"
                >
                  {strategy.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2>Conjecture Board</h2>
            <div className="conjecture-list">
              {CONJECTURES.map((conjecture) => (
                <label key={conjecture.id}>
                  <input
                    checked={Boolean(conjectures[conjecture.id])}
                    onChange={() => toggleConjecture(conjecture.id)}
                    type="checkbox"
                  />
                  <span>{conjecture.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2>Experiment Runner</h2>
            <label className="temporal-field">
              Family
              <select
                className="blackboard-select"
                data-testid="blackboard-experiment-family"
                onChange={(event) => setExperimentFamily(event.target.value)}
                value={experimentFamily}
              >
                <option value={EXPERIMENT_FAMILIES.triples}>Triples [x,y,z]</option>
                <option value={EXPERIMENT_FAMILIES.consecutive}>Consecutive [1..n]</option>
                <option value={EXPERIMENT_FAMILIES.fixedLength}>Fixed length k, values 1..N</option>
              </select>
            </label>
            <div className="custom-size">
              <label>
                N
                <input
                  data-testid="blackboard-experiment-n"
                  max="12"
                  min="1"
                  onChange={(event) => setExperimentMax(Math.max(1, Number(event.target.value) || 1))}
                  type="number"
                  value={experimentMax}
                />
              </label>
              <label>
                k
                <input
                  data-testid="blackboard-experiment-k"
                  max="5"
                  min="1"
                  onChange={(event) =>
                    setExperimentLength(Math.max(1, Number(event.target.value) || 1))
                  }
                  type="number"
                  value={experimentLength}
                />
              </label>
            </div>
            <div className="timeline-actions">
              <button data-testid="blackboard-run-experiment" onClick={handleRunExperiment}>
                Run Experiment
              </button>
            </div>
          </section>

          <section>
            <h2>Research Experiments</h2>
            <label className="temporal-field">
              Family
              <select
                className="blackboard-select"
                data-testid="blackboard-research-family"
                onChange={(event) => setResearchFamily(event.target.value)}
                value={researchFamily}
              >
                {RESEARCH_FAMILY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="custom-size">
              <label>
                N
                <input
                  data-testid="blackboard-research-n"
                  max="8"
                  min="1"
                  onChange={(event) => setResearchN(Math.max(1, Number(event.target.value) || 1))}
                  type="number"
                  value={researchN}
                />
              </label>
              <label>
                k
                <input
                  data-testid="blackboard-research-k"
                  max="5"
                  min="1"
                  onChange={(event) => setResearchK(Math.max(1, Number(event.target.value) || 1))}
                  type="number"
                  value={researchK}
                />
              </label>
              <label>
                samples
                <input
                  data-testid="blackboard-research-samples"
                  max="180"
                  min="1"
                  onChange={(event) =>
                    setResearchSamples(Math.max(1, Number(event.target.value) || 1))
                  }
                  type="number"
                  value={researchSamples}
                />
              </label>
            </div>
            <div className="timeline-actions">
              <button data-testid="blackboard-run-research" onClick={handleRunResearch}>
                Run Research
              </button>
            </div>
            <p className="panel-note">
              Exact search is capped; capped states are listed but excluded from correlations.
            </p>
          </section>
        </aside>

        <section className="board-stage forge-stage blackboard-stage" aria-label="Blackboard board">
          <div className="forge-result-card">
            <p className="problem-label">Current Board</p>
            <h2>{terminal ? 'No Legal Moves' : 'Move Explorer'}</h2>
            <p className="panel-note">
              A move chooses two entries a,b with a &gt;= b &gt;= 1 and replaces them with
              a+b and b-1.
            </p>
          </div>

          <div className="blackboard-token-grid" data-testid="blackboard-board">
            {board.map((value, index) => (
              <button
                aria-label={`Token ${index + 1}, value ${value}${value === 0 ? ', inactive' : ''}`}
                className={[
                  'blackboard-token',
                  value === 0 ? 'is-inactive' : '',
                  selectedIndices.includes(index) ? 'is-selected' : '',
                ].join(' ')}
                data-testid={`blackboard-token-${index}`}
                disabled={value === 0}
                key={`${index}-${value}`}
                onClick={() => handleTokenClick(index)}
                type="button"
              >
                <strong>{value}</strong>
                <span>{value === 0 ? 'inactive' : `#${index + 1}`}</span>
              </button>
            ))}
          </div>

          {job.busy && <p role="status">Computing in background. <button onClick={job.cancel}>Cancel computation</button></p>}
          {job.error && <p role="alert">{job.error}</p>}
          {message && <p className="prediction-line" role="status">{message}</p>}

          <section className="number-line-panel">
            <div className="number-line-heading">
              <span>Move 0</span>
              <strong>History</strong>
              <span>{history.length}</span>
            </div>
            <ol className="move-history blackboard-history">
              {history.length === 0 && <li className="empty-history">No moves yet</li>}
              {history.map((entry) => (
                <li key={entry.moveNumber}>
                  <span className="move-main">
                    #{entry.moveNumber}: ({entry.selectedPair.join(', ')}) {'->'}{' '}
                    {formatBoard(entry.resultingBoard)}
                  </span>
                  <span className="move-score">
                    Produced ({entry.producedPair.join(', ')}) | Delta sum {formatDelta(entry.deltas.sum)},
                    squares {formatDelta(entry.deltas.sumSquares)}, positives{' '}
                    {formatDelta(entry.deltas.positiveCount)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </section>

        <aside className="score-panel">
          <section>
            <h2>Quantity Tracker</h2>
            <dl className="quantity-grid" data-testid="blackboard-quantity-tracker">
              {[
                ['Sum', 'sum'],
                ['Squares', 'sumSquares'],
                ['Cubes', 'sumCubes'],
                ['Maximum', 'maxValue'],
                ['Positive entries', 'positiveCount'],
                ['Zeros', 'zerosCount'],
                ['Legal moves', 'legalMoveCount'],
              ].map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {quantityChanges.current[key]} ({formatDelta(quantityChanges.deltas[key])})
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="strategy-panel">
            <h2>Invariant Panel</h2>
            <div className="invariant-list" data-testid="blackboard-invariant-panel">
              {invariantCandidates.map((candidate) => (
                <article
                  className={candidate.preserved ? 'is-preserved' : 'is-broken'}
                  key={candidate.id}
                >
                  <strong>{candidate.label}</strong>
                  <span>
                    {candidate.preserved
                      ? `Preserved - value ${candidate.currentValue}`
                      : `Broken at move ${candidate.brokenAtMove} - now ${candidate.currentValue}`}
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2>Analysis Panel</h2>
            <dl className="score-grid">
              <div>
                <dt>Legal moves</dt>
                <dd data-testid="blackboard-legal-count">{legalMoves.length}</dd>
              </div>
              <div>
                <dt>Moves made</dt>
                <dd>{history.length}</dd>
              </div>
              <div>
                <dt>Game over?</dt>
                <dd>{terminal ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt>Current sum</dt>
                <dd>{stats.sum}</dd>
              </div>
              <div>
                <dt>Positive count</dt>
                <dd>{stats.positiveCount}</dd>
              </div>
              <div>
                <dt>Max number</dt>
                <dd>{stats.maxValue}</dd>
              </div>
              <div>
                <dt>Zeros count</dt>
                <dd>{stats.zerosCount}</dd>
              </div>
            </dl>
          </section>

          <section className="strategy-panel">
            <h2>Observation</h2>
            <p>Under the stated move a,b {'->'} a+b,b-1, the total sum changes by b-1.</p>
            <p>Zeros cannot be chosen. The remaining positive entries determine which moves are still possible.</p>
          </section>

          <section className="strategy-panel experiment-panel" data-testid="blackboard-optimal-explainer">
            <h2>Optimal Path Explainer</h2>
            <ResearchLink portalId="blackboard-moves" view="proof">Connect the witness to verification</ResearchLink>
            {optimalExplanation.available ? (
              <>
                <PathReplay key={board.join(',')} path={optimalExplanation.maxPath} />
                <dl className="analysis-grid">
                  <div>
                    <dt>Minimum moves</dt>
                    <dd>{optimalExplanation.minMoves}</dd>
                  </div>
                  <div>
                    <dt>Maximum moves</dt>
                    <dd>{optimalExplanation.maxMoves}</dd>
                  </div>
                  <div>
                    <dt>Min terminal</dt>
                    <dd>{formatBoard(optimalExplanation.minTerminalBoard)}</dd>
                  </div>
                  <div>
                    <dt>Max terminal</dt>
                    <dd>{formatBoard(optimalExplanation.maxTerminalBoard)}</dd>
                  </div>
                </dl>

                <div className="path-comparison-grid">
                  <article data-testid="blackboard-optimal-min-path">
                    <h4>Minimum-move path</h4>
                    <ol tabIndex={0} className="compact-path-list">
                      {optimalExplanation.minPath.map((entry) => (
                        <li key={`min-${entry.moveNumber}`}>
                          #{entry.moveNumber}: {formatBoard(entry.state)} | choose (
                          {entry.chosenPair.join(', ')}) | produce ({entry.producedPair.join(', ')})
                          | result {formatBoard(entry.resultingState)}
                        </li>
                      ))}
                    </ol>
                  </article>
                  <article data-testid="blackboard-optimal-max-path">
                    <h4>Maximum-move path</h4>
                    <ol tabIndex={0} className="compact-path-list">
                      {optimalExplanation.maxPath.map((entry) => (
                        <li key={`max-${entry.moveNumber}`}>
                          #{entry.moveNumber}: {formatBoard(entry.state)} | choose (
                          {entry.chosenPair.join(', ')}) | produce ({entry.producedPair.join(', ')})
                          | result {formatBoard(entry.resultingState)}
                        </li>
                      ))}
                    </ol>
                  </article>
                </div>

                <div tabIndex={0} className="experiment-table-wrap" data-testid="blackboard-greedy-replay">
                  <table className="experiment-table">
                    <thead>
                      <tr>
                        <th>Strategy</th>
                        <th>Moves</th>
                        <th>Terminal</th>
                        <th>Ratio to max</th>
                        <th>First steps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {greedyReplays.map((replay) => (
                        <tr key={replay.id}>
                          <td>{replay.label}</td>
                          <td>{replay.totalMoves}</td>
                          <td>{formatBoard(replay.terminalState)}</td>
                          <td>
                            {replay.ratioToOptimalMax === null
                              ? '-'
                              : replay.ratioToOptimalMax.toFixed(2)}
                          </td>
                          <td>
                            {replay.path.slice(0, 3).map((entry) => (
                              <span className="state-pill" key={`${replay.id}-${entry.moveNumber}`}>
                                #{entry.moveNumber} ({entry.chosenPair.join(', ')})
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="theorem-card" data-testid="blackboard-divergence-detector">
                  <h3>Divergence Detector</h3>
                  {divergenceReports.map((report) => (
                    <p key={report.strategy}>
                      {report.diverged
                        ? `${report.strategy}: move ${report.moveNumber}, greedy chose (${report.greedyChoice.chosenPair.join(', ')}) leading to ${formatBoard(report.greedyChoice.resultingState)} with future max ${report.greedyChoice.futureMaxMoves}; optimal chose (${report.optimalChoice.chosenPair.join(', ')}) leading to ${formatBoard(report.optimalChoice.resultingState)} with future max ${report.optimalChoice.futureMaxMoves}.`
                        : `${report.strategy}: ${report.message}`}
                    </p>
                  ))}
                </div>

                <div tabIndex={0} className="experiment-table-wrap" data-testid="blackboard-branch-analyzer">
                  <table className="experiment-table">
                    <thead>
                      <tr>
                        <th>First move</th>
                        <th>Produced</th>
                        <th>Result</th>
                        <th>Child min</th>
                        <th>Child max</th>
                        <th>Max-opt?</th>
                        <th>Min-opt?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchAnalysis.branches.map((branch) => (
                        <tr key={`${branch.chosenPair.join('-')}-${formatBoard(branch.resultingState)}`}>
                          <td>({branch.chosenPair.join(', ')})</td>
                          <td>({branch.producedPair.join(', ')})</td>
                          <td>{formatBoard(branch.resultingState)}</td>
                          <td>{branch.minMoves}</td>
                          <td>{branch.maxMoves}</td>
                          <td>{branch.optimalForMax ? 'yes' : 'no'}</td>
                          <td>{branch.optimalForMin ? 'yes' : 'no'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="panel-note">{optimalExplanation.reason}</p>
            )}
          </section>

          <section className="strategy-panel">
            <h2>Search Mode</h2>
            <p>
              Brute force uses memoization and sorted board states. It is enabled when current sum
              is at most 30 and board length is at most 5. Expansion and depth budgets also apply.
            </p>
            <div className="timeline-actions">
              <button
                data-testid="blackboard-search"
                disabled={!searchEnabled}
                onClick={handleSearch}
              >
                Compute Move Range
              </button>
            </div>
            {searchResult ? (
              <div className="theorem-card" data-testid="blackboard-search-result">
                <h3>Move Count Range: {searchResult.minMoves} to {searchResult.maxMoves}</h3>
                <p>Minimum terminal board: {formatBoard(searchResult.minTerminalBoard)}</p>
                <p>Maximum terminal board: {formatBoard(searchResult.maxTerminalBoard)}</p>
                <div className="comparison-list">
                  {searchResult.greedyComparisons.map((comparison) => (
                    <p key={comparison.id}>
                      {comparison.label}: {comparison.result.moves} moves
                      {comparison.result.stoppedEarly ? ' (stopped early)' : ''}
                    </p>
                  ))}
                </div>
                <ol tabIndex={0} className="move-history blackboard-optimal-path">
                  {searchResult.maxPath.slice(0, 8).map((entry, index) => (
                    <li key={`${entry.move.id}-${index}`}>
                      <span className="move-main">
                        {index + 1}. ({entry.move.a}, {entry.move.b}) {'->'}{' '}
                        {formatBoard(entry.board)}
                      </span>
                    </li>
                  ))}
                </ol>
                {searchResult.maxPath.length > 8 && (
                  <p className="panel-note">Showing first 8 moves of the optimal path.</p>
                )}
              </div>
            ) : (
              <p className="panel-note">
                {searchEnabled
                  ? 'Run search to compare greedy play with an optimal path.'
                  : 'Exact search is unavailable under the current resource limits.'}
              </p>
            )}
          </section>

          <section className="strategy-panel">
            <h2>State Graph Explorer</h2>
            <p>For tiny boards, generate all reachable canonical board states and move edges.</p>
            <div className="timeline-actions">
              <button
                data-testid="blackboard-state-graph"
                disabled={!graphEnabled}
                onClick={handleStateGraph}
              >
                Generate State Graph
              </button>
            </div>
            {stateGraph ? (
              <div className="theorem-card" data-testid="blackboard-state-graph-result">
                <h3>Reachable State Graph</h3>
                <dl className="analysis-grid">
                  <div>
                    <dt>Total states</dt>
                    <dd>{stateGraph.totalStates}</dd>
                  </div>
                  <div>
                    <dt>Observed terminal states</dt>
                    <dd>{stateGraph.terminalStates}</dd>
                  </div>
                  <div>
                    <dt>Edges</dt>
                    <dd>{stateGraph.edges.length}</dd>
                  </div>
                  <div>
                    <dt>Maximum BFS discovery depth</dt>
                    <dd>{stateGraph.longestPath}</dd>
                  </div>
                </dl>
                <ol tabIndex={0} className="move-history blackboard-optimal-path">
                  {graphNodesByDepth.map((group) => (
                    <li key={group.depth}>
                      <span className="move-main">Depth {group.depth}</span>
                      <span className="move-score">
                        {group.nodes.map((node) => (
                          <span
                            className={node.terminal ? 'state-pill is-terminal' : 'state-pill'}
                            key={node.key}
                          >
                            {node.key || 'empty'}
                            {node.terminal ? ' terminal' : ''}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="path-comparison-grid">
                  <article>
                    <h4>Shortest terminal path</h4>
                    <p>
                      {stateGraph.terminalPaths.shortestMoves} moves to{' '}
                      {formatBoard(stateGraph.terminalPaths.shortestTerminalBoard)}
                    </p>
                    <ol tabIndex={0} className="compact-path-list">
                      {stateGraph.terminalPaths.shortestPath.map((entry, index) => (
                        <li key={`${entry.move.id}-short-${index}`}>
                          ({entry.move.a}, {entry.move.b}) {'->'} {formatBoard(entry.board)}
                        </li>
                      ))}
                    </ol>
                  </article>
                  <article>
                    <h4>Longest terminal path</h4>
                    <p>
                      {stateGraph.terminalPaths.longestMoves} moves to{' '}
                      {formatBoard(stateGraph.terminalPaths.longestTerminalBoard)}
                    </p>
                    <ol tabIndex={0} className="compact-path-list">
                      {stateGraph.terminalPaths.longestPath.map((entry, index) => (
                        <li key={`${entry.move.id}-long-${index}`}>
                          ({entry.move.a}, {entry.move.b}) {'->'} {formatBoard(entry.board)}
                        </li>
                      ))}
                    </ol>
                  </article>
                </div>
              </div>
            ) : (
              <p className="panel-note">
                {graphEnabled ? 'Generate a graph for the current tiny board.' : 'Current board is too large.'}
              </p>
            )}
          </section>

          <section className="strategy-panel experiment-panel" data-testid="blackboard-research-panel">
            <h2>Research Mode</h2>
            {researchResults.length ? (
              <>
                <dl className="analysis-grid">
                  <div>
                    <dt>Computed</dt>
                    <dd>{researchSummary?.computed || 0}</dd>
                  </div>
                  <div>
                    <dt>Capped</dt>
                    <dd>{researchSummary?.skipped || 0}</dd>
                  </div>
                  <div>
                    <dt>Filtered</dt>
                    <dd>{filteredResearchResults.length}</dd>
                  </div>
                  <div>
                    <dt>Family</dt>
                    <dd>{RESEARCH_FAMILY_OPTIONS.find((option) => option.id === researchFamily)?.label}</dd>
                  </div>
                </dl>

                <div className="custom-size">
                  <label>
                    Filter
                    <select
                      className="blackboard-select"
                      data-testid="blackboard-research-filter"
                      onChange={(event) => setResearchFilter(event.target.value)}
                      value={researchFilter}
                    >
                      {RESEARCH_FILTER_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    X
                    <input
                      data-testid="blackboard-research-range-threshold"
                      min="0"
                      onChange={(event) =>
                        setResearchRangeThreshold(Math.max(0, Number(event.target.value) || 0))
                      }
                      type="number"
                      value={researchRangeThreshold}
                    />
                  </label>
                </div>

                <div className="theorem-card" data-testid="blackboard-research-conjectures">
                  <h3>Cautious Conjecture Generator</h3>
                  {researchConjectures.map((observation) => (
                    <p key={observation}>{observation}</p>
                  ))}
                </div>

                <div tabIndex={0} className="experiment-table-wrap" data-testid="blackboard-correlation-table">
                  <table className="experiment-table">
                    <thead>
                      <tr>
                        <th>Predictor</th>
                        <th>Target</th>
                        <th>Exact</th>
                        <th>Pearson</th>
                        <th>Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {researchPatterns.slice(0, 12).map((pattern) => (
                        <tr key={`${pattern.predictor}-${pattern.target}`}>
                          <td>{pattern.predictorLabel}</td>
                          <td>{pattern.targetLabel}</td>
                          <td>{pattern.exactMatches}</td>
                          <td>{pattern.pearson.toFixed(3)}</td>
                          <td>{pattern.rank.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div tabIndex={0} className="experiment-table-wrap" data-testid="blackboard-strategy-table">
                  <table className="experiment-table">
                    <thead>
                      <tr>
                        <th>State</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Range</th>
                        <th>LL ratio</th>
                        <th>LS ratio</th>
                        <th>Closest ratio</th>
                        <th>Random ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResearchResults.slice(0, 80).map((result) => (
                        <tr key={result.startKey}>
                          <td>{formatBoard(result.state)}</td>
                          <td>{result.minMoves}</td>
                          <td>{result.maxMoves}</td>
                          <td>{result.range}</td>
                          <td>{result.strategies.largestLargest.ratio.toFixed(2)}</td>
                          <td>{result.strategies.largestSmallest.ratio.toFixed(2)}</td>
                          <td>{result.strategies.closestPair.ratio.toFixed(2)}</td>
                          <td>{result.strategies.randomAverage.ratio.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="timeline-actions">
                  <button
                    data-testid="blackboard-export-research-csv"
                    onClick={() => handleExportResearch('csv')}
                  >
                    Export Research CSV
                  </button>
                  <button
                    data-testid="blackboard-export-research-json"
                    onClick={() => handleExportResearch('json')}
                  >
                    Export Research JSON
                  </button>
                </div>
                {exportText && (
                  <textarea
                    aria-label="Research export data"
                    className="graph-json"
                    data-testid="blackboard-research-export-text"
                    readOnly
                    value={exportText}
                  />
                )}
              </>
            ) : (
              <p className="panel-note">
                Run Research Experiments to compare strategies, mine correlations, and export data.
              </p>
            )}
          </section>

          <section className="strategy-panel experiment-panel">
            <h2>Experiment Results</h2>
            <div className="custom-size">
              <label>
                Sort by
                <select
                  className="blackboard-select"
                  data-testid="blackboard-experiment-sort"
                  onChange={(event) => setExperimentSort(event.target.value)}
                  value={experimentSort}
                >
                  <option value="maxMoves">max moves</option>
                  <option value="range">range</option>
                  <option value="sum">sum</option>
                  <option value="start">start state</option>
                </select>
              </label>
              <label>
                Formula
                <select
                  className="blackboard-select"
                  data-testid="blackboard-formula-select"
                  onChange={(event) => setFormulaId(event.target.value)}
                  value={formulaId}
                >
                  {FORMULAS.map((formula) => (
                    <option key={formula.id} value={formula.id}>
                      {formula.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {experimentResults.length ? (
              <>
                <div className="theorem-card experiment-visual-card" data-testid="blackboard-heatmap-panel">
                  <h3>Triple Heatmap Slices</h3>
                  <div className="custom-size">
                    <label>
                      N
                      <input
                        data-testid="blackboard-heatmap-n"
                        max="12"
                        min="1"
                        onChange={(event) => {
                          const nextN = Math.max(1, Number(event.target.value) || 1);

                          setHeatmapN(nextN);
                          setHeatmapZ((current) => Math.min(current, nextN));
                          setSelectedHeatmapCell(null);
                        }}
                        type="number"
                        value={heatmapN}
                      />
                    </label>
                    <label>
                      Fixed z
                      <select
                        className="blackboard-select"
                        data-testid="blackboard-heatmap-z"
                        onChange={(event) => {
                          setHeatmapZ(Number(event.target.value));
                          setSelectedHeatmapCell(null);
                        }}
                        value={Math.min(heatmapZ, heatmapN)}
                      >
                        {Array.from({ length: heatmapN }, (_, index) => index + 1).map((value) => (
                          <option key={value} value={value}>
                            z = {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Metric
                      <select
                        className="blackboard-select"
                        data-testid="blackboard-heatmap-metric"
                        onChange={(event) => {
                          setHeatmapMetric(event.target.value);
                          setSelectedHeatmapCell(null);
                        }}
                        value={heatmapMetric}
                      >
                        {HEATMAP_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div
                    className="blackboard-heatmap"
                    data-testid="blackboard-heatmap"
                    style={{ '--heatmap-size': heatmapSlice.fixedZ + 1 }}
                  >
                    <span className="heatmap-corner">y/x</span>
                    {heatmapSlice.xLabels.map((x) => (
                      <span className="heatmap-axis" key={`x-${x}`}>
                        {x}
                      </span>
                    ))}
                    {heatmapSlice.rows.map((row) => (
                      <div className="heatmap-row" key={row.y}>
                        <span className="heatmap-axis">{row.y}</span>
                        {row.cells.map((cell, index) =>
                          cell ? (
                            <button
                              aria-label={`State ${formatBoard(cell.state)}, ${heatmapMetric} ${cell.value}`}
                              className="heatmap-cell"
                              data-testid={`blackboard-heatmap-cell-${cell.x}-${cell.y}`}
                              key={`${cell.x}-${cell.y}-${cell.z}`}
                              onClick={() => setSelectedHeatmapCell(cell)}
                              style={{
                                '--heatmap-alpha':
                                  heatmapSlice.maxValueInSlice === heatmapSlice.minValue
                                    ? 0.58
                                    : 0.22 +
                                      ((cell.value - heatmapSlice.minValue) /
                                        (heatmapSlice.maxValueInSlice - heatmapSlice.minValue)) *
                                        0.68,
                              }}
                              title={`${formatBoard(cell.state)} | min ${cell.minMoves}, max ${cell.maxMoves}, range ${cell.range}, terminal states ${cell.terminalCount}`}
                              type="button"
                            >
                              {cell.value}
                            </button>
                          ) : (
                            <span
                              aria-hidden="true"
                              className="heatmap-cell is-empty"
                              key={`empty-${row.y}-${index}`}
                            />
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="panel-note">
                    Slice z = {heatmapSlice.fixedZ}. Values range from {heatmapSlice.minValue} to{' '}
                    {heatmapSlice.maxValueInSlice}.
                  </p>
                  {selectedHeatmapCell && (
                    <p className="prediction-line" data-testid="blackboard-heatmap-detail">
                      {formatBoard(selectedHeatmapCell.state)}: min {selectedHeatmapCell.minMoves},
                      max {selectedHeatmapCell.maxMoves}, range {selectedHeatmapCell.range},
                      terminal states {selectedHeatmapCell.terminalCount}
                    </p>
                  )}
                </div>

                <div
                  className="theorem-card experiment-visual-card"
                  data-testid="blackboard-consecutive-plot"
                >
                  <h3>Consecutive Set Plot</h3>
                  <label className="temporal-field">
                    N for [1,2,...,n]
                    <input
                      data-testid="blackboard-consecutive-n"
                      max="12"
                      min="1"
                      onChange={(event) =>
                        setConsecutivePlotN(Math.max(1, Number(event.target.value) || 1))
                      }
                      type="number"
                      value={consecutivePlotN}
                    />
                  </label>
                  <div className="consecutive-chart">
                    {consecutivePlotData.map((entry) => (
                      <article
                        className={entry.fixedCount ? 'is-fixed' : ''}
                        key={entry.n}
                        title={
                          entry.capped
                            ? `n=${entry.n}, capped by search limits`
                            : `n=${entry.n}, min ${entry.minMoves}, max ${entry.maxMoves}, range ${entry.range}`
                        }
                      >
                        <span>n={entry.n}</span>
                        <div>
                          <span
                            style={{
                              width: `${entry.capped ? 8 : Math.max(8, entry.maxMoves * 8)}px`,
                            }}
                          />
                        </div>
                        <strong>{entry.capped ? 'cap' : entry.maxMoves}</strong>
                      </article>
                    ))}
                  </div>
                  <div tabIndex={0} className="experiment-table-wrap mini-table">
                    <table className="experiment-table">
                      <thead>
                        <tr>
                          <th>n</th>
                          <th>min</th>
                          <th>max</th>
                          <th>range</th>
                          <th>status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consecutivePlotData.map((entry) => (
                          <tr className={entry.fixedCount ? 'is-fixed-row' : ''} key={entry.n}>
                            <td>{entry.n}</td>
                            <td>{entry.capped ? '-' : entry.minMoves}</td>
                            <td>{entry.capped ? '-' : entry.maxMoves}</td>
                            <td>{entry.capped ? '-' : entry.range}</td>
                            <td>
                              {entry.capped
                                ? 'capped'
                                : entry.fixedCount
                                ? 'min = max'
                                : 'variable'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="theorem-card" data-testid="blackboard-pattern-finder">
                  <h3>
                    {experimentPatterns.detected
                      ? 'Possible pattern detected'
                      : 'No simple pattern detected.'}
                  </h3>
                  {experimentPatterns.detected ? (
                    experimentPatterns.observations.map((observation) => (
                      <p key={observation}>{observation}</p>
                    ))
                  ) : (
                    <p>No tested simple rule matched the full batch. Try changing family or N.</p>
                  )}
                </div>

                <div className="theorem-card" data-testid="blackboard-formula-result">
                  <h3>Formula Candidate Tester</h3>
                  <p>
                    Exact matches: {formulaResult.exactMatches} / {experimentResults.length}
                  </p>
                  <p>Mismatches: {formulaResult.mismatches}</p>
                  {formulaResult.counterexamples.map((counterexample) => (
                    <button
                      className="counterexample-button"
                      data-testid={`blackboard-counterexample-${counterexample.startState.join('-')}`}
                      key={counterexample.startState.join(',')}
                      onClick={() => handleCounterexample(counterexample)}
                      type="button"
                    >
                      Counterexample {formatBoard(counterexample.startState)}: predicted{' '}
                      {counterexample.predicted}, actual {counterexample.actual}, diff{' '}
                      {counterexample.difference}
                    </button>
                  ))}
                  {selectedCounterexample && (
                    <div
                      className="counterexample-detail"
                      data-testid="blackboard-counterexample-detail"
                    >
                      <h4>Loaded Counterexample</h4>
                      <p>State: {formatBoard(selectedCounterexample.startState)}</p>
                      <p>Formula value: {selectedCounterexample.formulaValue}</p>
                      <p>Actual maxMoves: {selectedCounterexample.actualMaxMoves}</p>
                      <p>Difference: {selectedCounterexample.difference}</p>
                      <p>Terminal board: {formatBoard(selectedCounterexample.terminalBoard)}</p>
                      <ol tabIndex={0} className="compact-path-list">
                        {selectedCounterexample.optimalPath.map((entry, index) => (
                          <li key={`${entry.move.id}-counterexample-${index}`}>
                            ({entry.move.a}, {entry.move.b}) {'->'} {formatBoard(entry.board)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                <div className="timeline-actions">
                  <button
                    data-testid="blackboard-export-csv"
                    onClick={() => handleExportExperiment('csv')}
                  >
                    Export CSV
                  </button>
                  <button
                    data-testid="blackboard-export-json"
                    onClick={() => handleExportExperiment('json')}
                  >
                    Export JSON
                  </button>
                </div>
                {exportText && (
                  <textarea
                    aria-label="Experiment export data"
                    className="graph-json"
                    data-testid="blackboard-export-text"
                    readOnly
                    value={exportText}
                  />
                )}

                <div tabIndex={0} className="experiment-table-wrap" data-testid="blackboard-results-table">
                  <table className="experiment-table">
                    <thead>
                      <tr>
                        <th>Start state</th>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Range</th>
                        <th>Sum</th>
                        <th>Max value</th>
                        <th>Positive</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedExperimentResults.slice(0, 80).map((result) => (
                        <tr key={result.startKey}>
                          <td>{formatBoard(result.startState)}</td>
                          <td>{result.minMoves}</td>
                          <td>{result.maxMoves}</td>
                          <td>{result.range}</td>
                          <td>{result.sum}</td>
                          <td>{result.max}</td>
                          <td>{result.positiveCount}</td>
                          <td>
                            {result.minMoves === result.maxMoves ? 'fixed count' : 'variable count'}
                            {result.largestLargestOptimal ? '; LL optimal' : ''}
                            {result.graphTruncated ? '; graph truncated' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="panel-note">
                Run a batch experiment to compare min/max counts and candidate formulas.
              </p>
            )}
          </section>
        </aside>
      </section>
      )}
    </main>
  );
}
