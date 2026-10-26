import { createLatticeLadder, UNIT_SQUARE } from './lattice.js';

export const TEMPORAL_PRESETS = [
  { ...UNIT_SQUARE, id: 'simple-cycle', name: 'Simple Cycle', description: 'A four-edge unit lattice square.' },
  { ...createLatticeLadder(2, true), id: 'two-disjoint-cycles', name: 'Two Ordered Cycles', description: 'Two unit squares with distinct assignment days.' },
  { ...createLatticeLadder(2, true), id: 'trigger-edge-example', name: 'Trigger Edge Example', description: 'A final rung creates one newly winning owner.' },
  { ...createLatticeLadder(3, true), id: 'ladder-construction', name: 'Ladder Construction', description: 'Track cumulative winners separately from new activations.' },
  { ...createLatticeLadder(5, true), id: 'large-ladder', name: 'Large Ladder', description: 'A wider unit lattice ladder; one player joins each day.' },
];
