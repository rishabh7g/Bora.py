// ExerciseView — the core product screen (ENGINEERING.md §7, §11 step 2).
// Prompt, expected-output block (no copy button — validation is trust-based),
// effort-gate buttons, hint ladder, solution reveal with approach checklist.
// Every gating decision is read from src/state/effortGate.ts — the one owner
// of the state machine. This component only renders and forwards transitions.
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
} from './state/effortGate';
import { t } from './strings/t';
import './exercise.css';

export type ExerciseViewProps = {
  module: Module;
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
// The target is set by the handler that caused the change, so nothing here
// guesses; `null` means focus is fine where it is.
type RevealedFocus = 'hint1' | 'hint2' | 'solution' | 'matched' | null;

function HintRung({
  label,
  active,
  seen,
  available,
  body,
  revealLabel,
  lockNote,
  onReveal,
  textRef,
}: {
  label: string;
  active: boolean;
  seen: boolean;
  available: boolean;
  body: string;
  revealLabel: string;
  lockNote: string;
  onReveal: () => void;
  textRef?: React.Ref<HTMLParagraphElement>;
}) {
  return (
    <div className="ex-rung">
      <span className={`ex-rung-label${active ? ' ex-rung-label--active' : ''}`}>{label}</span>
      <div className="ex-rung-body">
        {seen ? (
          // Focusable programmatically only (-1): revealing it moves focus here,
          // but it never becomes a stop on the way down the screen.
          <p className="ex-hint-text" tabIndex={-1} ref={textRef}>
            {body}
          </p>
        ) : available ? (
          <button type="button" className="btn btn-secondary btn-action" onClick={onReveal}>
            {revealLabel}
          </button>
        ) : (
          <p className="ex-lock-note">{lockNote}</p>
        )}
      </div>
    </div>
  );
}

export default function ExerciseView({ module, exercise, isExit, state, onTransition }: ExerciseViewProps) {
  const gate = gateStateOf(state, isExit);
  const matched = gate === 'MATCHED';
  const solutionShown = isSolutionVisible(state);
  const moduleHref = `#/module/${module.id}`;

  const [revealed, setRevealed] = useState<RevealedFocus>(null);
  const hintRefs = useRef<Record<'hint1' | 'hint2', HTMLParagraphElement | null>>({
    hint1: null,
    hint2: null,
  });
  const solutionRef = useRef<HTMLHeadingElement>(null);
  const matchedRef = useRef<HTMLDivElement>(null);

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

  // The top of the ladder has no next rung, so nothing here may promise one and
  // the "stuck" button is not offered (§5: an attempt declared past the solution
  // unlocks nothing). Every other state still points at the rung it can reach.
  const ladderSpent = gate === 'SOLUTION_REVEALED';
  const declaredCount = t('exercise.attempts.declared', {
    count: state.attempts,
    unit: t(state.attempts === 1 ? 'exercise.attempts.unit.one' : 'exercise.attempts.unit.other'),
  });
  const attemptsNote = ladderSpent
    ? declaredCount + t('exercise.attempts.ladderSpentSuffix')
    : state.attempts === 0
      ? isExit
        ? t('exercise.attempts.exitFirstNote')
        : t('exercise.attempts.firstNote')
      : declaredCount +
        (state.stuck
          ? t('exercise.attempts.stuckSuffix')
          : t('exercise.attempts.tryAgainSuffix'));

  const hintLockNote =
    state.attempts === 0 ? t('exercise.hint.lockedFirst') : t('exercise.hint.lockedNext');

  return (
    <div className="ex-screen">
      <a className="btn btn-ghost ex-back" href={moduleHref}>
        {t('common.backArrow')} {module.title}
      </a>
      <p className="ex-kicker">
        {module.title} — {kicker}
      </p>
      <h1 className="ex-title">{exercise.title ?? exercise.prompt.slice(0, 40)}</h1>
      {isExit && <p className="ex-exit-note">{t('exercise.exitNote')}</p>}
      <p className="ex-prompt">{exercise.prompt}</p>

      <ExpectedOutput output={exercise.expectedOutput} />

      {matched ? (
        <div className="ex-matched-banner" role="status" tabIndex={-1} ref={matchedRef}>
          {t('exercise.matchedBanner')}
        </div>
      ) : (
        <>
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
            {!isExit && !ladderSpent && (
              <button
                type="button"
                className="btn btn-secondary btn-action"
                onClick={() => onTransition((current) => declareAttempt(current, isExit))}
              >
                {t('exercise.stuckButton')}
              </button>
            )}
            {isExit && (
              <a className="btn btn-secondary btn-action" href={moduleHref}>
                {t('exercise.comeBackLater')}
              </a>
            )}
          </div>
          <p className="ex-note">{attemptsNote}</p>
        </>
      )}

      {!isExit && (
        <>
          <h2 className="ex-section-title">{t('exercise.section.hintLadder')}</h2>
          {/* "Each hint", not "each reveal" (#89): a crack is one hint viewed
              (DESIGN.md §4, cardCracksOf), so the solution rung — the largest
              reveal on the ladder — adds none. The two hint buttons already say
              "cracks the card" and the solution button does not; this sentence
              is the summary of those buttons, so it promises exactly what they
              do and no more. */}
          <p className="ex-section-sub">{t('exercise.section.hintLadderSub')}</p>
          <div className="ex-ladder">
            {([1, 2] as const).map((hintNumber) => {
              const seen = state.hintsUnlocked >= hintNumber;
              const available = gate === `HINT${hintNumber}_AVAILABLE`;
              return (
                <HintRung
                  key={hintNumber}
                  label={t('exercise.hint.label', { number: hintNumber })}
                  active={seen || available}
                  seen={seen}
                  available={available}
                  body={exercise.hints[hintNumber - 1]}
                  revealLabel={t('exercise.hint.revealLabel', { number: hintNumber })}
                  lockNote={hintLockNote}
                  textRef={(node) => {
                    hintRefs.current[`hint${hintNumber}`] = node;
                  }}
                  onReveal={() => {
                    onTransition((current) => viewHint(current, hintNumber, isExit));
                    setRevealed(`hint${hintNumber}`);
                  }}
                />
              );
            })}
            <HintRung
              label={t('exercise.solution.label')}
              active={state.solutionRevealed || gate === 'SOLUTION_AVAILABLE'}
              seen={false}
              available={gate === 'SOLUTION_AVAILABLE'}
              body=""
              revealLabel={t('exercise.solution.revealLabel')}
              lockNote={
                state.solutionRevealed
                  ? t('exercise.solution.revealedNote')
                  : t('exercise.solution.lockNote')
              }
              onReveal={() => {
                onTransition((current) => revealSolution(current, isExit));
                // The rung itself only says "Revealed below.", so focus goes to
                // the solution that appeared further down the screen.
                setRevealed('solution');
              }}
            />
          </div>
        </>
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
