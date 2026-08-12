// "Show whitespace" on the expected-output block — a view preference, not a
// checkpoint (ENGINEERING.md §7, §12 "output-match false negatives").
//
// Deliberately NOT part of Progress (state/progress.ts), for the same reasons as
// the OS choice in setupOs.ts: it must never travel in the progress backup file,
// and it has to be readable synchronously on first paint so a learner who turned
// it on does not watch it flick off on the next exercise.
//
// Every access is guarded: the app also renders on the server in tests, and a
// locked-down browser can throw on localStorage access.
export const WHITESPACE_VISIBLE_KEY = 'bora-py-whitespace-visible';

/** Off by default — the block reads as a terminal until she asks for markers. */
export const DEFAULT_WHITESPACE_VISIBLE = false;

/** Only the exact stored "on" turns it on; absent, corrupt, or older values fall
 *  back to the default rather than throwing — a preference is never worth a
 *  broken screen. */
export function parseWhitespaceVisible(stored: string | null): boolean {
  return stored === 'on' ? true : stored === 'off' ? false : DEFAULT_WHITESPACE_VISIBLE;
}

export function loadWhitespaceVisible(): boolean {
  if (typeof localStorage === 'undefined') return DEFAULT_WHITESPACE_VISIBLE;
  try {
    return parseWhitespaceVisible(localStorage.getItem(WHITESPACE_VISIBLE_KEY));
  } catch {
    return DEFAULT_WHITESPACE_VISIBLE;
  }
}

export function saveWhitespaceVisible(visible: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(WHITESPACE_VISIBLE_KEY, visible ? 'on' : 'off');
  } catch {
    // A full or blocked store must never break the toggle — the choice simply
    // does not survive this session.
  }
}
