// Routing contract for src/App.tsx — which hash resolves to which screen, and
// which hash the address bar is allowed to sit on.
//
// Module 0 is the setup guide: it has no concept doc and no formative
// exercises, so it has no ModuleView route. Every `#/module/m0…` hash resolves
// to the setup screen and is rewritten to `#/setup` (issue #41).
import { expect, it } from 'vitest';
import { canonicalHash, routeFromHash } from './App';
import { findModule, loadCurriculum } from './content/load';
import { flatModules } from './content/load';
import { moduleHref, SETUP_MODULE_ID, SETUP_ROUTE } from './HomeMap';

const curriculum = loadCurriculum();

const M0_HASHES = [
  `#/module/${SETUP_MODULE_ID}`,
  `#/module/${SETUP_MODULE_ID}/exit`,
  `#/module/${SETUP_MODULE_ID}/exercise/exit`,
  `#/module/${SETUP_MODULE_ID}/exercise/e1`,
];

it('every #/module/m0 hash resolves to the setup screen, never ModuleView', () => {
  for (const hash of M0_HASHES) {
    expect(routeFromHash(hash)).toEqual({ screen: 'setup' });
  }
  expect(routeFromHash(SETUP_ROUTE)).toEqual({ screen: 'setup' });
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
  for (const module of flatModules(curriculum).filter((m) => m.id !== SETUP_MODULE_ID)) {
    expect(routeFromHash(`#/module/${module.id}`)).toEqual({
      screen: 'module',
      moduleId: module.id,
      exerciseId: undefined,
      isExit: false,
    });
    expect(routeFromHash(`#/module/${module.id}/exit`)).toEqual({
      screen: 'module',
      moduleId: module.id,
      exerciseId: undefined,
      isExit: true,
    });
    for (const exercise of module.exercises) {
      expect(routeFromHash(`#/module/${module.id}/exercise/${exercise.id}`)).toEqual({
        screen: 'module',
        moduleId: module.id,
        exerciseId: exercise.id,
        isExit: false,
      });
    }
  }
});

it('the map, shelf, settings and unrecognised hashes are unchanged', () => {
  expect(routeFromHash('#/')).toEqual({ screen: 'home' });
  expect(routeFromHash('#/shelf')).toEqual({ screen: 'shelf' });
  expect(routeFromHash('#/settings')).toEqual({ screen: 'settings' });
  expect(routeFromHash('#/nonsense/route')).toEqual({ screen: 'home' });
});
