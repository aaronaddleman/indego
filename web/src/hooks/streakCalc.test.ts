import { describe, it, expect } from 'vitest';
import { computeStreaks } from './streakCalc';

const completion = (date: string) => ({ date, completedAt: `${date}T12:00:00Z` });

describe('computeStreaks — DAILY', () => {
  const freq = { type: 'DAILY' };

  it('returns 0 for no completions', () => {
    const result = computeStreaks([], freq, '2026-03-17');
    expect(result).toEqual({ current: 0, longest: 0 });
  });

  it('counts consecutive days ending today', () => {
    const completions = [
      completion('2026-03-14'),
      completion('2026-03-15'),
      completion('2026-03-16'),
      completion('2026-03-17'),
    ];
    const result = computeStreaks(completions, freq, '2026-03-17');
    expect(result.current).toBe(4);
    expect(result.longest).toBe(4);
  });

  it('counts from yesterday if today not completed', () => {
    const completions = [
      completion('2026-03-14'),
      completion('2026-03-15'),
      completion('2026-03-16'),
    ];
    const result = computeStreaks(completions, freq, '2026-03-17');
    expect(result.current).toBe(3);
  });

  it('breaks on gap', () => {
    const completions = [
      completion('2026-03-13'),
      completion('2026-03-14'),
      // gap on 2026-03-15
      completion('2026-03-16'),
      completion('2026-03-17'),
    ];
    const result = computeStreaks(completions, freq, '2026-03-17');
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it('finds longest streak in history', () => {
    const completions = [
      // 5-day streak in the past
      completion('2026-02-01'),
      completion('2026-02-02'),
      completion('2026-02-03'),
      completion('2026-02-04'),
      completion('2026-02-05'),
      // gap
      // 2-day current streak
      completion('2026-03-16'),
      completion('2026-03-17'),
    ];
    const result = computeStreaks(completions, freq, '2026-03-17');
    expect(result.current).toBe(2);
    expect(result.longest).toBe(5);
  });

  it('handles single completion today', () => {
    const completions = [completion('2026-03-17')];
    const result = computeStreaks(completions, freq, '2026-03-17');
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it('handles unsorted completions', () => {
    const completions = [
      completion('2026-03-17'),
      completion('2026-03-15'),
      completion('2026-03-16'),
    ];
    const result = computeStreaks(completions, freq, '2026-03-17');
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });
});

describe('computeStreaks — WEEKLY', () => {
  const freq = { type: 'WEEKLY', daysPerWeek: 3 };

  it('returns 0 for no completions', () => {
    const result = computeStreaks([], freq, '2026-03-17');
    expect(result).toEqual({ current: 0, longest: 0 });
  });

  it('counts consecutive weeks meeting target', () => {
    // Week of Mar 9-15: 3 completions
    // Week of Mar 2-8: 3 completions
    const completions = [
      completion('2026-03-03'), completion('2026-03-04'), completion('2026-03-05'),
      completion('2026-03-10'), completion('2026-03-11'), completion('2026-03-12'),
      // Current week (Mar 16-22): 2 completions, not yet met target (grace)
      completion('2026-03-16'), completion('2026-03-17'),
    ];
    const result = computeStreaks(completions, freq, '2026-03-17');
    // Current week hasn't ended and hasn't met target — grace period
    // Previous 2 weeks met target
    expect(result.current).toBe(2);
  });

  it('counts current week if target met', () => {
    const completions = [
      completion('2026-03-10'), completion('2026-03-11'), completion('2026-03-12'),
      completion('2026-03-16'), completion('2026-03-17'), completion('2026-03-18'),
    ];
    // Current week has 3 completions — meets target
    const result = computeStreaks(completions, freq, '2026-03-18');
    expect(result.current).toBeGreaterThanOrEqual(2);
  });
});

describe('computeStreaks — CUSTOM', () => {
  const freq = { type: 'CUSTOM', specificDays: ['monday', 'wednesday', 'friday'] };

  it('returns 0 for no completions', () => {
    const result = computeStreaks([], freq, '2026-03-17');
    expect(result).toEqual({ current: 0, longest: 0 });
  });

  it('counts consecutive scheduled days', () => {
    // March 2026: Mon=16, Wed=18 (not yet), Fri=13, Mon=9, Wed=11, Fri=6
    // Going back: Fri 13, Wed 11, Mon 9 = 3 consecutive scheduled days
    const completions = [
      completion('2026-03-09'), // Mon
      completion('2026-03-11'), // Wed
      completion('2026-03-13'), // Fri
      completion('2026-03-16'), // Mon (today)
    ];
    const result = computeStreaks(completions, freq, '2026-03-16');
    expect(result.current).toBe(4);
  });

  it('skips non-scheduled days', () => {
    // Tuesday and Thursday should not affect the streak
    const completions = [
      completion('2026-03-13'), // Fri
      // Sat, Sun skipped
      completion('2026-03-16'), // Mon
    ];
    const result = computeStreaks(completions, freq, '2026-03-16');
    expect(result.current).toBe(2);
  });

  it('breaks on missed scheduled day', () => {
    const completions = [
      completion('2026-03-09'), // Mon
      // Wed Mar 11 missed
      completion('2026-03-13'), // Fri
      completion('2026-03-16'), // Mon
    ];
    const result = computeStreaks(completions, freq, '2026-03-16');
    expect(result.current).toBe(2); // Fri + Mon
  });

  it('handles empty specificDays as daily', () => {
    const freqEmpty = { type: 'CUSTOM', specificDays: [] as string[] };
    const completions = [
      completion('2026-03-16'),
      completion('2026-03-17'),
    ];
    const result = computeStreaks(completions, freqEmpty, '2026-03-17');
    expect(result.current).toBe(2);
  });
});
