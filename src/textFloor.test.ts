// The body-text floor (#106, UI baseline §7 "Touch, zoom and app-feel"):
// "Body text may not go below 16px. No exceptions, including captions inside
// cards." File-level guard on source, the way src/layout.test.ts and
// src/tokens.test.ts already check values this suite's jsdom-free
// environment cannot resolve.
//
// The acceptance criteria offer two ways to enforce this: "a test scans the
// stylesheets for font-size declarations below 16px and fails on any that
// lacks an adjacent justifying comment — or, simpler, asserts against an
// explicit allow-list of justified exceptions." This is the simpler one:
// every rule under 16px in src/*.css must be named in ALLOWED below, or the
// test fails naming the file and selector. Adding a new one is a conscious
// edit to this list, never a silent drop below the floor.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)));
const repoRoot = resolve(srcDir, '..');

/**
 * Kickers — uppercase, letter-spacing >= 0.08em micro-labels and the section
 * eyebrows styled the same way (a deliberate, consistent pattern across
 * every screen: a small tracked label instead of a full-size heading). This
 * is the ONE exception §7 itself names. `.mod-copy` / `.mod-copy--failed`
 * are the copy button's own COPY / COPIED / COPY FAILED state text — the
 * same tracked micro-label treatment on a 44px icon button rather than a
 * section eyebrow.
 */
const KICKERS = [
  ['src/celebration.css', '.celebrate-kicker'],
  ['src/exercise.css', '.ex-kicker'],
  ['src/exercise.css', '.ex-expected-label'],
  ['src/exercise.css', '.ex-section-title'],
  ['src/exercise.css', '.ex-rung-label'],
  ['src/exercise.css', '.ex-checklist-title'],
  ['src/home.css', '.home-kicker'],
  ['src/home.css', '.home-tiertitle'],
  ['src/module.css', '.mod-kicker'],
  ['src/module.css', '.mod-section-title'],
  ['src/module.css', '.mod-copy'],
  ['src/module.css', '.mod-copy--failed'],
  ['src/settings.css', '.set-kicker'],
  ['src/settings.css', '.set-h2'],
  ['src/setup.css', '.setup-kicker'],
  ['src/setup.css', '.setup-os-legend'],
  ['src/setup.css', '.setup-section-title'],
  ['src/setup.css', '.setup-term-label'],
  ['src/setup.css', '.setup-look-label'],
  ['src/setup.css', '.setup-exit-label'],
  ['src/shelf.css', '.shelf-kicker'],
] as const;

/**
 * Verbatim monospace content shown as reference — not the block a learner
 * checks her own output against (that one, `.ex-expected pre`, IS floored;
 * see src/tokens.css). Exact program text, not English the app writes.
 */
const CODE = [
  ['src/code.css', '.py-code'],
  ['src/module.css', '.mod-example-output'],
  ['src/settings.css', '.set-file'],
  ['src/setup.css', '.setup-term-command'],
] as const;

const ALLOWED = new Set([...KICKERS, ...CODE].map(([file, selector]) => `${file}::${selector}`));

const cssFiles = readdirSync(srcDir).filter((name) => name.endsWith('.css'));

type Rule = { file: string; selector: string; px: number };

/** Every `selector { … }` block's font-size (plain or the size in a `font:`
 *  shorthand), comments stripped so a comment quoting a size can never be
 *  what a match reads. */
function rulesUnder16(file: string, text: string): Rule[] {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(stripped))) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    const body = match[2];
    const plain = /font-size:\s*([0-9.]+)px/.exec(body);
    const shorthand = /\bfont:\s*[^;]*?([0-9.]+)px/.exec(body);
    const px = plain ? Number(plain[1]) : shorthand ? Number(shorthand[1]) : null;
    if (px !== null && px < 16) rules.push({ file, selector, px });
  }
  return rules;
}

const offenders = cssFiles.flatMap((name) =>
  rulesUnder16(`src/${name}`, readFileSync(join(srcDir, name), 'utf8')),
);

describe('body-text floor (#106)', () => {
  it('declares --text-body-min: 16px once, in tokens.css', () => {
    const tokens = readFileSync(join(srcDir, 'tokens.css'), 'utf8');
    expect(tokens).toContain('--text-body-min: 16px;');
  });

  it('has every sub-16px rule in src/*.css on the allow-list, or fails naming it', () => {
    const unlisted = offenders.filter(
      (rule) => !ALLOWED.has(`${rule.file}::${rule.selector}`),
    );
    if (unlisted.length > 0) {
      const report = unlisted
        .map((rule) => `  - ${rule.file} :: ${rule.selector} (${rule.px}px)`)
        .join('\n');
      throw new Error(
        `${unlisted.length} rule(s) render text under 16px without a justified exception:\n${report}`,
      );
    }
  });

  it("does not let the allow-list itself go stale — every entry still exists and is still under 16px", () => {
    const seen = new Set(offenders.map((rule) => `${rule.file}::${rule.selector}`));
    for (const [file, selector] of [...KICKERS, ...CODE]) {
      expect(seen.has(`${file}::${selector}`), `${file} :: ${selector} is no longer under 16px`).toBe(
        true,
      );
    }
  });

  it('floors the design system components the app actually renders', () => {
    // design/_ds is not "a stylesheet under src/", so it's outside the
    // mechanical scan above — but body / .btn / .input / .seg-opt /
    // figcaption / .tag are the shared classes this app's screens actually
    // use, so they are checked here, individually, rather than scanning the
    // whole file (which also ships components — .card, .table, .nav, h6,
    // .radio, .field — this app never renders).
    const ds = readFileSync(
      join(
        repoRoot,
        'design/_ds/modernist-86c43557-9db6-4330-a863-9ea3a48fad23/styles.css',
      ),
      'utf8',
    );
    expect(ds).toMatch(/body\s*\{[^}]*font-size:\s*var\(--text-body-min/);
    expect(ds).toMatch(/\n\.btn\s*\{[^}]*font-size:\s*16px/);
    expect(ds).toMatch(/\n\.input\s*\{[^}]*font-size:\s*16px/);
    expect(ds).toMatch(/\n\.seg-opt\s*\{[^}]*font-size:\s*16px/);
    expect(ds).toMatch(/\nfigcaption\s*\{[^}]*font-size:\s*16px/);
    expect(ds).toMatch(/\n\.tag\s*\{[^}]*font-size:\s*16px/);
  });
});
