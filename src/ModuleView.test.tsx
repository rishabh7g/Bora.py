// ModuleView render contract — the prototype Module screen: concept doc,
// worked examples with highlighted code + copy buttons (outputs get none),
// exercise state chips derived from Progress, and the §6 exit lock consumed
// from src/state/gating.ts.
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ModuleView, { exerciseChipOf } from './ModuleView';
import { findModule, loadCurriculum } from './content/load';
import {
  declareAttempt,
  declareMatch,
  initialExerciseState,
  revealSolution,
  viewHint,
  type ExerciseState,
} from './state/effortGate';
import { emptyProgress, updateExerciseState, type Progress } from './state/progress';

const curriculum = loadCurriculum();
const m1 = findModule(curriculum, 'm1')!;

function render(progress: Progress = emptyProgress()) {
  return renderToString(<ModuleView curriculum={curriculum} module={m1} progress={progress} />);
}

function apply(
  progress: Progress,
  exerciseId: string,
  ...transitions: Array<(state: ExerciseState) => ExerciseState>
): Progress {
  return transitions.reduce(
    (acc, transition) => updateExerciseState(acc, 'm1', exerciseId, false, transition),
    progress,
  );
}

const allMatched = m1.exercises.reduce((acc, e) => apply(acc, e.id, declareMatch), emptyProgress());

it('renders kicker, title, and concept intro', () => {
  const html = render();
  expect(html).toContain('Module 01');
  expect(html).toContain('Tier 1 — Basics');
  expect(html).toContain('Variables + print');
  expect(html).toContain('A variable is a named box');
});

it('worked examples: highlighted code with a copy button each; output blocks get none', () => {
  const html = render();
  expect(html).toContain('class="token'); // Prism python highlighting
  expect(html).toContain('My bias is V'); // example output text
  const copyButtons = html.match(/COPY/g) ?? [];
  // Exactly one copy button per example — none on outputs or anywhere else.
  expect(copyButtons.length).toBe(m1.concept.examples.length);
});

it('exercise rows link to the exercise route and start NOT STARTED', () => {
  const html = render();
  for (const exercise of m1.exercises) {
    expect(html).toContain(`#/module/m1/exercise/${exercise.id}`);
    expect(html).toContain(exercise.title!);
  }
  expect(html.match(/NOT STARTED/g)?.length).toBe(m1.exercises.length);
});

it('chips project the persisted exercise state', () => {
  expect(exerciseChipOf(initialExerciseState()).label).toBe('NOT STARTED');
  expect(exerciseChipOf({ ...initialExerciseState(), attempts: 2, stuck: true }).label).toBe(
    'TRIED ×2',
  );
  expect(exerciseChipOf({ ...initialExerciseState(), attempts: 1, hintsUnlocked: 1 }).label).toBe(
    'HINT 1 USED',
  );
  expect(exerciseChipOf({ ...initialExerciseState(), solutionRevealed: true }).label).toBe(
    'SOLUTION SEEN',
  );
  expect(exerciseChipOf({ ...initialExerciseState(), matched: true }).label).toBe('MATCHED');
});

it('renders TRIED and HINT USED chips from real transitions', () => {
  let p = apply(emptyProgress(), 'e1', (s) => declareAttempt(s, false));
  p = apply(p, 'e2', (s) => declareAttempt(s, false), (s) => viewHint(s, 1, false));
  const html = render(p);
  expect(html).toContain('TRIED ×1');
  expect(html).toContain('HINT 1 USED');
});

it('exit is LOCKED (no link) until every formative is matched or solution-seen', () => {
  const html = render();
  expect(html).toContain('LOCKED');
  expect(html).toContain('Unlocks when every practice exercise is matched or its solution seen.');
  expect(html).not.toContain('#/module/m1/exit');

  const oneShort = apply(apply(emptyProgress(), 'e1', declareMatch), 'e2', declareMatch);
  expect(renderToString(<ModuleView curriculum={curriculum} module={m1} progress={oneShort} />))
    .not.toContain('#/module/m1/exit');
});

it('exit unlocks (READY, linked) when all formatives are matched', () => {
  const html = render(allMatched);
  expect(html).toContain('#/module/m1/exit');
  expect(html).toContain('READY');
  expect(html).not.toContain('LOCKED');
});

it('a solution revealed via the full ladder counts as engagement — no dead ends', () => {
  let p = apply(apply(emptyProgress(), 'e1', declareMatch), 'e2', declareMatch);
  p = apply(
    p,
    'e3',
    (s) => declareAttempt(s, false),
    (s) => viewHint(s, 1, false),
    (s) => declareAttempt(s, false),
    (s) => viewHint(s, 2, false),
    (s) => declareAttempt(s, false),
    (s) => revealSolution(s, false),
  );
  const html = render(p);
  expect(html).toContain('#/module/m1/exit');
  expect(html).toContain('SOLUTION SEEN');
});

it('exit chip flips to PASSED once the exit exercise is matched', () => {
  const p = updateExerciseState(allMatched, 'm1', m1.exitExercise.id, true, declareMatch);
  const html = render(p);
  expect(html).toContain('PASSED');
  expect(p.modules.m1.passed).toBe(true); // module passed persists write-through
});
