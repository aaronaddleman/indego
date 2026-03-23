import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { GET_HABIT } from '../graphql/queries';
import { LOG_COMPLETION, UNDO_COMPLETION } from '../graphql/mutations';
import { useStreak } from '../hooks/useStreak';
import { getLocalDate } from '../utils/date';
import PageShell from '../components/layout/PageShell';
import CompleteButton from '../components/habits/CompleteButton';
import StreakChain from '../components/streaks/StreakChain';
import MotivationalBanner from '../components/streaks/MotivationalBanner';
import StreakInsights from '../components/streaks/StreakInsights';
import styles from './StreakDetailPage.module.css';

export default function StreakDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_HABIT, { variables: { id } });

  const habit = data?.habit;
  const streaks = useStreak(habit);
  const today = getLocalDate();
  const completionDates = useMemo<Set<string>>(
    () => new Set((habit?.completions ?? []).map((c: { date: string }) => c.date)),
    [habit?.completions]
  );
  const isCompletedToday = completionDates.has(today);
  const best = Math.max(streaks.longest, habit?.longestStreak ?? 0);

  const [logCompletion, { loading: logging }] = useMutation(LOG_COMPLETION);
  const [undoCompletion, { loading: undoing }] = useMutation(UNDO_COMPLETION);
  const toggling = logging || undoing;

  const handleToggle = async () => {
    if (toggling || !id) return;
    if (isCompletedToday) {
      await undoCompletion({ variables: { habitId: id, date: today } });
    } else {
      await logCompletion({ variables: { habitId: id, date: today } });
    }
  };

  return (
    <PageShell title="Streak">
      <button className={styles.backBtn} onClick={() => navigate(-1)}>
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      {loading && <p className={styles.status}>Loading...</p>}
      {error && <p className={styles.status}>Failed to load habit.</p>}

      {habit && (
        <>
          <div className={styles.header}>
            <span className={styles.eyebrow}>Current Focus</span>
            <h1 className={styles.habitName}>{habit.name}</h1>
            <div className={styles.completeAction}>
              <CompleteButton completed={isCompletedToday} onToggle={handleToggle} loading={toggling} />
            </div>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCard}>
              <div className={styles.heroCardHeader}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: 'var(--color-tertiary, #855300)', fontSize: '28px' }}>
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
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary, #006c49)', fontSize: '28px' }}>
                  workspace_premium
                </span>
                <span className={styles.heroBadge} data-color="primary">Record</span>
              </div>
              <div className={styles.heroCardBody}>
                <span className={styles.heroNumber}>{best}</span>
                <span className={styles.heroLabel}>Longest Streak</span>
              </div>
            </div>
          </div>

          {streaks.current > 0 && <MotivationalBanner currentStreak={streaks.current} />}

          <StreakChain habitId={id!} completionDates={completionDates} />

          <StreakInsights completions={habit.completions} frequency={habit.frequency} />
        </>
      )}
    </PageShell>
  );
}
