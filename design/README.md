# bora.py — design handoff

Everything an engineer needs to implement the app. The product spec is DESIGN.md; the technical plan is ENGINEERING.md; the prototype is the visual + behavioral reference.

## Contents

- `PyLearn Prototype.dc.html` — the clickable reference build. Open it in a browser from this folder (it loads `_ds/` and `support.js` beside it). All 5 screens, working effort-gate state machine, localStorage persistence.
- `DESIGN.md` / `ENGINEERING.md` — product + engineering docs (source of truth for behavior).
- `tokens.css` — the design tokens (`:root` block). Map to Tailwind config; never hard-code values these carry.
- `theme.json` — machine-readable record the tokens derive from.
- `_ds/…/styles.css` — full stylesheet: tokens + component classes (`.btn`, `.tag`, `.card`, `.nav`, `.seg`, `.table`, `.input`, `.hr`). Reference for component styling and interaction states.
- `content/curriculum.json` — the full authored curriculum (13 modules: intros, worked examples with exact outputs, exercises, hints, solutions, checklists), shaped to the ENGINEERING.md content schema.
- `brand/logo.svg` + `brand/BRAND.md` — brand mark, name rationale, wordmark spec, usage rules.
- `github-issues-guide.md` — how to break this into GitHub issues.

## Design system in one paragraph

Modernist: flat, all-Archivo, red `#ec3013` on light ground `#f3f2f2`, ink `#201e1d`, **zero corner radius**, strong 2px rules between sections, everything flush left (including button labels), accent used sparingly. The one red field is the celebration screen. No emoji in chrome, no gradients, no rounded cards.

## Behavior that must match the prototype

- **Effort gate per exercise:** attempt → hint 1 → attempt → hint 2 → attempt → solution. Solution reachable only via full ladder or "My output matches". Exit exercises: no ladder, match or leave.
- **Gating:** module N+1 unlocks when N passed; exit unlocks when every formative exercise is matched or solution-seen; Module 00 lives on the Setup screen.
- **Cracks:** each hint viewed = one crack on the module photocard. Visible cost, never blocks.
- **Validation is trust-based:** she compares output visually and self-reports. No verification friction — no copy buttons, no diff tools.
- **Persistence:** write-through on every change; export/import JSON as backup (`bora-py-progress.json`).
- **Progress = checkpoints only.** No streaks, days, XP, or leaderboards anywhere.
