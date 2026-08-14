// The boundary must turn a render-time throw into a designed Notice, never a
// blank #root (#96).
//
// React's legacy synchronous renderToString (this repo's jsdom-free pattern,
// src/ProgressLoading.test.tsx) does NOT run the error-boundary recovery path —
// only the browser's real renderer and the streaming SSR renderer do; a throw
// inside renderToString propagates straight to the caller, confirmed against a
// minimal boundary before writing this file. So the two halves are pinned
// separately, which between them cover exactly what the boundary does: (1)
// getDerivedStateFromError is the static, pure function React actually calls
// when a descendant throws — asserted directly, and (2) render() with that
// state set is what a real browser paints — asserted through renderToString,
// which resolves CSS-free markup the same way every other component test in
// this repo does.
import type { ReactElement } from 'react';
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ErrorBoundary from './ErrorBoundary';

it('getDerivedStateFromError captures the throw as state, rather than rethrowing', () => {
  const error = new DOMException('blocked', 'InvalidStateError');
  expect(ErrorBoundary.getDerivedStateFromError(error)).toEqual({ error });
});

it('renders children untouched when nothing has failed', () => {
  const html = renderToString(
    <ErrorBoundary>
      <p>all fine</p>
    </ErrorBoundary>,
  );
  expect(html).toContain('all fine');
  expect(html).not.toContain('role="alert"');
});

it('once state.error is set, renders a role="alert" Notice naming the failure', () => {
  const boundary = new ErrorBoundary({ children: null });
  boundary.state = { error: new DOMException('blocked', 'InvalidStateError') };
  const html = renderToString(boundary.render() as ReactElement);
  expect(html).toContain('role="alert"');
  expect(html).toContain('Something went wrong');
  expect(html).toContain('InvalidStateError: blocked');
  expect(html).toContain('Reload');
  const text = html.replace(/<[^>]+>/g, '').trim();
  expect(text.length).toBeGreaterThan(10);
});

it('names an unknown, non-Error throw plainly rather than dropping it', () => {
  const boundary = new ErrorBoundary({ children: null });
  boundary.state = { error: { name: 'CurriculumError', message: 'bad module id' } };
  const html = renderToString(boundary.render() as ReactElement);
  expect(html).toContain('CurriculumError: bad module id');
});
