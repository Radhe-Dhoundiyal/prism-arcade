export const COLORS = {
  red: 'red',
  blue: 'blue',
};

export const PRESET_SIZES = [
  { label: '1x1', rows: 1, cols: 1 },
  { label: '1x2', rows: 1, cols: 2 },
  { label: '1x3', rows: 1, cols: 3 },
  { label: '1x4', rows: 1, cols: 4 },
  { label: '1x5', rows: 1, cols: 5 },
  { label: '2x2', rows: 2, cols: 2 },
  { label: '2x3', rows: 2, cols: 3 },
  { label: '3x3', rows: 3, cols: 3 },
  { label: '4x4', rows: 4, cols: 4 },
  { label: '5x5', rows: 5, cols: 5 },
];

export function createBoard(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

export function placePeg(board, row, col, color) {
  if (board[row][col] !== null) {
    return board;
  }

  return board.map((boardRow, rowIndex) =>
    boardRow.map((cell, colIndex) => (rowIndex === row && colIndex === col ? color : cell)),
  );
}

export function countEmptyCells(board) {
  return board.reduce(
    (total, row) => total + row.reduce((rowTotal, cell) => rowTotal + (cell === null ? 1 : 0), 0),
    0,
  );
}

export function countEdges(board) {
  let redEdges = 0;
  let blueEdges = 0;

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const color = board[row][col];

      if (color === null) {
        continue;
      }

      // Mathematical scoring rule: each same-color adjacent pair contributes one edge.
      // We only scan right and down neighbors, so every horizontal or vertical pair is counted once.
      const neighbors = [
        board[row][col + 1],
        board[row + 1]?.[col],
      ];

      neighbors.forEach((neighbor) => {
        if (neighbor === color) {
          if (color === COLORS.red) {
            redEdges += 1;
          } else {
            blueEdges += 1;
          }
        }
      });
    }
  }

  return {
    redEdges,
    blueEdges,
    difference: blueEdges - redEdges,
    emptyCells: countEmptyCells(board),
  };
}

export function getSameColorEdges(board) {
  const edges = [];

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const color = board[row][col];

      if (color === null) {
        continue;
      }

      if (board[row][col + 1] === color) {
        edges.push({ color, from: [row, col], to: [row, col + 1], direction: 'horizontal' });
      }

      if (board[row + 1]?.[col] === color) {
        edges.push({ color, from: [row, col], to: [row + 1, col], direction: 'vertical' });
      }
    }
  }

  return edges;
}

export function getWinner(score) {
  if (score.emptyCells > 0) {
    return null;
  }

  return score.difference === 0 ? 'Player 2' : 'Player 1';
}
