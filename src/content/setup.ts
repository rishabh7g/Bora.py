// Module 0 setup content — the install stepper's data (DESIGN.md §6 Tier 0,
// ENGINEERING.md §7 `SetupGuide`, §12 "motivation cliff at Module 0").
//
// Data-driven on purpose: SetupGuide renders whatever is listed here, so a new
// screenshot or a reworded step is a content edit, never a component edit.
//
// Three rules this file carries:
// 1. Screenshots are LOCAL FILES in src/art/setup — never remote URLs. The
//    bundler owns the emitted URL (hashed, base-path aware) and the service
//    worker precaches every png, so setup works offline (ENGINEERING.md §9).
// 2. A GUI screenshot ships only as a COMPLETE Windows + Mac PAIR, at the same
//    step index on both paths (#62). A step that showed a picture on one path
//    and a placeholder on the other told the other learner she got the lesser
//    version of the lesson — at Module 0, which is exactly where beginners quit.
//    Where no pair exists (a Windows installer dialog, a macOS .pkg wizard, a
//    save dialog — none of them capturable from this repo's only dev host, a
//    headless Raspberry Pi), the step carries `look`: the on-screen landmarks a
//    beginner needs to find the thing, in words. There is no placeholder type,
//    so a one-sided screenshot is not expressible. This supersedes the
//    "screenshot per step" part of issue #13.
// 3. A command, or the output a command prints, is NEVER a screenshot (#61).
//    It is authored text here and rendered as text: the learner can select and
//    copy it, a screen reader can read it, and scripts/verify-outputs.py can
//    machine-verify it — a picture of a terminal can do none of those, and goes
//    stale the moment a prompt or a version number changes. So a step that runs
//    something carries `command`/`output` and NO `shot` at all; this supersedes
//    the "screenshot per step" part of issue #13 for terminal content.
//
// Terminal commands and outputs below were run in a real terminal
// (`python3 scripts/verify-outputs.py m0`, plus the hello.py transcript).

export type SetupOs = 'windows' | 'mac';

export const SETUP_OS_LABELS: Record<SetupOs, string> = {
  windows: 'Windows',
  mac: 'Mac',
};

/** A real screenshot bundled in this repo. `file` is a name in src/art/setup.
 *  There is deliberately no "pending" variant: an image either exists for both
 *  Windows and Mac at this step, or the step uses `look` instead (rule 2). */
export type SetupShot = { file: string; alt: string; caption: string };

export type SetupStep = {
  title: string;
  body: string;
  /** Exact thing to type in the terminal, shown as a copy-safe code line. */
  command?: string;
  /** Exact output that command prints — verified in a real terminal. */
  output?: string;
  /** What the window looks like, in words: the landmarks a beginner needs to
   *  find the right button — its wording, roughly where it sits, what to click
   *  next. This is what replaced the unpairable screenshots (rule 2), so it has
   *  to be specific enough to follow with no picture at all.
   *
   *  `look` describes the WINDOW, never the command, so a step may carry both
   *  this and `command`: step 3 is the first terminal the learner has ever
   *  opened, and a bare rectangle with a blinking cursor needs describing even
   *  though the thing she types is text right below it (rule 3, #67).
   *
   *  The last line is the RECOVERY line, and it lives in the step where the
   *  error actually shows up — not only in the step that caused it (#68). A
   *  missed PATH tick in step 2 prints nothing until step 3, and a beginner who
   *  has to scroll back to find the fix concludes she broke her computer. */
  look?: string[];
  /** A GUI window worth showing, paired across both OS paths. Absent where the
   *  step's subject is a command and its output — that belongs on the page as
   *  text, not as an image of a terminal (rule 3). */
  shot?: SetupShot;
};

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
    .flatMap((step) => (step.shot ? [step.shot.file] : []));
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
      look: [
        'A small window whose title starts "Install Python 3.14" — it opens with everything you need on one screen.',
        'In the middle, two wide buttons stacked: "Install Now" on top, "Customize installation" below it. You want the top one, but not yet.',
        'Along the bottom, under a thin line, a couple of checkboxes. The one that matters reads "Add python.exe to PATH". Tick it first — it is easy to miss, and it is the whole reason this step exists.',
        'Now "Install Now". If Windows asks whether to let the app make changes, choose Yes.',
        'Wait for the green progress bar, then a screen saying "Setup was successful". Close it — that is Python installed.',
        'Missed the checkbox? Nothing is broken. Run the same .exe again, choose Repair or Modify, tick it, and finish.',
      ],
    },
    {
      title: 'Open PowerShell and check it worked',
      body:
        'Open the Start menu, type "powershell", press Enter. In the window that opens, type the line below. It should print "Python 3." and a version number — that means the terminal can find Python.',
      look: [
        'Start typing "powershell" and "Windows PowerShell" comes up at the top of the Start menu. That is the one — press Enter on it.',
        'The window that opens is almost empty: a dark rectangle with a line or two of small text at the top, no buttons and no menus. That bareness is correct. A terminal is meant to look like this.',
        'The bottom line ends with a > and a blinking block or bar. That is the prompt, waiting for you, and whatever you type appears right there.',
        'Nothing in this window is clickable. You type one line, press Enter, and the answer prints on the next line down.',
        'Says "python is not recognized" instead? Nothing is broken. Close PowerShell and open it again — a window opened before the install has not heard about Python yet — and retype the line. Still not recognized: the "Add python.exe to PATH" tick from step 2 was missed, so run the same .exe again, choose Repair or Modify, tick it, then reopen PowerShell.',
      ],
      command: 'python --version',
    },
    {
      title: 'Create hello.py',
      body:
        'Open Notepad, type one line: print("Jimin") — your chosen member, your choice. Save it as hello.py (not hello.py.txt: pick "All Files" in the Save-as-type box) somewhere you can find again, like your Desktop. Then, in PowerShell, move to that folder.',
      look: [
        'Notepad opens blank. Type the one line and nothing else — no heading, no quotes around the whole thing.',
        'Then File → Save as… The save window has a "File name" box near the bottom, and right under it a dropdown labelled "Save as type".',
        '"Save as type" starts on "Text Documents (*.txt)". Change it to "All Files (*.*)". Everyone forgets this one, so you are in good company.',
        'Type hello.py in the "File name" box, pick Desktop on the left, and Save.',
        'Check it landed right: the file on your Desktop is hello.py, not hello.py.txt. If you cannot tell, the icon is the giveaway — a .py file no longer looks like a Notepad page.',
      ],
      command: 'cd Desktop',
    },
    {
      title: 'Run it',
      body:
        'Still in PowerShell, in the folder that holds hello.py, run the file. Your terminal prints the name you chose. That is you running Python.',
      command: 'python hello.py',
      output: 'Jimin',
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
      look: [
        'A window titled "Install Python", with the steps listed down the left side: Introduction, Read Me, License, and so on. The one you are on is highlighted.',
        'You never have to change a single setting. Continue → Continue → Continue → Agree → Install, in the bottom-right corner each time.',
        'It asks for your Mac password — the one you log in with. Nothing appears as you type; that is normal, keep going.',
        'It finishes on "The installation was successful." Click Close. If it offers to move the installer to the Bin, either answer is fine.',
      ],
    },
    {
      title: 'Open Terminal and check it worked',
      body:
        'Press ⌘ Space, type "Terminal", press Enter. In the window that opens, type the line below. It should print "Python 3." and a version number — that means the terminal can find Python. On a Mac the command is python3, with the 3.',
      look: [
        '⌘ Space drops a search box into the middle of the screen. Type "Terminal" and the app comes up as the top hit — press Enter on it.',
        'The window that opens is almost empty: a plain white or black rectangle with one line of small text about when you last logged in, no buttons and no menus. That bareness is correct. A terminal is meant to look like this.',
        'The line under it ends with your Mac name and a % (older Macs show a $), then a blinking block. That is the prompt, waiting for you.',
        'Nothing in this window is clickable. You type one line, press Return, and the answer prints on the next line down.',
        'Says "command not found: python3" instead? Nothing is broken. Check the 3 is there, then quit Terminal with ⌘ Q and open it again — a window opened before the install has not heard about Python yet. Still nothing: run the .pkg from step 2 once more and let it finish.',
      ],
      command: 'python3 --version',
    },
    {
      title: 'Create hello.py',
      body:
        'Open TextEdit, and first do Format → Make Plain Text (rich text saves invisible junk). Type one line: print("Jimin") — your chosen member, your choice. Save it as hello.py on your Desktop. Then, in Terminal, move to that folder.',
      look: [
        'If TextEdit opens a chooser first, start a new document.',
        'Format → Make Plain Text, in the menu bar at the top. You will see the ruler and the font controls disappear — that is how you know it worked. (⇧⌘T does the same.)',
        'Type the one line and nothing else.',
        'Then File → Save. Put hello.py in the name box, choose Desktop, and Save.',
        'A box may ask whether to keep the ".py" ending or add ".txt". Choose the one that keeps .py — the name has to end in .py for Python to run it.',
      ],
      command: 'cd ~/Desktop',
    },
    {
      title: 'Run it',
      body:
        'Still in Terminal, in the folder that holds hello.py, run the file. Your terminal prints the name you chose. That is you running Python.',
      command: 'python3 hello.py',
      output: 'Jimin',
    },
  ],
};

export function setupStepsFor(os: SetupOs): SetupStep[] {
  return SETUP_STEPS[os];
}
