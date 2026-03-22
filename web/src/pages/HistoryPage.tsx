import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { format, subDays, subMonths, differenceInDays, parseISO } from 'date-fns';
import { GET_HABITS, GET_STATS } from '../graphql/queries';
import { getLocalDate } from '../utils/date';
import PageShell from '../components/layout/PageShell';
import MomentumHeatmap from '../components/history/MomentumHeatmap';
import StatCard from '../components/history/StatCard';
import HabitBreakdownCard from '../components/history/HabitBreakdownCard';
import styles from './HistoryPage.module.css';

type TimeRange = '7d' | 'month' | 'all';

interface Habit {
  id: string;
  createdAt: string;
  completions: { date: string; completedAt: string }[];
}

export default function HistoryPage() {
  const [range, setRange] = useState<TimeRange>('7d');

  const { data: habitsData } = useQuery(GET_HABITS);
  const habits: Habit[] = habitsData?.habits ?? [];

  const { startDate, days } = useMemo(() => {
    const today = new Date();
    if (range === '7d') {
      return { startDate: format(subDays(today, 6), 'yyyy-MM-dd'), days: 7 };
    }
    if (range === 'month') {
      return { startDate: format(subMonths(today, 1), 'yyyy-MM-dd'), days: 30 };
    }
    // All Time: earliest habit createdAt, heatmap capped at 365
    const earliest = habits.reduce((min, h) => {
      const d = h.createdAt?.split('T')[0];
      return d && d < min ? d : min;
    }, getLocalDate());
    const totalDays = differenceInDays(today, parseISO(earliest)) + 1;
    return { startDate: earliest, days: Math.min(totalDays, 365) };
  }, [range, habits]);

  const dateRange = useMemo(() => ({
    startDate,
    endDate: getLocalDate(),
  }), [startDate]);

  const { data: statsData, loading, error } = useQuery(GET_STATS, {
    variables: { dateRange },
  });

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
          {range === 'all' && habits.length > 0 && (
            <span className={styles.sinceLabel}>Since {format(parseISO(startDate), 'MMM d, yyyy')}</span>
          )}
        </div>
        <div className={styles.rangePicker}>
          {([['7d', 'Last 7 days'], ['month', 'This Month'], ['all', 'All Time']] as const).map(([key, label]) => (
            <button
              key={key}
              className={`${styles.rangeBtn} ${range === key ? styles.rangeBtnActive : ''}`}
              onClick={() => setRange(key as TimeRange)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className={styles.status}>Loading history...</p>}
      {error && <p className={styles.status}>Failed to load history.</p>}

      {!loading && habits.length > 0 && (
        <>
          <MomentumHeatmap habits={habits} days={days} />

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
                {stats.habitStats.map((hs: { habitId: string; habitName: string; totalCompletions: number; completionRate: number }) => {
                  const habit = habits.find(h => h.id === hs.habitId);
                  const since = habit?.createdAt?.split('T')[0];
                  return (
                    <HabitBreakdownCard
                      key={hs.habitId}
                      name={hs.habitName}
                      completions={hs.totalCompletions}
                      rate={hs.completionRate}
                      since={since}
                    />
                  );
                })}
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
