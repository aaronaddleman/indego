import { format, subDays } from 'date-fns';
import styles from './StreakChain.module.css';

interface Props {
  completionDates: Set<string>;
}

export default function StreakChain({ completionDates }: Props) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const isToday = i === 0;
    const completed = completionDates.has(dateStr);
    const dayLabel = isToday ? 'Today' : i === 1 ? 'Yesterday' : format(date, 'EEEE');
    const dateLabel = format(date, 'MMM d');
    return { dateStr, isToday, completed, dayLabel, dateLabel };
  });

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>The Weekly Link</h3>
        <span className={styles.badge}>Visual Timeline</span>
      </div>
      <div className={styles.chain}>
        {days.map((day, i) => (
          <div key={day.dateStr} className={`${styles.link} ${i < days.length - 1 && day.completed ? styles.linked : ''}`}>
            <div className={`${styles.icon} ${day.completed ? (day.isToday ? styles.iconToday : styles.iconCompleted) : styles.iconMissed}`}>
              <span className="material-symbols-outlined" style={day.completed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                {day.completed ? (day.isToday ? 'check_circle' : 'link') : 'link_off'}
              </span>
            </div>
            <div className={styles.info}>
              <div className={styles.dayRow}>
                <p className={styles.dayLabel}>{day.dayLabel}</p>
                {day.isToday && day.completed && (
                  <span className={styles.chip}>+1 Day</span>
                )}
              </div>
              <p className={styles.dateLabel}>{day.dateLabel}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
