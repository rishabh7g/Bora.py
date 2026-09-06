/**
 * The canonical shell-copy key list (#100, ui-baseline §8 "Copy & strings — One keyed bundle").
 *
 * Every word the app's own chrome says — not the curriculum, which stays where it is in
 * `content/curriculum.json` — lives behind one of these keys. A pack (`src/strings/en.ts` today,
 * more later) supplies the value; nothing in a component may fall back to English of its own.
 *
 * It lives HERE, in the app, and the build tool imports FROM it (`tools/strings-check.ts`) —
 * never the reverse. A `tools/` module the app bundle imports is how a second copy of the list
 * gets born, which is the one thing this file exists to prevent.
 *
 * Keys are DOT-PATHS into a nested object (`home.tier5.title`), so the authored pack
 * (`src/strings/en.ts`) reads like a document instead of a flat table. `t()` (`src/strings/t.ts`)
 * flattens the pack once at module load and reads it back with exactly the key named here.
 *
 * Two tables, welded together by the type system: `STRINGS_KEYS` is the list, and
 * `STRINGS_PLACEHOLDERS` is `Record<StringsKey, readonly string[]>`, so a key added to one and
 * not the other fails `tsc`. `src/strings/stringsKeys.test.ts` proves there is exactly one
 * declaration of each.
 *
 * Scope note: `src/content/setup.ts` — the setup guide's per-step title/body/look copy — is
 * deliberately NOT behind these keys. It is data-driven, per-OS, screenshot-paired content
 * (see the comment at the top of that file), the same category of thing `curriculum.json` is,
 * not shell chrome. `SetupGuide.tsx` itself — the headings, labels and buttons the *component*
 * owns — is fully keyed below.
 */

/* ------------------------------------------------------------------ the list */

export const STRINGS_KEYS = [
  // Shared across screens.
  'common.backArrow',
  'common.reload',
  'common.tryAgain',
  'common.cancel',
  'common.exitCheckpointTitle',
  'common.status.passed',
  'common.status.locked',

  // BottomNav.
  'nav.primaryLabel',
  'nav.map',
  'nav.shelf',
  'nav.settings',

  // ErrorBoundary.
  'errorBoundary.title',
  'errorBoundary.body',

  // ProgressLoading.
  'progressLoading.stalledTitle',
  'progressLoading.stalledBody',
  'progressLoading.pending',

  // HomeMap.
  'home.card.count',
  'home.card.open',
  'home.card.allPassed',
  'home.tier5.title',
  'home.tier5.unlocked',
  'home.tier5.locked',

  // Settings.
  'settings.kicker',
  'settings.title',
  'settings.savedFile',
  'settings.export.h2',
  'settings.export.bodyBeforeFile',
  'settings.export.bodyAfterFile',
  'settings.export.button',
  'settings.summary.checkpoints',
  'settings.summary.oneModule',
  'settings.summary.modules',
  'settings.import.h2',
  'settings.import.body',
  'settings.import.label',
  'settings.import.failedTitle',
  'settings.import.replaceWarning',
  'settings.import.confirmButton',
  'settings.import.confirmedNotice',
  'settings.reset.h2',
  'settings.reset.body',
  'settings.reset.empty',
  'settings.reset.passed',
  'settings.reset.inProgress',
  'settings.reset.button',
  'settings.reset.resetButton',
  'settings.reset.confirmedNotice',

  // ExpectedOutput.
  'expectedOutput.defaultLabel',
  'expectedOutput.showWhitespace',
  'expectedOutput.legend.space',
  'expectedOutput.legend.tab',
  'expectedOutput.legend.lineBreak',
  'expectedOutput.legend.empty',

  // ExerciseView.
  'exercise.kicker.exit',
  'exercise.kicker.numbered',
  'exercise.matched',
  'exercise.matchButton',
  'exercise.stuckButton',
  'exercise.comeBackLater',
  'exercise.hint.label',
  'exercise.hint.revealLabel',
  'exercise.solution.revealLabel',
  'exercise.solution.heading',
  'exercise.checklist.heading',

  // ModuleView.
  'module.copy.ariaIdle',
  'module.copy.copied',
  'module.copy.failed',
  'module.copy.idleLabel',
  'module.copy.blockedNote',
  'module.kicker.plain',
  'module.section.workedExamples',
  'module.section.exercises',
  'module.exit.badge',
  'module.status.matched',

  // CelebrationScreen.
  'celebration.dialogLabel',
  'celebration.title',
  'celebration.unlockTier5',
  'celebration.continueLabel',
  'celebration.line1',
  'celebration.line2',
  'celebration.line3',
  'celebration.line4',

  // PhotocardShelf.
  'shelf.kicker',
  'shelf.headline.empty',
  'shelf.headline.collected',
  'shelf.path.label',
  'shelf.card.captionMint',
  'shelf.card.captionOneCrack',
  'shelf.card.captionCracks',

  // SetupGuide (the component's own chrome — step content stays in content/setup.ts, see above).
  'setup.osLegend',
  'setup.section.installSteps',
  'setup.term.label',
  'setup.more',
  'setup.itPrints.label',
] as const;

export type StringsKey = (typeof STRINGS_KEYS)[number];

/* ------------------------------------------------------------- placeholders */

/**
 * The `{placeholders}` a value MUST carry, keyed off the same list — no more, no fewer
 * (`tools/strings-check.ts` rule 4). Most keys carry none.
 */
export const STRINGS_PLACEHOLDERS: Record<StringsKey, readonly string[]> = {
  'common.backArrow': [],
  'common.reload': [],
  'common.tryAgain': [],
  'common.cancel': [],
  'common.exitCheckpointTitle': [],
  'common.status.passed': [],
  'common.status.locked': [],

  'nav.primaryLabel': [],
  'nav.map': [],
  'nav.shelf': [],
  'nav.settings': [],

  'errorBoundary.title': [],
  'errorBoundary.body': [],

  'progressLoading.stalledTitle': [],
  'progressLoading.stalledBody': [],
  'progressLoading.pending': [],

  'home.card.count': ['passed', 'total'],
  'home.card.open': ['number'],
  'home.card.allPassed': [],
  'home.tier5.title': [],
  'home.tier5.unlocked': [],
  'home.tier5.locked': [],

  'settings.kicker': [],
  'settings.title': [],
  'settings.savedFile': ['fileName'],
  'settings.export.h2': [],
  'settings.export.bodyBeforeFile': [],
  'settings.export.bodyAfterFile': [],
  'settings.export.button': [],
  'settings.summary.checkpoints': ['passed', 'total'],
  'settings.summary.oneModule': ['checkpoints'],
  'settings.summary.modules': ['checkpoints', 'count'],
  'settings.import.h2': [],
  'settings.import.body': [],
  'settings.import.label': [],
  'settings.import.failedTitle': [],
  'settings.import.replaceWarning': [],
  'settings.import.confirmButton': [],
  'settings.import.confirmedNotice': [],
  'settings.reset.h2': [],
  'settings.reset.body': [],
  'settings.reset.empty': [],
  'settings.reset.passed': [],
  'settings.reset.inProgress': [],
  'settings.reset.button': ['number'],
  'settings.reset.resetButton': [],
  'settings.reset.confirmedNotice': ['number'],

  'expectedOutput.defaultLabel': [],
  'expectedOutput.showWhitespace': [],
  'expectedOutput.legend.space': [],
  'expectedOutput.legend.tab': [],
  'expectedOutput.legend.lineBreak': [],
  'expectedOutput.legend.empty': [],

  'exercise.kicker.exit': [],
  'exercise.kicker.numbered': ['index', 'total'],
  'exercise.matched': [],
  'exercise.matchButton': [],
  'exercise.stuckButton': [],
  'exercise.comeBackLater': [],
  'exercise.hint.label': ['number'],
  'exercise.hint.revealLabel': ['number'],
  'exercise.solution.revealLabel': [],
  'exercise.solution.heading': [],
  'exercise.checklist.heading': [],

  'module.copy.ariaIdle': [],
  'module.copy.copied': [],
  'module.copy.failed': [],
  'module.copy.idleLabel': [],
  'module.copy.blockedNote': [],
  'module.kicker.plain': ['number'],
  'module.section.workedExamples': [],
  'module.section.exercises': [],
  'module.exit.badge': [],
  'module.status.matched': [],

  'celebration.dialogLabel': [],
  'celebration.title': ['number'],
  'celebration.unlockTier5': [],
  'celebration.continueLabel': [],
  'celebration.line1': [],
  'celebration.line2': [],
  'celebration.line3': [],
  'celebration.line4': [],

  'shelf.kicker': [],
  'shelf.headline.empty': [],
  'shelf.headline.collected': ['count', 'total'],
  'shelf.path.label': [],
  'shelf.card.captionMint': [],
  'shelf.card.captionOneCrack': [],
  'shelf.card.captionCracks': ['count'],

  'setup.osLegend': [],
  'setup.section.installSteps': [],
  'setup.term.label': [],
  'setup.more': [],
  'setup.itPrints.label': [],
};
