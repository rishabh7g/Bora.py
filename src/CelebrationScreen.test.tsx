// CelebrationScreen render contract + the pass edge that shows it: one playful
// line, the photocard just earned, the capstone's Tier 5 note — and nothing
// that smells of XP, streaks, scores or time (DESIGN.md §4).
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import CelebrationScreen, {
  celebrationLineFor,
  CELEBRATION_LINES,
  celebrationTriggered,
} from './CelebrationScreen';
import { findModule, loadCurriculum, moduleNumberOf } from './content/load';
import { declareAttempt, declareMatch, initialExerciseState } from './state/effortGate';
import { emptyProgress, updateExerciseState } from './state/progress';
import { moduleStateOf, tier5Unlocked } from './state/gating';

const curriculum = loadCurriculum();
const m7 = findModule(curriculum, 'm7')!;
const m12 = findModule(curriculum, 'm12')!; // the capstone
const noop = () => {};

function render(module = m7, capstone = false) {
  return renderToString(
    <CelebrationScreen
      module={module}
      moduleNumber={moduleNumberOf(curriculum, module.id)}
      tier5Unlocked={capstone}
      onContinue={noop}
    />,
  );
}

it('names the checkpoint, the photocard just earned, and its art', () => {
  const html = render();
  expect(html).toContain('CHECKPOINT PASSED');
  expect(html).toContain('Module 07 cleared.');
  expect(html).toContain(m7.photocard.title);
  expect(html).toContain('Photocard added to shelf');
  expect(html).toContain('celebrate-art'); // the module's own SVG, as a mask
  expect(html).toContain('card-m7.svg');
});

it('says one playful line — deterministic per module', () => {
  const html = render();
  const shown = CELEBRATION_LINES.filter((line) => html.includes(line));
  expect(shown).toHaveLength(1);
  expect(shown[0]).toBe(celebrationLineFor('07'));
  expect(render()).toBe(html); // same checkpoint, same line
});

it('offers one continue control, focusable and ≥44px by class', () => {
  const html = render();
  expect(html).toContain('Continue');
  expect(html.match(/<button/g)).toHaveLength(1);
  expect(html).toContain('celebrate-continue');
});

it('notes Tier 5 (Advanced) only on the capstone pass', () => {
  expect(render(m12, true)).toContain('Tier 5 (Advanced) is open');
  expect(render()).not.toContain('Tier 5');
});

it('never frames the pass as XP, a streak, a score or a time', () => {
  // Copy only — the confetti's inline positions are layout, not language.
  const copy = render(m12, true)
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase();
  for (const banned of ['streak', 'xp', 'points', 'score', 'day', 'minute', '%']) {
    expect(copy).not.toContain(banned);
  }
});

it('fires on the exit-exercise pass edge, and only there', () => {
  const matched = declareMatch(initialExerciseState());
  // The exit exercise reaching matched on a module that had not passed.
  expect(celebrationTriggered(true, false, matched)).toBe(true);
  // A formative exercise matching is not a checkpoint.
  expect(celebrationTriggered(false, false, matched)).toBe(false);
  // Re-matching an already-passed module (a revisit) never re-fires.
  expect(celebrationTriggered(true, true, matched)).toBe(false);
  // An attempt is not a pass.
  expect(celebrationTriggered(true, false, declareAttempt(initialExerciseState(), true))).toBe(
    false,
  );
});

it('is driven by the real progress transition, once per module', () => {
  let progress = emptyProgress();
  const wasPassed = () => moduleStateOf(curriculum, 'm1', progress) === 'passed';
  const m1 = findModule(curriculum, 'm1')!;

  const before = wasPassed();
  const passing = declareMatch(initialExerciseState());
  expect(celebrationTriggered(true, before, passing)).toBe(true);
  progress = updateExerciseState(progress, 'm1', m1.exitExercise.id, true, declareMatch);
  expect(progress.modules.m1.passed).toBe(true);

  // Opening the same exit exercise again: the module already passed, so the
  // edge is gone — the field is shown exactly once.
  expect(celebrationTriggered(true, wasPassed(), declareMatch(passing))).toBe(false);
});

it('unlocks Tier 5 exactly when the capstone passes (§6 owner)', () => {
  let progress = emptyProgress();
  expect(tier5Unlocked(curriculum, progress)).toBe(false);
  progress = updateExerciseState(progress, m12.id, m12.exitExercise.id, true, declareMatch);
  expect(tier5Unlocked(curriculum, progress)).toBe(true);
});

// #15 interaction polish: the field covers a screen that is still in the DOM, so
// it holds focus (Tab kept on the button, Escape as the way out — see
// CelebrationScreen.tsx). That containment is only complete while this is the
// one focusable control on the field, which is what the markup has to keep true.
it('is a modal field whose only focusable control is Continue', () => {
  const html = render();
  expect(html).toContain('role="dialog"');
  expect(html).toContain('aria-modal="true"');
  expect(html.match(/<button|<a |tabindex="0"/g)).toHaveLength(1);
});
