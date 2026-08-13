// SetupGuide — the Module 0 screen (ENGINEERING.md §7 `SetupGuide`, §12
// "motivation cliff at Module 0"; DESIGN.md §6 Tier 0, §7 "Setup guide (Module
// 0): OS picker → step-by-step with screenshots"; prototype:
// design/PyLearn Prototype.dc.html → Setup guide).
//
// OS picker (Windows / Mac, persisted) → install stepper with locally bundled
// screenshots → the Module 0 exit checkpoint, inline.
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
import { findTierOf, moduleNumberOf } from './content/load';
import {
  isBundledShot,
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
import './setup.css';

export type SetupGuideProps = {
  curriculum: Curriculum;
  /** Module 0 — its exit exercise is the checkpoint at the end of the guide. */
  module: Module;
  progress: Progress;
  onTransition: (transition: (state: ExerciseState) => ExerciseState) => void;
};

const OS_OPTIONS: SetupOs[] = ['windows', 'mac'];

function ShotFigure({ shot }: { shot: SetupShot }) {
  if (!isBundledShot(shot)) {
    // Honest gap, not a fake image: this is what the missing screenshot shows.
    return (
      <p className="setup-shot-pending">
        <span className="setup-shot-pending-label">SCREENSHOT PENDING</span> {shot.pending}
      </p>
    );
  }
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
            <span className="setup-term-label">TYPE THIS</span>
            {/* Real text in a <pre>, so it can be selected and copied. A picture
                of a terminal could not be (#61). */}
            <pre className="setup-term-command">{step.command}</pre>
          </div>
        )}
        {/* What it prints is an expected output like any other, so it is the
            shared block — same markup, same whitespace toggle (#14), no second
            implementation to drift (#61). */}
        {step.output && (
          <ExpectedOutput
            label="IT PRINTS"
            output={step.output}
            sub="your chosen member's name, on its own line"
          />
        )}
        {step.shot && <ShotFigure shot={step.shot} />}
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
  const tier = findTierOf(curriculum, module.id);
  const kicker = `Module ${moduleNumberOf(curriculum, module.id)}${tier ? ` — ${tier.title}` : ''}`;

  return (
    <div className="setup-screen">
      <a className="btn btn-ghost setup-back" href={HOME_ROUTE}>
        ← Map
      </a>
      <p className="setup-kicker">{kicker}</p>
      <h1 className="setup-title">{module.title}</h1>
      <p className="setup-intro">{module.concept.intro}</p>

      <fieldset className="setup-os">
        <legend className="setup-os-legend">Your machine</legend>
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
        <p className="setup-os-note">
          Steps below follow this choice, and it is remembered for next time.
        </p>
      </fieldset>

      <ol className="setup-steps">
        {setupStepsFor(os).map((step, index) => (
          <StepRow key={`${os}-${index}`} step={step} number={index + 1} />
        ))}
      </ol>

      <section className="setup-exit">
        <span className="setup-exit-label">EXIT CHECKPOINT</span>
        <h2 className="setup-exit-title">{exit.title ?? 'Exit checkpoint'}</h2>
        <p className="setup-exit-prompt">{exit.prompt}</p>
        <ExpectedOutput
          output={exit.expectedOutput}
          sub="the shape — your chosen member's name, on its own line"
        />
        {matched ? (
          <>
            <p className="setup-exit-passed">
              <span className="tag tag-accent">PASSED</span> Module 01 is open. Nothing here expires.
            </p>
            <PythonCode code={exit.solution} className="setup-exit-solution" />
          </>
        ) : (
          <>
            <div className="setup-exit-actions">
              <button
                type="button"
                className="btn btn-primary btn-action"
                onClick={() => onTransition(declareMatch)}
              >
                My output matches
              </button>
              <a className="btn btn-secondary btn-action" href={HOME_ROUTE}>
                Come back later
              </a>
            </div>
            <p className="setup-exit-note">
              No hints on this one, and no rush — leave whenever. Your place is kept.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
