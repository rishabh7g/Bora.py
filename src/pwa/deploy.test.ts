// Deploy contract (ENGINEERING.md §10): GitHub Pages serves the app from the
// repo subpath, so the build base and the publish workflow have to agree. These
// checks are cheap insurance against the two failures that only show up live —
// a root-relative build (blank page, 404 assets) and a workflow that cannot
// mint a Pages deployment (missing permissions).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path: string) => readFileSync(join(repoRoot, path), 'utf8');

const viteConfig = read('vite.config.ts');
const workflow = read('.github/workflows/deploy.yml');

it('builds for the /Bora.py/ subpath GitHub Pages serves', () => {
  expect(viteConfig).toMatch(/base:\s*'\/Bora\.py\/'/);
});

it('deploys only from main, and only after typecheck, content lint and build', () => {
  expect(workflow).toMatch(/branches:\s*\[main\]/);
  for (const step of ['npm run typecheck', 'npm run lint:content', 'npm run build']) {
    expect(workflow).toContain(step);
  }
});

it('publishes dist as-is through the official Pages actions, with a queued group', () => {
  expect(workflow).toContain('actions/configure-pages');
  expect(workflow).toMatch(/actions\/upload-pages-artifact[\s\S]*path:\s*dist/);
  expect(workflow).toContain('actions/deploy-pages');
  expect(workflow).toMatch(/concurrency:\s*\n\s*group:\s*pages/);
});

it('grants the token the Pages write and OIDC permissions deploy-pages needs', () => {
  expect(workflow).toMatch(/pages:\s*write/);
  expect(workflow).toMatch(/id-token:\s*write/);
});

it('stays pure static — the workflow provisions no server or backend', () => {
  expect(workflow).not.toMatch(/\b(ssh|scp|rsync|docker|terraform)\b/i);
});
