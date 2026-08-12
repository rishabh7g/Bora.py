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
| [`docs/DESIGN.md`](docs/DESIGN.md) | Product spec — source of truth for behavior |
| [`docs/ENGINEERING.md`](docs/ENGINEERING.md) | Architecture, content schema, state machine, build order |
| [`design/PyLearn Prototype.dc.html`](design/PyLearn%20Prototype.dc.html) | Clickable visual + behavioral reference |
| [`design/github-issues-guide.md`](design/github-issues-guide.md) | How the work is broken into issues |
| [`design/content/curriculum.json`](design/content/curriculum.json) | The authored curriculum (13 modules) |
| [`design/brand/BRAND.md`](design/brand/BRAND.md) | Brand + mark |

## Live

**https://rishabh7g.github.io/Bora.py/** — every push to `main` builds and
publishes `dist/` to GitHub Pages (`.github/workflows/deploy.yml`), after
typecheck and content lint pass. Pure static hosting: no server, no API. The
build sets Vite `base: '/Bora.py/'` so the app, its service worker and its
manifest all work under the repo subpath.

## Status

Design package complete. Implementation in progress.

## Naming

The product name is **bora.py** — always lowercase, always with the dot
(`design/brand/BRAND.md`). The cleanup is **done for app code and docs**: the
app UI, the PWA manifest, `index.html`, `package.json` and the doc titles all
say bora.py, and `src/Wordmark.tsx` is the one place the name is set in the UI.

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
