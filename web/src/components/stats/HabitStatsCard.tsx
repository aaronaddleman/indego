import styles from './HabitStatsCard.module.css';

interface Props {
  stats: {
    habitId: string;
    habitName: string;
    totalCompletions: number;
    longestStreak: number;
    completionRate: number;
  };
}

export default function HabitStatsCard({ stats }: Props) {
  const pct = Math.round(stats.completionRate * 100);

  return (
    <div className={styles.card}>
      <h3 className={styles.name}>{stats.habitName}</h3>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.value}>{pct}%</span>
          <span className={styles.label}>Rate</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.value}>{stats.totalCompletions}</span>
          <span className={styles.label}>Done</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.value}>{stats.longestStreak}</span>
          <span className={styles.label}>Best</span>
        </div>
      </div>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
