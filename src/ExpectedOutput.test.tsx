// ExpectedOutput contract — the one owner of the expected-output block, and of
// the "show whitespace" toggle it carries (ENGINEERING.md §7, §12).
//
// The block is server-rendered here, so the toggle cannot be clicked; the two
// rendering modes are asserted through the exported `OutputText`, and the
// control itself through the markup it must produce.
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ExpectedOutput, { OutputText, splitOutput, whitespaceLegend } from './ExpectedOutput';
import { findModule, loadCurriculum } from './content/load';
import {
  DEFAULT_WHITESPACE_VISIBLE,
  parseWhitespaceVisible,
  WHITESPACE_VISIBLE_KEY,
} from './state/whitespaceVisible';
import { emptyProgress, updateExerciseState } from './state/progress';
import { declareMatch } from './state/effortGate';

const OUTPUT = 'Jimin\n  indented\n\tTabbed line\nlast';

function marked(output: string): string {
  return renderToString(<OutputText output={output} showWhitespace />);
}

/** The characters a browser would copy out of the rendered block: markup and
 *  React's SSR comment separators stripped, nothing else. */
function textOf(html: string): string {
  return html.replace(/<!--.*?-->/g, '').replace(/<[^>]*>/g, '');
}

it('splits an output into whitespace runs, and never a newline after the last line', () => {
  const lines = splitOutput('a  b\n\tc');
  expect(lines).toHaveLength(2);
  expect(lines[0].chunks).toEqual([
    { kind: 'text', value: 'a' },
    { kind: 'space', value: '  ' },
    { kind: 'text', value: 'b' },
  ]);
  expect(lines[0].endsWithNewline).toBe(true);
  expect(lines[1].chunks[0]).toEqual({ kind: 'tab', value: '\t' });
  // Authored outputs omit the program's final newline (#11/#12), so the block
  // must never draw one there.
  expect(lines[1].endsWithNewline).toBe(false);
  expect(splitOutput('Jimin')).toEqual([{ chunks: [{ kind: 'text', value: 'Jimin' }], endsWithNewline: false }]);
});

it('marks every space and tab, and one line break per real newline', () => {
  const html = marked(OUTPUT);
  // Every space, one marker each: the two-space indent plus the one inside
  // "Tabbed line".
  expect(html.match(/class="ex-ws-space"/g)?.length).toBe(3);
  expect(html.match(/class="ex-ws-tab"/g)?.length).toBe(1);
  // 4 lines → 3 newlines; the trailing one does not exist and is not implied.
  expect(html.match(/class="ex-ws-newline"/g)?.length).toBe(3);
  expect(marked('Jimin')).not.toContain('ex-ws-newline');
});

it('marks a space inside a line without implying a trailing one', () => {
  // "Jimin " would be trailing whitespace; the authored form has none, so the
  // only marked space is the interior one.
  const html = marked('My bias is Jimin');
  expect(html.match(/class="ex-ws-space"/g)?.length).toBe(3);
  expect(html).not.toContain('ex-ws-newline');
});

it('annotates rather than rewrites — the text stays byte-identical', () => {
  // Purely visual: the · → ⏎ glyphs are CSS pseudo-element content, so they are
  // nowhere in the markup, and the block still reads out the real output.
  const html = marked(OUTPUT);
  expect(textOf(html)).toBe(OUTPUT);
  expect(html).not.toContain('·');
  expect(html).not.toContain('⏎');
  expect(textOf(renderToString(<OutputText output={OUTPUT} showWhitespace={false} />))).toBe(OUTPUT);
});

it('hides every marker from assistive tech, so the output still reads aloud', () => {
  // Pseudo-element content DOES reach the accessibility tree, so each glyph has
  // to hang off an aria-hidden element — otherwise a screen reader announces
  // "Now dot playing" in the middle of the expected output.
  const html = marked(OUTPUT);
  const markers = html.match(/class="ex-ws-(?:mark|newline)"[^>]*/g) ?? [];
  expect(markers).toHaveLength(3 + 1 + 3); // spaces + tab + line breaks
  for (const marker of markers) expect(marker).toContain('aria-hidden="true"');
  // …and nothing else in the block is hidden: the characters themselves stay.
  expect(html.match(/aria-hidden="true"/g)).toHaveLength(markers.length);
});

it('names only the whitespace kinds the output actually contains', () => {
  expect(whitespaceLegend(splitOutput(OUTPUT))).toEqual(['· space', '→ tab', '⏎ line break']);
  expect(whitespaceLegend(splitOutput('a\nb'))).toEqual(['⏎ line break']);
  expect(whitespaceLegend(splitOutput('Jimin'))).toEqual([]);
});

it('offers the toggle off by default, from the design system segment', () => {
  const html = renderToString(<ExpectedOutput output={OUTPUT} />);
  expect(html).toContain('class="seg ex-ws-toggle"');
  expect(html).toContain('type="checkbox"');
  expect(html).toContain('Show whitespace'); // labels the checkbox for a screen reader
  expect(html).not.toContain('checked=""'); // off by default
  expect(html).not.toContain('ex-ws-space'); // …so nothing is marked yet
  expect(html).not.toContain('ex-ws-legend');
  expect(html).toContain(OUTPUT); // plain, exactly as authored
});

it('keeps the block trust-based: no copy button, no diff tool', () => {
  const html = renderToString(<ExpectedOutput output={OUTPUT} />).toLowerCase();
  expect(html).not.toContain('copy');
  expect(html).not.toContain('diff');
  expect(html).not.toContain('compare');
});

it('persists the preference under its own key — never inside the progress backup', () => {
  expect(WHITESPACE_VISIBLE_KEY).toBe('bora-py-whitespace-visible');
  expect(DEFAULT_WHITESPACE_VISIBLE).toBe(false);
  expect(parseWhitespaceVisible('on')).toBe(true);
  expect(parseWhitespaceVisible('off')).toBe(false);
  // Absent or junk falls back rather than throwing.
  expect(parseWhitespaceVisible(null)).toBe(DEFAULT_WHITESPACE_VISIBLE);
  expect(parseWhitespaceVisible('yes')).toBe(DEFAULT_WHITESPACE_VISIBLE);
  const m1 = findModule(loadCurriculum(), 'm1')!;
  const passed = updateExerciseState(emptyProgress(), m1.id, m1.exitExercise.id, true, declareMatch);
  expect(JSON.stringify(passed)).not.toContain('whitespace');
});

it('is taught in Module 1: outputs match exactly, and here is how to check', () => {
  // ENGINEERING.md §7 — the concept doc has to point at the toggle by name.
  const intro = findModule(loadCurriculum(), 'm1')!.concept.intro;
  expect(intro).toContain('match exactly');
  expect(intro).toContain('Show whitespace');
  expect(intro).toContain('·');
  expect(intro).toContain('⏎');
});
