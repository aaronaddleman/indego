import { useState } from 'react';
import MonthView from './MonthView';
import WeekView from './WeekView';
import styles from './CalendarTabs.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  name: string;
  completions: Completion[];
}

export default function CalendarTabs({ habit }: { habit: Habit }) {
  const [tab, setTab] = useState<'month' | 'week'>('month');

  return (
    <div>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'month' ? styles.active : ''}`}
          onClick={() => setTab('month')}
        >
          Month
        </button>
        <button
          className={`${styles.tab} ${tab === 'week' ? styles.active : ''}`}
          onClick={() => setTab('week')}
        >
          Week
        </button>
      </div>

      {tab === 'month' ? (
        <MonthView habit={habit} />
      ) : (
        <WeekView habit={habit} />
      )}
    </div>
  );
}
