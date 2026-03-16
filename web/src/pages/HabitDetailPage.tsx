import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { format } from 'date-fns';
import { GET_HABIT } from '../graphql/queries';
import { LOG_COMPLETION, UNDO_COMPLETION } from '../graphql/mutations';
import WeekStrip from '../components/calendar/WeekStrip';
import CompleteButton from '../components/habits/CompleteButton';
import HabitForm from '../components/habits/HabitForm';
import CalendarTabs from '../components/calendar/CalendarTabs';
import TabbedModal from '../components/common/TabbedModal';
import { useStreak } from '../hooks/useStreak';
import { useLongestStreakSync, writeLongestStreak } from '../hooks/useLongestStreakSync';
import { computeStreaks } from '../hooks/streakCalc';
import { useAuth } from '../auth/useAuth';
import styles from './HabitDetailPage.module.css';

function formatFrequency(frequency: { type: string; daysPerWeek?: number; specificDays?: string[] }): string {
  switch (frequency.type) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return `${frequency.daysPerWeek}x per week`;
    case 'CUSTOM':
      return frequency.specificDays?.map(d => d.slice(0, 3)).join(', ') || 'Custom';
    default:
      return frequency.type;
  }
}

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading: queryLoading, error } = useQuery(GET_HABIT, { variables: { id } });
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  const today = format(new Date(), 'yyyy-MM-dd');

  const habit = data?.habit;
  const streaks = useStreak(habit);
  const completedToday = habit?.completions.some((c: { date: string }) => c.date === today) ?? false;

  // Sync longest streak to Firestore (immediate write on detail page)
  useLongestStreakSync(habit?.id, streaks.longest);

  const [logCompletion, { loading: logging }] = useMutation(LOG_COMPLETION);
  const [undoCompletion, { loading: undoing }] = useMutation(UNDO_COMPLETION);
  const mutationLoading = logging || undoing;

  // Ref for deferred streak write on modal close
  const habitRef = useRef(habit);
  const userRef = useRef(user);

  useEffect(() => {
    habitRef.current = habit;
  }, [habit]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const handleCompleteToggle = async () => {
    if (!id || mutationLoading) return;
    if (completedToday) {
      await undoCompletion({ variables: { habitId: id, date: today } });
    } else {
      await logCompletion({ variables: { habitId: id, date: today } });
    }
  };

  const openModal = (tab: string) => {
    setActiveTab(tab);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    // Deferred streak write on modal close
    const h = habitRef.current;
    const u = userRef.current;
    if (h && u?.uid) {
      const { longest } = computeStreaks(h.completions, h.frequency, today);
      void writeLongestStreak(u.uid, h.id, longest);
    }
  };

  if (queryLoading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading...</p>
      </div>
    );
  }

  if (error || !habit) {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="Back to habits">
          ← Back
        </button>
        <p className={styles.error}>Habit not found.</p>
      </div>
    );
  }

  const modalTabs = [
    {
      id: 'settings',
      label: 'Settings',
      content: <HabitForm habit={habit} onClose={closeModal} inline />,
    },
    {
      id: 'history',
      label: 'History',
      content: <CalendarTabs habit={habit} />,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/')} aria-label="Back to habits">
          ←
        </button>
        <div className={styles.topActions}>
          <button
            className={styles.iconBtn}
            onClick={() => openModal('settings')}
            aria-label="Edit habit"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => openModal('history')}
            aria-label="View history"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.hero}>
        <h1 className={styles.habitName}>{habit.name}</h1>
        <p className={styles.frequency}>{formatFrequency(habit.frequency)}</p>
      </div>

      <div className={styles.streaks}>
        <div className={styles.streakItem}>
          <span className={styles.streakNumber}>{streaks.current}</span>
          <span className={styles.streakLabel}>current</span>
        </div>
        <div className={styles.streakItem}>
          <span className={styles.streakNumber}>{streaks.longest}</span>
          <span className={styles.streakLabel}>longest</span>
        </div>
      </div>

      <WeekStrip habitId={habit.id} completions={habit.completions} />

      <div className={styles.completeSection}>
        <CompleteButton
          completed={completedToday}
          onToggle={handleCompleteToggle}
          loading={mutationLoading}
        />
      </div>

      {modalOpen && (
        <TabbedModal
          tabs={modalTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
