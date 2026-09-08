// PhotocardShelf — the collection screen (02-engineering.md §7 `PhotocardShelf`,
// §4 `cardCracks`, §11 step 4; 01-design.md §4; prototype:
// design/PyLearn Prototype.dc.html → Photocard shelf screen).
//
// The cards she has earned, at full size, and one compact strip of numbered
// slots for the checkpoints still on the path. A card is earned when its
// module passed (§6 owner gating.moduleStateOf); every hint used in that
// module draws one crack on it (progress.moduleCracksOf — the count is
// computed and persisted by the state owner, never recounted here). Cracks
// are a visible cost only: they never gate, hide or reverse anything.
//
// Art is original, abstract and named after the concept ("The Loop Era") —
// no official imagery (01-design.md §4 content safety); the SVGs live in
// src/art/photocards and are wired through content/load.
import { flatModules } from '../content/load';
import type { Curriculum, Module } from '../content/types';
import { moduleHref } from '../screens/HomeMap';
import PhotocardArt from './PhotocardArt';
import { moduleStateOf } from '../state/gating';
import { moduleCracksOf, type Progress } from '../state/progress';
import { t } from '../strings/t';
import './shelf.css';

// A card has four corners, so at most four cracks are drawn. The count in the
// caption stays exact — the cap is display only (02-engineering.md §4).
export const MAX_DRAWN_CRACKS = 4;

/** Caption under an earned card. Never scolding: hints used are stated as a
 *  fact, and "mint" is the only superlative. */
export function crackNote(cracks: number): string {
  if (cracks === 0) return t('shelf.card.captionMint');
  return cracks === 1
    ? t('shelf.card.captionOneCrack')
    : t('shelf.card.captionCracks', { count: cracks });
}

function ShelfCard({ module, cracks }: { module: Module; cracks: number }) {
  const number = module.number;
  const drawnCracks = Math.min(cracks, MAX_DRAWN_CRACKS);
  return (
    <div className="shelf-slot">
      {/* An earned card opens its module again — the concept stays readable
          forever. */}
      <a className="shelf-card shelf-card--earned" href={moduleHref(module.id)}>
        <PhotocardArt art={module.photocard.art} className="shelf-art" />
        <span className="shelf-num">{number}</span>
        <span className="shelf-cardtitle">{module.photocard.title}</span>
        <span className="shelf-foot">{module.title}</span>
        {Array.from({ length: drawnCracks }, (_, index) => (
          <span
            key={index}
            className={`shelf-crack shelf-crack--${index + 1}`}
            aria-hidden="true"
          />
        ))}
      </a>
      <span className="shelf-note">{crackNote(cracks)}</span>
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
  const ahead = modules.filter((module) => !earned.includes(module));
  const headline =
    earned.length === 0
      ? t('shelf.headline.empty')
      : t('shelf.headline.collected', { count: earned.length, total: modules.length });

  return (
    <div className="shelf-screen">
      <p className="shelf-kicker">{t('shelf.kicker')}</p>
      <h1 className="shelf-title">{headline}</h1>

      {earned.length > 0 && (
        <div className="shelf-grid">
          {earned.map((module) => (
            <ShelfCard
              key={module.id}
              module={module}
              cracks={moduleCracksOf(progress, module.id)}
            />
          ))}
        </div>
      )}

      {/* What is still ahead: one numbered slot per checkpoint, no card face,
          no caption — a placeholder is not a tally of what she has not done.
          Not controls: the map is where a checkpoint is opened. */}
      {ahead.length > 0 && (
        <section className="shelf-path" aria-label={t('shelf.path.label')}>
          <p className="shelf-path-label">{t('shelf.path.label')}</p>
          <ol className="shelf-path-slots">
            {ahead.map((module) => (
              <li key={module.id} className="shelf-path-slot" aria-disabled="true">
                {module.number}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
