import { format } from 'date-fns';

/**
 * Check if a habit is due on a given day name.
 * Uses the computed dueDays field from the API.
 */
export function isDueOnDay(
  frequency: { dueDays?: string[] },
  dayName: string
): boolean {
  if (!frequency.dueDays) return true; // no dueDays = show always
  return frequency.dueDays.includes(dayName.toLowerCase());
}

/**
 * Get the lowercase day name for a date.
 */
export function getDayName(date: Date): string {
  return format(date, 'EEEE').toLowerCase();
}
