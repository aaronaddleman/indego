import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_HABITS } from '../graphql/queries';
import { useStreak } from '../hooks/useStreak';
import PageShell from '../components/layout/PageShell';
import MiniChain from '../components/streaks/MiniChain';
import styles from './StreaksPage.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  name: string;
  frequency: { type: string; daysOfWeek?: string[]; dueDays?: string[]; daysPerWeek?: number; specificDays?: string[] };
  completions: Completion[];
  longestStreak?: number;
}

function HabitStreakCard({ habit }: { habit: Habit }) {
  const streaks = useStreak(habit);
  const completionDates = useMemo(() => new Set(habit.completions.map(c => c.date)), [habit.completions]);
  const best = Math.max(streaks.longest, habit.longestStreak ?? 0);

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div className={styles.info}>
          <h3 className={styles.habitName}>{habit.name}</h3>
          {streaks.current > 0 && (
            <div className={styles.activeBadge}>
              <span className={`material-symbols-outlined ${styles.fireIcon}`}>local_fire_department</span>
              {streaks.current} day streak
            </div>
          )}
        </div>
        <div className={styles.numbers}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{streaks.current}</span>
            <span className={styles.statLabel}>Current</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{best}</span>
            <span className={styles.statLabel}>Best</span>
          </div>
        </div>
      </div>
      <MiniChain completionDates={completionDates} />
    </div>
  );
}

export default function StreaksPage() {
  const { data, loading, error } = useQuery(GET_HABITS);
  const habits: Habit[] = data?.habits ?? [];

  return (
    <PageShell title="Streaks">
      <div className={styles.headerSection}>
        <span className={styles.eyebrow}>Consistency</span>
        <h1 className={styles.pageTitle}>Streaks</h1>
      </div>

      {loading && <p className={styles.status}>Loading streaks...</p>}
      {error && <p className={styles.status}>Failed to load streaks.</p>}

      {!loading && habits.length === 0 && (
        <p className={styles.status}>Create some habits to track streaks.</p>
      )}

      <div className={styles.habitList}>
        {habits.map(habit => (
          <HabitStreakCard key={habit.id} habit={habit} />
        ))}
      </div>
    </PageShell>
  );
}
