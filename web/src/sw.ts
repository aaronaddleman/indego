/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox precaching — auto-injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// ─── Reminder Notification Scheduling ────────────────────────────────────

interface ReminderPayload {
  habitId: string;
  habitName: string;
  delayMs: number;
}

interface ScheduleMessage {
  type: 'SCHEDULE_REMINDERS';
  reminders: ReminderPayload[];
}

interface CancelMessage {
  type: 'CANCEL_REMINDER';
  habitId: string;
}

interface CancelAllMessage {
  type: 'CANCEL_ALL_REMINDERS';
}

type ReminderMessage = ScheduleMessage | CancelMessage | CancelAllMessage;

const scheduledTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function clearAllTimeouts() {
  for (const id of scheduledTimeouts.values()) {
    clearTimeout(id);
  }
  scheduledTimeouts.clear();
}

function scheduleReminder(reminder: ReminderPayload) {
  // Clear existing timeout for this habit
  const existing = scheduledTimeouts.get(reminder.habitId);
  if (existing) clearTimeout(existing);

  if (reminder.delayMs <= 0) return;

  const timeoutId = setTimeout(async () => {
    scheduledTimeouts.delete(reminder.habitId);

    await self.registration.showNotification('Indago', {
      body: `Ready to ${reminder.habitName}?`,
      icon: '/pwa-192x192.png',
      tag: `reminder-${reminder.habitId}`,
      data: { habitId: reminder.habitId },
      requireInteraction: false,
    });
  }, reminder.delayMs);

  scheduledTimeouts.set(reminder.habitId, timeoutId);
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  const data = event.data as ReminderMessage;

  switch (data.type) {
    case 'SCHEDULE_REMINDERS':
      clearAllTimeouts();
      for (const reminder of data.reminders) {
        scheduleReminder(reminder);
      }
      break;

    case 'CANCEL_REMINDER': {
      const existing = scheduledTimeouts.get(data.habitId);
      if (existing) {
        clearTimeout(existing);
        scheduledTimeouts.delete(data.habitId);
      }
      break;
    }

    case 'CANCEL_ALL_REMINDERS':
      clearAllTimeouts();
      break;
  }
});

// Handle notification click — open the habit's streak detail page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const habitId = event.notification.data?.habitId;
  const url = habitId ? `/streaks/${habitId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    })
  );
});
