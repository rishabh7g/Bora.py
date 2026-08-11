// Progress persistence — ENGINEERING.md §4 shapes, write-through semantics.
// idb-keyval is mocked with an in-memory map: asserts every change is written
// through and that a fresh load returns the full persisted state ("survives
// reload" at the storage boundary).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { declareAttempt, declareMatch, viewHint } from './effortGate';

const memory = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => memory.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    memory.set(key, value);
  }),
}));

const { emptyProgress, exerciseStateOf, loadProgress, PROGRESS_KEY, saveProgress, updateExerciseState } =
  await import('./progress');

beforeEach(() => memory.clear());

describe('updateExerciseState (pure)', () => {
  it('applies a gate transition and stores the §4 shape', () => {
    const p = updateExerciseState(emptyProgress(), 'm1', 'e1', false, (s) => declareAttempt(s, false));
    const s = exerciseStateOf(p, 'm1', 'e1');
    expect(s.attempts).toBe(1);
    expect(p.modules.m1.passed).toBe(false);
    expect(p.modules.m1.cardCracks).toBe(0);
  });

  it('recomputes cardCracks when a hint is viewed', () => {
    let p = emptyProgress();
    p = updateExerciseState(p, 'm1', 'e1', false, (s) => declareAttempt(s, false));
    p = updateExerciseState(p, 'm1', 'e1', false, (s) => viewHint(s, 1, false));
    expect(p.modules.m1.cardCracks).toBe(1);
  });

  it('marks the module passed when the exit exercise matches', () => {
    const p = updateExerciseState(emptyProgress(), 'm1', 'exit', true, declareMatch);
    expect(p.modules.m1.passed).toBe(true);
  });

  it('a formative match never passes the module', () => {
    const p = updateExerciseState(emptyProgress(), 'm1', 'e1', false, declareMatch);
    expect(p.modules.m1.passed).toBe(false);
  });

  it('returns the SAME object for an illegal (no-op) transition — no wasted writes', () => {
    const p = emptyProgress();
    expect(updateExerciseState(p, 'm1', 'e1', false, (s) => viewHint(s, 1, false))).toBe(p);
  });
});

describe('write-through persistence', () => {
  it('saveProgress → loadProgress round-trips the full state', async () => {
    let p = emptyProgress();
    p = updateExerciseState(p, 'm1', 'e1', false, (s) => declareAttempt(s, false));
    p = updateExerciseState(p, 'm1', 'e1', false, (s) => viewHint(s, 1, false));
    p = updateExerciseState(p, 'm1', 'exit', true, declareMatch);
    await saveProgress(p);

    const reloaded = await loadProgress(); // fresh read = reload
    expect(reloaded).toEqual(p);
    expect(exerciseStateOf(reloaded, 'm1', 'e1').hintsUnlocked).toBe(1);
    expect(reloaded.modules.m1.passed).toBe(true);
  });

  it('writes land under the stable key', async () => {
    await saveProgress(emptyProgress());
    expect(memory.has(PROGRESS_KEY)).toBe(true);
  });

  it('loadProgress returns empty v1 progress when nothing is stored', async () => {
    expect(await loadProgress()).toEqual({ version: 1, modules: {} });
  });
});
