import { describe, it, expect } from 'vitest';
import { isDueOnDay, getDayName } from './frequency';

describe('isDueOnDay', () => {
  it('returns true when day is in dueDays', () => {
    const freq = { dueDays: ['monday', 'wednesday', 'friday'] };
    expect(isDueOnDay(freq, 'monday')).toBe(true);
    expect(isDueOnDay(freq, 'wednesday')).toBe(true);
    expect(isDueOnDay(freq, 'friday')).toBe(true);
  });

  it('returns false when day is not in dueDays', () => {
    const freq = { dueDays: ['monday', 'wednesday', 'friday'] };
    expect(isDueOnDay(freq, 'tuesday')).toBe(false);
    expect(isDueOnDay(freq, 'thursday')).toBe(false);
    expect(isDueOnDay(freq, 'saturday')).toBe(false);
  });

  it('is case insensitive', () => {
    const freq = { dueDays: ['monday'] };
    expect(isDueOnDay(freq, 'Monday')).toBe(true);
    expect(isDueOnDay(freq, 'MONDAY')).toBe(true);
  });

  it('returns true when dueDays is undefined (show always)', () => {
    const freq = {};
    expect(isDueOnDay(freq, 'monday')).toBe(true);
  });

  it('handles all 7 days (DAILY)', () => {
    const freq = { dueDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] };
    expect(isDueOnDay(freq, 'monday')).toBe(true);
    expect(isDueOnDay(freq, 'sunday')).toBe(true);
  });
});

describe('getDayName', () => {
  it('returns lowercase day name', () => {
    // March 17, 2026 is a Tuesday
    const d = new Date(2026, 2, 17);
    expect(getDayName(d)).toBe('tuesday');
  });

  it('returns monday for a Monday', () => {
    const d = new Date(2026, 2, 16);
    expect(getDayName(d)).toBe('monday');
  });
});
