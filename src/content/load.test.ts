import { describe, expect, it } from 'vitest';
import { findModule, loadCurriculum } from './load';

describe('loadCurriculum', () => {
  const curriculum = loadCurriculum();

  it('maps all tiers and resolves module id references', () => {
    expect(curriculum.tiers).toHaveLength(5);
    const moduleCount = curriculum.tiers.reduce((n, tier) => n + tier.modules.length, 0);
    expect(moduleCount).toBe(13);
  });

  it('maps Module 1 into the §3 content model', () => {
    const m1 = findModule(curriculum, 'm1');
    expect(m1).toBeDefined();
    expect(m1!.title).toBe('Variables + print');
    expect(m1!.concept.intro).toContain('variable');
    expect(m1!.concept.examples.length).toBeGreaterThan(0);
    for (const example of m1!.concept.examples) {
      expect(example.code).toBeTruthy();
      expect(example.output).toBeTruthy();
      expect(example.why).toBeTruthy();
    }
    expect(m1!.photocard.id).toBe('card-m1');
    expect(typeof m1!.photocard.art).toBe('string');
  });

  it('gives every formative exercise exactly two hints', () => {
    for (const tier of curriculum.tiers) {
      for (const module of tier.modules) {
        for (const exercise of module.exercises) {
          expect(exercise.hints).toHaveLength(2);
          expect(exercise.isExit).toBeUndefined();
        }
      }
    }
  });

  it('marks exit exercises with isExit and zero hints', () => {
    for (const tier of curriculum.tiers) {
      for (const module of tier.modules) {
        expect(module.exitExercise.isExit).toBe(true);
        expect(module.exitExercise.hints).toHaveLength(0);
      }
    }
  });

  it('returns undefined for unknown module ids', () => {
    expect(findModule(curriculum, 'nope')).toBeUndefined();
  });
});
