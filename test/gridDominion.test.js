import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COLORS,
  countEdges,
  createBoard,
  getSameColorEdges,
  getWinner,
  placePeg,
} from '../src/games/gridDominion/logic.js';
import {
  AI_DIFFICULTIES,
  chooseAiMove,
  generateLegalMoves,
  predictWinnerPerfectPlay,
} from '../src/games/gridDominion/ai.js';

describe('Grid Dominion scoring', () => {
  it('counts same-color orthogonal edges once and uses blue minus red difference', () => {
    const board = [
      [COLORS.red, COLORS.red],
      [COLORS.blue, COLORS.blue],
    ];

    assert.deepEqual(countEdges(board), {
      redEdges: 1,
      blueEdges: 1,
      difference: 0,
      emptyCells: 0,
    });
    assert.equal(getWinner(countEdges(board)), 'Player 2');
  });

  it('awards terminal nonzero differences to Player 1, regardless of color sign', () => {
    const redLine = [[COLORS.red, COLORS.red]];
    const blueLine = [[COLORS.blue, COLORS.blue]];

    assert.equal(countEdges(redLine).difference, -1);
    assert.equal(getWinner(countEdges(redLine)), 'Player 1');
    assert.equal(countEdges(blueLine).difference, 1);
    assert.equal(getWinner(countEdges(blueLine)), 'Player 1');
  });

  it('keeps colors as tools by allowing either color on every empty cell', () => {
    const moves = generateLegalMoves(createBoard(1, 2));

    assert.equal(moves.length, 4);
    assert.deepEqual(
      moves.map((move) => move.color).sort(),
      [COLORS.blue, COLORS.blue, COLORS.red, COLORS.red],
    );
  });

  it('places pegs immutably and refuses to overwrite occupied cells', () => {
    const board = createBoard(1, 2);
    const withRed = placePeg(board, 0, 0, COLORS.red);
    const unchanged = placePeg(withRed, 0, 0, COLORS.blue);

    assert.equal(board[0][0], null);
    assert.equal(withRed[0][0], COLORS.red);
    assert.equal(unchanged, withRed);
    assert.equal(unchanged[0][0], COLORS.red);
  });

  it('reports visible same-color edges with right/down scanning only', () => {
    const board = [
      [COLORS.red, COLORS.red],
      [COLORS.red, COLORS.red],
    ];

    assert.equal(getSameColorEdges(board).length, 4);
  });
});

describe('Grid Dominion AI and perfect play', () => {
  it('predicts the exact small-board terminal goals', () => {
    assert.equal(predictWinnerPerfectPlay([[null]], 1), 'Player 2');
    assert.equal(predictWinnerPerfectPlay([[COLORS.red, COLORS.red]], 1), 'Player 1');
    assert.equal(predictWinnerPerfectPlay([[COLORS.blue, COLORS.blue]], 1), 'Player 1');
  });

  it('returns no perfect-play prediction beyond the small-state cutoff', () => {
    assert.equal(predictWinnerPerfectPlay(createBoard(4, 4), 1), null);
  });

  it('chooses forced hard moves according to player objectives, not color teams', () => {
    const oneMoveFromEnd = [[COLORS.red, null]];
    const playerOneMove = chooseAiMove(oneMoveFromEnd, 1, AI_DIFFICULTIES.hard);
    const playerTwoMove = chooseAiMove(oneMoveFromEnd, 2, AI_DIFFICULTIES.hard);

    assert.deepEqual({
      row: playerOneMove.row,
      col: playerOneMove.col,
      color: playerOneMove.color,
    }, {
      row: 0,
      col: 1,
      color: COLORS.red,
    });
    assert.deepEqual({
      row: playerTwoMove.row,
      col: playerTwoMove.col,
      color: playerTwoMove.color,
    }, {
      row: 0,
      col: 1,
      color: COLORS.blue,
    });
  });
});
