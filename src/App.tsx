import { useEffect, useState } from 'react';
import CelebrationScreen, { celebrationTriggered } from './CelebrationScreen';
import { findModule, loadCurriculum, moduleNumberOf } from './content/load';
import ExerciseView from './ExerciseView';
import HomeMap, {
  HOME_ROUTE,
  SETTINGS_ROUTE,
  SETUP_MODULE_ID,
  SETUP_ROUTE,
  SHELF_ROUTE,
} from './HomeMap';
import ModuleView from './ModuleView';
import PhotocardShelf from './PhotocardShelf';
import Settings from './Settings';
import SetupGuide from './SetupGuide';
import { exitUnlocked, moduleStateOf, moduleUnlocked, tier5Unlocked } from './state/gating';
import { exerciseStateOf } from './state/progress';
import { useProgress } from './state/useProgress';

const curriculum = loadCurriculum();

// Minimal hash routing:
//   #/                            → HomeMap (root)
//   #/setup                       → SetupGuide (Module 0: OS picker + stepper)
//   #/shelf                       → PhotocardShelf
//   #/settings                    → Settings (export / import / reset)
//   #/module/<id>                 → ModuleView
//   #/module/<id>/exercise/<eid>  → ExerciseView (formative)
//   #/module/<id>/exit            → ExerciseView (exit checkpoint)
type Route =
  | { screen: 'home' }
  | { screen: 'setup' }
  | { screen: 'shelf' }
  | { screen: 'settings' }
  | { screen: 'module'; moduleId: string; exerciseId?: string; isExit: boolean };

function routeFromHash(hash: string): Route {
  if (hash === SETUP_ROUTE) return { screen: 'setup' };
  if (hash === SHELF_ROUTE) return { screen: 'shelf' };
  if (hash === SETTINGS_ROUTE) return { screen: 'settings' };
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

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash || HOME_ROUTE);
  const { progress, apply, replaceAll, resetModule } = useProgress();
  // The celebration is transient by design (ENGINEERING.md §11 step 8): it is
  // set on the pass edge only, so a revisit or a reload never replays it.
  const [celebratingModuleId, setCelebratingModuleId] = useState<string | null>(null);

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

  if (route.screen === 'shelf') {
    return (
      <main>
        <PhotocardShelf curriculum={curriculum} progress={progress} />
      </main>
    );
  }

  if (route.screen === 'settings') {
    return (
      <main>
        <Settings
          curriculum={curriculum}
          progress={progress}
          onImport={replaceAll}
          onResetModule={resetModule}
        />
      </main>
    );
  }

  // Module 0 lives on the setup screen, not on ModuleView (design/README.md
  // "Gating"): its exit checkpoint is rendered inline by SetupGuide, and it
  // celebrates on the pass edge exactly like every other checkpoint.
  if (route.screen === 'setup') {
    const setupModule = findModule(curriculum, SETUP_MODULE_ID);
    if (!setupModule) {
      return (
        <main>
          <p>Unknown module: {SETUP_MODULE_ID}</p>
        </main>
      );
    }
    const exit = setupModule.exitExercise;
    const alreadyPassed = moduleStateOf(curriculum, setupModule.id, progress) === 'passed';
    return (
      <main>
        <SetupGuide
          curriculum={curriculum}
          module={setupModule}
          progress={progress}
          onTransition={(transition) => {
            apply(setupModule.id, exit.id, true, transition);
            const before = exerciseStateOf(progress, setupModule.id, exit.id);
            if (celebrationTriggered(true, alreadyPassed, transition(before))) {
              setCelebratingModuleId(setupModule.id);
            }
          }}
        />
        {celebratingModuleId === setupModule.id && (
          <CelebrationScreen
            module={setupModule}
            moduleNumber={moduleNumberOf(curriculum, setupModule.id)}
            tier5Unlocked={tier5Unlocked(curriculum, progress)}
            onContinue={() => {
              setCelebratingModuleId(null);
              window.location.hash = HOME_ROUTE; // on to the map, Module 01 open
            }}
          />
        )}
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
    const state = exerciseStateOf(progress, module.id, exercise.id);
    const alreadyPassed = moduleStateOf(curriculum, module.id, progress) === 'passed';
    return (
      <main>
        <ExerciseView
          module={module}
          exercise={exercise}
          isExit={route.isExit}
          state={state}
          onTransition={(transition) => {
            apply(module.id, exercise.id, route.isExit, transition);
            // Celebrate the pass edge only — the exit exercise reaching matched
            // while the module had not passed yet.
            if (celebrationTriggered(route.isExit, alreadyPassed, transition(state))) {
              setCelebratingModuleId(module.id);
            }
          }}
        />
        {celebratingModuleId === module.id && (
          <CelebrationScreen
            module={module}
            moduleNumber={moduleNumberOf(curriculum, module.id)}
            tier5Unlocked={tier5Unlocked(curriculum, progress)}
            onContinue={() => {
              setCelebratingModuleId(null);
              window.location.hash = HOME_ROUTE; // on to the map, next checkpoint open
            }}
          />
        )}
      </main>
    );
  }

  return (
    <main>
      <ModuleView curriculum={curriculum} module={module} progress={progress} />
    </main>
  );
}
