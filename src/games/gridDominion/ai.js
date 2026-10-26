import { COLORS, countEdges, placePeg } from './logic.js';

export const AI_DIFFICULTIES = {
  easy: 'easy',
  normal: 'normal',
  hard: 'hard',
};

export function generateLegalMoves(board) {
  const moves = [];

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col] === null) {
        Object.values(COLORS).forEach((color) => moves.push({ row, col, color }));
      }
    }
  }

  return moves;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function centerDistance(move, rows, cols) {
  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;
  return Math.abs(move.row - centerRow) + Math.abs(move.col - centerCol);
}

function lineTotal(score) {
  return score.redEdges + score.blueEdges;
}

function rankMoves(board, moves, getObjective) {
  const currentScore = countEdges(board);
  const currentLineTotal = lineTotal(currentScore);

  return moves.map((move) => {
    const nextBoard = placePeg(board, move.row, move.col, move.color);
    const nextScore = countEdges(nextBoard);

    return {
      ...move,
      score: nextScore,
      objective: getObjective(nextBoard, nextScore, move),
      createdEdges: lineTotal(nextScore) - currentLineTotal,
      centerDistance: centerDistance(move, board.length, board[0].length),
    };
  });
}

function chooseByTieBreakers(rankedMoves, preferHighObjective = true) {
  const objectiveValue = preferHighObjective
    ? Math.max(...rankedMoves.map((move) => move.objective))
    : Math.min(...rankedMoves.map((move) => move.objective));
  const objectiveTied = rankedMoves.filter((move) => move.objective === objectiveValue);
  const mostCreatedEdges = Math.max(...objectiveTied.map((move) => move.createdEdges));
  const edgeTied = objectiveTied.filter((move) => move.createdEdges === mostCreatedEdges);
  const bestCenterDistance = Math.min(...edgeTied.map((move) => move.centerDistance));
  const centerTied = edgeTied.filter((move) => move.centerDistance === bestCenterDistance);

  return randomChoice(centerTied);
}

function chooseEasyMove(board) {
  const legalMoves = generateLegalMoves(board);
  return legalMoves.length === 0 ? null : randomChoice(legalMoves);
}

function chooseNormalMove(board, aiPlayer) {
  const legalMoves = generateLegalMoves(board);

  if (legalMoves.length === 0) {
    return null;
  }

  const rankedMoves = rankMoves(board, legalMoves, (_nextBoard, nextScore) =>
    Math.abs(nextScore.difference),
  );

  return chooseByTieBreakers(rankedMoves, aiPlayer === 1);
}

function serializeBoard(board, currentPlayer, depthRemaining) {
  return `${currentPlayer}|${depthRemaining}|${board
    .map((row) => row.map((cell) => (cell === null ? '-' : cell[0])).join(''))
    .join('/')}`;
}

function evaluateScore(score, aiPlayer, depthRemaining) {
  if (score.emptyCells === 0) {
    const aiWins = aiPlayer === 1 ? score.difference !== 0 : score.difference === 0;
    const terminalMargin = aiPlayer === 1 ? Math.abs(score.difference) : -Math.abs(score.difference);
    return (aiWins ? 10000 : -10000) + terminalMargin + depthRemaining;
  }

  return aiPlayer === 1 ? Math.abs(score.difference) : -Math.abs(score.difference);
}

function getHardDepthLimit(emptyCells) {
  return emptyCells <= 10 ? emptyCells : 4;
}

function minimax(board, currentPlayer, aiPlayer, depthRemaining, alpha, beta, memo) {
  const score = countEdges(board);

  if (score.emptyCells === 0 || depthRemaining === 0) {
    return evaluateScore(score, aiPlayer, depthRemaining);
  }

  const key = serializeBoard(board, currentPlayer, depthRemaining);
  if (memo.has(key)) {
    return memo.get(key);
  }

  const alphaStart = alpha;
  const betaStart = beta;
  const legalMoves = generateLegalMoves(board);
  const maximizing = currentPlayer === aiPlayer;
  let bestValue = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;

  for (const move of legalMoves) {
    const nextBoard = placePeg(board, move.row, move.col, move.color);
    const value = minimax(
      nextBoard,
      currentPlayer === 1 ? 2 : 1,
      aiPlayer,
      depthRemaining - 1,
      alpha,
      beta,
      memo,
    );

    if (maximizing) {
      bestValue = Math.max(bestValue, value);
      alpha = Math.max(alpha, bestValue);
    } else {
      bestValue = Math.min(bestValue, value);
      beta = Math.min(beta, bestValue);
    }

    if (beta <= alpha) {
      break;
    }
  }

  // Fail-low/high results are bounds, even without a local cutoff. Only a
  // value strictly inside the original window is safe to reuse as exact.
  if (bestValue > alphaStart && bestValue < betaStart) {
    memo.set(key, bestValue);
  }
  return bestValue;
}

function chooseHardMove(board, aiPlayer) {
  const legalMoves = generateLegalMoves(board);

  if (legalMoves.length === 0) {
    return null;
  }

  const score = countEdges(board);
  const depthLimit = getHardDepthLimit(score.emptyCells);
  const memo = new Map();
  const rankedMoves = rankMoves(board, legalMoves, (nextBoard) =>
    minimax(
      nextBoard,
      aiPlayer === 1 ? 2 : 1,
      aiPlayer,
      depthLimit - 1,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      memo,
    ),
  );

  return chooseByTieBreakers(rankedMoves, true);
}

export function chooseAiMove(board, aiPlayer, difficulty = AI_DIFFICULTIES.normal) {
  if (difficulty === AI_DIFFICULTIES.easy) {
    return chooseEasyMove(board);
  }

  if (difficulty === AI_DIFFICULTIES.hard) {
    return chooseHardMove(board, aiPlayer);
  }

  return chooseNormalMove(board, aiPlayer);
}

export function predictWinnerPerfectPlay(board, currentPlayer) {
  const score = countEdges(board);

  if (score.emptyCells > 10) {
    return null;
  }

  if (score.emptyCells === 0) {
    return score.difference === 0 ? 'Player 2' : 'Player 1';
  }

  const value = minimax(
    board,
    currentPlayer,
    1,
    score.emptyCells,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    new Map(),
  );

  return value > 0 ? 'Player 1' : 'Player 2';
}
