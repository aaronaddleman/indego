import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { format, parseISO } from 'date-fns';
import { GET_HABIT, GET_HABITS } from '../graphql/queries';
import { DELETE_HABIT } from '../graphql/mutations';
import CalendarTabs from '../components/calendar/CalendarTabs';
import StreakBadge from '../components/common/StreakBadge';
import HabitForm from '../components/habits/HabitForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PageShell from '../components/layout/PageShell';
import { useStreak } from '../hooks/useStreak';
import styles from './HabitDetailPage.module.css';

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_HABIT, { variables: { id } });
  const [deleteHabit] = useMutation(DELETE_HABIT, {
    refetchQueries: [{ query: GET_HABITS }],
  });
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const habit = data?.habit;
  const currentStreak = useStreak(habit);

  const handleDelete = async () => {
    if (!id) return;
    await deleteHabit({ variables: { id } });
    navigate('/');
  };

  if (loading) return <PageShell title="Loading..."><p>Loading...</p></PageShell>;
  if (error || !habit) return <PageShell title="Error"><p>Habit not found.</p></PageShell>;

  return (
    <PageShell title={habit.name}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{habit.name}</h1>
          <p className={styles.frequency}>
            {habit.frequency.type}
            {habit.frequency.daysPerWeek && ` (${habit.frequency.daysPerWeek}x/week)`}
            {habit.frequency.specificDays && ` (${habit.frequency.specificDays.join(', ')})`}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.editBtn} onClick={() => setShowEdit(true)}>Edit</button>
          <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      </div>

      <div className={styles.streaks}>
        <StreakBadge label="Current Streak" value={currentStreak} />
        <StreakBadge label="Longest Streak" value={habit.longestStreak} />
      </div>

      <CalendarTabs habit={habit} />

      <div className={styles.historySection}>
        <h2 className={styles.historyTitle}>Completion History</h2>
        {habit.completions.length === 0 ? (
          <p className={styles.historyEmpty}>No completions yet.</p>
        ) : (
          <div className={styles.historyList}>
            {[...habit.completions]
              .sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date))
              .map((c: { date: string; completedAt: string }) => (
                <div key={c.date} className={styles.historyItem}>
                  <span className={styles.historyDate}>
                    {format(parseISO(c.date), 'EEE, MMM d, yyyy')}
                  </span>
                  <span className={styles.historyTime}>
                    {format(parseISO(c.completedAt), 'h:mm a')}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {showEdit && (
        <HabitForm habit={habit} onClose={() => setShowEdit(false)} />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Habit"
          message={`Are you sure you want to delete "${habit.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </PageShell>
  );
}
