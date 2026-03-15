import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { format } from 'date-fns';
import { GET_HABIT } from '../graphql/queries';
import CalendarTabs from '../components/calendar/CalendarTabs';
import { computeStreaks } from '../hooks/streakCalc';
import { writeLongestStreak } from '../hooks/useLongestStreakSync';
import { useAuth } from '../auth/useAuth';
import styles from './HabitHistoryPage.module.css';

export default function HabitHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_HABIT, { variables: { id } });
  const { user } = useAuth();

  const habit = data?.habit;

  // Use refs to hold latest data for the cleanup function
  const habitRef = useRef(habit);
  const userRef = useRef(user);

  useEffect(() => {
    habitRef.current = habit;
  }, [habit]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Deferred write: recompute and sync longestStreak on unmount
  useEffect(() => {
    return () => {
      const h = habitRef.current;
      const u = userRef.current;
      if (!h || !u?.uid) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      const { longest } = computeStreaks(h.completions, h.frequency, today);
      if (longest !== h.longestStreak) {
        void writeLongestStreak(u.uid, h.id, longest);
      }
    };
  }, []);

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
