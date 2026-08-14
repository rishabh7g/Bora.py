// App-feel (#103, UI baseline §7 "Touch, zoom and app-feel"): every element
// that responds to a tap gets `touch-action: manipulation` (skips the 300ms
// double-tap-zoom wait) and `-webkit-tap-highlight-color: transparent` (kills
// the grey flash); `user-select: none` is chrome only. File-level guards on
// source, the way src/layout.test.ts / src/tokens.test.ts / src/textFloor.test.ts
// already check values this suite's jsdom-free environment cannot resolve.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(srcDir, '..');

const ds = readFileSync(
  join(repoRoot, 'design/_ds/modernist-86c43557-9db6-4330-a863-9ea3a48fad23/styles.css'),
  'utf8',
);

/** Every interactive selector the issue names, and the file its rule lives
 *  in — the shared design-system classes every screen's buttons/links/radios
 *  take, plus the handful of elements styled outside the shared system
 *  (a plain `<button>`, the file input's browser-drawn pseudo-element). */
const INTERACTIVE: ReadonlyArray<{ file: string; text: string; selector: string }> = [
  { file: 'design system', text: ds, selector: 'a' },
  { file: 'design system', text: ds, selector: '.btn' },
  { file: 'design system', text: ds, selector: '.radio' },
  { file: 'design system', text: ds, selector: '.seg-opt' },
];

function cssOf(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

const perFile: ReadonlyArray<{ file: string; selector: string }> = [
  { file: 'src/exercise.css', selector: '.btn-action' },
  { file: 'src/settings.css', selector: '.set-input::file-selector-button' },
  { file: 'src/shelf.css', selector: '.shelf-card--earned' },
  { file: 'src/celebration.css', selector: '.celebrate-continue' },
  { file: 'src/module.css', selector: '.mod-copy' },
];

/** The exact rule block for a selector — comments stripped, so a comment
 *  quoting the property can never be what a match passes on. */
function ruleBodyOf(cssText: string, selector: string): string {
  const stripped = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const pattern = new RegExp(`(?:^|[\\s,{}])${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^{}]*)\\}`);
  const match = pattern.exec(stripped);
  return match?.[1] ?? '';
}

describe('touch-action and tap-highlight on every interactive element (#103)', () => {
  it("the shared .btn class carries both rules — the acceptance criteria's own explicit check", () => {
    const body = ruleBodyOf(ds, '.btn');
    expect(body).toMatch(/touch-action:\s*manipulation/);
    expect(body).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
  });

  it('every design-system interactive class carries both rules', () => {
    for (const { selector, text } of INTERACTIVE) {
      const body = ruleBodyOf(text, selector);
      expect(body, `${selector} has no rule to check`).not.toBe('');
      expect(body, `${selector} is missing touch-action: manipulation`).toMatch(
        /touch-action:\s*manipulation/,
      );
      expect(body, `${selector} is missing -webkit-tap-highlight-color: transparent`).toMatch(
        /-webkit-tap-highlight-color:\s*transparent/,
      );
    }
  });

  it('every app-level interactive element not covered by the shared classes carries both rules', () => {
    for (const { file, selector } of perFile) {
      const body = ruleBodyOf(cssOf(file), selector);
      expect(body, `${file} :: ${selector} has no rule to check`).not.toBe('');
      expect(body, `${file} :: ${selector} is missing touch-action: manipulation`).toMatch(
        /touch-action:\s*manipulation/,
      );
      expect(
        body,
        `${file} :: ${selector} is missing -webkit-tap-highlight-color: transparent`,
      ).toMatch(/-webkit-tap-highlight-color:\s*transparent/);
    }
  });

  it('.bottomnav-item has user-select: none', () => {
    const body = ruleBodyOf(cssOf('src/bottomnav.css'), '.bottomnav-item');
    expect(body).toMatch(/user-select:\s*none/);
  });

  it('user-select: none appears nowhere else — chrome only, never content', () => {
    const cssDir = srcDir;
    const files = readdirSync(cssDir).filter((name) => name.endsWith('.css'));
    const hits: string[] = [];
    for (const name of files) {
      const text = readFileSync(join(cssDir, name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      if (name === 'bottomnav.css') continue;
      if (/user-select:\s*none/.test(text)) hits.push(name);
    }
    expect(hits).toEqual([]);
  });

  it('.app-screen still declares overscroll-behavior: contain, unchanged (#103 leaves it alone)', () => {
    const body = ruleBodyOf(cssOf('src/app.css'), '.app-screen');
    expect(body).toMatch(/overscroll-behavior:\s*contain/);
  });
});
