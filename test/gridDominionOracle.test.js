import assert from 'node:assert/strict';
import { it } from 'node:test';
import { chooseAiMove, predictWinnerPerfectPlay } from '../src/games/gridDominion/ai.js';
import { countEdges, createBoard } from '../src/games/gridDominion/logic.js';
import { createGridDominionOracle } from './helpers/gridDominionOracle.js';

function* boards(rows, cols) {
  for (let code = 0; code < 3 ** (rows * cols); code += 1) {
    let rest = code;
    yield Array.from({ length: rows }, () => Array.from({ length: cols }, () => {
      const cell = [null, 'red', 'blue'][rest % 3];
      rest = Math.floor(rest / 3);
      return cell;
    }));
  }
}

it('regresses the empty 2x3 prediction and a formerly losing Hard AI choice', () => {
  assert.equal(predictWinnerPerfectPlay(createBoard(2, 3), 1), 'Player 2');
  const board = [['red', null, null], [null, null, null]];
  const oracle = createGridDominionOracle(2, 3);
  const { optimalMoves } = oracle.analyze(board, 2);
  const random = Math.random;
  try {
    Math.random = () => 0;
    const { row, col, color } = chooseAiMove(board, 2, 'hard');
    assert.ok(optimalMoves.some((move) => move.row === row && move.col === col && move.color === color));
  } finally { Math.random = random; }
});

it('independent oracle enforces rules, input bounds and state budget', () => {
  const oracle = createGridDominionOracle(1, 2);
  assert.equal(oracle.score([['red', 'red']]), -1);
  assert.equal(oracle.score([['blue', 'blue']]), 1);
  assert.equal(oracle.winner([['red', 'blue']], 1), 'Player 2');
  assert.deepEqual(oracle.analyze([['red', null]], 1).optimalMoves, [{ row: 0, col: 1, color: 'red' }]);
  assert.deepEqual(oracle.analyze([['red', null]], 2).optimalMoves, [{ row: 0, col: 1, color: 'blue' }]);
  assert.throws(() => createGridDominionOracle(5, 5), /nine cells/);
  assert.throws(() => oracle.winner([[null]], 1), /dimensions/);
  assert.throws(() => oracle.winner([[null, null]], 3), /Player/);
  assert.throws(() => oracle.winner([['green', null]], 1), /Invalid cell/);
  const limited = createGridDominionOracle(2, 3, 10);
  assert.throws(() => limited.winner(createBoard(2, 3), 1), /budget/);
  assert.throws(() => limited.winner(createBoard(2, 3), 1), /budget/);
  assert.equal(limited.getStats().cachedStates, 10);
});

it('matches independent outcomes and optimal Hard moves across bounded board/turn domains', () => {
  const sizes = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [2, 2], [2, 3], [3, 3]];
  const totals = { predictions: 0, hardMoves: 0, unique: 0, multiple: 0, zero: 0, nonzero: 0 };
  const random = Math.random;
  const coverage = [];
  try {
    for (const [rows, cols] of sizes) {
      const oracle = createGridDominionOracle(rows, cols);
      let cases = 0;
      let sampled = 0;
      for (const board of boards(rows, cols)) {
        const empty = board.flat().filter((cell) => cell === null).length;
        // Exhaust all <=2-empty 3x3 boards; add 128 deterministic spread-out
        // positions with more empties, including the empty board, within a fixed budget.
        if (rows === 3 && empty > 2) {
          const code = board.flat().reduce((n, cell) => n * 3 + [null, 'red', 'blue'].indexOf(cell), 0);
          if (code !== 0 && (code % 97 !== 0 || sampled >= 128)) continue;
          sampled += 1;
        }
        const before = JSON.stringify(board);
        assert.equal(countEdges(board).difference, oracle.score(board));
        for (const player of [1, 2]) {
          const expected = oracle.analyze(board, player);
          const label = `${rows}x${cols}, player ${player}, ${before}`;
          assert.equal(predictWinnerPerfectPlay(board, player), expected.winner, label);
          totals.predictions += 1;
          cases += 1;
          if (oracle.score(board) === 0) totals.zero += 1;
          else totals.nonzero += 1;
          if (expected.optimalMoves.length === 1) totals.unique += 1;
          if (expected.optimalMoves.length > 1) totals.multiple += 1;
          // Exercise both ends of the randomized tie-breaker, for both AI roles.
          for (const tie of [0, 0.999999]) {
            Math.random = () => tie;
            const actual = chooseAiMove(board, player, 'hard');
            if (empty === 0) assert.equal(actual, null, label);
            else {
              assert.ok(expected.optimalMoves.some((move) => move.row === actual.row && move.col === actual.col && move.color === actual.color), label);
              totals.hardMoves += 1;
            }
          }
        }
        assert.equal(JSON.stringify(board), before, 'Search must not mutate input');
      }
      coverage.push({ size: `${rows}x${cols}`, cases, sampled, ...oracle.getStats() });
    }
  } finally { Math.random = random; }
  assert.ok(totals.unique > 0 && totals.multiple > 0 && totals.zero > 0 && totals.nonzero > 0);
  assert.equal(totals.predictions, 17450);
  assert.equal(totals.hardMoves, 32284);
  console.log('Grid oracle coverage:', JSON.stringify({ totals, coverage }));
});
