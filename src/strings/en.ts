/**
 * The first (and, today, only) shell-copy pack (#100) — English, authored nested so the file
 * reads like a document: `{"home":{"lede":…}}` is the path `home.lede` names in
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
    backToMap: '← Map',
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
    stalledBody:
      'This browser’s storage looks blocked or unavailable — private browsing and blocked site data can both do it. Your progress is safe; this copy of the app just cannot read it.',
    pending: 'Loading your checkpoints…',
  },

  home: {
    kicker: 'Checkpoint path',
    checkpointsCount: '{passed} / {total} CHECKPOINTS',
    greeting: 'Annyeong, {name}.',
    lede: 'Progress is checkpoints passed — never days or streaks. {progressLine}',
    progressLine: {
      next: 'Next up: Module {number}.',
      allPassed: 'Every checkpoint passed. Tier 5 is yours.',
    },
    status: {
      upNext: 'UP NEXT',
      open: 'OPEN',
    },
    tier5: {
      title: 'Tier 5 — Advanced',
      unlocked: 'Files, APIs, classes. Unlocked — content lands later.',
      locked: 'Files, APIs, classes. Unlocks after the capstone.',
    },
  },

  settings: {
    kicker: 'Settings',
    title: 'Your progress, your file.',
    lede: 'Everything is saved in this browser only — no account, no server. Export a copy so a cleared browser or a new device never costs you the work.',
    savedFile: 'Saved {fileName}.',
    export: {
      h2: 'Export',
      bodyBeforeFile: 'Downloads everything saved here as ',
      bodyAfterFile: '. Keep it wherever you keep files.',
      button: 'Export progress',
    },
    summary: {
      checkpoints: '{passed} of {total} checkpoints passed',
      oneModule: '{checkpoints}, 1 module with saved work.',
      modules: '{checkpoints}, {count} modules with saved work.',
    },
    import: {
      h2: 'Import',
      bodyBeforeFile: 'Reads a ',
      bodyAfterFile: ' file back in. It replaces what is saved here, and only after you confirm.',
      label: 'Backup file',
      failedTitle: 'Import failed.',
      replaceWarning: "Importing replaces the progress saved in this browser with the file's.",
      confirmButton: 'Replace saved progress',
      confirmedNotice: 'Progress replaced from the backup.',
    },
    reset: {
      h2: 'Reset a module',
      body: 'Clears the attempts, hints and checkpoint of one module so it can be worked through again. Every other module keeps its progress, and checkpoints already passed stay open — this one simply becomes the one you are on.',
      empty: 'No module has saved progress yet.',
      passed: 'Passed',
      inProgress: 'In progress',
      button: 'Reset Module {number}',
      resetButton: 'Reset',
      confirmedNotice: 'Module {number} reset.',
    },
  },

  expectedOutput: {
    defaultSub: 'your terminal should print this',
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
    exitNote: 'EXIT CHECKPOINT — UNSCAFFOLDED. NO HINTS ON THIS ONE.',
    matchedBanner:
      'Output matched — checkpoint logged. Model solution below: compare approaches, not text.',
    matchButton: 'My output matches',
    stuckButton: 'I tried and got stuck',
    comeBackLater: 'Come back later',
    attempts: {
      unit: {
        one: 'attempt',
        other: 'attempts',
      },
      declared: '{count} {unit} declared.',
      ladderSpentSuffix:
        ' Every rung is open — the model solution is below. Compare it with yours, then mark the match whenever your output lines up.',
      exitFirstNote:
        'Write it on your machine, run it, compare. No hints on this one — leave and come back anytime.',
      firstNote: 'Write it on your machine, run it, compare. Declaring an attempt unlocks the next rung.',
      stuckSuffix: ' Next rung unlocked below.',
      tryAgainSuffix: ' Try again to unlock the next rung.',
    },
    hint: {
      lockedFirst: 'Locked. Mark "I tried and got stuck" after a real attempt.',
      lockedNext: 'Locked. Another declared attempt unlocks this.',
      label: 'HINT {number}',
      revealLabel: 'Reveal hint {number} — cracks the card',
    },
    section: {
      hintLadder: 'Hint ladder',
      hintLadderSub:
        "Attempt → hint → attempt → hint → attempt → solution. Each hint cracks this module's photocard. Cracks never block anything.",
    },
    solution: {
      label: 'SOLUTION',
      revealLabel: 'Reveal solution',
      revealedNote: 'Revealed below.',
      lockNote: 'Reachable only after the full ladder — or by matching.',
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
      withTier: 'Module {number} — {tier}',
    },
    section: {
      workedExamples: 'Worked examples',
      workedExamplesSub:
        'Each shows the code, its exact terminal output, and why it works. Type and run every one on your machine.',
      exercises: 'Exercises',
    },
    exit: {
      badge: 'EX',
      summativeNote: 'Summative. No hints, no examples on screen. Passing awards the photocard.',
      lockedNote: 'Unlocks when every practice exercise is matched or its solution seen.',
    },
    status: {
      matched: 'MATCHED',
      solutionSeen: 'SOLUTION SEEN',
      hintUsed: 'HINT {number} USED',
      tried: 'TRIED ×{count}',
      notStarted: 'NOT STARTED',
      ready: 'READY',
    },
  },

  celebration: {
    dialogLabel: 'Checkpoint passed',
    kicker: 'CHECKPOINT PASSED',
    title: 'Module {number} cleared.',
    card: {
      foot: 'Photocard added to shelf',
    },
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
    lede: 'One original card per checkpoint. Hints crack corners — a visible cost, never a wall.',
    card: {
      notEarned: 'Not earned',
      captionMint: 'Mint — no hints used',
      captionOneCrack: '1 crack',
      captionCracks: '{count} cracks',
      unearnedCaption: 'Pass the checkpoint to earn it',
    },
  },

  setup: {
    osLegend: 'Your machine',
    osNote: 'Steps below follow this choice, and it is remembered for next time.',
    section: {
      installSteps: 'Install steps',
    },
    look: {
      label: 'WHAT YOU’LL SEE',
    },
    term: {
      label: 'TYPE THIS',
    },
    itPrints: {
      label: 'IT PRINTS',
      sub: "your chosen member's name, on its own line",
    },
    exit: {
      label: 'EXIT CHECKPOINT',
      sub: "the shape — your chosen member's name, on its own line",
      passedNote: 'Module 01 is open. Nothing here expires.',
      note: 'No hints on this one, and no rush — leave whenever. Your place is kept.',
    },
  },
};
