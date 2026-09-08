// Where Playwright, and the Chromium build it drives, live on THIS host.
//
// This repo deliberately keeps no Playwright dependency (02-engineering.md §2 —
// small stack; browsers are ~300 MB and CI never needs one), so both probes in
// `scripts/` have to go and find one. They used to carry a copy each of the
// search, and both copies looked for the browser only under
// `~/.cache/ms-playwright` — the Linux/Raspberry Pi cache. Playwright itself
// picks its cache root by `process.platform` and uses
// `~/Library/Caches/ms-playwright` on macOS, so on a mac the check said "no
// browser" about a browser that was sitting on disk and would have launched
// fine (#137).
//
// Scripts here run on both userlands, so a location only one of them uses is a
// defect the moment it is typed (claude-setup docs/repo-standards.md § "Scripts
// run on two userlands"). `workout-dashboard/scripts/verify.sh` fixed the same
// defect for the same binary with an ordered two-location lookup in shell
// (workout-dashboard#203); this is that lookup, once, for both callers.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** The browser-cache roots to search, in order.
 *
 *  `PLAYWRIGHT_BROWSERS_PATH` wins outright when it is set — that is a caller
 *  saying "the browsers are here, look nowhere else", and it is what every
 *  probe of the deployed site had to set by hand before #137.
 *
 *  Otherwise Linux/Pi first. That ordering is what keeps the Pi's answer
 *  identical to the one it always gave: the first candidate is the only path
 *  this lookup ever had, and a later candidate is reached only when that one
 *  holds nothing — which on the Pi was already a "no browser found" exit.
 *
 *  `env` and `home` are parameters so both hosts' answers can be pinned from
 *  either host; nothing else passes them. */
export function browserCacheRoots(env = process.env, home = homedir()) {
  if (env.PLAYWRIGHT_BROWSERS_PATH) return [env.PLAYWRIGHT_BROWSERS_PATH];
  return [join(home, '.cache', 'ms-playwright'), join(home, 'Library', 'Caches', 'ms-playwright')];
}

/** Find a usable Playwright on this host, or `null`.
 *
 *  Use the repo's own copy if someone installed one, else any `npx`-cached copy
 *  whose pinned Chromium revision is already downloaded — that is what
 *  `npx @playwright/mcp@latest install-browser chrome-for-testing` leaves
 *  behind. `PLAYWRIGHT_DIR` overrides the search. */
export function resolvePlaywrightDir() {
  if (process.env.PLAYWRIGHT_DIR) return process.env.PLAYWRIGHT_DIR;

  const require_ = createRequire(import.meta.url);
  try {
    return join(require_.resolve('playwright/package.json'), '..');
  } catch {
    // not a dependency here — fall through to the npx cache
  }

  const roots = browserCacheRoots();
  const npxCache = join(homedir(), '.npm', '_npx');
  if (!existsSync(npxCache)) return null;

  for (const entry of readdirSync(npxCache)) {
    const dir = join(npxCache, entry, 'node_modules', 'playwright');
    const pinned = join(npxCache, entry, 'node_modules', 'playwright-core', 'browsers.json');
    if (!existsSync(dir) || !existsSync(pinned)) continue;
    const chromium = JSON.parse(readFileSync(pinned, 'utf8')).browsers.find(
      (browser) => browser.name === 'chromium',
    );
    // Only useful if the matching browser build is actually on disk, under
    // whichever cache root this host keeps it in.
    if (!chromium) continue;
    if (roots.some((root) => existsSync(join(root, `chromium-${chromium.revision}`)))) return dir;
  }
  return null;
}

/** What a caller prints when `resolvePlaywrightDir()` came back `null`.
 *
 *  It names every cache root that was tried, so "not found" is diagnosable on
 *  the host it happened on rather than being a bare exit code the reader has to
 *  guess the userland of. */
export function noPlaywrightMessage(roots = browserCacheRoots()) {
  return [
    'No Playwright with a downloaded Chromium found. Browser caches tried:',
    ...roots.map((root) => `  ${root}`),
    'Install the browser once with:',
    '  npx -y @playwright/mcp@latest install-browser chrome-for-testing',
    'or point PLAYWRIGHT_DIR at a node_modules/playwright directory.',
  ].join('\n');
}
