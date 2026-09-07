// HomeMap — the Home / Map screen (ENGINEERING.md §7, §11 step 4; DESIGN.md
// §3.1, §6, §7; prototype: design/PyLearn Prototype.dc.html → Home map).
//
// The checkpoint she is on leads: one card at the top of the body — number,
// title, anchor, one button — is the one statement of where she is. Under it,
// the whole path in curriculum order: passed rows keep their anchor and link
// (they are the reading path), the current row is a plain row (the card above
// IS that module), and a locked row is one title line.
//
// Progress is shown as checkpoints passed only — never days, streaks, XP or a
// completion percentage (DESIGN.md §3.1). Tiers and modules come from
// curriculum.json via content/load; every state decision is read from the §6
// owner src/state/gating.ts. This component only renders.
import { flatModules } from './content/load';
import type { Curriculum, Module, Tier } from './content/types';
import { currentModule, moduleStateOf, tier5Unlocked, type ModuleState } from './state/gating';
import type { Progress } from './state/progress';
import { t } from './strings/t';
import Wordmark from './Wordmark';
import './home.css';

// Module 0 is the setup guide, not a concept module — it opens the SetupGuide
// route.
export const SETUP_MODULE_ID = 'm0';
export const SETUP_ROUTE = '#/setup';

// The map is the app's root; the shelf hangs off it (routes live here so the
// screens can link to each other without importing one another in a cycle).
export const HOME_ROUTE = '#/';
export const SHELF_ROUTE = '#/shelf';
export const SETTINGS_ROUTE = '#/settings';

export function moduleHref(moduleId: string): string {
  return moduleId === SETUP_MODULE_ID ? SETUP_ROUTE : `#/module/${moduleId}`;
}

function ModuleRow({
  module,
  state,
  isCurrent,
}: {
  module: Module;
  state: ModuleState;
  isCurrent: boolean;
}) {
  const number = module.number;

  // A locked module is not navigable: it is rendered as plain text, with no
  // href and nothing focusable — the chain rule (§6) is the only way in. One
  // title line: its anchor is a promise for later, and the row style says
  // locked without a chip.
  if (state === 'locked') {
    return (
      <div className="home-row home-row--locked" aria-disabled="true">
        <span className="home-num">{number}</span>
        <span className="home-rowtitle">{module.title}</span>
      </div>
    );
  }

  // The current row drops the anchor its own card just printed above; a
  // passed row keeps it — those rows are the reading path back.
  return (
    <a
      className={`home-row home-row--open${isCurrent ? ' home-row--current' : ''}`}
      href={moduleHref(module.id)}
    >
      <span className="home-num">{number}</span>
      <span className="home-rowtext">
        <span className="home-rowtitle">{module.title}</span>
        {state === 'passed' && <span className="home-rowanchor">{module.anchor}</span>}
      </span>
      {state === 'passed' && (
        <span className="tag tag-accent home-chip">{t('common.status.passed')}</span>
      )}
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
      <h2 className="home-tierhead">
        <span className="home-tiertitle">{tier.title}</span>
        <span className="home-tierera">{tier.era}</span>
      </h2>
      <div className="home-rows">
        {tier.modules.map((module) => (
          <ModuleRow
            key={module.id}
            module={module}
            state={moduleStateOf(curriculum, module.id, progress)}
            isCurrent={module.id === currentId}
          />
        ))}
      </div>
    </section>
  );
}

/** The checkpoint she is on, or the one line for when there is none left. */
function CurrentCard({
  current,
  passed,
  total,
}: {
  current: Module | undefined;
  passed: number;
  total: number;
}) {
  const count = t('home.card.count', { passed, total });
  if (!current) {
    return (
      <section className="home-current">
        <p className="home-current-kicker">{count}</p>
        <h1 className="home-title">{t('home.card.allPassed')}</h1>
      </section>
    );
  }
  const number = current.number;
  return (
    <section className="home-current">
      <p className="home-current-kicker">{count}</p>
      <div className="home-current-head">
        <span className="home-num home-num--current">{number}</span>
        <h1 className="home-title">{current.title}</h1>
      </div>
      <p className="home-lede">{current.anchor}</p>
      <a className="btn btn-primary home-current-open" href={moduleHref(current.id)}>
        {t('home.card.open', { number })}
      </a>
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
  const tier5Open = tier5Unlocked(curriculum, progress);

  return (
    <div className="home-screen">
      {/* The map is the app's root, so the brand lockup sits here — the one
          place the product name is set in the UI (src/Wordmark.tsx, per
          design/brand/BRAND.md). No other screen repeats it. */}
      <Wordmark className="home-wordmark" />

      <CurrentCard
        current={current}
        passed={passedCount}
        total={modules.length}
      />

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
            open, so the capstone rule is consumed rather than restated. One
            line, not a section: there is nothing under it to head. */}
        <p className={`home-tier5${tier5Open ? '' : ' home-tier5--locked'}`}>
          <span className="home-tiertitle">{t('home.tier5.title')}</span>{' '}
          {tier5Open ? t('home.tier5.unlocked') : t('home.tier5.locked')}
        </p>
      </div>
    </div>
  );
}
