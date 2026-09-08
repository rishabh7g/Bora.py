# bora.py — repo deltas only

Workflow (issues, branches, merging, verification discipline): `~/.claude/CLAUDE.md`.
Cross-repo standards: [`docs/repo-standards.md`](https://github.com/rishabh7g/claude-setup/blob/main/docs/repo-standards.md)
in `rishabh7g/claude-setup`. This file records only what is true here and nowhere else.

## What this is

A static, offline-capable PWA that teaches a Pareto slice of Python to one learner.
React 18 + Vite 6 + TypeScript, hand-written CSS, `idb-keyval` for progress. No backend,
no accounts, no router — ~5 screens switched in `src/App.tsx`.

**The app never executes Python — the learner does, in her own terminal.** It is a content
player and progress tracker: it shows the task, the exact expected output, hints and the
solution, and she declares "my output matches". That is a product rule, not an
implementation detail: it rules out a runner, a grader, and any verification friction,
and it is why progress is checkpoint-based with no streaks, XP or decay. Spec:
`docs/DESIGN.md`; architecture and content schema: `docs/ENGINEERING.md`.

## How to run it

- `npm ci`
- `npm run dev` → **http://localhost:5173/Bora.py/** — the `/Bora.py/` subpath is baked
  into `vite.config.ts` (`base`) so a local build is byte-for-byte what Pages serves.
- `npm run build && npm run preview` → http://localhost:4173/Bora.py/ (`localhost` only,
  not `127.0.0.1` — `vite preview` binds one interface).
- Deploy is a push: `main` → `.github/workflows/deploy.yml` → https://rishabh7g.github.io/Bora.py/

## How to verify it

`scripts/verify.sh` — one line (`TYPES ok | LINT ok | TEST 329/329 ok | STRINGS ok | BUILD ok`), full output per stage in `.verify/<stage>.log`.

## Deviations from the repo standards

- **`STRINGS` runs before `BUILD`, not after the reserved stages.** `npm run build` *is*
  `tsc && strings-check && vite build`, so verify runs `npx vite build` directly; ordering
  STRINGS last would resurface a missing key as `FAIL BUILD` long after STRINGS passed.
  The reason is also written in `scripts/verify.sh`'s header.
- **FORMAT is not its own stage.** `prettier --check .` is the second command inside LINT
  and shares exit 20 — eslint owns correctness, prettier owns formatting, either one red
  is a lint failure.
- **`docs/` keeps `DESIGN.md`, `ENGINEERING.md`, `QA.md`, `SIMPLIFY.md`**, not the
  `NN-lowercase-kebab.md` scheme; the standard defers that renaming until it settles.

## What a newcomer gets wrong

- **`docs/ENGINEERING.md` §2 says Tailwind. There is no Tailwind** — styling is 14
  hand-written stylesheets in `src/`, with the palette in `src/tokens.css`.
- **Never hardcode a user-visible string.** Shell copy is `t('home.lede')` from
  `src/strings/`, keys listed once in `src/strings/stringsKeys.ts`; `t()` throws instead of
  falling back, and `tools/strings-check.ts` fails the build on a missing, empty, extra or
  wrong-placeholder key.
- **Curriculum copy is not in that pack.** It lives in `content/curriculum.json` under its
  own rules (`content/lint.ts`, `npm run lint:content`, also asserted by the test suite).
- **`design/` is the delivered handoff, kept verbatim** — including the original name
  `design/PyLearn Prototype.dc.html`. `docs/` is the current truth; `design/` is history.
- **Browser QA has traps** (which flags lie, no Playwright dependency on purpose):
  `docs/QA.md` before `scripts/headless-probe.mjs`.
