/**
 * The list is one list (#100). `tools/strings-check.ts` fails a build over a missing key and
 * `t()` reads by the same names — both off the SAME array. A second copy anywhere would let the
 * build bless a pack the app cannot read, or the app expect a key no build ever demanded.
 */
import { describe, expect, it } from 'vitest';
import { STRINGS_KEYS, STRINGS_PLACEHOLDERS } from './stringsKeys';

describe('the canonical key list', () => {
  it('has no duplicate keys', () => {
    expect(new Set(STRINGS_KEYS).size).toBe(STRINGS_KEYS.length);
  });

  it('carries a placeholder row for every key — the two tables are welded', () => {
    expect(Object.keys(STRINGS_PLACEHOLDERS).sort()).toEqual([...STRINGS_KEYS].sort());
  });

  it('every key is a dot-path of lowerCamelCase segments', () => {
    const shape = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/;
    for (const key of STRINGS_KEYS) expect(key).toMatch(shape);
  });
});
