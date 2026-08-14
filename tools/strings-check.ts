/**
 * Strings-pack completeness check (#100, ui-baseline §8 "Copy & strings — One keyed bundle").
 *
 * `npm run build` runs this before `vite build`. A pack that is missing a key, carries an empty
 * value, ships a key the app will never read, or gets a `{placeholder}` wrong FAILS THE BUILD —
 * not a warning — because there is no fallback copy anywhere in the shell (`src/strings/t.ts`
 * throws rather than guessing). A key that slipped through missing would be a blank line on
 * screen, not an English word.
 *
 * Four rules, all keyed off `src/strings/stringsKeys.ts` (the only list in the repo):
 *   1. every canonical key is present — flattened on `.`, because the authored pack is nested;
 *   2. every value is a non-empty string;
 *   3. no extra keys — the typo tripwire: a key the app will never read sits quietly beside a
 *      missing real one without this rule;
 *   4. placeholder parity — a value carries exactly its canonical `{placeholders}`, so a pack
 *      cannot silently drop `{count}` or invent `{amount}`.
 *
 * Every message names the pack and the key, because "a string is missing" is useless once there
 * is more than one pack.
 */
import { STRINGS_KEYS, STRINGS_PLACEHOLDERS, type StringsKey } from '../src/strings/stringsKeys.ts';
import { en } from '../src/strings/en.ts';

/* ------------------------------------------------------------------ contract */

/** `{count}` and friends. Non-greedy by construction: braces cannot nest. */
const PLACEHOLDER = /\{[^{}]*\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Nested pack -> dot-paths: `{"home":{"lede":"…"}}` becomes `home.lede`.
 *
 * Only non-empty plain objects are containers. An empty one and an array are kept as leaf
 * values, so they surface as "must be a non-empty string" or "unknown key" instead of vanishing
 * from the comparison — a branch that disappears silently is how a pack passes a completeness
 * check while shipping nothing.
 */
export function flattenStrings(value: Record<string, unknown>, prefix = ''): Map<string, unknown> {
  const flat = new Map<string, unknown>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (isRecord(child) && Object.keys(child).length > 0) {
      for (const [nested, leaf] of flattenStrings(child, path)) flat.set(nested, leaf);
    } else {
      flat.set(path, child);
    }
  }
  return flat;
}

/** What a value IS, for a message that says why it was rejected. */
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (isRecord(value)) return Object.keys(value).length === 0 ? 'an empty object' : 'an object';
  if (typeof value === 'string') return value === '' ? 'an empty string' : 'a blank string';
  return `a ${typeof value}`;
}

/** The bare names inside a value's `{placeholders}`, as a set — order and repetition are the
 *  pack's business. */
function placeholdersIn(value: string): Set<string> {
  return new Set((value.match(PLACEHOLDER) ?? []).map((match) => match.slice(1, -1)));
}

function listPlaceholders(names: Iterable<string>): string {
  const sorted = [...names].sort();
  return sorted.length === 0 ? 'none' : sorted.join(' ');
}

/* --------------------------------------------------------------------- check */

/**
 * Returns one line per problem, each naming `<packName> pack` and the key; an empty array means
 * the pack is complete.
 */
export function checkStrings(pack: unknown, packName: string): string[] {
  const label = `${packName} pack`;
  if (!isRecord(pack)) {
    return [`${label}: must be an object of microcopy keys, not ${describe(pack)}`];
  }

  const flat = flattenStrings(pack);
  const issues: string[] = [];
  const canonical: readonly string[] = STRINGS_KEYS;

  for (const key of STRINGS_KEYS) {
    if (!flat.has(key)) {
      issues.push(`${label}: missing key "${key}"`);
      continue;
    }
    const value = flat.get(key);
    if (typeof value !== 'string' || value.trim() === '') {
      issues.push(`${label}: "${key}" must be a non-empty string — got ${describe(value)}`);
      continue;
    }
    issues.push(...checkPlaceholders(value, key, label));
  }

  for (const key of flat.keys()) {
    if (canonical.includes(key)) continue;
    issues.push(`${label}: unknown key "${key}" — not in the canonical list (src/strings/stringsKeys.ts)`);
  }

  return issues;
}

/** Rule 4, split out: parity against the canonical set, plus the stray brace that hides a typo. */
function checkPlaceholders(value: string, key: StringsKey, label: string): string[] {
  const issues: string[] = [];
  const expected = new Set(STRINGS_PLACEHOLDERS[key]);
  const found = placeholdersIn(value);

  const missing = [...expected].filter((name) => !found.has(name));
  const unexpected = [...found].filter((name) => !expected.has(name));
  if (missing.length > 0 || unexpected.length > 0) {
    issues.push(
      `${label}: "${key}" placeholders — expected ${listPlaceholders(expected)}, ` +
        `found ${listPlaceholders(found)}`,
    );
  }

  // `{count` renders as literal text and matches nothing above; catch it where it is written.
  if (/[{}]/.test(value.replace(PLACEHOLDER, ''))) {
    issues.push(`${label}: "${key}" has a stray { or } — placeholders are written {likeThis}`);
  }

  return issues;
}

/* --------------------------------------------------------------------- packs */

/** Every pack the build ships. One entry today; a new locale is a new entry here. */
const PACKS: ReadonlyArray<{ name: string; data: unknown }> = [{ name: 'en', data: en }];

/* ------------------------------------------------------------------------ CLI */

function main(): void {
  const issues = PACKS.flatMap(({ name, data }) => checkStrings(data, name));
  if (issues.length > 0) {
    console.error(`strings-check: ${issues.length} problem(s):\n`);
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log(`strings-check: ok — ${PACKS.length} pack(s), ${STRINGS_KEYS.length} keys each.`);
}

// Only run the CLI when this file is executed directly (`node tools/strings-check.ts`), not when
// the test file below imports `checkStrings`/`flattenStrings`.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
