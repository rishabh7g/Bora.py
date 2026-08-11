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
import { exitUnlocked, moduleUnlocked, tier5Unlocked } from './gating';
import { emptyProgress, updateExerciseState, type Progress } from './progress';

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
    { id: 't0', title: 'Tier 0 — Setup', modules: [m0] },
    { id: 't1', title: 'Tier 1 — Basics', modules: [m1, m2] },
    { id: 't4', title: 'Tier 4 — Capstone', modules: [m12] },
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
