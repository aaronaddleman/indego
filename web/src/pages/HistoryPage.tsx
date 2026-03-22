import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { format, subDays, subMonths } from 'date-fns';
import { GET_HABITS, GET_STATS } from '../graphql/queries';
import { getLocalDate } from '../utils/date';
import PageShell from '../components/layout/PageShell';
import MomentumHeatmap from '../components/history/MomentumHeatmap';
import StatCard from '../components/history/StatCard';
import HabitBreakdownCard from '../components/history/HabitBreakdownCard';
import styles from './HistoryPage.module.css';

type TimeRange = '7d' | 'month' | 'all';

const RANGE_CONFIG: Record<TimeRange, { label: string; days: number; getStart: () => string }> = {
  '7d': { label: 'Last 7 days', days: 7, getStart: () => format(subDays(new Date(), 6), 'yyyy-MM-dd') },
  'month': { label: 'This Month', days: 30, getStart: () => format(subMonths(new Date(), 1), 'yyyy-MM-dd') },
  'all': { label: 'All Time', days: 90, getStart: () => '2020-01-01' },
};

export default function HistoryPage() {
  const [range, setRange] = useState<TimeRange>('7d');
  const config = RANGE_CONFIG[range];

  const dateRange = useMemo(() => ({
    startDate: config.getStart(),
    endDate: getLocalDate(),
  }), [config]);

  const { data: habitsData } = useQuery(GET_HABITS);
  const { data: statsData, loading, error } = useQuery(GET_STATS, {
    variables: { dateRange },
  });

  const habits = habitsData?.habits ?? [];
  const stats = statsData?.stats;

  const peakStreak = useMemo(() => {
    if (!stats?.habitStats) return 0;
    return Math.max(0, ...stats.habitStats.map((h: { longestStreak: number }) => h.longestStreak));
  }, [stats]);

  const overallRate = useMemo(() => {
    if (!stats?.habitStats?.length) return 0;
    const rates = stats.habitStats.map((h: { completionRate: number }) => h.completionRate);
    return Math.round((rates.reduce((a: number, b: number) => a + b, 0) / rates.length) * 100);
  }, [stats]);

  return (
    <PageShell title="History">
      <div className={styles.headerSection}>
        <div>
          <span className={styles.eyebrow}>Performance</span>
          <h1 className={styles.pageTitle}>Habit History</h1>
        </div>
        <div className={styles.rangePicker}>
          {(Object.entries(RANGE_CONFIG) as [TimeRange, typeof config][]).map(([key, cfg]) => (
            <button
              key={key}
              className={`${styles.rangeBtn} ${range === key ? styles.rangeBtnActive : ''}`}
              onClick={() => setRange(key)}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className={styles.status}>Loading history...</p>}
      {error && <p className={styles.status}>Failed to load history.</p>}

      {!loading && habits.length > 0 && (
        <>
          <MomentumHeatmap habits={habits} days={config.days} />

          <div className={styles.statGrid}>
            <StatCard icon="local_fire_department" value={peakStreak} label="Day Peak Streak" color="tertiary" />
            <StatCard icon="verified" value={`${overallRate}%`} label="Completion Rate" color="primary" />
          </div>

          {stats?.habitStats && stats.habitStats.length > 0 && (
            <section>
              <div className={styles.breakdownHeader}>
                <h2 className={styles.sectionTitle}>Habit Breakdown</h2>
              </div>
              <div className={styles.breakdownList}>
                {stats.habitStats.map((hs: { habitId: string; habitName: string; totalCompletions: number; completionRate: number }) => (
                  <HabitBreakdownCard
                    key={hs.habitId}
                    name={hs.habitName}
                    completions={hs.totalCompletions}
                    total={config.days}
                    rate={hs.completionRate}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!loading && habits.length === 0 && (
        <p className={styles.status}>Create some habits to see your history.</p>
      )}
    </PageShell>
  );
}
