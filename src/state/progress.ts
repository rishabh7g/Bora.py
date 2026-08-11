// Progress state + persistence — ENGINEERING.md §4.
// Write-through to IndexedDB (idb-keyval) on every state change.
import { get, set } from 'idb-keyval';
import { cardCracksOf, initialExerciseState, modulePassed, type ExerciseState } from './effortGate';

export type Progress = {
  version: 1;
  modules: Record<string, ModuleProgress>;
};

export type ModuleProgress = {
  exercises: Record<string, ExerciseState>;
  passed: boolean; // exit exercise matched
  cardCracks: number; // total hints used in module
};

export const PROGRESS_KEY = 'bora-py-progress';

export function emptyProgress(): Progress {
  return { version: 1, modules: {} };
}

export function exerciseStateOf(progress: Progress, moduleId: string, exerciseId: string): ExerciseState {
  return progress.modules[moduleId]?.exercises[exerciseId] ?? initialExerciseState();
}

/** Cracks on a module's photocard: the hints used in that module, already
 *  computed and persisted here. Screens read this — they never recount hints. */
export function moduleCracksOf(progress: Progress, moduleId: string): number {
  return progress.modules[moduleId]?.cardCracks ?? 0;
}

/** Pure update: apply an effort-gate transition to one exercise and recompute
 *  the module's derived fields (cardCracks, passed) from the owner module's
 *  rules. Returns the same object when the transition was a no-op. */
export function updateExerciseState(
  progress: Progress,
  moduleId: string,
  exerciseId: string,
  isExit: boolean,
  transition: (state: ExerciseState) => ExerciseState,
): Progress {
  const before = exerciseStateOf(progress, moduleId, exerciseId);
  const after = transition(before);
  if (after === before) return progress;

  const module = progress.modules[moduleId] ?? { exercises: {}, passed: false, cardCracks: 0 };
  const exercises = { ...module.exercises, [exerciseId]: after };
  return {
    ...progress,
    modules: {
      ...progress.modules,
      [moduleId]: {
        exercises,
        passed: module.passed || (isExit && modulePassed(after)),
        cardCracks: cardCracksOf(exercises),
      },
    },
  };
}

export async function loadProgress(): Promise<Progress> {
  try {
    const stored = await get<Progress>(PROGRESS_KEY);
    if (stored && stored.version === 1) return stored;
  } catch {
    // No IndexedDB / corrupt store: start fresh rather than crash.
  }
  return emptyProgress();
}

export async function saveProgress(progress: Progress): Promise<void> {
  try {
    await set(PROGRESS_KEY, progress);
  } catch {
    // Storage unavailable — in-memory state still works for the session.
  }
}
