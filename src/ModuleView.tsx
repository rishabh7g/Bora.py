// ModuleView — the Module screen (ENGINEERING.md §7, §11 step 3; DESIGN.md
// §3.2, §3.6, §7; prototype: design/PyLearn Prototype.dc.html → Module).
// Concept doc → worked examples (highlighted code + copy button) → exercise
// list with state chips → exit exercise row.
//
// Every gating decision is read from src/state/gating.ts (§6 owner); chips
// are a pure projection of the persisted ExerciseState. This component only
// renders — it never mutates progress.
import { useEffect, useRef, useState } from 'react';
import { findTierOf, moduleNumberOf } from './content/load';
import type { Curriculum, Module, WorkedExample } from './content/types';
import PythonCode from './PythonCode';
import type { ExerciseState } from './state/effortGate';
import { exitUnlocked } from './state/gating';
import { exerciseStateOf, type Progress } from './state/progress';
import './module.css';

export type Chip = { label: string; className: string };

/** Exercise state chip derived from persisted Progress —
 *  untouched / attempted / hint used / matched / solution seen. */
export function exerciseChipOf(state: ExerciseState): Chip {
  if (state.matched) return { label: 'MATCHED', className: 'tag-accent' };
  if (state.solutionRevealed) return { label: 'SOLUTION SEEN', className: 'tag-neutral' };
  if (state.hintsUnlocked > 0)
    return { label: `HINT ${state.hintsUnlocked} USED`, className: 'tag-outline' };
  if (state.attempts > 0) return { label: `TRIED ×${state.attempts}`, className: 'tag-outline' };
  return { label: 'NOT STARTED', className: 'tag-neutral' };
}

/** Copy button for worked-example CODE blocks only — expected-output blocks
 *  never get one (output must be produced, not pasted). */
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button type="button" className="mod-copy" onClick={copy} aria-label="Copy code">
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

function WorkedExampleBlock({ example, number }: { example: WorkedExample; number: string }) {
  return (
    <div className="mod-example">
      <span className="mod-num">{number}</span>
      <div className="mod-example-body">
        <div className="mod-codewrap">
          <PythonCode code={example.code} className="mod-example-code" />
          <CopyButton code={example.code} />
        </div>
        <pre className="mod-example-output">{example.output}</pre>
        <p className="mod-example-why">{example.why}</p>
      </div>
    </div>
  );
}

export type ModuleViewProps = {
  curriculum: Curriculum;
  module: Module;
  progress: Progress;
};

export default function ModuleView({ curriculum, module, progress }: ModuleViewProps) {
  const tier = findTierOf(curriculum, module.id);
  const moduleNumber = moduleNumberOf(curriculum, module.id);
  const exitOpen = exitUnlocked(module, progress);
  const exitState = exerciseStateOf(progress, module.id, module.exitExercise.id);
  const exitChip: Chip = exitState.matched
    ? { label: 'PASSED', className: 'tag-accent' }
    : { label: 'READY', className: 'tag-outline' };
  const exitTitle = module.exitExercise.title ?? 'Exit checkpoint';

  return (
    <div className="mod-screen">
      {/* "#/" is the Home-map route; HomeMap ships with a later issue and the
          router falls back to the default module until then. */}
      <a className="btn btn-ghost mod-back" href="#/">
        ← Map
      </a>
      <p className="mod-kicker">{`Module ${moduleNumber}${tier ? ` — ${tier.title}` : ''}`}</p>
      <h1 className="mod-title">{module.title}</h1>
      {/* Concept intro is authored markdown; today's content uses plain
          paragraphs, so render paragraph breaks only. */}
      {module.concept.intro.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="mod-intro">
          {paragraph}
        </p>
      ))}

      <h2 className="mod-section-title">Worked examples</h2>
      <p className="mod-section-sub">
        Each shows the code, its exact terminal output, and why it works. Type and run every one on
        your machine.
      </p>
      <div className="mod-examples">
        {module.concept.examples.map((example, index) => (
          <WorkedExampleBlock
            key={index}
            example={example}
            number={String(index + 1).padStart(2, '0')}
          />
        ))}
      </div>

      <h2 className="mod-section-title">Exercises</h2>
      <div className="mod-exercises">
        {module.exercises.map((exercise, index) => {
          const chip = exerciseChipOf(exerciseStateOf(progress, module.id, exercise.id));
          return (
            <a
              key={exercise.id}
              className="mod-exrow"
              href={`#/module/${module.id}/exercise/${exercise.id}`}
            >
              <span className="mod-num">{String(index + 1).padStart(2, '0')}</span>
              <span className="mod-exrow-title">{exercise.title ?? exercise.id}</span>
              <span className={`tag ${chip.className} mod-chip`}>{chip.label}</span>
            </a>
          );
        })}

        {exitOpen ? (
          <a className="mod-exitrow mod-exitrow--open" href={`#/module/${module.id}/exit`}>
            <span className="mod-num mod-num--accent">EX</span>
            <span className="mod-exitrow-text">
              <span className="mod-exitrow-title">{exitTitle}</span>
              <span className="mod-exitrow-sub">
                Summative. No hints, no examples on screen. Passing awards the photocard.
              </span>
            </span>
            <span className={`tag ${exitChip.className} mod-chip`}>{exitChip.label}</span>
          </a>
        ) : (
          <div className="mod-exitrow mod-exitrow--locked">
            <span className="mod-num">EX</span>
            <span className="mod-exitrow-text">
              <span className="mod-exitrow-title">{exitTitle}</span>
              <span className="mod-exitrow-sub">
                Unlocks when every practice exercise is matched or its solution seen.
              </span>
            </span>
            <span className="tag tag-neutral mod-chip">LOCKED</span>
          </div>
        )}
      </div>
    </div>
  );
}
