// The app's one failure surface (UI baseline §10, ENGINEERING.md §7): a
// designed panel that names what went wrong, instead of a blank #root and a
// console line the learner never sees. Every subsystem raises this same
// component — the ErrorBoundary (src/ErrorBoundary.tsx), the stalled
// progress-store screen (src/ProgressLoading.tsx) and the import-file error
// (src/Settings.tsx) — never a bespoke panel per screen.
import type { ReactNode } from 'react';
import './notice.css';

export type NoticeAction = { label: string; onClick: () => void };

export type NoticeProps = {
  title: string;
  body: ReactNode;
  /** The browser's own words for the failure, e.g. `DOMException: blocked` —
   *  something concrete the learner can hand to a search box. */
  detail?: string;
  action?: NoticeAction;
  /** A raised notice IS the screen when nothing else has loaded, so its title
   *  is that screen's h1 (the default). Settings raises one INSIDE a screen
   *  that already has an h1 (.set-title, above the export/import flow the
   *  notice interrupts) — it passes "h2" so the screen keeps exactly one h1. */
  level?: 'h1' | 'h2';
};

export default function Notice({ title, body, detail, action, level = 'h1' }: NoticeProps) {
  const Heading = level;
  return (
    <section className="app-notice" role="alert">
      <Heading className="app-notice-title">{title}</Heading>
      <p className="app-notice-body">{body}</p>
      {detail && <p className="app-notice-detail">{detail}</p>}
      {action && (
        <button
          type="button"
          className="btn btn-secondary app-notice-action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </section>
  );
}
