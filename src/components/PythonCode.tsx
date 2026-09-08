// Python-only syntax highlighting (ENGINEERING.md §8) — Prism runtime with
// just the python grammar to keep the bundle lean. Shared by ExerciseView
// (model solution) and ModuleView (worked examples).
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import './code.css';

export default function PythonCode({ code, className }: { code: string; className?: string }) {
  const html = Prism.highlight(code, Prism.languages.python, 'python');
  return (
    <pre className={className ? `py-code ${className}` : 'py-code'}>
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
