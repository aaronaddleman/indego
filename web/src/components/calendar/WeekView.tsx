import { getLocalDate } from '../../utils/date';
import { useMemo, useState } from 'react';
import { startOfWeek, addWeeks, subWeeks, eachDayOfInterval, format, addDays } from 'date-fns';
import CompletionToggle from '../habits/CompletionToggle';
import styles from './WeekView.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  completions: Completion[];
}

export default function WeekView({ habit }: { habit: Habit }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const completedDates = useMemo(
    () => new Set(habit.completions.map(c => c.date)),
    [habit.completions]
  );

  const days = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 6),
  });

  const today = getLocalDate();

  return (
    <div>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
          &lt;
        </button>
        <span className={styles.weekLabel}>
          {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <button className={styles.navBtn} onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
          &gt;
        </button>
      </div>

      <div className={styles.days}>
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCompleted = completedDates.has(dateStr);
          const isToday = dateStr === today;

          return (
            <div key={dateStr} className={`${styles.day} ${isToday ? styles.today : ''}`}>
              <span className={styles.dayName}>{format(day, 'EEE')}</span>
              <span className={styles.dayNum}>{format(day, 'd')}</span>
              <CompletionToggle
                habitId={habit.id}
                date={dateStr}
                completed={isCompleted}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
