// Routing contract for src/App.tsx — which hash resolves to which screen, and
// which hash the address bar is allowed to sit on.
//
// Two rules are pinned here:
// - Module 0 is the setup guide: it has no concept doc and no formative
//   exercises, so it has no ModuleView route. Every `#/module/m0…` hash resolves
//   to the setup screen and is rewritten to `#/setup` (issue #41).
// - Any hash this app cannot honour resolves to the map, the app's root — an
//   unrecognised hash and a hash naming content that does not exist behave the
//   same, so no screen can be an "Unknown …" dead end (issue #42).
import { expect, it } from 'vitest';
import { canonicalHash, routeFromHash } from './App';
import { findModule, flatModules, loadCurriculum } from './content/load';
import { moduleHref, SETUP_MODULE_ID, SETUP_ROUTE } from './HomeMap';
import { moduleUnlocked } from './state/gating';
import { emptyProgress } from './state/progress';

const curriculum = loadCurriculum();
const modules = flatModules(curriculum);

/** The route as a flat, readable shape — ids instead of the resolved content
 *  objects the router hands to the screens. */
function route(hash: string) {
  const resolved = routeFromHash(hash, curriculum);
  if (resolved.screen !== 'module') {
    return { screen: resolved.screen };
  }
  return {
    screen: resolved.screen,
    moduleId: resolved.module.id,
    exerciseId: resolved.exercise?.id,
    isExit: resolved.isExit,
  };
}

const M0_HASHES = [
  `#/module/${SETUP_MODULE_ID}`,
  `#/module/${SETUP_MODULE_ID}/exit`,
  `#/module/${SETUP_MODULE_ID}/exercise/exit`,
  `#/module/${SETUP_MODULE_ID}/exercise/e1`,
];

it('every #/module/m0 hash resolves to the setup screen, never ModuleView', () => {
  for (const hash of [...M0_HASHES, SETUP_ROUTE]) {
    const resolved = routeFromHash(hash, curriculum);
    expect(resolved.screen).toBe('setup');
    // The screen gets Module 0 itself — SetupGuide renders its checkpoint inline.
    expect(resolved.screen === 'setup' && resolved.module.id).toBe(SETUP_MODULE_ID);
  }
});

it('canonicalises every #/module/m0 hash to #/setup, so the address bar agrees', () => {
  for (const hash of M0_HASHES) {
    expect(canonicalHash(hash)).toBe(SETUP_ROUTE);
  }
});

it('leaves every other hash alone — one rewrite rule, not a router of redirects', () => {
  for (const hash of [
    '#/',
    SETUP_ROUTE,
    '#/shelf',
    '#/settings',
    '#/module/m1',
    '#/module/m1/exit',
    '#/module/m1/exercise/e1',
    '#/module/m12',
    '#/nonsense/route',
    '#/module/bogus',
  ]) {
    expect(canonicalHash(hash)).toBe(hash);
  }
});

it('the map already links Module 0 to the canonical hash', () => {
  expect(moduleHref(SETUP_MODULE_ID)).toBe(SETUP_ROUTE);
  expect(canonicalHash(moduleHref(SETUP_MODULE_ID))).toBe(SETUP_ROUTE);
});

it('Module 0 has nothing for ModuleView to render — the reason it has no module route', () => {
  const m0 = findModule(curriculum, SETUP_MODULE_ID)!;
  // ModuleView renders a "Worked examples" and an "Exercises" heading
  // unconditionally, so on Module 0 both would head an empty section.
  expect(m0.concept.examples).toHaveLength(0);
  expect(m0.exercises).toHaveLength(0);
  // The checkpoint still exists — SetupGuide renders it inline at the end of
  // the guide, which is the only way to reach it.
  expect(m0.exitExercise.id).toBeTruthy();
});

it('every concept module still routes to ModuleView, its exercises and its exit', () => {
  for (const module of modules.filter((candidate) => candidate.id !== SETUP_MODULE_ID)) {
    expect(route(`#/module/${module.id}`)).toEqual({
      screen: 'module',
      moduleId: module.id,
      exerciseId: undefined,
      isExit: false,
    });
    expect(route(`#/module/${module.id}/exit`)).toEqual({
      screen: 'module',
      moduleId: module.id,
      exerciseId: module.exitExercise.id,
      isExit: true,
    });
    for (const exercise of module.exercises) {
      expect(route(`#/module/${module.id}/exercise/${exercise.id}`)).toEqual({
        screen: 'module',
        moduleId: module.id,
        exerciseId: exercise.id,
        isExit: false,
      });
    }
  }
});

it('the map, shelf, settings and unrecognised hashes are unchanged', () => {
  expect(route('#/')).toEqual({ screen: 'home' });
  expect(route('#/shelf')).toEqual({ screen: 'shelf' });
  expect(route('#/settings')).toEqual({ screen: 'settings' });
  expect(route('#/nonsense/route')).toEqual({ screen: 'home' });
});

it('an unknown module id resolves to the map, exactly like an unrecognised hash', () => {
  for (const hash of [
    '#/module/bogus',
    '#/module/m99',
    '#/module/M1', // ids are exact — no case-insensitive match
    '#/module/bogus/exit',
    '#/module/bogus/exercise/e1',
  ]) {
    expect(route(hash)).toEqual({ screen: 'home' });
  }
});

it('an unknown exercise id inside a real module resolves to the map too', () => {
  for (const hash of [
    '#/module/m1/exercise/nope',
    '#/module/m1/exercise/e9',
    '#/module/m1/exercise/exit', // the exit checkpoint is /exit, not an exercise id
    '#/module/m12/exercise/nope',
  ]) {
    expect(route(hash)).toEqual({ screen: 'home' });
  }
  // Module 0's own bogus exercise hash is the setup screen (#41), which is a
  // real screen with a way on — not a dead end either.
  expect(route(`#/module/${SETUP_MODULE_ID}/exercise/nope`)).toEqual({ screen: 'setup' });
});

it('a module route always carries content that exists — no screen can render "Unknown …"', () => {
  const hashes = [
    '#/',
    '#/shelf',
    '#/settings',
    SETUP_ROUTE,
    '#/nonsense/route',
    '#/module/',
    '#/module/bogus',
    '#/module/m1/exercise/nope',
    ...M0_HASHES,
    ...modules.flatMap((module) => [
      `#/module/${module.id}`,
      `#/module/${module.id}/exit`,
      ...module.exercises.map((exercise) => `#/module/${module.id}/exercise/${exercise.id}`),
    ]),
  ];
  for (const hash of hashes) {
    const resolved = routeFromHash(hash, curriculum);
    if (resolved.screen === 'module') {
      expect(findModule(curriculum, resolved.module.id)).toBeDefined();
      if (resolved.exercise) {
        const known = [...resolved.module.exercises, resolved.module.exitExercise];
        expect(known.map((exercise) => exercise.id)).toContain(resolved.exercise.id);
      }
    }
    if (resolved.screen === 'setup') {
      expect(resolved.module.id).toBe(SETUP_MODULE_ID);
    }
  }
});

it('locked modules stay unreachable: the router resolves them, the §6 guard refuses them', () => {
  // The fallback for a *locked* module is App's gating guard, not the router —
  // this fix must not turn a locked module into a home route and hide that.
  const fresh = emptyProgress();
  for (const moduleId of ['m1', 'm2', 'm5']) {
    expect(moduleUnlocked(curriculum, moduleId, fresh)).toBe(false);
    for (const hash of [
      `#/module/${moduleId}`,
      `#/module/${moduleId}/exit`,
      `#/module/${moduleId}/exercise/e1`,
    ]) {
      expect(route(hash).screen).toBe('module');
      expect(route(hash).moduleId).toBe(moduleId);
    }
  }
});
