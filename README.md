# bora.py

> "I purple you" — love that stays. No streaks, no decay, no guilt; every
> checkpoint waits for you. (Say it "bora dot pie" — always lowercase, always
> with the dot.)

A static, offline-capable PWA that teaches a Pareto slice of Python — the ~20%
that delivers ~80% of real capability — to a single beginner learner.

The app never executes code. It is a content player and progress tracker: it
shows the task, the exact expected output, hints and solutions, while the
learner writes and runs the Python herself in her own terminal. Progress is
checkpoint-based — no streaks, no XP, no guilt mechanics.

## Start here

| Doc | What it is |
|---|---|
| [`design/README.md`](design/README.md) | Design handoff index — read this first |
| [`docs/01-design.md`](docs/01-design.md) | Product spec — source of truth for behavior |
| [`docs/02-engineering.md`](docs/02-engineering.md) | Architecture, content schema, state machine, build order |
| [`docs/03-qa.md`](docs/03-qa.md) | How to drive the app in a real headless browser (and which flags lie) |
| [`design/PyLearn Prototype.dc.html`](design/PyLearn%20Prototype.dc.html) | Clickable visual + behavioral reference |
| [`design/github-issues-guide.md`](design/github-issues-guide.md) | How the work is broken into issues |
| [`content/curriculum.json`](content/curriculum.json) | The authored curriculum (13 modules) — the file the app loads |
| [`design/brand/BRAND.md`](design/brand/BRAND.md) | Brand + mark |

## Live

**https://rishabh7g.github.io/Bora.py/** — every push to `main` builds and
publishes `dist/` to GitHub Pages (`.github/workflows/deploy.yml`), after
typecheck and content lint pass. Pure static hosting: no server, no API. The
build sets Vite `base: '/Bora.py/'` so the app, its service worker and its
manifest all work under the repo subpath.

## Verify

`scripts/verify.sh` is the one command that says whether the repository is
healthy. It prints a single line — `TYPES ok | LINT ok | TEST 329/329 ok |
STRINGS ok | BUILD ok` — and nothing else. Stages run in order and the first
failure stops the run, printing the tail of that stage's log; every stage's
full output lands in `.verify/<stage>.log` (gitignored, wiped each run).

## Status

Every screen ships. The said-once pass of 2026-09-06 (`docs/05-simplify.md`) measured each
one at 360px and cut what it said twice: the map leads with the current checkpoint, an
exercise is two buttons, the setup guide keeps its windows behind a door per step, the
shelf shows the cards she has. The canonical string list went from 133 keys to 94.

## Naming

The product name is **bora.py** — always lowercase, always with the dot
(`design/brand/BRAND.md`). The cleanup is **done for app code and docs**: the
app UI, the PWA manifest, `index.html`, `package.json` and the doc titles all
say bora.py, and `src/shell/Wordmark.tsx` is the one place the name is set in the UI.

Two deliberate exceptions, both about provenance:

- The design handoff files are kept **exactly as delivered**, so the prototype
  is still named `design/PyLearn Prototype.dc.html` and `design/` keeps its
  original wording. Renaming it would break the handoff and lose the history.
- Source comments that cite that prototype (`design/PyLearn Prototype.dc.html →
  Home map`) keep the real filename, because the path has to resolve. They are
  path citations, not the product name.

## How work happens

- Every change is a **GitHub issue**; one PR per issue; PR title references the
  issue; **squash-merge**; `main` is always deployable.
- **Verify on the deployed/running instance before closing an issue** — green
  tests are not sufficient on their own.
