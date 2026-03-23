import { useNavigate } from 'react-router-dom';
import CompletionToggle from './CompletionToggle';
import { useStreak } from '../../hooks/useStreak';
import { getLocalDate } from '../../utils/date';
import styles from './HabitCard.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  name: string;
  frequency: { type: string; daysOfWeek?: string[]; dueDays?: string[]; daysPerWeek?: number; specificDays?: string[] };
  completions: Completion[];
}

export default function HabitCard({ habit }: { habit: Habit }) {
  const navigate = useNavigate();
  const today = getLocalDate();
  const isCompletedToday = habit.completions.some(c => c.date === today);
  const streaks = useStreak(habit);
  const streakUnit = habit.frequency.type === 'WEEKLY' ? 'week' : 'day';

  return (
    <div
      className={`${styles.card} ${isCompletedToday ? styles.completed : ''}`}
      onClick={() => navigate(`/streaks/${habit.id}`)}
    >
      <div className={styles.info}>
        <h3 className={`${styles.name} ${isCompletedToday ? styles.nameCompleted : ''}`}>
          {habit.name}
        </h3>
        <span className={styles.streak}>
          {streaks.current > 0 ? `${streaks.current} ${streakUnit} streak` : 'No streak'}
        </span>
      </div>
      <CompletionToggle habitId={habit.id} date={today} completed={isCompletedToday} />
    </div>
  );
}
