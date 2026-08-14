// The house UI standard's breakpoint law (§3, #97): 480 / 768 / 1024, four
// bands, phone bands written max-width and the tablet/laptop bands written
// min-width — never both directions around the same pixel value. Asserted
// against source, the way src/tokens.test.ts and the shell guards in
// src/App.test.tsx and src/BottomNav.test.tsx do: this suite has no jsdom,
// and a jsdom would resolve neither `env()` nor the `calc()` around it if it
// had one.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)));

const cssFiles = readdirSync(srcDir).filter((name) => name.endsWith('.css'));

/** Every stylesheet's declarations, comments stripped — a comment quoting the
 *  breakpoint it documents must never be what makes a guard pass. */
const allCss = cssFiles
  .map((name) => readFileSync(join(srcDir, name), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('breakpoints (#97)', () => {
  it('carries at least one min-width: 768px and one min-width: 1024px rule', () => {
    expect(allCss).toMatch(/@media \(min-width: 768px\)/);
    expect(allCss).toMatch(/@media \(min-width: 1024px\)/);
  });

  it('still carries the existing max-width: 480px phone bands, untouched', () => {
    expect(allCss).toMatch(/@media \(max-width: 480px\)/);
  });

  it('never pairs a max-width and a min-width rule around the same pixel value', () => {
    const maxWidths = [...allCss.matchAll(/@media \([^)]*max-width:\s*(\d+)px[^)]*\)/g)].map(
      (match) => match[1],
    );
    const minWidths = [...allCss.matchAll(/@media \([^)]*min-width:\s*(\d+)px[^)]*\)/g)].map(
      (match) => match[1],
    );
    for (const value of maxWidths) expect(minWidths).not.toContain(value);
  });

  it('writes only the four sanctioned bands — 480, 768, 1024 — no others', () => {
    const widths = [...allCss.matchAll(/@media \([^)]*(?:min|max)-width:\s*(\d+)px[^)]*\)/g)].map(
      (match) => match[1],
    );
    for (const width of widths) expect(['480', '768', '1024']).toContain(width);
  });
});

describe('safe-area insets (#122)', () => {
  it('never writes a bare env() — every inset sits inside a calc() or max() with a designed term', () => {
    const insets = allCss.match(/env\(safe-area-inset-[a-z]+/g) ?? [];
    const guarded = allCss.match(/(?:calc|max)\([^;]*env\(safe-area-inset-[a-z]+/g) ?? [];
    expect(insets).not.toHaveLength(0);
    expect(insets).toHaveLength(guarded.length);
  });
});
