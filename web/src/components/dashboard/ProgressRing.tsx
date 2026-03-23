import styles from './ProgressRing.module.css';

interface Props {
  completed: number;
  total: number;
}

export default function ProgressRing({ completed, total }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.ringWrap}>
        <svg className={styles.ring} viewBox="0 0 36 36">
          <path
            className={styles.track}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={styles.fill}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            strokeDasharray={`${pct}, 100`}
          />
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary, #006c49)" />
              <stop offset="100%" stopColor="var(--color-primary-container, #10b981)" />
            </linearGradient>
          </defs>
        </svg>
        <div className={styles.label}>
          <span className={styles.pct}>{pct}</span>
          <span className={styles.pctSign}>%</span>
        </div>
      </div>
      <div className={styles.caption}>
        <p className={styles.captionTitle}>Today's Progress</p>
        <p className={styles.captionDetail}>{completed} of {total} Habits</p>
      </div>
    </div>
  );
}
