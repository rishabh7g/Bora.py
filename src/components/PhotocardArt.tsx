// Photocard art — the ONE owner of how a card's original SVG is painted.
// The file is used as a CSS mask (not an <img>), so the shape always takes the
// surrounding card's ink and can never fight its contrast: the same art works
// on the shelf's red card and on the celebration screen's inverted field.
// Every screen that shows card art consumes this; nothing re-implements it.

export type PhotocardArtProps = {
  art: string; // resolved URL from content/load.photocardArtUrl
  className: string; // the host screen owns placement/size
};

export default function PhotocardArt({ art, className }: PhotocardArtProps) {
  if (!art) return null;
  return (
    <span
      className={className}
      style={{ maskImage: `url("${art}")`, WebkitMaskImage: `url("${art}")` }}
      aria-hidden="true"
    />
  );
}
