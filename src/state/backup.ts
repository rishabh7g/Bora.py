// Backup file format — ENGINEERING.md §4 ("export/import as a JSON file …
// this is the backup story; losing browser storage must not lose weeks of
// progress"), §1 (no server: the file IS the backup), design/README.md
// (exact filename `bora-py-progress.json`).
//
// This module owns the FILE boundary only: turning the persisted Progress
// object into a downloadable document and reading an untrusted document back
// into a Progress object. Storage itself stays with state/progress.ts.
//
// Import is validating by contract: a file is either accepted whole, or
// rejected whole with a message a learner can act on. Nothing partial is ever
// written — a bad file must not corrupt weeks of progress.
import { initialExerciseState, type ExerciseState } from './effortGate';
import { emptyProgress, type ModuleProgress, type Progress } from './progress';

/** The one filename in the product (design/README.md "Persistence"). */
export const BACKUP_FILENAME = 'bora-py-progress.json';

/** The only version this build reads and writes (ENGINEERING.md §4). */
export const BACKUP_VERSION = 1;

export type ImportResult =
  | { ok: true; progress: Progress }
  | { ok: false; error: string };

/** The exported document is the stored Progress object verbatim — no wrapper,
 *  no metadata — so an export re-imports into the same shape it came from. */
export function serializeProgress(progress: Progress): string {
  return `${JSON.stringify(progress, null, 2)}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Rebuild one ExerciseState from untrusted data, keeping exactly the §4/§5
 *  fields — anything else in the file is dropped rather than stored. */
function readExerciseState(value: unknown): ExerciseState | null {
  if (!isRecord(value)) return null;
  const { attempts, hintsUnlocked, matched, solutionRevealed, stuck } = value;
  if (!isCount(attempts)) return null;
  if (hintsUnlocked !== 0 && hintsUnlocked !== 1 && hintsUnlocked !== 2) return null;
  if (typeof matched !== 'boolean' || typeof solutionRevealed !== 'boolean') return null;
  // `stuck` is this build's ladder bookkeeping (state/effortGate.ts); a file
  // without it still describes a valid gate position, so it defaults.
  if (stuck !== undefined && typeof stuck !== 'boolean') return null;
  return {
    ...initialExerciseState(),
    attempts,
    hintsUnlocked,
    matched,
    solutionRevealed,
    stuck: stuck === true,
  };
}

function readModuleProgress(value: unknown): ModuleProgress | null {
  if (!isRecord(value)) return null;
  const { exercises, passed, cardCracks } = value;
  if (!isRecord(exercises) || typeof passed !== 'boolean' || !isCount(cardCracks)) return null;
  const read: Record<string, ExerciseState> = {};
  for (const [exerciseId, state] of Object.entries(exercises)) {
    const exerciseState = readExerciseState(state);
    if (!exerciseState) return null;
    read[exerciseId] = exerciseState;
  }
  return { exercises: read, passed, cardCracks };
}

/** Read an exported file back. Returns the progress to store, or a plain
 *  reason it was not usable — stated as a fact, never as a scolding. */
export function parseBackup(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not JSON, so nothing was changed.' };
  }

  if (!isRecord(parsed) || !('version' in parsed) || !('modules' in parsed)) {
    return {
      ok: false,
      error: `That file is not a ${BACKUP_FILENAME} backup, so nothing was changed.`,
    };
  }

  if (parsed.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `That backup is version ${String(parsed.version)}; this app reads version ${BACKUP_VERSION}. Nothing was changed.`,
    };
  }

  if (!isRecord(parsed.modules)) {
    return { ok: false, error: 'That backup has no module list, so nothing was changed.' };
  }

  const modules: Record<string, ModuleProgress> = {};
  for (const [moduleId, moduleValue] of Object.entries(parsed.modules)) {
    const moduleProgress = readModuleProgress(moduleValue);
    if (!moduleProgress) {
      return {
        ok: false,
        error: `That backup has unreadable data for ${moduleId}, so nothing was changed.`,
      };
    }
    modules[moduleId] = moduleProgress;
  }

  return { ok: true, progress: { ...emptyProgress(), modules } };
}
