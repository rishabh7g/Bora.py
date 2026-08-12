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
// The wait itself is CSS (loading.css): the text is in the DOM immediately for
// assistive tech, but fades in only if the load is slow, so a normal fast load
// never flashes it.
import './loading.css';

export default function ProgressLoading({ stalled }: { stalled: boolean }) {
  return (
    <div className="load-screen" role="status">
      {stalled ? (
        <>
          <p className="load-title">Your checkpoints are not loading.</p>
          <p className="load-body">
            This browser&rsquo;s storage looks blocked or unavailable — private browsing and
            blocked site data can both do it. Your progress is safe; this copy of the app just
            cannot read it.
          </p>
          <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </>
      ) : (
        <p className="load-body load-body-pending">Loading your checkpoints&hellip;</p>
      )}
    </div>
  );
}
