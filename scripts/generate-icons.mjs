// Renders the PWA icon PNGs from the brand SVGs (design/brand/*.svg).
//
// The PNGs are committed to `public/icons/` — CI never runs this. Re-run it by
// hand whenever the mark changes:
//
//   node scripts/generate-icons.mjs            # finds a local Chrome/Chromium
//   CHROME_BIN=/path/to/chrome node scripts/generate-icons.mjs
//
// Rasterising needs a browser because this repo has no image toolchain and adds
// no dependency for a once-a-brand-change job (ENGINEERING.md §2 keeps the stack
// small). Any Chromium build works — including the one Playwright caches.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// source SVG (relative to repo root) → emitted PNGs
const ICONS = [
  { svg: 'design/brand/logo.svg', out: 'public/icons/icon-192.png', size: 192 },
  { svg: 'design/brand/logo.svg', out: 'public/icons/icon-512.png', size: 512 },
  { svg: 'design/brand/logo.svg', out: 'public/icons/apple-touch-icon-180.png', size: 180 },
  { svg: 'design/brand/logo-maskable.svg', out: 'public/icons/icon-maskable-512.png', size: 512 },
];

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cache = join(process.env.HOME ?? '', '.cache/ms-playwright');
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    ...(existsSync(cache)
      ? execFileSync('ls', [cache], { encoding: 'utf8' })
          .split('\n')
          .filter((d) => d.startsWith('chromium'))
          .map((d) => join(cache, d, 'chrome-linux', d.includes('headless') ? 'headless_shell' : 'chrome'))
      : []),
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('No Chrome/Chromium found — set CHROME_BIN=/path/to/chrome');
  return found;
}

const chrome = findChrome();
const work = mkdtempSync(join(tmpdir(), 'bora-icons-'));

try {
  for (const { svg, out, size } of ICONS) {
    const markup = readFileSync(join(repoRoot, svg), 'utf8');
    const page = join(work, 'icon.html');
    // The SVG fills the viewport exactly, so the screenshot is the icon.
    writeFileSync(
      page,
      `<!doctype html><meta charset="utf-8">` +
        `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>` +
        markup,
    );
    execFileSync(
      chrome,
      [
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${size},${size}`,
        `--screenshot=${join(repoRoot, out)}`,
        `file://${page}`,
      ],
      { stdio: 'ignore' },
    );
    console.log(`${out} ${size}x${size}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
