import { useEffect, useRef, useState } from 'react';
import catalog from './catalog.json';
import notebooks from './notebook-pages.json';
import { getDossier, JOURNEY_STAGES, sourceHref } from './dossiers.js';
import { getNotebookPage } from './researchModel.js';
import { RESEARCH_NARRATIVES } from './editorial.js';
import MathEquation from '../components/MathEquation.jsx';
import ResearchAssetLink from './ResearchAssetLink.jsx';
import { availableResearchHref, PUBLIC_RESEARCH_EDITIONS, publicEditionAsset } from './assetPolicy.js';
import './notebook.css';
import '../publication.css';

const VIEWS = [['notebook', 'Original Notebook'], ['investigation', 'Mathematical Investigation'], ['proof', 'Proof & Verification']];

export function ResearchLink({ portalId, children = 'Investigate the mathematics', view = 'investigation' }) {
  return <button className="research-jump" aria-controls={`research-${portalId}`} onClick={() => {
    window.dispatchEvent(new CustomEvent('prism-research-open', { detail: { portalId, view } }));
  }}>{children} <span aria-hidden="true">&#8599;</span></button>;
}

function Dossier({ dossier }) {
  return <article className="correction-dossier" aria-label="Correction Dossier">
    <p className="research-kicker">{dossier.subtitle}</p><h3>{dossier.title}</h3>
    {dossier.portalId === 'temporal-graphs' && <MathEquation id="temporal" />}
    <p>This correction is separate from the unchanged original.</p>
    <a href={dossier.document} target="_blank" rel="noreferrer">Open Markdown dossier</a>
    <details><summary>Precise source references</summary><ul>{dossier.sources.map((source) =>
      <li key={`${source.url}-${source.page ?? 'tex'}`}><ResearchAssetLink href={sourceHref(source)} target="_blank" rel="noreferrer">{source.label}</ResearchAssetLink></li>)}</ul></details>
    {dossier.sections.map((section) => <section key={section.title}>
      <h4>{section.title}</h4>{section.equation && <MathEquation id={section.equation} />}{section.paragraphs?.map((text) => <p key={text}>{text}</p>)}
      {section.steps && <ol className={section.derivation ? 'derivation-steps' : undefined}>{section.steps.map((step) => <li key={step}>{section.derivation ? <code>{step}</code> : step}</li>)}</ol>}
      {section.list && <ul className="word-witnesses">{section.list.map((word) => <li key={word}><code>{word}</code></li>)}</ul>}
    </section>)}
  </article>;
}

function Notebook({ record, initialPage = 1 }) {
  const notebook = notebooks.records[record.portalId];
  const [pageIndex, setPageIndex] = useState(initialPage - 1);
  const [imageFailed, setImageFailed] = useState(false);
  const [zoom, setZoom] = useState(100);
  const originalPage = getNotebookPage(notebook, pageIndex);
  const edition = PUBLIC_RESEARCH_EDITIONS.records[record.portalId];
  const page = edition?.pages[pageIndex] ?? originalPage;
  if (!page) return <div className="missing-source"><h3>Notebook awaiting source</h3><p>No original notebook was found for this problem. No replacement notes have been created.</p></div>;
  const choosePage = (index) => { setPageIndex(index); setImageFailed(false); };
  return <section className="notebook-view" aria-label="Public research notebook pages">
    <div className="notebook-toolbar">
      <button aria-label="Previous notebook page" disabled={pageIndex === 0} onClick={() => choosePage(pageIndex - 1)}>&#8592;</button>
      <label>Notebook page <select aria-label="Notebook page" value={pageIndex} onChange={(event) => choosePage(Number(event.target.value))}>
        {notebook.pages.map((entry, index) => <option key={entry.page} value={index}>{entry.page} of {notebook.pages.length}</option>)}
      </select></label>
      <button aria-label="Next notebook page" disabled={pageIndex === notebook.pages.length - 1} onClick={() => choosePage(pageIndex + 1)}>&#8594;</button>
      <label className="notebook-zoom">Zoom <select aria-label="Notebook zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
        {[100, 150, 200, 300].map(value => <option key={value} value={value}>{value === 100 ? 'Fit width' : `${value}%`}</option>)}
      </select></label>
      <ResearchAssetLink href={`${notebook.sourceUrl}#page=${page.page}`} target="_blank" rel="noreferrer">Open public-edition PDF</ResearchAssetLink>
    </div>
    <p className="source-caption" data-edition-class={page.classification}>Public edition v1 / source page {page.page}. {page.classification === 'A' ? 'Handwritten reasoning retained; edition label and metadata cleaning added.' : page.classification === 'C' ? 'Original statement page held; new editorial setting, not historical handwriting.' : 'Original problem-statement passage omitted; retained reasoning is historical.'}</p>
    {!availableResearchHref(page.url) ? <div className="missing-source" role="status"><h3>Notebook publication withheld</h3>
      <p>The public-edition asset package is not attached to this build. Historical originals remain private; source and derivative hashes are distinct.</p>
      <p>Selected page: {page.page} of {notebook.pages.length}. Original image reference: <code style={{ overflowWrap: 'anywhere' }}>{page.url}</code>.</p>
      <p>Public-edition SHA-256: <code style={{ overflowWrap: 'anywhere' }}>{page.sha256}</code></p></div> : imageFailed ? <p role="status">Public-edition page unavailable. The public-edition PDF link remains available.</p> :
      <div className="notebook-viewport" role="region" aria-label="Zoomable notebook page" tabIndex={0}>
      <div className="notebook-sheet" style={{ width: `${zoom}%` }}>
      <ResearchAssetLink href={`${notebook.sourceUrl}#page=${page.page}`} target="_blank" rel="noreferrer" aria-label={`Open public-edition notebook PDF at source page ${page.page}`}>
        <img className="notebook-page" src={availableResearchHref(page.url)} width={page.width} height={page.height}
          alt={`Public research edition for Problem ${record.problemNumber}, source page ${page.page}; ${page.classification === 'C' ? 'editorial setting replaces held statement material' : page.classification === 'B' ? 'statement region omitted, historical reasoning retained' : 'historical reasoning retained'}.`}
          loading="lazy" onError={() => setImageFailed(true)} />
      </ResearchAssetLink></div></div>}
    <p className="source-caption">The handwriting has not been transcribed. Current explanations are available as text in Investigation and Proof &amp; Verification.</p>
  </section>;
}

export default function ResearchPanel({ portalId }) {
  const record = catalog.records.find((entry) => entry.portalId === portalId);
  const dossier = getDossier(portalId);
  const [view, setView] = useState('notebook');
  const [stage, setStage] = useState(0);
  const [showDossier, setShowDossier] = useState(false);
  const [notebookPage, setNotebookPage] = useState(1);
  const detailsRef = useRef(null);
  const headingRef = useRef(null);
  const tabs = useRef([]);
  useEffect(() => {
    const open = (event) => {
      if (event.detail?.portalId !== portalId) return;
      setView(VIEWS.some(([id]) => id === event.detail.view) ? event.detail.view : 'investigation');
      setStage(event.detail.view === 'proof' ? 4 : event.detail.view === 'notebook' ? 0 : 3);
      setShowDossier(Boolean(dossier));
      if (detailsRef.current) detailsRef.current.open = true;
      requestAnimationFrame(() => {
        headingRef.current?.focus({ preventScroll: true });
        headingRef.current?.scrollIntoView({ block: 'start' });
      });
    };
    window.addEventListener('prism-research-open', open);
    return () => window.removeEventListener('prism-research-open', open);
  }, [portalId, dossier]);
  if (!record) return null;
  const narrative = RESEARCH_NARRATIVES[portalId];
  const statement = record.assets.find((asset) => asset.kind === 'official-statement');
  const selectView = (next, selectedStage = next === 'notebook' ? 0 : next === 'investigation' ? 3 : 4) => { setView(next); setStage(selectedStage); setShowDossier(false); };
  return <section id={`research-${portalId}`} className="research-panel arcade-shell" aria-label="Mathematical research sources">
    <details ref={detailsRef}>
      <summary><span>Explore My Reasoning</span> <span className="journey-summary">Research Journey</span></summary>
      <header className="research-heading">
        <div><p className="research-kicker">Problem {record.problemNumber} / Research Journey</p>
          <h2 ref={headingRef} tabIndex={-1}>From experiment to evidence</h2><p>{record.concept}</p></div>
        <span className="evidence-label">Practice is not proof</span>
      </header>
      <p className="research-review-notice">Public research edition v1. Edited pages are labeled; historical conclusions and current corrections remain separate.</p>
      <nav className="journey-stages" aria-label="Research journey stages">
        {JOURNEY_STAGES.map(([label, target], index) => <button key={label} aria-pressed={stage === index}
          onClick={() => selectView(target, index)}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>)}
      </nav>
      <div className="research-tabs" role="tablist" aria-label="Research content views">
        {VIEWS.map(([id, label], index) => <button key={id} ref={(element) => { tabs.current[index] = element; }} role="tab"
          id={`research-tab-${portalId}-${id}`} aria-controls={`research-view-${portalId}`} aria-selected={view === id}
          tabIndex={view === id ? 0 : -1} onClick={() => selectView(id)} onKeyDown={(event) => {
            const next = event.key === 'ArrowRight' ? (index + 1) % VIEWS.length : event.key === 'ArrowLeft' ? (index + VIEWS.length - 1) % VIEWS.length : event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1 : null;
            if (next !== null) { event.preventDefault(); selectView(VIEWS[next][0]); tabs.current[next]?.focus(); }
          }}>{label}</button>)}
      </div>
      <div role="tabpanel" id={`research-view-${portalId}`} aria-labelledby={`research-tab-${portalId}-${view}`} tabIndex={0}>
        {view === 'notebook' && <div className="notebook-investigation">
          <Notebook key={`${portalId}-${notebookPage}`} record={record} initialPage={notebookPage} />
          <aside className="source-context"><h3>Original question</h3><p>{narrative.question}</p>
            {statement && <ResearchAssetLink href={sourceHref({ url: statement.url, page: statement.sourcePage })} target="_blank" rel="noreferrer">Official question / page {statement.sourcePage}</ResearchAssetLink>}
            <h3>What to track</h3><p>{narrative.quantities}</p>
            <h3>The idea and its limits</h3><p>{narrative.insight}</p><p>{narrative.correction}</p>
            {dossier?.sources.filter((source) => source.claimScan).map((source) => <p key={source.page}><button className="research-jump" onClick={() => setNotebookPage(source.page)}>Original claim / notebook page {source.page}</button></p>)}
            {dossier && <button className="research-jump" onClick={() => { selectView('investigation'); setShowDossier(true); }}>Read Correction Dossier &#8594;</button>}
            <p className="source-caption">The notebook records the original attempt. Current conclusions are explained separately.</p>
          </aside>
        </div>}
        {view === 'investigation' && <>
          <section className="investigation-intro"><h3>The question</h3><p>{narrative.question}</p><p>{narrative.quantities}</p>
            <h3>Mathematical insight</h3><p>{narrative.insight}</p>
            <h3>Conjectures and corrections</h3><p>{narrative.correction}</p>
            <h3>What the engine checks</h3><p>{narrative.verification}</p>
            {dossier && <button className="research-jump" aria-expanded={showDossier} onClick={() => setShowDossier(!showDossier)}>{showDossier ? 'Close' : 'Read'} Correction Dossier</button>}
          </section>{showDossier && dossier && <Dossier dossier={dossier} />}
        </>}
        {view === 'proof' && <>
          <section className="verification-view"><h3>Proof &amp; Verification</h3><p>{narrative.verification}</p>
            {portalId === 'language-labyrinth' && <p>Your written explanations are recorded, not machine-verified proofs. The length-10 count is exhaustive; it is not a classification of palindromes of every length.</p>}
            {dossier && <><p>Read the corrected argument, its assumptions and coverage separately from the historical source.</p>
              <button className="research-jump" aria-expanded={showDossier} onClick={() => setShowDossier(!showDossier)}>{showDossier ? 'Close' : 'Read'} Correction Dossier</button></>}
            <h3>{portalId === 'blackboard-moves' ? 'Historical problem extract / not a solution' : 'Historical solution / public TeX edition'}</h3><p>Untouched original manuscripts remain private. The public TeX edition removes statement material and adds a labeled editorial introduction; historical mathematical conclusions are not corrected in place.</p>
            {record.assets.filter((asset) => asset.kind === 'tex' || asset.kind === 'problem-extract').map((asset) => <p key={asset.url}><ResearchAssetLink href={asset.url} download>{asset.kind === 'problem-extract' ? 'Problem 8 statement extract (not a solution; held)' : 'Historical solution - public TeX edition'}</ResearchAssetLink></p>)}
            {portalId === 'blackboard-moves' && <p>The legal [4,5,5] maximum witness has 19 moves; replay each indexed transition in the lab. Greedy gives 9. The exhaustive budget and admission caps remain in force.</p>}
            {portalId === 'loop-strings' && <p>A 3-shift is a 3-cycle, hence even. Cycle decomposition and finite BFS witnesses are distinct from a proof for arbitrary search sizes.</p>}
          </section>{showDossier && dossier && <Dossier dossier={dossier} />}
        </>}
      </div>
      <footer className="research-provenance"><h3>Provenance</h3><p>The original mathematical investigations are credited to Radhe Dhoundiyal. Software implementation and later mathematical verification involved AI assistance. Historical conclusions and subsequent corrections are documented separately.</p>
        <p>Research links open labeled public editions where included. Unmodified historical originals and the official problem-set PDF are not distributed. Source Details distinguishes original and derivative hashes.</p>
        <p><a href="https://www.prism-india.org/" target="_blank" rel="noreferrer">PRISM India official website</a></p>
        <p>Research editions and media have separate rights. Third-party material and future asset hosting require separate permission; see the <a href="/research-rights.txt" target="_blank" rel="noreferrer">research-rights notice</a>.</p>
        <details><summary>Source Details / hashes and correction history</summary>
          <p>{record.authorship}</p><p>{record.claimStatus}</p>
          <ul>{record.assets.map((asset) => <li key={asset.url}><ResearchAssetLink href={asset.url} target="_blank" rel="noreferrer">{asset.originalFile}</ResearchAssetLink>
            <p>Private original / source page: {asset.sourcePage ?? 'not applicable'}. Original bytes: {asset.bytes}. {asset.verificationStatus}</p><code>Original SHA-256 {asset.sha256}</code>
            {publicEditionAsset(asset.url) && <p>Public edition SHA-256: <code>{publicEditionAsset(asset.url).sha256}</code></p>}</li>)}</ul>
          {record.correctionHistory.map((entry) => <p key={entry.note}>{entry.date} / {entry.actor}: {entry.note}</p>)}
        </details>
      </footer>
    </details>
  </section>;
}
