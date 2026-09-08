// ModuleView render contract — the prototype Module screen: concept doc,
// worked examples with highlighted code + copy buttons (outputs get none), an
// exercise list whose rows say matched or nothing, and the §6 exit lock
// consumed from src/state/gating.ts.
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ModuleView, { copyLabelOf, copyStatusOf, exerciseChipOf } from './ModuleView';
import { findModule, loadCurriculum } from '../content/load';
import {
  declareAttempt,
  declareMatch,
  initialExerciseState,
  revealSolution,
  viewHint,
  type ExerciseState,
} from '../state/effortGate';
import { emptyProgress, updateExerciseState, type Progress } from '../state/progress';

const curriculum = loadCurriculum();
const m1 = findModule(curriculum, 'm1')!;

function render(progress: Progress = emptyProgress()) {
  return renderToString(<ModuleView module={m1} progress={progress} />);
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

it('renders the module kicker once, the title, and the concept intro — no tier, no back link', () => {
  const html = render();
  expect(html.match(/Module 01/g)).toHaveLength(1);
  expect(html).not.toContain('Tier 1');
  expect(html).not.toContain('href="#/"');
  expect(html).toContain('Variables + print');
  expect(html).toContain('A variable is a named box');
  // The whitespace toggle is explained by the block that has it, not here.
  expect(html).not.toContain('Show whitespace');
});

it('worked examples: highlighted code with a copy button each; output blocks get none', () => {
  const html = render();
  expect(html).toContain('class="token'); // Prism python highlighting
  expect(html).toContain('My bias is V'); // example output text
  const copyButtons = html.match(/COPY/g) ?? [];
  expect(copyButtons.length).toBe(m1.concept.examples.length);
});

// #44: a browser can refuse the clipboard write (permission not granted, an
// embedded or permission-policy-restricted context) or not expose the API at
// all. Neither may reach the console as an unhandled rejection, and neither may
// leave the button silently saying COPY as if the code had been copied.
it('a refused clipboard write resolves to failed — it never rejects', async () => {
  const refused = {
    writeText: () =>
      Promise.reject(new Error("Failed to execute 'writeText': Write permission denied.")),
  };
  await expect(copyStatusOf('bias = "Jungkook"', refused)).resolves.toBe('failed');
  const throwing = {
    writeText: () => {
      throw new Error('Write permission denied.');
    },
  };
  await expect(copyStatusOf('bias = "Jungkook"', throwing)).resolves.toBe('failed');
  await expect(copyStatusOf('bias = "Jungkook"', undefined)).resolves.toBe('failed');
});

it('a granted clipboard write copies the code verbatim and resolves to copied', async () => {
  const written: string[] = [];
  const granted = {
    writeText: (text: string) => {
      written.push(text);
      return Promise.resolve();
    },
  };
  const code = m1.concept.examples[0].code;
  await expect(copyStatusOf(code, granted)).resolves.toBe('copied');
  expect(written).toEqual([code]);
});

it('each copy status has its own label — the failure is visible on the button', () => {
  expect(copyLabelOf('idle')).toBe('COPY');
  expect(copyLabelOf('copied')).toBe('COPIED');
  expect(copyLabelOf('failed')).toBe('COPY FAILED');
});

it('exercise rows link to the exercise route and carry no chip until matched', () => {
  const html = render();
  for (const exercise of m1.exercises) {
    expect(html).toContain(`#/module/m1/exercise/${exercise.id}`);
    expect(html).toContain(exercise.title!);
  }
  expect(html).not.toContain('NOT STARTED');
  expect(html).not.toContain('MATCHED');
});

it('a row is MATCHED or nothing — attempts, hints and a seen solution stay off the list', () => {
  expect(exerciseChipOf(initialExerciseState())).toBeNull();
  expect(exerciseChipOf({ ...initialExerciseState(), attempts: 2, stuck: true })).toBeNull();
  expect(exerciseChipOf({ ...initialExerciseState(), attempts: 1, hintsUnlocked: 1 })).toBeNull();
  expect(exerciseChipOf({ ...initialExerciseState(), solutionRevealed: true })).toBeNull();
  expect(exerciseChipOf({ ...initialExerciseState(), matched: true })?.label).toBe('MATCHED');

  let p = apply(emptyProgress(), 'e1', (s) => declareAttempt(s, false));
  p = apply(
    p,
    'e2',
    (s) => declareAttempt(s, false),
    (s) => viewHint(s, 1, false),
  );
  p = apply(p, 'e3', declareMatch);
  const html = render(p);
  expect(html).not.toMatch(/TRIED|HINT 1 USED|SOLUTION SEEN/);
  expect(html.match(/MATCHED/g)).toHaveLength(1);
});

it('exit is LOCKED (no link, no explanation) until every formative is matched or solution-seen', () => {
  const html = render();
  expect(html).toContain('LOCKED');
  expect(html).not.toContain('Unlocks when');
  expect(html).not.toContain('Summative');
  expect(html).not.toContain('#/module/m1/exit');

  const oneShort = apply(apply(emptyProgress(), 'e1', declareMatch), 'e2', declareMatch);
  expect(renderToString(<ModuleView module={m1} progress={oneShort} />)).not.toContain(
    '#/module/m1/exit',
  );
});

it('exit unlocks as a plain link when all formatives are matched — no READY chip', () => {
  const html = render(allMatched);
  expect(html).toContain('#/module/m1/exit');
  expect(html).not.toContain('READY');
  expect(html).not.toContain('LOCKED');
  expect(html).not.toContain('PASSED');
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
  expect(render(p)).toContain('#/module/m1/exit');
});

it('the exit row says PASSED once the exit exercise is matched', () => {
  const p = updateExerciseState(allMatched, 'm1', m1.exitExercise.id, true, declareMatch);
  const html = render(p);
  expect(html).toContain('PASSED');
  expect(p.modules.m1.passed).toBe(true); // module passed persists write-through
});
