// Backup file contract — ENGINEERING.md §4: the export/import file is the
// only backup ("losing browser storage must not lose weeks of progress"), so
// the pair must round-trip exactly and a bad file must change nothing.
import { describe, expect, it } from 'vitest';
import { declareAttempt, declareMatch, viewHint } from './effortGate';
import { BACKUP_FILENAME, parseBackup, serializeProgress } from './backup';
import {
  emptyProgress,
  hasModuleProgress,
  updateExerciseState,
  type Progress,
} from './progress';

function workedProgress(): Progress {
  let p = emptyProgress();
  p = updateExerciseState(p, 'm1', 'e1', false, (s) => declareAttempt(s, false));
  p = updateExerciseState(p, 'm1', 'e1', false, (s) => viewHint(s, 1, false));
  p = updateExerciseState(p, 'm1', 'exit', true, declareMatch);
  p = updateExerciseState(p, 'm2', 'e1', false, (s) => declareAttempt(s, false));
  return p;
}

function accepted(text: string): Progress {
  const result = parseBackup(text);
  if (!result.ok) throw new Error(`expected an accepted backup, got: ${result.error}`);
  return result.progress;
}

function rejection(value: unknown): string {
  const result = parseBackup(JSON.stringify(value));
  if (result.ok) throw new Error('expected the file to be rejected');
  return result.error;
}

it('names the file exactly as the design handoff specifies', () => {
  expect(BACKUP_FILENAME).toBe('bora-py-progress.json');
});

it('export → import round-trips the stored state exactly', () => {
  const progress = workedProgress();
  expect(accepted(serializeProgress(progress))).toEqual(progress);
});

it('an empty state round-trips too', () => {
  expect(accepted(serializeProgress(emptyProgress()))).toEqual(emptyProgress());
});

describe('rejection — a bad file changes nothing', () => {
  it('rejects a file that is not JSON', () => {
    const result = parseBackup('{ not json');
    expect(result.ok).toBe(false);
  });

  it('rejects JSON that is not a progress object', () => {
    expect(rejection([1, 2, 3])).toContain(BACKUP_FILENAME);
    expect(rejection(null)).toContain(BACKUP_FILENAME);
    expect(rejection({ hello: 'world' })).toContain(BACKUP_FILENAME);
  });

  it('rejects another version and says which one it read', () => {
    expect(rejection({ version: 2, modules: {} })).toContain('version 2');
  });

  it('rejects a broken module record', () => {
    expect(rejection({ version: 1, modules: { m1: 'passed' } })).toContain('m1');
    expect(
      rejection({ version: 1, modules: { m1: { exercises: {}, passed: 'yes', cardCracks: 0 } } }),
    ).toContain('m1');
    expect(rejection({ version: 1, modules: { m1: { exercises: {}, passed: true } } })).toContain(
      'm1',
    );
    expect(rejection({ version: 1, modules: [] })).toContain('module list');
  });

  it('rejects a broken exercise state', () => {
    const broken = (exercise: unknown) => ({
      version: 1,
      modules: { m1: { exercises: { e1: exercise }, passed: false, cardCracks: 0 } },
    });
    expect(rejection(broken({ attempts: -1, hintsUnlocked: 0, matched: false, solutionRevealed: false }))).toContain('m1');
    expect(rejection(broken({ attempts: 1, hintsUnlocked: 3, matched: false, solutionRevealed: false }))).toContain('m1');
    expect(rejection(broken({ attempts: 1, hintsUnlocked: 1, matched: 'yes', solutionRevealed: false }))).toContain('m1');
    expect(rejection(broken({ attempts: 1, hintsUnlocked: 1, matched: false }))).toContain('m1');
  });

  it('every rejection says nothing was changed', () => {
    expect(rejection([1])).toContain('nothing was changed');
    expect(rejection({ version: 9, modules: {} })).toContain('Nothing was changed');
  });
});

it('keeps only the §4 fields — junk in the file is never stored', () => {
  const progress = accepted(
    JSON.stringify({
      version: 1,
      nickname: 'not part of the shape',
      modules: {
        m1: {
          exercises: { e1: { attempts: 2, hintsUnlocked: 1, matched: true, solutionRevealed: false, stuck: false, note: 'x' } },
          passed: true,
          cardCracks: 1,
          extra: 42,
        },
      },
    }),
  );
  expect(Object.keys(progress).sort()).toEqual(['modules', 'version']);
  expect(Object.keys(progress.modules.m1).sort()).toEqual(['cardCracks', 'exercises', 'passed']);
  expect(Object.keys(progress.modules.m1.exercises.e1).sort()).toEqual([
    'attempts',
    'hintsUnlocked',
    'matched',
    'solutionRevealed',
    'stuck',
  ]);
});

it('accepts a file without the ladder bookkeeping field, defaulting it', () => {
  const progress = accepted(
    JSON.stringify({
      version: 1,
      modules: {
        m1: {
          exercises: { e1: { attempts: 1, hintsUnlocked: 0, matched: false, solutionRevealed: false } },
          passed: false,
          cardCracks: 0,
        },
      },
    }),
  );
  expect(progress.modules.m1.exercises.e1.stuck).toBe(false);
});

// #87 changed no stored field, so a file exported before it still imports —
// and the state it describes (Module 00 reset away, Module 01 midway) now reads
// back as reachable rather than stranded.
describe('a file exported by an earlier build', () => {
  const exported = JSON.stringify({
    version: 1,
    modules: {
      m1: {
        exercises: { e1: { attempts: 3, hintsUnlocked: 2, matched: false, solutionRevealed: true } },
        passed: false,
        cardCracks: 2,
      },
    },
  });

  it('imports whole, with the work intact', () => {
    const progress = accepted(exported);
    expect(progress.modules.m1.exercises.e1.solutionRevealed).toBe(true);
    expect(progress.modules.m1.cardCracks).toBe(2);
  });

  it('reads back as a module with saved work', () => {
    expect(hasModuleProgress(accepted(exported), 'm1')).toBe(true);
  });

  it('takes an empty module entry without throwing, and calls it no work', () => {
    const progress = accepted(
      JSON.stringify({ version: 1, modules: { m1: { exercises: {}, passed: false, cardCracks: 0 } } }),
    );
    expect(progress.modules.m1).toEqual({ exercises: {}, passed: false, cardCracks: 0 });
    expect(hasModuleProgress(progress, 'm1')).toBe(false);
  });
});
