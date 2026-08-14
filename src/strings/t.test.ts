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
    expect(t('home.greeting', { name: 'ARMY' })).toBe('Annyeong, ARMY.');
  });

  it('fills multiple placeholders', () => {
    expect(t('home.checkpointsCount', { passed: 3, total: 12 })).toBe('3 / 12 CHECKPOINTS');
  });

  it('leaves an unfilled placeholder verbatim rather than blanking it', () => {
    expect(t('home.greeting', {})).toBe('Annyeong, {name}.');
  });

  it('throws for a key the active pack has no value for', () => {
    // @ts-expect-error — deliberately off-contract, proving the runtime guard fires.
    expect(() => t('not.a.real.key')).toThrow(/no value for "not.a.real.key"/);
  });
});
