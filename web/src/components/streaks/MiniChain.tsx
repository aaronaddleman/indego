import { format, subDays } from 'date-fns';
import styles from './MiniChain.module.css';

interface Props {
  completionDates: Set<string>;
}

const DAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function MiniChain({ completionDates }: Props) {
  const today = new Date();
  // Build last 7 days, oldest first
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const completed = completionDates.has(dateStr);
    const isToday = i === 6;
    const dayIndex = (date.getDay() + 6) % 7; // Monday=0
    return { dateStr, completed, isToday, initial: DAY_INITIALS[dayIndex] };
  });

  return (
    <div className={styles.chain}>
      {days.map((day, i) => (
        <div key={day.dateStr} className={styles.dayCol}>
          <span className={styles.dayInitial}>{day.initial}</span>
          <div className={`${styles.dot} ${day.completed ? styles.filled : ''} ${day.isToday ? styles.today : ''}`} />
          {i < 6 && (
            <div className={`${styles.connector} ${day.completed && days[i + 1].completed ? styles.connectorActive : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}
