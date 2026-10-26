function getEdgeKey(edge) {
  return edge.id || `${edge.day}:${edge.source}-${edge.target}`;
}

export function getNodes(graphOrEdges) {
  if (Array.isArray(graphOrEdges)) {
    return [...new Set(graphOrEdges.flatMap((edge) => [edge.source, edge.target]))].sort();
  }

  if (graphOrEdges.nodes) {
    return graphOrEdges.nodes.map((node) => node.id).sort();
  }

  return [];
}

export function getVisibleEdges(graph, day) {
  return graph.edges.filter((edge) => edge.day <= day);
}

function buildAdjacency(nodes, edges) {
  const adjacency = new Map(nodes.map((node) => [node, []]));

  edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });

  return adjacency;
}

function hasPath(nodes, edges, source, target) {
  const adjacency = buildAdjacency(nodes, edges);
  const seen = new Set([source]);
  const stack = [source];

  while (stack.length > 0) {
    const node = stack.pop();

    if (node === target) {
      return true;
    }

    adjacency.get(node)?.forEach((neighbor) => {
      if (!seen.has(neighbor)) {
        seen.add(neighbor);
        stack.push(neighbor);
      }
    });
  }

  return false;
}

export function findActivationPath(inputGraph, targetEdge) {
  const graph = normalizeGraph(inputGraph);
  const nodes = getNodes(graph);
  const nodeSet = new Set(nodes);

  if (!targetEdge || !nodeSet.has(targetEdge.source) || !nodeSet.has(targetEdge.target)) {
    return null;
  }

  const laterEdges = graph.edges.filter((edge) => edge.day > targetEdge.day);
  const adjacency = new Map(nodes.map((node) => [node, []]));

  laterEdges.forEach((edge) => {
    adjacency.get(edge.source)?.push({
      neighbor: edge.target,
      edgeId: getEdgeKey(edge),
      day: edge.day,
    });
    adjacency.get(edge.target)?.push({
      neighbor: edge.source,
      edgeId: getEdgeKey(edge),
      day: edge.day,
    });
  });

  const queue = [
    {
      node: targetEdge.source,
      nodePath: [targetEdge.source],
      edgePath: [],
      dayPath: [],
    },
  ];
  const seen = new Set([targetEdge.source]);

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.node === targetEdge.target) {
      return {
        nodePath: current.nodePath,
        edgePath: current.edgePath,
        dayPath: current.dayPath,
      };
    }

    adjacency.get(current.node)?.forEach((step) => {
      if (seen.has(step.neighbor)) {
        return;
      }

      seen.add(step.neighbor);
      queue.push({
        node: step.neighbor,
        nodePath: [...current.nodePath, step.neighbor],
        edgePath: [...current.edgePath, step.edgeId],
        dayPath: [...current.dayPath, step.day],
      });
    });
  }

  return null;
}

export function countConnectedComponents(nodes, edges) {
  const adjacency = buildAdjacency(nodes, edges);
  const seen = new Set();
  let components = 0;

  nodes.forEach((start) => {
    if (seen.has(start)) {
      return;
    }

    components += 1;
    const stack = [start];
    seen.add(start);

    while (stack.length > 0) {
      const node = stack.pop();

      adjacency.get(node)?.forEach((neighbor) => {
        if (!seen.has(neighbor)) {
          seen.add(neighbor);
          stack.push(neighbor);
        }
      });
    }
  });

  return components;
}

function normalizeGraph(graph) {
  validateTemporalGraph(graph);
  if (graph.nodes) {
    return graph;
  }

  return {
    ...graph,
    nodes: getNodes(graph.edges).map((id) => ({ id })),
  };
}

export function validateTemporalGraph(graph) {
  const nodes = getNodes(graph);
  if (nodes.length > 40 || graph.edges.length > 100) throw new RangeError('Graph budget: 40 nodes and 100 edges.');
  if (new Set(nodes).size !== nodes.length) throw new Error('Node IDs must be unique.');
  const days = new Set();
  const pairs = new Set();
  const ids = new Set();
  for (const edge of graph.edges) {
    const pair = JSON.stringify([edge.source, edge.target].sort());
    const key = getEdgeKey(edge);
    if (!Number.isSafeInteger(edge.day) || edge.day < 1 || days.has(edge.day)) throw new Error('Assign exactly one unique edge/player per positive integer day.');
    if (edge.source === edge.target || !nodes.includes(edge.source) || !nodes.includes(edge.target) || pairs.has(pair) || ids.has(key)) throw new Error('Edges must have distinct endpoints and unique pairs/IDs.');
    days.add(edge.day); pairs.add(pair); ids.add(key);
  }
  return true;
}

export function analyzeTemporalGraph(inputGraph, day = Number.POSITIVE_INFINITY) {
  const graph = normalizeGraph(inputGraph);
  const visibleEdges = getVisibleEdges(graph, day);
  const nodes = getNodes(graph);
  const winningEdgeKeys = new Set();
  const winningPlayers = new Set();

  visibleEdges.forEach((edge) => {
    const laterEdges = visibleEdges.filter((candidate) => candidate.day > edge.day);

    if (hasPath(nodes, laterEdges, edge.source, edge.target)) {
      winningEdgeKeys.add(getEdgeKey(edge));
      winningPlayers.add(`Day ${edge.day}`);
    }
  });

  const components = nodes.length === 0 ? 0 : countConnectedComponents(nodes, visibleEdges);
  const cycleCount = Math.max(0, visibleEdges.length - nodes.length + components);

  return {
    nodes,
    edges: visibleEdges,
    cycleCount,
    winningEdgeKeys,
    winningPlayers: [...winningPlayers],
    winnerCount: winningPlayers.size,
    connectedComponents: components,
  };
}

export function analyzeTriggerEdge(graph, triggerEdgeId) {
  const triggerEdge = graph.edges.find((edge) => getEdgeKey(edge) === triggerEdgeId);

  if (!triggerEdge) {
    return {
      triggerEdge: null,
      activatedEdgeKeys: new Set(),
      activatedEdges: [],
      activatedWinners: [],
      activationPaths: [],
      activationCount: 0,
    };
  }

  const baseGraph = {
    ...graph,
    edges: graph.edges.filter((edge) => getEdgeKey(edge) !== triggerEdgeId),
  };
  const baseAnalysis = analyzeTemporalGraph(baseGraph);
  const finalDay = Math.max(0, ...baseGraph.edges.map((edge) => edge.day)) + 1;
  const triggeredGraph = {
    ...graph,
    edges: [
      ...baseGraph.edges,
      {
        ...triggerEdge,
        day: finalDay,
      },
    ],
  };
  const triggeredAnalysis = analyzeTemporalGraph(triggeredGraph);
  const activatedEdgeKeys = new Set(
    [...triggeredAnalysis.winningEdgeKeys].filter((key) => !baseAnalysis.winningEdgeKeys.has(key)),
  );
  const activatedWinners = [...new Set(
    triggeredGraph.edges
      .filter((edge) => activatedEdgeKeys.has(getEdgeKey(edge)))
      .map((edge) => `Day ${edge.day}`),
  )];

  return {
    triggerEdge,
    activatedEdgeKeys,
    activatedEdges: triggeredGraph.edges.filter((edge) => activatedEdgeKeys.has(getEdgeKey(edge))),
    activatedWinners,
    activationPaths: triggeredGraph.edges
      .filter((edge) => activatedEdgeKeys.has(getEdgeKey(edge)))
      .map((edge) => ({
        edge,
        edgeKey: getEdgeKey(edge),
        path: findActivationPath(triggeredGraph, edge),
      }))
      .filter((entry) => entry.path),
    activatedEdgeCount: activatedEdgeKeys.size,
    activationCount: activatedWinners.length,
  };
}

export function analyzeCandidateTrigger(graph, candidateTrigger) {
  if (!candidateTrigger) {
    return {
      triggerEdge: null,
      activatedEdgeKeys: new Set(),
      activatedEdges: [],
      activatedWinners: [],
      activationPaths: [],
      activationCount: 0,
    };
  }

  const baseAnalysis = analyzeTemporalGraph(graph);
  const finalDay = Math.max(0, ...graph.edges.map((edge) => edge.day)) + 1;
  const triggerEdge = {
    ...candidateTrigger,
    id: candidateTrigger.id || `trigger-${candidateTrigger.source}-${candidateTrigger.target}`,
    day: finalDay,
  };
  const triggeredGraph = {
    ...graph,
    edges: [...graph.edges, triggerEdge],
  };
  const triggeredAnalysis = analyzeTemporalGraph(triggeredGraph);
  const activatedEdgeKeys = new Set(
    [...triggeredAnalysis.winningEdgeKeys].filter((key) => !baseAnalysis.winningEdgeKeys.has(key)),
  );
  const activatedWinners = [...new Set(
    triggeredGraph.edges
      .filter((edge) => activatedEdgeKeys.has(getEdgeKey(edge)))
      .map((edge) => `Day ${edge.day}`),
  )];

  return {
    triggerEdge,
    activatedEdgeKeys,
    activatedEdges: triggeredGraph.edges.filter((edge) => activatedEdgeKeys.has(getEdgeKey(edge))),
    activatedWinners,
    activationPaths: triggeredGraph.edges
      .filter((edge) => activatedEdgeKeys.has(getEdgeKey(edge)))
      .map((edge) => ({
        edge,
        edgeKey: getEdgeKey(edge),
        path: findActivationPath(triggeredGraph, edge),
      }))
      .filter((entry) => entry.path),
    activatedEdgeCount: activatedEdgeKeys.size,
    activationCount: activatedWinners.length,
  };
}

export function getTemporalLayout(graphOrNodes) {
  const rawNodes = Array.isArray(graphOrNodes) ? graphOrNodes : graphOrNodes.nodes;
  const nodes = rawNodes.map((node) => (typeof node === 'string' ? { id: node } : node));
  const centerX = 50;
  const centerY = 50;
  const radius = nodes.length <= 4 ? 30 : 36;

  return new Map(
    nodes.map((node, index) => {
      if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
        return [node.id, { x: node.x, y: node.y }];
      }

      const angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1) - Math.PI / 2;

      return [
        node.id,
        {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        },
      ];
    }),
  );
}

export function getTemporalEdgeKey(edge) {
  return getEdgeKey(edge);
}
