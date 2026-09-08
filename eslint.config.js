import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier/flat';

export default tseslint.config(
  {
    // dist/ is build output. design/ is the read-only handoff bundle, kept exactly as
    // delivered (README.md § Naming), so it is not ours to fix. `.claude/` is the harness's
    // scratch state; its worktrees hold whole checkouts of this repo, which would otherwise
    // be linted alongside the real source.
    ignores: ['dist', 'design', 'coverage', '.claude'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    // content/lint.ts and tools/ hold the build-time CLIs the npm scripts run, and
    // vite.config.ts is the build config; they run in Node, not the browser.
    files: ['content/**/*.ts', 'tools/**/*.ts', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // scripts/ holds the .mjs harnesses (icon generation, contrast audit, headless probes).
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended, prettier],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
    },
  },
);
