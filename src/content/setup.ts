// Module 0 setup content — the install stepper's data (DESIGN.md §6 Tier 0,
// ENGINEERING.md §7 `SetupGuide`, §12 "motivation cliff at Module 0").
//
// Data-driven on purpose: SetupGuide renders whatever is listed here, so a new
// screenshot or a reworded step is a content edit, never a component edit.
//
// Two rules this file carries:
// 1. Screenshots are LOCAL FILES in src/art/setup — never remote URLs. The
//    bundler owns the emitted URL (hashed, base-path aware) and the service
//    worker precaches every png, so setup works offline (ENGINEERING.md §9).
// 2. A step with no screenshot yet says what its screenshot must show
//    (`{ pending }`). The gap is visible in the UI and in this file rather than
//    being papered over with a fake image: capturing a Windows installer dialog
//    or a macOS Terminal window needs those machines.
//
// Terminal commands and outputs below were run in a real terminal
// (`python3 scripts/verify-outputs.py m0`, plus the hello.py transcript).

export type SetupOs = 'windows' | 'mac';

export const SETUP_OS_LABELS: Record<SetupOs, string> = {
  windows: 'Windows',
  mac: 'Mac',
};

export type SetupShot =
  /** A real screenshot bundled in this repo. `file` is a name in src/art/setup. */
  | { file: string; alt: string; caption: string }
  /** Not captured yet — what the screenshot has to show, verbatim in the UI. */
  | { pending: string };

export type SetupStep = {
  title: string;
  body: string;
  /** Exact thing to type in the terminal, shown as a copy-safe code line. */
  command?: string;
  /** Exact output that command prints — verified in a real terminal. */
  output?: string;
  shot: SetupShot;
};

export function isBundledShot(shot: SetupShot): shot is { file: string; alt: string; caption: string } {
  return 'file' in shot;
}

// Screenshot URLs: same pattern as the photocard art (content/load.ts) — the
// bundler resolves the local file, so nothing here is a remote image.
const SHOT_URLS = import.meta.glob('../art/setup/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function setupShotUrl(fileName: string): string {
  return SHOT_URLS[`../art/setup/${fileName}`] ?? '';
}

/** Every bundled screenshot file name, for the offline-precache assertion. */
export function bundledShotFiles(): string[] {
  return Object.values(SETUP_STEPS)
    .flat()
    .map((step) => step.shot)
    .filter(isBundledShot)
    .map((shot) => shot.file);
}

const DOWNLOADS_PAGE = 'python.org/downloads';

const SETUP_STEPS: Record<SetupOs, SetupStep[]> = {
  windows: [
    {
      title: 'Open the downloads page',
      body: `Go to ${DOWNLOADS_PAGE} in your browser. It spots that you are on Windows on its own. Under the big button, click the standalone installer link — "Python 3.14.7" (a newer 3.x is fine too).`,
      shot: {
        file: 'python-downloads-windows.png',
        alt: 'python.org downloads page on Windows: a "Download Python install manager" button, and below it a link to the standalone installer for Python 3.14.7.',
        caption: `${DOWNLOADS_PAGE} as it looks on Windows — captured 2026-08-12.`,
      },
    },
    {
      title: 'Run the installer — tick "Add python.exe to PATH"',
      body:
        'Open the downloaded .exe. On the very first screen, tick "Add python.exe to PATH" at the bottom, then click "Install Now". That one checkbox is what lets the terminal find Python later.',
      shot: {
        pending:
          'The Windows installer\'s first screen, with the "Add python.exe to PATH" checkbox at the bottom circled.',
      },
    },
    {
      title: 'Open PowerShell and check it worked',
      body:
        'Open the Start menu, type "powershell", press Enter. In the window that opens, type the line below. It should print "Python 3." and a version number — that means the terminal can find Python.',
      command: 'python --version',
      shot: {
        pending:
          'A PowerShell window right after `python --version`, showing the printed version line.',
      },
    },
    {
      title: 'Create hello.py',
      body:
        'Open Notepad, type one line: print("Jimin") — your chosen member, your choice. Save it as hello.py (not hello.py.txt: pick "All Files" in the Save-as-type box) somewhere you can find again, like your Desktop. Then, in PowerShell, move to that folder.',
      command: 'cd Desktop',
      shot: {
        pending:
          'Notepad\'s Save-as dialog with the file name hello.py and "All Files" selected — the .txt trap.',
      },
    },
    {
      title: 'Run it',
      body:
        'Still in PowerShell, in the folder that holds hello.py, run the file. Your terminal prints the name you chose. That is you running Python.',
      command: 'python hello.py',
      output: 'Jimin',
      shot: {
        pending:
          'A PowerShell window showing `python hello.py` and the printed name on the next line.',
      },
    },
  ],
  mac: [
    {
      title: 'Open the downloads page',
      body: `Go to ${DOWNLOADS_PAGE} in your browser. It spots that you are on a Mac on its own — click the big "Download Python 3.14.7" button (a newer 3.x is fine too).`,
      shot: {
        file: 'python-downloads-mac.png',
        alt: 'python.org downloads page on macOS: a large "Download Python 3.14.7" button.',
        caption: `${DOWNLOADS_PAGE} as it looks on a Mac — captured 2026-08-12.`,
      },
    },
    {
      title: 'Run the .pkg installer',
      body:
        'Open the downloaded .pkg file and click through with every default — Continue, Continue, Agree, Install. Enter your Mac password when it asks. On a Mac nothing has to be ticked; the installer wires up the terminal for you.',
      shot: {
        pending: 'The macOS Python .pkg installer on its first "Introduction" step.',
      },
    },
    {
      title: 'Open Terminal and check it worked',
      body:
        'Press ⌘ Space, type "Terminal", press Enter. In the window that opens, type the line below. It should print "Python 3." and a version number — that means the terminal can find Python. On a Mac the command is python3, with the 3.',
      command: 'python3 --version',
      shot: {
        pending: 'A macOS Terminal window right after `python3 --version`, showing the version line.',
      },
    },
    {
      title: 'Create hello.py',
      body:
        'Open TextEdit, and first do Format → Make Plain Text (rich text saves invisible junk). Type one line: print("Jimin") — your chosen member, your choice. Save it as hello.py on your Desktop. Then, in Terminal, move to that folder.',
      command: 'cd ~/Desktop',
      shot: {
        pending:
          'TextEdit in plain-text mode with print("Jimin") typed, and the Save dialog naming the file hello.py.',
      },
    },
    {
      title: 'Run it',
      body:
        'Still in Terminal, in the folder that holds hello.py, run the file. Your terminal prints the name you chose. That is you running Python.',
      command: 'python3 hello.py',
      output: 'Jimin',
      shot: {
        pending: 'A macOS Terminal window showing `python3 hello.py` and the printed name below it.',
      },
    },
  ],
};

export function setupStepsFor(os: SetupOs): SetupStep[] {
  return SETUP_STEPS[os];
}
