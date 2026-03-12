import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_HABITS } from '../graphql/queries';
import HabitList from '../components/habits/HabitList';
import HabitForm from '../components/habits/HabitForm';
import PageShell from '../components/layout/PageShell';
import EmptyState from '../components/common/EmptyState';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { data, loading, error } = useQuery(GET_HABITS);
  const [showForm, setShowForm] = useState(false);

  return (
    <PageShell title="Today's Habits">
      <div className={styles.header}>
        <h1 className={styles.title}>Today's Habits</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>
          + New Habit
        </button>
      </div>

      {loading && <p className={styles.status}>Loading habits...</p>}
      {error && <p className={styles.error}>Failed to load habits.</p>}

      {data?.habits.length === 0 && !loading && (
        <EmptyState
          message="No habits yet. Create your first one!"
          action={() => setShowForm(true)}
          actionLabel="Create Habit"
        />
      )}

      {data?.habits && data.habits.length > 0 && (
        <HabitList habits={data.habits} />
      )}

      {showForm && (
        <HabitForm onClose={() => setShowForm(false)} />
      )}
    </PageShell>
  );
}
