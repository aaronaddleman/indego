// ─── Reminder Notification Scheduling ────────────────────────────────────
// This file is imported into the Workbox-generated Service Worker via importScripts.

var scheduledTimeouts = new Map();

function clearAllTimeouts() {
  for (var id of scheduledTimeouts.values()) {
    clearTimeout(id);
  }
  scheduledTimeouts.clear();
}

function scheduleReminder(reminder) {
  var existing = scheduledTimeouts.get(reminder.habitId);
  if (existing) clearTimeout(existing);

  if (reminder.delayMs <= 0) return;

  var timeoutId = setTimeout(function () {
    scheduledTimeouts.delete(reminder.habitId);

    self.registration.showNotification('Indago', {
      body: 'Ready to ' + reminder.habitName + '?',
      icon: '/pwa-192x192.png',
      tag: 'reminder-' + reminder.habitId,
      data: { habitId: reminder.habitId },
      requireInteraction: false,
    });
  }, reminder.delayMs);

  scheduledTimeouts.set(reminder.habitId, timeoutId);
}

self.addEventListener('message', function (event) {
  var data = event.data;
  if (!data || !data.type) return;

  switch (data.type) {
    case 'SCHEDULE_REMINDERS':
      clearAllTimeouts();
      if (data.reminders) {
        data.reminders.forEach(function (r) {
          scheduleReminder(r);
        });
      }
      break;

    case 'CANCEL_REMINDER':
      var existing = scheduledTimeouts.get(data.habitId);
      if (existing) {
        clearTimeout(existing);
        scheduledTimeouts.delete(data.habitId);
      }
      break;

    case 'CANCEL_ALL_REMINDERS':
      clearAllTimeouts();
      break;
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var habitId = event.notification.data && event.notification.data.habitId;
  var url = habitId ? '/streaks/' + habitId : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        if ('focus' in clients[i]) {
          clients[i].focus();
          clients[i].navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
