// Settings render contract — ENGINEERING.md §7 (`Settings`: export/import
// progress, reset module), §4 (the file is the backup story), design/README.md
// (filename, Modernist rules, no guilt copy).
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import Settings, { backupSummary } from './Settings';
import BottomNav from './BottomNav';
import HomeMap, { moduleHref, SETTINGS_ROUTE } from './HomeMap';
import { flatModules, loadCurriculum } from './content/load';
import { declareAttempt, declareMatch } from './state/effortGate';
import { BACKUP_FILENAME } from './state/backup';
import {
  emptyProgress,
  resetModule,
  updateExerciseState,
  type Progress,
} from './state/progress';

const curriculum = loadCurriculum();
const modules = flatModules(curriculum);

function render(progress: Progress = emptyProgress()) {
  return renderToString(
    <Settings
      curriculum={curriculum}
      progress={progress}
      onImport={() => {}}
      onResetModule={() => {}}
    />,
  );
}

function passModule(progress: Progress, moduleId: string): Progress {
  const module = modules.find((candidate) => candidate.id === moduleId)!;
  return updateExerciseState(progress, moduleId, module.exitExercise.id, true, declareMatch);
}

it('offers export and import of the file named in the design handoff', () => {
  const html = render();
  expect(BACKUP_FILENAME).toBe('bora-py-progress.json');
  expect(html).toContain('Export progress');
  expect(html.match(/bora-py-progress\.json/g)?.length).toBeGreaterThanOrEqual(2);
  expect(html).toContain('type="file"');
});

// #83: settings is a bottom-nav destination (#75), so the bar is the one way in
// — the map's header no longer offers a second route to the same place.
it('is reached from the bottom nav, not from the map', () => {
  const nav = renderToString(<BottomNav screen="settings" />);
  expect(nav).toContain(`href="${SETTINGS_ROUTE}"`);

  const map = renderToString(<HomeMap curriculum={curriculum} progress={emptyProgress()} />);
  expect(map).not.toContain(`href="${SETTINGS_ROUTE}"`);
});

it('lists only the modules that have saved progress, for reset', () => {
  expect(render()).toContain('No module has saved progress yet.');

  const progress = updateExerciseState(passModule(emptyProgress(), 'm1'), 'm2', 'e1', false, (s) =>
    declareAttempt(s, false),
  );
  const html = render(progress);
  const worked = modules.filter((module) => module.id === 'm1' || module.id === 'm2');
  for (const module of worked) expect(html).toContain(module.title);
  expect(html).toContain('Passed');
  expect(html).toContain('In progress');
  expect(html.match(/>Reset</g)?.length).toBe(2); // one control per worked module
});

// #87: the copy above the control promises "Every other module keeps its
// progress". Keeping the data is not enough — a module Settings still offers to
// reset has to be one the map still links to, or the promise is only true of
// bytes on disk. This is the issue's exact repro, across both screens.
it('leaves a module she is midway through both listed and reachable after a reset', () => {
  const m1 = modules.find((module) => module.id === 'm1')!;
  let progress = passModule(emptyProgress(), 'm0');
  progress = updateExerciseState(progress, 'm1', m1.exercises[0].id, false, (s) =>
    declareAttempt(s, false),
  );
  progress = resetModule(progress, 'm0');

  const settings = render(progress);
  expect(settings).toContain(m1.title);
  expect(settings).toContain('In progress');

  const map = renderToString(<HomeMap curriculum={curriculum} progress={progress} />);
  expect(map).toContain(`href="${moduleHref('m1')}"`);
  // The row itself, not just some href on the page: an open row is the <a>.
  const row = map.slice(map.indexOf('<a', map.indexOf(m1.title) - 400), map.indexOf(m1.title));
  expect(row).toContain(`href="${moduleHref('m1')}"`);
  expect(row).not.toContain('home-row--locked');
});

it('summarises a backup as checkpoints passed — never days, streaks or percent', () => {
  const summary = backupSummary(curriculum, passModule(emptyProgress(), 'm1'));
  expect(summary).toBe(`1 of ${modules.length} checkpoints passed, 1 module with saved work.`);
  expect(backupSummary(curriculum, emptyProgress())).toContain('0 modules with saved work');
  expect(summary).not.toMatch(/%|streak|day|XP/i);
});

it('keeps the copy plain — a safety net, never a warning shot', () => {
  const html = render(passModule(emptyProgress(), 'm1')).toLowerCase();
  for (const guilt of [
    'lose everything',
    'careful',
    'warning',
    'cannot be undone',
    'permanently',
    'forever',
    'are you sure',
    'sorry',
    'danger',
  ]) {
    expect(html).not.toContain(guilt);
  }
  expect(html).not.toContain('!');
});

it('uses design-system classes only — no radius, no inline styles', () => {
  const html = render(passModule(emptyProgress(), 'm1'));
  expect(html).toContain('btn btn-primary');
  expect(html).toContain('btn btn-secondary');
  expect(html).toContain('class="hr"');
  expect(html).not.toContain('style=');
  expect(html).not.toMatch(/border-radius/);
});
