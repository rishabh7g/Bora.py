// ExerciseView — the core product screen (ENGINEERING.md §7, §11 step 2).
// Prompt, expected-output block (no copy button — validation is trust-based),
// the hints she has revealed, two buttons, and the solution with its approach
// checklist once it is visible.
//
// The screen is one card. The effort gate (src/state/effortGate.ts, the one
// owner of the rules) already names the next legal move, so the screen offers
// exactly that: "My output matches" always, and beside it whatever the ladder
// allows right now — declare an attempt, reveal the hint that attempt opened,
// or reveal the solution. Nothing narrates the rule, nothing shows a locked
// rung, and a revealed hint is text above the buttons, not a row in a ladder.
import { useEffect, useRef, useState } from 'react';
import type { Exercise, Module } from './content/types';
import ExpectedOutput from './ExpectedOutput';
import PythonCode from './PythonCode';
import {
  declareAttempt,
  declareMatch,
  gateStateOf,
  isSolutionVisible,
  revealSolution,
  viewHint,
  type ExerciseState,
  type GateState,
} from './state/effortGate';
import { t } from './strings/t';
import './exercise.css';

export type ExerciseViewProps = {
  module: Module;
  /** "01" — from content/load.moduleNumberOf; the back link names it. */
  moduleNumber: string;
  exercise: Exercise;
  isExit: boolean;
  state: ExerciseState;
  onTransition: (transition: (state: ExerciseState) => ExerciseState) => void;
};

// Every reveal on this screen replaces the button that triggered it with the
// text it revealed, so the browser drops focus to the document and the next Tab
// starts the whole screen again. Each one hands focus to what just appeared
// instead: the keyboard learner reads on from where she was, and the themed ring
// lands on the new content — which is also what a screen reader then announces.
// `null` means focus is fine where it is.
type RevealedFocus = 'hint1' | 'hint2' | 'solution' | 'matched' | null;

/** The one secondary action the gate allows from here, or none at the top of
 *  the ladder (§5: an attempt declared past the solution unlocks nothing). */
export type NextAction =
  | { kind: 'attempt' }
  | { kind: 'hint'; hint: 1 | 2 }
  | { kind: 'solution' }
  | null;

export function nextActionOf(gate: GateState): NextAction {
  switch (gate) {
    case 'LOCKED_HINTS':
    case 'HINT1_SEEN':
    case 'HINT2_SEEN':
      return { kind: 'attempt' };
    case 'HINT1_AVAILABLE':
      return { kind: 'hint', hint: 1 };
    case 'HINT2_AVAILABLE':
      return { kind: 'hint', hint: 2 };
    case 'SOLUTION_AVAILABLE':
      return { kind: 'solution' };
    default:
      return null;
  }
}

export default function ExerciseView({
  module,
  moduleNumber,
  exercise,
  isExit,
  state,
  onTransition,
}: ExerciseViewProps) {
  const gate = gateStateOf(state, isExit);
  const matched = gate === 'MATCHED';
  const solutionShown = isSolutionVisible(state);
  const moduleHref = `#/module/${module.id}`;
  const next = nextActionOf(gate);

  const [revealed, setRevealed] = useState<RevealedFocus>(null);
  const hintRefs = useRef<Record<'hint1' | 'hint2', HTMLParagraphElement | null>>({
    hint1: null,
    hint2: null,
  });
  const solutionRef = useRef<HTMLHeadingElement>(null);
  const matchedRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!revealed) return;
    const target =
      revealed === 'matched'
        ? matchedRef.current
        : revealed === 'solution'
          ? solutionRef.current
          : hintRefs.current[revealed];
    target?.focus();
    setRevealed(null); // one move per reveal — never on a re-render after it
  }, [revealed]);

  const exerciseIndex = module.exercises.findIndex((candidate) => candidate.id === exercise.id);
  const kicker = isExit
    ? t('exercise.kicker.exit')
    : t('exercise.kicker.numbered', {
        index: Math.max(1, exerciseIndex + 1),
        total: module.exercises.length,
      });

  function nextButton() {
    if (!next) return null;
    if (next.kind === 'attempt') {
      return (
        <button
          type="button"
          className="btn btn-secondary btn-action"
          onClick={() => onTransition((current) => declareAttempt(current, isExit))}
        >
          {t('exercise.stuckButton')}
        </button>
      );
    }
    if (next.kind === 'hint') {
      const { hint } = next;
      return (
        <button
          type="button"
          className="btn btn-secondary btn-action"
          onClick={() => {
            onTransition((current) => viewHint(current, hint, isExit));
            setRevealed(`hint${hint}`);
          }}
        >
          {t('exercise.hint.revealLabel', { number: hint })}
        </button>
      );
    }
    return (
      <button
        type="button"
        className="btn btn-secondary btn-action"
        onClick={() => {
          onTransition((current) => revealSolution(current, isExit));
          setRevealed('solution');
        }}
      >
        {t('exercise.solution.revealLabel')}
      </button>
    );
  }

  return (
    <div className="ex-screen">
      <a className="btn btn-ghost ex-back" href={moduleHref}>
        {`${t('common.backArrow')} ${t('module.kicker.plain', { number: moduleNumber })}`}
      </a>
      <p className="ex-kicker">{kicker}</p>
      <h1 className="ex-title">{exercise.title ?? exercise.prompt.slice(0, 40)}</h1>
      <p className="ex-prompt">{exercise.prompt}</p>

      <ExpectedOutput output={exercise.expectedOutput} />

      {/* The hints she has opened, in order, as text — a hint is something
          read, not a rung to stand on. */}
      {state.hintsUnlocked > 0 && (
        <div className="ex-hints">
          {([1, 2] as const)
            .filter((hintNumber) => state.hintsUnlocked >= hintNumber)
            .map((hintNumber) => (
              <div key={hintNumber} className="ex-hint">
                <span className="ex-hint-label">{t('exercise.hint.label', { number: hintNumber })}</span>
                {/* Focusable programmatically only (-1): revealing it moves
                    focus here, but it never becomes a stop on the way down. */}
                <p
                  className="ex-hint-text"
                  tabIndex={-1}
                  ref={(node) => {
                    hintRefs.current[`hint${hintNumber}`] = node;
                  }}
                >
                  {exercise.hints[hintNumber - 1]}
                </p>
              </div>
            ))}
        </div>
      )}

      {matched ? (
        <p className="ex-matched" role="status" tabIndex={-1} ref={matchedRef}>
          {t('exercise.matched')}
        </p>
      ) : (
        <div className="ex-actions">
          <button
            type="button"
            className="btn btn-primary btn-action"
            onClick={() => {
              onTransition(declareMatch);
              setRevealed('matched');
            }}
          >
            {t('exercise.matchButton')}
          </button>
          {isExit ? (
            <a className="btn btn-secondary btn-action" href={moduleHref}>
              {t('exercise.comeBackLater')}
            </a>
          ) : (
            nextButton()
          )}
        </div>
      )}

      {solutionShown && (
        <>
          <h2 className="ex-section-title" tabIndex={-1} ref={solutionRef}>
            {t('exercise.solution.heading')}
          </h2>
          <PythonCode code={exercise.solution} className="ex-solution" />
          <h3 className="ex-checklist-title">{t('exercise.checklist.heading')}</h3>
          <div className="ex-checklist">
            {exercise.approachChecklist.map((item, index) => (
              <div key={index} className="ex-checklist-item">
                <span className="mark" aria-hidden="true" />
                <span className="text">{item}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
