import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_HABITS } from '../graphql/queries';
import { useStreak } from '../hooks/useStreak';
import PageShell from '../components/layout/PageShell';
import HabitSubNav from '../components/layout/HabitSubNav';
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

function HabitStreakRow({ habit }: { habit: Habit }) {
  const navigate = useNavigate();
  const streaks = useStreak(habit);
  const best = Math.max(streaks.longest, habit.longestStreak ?? 0);

  return (
    <button className={styles.card} onClick={() => navigate(`/habits/streaks/${habit.id}`)}>
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
      <span className={`material-symbols-outlined ${styles.chevron}`}>chevron_right</span>
    </button>
  );
}

export default function StreaksPage() {
  const { data, loading, error } = useQuery(GET_HABITS);
  const habits: Habit[] = data?.habits ?? [];

  return (
    <PageShell title="Streaks" subNav={<HabitSubNav />}>
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
          <HabitStreakRow key={habit.id} habit={habit} />
        ))}
      </div>
    </PageShell>
  );
}
