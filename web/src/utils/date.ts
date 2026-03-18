import { format } from 'date-fns';

/**
 * Get a date in the user's local timezone as YYYY-MM-DD.
 * This is the single source of truth for date strings across the app.
 * Never use toISOString() for date strings — it converts to UTC.
 */
export function getLocalDate(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd');
}
