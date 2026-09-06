import { describe, expect, it } from 'vitest';
import { t } from './t';

describe('t()', () => {
  it('reads a plain key', () => {
    expect(t('nav.map')).toBe('Map');
  });

  it('reads a nested key', () => {
    expect(t('home.tier5.title')).toBe('Tier 5 — Advanced');
  });

  it('fills placeholders', () => {
    expect(t('home.card.open', { number: '02' })).toBe('Open Module 02');
  });

  it('fills multiple placeholders', () => {
    expect(t('home.card.count', { passed: 3, total: 12 })).toBe('3 of 12 checkpoints passed');
  });

  it('leaves an unfilled placeholder verbatim rather than blanking it', () => {
    expect(t('home.card.open', {})).toBe('Open Module {number}');
  });

  it('throws for a key the active pack has no value for', () => {
    // @ts-expect-error — deliberately off-contract, proving the runtime guard fires.
    expect(() => t('not.a.real.key')).toThrow(/no value for "not.a.real.key"/);
  });
});
