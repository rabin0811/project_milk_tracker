import { describe, expect, it } from 'vitest';

import { formatDate } from './format';

describe('formatDate', () => {
  it('returns a friendly label for missing values', () => {
    expect(formatDate(null)).toBe('Never');
  });

  it('returns a fallback for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('Unknown');
  });

  it('formats a valid timestamp', () => {
    expect(formatDate('2026-01-02T03:04:05Z')).not.toBe('Unknown');
  });
});
