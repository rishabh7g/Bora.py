// React binding for Progress: load once on mount, write-through on every change.
import { useCallback, useEffect, useState } from 'react';
import type { ExerciseState } from './effortGate';
import { loadProgress, resetModule, saveProgress, updateExerciseState, type Progress } from './progress';

export type ApplyTransition = (
  moduleId: string,
  exerciseId: string,
  isExit: boolean,
  transition: (state: ExerciseState) => ExerciseState,
) => void;

/** How long the stored-progress read may run before the app admits to the
 *  learner that something is wrong (src/ProgressLoading.tsx).
 *
 *  It is a report, NOT a cancellation: the read is still awaited afterwards.
 *  Substituting empty progress on timeout would let the next write-through
 *  overwrite weeks of real progress, which is exactly what ENGINEERING.md §4
 *  forbids — losing browser storage must not lose progress. */
export const PROGRESS_LOAD_TIMEOUT_MS = 5000;

export type UseProgress = {
  progress: Progress | null;
  /** The load has not settled within PROGRESS_LOAD_TIMEOUT_MS. Storage is
   *  stalled (a blocked upgrade, a corrupt store) rather than simply absent —
   *  an absent or throwing IndexedDB resolves to empty progress instead. */
  storageStalled: boolean;
  apply: ApplyTransition;
  /** Replace the whole stored state — the import half of the backup story
   *  (ENGINEERING.md §4). The caller validates the file first
   *  (state/backup.parseBackup); this only writes. */
  replaceAll: (next: Progress) => void;
  /** Forget one module (Settings' per-module reset), written through like
   *  every other change. */
  resetModule: (moduleId: string) => void;
};

export function useProgress(): UseProgress {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [storageStalled, setStorageStalled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stallTimer = setTimeout(() => {
      if (!cancelled) setStorageStalled(true);
    }, PROGRESS_LOAD_TIMEOUT_MS);
    void loadProgress().then((loaded) => {
      if (cancelled) return;
      clearTimeout(stallTimer);
      // A late read still wins: the app leaves the stalled screen for the real
      // progress rather than stranding the learner on it.
      setStorageStalled(false);
      setProgress(loaded);
    });
    return () => {
      cancelled = true;
      clearTimeout(stallTimer);
    };
  }, []);

  const apply = useCallback<ApplyTransition>((moduleId, exerciseId, isExit, transition) => {
    setProgress((previous) => {
      if (!previous) return previous; // not loaded yet — ignore, avoids clobbering stored state
      const next = updateExerciseState(previous, moduleId, exerciseId, isExit, transition);
      if (next !== previous) void saveProgress(next); // write-through on every change
      return next;
    });
  }, []);

  const replaceAll = useCallback((next: Progress) => {
    setProgress(next);
    void saveProgress(next); // write-through, same as every other change
  }, []);

  const forgetModule = useCallback((moduleId: string) => {
    setProgress((previous) => {
      if (!previous) return previous; // not loaded yet — never clobber stored state
      const next = resetModule(previous, moduleId);
      if (next !== previous) void saveProgress(next);
      return next;
    });
  }, []);

  return { progress, storageStalled, apply, replaceAll, resetModule: forgetModule };
}
