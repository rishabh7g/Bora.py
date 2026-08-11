# PyLearn — Design Document

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
- **Setup guide (Module 0):** OS picker → step-by-step with screenshots

---

## 8. Success Criteria

- She completes the capstone and demos it to someone
- She asks an unprompted "can I make it do X?" question — the curiosity signal
- Hint usage trends downward across modules (unstuck-skill is growing)
