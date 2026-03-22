import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { format } from 'date-fns';
import { GET_HABITS } from '../graphql/queries';
import { getLocalDate } from '../utils/date';
import HabitList from '../components/habits/HabitList';
import HabitForm from '../components/habits/HabitForm';
import ProgressRing from '../components/dashboard/ProgressRing';
import StreakBanner from '../components/dashboard/StreakBanner';
import PageShell from '../components/layout/PageShell';
import EmptyState from '../components/common/EmptyState';
import styles from './DashboardPage.module.css';

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

function useBestStreak(habits: Habit[]): { current: number; best: number } {
  return useMemo(() => {
    let maxCurrent = 0;
    let maxBest = 0;

    for (const habit of habits) {
      const dates = habit.completions.map(c => c.date).sort();
      // Simple current streak: count consecutive days ending at today or yesterday
      let current = 0;
      const dateSet = new Set(dates);
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const check = getLocalDate(d);
        if (dateSet.has(check)) {
          current++;
          d.setDate(d.getDate() - 1);
        } else if (i === 0) {
          // today not completed, check from yesterday
          d.setDate(d.getDate() - 1);
          continue;
        } else {
          break;
        }
      }
      if (current > maxCurrent) maxCurrent = current;
      const best = Math.max(habit.longestStreak ?? 0, current);
      if (best > maxBest) maxBest = best;
    }

    return { current: maxCurrent, best: maxBest };
  }, [habits]);
}

export default function DashboardPage() {
  const { data, loading, error } = useQuery(GET_HABITS);
  const [showForm, setShowForm] = useState(false);

  const today = getLocalDate();
  const habits: Habit[] = data?.habits ?? [];

  const completedCount = useMemo(
    () => habits.filter(h => h.completions.some(c => c.date === today)).length,
    [habits, today]
  );

  const streakInfo = useBestStreak(habits);

  return (
    <PageShell title="Today">
      <header className={styles.dateHeader}>
        <h1 className={styles.dateTitle}>{format(new Date(), 'MMM d, yyyy')}</h1>
      </header>

      {loading && <p className={styles.status}>Loading habits...</p>}
      {error && <p className={styles.error}>Failed to load habits.</p>}

      {!loading && !error && habits.length > 0 && (
        <>
          <div className={styles.heroGrid}>
            <ProgressRing completed={completedCount} total={habits.length} />
            <StreakBanner current={streakInfo.current} best={streakInfo.best} />
          </div>

          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Active Habits</h2>
            <span className={styles.sectionHint}>Check to Complete</span>
          </div>

          <HabitList habits={habits} />
        </>
      )}

      {!loading && !error && habits.length === 0 && (
        <EmptyState
          message="No habits yet. Create your first one!"
          action={() => setShowForm(true)}
          actionLabel="Create Habit"
        />
      )}

      {/* FAB */}
      {habits.length > 0 && (
        <button
          className={styles.fab}
          onClick={() => setShowForm(true)}
          aria-label="Add new habit"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      )}

      {showForm && (
        <HabitForm onClose={() => setShowForm(false)} />
      )}
    </PageShell>
  );
}
