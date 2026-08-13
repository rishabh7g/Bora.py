// HomeMap — the Home / Map screen (ENGINEERING.md §7, §11 step 4; DESIGN.md
// §3.1, §6, §7; prototype: design/PyLearn Prototype.dc.html → Home map).
// The era-themed checkpoint path: every tier with its era label, every module
// as a row with its locked / available / passed state, and the current
// checkpoint highlighted.
//
// Progress is shown as checkpoints passed only — never days, streaks, XP or a
// completion percentage (DESIGN.md §3.1). Tiers and modules come from
// curriculum.json via content/load; every state decision is read from the §6
// owner src/state/gating.ts. This component only renders.
import { flatModules, moduleNumberOf } from './content/load';
import type { Curriculum, Module, Tier } from './content/types';
import { currentModule, moduleStateOf, tier5Unlocked, type ModuleState } from './state/gating';
import type { Progress } from './state/progress';
import Wordmark from './Wordmark';
import './home.css';

// Module 0 is the setup guide, not a concept module — it opens the SetupGuide
// route (a placeholder screen until that issue lands).
export const SETUP_MODULE_ID = 'm0';
export const SETUP_ROUTE = '#/setup';

// The map is the app's root; the shelf hangs off it (routes live here so the
// screens can link to each other without importing one another in a cycle).
export const HOME_ROUTE = '#/';
export const SHELF_ROUTE = '#/shelf';
export const SETTINGS_ROUTE = '#/settings';

// No accounts, so the greeting uses the prototype's default learner name.
const LEARNER_NAME = 'ARMY';

export function moduleHref(moduleId: string): string {
  return moduleId === SETUP_MODULE_ID ? SETUP_ROUTE : `#/module/${moduleId}`;
}

type RowStatus = { label: string; className: string };

/** Row tag per prototype: PASSED / UP NEXT (the current checkpoint) / OPEN /
 *  LOCKED. `isCurrent` is decided by gating.currentModule, not re-derived. */
export function rowStatusOf(state: ModuleState, isCurrent: boolean): RowStatus {
  if (state === 'passed') return { label: 'PASSED', className: 'tag-accent' };
  if (state === 'locked') return { label: 'LOCKED', className: 'tag-neutral' };
  return isCurrent
    ? { label: 'UP NEXT', className: 'tag-outline' }
    : { label: 'OPEN', className: 'tag-neutral' };
}

function ModuleRow({
  curriculum,
  module,
  state,
  isCurrent,
}: {
  curriculum: Curriculum;
  module: Module;
  state: ModuleState;
  isCurrent: boolean;
}) {
  const status = rowStatusOf(state, isCurrent);
  const number = moduleNumberOf(curriculum, module.id);
  const body = (
    <>
      <span className={`home-num${isCurrent ? ' home-num--current' : ''}`}>{number}</span>
      <span className="home-rowtext">
        <span className="home-rowtitle">{module.title}</span>
        <span className="home-rowanchor">{module.anchor}</span>
      </span>
      <span className={`tag ${status.className} home-chip`}>{status.label}</span>
    </>
  );

  // A locked module is not navigable: it is rendered as plain text, with no
  // href and nothing focusable — the chain rule (§6) is the only way in.
  if (state === 'locked') {
    return (
      <div className="home-row home-row--locked" aria-disabled="true">
        {body}
      </div>
    );
  }

  return (
    <a
      className={`home-row home-row--open${isCurrent ? ' home-row--current' : ''}`}
      href={moduleHref(module.id)}
    >
      {body}
    </a>
  );
}

function TierSection({
  curriculum,
  tier,
  progress,
  currentId,
}: {
  curriculum: Curriculum;
  tier: Tier;
  progress: Progress;
  currentId: string | undefined;
}) {
  return (
    <section className="home-tier">
      <div className="home-tierhead">
        <h2 className="home-tiertitle">{tier.title}</h2>
        <span className="home-tierera">{tier.era}</span>
      </div>
      <div className="home-rows">
        {tier.modules.map((module) => (
          <ModuleRow
            key={module.id}
            curriculum={curriculum}
            module={module}
            state={moduleStateOf(curriculum, module.id, progress)}
            isCurrent={module.id === currentId}
          />
        ))}
      </div>
    </section>
  );
}

export type HomeMapProps = {
  curriculum: Curriculum;
  progress: Progress;
};

export default function HomeMap({ curriculum, progress }: HomeMapProps) {
  const modules = flatModules(curriculum);
  const current = currentModule(curriculum, progress);
  const passedCount = modules.filter(
    (module) => moduleStateOf(curriculum, module.id, progress) === 'passed',
  ).length;
  const progressLine = current
    ? `Next up: Module ${moduleNumberOf(curriculum, current.id)}.`
    : 'Every checkpoint passed. Tier 5 is yours.';

  return (
    <div className="home-screen">
      {/* The map is the app's root, so the brand lockup sits here — the one
          place the product name is set in the UI (src/Wordmark.tsx, per
          design/brand/BRAND.md). Every other screen carries a "← Map" link
          back to it instead of repeating the lockup, and the celebration field
          stays bare: BRAND.md keeps red off red. */}
      <Wordmark className="home-wordmark" />
      <div className="home-head">
        <p className="home-kicker">Checkpoint path</p>
        <div className="home-headright">
          <span className="tag tag-neutral home-count">{`${passedCount} / ${modules.length} CHECKPOINTS`}</span>
          {/* The two links are peers, so they travel as one block: a phone width
              wraps them together onto their own row instead of leaving one
              beside the counter and orphaning the other underneath it (#47). */}
          <div className="home-headlinks">
            {/* The shelf is reached from the map — the collection is a reward to
                browse, never a task to chase. */}
            <a className="btn btn-ghost home-shelflink" href={SHELF_ROUTE}>
              Photocard shelf →
            </a>
            {/* Settings hangs off the map too: export/import is the backup story
                (ENGINEERING.md §4), reachable without hunting for it. */}
            <a className="btn btn-ghost home-shelflink" href={SETTINGS_ROUTE}>
              Settings →
            </a>
          </div>
        </div>
      </div>
      <h1 className="home-title">{`Annyeong, ${LEARNER_NAME}.`}</h1>
      <p className="home-lede">{`Progress is checkpoints passed — never days or streaks. ${progressLine}`}</p>

      <div className="home-tiers">
        {curriculum.tiers.map((tier) => (
          <TierSection
            key={tier.id}
            curriculum={curriculum}
            tier={tier}
            progress={progress}
            currentId={current?.id}
          />
        ))}

        {/* Tier 5 has no authored content yet; §6 still owns whether it is
            open, so the capstone rule is consumed rather than restated. */}
        <section className={`home-tier home-tier5${tier5Unlocked(curriculum, progress) ? '' : ' home-tier5--locked'}`}>
          <div className="home-tierhead">
            <h2 className="home-tiertitle">Tier 5 — Advanced</h2>
            <span className="home-tierera">
              {tier5Unlocked(curriculum, progress)
                ? 'Files, APIs, classes. Unlocked — content lands later.'
                : 'Files, APIs, classes. Unlocks after the capstone.'}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
