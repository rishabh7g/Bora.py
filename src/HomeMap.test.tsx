// HomeMap render contract: the current checkpoint leads as one card, the
// whole path follows in curriculum order driven by the §6 gating owner
// (locked rows are not navigable), and progress is spoken in checkpoints only
// (DESIGN.md §3.1 — never days, streaks, XP or percentages).
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import HomeMap, { SETTINGS_ROUTE, SHELF_ROUTE } from './HomeMap';
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

function passThrough(lastId: string): Progress {
  let progress = emptyProgress();
  for (const module of modules) {
    progress = passModule(progress, module.id);
    if (module.id === lastId) break;
  }
  return progress;
}

it('renders every tier with its era label from curriculum.json', () => {
  const html = render();
  for (const tier of curriculum.tiers) {
    expect(html).toContain(tier.title);
    expect(html).toContain(tier.era);
  }
  // Tier 5 is one line, announced as locked until the capstone passes.
  expect(html).toContain('Tier 5 — Advanced');
  expect(html).toContain('unlocks after the capstone');
});

it('renders every module with its number and title', () => {
  const html = render();
  expect(modules).toHaveLength(13);
  for (const module of modules) {
    expect(html).toContain(module.title);
  }
});

it('leads with the current checkpoint as one card, and one count', () => {
  const html = render(passModule(emptyProgress(), 'm0'));
  const card = /<section class="home-current">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? '';
  expect(card).toContain('1 of 13 checkpoints passed');
  expect(card).toContain('Variables + print');
  expect(card).toContain('href="#/module/m1"');
  expect(card).toContain('Open Module 01');
  // The card is where the position is stated — nowhere else counts or names it.
  expect(html.match(/checkpoints passed/g)).toHaveLength(1);
  expect(html.match(/Open Module/g)).toHaveLength(1);
  expect(html).not.toContain('UP NEXT');
});

it('starts with Module 00 on the card and every later module locked and unlinked', () => {
  const html = render();
  expect(html).toContain('Open Module 00');
  expect(html).toContain('href="#/setup"'); // Module 0 opens the Setup guide route
  for (const module of modules.slice(1)) {
    expect(html).not.toContain(`#/module/${module.id}`);
  }
  expect((html.match(/home-row--locked/g) ?? []).length).toBe(modules.length - 1);
});

it('passing a module marks it PASSED and opens exactly the next one', () => {
  const html = render(passModule(emptyProgress(), 'm0'));
  expect(html.match(/PASSED/g)).toHaveLength(1);
  expect(html).toContain('#/module/m1');
  expect(html).not.toContain('#/module/m2');
});

it('a locked row is one title line: no anchor, no chip, no href, nothing tabbable', () => {
  const html = render();
  const lockedRow = /<div class="home-row home-row--locked"[^>]*>[\s\S]*?<\/div>/.exec(html);
  expect(lockedRow).not.toBeNull();
  expect(lockedRow![0]).not.toContain('href');
  expect(lockedRow![0]).not.toContain('home-rowanchor');
  expect(lockedRow![0]).not.toContain('class="tag');
  expect(html).not.toContain('<button');
  // The anchor of a locked module is not on the screen at all.
  expect(html).not.toContain(modules[3].anchor);
});

it('a passed row keeps its anchor and link — the reading path back', () => {
  const html = render(passModule(emptyProgress(), 'm0'));
  const passedRow = /<a class="home-row home-row--open"[^>]*>[\s\S]*?<\/a>/.exec(html);
  expect(passedRow).not.toBeNull();
  expect(passedRow![0]).toContain('href="#/setup"');
  expect(passedRow![0]).toContain(modules[0].anchor);
});

it('the current row drops the anchor its card already printed', () => {
  const html = render(passModule(emptyProgress(), 'm0'));
  const currentRow = /<a class="home-row home-row--open home-row--current"[^>]*>[\s\S]*?<\/a>/.exec(
    html,
  );
  expect(currentRow).not.toBeNull();
  expect(currentRow![0]).not.toContain('home-rowanchor');
  expect((html.match(/home-row--current/g) ?? []).length).toBe(1);
});

it('speaks in checkpoints only — no streaks, days, XP or percentages', () => {
  const html = render(passModule(emptyProgress(), 'm0'));
  expect(html).not.toMatch(/streak|\bXP\b|\bdays?\b|\d+\s*%|complete/i);
});

it('says every checkpoint passed, with no button, once the path is done', () => {
  const html = render(passThrough('m12'));
  expect(html).toContain('Every checkpoint passed.');
  expect(html).toContain('13 of 13 checkpoints passed');
  expect(html).not.toContain('Open Module');
  expect(html).toContain('is open');
  expect(html).not.toContain('home-tier5--locked');
});

// #83: the shelf and settings are bottom-nav destinations (#75), so the map's
// body must not link to them as well.
it('does not repeat the nav destinations in the map body', () => {
  const html = render();
  expect(html).not.toContain(`href="${SHELF_ROUTE}"`);
  expect(html).not.toContain(`href="${SETTINGS_ROUTE}"`);
});
