// Renders the PWA icon PNGs from the brand SVGs (design/brand/*.svg).
//
// The PNGs are committed to `public/icons/` — `npm run build` never runs this
// (§13: "generated, not built"). Re-run it by hand whenever the mark changes,
// or by name via `npm run icons`:
//
//   npm run icons                               # finds a local Chrome/Chromium
//   CHROME_BIN=/path/to/chrome npm run icons
//   npm run icons -- --only public/icons/favicon-32.png   # regenerate one file
//
// Rasterising needs a browser because this repo has no image toolchain and adds
// no dependency for a once-a-brand-change job (ENGINEERING.md §2 keeps the stack
// small). Any Chromium build works — including the one Playwright caches. Where
// no Chrome/Chromium is on the machine at all (this repo's Pi host bans
// installing one — no browser automation there), `rsvg-convert` (Debian package
// `librsvg2-bin`) is used instead: for this mark — flat vector shapes, no
// gradients or filters — it rasterises the same SVG to the same pixel
// dimensions with no visible difference from the Chrome screenshot path.
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
  { svg: 'design/brand/logo.svg', out: 'public/icons/favicon-32.png', size: 32 },
];

// `--only <out>` limits the run to one row's `out` path, so a single new icon
// can be regenerated without perturbing the rest of the committed set.
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];
const icons = only ? ICONS.filter((icon) => icon.out === only) : ICONS;
if (only && icons.length === 0) throw new Error(`--only ${only} matches no row in ICONS`);

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
  return candidates.find((p) => p && existsSync(p)) ?? null;
}

function findRsvgConvert() {
  const candidates = ['/usr/bin/rsvg-convert', '/usr/local/bin/rsvg-convert'];
  return candidates.find((p) => existsSync(p)) ?? null;
}

const chrome = findChrome();
const rsvgConvert = chrome ? null : findRsvgConvert();
if (!chrome && !rsvgConvert) {
  throw new Error(
    'No Chrome/Chromium and no rsvg-convert found — set CHROME_BIN=/path/to/chrome, or ' +
      'apt install librsvg2-bin',
  );
}
const work = mkdtempSync(join(tmpdir(), 'bora-icons-'));

try {
  for (const { svg, out, size } of icons) {
    const svgPath = join(repoRoot, svg);
    const outPath = join(repoRoot, out);
    if (rsvgConvert) {
      execFileSync(
        rsvgConvert,
        ['--width', String(size), '--height', String(size), '--output', outPath, svgPath],
        { stdio: 'ignore' },
      );
    } else {
      const markup = readFileSync(svgPath, 'utf8');
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
          `--screenshot=${outPath}`,
          `file://${page}`,
        ],
        { stdio: 'ignore' },
      );
    }
    console.log(`${out} ${size}x${size}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
