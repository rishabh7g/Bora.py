// Gutter tokens and the 720px reading measure (#102, UI baseline §11 "Gutters,
// spacing and content width"). File-level guards on source, the way
// src/layout.test.ts and src/tokens.test.ts already check custom properties
// and media queries this suite's jsdom-free environment cannot resolve.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)));

const tokens = readFileSync(join(srcDir, 'tokens.css'), 'utf8');
const appCss = readFileSync(join(srcDir, 'app.css'), 'utf8');

const cssFiles = [
  'tokens',
  'app',
  'home',
  'module',
  'exercise',
  'settings',
  'setup',
  'shelf',
  'loading',
  'notice',
  'celebration',
  'code',
  'bottomnav',
  'wordmark',
];
const allCss = cssFiles
  .map((name) => readFileSync(join(srcDir, `${name}.css`), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

describe('gutter tokens (#102)', () => {
  it('declares --gutter-sm/md/lg, --gutter and --content-max once, in tokens.css', () => {
    expect(tokens).toContain('--gutter-sm: 16px;');
    expect(tokens).toContain('--gutter-md: 24px;');
    expect(tokens).toContain('--gutter-lg: 32px;');
    expect(tokens).toContain('--gutter: var(--gutter-sm);');
    expect(tokens).toContain('--content-max: 720px;');
  });

  it('steps --gutter at the same 768px / 1024px bands the breakpoints issue set (#97)', () => {
    expect(tokens).toMatch(
      /@media \(min-width: 768px\)\s*\{\s*:root\s*\{\s*--gutter:\s*var\(--gutter-md\);/,
    );
    expect(tokens).toMatch(
      /@media \(min-width: 1024px\)\s*\{\s*:root\s*\{\s*--gutter:\s*var\(--gutter-lg\);/,
    );
  });

  it('gives every direct child of .app-screen a shrinkable min-width, so a wide child never widens the page', () => {
    expect(appCss).toMatch(/\.app-screen\s*>\s*\*\s*\{\s*min-width:\s*0;\s*\}/);
  });

  it('has no screen left setting a reading measure in ch — every one reads var(--content-max)', () => {
    expect(allCss).not.toMatch(/max-width:\s*\d+ch/);
  });

  it('reads --content-max wherever a stylesheet caps a text measure', () => {
    const contentMaxCount = (allCss.match(/max-width:\s*var\(--content-max\)/g) ?? []).length;
    // One per screen that used to hand-set a ch measure (#102's own "Where" list) —
    // pinned as a floor so a future screen cannot silently go back to a literal.
    expect(contentMaxCount).toBeGreaterThanOrEqual(9);
  });

  it('routes every screen\'s horizontal padding through var(--gutter), not a literal', () => {
    const screenSelectors = [
      'home-screen',
      'mod-screen',
      'ex-screen',
      'set-screen',
      'setup-screen',
      'shelf-screen',
      'load-screen',
    ];
    for (const selector of screenSelectors) {
      const rule = new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`).exec(allCss)?.[1] ?? '';
      expect(rule, `.${selector} has no rule to check`).not.toBe('');
      expect(rule, `.${selector}'s padding is not var(--gutter)`).toMatch(
        /padding:[^;]*var\(--gutter\)/,
      );
    }
  });
});

describe('wide content scrolls inside its own container, never the page (#102)', () => {
  const code = readFileSync(join(srcDir, 'code.css'), 'utf8');
  const exercise = readFileSync(join(srcDir, 'exercise.css'), 'utf8');
  const setup = readFileSync(join(srcDir, 'setup.css'), 'utf8');

  it('the shared Python code block scrolls itself', () => {
    expect(code).toMatch(/\.py-code\s*\{[^}]*overflow-x:\s*auto;/s);
  });

  it('the expected-output pane scrolls itself', () => {
    expect(exercise).toMatch(/\.ex-expected pre\s*\{[^}]*overflow-x:\s*auto;/s);
  });

  it('the setup guide\'s terminal command scrolls itself', () => {
    expect(setup).toMatch(/\.setup-term-command\s*\{[^}]*overflow-x:\s*auto;/s);
  });
});
