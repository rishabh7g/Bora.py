# bora.py — Engineering Document

> The product name is **bora.py** — always lowercase, always with the dot
> (design/brand/BRAND.md). Everything below describes that app.

Implements DESIGN.md. Audience: single developer building for a single user.

---

## 1. Architecture Overview

**Static PWA. No backend. No code execution.**

- The app is a content player + progress tracker
- All Python is written and run by the learner on her own machine; the app only shows tasks, expected outputs, hints, and solutions
- No accounts, no server, no database — one user, one device (with export/import as safety net)
- Consequence: hosting is any static host (GitHub Pages / Netlify / Cloudflare Pages), fully offline-capable

## 2. Tech Stack

- **React + Vite** (fast PWA scaffolding via `vite-plugin-pwa`)
- **TypeScript** — content schema benefits enormously from types
- **Tailwind CSS** — quick playful theming (era-based color palettes per tier)
- **IndexedDB via `idb-keyval`** (or localStorage if kept trivial) for progress state
- **Service worker** (Workbox through vite-plugin-pwa): precache the entire app + content; the whole curriculum works offline
- No router needed beyond something small (React Router or hash routing) — ~5 screens

## 3. Content Model

All curriculum is static typed data, bundled at build time. Content is data, not components — modules are added by editing JSON/TS files, never by writing new screens.

```ts
type Curriculum = { tiers: Tier[] };

type Tier = { id: string; title: string; modules: Module[] };

type Module = {
  id: string;            // "m5-lists"
  title: string;         // "Lists — The Members"
  concept: ConceptDoc;   // explainer markdown + worked examples
  exercises: Exercise[]; // formative, ordered
  exitExercise: Exercise;// summative, no hints
  photocard: Photocard;
};

type ConceptDoc = {
  intro: string;               // markdown
  examples: WorkedExample[];   // 8–10
};

type WorkedExample = {
  code: string;        // shown with syntax highlighting
  output: string;      // exact terminal output
  why: string;         // one-line explanation
};

type Exercise = {
  id: string;
  prompt: string;          // markdown task description
  expectedOutput: string;  // exact, deterministic
  inputsToType?: string[]; // for input()-based exercises: the exact inputs
  hints: [string, string]; // Hint 1 (concept nudge), Hint 2 (pseudocode shape)
  solution: string;        // model code
  approachChecklist: string[]; // shown WITH solution after match/reveal
  isExit?: boolean;        // exit exercises: hints array empty, ladder disabled
};

type Photocard = { id: string; title: string; art: string /* svg ref */ };
```

**Authoring rules (enforced by a content lint script):**
- `expectedOutput` must be deterministic — no randomness, no timestamps
- Exercises using `input()` must define `inputsToType`
- Exit exercises must have zero hints
- No copyrighted lyrics or official imagery anywhere in content or art

## 4. Progress State

```ts
type Progress = {
  version: 1;
  modules: Record<ModuleId, ModuleProgress>;
};

type ModuleProgress = {
  exercises: Record<ExerciseId, ExerciseState>;
  passed: boolean;           // exit exercise matched
  cardCracks: number;        // total hints used in module (0–2 per exercise summed, capped for display)
};

type ExerciseState = {
  attempts: number;              // "I tried and got stuck" count
  hintsUnlocked: 0 | 1 | 2;
  matched: boolean;              // learner declared output match
  solutionRevealed: boolean;
};
```

**Persistence:** write-through to IndexedDB on every state change. Export/import as a JSON file (single button in settings) — this is the backup story; losing browser storage must not lose weeks of progress.

## 5. Core Logic — The Effort Gate

State machine per exercise:

```
LOCKED_HINTS ──"I tried & stuck" (attempts=1)──▶ HINT1_AVAILABLE
HINT1_AVAILABLE ──view hint1──▶ HINT1_SEEN
HINT1_SEEN ──"tried & stuck" (attempts=2)──▶ HINT2_AVAILABLE
HINT2_AVAILABLE ──view hint2──▶ HINT2_SEEN
HINT2_SEEN ──"tried & stuck" (attempts=3)──▶ SOLUTION_AVAILABLE
ANY_STATE ──"My output matches"──▶ MATCHED (solution + checklist revealed)
```

Rules:
- Solution is reachable only via MATCHED or the full ladder (3 declared attempts minimum)
- Exit exercises: no ladder; only MATCHED or "come back later" (never blocked forever — she can leave and return, state persists)
- Each hint viewed adds one "crack" to the module's photocard (visual only, never blocks anything)
- Trust-based by design: she *can* lie about matching. That's fine — audience of one, and the capstone is the real test. Do not add verification friction.

## 6. Module Gating

- Module N+1 unlocks when Module N `passed === true`
- Unlocking is one-way: a module whose own `passed === true` stays unlocked whatever happens in front of it, so resetting Module N never shuts a checkpoint she already cleared (its concept stays readable, its earned photocard keeps opening it)
- Within a module: exit exercise unlocks when every formative exercise is `matched || solutionRevealed` (she must engage with each, but a revealed solution still counts as engagement — no dead ends)
- Tier 5 (Advanced) unlocks on capstone pass

## 7. Screens → Components

- `HomeMap` — tier/module path, era-themed; reads Progress
- `ModuleView` — concept doc, worked examples (code blocks with copy button), exercise list with state chips
- `ExerciseView` — the core screen: prompt, expected-output block (monospace, copy-safe, whitespace-visible toggle for trailing-space debugging), attempt/hint/match buttons per state machine, revealed solution with syntax highlighting + approach checklist
- `PhotocardShelf` — grid of cards, crack overlays
- `SetupGuide` — OS picker (Windows/Mac), stepper with screenshots (bundled images). Module 0 is the setup guide and nothing else: it has no concept doc and no formative exercises, so it has **no `ModuleView` route** — its exit checkpoint is rendered inline at the end of the guide, and every `#/module/m0…` hash is canonicalised to `#/setup`
- `Settings` — export/import progress, reset module

**Expected-output block detail:** render with a "show whitespace" toggle (·  for spaces, ⏎ for newlines). The #1 beginner frustration with output matching is invisible trailing spaces/newlines — surface it, and the concept doc for Module 1 explicitly teaches "outputs must match exactly, here's how to check."

## 8. Syntax Highlighting

- `shiki` at build time (content is static — pre-render highlighted HTML into the bundle, zero runtime cost) or `prism` runtime if simpler
- Python-only grammar; keep bundle lean

## 9. PWA Specifics

- `vite-plugin-pwa`, `registerType: 'autoUpdate'`
- Precache: app shell + all content JSON + photocard SVGs + setup screenshots
- Manifest: standalone display, themed icons, portrait orientation
- Update UX: silent auto-update on next launch (content fixes ship invisibly)

## 10. Build & Delivery

- Repo layout:
  - `/src` — app
  - `/content` — curriculum TS/JSON files (one file per module)
  - `/content/lint.ts` — authoring-rule checks, runs in CI
- CI: typecheck + content lint + build → deploy to static host on push
- No analytics, no error tracking (single known user; she can screenshot problems)

## 11. Build Order (Pareto sequence)

1. Content schema + Module 1 content authored end-to-end (proves the model)
2. `ExerciseView` with full state machine + persistence (the product IS this screen)
3. `ModuleView` + gating
4. `HomeMap` + photocards
5. PWA/offline + export/import
6. Author remaining modules (bulk of remaining effort is content, not code)
7. `SetupGuide` with real screenshots
8. Polish: era theming, celebration screens, whitespace toggle

Steps 1–2 ≈ 20% of the work and deliver 80% of the product's value. Everything after is incremental.

## 12. Risks

- **Output-match false negatives** (whitespace/newlines) → whitespace toggle + Module 1 teaches exact-matching explicitly
- **Content authoring is the real cost** — ~12 modules × ~10 examples + ~6 exercises each. Budget accordingly; the app is small, the curriculum is the project
- **Copyright** — content lint blocks lyrics; photocard art is original
- **Motivation cliff at Module 0** (install friction) → over-invest in SetupGuide screenshots; this is where beginners quit
