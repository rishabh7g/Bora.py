// The effort gate — ENGINEERING.md §5, behavior settled by the prototype.
// This is the ONE owner of every gating rule. UI and persistence consume
// these functions; nothing else may reimplement a rule from here.
//
//   LOCKED_HINTS ──"I tried & stuck" (attempts=1)──▶ HINT1_AVAILABLE
//   HINT1_AVAILABLE ──view hint1──▶ HINT1_SEEN
//   HINT1_SEEN ──"tried & stuck" (attempts=2)──▶ HINT2_AVAILABLE
//   HINT2_AVAILABLE ──view hint2──▶ HINT2_SEEN
//   HINT2_SEEN ──"tried & stuck" (attempts=3)──▶ SOLUTION_AVAILABLE
//   ANY_STATE ──"My output matches"──▶ MATCHED (solution + checklist revealed)
//
// Rules carried here:
// - Solution is reachable only via MATCHED or the full ladder (3 declared
//   attempts minimum).
// - Each hint unlock requires a declared attempt in between. The prototype
//   settles the edge case: attempts banked BEFORE viewing a hint do not carry
//   over to the next rung — viewing a hint consumes the "stuck" declaration.
//   That is why `stuck` is persisted alongside the ENGINEERING.md §4 fields.
// - Exit exercises: no ladder; only MATCHED or "come back later" (leave —
//   state persists, never blocked forever).
// - Each hint viewed adds one crack to the module's photocard (visual only).
// - Trust-based: declaring a match is never verified. No friction.

// ENGINEERING.md §4 ExerciseState + `stuck` (see note above).
export type ExerciseState = {
  attempts: number; // "I tried and got stuck" count
  hintsUnlocked: 0 | 1 | 2; // hints actually viewed
  matched: boolean; // learner declared output match
  solutionRevealed: boolean;
  stuck: boolean; // a declared attempt not yet "spent" on a hint/solution reveal
};

export type GateState =
  | 'LOCKED_HINTS'
  | 'HINT1_AVAILABLE'
  | 'HINT1_SEEN'
  | 'HINT2_AVAILABLE'
  | 'HINT2_SEEN'
  | 'SOLUTION_AVAILABLE'
  | 'SOLUTION_REVEALED'
  | 'MATCHED'
  | 'EXIT_OPEN'; // exit exercises: the only non-MATCHED state

export function initialExerciseState(): ExerciseState {
  return { attempts: 0, hintsUnlocked: 0, matched: false, solutionRevealed: false, stuck: false };
}

/** The single source of truth for "where is this exercise in the ladder". */
export function gateStateOf(state: ExerciseState, isExit: boolean): GateState {
  if (state.matched) return 'MATCHED';
  if (isExit) return 'EXIT_OPEN';
  if (state.solutionRevealed) return 'SOLUTION_REVEALED';
  switch (state.hintsUnlocked) {
    case 0:
      return state.stuck ? 'HINT1_AVAILABLE' : 'LOCKED_HINTS';
    case 1:
      return state.stuck ? 'HINT2_AVAILABLE' : 'HINT1_SEEN';
    case 2:
      return state.stuck ? 'SOLUTION_AVAILABLE' : 'HINT2_SEEN';
  }
}

/** "I tried and got stuck" — unlocks the next rung. No ladder on exits. */
export function declareAttempt(state: ExerciseState, isExit: boolean): ExerciseState {
  if (state.matched || isExit) return state;
  return { ...state, attempts: state.attempts + 1, stuck: true };
}

/** View hint 1 or 2. Legal only when that exact rung is available. */
export function viewHint(state: ExerciseState, hint: 1 | 2, isExit: boolean): ExerciseState {
  const gate = gateStateOf(state, isExit);
  const legal = (hint === 1 && gate === 'HINT1_AVAILABLE') || (hint === 2 && gate === 'HINT2_AVAILABLE');
  if (!legal) return state;
  return { ...state, hintsUnlocked: hint, stuck: false };
}

/** Reveal the solution. Legal only at the top of the ladder. */
export function revealSolution(state: ExerciseState, isExit: boolean): ExerciseState {
  if (gateStateOf(state, isExit) !== 'SOLUTION_AVAILABLE') return state;
  return { ...state, solutionRevealed: true, stuck: false };
}

/** "My output matches" — legal from ANY state, trust-based, never verified.
 *  Matching also reveals the solution + approach checklist. */
export function declareMatch(state: ExerciseState): ExerciseState {
  if (state.matched) return state;
  return { ...state, matched: true, solutionRevealed: true, stuck: false };
}

/** Solution + approach checklist are visible only after match or full ladder. */
export function isSolutionVisible(state: ExerciseState): boolean {
  return state.matched || state.solutionRevealed;
}

/** Photocard cracks for a module: one per hint viewed, summed. Visual only. */
export function cardCracksOf(exercises: Record<string, ExerciseState>): number {
  return Object.values(exercises).reduce((total, state) => total + state.hintsUnlocked, 0);
}

/** A module is passed when its exit exercise is matched (ENGINEERING.md §4/§6). */
export function modulePassed(exitState: ExerciseState): boolean {
  return exitState.matched;
}
