import { useEffect, useMemo, useState } from 'react';
import { ResearchLink } from '../../research/ResearchPanel.jsx';
import {
  completeTemporalChallenge,
  getChallengeGraph,
  getChallengeStarRating,
  getChallengeStatus,
  getMaxActivationCount,
  loadTemporalChallengeProgress,
  saveTemporalChallengeProgress,
  TEMPORAL_CHALLENGES,
} from './challenges.js';
import {
  addEdge,
  addNode,
  cloneGraph,
  deleteEdge,
  deleteNode,
  moveNode,
  normalizeImportedGraph,
  updateEdgeDay,
} from './editor.js';
import {
  analyzeCandidateTrigger,
  analyzeTemporalGraph,
  analyzeTriggerEdge,
  getTemporalEdgeKey,
} from './logic.js';
import { TEMPORAL_PRESETS } from './presets.js';
import {
  loadTemporalStats,
  recordChallengeAttempt,
  recordLabExport,
  recordLabImport,
  saveTemporalStats,
} from './stats.js';
import { recordTheoremCardOpened } from '../../profile/profile.js';

const TEMPORAL_MODES = {
  lab: 'lab',
  challenge: 'challenge',
};

function getMaxDay(graph) {
  return Math.max(0, ...graph.edges.map((edge) => edge.day));
}

function getSvgPoint(event) {
  const rect = event.currentTarget.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

function StarDisplay({ rating }) {
  return (
    <span className="star-rating" aria-label={`${rating} star rating`}>
      {[1, 2, 3].map((star) => (
        <span className={star <= rating ? 'is-earned' : ''} key={star}>
          {star <= rating ? '*' : '-'}
        </span>
      ))}
    </span>
  );
}

function TheoremCard({ challenge }) {
  if (challenge.ladderExplanation) {
    return (
      <div className="theorem-card">
        <h3>Theorem Lens</h3>
        <p>An owner wins when their edge's endpoints become connected by a path using only edges assigned later.</p>
        <p>
          With one distinct edge/player per day, a trigger creates at most one new winner.
          Earlier rungs can already have won before the last bridge. Cumulative winners
          and newly activated winners are different counts.
        </p>
      </div>
    );
  }

  return (
    <div className="theorem-card">
      <h3>Theorem Lens</h3>
      <p>An owner wins when their edge's endpoints become connected by a path using only edges assigned later.</p>
    </div>
  );
}

function ChallengeResultPanel({ challenge, result, onNext, onReplay, onReturnToLab }) {
  if (!result) {
    return null;
  }

  if (!result.success) {
    return (
      <div className="campaign-result is-failure">
        <h3>Trigger failed</h3>
        <p>Newly winning owners: {result.activationCount}</p>
        <p>Target new winners: {challenge.targetActivations}</p>
        <p>Try another trigger and look for a path made only of later edges.</p>
      </div>
    );
  }

  return (
    <div className="campaign-result is-success">
      <h3>Trigger Successful</h3>
      <p>Newly winning owners: {result.activationCount}</p>
      <div className="result-stars">
        <span>Stars earned</span>
        <StarDisplay rating={result.starRating} />
      </div>
      {result.unlockedNextLevel && <p>Next level unlocked.</p>}
      <div className="campaign-actions">
        <button data-testid="temporal-next-challenge" disabled={!result.hasNextLevel} onClick={onNext}>Next Challenge</button>
        <button data-testid="temporal-replay-challenge" onClick={onReplay}>Replay Level</button>
        <button data-testid="temporal-return-lab" onClick={onReturnToLab}>Return to Lab</button>
      </div>
      <TheoremCard challenge={challenge} />
    </div>
  );
}

function ActivationPathReveal({
  activationPaths,
  focusedActivationKey,
  showAllPaths,
  onFocus,
  onShowAll,
}) {
  if (!activationPaths.length) {
    return (
      <section className="strategy-panel activation-reveal">
        <h2>Activation Path Reveal</h2>
        <p>Select a trigger that activates winners to reveal the proof paths.</p>
      </section>
    );
  }

  return (
    <section className="strategy-panel activation-reveal">
      <div className="panel-heading-row">
        <h2>Activation Path Reveal</h2>
        <button
          className={showAllPaths ? 'is-selected' : ''}
          onClick={onShowAll}
          type="button"
        >
          Show all paths
        </button>
      </div>
      <div className="activation-path-list">
        {activationPaths.map(({ edge, edgeKey, path }) => {
          const isFocused = !showAllPaths && focusedActivationKey === edgeKey;

          return (
            <button
              className={isFocused ? 'is-focused' : ''}
              key={edgeKey}
              onClick={() => onFocus(edgeKey)}
              type="button"
            >
              <span className="activation-path-title">
                Winner {edge.id || edgeKey} - Day {edge.day}
              </span>
              <span>Endpoints: {edge.source}-{edge.target}</span>
              <strong>{path.nodePath.join(' -> ')}</strong>
              <span>Days used: {path.dayPath.join(', ')}</span>
              <em>
                This path uses only edges after Day {edge.day}, so the Day {edge.day}
                participant wins.
              </em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function TemporalGraphs({ onBack }) {
  const [temporalMode, setTemporalMode] = useState(TEMPORAL_MODES.lab);
  const [graph, setGraph] = useState(() => cloneGraph(TEMPORAL_PRESETS[0]));
  const [editMode, setEditMode] = useState(false);
  const [day, setDay] = useState(getMaxDay(TEMPORAL_PRESETS[0]));
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [triggerEdgeId, setTriggerEdgeId] = useState(null);
  const [dragNodeId, setDragNodeId] = useState(null);
  const [importText, setImportText] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(() => loadTemporalChallengeProgress());
  const [temporalStats, setTemporalStats] = useState(() => loadTemporalStats());
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [challengeResult, setChallengeResult] = useState(null);
  const [focusedActivationKey, setFocusedActivationKey] = useState(null);
  const [showAllPaths, setShowAllPaths] = useState(false);

  const isChallengeMode = temporalMode === TEMPORAL_MODES.challenge;
  const challenge = TEMPORAL_CHALLENGES[challengeIndex];
  const challengeGraph = useMemo(() => getChallengeGraph(challenge), [challenge]);
  const challengeMaxActivationCount = useMemo(
    () => getMaxActivationCount(challenge),
    [challenge],
  );
  const selectedCandidate = challenge.candidateTriggers.find(
    (candidate) => candidate.id === selectedCandidateId,
  );
  const displayGraph = isChallengeMode ? challengeGraph : graph;
  const maxDay = getMaxDay(displayGraph);
  const activeDay = Math.min(day, maxDay);
  const analysis = useMemo(
    () => analyzeTemporalGraph(displayGraph, activeDay),
    [displayGraph, activeDay],
  );
  const fullAnalysis = useMemo(() => analyzeTemporalGraph(displayGraph), [displayGraph]);
  const labTriggerAnalysis = useMemo(
    () => analyzeTriggerEdge(graph, triggerEdgeId),
    [graph, triggerEdgeId],
  );
  const candidatePreview = useMemo(
    () => analyzeCandidateTrigger(challengeGraph, selectedCandidate),
    [challengeGraph, selectedCandidate],
  );
  const activeTriggerAnalysis = isChallengeMode ? candidatePreview : labTriggerAnalysis;
  const activationPaths = activeTriggerAnalysis.activationPaths || [];
  const defaultActivationKey = activationPaths[0]?.edgeKey || null;
  const selectedActivationKey = focusedActivationKey || defaultActivationKey;
  const activePathEdgeKeys = new Set(
    (showAllPaths
      ? activationPaths
      : activationPaths.filter((entry) => entry.edgeKey === selectedActivationKey)
    ).flatMap((entry) => entry.path.edgePath),
  );
  const selectedEdge = graph.edges.find((edge) => getTemporalEdgeKey(edge) === selectedEdgeId);
  const exportValue = useMemo(
    () =>
      JSON.stringify(
        {
          nodes: graph.nodes,
          edges: graph.edges,
        },
        null,
        2,
      ),
    [graph],
  );

  useEffect(() => {
    saveTemporalChallengeProgress(challengeProgress);
  }, [challengeProgress]);

  useEffect(() => {
    saveTemporalStats(temporalStats);
  }, [temporalStats]);

  useEffect(() => {
    setFocusedActivationKey(null);
    setShowAllPaths(false);
  }, [selectedCandidateId, triggerEdgeId, challengeIndex, temporalMode]);

  const enterLab = () => {
    setTemporalMode(TEMPORAL_MODES.lab);
    setSelectedCandidateId(null);
    setChallengeResult(null);
    setFocusedActivationKey(null);
    setShowAllPaths(false);
    setDay(getMaxDay(graph));
  };

  const enterChallenge = () => {
    setTemporalMode(TEMPORAL_MODES.challenge);
    setEditMode(false);
    setSelectedCandidateId(null);
    setChallengeResult(null);
    setFocusedActivationKey(null);
    setShowAllPaths(false);
    setSelectedEdgeId(null);
    setSelectedNodeIds([]);
    setDay(getMaxDay(challengeGraph));
  };

  const startChallenge = (index) => {
    const nextChallenge = TEMPORAL_CHALLENGES[index];

    if (!nextChallenge || nextChallenge.number > challengeProgress.unlockedLevel) {
      return;
    }

    setChallengeIndex(index);
    setTemporalMode(TEMPORAL_MODES.challenge);
    setSelectedCandidateId(null);
    setChallengeResult(null);
    setFocusedActivationKey(null);
    setShowAllPaths(false);
    setDay(getMaxDay(getChallengeGraph(nextChallenge)));
  };

  const restartChallenge = () => {
    startChallenge(challengeIndex);
  };

  const nextChallenge = () => {
    startChallenge(Math.min(challengeIndex + 1, TEMPORAL_CHALLENGES.length - 1));
  };

  const submitChallenge = () => {
    if (!selectedCandidate) {
      return;
    }

    const activationCount = candidatePreview.activationCount;
    const success = activationCount >= challenge.targetActivations;
    const starRating = getChallengeStarRating(challenge, activationCount);
    const wasNextLevelUnlocked = challengeProgress.unlockedLevel > challenge.number;
    const unlockedNextLevel =
      success &&
      !wasNextLevelUnlocked &&
      challenge.number < TEMPORAL_CHALLENGES.length;

    setChallengeResult({
      success,
      activationCount,
      starRating,
      unlockedNextLevel,
      hasNextLevel: challenge.number < TEMPORAL_CHALLENGES.length,
    });
    setTemporalStats((stats) => recordChallengeAttempt(stats, activationCount, success, starRating));
    if (success) {
      recordTheoremCardOpened();
    }

    setChallengeProgress((progress) => {
      const bestActivationCount = {
        ...progress.bestActivationCount,
        [challenge.id]: Math.max(progress.bestActivationCount[challenge.id] || 0, activationCount),
      };

      if (!success) {
        return {
          ...progress,
          bestActivationCount,
        };
      }

      return completeTemporalChallenge(
        {
          ...progress,
          bestActivationCount,
        },
        challenge,
        activationCount,
      );
    });
  };

  const applyGraph = (nextGraph) => {
    setGraph(nextGraph);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setTriggerEdgeId(null);
    setDay(getMaxDay(nextGraph));
  };

  const handlePreset = (preset) => {
    applyGraph(cloneGraph(preset));
    setImportMessage('');
  };

  const handleCanvasClick = (event) => {
    if (isChallengeMode || !editMode || event.target.closest('.temporal-node, .temporal-edge')) {
      return;
    }

    setGraph((currentGraph) => addNode(currentGraph, getSvgPoint(event)));
  };

  const handleNodePointerDown = (event, nodeId) => {
    event.stopPropagation();

    if (isChallengeMode) {
      return;
    }

    setSelectedEdgeId(null);
    setSelectedNodeIds((current) => {
      if (event.shiftKey) {
        return current.includes(nodeId)
          ? current.filter((id) => id !== nodeId)
          : [...current, nodeId].slice(-2);
      }

      return current.includes(nodeId) ? current : [nodeId];
    });

    if (editMode && event.type === 'pointerdown') {
      setDragNodeId(nodeId);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event) => {
    if (isChallengeMode || !editMode || !dragNodeId) {
      return;
    }

    setGraph((currentGraph) => moveNode(currentGraph, dragNodeId, getSvgPoint(event)));
  };

  const handlePointerUp = () => {
    setDragNodeId(null);
  };

  const handleEdgeSelect = (event, edgeId) => {
    event.stopPropagation();

    if (isChallengeMode) {
      return;
    }

    setSelectedEdgeId(edgeId);
    setSelectedNodeIds([]);
  };

  const handleCreateEdge = () => {
    if (selectedNodeIds.length !== 2) {
      return;
    }

    setGraph((currentGraph) => addEdge(currentGraph, selectedNodeIds[0], selectedNodeIds[1]));
    setSelectedNodeIds([]);
    setDay((value) => Math.max(value, getMaxDay(graph) + 1));
  };

  const handleDeleteNode = () => {
    if (selectedNodeIds.length !== 1) {
      return;
    }

    const nodeId = selectedNodeIds[0];
    setGraph((currentGraph) => deleteNode(currentGraph, nodeId));
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
  };

  const handleDeleteEdge = () => {
    if (!selectedEdgeId) {
      return;
    }

    setGraph((currentGraph) => deleteEdge(currentGraph, selectedEdgeId));
    setTriggerEdgeId((edgeId) => (edgeId === selectedEdgeId ? null : edgeId));
    setSelectedEdgeId(null);
  };

  const handleEdgeDayChange = (value) => {
    if (!selectedEdgeId) {
      return;
    }

    setGraph((currentGraph) => updateEdgeDay(currentGraph, selectedEdgeId, value));
  };

  const handleImport = () => {
    try {
      const imported = normalizeImportedGraph(importText);
      applyGraph(imported);
      setImportMessage('Graph imported.');
      setTemporalStats((stats) => recordLabImport(stats));
    } catch (error) {
      setImportMessage(error.message);
    }
  };

  const handleExport = async () => {
    try {
      await navigator.clipboard?.writeText(exportValue);
      setImportMessage('Graph JSON copied.');
    } catch {
      setImportMessage('Graph JSON ready to copy.');
    }

    setTemporalStats((stats) => recordLabExport(stats));
  };

  const visibleCandidate =
    isChallengeMode && selectedCandidate
      ? {
          ...selectedCandidate,
          id: selectedCandidate.id,
        }
      : null;

  return (
    <main className="arcade-shell game-page temporal-page">
      <header className="game-topbar">
        <button
          className="ghost-action"
          data-testid="nav-back-lobby"
          onClick={onBack}
          aria-label="Back to lobby"
        >
          <span aria-hidden="true">&lt;-</span>
          Lobby
        </button>
        <div>
          <p className="problem-label">Problem 6</p>
          <h1>Temporal Graphs</h1>
        </div>
        <button
          className="ghost-action"
          data-testid="temporal-reset-timeline"
          onClick={() => setDay(0)}
          aria-label="Reset timeline"
        >
          Reset
        </button>
      </header>

      <section className="temporal-layout">
        <aside className="control-panel">
          <section className="campaign-entry-card">
            <h2>Mode</h2>
            <div className="segmented-control" role="group" aria-label="Temporal Graphs mode">
              <button
                className={!isChallengeMode ? 'is-selected' : ''}
                data-testid="temporal-mode-lab"
                onClick={enterLab}
              >
                Explorer / Lab
              </button>
              <button
                className={isChallengeMode ? 'is-selected' : ''}
                data-testid="temporal-mode-challenge"
                onClick={enterChallenge}
              >
                Trigger Challenge
              </button>
            </div>
          </section>

          {isChallengeMode ? (
            <>
              <section className="campaign-level-card">
                <div className="campaign-progress-line">
                  <span>Level {challenge.number} / {TEMPORAL_CHALLENGES.length}</span>
                  <span>Target {challenge.targetActivations} / Max {challengeMaxActivationCount}</span>
                </div>
                <h2>{challenge.title}</h2>
                <div className="campaign-lesson">
                  <h3>Lesson</h3>
                  <p>{challenge.lesson}</p>
                </div>
                <div className="campaign-objective">
                  <h3>Target new winners</h3>
                  <p>Choose a trigger that activates at least {challenge.targetActivations} winners.</p>
                </div>
                <div className="challenge-presets">
                  {challenge.candidateTriggers.map((candidate) => (
                    <button
                      className={candidate.id === selectedCandidateId ? 'is-selected' : ''}
                      data-testid={`temporal-trigger-${candidate.id}`}
                      key={candidate.id}
                      onClick={() => {
                        setSelectedCandidateId(candidate.id);
                        setChallengeResult(null);
                        setFocusedActivationKey(null);
                        setShowAllPaths(false);
                      }}
                    >
                      {candidate.label}
                    </button>
                  ))}
                </div>
                {selectedCandidate && (
                  <p className="prediction-line">
                    This trigger would activate {candidatePreview.activationCount} winners.
                  </p>
                )}
                <div className="campaign-actions">
                  <button
                    data-testid="temporal-submit-challenge"
                    disabled={!selectedCandidate}
                    onClick={submitChallenge}
                  >
                    Submit
                  </button>
                  <button data-testid="temporal-restart-challenge" onClick={restartChallenge}>
                    Restart Challenge
                  </button>
                  <button data-testid="temporal-challenge-return-lab" onClick={enterLab}>
                    Return to Lab
                  </button>
                </div>
                <ChallengeResultPanel
                  challenge={challenge}
                  result={challengeResult}
                  onNext={nextChallenge}
                  onReplay={restartChallenge}
                  onReturnToLab={enterLab}
                />
              </section>

              <section className="campaign-map-card">
                <h2>Challenge Level Map</h2>
                <div className="campaign-level-list temporal-level-map">
                  {TEMPORAL_CHALLENGES.map((level, index) => {
                    const isUnlocked = level.number <= challengeProgress.unlockedLevel;
                    const status = getChallengeStatus(level, challengeProgress);
                    const bestActivationCount =
                      challengeProgress.bestActivationCount[level.id] || 0;
                    const starRating = getChallengeStarRating(level, bestActivationCount);
                    const maxActivationCount = getMaxActivationCount(level);

                    return (
                      <button
                        className={[
                          index === challengeIndex ? 'is-selected' : '',
                          `is-${status.toLowerCase()}`,
                        ].join(' ')}
                        disabled={!isUnlocked}
                        data-testid={`temporal-challenge-${level.id}`}
                        key={level.id}
                        onClick={() => startChallenge(index)}
                      >
                        <span>Level {level.number}</span>
                        <strong>{level.title}</strong>
                        <em>{status}</em>
                        <span>Target {level.targetActivations}</span>
                        <span>{bestActivationCount > 1 ? 'Legacy edge-model best' : 'Best new-owner activation'} {bestActivationCount}</span>
                        <span>Max {maxActivationCount}</span>
                        <span className="map-stars" aria-label={`${starRating} stars`}>
                          <StarDisplay rating={starRating} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2>Preset Library</h2>
                <div className="challenge-presets">
                  {TEMPORAL_PRESETS.map((preset) => (
                    <button
                      className={preset.id === graph.id ? 'is-selected' : ''}
                      key={preset.id}
                      onClick={() => handlePreset(preset)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <p className="panel-note">{graph.description}</p>
              </section>

              <section>
                <h2>Editor</h2>
                <div className="segmented-control" role="group" aria-label="Edit mode">
                  <button className={!editMode ? 'is-selected' : ''} onClick={() => setEditMode(false)}>
                    Inspect
                  </button>
                  <button className={editMode ? 'is-selected' : ''} onClick={() => setEditMode(true)}>
                    Edit Mode
                  </button>
                </div>
                <p className="panel-note">One unique pair belongs to one player/day. Lab diagrams are abstract connectivity experiments; challenge fixtures have explicit unit-lattice coordinates.</p>
                <div className="timeline-actions">
                  <button disabled={graph.nodes.length >= 40} onClick={() => setGraph((current) => addNode(current, { x: 15 + current.nodes.length % 5 * 15, y: 15 + Math.floor(current.nodes.length / 5) * 10 }))}>Add Node</button>
                  <button disabled={selectedNodeIds.length !== 2} onClick={handleCreateEdge}>
                    Create Edge
                  </button>
                  <button disabled={selectedNodeIds.length !== 1} onClick={handleDeleteNode}>
                    Delete Node
                  </button>
                  <button disabled={!selectedEdgeId} onClick={handleDeleteEdge}>
                    Delete Edge
                  </button>
                </div>
              </section>
            </>
          )}

          <section>
            <h2>Timeline Scrubber</h2>
            <div className="timeline-readout">Day {activeDay} / {maxDay}</div>
            <input
              aria-label="Timeline day"
              className="timeline-slider"
              max={maxDay}
              min="0"
              onChange={(event) => setDay(Number(event.target.value))}
              type="range"
              value={activeDay}
            />
            <div className="timeline-actions">
              <button disabled={activeDay === 0} onClick={() => setDay((value) => value - 1)}>
                Step Back
              </button>
              <button disabled={activeDay === maxDay} onClick={() => setDay((value) => value + 1)}>
                Step Forward
              </button>
              <button onClick={() => setDay(0)}>Reset</button>
            </div>
          </section>
        </aside>

        <section className="temporal-stage" aria-label="Temporal graph editor">
          <ResearchLink portalId="temporal-graphs" view="proof">From a later-edge path to the corrected theorem</ResearchLink>
          <svg
            className={`temporal-canvas ${editMode && !isChallengeMode ? 'is-editing' : ''}`}
            onClick={handleCanvasClick}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            viewBox="0 0 100 100"
            role={isChallengeMode ? 'img' : 'group'}
            aria-label="Temporal graph"
          >
            <title>{displayGraph.name} visible through day {activeDay}</title>
            <rect className="canvas-hit-area" height="100" width="100" x="0" y="0" />
            {analysis.edges.map((edge) => {
              const from = displayGraph.nodes.find((node) => node.id === edge.source);
              const to = displayGraph.nodes.find((node) => node.id === edge.target);
              const edgeKey = getTemporalEdgeKey(edge);
              const isWinning = analysis.winningEdgeKeys.has(edgeKey);
              const isTrigger = !isChallengeMode && triggerEdgeId === edgeKey;
              const isActivated = activeTriggerAnalysis.activatedEdgeKeys.has(edgeKey);
              const isActivationPath = activePathEdgeKeys.has(edgeKey);
              const isFocusedWinner = !showAllPaths && selectedActivationKey === edgeKey;
              const isSelected = !isChallengeMode && selectedEdgeId === edgeKey;

              return (
                <g
                  className={[
                    'temporal-edge',
                    isWinning ? 'is-winning' : '',
                    isActivationPath ? 'is-path' : '',
                    isTrigger ? 'is-trigger' : '',
                    isActivated ? 'is-activated' : '',
                    isFocusedWinner ? 'is-focused-winner' : '',
                    isSelected ? 'is-selected' : '',
                  ].join(' ')}
                  key={edgeKey}
                  role={isChallengeMode ? undefined : 'button'}
                  tabIndex={isChallengeMode ? undefined : 0}
                  aria-label={`Edge ${edge.source}-${edge.target}, Day ${edge.day}`}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleEdgeSelect(event, edgeKey); } }}
                  onClick={(event) => handleEdgeSelect(event, edgeKey)}
                >
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                  <text x={(from.x + to.x) / 2} y={from.y === to.y ? from.y + (from.y < 50 ? -7 : 9) : (from.y + to.y) / 2}>
                    Day {edge.day}
                  </text>
                </g>
              );
            })}
            {visibleCandidate && (
              <g
                className={[
                  'temporal-edge',
                  'is-trigger',
                  'is-candidate',
                  activePathEdgeKeys.has(visibleCandidate.id) ? 'is-path' : '',
                ].join(' ')}
              >
                <line
                  x1={displayGraph.nodes.find((node) => node.id === visibleCandidate.source).x}
                  y1={displayGraph.nodes.find((node) => node.id === visibleCandidate.source).y}
                  x2={displayGraph.nodes.find((node) => node.id === visibleCandidate.target).x}
                  y2={displayGraph.nodes.find((node) => node.id === visibleCandidate.target).y}
                />
                <text
                  x={
                    (displayGraph.nodes.find((node) => node.id === visibleCandidate.source).x +
                      displayGraph.nodes.find((node) => node.id === visibleCandidate.target).x) /
                    2
                  }
                  y={
                    (displayGraph.nodes.find((node) => node.id === visibleCandidate.source).y +
                      displayGraph.nodes.find((node) => node.id === visibleCandidate.target).y) /
                    2
                  }
                >
                  Day {candidatePreview.triggerEdge?.day || visibleCandidate.day}
                </text>
              </g>
            )}
            {displayGraph.nodes.map((node) => (
              <g
                className={`temporal-node ${selectedNodeIds.includes(node.id) ? 'is-selected' : ''}`}
                key={node.id}
                role={isChallengeMode ? undefined : 'button'}
                tabIndex={isChallengeMode ? undefined : 0}
                aria-label={`Node ${node.id}`}
                aria-pressed={isChallengeMode ? undefined : selectedNodeIds.includes(node.id)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleNodePointerDown(event, node.id); } }}
                onPointerDown={(event) => handleNodePointerDown(event, node.id)}
              >
                <circle cx={node.x} cy={node.y} r="5.2" />
                <text x={node.x} y={node.y + 1.2}>{node.id}</text>
              </g>
            ))}
          </svg>
        </section>

        <aside className="score-panel">
          <section>
            <h2>Statistics</h2>
            <dl className="score-grid">
              <div>
                <dt>Nodes</dt>
                <dd>{displayGraph.nodes.length}</dd>
              </div>
              <div>
                <dt>Edges</dt>
                <dd>{analysis.edges.length}</dd>
              </div>
              <div>
                <dt>Cycles</dt>
                <dd>{analysis.cycleCount}</dd>
              </div>
              <div>
                <dt>Winners so far</dt>
                <dd>{analysis.winnerCount}</dd>
              </div>
              <div>
                <dt>Newly winning owners</dt>
                <dd>{activeTriggerAnalysis.activationCount}</dd>
              </div>
              <div>
                <dt>Connected components</dt>
                <dd>{analysis.connectedComponents}</dd>
              </div>
            </dl>
          </section>

          <section className="strategy-panel temporal-stats-panel">
            <h2>Temporal Stats</h2>
            <dl className="score-grid">
              <div>
                <dt>Attempts</dt>
                <dd>{temporalStats.challengeAttempts}</dd>
              </div>
              <div>
                <dt>Completions logged (including legacy)</dt>
                <dd>{temporalStats.challengeCompletions}</dd>
              </div>
              <div>
                <dt>Activations logged (including legacy)</dt>
                <dd>{temporalStats.totalActivationsTriggered}</dd>
              </div>
              <div>
                <dt>Historical best (including legacy)</dt>
                <dd>{temporalStats.bestSingleTriggerActivation}</dd>
              </div>
              <div>
                <dt>Gold completions</dt>
                <dd>{temporalStats.goldCompletions}</dd>
              </div>
              <div>
                <dt>Lab import/export</dt>
                <dd>{temporalStats.labGraphsImported}/{temporalStats.labGraphsExported}</dd>
              </div>
            </dl>
            {temporalStats.bestSingleTriggerActivation > 1 && <p>Legacy edge-model counters are preserved, not interpreted as new distinct winners under the official rules.</p>}
          </section>

          {isChallengeMode ? (
            <>
              <section className="strategy-panel">
                <h2>Trigger Analysis</h2>
                {selectedCandidate ? (
                  <>
                    <p>Trigger edge: Day {selectedCandidate.day}</p>
                    <p>Newly winning owners: {candidatePreview.activationCount}</p>
                    {candidatePreview.activatedWinners.length > 0 && (
                      <ul className="winner-list">
                        {candidatePreview.activatedWinners.map((winner) => (
                          <li key={winner}>{winner}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p>Select a candidate trigger to preview activated winners.</p>
                )}
              </section>
              <ActivationPathReveal
                activationPaths={activationPaths}
                focusedActivationKey={selectedActivationKey}
                showAllPaths={showAllPaths}
                onFocus={(edgeKey) => {
                  setFocusedActivationKey(edgeKey);
                  setShowAllPaths(false);
                }}
                onShowAll={() => setShowAllPaths((value) => !value)}
              />
            </>
          ) : (
            <>
              <section className="strategy-panel">
                <h2>Edge Inspector</h2>
                {selectedEdge ? (
                  <>
                    <dl className="analysis-grid">
                      <div>
                        <dt>Endpoints</dt>
                        <dd>{selectedEdge.source}-{selectedEdge.target}</dd>
                      </div>
                      <div>
                        <dt>Winner?</dt>
                        <dd>
                          {fullAnalysis.winningEdgeKeys.has(getTemporalEdgeKey(selectedEdge))
                            ? 'Yes'
                            : 'No'}
                        </dd>
                      </div>
                    </dl>
                    <label className="temporal-field">
                      Day
                      <input
                        min="1"
                        onChange={(event) => handleEdgeDayChange(event.target.value)}
                        type="number"
                        value={selectedEdge.day}
                      />
                    </label>
                    <button
                      className="primary-action secondary-action"
                      onClick={() => setTriggerEdgeId(getTemporalEdgeKey(selectedEdge))}
                    >
                      Candidate Trigger Edge
                    </button>
                  </>
                ) : (
                  <p>Select an edge to inspect its day, endpoints, and winner status.</p>
                )}
              </section>

              <section className="strategy-panel">
                <h2>Trigger Analysis</h2>
                {labTriggerAnalysis.triggerEdge ? (
                  <>
                    <p>Trigger edge: Day {labTriggerAnalysis.triggerEdge.day}</p>
                    <p>Newly winning owners: {labTriggerAnalysis.activationCount}</p>
                  </>
                ) : (
                  <p>Mark any selected edge as the candidate trigger edge.</p>
                )}
              </section>
              <ActivationPathReveal
                activationPaths={activationPaths}
                focusedActivationKey={selectedActivationKey}
                showAllPaths={showAllPaths}
                onFocus={(edgeKey) => {
                  setFocusedActivationKey(edgeKey);
                  setShowAllPaths(false);
                }}
                onShowAll={() => setShowAllPaths((value) => !value)}
              />

              <section className="history-section">
                <h2>Export / Import</h2>
                <textarea aria-label="Exported graph JSON" className="graph-json" readOnly value={exportValue} />
                <textarea
                  aria-label="Import graph JSON"
                  className="graph-json"
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder="Paste graph JSON with nodes and edges..."
                  value={importText}
                />
                <div className="timeline-actions">
                  <button onClick={handleExport}>Copy Export JSON</button>
                  <button onClick={handleImport}>Import Graph</button>
                </div>
                {importMessage && <p className="panel-note">{importMessage}</p>}
              </section>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
