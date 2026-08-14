// PWA contract (ENGINEERING.md §9): silent auto-update, a manifest that
// survives a subpath deploy, brand icons that exist on disk, and a precache
// wide enough to hold the whole app offline.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { includedAssets, pwaOptions, webManifest } from './manifest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = webManifest;
const workbox = pwaOptions.workbox!;

it('updates silently — no prompt, new worker takes over on next launch', () => {
  expect(pwaOptions.registerType).toBe('autoUpdate');
  expect(workbox.clientsClaim).toBe(true);
  expect(workbox.cleanupOutdatedCaches).toBe(true);
});

it('names the app bora.py, never the working title PyLearn', () => {
  expect(manifest.name).toBe('bora.py');
  expect(manifest.short_name).toBe('bora.py');
  expect(JSON.stringify(manifest)).not.toMatch(/PyLearn/i);
});

it('installs standalone and portrait in the brand colours', () => {
  expect(manifest.display).toBe('standalone');
  expect(manifest.orientation).toBe('portrait');
  expect(manifest.theme_color).toBe('#ec3013');
  expect(manifest.background_color).toBe('#f3f2f2');
});

it('opts the viewport into the safe area, so an inset is real on a notched phone (#74)', () => {
  // Without `viewport-fit=cover`, every `env(safe-area-inset-*)` resolves to a
  // valid `0` on iPhone — nothing errors and nothing warns, so a clearance
  // written as `max(token, env(…))` silently collapses to its floor and the
  // bottom row of chrome sits under the home indicator. The bug is invisible on
  // this repo's dev host and on every desktop browser, which is why it is
  // pinned here rather than left to a visual check.
  const html = readFileSync(join(repoRoot, 'index.html'), 'utf8');
  expect(html).toContain(
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />',
  );
});

it('keeps every manifest URL relative so a subpath deploy still works', () => {
  expect(manifest.start_url).toBe('.');
  expect(manifest.scope).toBe('./');
  const urls = [
    ...manifest.icons!.map((icon) => icon.src),
    ...includedAssets,
  ];
  for (const url of urls) expect(url.startsWith('/')).toBe(false);
});

it('ships 192, 512 and maskable icons, and each file exists', () => {
  const icons = manifest.icons!;
  expect(icons.find((icon) => icon.sizes === '192x192')).toBeDefined();
  expect(icons.find((icon) => icon.sizes === '512x512' && icon.purpose === 'any')).toBeDefined();
  expect(icons.find((icon) => icon.purpose === 'maskable')).toBeDefined();
  for (const icon of icons) expect(existsSync(join(repoRoot, 'public', icon.src))).toBe(true);
  for (const asset of includedAssets) {
    expect(existsSync(join(repoRoot, 'public', asset))).toBe(true);
  }
});

// #99 — the full required set (§13), by name, so a file quietly going
// missing from disk fails here even if it slipped out of `icons` or
// `includedAssets` too.
it('has the whole §13 required icon set on disk: source SVG, 192, 512, maskable, apple-touch, favicon-32', () => {
  const required = [
    'favicon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable-512.png',
    'icons/apple-touch-icon-180.png',
    'icons/favicon-32.png',
  ];
  for (const file of required) expect(existsSync(join(repoRoot, 'public', file))).toBe(true);
});

it('precaches the shell, the photocard art and the icons, and falls back to it offline', () => {
  const patterns = workbox.globPatterns!.join(' ');
  for (const extension of ['html', 'js', 'css', 'svg', 'png', 'woff2']) {
    expect(patterns).toContain(extension);
  }
  // Hash routing: every deep link is index.html, so offline navigation needs it.
  expect(workbox.navigateFallback).toBe('index.html');
});

it('talks to no third-party origin at runtime — Archivo is self-hosted (#95)', () => {
  expect(workbox.runtimeCaching).toEqual([]);
});

it('ships the three self-hosted Archivo weights the token ramp uses, and precaches them', () => {
  const fontsDir = join(
    repoRoot,
    'design/_ds/modernist-86c43557-9db6-4330-a863-9ea3a48fad23/fonts',
  );
  for (const weight of ['400', '600', '800']) {
    expect(existsSync(join(fontsDir, `archivo-${weight}.woff2`))).toBe(true);
  }
  // globPatterns' woff2 entry (asserted above) is what pulls these hashed
  // build outputs into the precache — there is no separate font-specific rule.
  expect(workbox.globPatterns!.join(' ')).toContain('woff2');
});
