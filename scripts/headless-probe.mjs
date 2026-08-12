// Headless-browser probe: does the app actually mount, and what does the
// browser say while it does?
//
//   node scripts/headless-probe.mjs <url> [--poll 8000] [--shot out.png]
//
// Why this exists (docs/QA.md): driving Chrome by hand with
// `--headless=new --virtual-time-budget=… --dump-dom` reports this app as a
// blank page and, against a local server, hangs the browser outright. That is
// an artefact of those flags — virtual time is spent before the async progress
// read resolves. This probe drives a real Playwright browser and waits on real
// time and real events instead, which is the only way to get a truthful answer.
//
// Exit codes: 0 = #root ended up non-empty, 1 = still empty (or navigation
// failed), so it can gate a QA run.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const EMPTY_ROOT = 40; // `<div id="root">` holds only whitespace below this

/** Find a usable Playwright on this host.
 *
 *  This repo deliberately keeps no Playwright dependency (ENGINEERING.md §2 —
 *  small stack; browsers are ~300 MB and CI never needs one). So: use the repo's
 *  own copy if someone installed it, else any `npx`-cached copy whose pinned
 *  Chromium revision is already downloaded — that is what
 *  `npx @playwright/mcp@latest install-browser chrome-for-testing` leaves behind.
 *  `PLAYWRIGHT_DIR` overrides the search. */
function resolvePlaywrightDir() {
  if (process.env.PLAYWRIGHT_DIR) return process.env.PLAYWRIGHT_DIR;

  const require_ = createRequire(import.meta.url);
  try {
    return join(require_.resolve('playwright/package.json'), '..');
  } catch {
    // not a dependency here — fall through to the npx cache
  }

  const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), '.cache', 'ms-playwright');
  const npxCache = join(homedir(), '.npm', '_npx');
  if (!existsSync(npxCache)) return null;

  for (const entry of readdirSync(npxCache)) {
    const dir = join(npxCache, entry, 'node_modules', 'playwright');
    const pinned = join(npxCache, entry, 'node_modules', 'playwright-core', 'browsers.json');
    if (!existsSync(dir) || !existsSync(pinned)) continue;
    const chromium = JSON.parse(readFileSync(pinned, 'utf8')).browsers.find(
      (browser) => browser.name === 'chromium',
    );
    // Only useful if the matching browser build is actually on disk.
    if (chromium && existsSync(join(browsers, `chromium-${chromium.revision}`))) return dir;
  }
  return null;
}

const args = process.argv.slice(2);
const url = args.find((arg) => !arg.startsWith('--'));
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const pollMs = Number(flag('poll', 8000));
const shotPath = flag('shot', null);

if (!url) {
  console.error('usage: node scripts/headless-probe.mjs <url> [--poll ms] [--shot file.png]');
  process.exit(2);
}

const playwrightDir = resolvePlaywrightDir();
if (!playwrightDir) {
  console.error(
    'No Playwright found. Install the browser once with:\n' +
      '  npx -y @playwright/mcp@latest install-browser chrome-for-testing\n' +
      'or point PLAYWRIGHT_DIR at a node_modules/playwright directory.',
  );
  process.exit(2);
}
const { chromium } = await import(join(playwrightDir, 'index.mjs'));

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

const messages = [];
const problems = [];
page.on('console', (message) => messages.push(`[${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
page.on('requestfailed', (request) =>
  problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`),
);
page.on('response', (response) => {
  if (response.status() >= 400) problems.push(`http ${response.status()}: ${response.url()}`);
});

const readRoot = () =>
  page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      length: root ? root.innerHTML.length : -1,
      text: root ? root.innerText.slice(0, 70).replace(/\s+/g, ' ') : '',
    };
  });

let navigated = true;
const startedAt = Date.now();
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`goto: domcontentloaded in ${Date.now() - startedAt}ms`);
} catch (error) {
  navigated = false;
  console.log(`goto FAILED: ${error.message.split('\n')[0]}`);
}

// Poll #root and print only the transitions — a mount shows up as one line.
let last = null;
let latest = { length: -1, text: '' };
for (let elapsed = 0; elapsed <= pollMs && navigated; elapsed += 500) {
  latest = await readRoot();
  const line = `#root length=${latest.length} text="${latest.text}"`;
  if (line !== last) {
    console.log(`${elapsed}ms ${line}`);
    last = line;
  }
  await page.waitForTimeout(500);
}

console.log(`title: ${navigated ? await page.title() : '(none)'}`);
console.log(`console (${messages.length}):`);
for (const message of [...new Set(messages)].slice(0, 25)) console.log(`  ${message}`);
console.log(`problems (${problems.length}):`);
for (const problem of [...new Set(problems)].slice(0, 25)) console.log(`  ${problem}`);

if (shotPath) {
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log(`screenshot: ${shotPath}`);
}
await browser.close();

const mounted = latest.length > EMPTY_ROOT;
console.log(mounted ? 'RESULT ok — the app mounted' : 'RESULT FAIL — #root never filled');
process.exit(mounted ? 0 : 1);
