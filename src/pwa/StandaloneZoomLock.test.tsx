// StandaloneZoomLock's contract (#98) — pinned in three parts, for three
// kinds of fact this repo's jsdom-free suite (src/App.test.tsx) can check
// without a document:
//
// 1. computeViewportContent, the pure string transform the component's
//    effect calls — every case a real launch can produce.
// 2. That the static tag in index.html carries no zoom flags (the existing
//    manifest.test.ts assertion this must never regress).
// 3. That the component is actually rendered from src/main.tsx, read as
//    source — the one fact this repo's renderToString pattern cannot show
//    for a component whose whole job runs inside a mount effect (SSR never
//    fires effects, so a render of it here would only prove it returns
//    null, not that it does anything).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeViewportContent } from './StandaloneZoomLock';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** What index.html's static tag actually reads (pinned by
 *  src/pwa/manifest.test.ts) — the string every case below amends. */
const STATIC_CONTENT = 'width=device-width, initial-scale=1.0, viewport-fit=cover';

describe('computeViewportContent', () => {
  it('locks zoom from a home-screen launch — while keeping viewport-fit=cover', () => {
    const content = computeViewportContent(STATIC_CONTENT, true);
    expect(content).toContain('maximum-scale=1');
    expect(content).toContain('user-scalable=no');
    // THE ASSERTION THAT MATTERS. viewport-fit=cover is what turns every
    // env(safe-area-inset-*) on; losing it silently regresses the bottom
    // nav's home-indicator padding (src/bottomnav.css) in exactly the mode
    // this component acts on. A transform that wrote a hardcoded content
    // string would pass every other assertion here and fail this one.
    expect(content).toContain('viewport-fit=cover');
    expect(content).toContain('width=device-width');
    expect(content).toContain('initial-scale=1.0');
  });

  it('leaves a browser tab untouched', () => {
    expect(computeViewportContent(STATIC_CONTENT, false)).toBe(STATIC_CONTENT);
  });

  it('is idempotent: locking twice does not duplicate the directives', () => {
    const once = computeViewportContent(STATIC_CONTENT, true);
    const twice = computeViewportContent(once, true);
    expect(twice).toBe(once);
    expect(twice.match(/user-scalable=no/g)).toHaveLength(1);
    expect(twice.match(/maximum-scale=1/g)).toHaveLength(1);
  });

  it('reads the CURRENT content rather than a captured original, so it cannot get stuck locked', () => {
    const locked = computeViewportContent(STATIC_CONTENT, true);
    // A later display-mode change (installed app opened back out into a tab)
    // must lift the lock from whatever the tag currently holds.
    expect(computeViewportContent(locked, false)).toBe(STATIC_CONTENT);
  });

  it('preserves every other directive, in order, on both sides of the lock', () => {
    const withExtra = 'width=device-width, initial-scale=1.0, viewport-fit=cover, minimum-scale=1';
    const locked = computeViewportContent(withExtra, true);
    expect(locked.indexOf('width=device-width')).toBeLessThan(locked.indexOf('viewport-fit=cover'));
    expect(locked.indexOf('viewport-fit=cover')).toBeLessThan(locked.indexOf('minimum-scale=1'));
    expect(locked.indexOf('minimum-scale=1')).toBeLessThan(locked.indexOf('maximum-scale=1'));
    expect(computeViewportContent(locked, false)).toBe(withExtra);
  });
});

it('the static viewport tag carries no zoom flags — the component amends it, never the HTML', () => {
  const html = readFileSync(join(repoRoot, 'index.html'), 'utf8');
  expect(html).toContain(
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
  );
  expect(html).not.toMatch(/maximum-scale|user-scalable/);
});

it('is rendered once, near the root, in src/main.tsx', () => {
  const main = readFileSync(join(repoRoot, 'src/main.tsx'), 'utf8');
  expect(main).toContain("import StandaloneZoomLock from './pwa/StandaloneZoomLock'");
  expect(main.match(/<StandaloneZoomLock \/>/g)).toHaveLength(1);
});
