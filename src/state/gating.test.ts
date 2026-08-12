// Unit tests for the module-gating owner (ENGINEERING.md §6): the exit-unlock
// rule, the module N+1 unlock chain, and the Tier 5 capstone unlock.
import { describe, expect, it } from 'vitest';
import type { Curriculum, Exercise, Module } from '../content/types';
import {
  declareAttempt,
  declareMatch,
  revealSolution,
  viewHint,
  type ExerciseState,
} from './effortGate';
import { currentModule, exitUnlocked, moduleStateOf, moduleUnlocked, tier5Unlocked } from './gating';
import { emptyProgress, resetModule, updateExerciseState, type Progress } from './progress';

function makeExercise(id: string, isExit = false): Exercise {
  return {
    id,
    prompt: '',
    expectedOutput: '',
    hints: ['', ''],
    solution: '',
    approachChecklist: [],
    ...(isExit ? { isExit: true } : {}),
  };
}

function makeModule(id: string): Module {
  return {
    id,
    title: id,
    anchor: '',
    concept: { intro: '', examples: [] },
    exercises: [makeExercise('e1'), makeExercise('e2')],
    exitExercise: makeExercise('exit', true),
    photocard: { id: `${id}-card`, title: '', art: '' },
  };
}

// Same shape as the real curriculum: ordered tiers, ordered modules, the
// capstone is the last module of the last tier.
const m0 = makeModule('m0');
const m1 = makeModule('m1');
const m2 = makeModule('m2');
const m12 = makeModule('m12');
const curriculum: Curriculum = {
  tiers: [
    { id: 't0', title: 'Tier 0 — Setup', era: 'Debut, 2013', modules: [m0] },
    { id: 't1', title: 'Tier 1 — Basics', era: 'School trilogy era', modules: [m1, m2] },
    { id: 't4', title: 'Tier 4 — Capstone', era: 'Proof era', modules: [m12] },
  ],
};

function match(progress: Progress, moduleId: string, exerciseId: string): Progress {
  return updateExerciseState(progress, moduleId, exerciseId, false, declareMatch);
}

/** Pass a module the real way: its exit exercise gets matched. */
function passModule(progress: Progress, moduleId: string): Progress {
  return updateExerciseState(progress, moduleId, 'exit', true, declareMatch);
}

/** Reveal a formative's solution the real way: the full §5 ladder. */
function revealViaLadder(progress: Progress, moduleId: string, exerciseId: string): Progress {
  const ladder: Array<(state: ExerciseState) => ExerciseState> = [
    (s) => declareAttempt(s, false),
    (s) => viewHint(s, 1, false),
    (s) => declareAttempt(s, false),
    (s) => viewHint(s, 2, false),
    (s) => declareAttempt(s, false),
    (s) => revealSolution(s, false),
  ];
  return ladder.reduce(
    (acc, transition) => updateExerciseState(acc, moduleId, exerciseId, false, transition),
    progress,
  );
}

describe('exitUnlocked — exit locked until every formative is matched || solutionRevealed', () => {
  it('is locked with no progress', () => {
    expect(exitUnlocked(m1, emptyProgress())).toBe(false);
  });

  it('attempts and hints alone do NOT count as engagement', () => {
    let p = updateExerciseState(emptyProgress(), 'm1', 'e1', false, (s) =>
      declareAttempt(s, false),
    );
    p = updateExerciseState(p, 'm1', 'e1', false, (s) => viewHint(s, 1, false));
    p = match(p, 'm1', 'e2');
    expect(exitUnlocked(m1, p)).toBe(false);
  });

  it('stays locked while any formative is untouched', () => {
    const p = match(emptyProgress(), 'm1', 'e1');
    expect(exitUnlocked(m1, p)).toBe(false);
  });

  it('unlocks when every formative is matched', () => {
    const p = match(match(emptyProgress(), 'm1', 'e1'), 'm1', 'e2');
    expect(exitUnlocked(m1, p)).toBe(true);
  });

  it('a revealed solution counts as engagement — no dead ends', () => {
    const p = revealViaLadder(match(emptyProgress(), 'm1', 'e1'), 'm1', 'e2');
    expect(exitUnlocked(m1, p)).toBe(true);
  });
});

describe('moduleUnlocked — module N+1 unlocks when module N passed', () => {
  it('the first module is always unlocked', () => {
    expect(moduleUnlocked(curriculum, 'm0', emptyProgress())).toBe(true);
  });

  it('later modules start locked', () => {
    expect(moduleUnlocked(curriculum, 'm1', emptyProgress())).toBe(false);
    expect(moduleUnlocked(curriculum, 'm2', emptyProgress())).toBe(false);
  });

  it('passing module N unlocks exactly module N+1', () => {
    const p = passModule(emptyProgress(), 'm0');
    expect(moduleUnlocked(curriculum, 'm1', p)).toBe(true);
    expect(moduleUnlocked(curriculum, 'm2', p)).toBe(false);
  });

  it('matching only formatives does not pass a module — the exit does', () => {
    const p = match(match(emptyProgress(), 'm0', 'e1'), 'm0', 'e2');
    expect(moduleUnlocked(curriculum, 'm1', p)).toBe(false);
  });

  it('the chain crosses tier boundaries in curriculum order', () => {
    const p = passModule(emptyProgress(), 'm2');
    expect(moduleUnlocked(curriculum, 'm12', p)).toBe(true);
  });

  it('an unknown module id is never unlocked', () => {
    expect(moduleUnlocked(curriculum, 'nope', emptyProgress())).toBe(false);
  });

  // Regression: issue #40. Unlocking is one-way — a checkpoint she cleared
  // stays open whatever happens to the module in front of it.
  it('a passed module stays unlocked when the module before it is reset', () => {
    let p = emptyProgress();
    for (const id of ['m0', 'm1', 'm2']) p = passModule(p, id);
    const afterReset = resetModule(p, 'm1');

    expect(moduleUnlocked(curriculum, 'm2', afterReset)).toBe(true);
    expect(moduleStateOf(curriculum, 'm2', afterReset)).toBe('passed');
    // The reset module itself is handed back, still open behind m0's pass.
    expect(moduleStateOf(curriculum, 'm1', afterReset)).toBe('available');
    expect(currentModule(curriculum, afterReset)?.id).toBe('m1');
  });

  it('resetting a module leaves a never-passed follower locked', () => {
    const p = resetModule(passModule(emptyProgress(), 'm1'), 'm1');
    expect(moduleUnlocked(curriculum, 'm2', p)).toBe(false);
    expect(moduleStateOf(curriculum, 'm2', p)).toBe('locked');
  });

  // The affordance invariant the screens rely on: `'locked'` is exactly
  // `!moduleUnlocked`, so a rendered link is never a route the guard refuses.
  it("'locked' and !moduleUnlocked agree for every module in every state", () => {
    const states: Progress[] = [emptyProgress()];
    let built = emptyProgress();
    for (const id of ['m0', 'm1', 'm2', 'm12']) {
      built = passModule(built, id);
      states.push(built);
      for (const resetId of ['m0', 'm1', 'm2', 'm12']) states.push(resetModule(built, resetId));
    }
    for (const p of states) {
      for (const id of ['m0', 'm1', 'm2', 'm12']) {
        expect(moduleStateOf(curriculum, id, p) === 'locked').toBe(
          !moduleUnlocked(curriculum, id, p),
        );
      }
    }
  });
});

describe('tier5Unlocked — Tier 5 (Advanced) unlocks on capstone pass', () => {
  it('is locked with no progress', () => {
    expect(tier5Unlocked(curriculum, emptyProgress())).toBe(false);
  });

  it('earlier passes do not unlock it', () => {
    let p = passModule(emptyProgress(), 'm0');
    p = passModule(p, 'm1');
    p = passModule(p, 'm2');
    expect(tier5Unlocked(curriculum, p)).toBe(false);
  });

  it('unlocks when the capstone passes', () => {
    expect(tier5Unlocked(curriculum, passModule(emptyProgress(), 'm12'))).toBe(true);
  });
});

describe('moduleStateOf — the three Home-map states', () => {
  it('is available for the first module and locked for the rest', () => {
    const p = emptyProgress();
    expect(moduleStateOf(curriculum, 'm0', p)).toBe('available');
    expect(moduleStateOf(curriculum, 'm1', p)).toBe('locked');
    expect(moduleStateOf(curriculum, 'm12', p)).toBe('locked');
  });

  it('turns passed, and opens the next module only', () => {
    const p = passModule(emptyProgress(), 'm0');
    expect(moduleStateOf(curriculum, 'm0', p)).toBe('passed');
    expect(moduleStateOf(curriculum, 'm1', p)).toBe('available');
    expect(moduleStateOf(curriculum, 'm2', p)).toBe('locked');
  });

  it('an unknown module id is locked', () => {
    expect(moduleStateOf(curriculum, 'nope', emptyProgress())).toBe('locked');
  });
});

describe('currentModule — the checkpoint she is on', () => {
  it('starts at the first module', () => {
    expect(currentModule(curriculum, emptyProgress())?.id).toBe('m0');
  });

  it('advances to the first unlocked module that is not passed', () => {
    const p = passModule(passModule(emptyProgress(), 'm0'), 'm1');
    expect(currentModule(curriculum, p)?.id).toBe('m2');
  });

  it('is undefined once every module has passed', () => {
    let p = emptyProgress();
    for (const id of ['m0', 'm1', 'm2', 'm12']) p = passModule(p, id);
    expect(currentModule(curriculum, p)).toBeUndefined();
  });
});
