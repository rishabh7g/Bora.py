// ExerciseView render contract — the UI consumes the effort gate, and the
// trust-based rules show up in the markup (no copy button, hidden solution,
// exit variant without a ladder).
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ExerciseView from './ExerciseView';
import { findModule, loadCurriculum } from './content/load';
import { declareAttempt, declareMatch, initialExerciseState, revealSolution, viewHint } from './state/effortGate';

const m1 = findModule(loadCurriculum(), 'm1')!;
const exercise = m1.exercises[0];
const noop = () => {};

function render(state = initialExerciseState(), isExit = false) {
  return renderToString(
    <ExerciseView
      module={m1}
      exercise={isExit ? m1.exitExercise : exercise}
      isExit={isExit}
      state={state}
      onTransition={noop}
    />,
  );
}

it('shows prompt and expected output, with NO copy button (trust-based)', () => {
  const html = render();
  expect(html).toContain('EXPECTED OUTPUT');
  expect(html).toContain(exercise.expectedOutput);
  // The shared block brings its whitespace toggle with it (ExpectedOutput.tsx).
  expect(html).toContain('Show whitespace');
  expect(html.toLowerCase()).not.toContain('copy');
});

it('hides solution and hints initially; both effort-gate buttons present', () => {
  const html = render();
  expect(html).toContain('My output matches');
  expect(html).toContain('I tried and got stuck');
  expect(html).not.toContain('Model solution');
  expect(html).not.toContain(exercise.hints[0]);
  expect(html).toContain('Reachable only after the full ladder');
});

it('offers the hint-1 reveal after a declared attempt', () => {
  const html = render(declareAttempt(initialExerciseState(), false));
  expect(html).toContain('Reveal hint 1 — cracks the card');
  expect(html).not.toContain(exercise.hints[0]);
});

it('shows the hint text once viewed', () => {
  let s = declareAttempt(initialExerciseState(), false);
  s = viewHint(s, 1, false);
  const html = render(s);
  expect(html).toContain(exercise.hints[0]);
  expect(html).not.toContain(exercise.hints[1]);
});

it('after match: banner, highlighted solution, approach checklist — no action buttons', () => {
  const html = render(declareMatch(initialExerciseState()));
  expect(html).toContain('Output matched');
  expect(html).toContain('Model solution');
  expect(html).toContain('class="token keyword"'); // Python syntax highlighting
  expect(html).toContain('Compare approaches');
  for (const item of exercise.approachChecklist) {
    expect(html).toContain(item.replace(/"/g, '&quot;').replace(/'/g, '&#x27;'));
  }
  // The lock-note copy quotes the phrase; assert the BUTTON is gone.
  expect(html).not.toContain('I tried and got stuck</button>');
});

// SOLUTION_REVEALED — hint 1, hint 2 and the solution all spent.
function ladderSpent() {
  let s = initialExerciseState();
  for (const hint of [1, 2] as const) s = viewHint(declareAttempt(s, false), hint, false);
  return revealSolution(declareAttempt(s, false), false);
}

it('after the full ladder + reveal: solution shown, match still offered', () => {
  const html = render(ladderSpent());
  expect(html).toContain('Model solution');
  expect(html).toContain('My output matches');
});

// #43: at the top of the ladder there is no next rung, so the screen must not
// offer a control that cannot move it, nor promise a rung that does not exist.
it('at the top of the ladder: only the match is offered, and no rung is promised', () => {
  const html = render(ladderSpent());
  expect(html).toContain('My output matches');
  expect(html).not.toContain('I tried and got stuck</button>');
  expect(html).toContain('3 attempts declared.');
  expect(html).not.toContain('Next rung unlocked below');
  expect(html).not.toContain('Try again to unlock the next rung');
  expect(html).toContain('Every rung is open');
});

it('one rung down the note still promises the rung that does exist', () => {
  // SOLUTION_AVAILABLE: 3 attempts, solution reachable but not revealed.
  let s = initialExerciseState();
  for (const hint of [1, 2] as const) s = viewHint(declareAttempt(s, false), hint, false);
  s = declareAttempt(s, false);
  const available = render(s);
  expect(available).toContain('3 attempts declared. Next rung unlocked below.');
  expect(available).toContain('Reveal solution');
  expect(available).toContain('I tried and got stuck</button>');

  // HINT2_SEEN: the solution rung needs one more declared attempt.
  const spentOnHint2 = render(viewHint(declareAttempt(initialExerciseState(), false), 1, false));
  expect(spentOnHint2).toContain('1 attempt declared. Try again to unlock the next rung.');
});

it('exit variant: no hint ladder, only match or come back later', () => {
  const html = render(initialExerciseState(), true);
  expect(html).toContain('EXIT CHECKPOINT');
  expect(html).toContain('Show whitespace'); // on the exit block too
  expect(html).toContain('My output matches');
  expect(html).toContain('Come back later');
  expect(html).not.toContain('I tried and got stuck');
  expect(html).not.toContain('Hint ladder');
  expect(html).not.toContain('Model solution');
});

// #15 interaction polish: every reveal replaces the button that triggered it, so
// each thing revealed has to be able to take the focus that button had. Which
// element gets it is behaviour (verified in a browser); what the markup must
// carry is a programmatic-only focus target on each one — never a new tab stop.
it('reveals are focus targets: hint text, solution heading and matched banner', () => {
  const revealed = render(viewHint(declareAttempt(initialExerciseState(), false), 1, false));
  expect(revealed).toContain('<p class="ex-hint-text" tabindex="-1">');

  let ladder = initialExerciseState();
  for (const hint of [1, 2] as const) {
    ladder = viewHint(declareAttempt(ladder, false), hint, false);
  }
  ladder = revealSolution(declareAttempt(ladder, false), false);
  expect(render(ladder)).toContain('<h2 class="ex-section-title" tabindex="-1">Model solution</h2>');

  // The banner is also the announcement of the pass, so it is a live region.
  const matched = render(declareMatch(initialExerciseState()));
  expect(matched).toContain('<div class="ex-matched-banner" role="status" tabindex="-1">');
});

it('the focus targets are not extra tab stops', () => {
  // -1 only: tabbing down the screen still goes button to button.
  const html = render(viewHint(declareAttempt(initialExerciseState(), false), 1, false));
  expect(html).not.toContain('tabindex="0"');
});
