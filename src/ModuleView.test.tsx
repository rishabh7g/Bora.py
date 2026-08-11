import { expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import ModuleView from './ModuleView';
import { findModule, loadCurriculum } from './content/load';

it('renders Module 1 raw: title, intro, examples, exercises, exit exercise', () => {
  const m1 = findModule(loadCurriculum(), 'm1');
  expect(m1).toBeDefined();
  const html = renderToString(<ModuleView module={m1!} />);

  expect(html).toContain('Variables + print'); // title
  expect(html).toContain('A variable is a named box'); // concept intro
  expect(html).toContain('My bias is V'); // worked example output
  for (const exercise of m1!.exercises) {
    expect(html).toContain(exercise.expectedOutput);
  }
  expect(html).toContain('Exit exercise');
  expect(html).toContain('RM has been my bias since 2018'); // exit expected output
});
