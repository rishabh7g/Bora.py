// Content lint — enforces the ENGINEERING.md §3 authoring rules against
// content/curriculum.json. Runs standalone (`npm run lint:content`) and in CI.
//
// Rules (ENGINEERING.md §3, DESIGN.md §3.4 + §4):
// 1. `expectedOutput` present and deterministic — no `random`, `datetime`,
//    or `time.` in solutions.
// 2. Any exercise whose solution uses `input()` defines `inputsToType`.
// 3. Exit exercises (`isExit: true`) have zero hints.
// 4. Formative exercises have exactly 2 hints.
// 5. No copyrighted song-lyric lines anywhere in content (member names,
//    song/album titles, and years are facts and fine); photocard art must be
//    an original local svg ref, never official imagery.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Raw shape of content/curriculum.json (same as src/content/load.ts).
type RawExercise = {
  id: string;
  title?: string;
  prompt: string;
  expectedOutput: string;
  inputsToType?: string[];
  hints: string[];
  solution: string;
  approachChecklist: string[];
  isExit?: boolean;
};

type RawModule = {
  id: string;
  title: string;
  photocard: { id: string; title: string; art?: string };
  concept: { intro: string; examples: { code: string; output: string; why: string }[] };
  exercises: RawExercise[];
  exitExercise: RawExercise;
};

export type RawCurriculum = {
  tiers: { id: string; title: string; modules: string[] }[];
  modules: Record<string, RawModule>;
};

export type Violation = { moduleId: string; exerciseId?: string; message: string };

// Substrings in a solution that make its output non-deterministic.
const NONDETERMINISTIC_MARKERS = ['random', 'datetime', 'time.'];

// Distinctive copyrighted BTS lyric fragments (lowercase). Titles, member
// names, and years are facts and allowed — these are actual sung lines.
// Extend this list whenever new content is authored.
const LYRIC_BLOCKLIST = [
  'smooth like butter', // Butter
  'side step, right, left', // Butter
  "shining through the city with a little funk and soul", // Dynamite
  "i'm in the stars tonight", // Dynamite
  "you can't stop me lovin' myself", // IDOL
  "i'm the one i should love", // Epiphany
  'like an echo in the forest', // Life Goes On
  'bogo sipda', // Spring Day
];

function lyricViolations(text: string): string[] {
  const lower = text.toLowerCase();
  return LYRIC_BLOCKLIST.filter((line) => lower.includes(line));
}

function lintExercise(moduleId: string, exercise: RawExercise): Violation[] {
  const violations: Violation[] = [];
  const at = { moduleId, exerciseId: exercise.id };

  // Rule 1: expectedOutput present and deterministic.
  if (!exercise.expectedOutput || exercise.expectedOutput.trim() === '') {
    violations.push({ ...at, message: 'expectedOutput is missing or empty' });
  }
  for (const marker of NONDETERMINISTIC_MARKERS) {
    if (exercise.solution.includes(marker)) {
      violations.push({
        ...at,
        message: `solution uses "${marker}" — expectedOutput cannot be deterministic`,
      });
    }
  }

  // Rule 2: input() exercises define inputsToType.
  if (exercise.solution.includes('input(')) {
    if (!exercise.inputsToType || exercise.inputsToType.length === 0) {
      violations.push({ ...at, message: 'solution uses input() but inputsToType is missing' });
    }
  }

  // Rules 3 + 4: hint counts.
  if (exercise.isExit) {
    if (exercise.hints.length !== 0) {
      violations.push({
        ...at,
        message: `exit exercise must have zero hints (has ${exercise.hints.length})`,
      });
    }
  } else if (exercise.hints.length !== 2) {
    violations.push({
      ...at,
      message: `formative exercise must have exactly 2 hints (has ${exercise.hints.length})`,
    });
  }

  // Rule 5: no lyric lines in any exercise text.
  const texts = [
    exercise.prompt,
    exercise.expectedOutput,
    exercise.solution,
    ...exercise.hints,
    ...exercise.approachChecklist,
  ];
  for (const lyric of lyricViolations(texts.join('\n'))) {
    violations.push({ ...at, message: `contains copyrighted lyric line: "${lyric}"` });
  }

  return violations;
}

/** `artExists` lets the CLI check the art file is really on disk; callers that
 *  only lint data (unit tests) may omit it. */
export function lintCurriculum(
  curriculum: RawCurriculum,
  artExists?: (fileName: string) => boolean,
): Violation[] {
  const violations: Violation[] = [];

  for (const [moduleId, module] of Object.entries(curriculum.modules)) {
    for (const exercise of [...module.exercises, module.exitExercise]) {
      violations.push(...lintExercise(moduleId, exercise));
    }

    // Rule 5 on module-level text (concept doc, titles, photocard).
    const moduleText = [
      module.title,
      module.concept.intro,
      ...module.concept.examples.flatMap((example) => [example.code, example.output, example.why]),
      module.photocard.title,
    ].join('\n');
    for (const lyric of lyricViolations(moduleText)) {
      violations.push({ moduleId, message: `contains copyrighted lyric line: "${lyric}"` });
    }

    // Rule 5: photocard art must be an original local svg — never official
    // imagery, and never missing: every card ships art authored in this repo.
    const art = module.photocard.art ?? '';
    if (!/^[\w-]+\.svg$/.test(art)) {
      violations.push({
        moduleId,
        message: `photocard art must be an original local svg file name, got "${art}"`,
      });
    } else if (artExists && !artExists(art)) {
      violations.push({ moduleId, message: `photocard art file is missing: "${art}"` });
    }
  }

  return violations;
}

function main(): void {
  const contentDir = dirname(fileURLToPath(import.meta.url));
  const curriculum = JSON.parse(
    readFileSync(join(contentDir, 'curriculum.json'), 'utf8'),
  ) as RawCurriculum;
  const artDir = join(contentDir, '..', 'src', 'art', 'photocards');
  const violations = lintCurriculum(curriculum, (fileName) =>
    existsSync(join(artDir, fileName)),
  );

  for (const violation of violations) {
    const where = violation.exerciseId
      ? `${violation.moduleId}/${violation.exerciseId}`
      : violation.moduleId;
    console.error(`[${where}] ${violation.message}`);
  }

  if (violations.length > 0) {
    console.error(`content lint: ${violations.length} violation(s)`);
    process.exit(1);
  }
  console.log('content lint: ok');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
