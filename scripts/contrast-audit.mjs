// Contrast audit — measures the real rendered contrast of the app's quiet,
// locked and interactive text in a real browser, with every ancestor `opacity`
// folded into the colour and composited against the backdrop that is actually
// behind it.
//
//   node scripts/contrast-audit.mjs [url] [--width 390]
//
// Why a script and not a spreadsheet (issues #45, #46): the failures those
// issues describe are invisible to a static read of the CSS, because they come
// from `opacity` on an ancestor multiplying a token that looks fine on its own
// (`--color-neutral-400` at 0.45 measured 1.28:1). Anyone can re-run this and
// get the same numbers, so a later change cannot quietly undo the fix.
//
// Thresholds are WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text
// (>= 24px, or >= 18.66px at weight >= 700). Every row prints the size and
// weight it used to pick the threshold. Exit 0 = every row passed.
//
// A row may also be marked NON_TEXT (#76), for a meaningful icon that paints no
// text at all — the bottom nav's items. Such an element still inherits a
// font-size and weight it never paints, so the text rule would silently pick
// 4.5:1 from a measurement of ink that is not text. SC 1.4.11 Non-text Contrast
// governs it instead: 3:1, measured from the icon's own resolved stroke. Those
// rows print `icon(1.4.11)` where a text row prints its size and weight, so a
// 3:1 pass is never mistaken for a 4.5:1 one.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function resolvePlaywrightDir() {
  if (process.env.PLAYWRIGHT_DIR) return process.env.PLAYWRIGHT_DIR;
  const require_ = createRequire(import.meta.url);
  try {
    return join(require_.resolve('playwright/package.json'), '..');
  } catch {
    /* not a dependency here — fall through to the npx cache */
  }
  const browsers = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), '.cache', 'ms-playwright');
  const npxCache = join(homedir(), '.npm', '_npx');
  if (!existsSync(npxCache)) return null;
  for (const entry of readdirSync(npxCache)) {
    const dir = join(npxCache, entry, 'node_modules', 'playwright');
    const pinned = join(npxCache, entry, 'node_modules', 'playwright-core', 'browsers.json');
    if (!existsSync(dir) || !existsSync(pinned)) continue;
    const chromium = JSON.parse(readFileSync(pinned, 'utf8')).browsers.find((b) => b.name === 'chromium');
    if (chromium && existsSync(join(browsers, `chromium-${chromium.revision}`))) return dir;
  }
  return null;
}

const args = process.argv.slice(2);
const width = Number(args.includes('--width') ? args[args.indexOf('--width') + 1] : 390);
const BASE =
  args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--width') ??
  'http://localhost:4173/Bora.py/';

// ── the measurement, run in the page ──────────────────────────────────────────
const MEASURE = ([selector, nonText]) => {
  const el = document.querySelector(selector);
  if (!el) return { error: 'not found' };
  const parse = (value) => {
    const n = value.match(/[\d.]+/g)?.map(Number) ?? [];
    return { r: n[0] ?? 0, g: n[1] ?? 0, b: n[2] ?? 0, a: n.length > 3 ? n[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  });
  const lum = (c) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };

  // Ancestor chain, self first.
  const chain = [];
  for (let node = el; node; node = node.parentElement) chain.push(node);
  const opacityOf = (node) => Number(getComputedStyle(node).opacity);
  // Cumulative opacity applied to this element's own ink.
  const inkOpacity = chain.reduce((acc, node) => acc * opacityOf(node), 1);

  // The backdrop: the nearest ancestor (self included) that paints something,
  // composited over the page ground with whatever opacity it inherits.
  const ground = parse(getComputedStyle(document.body).backgroundColor);
  let backdrop = ground;
  for (let i = 0; i < chain.length; i += 1) {
    const paint = parse(getComputedStyle(chain[i]).backgroundColor);
    if (paint.a === 0) continue;
    const inherited = chain.slice(i).reduce((acc, node) => acc * opacityOf(node), 1);
    backdrop = over({ ...paint, a: paint.a * inherited }, ground);
    break;
  }

  const style = getComputedStyle(el);
  // A no-text row paints its ink as SVG paint, not as text colour: lucide sets
  // `stroke="currentColor"`, which computes to the item's own resolved colour.
  // `fill` and `color` follow as fallbacks, so an icon-only row always has a
  // measured ink and can never quietly report nothing.
  const paints = nonText ? [style.stroke, style.fill, style.color] : [style.color];
  const own = parse(paints.find((paint) => paint.startsWith('rgb')) ?? style.color);
  const ink = over({ ...own, a: own.a * inkOpacity }, backdrop);
  const l1 = lum(ink);
  const l2 = lum(backdrop);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  const size = parseFloat(style.fontSize);
  const weight = Number(style.fontWeight);
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  const round = (c) => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
  return {
    ratio: Math.round(ratio * 100) / 100,
    // SC 1.4.11 for a meaningful icon (3:1), SC 1.4.3 for text — and a no-text
    // element's inherited size and weight are never allowed to choose.
    need: nonText || large ? 3 : 4.5,
    basis: nonText ? 'icon(1.4.11)' : `${size}px/${weight}`,
    opacity: Math.round(inkOpacity * 100) / 100,
    ink: round(ink),
    backdrop: round(backdrop),
    text: (el.textContent ?? '').trim().slice(0, 28),
  };
};

// ── what to measure, and the state each row needs ─────────────────────────────
// First column names a fixture below; rows sharing one fixture share one page.
// Add a row here whenever a screen gains a quiet, dimmed or interactive text
// style, the way smoke checks grow with an API — the audit's coverage then grows
// with the app.
//
// `[fixture, selector, description]`, plus an optional fourth element NON_TEXT
// for a row that paints an icon rather than text (#76).
const NON_TEXT = 'non-text';
const ROWS = [
  // #45 — locked / dimmed states
  ['home-fresh', '.home-row--locked .home-num', 'locked module number'],
  ['home-fresh', '.home-row--locked .home-rowtitle', 'locked module title'],
  ['home-fresh', '.home-row--locked .home-rowanchor', 'locked module anchor'],
  ['home-fresh', '.home-row--locked .home-chip', 'LOCKED chip'],
  ['home-fresh', '.home-tier5--locked .home-tiertitle', 'locked tier 5 title'],
  ['home-fresh', '.home-tier5--locked .home-tierera', 'locked tier 5 era'],
  ['shelf-fresh', '.shelf-card--locked .shelf-num', 'unearned card number'],
  ['shelf-fresh', '.shelf-card--locked .shelf-cardtitle', 'unearned card title'],
  ['shelf-fresh', '.shelf-card--locked .shelf-foot', 'unearned card foot'],
  ['module-m1', '.mod-exitrow--locked .mod-exitrow-title', 'locked exit row title'],
  ['module-m1', '.mod-exitrow--locked .mod-exitrow-sub', 'locked exit row reason'],
  ['module-m1', '.mod-exitrow--locked .mod-num', 'locked exit row EX'],
  ['module-m1', '.mod-exitrow--locked .mod-chip', 'locked exit row chip'],
  ['exercise-e1', '.ex-lock-note', 'hint lock note'],
  ['exercise-e1', '.ex-rung .ex-rung-label', 'locked rung label'],
  // The open row is here as the control: locked ink must clear AA without
  // becoming the open row's ink.
  ['home-fresh', '.home-row--open .home-rowtitle', 'open module title (control)'],
  // #46 — quiet supporting text and small accent labels
  ['home-fresh', '.home-kicker', 'CHECKPOINT PATH kicker'],
  ['home-fresh', '.home-row--open .home-rowanchor', 'open row anchor'],
  ['home-fresh', '.home-tier .home-tierera', 'era label'],
  ['home-fresh', '.home-lede', 'home lede'],
  ['home-fresh', '.home-num--current', 'current module numeral (accent, large)'],
  ['shelf-fresh', '.shelf-note', 'card caption'],
  ['shelf-fresh', '.shelf-kicker', 'shelf kicker'],
  ['module-m1', '.mod-kicker', 'module kicker'],
  ['module-m1', '.mod-example-why', 'why line'],
  ['module-m1', '.mod-num', 'example numeral'],
  ['exercise-e1', '.ex-kicker', 'exercise kicker'],
  ['exercise-e1', '.ex-expected-sub', 'expected-output sub'],
  ['exercise-e1-ws', '.ex-ws-legend', 'whitespace legend'],
  // #86 — the other .seg in the app. This fixture already clicks the toggle on
  // to render the legend, so the checked option is right there: the audit used
  // to drive this exact control and then measure past it.
  ['exercise-e1-ws', '.ex-ws-toggle .seg-opt:has(input:checked)', 'checked whitespace toggle'],
  ['exercise-e1-tried', '.ex-note', 'attempts note'],
  ['exercise-e1-tried', '.ex-rung-label--active', 'active rung label (accent)'],
  ['exit-m1', '.ex-exit-note', 'exit-checkpoint note (accent)'],
  ['settings', '.set-kicker', 'settings kicker'],
  ['settings', '.set-label', 'settings field label'],
  ['settings', '.set-copy--quiet', 'settings quiet copy'],
  ['settings', '.set-rowstate', 'settings row state'],
  ['setup', '.setup-kicker', 'setup kicker'],
  // #69 — the dated "checked against python.org" line above the stepper: quiet
  // supporting text the learner must be able to read.
  ['setup', '.setup-checked', 'checked-against line'],
  ['setup', '.setup-term-label', 'terminal label'],
  // #61 — a step's printed output is the shared expected-output block, so the
  // stepper gains that block's quiet sub-label too.
  ['setup', '.setup-step .ex-expected-sub', 'step output sub'],
  ['setup', '.setup-shot figcaption', 'screenshot caption'],
  // #62 — the screenshot-pending note is gone; the words that replaced it are
  // instructions the learner must read, so both parts are measured.
  ['setup', '.setup-look-label', 'what-you’ll-see label'],
  ['setup', '.setup-look-list li', 'what-you’ll-see instruction'],
  ['setup', '.setup-step-num', 'step numeral (accent, large)'],
  // #86 — the design system's segment paints its CHECKED option as accent-red
  // ground under ground-coloured ink (3.76:1 before the fix in src/tokens.css).
  // Both states are measured, because they paint different ink on different
  // backdrops and the unchecked one passes comfortably enough to hide the
  // failure: an audit that measured only "the .seg-opt" would report a pass.
  // The OS picker is checked from first paint (DEFAULT_SETUP_OS), so no click
  // is needed. A segment label is text, so it takes the 4.5:1 text path — never
  // NON_TEXT.
  ['setup', '.setup-os .seg-opt:has(input:checked)', 'checked OS option'],
  ['setup', '.setup-os .seg-opt:not(:has(input:checked))', 'unchecked OS option'],
  ['setup', '.setup-exit-label', 'setup exit label (accent)'],
  // #55 — links and ghost buttons. Every one of these is 13px/800 interactive
  // text taking its colour from the design system's `a` / `.btn-ghost`, so they
  // stand or fall together; they are listed per screen anyway, because that is
  // what a regression here would look like (one screen quietly opting out).
  ['module-m1', '.mod-back', '← Map back link'],
  ['exercise-e1', '.ex-back', 'exercise back link'],
  ['setup', '.setup-back', 'setup back link'],
  // #59 — the map's UP NEXT chip is the design system's .tag-outline, which
  // paints its label in --color-accent (3.76:1 at 11px). Only the current
  // module's row renders it, so home-fresh (no Module 00 pass yet) is reused.
  ['home-fresh', '.home-row--current .home-chip', 'UP NEXT chip label'],
  // #76 — the bottom nav's two ink states (#75). The bar is on every screen, so
  // any fixture would do; home-fresh shows the current item (Map) and two
  // inactive ones in the same shot. Each item is an icon and an aria-label with
  // no text of its own, so both rows are NON_TEXT: the ink measured is the
  // glyph's stroke, against the bar's own background, at 3:1.
  ['home-fresh', '.bottomnav-item[aria-current="page"] .bottomnav-icon', 'current nav item icon', NON_TEXT],
  ['home-fresh', '.bottomnav-item:not([aria-current="page"]) .bottomnav-icon', 'inactive nav item icon', NON_TEXT],
];

const { chromium } = await import(join(resolvePlaywrightDir(), 'index.mjs'));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const problems = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(hash) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(BASE + hash, { waitUntil: 'domcontentloaded' });
  await wait(900);
  return { ctx, page };
}
// Module 01 is locked from a fresh profile, so state is built the real way:
// pass Module 00 through the setup guide's own button (docs/QA.md).
async function passModule0(hash) {
  const { ctx, page } = await open('#/setup');
  await page.getByRole('button', { name: 'My output matches' }).click();
  await wait(500);
  await page.goto(BASE + hash, { waitUntil: 'domcontentloaded' });
  await wait(900);
  return { ctx, page };
}

const FIXTURES = {
  'home-fresh': () => open('#/'),
  'shelf-fresh': () => open('#/shelf'),
  'module-m1': () => passModule0('#/module/m1'),
  'exercise-e1': () => passModule0('#/module/m1/exercise/e1'),
  'exercise-e1-ws': async () => {
    const { ctx, page } = await passModule0('#/module/m1/exercise/e1');
    // The legend only renders with whitespace on. Click the label, never the
    // input (docs/QA.md — the design system's segment input is 0x0).
    await page.locator('.ex-ws-toggle .seg-opt').click();
    await wait(300);
    return { ctx, page };
  },
  // One declared attempt: the attempts note and the rung that just went live.
  'exercise-e1-tried': async () => {
    const { ctx, page } = await passModule0('#/module/m1/exercise/e1');
    await page.getByRole('button', { name: 'I tried and got stuck' }).click();
    await wait(400);
    return { ctx, page };
  },
  // The exit checkpoint renders its own note. It stays locked until every
  // formative exercise is matched or solution-seen (§6) — and a locked exit
  // falls back to the module screen — so all three are matched first.
  'exit-m1': async () => {
    const { ctx, page } = await passModule0('#/module/m1/exercise/e1');
    for (const id of ['e1', 'e2', 'e3']) {
      await page.goto(`${BASE}#/module/m1/exercise/${id}`, { waitUntil: 'domcontentloaded' });
      await wait(700);
      await page.getByRole('button', { name: 'My output matches' }).click();
      await wait(400);
    }
    await page.goto(`${BASE}#/module/m1/exit`, { waitUntil: 'domcontentloaded' });
    await wait(900);
    return { ctx, page };
  },
  // A settings row only exists once a module has saved work.
  settings: () => passModule0('#/settings'),
  setup: () => open('#/setup'),
};

let failed = 0;
console.log(`contrast audit — ${BASE} @ ${width}px`);
for (const fixture of Object.keys(FIXTURES)) {
  const rows = ROWS.filter(([f]) => f === fixture);
  if (rows.length === 0) continue;
  const { ctx, page } = await FIXTURES[fixture]();
  for (const [, selector, label, kind] of rows) {
    const r = await page.evaluate(MEASURE, [selector, kind === NON_TEXT]);
    if (r.error) {
      console.log(`  MISSING  ${selector} — ${r.error}`);
      failed += 1;
      continue;
    }
    const verdict = r.ratio >= r.need ? 'PASS' : 'FAIL';
    if (verdict === 'FAIL') failed += 1;
    console.log(
      `  ${verdict}  ${String(r.ratio).padStart(5)}:1  need ${r.need}  ` +
        `${r.basis}${r.opacity < 1 ? ` op${r.opacity}` : ''}  ` +
        `${r.ink} on ${r.backdrop}  ${selector}  — ${label}`,
    );
  }
  await ctx.close();
}
await browser.close();
console.log(`problems (${problems.length}): ${problems.join(' | ') || 'none'}`);
console.log(failed === 0 ? 'RESULT ok — every measured style clears AA' : `RESULT FAIL — ${failed} below AA`);
process.exit(failed === 0 ? 0 : 1);
