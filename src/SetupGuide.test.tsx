// SetupGuide render contract — the prototype Setup guide screen: OS picker
// (persisted), an install stepper whose screenshots are local files, and the
// Module 0 exit checkpoint inline, in its no-ladder exit variant
// (DESIGN.md §6 Tier 0, §7; ENGINEERING.md §7, §12).
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import SetupGuide from './SetupGuide';
import HomeMap, { SETUP_MODULE_ID, SETUP_ROUTE } from './HomeMap';
import { findModule, loadCurriculum } from './content/load';
import {
  bundledShotFiles,
  isBundledShot,
  setupStepsFor,
  type SetupOs,
  type SetupStep,
} from './content/setup';
import { declareMatch } from './state/effortGate';
import { emptyProgress, updateExerciseState, type Progress } from './state/progress';
import { DEFAULT_SETUP_OS, parseSetupOs, SETUP_OS_KEY } from './state/setupOs';
import { pwaOptions } from './pwa/manifest';

const curriculum = loadCurriculum();
const m0 = findModule(curriculum, SETUP_MODULE_ID)!;
const shotDir = resolve(dirname(fileURLToPath(import.meta.url)), 'art/setup');
const allSteps: SetupStep[] = (['windows', 'mac'] as SetupOs[]).flatMap(setupStepsFor);

/** Authored copy carries quotes and apostrophes; React escapes them in the
 *  rendered HTML, so assertions compare against the escaped form. */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function render(progress: Progress = emptyProgress()) {
  return renderToString(
    <SetupGuide
      curriculum={curriculum}
      module={m0}
      progress={progress}
      onTransition={() => {}}
    />,
  );
}

const passed = updateExerciseState(emptyProgress(), m0.id, m0.exitExercise.id, true, declareMatch);

it('renders Module 00 with its authored title, tier and intro', () => {
  const html = render();
  expect(html).toContain('Module 00');
  expect(html).toContain('Tier 0 — Setup');
  expect(html).toContain(m0.title);
  expect(html).toContain('run one file from the terminal');
});

it('is what the map opens for Module 0 — never ModuleView', () => {
  const html = renderToString(<HomeMap curriculum={curriculum} progress={emptyProgress()} />);
  expect(html).toContain(`href="${SETUP_ROUTE}"`);
  expect(html).not.toContain(`href="#/module/${SETUP_MODULE_ID}"`);
});

it('offers a Windows / Mac picker built from the design system segment', () => {
  const html = render();
  expect(html).toContain('class="seg"');
  expect(html.match(/type="radio"/g)?.length).toBe(2);
  expect(html).toContain('Windows');
  expect(html).toContain('Mac');
  // The default path is rendered checked, so the stepper never starts blank.
  expect(html).toContain('checked=""');
});

it('persists the choice under its own key — never inside the progress backup', () => {
  expect(SETUP_OS_KEY).toBe('bora-py-setup-os');
  expect(parseSetupOs('mac')).toBe('mac');
  expect(parseSetupOs('windows')).toBe('windows');
  // Absent or junk falls back rather than throwing.
  expect(parseSetupOs(null)).toBe(DEFAULT_SETUP_OS);
  expect(parseSetupOs('linux')).toBe(DEFAULT_SETUP_OS);
  expect(JSON.stringify(passed)).not.toContain('setup-os');
});

it('covers the DESIGN.md §6 Tier 0 steps on both paths, in order', () => {
  for (const os of ['windows', 'mac'] as SetupOs[]) {
    const steps = setupStepsFor(os);
    const script = steps.map((step) => `${step.title} ${step.body} ${step.command ?? ''}`).join('\n');
    expect(script).toContain('python.org/downloads'); // install Python
    expect(script).toMatch(os === 'mac' ? /Terminal/ : /powershell/i); // open a terminal
    expect(script).toContain('hello.py'); // create the file
    // …and run it, with the OS's own command, as the last step.
    expect(steps[steps.length - 1].command).toBe(os === 'mac' ? 'python3 hello.py' : 'python hello.py');
    expect(steps[steps.length - 1].output).toBe(m0.exitExercise.expectedOutput);
  }
});

it('renders each step numbered, with its terminal command and printed output', () => {
  const html = render();
  const steps = setupStepsFor(DEFAULT_SETUP_OS);
  for (const step of steps) {
    expect(html).toContain(escaped(step.title));
    if (step.command) expect(html).toContain(step.command);
  }
  expect(html).toContain('python hello.py'); // Windows is the default path
  expect(html).toContain('IT PRINTS');
});

it('bundles every screenshot locally — no remote images anywhere', () => {
  const files = bundledShotFiles();
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) expect(existsSync(join(shotDir, file))).toBe(true);
  const html = render();
  expect(html).toContain('<img');
  expect(html).not.toMatch(/<img[^>]+src="https?:/);
});

it('precaches the screenshots so setup works offline', () => {
  // png is in the precache glob (src/pwa/manifest.ts), and the screenshots are
  // real emitted files rather than inlined data URIs (vite.config.ts).
  expect(pwaOptions.workbox!.globPatterns!.join(',')).toContain('png');
  expect(bundledShotFiles().every((file) => file.endsWith('.png'))).toBe(true);
});

it('says plainly what an uncaptured screenshot has to show, instead of faking one', () => {
  const pending = allSteps.map((step) => step.shot).filter((shot) => !isBundledShot(shot));
  // Windows/macOS installer dialogs cannot be captured from this repo's CI or
  // dev box; the slot is data-driven so the file drops in without code changes.
  expect(pending.length).toBeGreaterThan(0);
  for (const shot of pending) expect((shot as { pending: string }).pending.length).toBeGreaterThan(20);
  expect(render()).toContain('SCREENSHOT PENDING');
});

it('gives every bundled screenshot descriptive alt text and a provenance caption', () => {
  for (const shot of allSteps.map((step) => step.shot).filter(isBundledShot)) {
    expect(shot.alt.length).toBeGreaterThan(40);
    expect(shot.caption).toMatch(/captured \d{4}-\d{2}-\d{2}/);
  }
});

it('ends in the exit checkpoint: expected output, match or come back later, no hints', () => {
  const html = render();
  expect(html).toContain('EXIT CHECKPOINT');
  expect(html).toContain(escaped(m0.exitExercise.prompt));
  expect(html).toContain('EXPECTED OUTPUT');
  expect(html).toContain(m0.exitExercise.expectedOutput);
  // Same shared block as ExerciseView, toggle included — no second implementation.
  expect(html).toContain('Show whitespace');
  expect(html).toContain('My output matches');
  expect(html).toContain('Come back later');
  expect(html).not.toContain('I tried and got stuck');
  expect(html).not.toContain('Hint');
});

it('shows the passed state once the checkpoint is matched — no guilt copy', () => {
  const html = render(passed);
  expect(html).toContain('PASSED');
  expect(html).toContain('Module 01 is open');
  expect(html).not.toContain('My output matches');
  expect(html).not.toMatch(/\b(streaks?|XP|days?|percent)\b/i);
});

it('keeps hit targets ≥44px and buttons flush left, from shared classes', () => {
  const html = render();
  expect(html).toContain('btn btn-primary btn-action'); // .btn-action: min-height 46px
  expect(html).toContain('btn btn-secondary btn-action');
  expect(html).toContain('btn btn-ghost setup-back');
});
