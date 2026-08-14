---
name: Task
about: One vertical slice — a screen, a state machine, a build issue (design/github-issues-guide.md)
---

## What
One sentence. e.g. "Build ExerciseView: prompt, expected-output block, effort-gate buttons, hint ladder, solution reveal."

## Design reference
- Prototype: design/PyLearn Prototype.dc.html → … screen
- Docs: docs/ENGINEERING.md §…, docs/DESIGN.md §…
- Tokens: design/tokens.css; component classes: design/_ds/…/styles.css

## Acceptance criteria
- [ ] …
- [ ] Uses tokens/classes only — no hard-coded colors, fonts, radii (radius is 0 everywhere)
- [ ] Hit targets ≥ 44px on touch
- [ ] Every new/changed string is a keeper (§8 keeper test below), not read-once explainer copy
- [ ] No banned copy anywhere in the new strings (list below)

## Out of scope
…

---

### The keeper test (UI baseline §8, "Write less")
A string survives only if it (1) carries live data — a count, a level, a name; (2) is the only
instruction on a step; or (3) guards a destructive action. Trim to the value rather than deleting
the key when a string is mostly prose wrapped around a live one. A destructive confirm always says
what it destroys — that one is never trimmed to nothing.

### Ban list
Progress in bora.py is checkpoint-based only — never day- or streak-based. These words/phrases
must not appear in any string this app ships:

- *streak*
- *daily goal*
- *days left*
- *% complete*
- *keep it up*
- *don't break the chain*
