// Content model — exactly per ENGINEERING.md §3.
// All curriculum is static typed data, bundled at build time.

export type Curriculum = { tiers: Tier[] };

export type Tier = {
  id: string;
  title: string;
  era: string; // era label authored in curriculum.json ("Wings era") — DESIGN.md §6/§7
  modules: Module[];
};

export type Module = {
  id: string; // "m5-lists"
  title: string; // "Lists — The Members"
  anchor: string; // one-line "what you'll build" hook; authored, shown on the Home map
  concept: ConceptDoc; // explainer markdown + worked examples
  exercises: Exercise[]; // formative, ordered
  exitExercise: Exercise; // summative, no hints
  photocard: Photocard;
};

export type ConceptDoc = {
  intro: string; // markdown
  examples: WorkedExample[]; // 8–10
};

export type WorkedExample = {
  code: string; // shown with syntax highlighting
  output: string; // exact terminal output
  why: string; // one-line explanation
};

export type Exercise = {
  id: string;
  title?: string; // short heading; authored in curriculum.json, shown by the prototype's Exercise screen
  prompt: string; // markdown task description
  expectedOutput: string; // exact, deterministic
  inputsToType?: string[]; // for input()-based exercises: the exact inputs
  hints: [string, string]; // Hint 1 (concept nudge), Hint 2 (pseudocode shape)
  solution: string; // model code
  approachChecklist: string[]; // shown WITH solution after match/reveal
  isExit?: boolean; // exit exercises: hints array empty, ladder disabled
};

export type Photocard = {
  id: string;
  title: string;
  art: string; // URL of the module's original SVG art, resolved by content/load
};
