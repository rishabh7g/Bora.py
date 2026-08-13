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
  // Only the deep screens keep a back link: the three nav destinations reach
  // each other from the bar, never from a body link (#83).
  'mod-back',
  'ex-back',
  'setup-back',
  // The bottom nav's three destinations are links too (#75), on every screen —
  // measured as icons rather than as text, see below (#76).
  'bottomnav-item',
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

it('measures the icon-only nav items at the non-text threshold (#76)', () => {
  // A nav item paints no text at all, so the audit's size/weight rule must not
  // be the thing that picks its threshold: an inherited font-size it never
  // paints would silently buy it 4.5:1. Both ink states are marked NON_TEXT and
  // held to the 3:1 of SC 1.4.11, sourced from the icon's own stroke — the same
  // text/non-text line DESIGN.md §7a already draws for .tag-outline's border.
  expect(audit).toContain("const NON_TEXT = 'non-text'");
  const navRows = (audit.match(/^\s*\[.*\.bottomnav-item.*$/gm) ?? []).map((row) => row.trim());
  expect(navRows).toHaveLength(2);
  expect(navRows.every((row) => row.endsWith('NON_TEXT],'))).toBe(true);
  expect(navRows[0]).toContain('[aria-current="page"]');
  expect(navRows[1]).toContain(':not([aria-current="page"])');
  // The ink measured is SVG paint (lucide's stroke="currentColor"), and the row
  // says which threshold it applied.
  expect(audit).toContain('nonText ? [style.stroke, style.fill, style.color] : [style.color]');
  expect(audit).toContain("basis: nonText ? 'icon(1.4.11)'");
});

it('routes the UP NEXT chip label through the accent text role, border unmoved (#59)', () => {
  // The design system paints .tag-outline's label and border in --color-accent
  // (3.76:1). The label is 11px/400 and needs the 4.5:1 text floor, so it joins
  // --color-text-accent. The border is a non-text UI boundary held to 3:1,
  // which --color-accent already clears, so only `color` moves here.
  expect(tokens).toMatch(/\.tag-outline\s*\{\s*color:\s*var\(--color-text-accent\);\s*\}/);
  expect(audit).toContain('.home-row--current .home-chip');
});
