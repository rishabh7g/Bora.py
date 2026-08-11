import { useEffect, useState } from 'react';
import { findModule, loadCurriculum } from './content/load';
import ModuleView from './ModuleView';

const curriculum = loadCurriculum();

// Minimal hash routing: #/module/<id>. Defaults to Module 1.
const DEFAULT_ROUTE = '#/module/m1';

function moduleIdFromHash(hash: string): string {
  const match = /^#\/module\/([^/]+)$/.exec(hash);
  return match ? match[1] : 'm1';
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash || DEFAULT_ROUTE);

  useEffect(() => {
    if (!window.location.hash) window.location.hash = DEFAULT_ROUTE;
    const onHashChange = () => setHash(window.location.hash || DEFAULT_ROUTE);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const moduleId = moduleIdFromHash(hash);
  const module = findModule(curriculum, moduleId);

  return (
    <main>
      <h1>bora.py</h1>
      {module ? <ModuleView module={module} /> : <p>Unknown module: {moduleId}</p>}
    </main>
  );
}
