import { describe, expect, it } from 'vitest';
import { buildCurriculum, CurriculumError, findModule, loadCurriculum, photocardArtUrl } from './load';

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

describe('photocard art', () => {
  const curriculum = loadCurriculum();

  it('resolves every photocard to its original local SVG', () => {
    for (const tier of curriculum.tiers) {
      for (const module of tier.modules) {
        expect(module.photocard.art, `${module.id} art`).toMatch(/card-.+\.svg/);
        expect(module.photocard.art).not.toMatch(/^https?:/);
      }
    }
  });

  it('resolves an unknown art file name to an empty ref (content lint blocks it)', () => {
    expect(photocardArtUrl('not-a-real-card.svg')).toBe('');
  });
});

describe('a curriculum whose content will not load (#96)', () => {
  it('throws a typed CurriculumError, not a bare Error, naming the tier and the missing module', () => {
    const broken = {
      version: 1,
      brand: 'bora.py',
      tiers: [{ id: 't1', title: 'Tier One', era: 'now', modules: ['ghost-module'] }],
      modules: {},
    };
    let caught: unknown;
    try {
      buildCurriculum(broken as never);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CurriculumError);
    const error = caught as CurriculumError;
    expect(error.url).toBe('content/curriculum.json');
    expect(error.reason).toContain('t1');
    expect(error.reason).toContain('ghost-module');
  });
});
