# bora.py — Browser QA harness

How to look at the real app in a real browser on this host (a Raspberry Pi
running Debian Lite arm64: no desktop, no system browser — headless Chromium
works fine). Written because a bad harness produced a false bug report; see
[Retraction](#retraction) below.

## The probe (start here)

```bash
node scripts/headless-probe.mjs https://rishabh7g.github.io/Bora.py/
node scripts/headless-probe.mjs http://localhost:4173/Bora.py/ --poll 6000 --shot /tmp/home.png
```

It launches headless Chromium through Playwright, waits on **real** time and
real events, polls `#root` and prints every transition, then prints console
messages, page errors, failed requests and non-2xx responses, and finally
`RESULT ok` / `RESULT FAIL` (exit code 0 / 1).

Prerequisites, one-time:

```bash
npx -y @playwright/mcp@latest install-browser chrome-for-testing   # ~300 MB → ~/.cache/ms-playwright/
```

The repo intentionally has **no Playwright dependency** (ENGINEERING.md §2 keeps
the stack small and CI never needs a browser). The probe finds a Playwright on
the host — the repo's own copy if one exists, otherwise an `npx`-cached copy
whose pinned Chromium revision is downloaded. Override with
`PLAYWRIGHT_DIR=/path/to/node_modules/playwright`.

To probe a local build:

```bash
npm run build
npm run preview          # serves dist/ at http://localhost:4173/Bora.py/
```

`vite preview` binds `localhost` only — use `http://localhost:4173/…`, not
`127.0.0.1`, or add `--host`.

## The contrast audit

```bash
node scripts/contrast-audit.mjs                                  # local preview, 390px
node scripts/contrast-audit.mjs https://rishabh7g.github.io/Bora.py/ --width 1280
```

Measures the **real rendered** contrast of the app's quiet, dimmed and interactive text: it
reads computed styles in the page, folds every ancestor `opacity` into the ink, composites
that over the backdrop actually behind it, and picks the AA threshold from the measured size
and weight (3:1 for large text, else 4.5:1). One line per style, `RESULT ok` / `RESULT FAIL`
(exit 0 / 1). **57 rows** today, green at 390px and 1280px.

This exists because the failures in #45 are invisible to a static read of the CSS — the
tokens look fine on their own and only fail once a `0.45` ancestor opacity multiplies them.
It builds its own state the real way (passes Module 00 through the setup guide, since
Module 01 is locked from a fresh profile).

**Add a row to `ROWS` whenever a screen gains a quiet, dimmed or interactive text style**,
the same way a new endpoint earns a smoke check: the audit's coverage then grows with the app
instead of going stale. Links and ghost buttons are in there because they were *not* — every
one of them sat at 3.76:1 for as long as nothing measured them (#55).

**A control with states earns a row per state** (#86) — the design system's segment paints
its *checked* option as brand-red ground under ground-coloured ink and its unchecked one as
plain text on the page, so `.seg-opt` is two rows (`:has(input:checked)` and
`:not(:has(input:checked))`), not one. The unchecked state measures 14.86:1 and would have
masked the checked state's 3.76:1 — the audit had been *clicking* that toggle since #46 to
turn the whitespace legend on, and measuring only the legend. A segment label is text, so
both rows take the 4.5:1 path.

**A row that paints an icon rather than text gets a fourth element, `NON_TEXT`** (#76) — the
bottom nav's two ink states are the first. Such an element still inherits a `font-size` and
`font-weight` it never paints, so the size rule would quietly hold it to 4.5:1; instead the
row is measured from the icon's own resolved `stroke` and judged at the 3:1 of WCAG 2.2
SC 1.4.11 (non-text UI component). Those rows print `icon(1.4.11)` where a text row prints
`11px/400`, so a 3:1 pass is never read as a 4.5:1 one.

## Full interactive QA (clicking through screens)

Use the Playwright MCP server, which drives the same browser but gives
navigation, a11y snapshots and screenshots as tools:

```bash
claude mcp add playwright --scope local -- npx -y @playwright/mcp@latest --headless --isolated --browser chromium
claude mcp list          # expect ✔ Connected
```

Then **reload the session** (MCP tools only register at session start) and drive
`browser_navigate`, `browser_snapshot` (a11y tree — better than a screenshot for
structure), `browser_take_screenshot` (`fullPage`), `browser_console_messages`,
`browser_resize` (e.g. 390×844 for mobile). Artefacts land in `.playwright-mcp/`
under the cwd: move them out and `rm -rf .playwright-mcp` so the repo stays clean.

MCP tools only exist in a session that started with them registered. In a session
without them, drive the same bundled Playwright from a Node script instead — the
capability is the same (navigate, evaluate, screenshot, console, CDP a11y tree,
`setOffline`, `setInputFiles`, downloads) and nothing lands in the repo. Two
gotchas worth knowing before you write one:

- The design system's `.seg-opt` / `.radio` inputs are `opacity: 0; width: 0;
  height: 0; pointer-events: none` — click the `<label>`, never the `<input>`, or
  the click waits forever for a visible target.
- `.celebrate-field` is `position: fixed; inset: 0`, so a `fullPage` screenshot
  taller than the viewport shows the screen underneath it. Capture the
  celebration viewport-sized.

## Reports

Dated passes live in `docs/qa/`:

- [`docs/qa/2026-08-13-live-qa.md`](qa/2026-08-13-live-qa.md) — first full live pass
  (#28): every screen at 390px and 1280px, effort gate, persistence, offline,
  PWA metadata; 8 findings filed as #40–#47.

## What does NOT work

**Do not drive Chrome directly with `--virtual-time-budget` and `--dump-dom`.**

```bash
# ✗ reports a blank page; against a local server it hangs until killed
chrome --headless=new --no-sandbox --virtual-time-budget=8000 --dump-dom <url>
```

Virtual time is spent before the app's asynchronous progress read (IndexedDB,
ENGINEERING.md §4) resolves, so `--dump-dom` prints an empty `<div id="root">`;
with the service worker and animation frames in play, virtual time never drains
and the process hangs (observed: killed at 90 s and at 120 s). The app is fine;
the flags are not. Also note an `indexedDB.open` probe over a `file://` origin
stays pending forever — expected, since Chrome restricts storage on `file://` —
so never test this app from `file://`.

## Retraction

Earlier work recorded, as an aside in PR #33, that "the built app renders blank
headless", and three agents then explained it as "`App` awaits an IndexedDB read
that never resolves in headless". **Both are wrong.** Measured with
`scripts/headless-probe.mjs` (issue #34) against the live site and a local
`vite preview` of `dist/`:

- `#root` goes from 13 characters to 6317 within 500 ms; the Home map renders.
- Zero console messages, zero page errors, zero failed requests.
- An `indexedDB.open` probe executed on the page returns `OPEN-OK`.
- With `indexedDB` stubbed to throw, or set to `undefined`, the app still
  renders — `loadProgress()` catches and falls back to empty progress.

The one genuine gap found while checking this is tracked separately (issue #35):
if `indexedDB.open` never fires any event, the load promise never settles and
the app used to sit on an empty page with no loading or error state.
