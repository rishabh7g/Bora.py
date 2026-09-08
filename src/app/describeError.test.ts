// describeError must read a DOMException — what IndexedDB actually rejects
// with — and it must not rely on `instanceof Error` to do it, since
// DOMException does not inherit from Error in every engine (#96).
import { describe, expect, it } from 'vitest';
import { describeError } from './describeError';

describe('describeError', () => {
  it('reads a plain Error', () => {
    expect(describeError(new TypeError('Failed to fetch'))).toBe('TypeError: Failed to fetch');
  });

  it('reads a DOMException — the shape IndexedDB actually rejects with', () => {
    const domException = new DOMException('blocked', 'InvalidStateError');
    expect(describeError(domException)).toBe('InvalidStateError: blocked');
  });

  it('reads a plain { name, message } object, never asking instanceof Error', () => {
    expect(describeError({ name: 'QuotaExceededError', message: 'disk full' })).toBe(
      'QuotaExceededError: disk full',
    );
  });

  it('falls back to the name alone when there is no message', () => {
    expect(describeError({ name: 'AbortError', message: '' })).toBe('AbortError');
    expect(describeError({ name: 'AbortError' })).toBe('AbortError');
  });

  it('returns null for a throw with no readable name', () => {
    expect(describeError('a plain string throw')).toBeNull();
    expect(describeError(null)).toBeNull();
    expect(describeError(undefined)).toBeNull();
    expect(describeError({})).toBeNull();
    expect(describeError(42)).toBeNull();
  });
});
