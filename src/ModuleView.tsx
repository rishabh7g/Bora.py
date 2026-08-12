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

export type CopyStatus = 'idle' | 'copied' | 'failed';

/** The clipboard write as the button consumes it: a status to show, never a
 *  rejection. A browser can refuse `writeText` (permission not granted, an
 *  embedded or permission-policy-restricted context) or not expose the API at
 *  all — both are things the learner should be told, not unhandled console
 *  noise. `clipboard` is injectable so both paths are testable. */
export async function copyStatusOf(
  code: string,
  clipboard: Pick<Clipboard, 'writeText'> | undefined = globalThis.navigator?.clipboard,
): Promise<CopyStatus> {
  if (!clipboard) return 'failed';
  try {
    await clipboard.writeText(code);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Button label per status — a refused write says so instead of staying on COPY
 *  as if the code had been copied. */
export function copyLabelOf(status: CopyStatus): string {
  if (status === 'copied') return 'COPIED';
  if (status === 'failed') return 'COPY FAILED';
  return 'COPY';
}

/** Copy button for worked-example CODE blocks only — expected-output blocks
 *  never get one (output must be produced, not pasted). */
function CopyButton({ code }: { code: string }) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Both outcomes are transient and share one timer: the button says what
  // happened, then goes back to offering the copy.
  const copy = () => {
    void copyStatusOf(code).then((next) => {
      setStatus(next);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setStatus('idle'), 1500);
    });
  };

  return (
    <>
      <button
        type="button"
        className={status === 'failed' ? 'mod-copy mod-copy--failed' : 'mod-copy'}
        onClick={copy}
        aria-label={status === 'idle' ? 'Copy code' : copyLabelOf(status)}
      >
        {copyLabelOf(status)}
      </button>
      {status === 'failed' && (
        <p className="mod-copy-note" role="status">
          This browser blocked the clipboard. Select the code and copy it by hand — or type it out,
          which is what these examples are for anyway.
        </p>
      )}
    </>
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
