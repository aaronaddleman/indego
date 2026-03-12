import styles from './StatsOverview.module.css';

interface Props {
  stats: {
    totalHabits: number;
    totalCompletions: number;
  };
}

export default function StatsOverview({ stats }: Props) {
  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <span className={styles.value}>{stats.totalHabits}</span>
        <span className={styles.label}>Total Habits</span>
      </div>
      <div className={styles.card}>
        <span className={styles.value}>{stats.totalCompletions}</span>
        <span className={styles.label}>Completions</span>
      </div>
    </div>
  );
}
