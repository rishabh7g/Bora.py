import { useEffect, useState, type ReactNode } from 'react';
import CelebrationScreen, { celebrationTriggered } from './CelebrationScreen';
import { findModule, loadCurriculum, moduleNumberOf } from './content/load';
import type { Curriculum, Exercise, Module } from './content/types';
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
import ProgressLoading from './ProgressLoading';
import Settings from './Settings';
import SetupGuide from './SetupGuide';
import { exitUnlocked, moduleStateOf, moduleUnlocked, tier5Unlocked } from './state/gating';
import { exerciseStateOf } from './state/progress';
import { useProgress } from './state/useProgress';
import './app.css';

const curriculum = loadCurriculum();

// Minimal hash routing:
//   #/                            → HomeMap (root)
//   #/setup                       → SetupGuide (Module 0: OS picker + stepper)
//   #/shelf                       → PhotocardShelf
//   #/settings                    → Settings (export / import / reset)
//   #/module/<id>                 → ModuleView
//   #/module/<id>/exercise/<eid>  → ExerciseView (formative)
//   #/module/<id>/exit            → ExerciseView (exit checkpoint)
//
// Module 0 has no #/module/m0 route at all: it is the setup guide, and it lives
// on #/setup (see canonicalHash below).
//
// One fallback rule, for every hash this app cannot honour: render the map. It
// is the app's root and it always offers a way on, so a hash the router does not
// recognise, and a hash naming content that does not exist, land in the same
// place. That is why a Route carries the resolved Module / Exercise rather than
// their ids: a screen can only be reached with real content behind it, so no
// screen can render an "Unknown …" dead end (issue #42).
type Route =
  | { screen: 'home' }
  | { screen: 'setup'; module: Module }
  | { screen: 'shelf' }
  | { screen: 'settings' }
  | { screen: 'module'; module: Module; exercise?: Exercise; isExit: boolean };

const MODULE_HASH = /^#\/module\/([^/]+)(?:\/exercise\/([^/]+)|\/(exit))?$/;

const HOME: Route = { screen: 'home' };

function setupRoute(curriculum: Curriculum): Route {
  const module = findModule(curriculum, SETUP_MODULE_ID);
  return module ? { screen: 'setup', module } : HOME;
}

export function routeFromHash(hash: string, curriculum: Curriculum): Route {
  if (hash === SETUP_ROUTE) return setupRoute(curriculum);
  if (hash === SHELF_ROUTE) return { screen: 'shelf' };
  if (hash === SETTINGS_ROUTE) return { screen: 'settings' };
  const match = MODULE_HASH.exec(hash);
  // Anything unrecognised falls back to the map — it is the app's root.
  if (!match) return HOME;
  const [, moduleId, exerciseId, exit] = match;
  // Module 0 is the setup guide (design/README.md "Gating"): it has no concept
  // doc, no formative exercises, and its exit checkpoint is rendered inline at
  // the end of the guide. ModuleView would render empty section headings and a
  // lone exit row that skips the whole guide, so every #/module/m0… hash is the
  // setup screen — rendered here, and rewritten in the address bar by
  // canonicalHash so there is only ever one URL for Module 0.
  if (moduleId === SETUP_MODULE_ID) return setupRoute(curriculum);
  const module = findModule(curriculum, moduleId);
  // A well-shaped hash naming a module that does not exist is still just an
  // unrecognised hash — the map, same as #/nonsense/route.
  if (!module) return HOME;
  const isExit = exit === 'exit';
  const exercise = isExit
    ? module.exitExercise
    : exerciseId
      ? module.exercises.find((candidate) => candidate.id === exerciseId)
      : undefined;
  // …and so is a hash naming an exercise the module does not have. (An
  // exercise-less #/module/<id> is a real route: the module screen.)
  if (exerciseId && !exercise) return HOME;
  return { screen: 'module', module, exercise, isExit };
}

/** The one hash a route may be reached on, so a bookmark, a share or a reload
 *  never disagrees with the screen. Only Module 0 needs it today: `#/module/m0`,
 *  `#/module/m0/exit` and `#/module/m0/exercise/<eid>` all name the setup guide,
 *  which lives at `#/setup`. Everything else is already canonical — an
 *  unrecognised hash keeps rendering the map without a rewrite, so Back still
 *  leaves the app the way it arrived. */
export function canonicalHash(hash: string): string {
  const match = MODULE_HASH.exec(hash);
  return match?.[1] === SETUP_MODULE_ID ? SETUP_ROUTE : hash;
}

/** The one frame every screen renders inside (#73, src/app.css): a full-height
 *  flex column whose only scrolling child is the `<main>` holding the screen.
 *  Everything the app must show on more than one screen becomes another child
 *  of that column, beside the content rather than over it — so nothing overlaps
 *  and no screen has to pad for it. There is exactly one `<main>` in this file;
 *  every branch below returns `<Shell>…</Shell>`. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <main className="app-screen">{children}</main>
    </div>
  );
}

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash || HOME_ROUTE);
  const { progress, storageStalled, apply, replaceAll, resetModule } = useProgress();
  // The celebration is transient by design (ENGINEERING.md §11 step 8): it is
  // set on the pass edge only, so a revisit or a reload never replays it.
  const [celebratingModuleId, setCelebratingModuleId] = useState<string | null>(null);

  useEffect(() => {
    if (!window.location.hash) window.location.hash = HOME_ROUTE;
    const onHashChange = () => setHash(window.location.hash || HOME_ROUTE);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Keep the address bar on the canonical hash for the screen being rendered —
  // `replace`, not an assignment, so the non-canonical hash is not left in the
  // history for Back to bounce off.
  useEffect(() => {
    const canonical = canonicalHash(hash);
    if (canonical !== hash) window.location.replace(canonical);
  }, [hash]);

  const route = routeFromHash(hash, curriculum);

  // Wait for the stored progress before rendering any screen, so a click can
  // never act on (and overwrite with) unloaded default state — and so chips,
  // the exit lock and the map's unlock states never flash their defaults.
  // Waiting is not the same as showing nothing though: ProgressLoading says so,
  // and says it plainly once the read has stalled, so a storage failure can
  // never present as a permanently empty page.
  if (!progress) {
    return (
      <Shell>
        <ProgressLoading stalled={storageStalled} />
      </Shell>
    );
  }

  if (route.screen === 'home') {
    return (
      <Shell>
        <HomeMap curriculum={curriculum} progress={progress} />
      </Shell>
    );
  }

  if (route.screen === 'shelf') {
    return (
      <Shell>
        <PhotocardShelf curriculum={curriculum} progress={progress} />
      </Shell>
    );
  }

  if (route.screen === 'settings') {
    return (
      <Shell>
        <Settings
          curriculum={curriculum}
          progress={progress}
          onImport={replaceAll}
          onResetModule={resetModule}
        />
      </Shell>
    );
  }

  // Module 0 lives on the setup screen, not on ModuleView (design/README.md
  // "Gating"): its exit checkpoint is rendered inline by SetupGuide, and it
  // celebrates on the pass edge exactly like every other checkpoint.
  if (route.screen === 'setup') {
    const setupModule = route.module;
    const exit = setupModule.exitExercise;
    const alreadyPassed = moduleStateOf(curriculum, setupModule.id, progress) === 'passed';
    return (
      <Shell>
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
      </Shell>
    );
  }

  // Resolved by routeFromHash — an id the curriculum does not have never gets
  // this far, it is a home route.
  const module = route.module;

  // §6 module chain (state/gating.ts): a locked module is not reachable by URL
  // either — fall back to the map, whose row shows why it is locked.
  if (!moduleUnlocked(curriculum, module.id, progress)) {
    return (
      <Shell>
        <HomeMap curriculum={curriculum} progress={progress} />
      </Shell>
    );
  }

  // Resolved by routeFromHash too: an exercise id the module does not have is a
  // home route, so an exercise here is always a real one. No exercise means the
  // bare #/module/<id> hash — the module screen, at the bottom of this function.
  const exercise = route.exercise;

  if (exercise) {
    // §6 exit lock (state/gating.ts): a direct URL cannot bypass the gate —
    // fall back to the module screen, whose locked row explains the rule.
    if (route.isExit && !exitUnlocked(module, progress)) {
      return (
        <Shell>
          <ModuleView curriculum={curriculum} module={module} progress={progress} />
        </Shell>
      );
    }
    const state = exerciseStateOf(progress, module.id, exercise.id);
    const alreadyPassed = moduleStateOf(curriculum, module.id, progress) === 'passed';
    return (
      <Shell>
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
      </Shell>
    );
  }

  return (
    <Shell>
      <ModuleView curriculum={curriculum} module={module} progress={progress} />
    </Shell>
  );
}
