// The shipped curriculum carries only what the app reads.
//
// content/curriculum.json is authored with keys the pipeline needs — the lint,
// the handoff numbering, a brand string — that no screen ever reads. They are
// stripped from the bundled module at build time (the Vite plugin below), so
// the authored file keeps them for the validator and the emitted one does not
// carry them to every learner. src/content/load.ts types them optional for the
// same reason: it may be handed either shape.

/** Top-level keys of the raw curriculum with no reader in src/. */
export const PIPELINE_ONLY_ROOT_KEYS = ['version', 'brand'] as const;
/** Module keys with no reader: `num` and `tier` restate the position the
 *  tiers array already gives (content/load.moduleNumberOf, findTierOf). */
export const PIPELINE_ONLY_MODULE_KEYS = ['num', 'tier'] as const;
/** Exercise keys with no reader: `inputsToType` is the lint's (rule 2). */
export const PIPELINE_ONLY_EXERCISE_KEYS = ['inputsToType'] as const;

type Dict = Record<string, unknown>;

function without(record: Dict, keys: readonly string[]): Dict {
  const copy = { ...record };
  for (const key of keys) delete copy[key];
  return copy;
}

/** A structurally-typed pass over the raw JSON: the same object minus the
 *  pipeline-only keys at each level. Pure, so it is testable without Vite. */
export function stripPipelineKeys(raw: Dict): Dict {
  const modules = Object.fromEntries(
    Object.entries((raw.modules as Record<string, Dict>) ?? {}).map(([id, module]) => {
      const stripped = without(module, PIPELINE_ONLY_MODULE_KEYS);
      const strip = (exercise: Dict) => without(exercise, PIPELINE_ONLY_EXERCISE_KEYS);
      if (Array.isArray(stripped.exercises)) stripped.exercises = (stripped.exercises as Dict[]).map(strip);
      if (stripped.exitExercise) stripped.exitExercise = strip(stripped.exitExercise as Dict);
      return [id, stripped];
    }),
  );
  return { ...without(raw, PIPELINE_ONLY_ROOT_KEYS), modules };
}

/** Vite plugin: rewrite content/curriculum.json before the JSON plugin turns
 *  it into a module, in `npm run dev`, `vite build` and vitest alike. */
export function stripCurriculumPlugin() {
  return {
    name: 'bora-strip-pipeline-keys',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('/content/curriculum.json')) return null;
      return { code: JSON.stringify(stripPipelineKeys(JSON.parse(code) as Dict)), map: null };
    },
  };
}
