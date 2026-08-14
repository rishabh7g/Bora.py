// Guards #95: Archivo is self-hosted, and the app talks to no third-party
// font origin at all. This scans source rather than trusting the manifest
// alone, because the regression that shipped originally was a CSS `@import`
// in design/_ds — not a runtimeCaching rule — so the check has to look at the
// bytes that end up in the bundle, not just the PWA config.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const thisFile = fileURLToPath(import.meta.url);

// Built from parts so this guard's own source does not trip itself.
const GOOGLE_FONTS_HOSTS = ['fonts', 'googleapis', 'com'].join('.');
const GOOGLE_STATIC_HOST = ['fonts', 'gstatic', 'com'].join('.');
const FORBIDDEN = new RegExp(`${GOOGLE_FONTS_HOSTS}|${GOOGLE_STATIC_HOST}`);

// Design prototypes (design/*.html) ship nothing and are out of scope — only
// the design system's own stylesheet (design/_ds/**) and the app (src/**)
// are ever bundled.
const SCAN_ROOTS = ['src', 'design/_ds'];

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

describe('no third-party font origin anywhere in the shipped source (#95)', () => {
  for (const root of SCAN_ROOTS) {
    it(`${root}/ never mentions fonts.googleapis.com or fonts.gstatic.com`, () => {
      const files = collectFiles(join(repoRoot, root)).filter((file) => file !== thisFile);
      const offenders = files.filter((file) => FORBIDDEN.test(readFileSync(file, 'utf8')));
      expect(offenders).toEqual([]);
    });
  }
});
