import styles from './HabitBreakdownCard.module.css';

interface Props {
  name: string;
  completions: number;
  rate: number;
}

export default function HabitBreakdownCard({ name, completions, rate }: Props) {
  const pct = Math.min(100, Math.round(rate * 100));
  const expected = rate > 0 ? Math.round(completions / rate) : 0;

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <h4 className={styles.name}>{name}</h4>
        <p className={styles.detail}>{completions}/{expected} due days</p>
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
