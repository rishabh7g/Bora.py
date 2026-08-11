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

it('after the full ladder + reveal: solution shown, match still offered', () => {
  let s = initialExerciseState();
  s = declareAttempt(s, false);
  s = viewHint(s, 1, false);
  s = declareAttempt(s, false);
  s = viewHint(s, 2, false);
  s = declareAttempt(s, false);
  s = revealSolution(s, false);
  const html = render(s);
  expect(html).toContain('Model solution');
  expect(html).toContain('My output matches');
});

it('exit variant: no hint ladder, only match or come back later', () => {
  const html = render(initialExerciseState(), true);
  expect(html).toContain('EXIT CHECKPOINT');
  expect(html).toContain('My output matches');
  expect(html).toContain('Come back later');
  expect(html).not.toContain('I tried and got stuck');
  expect(html).not.toContain('Hint ladder');
  expect(html).not.toContain('Model solution');
});
