import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_HABIT } from '../graphql/queries';
import CalendarTabs from '../components/calendar/CalendarTabs';
import styles from './HabitHistoryPage.module.css';

export default function HabitHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_HABIT, { variables: { id } });

  const habit = data?.habit;

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading...</p>
      </div>
    );
  }

  if (error || !habit) {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate(`/habit/${id}`)} aria-label="Back to habit">
          ← Back
        </button>
        <p className={styles.error}>Habit not found.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate(`/habit/${id}`)} aria-label="Back to habit">
        ←
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.habitName}>{habit.name}</p>
      </div>

      <CalendarTabs habit={habit} />
    </div>
  );
}
