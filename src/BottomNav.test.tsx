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
  // Icon only: no visible text anywhere in the bar, and the glyph itself is
  // muted so the label is announced once.
  expect(render('home').replace(/<[^>]*>/g, '').trim()).toBe('');
  expect(render('home')).toContain('aria-hidden="true"');
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

it('takes its ink from the text roles, and accents exactly the current item', () => {
  const item = /\.bottomnav-item\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const current = /\.bottomnav-item\[aria-current='page'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  expect(item).toContain('color: var(--color-text-quiet)');
  // The accessible accent step (6.41:1), not the display red (DESIGN.md §7a).
  expect(current).toContain('color: var(--color-text-accent)');
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
});
