// PhotocardShelf — the collection screen (ENGINEERING.md §7 `PhotocardShelf`,
// §4 `cardCracks`, §11 step 4; DESIGN.md §4; prototype:
// design/PyLearn Prototype.dc.html → Photocard shelf screen).
//
// One card per module. A card is earned when its module passed (§6 owner
// gating.moduleStateOf); every hint used in that module draws one crack on it
// (progress.moduleCracksOf — the count is computed and persisted by the state
// owner, never recounted here). Cracks are a visible cost only: they never
// gate, hide or reverse anything.
//
// Art is original, abstract and named after the concept ("The Loop Era") —
// no official imagery (DESIGN.md §4 content safety); the SVGs live in
// src/art/photocards and are wired through content/load.
import { flatModules, moduleNumberOf } from './content/load';
import type { Curriculum, Module } from './content/types';
import { HOME_ROUTE, moduleHref } from './HomeMap';
import { moduleStateOf } from './state/gating';
import { moduleCracksOf, type Progress } from './state/progress';
import './shelf.css';

// A card has four corners, so at most four cracks are drawn. The count in the
// caption stays exact — the cap is display only (ENGINEERING.md §4).
export const MAX_DRAWN_CRACKS = 4;

/** Caption under an earned card. Never scolding: hints used are stated as a
 *  fact, and "mint" is the only superlative. */
export function crackNote(cracks: number): string {
  if (cracks === 0) return 'Mint — no hints used';
  return cracks === 1 ? '1 crack' : `${cracks} cracks`;
}

function ShelfCard({
  curriculum,
  module,
  earned,
  cracks,
}: {
  curriculum: Curriculum;
  module: Module;
  earned: boolean;
  cracks: number;
}) {
  const number = moduleNumberOf(curriculum, module.id);
  // Cracks belong to the card, so they appear once the card is earned — an
  // unearned slot is a placeholder, never a tally of hints already used.
  const drawnCracks = earned ? Math.min(cracks, MAX_DRAWN_CRACKS) : 0;
  const face = (
    <>
      {earned && module.photocard.art ? (
        <span
          className="shelf-art"
          style={{
            maskImage: `url("${module.photocard.art}")`,
            WebkitMaskImage: `url("${module.photocard.art}")`,
          }}
          aria-hidden="true"
        />
      ) : null}
      <span className="shelf-num">{number}</span>
      <span className="shelf-cardtitle">{module.photocard.title}</span>
      <span className="shelf-foot">{earned ? module.title : 'Not earned'}</span>
      {Array.from({ length: drawnCracks }, (_, index) => (
        <span key={index} className={`shelf-crack shelf-crack--${index + 1}`} aria-hidden="true" />
      ))}
    </>
  );

  const caption = earned ? crackNote(cracks) : 'Pass the checkpoint to earn it';

  return (
    <div className="shelf-slot">
      {earned ? (
        // An earned card opens its module again — the concept stays readable
        // forever. Unearned cards are placeholders: not links, not focusable.
        <a className="shelf-card shelf-card--earned" href={moduleHref(module.id)}>
          {face}
        </a>
      ) : (
        <div className="shelf-card shelf-card--locked" aria-disabled="true">
          {face}
        </div>
      )}
      <span className="shelf-note">{caption}</span>
    </div>
  );
}

export type PhotocardShelfProps = {
  curriculum: Curriculum;
  progress: Progress;
};

export default function PhotocardShelf({ curriculum, progress }: PhotocardShelfProps) {
  const modules = flatModules(curriculum);
  const earned = modules.filter(
    (module) => moduleStateOf(curriculum, module.id, progress) === 'passed',
  );
  const headline =
    earned.length === 0
      ? 'Empty shelf. For now.'
      : `${earned.length} of ${modules.length} collected.`;

  return (
    <div className="shelf-screen">
      <a className="btn btn-ghost shelf-back" href={HOME_ROUTE}>
        ← Map
      </a>
      <p className="shelf-kicker">Photocard shelf</p>
      <h1 className="shelf-title">{headline}</h1>
      <p className="shelf-lede">
        One original card per checkpoint. Hints crack corners — a visible cost, never a wall.
      </p>

      <div className="shelf-grid">
        {modules.map((module) => (
          <ShelfCard
            key={module.id}
            curriculum={curriculum}
            module={module}
            earned={earned.includes(module)}
            cracks={moduleCracksOf(progress, module.id)}
          />
        ))}
      </div>
    </div>
  );
}
