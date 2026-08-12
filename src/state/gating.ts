// Module gating — ENGINEERING.md §6. This is the ONE owner of every
// module-level gating rule. Screens (ModuleView now, HomeMap later) consume
// these functions; nothing else may reimplement a rule from here.
//
// Rules carried here:
// - Within a module: the exit exercise unlocks when every formative exercise
//   is matched || solutionRevealed. A revealed solution still counts as
//   engagement — no dead ends.
// - Module N+1 unlocks when Module N `passed === true` (curriculum order,
//   flat across tiers). The first module is always unlocked. A module she has
//   already passed stays unlocked whatever happens in front of it — access is
//   never taken back (no decay, no guilt).
// - Tier 5 (Advanced) unlocks on capstone pass. The capstone is the last
//   module of the curriculum (Tier 4).
import { flatModules } from '../content/load';
import type { Curriculum, Module } from '../content/types';
import { isSolutionVisible } from './effortGate';
import { exerciseStateOf, type Progress } from './progress';

/** §6 exit lock: unlocked when every formative exercise is engaged.
 *  "Engaged" is exactly `matched || solutionRevealed` — the same predicate
 *  that governs solution visibility, so it is consumed from the effort-gate
 *  owner (effortGate.isSolutionVisible), never restated. */
export function exitUnlocked(module: Module, progress: Progress): boolean {
  return module.exercises.every((exercise) =>
    isSolutionVisible(exerciseStateOf(progress, module.id, exercise.id)),
  );
}

function passedOf(progress: Progress, moduleId: string): boolean {
  return progress.modules[moduleId]?.passed ?? false;
}

/** §6 unlock chain: Module N+1 unlocks when Module N passed — plus the
 *  monotonic half of the rule, a module she has already passed is unlocked by
 *  her own pass. Unlocking is one-way: resetting Module 01 hands Module 01 back
 *  to her without shutting the door on the checkpoints she already cleared, so
 *  their concept docs stay readable and their earned photocards keep opening
 *  them (PhotocardShelf). The chain is untouched for a module never passed:
 *  that one is locked until the module before it passes. */
export function moduleUnlocked(
  curriculum: Curriculum,
  moduleId: string,
  progress: Progress,
): boolean {
  const sequence = flatModules(curriculum);
  const index = sequence.findIndex((module) => module.id === moduleId);
  if (index < 0) return false;
  if (passedOf(progress, moduleId)) return true;
  if (index === 0) return true;
  return passedOf(progress, sequence[index - 1].id);
}

/** The three states a module can be in on the Home map. Screens render these;
 *  they never recombine `moduleUnlocked` and `passed` themselves.
 *
 *  `'locked'` is exactly `!moduleUnlocked`, which is what keeps the affordance
 *  honest: a screen that renders `'locked'` as plain text and every other state
 *  as a link cannot offer a link the route guard would refuse. */
export type ModuleState = 'locked' | 'available' | 'passed';

export function moduleStateOf(
  curriculum: Curriculum,
  moduleId: string,
  progress: Progress,
): ModuleState {
  if (passedOf(progress, moduleId)) return 'passed';
  return moduleUnlocked(curriculum, moduleId, progress) ? 'available' : 'locked';
}

/** The checkpoint she is on: the first module that is unlocked and not yet
 *  passed. Undefined only when every module has passed. */
export function currentModule(curriculum: Curriculum, progress: Progress): Module | undefined {
  return flatModules(curriculum).find(
    (module) => moduleStateOf(curriculum, module.id, progress) === 'available',
  );
}

/** §6: Tier 5 (Advanced) unlocks on capstone pass — the curriculum's last
 *  module. Consumed by HomeMap when the Advanced tier gets content. */
export function tier5Unlocked(curriculum: Curriculum, progress: Progress): boolean {
  const sequence = flatModules(curriculum);
  const capstone = sequence[sequence.length - 1];
  return capstone ? passedOf(progress, capstone.id) : false;
}
