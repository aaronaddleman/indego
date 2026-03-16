import { useState } from 'react';
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
  setMonth,
  setYear,
  getMonth,
  getYear,
} from 'date-fns';
import CompletionToggle from '../habits/CompletionToggle';
import MonthPicker from './MonthPicker';
import YearPicker from './YearPicker';
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
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const completedDates = new Set(habit.completions.map(c => c.date));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const today = format(new Date(), 'yyyy-MM-dd');

  // Compute min year from completions
  const sortedDates = habit.completions.map(c => c.date).sort();
  const minYear = sortedDates.length > 0
    ? parseInt(sortedDates[0].split('-')[0])
    : getYear(new Date());

  const handleMonthSelect = (month: number) => {
    setCurrentMonth(setMonth(currentMonth, month));
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setShowYearPicker(false);
  };

  if (showMonthPicker) {
    return (
      <div>
        <div className={styles.header}>
          <button
            className={styles.pickerBackBtn}
            onClick={() => setShowMonthPicker(false)}
          >
            ←
          </button>
          <span className={styles.monthLabel}>Select Month</span>
          <span />
        </div>
        <MonthPicker
          selectedMonth={getMonth(currentMonth)}
          onSelect={handleMonthSelect}
        />
      </div>
    );
  }

  if (showYearPicker) {
    return (
      <div>
        <div className={styles.header}>
          <button
            className={styles.pickerBackBtn}
            onClick={() => setShowYearPicker(false)}
          >
            ←
          </button>
          <span className={styles.monthLabel}>Select Year</span>
          <span />
        </div>
        <YearPicker
          selectedYear={getYear(currentMonth)}
          minYear={minYear}
          onSelect={handleYearSelect}
        />
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <button className={styles.navBtn} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          &lt;
        </button>
        <span className={styles.monthLabel}>
          <button
            className={styles.monthBtn}
            onClick={() => setShowMonthPicker(true)}
            aria-label="Select month"
          >
            {format(currentMonth, 'MMMM')}
          </button>
          {' '}
          <button
            className={styles.yearBtn}
            onClick={() => setShowYearPicker(true)}
            aria-label="Select year"
          >
            {format(currentMonth, 'yyyy')}
          </button>
        </span>
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
