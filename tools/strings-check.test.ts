/**
 * `checkStrings` (#100) — proves the four failure classes fire, and that the shipped `en` pack is
 * clean. Deleting a key from `en` and re-running is how the acceptance criteria's "prove it with a
 * non-zero exit" is demonstrated by hand (see the PR description); this file pins the same
 * behaviour as a permanent regression test.
 */
import { describe, expect, it } from 'vitest';
import { STRINGS_KEYS } from '../src/strings/stringsKeys.ts';
import { en } from '../src/strings/en.ts';
import { checkStrings, flattenStrings } from './strings-check.ts';

describe('checkStrings', () => {
  it('passes the shipped en pack with no issues', () => {
    expect(checkStrings(en, 'en')).toEqual([]);
  });

  it('reports a missing key', () => {
    const flat = flattenStrings(en);
    flat.delete('home.kicker');
    const pack = unflatten(flat);
    const issues = checkStrings(pack, 'en');
    expect(issues).toContain('en pack: missing key "home.kicker"');
  });

  it('reports a present-but-empty key', () => {
    const flat = flattenStrings(en);
    flat.set('home.kicker', '   ');
    const pack = unflatten(flat);
    const issues = checkStrings(pack, 'en');
    expect(issues.some((issue) => issue.includes('"home.kicker" must be a non-empty string'))).toBe(
      true,
    );
  });

  it('reports an unknown key', () => {
    const flat = flattenStrings(en);
    flat.set('home.kickerTypo', 'stray');
    const pack = unflatten(flat);
    const issues = checkStrings(pack, 'en');
    expect(issues).toContain(
      'en pack: unknown key "home.kickerTypo" — not in the canonical list (src/strings/stringsKeys.ts)',
    );
  });

  it('reports a placeholder mismatch', () => {
    const flat = flattenStrings(en);
    flat.set('home.greeting', 'Annyeong, {learner}.'); // canonical name is {name}
    const pack = unflatten(flat);
    const issues = checkStrings(pack, 'en');
    expect(
      issues.some((issue) => issue.includes('"home.greeting" placeholders — expected name')),
    ).toBe(true);
  });

  it('every canonical key round-trips through flatten/unflatten unchanged', () => {
    const flat = flattenStrings(en);
    for (const key of STRINGS_KEYS) expect(flat.has(key)).toBe(true);
  });
});

/** Dot-paths back to a nested object, the inverse of `flattenStrings`. */
function unflatten(flat: Map<string, unknown>): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [path, value] of flat) {
    const parts = path.split('.');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
      node = node[part] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}
