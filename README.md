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

## Status

Design package complete. Implementation not started.

## Naming

The design and engineering docs and the prototype file still carry the working
title **PyLearn**; the brand doc settles on **bora.py**. This is a known
inconsistency to be cleaned up in a later pass — the handoff files are kept
exactly as delivered for now.

## How work happens

- Every change is a **GitHub issue**; one PR per issue; PR title references the
  issue; **squash-merge**; `main` is always deployable.
- **Verify on the deployed/running instance before closing an issue** — green
  tests are not sufficient on their own.
