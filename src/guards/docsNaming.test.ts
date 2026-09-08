// docs/ is named to one scheme — `NN-lowercase-kebab.md`, numbered in creation
// order (claude-setup docs/repo-standards.md § "Naming that is uniform
// everywhere"). Before #136 this repo used `DESIGN.md`, `ENGINEERING.md`,
// `QA.md`, `SIMPLIFY.md` and a `qa/` subdirectory, and every one of those names
// was cited from CLAUDE.md, README.md, the other docs and ~40 source comments.
// The renaming was cheap; re-finding all the citations was not, so the shape is
// held mechanically rather than by habit.
//
// `screenshots/` is the one directory allowed: it holds captures, not prose.
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs');
const entries = readdirSync(docsDir, { withFileTypes: true });

const numberedProse = /^\d{2}-[a-z\d]+(-[a-z\d]+)*\.md$/;

it('finds the files it is meant to police', () => {
  // Without this the two guards below would pass vacuously on an empty read.
  expect(entries.filter((entry) => entry.isFile()).length).toBeGreaterThan(3);
});

it('names every doc `NN-lowercase-kebab.md`', () => {
  const offenders = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !numberedProse.test(name));
  expect(offenders).toEqual([]);
});

it('keeps prose flat — `screenshots/` is the only subdirectory', () => {
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  expect(directories).toEqual(['screenshots']);
});

it('numbers each doc once', () => {
  const numbers = entries.filter((entry) => entry.isFile()).map((entry) => entry.name.slice(0, 2));
  expect(numbers).toEqual([...new Set(numbers)]);
});
