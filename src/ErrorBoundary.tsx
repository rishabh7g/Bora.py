// The boundary above everything (UI baseline §10): wraps <App/> in main.tsx
// so a throw during render — anywhere in the tree — lands on a designed
// Notice instead of an empty #root and a console line the learner never
// sees. `getDerivedStateFromError` (not `componentDidCatch`) is what decides
// the fallback: it runs in the render phase, so it also catches during
// server rendering (renderToString), which this repo's own test suite uses
// throughout (see src/ProgressLoading.test.tsx for the pattern). No
// analytics, no error tracking (ENGINEERING.md §10) — there is nothing to
// send `componentDidCatch` for.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { describeError } from './describeError';
import Notice from './Notice';

type ErrorBoundaryState = { error: unknown } | { error: null };

export default class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  // Present for engines/tools that expect it; deliberately a no-op body —
  // there is no analytics or error-tracking sink in this app to report to
  // (ENGINEERING.md §10), and getDerivedStateFromError already renders the
  // fallback.
  componentDidCatch(_error: unknown, _info: ErrorInfo): void {}

  render() {
    if (this.state.error !== null) {
      const detail = describeError(this.state.error);
      return (
        <Notice
          title="Something went wrong."
          body="This copy of the app hit a problem it could not recover from. Your saved progress is untouched — reloading is safe."
          detail={detail ?? undefined}
          action={{ label: 'Reload', onClick: () => window.location.reload() }}
        />
      );
    }
    return this.props.children;
  }
}
