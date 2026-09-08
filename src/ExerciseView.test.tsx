// ExerciseView render contract — the UI consumes the effort gate, and the
// trust-based rules show up in the markup (no copy button, hidden solution,
// exit variant without a ladder). The screen is one card: two buttons, the
// second being whatever the gate allows next, and revealed hints as text.
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ExerciseView, { nextActionOf } from './ExerciseView';
import { findModule, loadCurriculum } from './content/load';
import {
  cardCracksOf,
  declareAttempt,
  declareMatch,
  gateStateOf,
  initialExerciseState,
  revealSolution,
  viewHint,
} from './state/effortGate';

const m1 = findModule(loadCurriculum(), 'm1')!;
const exercise = m1.exercises[0];
const noop = () => {};

function render(state = initialExerciseState(), isExit = false) {
  return renderToString(
    <ExerciseView
      module={m1}
      moduleNumber="01"
      exercise={isExit ? m1.exitExercise : exercise}
      isExit={isExit}
      state={state}
      onTransition={noop}
    />,
  );
}

const esc = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const buttons = (html: string) =>
  [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);

// SOLUTION_REVEALED — hint 1, hint 2 and the solution all spent.
function ladderSpent() {
  let s = initialExerciseState();
  for (const hint of [1, 2] as const) s = viewHint(declareAttempt(s, false), hint, false);
  return revealSolution(declareAttempt(s, false), false);
}

it('shows prompt and expected output, with NO copy button (trust-based)', () => {
  const html = render();
  expect(html).toContain('EXPECTED OUTPUT');
  expect(html).toContain(exercise.expectedOutput);
  expect(html).toContain('Show whitespace');
  expect(html.toLowerCase()).not.toContain('copy');
});

it('names the module once — in the back link — and the exercise in the kicker', () => {
  const html = render();
  expect(html).toContain('← Module 01');
  expect(html).toContain('Exercise 1 of 3');
  expect(html.match(/Variables \+ print/g) ?? []).toHaveLength(0);
});

it('fresh: two buttons, no hints, no solution, and no rule narrated', () => {
  const html = render();
  expect(buttons(html)).toEqual(['My output matches', 'I tried and got stuck']);
  expect(html).not.toContain('Model solution');
  expect(html).not.toContain(exercise.hints[0]);
  expect(html).not.toMatch(/Locked|attempts? declared|unlock/);
  expect(html).not.toContain('Hint ladder');
});

it('the second button is the next legal move, one state at a time', () => {
  let s = initialExerciseState();
  expect(buttons(render(s))[1]).toBe('I tried and got stuck');
  s = declareAttempt(s, false);
  expect(buttons(render(s))[1]).toBe('Reveal hint 1 — cracks the card');
  s = viewHint(s, 1, false);
  expect(buttons(render(s))[1]).toBe('I tried and got stuck');
  s = declareAttempt(s, false);
  expect(buttons(render(s))[1]).toBe('Reveal hint 2 — cracks the card');
  s = viewHint(s, 2, false);
  expect(buttons(render(s))[1]).toBe('I tried and got stuck');
  s = declareAttempt(s, false);
  expect(buttons(render(s))[1]).toBe('Reveal solution');
  // #43: at the top of the ladder nothing is offered but the match.
  s = revealSolution(s, false);
  expect(buttons(render(s))).toEqual(['My output matches']);
});

it('nextActionOf covers every gate state', () => {
  expect(nextActionOf('LOCKED_HINTS')).toEqual({ kind: 'attempt' });
  expect(nextActionOf('HINT1_AVAILABLE')).toEqual({ kind: 'hint', hint: 1 });
  expect(nextActionOf('HINT1_SEEN')).toEqual({ kind: 'attempt' });
  expect(nextActionOf('HINT2_AVAILABLE')).toEqual({ kind: 'hint', hint: 2 });
  expect(nextActionOf('HINT2_SEEN')).toEqual({ kind: 'attempt' });
  expect(nextActionOf('SOLUTION_AVAILABLE')).toEqual({ kind: 'solution' });
  expect(nextActionOf('SOLUTION_REVEALED')).toBeNull();
  expect(nextActionOf('MATCHED')).toBeNull();
  expect(nextActionOf('EXIT_OPEN')).toBeNull();
  expect(nextActionOf(gateStateOf(initialExerciseState(), false))).toEqual({ kind: 'attempt' });
});

it('a revealed hint is text above the buttons, in order, and a hint not reached is absent', () => {
  let s = viewHint(declareAttempt(initialExerciseState(), false), 1, false);
  let html = render(s);
  expect(html).toContain(exercise.hints[0]);
  expect(html).not.toContain(esc(exercise.hints[1]));
  expect(html.indexOf('ex-hints')).toBeLessThan(html.indexOf('ex-actions'));
  s = viewHint(declareAttempt(s, false), 2, false);
  html = render(s);
  expect(html.indexOf(esc(exercise.hints[0]))).toBeLessThan(html.indexOf(esc(exercise.hints[1])));
  expect(html).toContain('HINT 1');
  expect(html).toContain('HINT 2');
});

it('after match: one line, highlighted solution, approach checklist — no buttons', () => {
  const html = render(declareMatch(initialExerciseState()));
  expect(html).toContain('Output matched.');
  expect(html).toContain('Model solution');
  expect(html).toContain('class="token keyword"'); // Python syntax highlighting
  expect(html).toContain('Compare approaches');
  for (const item of exercise.approachChecklist) {
    expect(html).toContain(esc(item));
  }
  expect(buttons(html)).toEqual([]);
});

it('after the full ladder + reveal: solution shown, match still offered', () => {
  const html = render(ladderSpent());
  expect(html).toContain('Model solution');
  expect(buttons(html)).toEqual(['My output matches']);
});

// #89 — a crack is one hint viewed: the solution, the biggest reveal on the
// ladder, is free. The buttons themselves price it.
it('prices the ladder the way the state actually charges it (#89)', () => {
  expect(render(declareAttempt(initialExerciseState(), false))).toContain(
    'Reveal hint 1 — cracks the card',
  );
  let s = initialExerciseState();
  for (const hint of [1, 2] as const) s = viewHint(declareAttempt(s, false), hint, false);
  const atSolution = render(declareAttempt(s, false)); // SOLUTION_AVAILABLE
  expect(atSolution).toContain('Reveal solution<');
  expect(atSolution).not.toContain('Reveal solution — cracks');
  const spent = ladderSpent();
  expect(spent.solutionRevealed).toBe(true);
  expect(cardCracksOf({ [exercise.id]: spent })).toBe(2);
});

it('exit variant: the kicker says exit, once; match or come back later, no ladder', () => {
  const html = render(initialExerciseState(), true);
  expect(html.match(/Exit checkpoint/g)).toHaveLength(1);
  expect(html).not.toMatch(/UNSCAFFOLDED|No hints/);
  expect(html).toContain('Show whitespace'); // on the exit block too
  expect(buttons(html)).toEqual(['My output matches']);
  expect(html).toContain('Come back later');
  expect(html).not.toContain('I tried and got stuck');
  expect(html).not.toContain('Model solution');
});

// #15 interaction polish: every reveal replaces the button that triggered it, so
// each thing revealed has to be able to take the focus that button had — as a
// programmatic-only focus target, never a new tab stop.
it('reveals are focus targets: hint text, solution heading and the matched line', () => {
  const revealed = render(viewHint(declareAttempt(initialExerciseState(), false), 1, false));
  expect(revealed).toContain('<p class="ex-hint-text" tabindex="-1">');
  expect(render(ladderSpent())).toContain(
    '<h2 class="ex-section-title" tabindex="-1">Model solution</h2>',
  );
  const matched = render(declareMatch(initialExerciseState()));
  expect(matched).toContain('<p class="ex-matched" role="status" tabindex="-1">');
  expect(revealed).not.toContain('tabindex="0"');
});
