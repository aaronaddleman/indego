import { useMemo } from 'react';
import { addDays, format, startOfDay } from 'date-fns';
import { useMutation } from '@apollo/client';
import { LOG_COMPLETION, UNDO_COMPLETION } from '../../graphql/mutations';
import styles from './WeekStrip.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Props {
  habitId: string;
  completions: Completion[];
}

export default function WeekStrip({ habitId, completions }: Props) {
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');
  const completedDates = useMemo(
    () => new Set(completions.map(c => c.date)),
    [completions]
  );

  const days = useMemo(
    () => [-3, -2, -1, 0, 1, 2, 3].map(offset => addDays(today, offset)),
    [today.getTime()]
  );

  const [logCompletion, { loading: logging }] = useMutation(LOG_COMPLETION);
  const [undoCompletion, { loading: undoing }] = useMutation(UNDO_COMPLETION);
  const loading = logging || undoing;

  const handleToggle = async (dateStr: string) => {
    if (loading) return;
    if (completedDates.has(dateStr)) {
      await undoCompletion({ variables: { habitId, date: dateStr } });
    } else {
      await logCompletion({ variables: { habitId, date: dateStr } });
    }
  };

  return (
    <div className={styles.strip} role="group" aria-label="Week overview">
      {days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isToday = dateStr === todayStr;
        const isFuture = day > today;
        const isCompleted = completedDates.has(dateStr);

        return (
          <button
            key={dateStr}
            className={styles.day}
            data-today={isToday || undefined}
            data-future={isFuture || undefined}
            data-completed={isCompleted || undefined}
            onClick={() => handleToggle(dateStr)}
            disabled={isFuture || loading}
            aria-label={`${format(day, 'EEEE, MMMM d')}${isCompleted ? ' (completed)' : ''}${isFuture ? ' (future)' : ''}`}
            aria-disabled={isFuture}
          >
            <span className={styles.dayName}>{format(day, 'EEE')}</span>
            <span className={styles.dateNum}>{format(day, 'd')}</span>
            <span className={styles.indicator}>
              {isCompleted ? '✓' : isFuture ? '·' : '○'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
