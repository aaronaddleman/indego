import styles from './HabitBreakdownCard.module.css';

interface Props {
  name: string;
  completions: number;
  total: number;
  rate: number;
}

export default function HabitBreakdownCard({ name, completions, total, rate }: Props) {
  const pct = Math.round(rate * 100);

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <h4 className={styles.name}>{name}</h4>
        <p className={styles.detail}>{completions}/{total} days</p>
      </div>
      <div className={styles.right}>
        <div className={styles.pctCol}>
          <span className={styles.pct}>{pct}%</span>
        </div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ height: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
