/**
 * The shell copy lookup (#100). `t('home.lede')` reads the active pack (`en.ts` today) by the
 * canonical dot-path; `tools/strings-check.ts` is what makes that read safe — a pack that is
 * missing a key, or carries the wrong `{placeholders}`, never reaches `npm run build`'s output.
 *
 * There is no fallback string anywhere in this module on purpose: a key `checkStrings` let
 * through missing would otherwise be a blank line on screen, not an English word, which is
 * exactly the trade the build-time check is there to make safe.
 */
import { en } from './en';
import type { StringsKey } from './stringsKeys';

/** Nested authored file -> dot-path lookup, built once at module load. */
function flatten(value: Record<string, unknown>, prefix = ''): Map<string, string> {
  const flat = new Map<string, string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof child === 'string') {
      flat.set(path, child);
    } else if (child !== null && typeof child === 'object') {
      for (const [nestedKey, nestedValue] of flatten(child as Record<string, unknown>, path)) {
        flat.set(nestedKey, nestedValue);
      }
    }
  }
  return flat;
}

const FLAT: Map<string, string> = flatten(en);

/** `{name}` and friends. Non-greedy by construction: braces cannot nest. */
const PLACEHOLDER = /\{([^{}]*)\}/g;

/**
 * The one read every component uses. `values` fills a template's `{placeholders}` — the set
 * `tools/strings-check.ts` holds every key to at build time, so a call site either passes exactly
 * what the key needs or `tsc`/the checker catches the drift.
 */
export function t(key: StringsKey, values?: Readonly<Record<string, string | number>>): string {
  const template = FLAT.get(key);
  // Unreachable once `npm run build` has passed — the checker fails the build over any key the
  // pack does not carry. Kept as a loud runtime guard rather than a silent `?? ''` in case a test
  // or a dev server ever runs against an incomplete pack.
  if (template === undefined) {
    throw new Error(`t(): no value for "${key}" in the active pack`);
  }
  if (!values) return template;
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined ? placeholder : String(value);
  });
}
