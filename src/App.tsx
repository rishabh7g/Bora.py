import { useEffect, useState } from 'react';
import { findModule, loadCurriculum } from './content/load';
import ExerciseView from './ExerciseView';
import HomeMap, { SETUP_ROUTE } from './HomeMap';
import ModuleView from './ModuleView';
import { exitUnlocked, moduleUnlocked } from './state/gating';
import { exerciseStateOf } from './state/progress';
import { useProgress } from './state/useProgress';

const curriculum = loadCurriculum();

// Minimal hash routing:
//   #/                            → HomeMap (root)
//   #/setup                       → SetupGuide (placeholder until its issue)
//   #/module/<id>                 → ModuleView
//   #/module/<id>/exercise/<eid>  → ExerciseView (formative)
//   #/module/<id>/exit            → ExerciseView (exit checkpoint)
const HOME_ROUTE = '#/';

type Route =
  | { screen: 'home' }
  | { screen: 'setup' }
  | { screen: 'module'; moduleId: string; exerciseId?: string; isExit: boolean };

function routeFromHash(hash: string): Route {
  if (hash === SETUP_ROUTE) return { screen: 'setup' };
  const match = /^#\/module\/([^/]+)(?:\/exercise\/([^/]+)|\/(exit))?$/.exec(hash);
  // Anything unrecognised falls back to the map — it is the app's root.
  if (!match) return { screen: 'home' };
  return {
    screen: 'module',
    moduleId: match[1],
    exerciseId: match[2],
    isExit: match[3] === 'exit',
  };
}

/** Placeholder for the SetupGuide screen (ENGINEERING.md §7) — Module 0's
 *  route exists so the map can open it; the real guide ships separately. */
function SetupPlaceholder() {
  return (
    <div className="mod-screen">
      <a className="btn btn-ghost mod-back" href={HOME_ROUTE}>
        ← Map
      </a>
      <p className="mod-kicker">Module 00 — Tier 0 — Setup</p>
      <h1 className="mod-title">Hello, Python</h1>
      <p className="mod-intro">
        The setup guide — install Python and run your first <code>.py</code> file — is being
        written. It arrives with its own checkpoint.
      </p>
    </div>
  );
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash || HOME_ROUTE);
  const { progress, apply } = useProgress();

  useEffect(() => {
    if (!window.location.hash) window.location.hash = HOME_ROUTE;
    const onHashChange = () => setHash(window.location.hash || HOME_ROUTE);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const route = routeFromHash(hash);

  // Wait for the stored progress before rendering any screen, so a click can
  // never act on (and overwrite with) unloaded default state — and so chips,
  // the exit lock and the map's unlock states never flash their defaults.
  if (!progress) return <main />;

  if (route.screen === 'home') {
    return (
      <main>
        <HomeMap curriculum={curriculum} progress={progress} />
      </main>
    );
  }

  if (route.screen === 'setup') {
    return (
      <main>
        <SetupPlaceholder />
      </main>
    );
  }

  const module = findModule(curriculum, route.moduleId);
  if (!module) {
    return (
      <main>
        <p>Unknown module: {route.moduleId}</p>
      </main>
    );
  }

  // §6 module chain (state/gating.ts): a locked module is not reachable by URL
  // either — fall back to the map, whose row shows why it is locked.
  if (!moduleUnlocked(curriculum, module.id, progress)) {
    return (
      <main>
        <HomeMap curriculum={curriculum} progress={progress} />
      </main>
    );
  }

  const exercise = route.isExit
    ? module.exitExercise
    : route.exerciseId
      ? module.exercises.find((candidate) => candidate.id === route.exerciseId)
      : undefined;

  if (route.isExit || route.exerciseId) {
    if (!exercise) {
      return (
        <main>
          <p>Unknown exercise: {route.exerciseId}</p>
        </main>
      );
    }
    // §6 exit lock (state/gating.ts): a direct URL cannot bypass the gate —
    // fall back to the module screen, whose locked row explains the rule.
    if (route.isExit && !exitUnlocked(module, progress)) {
      return (
        <main>
          <ModuleView curriculum={curriculum} module={module} progress={progress} />
        </main>
      );
    }
    return (
      <main>
        <ExerciseView
          module={module}
          exercise={exercise}
          isExit={route.isExit}
          state={exerciseStateOf(progress, module.id, exercise.id)}
          onTransition={(transition) => apply(module.id, exercise.id, route.isExit, transition)}
        />
      </main>
    );
  }

  return (
    <main>
      <ModuleView curriculum={curriculum} module={module} progress={progress} />
    </main>
  );
}
