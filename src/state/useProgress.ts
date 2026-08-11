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

export type UseProgress = {
  progress: Progress | null;
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

  useEffect(() => {
    let cancelled = false;
    void loadProgress().then((loaded) => {
      if (!cancelled) setProgress(loaded);
    });
    return () => {
      cancelled = true;
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

  return { progress, apply, replaceAll, resetModule: forgetModule };
}
