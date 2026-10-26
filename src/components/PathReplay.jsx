import { useState } from 'react';

export default function PathReplay({ path }) {
  const [step, setStep] = useState(0);
  const index = Math.min(step, path.length);
  if (!path.length) return null;
  const state = index === 0 ? path[0].state : path[index - 1].resultingState;
  return <section className="path-replay" aria-label="Optimal witness replay">
    <h3>Replay the optimal witness</h3>
    <div className="replay-state" data-testid="witness-replay-state" aria-live="polite">{state.map((value, position) => <span key={position} data-token-value={value}><small>#{position + 1}</small>{value}</span>)}</div>
    <div className="replay-controls"><button aria-label="Previous witness move" disabled={index === 0} onClick={() => setStep(index - 1)}>&#8592;</button>
      <label>Witness move {index} / {path.length}<input aria-label="Witness move" type="range" min={0} max={path.length} value={index} onChange={(event) => setStep(Number(event.target.value))} /></label>
      <button aria-label="Next witness move" disabled={index === path.length} onClick={() => setStep(index + 1)}>&#8594;</button></div>
    <p>{index === 0 ? 'Initial board' : `Choose ${path[index - 1].chosenPair.join(', ')}; produce ${path[index - 1].producedPair.join(', ')}.`}</p>
  </section>;
}
