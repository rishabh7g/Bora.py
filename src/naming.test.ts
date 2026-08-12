// Naming contract (design/brand/BRAND.md; README "Naming"): the product is
// bora.py, so the working title the design package was delivered under must not
// survive anywhere in shipped code, content or metadata.
//
// The one allowed survivor is a citation of the handoff prototype's real
// filename — `design/PyLearn Prototype.dc.html` is kept exactly as delivered,
// so comments that point at it must keep the path that actually resolves.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// These two files name the working title on purpose — they are the guards.
const guardFiles = ['src/naming.test.ts', 'src/pwa/manifest.test.ts'];
const prototypeFilename = 'PyLearn Prototype.dc.html';

function filesUnder(dir: string): string[] {
  return readdirSync(join(repoRoot, dir)).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(join(repoRoot, path)).isDirectory() ? filesUnder(path) : [path];
  });
}

const scanned = [
  ...filesUnder('src'),
  ...filesUnder('content'),
  'index.html',
  'package.json',
].filter((path) => !guardFiles.includes(path.split('\\').join('/')));

it('scans the whole app surface, not a stale hand-listed set', () => {
  // Sanity check on the walker: if src/ ever stops being found, the guard below
  // would pass vacuously.
  expect(scanned).toContain('index.html');
  expect(scanned).toContain('package.json');
  expect(scanned.filter((path) => path.startsWith('src'))).not.toHaveLength(0);
  expect(scanned.filter((path) => path.startsWith('content'))).not.toHaveLength(0);
});

it('never ships the working title — only citations of the prototype filename', () => {
  const offenders: string[] = [];
  for (const path of scanned) {
    const lines = readFileSync(join(repoRoot, path), 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (!/pylearn/i.test(line)) return;
      if (line.includes(prototypeFilename)) return; // path citation, allowed
      offenders.push(`${relative('.', path)}:${index + 1}: ${line.trim()}`);
    });
  }
  expect(offenders).toEqual([]);
});

it('sets the product name as bora.py in the app shell and package metadata', () => {
  const html = readFileSync(join(repoRoot, 'index.html'), 'utf8');
  expect(html).toContain('<title>bora.py</title>');
  expect(html).toContain('content="bora.py"'); // apple-mobile-web-app-title
  expect(JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).name).toBe('bora.py');
});
