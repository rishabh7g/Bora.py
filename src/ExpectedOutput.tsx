// The expected-output block — the ONE owner of how an exact terminal output is
// presented (ENGINEERING.md §7; design/README.md: copy-safe monospace,
// deliberately NO copy button and no diff tool, because validation is
// trust-based).
//
// Shared by ExerciseView and SetupGuide so the exit checkpoint looks and behaves
// identically wherever it is shown; styles stay in exercise.css.
//
// Whitespace toggle (ENGINEERING.md §7, §12 "output-match false negatives" — the
// #1 beginner frustration). Off by default. When on it *annotates*, it does not
// rewrite: every character in the <pre> is still the authored character, and each
// marker (· space, → tab, ⏎ line break) is a CSS pseudo-element on its own
// aria-hidden element, drawn over or after it. So selecting the block still
// yields the real text, a screen reader still reads the real output, and the
// markers can only show whitespace that is actually there — in particular the
// last line gets no ⏎, because authored outputs omit the program's final newline.
import { Fragment, useState } from 'react';
import { loadWhitespaceVisible, saveWhitespaceVisible } from './state/whitespaceVisible';
import './exercise.css';

export type ExpectedOutputProps = {
  output: string;
  /** Aside next to the label — the caller's framing of the same block. */
  sub?: string;
  /** The block's own heading. Only the wording changes per caller: the setup
   *  stepper says IT PRINTS where a checkpoint says EXPECTED OUTPUT, and both
   *  get the same markup, toggle and copy-safety from this one component. */
  label?: string;
};

export type OutputChunkKind = 'text' | 'space' | 'tab';
export type OutputChunk = { kind: OutputChunkKind; value: string };
export type OutputLine = { chunks: OutputChunk[]; endsWithNewline: boolean };

// Runs of spaces, runs of tabs, and everything else — in source order.
const CHUNK_PATTERN = / +|\t+|[^ \t]+/g;

/** Splits an output into lines, and each line into whitespace runs and text.
 *  `endsWithNewline` is false on the final line: there is no newline after it,
 *  so nothing may draw one. */
export function splitOutput(output: string): OutputLine[] {
  const lines = output.split('\n');
  return lines.map((line, index) => ({
    chunks: (line.match(CHUNK_PATTERN) ?? []).map((value): OutputChunk => ({
      kind: value.startsWith(' ') ? 'space' : value.startsWith('\t') ? 'tab' : 'text',
      value,
    })),
    endsWithNewline: index < lines.length - 1,
  }));
}

/** The marker legend, listing only the kinds this output actually contains — an
 *  empty list means there is no whitespace at all to point at. */
export function whitespaceLegend(lines: OutputLine[]): string[] {
  const kinds = new Set(lines.flatMap((line) => line.chunks.map((chunk) => chunk.kind)));
  const legend: string[] = [];
  if (kinds.has('space')) legend.push('· space');
  if (kinds.has('tab')) legend.push('→ tab');
  if (lines.some((line) => line.endsWithNewline)) legend.push('⏎ line break');
  return legend;
}

/** The output itself: plain, or annotated with whitespace markers. Exported so
 *  both rendering modes are testable without driving the toggle. */
export function OutputText({
  output,
  showWhitespace,
}: {
  output: string;
  showWhitespace: boolean;
}) {
  if (!showWhitespace) return <pre>{output}</pre>;
  const lines = splitOutput(output);
  return (
    <pre>
      {lines.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {line.chunks.map((chunk, chunkIndex) =>
            chunk.kind === 'text' ? (
              <Fragment key={chunkIndex}>{chunk.value}</Fragment>
            ) : (
              // One wrapper per character, because one marker draws one glyph:
              // the character stays in the text, the marker sits on top of it in
              // its own aria-hidden element — Chrome exposes pseudo-element
              // content to the accessibility tree, so a marker that is not
              // hidden would be read out in the middle of the output.
              [...chunk.value].map((character, characterIndex) => (
                <span
                  key={`${chunkIndex}-${characterIndex}`}
                  className={chunk.kind === 'space' ? 'ex-ws-space' : 'ex-ws-tab'}
                >
                  {character}
                  <span className="ex-ws-mark" aria-hidden="true" />
                </span>
              ))
            ),
          )}
          {line.endsWithNewline && (
            <Fragment>
              <span className="ex-ws-newline" aria-hidden="true" />
              {'\n'}
            </Fragment>
          )}
        </Fragment>
      ))}
    </pre>
  );
}

export default function ExpectedOutput({
  output,
  sub = 'your terminal should print this',
  label = 'EXPECTED OUTPUT',
}: ExpectedOutputProps) {
  // Read synchronously on first render, and write through, so the choice holds
  // across exercises and reloads (state/whitespaceVisible.ts — never Progress).
  const [showWhitespace, setShowWhitespace] = useState(loadWhitespaceVisible);
  const toggle = (next: boolean) => {
    setShowWhitespace(next);
    saveWhitespaceVisible(next);
  };

  const legend = showWhitespace ? whitespaceLegend(splitOutput(output)) : [];

  return (
    <div className="ex-expected">
      <div className="ex-expected-head">
        <span className="ex-expected-label">{label}</span>
        <span className="ex-expected-sub">{sub}</span>
        {/* Design system segment, so hover / pressed / :focus-visible are the
            shared themed ones; Space toggles it from the keyboard. */}
        <div className="seg ex-ws-toggle">
          <label className="seg-opt">
            <input
              type="checkbox"
              checked={showWhitespace}
              onChange={(event) => toggle(event.target.checked)}
            />
            Show whitespace
          </label>
        </div>
      </div>
      <OutputText output={output} showWhitespace={showWhitespace} />
      {showWhitespace && (
        <p className="ex-ws-legend">
          {legend.length > 0
            ? legend.map((entry) => (
                <span key={entry} className="ex-ws-legend-item">
                  {entry}
                </span>
              ))
            : 'Nothing hidden in here — no spaces, tabs or line breaks.'}
        </p>
      )}
    </div>
  );
}
