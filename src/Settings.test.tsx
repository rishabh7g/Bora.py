// Settings render contract — ENGINEERING.md §7 (`Settings`: export/import
// progress, reset module), §4 (the file is the backup story), design/README.md
// (filename, Modernist rules, no guilt copy).
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import Settings, { backupSummary } from './Settings';
import HomeMap, { SETTINGS_ROUTE } from './HomeMap';
import { flatModules, loadCurriculum } from './content/load';
import { declareAttempt, declareMatch } from './state/effortGate';
import { BACKUP_FILENAME } from './state/backup';
import { emptyProgress, updateExerciseState, type Progress } from './state/progress';

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

it('is reachable from the map', () => {
  const html = renderToString(<HomeMap curriculum={curriculum} progress={emptyProgress()} />);
  expect(html).toContain(`href="${SETTINGS_ROUTE}"`);
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
