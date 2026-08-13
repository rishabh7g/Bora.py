# bora.py — Design Document

> The product name is **bora.py** — always lowercase, always with the dot
> (design/brand/BRAND.md). Everything below describes that app.

A playful, BTS-themed PWA that teaches Python to one specific learner: an 11th-standard student, beginner level, whose interests are BTS and Korean music.

---

## 1. Product Vision

**Goal:** She loves learning Python, stays curious, and finishes able to build something useful on her own.

**Non-goals:** Comprehensive Python coverage, leaderboards, in-browser code execution, certification.

**Core bet (Pareto):** ~20% of Python — variables, strings, lists, dicts, if/else, loops, functions, reading errors — delivers ~80% of real capability. The app teaches exactly this 20%, deeply, through content she cares about. Everything else is deferred to an "Advanced" tier she unlocks after the capstone.

---

## 2. Learner Persona

- 11th standard, no prior programming experience
- Interests: BTS, Korean songs
- Has a personal computer (Windows or Mac — Module 0 covers both)
- Runs Python locally on her machine; the app never executes code

---

## 3. Pedagogy Model

Adapted from a proven checkpoint-based language-learning design.

### 3.1 Checkpoint-based progression (not timeline-based)
- Progress = checkpoints passed, never days/streaks
- No time pressure, no decay, no guilt mechanics
- A module is "done" only when its exit condition is met

### 3.2 Tightly scoped modules
- Each module teaches ONE concept via ~8–10 worked examples
- Every example: code snippet + expected output + one-line "why it works"
- All examples draw from the shared BTS dataset (see §5)

### 3.3 The exercise loop (hidden answer, effort-gated)
1. Exercise states the task and the **exact expected output**
2. She writes code **on her own machine** and runs it there
3. She compares her terminal output against the expected output shown in the app
4. She self-reports: "My output matches" / "I'm stuck"
5. Solution stays hidden until she either matches or exhausts the hint ladder

### 3.4 Validation: expected-output comparison (never code comparison)
- Correct code has many shapes; comparing code text punishes valid solutions
- The contract is: "your program must print exactly this"
- Exercises are authored so output is deterministic (no random, no user-input-dependent output in graded exercises; where input() is taught, the expected output specifies the exact inputs to type)
- After she declares a match, the model solution is revealed WITH a short "compare approaches" checklist: "Did you use a loop or repeat lines? Did you handle the edge case?" — she compares approaches, not text

### 3.5 Effort gate: minimum attempts + escalating hint ladder
- "Show solution" is never one tap away
- She must mark "I tried and got stuck" at least once to unlock Hint 1
- Ladder: Attempt → Hint 1 (nudge: which concept applies) → Attempt → Hint 2 (structural: pseudocode shape) → Attempt → Solution
- Each hint unlock requires a declared attempt in between
- Rationale: the ladder teaches *how to get unstuck*, which is the real skill
- No time-based gates — they feel punitive

### 3.6 Generative exit condition (per module)
- To pass a checkpoint, she must complete an **unscaffolded exercise**: a novel task of equivalent complexity, with expected output given but no hints and no visible related examples
- Passing = her declared output match on the exit exercise
- This is the module's only gate; practice exercises are formative, the exit is summative

---

## 4. Playfulness Model

**Principle: the CONTENT is playful, not the chrome.** No XP, no leaderboards (audience of one), no streaks.

- Exercises are inherently fun: bias name generator, fan-chant printer, "roast your friend" string formatter, era-guessing quiz logic
- Error-message glossary written with humor ("`SyntaxError` = Python's way of saying 'namjoon would be disappointed, check your punctuation'")
- **Photocard collection:** each module completion awards a digital photocard (styled card, no real BTS imagery — original illustrated/abstract cards named after concepts, e.g. "The Loop Era" card). Using a hint "cracks" a corner of that module's card — visible cost, brute-forcing hints has a price, but never blocks progress
- Celebration screens on checkpoint pass — confetti, one playful line, nothing more

**Content-safety note:** the app must not reproduce copyrighted song lyrics or official BTS images. Use member names, song/album titles, years, and fan-culture references (all facts), plus original artwork.

---

## 5. The BTS Content Spine

One shared dataset evolves across all modules. By the capstone she is intimate with it.

### Dataset (grows with her skills)
- Module-early: simple strings (member names, song titles)
- Module-mid: lists (`members = ["RM", "Jin", "Suga", "J-Hope", "Jimin", "V", "Jungkook"]`)
- Module-late: list of dicts (songs with title, album, year, mood)

### Concept → BTS anchor mapping
- **Variables & printing** → store and print member names, debut year math (2026 − 2013)
- **Strings** → bias name generator, count letters in "Jungkook", uppercase fan chants, f-strings for "My bias is {name}"
- **Lists** → the members list: indexing ("who is members[3]?"), append a new favorite, slicing the rap line
- **Loops** → print the full fan chant one name per line, count songs per album
- **Conditionals** → "which era?" logic (if year < 2016 → "school trilogy era"), ticket-price checker
- **Dicts** → one song as a dict; look up album by title
- **Lists of dicts + loops combined** → "find all songs from 2020", "count songs by mood"
- **Functions** → `recommend_song(mood)`, `is_maknae(name)`, reusable chant printer
- **Errors module (cross-cutting)** → deliberately broken snippets she must fix; teaches reading tracebacks as a skill, not a punishment

### Capstone (the dream project)
- A terminal BTS quiz app OR setlist builder she can demo to friends
- Entirely within the Pareto-20% syntax
- Spec'd as a checkpoint: feature list + example session transcript (the "expected output" at project scale)
- Passing = she records/declares a full working session matching the transcript shape

---

## 6. Curriculum Map

### Tier 0 — Setup (Module 0)
- Install Python (Windows + Mac paths, with screenshots)
- Run first file from terminal: `python hello.py`
- Exit: prints a chosen member's name from a .py file she created herself

### Tier 1 — Basics (Modules 1–4)
- M1: Variables + print + f-strings
- M2: Numbers + basic math (debut-year arithmetic)
- M3: Strings + methods (upper, len, in, slicing)
- M4: Errors 101 — reading tracebacks, fixing broken code

### Tier 2 — Beginner (Modules 5–8)
- M5: Lists
- M6: if / elif / else
- M7: for loops (+ range)
- M8: while loops + input() (interactive quiz mechanics)

### Tier 3 — Intermediate (Modules 9–11)
- M9: Dicts
- M10: Functions
- M11: Combining it all — lists of dicts, loops + conditionals + functions together

### Tier 4 — Capstone
- M12: The quiz app / setlist builder project

### Tier 5 — Advanced (unlocked post-capstone, out of initial scope)
- Files, simple APIs, classes — only when she has felt the pain each one solves

### Deliberately cut (anti-Pareto)
- Tuples-vs-lists debates, OOP-first, comprehensions, typing/mypy, virtual environments, exhaustive method coverage

---

## 7. Screens (PWA)

- **Home / Map:** checkpoint path (visual journey through "eras"), current module highlighted, photocard shelf
- **Module screen:** concept explainer → worked examples → exercise list → exit exercise (locked until practice exercises attempted)
- **Exercise screen:** task, expected output block (copy-safe monospace), "I tried and got stuck" button, hint ladder, "My output matches" button, revealed solution + approach checklist
- **Photocard shelf:** collected cards, cracked corners visible
- **Setup guide (Module 0):** OS picker → step-by-step, per OS path

### 7b. What a setup step may show

Module 0 is where beginners quit, so every step has to be followable on the learner's own
machine. Two rules decide what a step is allowed to put on the page. Both **supersede the
"real screenshot per step" part of issue #13's acceptance criteria** — a future change must not
restore a placeholder or a one-sided screenshot as a "fix".

- **A command, or the output a command prints, is text — never an image** (#61). Text can be
  selected and copied, read aloud by a screen reader, and machine-verified by
  `scripts/verify-outputs.py`; a picture of a terminal can do none of those and goes stale the
  moment a prompt or a version number changes. There is exactly one component that renders an
  output block, `src/ExpectedOutput.tsx`, so the stepper's `IT PRINTS` and the checkpoint's
  `EXPECTED OUTPUT` are the same thing with a different heading — whitespace toggle included.
- **A GUI screenshot ships only as a complete Windows + Mac pair, at the same step index on
  both paths** (#62). A picture on one path and a placeholder on the other tells the other
  learner she got the lesser version of the lesson. Where no pair exists — the Windows
  installer's PATH checkbox, the macOS `.pkg` wizard, the Notepad and TextEdit save dialogs,
  none of them capturable from this repo's only dev host — the step carries `look`: the
  on-screen landmarks in words (the exact button wording, roughly where it sits, what to click
  next, and what to do if it went wrong). `SetupShot` has no "pending" variant, so a one-sided
  placeholder is not expressible in the content model.
- **`look` describes the window, so a command step gets one too** (#67). The two rules above
  govern what a step may *show*; this one governs what it must *say*. `look` and `command` are
  not alternatives — `look` is the window, `command` is the line typed into it — so a step that
  runs something still describes its window wherever the window itself is unfamiliar. Step 3 on
  both paths is the first terminal the learner has ever opened, and the screenshot rule 3
  removed there was quietly doing a second job: showing a first-timer that a terminal *is* a
  near-empty rectangle with a blinking cursor, and that this is not a page that failed to load.
  So step 3 says where the window appears, how bare it looks, what the prompt and cursor are,
  and that there is nothing to click.

The pair that does exist and stays: `src/art/setup/python-downloads-windows.png` and
`python-downloads-mac.png` — the python.org download page as each OS sees it.

---

## 7a. Legibility floor

The learner is a beginner on a phone, often at reduced brightness. Text she must read is
never dimmed below **WCAG 2.2 AA**: 4.5:1 on the page ground, or 3:1 where the type is
large (≥ 24px, or ≥ 18.66px at weight ≥ 700).

- **Locked and unearned states step back in ink, never in `opacity`.** A dimmed ancestor
  multiplies every colour inside it — that is how the map's locked module numbers reached
  1.28:1 (#45). A locked row is quiet because its ink is a quieter token, and it reads as
  locked from its chip, its cursor and its markup (a non-focusable `aria-disabled` element
  with no `href`), never from being hard to see.
- **The locked copy is the app explaining its own rules** ("Unlocks when every practice
  exercise is matched or its solution seen"), so it is held to the same floor as any other
  sentence, whatever the letter of the spec allows for disabled controls.
- **Quiet text is a role, not a colour.** `src/tokens.css` names the roles the app uses —
  `--color-text-quiet`, `--color-text-locked`, `--color-text-accent` — each pinned to a step
  of the design system's ramps that clears AA at the sizes it is used at. Screens use the
  role, so the decision is made once instead of drifting across fifteen stylesheets (#46).
- **Brand red is a display colour, not a text colour.** `--color-accent` (#ec3013) is 3.76:1
  on the ground: enough for the 3:1 that large type needs, so the big accent numerals keep
  it, and not enough for an 11px kicker, which uses `--color-text-accent`
  (`--color-accent-700`) — the step BRAND.md already sets the wordmark's ".py" in.
- **Links and ghost buttons are text, so they take the text step.** The design system paints
  `a` and `.btn-ghost` in `--color-accent`, and this app renders every one of them at
  13px/800 — the `← Map` back links, `Photocard shelf →`, `Settings →` — where 3.76:1 fails
  (#55). `src/tokens.css` routes both to `--color-text-accent` (6.41:1). The line to hold is
  the one above: small interactive text moves, display red does not. `.home-num--current`
  (24px/900), `.setup-step-num` (22px/900), the filled `.btn-primary` and the
  `:focus-visible` ring all keep `--color-accent` — and a bright ring around darker-red ink
  is easier to tell apart than a bright ring around bright-red ink was.
- **A label moves with the text step; its border does not, unless the border
  itself fails.** The map's `UP NEXT` chip (`.tag-outline`) paints both its
  label and its 1px border in `--color-accent`, and only the label — 11px/400
  — is held to the 4.5:1 text floor and fails it at 3.76:1 (#59).
  `src/tokens.css` moves the label to `--color-text-accent`. The border is a
  non-text UI boundary, held to 3:1, and `--color-accent` already clears that,
  so it stays: darkening only the label pairs a brighter border with darker
  ink, the same two-step shape `.tag-accent` and `.tag-neutral` already use
  (a tinted background with a darker ink a step down the ramp).
- The floor is measured, not eyeballed: `node scripts/contrast-audit.mjs` reports the real
  rendered ratio for every quiet and dimmed style, with ancestor opacity folded in
  (docs/QA.md).

---

## 8. Success Criteria

- She completes the capstone and demos it to someone
- She asks an unprompted "can I make it do X?" question — the curiosity signal
- Hint usage trends downward across modules (unstuck-skill is growing)
