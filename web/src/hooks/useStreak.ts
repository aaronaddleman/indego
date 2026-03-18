import { getLocalDate } from '../utils/date';

import { computeStreaks, type StreakResult } from './streakCalc';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  frequency: { type: string; daysPerWeek?: number; specificDays?: string[] };
  completions: Completion[];
}

export function useStreak(habit: Habit | null | undefined): StreakResult {
  if (!habit) return { current: 0, longest: 0 };

  const today = getLocalDate();
  return computeStreaks(habit.completions, habit.frequency, today);
}
