// The bundle ships only what the app reads (content/pipelineKeys.ts).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import raw from '../../content/curriculum.json';
import { loadCurriculum } from './load';
import { stripCurriculumPlugin, stripPipelineKeys } from './pipelineKeys';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const authored = JSON.parse(readFileSync(join(repoRoot, 'content/curriculum.json'), 'utf8'));

it('the authored file carries the pipeline keys; the stripped shape does not', () => {
  expect(authored.brand).toBe('bora.py');
  expect(authored.modules.m1.num).toBe('01');
  const stripped = stripPipelineKeys(authored);
  expect(stripped).not.toHaveProperty('brand');
  expect(stripped).not.toHaveProperty('version');
  for (const module of Object.values(stripped.modules as Record<string, Record<string, unknown>>)) {
    expect(module).not.toHaveProperty('num');
    expect(module).not.toHaveProperty('tier');
    for (const exercise of [...(module.exercises as object[]), module.exitExercise as object]) {
      expect(exercise).not.toHaveProperty('inputsToType');
    }
  }
  // Everything the app reads is still there.
  expect(stripped.tiers).toEqual(authored.tiers);
  expect((stripped.modules as Record<string, { concept: unknown }>).m1.concept).toEqual(
    authored.modules.m1.concept,
  );
});

it('the imported module is the stripped shape — the plugin ran (vite.config.ts)', () => {
  expect(raw).not.toHaveProperty('brand');
  expect((raw as { modules: Record<string, object> }).modules.m1).not.toHaveProperty('num');
  expect(loadCurriculum().tiers).toHaveLength(5);
});

it('the plugin touches only the curriculum file', () => {
  const plugin = stripCurriculumPlugin();
  expect(plugin.transform('{"brand":"x","modules":{}}', '/repo/content/curriculum.json')).toEqual({
    code: '{"modules":{}}',
    map: null,
  });
  expect(plugin.transform('{"brand":"x"}', '/repo/package.json')).toBeNull();
});
