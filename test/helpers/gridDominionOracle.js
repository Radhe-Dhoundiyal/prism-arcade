// Test-only exhaustive win/loss solver. No production imports or pruning.
export function createGridDominionOracle(rows, cols, maxStates = 40000) {
  const size = rows * cols;
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || size > 9) {
    throw new RangeError('Oracle supports rectangular boards of at most nine cells.');
  }
  if (!Number.isInteger(maxStates) || maxStates < 1) throw new RangeError('Invalid state budget.');
  const pairs = [];
  for (let a = 0; a < size; a += 1) {
    for (let b = a + 1; b < size; b += 1) {
      if (Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) + Math.abs(a % cols - b % cols) === 1) {
        pairs.push([a, b]);
      }
    }
  }
  const memo = new Map();
  let exhausted = false;
  const encode = (cells, player) => cells.reduce((code, cell) => code * 3 + cell, 0) * 2 + player - 1;
  function read(board, player) {
    if (player !== 1 && player !== 2) throw new RangeError('Player must be 1 or 2.');
    if (board.length !== rows || board.some((row) => row.length !== cols)) throw new RangeError('Board dimensions differ.');
    return board.flat().map((cell) => {
      if (cell === null) return 0;
      if (cell === 'red') return 1;
      if (cell === 'blue') return 2;
      throw new TypeError('Invalid cell.');
    });
  }
  function difference(cells) {
    return pairs.reduce((sum, [a, b]) => sum + (cells[a] !== 0 && cells[a] === cells[b] ? (cells[a] === 2 ? 1 : -1) : 0), 0);
  }
  function solve(cells, player) {
    if (exhausted) throw new RangeError('Oracle state budget exceeded.');
    const key = encode(cells, player);
    if (memo.has(key)) return memo.get(key);
    // Reserve before descent: the budget includes ancestors, not just completed leaves.
    if (memo.size >= maxStates) {
      exhausted = true;
      throw new RangeError('Oracle state budget exceeded.');
    }
    memo.set(key, undefined);
    const children = [];
    for (let index = 0; index < size; index += 1) {
      if (cells[index] !== 0) continue;
      for (const color of [1, 2]) {
        const child = cells.slice();
        child[index] = color;
        children.push(solve(child, 3 - player));
      }
    }
    const value = children.length === 0
      ? (difference(cells) === 0 ? -1 : 1)
      : (player === 1 ? Math.max(...children) : Math.min(...children));
    memo.set(key, value);
    return value;
  }
  return {
    score(board) { return difference(read(board, 1)); },
    winner(board, player) { return solve(read(board, player), player) === 1 ? 'Player 1' : 'Player 2'; },
    analyze(board, player) {
      const cells = read(board, player);
      const value = solve(cells, player);
      const optimalMoves = [];
      for (let index = 0; index < size; index += 1) {
        if (cells[index] !== 0) continue;
        for (const color of [1, 2]) {
          const child = cells.slice();
          child[index] = color;
          if (solve(child, 3 - player) === value) {
            optimalMoves.push({ row: Math.floor(index / cols), col: index % cols, color: color === 1 ? 'red' : 'blue' });
          }
        }
      }
      return { winner: value === 1 ? 'Player 1' : 'Player 2', optimalMoves };
    },
    getStats() { return { cachedStates: memo.size, maxStates }; },
  };
}
