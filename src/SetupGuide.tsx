// SetupGuide — the Module 0 screen (ENGINEERING.md §7 `SetupGuide`, §12
// "motivation cliff at Module 0"; DESIGN.md §6 Tier 0, §7 "Setup guide (Module
// 0): OS picker → step-by-step with screenshots"; prototype:
// design/PyLearn Prototype.dc.html → Setup guide).
//
// OS picker (Windows / Mac, persisted) → install stepper → the Module 0 exit
// checkpoint, inline. A step is the thing she does — title, body, the command
// and what it prints — and one closed disclosure, "What you'll see", holding
// the window in words (`look`) and, where a Windows + Mac pair exists, the
// screenshot (#62). Module 0 is where beginners quit, so the page leads with
// the doing and keeps the looking one tap away.
//
// Ownership, as everywhere else in this app:
// - step content + screenshots: src/content/setup.ts (data, not markup)
// - exit checkpoint behaviour: src/state/effortGate.ts, exit variant — no hint
//   ladder, only "My output matches" or leaving and coming back
// - the expected-output block: src/ExpectedOutput.tsx, shared with ExerciseView
//   AND with the stepper's own "IT PRINTS" — a command's output is text on the
//   page, never an image of a terminal, and there is one block that renders it
//   (#61).
import { useState } from 'react';
import { moduleNumberOf } from './content/load';
import {
  CHECKED_AGAINST,
  SETUP_OS_LABELS,
  setupShotUrl,
  setupStepsFor,
  type SetupOs,
  type SetupShot,
  type SetupStep,
} from './content/setup';
import type { Curriculum, Module } from './content/types';
import ExpectedOutput from './ExpectedOutput';
import { HOME_ROUTE } from './HomeMap';
import PythonCode from './PythonCode';
import { declareMatch, gateStateOf, type ExerciseState } from './state/effortGate';
import { exerciseStateOf, type Progress } from './state/progress';
import { loadSetupOs, saveSetupOs } from './state/setupOs';
import { t } from './strings/t';
import './setup.css';

export type SetupGuideProps = {
  curriculum: Curriculum;
  /** Module 0 — its exit exercise is the checkpoint at the end of the guide. */
  module: Module;
  progress: Progress;
  onTransition: (transition: (state: ExerciseState) => ExerciseState) => void;
};

const OS_OPTIONS: SetupOs[] = ['windows', 'mac'];

// The words that stand in for a screenshot there is no pair for (#62): the
// landmarks to look for, in order, so the step is followable with no picture.
function LookList({ look }: { look: string[] }) {
  return (
    <ul className="setup-look-list">
      {look.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function ShotFigure({ shot }: { shot: SetupShot }) {
  return (
    <figure className="setup-shot">
      {/* A squeezed screenshot is a useless screenshot: at 375px the image keeps
          a legible width and its box scrolls sideways instead. Focusable, so the
          scroll works from the keyboard too. */}
      <div className="setup-shot-scroll" tabIndex={0} role="group" aria-label={shot.alt}>
        {/* Local, bundled, precached — never a remote image. */}
        <img src={setupShotUrl(shot.file)} alt={shot.alt} loading="lazy" />
      </div>
      <figcaption>{shot.caption}</figcaption>
    </figure>
  );
}

function StepRow({ step, number }: { step: SetupStep; number: number }) {
  return (
    <li className="setup-step">
      <span className="setup-step-num" aria-hidden="true">
        {number}
      </span>
      <div className="setup-step-body">
        <h3 className="setup-step-title">{step.title}</h3>
        <p className="setup-step-text">{step.body}</p>
        {step.command && (
          <div className="setup-term">
            <span className="setup-term-label">{t('setup.term.label')}</span>
            {/* Real text in a <pre>, so it can be selected and copied. A picture
                of a terminal could not be (#61). */}
            <pre className="setup-term-command">{step.command}</pre>
          </div>
        )}
        {/* What it prints is the shared block (#61) in its plain form: a
            transcript to read, not an output to check her own against. */}
        {step.output && <ExpectedOutput label={t('setup.itPrints.label')} output={step.output} plain />}
        {/* The window, behind one door. Closed on every step: the landmarks
            are for the learner who is looking at a screen she does not
            recognise, and the step reads whole without them. */}
        {(step.look || step.shot) && (
          <details className="setup-more">
            <summary className="setup-more-summary">{t('setup.more')}</summary>
            {step.look && <LookList look={step.look} />}
            {step.shot && <ShotFigure shot={step.shot} />}
            {/* The prose's staleness signal (#69) sits beside the picture it
                dates, not over the whole guide. */}
            {step.shot && <p className="setup-checked">{CHECKED_AGAINST}</p>}
          </details>
        )}
      </div>
    </li>
  );
}

export default function SetupGuide({ curriculum, module, progress, onTransition }: SetupGuideProps) {
  // Read synchronously on first render so the stepper never flashes the wrong
  // OS; the write-through keeps the choice across visits and reloads.
  const [os, setOs] = useState<SetupOs>(loadSetupOs);
  const pickOs = (next: SetupOs) => {
    setOs(next);
    saveSetupOs(next);
  };

  const exit = module.exitExercise;
  const state = exerciseStateOf(progress, module.id, exit.id);
  // Exit variant of the gate: MATCHED or EXIT_OPEN, nothing in between.
  const matched = gateStateOf(state, true) === 'MATCHED';
  const kicker = t('module.kicker.plain', { number: moduleNumberOf(curriculum, module.id) });

  return (
    <div className="setup-screen">
      <a className="btn btn-ghost setup-back" href={HOME_ROUTE}>
        {t('common.backToMap')}
      </a>
      <p className="setup-kicker">{kicker}</p>
      <h1 className="setup-title">{module.title}</h1>
      <p className="setup-intro">{module.concept.intro}</p>

      <fieldset className="setup-os">
        <legend className="setup-os-legend">{t('setup.osLegend')}</legend>
        <div className="seg">
          {OS_OPTIONS.map((option) => (
            <label key={option} className="seg-opt">
              <input
                type="radio"
                name="setup-os"
                value={option}
                checked={os === option}
                onChange={() => pickOs(option)}
              />
              {SETUP_OS_LABELS[option]}
            </label>
          ))}
        </div>
        {/* #101: the choice is followed and remembered whether or not this
            says so — read once, then skimmed past on every visit. */}
      </fieldset>

      {/* The stepper's own section heading (#88): an H2 section over H3
          items, so a screen reader's outline descends without a gap. */}
      <h2 className="setup-section-title">{t('setup.section.installSteps')}</h2>

      <ol className="setup-steps">
        {setupStepsFor(os).map((step, index) => (
          <StepRow key={`${os}-${index}`} step={step} number={index + 1} />
        ))}
      </ol>

      {/* The checkpoint: its title, the task, the output, two buttons. The
          rule it used to restate — no hints, leave whenever — is the whole
          app's rule, and the map already says what a pass opens. */}
      <section className="setup-exit">
        <h2 className="setup-exit-title">{exit.title ?? t('common.exitCheckpointTitle')}</h2>
        <p className="setup-exit-prompt">{exit.prompt}</p>
        <ExpectedOutput output={exit.expectedOutput} />
        {matched ? (
          <>
            <p className="setup-exit-passed">
              <span className="tag tag-accent">{t('common.status.passed')}</span>
            </p>
            <PythonCode code={exit.solution} className="setup-exit-solution" />
          </>
        ) : (
          <div className="setup-exit-actions">
            <button
              type="button"
              className="btn btn-primary btn-action"
              onClick={() => onTransition(declareMatch)}
            >
              {t('exercise.matchButton')}
            </button>
            <a className="btn btn-secondary btn-action" href={HOME_ROUTE}>
              {t('exercise.comeBackLater')}
            </a>
          </div>
        )}
      </section>
    </div>
  );
}
