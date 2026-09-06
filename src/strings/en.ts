/**
 * The first (and, today, only) shell-copy pack (#100) — English, authored nested so the file
 * reads like a document: `{"home":{"tier5":{"title":…}}}` is the path `home.tier5.title` names in
 * `src/strings/stringsKeys.ts`.
 *
 * Deliberately NOT typed against `Record<StringsKey, string>`: a mapped type would make a missing
 * key a `tsc` error, which is the wrong failure for a pack — `npm run build` must fail it instead
 * (`tools/strings-check.ts`), the same way an authored locale file will one day fail it. `tsc`
 * only has to agree the shape is plausible object literal; completeness is the checker's job.
 *
 * Adding a locale is adding a sibling file that passes the checker — no code change here.
 */
export const en = {
  common: {
    backArrow: '←',
    reload: 'Reload',
    tryAgain: 'Try again',
    cancel: 'Cancel',
    exitCheckpointTitle: 'Exit checkpoint',
    status: {
      passed: 'PASSED',
      locked: 'LOCKED',
    },
  },

  nav: {
    primaryLabel: 'Primary',
    map: 'Map',
    shelf: 'Shelf',
    settings: 'Settings',
  },

  errorBoundary: {
    title: 'Something went wrong.',
    body: 'This copy of the app hit a problem it could not recover from. Your saved progress is untouched — reloading is safe.',
  },

  progressLoading: {
    stalledTitle: 'Your checkpoints are not loading.',
    // #101: trimmed to the diagnosis (still "storage", still actionable
    // context for the retry button); the "your progress is safe" reassurance
    // was read once and skimmed past forever.
    stalledBody:
      'This browser’s storage looks blocked or unavailable — private browsing and blocked site data can both do it.',
    pending: 'Loading your checkpoints…',
  },

  home: {
    card: {
      count: '{passed} of {total} checkpoints passed',
      open: 'Open Module {number}',
      allPassed: 'Every checkpoint passed.',
    },
    tier5: {
      title: 'Tier 5 — Advanced',
      unlocked: 'is open. Files, APIs, classes — content lands later.',
      locked: 'unlocks after the capstone.',
    },
  },

  settings: {
    kicker: 'Settings',
    title: 'Your progress, your file.',
    savedFile: 'Saved {fileName}.',
    export: {
      h2: 'Export',
      bodyBeforeFile: 'Downloads everything saved here as ',
      bodyAfterFile: '.',
      button: 'Export progress',
    },
    summary: {
      checkpoints: '{passed} of {total} checkpoints passed',
      oneModule: '{checkpoints}, 1 module with saved work.',
      modules: '{checkpoints}, {count} modules with saved work.',
    },
    import: {
      h2: 'Import',
      body: 'Reads a saved file back in.',
      label: 'Backup file',
      failedTitle: 'Import failed.',
      replaceWarning: "Importing replaces the progress saved in this browser with the file's.",
      confirmButton: 'Replace saved progress',
      confirmedNotice: 'Progress replaced from the backup.',
    },
    reset: {
      h2: 'Reset a module',
      body: 'Clears one module’s attempts, hints and checkpoint. Every other module keeps its progress.',
      empty: 'No module has saved progress yet.',
      passed: 'Passed',
      inProgress: 'In progress',
      button: 'Reset Module {number}',
      resetButton: 'Reset',
      confirmedNotice: 'Module {number} reset.',
    },
  },

  expectedOutput: {
    defaultLabel: 'EXPECTED OUTPUT',
    showWhitespace: 'Show whitespace',
    legend: {
      space: '· space',
      tab: '→ tab',
      lineBreak: '⏎ line break',
      empty: 'Nothing hidden in here — no spaces, tabs or line breaks.',
    },
  },

  exercise: {
    kicker: {
      exit: 'Exit checkpoint',
      numbered: 'Exercise {index} of {total}',
    },
    matched: 'Output matched.',
    matchButton: 'My output matches',
    stuckButton: 'I tried and got stuck',
    comeBackLater: 'Come back later',
    hint: {
      label: 'HINT {number}',
      revealLabel: 'Reveal hint {number} — cracks the card',
    },
    solution: {
      revealLabel: 'Reveal solution',
      heading: 'Model solution',
    },
    checklist: {
      heading: 'Compare approaches',
    },
  },

  module: {
    copy: {
      ariaIdle: 'Copy code',
      copied: 'COPIED',
      failed: 'COPY FAILED',
      idleLabel: 'COPY',
      blockedNote:
        'This browser blocked the clipboard. Select the code and copy it by hand — or type it out, which is what these examples are for anyway.',
    },
    kicker: {
      plain: 'Module {number}',
    },
    section: {
      workedExamples: 'Worked examples',
      exercises: 'Exercises',
    },
    exit: {
      badge: 'EX',
    },
    status: {
      matched: 'MATCHED',
    },
  },

  celebration: {
    dialogLabel: 'Checkpoint passed',
    title: 'Module {number} cleared.',
    unlockTier5: 'That was the capstone — Tier 5 (Advanced) is open.',
    continueLabel: 'Continue →',
    line1: 'Borahae. On to the next era.',
    line2: 'Namjoon would be proud of that punctuation.',
    line3: 'No skips, no shortcuts. Legend behavior.',
    line4: 'Add it to the setlist.',
  },

  shelf: {
    kicker: 'Photocard shelf',
    headline: {
      empty: 'Empty shelf. For now.',
      collected: '{count} of {total} collected.',
    },
    path: {
      label: 'Still on the path',
    },
    card: {
      captionMint: 'Mint — no hints used',
      captionOneCrack: '1 crack',
      captionCracks: '{count} cracks',
    },
  },

  setup: {
    osLegend: 'Your machine',
    section: {
      installSteps: 'Install steps',
    },
    term: {
      label: 'TYPE THIS',
    },
    itPrints: {
      label: 'IT PRINTS',
    },
    more: 'What you’ll see',
  },
};
