import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { format } from 'date-fns';
import { GET_HABIT } from '../graphql/queries';
import { LOG_COMPLETION, UNDO_COMPLETION } from '../graphql/mutations';
import WeekStrip from '../components/calendar/WeekStrip';
import CompleteButton from '../components/habits/CompleteButton';
import HabitForm from '../components/habits/HabitForm';
import { useStreak } from '../hooks/useStreak';
import styles from './HabitDetailPage.module.css';

function formatFrequency(frequency: { type: string; daysPerWeek?: number; specificDays?: string[] }): string {
  switch (frequency.type) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return `${frequency.daysPerWeek}x per week`;
    case 'CUSTOM':
      return frequency.specificDays?.map(d => d.slice(0, 3)).join(', ') || 'Custom';
    default:
      return frequency.type;
  }
}

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading: queryLoading, error } = useQuery(GET_HABIT, { variables: { id } });
  const [showEdit, setShowEdit] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const habit = data?.habit;
  const currentStreak = useStreak(habit);
  const completedToday = habit?.completions.some((c: { date: string }) => c.date === today) ?? false;

  const [logCompletion, { loading: logging }] = useMutation(LOG_COMPLETION);
  const [undoCompletion, { loading: undoing }] = useMutation(UNDO_COMPLETION);
  const mutationLoading = logging || undoing;

  const handleCompleteToggle = async () => {
    if (!id || mutationLoading) return;
    if (completedToday) {
      await undoCompletion({ variables: { habitId: id, date: today } });
    } else {
      await logCompletion({ variables: { habitId: id, date: today } });
    }
  };

  if (queryLoading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading...</p>
      </div>
    );
  }

  if (error || !habit) {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="Back to habits">
          ← Back
        </button>
        <p className={styles.error}>Habit not found.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="Back to habits">
        ←
      </button>

      <div className={styles.hero}>
        <h1 className={styles.habitName}>{habit.name}</h1>
        <p className={styles.frequency}>{formatFrequency(habit.frequency)}</p>
      </div>

      <div className={styles.streaks}>
        <div className={styles.streakItem}>
          <span className={styles.streakNumber}>{currentStreak}</span>
          <span className={styles.streakLabel}>current</span>
        </div>
        <div className={styles.streakItem}>
          <span className={styles.streakNumber}>{habit.longestStreak}</span>
          <span className={styles.streakLabel}>longest</span>
        </div>
      </div>

      <WeekStrip habitId={habit.id} completions={habit.completions} />

      <div className={styles.completeSection}>
        <CompleteButton
          completed={completedToday}
          onToggle={handleCompleteToggle}
          loading={mutationLoading}
        />
      </div>

      <div className={styles.actionBar}>
        <button className={styles.actionBtn} onClick={() => setShowEdit(true)} aria-label="Edit habit">
          ✏️ Edit
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => navigate(`/habit/${id}/history`)}
          aria-label="View history"
        >
          📅 History
        </button>
      </div>

      {showEdit && (
        <HabitForm habit={habit} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
