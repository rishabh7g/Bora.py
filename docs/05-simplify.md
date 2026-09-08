# bora.py — the "said once" pass

The same pass that took rung from a two-phase Practice, a four-statement Home and a
three-screen sentence to one card, one position and two tiers (rung #386–#408). The
principle, in one line: **measure every screen at 360px, state every fact once, delete
machinery the learner cannot act on, and ship only what the app reads.** Rules and content
are untouched; only what is on screen, and how much of it, changes.

Measured 2026-09-06 against `npm run dev`, 360×740, a real Chromium. "Screens" is
scroll height over viewport height; "CTA y" is where the one thing she came to do sits.

| Screen | Screens tall | Primary CTA y | Words |
|---|---|---|---|
| Home, fresh | 3.45 | 316 | 203 |
| Home, two passed | 3.41 | 606 (below the fold, and sinking one row per pass) | 203 |
| Setup guide | 8.14 | 5303 | 824 |
| Module | 2.35 | — | 199 |
| Exercise, fresh | 1.44 | 472 | 105 |
| Exercise, solution revealed | 1.86 | — | 134 |
| Exit checkpoint | 1.11 | 558 | 87 |
| Shelf, two earned | 3.32 | — | 173 |
| Settings | 1.24 | 265 | 85 |
| Celebration | 1.10 | 492 | — |

Six passes, in value order. Each is one PR, verified live at 360px before it closes,
with before/after numbers in the commit body the way the rung commits carry them.

---

## 1. Home leads with the checkpoint (the rung #396–#399 move)

**What she sees twice.** Her position is stated four times: the `2 / 13 CHECKPOINTS`
chip, `Next up: Module 02.`, the `UP NEXT` tag, and the highlighted row. Above the first
useful row sit a wordmark, a `CHECKPOINT PATH` kicker, and `Annyeong, ARMY.` — three lines
that never change. Every tier prints a title and an era; every row prints title, anchor
and a status chip. Tier 5 is a permanent placeholder section for content that does not
exist.

- The current checkpoint becomes a card at the top of the body: number, title, anchor,
  one button (`Open Module 02`). It is the one statement of where she is.
- Retire `home.kicker`, `home.progressLine.*`, `home.status.upNext`; the count chip moves
  into the card's kicker line (`2 of 13 passed`) so the number is printed once.
- The ladder under the card: passed rows keep title + a link (they are the reading path);
  the current row is a plain row (the card above IS that module); locked rows are one
  title line, no anchor, no chip. `LOCKED` and `OPEN` chips go — the row style says it.
- Tier heads become one line (`Tier 1 · School trilogy era`); the Tier 5 section becomes
  one quiet line after the ladder, or nothing until it has content.
- Greeting and wordmark: keep the wordmark (the one place the name is set), drop the
  greeting — a fixed name in a fixed line is chrome, not warmth.

Target: CTA at y < 320 in every state, ≤ 1.6 screens mid-climb. Strings: ~6 keys retired.

## 2. Exercise is one card, the ladder is one button (the rung #386–#391 move)

**What she sees twice.** The screen shows the state machine instead of the next step:
a HINT LADDER section with three rows, each carrying a lock sentence (`Locked. Mark "I
tried and got stuck" after a real attempt.`), an attempts line that narrates the rule
(`1 attempt declared. Try again to unlock the next rung.`), and a SOLUTION row whose only
content is `Revealed below.` The module title is printed twice (back link and kicker).
On an exit: the kicker, an all-caps `UNSCAFFOLDED. NO HINTS ON THIS ONE.` banner and the
attempts note all say "no hints". On a match: a banner, then a `Model solution` heading,
then `Compare approaches` — the banner announces the two headings under it.

- One action row, two buttons, always: `My output matches` and the *next rung's* action.
  The second button is whatever the gate makes legal right now — `I tried and got stuck`,
  then `Reveal hint 1`, then stuck, `Reveal hint 2`, stuck, `Reveal solution`, then
  nothing. `effortGate.ts` is untouched; `gateStateOf` already names the next legal move.
- Revealed hints stack above the buttons as plain text, labelled `Hint 1` / `Hint 2`.
  No ladder heading, no locked rows, no lock notes, no attempts narration.
- Exit: kicker says `Exit checkpoint`, nothing else does. The banner and `exitFirstNote`
  go; `Come back later` stays.
- Matched: the banner collapses to one line (`Output matched.`); the solution and the
  checklist follow under their own headings as now.
- Back link is `← Module 01`, kicker is `Exercise 1 of 3` — the module title once.

Target: fresh ≤ 1.1 screens with both buttons above the fold; solution state ≤ 1.4.
Strings: ~12 keys retired (`exercise.attempts.*`, `exercise.hint.locked*`,
`exercise.solution.revealedNote/lockNote`, `exercise.exitNote`, `exercise.section.hintLadder`).

## 3. Setup is a step list with the detail behind a door (the rung #401 move)

**What she sees twice.** Eight screens and 824 words at the exact place beginners quit.
Every step opens every optional block: a body, a `WHAT YOU'LL SEE` landmark list, a
`TYPE THIS` line, an `IT PRINTS` block with the whitespace toggle and its sub-line, a
screenshot with caption. The provenance sentence about python.org's date sits above step
1 where nobody needs it yet. The checkpoint at the end carries a label, a title, a
sub-line, and a note that says "no hints" and "your place is kept" — the second of which
is the whole app's rule.

- A step is: number, title, the one line she does (the `command` in its `<pre>` when there
  is one, else the body's first sentence), and one disclosure, `What you'll see`, holding
  `body`, `look` and the screenshot. Closed by default; the content model does not change.
- `IT PRINTS` loses the toggle and the sub-line inside the stepper — it is two lines of
  `Jimin`, not an exercise. `ExpectedOutput` gets a `plain` variant, or the stepper
  renders a `<pre>` (one block still owns the checkpoint's output).
- The provenance line moves into step 1's disclosure, next to the download page it dates.
- Checkpoint: `EXIT CHECKPOINT` label + title become the title; `setup.exit.note`,
  `setup.exit.sub` and `setup.exit.passedNote` go (the celebration already says Module 01
  is open).

Target: ≤ 2.5 screens closed, checkpoint CTA reachable in one scroll. Strings: ~6 retired.

## 4. Module says the module once

**What she sees twice.** `MODULE 01 — TIER 1 — BASICS` restates the tier the map just
showed. The m1 intro spends half its 484 characters explaining the whitespace toggle —
a fact that belongs on the block that has the toggle, and already has a legend. Exercise
rows carry a five-state chip (`NOT STARTED / TRIED ×2 / HINT 1 USED / SOLUTION SEEN /
MATCHED`) that reports the effort-gate's internals; the exit row prints a sub-line on
both states (`Summative. No hints, no examples on screen…` / `Unlocks when every
practice exercise is matched…`) plus a `READY`/`LOCKED` chip that says the same.

- Kicker is `Module 01`. Exercise chips collapse to two states: matched (tick) or not.
- Exit row: title and a lock or a link; the two sub-lines go. The rule it stated is
  visible in the rows above it.
- `← Map` goes: Map is the nav's first item, and #83 already says a nav destination is
  never repeated in a body. Only `.ex-back` (to a module, which the nav does not list)
  survives; the same applies to `.setup-back`.
- Content: cut the whitespace paragraph from m1's intro; cap intros at ~250 characters
  in `content/lint.ts` the way rung capped notes at 200 (#407). m1 and m4 are over.

Target: ≤ 1.8 screens. Strings: ~8 retired (`module.status.*` bar matched,
`module.exit.summativeNote/lockedNote`, `module.kicker.withTier`, `common.backToMap`).

## 5. Shelf shows what she has

**What she sees twice.** Eleven full-size grey placeholders each saying `NOT EARNED` on
the face and `Pass the checkpoint to earn it` underneath — two statements, eleven times,
3.3 screens. The lede restates the crack rule the captions already state per card.

- Earned cards at full size, in order. Unearned modules are one compact row of numbered
  slots (the rung level-strip move, #398), or a single line: `11 more on the path.`
- Lede goes; the headline (`2 of 13 collected.`) is the one count.

Target: ≤ 1.2 screens with two earned. Strings: 3 retired.

## 6. Everything else, said once

- **Settings.** Already 1.24 screens. `settings.reset.body` is three lines explaining a
  one-word button (the rung #394 fault); cut to one. The file name is printed in both
  Export and Import bodies; keep it in Export. Strings: ~4 retired.
- **Celebration.** `CHECKPOINT PASSED` kicker over `Module 01 cleared.` is one fact
  twice, and `Photocard added to shelf` is the card's own caption. Keep the title, the
  line, the card. Strings: 2 retired.
- **Strings.** ~250 keys today; the passes above retire ~40. `tools/strings-check.ts`
  keeps the canonical list honest, as `stringsKeys` did in rung.
- **Content ships only what the app reads** (rung #404). `num`, `tier`, `photocard.id`,
  `brand` and `inputsToType` (no reader anywhere in `src/`) come off the emitted JSON;
  the authored file keeps them for the lint.
- **Docs and captures.** `README.md` still says "Implementation in progress";
  `docs/screenshots` holds 54 files, 30 of them `fix-NN-before/after` pairs of UI these
  passes retire — keep the nine current 390px captures, recapture them at 360px after each
  pass, delete the rest (rung 425c23f). 01-design.md §7c's four rules stay; the paragraphs of
  rationale under each move to the commit that made them.
- **Tests.** 2,825 lines of screen render tests against 1,441 lines of state, content and
  PWA tests. Each pass rewrites the render tests it touches down to the contract (route,
  gate, what is and is not on screen), not the copy; the CSS-fact suites (`textFloor`,
  `gutter`, `layout`, `appFeel`, `shellPurity`) are reviewed last, the rung #122d260 cut.

---

## What does not change

- Every rule in `state/effortGate.ts`, `state/gating.ts`, `state/progress.ts`. No new
  progress version is needed: nothing persisted moves.
- The content schema and the authored curriculum, except the intro cap in pass 4.
- The nav's three destinations and its four rules (01-design.md §7c).
- The design package under `design/`, kept as delivered.

## Order and verification

1. Home  2. Exercise  3. Setup  4. Module  5. Shelf  6. The rest.

Each pass is one commit on `claude/bora-simplification-plan-uxk3qa`; its body leads with the
before/after measurement at 360px and lists the retired string keys. The measure script is
`scripts/measure-screens.mjs`; the recaptured screens are `docs/screenshots/360-*.png`.

## Done — measured 2026-09-06, after all six passes

Same method, same viewport, same script.

| Screen | Before | After | Primary CTA y, before → after |
|---|---|---|---|
| Home, fresh | 3.45 | 1.96 | 316 → 216 |
| Home, two passed | 3.41 | 2.13 | 606 → 216 |
| Setup guide (doors closed) | 8.14 | 3.85 | 5303 → 2468 |
| Module | 2.35 | 1.94 | — |
| Exercise, fresh | 1.44 | 1.00 | 472 → 439 |
| Exercise, solution revealed | 1.86 | 1.42 | — |
| Exit checkpoint | 1.11 | 1.00 | 558 → 439 |
| Shelf, two earned | 3.32 | 1.00 | — |
| Settings | 1.24 | 1.16 | 265 → 265 |
| Celebration | 1.10 | 1.10 | — |

Words on the fresh exercise screen: 105 → 41. On the setup guide: 824 → 326. Strings: 133
canonical keys → 94. Emitted curriculum: `version`, `brand`, `num`, `tier` and
`inputsToType` no longer ship.

What missed its target, and why: Setup's 2.5-screen target assumed the step bodies could
go behind the door too. They are the instruction — what to click, what to type — so they
stay on the page; 3.85 closed is five authored steps at 16px on a 360px phone. Home's
1.6-screen target assumed fewer rows; thirteen rows at a 40–56px minimum is 2.1 screens,
with the button at y=216 in every state, which was the point.

What was left alone, and should be looked at next: the CSS-fact suites (`textFloor`,
`gutter`, `layout`, `appFeel`, `shellPurity`) were updated to the new selectors, not cut;
the module intros and the setup step bodies were not rewritten beyond m1 and m4; the
contrast audit's rows were renamed to the new selectors but not re-run against a preview
build here.
