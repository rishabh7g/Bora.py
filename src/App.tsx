import { useEffect, useState } from 'react';
import { findModule, loadCurriculum } from './content/load';
import ExerciseView from './ExerciseView';
import ModuleView from './ModuleView';
import { exerciseStateOf } from './state/progress';
import { useProgress } from './state/useProgress';

const curriculum = loadCurriculum();

// Minimal hash routing:
//   #/module/<id>                 → ModuleView
//   #/module/<id>/exercise/<eid>  → ExerciseView (formative)
//   #/module/<id>/exit            → ExerciseView (exit checkpoint)
const DEFAULT_ROUTE = '#/module/m1';

type Route = { moduleId: string; exerciseId?: string; isExit: boolean };

function routeFromHash(hash: string): Route {
  const match = /^#\/module\/([^/]+)(?:\/exercise\/([^/]+)|\/(exit))?$/.exec(hash);
  if (!match) return { moduleId: 'm1', isExit: false };
  return { moduleId: match[1], exerciseId: match[2], isExit: match[3] === 'exit' };
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash || DEFAULT_ROUTE);
  const { progress, apply } = useProgress();

  useEffect(() => {
    if (!window.location.hash) window.location.hash = DEFAULT_ROUTE;
    const onHashChange = () => setHash(window.location.hash || DEFAULT_ROUTE);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const route = routeFromHash(hash);
  const module = findModule(curriculum, route.moduleId);
  if (!module) {
    return (
      <main>
        <p>Unknown module: {route.moduleId}</p>
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
    // Wait for the stored progress before rendering the gate, so a click can
    // never act on (and overwrite with) unloaded default state.
    if (!progress) return <main />;
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
      <h1>bora.py</h1>
      <ModuleView module={module} />
    </main>
  );
}
