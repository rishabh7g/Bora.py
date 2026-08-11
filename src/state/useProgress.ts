// React binding for Progress: load once on mount, write-through on every change.
import { useCallback, useEffect, useState } from 'react';
import type { ExerciseState } from './effortGate';
import { loadProgress, saveProgress, updateExerciseState, type Progress } from './progress';

export type ApplyTransition = (
  moduleId: string,
  exerciseId: string,
  isExit: boolean,
  transition: (state: ExerciseState) => ExerciseState,
) => void;

export function useProgress(): { progress: Progress | null; apply: ApplyTransition } {
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

  return { progress, apply };
}
