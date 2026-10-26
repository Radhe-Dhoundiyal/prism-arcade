import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Lobby from './pages/Lobby.jsx';
import { recordPlaySession, recordPortalVisit } from './profile/profile.js';
import StorageNotice from './components/StorageNotice.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ResearchPanel from './research/ResearchPanel.jsx';

const views = {
  'binary-shift': lazy(() => import('./games/binaryShift/BinaryShift.jsx')),
  'blackboard-moves': lazy(() => import('./games/blackboardMoves/BlackboardMoves.jsx')),
  'grid-dominion': lazy(() => import('./games/gridDominion/GridDominion.jsx')),
  'language-labyrinth': lazy(() => import('./games/languageLabyrinth/LanguageLabyrinth.jsx')),
  'loop-strings': lazy(() => import('./games/loopStrings/LoopStrings.jsx')),
  'number-forge': lazy(() => import('./games/numberForge/NumberForge.jsx')),
  'parity-engine': lazy(() => import('./games/parityEngine/ParityEngine.jsx')),
  'temporal-graphs': lazy(() => import('./games/temporalGraphs/TemporalGraphs.jsx')),
};
const readRoute = () => {
  const requested = window.location.hash.slice(1);
  return Object.hasOwn(views, requested) ? requested : 'lobby';
};

function RouteFrame({ children }) {
  useEffect(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector('main');
    if (main) main.id = 'main-content';
    const heading = main?.querySelector('h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, []);
  return children;
}

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const recorded = useRef(false);
  useEffect(() => {
    if (!recorded.current) {
      recordPlaySession();
      if (Object.hasOwn(views, route)) recordPortalVisit(route);
      recorded.current = true;
    }
    const sync = () => setRoute(readRoute());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  const navigate = (nextRoute) => {
    if (nextRoute !== 'lobby') recordPortalVisit(nextRoute);
    window.history.pushState(null, '', nextRoute === 'lobby' ? '#lobby' : '#' + nextRoute);
    setRoute(nextRoute);
  };
  const Portal = views[route];
  return <>
    <button className="skip-link" onClick={() => document.querySelector('main h1')?.focus()}>Skip to content</button>
    <StorageNotice />
    <ErrorBoundary key={route} onRecover={() => navigate('lobby')}>
      <Suspense fallback={<main className="arcade-shell" role="status">Opening mathematical studio...</main>}>
        <RouteFrame key={route}>
          {Portal ? <><Portal onBack={() => navigate('lobby')} /><ResearchPanel key={route} portalId={route} /></> : <Lobby
            onPlayGridDominion={() => navigate('grid-dominion')}
            onExploreParityEngine={() => navigate('parity-engine')}
            onExploreNumberForge={() => navigate('number-forge')}
            onExploreLanguageLabyrinth={() => navigate('language-labyrinth')}
            onExploreTemporalGraphs={() => navigate('temporal-graphs')}
            onExploreBlackboardMoves={() => navigate('blackboard-moves')}
            onExploreBinaryShift={() => navigate('binary-shift')}
            onExploreLoopStrings={() => navigate('loop-strings')}
          />}
        </RouteFrame>
      </Suspense>
    </ErrorBoundary>
  </>;
}
