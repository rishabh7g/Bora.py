// docs/02-engineering.md is a contract, not prose — and an unchecked contract rots.
// §2 named a CSS framework this repo has never depended on, and §8 named a
// highlighter that was never installed (#132). Both read as instructions: a
// newcomer goes looking for utility classes that do not exist, or adds the
// dependency believing it was intended.
//
// Two things are cheap to keep true mechanically, so they are checked here
// rather than trusted:
//   - every backticked repo path in the document resolves on disk;
//   - every backticked bare package name in §2 is really in package.json.
// Prose is still prose — this guard only catches the claims that are decidable.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const doc = readFileSync(join(repoRoot, 'docs/02-engineering.md'), 'utf8');
const manifest = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const declaredPackages = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
]);

// Backticked spans that could be a path: word characters, dots, slashes, dashes.
// Anything with a space, a brace or a type annotation in it is prose or code.
const codeSpans = [...doc.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]);
const pathish = (span: string) => /^[\w.@/-]+$/.test(span);

const referencedPaths = [
  ...new Set(
    codeSpans
      .filter(pathish)
      .map((span) => span.replace(/^\/+/, ''))
      // `prismjs/components/prism-python` is a module specifier, not a repo path.
      .filter((span) => !declaredPackages.has(span.split('/')[0]))
      .filter((span) => span.includes('/') || /\.(ts|tsx|css|json|mjs|yml|html)$/.test(span)),
  ),
];

// §2 is where the stack is declared, so it is the section held to package.json.
const techStack = doc.slice(doc.indexOf('## 2. Tech Stack'), doc.indexOf('## 3. Content Model'));
const bareName = (span: string) => /^[a-z][a-z\d]*(-[a-z\d]+)*$/.test(span) && !span.includes('.');
const namedPackages = [
  ...new Set([...techStack.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]).filter(bareName)),
];

it('finds the claims it is meant to police — both extractions are non-empty', () => {
  // Without this the two guards below would pass vacuously if the regexes, the
  // section headings or the backtick convention ever changed.
  expect(referencedPaths).toContain('src/app/App.tsx');
  expect(referencedPaths.length).toBeGreaterThan(10);
  expect(namedPackages).toContain('idb-keyval');
});

it('names only files that exist', () => {
  const missing = referencedPaths.filter((path) => !existsSync(join(repoRoot, path)));
  expect(missing).toEqual([]);
});

it('names only dependencies package.json actually declares', () => {
  const undeclared = namedPackages.filter((name) => !declaredPackages.has(name));
  expect(undeclared).toEqual([]);
});
