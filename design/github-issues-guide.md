# Writing GitHub issues for bora.py

One developer, one user, a small app with a big content spine. Issues should mirror that: few, vertical, each one shippable. This guide gives the conventions, the milestone map, and a template.

## Principles

1. **Vertical slices, not layers.** "ExerciseView with full state machine + persistence" is one issue — not separate UI / state / storage issues. Every closed issue is something you can click through.
2. **The prototype is the acceptance spec.** Reference `design/PyLearn Prototype.dc.html` by screen name (Home map, Module, Exercise, Photocard shelf, Setup guide, Celebration). Behavior questions are settled by the prototype first, ENGINEERING.md second.
3. **Content is data, never code.** Any issue that adds a module touches only `content/` files. If a module needs a new component, that is a separate issue and a smell.
4. **One state machine, one owner file.** All effort-gate rules (ENGINEERING.md §5) live in one module with unit tests. Issues elsewhere may consume it, never reimplement it.

## Labels

- `milestone:M1…M6` — see below
- `area:content` / `area:ui` / `area:pwa` / `area:brand`
- `type:build` / `type:polish` / `type:bug`
- `blocked` — with the blocking issue linked

## Milestones (from ENGINEERING.md §11 build order)

- **M1 — Schema + Module 1 end-to-end.** Content types, load `curriculum.json`, render one module raw. Proves the model.
- **M2 — ExerciseView + state machine + persistence.** The product IS this screen. Effort gate, exit variant, trust-based match, IndexedDB write-through.
- **M3 — ModuleView + gating.** Worked examples, exercise list with state chips, exit lock rule, module unlock chain.
- **M4 — HomeMap + photocards + celebration.** Tier path, cards with cracks, red celebration screen.
- **M5 — PWA + safety net.** Offline precache, auto-update, export/import progress, reset.
- **M6 — Full content + Setup + polish.** All modules from `curriculum.json` verified against a real terminal, Setup guide, focus states, min hit targets.

M1–M2 ≈ 20% of the work and 80% of the value. Do not start M3 until M2 is demoable.

## Issue template

```md
## What
One sentence. e.g. "Build ExerciseView: prompt, expected-output block, effort-gate buttons, hint ladder, solution reveal."

## Design reference
- Prototype: design/PyLearn Prototype.dc.html → Exercise screen
- Docs: ENGINEERING.md §5 (state machine), DESIGN.md §3.5 (effort gate)
- Tokens: design/tokens.css; component classes: design/_ds/…/styles.css

## Acceptance criteria
- [ ] Solution unreachable until 3 declared attempts OR "My output matches"
- [ ] Each hint view adds one crack to the module card
- [ ] Exit exercise shows no ladder; offers "Come back later"
- [ ] State survives reload (write-through persistence)
- [ ] Matches prototype at 375px and 1024px

## Out of scope
Celebration screen (own issue), content edits.
```

## Acceptance criteria that recur (copy freely)

- Uses tokens/classes only — no hard-coded colors, fonts, radii (radius is 0 everywhere).
- Flush-left labels; no centered buttons or hero copy.
- Hover, pressed and `:focus-visible` states themed per the stylesheet — never browser defaults.
- Hit targets ≥ 44px on touch.
- No streaks, XP, timers, or guilt mechanics introduced anywhere.
- Content issues: expected outputs verified by actually running the solution in a terminal; no lyrics, no official imagery.

## Anti-patterns

- Issues titled "Refactor…", "Set up…", "Investigate…" with no user-visible result — fold them into the slice that needs them.
- Splitting UI and state for the same screen across issues.
- A single "build the app" issue — use the milestone map.
- Screenshots as the only spec — always link the prototype screen + doc section.
