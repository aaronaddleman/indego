import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import styles from './StreakInsights.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Props {
  completions: Completion[];
  frequency: { type: string; daysOfWeek?: string[]; dueDays?: string[] };
}

export default function StreakInsights({ completions, frequency }: Props) {
  const { rate, totalSessions, missedDays } = useMemo(() => {
    const today = new Date();
    const dueDays = frequency.dueDays ?? frequency.daysOfWeek;

    let expected = 0;
    let completed = 0;
    const completionDates = new Set(completions.map(c => c.date));

    for (let i = 0; i < 30; i++) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayName = format(d, 'EEEE').toLowerCase();
      const isDue = !dueDays || dueDays.length === 0 || dueDays.includes(dayName);

      if (isDue) {
        expected++;
        if (completionDates.has(dateStr)) completed++;
      }
    }

    const rate = expected > 0 ? completed / expected : 0;
    return { rate, totalSessions: completed, missedDays: expected - completed };
  }, [completions, frequency]);

  const pct = Math.round(rate * 100);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h4 className={styles.title}>Insights</h4>
        <span className={styles.period}>30D Analysis</span>
      </div>

      <div className={styles.rateRow}>
        <div>
          <p className={styles.label}>Completion Rate</p>
          <p className={styles.rateValue}>{pct.toFixed(1)}%</p>
        </div>
        <div className={styles.miniRing}>
          <svg viewBox="0 0 64 64" className={styles.ringSvg}>
            <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-surface-container-highest, #dde4dd)" strokeWidth="6" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-primary, #006c49)" strokeWidth="6"
              strokeDasharray={`${pct * 1.76} ${176 - pct * 1.76}`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)" />
          </svg>
          <span className={styles.miniRingLabel}>{pct}%</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div>
          <p className={styles.label}>Total Sessions</p>
          <p className={styles.statValue}>{totalSessions}</p>
        </div>
        <div>
          <p className={styles.label}>Missed Days</p>
          <p className={`${styles.statValue} ${styles.missed}`}>{missedDays}</p>
        </div>
      </div>
    </section>
  );
}
