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
import { useEffect, useRef, useState } from 'react';
import { flatModules, moduleNumberOf } from './content/load';
import type { Curriculum } from './content/types';
import Notice from './Notice';
import { BACKUP_FILENAME, parseBackup, serializeProgress } from './state/backup';
import { moduleStateOf } from './state/gating';
import { hasModuleProgress, type Progress } from './state/progress';
import { t } from './strings/t';
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
  const checkpoints = t('settings.summary.checkpoints', { passed, total: modules.length });
  return started === 1
    ? t('settings.summary.oneModule', { checkpoints })
    : t('settings.summary.modules', { checkpoints, count: started });
}

// Confirming is a swap: the control that was clicked is replaced by the pair
// that confirms it (and, on cancel or completion, swapped back). The clicked
// element leaves the DOM, so the browser drops focus to the document and the
// next Tab starts the screen again. Every swap therefore names what focus should
// move to; the handler that caused the change sets it, so nothing here guesses.
// `null` means the control that was clicked is still there — leave focus alone
// (which is why plain Export, whose button survives, sets nothing).
type FocusAfter =
  | { kind: 'confirmReset' }
  | { kind: 'confirmImport' }
  | { kind: 'resetButton'; moduleId: string }
  | { kind: 'notice' }
  | null;

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
  const [focusAfter, setFocusAfter] = useState<FocusAfter>(null);

  const noticeRef = useRef<HTMLParagraphElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirmImportRef = useRef<HTMLButtonElement>(null);
  const confirmResetRef = useRef<HTMLButtonElement>(null);
  const resetButtons = useRef(new Map<string, HTMLButtonElement | null>());

  useEffect(() => {
    if (!focusAfter) return;
    const target =
      focusAfter.kind === 'confirmReset'
        ? confirmResetRef.current
        : focusAfter.kind === 'confirmImport'
          ? confirmImportRef.current
          : focusAfter.kind === 'notice'
            ? noticeRef.current
            : resetButtons.current.get(focusAfter.moduleId);
    target?.focus();
    setFocusAfter(null); // one move per swap
  }, [focusAfter]);

  const modules = flatModules(curriculum);
  const started = modules.filter((module) => hasModuleProgress(progress, module.id));

  function clearMessages() {
    setNotice(null);
    setError(null);
  }

  function onExport() {
    clearMessages();
    downloadBackup(progress);
    setNotice(t('settings.savedFile', { fileName: BACKUP_FILENAME }));
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
    setFocusAfter({ kind: 'confirmImport' });
  }

  function onConfirmImport() {
    if (!pending) return;
    onImport(pending.progress);
    setPending(null);
    setNotice(t('settings.import.confirmedNotice'));
    setFocusAfter({ kind: 'notice' });
  }

  function onConfirmReset(moduleId: string) {
    clearMessages();
    onResetModule(moduleId);
    setConfirmingResetOf(null);
    setNotice(t('settings.reset.confirmedNotice', { number: moduleNumberOf(curriculum, moduleId) }));
    // The row itself goes with the progress it held, so the fact of the reset is
    // what focus lands on.
    setFocusAfter({ kind: 'notice' });
  }

  return (
    <div className="set-screen">
      <p className="set-kicker">{t('settings.kicker')}</p>
      <h1 className="set-title">{t('settings.title')}</h1>
      <p className="set-lede">{t('settings.lede')}</p>

      {notice && (
        <p className="set-notice" role="status" tabIndex={-1} ref={noticeRef}>
          {notice}
        </p>
      )}

      <hr className="hr" />

      <section className="set-section">
        <h2 className="set-h2">{t('settings.export.h2')}</h2>
        <p className="set-copy">
          {t('settings.export.bodyBeforeFile')}
          <code className="set-file">{BACKUP_FILENAME}</code>
          {t('settings.export.bodyAfterFile')}
        </p>
        <p className="set-copy set-copy--quiet">{backupSummary(curriculum, progress)}</p>
        <button type="button" className="btn btn-primary set-btn" onClick={onExport}>
          {t('settings.export.button')}
        </button>
      </section>

      <hr className="hr" />

      <section className="set-section">
        <h2 className="set-h2">{t('settings.import.h2')}</h2>
        <p className="set-copy">
          {t('settings.import.bodyBeforeFile')}
          <code className="set-file">{BACKUP_FILENAME}</code>
          {t('settings.import.bodyAfterFile')}
        </p>
        <label className="set-label" htmlFor="set-file">
          {t('settings.import.label')}
        </label>
        <input
          id="set-file"
          ref={fileInputRef}
          className="input set-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void onFileChosen(event)}
        />

        {error && (
          // h2, not the default h1: this screen already has one (.set-title,
          // above) — a raised notice takes the screen's h1 only when nothing
          // else has loaded (src/Notice.tsx).
          <Notice level="h2" title={t('settings.import.failedTitle')} body={error} />
        )}

        {pending && (
          <div className="set-confirm">
            <p className="set-copy">
              <strong>{pending.fileName}</strong> — {backupSummary(curriculum, pending.progress)}
            </p>
            <p className="set-copy set-copy--quiet">{t('settings.import.replaceWarning')}</p>
            <div className="set-actions">
              <button
                type="button"
                ref={confirmImportRef}
                className="btn btn-primary set-btn"
                onClick={onConfirmImport}
              >
                {t('settings.import.confirmButton')}
              </button>
              <button
                type="button"
                className="btn btn-secondary set-btn"
                onClick={() => {
                  setPending(null);
                  // The file field is still on screen, so cancelling goes back
                  // to it rather than to the top of the page.
                  fileInputRef.current?.focus();
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </section>

      <hr className="hr" />

      <section className="set-section">
        <h2 className="set-h2">{t('settings.reset.h2')}</h2>
        <p className="set-copy">{t('settings.reset.body')}</p>

        {started.length === 0 ? (
          <p className="set-copy set-copy--quiet">{t('settings.reset.empty')}</p>
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
                    <span className="set-rowstate">
                      {passed ? t('settings.reset.passed') : t('settings.reset.inProgress')}
                    </span>
                  </span>
                  {confirmingResetOf === module.id ? (
                    <span className="set-actions">
                      <button
                        type="button"
                        ref={confirmResetRef}
                        className="btn btn-primary set-btn"
                        onClick={() => onConfirmReset(module.id)}
                      >
                        {t('settings.reset.button', { number })}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary set-btn"
                        onClick={() => {
                          setConfirmingResetOf(null);
                          setFocusAfter({ kind: 'resetButton', moduleId: module.id });
                        }}
                      >
                        {t('common.cancel')}
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      ref={(node) => {
                        resetButtons.current.set(module.id, node);
                      }}
                      className="btn btn-secondary set-btn"
                      onClick={() => {
                        clearMessages();
                        setConfirmingResetOf(module.id);
                        setFocusAfter({ kind: 'confirmReset' });
                      }}
                    >
                      {t('settings.reset.resetButton')}
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
