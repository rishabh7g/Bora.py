// The expected-output block — the ONE owner of how an exact terminal output is
// presented (ENGINEERING.md §7; design/README.md: copy-safe monospace,
// deliberately NO copy button, because validation is trust-based).
//
// Shared by ExerciseView and SetupGuide so the exit checkpoint looks and behaves
// identically wherever it is shown; styles stay in exercise.css.
import './exercise.css';

export type ExpectedOutputProps = {
  output: string;
  /** Aside next to the label — the caller's framing of the same block. */
  sub?: string;
};

export default function ExpectedOutput({
  output,
  sub = 'your terminal should print this',
}: ExpectedOutputProps) {
  return (
    <div className="ex-expected">
      <div className="ex-expected-head">
        <span className="ex-expected-label">EXPECTED OUTPUT</span>
        <span className="ex-expected-sub">{sub}</span>
      </div>
      <pre>{output}</pre>
    </div>
  );
}
