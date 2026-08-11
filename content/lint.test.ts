import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { lintCurriculum, type RawCurriculum } from './lint';

type TestExercise = RawCurriculum['modules'][string]['exercises'][number];

const okExercise: TestExercise = {
  id: 'e1',
  prompt: 'Print hello.',
  expectedOutput: 'hello',
  hints: ['h1', 'h2'],
  solution: 'print("hello")',
  approachChecklist: ['print it'],
};

const okExit: TestExercise = {
  ...okExercise,
  id: 'exit',
  hints: [],
  isExit: true,
};

function makeCurriculum(overrides: {
  exercise?: Partial<TestExercise>;
  exit?: Partial<TestExercise>;
  art?: string;
  intro?: string;
}): RawCurriculum {
  return {
    tiers: [{ id: 't1', title: 'Tier 1', modules: ['m1'] }],
    modules: {
      m1: {
        id: 'm1',
        title: 'Module 1',
        photocard: { id: 'pc1', title: 'Card', art: overrides.art ?? '' },
        concept: { intro: overrides.intro ?? 'Intro text.', examples: [] },
        exercises: [{ ...okExercise, ...overrides.exercise }],
        exitExercise: { ...okExit, ...overrides.exit },
      },
    },
  };
}

describe('lintCurriculum', () => {
  it('passes a clean curriculum', () => {
    expect(lintCurriculum(makeCurriculum({}))).toEqual([]);
  });

  it('flags missing expectedOutput', () => {
    const violations = lintCurriculum(makeCurriculum({ exercise: { expectedOutput: '  ' } }));
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ moduleId: 'm1', exerciseId: 'e1' });
    expect(violations[0].message).toMatch(/expectedOutput/);
  });

  it.each(['import random\nprint(random.randint(1, 7))', 'import datetime', 'time.sleep(1)'])(
    'flags non-deterministic solution: %s',
    (solution) => {
      const violations = lintCurriculum(makeCurriculum({ exercise: { solution } }));
      expect(violations.some((v) => v.message.includes('deterministic'))).toBe(true);
    },
  );

  it('flags input() without inputsToType', () => {
    const violations = lintCurriculum(
      makeCurriculum({ exercise: { solution: 'name = input("Name? ")\nprint(name)' } }),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/inputsToType/);
  });

  it('accepts input() when inputsToType is defined', () => {
    const violations = lintCurriculum(
      makeCurriculum({
        exercise: { solution: 'name = input("Name? ")\nprint(name)', inputsToType: ['Riya'] },
      }),
    );
    expect(violations).toEqual([]);
  });

  it('flags exit exercises with hints', () => {
    const violations = lintCurriculum(makeCurriculum({ exit: { hints: ['nope'] } }));
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ moduleId: 'm1', exerciseId: 'exit' });
    expect(violations[0].message).toMatch(/zero hints/);
  });

  it('flags formative exercises without exactly 2 hints', () => {
    const violations = lintCurriculum(makeCurriculum({ exercise: { hints: ['only one'] } }));
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/exactly 2 hints/);
  });

  it('flags copyrighted lyric lines in exercise text', () => {
    const violations = lintCurriculum(
      makeCurriculum({ exercise: { prompt: 'Print "Smooth like butter" three times.' } }),
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/lyric/);
  });

  it('flags copyrighted lyric lines in concept text (module-level)', () => {
    const violations = lintCurriculum(makeCurriculum({ intro: "I'm the one I should love" }));
    expect(violations).toHaveLength(1);
    expect(violations[0].moduleId).toBe('m1');
    expect(violations[0].exerciseId).toBeUndefined();
  });

  it('allows member names, song titles, and years', () => {
    const violations = lintCurriculum(
      makeCurriculum({
        exercise: { prompt: 'Print Jungkook, RM, and the Butter release year 2021.' },
      }),
    );
    expect(violations).toEqual([]);
  });

  it('flags photocard art that references official imagery', () => {
    const violations = lintCurriculum(makeCurriculum({ art: 'https://example.com/official.jpg' }));
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toMatch(/original local svg/);
  });
});

describe('real curriculum', () => {
  it('content/curriculum.json passes the lint', () => {
    const curriculumPath = join(dirname(fileURLToPath(import.meta.url)), 'curriculum.json');
    const curriculum = JSON.parse(readFileSync(curriculumPath, 'utf8')) as RawCurriculum;
    expect(lintCurriculum(curriculum)).toEqual([]);
  });
});
