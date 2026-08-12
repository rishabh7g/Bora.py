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
