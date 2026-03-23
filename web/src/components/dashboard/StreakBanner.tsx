import styles from './StreakBanner.module.css';

interface Props {
  current: number;
  best: number;
}

export default function StreakBanner({ current, best }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={`material-symbols-outlined ${styles.fireIcon}`}>local_fire_department</span>
          <span className={styles.headerLabel}>Active Streak</span>
        </div>
        <h2 className={styles.count}>{current}</h2>
        <p className={styles.subtitle}>
          {current === 1 ? 'Day of consistency' : 'Days of consistency'}
        </p>
        <div className={styles.bestBadge}>
          Personal Best: {best}
        </div>
      </div>
      <span className={`material-symbols-outlined ${styles.bgIcon}`}>auto_graph</span>
    </div>
  );
}
