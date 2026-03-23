import { format, parseISO } from 'date-fns';
import styles from './HabitBreakdownCard.module.css';

interface Props {
  name: string;
  completions: number;
  rate: number;
  since?: string;
}

export default function HabitBreakdownCard({ name, completions, rate, since }: Props) {
  const pct = Math.min(100, Math.round(rate * 100));
  const sinceLabel = since ? `Since ${format(parseISO(since), 'MMM d, yyyy')}` : `${completions} completions`;

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <h4 className={styles.name}>{name}</h4>
        <p className={styles.detail}>{sinceLabel}</p>
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
