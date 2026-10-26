import { useCallback, useEffect, useMemo, useState } from 'react';
import { AI_DIFFICULTIES, chooseAiMove, predictWinnerPerfectPlay } from './ai.js';
import {
  CAMPAIGN_LEVELS,
  getCampaignStats,
  getLevelStars,
  getObjectiveMet,
  isCampaignComplete,
  loadCampaignProgress,
  saveCampaignProgress,
} from './campaign.js';
import {
  loadGridDominionStats,
  recordFinishedGame,
  saveGridDominionStats,
} from './stats.js';
import {
  COLORS,
  PRESET_SIZES,
  countEdges,
  createBoard,
  getSameColorEdges,
  getWinner,
  placePeg,
} from './logic.js';
import { recordTheoremCardOpened } from '../../profile/profile.js';
import { runMathTask } from '../../core/runMathTask.js';

const MODES = {
  local: 'local',
  ai: 'ai',
};

const EXPERIENCE_MODES = {
  sandbox: 'sandbox',
  campaign: 'campaign',
};

const CHALLENGE_PRESETS = [
  { label: '1x1: No edges', rows: 1, cols: 1 },
  { label: '1x3: First imbalance', rows: 1, cols: 3 },
  { label: '2x2: Symmetry test', rows: 2, cols: 2 },
  { label: '3x3: Center fight', rows: 3, cols: 3 },
  { label: '5x5: Full board battle', rows: 5, cols: 5 },
];

const DIFFICULTY_OPTIONS = [
  { value: AI_DIFFICULTIES.easy, label: 'Easy', description: 'random' },
  { value: AI_DIFFICULTIES.normal, label: 'Normal', description: 'greedy imbalance' },
  { value: AI_DIFFICULTIES.hard, label: 'Hard', description: 'exact at up to 10 empty cells; otherwise depth-4 estimate' },
];

const clampSize = (value) => Math.max(1, Math.min(9, Number(value) || 1));
const formatColor = (color) => color.charAt(0).toUpperCase() + color.slice(1);
const formatCell = (row, col) => `${String.fromCharCode(65 + col)}${row + 1}`;
const getColorSymbol = (color) => color.charAt(0).toUpperCase();

function getStrategyAnalysis(score) {
  const imbalance = Math.abs(score.difference);

  if (score.difference === 0) {
    return {
      imbalance,
      status: 'Balanced',
      favoredPlayer: 'Player 2',
      explanation: 'The current difference is zero, matching Player 2\'s terminal goal. This alone does not predict the winner.',
    };
  }

  if (imbalance === 1) {
    return {
      imbalance,
      status: score.difference > 0 ? 'Blue ahead' : 'Red ahead',
      favoredPlayer: 'Player 1',
      explanation:
        'The current difference is nonzero, matching Player 1\'s terminal goal. This alone does not predict the winner.',
    };
  }

  return {
    imbalance,
    status: score.difference > 0 ? 'Blue ahead' : 'Red ahead',
    favoredPlayer: 'Player 1',
    explanation: 'The current difference is nonzero, matching Player 1\'s terminal goal. This alone does not predict the winner.',
  };
}

function getPatternNote(rows, cols) {
  const totalCells = rows * cols;

  if (rows === 1 && cols === 1) {
    return 'No edges exist, so Player 2 wins.';
  }

  if ((rows === 1 || cols === 1) && totalCells > 1 && totalCells % 2 === 1) {
    return 'There is a unique center cell; this often helps Player 1 break symmetry.';
  }

  if (totalCells % 2 === 0) {
    return 'Even-cell boards often allow pairing or symmetry strategies for Player 2.';
  }

  if (rows % 2 === 1 && cols % 2 === 1) {
    return 'A unique central cell may give Player 1 a symmetry-breaking target.';
  }

  return 'Explore this board experimentally.';
}

export default function GridDominion({ onBack }) {
  const [experienceMode, setExperienceMode] = useState(EXPERIENCE_MODES.sandbox);
  const [mode, setMode] = useState(MODES.local);
  const [humanPlayer, setHumanPlayer] = useState(1);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [board, setBoard] = useState(() => createBoard(3, 3));
  const [selectedColor, setSelectedColor] = useState(COLORS.red);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [moveHistory, setMoveHistory] = useState([]);
  const [showMathLab, setShowMathLab] = useState(false);
  const [showTheoremMode, setShowTheoremMode] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState(AI_DIFFICULTIES.normal);
  const [activeCampaignIndex, setActiveCampaignIndex] = useState(0);
  const [campaignProgress, setCampaignProgress] = useState(() => loadCampaignProgress());
  const [gridStats, setGridStats] = useState(() => loadGridDominionStats());
  const [gameRecorded, setGameRecorded] = useState(false);
  const [campaignGameRecorded, setCampaignGameRecorded] = useState(false);
  const [campaignResult, setCampaignResult] = useState(null);
  const [perfectPrediction, setPerfectPrediction] = useState({
    status: 'calculating',
    winner: null,
  });

  const isCampaign = experienceMode === EXPERIENCE_MODES.campaign;
  const campaignLevel = CAMPAIGN_LEVELS[activeCampaignIndex];
  const campaignStats = useMemo(() => getCampaignStats(campaignProgress), [campaignProgress]);
  const campaignComplete = useMemo(() => isCampaignComplete(campaignProgress), [campaignProgress]);
  const score = useMemo(() => countEdges(board), [board]);
  const winner = getWinner(score);
  const sameColorEdges = useMemo(() => getSameColorEdges(board), [board]);
  const totalCells = rows * cols;
  const aiPlayer = humanPlayer === 1 ? 2 : 1;
  const isAiTurn = mode === MODES.ai && currentPlayer === aiPlayer && !winner;
  const isHumanTurn = mode === MODES.local || !isAiTurn;
  const strategyAnalysis = useMemo(() => getStrategyAnalysis(score), [score]);
  const predictionMatchesPosition = perfectPrediction.board === board &&
    perfectPrediction.currentPlayer === currentPlayer;
  const mathLab = {
    totalPossibleEdges: rows * (cols - 1) + cols * (rows - 1),
    occupiedCells: totalCells - score.emptyCells,
    totalCellParity: totalCells % 2 === 0 ? 'Even' : 'Odd',
    hasUniqueCenter: rows % 2 === 1 && cols % 2 === 1 ? 'Yes' : 'No',
    absoluteImbalance: Math.abs(score.difference),
  };
  const patternNote = getPatternNote(rows, cols);

  useEffect(() => {
    saveCampaignProgress(campaignProgress);
  }, [campaignProgress]);

  useEffect(() => {
    saveGridDominionStats(gridStats);
  }, [gridStats]);

  useEffect(() => {
    if (score.emptyCells > 10) {
      setPerfectPrediction({ status: 'unavailable', winner: null });
      return undefined;
    }

    setPerfectPrediction({ status: 'calculating', winner: null });
    const controller = new AbortController();
    runMathTask('grid-predict', { board, currentPlayer }, { signal: controller.signal }).then((predictedWinner) => {
      if (controller.signal.aborted) return;
      setPerfectPrediction({
        status: predictedWinner === null ? 'unavailable' : 'available',
        winner: predictedWinner,
        board,
        currentPlayer,
      });
    }).catch((error) => {
      if (error.name !== 'AbortError') setPerfectPrediction({ status: 'unavailable', winner: null, board, currentPlayer });
    });

    return () => {
      controller.abort();
    };
  }, [board, currentPlayer, score.emptyCells]);

  const resetGame = useCallback((nextRows = rows, nextCols = cols) => {
    setRows(nextRows);
    setCols(nextCols);
    setBoard(createBoard(nextRows, nextCols));
    setSelectedColor(COLORS.red);
    setCurrentPlayer(1);
    setMoveHistory([]);
    setAiThinking(false);
    setGameRecorded(false);
  }, [cols, rows]);

  const startSandbox = useCallback(() => {
    setExperienceMode(EXPERIENCE_MODES.sandbox);
    setMode(MODES.local);
    setHumanPlayer(1);
    setAiDifficulty(AI_DIFFICULTIES.normal);
    setCampaignResult(null);
    setCampaignGameRecorded(false);
    resetGame(3, 3);
  }, [resetGame]);

  const startCampaignLevel = useCallback((levelIndex) => {
    const level = CAMPAIGN_LEVELS[levelIndex];

    if (!level || level.number > campaignProgress.unlockedLevel) {
      return;
    }

    setExperienceMode(EXPERIENCE_MODES.campaign);
    setActiveCampaignIndex(levelIndex);
    setMode(level.mode || MODES.local);
    setHumanPlayer(level.humanPlayer || 1);
    setAiDifficulty(level.aiDifficulty || AI_DIFFICULTIES.normal);
    setCampaignResult(null);
    setCampaignGameRecorded(false);
    resetGame(level.rows, level.cols);
  }, [campaignProgress.unlockedLevel, resetGame]);

  const startCampaign = useCallback(() => {
    const firstIncompleteIndex = CAMPAIGN_LEVELS.findIndex(
      (level) => !campaignProgress.completedLevels[level.id],
    );
    const nextIndex =
      firstIncompleteIndex === -1
        ? CAMPAIGN_LEVELS.length - 1
        : Math.min(firstIncompleteIndex, campaignProgress.unlockedLevel - 1);

    startCampaignLevel(nextIndex);
  }, [campaignProgress.completedLevels, campaignProgress.unlockedLevel, startCampaignLevel]);

  const restartCampaignLevel = useCallback(() => {
    startCampaignLevel(activeCampaignIndex);
  }, [activeCampaignIndex, startCampaignLevel]);

  const goToNextCampaignLevel = useCallback(() => {
    startCampaignLevel(Math.min(activeCampaignIndex + 1, CAMPAIGN_LEVELS.length - 1));
  }, [activeCampaignIndex, startCampaignLevel]);

  const applyMove = useCallback((move, actor) => {
    setBoard((currentBoard) => {
      if (currentBoard[move.row][move.col] !== null) {
        return currentBoard;
      }

      const nextBoard = placePeg(currentBoard, move.row, move.col, move.color);
      const nextScore = countEdges(nextBoard);

      setMoveHistory((history) => [
        ...history,
        {
          move: history.length + 1,
          player: actor.player,
          actorLabel: actor.label,
          cell: formatCell(move.row, move.col),
          color: move.color,
          score: nextScore,
        },
      ]);
      setCurrentPlayer((player) => (player === 1 ? 2 : 1));

      return nextBoard;
    });
  }, []);

  useEffect(() => {
    if (!isAiTurn) {
      return undefined;
    }

    setAiThinking(true);
    setAiError('');
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
      const move = aiDifficulty === AI_DIFFICULTIES.hard
        ? await runMathTask('grid-ai', { board, aiPlayer, difficulty: aiDifficulty }, { signal: controller.signal })
        : chooseAiMove(board, aiPlayer, aiDifficulty);
      if (controller.signal.aborted) return;

      if (move) {
        applyMove(move, { label: `AI/P${aiPlayer}`, player: aiPlayer });
      }

      setAiThinking(false);
      } catch (error) {
        if (error.name !== 'AbortError') { setAiError(error.message); setAiThinking(false); }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [aiDifficulty, aiPlayer, applyMove, board, isAiTurn]);

  useEffect(() => {
    if (!winner || gameRecorded) {
      return;
    }

    const completedCampaignLevel =
      isCampaign && campaignLevel && !campaignProgress.completedLevels[campaignLevel.id];

    setGameRecorded(true);
    setGridStats((stats) =>
      recordFinishedGame(stats, {
        winner,
        mode,
        completedCampaignLevel,
      }),
    );
  }, [
    campaignLevel,
    campaignProgress.completedLevels,
    gameRecorded,
    isCampaign,
    mode,
    winner,
  ]);

  useEffect(() => {
    if (!isCampaign || !winner || campaignGameRecorded) {
      return;
    }

    const objectiveMet = getObjectiveMet(campaignLevel, score, winner, humanPlayer);
    const stars = getLevelStars(campaignLevel, objectiveMet, winner, humanPlayer, aiDifficulty);

    setCampaignResult({ objectiveMet, stars });
    setCampaignGameRecorded(true);
    setCampaignProgress((progress) => {
      const nextProgress = {
        ...progress,
        unlockedLevel: Math.max(
          progress.unlockedLevel,
          Math.min(campaignLevel.number + 1, CAMPAIGN_LEVELS.length),
        ),
        completedLevels: {
          ...progress.completedLevels,
          [campaignLevel.id]: true,
        },
        stars: {
          ...progress.stars,
          [campaignLevel.id]: stars,
        },
        totalMovesPlayed: progress.totalMovesPlayed + moveHistory.length,
        totalGamesFinished: progress.totalGamesFinished + 1,
      };

      return nextProgress;
    });
  }, [
    aiDifficulty,
    campaignGameRecorded,
    campaignLevel,
    humanPlayer,
    isCampaign,
    moveHistory.length,
    score,
    winner,
  ]);

  const handleCellKeyDown = (event, row, col) => {
    const keyDeltas = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = keyDeltas[event.key];

    if (!delta) {
      return;
    }

    event.preventDefault();
    const nextRow = Math.max(0, Math.min(rows - 1, row + delta[0]));
    const nextCol = Math.max(0, Math.min(cols - 1, col + delta[1]));
    document
      .querySelector(`[data-board-cell="${nextRow}-${nextCol}"]`)
      ?.focus();
  };

  const getCellLabel = (row, col, cell) => {
    const cellName = formatCell(row, col);

    if (cell) {
      return `Cell ${cellName}, ${formatColor(cell)} peg, ${getColorSymbol(cell)}`;
    }

    return `Cell ${cellName}, empty. Press Enter to place ${formatColor(selectedColor)}`;
  };

  const handlePreset = (size) => {
    setExperienceMode(EXPERIENCE_MODES.sandbox);
    resetGame(size.rows, size.cols);
  };

  const handleModeChange = (nextMode) => {
    setExperienceMode(EXPERIENCE_MODES.sandbox);
    setMode(nextMode);
    resetGame();
  };

  const handleHumanPlayerChange = (nextHumanPlayer) => {
    setHumanPlayer(nextHumanPlayer);
    resetGame();
  };

  const handleCustomSize = (dimension, value) => {
    setExperienceMode(EXPERIENCE_MODES.sandbox);
    const nextRows = dimension === 'rows' ? clampSize(value) : rows;
    const nextCols = dimension === 'cols' ? clampSize(value) : cols;
    resetGame(nextRows, nextCols);
  };

  const handleCellClick = (row, col) => {
    if (winner || board[row][col] !== null || !isHumanTurn || aiThinking) {
      return;
    }

    const actorLabel = mode === MODES.ai ? `Human/P${humanPlayer}` : `P${currentPlayer}`;
    applyMove(
      {
        row,
        col,
        color: selectedColor,
      },
      {
        label: actorLabel,
        player: currentPlayer,
      },
    );
  };

  return (
    <main className="arcade-shell game-page grid-dominion-page">
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
          <p className="problem-label">Problem 4</p>
          <h1>Grid Dominion</h1>
        </div>
        <button
          className="ghost-action"
          data-testid="grid-dominion-reset"
          onClick={isCampaign ? restartCampaignLevel : () => resetGame()}
          aria-label={isCampaign ? 'Restart level' : 'Reset game'}
        >
          {isCampaign ? 'Restart Level' : 'Reset'}
        </button>
      </header>

      <section className="game-layout">
        <aside className="control-panel">
          <section className="campaign-entry-card">
            <h2>Expedition</h2>
            <div className="segmented-control" role="group" aria-label="Experience mode">
              <button
                className={experienceMode === EXPERIENCE_MODES.sandbox ? 'is-selected' : ''}
                data-testid="grid-dominion-mode-sandbox"
                onClick={startSandbox}
              >
                Sandbox
              </button>
              <button
                className={experienceMode === EXPERIENCE_MODES.campaign ? 'is-selected' : ''}
                data-testid="grid-dominion-mode-campaign"
                onClick={startCampaign}
              >
                Campaign
              </button>
            </div>
            <p>
                Five small boards introduce the game, then test your strategy.
            </p>
          </section>

          {isCampaign && (
            <section className="campaign-level-card">
              <div className="campaign-progress-line">
                <span>Level {campaignLevel.number} / {CAMPAIGN_LEVELS.length}</span>
                <span>
                  {campaignStats.levelsCompleted} completed
                </span>
              </div>
              <h2>{campaignLevel.title}</h2>
              <div className="campaign-lesson">
                <h3>Lesson</h3>
                <ul>
                  {campaignLevel.lesson.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="campaign-objective">
                <h3>Objective</h3>
                <p>{campaignLevel.objective}</p>
              </div>
              {campaignResult && (
                <div className="campaign-result">
                  <span>{campaignResult.objectiveMet ? 'Objective satisfied' : 'Level complete'}</span>
                  <div className="star-row" aria-label="Challenge stars">
                    <span className={campaignResult.stars.bronze ? 'is-earned' : ''}>Bronze</span>
                    <span className={campaignResult.stars.silver ? 'is-earned' : ''}>Silver</span>
                    <span className={campaignResult.stars.gold ? 'is-earned' : ''}>Gold</span>
                  </div>
                </div>
              )}
              <div className="campaign-actions">
                <button data-testid="grid-dominion-restart-level" onClick={restartCampaignLevel}>
                  Restart Level
                </button>
                <button
                  disabled={
                    !campaignProgress.completedLevels[campaignLevel.id] ||
                    campaignLevel.number >= CAMPAIGN_LEVELS.length
                  }
                  data-testid="grid-dominion-next-level"
                  onClick={goToNextCampaignLevel}
                >
                  Next Level
                </button>
                <button data-testid="grid-dominion-return-sandbox" onClick={startSandbox}>
                  Return to Sandbox
                </button>
              </div>
            </section>
          )}

          <section>
            <h2>{isCampaign ? 'Campaign Mode' : 'Mode'}</h2>
            <div className="segmented-control" role="group" aria-label="Game mode">
              <button
                className={mode === MODES.local ? 'is-selected' : ''}
                disabled={isCampaign}
                data-testid="grid-dominion-game-mode-local"
                onClick={() => handleModeChange(MODES.local)}
              >
                Local 2 Player
              </button>
              <button
                className={mode === MODES.ai ? 'is-selected' : ''}
                disabled={isCampaign}
                data-testid="grid-dominion-game-mode-ai"
                onClick={() => handleModeChange(MODES.ai)}
              >
                Human vs AI
              </button>
            </div>
            {mode === MODES.ai && (
              <>
                <div className="player-choice">
                  <span>Play as</span>
                  <div className="segmented-control compact" role="group" aria-label="Human player">
                    {[1, 2].map((player) => (
                      <button
                        className={humanPlayer === player ? 'is-selected' : ''}
                        disabled={isCampaign}
                        key={player}
                        onClick={() => handleHumanPlayerChange(player)}
                      >
                        Player {player}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="difficulty-choice">
                  <span>AI difficulty</span>
                  <div className="segmented-control compact" role="group" aria-label="AI difficulty">
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <button
                        className={aiDifficulty === option.value ? 'is-selected' : ''}
                        disabled={aiThinking || isCampaign}
                        key={option.value}
                        onClick={() => setAiDifficulty(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p>
                    {DIFFICULTY_OPTIONS.map((option) => `${option.label}: ${option.description}`).join(
                      ' | ',
                    )}
                  </p>
                </div>
              </>
            )}
          </section>

          {!isCampaign && (
            <>
              <section>
                <h2>Board</h2>
                <div className="size-presets">
                  {PRESET_SIZES.map((size) => (
                    <button
                      className={rows === size.rows && cols === size.cols ? 'is-selected' : ''}
                      key={size.label}
                      onClick={() => handlePreset(size)}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
                <div className="custom-size">
                  <label>
                    m
                    <input
                      min="1"
                      max="9"
                      type="number"
                      value={rows}
                      onChange={(event) => handleCustomSize('rows', event.target.value)}
                    />
                  </label>
                  <label>
                    n
                    <input
                      min="1"
                      max="9"
                      type="number"
                      value={cols}
                      onChange={(event) => handleCustomSize('cols', event.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section>
                <h2>Challenge presets</h2>
                <div className="challenge-presets">
                  {CHALLENGE_PRESETS.map((preset) => (
                    <button key={preset.label} onClick={() => handlePreset(preset)}>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}

          <section>
            <h2>Turn</h2>
            <div className={`turn-readout ${aiThinking ? 'is-thinking' : ''}`}>
              {aiThinking ? 'AI thinking...' : `Player ${currentPlayer}`}
            </div>
            <p className="turn-note">
              Player 1 wants unequal line counts. Player 2 wants equal line counts.
            </p>
            <div className="color-selector" role="group" aria-label="Peg color">
              {Object.values(COLORS).map((color) => (
                <button
                  className={`color-choice ${color} ${selectedColor === color ? 'is-selected' : ''}`}
                  disabled={!isHumanTurn || aiThinking}
                  key={color}
                  onClick={() => setSelectedColor(color)}
                >
                  <span aria-hidden="true" />
                  {formatColor(color)}
                </button>
              ))}
            </div>
          </section>

          <section className="rules-panel">
            <h2>PRISM Rules</h2>
            <ul>
              <li>Players alternate placing a red or blue peg.</li>
              <li>Same-colored orthogonal neighbors create one line.</li>
              <li>Player 1 wins if the final line counts are different.</li>
              <li>Player 2 wins if the final line counts are equal.</li>
              <li>Colors are tools, not teams.</li>
            </ul>
          </section>

          <section>
            <div className="panel-heading-row">
              <h2>Math Lab</h2>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={showMathLab}
                  onChange={(event) => setShowMathLab(event.target.checked)}
                  aria-label="Toggle Math Lab"
                />
                <span />
              </label>
            </div>
            {showMathLab ? (
              <dl className="lab-list">
                <div>
                  <dt>Total possible neighbor edges</dt>
                  <dd>{mathLab.totalPossibleEdges}</dd>
                </div>
                <div>
                  <dt>Occupied cells</dt>
                  <dd>{mathLab.occupiedCells}</dd>
                </div>
                <div>
                  <dt>Parity of total cells</dt>
                  <dd>{mathLab.totalCellParity}</dd>
                </div>
                <div>
                  <dt>Unique 180-degree center cell</dt>
                  <dd>{mathLab.hasUniqueCenter}</dd>
                </div>
                <div>
                  <dt>Absolute imbalance</dt>
                  <dd>{mathLab.absoluteImbalance}</dd>
                </div>
              </dl>
            ) : (
              <p className="panel-note">Enable to inspect board invariants and imbalance.</p>
            )}
          </section>

          <section>
            <div className="panel-heading-row">
              <h2>Theorem Mode</h2>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={showTheoremMode}
                  aria-label="Toggle Theorem Mode"
                  onChange={(event) => {
                    setShowTheoremMode(event.target.checked);
                    if (event.target.checked) {
                      recordTheoremCardOpened();
                    }
                  }}
                />
                <span />
              </label>
            </div>
            {showTheoremMode ? (
              <div className="theorem-panel">
                <h3>Board Pattern Notes</h3>
                <dl className="lab-list">
                  <div>
                    <dt>Total cells</dt>
                    <dd>
                      {rows} x {cols} = {totalCells}
                    </dd>
                  </div>
                  <div>
                    <dt>Total possible orthogonal edges = m(n-1)+n(m-1)</dt>
                    <dd>{mathLab.totalPossibleEdges}</dd>
                  </div>
                  <div>
                    <dt>Unique center under 180-degree rotation</dt>
                    <dd>{mathLab.hasUniqueCenter}</dd>
                  </div>
                  <div>
                    <dt>Cell count parity</dt>
                    <dd>{mathLab.totalCellParity}</dd>
                  </div>
                </dl>
                <p>{patternNote}</p>
              </div>
            ) : (
              <p className="panel-note">Enable concise board-pattern notes.</p>
            )}
          </section>
        </aside>

        <section className="board-stage" aria-label="Grid Dominion board">
          <div className="mobile-board-controls" aria-label="Board-side controls">
            <strong aria-live="polite">{aiThinking ? 'AI thinking...' : winner ? `${winner} wins` : `Player ${currentPlayer}`}</strong>
            <div className="board-color-tools" role="group" aria-label="Board-side peg color">
              {Object.values(COLORS).map((color) => <button key={color} className={`color-choice ${color} ${selectedColor === color ? 'is-selected' : ''}`}
                aria-pressed={selectedColor === color} disabled={!isHumanTurn || aiThinking || Boolean(winner)} onClick={() => setSelectedColor(color)}>
                <span aria-hidden="true" />{formatColor(color)}</button>)}
            </div>
            <label>Board game mode<select aria-label="Board game mode" value={mode} disabled={isCampaign} onChange={(event) => handleModeChange(event.target.value)}>
              <option value={MODES.local}>Local 2 Player</option><option value={MODES.ai}>Human vs AI</option>
            </select></label>
            {mode === MODES.ai && <label>Board human role<select aria-label="Board human role" value={humanPlayer} disabled={isCampaign || aiThinking} onChange={(event) => handleHumanPlayerChange(Number(event.target.value))}>
              <option value={1}>Player 1</option><option value={2}>Player 2</option>
            </select></label>}
            <span>Blue - Red: {score.difference}. Colors are tools.</span>
          </div>
          <div
            className={`dominion-board ${aiThinking ? 'is-locked' : ''}`}
            style={{
              '--rows': rows,
              '--cols': cols,
            }}
          >
            <div className="edge-layer" aria-hidden="true">
              {sameColorEdges.map((edge) => (
                <span
                  className={`board-edge ${edge.color} ${edge.direction}`}
                  key={`${edge.from.join('-')}-${edge.to.join('-')}`}
                  style={{
                    '--row': edge.from[0],
                    '--col': edge.from[1],
                  }}
                />
              ))}
            </div>
            {board.map((boardRow, row) =>
              boardRow.map((cell, col) => (
                <button
                  className={`grid-cell ${cell ? `has-${cell}` : ''}`}
                  data-board-cell={`${row}-${col}`}
                  data-testid={`grid-dominion-cell-${row}-${col}`}
                  key={`${row}-${col}`}
                  onClick={() => handleCellClick(row, col)}
                  onKeyDown={(event) => handleCellKeyDown(event, row, col)}
                  disabled={Boolean(cell) || Boolean(winner) || !isHumanTurn || aiThinking}
                  aria-label={getCellLabel(row, col, cell)}
                >
                  {cell && (
                    <span className={`peg ${cell}`} aria-hidden="true">
                      {getColorSymbol(cell)}
                    </span>
                  )}
                </button>
              )),
            )}
          </div>

          {winner && (
            <div className="game-over" role="status">
              <p>Board complete</p>
              <strong>{winner} wins</strong>
              <span className="winner-reason">
                Difference (Blue - Red) is {score.difference}
              </span>
              <button
                className="primary-action"
                onClick={isCampaign ? restartCampaignLevel : () => resetGame()}
              >
                {isCampaign ? 'Restart level' : 'Play again'}
              </button>
            </div>
          )}
        </section>

        <aside className="score-panel">
          {isCampaign && campaignComplete && (
            <section className="campaign-complete-card">
              <p className="problem-label">Campaign complete</p>
              <h2>Grid Dominion Campaign Complete</h2>
              <dl className="score-grid">
                <div>
                  <dt>Levels completed</dt>
                  <dd>{campaignStats.levelsCompleted}</dd>
                </div>
                <div>
                  <dt>Total games finished</dt>
                  <dd>{campaignStats.totalGamesFinished}</dd>
                </div>
                <div>
                  <dt>Total moves played</dt>
                  <dd>{campaignStats.totalMovesPlayed}</dd>
                </div>
                <div>
                  <dt>Lifetime games played</dt>
                  <dd>{gridStats.gamesPlayed}</dd>
                </div>
                <div>
                  <dt>Lifetime campaign levels</dt>
                  <dd>{gridStats.campaignLevelsCompleted}</dd>
                </div>
              </dl>
            </section>
          )}

          {isCampaign && (
            <section className="campaign-map-card">
              <h2>Campaign Map</h2>
              <div className="campaign-level-list">
                {CAMPAIGN_LEVELS.map((level, index) => {
                  const isUnlocked = level.number <= campaignProgress.unlockedLevel;
                  const isActive = index === activeCampaignIndex;
                  const stars = campaignProgress.stars[level.id];

                  return (
                    <button
                      className={[
                        isActive ? 'is-selected' : '',
                        isUnlocked && !campaignProgress.completedLevels[level.id]
                          ? 'is-unlocked'
                          : '',
                      ].join(' ')}
                      disabled={!isUnlocked}
                      data-testid={`grid-dominion-campaign-${level.id}`}
                      key={level.id}
                      onClick={() => startCampaignLevel(index)}
                    >
                      <span>Level {level.number}</span>
                      <strong>{level.title}</strong>
                      <em>{isUnlocked ? 'Unlocked' : 'Locked'}</em>
                      {stars && (
                        <span className="map-stars">
                          {stars.bronze ? 'B' : '-'} {stars.silver ? 'S' : '-'}{' '}
                          {stars.gold ? 'G' : '-'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h2>Score</h2>
            <dl className="score-grid">
              <div>
                <dt>Red lines</dt>
                <dd>{score.redEdges}</dd>
              </div>
              <div>
                <dt>Blue lines</dt>
                <dd>{score.blueEdges}</dd>
              </div>
              <div>
                <dt>Difference (Blue - Red)</dt>
                <dd>{score.difference}</dd>
              </div>
              <div>
                <dt>Empty cells</dt>
                <dd>{score.emptyCells}</dd>
              </div>
            </dl>
          </section>

          <section className="statistics-panel">
            <h2>Statistics</h2>
            <dl className="score-grid">
              <div>
                <dt>Games played</dt>
                <dd>{gridStats.gamesPlayed}</dd>
              </div>
              <div>
                <dt>AI games played</dt>
                <dd>{gridStats.aiGamesPlayed}</dd>
              </div>
              <div>
                <dt>Player 1 wins</dt>
                <dd>{gridStats.player1Wins}</dd>
              </div>
              <div>
                <dt>Player 2 wins</dt>
                <dd>{gridStats.player2Wins}</dd>
              </div>
              <div>
                <dt>Campaign levels completed</dt>
                <dd>{gridStats.campaignLevelsCompleted}</dd>
              </div>
            </dl>
          </section>

          <section className="strategy-panel">
            <h2>Strategy Analyzer</h2>
            {aiError && <p role="alert">{aiError} Reset or change AI difficulty to recover.</p>}
            <dl className="analysis-grid">
              <div>
                <dt>Current imbalance</dt>
                <dd>{strategyAnalysis.imbalance}</dd>
              </div>
              <div>
                <dt>Current status</dt>
                <dd>{strategyAnalysis.status}</dd>
              </div>
              <div>
                <dt>Current goal match (not a prediction)</dt>
                <dd>{strategyAnalysis.favoredPlayer}</dd>
              </div>
            </dl>
            <p>{strategyAnalysis.explanation}</p>
            <p className="prediction-line">
              {score.emptyCells > 10 &&
                'Perfect-play prediction unavailable: more than 10 empty cells.'}
              {score.emptyCells <= 10 &&
                (!predictionMatchesPosition || perfectPrediction.status === 'calculating') &&
                'Perfect-play prediction: calculating...'}
              {score.emptyCells <= 10 &&
                predictionMatchesPosition &&
                perfectPrediction.status === 'available' &&
                `Perfect-play prediction: ${perfectPrediction.winner} win`}
              {score.emptyCells <= 10 &&
                predictionMatchesPosition &&
                perfectPrediction.status === 'unavailable' &&
                'Perfect-play prediction: unknown.'}
            </p>
          </section>

          <section className="history-section">
            <h2>Moves</h2>
            <ol className="move-history">
              {moveHistory.length === 0 && <li className="empty-history">No moves yet</li>}
              {moveHistory.map((entry) => (
                <li key={entry.move}>
                  <span className="move-main">
                    #{entry.move} {entry.actorLabel} placed {formatColor(entry.color)} at{' '}
                    {entry.cell}
                  </span>
                  <span className={`move-color ${entry.color}`}>{formatColor(entry.color)}</span>
                  <span className="move-score">
                    Red {entry.score.redEdges}, Blue {entry.score.blueEdges}, Difference (Blue -
                    Red) {entry.score.difference}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </section>
    </main>
  );
}
