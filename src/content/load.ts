// Loader: maps the shipped curriculum.json shape (top-level `modules` map
// keyed by id, `tiers` referencing module ids) into the ENGINEERING.md §3 types.
import raw from '../../content/curriculum.json';
import type { Curriculum, Exercise, Module, Tier } from './types';

// Shape of design/content/curriculum.json as delivered by the design handoff.
type RawExercise = {
  id: string;
  title?: string;
  prompt: string;
  expectedOutput: string;
  inputsToType?: string[];
  hints: string[];
  solution: string;
  approachChecklist: string[];
  isExit?: boolean;
};

type RawModule = {
  id: string;
  num: string;
  tier: number;
  title: string;
  anchor: string;
  photocard: { id: string; title: string; art?: string };
  concept: { intro: string; examples: { code: string; output: string; why: string }[] };
  exercises: RawExercise[];
  exitExercise: RawExercise;
};

type RawTier = { id: string; title: string; era: string; modules: string[] };

type RawCurriculum = {
  version: number;
  brand: string;
  tiers: RawTier[];
  modules: Record<string, RawModule>;
};

function toExercise(rawExercise: RawExercise): Exercise {
  return {
    id: rawExercise.id,
    ...(rawExercise.title ? { title: rawExercise.title } : {}),
    prompt: rawExercise.prompt,
    expectedOutput: rawExercise.expectedOutput,
    ...(rawExercise.inputsToType ? { inputsToType: rawExercise.inputsToType } : {}),
    // Exit exercises ship with zero hints (authoring rule); formative
    // exercises always ship exactly two.
    hints: rawExercise.hints as [string, string],
    solution: rawExercise.solution,
    approachChecklist: rawExercise.approachChecklist,
    ...(rawExercise.isExit ? { isExit: true } : {}),
  };
}

function toModule(rawModule: RawModule): Module {
  return {
    id: rawModule.id,
    title: rawModule.title,
    anchor: rawModule.anchor,
    concept: rawModule.concept,
    exercises: rawModule.exercises.map(toExercise),
    exitExercise: toExercise(rawModule.exitExercise),
    photocard: {
      id: rawModule.photocard.id,
      title: rawModule.photocard.title,
      art: rawModule.photocard.art ?? '', // art not authored yet in the handoff JSON
    },
  };
}

export function loadCurriculum(): Curriculum {
  const data = raw as unknown as RawCurriculum;
  const tiers: Tier[] = data.tiers.map((tier) => ({
    id: tier.id,
    title: tier.title,
    era: tier.era,
    modules: tier.modules.map((moduleId) => {
      const rawModule = data.modules[moduleId];
      if (!rawModule) throw new Error(`Tier ${tier.id} references unknown module "${moduleId}"`);
      return toModule(rawModule);
    }),
  }));
  return { tiers };
}

export function findModule(curriculum: Curriculum, moduleId: string): Module | undefined {
  for (const tier of curriculum.tiers) {
    const found = tier.modules.find((module) => module.id === moduleId);
    if (found) return found;
  }
  return undefined;
}

/** All modules in curriculum order — tiers are ordered, modules within each
 *  tier are ordered, so this flat sequence IS the unlock chain order. */
export function flatModules(curriculum: Curriculum): Module[] {
  return curriculum.tiers.flatMap((tier) => tier.modules);
}

export function findTierOf(curriculum: Curriculum, moduleId: string): Tier | undefined {
  return curriculum.tiers.find((tier) => tier.modules.some((module) => module.id === moduleId));
}

/** Two-digit module number by curriculum position ("00", "01", …) — matches
 *  the handoff numbering, where m0 is 00. */
export function moduleNumberOf(curriculum: Curriculum, moduleId: string): string {
  const index = flatModules(curriculum).findIndex((module) => module.id === moduleId);
  return String(Math.max(0, index)).padStart(2, '0');
}
