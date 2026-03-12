import HabitCard from './HabitCard';
import styles from './HabitList.module.css';

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

export default function HabitList({ habits }: { habits: Habit[] }) {
  return (
    <div className={styles.list}>
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} />
      ))}
    </div>
  );
}
