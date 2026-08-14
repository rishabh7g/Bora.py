/**
 * Shell purity (#100, ui-baseline §8 "Copy & strings — One keyed bundle"): "zero copy hardcoded
 * in components". Every component under `src/` renders its words through `t()`
 * (`src/strings/t.ts`) and a canonical key (`src/strings/stringsKeys.ts`) — never a literal
 * sentence sitting in the JSX itself.
 *
 * This is a real parser check, not a regex over the file text: it parses every `.tsx` file with
 * the TypeScript compiler (already a devDependency) and walks the AST for the two shapes actual
 * copy has always taken in this codebase —
 *
 *   1. JSX text — `<p>Some words</p>` — any text node between tags that contains a run of two or
 *      more letters (a lone arrow "←" or a number is not copy; "Ok" is);
 *   2. a string-literal JSX attribute whose name is not on the technical allowlist below — most
 *      HTML/SVG attributes never carry a sentence (`className`, `role`, `type`…), so anything NOT
 *      on that list (`aria-label`, `alt`, `title`, and the custom `title`/`body`/`label`/`sub`
 *      props `Notice` and `ExpectedOutput` take) is copy until proven otherwise, plus the `label`
 *      property of an object literal passed as an attribute value (`action={{ label: '…' }}`,
 *      the shape `NoticeAction` takes).
 *
 * What this does NOT catch: a string built as a plain module-level constant and only later handed
 * to JSX through an identifier (`const line = 'A sentence'; return <p>{line}</p>`) is invisible to
 * an AST walk scoped to JSX nodes. Every such case found during #100 was migrated by hand; this
 * test is the tripwire against a *new* one being pasted in the two shapes above, which is how
 * copy has always entered this codebase.
 *
 * `src/dev/*` does not exist in this app, so unlike the sibling projects this guard has no
 * font-specimen-style exemption; `Wordmark.tsx` is the one deliberate exception — see ALLOWED.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * `Wordmark.tsx` (BRAND.md "the ONE owner of how the brand name is set in the app") renders the
 * literal glyphs `bora` / `.py` as JSX text on purpose — the product name is a fixed brand asset,
 * not translatable copy, the same way a logo is not. Nothing else is exempt.
 */
const ALLOWED: readonly string[] = ['src/Wordmark.tsx'];

/** Attributes that never carry a sentence in this codebase — everything else is copy until
 *  proven otherwise. Deliberately short: an attribute nobody had to argue for landing here is
 *  how the guard rots. */
const TECHNICAL_ATTRS = new Set([
  'className',
  'class',
  'key',
  'id',
  'ref',
  'type',
  'name',
  'value',
  'href',
  'src',
  'style',
  'role',
  'tabIndex',
  'accept',
  'htmlFor',
  'checked',
  'onClick',
  'onChange',
  'onKeyDown',
  'onSubmit',
  'loading',
  'rel',
  'target',
  // SVG.
  'viewBox',
  'points',
  'stroke',
  'strokeWidth',
  'strokeLinecap',
  'fill',
  'x',
  'y',
  'width',
  'height',
  'rx',
  'cx',
  'cy',
  'r',
  'xmlns',
  'focusable',
  // ARIA state, not ARIA naming — these carry a boolean/token, never a sentence.
  'aria-hidden',
  'aria-current',
  'aria-modal',
  'aria-disabled',
  'aria-expanded',
]);

/** At least two letters, so a lone arrow ("←"), a bullet ("·") or a bare number never counts. */
const HAS_WORDS = /[A-Za-z]{2,}/;

function filesUnder(dir: string, extension: string): string[] {
  return readdirSync(join(repoRoot, dir)).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(join(repoRoot, path)).isDirectory()) return filesUnder(path, extension);
    return path.endsWith(extension) ? [path] : [];
  });
}

const TSX_FILES = filesUnder('src', '.tsx').filter(
  (path) => !path.endsWith('.test.tsx') && !ALLOWED.includes(path.split('\\').join('/')),
);

type Offense = { file: string; line: number; text: string };

function lineOf(source: ts.SourceFile, pos: number): number {
  return source.getLineAndCharacterOfPosition(pos).line + 1;
}

function scan(path: string): Offense[] {
  const text = readFileSync(join(repoRoot, path), 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const offenses: Offense[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node)) {
      const trimmed = node.text.trim();
      if (HAS_WORDS.test(trimmed)) {
        offenses.push({ file: path, line: lineOf(source, node.getStart(source)), text: trimmed });
      }
    } else if (ts.isJsxAttribute(node)) {
      const attrName = node.name.getText(source);
      if (!TECHNICAL_ATTRS.has(attrName)) {
        collectAttributeLiterals(node, offenses, path, source);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return offenses;
}

/** A flagged attribute's value: a bare string literal, or an object literal's `label` property
 *  (the `NoticeAction`/`action={{ label: '…' }}` shape). */
function collectAttributeLiterals(
  attribute: ts.JsxAttribute,
  offenses: Offense[],
  path: string,
  source: ts.SourceFile,
): void {
  const init = attribute.initializer;
  if (!init) return; // a boolean attribute, e.g. `disabled`

  if (ts.isStringLiteral(init)) {
    pushIfCopy(init.text, init, offenses, path, source);
    return;
  }

  if (ts.isJsxExpression(init) && init.expression) {
    for (const node of objectLiteralsIn(init.expression)) {
      for (const prop of node.properties) {
        if (
          ts.isPropertyAssignment(prop) &&
          ts.isIdentifier(prop.name) &&
          prop.name.text === 'label' &&
          ts.isStringLiteral(prop.initializer)
        ) {
          pushIfCopy(prop.initializer.text, prop.initializer, offenses, path, source);
        }
      }
    }
  }
}

function objectLiteralsIn(expression: ts.Expression): ts.ObjectLiteralExpression[] {
  return ts.isObjectLiteralExpression(expression) ? [expression] : [];
}

function pushIfCopy(
  value: string,
  node: ts.Node,
  offenses: Offense[],
  path: string,
  source: ts.SourceFile,
): void {
  if (HAS_WORDS.test(value)) {
    offenses.push({ file: path, line: lineOf(source, node.getStart(source)), text: value });
  }
}

describe('shell purity — no hardcoded copy in a component', () => {
  it('scans every non-test .tsx file under src/, not a stale hand-listed set', () => {
    expect(TSX_FILES.length).toBeGreaterThan(10);
    expect(TSX_FILES).toContain('src/HomeMap.tsx');
  });

  it('has no JSX text or user-facing attribute holding an English sentence', () => {
    const offenses = TSX_FILES.flatMap(scan);
    if (offenses.length > 0) {
      const report = offenses
        .map((offense) => `  - ${offense.file}:${offense.line}: "${offense.text}"`)
        .join('\n');
      throw new Error(
        `${offenses.length} component(s) hold hardcoded copy — move it into src/strings/en.ts ` +
          `and read it with t():\n${report}`,
      );
    }
  });

  it('fails on a planted literal — proving the scan actually catches one', () => {
    const planted = `export default function X() { return <p>Hardcoded words here</p>; }`;
    const source = ts.createSourceFile('planted.tsx', planted, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let found = false;
    function visit(node: ts.Node): void {
      if (ts.isJsxText(node) && HAS_WORDS.test(node.text.trim())) found = true;
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(found).toBe(true);
  });
});
