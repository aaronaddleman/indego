import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_HABITS } from '../graphql/queries';
import { useStreak } from '../hooks/useStreak';
import PageShell from '../components/layout/PageShell';
import StreakChain from '../components/streaks/StreakChain';
import MotivationalBanner from '../components/streaks/MotivationalBanner';
import StreakInsights from '../components/streaks/StreakInsights';
import styles from './StreaksPage.module.css';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  name: string;
  frequency: { type: string; daysOfWeek?: string[]; dueDays?: string[]; daysPerWeek?: number; specificDays?: string[] };
  completions: Completion[];
  longestStreak?: number;
}

function HabitStreakRow({ habit, isSelected, onSelect }: { habit: Habit; isSelected: boolean; onSelect: () => void }) {
  const streaks = useStreak(habit);
  const completionDates = useMemo(() => new Set(habit.completions.map(c => c.date)), [habit.completions]);

  return (
    <div className={styles.habitSection}>
      <button className={`${styles.habitRow} ${isSelected ? styles.habitRowActive : ''}`} onClick={onSelect}>
        <div className={styles.habitInfo}>
          <h3 className={styles.habitName}>{habit.name}</h3>
          <span className={styles.habitMeta}>
            {streaks.current > 0 ? `${streaks.current} day streak` : 'No active streak'}
          </span>
        </div>
        <div className={styles.streakStats}>
          <div className={styles.streakStat}>
            <span className={styles.streakNumber}>{streaks.current}</span>
            <span className={styles.streakLabel}>Current</span>
          </div>
          <div className={styles.streakStat}>
            <span className={styles.streakNumber}>{Math.max(streaks.longest, habit.longestStreak ?? 0)}</span>
            <span className={styles.streakLabel}>Best</span>
          </div>
        </div>
        <span className={`material-symbols-outlined ${styles.chevron} ${isSelected ? styles.chevronOpen : ''}`}>
          expand_more
        </span>
      </button>

      {isSelected && (
        <div className={styles.detail}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCard}>
              <div className={styles.heroCardHeader}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'var(--color-tertiary, #855300)' }}>
                  local_fire_department
                </span>
                <span className={styles.heroBadge} data-color="tertiary">Active</span>
              </div>
              <div className={styles.heroCardBody}>
                <span className={styles.heroNumber}>{streaks.current}</span>
                <span className={styles.heroLabel}>Current Streak</span>
              </div>
            </div>
            <div className={`${styles.heroCard} ${styles.heroCardAlt}`}>
              <div className={styles.heroCardHeader}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary, #006c49)' }}>
                  workspace_premium
                </span>
                <span className={styles.heroBadge} data-color="primary">Record</span>
              </div>
              <div className={styles.heroCardBody}>
                <span className={styles.heroNumber}>{Math.max(streaks.longest, habit.longestStreak ?? 0)}</span>
                <span className={styles.heroLabel}>Longest Streak</span>
              </div>
            </div>
          </div>

          {streaks.current > 0 && <MotivationalBanner currentStreak={streaks.current} />}

          <StreakChain completionDates={completionDates} />

          <StreakInsights completions={habit.completions} frequency={habit.frequency} />
        </div>
      )}
    </div>
  );
}

export default function StreaksPage() {
  const { data, loading, error } = useQuery(GET_HABITS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const habits: Habit[] = data?.habits ?? [];

  return (
    <PageShell title="Streaks">
      <div className={styles.headerSection}>
        <span className={styles.eyebrow}>Consistency</span>
        <h1 className={styles.pageTitle}>Streaks</h1>
      </div>

      {loading && <p className={styles.status}>Loading streaks...</p>}
      {error && <p className={styles.status}>Failed to load streaks.</p>}

      {!loading && habits.length === 0 && (
        <p className={styles.status}>Create some habits to track streaks.</p>
      )}

      <div className={styles.habitList}>
        {habits.map(habit => (
          <HabitStreakRow
            key={habit.id}
            habit={habit}
            isSelected={selectedId === habit.id}
            onSelect={() => setSelectedId(selectedId === habit.id ? null : habit.id)}
          />
        ))}
      </div>
    </PageShell>
  );
}
