import { describe, it, expect } from 'vitest';
import { getLocalDate } from './date';

describe('getLocalDate', () => {
  it('returns YYYY-MM-DD format', () => {
    const d = new Date(2026, 0, 5, 12, 0, 0); // Jan 5, noon
    expect(getLocalDate(d)).toBe('2026-01-05');
  });

  it('returns correct date at 11pm local time', () => {
    const d = new Date(2026, 2, 17, 23, 0, 0); // March 17, 11pm local
    expect(getLocalDate(d)).toBe('2026-03-17');
  });

  it('returns correct date at 1am local time', () => {
    const d = new Date(2026, 2, 18, 1, 0, 0); // March 18, 1am local
    expect(getLocalDate(d)).toBe('2026-03-18');
  });

  it('returns correct date at midnight', () => {
    const d = new Date(2026, 2, 18, 0, 0, 0); // March 18, midnight local
    expect(getLocalDate(d)).toBe('2026-03-18');
  });

  it('pads single-digit months and days', () => {
    const d = new Date(2026, 0, 1); // Jan 1
    expect(getLocalDate(d)).toBe('2026-01-01');
  });

  it('handles end of year', () => {
    const d = new Date(2026, 11, 31, 23, 59, 59); // Dec 31, 11:59pm
    expect(getLocalDate(d)).toBe('2026-12-31');
  });

  it('differs from toISOString when near UTC midnight', () => {
    // This demonstrates the bug we're fixing:
    // A date that is "today" locally but "tomorrow" in UTC
    // We can't control timezone in Vitest, but we can verify
    // getLocalDate uses local time, not UTC
    const d = new Date(2026, 2, 17, 23, 30, 0); // 11:30pm March 17 local
    const localResult = getLocalDate(d);

    // Local should always be March 17 regardless of UTC conversion
    expect(localResult).toBe('2026-03-17');
  });

  it('defaults to current date when no argument', () => {
    const result = getLocalDate();
    // Should be a valid date string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
