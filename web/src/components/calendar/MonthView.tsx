import { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import CompletionToggle from '../habits/CompletionToggle';
import styles from './MonthView.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  completions: Completion[];
}

export default function MonthView({ habit }: { habit: Habit }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const completedDates = useMemo(
    () => new Set(habit.completions.map(c => c.date)),
    [habit.completions]
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          &lt;
        </button>
        <span className={styles.monthLabel}>{format(currentMonth, 'MMMM yyyy')}</span>
        <button className={styles.navBtn} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          &gt;
        </button>
      </div>

      <div className={styles.weekdays}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <span key={d} className={styles.weekday}>{d}</span>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, currentMonth);
          const isCompleted = completedDates.has(dateStr);
          const isToday = dateStr === today;

          return (
            <div key={dateStr} className={`${styles.cell} ${!inMonth ? styles.outside : ''}`}>
              <span className={`${styles.dayNum} ${isToday ? styles.today : ''}`}>
                {format(day, 'd')}
              </span>
              {inMonth && (
                <CompletionToggle
                  habitId={habit.id}
                  date={dateStr}
                  completed={isCompleted}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
