// HomeMap render contract — the prototype Home map: every tier with its era
// label, module rows driven by the §6 gating owner (locked rows are not
// navigable), the current checkpoint highlighted, and checkpoint-only progress
// language (DESIGN.md §3.1 — never days, streaks, XP or percentages).
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import HomeMap from './HomeMap';
import { flatModules, loadCurriculum } from './content/load';
import { declareMatch } from './state/effortGate';
import { emptyProgress, updateExerciseState, type Progress } from './state/progress';

const curriculum = loadCurriculum();
const modules = flatModules(curriculum);

function render(progress: Progress = emptyProgress()) {
  return renderToString(<HomeMap curriculum={curriculum} progress={progress} />);
}

/** Pass a module the real way: its exit exercise gets matched. */
function passModule(progress: Progress, moduleId: string): Progress {
  const module = modules.find((candidate) => candidate.id === moduleId)!;
  return updateExerciseState(progress, moduleId, module.exitExercise.id, true, declareMatch);
}

it('renders every tier with its era label from curriculum.json', () => {
  const html = render();
  for (const tier of curriculum.tiers) {
    expect(html).toContain(tier.title);
    expect(html).toContain(tier.era);
  }
  // Tier 5 is announced as locked until the capstone passes.
  expect(html).toContain('Tier 5 — Advanced');
  expect(html).toContain('Unlocks after the capstone');
});

it('renders every module from the curriculum with its number, title and anchor', () => {
  const html = render();
  expect(modules).toHaveLength(13);
  for (const module of modules) {
    expect(html).toContain(module.title);
    expect(html).toContain(module.anchor.replace(/&/g, '&amp;').replace(/"/g, '&quot;'));
  }
});

it('starts with Module 00 up next and every later module locked and unlinked', () => {
  const html = render();
  expect(html).toContain('UP NEXT');
  expect(html).toContain('#/setup'); // Module 0 opens the Setup guide route
  // No concept module is reachable yet.
  for (const module of modules.slice(1)) {
    expect(html).not.toContain(`#/module/${module.id}`);
  }
  expect((html.match(/LOCKED/g) ?? []).length).toBe(modules.length - 1);
});

it('passing a module marks it PASSED and opens exactly the next one', () => {
  const html = render(passModule(emptyProgress(), 'm0'));
  expect(html).toContain('PASSED');
  expect(html).toContain('#/module/m1');
  expect(html).not.toContain('#/module/m2');
  expect(html).toContain('1 / 13 CHECKPOINTS');
  expect(html).toContain('Next up: Module 01');
});

it('highlights the current module and nothing else', () => {
  const html = render(passModule(emptyProgress(), 'm0'));
  expect((html.match(/UP NEXT/g) ?? []).length).toBe(1);
  expect((html.match(/home-num--current/g) ?? []).length).toBe(1);
});

it('locked rows carry no href and no tabbable element', () => {
  const html = render();
  const lockedRow = /<div class="home-row home-row--locked"[^>]*>/.exec(html);
  expect(lockedRow).not.toBeNull();
  expect(lockedRow![0]).not.toContain('href');
  expect(html).not.toContain('<button');
});

it('speaks in checkpoints only — no streaks, days, XP or percentages', () => {
  const html = render(passModule(emptyProgress(), 'm0'));
  const disclaimer = 'Progress is checkpoints passed — never days or streaks.';
  expect(html).toContain(disclaimer);
  // Outside that one disclaimer sentence nothing may mention time or scores.
  expect(html.replace(disclaimer, '')).not.toMatch(/streak|\bXP\b|\bdays?\b|\d+\s*%|complete/i);
});

it('unlocks the Tier 5 section once the capstone passes', () => {
  const html = render(passModule(emptyProgress(), 'm12'));
  expect(html).toContain('Unlocked — content lands later');
  expect(html).not.toContain('home-tier5--locked');
});
