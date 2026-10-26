import { validateTemporalGraph } from './logic.js';

export function cloneGraph(graph) {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}

export function createNodeId(nodes) {
  const used = new Set(nodes.map((node) => node.id));
  let index = 0;

  while (index < 26) {
    const id = String.fromCharCode(65 + index);
    if (!used.has(id)) {
      return id;
    }
    index += 1;
  }

  let suffix = nodes.length + 1;
  while (used.has(`N${suffix}`)) {
    suffix += 1;
  }

  return `N${suffix}`;
}

export function createEdgeId(edges) {
  let index = edges.length + 1;

  while (edges.some((edge) => edge.id === `e${index}`)) {
    index += 1;
  }

  return `e${index}`;
}

export function addNode(graph, position) {
  if (graph.nodes.length >= 40) return graph;
  const id = createNodeId(graph.nodes);

  return {
    ...graph,
    nodes: [...graph.nodes, { id, x: position.x, y: position.y }],
  };
}

export function moveNode(graph, nodeId, position) {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId ? { ...node, x: position.x, y: position.y } : node,
    ),
  };
}

export function deleteNode(graph, nodeId) {
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    edges: graph.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
  };
}

export function addEdge(graph, source, target) {
  if (source === target || graph.edges.length >= 100 || !graph.nodes.some((node) => node.id === source) ||
      !graph.nodes.some((node) => node.id === target) || graph.edges.some((edge) =>
        (edge.source === source && edge.target === target) || (edge.source === target && edge.target === source))) {
    return graph;
  }

  const maxDay = Math.max(0, ...graph.edges.map((edge) => edge.day));

  return {
    ...graph,
    edges: [
      ...graph.edges,
      {
        id: createEdgeId(graph.edges),
        day: maxDay + 1,
        source,
        target,
      },
    ],
  };
}

export function deleteEdge(graph, edgeId) {
  return {
    ...graph,
    edges: graph.edges.filter((edge) => edge.id !== edgeId),
  };
}

export function updateEdgeDay(graph, edgeId, day) {
  const nextDay = Number(day);
  if (!Number.isSafeInteger(nextDay) || nextDay < 1 || graph.edges.some((edge) => edge.id !== edgeId && edge.day === nextDay)) return graph;

  return {
    ...graph,
    edges: graph.edges.map((edge) => (edge.id === edgeId ? { ...edge, day: nextDay } : edge)),
  };
}

export function normalizeImportedGraph(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;

  if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error('Graph JSON must include nodes and edges arrays.');
  }

  const nodes = parsed.nodes.map((node, index) => {
    if (typeof node === 'string') {
      return { id: node, x: 20 + index * 10, y: 50 };
    }

    return {
      id: String(node.id ?? '').trim(),
      x: Number.isFinite(Number(node.x)) ? Number(node.x) : 50,
      y: Number.isFinite(Number(node.y)) ? Number(node.y) : 50,
    };
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodes.some((node) => !node.id) || nodeIds.size !== nodes.length) throw new Error('Every node requires a nonempty unique ID.');
  const edges = parsed.edges.map((edge, index) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error('Every edge endpoint must reference an existing node.');
    }

    return {
      id: edge.id ? String(edge.id) : `e${index + 1}`,
      day: edge.day === undefined ? index + 1 : Number(edge.day),
      source: String(edge.source),
      target: String(edge.target),
    };
  });

  const graph = {
    id: parsed.id || 'imported-graph',
    name: parsed.name || 'Imported Graph',
    description: parsed.description || 'Imported level laboratory graph.',
    nodes,
    edges,
  };
  validateTemporalGraph(graph);
  return graph;
}
