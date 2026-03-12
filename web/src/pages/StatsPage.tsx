import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { format, subDays } from 'date-fns';
import { GET_STATS } from '../graphql/queries';
import StatsOverview from '../components/stats/StatsOverview';
import HabitStatsCard from '../components/stats/HabitStatsCard';
import PageShell from '../components/layout/PageShell';
import styles from './StatsPage.module.css';

export default function StatsPage() {
  const dateRange = useMemo(() => ({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  }), []);

  const { data, loading, error } = useQuery(GET_STATS, {
    variables: { dateRange },
  });

  return (
    <PageShell title="Stats">
      <h1 className={styles.title}>Stats</h1>
      <p className={styles.range}>Last 7 days</p>

      {loading && <p className={styles.status}>Loading stats...</p>}
      {error && <p className={styles.error}>Failed to load stats.</p>}

      {data?.stats && (
        <>
          <StatsOverview stats={data.stats} />
          <h2 className={styles.sectionTitle}>Per Habit</h2>
          <div className={styles.habitStats}>
            {data.stats.habitStats.map((hs: { habitId: string; habitName: string; totalCompletions: number; longestStreak: number; completionRate: number }) => (
              <HabitStatsCard key={hs.habitId} stats={hs} />
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
