import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import BottomNav from './BottomNav';
import CelebrationScreen, { celebrationTriggered } from './CelebrationScreen';
import { findModule, loadCurriculum } from './content/load';
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
import type { ExerciseState } from './state/effortGate';
import { exitUnlocked, moduleStateOf, moduleUnlocked, tier5Unlocked } from './state/gating';
import { exerciseStateOf, type Progress } from './state/progress';
import { useProgress } from './state/useProgress';
import './app.css';

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

/** The screen the shell's chrome marks as current. This app has no
 *  react-router and so no location context of its own; the route App already
 *  resolved is the one source of that state, and the shell reads it here
 *  rather than taking it as a prop (#75). */
const ScreenContext = createContext<Route['screen']>('home');

/** The canonical hash the shell is currently rendering — the app's "which page
 *  is this" signal, and the only thing that makes a route change a *change*.
 *  It is the canonical hash, not the raw one, so the `#/module/m0` → `#/setup`
 *  rewrite (canonicalHash above, a `location.replace` on arrival) reads as the
 *  one navigation it is rather than two. The screen alone is too coarse: two
 *  exercises in the same module are the same screen and different pages. */
const RouteHashContext = createContext<string>(HOME_ROUTE);

/** The one frame every screen renders inside (#73, src/app.css): a full-height
 *  flex column whose only scrolling child is the `<main>` holding the screen.
 *  Everything the app must show on more than one screen becomes another child
 *  of that column, beside the content rather than over it — so nothing overlaps
 *  and no screen has to pad for it. The bottom nav (#75) is that column's last
 *  child: a `flex: none` sibling of the screen, never a fixed bar over it, and
 *  it is there on every screen including Exercise. There is exactly one
 *  `<main>` in this file, and App renders this shell once, around whichever
 *  screen the route picks — so no screen can be rendered outside it. */
function Shell({ children }: { children: ReactNode }) {
  const screen = useContext(ScreenContext);
  const hash = useContext(RouteHashContext);
  const scroller = useRef<HTMLElement>(null);

  // A route change starts the new screen at the top (#85).
  //
  // The browser resets the scroll offset for us when the *document* scrolls,
  // but since #73 the document does not: the element below does, React reuses
  // that one node for every screen, and its scrollTop survives into the next
  // screen (clamped to that screen's height). So "Continue →" out of the
  // celebration landed the learner at the bottom of the map instead of on the
  // module it had just unlocked. It belongs here, once, in the shell that owns
  // the scroll container — not repeated in the screens that happen to be tall.
  //
  // Layout effect, so the reset lands in the same frame the new screen is
  // painted in and it never flashes at the old offset. Assigning scrollTop
  // rather than scrollTo({ behavior }): a route change is not a scroll gesture,
  // so the jump is instant, with no animation for prefers-reduced-motion to
  // object to — see the `scroll-behavior` note in src/app.css.
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [hash]);

  return (
    <div className="app-shell">
      <main className="app-screen" ref={scroller}>
        {children}
      </main>
      <BottomNav screen={screen} />
    </div>
  );
}

/** What a checkpoint screen's buttons hand back: a pure step on the exercise's
 *  state (state/effortGate.ts), which App applies to the stored progress. */
type TransitionHandler = (transition: (state: ExerciseState) => ExerciseState) => void;

type ModuleRoute = Extract<Route, { screen: 'module' }>;

type CelebrationOverlayProps = {
  module: Module;
  curriculum: Curriculum;
  progress: Progress;
  /** App's transient pass-edge state: the module celebrating right now, if any. */
  celebratingModuleId: string | null;
  onDismiss: () => void;
};

/** The red field over a checkpoint screen while its module is the one
 *  celebrating, and nothing at all otherwise. Both checkpoint screens — the
 *  setup guide's inline exit and ExerciseView's — render this same overlay;
 *  "Continue →" dismisses it and goes on to the map, where the next checkpoint
 *  is open. */
function CelebrationOverlay({
  module,
  curriculum,
  progress,
  celebratingModuleId,
  onDismiss,
}: CelebrationOverlayProps) {
  if (celebratingModuleId !== module.id) return null;
  return (
    <CelebrationScreen
      module={module}
      moduleNumber={module.number}
      tier5Unlocked={tier5Unlocked(curriculum, progress)}
      onContinue={() => {
        onDismiss();
        window.location.hash = HOME_ROUTE;
      }}
    />
  );
}

export default function App() {
  // Was module scope (#96): a throw there happens before createRoot(...).render()
  // ever runs, so nothing could catch it and the learner got an empty #root and
  // a console line they would never see. Computed here instead, a throw happens
  // during App's own render and is caught by the ErrorBoundary main.tsx wraps it
  // in. useMemo, not a plain call: the curriculum is static content bundled at
  // build time, so it never needs to be re-parsed on a later render.
  const curriculum = useMemo(() => loadCurriculum(), []);
  const [hash, setHash] = useState(() => window.location.hash || HOME_ROUTE);
  const store = useProgress();
  // The celebration is transient by design (ENGINEERING.md §11 step 8): it is
  // set on the pass edge only, so a revisit or a reload never replays it.
  const [celebratingModuleId, setCelebratingModuleId] = useState<string | null>(null);

  useEffect(() => {
    if (!window.location.hash) window.location.hash = HOME_ROUTE;
    const onHashChange = () => setHash(window.location.hash || HOME_ROUTE);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const canonical = canonicalHash(hash);

  // Keep the address bar on the canonical hash for the screen being rendered —
  // `replace`, not an assignment, so the non-canonical hash is not left in the
  // history for Back to bounce off.
  useEffect(() => {
    if (canonical !== hash) window.location.replace(canonical);
  }, [hash, canonical]);

  const route = routeFromHash(hash, curriculum);

  /** The `onTransition` a checkpoint screen gets: apply the transition, and
   *  celebrate the pass edge only — the exit exercise reaching matched while
   *  the module had not passed yet. */
  function checkpointHandler(
    module: Module,
    exercise: Exercise,
    isExit: boolean,
    progress: Progress,
  ): TransitionHandler {
    const before = exerciseStateOf(progress, module.id, exercise.id);
    const alreadyPassed = moduleStateOf(curriculum, module.id, progress) === 'passed';
    return (transition) => {
      store.apply(module.id, exercise.id, isExit, transition);
      if (celebrationTriggered(isExit, alreadyPassed, transition(before))) {
        setCelebratingModuleId(module.id);
      }
    };
  }

  // Module 0 lives on the setup screen, not on ModuleView (design/README.md
  // "Gating"): its exit checkpoint is rendered inline by SetupGuide, and it
  // celebrates on the pass edge exactly like every other checkpoint.
  function renderSetup(module: Module, progress: Progress) {
    return (
      <>
        <SetupGuide
          module={module}
          progress={progress}
          onTransition={checkpointHandler(module, module.exitExercise, true, progress)}
        />
        <CelebrationOverlay
          module={module}
          curriculum={curriculum}
          progress={progress}
          celebratingModuleId={celebratingModuleId}
          onDismiss={() => setCelebratingModuleId(null)}
        />
      </>
    );
  }

  function renderExercise(module: Module, exercise: Exercise, isExit: boolean, progress: Progress) {
    return (
      <>
        <ExerciseView
          module={module}
          moduleNumber={module.number}
          exercise={exercise}
          isExit={isExit}
          state={exerciseStateOf(progress, module.id, exercise.id)}
          onTransition={checkpointHandler(module, exercise, isExit, progress)}
        />
        <CelebrationOverlay
          module={module}
          curriculum={curriculum}
          progress={progress}
          celebratingModuleId={celebratingModuleId}
          onDismiss={() => setCelebratingModuleId(null)}
        />
      </>
    );
  }

  // The module and exercise here are resolved by routeFromHash — an id the
  // curriculum does not have never gets this far, it is a home route. The two
  // §6 gates (state/gating.ts) fall back to the nearest screen that explains
  // them: a locked module is not reachable by URL either, so it is the map,
  // whose row shows why; a locked exit checkpoint is its module screen, whose
  // exit row explains the rule.
  function renderModule({ module, exercise, isExit }: ModuleRoute, progress: Progress) {
    if (!moduleUnlocked(curriculum, module.id, progress)) {
      return <HomeMap curriculum={curriculum} progress={progress} />;
    }
    // No exercise is the bare #/module/<id> hash: the module screen.
    if (!exercise || (isExit && !exitUnlocked(module, progress))) {
      return <ModuleView module={module} progress={progress} />;
    }
    return renderExercise(module, exercise, isExit, progress);
  }

  /** The screen itself, as a branch table over the route. */
  function renderScreen(progress: Progress) {
    switch (route.screen) {
      case 'home':
        return <HomeMap curriculum={curriculum} progress={progress} />;
      case 'shelf':
        return <PhotocardShelf curriculum={curriculum} progress={progress} />;
      case 'settings':
        return (
          <Settings
            curriculum={curriculum}
            progress={progress}
            onImport={store.replaceAll}
            onResetModule={store.resetModule}
          />
        );
      case 'setup':
        return renderSetup(route.module, progress);
      case 'module':
        return renderModule(route, progress);
    }
  }

  // Wait for the stored progress before rendering any screen, so a click can
  // never act on (and overwrite with) unloaded default state — and so chips,
  // the exit lock and the map's unlock states never flash their defaults.
  // Waiting is not the same as showing nothing though: ProgressLoading says so,
  // and says it plainly once the read has stalled, so a storage failure can
  // never present as a permanently empty page.
  //
  // The route the shell needs (the nav's current item, and whatever chrome
  // joins it later) travels as context, so adding a piece of chrome never
  // means editing the screens.
  return (
    <ScreenContext.Provider value={route.screen}>
      <RouteHashContext.Provider value={canonical}>
        <Shell>
          {store.progress ? (
            renderScreen(store.progress)
          ) : (
            <ProgressLoading stalled={store.storageStalled} />
          )}
        </Shell>
      </RouteHashContext.Provider>
    </ScreenContext.Provider>
  );
}
