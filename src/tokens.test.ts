// Contract for the app's text roles (src/tokens.css, DESIGN.md §7a).
//
// These are file-level guards rather than render tests on purpose: the values
// under test are CSS custom properties and one component override, which jsdom
// does not resolve, and the real ratios are measured in a browser by
// `node scripts/contrast-audit.mjs`. What a unit test *can* protect is the
// decision — that small interactive text keeps taking the accessible accent
// step, that display red stays where it belongs, and that the audit still has a
// row for every link the fix covers, so the measurement cannot go stale (#55).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = readFileSync(join(repoRoot, 'src/tokens.css'), 'utf8');
const audit = readFileSync(join(repoRoot, 'scripts/contrast-audit.mjs'), 'utf8');

// Every link and ghost button in the app, by the class its screen gives it.
const linkClasses = [
  'home-shelflink',
  'mod-back',
  'ex-back',
  'shelf-back',
  'set-back',
  'setup-back',
];

it('pins each text role to a ramp step, never a raw hex', () => {
  for (const role of ['--color-text-quiet', '--color-text-locked', '--color-text-accent']) {
    expect(tokens).toMatch(new RegExp(`${role}:\\s*var\\(--color-[a-z0-9-]+\\)`));
  }
  // Comments cite #ec3013 as the measured value it replaces; declarations may not.
  const declarations = tokens
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => line.includes(':'));
  expect(declarations.filter((line) => /#[0-9a-f]{3,8}\b/i.test(line))).toEqual([]);
});

it('sets small accent text to the accessible accent step', () => {
  expect(tokens).toContain('--color-text-accent: var(--color-accent-700);');
});

it('routes links and ghost buttons through the accent text role (#55)', () => {
  // The design system paints `a` / `.btn-ghost` in --color-accent (3.76:1) and
  // this app renders them all at 13px/800, so both selectors take the role.
  expect(tokens).toMatch(/a,\s*\.btn-ghost\s*\{\s*color:\s*var\(--color-text-accent\);\s*\}/);
});

it('keeps every link covered by the contrast audit', () => {
  for (const className of linkClasses) {
    expect(audit).toContain(`.${className}`);
  }
});

it('routes the UP NEXT chip label through the accent text role, border unmoved (#59)', () => {
  // The design system paints .tag-outline's label and border in --color-accent
  // (3.76:1). The label is 11px/400 and needs the 4.5:1 text floor, so it joins
  // --color-text-accent. The border is a non-text UI boundary held to 3:1,
  // which --color-accent already clears, so only `color` moves here.
  expect(tokens).toMatch(/\.tag-outline\s*\{\s*color:\s*var\(--color-text-accent\);\s*\}/);
  expect(audit).toContain('.home-row--current .home-chip');
});
