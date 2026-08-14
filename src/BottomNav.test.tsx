// The bottom nav's contract (#75) — what it renders, and the layout rules the
// rendered HTML cannot show.
//
// Two halves, for two kinds of fact. The markup is asserted through
// `renderToString` like every other screen here: three links, in order, each
// with the accessible name its icon cannot give it, and `aria-current` on the
// one destination being shown. The layout rules are asserted by reading
// src/bottomnav.css as text, the way src/tokens.test.ts and the shell guard in
// src/App.test.tsx do: this suite has no jsdom, and a jsdom would resolve
// neither `env()` nor `max()` if it had one. Comments are stripped before
// matching, so a guard can never pass on a comment quoting the very value the
// rule it describes was deleted from.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import BottomNav from './BottomNav';
import { HOME_ROUTE, SETTINGS_ROUTE, SHELF_ROUTE } from './HomeMap';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(repoRoot, 'src/bottomnav.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

const render = (screen: string) => renderToString(<BottomNav screen={screen} />);

/** Every `<a …>` opening tag, in document order. */
const links = (html: string) => html.match(/<a\b[^>]*>/g) ?? [];

it('offers exactly three destinations, in the order Map · Shelf · Settings', () => {
  const items = links(render('home'));
  expect(items).toHaveLength(3);
  expect(items[0]).toContain(`href="${HOME_ROUTE}"`);
  expect(items[1]).toContain(`href="${SHELF_ROUTE}"`);
  expect(items[2]).toContain(`href="${SETTINGS_ROUTE}"`);
  // The exported route constants, not retyped literals — the map and the nav
  // can never disagree about where a destination lives.
  expect([HOME_ROUTE, SHELF_ROUTE, SETTINGS_ROUTE]).toEqual(['#/', '#/shelf', '#/settings']);
  expect(readFileSync(join(repoRoot, 'src/BottomNav.tsx'), 'utf8')).not.toMatch(/'#\//);
});

it('names every item, because an icon-only link has no other accessible name', () => {
  const items = links(render('home'));
  expect(items.map((item) => /aria-label="([^"]+)"/.exec(item)?.[1])).toEqual([
    'Map',
    'Shelf',
    'Settings',
  ]);
  expect(render('home')).toContain('aria-hidden="true"');
});

it('keeps the label in the DOM at every width — only its display changes (#97)', () => {
  // Icon-only below 768px is bottomnav.css hiding a real element, not an
  // absent one: the >=768px rail has real text to reveal.
  const html = render('home');
  expect(html).toContain('<span class="bottomnav-label">Map</span>');
  expect(html).toContain('<span class="bottomnav-label">Shelf</span>');
  expect(html).toContain('<span class="bottomnav-label">Settings</span>');
  expect(css).toMatch(/\.bottomnav-label\s*\{\s*display:\s*none;\s*\}/);
});

it('marks the destination being shown, and marks it exactly once', () => {
  for (const [screen, index] of [
    ['home', 0],
    ['shelf', 1],
    ['settings', 2],
  ] as const) {
    const items = links(render(screen));
    expect(items.filter((item) => item.includes('aria-current="page"'))).toHaveLength(1);
    expect(items[index]).toContain('aria-current="page"');
  }
});

it('marks nothing on setup, module and exercise — none of them is a destination', () => {
  for (const screen of ['setup', 'module']) {
    expect(render(screen)).not.toContain('aria-current');
    expect(links(render(screen))).toHaveLength(3); // still there, still reachable
  }
});

it('sits in the shell as a flex child, never as a bar floating over the screen', () => {
  expect(css).toMatch(/flex:\s*none/);
  expect(css).not.toMatch(/position:\s*fixed/);
  expect(css).not.toMatch(/z-index/);
  // Modernist system: radius 0 (design/README.md, DESIGN.md §7a).
  expect(css).not.toMatch(/border-radius/);
});

it('clears the home indicator with the design gap as the floor', () => {
  expect(css).toMatch(
    /padding-bottom:\s*max\(var\(--space-8\),\s*env\(safe-area-inset-bottom\)\)/,
  );
  // Never a bare env(): a desktop inset is 0 and the padding would vanish.
  const insets = css.match(/env\(safe-area-inset-[a-z]+\)/g) ?? [];
  const guarded = css.match(/max\([^;]*env\(safe-area-inset-[a-z]+\)/g) ?? [];
  expect(insets).toHaveLength(guarded.length);
  expect(insets).not.toHaveLength(0);
});

it('gives every item a thumb-sized target with no tap delay', () => {
  const item = /\.bottomnav-item\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(item).toContain('flex: 1');
  expect(item).toContain('min-height: 48px'); // above the app's 44px floor
  expect(item).toContain('touch-action: manipulation');
  expect(item).toContain('-webkit-tap-highlight-color: transparent');
});

it('becomes a 232px left rail at >=768px, icon beside a visible label (#97)', () => {
  const rail = /@media \(min-width: 768px\) \{\s*\.bottomnav\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(rail).toContain('grid-column: 1');
  expect(rail).toContain('flex-direction: column');
  expect(rail).toContain('width: var(--rail-width)');
  expect(rail).toContain('border-right');
  expect(rail).not.toMatch(/border-top:\s*2px/);

  const railLabel =
    /@media \(min-width: 768px\) \{[\s\S]*\.bottomnav-label\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(railLabel).toContain('display: block');
});

it('declares --rail-width and --icon-ui once, as tokens, never a literal repeated in a rule', () => {
  expect(css).toMatch(/--rail-width:\s*232px/);
  expect(css).toMatch(/--icon-ui:\s*20px/);
  // Every place the rail's width or the icon's size is USED reads the token —
  // no second "232px" or "20px" literal anywhere else in the file.
  const widthLiterals = css.match(/232px/g) ?? [];
  const iconLiterals = css.match(/20px/g) ?? [];
  expect(widthLiterals).toHaveLength(1);
  expect(iconLiterals).toHaveLength(1);
});

it('writes min-width only — no max-width rule pairs the same pixel value as either', () => {
  const breakpoints = [...css.matchAll(/@media \(([^)]*)\)/g)].map((match) => match[1]);
  expect(breakpoints).toEqual(['min-width: 768px', 'min-width: 1024px']);
});

it('takes its ink from the text roles, and accents exactly the current item', () => {
  const item = /\.bottomnav-item\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const current = /\.bottomnav-item\[aria-current='page'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(item).toContain('color: var(--color-text-quiet)');
  // The accessible accent step (6.41:1), not the display red (DESIGN.md §7a).
  expect(current).toContain('color: var(--color-text-accent)');
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
});
