import { useMemo } from 'react';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import styles from './MomentumHeatmap.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  completions: Completion[];
}

interface Props {
  habits: Habit[];
  days: number;
}

function getIntensityClass(ratio: number): string {
  if (ratio === 0) return styles.level0;
  if (ratio <= 0.25) return styles.level1;
  if (ratio <= 0.5) return styles.level2;
  if (ratio <= 0.75) return styles.level3;
  return styles.level4;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MomentumHeatmap({ habits, days }: Props) {
  const { cells, weekLabels } = useMemo(() => {
    const totalHabits = habits.length;
    const today = new Date();

    // Build a map of date -> completion count
    const countByDate = new Map<string, number>();
    for (const habit of habits) {
      for (const c of habit.completions) {
        countByDate.set(c.date, (countByDate.get(c.date) ?? 0) + 1);
      }
    }

    // Align to start of week (Monday)
    const endDate = today;
    const rawStart = subDays(endDate, days - 1);
    const startDate = startOfWeek(rawStart, { weekStartsOn: 1 });

    const cells: { date: string; ratio: number; isToday: boolean }[] = [];
    const todayStr = format(today, 'yyyy-MM-dd');
    let d = startDate;
    while (d <= endDate) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const count = countByDate.get(dateStr) ?? 0;
      const ratio = totalHabits > 0 ? count / totalHabits : 0;
      cells.push({ date: dateStr, ratio, isToday: dateStr === todayStr });
      d = addDays(d, 1);
    }

    // Pad to fill last week
    while (cells.length % 7 !== 0) {
      cells.push({ date: '', ratio: 0, isToday: false });
    }

    const weekLabels = DAY_LABELS;
    return { cells, weekLabels };
  }, [habits, days]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Momentum Heatmap</h2>
        <div className={styles.legend}>
          <span className={styles.legendLabel}>Less</span>
          <div className={styles.legendCells}>
            <div className={`${styles.legendCell} ${styles.level0}`} />
            <div className={`${styles.legendCell} ${styles.level1}`} />
            <div className={`${styles.legendCell} ${styles.level2}`} />
            <div className={`${styles.legendCell} ${styles.level4}`} />
          </div>
          <span className={styles.legendLabel}>More</span>
        </div>
      </div>
      <div className={styles.dayLabels}>
        {weekLabels.map(d => (
          <span key={d} className={styles.dayLabel}>{d}</span>
        ))}
      </div>
      <div className={styles.grid}>
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`${styles.cell} ${getIntensityClass(cell.ratio)} ${cell.isToday ? styles.today : ''}`}
            title={cell.date ? `${cell.date}: ${Math.round(cell.ratio * 100)}%` : ''}
          />
        ))}
      </div>
    </div>
  );
}
