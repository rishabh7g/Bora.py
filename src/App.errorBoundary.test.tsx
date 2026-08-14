// Integration: a curriculum that will not load must be catchable by the
// ErrorBoundary main.tsx wraps <App/> in (#96) — which requires the throw to
// happen during App's own render, not at module scope, the way it used to.
//
// React's legacy synchronous renderToString does not run the error-boundary
// recovery path (see the note in src/ErrorBoundary.test.tsx), so a full
// render-and-recover pass isn't reachable in this repo's jsdom-free suite.
// What IS reachable, and what this test pins, is the fact the previous
// module-scope version could never guarantee: the throw happens inside App's
// render (proven by renderToString(<App/>) surfacing the very CurriculumError
// mocked below, synchronously, mid-render — not at import time). Paired with
// src/ErrorBoundary.test.tsx's proof that the boundary renders a Notice for
// any such error, the two together are the same contract a real browser
// render would exercise end-to-end.
import { expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

vi.mock('./content/load', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./content/load')>();
  return {
    ...actual,
    loadCurriculum: () => {
      throw new actual.CurriculumError({
        url: 'content/curriculum.json',
        reason: 'Tier "t9" references unknown module "ghost-module"',
      });
    },
  };
});

const { CurriculumError } = await import('./content/load');
const { default: App } = await import('./App');

it('throws the typed CurriculumError during render, not at import time', () => {
  // The throw happens in App's first hook (useMemo(loadCurriculum)), before
  // any `window` access, so this runs under the ordinary node test
  // environment like every other renderToString test in this repo.
  expect(() => renderToString(<App />)).toThrow(CurriculumError);
  try {
    renderToString(<App />);
  } catch (error) {
    expect(error).toBeInstanceOf(CurriculumError);
    expect((error as InstanceType<typeof CurriculumError>).reason).toContain('ghost-module');
  }
});
