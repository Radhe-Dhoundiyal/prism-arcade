import { chooseAiMove, predictWinnerPerfectPlay } from '../games/gridDominion/ai.js';
import { searchMoveRange, runBatchExperiment, runResearchExperiment, generateStateGraph, recoverTerminalPaths, generateTripleHeatmapSlice, generateConsecutiveSetPlotData } from '../games/blackboardMoves/logic.js';
import { runParitySimulation } from '../games/parityEngine/logic.js';

export function executeMathTask(operation, payload) {
  switch (operation) {
    case 'grid-predict': return predictWinnerPerfectPlay(payload.board, payload.currentPlayer);
    case 'grid-ai': return chooseAiMove(payload.board, payload.aiPlayer, payload.difficulty);
    case 'blackboard-range': return searchMoveRange(payload.board);
    case 'blackboard-batch': return runBatchExperiment(payload);
    case 'blackboard-research': return runResearchExperiment(payload);
    case 'blackboard-heatmap': return generateTripleHeatmapSlice(payload);
    case 'blackboard-consecutive': return generateConsecutiveSetPlotData(payload.maxValue);
    case 'blackboard-graph': return { ...generateStateGraph(payload.board), terminalPaths: recoverTerminalPaths(payload.board) };
    case 'parity-simulation': return runParitySimulation(payload);
    default: throw new Error('Unknown mathematical operation.');
  }
}
