// PWA contract (ENGINEERING.md §9): silent auto-update, a manifest that
// survives a subpath deploy, brand icons that exist on disk, and a precache
// wide enough to hold the whole app offline.
import { existsSync } from 'node:fs';
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

it('precaches the shell, the photocard art and the icons, and falls back to it offline', () => {
  const patterns = workbox.globPatterns!.join(' ');
  for (const extension of ['html', 'js', 'css', 'svg', 'png']) {
    expect(patterns).toContain(extension);
  }
  // Hash routing: every deep link is index.html, so offline navigation needs it.
  expect(workbox.navigateFallback).toBe('index.html');
});

it('adds no analytics or error tracking — only the font CDN is cached at runtime', () => {
  const hosts = workbox.runtimeCaching!.map((rule) => String(rule.urlPattern));
  expect(hosts).toEqual([
    String(/^https:\/\/fonts\.googleapis\.com\//),
    String(/^https:\/\/fonts\.gstatic\.com\//),
  ]);
});
