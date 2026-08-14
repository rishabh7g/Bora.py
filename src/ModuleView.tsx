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
import { t } from './strings/t';
import './module.css';

export type Chip = { label: string; className: string };

/** Exercise state chip derived from persisted Progress —
 *  untouched / attempted / hint used / matched / solution seen. */
export function exerciseChipOf(state: ExerciseState): Chip {
  if (state.matched) return { label: t('module.status.matched'), className: 'tag-accent' };
  if (state.solutionRevealed)
    return { label: t('module.status.solutionSeen'), className: 'tag-neutral' };
  if (state.hintsUnlocked > 0)
    return {
      label: t('module.status.hintUsed', { number: state.hintsUnlocked }),
      className: 'tag-outline',
    };
  if (state.attempts > 0)
    return { label: t('module.status.tried', { count: state.attempts }), className: 'tag-outline' };
  return { label: t('module.status.notStarted'), className: 'tag-neutral' };
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
  if (status === 'copied') return t('module.copy.copied');
  if (status === 'failed') return t('module.copy.failed');
  return t('module.copy.idleLabel');
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
        aria-label={status === 'idle' ? t('module.copy.ariaIdle') : copyLabelOf(status)}
      >
        {copyLabelOf(status)}
      </button>
      {status === 'failed' && (
        <p className="mod-copy-note" role="status">
          {t('module.copy.blockedNote')}
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
    ? { label: t('common.status.passed'), className: 'tag-accent' }
    : { label: t('module.status.ready'), className: 'tag-outline' };
  const exitTitle = module.exitExercise.title ?? t('common.exitCheckpointTitle');

  return (
    <div className="mod-screen">
      {/* "#/" is the Home-map route; HomeMap ships with a later issue and the
          router falls back to the default module until then. */}
      <a className="btn btn-ghost mod-back" href="#/">
        {t('common.backToMap')}
      </a>
      <p className="mod-kicker">
        {tier
          ? t('module.kicker.withTier', { number: moduleNumber, tier: tier.title })
          : t('module.kicker.plain', { number: moduleNumber })}
      </p>
      <h1 className="mod-title">{module.title}</h1>
      {/* Concept intro is authored markdown; today's content uses plain
          paragraphs, so render paragraph breaks only. */}
      {module.concept.intro.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="mod-intro">
          {paragraph}
        </p>
      ))}

      <h2 className="mod-section-title">{t('module.section.workedExamples')}</h2>
      {/* #101: the sub-line described mechanics the rows underneath already
          demonstrate — read once, then skimmed past on every module. */}
      <div className="mod-examples">
        {module.concept.examples.map((example, index) => (
          <WorkedExampleBlock
            key={index}
            example={example}
            number={String(index + 1).padStart(2, '0')}
          />
        ))}
      </div>

      <h2 className="mod-section-title">{t('module.section.exercises')}</h2>
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
            <span className="mod-num mod-num--accent">{t('module.exit.badge')}</span>
            <span className="mod-exitrow-text">
              <span className="mod-exitrow-title">{exitTitle}</span>
              <span className="mod-exitrow-sub">{t('module.exit.summativeNote')}</span>
            </span>
            <span className={`tag ${exitChip.className} mod-chip`}>{exitChip.label}</span>
          </a>
        ) : (
          <div className="mod-exitrow mod-exitrow--locked">
            <span className="mod-num">{t('module.exit.badge')}</span>
            <span className="mod-exitrow-text">
              <span className="mod-exitrow-title">{exitTitle}</span>
              <span className="mod-exitrow-sub">{t('module.exit.lockedNote')}</span>
            </span>
            <span className="tag tag-neutral mod-chip">{t('common.status.locked')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
