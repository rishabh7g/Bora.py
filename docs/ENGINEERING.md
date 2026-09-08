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

Every runtime dependency is listed in `package.json`; nothing below is aspirational.

- **React 18 + Vite 6** — PWA scaffolding via `vite-plugin-pwa`
- **TypeScript** — content schema benefits enormously from types
- **Hand-written CSS — no CSS framework of any kind** — the design system vendored at
  `design/_ds/modernist-86c43557-9db6-4330-a863-9ea3a48fad23/styles.css` supplies the
  ramps and the component classes (`.btn`, `.tag`, the themed focus ring); `src/app/main.tsx`
  imports it, then `src/styles/tokens.css`, then each screen brings its own stylesheet. There
  are 14 of them, each in the folder of the component that imports it (§10):
  `src/styles/tokens.css` for the shared roles, `src/app/app.css` for the shell, and one per
  screen or component (`src/screens/home.css`, `src/screens/exercise.css`,
  `src/components/shelf.css`, and so on). `src/screens/exercise.css` is the one with two
  importers: `ExerciseView` owns it, and `src/components/ExpectedOutput.tsx` renders inside
  that screen's block. There is **one** palette, not a palette per tier: a tier's
  "era" is a text label authored in `content/curriculum.json` ("Wings era"), rendered as
  prose by `HomeMap`, and it recolours nothing
- **`prismjs`** for Python syntax highlighting (§8) and **`lucide-react`** for the three
  bottom-nav icons — the only two other runtime dependencies
- **IndexedDB via `idb-keyval`** for progress (`src/state/progress.ts`). Two UI
  preferences deliberately sit outside it, in `localStorage`: the setup guide's OS choice
  (`src/state/setupOs.ts`) and the whitespace toggle (`src/state/whitespaceVisible.ts`).
  Neither is a checkpoint, neither may travel in the progress backup file, and both must
  be readable synchronously on first paint so the screen does not flash the wrong state
- **Service worker** (Workbox through `vite-plugin-pwa`): precache the entire app +
  content; the whole curriculum works offline. Configured in one place,
  `src/pwa/manifest.ts` (§9)
- **No router dependency** — ~5 screens switched on `window.location.hash` in
  `src/app/App.tsx` (§7)

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
- `SOLUTION_REVEALED` is the top of the ladder: there is no rung past it, so a further declared attempt unlocks nothing. The screen therefore offers **only** "My output matches" there, and says nothing about a next rung — no control that cannot move the state, no promise the state machine cannot keep
- Trust-based by design: she *can* lie about matching. That's fine — audience of one, and the capstone is the real test. Do not add verification friction.

## 6. Module Gating

- Module N+1 unlocks when Module N `passed === true`
- Unlocking is one-way: a module she has **worked in** — `passed === true`, or any saved `ExerciseState` — stays unlocked whatever happens in front of it, so resetting Module N never shuts a checkpoint she already cleared (its concept stays readable, its earned photocard keeps opening it) and never strands the attempts, hints and revealed solutions saved in a module she is midway through (#40, #87). "Worked in" is one predicate, `progress.hasModuleProgress`, shared with Settings' reset list — the list of modules offering a reset and the set of modules that are reachable are the same set, by construction
- Within a module: exit exercise unlocks when every formative exercise is `matched || solutionRevealed` (she must engage with each, but a revealed solution still counts as engagement — no dead ends)
- Tier 5 (Advanced) unlocks on capstone pass

## 7. Screens → Components

- `HomeMap` — tier/module path, each tier headed by its title and its era label (text, not a colour scheme — §2); reads Progress
- `ModuleView` — concept doc, worked examples (code blocks with copy button — a browser that refuses the clipboard write gets a caught rejection and a temporary `COPY FAILED` plus a note, never a silent no-op), exercise list with state chips
- `ExerciseView` — the core screen: prompt, expected-output block (monospace, copy-safe, whitespace-visible toggle for trailing-space debugging), attempt/hint/match buttons per state machine, revealed solution with syntax highlighting + approach checklist
- `PhotocardShelf` — grid of cards, crack overlays
- `SetupGuide` — OS picker (Windows/Mac), stepper with screenshots (bundled images). Module 0 is the setup guide and nothing else: it has no concept doc and no formative exercises, so it has **no `ModuleView` route** — its exit checkpoint is rendered inline at the end of the guide, and every `#/module/m0…` hash is canonicalised to `#/setup`
- `Settings` — export/import progress, reset module

**Route fallbacks (`src/app/App.tsx`):** there is exactly one fallback for a hash the app cannot honour — the Home map, the app's root, which always offers a way on. A hash the router does not recognise, a module id the curriculum does not have and an exercise id the module does not have all land there; a `Route` therefore carries the resolved `Module`/`Exercise`, not their ids, so no screen can be reached without real content behind it and no screen renders an "Unknown …" dead end. Gated-but-real routes are different, and fall back to the nearest screen that explains the gate: a locked module → the map (its row says why), a locked exit checkpoint → its module screen (its exit row says why).

**Expected-output block detail:** render with a "show whitespace" toggle (·  for spaces, ⏎ for newlines). The #1 beginner frustration with output matching is invisible trailing spaces/newlines — surface it. The concept doc for Module 1 teaches "outputs must match exactly"; how to check is the block's own legend, shown when the toggle is on — said once, where the control is.

## 8. Syntax Highlighting

- `prismjs` at runtime, in `src/components/PythonCode.tsx`. Pre-rendering the highlighted HTML at
  build time was the other option and was not taken: the code blocks are small and few,
  so the runtime cost never justified a second toolchain
- Python-only grammar: `prismjs/components/prism-python` is the single grammar imported,
  so the bundle carries no other language

## 9. PWA Specifics

- `vite-plugin-pwa`, `registerType: 'autoUpdate'`
- Precache: app shell + all content JSON + photocard SVGs + setup screenshots
- Manifest: standalone display, themed icons, portrait orientation
- Update UX: silent auto-update on next launch (content fixes ship invisibly)

## 10. Build & Delivery

- Repo layout:
  - `/src` — app, in feature folders (#133): `src/app/` (entry, shell composition, error
    boundary, `Notice`), `src/shell/` (bottom nav, wordmark), `src/screens/` (one per route),
    `src/components/` (shared presentational pieces), `src/styles/` (the shared
    `src/styles/tokens.css` and the guards that read every stylesheet), `src/state/`,
    `src/content/`, `src/strings/`, `src/pwa/`, `src/art/`, and `src/guards/` for the
    repo-wide tests that police no single module. Every test and stylesheet sits beside the
    module it belongs to; only `src/vite-env.d.ts` sits at the top of `src/`
  - `/src/styles/tokens.css` — app text roles on top of the design system's ramps (`--color-text-quiet`,
    `--color-text-locked`, `--color-text-accent`). `design/_ds/…/styles.css` stays the system's
    source of truth and is never edited here; this file only decides which step each job uses,
    once, so screens do not each pick a ramp step and drift (DESIGN.md §7a). When a *system*
    component's own colour is the thing that fails the legibility floor, the override lands
    here too, as one rule naming the role — `a, .btn-ghost { color: var(--color-text-accent) }`
    (#55) — never as an edit to the vendored stylesheet and never as a hex in a screen's CSS
  - `/content/curriculum.json` — the whole authored curriculum in one file: every tier,
    every module, every exercise. One file per module was the original plan and is not
    what shipped. `src/content/load.ts` is the app's only reader (it maps the authored
    top-level `modules` map onto the §3 types); `src/content/pipelineKeys.ts` strips the
    file to the keys the app actually reads before Vite bundles it
  - `/content/lint.ts` — authoring-rule checks, run in CI by `npm run lint:content`
    (`.github/workflows/deploy.yml`) and asserted again by `content/lint.test.ts`
- Gates: `npm run lint` (eslint), `npm run format` (prettier), `npm run typecheck` and
  `npm test`. `eslint.config.js` takes the recommended JS set, typescript-eslint and
  react-hooks, with `eslint-config-prettier` last so no rule fights the formatter;
  `.prettierrc.json` and `.prettierignore` say what prettier owns. Both are copied from
  rung so the sibling frontends fail the same way ([claude-setup's
  repo-standards](https://github.com/rishabh7g/claude-setup/blob/main/docs/repo-standards.md))
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

- **Output-match false negatives** (whitespace/newlines) → whitespace toggle with its legend + Module 1 teaches exact-matching explicitly
- **Content authoring is the real cost** — ~12 modules × ~10 examples + ~6 exercises each. Budget accordingly; the app is small, the curriculum is the project
- **Copyright** — content lint blocks lyrics; photocard art is original
- **Motivation cliff at Module 0** (install friction) → over-invest in SetupGuide screenshots; this is where beginners quit
