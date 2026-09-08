// Wordmark — the ONE owner of how the brand name is set in the app
// (design/brand/BRAND.md "Mark" / "Wordmark" / "Rules"; prototype header
// lockup). The product name is bora.py: always lowercase, always with the dot,
// never the working title the docs and the prototype file were delivered under.
//
// Spec, verbatim from BRAND.md: mark + 8px gap + wordmark, mark height = cap
// height × 1.2 (22px mark, 19px wordmark), `bora` in --color-text and `.py` in
// --color-accent-700, letter-spacing 0.01em, set live in Archivo (never
// outlined). The mark is the primary variant — red field, glyphs in the page
// colour — inlined from design/brand/logo.svg so it takes the tokens and needs
// no network fetch. Zero radius, no gradients, no rotation.
import './wordmark.css';

/** The brand name, in the one form BRAND.md allows. */
export const BRAND_NAME = 'bora.py';

export default function Wordmark({ className }: { className?: string }) {
  return (
    <p className={`wordmark${className ? ` ${className}` : ''}`} aria-label={BRAND_NAME}>
      {/* Decorative next to the name it sits beside — the lockup is announced
          once, by the label above. */}
      <svg className="wordmark-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <rect width="64" height="64" fill="var(--color-accent)" />
        <polyline
          points="17,18 31,32 17,46"
          stroke="var(--color-bg)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="square"
        />
        <rect x="37" y="38" width="12" height="8" fill="var(--color-bg)" />
      </svg>
      <span className="wordmark-text" aria-hidden="true">
        bora<span className="wordmark-dot">.py</span>
      </span>
    </p>
  );
}
