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
/** Every shot actually declared — a step may have none, because a step whose
 *  subject is a command and its output shows text instead (#61). */
const allShots = allSteps.flatMap((step) => (step.shot ? [step.shot] : []));

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
    // Every command is real text in a <pre>, so it can be selected and copied.
    if (step.command) expect(html).toContain(`<pre class="setup-term-command">${step.command}</pre>`);
  }
  expect(html).toContain('python hello.py'); // Windows is the default path
  expect(html).toContain('IT PRINTS');
});

it('renders a step’s output with the shared block, not a second implementation (#61)', () => {
  const html = render();
  // One owner: src/ExpectedOutput.tsx. No local markup for an output block.
  expect(html).not.toContain('setup-term-output');
  // The stepper's IT PRINTS and the checkpoint's EXPECTED OUTPUT are the same
  // component, so the whitespace toggle (#14) renders in both.
  expect(html).toContain('IT PRINTS');
  expect(html).toContain('EXPECTED OUTPUT');
  expect(html.match(/Show whitespace/g)?.length).toBe(2);
  expect(html.match(/class="ex-expected"/g)?.length).toBe(2);
  // …and the printed name is text in the block, machine-verifiable and copyable.
  const last = setupStepsFor(DEFAULT_SETUP_OS).slice(-1)[0];
  expect(html).toContain(`<pre>${last.output}</pre>`);
});

it('never points at a screenshot of a terminal, a command or its output (#61)', () => {
  // A terminal window, or a shell command / its printed result, described as the
  // subject of an image. "Download Python 3.14.7" on the python.org page is a
  // GUI button, not a command, so the pattern is deliberately narrow.
  const TERMINAL =
    /\bpowershell\b|\bterminal\b|command prompt|\bpython3?\s+(--version|hello\.py)|\bprint(s|ed)\b|printed output/i;
  for (const shot of allShots) {
    const subject = `${shot.alt} ${shot.caption}`;
    expect(subject, `a shot must not depict terminal content: ${subject}`).not.toMatch(TERMINAL);
  }
  // A step whose subject IS printed output carries that output as text and no
  // image at all. (A step may still have both a command and a GUI shot — "Create
  // hello.py" shows a save dialog and then a `cd`; the dialog is a window.)
  for (const step of allSteps.filter((step) => step.output)) {
    expect(step.shot, `step "${step.title}" prints output, so it takes no screenshot`).toBeUndefined();
  }
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

it('ships screenshots only as complete Windows/Mac pairs (#62)', () => {
  const windows = setupStepsFor('windows');
  const mac = setupStepsFor('mac');
  expect(windows.length).toBe(mac.length);
  for (let index = 0; index < windows.length; index += 1) {
    // A picture on one path and nothing on the other would tell the other
    // learner she got the lesser version of the lesson.
    expect(
      Boolean(windows[index].shot),
      `step ${index + 1} must have a screenshot on both paths or neither`,
    ).toBe(Boolean(mac[index].shot));
  }
  // The pair that does exist: the python.org download page, per OS.
  expect(bundledShotFiles().sort()).toEqual([
    'python-downloads-mac.png',
    'python-downloads-windows.png',
  ]);
});

it('never renders a placeholder — an unpaired step gets instructions instead (#62)', () => {
  const html = render();
  expect(html).not.toContain('SCREENSHOT PENDING');
  expect(html).not.toContain('setup-shot-pending');
  // Structurally impossible, not merely absent: there is no placeholder shape.
  for (const shot of allShots) expect(shot).not.toHaveProperty('pending');
  // The steps that lost a screenshot carry the landmarks in words, and enough
  // of them to actually follow: this replaced a picture.
  const withLook = allSteps.filter((step) => step.look);
  // the installer, the terminal window (#67) and the save dialog, per OS
  expect(withLook.length).toBe(6);
  for (const step of withLook) {
    expect(step.look!.length, `"${step.title}" needs the landmarks, not a sentence`).toBeGreaterThanOrEqual(4);
    for (const line of step.look!) expect(line.length).toBeGreaterThan(30);
  }
  // And no step is left with nothing but prose: no picture and nothing to type
  // means it has to say what to look for.
  for (const step of allSteps) {
    if (!step.shot && !step.command && !step.output) {
      expect(step.look, `step "${step.title}" has neither a picture nor a command`).toBeDefined();
    }
  }
  expect(render()).toContain('WHAT YOU’LL SEE');
});

it('describes the terminal window itself on both paths, not just the command (#67)', () => {
  for (const os of ['windows', 'mac'] as SetupOs[]) {
    const step = setupStepsFor(os)[2]; // "Open PowerShell / Terminal and check it worked"
    expect(step.command).toBe(os === 'mac' ? 'python3 --version' : 'python --version');
    const look = step.look;
    expect(look, `step 3 on ${os} must say what the window looks like`).toBeDefined();
    const said = look!.join(' ');
    // The window, not the command: how bare it is, and where the prompt is. A
    // first-timer reads an empty rectangle as a page that failed to load.
    expect(said).toMatch(/almost empty|near-empty/);
    expect(said).toContain('prompt');
    expect(said).toMatch(/blinking/);
    // …and the command itself stays in the TYPE THIS block, not in the words.
    expect(said).not.toContain(step.command!);
  }
});

it('gives every bundled screenshot descriptive alt text and a provenance caption', () => {
  for (const shot of allShots) {
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
