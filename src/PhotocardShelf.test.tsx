// PhotocardShelf render contract — the prototype's shelf: one card per module,
// unearned cards as placeholders, earned cards in full with one crack per hint
// used (ENGINEERING.md §4/§7, DESIGN.md §4). Cracks are a visible cost only:
// they never change what is reachable.
import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import PhotocardShelf, { crackNote, MAX_DRAWN_CRACKS } from './PhotocardShelf';
import { flatModules, loadCurriculum } from './content/load';
import { declareAttempt, declareMatch, viewHint } from './state/effortGate';
import { emptyProgress, updateExerciseState, type Progress } from './state/progress';

const curriculum = loadCurriculum();
const modules = flatModules(curriculum);

function render(progress: Progress = emptyProgress()) {
  return renderToString(<PhotocardShelf curriculum={curriculum} progress={progress} />);
}

/** Pass a module the real way: its exit exercise gets matched. */
function passModule(progress: Progress, moduleId: string): Progress {
  const module = modules.find((candidate) => candidate.id === moduleId)!;
  return updateExerciseState(progress, moduleId, module.exitExercise.id, true, declareMatch);
}

/** Use `count` hints in a module, spread over its formative exercises the way
 *  the ladder allows (two per exercise). */
function useHints(progress: Progress, moduleId: string, count: number): Progress {
  const module = modules.find((candidate) => candidate.id === moduleId)!;
  let next = progress;
  let remaining = count;
  for (const exercise of module.exercises) {
    for (const rung of [1, 2] as const) {
      if (remaining === 0) break;
      next = updateExerciseState(next, moduleId, exercise.id, false, (state) =>
        declareAttempt(state, false),
      );
      next = updateExerciseState(next, moduleId, exercise.id, false, (state) =>
        viewHint(state, rung, false),
      );
      remaining -= 1;
    }
  }
  expect(remaining).toBe(0);
  return next;
}

function cracksIn(html: string): number {
  return html.match(/shelf-crack shelf-crack--/g)?.length ?? 0;
}

it('renders one card per module with its photocard title', () => {
  const html = render();
  expect(modules).toHaveLength(13);
  for (const module of modules) {
    expect(html).toContain(module.photocard.title);
  }
});

it('shows unearned cards as locked placeholders and earned cards in full', () => {
  const html = render(passModule(emptyProgress(), 'm1'));
  expect(html).toContain('shelf-card--earned');
  expect(html).toContain('shelf-card--locked');
  // Earned: the module title is revealed on the card face and the card links
  // back to its module. Unearned: a placeholder caption, no link.
  expect(html).toContain('href="#/module/m1"');
  expect(html).toContain('Pass the checkpoint to earn it');
  expect(html.match(/shelf-card--earned/g)).toHaveLength(1);
  expect(html.match(/shelf-card--locked/g)).toHaveLength(modules.length - 1);
});

it('counts the collection in the headline, never a streak or a percentage', () => {
  expect(render()).toContain('Empty shelf. For now.');
  const html = render(passModule(emptyProgress(), 'm1'));
  expect(html).toContain('1 of 13 collected.');
  for (const banned of ['streak', 'XP', 'day', '%', 'points']) {
    expect(html.toLowerCase()).not.toContain(banned.toLowerCase());
  }
});

it('draws one crack per hint used in that module, and none on other cards', () => {
  let progress = passModule(emptyProgress(), 'm1');
  progress = useHints(progress, 'm1', 3);
  expect(progress.modules.m1.cardCracks).toBe(3);
  expect(cracksIn(render(progress))).toBe(3);

  // Hints used in a module whose card is not earned yet draw nothing.
  const other = useHints(progress, 'm2', 2);
  expect(cracksIn(render(other))).toBe(3);
});

it('caps drawn cracks at the four corners while the caption stays exact', () => {
  let progress = passModule(emptyProgress(), 'm1');
  progress = useHints(progress, 'm1', 6);
  const html = render(progress);
  expect(cracksIn(html)).toBe(MAX_DRAWN_CRACKS);
  expect(html).toContain('6 cracks');
});

it('captions a card by its cracks without scolding', () => {
  expect(crackNote(0)).toBe('Mint — no hints used');
  expect(crackNote(1)).toBe('1 crack');
  expect(crackNote(5)).toBe('5 cracks');
});

it('never lets cracks change what is reachable', () => {
  const clean = passModule(emptyProgress(), 'm1');
  const cracked = useHints(clean, 'm1', 4);
  const strip = (html: string) => html.replace(/<span class="shelf-crack[^>]*><\/span>/g, '');
  // Same cards, same links, same earned states — only the crack marks differ.
  expect(strip(render(cracked)).replace(/4 cracks/, 'Mint — no hints used')).toBe(
    strip(render(clean)),
  );
});

it('gives every card original local SVG art', () => {
  for (const module of modules) {
    expect(module.photocard.art).toMatch(/\.svg$/);
    expect(module.photocard.art).not.toMatch(/^https?:/);
  }
  const html = render(passModule(emptyProgress(), 'm1'));
  expect(html).toContain('shelf-art');
  expect(html).toContain('card-m1.svg');
});
