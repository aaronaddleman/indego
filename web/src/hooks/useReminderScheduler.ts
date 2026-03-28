import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@apollo/client';
import { GET_HABITS } from '../graphql/queries';
import { getLocalDate } from '../utils/date';
import { getDayName } from '../utils/frequency';

interface Completion {
  date: string;
  completedAt: string;
}

interface Habit {
  id: string;
  name: string;
  frequency: { type: string; dueDays?: string[] };
  reminder: { enabled: boolean; time?: string };
  completions: Completion[];
}

function isDueToday(frequency: { type: string; dueDays?: string[] }): boolean {
  if (!frequency.dueDays || frequency.dueDays.length === 0) return true;
  const today = getDayName(new Date());
  return frequency.dueDays.includes(today);
}

function computeDelayMs(utcTime: string): number {
  const [h, m] = utcTime.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setUTCHours(h, m, 0, 0);
  return target.getTime() - now.getTime();
}

function postToServiceWorker(message: unknown) {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage(message);
}

export function useReminderScheduler() {
  const { data } = useQuery(GET_HABITS);
  const habits = useMemo<Habit[]>(() => data?.habits ?? [], [data?.habits]);
  const lastScheduleRef = useRef<string>('');

  useEffect(() => {
    if (Notification.permission !== 'granted') return;
    if (habits.length === 0) return;

    const today = getLocalDate();

    const reminders = habits
      .filter(h => h.reminder.enabled && h.reminder.time)
      .filter(h => isDueToday(h.frequency))
      .filter(h => !h.completions.some(c => c.date === today))
      .map(h => ({
        habitId: h.id,
        habitName: h.name,
        delayMs: computeDelayMs(h.reminder.time!),
      }))
      .filter(r => r.delayMs > 0);

    // Avoid re-posting the same schedule
    const scheduleKey = reminders.map(r => `${r.habitId}:${r.delayMs}`).join('|');
    if (scheduleKey === lastScheduleRef.current) return;
    lastScheduleRef.current = scheduleKey;

    if (reminders.length > 0) {
      postToServiceWorker({ type: 'SCHEDULE_REMINDERS', reminders });
    } else {
      postToServiceWorker({ type: 'CANCEL_ALL_REMINDERS' });
    }
  }, [habits]);
}
