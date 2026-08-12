// The learner's OS choice on the setup guide — the one persisted UI preference.
//
// Deliberately NOT part of Progress (state/progress.ts): it is not a
// checkpoint, it must never travel in the progress backup file, and it has to
// be readable synchronously on first paint so the stepper does not flash the
// wrong OS. localStorage, not IndexedDB, for exactly that reason.
//
// Every access is guarded: the app also renders on the server in tests, and a
// locked-down browser can throw on localStorage access.
import type { SetupOs } from '../content/setup';

export const SETUP_OS_KEY = 'bora-py-setup-os';

export const DEFAULT_SETUP_OS: SetupOs = 'windows';

/** Anything unrecognised (absent, corrupt, older value) falls back to the
 *  default rather than throwing — a preference is never worth a broken screen. */
export function parseSetupOs(stored: string | null): SetupOs {
  return stored === 'windows' || stored === 'mac' ? stored : DEFAULT_SETUP_OS;
}

export function loadSetupOs(): SetupOs {
  if (typeof localStorage === 'undefined') return DEFAULT_SETUP_OS;
  try {
    return parseSetupOs(localStorage.getItem(SETUP_OS_KEY));
  } catch {
    return DEFAULT_SETUP_OS;
  }
}

export function saveSetupOs(os: SetupOs): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SETUP_OS_KEY, os);
  } catch {
    // A full or blocked store must never break the picker — the choice simply
    // does not survive this session.
  }
}
