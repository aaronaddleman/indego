import {
  addDays,
  subDays,
  format,
  parseISO,
  startOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  isAfter,
  isBefore,
  isEqual,
} from 'date-fns';

interface Completion {
  date: string;
  completedAt: string;
}

interface Frequency {
  type: string;
  daysOfWeek?: string[];
  daysPerWeek?: number;
  specificDays?: string[];
}

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Compute current and all-time longest streaks for a habit.
 * Pure function — no side effects, fully deterministic given `today`.
 *
 * Time:  O(n log n) sort + O(n) pass
 * Space: O(n)
 */
export function computeStreaks(
  completions: Completion[],
  frequency: Frequency,
  today: string
): StreakResult {
  if (completions.length === 0) {
    return { current: 0, longest: 0 };
  }

  if (frequency.type === 'DAILY') {
    return computeDailyStreaks(completions, today);
  }

  // WEEKLY and CUSTOM: prefer daysOfWeek, fall back to specificDays
  const scheduledDays = frequency.daysOfWeek || frequency.specificDays;
  if (scheduledDays && scheduledDays.length > 0) {
    return computeCustomStreaks(completions, scheduledDays, today);
  }

  // Legacy WEEKLY with daysPerWeek but no specific days
  if (frequency.daysPerWeek) {
    return computeWeeklyStreaks(completions, frequency.daysPerWeek, today);
  }

  // Fallback: treat as daily
  return computeDailyStreaks(completions, today);
}

// ─── DAILY ──────────────────────────────────────────────────────────────────

function computeDailyStreaks(completions: Completion[], today: string): StreakResult {
  const dates = sortedUniqueDates(completions);
  const dateSet = new Set(dates);

  const current = computeDailyCurrentStreak(dateSet, today);
  const longest = computeDailyLongestStreak(dates);

  return { current, longest: Math.max(current, longest) };
}

function computeDailyCurrentStreak(dateSet: Set<string>, today: string): number {
  let streak = 0;
  let current = parseISO(today);

  // If today isn't completed, start from yesterday
  if (!dateSet.has(today)) {
    current = subDays(current, 1);
  }

  while (dateSet.has(format(current, 'yyyy-MM-dd'))) {
    streak++;
    current = subDays(current, 1);
  }

  return streak;
}

function computeDailyLongestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;

  let longest = 1;
  let streak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseISO(sortedDates[i - 1]);
    const curr = parseISO(sortedDates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      streak++;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  return longest;
}

// ─── WEEKLY ─────────────────────────────────────────────────────────────────

function getWeekKey(date: Date): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}

function computeWeeklyStreaks(
  completions: Completion[],
  daysPerWeek: number,
  today: string
): StreakResult {
  // Group completions by ISO week
  const weekCounts = new Map<string, number>();
  for (const c of completions) {
    const key = getWeekKey(parseISO(c.date));
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }

  const todayDate = parseISO(today);
  const currentWeekKey = getWeekKey(todayDate);
  const currentWeekStart = startOfISOWeek(todayDate);

  // Current streak: walk backwards by week
  const current = computeWeeklyCurrentStreak(
    weekCounts,
    daysPerWeek,
    currentWeekKey,
    currentWeekStart,
    todayDate
  );

  // Longest streak: sort weeks and walk forward
  const longest = computeWeeklyLongestStreak(weekCounts, daysPerWeek, currentWeekKey, todayDate);

  return { current, longest: Math.max(current, longest) };
}

function computeWeeklyCurrentStreak(
  weekCounts: Map<string, number>,
  target: number,
  currentWeekKey: string,
  currentWeekStart: Date,
  today: Date
): number {
  let streak = 0;
  let weekStart = currentWeekStart;

  // Handle current week
  const currentCount = weekCounts.get(currentWeekKey) ?? 0;
  const weekIsOver = isAfter(today, addDays(weekStart, 6)) || isEqual(today, addDays(weekStart, 6));

  if (currentCount >= target) {
    // Met target this week
    streak++;
    weekStart = subDays(weekStart, 7);
  } else if (weekIsOver) {
    // Week is over and didn't meet target — streak is 0
    return 0;
  } else {
    // Week not over yet, haven't met target — grace period
    // Don't count this week, start checking from previous week
    weekStart = subDays(weekStart, 7);
  }

  // Walk backwards through previous weeks
  while (true) {
    const key = getWeekKey(weekStart);
    const count = weekCounts.get(key) ?? 0;
    if (count >= target) {
      streak++;
      weekStart = subDays(weekStart, 7);
    } else {
      break;
    }
  }

  return streak;
}

function computeWeeklyLongestStreak(
  weekCounts: Map<string, number>,
  target: number,
  currentWeekKey: string,
  today: Date
): number {
  // Sort all week keys
  const sortedWeeks = [...weekCounts.keys()].sort();
  if (sortedWeeks.length === 0) return 0;

  let longest = 0;
  let streak = 0;

  for (let i = 0; i < sortedWeeks.length; i++) {
    const weekKey = sortedWeeks[i];
    const count = weekCounts.get(weekKey) ?? 0;

    // Skip current incomplete week for longest calculation if below target
    const weekIsOver = weekKey !== currentWeekKey ||
      isAfter(today, addDays(startOfISOWeek(today), 6)) ||
      isEqual(today, addDays(startOfISOWeek(today), 6));

    if (count >= target) {
      // Check if this week is consecutive with previous
      if (i === 0) {
        streak = 1;
      } else {
        const prevWeekStart = startOfISOWeek(parseWeekKey(sortedWeeks[i - 1]));
        const thisWeekStart = startOfISOWeek(parseWeekKey(weekKey));
        const diff = (thisWeekStart.getTime() - prevWeekStart.getTime()) / (1000 * 60 * 60 * 24);

        if (diff === 7 && streak > 0) {
          streak++;
        } else {
          streak = 1;
        }
      }
      longest = Math.max(longest, streak);
    } else if (weekIsOver) {
      streak = 0;
    }
    // If current week and not over, don't break streak for longest calc
  }

  return longest;
}

function parseWeekKey(key: string): Date {
  // "2026-W12" → Date of Monday of that ISO week
  const [yearStr, weekStr] = key.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);

  // Jan 4 is always in ISO week 1
  const jan4 = new Date(year, 0, 4);
  const startOfWeek1 = startOfISOWeek(jan4);
  return addDays(startOfWeek1, (week - 1) * 7);
}

// ─── CUSTOM ─────────────────────────────────────────────────────────────────

function computeCustomStreaks(
  completions: Completion[],
  specificDays: string[],
  today: string
): StreakResult {
  if (specificDays.length === 0) {
    return computeDailyStreaks(completions, today);
  }

  const dateSet = new Set(completions.map(c => c.date));
  const todayDate = parseISO(today);

  const current = computeCustomCurrentStreak(dateSet, specificDays, todayDate);
  const longest = computeCustomLongestStreak(completions, specificDays, todayDate);

  return { current, longest: Math.max(current, longest) };
}

function isScheduledDay(date: Date, specificDays: string[]): boolean {
  const dayName = format(date, 'EEEE').toLowerCase();
  return specificDays.includes(dayName);
}

function computeCustomCurrentStreak(
  dateSet: Set<string>,
  specificDays: string[],
  today: Date
): number {
  let streak = 0;
  let current = today;

  // If today is a scheduled day but not completed, start from previous scheduled day
  const todayStr = format(today, 'yyyy-MM-dd');
  if (isScheduledDay(today, specificDays) && !dateSet.has(todayStr)) {
    current = subDays(current, 1);
  } else if (!isScheduledDay(today, specificDays)) {
    current = subDays(current, 1);
  }

  // Walk backwards, only counting scheduled days
  while (true) {
    // Find previous scheduled day
    while (!isScheduledDay(current, specificDays)) {
      current = subDays(current, 1);
      // Safety: don't walk back more than a year
      if (isBefore(current, subDays(today, 366))) return streak;
    }

    const dateStr = format(current, 'yyyy-MM-dd');
    if (dateSet.has(dateStr)) {
      streak++;
      current = subDays(current, 1);
    } else {
      break;
    }
  }

  return streak;
}

function computeCustomLongestStreak(
  completions: Completion[],
  specificDays: string[],
  today: Date
): number {
  if (completions.length === 0) return 0;

  const dateSet = new Set(completions.map(c => c.date));
  const sortedDates = sortedUniqueDates(completions);
  const earliest = parseISO(sortedDates[0]);

  let longest = 0;
  let streak = 0;
  let current = earliest;

  // Walk forward through all days from earliest to today
  while (!isAfter(current, today)) {
    if (isScheduledDay(current, specificDays)) {
      const dateStr = format(current, 'yyyy-MM-dd');
      if (dateSet.has(dateStr)) {
        streak++;
        longest = Math.max(longest, streak);
      } else {
        streak = 0;
      }
    }
    current = addDays(current, 1);
  }

  return longest;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function sortedUniqueDates(completions: Completion[]): string[] {
  const unique = [...new Set(completions.map(c => c.date))];
  return unique.sort();
}
