import { useNavigate } from 'react-router-dom';
import CompletionToggle from './CompletionToggle';
import { useStreak } from '../../hooks/useStreak';
import styles from './HabitCard.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  name: string;
  frequency: { type: string; daysPerWeek?: number; specificDays?: string[] };
  completions: Completion[];
}

export default function HabitCard({ habit }: { habit: Habit }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = habit.completions.some(c => c.date === today);
  const currentStreak = useStreak(habit);

  return (
    <div
      className={styles.card}
      data-completed={isCompletedToday}
      onClick={() => navigate(`/habit/${habit.id}`)}
    >
      <div className={styles.info}>
        <h3 className={styles.name}>{habit.name}</h3>
        <span className={styles.streak}>
          {currentStreak > 0 ? `${currentStreak} day streak` : 'No streak'}
        </span>
      </div>
      <CompletionToggle habitId={habit.id} date={today} completed={isCompletedToday} />
    </div>
  );
}
