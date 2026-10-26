// Coordinates are mathematical lattice points; x/y are display coordinates only.
export function createLatticeLadder(rungs, complete = false) {
  const nodes = [];
  for (let column = 0; column <= rungs; column += 1) {
    for (const row of [0, 1]) nodes.push({ id: `${row ? 'B' : 'T'}${column}`,
      gridX: column, gridY: row, x: 12 + column * 76 / rungs, y: row ? 72 : 28 });
  }
  const edges = [];
  const add = (source, target) => edges.push({ id: `e${edges.length + 1}`, day: edges.length + 1, source, target });
  for (let column = 0; column < rungs; column += 1) add(`T${column}`, `B${column}`);
  for (let column = 0; column < rungs; column += 1) {
    add(`T${column}`, `T${column + 1}`);
    add(`B${column}`, `B${column + 1}`);
  }
  const trigger = { id: 't1', source: `T${rungs}`, target: `B${rungs}`, day: edges.length + 1, label: 'Close the final rung' };
  if (complete) add(trigger.source, trigger.target);
  return { nodes, edges, candidateTriggers: [trigger], model: 'unit-lattice' };
}

export const UNIT_SQUARE = {
  model: 'unit-lattice',
  nodes: [
    { id: 'A', gridX: 0, gridY: 0, x: 22, y: 22 },
    { id: 'B', gridX: 1, gridY: 0, x: 78, y: 22 },
    { id: 'C', gridX: 1, gridY: 1, x: 78, y: 78 },
    { id: 'D', gridX: 0, gridY: 1, x: 22, y: 78 },
  ],
  edges: [
    { id: 'e1', day: 1, source: 'A', target: 'B' },
    { id: 'e2', day: 2, source: 'B', target: 'C' },
    { id: 'e3', day: 3, source: 'C', target: 'D' },
    { id: 'e4', day: 4, source: 'D', target: 'A' },
  ],
};
