import { useMemo } from 'react';
import { format, subDays } from 'date-fns';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  frequency: { type: string; daysPerWeek?: number; specificDays?: string[] };
  completions: Completion[];
}

export function useStreak(habit: Habit | null | undefined): number {
  return useMemo(() => {
    if (!habit) return 0;

    const completedDates = new Set(habit.completions.map(c => c.date));
    const today = format(new Date(), 'yyyy-MM-dd');
    const freqType = habit.frequency.type;

    // For DAILY: walk backwards from today counting consecutive completed days
    if (freqType === 'DAILY') {
      let streak = 0;
      let current = new Date();

      // If today isn't completed yet, start checking from yesterday
      if (!completedDates.has(today)) {
        current = subDays(current, 1);
      }

      while (true) {
        const dateStr = format(current, 'yyyy-MM-dd');
        if (completedDates.has(dateStr)) {
          streak++;
          current = subDays(current, 1);
        } else {
          break;
        }
      }
      return streak;
    }

    // For WEEKLY and CUSTOM: simplified — count consecutive completed days
    // A more precise implementation would check only expected days
    let streak = 0;
    let current = new Date();
    if (!completedDates.has(today)) {
      current = subDays(current, 1);
    }
    while (true) {
      const dateStr = format(current, 'yyyy-MM-dd');
      if (completedDates.has(dateStr)) {
        streak++;
        current = subDays(current, 1);
      } else {
        break;
      }
    }
    return streak;
  }, [habit]);
}
