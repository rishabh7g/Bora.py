// CelebrationScreen — the one red field in the system (design/README.md;
// DESIGN.md §4 "celebration screens on checkpoint pass — confetti, one playful
// line, nothing more"; ENGINEERING.md §11 step 8; prototype:
// design/PyLearn Prototype.dc.html → Celebration screen).
//
// Shown once, on the edge where a module's exit exercise transitions to matched
// and the module's `passed` flips true — never on a revisit. The edge itself is
// decided by `celebrationTriggered` below, from the state owners
// (effortGate.modulePassed + gating.moduleStateOf), and the screen is driven by
// that transient state, so reloading or coming back never re-fires it.
//
// The copy names the photocard just earned and says nothing about XP, streaks,
// scores or time — playfulness lives in the content, not the chrome.
import { useEffect, useRef } from 'react';
import type { Module } from './content/types';
import PhotocardArt from './PhotocardArt';
import { modulePassed, type ExerciseState } from './state/effortGate';
import './celebration.css';

/** The celebration edge: an exit exercise reaching matched while the module had
 *  not passed yet. `alreadyPassed` comes from the §6 owner (gating), `after`
 *  from the §5 owner (effortGate) — this only combines them. */
export function celebrationTriggered(
  isExit: boolean,
  alreadyPassed: boolean,
  after: ExerciseState,
): boolean {
  return isExit && !alreadyPassed && modulePassed(after);
}

// One playful line, picked from the prototype's set. Deterministic by module
// number, so the same checkpoint always celebrates the same way (and a reload
// mid-celebration could never swap the line).
export const CELEBRATION_LINES = [
  'Borahae. On to the next era.',
  'Namjoon would be proud of that punctuation.',
  'No skips, no shortcuts. Legend behavior.',
  'Add it to the setlist.',
] as const;

export function celebrationLineFor(moduleNumber: string): string {
  const index = Number.parseInt(moduleNumber, 10);
  return CELEBRATION_LINES[(Number.isNaN(index) ? 0 : index) % CELEBRATION_LINES.length];
}

// Confetti: decorative only, hidden from assistive tech, and switched off
// entirely under prefers-reduced-motion (see celebration.css).
const CONFETTI_COUNT = 28;

function Confetti() {
  return (
    <div className="celebrate-confetti" aria-hidden="true">
      {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
        <span
          key={index}
          className={`celebrate-fleck celebrate-fleck--${(index % 4) + 1}`}
          style={{
            left: `${index * 3.6 + 1}%`,
            animationDuration: `${1.7 + (index % 5) * 0.25}s`,
            animationDelay: `${(index % 7) * 0.13}s`,
          }}
        />
      ))}
    </div>
  );
}

export type CelebrationScreenProps = {
  module: Module;
  moduleNumber: string; // "07" — from content/load.moduleNumberOf
  tier5Unlocked: boolean; // §6: the capstone pass opens Tier 5 (Advanced)
  onContinue: () => void;
};

export default function CelebrationScreen({
  module,
  moduleNumber,
  tier5Unlocked,
  onContinue,
}: CelebrationScreenProps) {
  const continueRef = useRef<HTMLButtonElement>(null);

  // The field covers the screen, so move focus to the only control on it —
  // keyboard and screen-reader users land on the way out, not behind it.
  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  // …and keep it there. The screen underneath is still in the DOM, just hidden
  // under the red field, so an untrapped Tab walks into controls nobody can see
  // — the sighted-keyboard half of the `aria-modal` promise. Continue is the
  // only control in here, so holding Tab on it contains focus completely, and
  // Escape takes the same way out as the button (never a dead end).
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onContinue();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      continueRef.current?.focus();
    }
  }

  return (
    <div
      className="celebrate-field"
      role="dialog"
      aria-modal="true"
      aria-label="Checkpoint passed"
      onKeyDown={onKeyDown}
    >
      <Confetti />
      <div className="celebrate-body">
        <p className="celebrate-kicker">CHECKPOINT PASSED</p>
        <h1 className="celebrate-title">{`Module ${moduleNumber} cleared.`}</h1>
        <p className="celebrate-line">{celebrationLineFor(moduleNumber)}</p>

        <div className="celebrate-card">
          <PhotocardArt art={module.photocard.art} className="celebrate-art" />
          <span className="celebrate-cardnum">{moduleNumber}</span>
          <span className="celebrate-cardtext">
            <span className="celebrate-cardtitle">{module.photocard.title}</span>
            <span className="celebrate-cardfoot">Photocard added to shelf</span>
          </span>
        </div>

        {tier5Unlocked && (
          <p className="celebrate-unlock">That was the capstone — Tier 5 (Advanced) is open.</p>
        )}

        <button ref={continueRef} type="button" className="celebrate-continue" onClick={onContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}
