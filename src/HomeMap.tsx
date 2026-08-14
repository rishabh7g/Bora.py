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
import { t } from './strings/t';
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
  if (state === 'passed') return { label: t('common.status.passed'), className: 'tag-accent' };
  if (state === 'locked') return { label: t('common.status.locked'), className: 'tag-neutral' };
  return isCurrent
    ? { label: t('home.status.upNext'), className: 'tag-outline' }
    : { label: t('home.status.open'), className: 'tag-neutral' };
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
    ? t('home.progressLine.next', { number: moduleNumberOf(curriculum, current.id) })
    : t('home.progressLine.allPassed');

  return (
    <div className="home-screen">
      {/* The map is the app's root, so the brand lockup sits here — the one
          place the product name is set in the UI (src/Wordmark.tsx, per
          design/brand/BRAND.md). No other screen repeats it: the lockup names
          the app once, where the app starts, and the celebration field stays
          bare because BRAND.md keeps red off red. */}
      <Wordmark className="home-wordmark" />
      <div className="home-head">
        <p className="home-kicker">{t('home.kicker')}</p>
        <span className="tag tag-neutral home-count">
          {t('home.checkpointsCount', { passed: passedCount, total: modules.length })}
        </span>
      </div>
      <h1 className="home-title">{t('home.greeting', { name: LEARNER_NAME })}</h1>
      <p className="home-lede">{t('home.lede', { progressLine })}</p>

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
            <h2 className="home-tiertitle">{t('home.tier5.title')}</h2>
            <span className="home-tierera">
              {tier5Unlocked(curriculum, progress) ? t('home.tier5.unlocked') : t('home.tier5.locked')}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
