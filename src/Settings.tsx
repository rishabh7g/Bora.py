// Settings — export / import the progress file and reset a single module
// (ENGINEERING.md §7 `Settings`, §4 persistence, §11 step 5; design/README.md
// "Persistence": the file is `bora-py-progress.json`).
//
// There is no server and no account (ENGINEERING.md §1), so the exported file
// IS the backup: it is written by the browser and read back by the browser,
// offline, with no network in the path.
//
// Nothing here decides rules: the file format lives in state/backup.ts, the
// stored shape and the reset live in state/progress.ts, and what counts as a
// passed checkpoint is read from the §6 owner state/gating.ts.
//
// Tone (DESIGN.md §2: no guilt mechanics): reset is a safety net, so it is
// described plainly — what it clears, what it leaves — and never dramatised.
import { useState } from 'react';
import { flatModules, moduleNumberOf } from './content/load';
import type { Curriculum } from './content/types';
import { HOME_ROUTE } from './HomeMap';
import { BACKUP_FILENAME, parseBackup, serializeProgress } from './state/backup';
import { moduleStateOf } from './state/gating';
import { hasModuleProgress, type Progress } from './state/progress';
import './settings.css';

/** Download the progress file from memory — a Blob and an anchor click, so it
 *  works with the app offline and never touches a server. */
export function downloadBackup(progress: Progress): void {
  const blob = new Blob([serializeProgress(progress)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = BACKUP_FILENAME;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** One line of plain fact about a backup, shown before it is imported so the
 *  confirm is an informed one. */
export function backupSummary(curriculum: Curriculum, progress: Progress): string {
  const modules = flatModules(curriculum);
  const passed = modules.filter(
    (module) => moduleStateOf(curriculum, module.id, progress) === 'passed',
  ).length;
  const started = modules.filter((module) => hasModuleProgress(progress, module.id)).length;
  const checkpoints = `${passed} of ${modules.length} checkpoints passed`;
  return started === 1
    ? `${checkpoints}, 1 module with saved work.`
    : `${checkpoints}, ${started} modules with saved work.`;
}

export type SettingsProps = {
  curriculum: Curriculum;
  progress: Progress;
  onImport: (progress: Progress) => void;
  onResetModule: (moduleId: string) => void;
};

export default function Settings({
  curriculum,
  progress,
  onImport,
  onResetModule,
}: SettingsProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A read, validated file waiting for the explicit confirm — the import is
  // only written once this is accepted.
  const [pending, setPending] = useState<{ progress: Progress; fileName: string } | null>(null);
  const [confirmingResetOf, setConfirmingResetOf] = useState<string | null>(null);

  const modules = flatModules(curriculum);
  const started = modules.filter((module) => hasModuleProgress(progress, module.id));

  function clearMessages() {
    setNotice(null);
    setError(null);
  }

  function onExport() {
    clearMessages();
    downloadBackup(progress);
    setNotice(`Saved ${BACKUP_FILENAME}.`);
  }

  async function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Choosing the same file twice should read it twice, so the input is
    // cleared rather than left holding the last selection.
    event.target.value = '';
    if (!file) return;
    clearMessages();
    setPending(null);
    const result = parseBackup(await file.text());
    if (!result.ok) {
      setError(result.error); // nothing stored — the file never reached progress
      return;
    }
    setPending({ progress: result.progress, fileName: file.name });
  }

  function onConfirmImport() {
    if (!pending) return;
    onImport(pending.progress);
    setPending(null);
    setNotice('Progress replaced from the backup.');
  }

  function onConfirmReset(moduleId: string) {
    clearMessages();
    onResetModule(moduleId);
    setConfirmingResetOf(null);
    setNotice(`Module ${moduleNumberOf(curriculum, moduleId)} reset.`);
  }

  return (
    <div className="set-screen">
      <a className="btn btn-ghost set-back" href={HOME_ROUTE}>
        ← Map
      </a>
      <p className="set-kicker">Settings</p>
      <h1 className="set-title">Your progress, your file.</h1>
      <p className="set-lede">
        Everything is saved in this browser only — no account, no server. Export a copy so a cleared
        browser or a new device never costs you the work.
      </p>

      {notice && (
        <p className="set-notice" role="status">
          {notice}
        </p>
      )}

      <hr className="hr" />

      <section className="set-section">
        <h2 className="set-h2">Export</h2>
        <p className="set-copy">
          Downloads everything saved here as <code className="set-file">{BACKUP_FILENAME}</code>.
          Keep it wherever you keep files.
        </p>
        <p className="set-copy set-copy--quiet">{backupSummary(curriculum, progress)}</p>
        <button type="button" className="btn btn-primary set-btn" onClick={onExport}>
          Export progress
        </button>
      </section>

      <hr className="hr" />

      <section className="set-section">
        <h2 className="set-h2">Import</h2>
        <p className="set-copy">
          Reads a <code className="set-file">{BACKUP_FILENAME}</code> file back in. It replaces
          what is saved here, and only after you confirm.
        </p>
        <label className="set-label" htmlFor="set-file">
          Backup file
        </label>
        <input
          id="set-file"
          className="input set-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void onFileChosen(event)}
        />

        {error && (
          <p className="set-error" role="alert">
            {error}
          </p>
        )}

        {pending && (
          <div className="set-confirm">
            <p className="set-copy">
              <strong>{pending.fileName}</strong> — {backupSummary(curriculum, pending.progress)}
            </p>
            <p className="set-copy set-copy--quiet">
              Importing replaces the progress saved in this browser with the file&apos;s.
            </p>
            <div className="set-actions">
              <button type="button" className="btn btn-primary set-btn" onClick={onConfirmImport}>
                Replace saved progress
              </button>
              <button
                type="button"
                className="btn btn-secondary set-btn"
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <hr className="hr" />

      <section className="set-section">
        <h2 className="set-h2">Reset a module</h2>
        <p className="set-copy">
          Clears the attempts, hints and checkpoint of one module so it can be worked through
          again. Every other module keeps its progress; later checkpoints wait for this one again.
        </p>

        {started.length === 0 ? (
          <p className="set-copy set-copy--quiet">No module has saved progress yet.</p>
        ) : (
          <ul className="set-list">
            {started.map((module) => {
              const number = moduleNumberOf(curriculum, module.id);
              const passed = moduleStateOf(curriculum, module.id, progress) === 'passed';
              return (
                <li key={module.id} className="set-row">
                  <span className="set-rownum">{number}</span>
                  <span className="set-rowtext">
                    <span className="set-rowtitle">{module.title}</span>
                    <span className="set-rowstate">{passed ? 'Passed' : 'In progress'}</span>
                  </span>
                  {confirmingResetOf === module.id ? (
                    <span className="set-actions">
                      <button
                        type="button"
                        className="btn btn-primary set-btn"
                        onClick={() => onConfirmReset(module.id)}
                      >
                        {`Reset Module ${number}`}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary set-btn"
                        onClick={() => setConfirmingResetOf(null)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary set-btn"
                      onClick={() => {
                        clearMessages();
                        setConfirmingResetOf(module.id);
                      }}
                    >
                      Reset
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
