import type { Exercise, Module } from './content/types';

// Raw/unstyled render of a module — this slice proves the content model
// end-to-end (ENGINEERING.md §11 step 1). Styling arrives in M2.

function ExerciseBlock({ exercise, href }: { exercise: Exercise; href: string }) {
  return (
    <section>
      <h4>
        <a href={href}>{exercise.isExit ? 'Exit exercise' : `Exercise ${exercise.id}`}</a>
      </h4>
      <p>{exercise.prompt}</p>
      <h5>Expected output</h5>
      <pre>
        <code>{exercise.expectedOutput}</code>
      </pre>
      {exercise.inputsToType && (
        <>
          <h5>Inputs to type</h5>
          <ol>
            {exercise.inputsToType.map((input, i) => (
              <li key={i}>
                <code>{input}</code>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

export default function ModuleView({ module }: { module: Module }) {
  return (
    <article>
      <h2>{module.title}</h2>

      <section>
        <h3>Concept</h3>
        <p>{module.concept.intro}</p>
      </section>

      <section>
        <h3>Worked examples</h3>
        {module.concept.examples.map((example, i) => (
          <section key={i}>
            <h4>Example {i + 1}</h4>
            <pre>
              <code>{example.code}</code>
            </pre>
            <h5>Output</h5>
            <pre>
              <code>{example.output}</code>
            </pre>
            <p>{example.why}</p>
          </section>
        ))}
      </section>

      <section>
        <h3>Exercises</h3>
        {module.exercises.map((exercise) => (
          <ExerciseBlock
            key={exercise.id}
            exercise={exercise}
            href={`#/module/${module.id}/exercise/${exercise.id}`}
          />
        ))}
      </section>

      <ExerciseBlock exercise={module.exitExercise} href={`#/module/${module.id}/exit`} />
    </article>
  );
}
