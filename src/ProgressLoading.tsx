// The screen shown before the stored progress has been read — and the one shown
// when that read has stalled.
//
// Why it exists: App renders no screen until Progress is loaded (write-through
// storage, ENGINEERING.md §4), because a click on unloaded default state would
// overwrite real progress. A missing or throwing IndexedDB is already handled by
// state/progress.loadProgress (it falls back to empty progress), but a read that
// never settles at all — a blocked `versionchange`, a stalled or corrupt store —
// used to leave the learner on a permanently empty page with nothing to read.
// So: always say something, and after a wait say what went wrong.
//
// The stalled state is the shared failure panel (src/Notice.tsx, #96) — this is
// exactly the "nothing else has loaded" case Notice's default h1 title is for.
// The pending state is not a failure, so it stays its own small, quiet element:
// the text is in the DOM immediately for assistive tech, but fades in only if
// the read is still running after a beat, so a normal fast load never flashes it.
import Notice from './Notice';
import { t } from './strings/t';
import './loading.css';

export default function ProgressLoading({ stalled }: { stalled: boolean }) {
  if (stalled) {
    return (
      <Notice
        title={t('progressLoading.stalledTitle')}
        body={t('progressLoading.stalledBody')}
        action={{ label: t('common.tryAgain'), onClick: () => window.location.reload() }}
      />
    );
  }
  return (
    <div className="load-screen" role="status">
      <p className="load-body load-body-pending">{t('progressLoading.pending')}</p>
    </div>
  );
}
