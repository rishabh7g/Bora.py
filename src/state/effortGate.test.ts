// Unit tests for the effort-gate owner module — every ENGINEERING.md §5
// transition, plus the prototype-settled edge cases.
import { describe, expect, it } from 'vitest';
import {
  cardCracksOf,
  declareAttempt,
  declareMatch,
  gateStateOf,
  initialExerciseState,
  isSolutionVisible,
  modulePassed,
  revealSolution,
  viewHint,
  type ExerciseState,
} from './effortGate';

const F = false; // formative (not exit)

function climbTo(target: 'HINT1_AVAILABLE' | 'HINT1_SEEN' | 'HINT2_AVAILABLE' | 'HINT2_SEEN' | 'SOLUTION_AVAILABLE' | 'SOLUTION_REVEALED'): ExerciseState {
  let s = initialExerciseState();
  s = declareAttempt(s, F); // HINT1_AVAILABLE
  if (target === 'HINT1_AVAILABLE') return s;
  s = viewHint(s, 1, F); // HINT1_SEEN
  if (target === 'HINT1_SEEN') return s;
  s = declareAttempt(s, F); // HINT2_AVAILABLE
  if (target === 'HINT2_AVAILABLE') return s;
  s = viewHint(s, 2, F); // HINT2_SEEN
  if (target === 'HINT2_SEEN') return s;
  s = declareAttempt(s, F); // SOLUTION_AVAILABLE
  if (target === 'SOLUTION_AVAILABLE') return s;
  return revealSolution(s, F); // SOLUTION_REVEALED
}

describe('the §5 ladder, transition by transition', () => {
  it('starts at LOCKED_HINTS', () => {
    expect(gateStateOf(initialExerciseState(), F)).toBe('LOCKED_HINTS');
  });

  it('LOCKED_HINTS —"tried & stuck" (attempts=1)→ HINT1_AVAILABLE', () => {
    const s = declareAttempt(initialExerciseState(), F);
    expect(s.attempts).toBe(1);
    expect(gateStateOf(s, F)).toBe('HINT1_AVAILABLE');
  });

  it('HINT1_AVAILABLE —view hint1→ HINT1_SEEN', () => {
    const s = viewHint(climbTo('HINT1_AVAILABLE'), 1, F);
    expect(s.hintsUnlocked).toBe(1);
    expect(gateStateOf(s, F)).toBe('HINT1_SEEN');
  });

  it('HINT1_SEEN —"tried & stuck" (attempts=2)→ HINT2_AVAILABLE', () => {
    const s = declareAttempt(climbTo('HINT1_SEEN'), F);
    expect(s.attempts).toBe(2);
    expect(gateStateOf(s, F)).toBe('HINT2_AVAILABLE');
  });

  it('HINT2_AVAILABLE —view hint2→ HINT2_SEEN', () => {
    const s = viewHint(climbTo('HINT2_AVAILABLE'), 2, F);
    expect(s.hintsUnlocked).toBe(2);
    expect(gateStateOf(s, F)).toBe('HINT2_SEEN');
  });

  it('HINT2_SEEN —"tried & stuck" (attempts=3)→ SOLUTION_AVAILABLE', () => {
    const s = declareAttempt(climbTo('HINT2_SEEN'), F);
    expect(s.attempts).toBe(3);
    expect(gateStateOf(s, F)).toBe('SOLUTION_AVAILABLE');
  });

  it('SOLUTION_AVAILABLE —reveal→ SOLUTION_REVEALED, solution visible', () => {
    const s = revealSolution(climbTo('SOLUTION_AVAILABLE'), F);
    expect(s.solutionRevealed).toBe(true);
    expect(gateStateOf(s, F)).toBe('SOLUTION_REVEALED');
    expect(isSolutionVisible(s)).toBe(true);
  });

  it('MATCHED is reachable from ANY state and reveals solution + checklist', () => {
    const everyState: ExerciseState[] = [
      initialExerciseState(),
      climbTo('HINT1_AVAILABLE'),
      climbTo('HINT1_SEEN'),
      climbTo('HINT2_AVAILABLE'),
      climbTo('HINT2_SEEN'),
      climbTo('SOLUTION_AVAILABLE'),
      climbTo('SOLUTION_REVEALED'),
    ];
    for (const state of everyState) {
      const s = declareMatch(state);
      expect(gateStateOf(s, F)).toBe('MATCHED');
      expect(isSolutionVisible(s)).toBe(true);
    }
  });
});

describe('rule: solution only via MATCHED or 3 declared attempts', () => {
  it('reveal is a no-op below the top of the ladder', () => {
    for (const rung of ['HINT1_AVAILABLE', 'HINT1_SEEN', 'HINT2_AVAILABLE', 'HINT2_SEEN'] as const) {
      const s = climbTo(rung);
      expect(revealSolution(s, F)).toBe(s); // unchanged — illegal transition
      expect(isSolutionVisible(revealSolution(s, F))).toBe(false);
    }
    const fresh = initialExerciseState();
    expect(revealSolution(fresh, F)).toBe(fresh);
  });

  it('reaching SOLUTION_AVAILABLE always took at least 3 attempts', () => {
    expect(climbTo('SOLUTION_AVAILABLE').attempts).toBeGreaterThanOrEqual(3);
  });
});

describe('rule: each hint unlock requires a declared attempt in between', () => {
  it('hints are locked before any attempt', () => {
    const fresh = initialExerciseState();
    expect(viewHint(fresh, 1, F)).toBe(fresh);
    expect(viewHint(fresh, 2, F)).toBe(fresh);
  });

  it('hint 2 stays locked right after viewing hint 1', () => {
    const s = climbTo('HINT1_SEEN');
    expect(viewHint(s, 2, F)).toBe(s);
  });

  it('attempts banked before a hint view do NOT carry to the next rung (prototype rule)', () => {
    let s = initialExerciseState();
    s = declareAttempt(s, F);
    s = declareAttempt(s, F); // two attempts banked
    s = viewHint(s, 1, F); // viewing consumes the declaration
    expect(gateStateOf(s, F)).toBe('HINT1_SEEN'); // NOT HINT2_AVAILABLE
    expect(viewHint(s, 2, F)).toBe(s);
  });

  it('viewing a rung out of order is a no-op', () => {
    const s = climbTo('HINT2_AVAILABLE');
    expect(viewHint(s, 1, F)).toBe(s); // hint 1 already seen
  });
});

describe('exit exercises: no ladder — only MATCHED or come back later', () => {
  const EXIT = true;

  it('is EXIT_OPEN until matched, MATCHED after', () => {
    const s = initialExerciseState();
    expect(gateStateOf(s, EXIT)).toBe('EXIT_OPEN');
    expect(gateStateOf(declareMatch(s), EXIT)).toBe('MATCHED');
  });

  it('ladder transitions are all no-ops on an exit exercise', () => {
    const s = initialExerciseState();
    expect(declareAttempt(s, EXIT)).toBe(s);
    expect(viewHint(s, 1, EXIT)).toBe(s);
    expect(viewHint(s, 2, EXIT)).toBe(s);
    expect(revealSolution(s, EXIT)).toBe(s);
  });

  it('never blocked forever: state persists as EXIT_OPEN, matchable any time', () => {
    const leftAndReturned = initialExerciseState(); // leaving changes nothing
    expect(gateStateOf(leftAndReturned, EXIT)).toBe('EXIT_OPEN');
    expect(gateStateOf(declareMatch(leftAndReturned), EXIT)).toBe('MATCHED');
  });

  it('matching the exit exercise passes the module', () => {
    expect(modulePassed(initialExerciseState())).toBe(false);
    expect(modulePassed(declareMatch(initialExerciseState()))).toBe(true);
  });
});

describe('cracks: one per hint viewed, visual only', () => {
  it('sums hintsUnlocked across a module', () => {
    expect(cardCracksOf({})).toBe(0);
    expect(
      cardCracksOf({
        e1: climbTo('HINT1_SEEN'), // 1 hint
        e2: climbTo('HINT2_SEEN'), // 2 hints
        e3: initialExerciseState(), // 0 hints
      }),
    ).toBe(3);
  });

  it('matching never adds cracks', () => {
    expect(cardCracksOf({ e1: declareMatch(initialExerciseState()) })).toBe(0);
  });
});

describe('idempotence / safety', () => {
  it('declareAttempt after match is a no-op', () => {
    const s = declareMatch(initialExerciseState());
    expect(declareAttempt(s, F)).toBe(s);
  });

  it('declareMatch is idempotent', () => {
    const s = declareMatch(initialExerciseState());
    expect(declareMatch(s)).toBe(s);
  });
});
