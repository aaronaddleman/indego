# Architecture Requirements Document (ARD) — Client-Side Reminders v1

## 1. Overview

- **Project Name:** Habit Reminders — Client-Side (v1)
- **Purpose:** Deliver local push notifications to remind users to complete habits at their scheduled time, on days the habit is due.
- **Scope:** Web client only (Service Worker + Notification API). No server-side scheduling in v1. Server-side fallback planned for v2 (milestone: "Reminders v2 — Server-side fallback").
- **Goals:**
  - Fire a local notification at the user's scheduled time for each habit with reminders enabled
  - Only fire on days the habit is due (respect frequency/dueDays)
  - Notification says "Ready to [habit name]?" with an action to open the app
  - Request notification permission gracefully
  - Re-schedule reminders when habit settings change

## 2. System Context

```
+-------------------------------------------------+
|           Indago Web (PWA)                      |
|                                                 |
|  +-----------+    +--------------------------+  |
|  |   React   |    |   Service Worker         |  |
|  |   App     |--->|   - showNotification()   |  |
|  |           |    |   - Periodic sync (if    |  |
|  |  Schedule |    |     available)           |  |
|  |  Manager  |    |   - Message listener     |  |
|  +-----------+    +--------------------------+  |
|       |                      |                  |
|       v                      v                  |
|  +-----------+    +--------------------------+  |
|  | Firestore |    | Browser Notification API |  |
|  | (habit    |    | (OS-level notification)  |  |
|  |  data)    |    |                          |  |
|  +-----------+    +--------------------------+  |
+-------------------------------------------------+
```

No server-side components. The client reads habit data from the Apollo cache/Firestore, computes when to fire, and uses the Service Worker to display notifications.

## 3. Functional Requirements

| ID | Requirement |
|----|-------------|
| R-1 | When a habit has `reminder.enabled = true` and `reminder.time` set, the client schedules a local notification for that time in the user's local timezone |
| R-2 | Notifications only fire on days the habit is due (based on frequency/dueDays) |
| R-3 | Notification text: "Ready to [habit name]?" |
| R-4 | Tapping the notification opens the app to the habit's streak detail page |
| R-5 | Notifications are rescheduled when: habit is created, updated, or deleted |
| R-6 | The app requests notification permission on first reminder enable, not on app load |
| R-7 | If permission is denied, show an inline message explaining how to re-enable |
| R-8 | All scheduled reminders are refreshed on app load (in case Service Worker was killed) |

## 4. Non-Functional Requirements

- **Reliability:** Best-effort. Service Workers can be killed by the browser. Documented limitation — server-side fallback in v2.
- **Battery:** Minimal impact. No polling. Use `setTimeout` / `setInterval` in the Service Worker, or the Periodic Background Sync API if available.
- **Privacy:** No data leaves the device for reminders. Notification content is generated locally.
- **Compatibility:** Chrome, Edge, Firefox support Service Worker notifications. Safari on iOS 16.4+ supports web push but requires user interaction to subscribe. Degrade gracefully on unsupported browsers.

## 5. Architecture Decisions

| Decision | Choice | Rationale | Alternatives Rejected |
|----------|--------|-----------|----------------------|
| Scheduling mechanism | `setTimeout` in app + Service Worker `showNotification` | Simple, no infrastructure. The app computes the delay until the next reminder and posts a message to the SW. | Periodic Background Sync (limited browser support), server-side cron (infrastructure cost for v1) |
| Timezone handling | Client-side only. Convert UTC `reminder.time` to local time using `Intl.DateTimeFormat` or `Date` | The client inherently knows the user's timezone. No need to store it in v1. | Store timezone on server (needed for v2, not v1) |
| Persistence of schedule | Re-compute on every app load from habit data | Avoids a separate "scheduled reminders" store. Habit data is the source of truth. | IndexedDB schedule table (unnecessary complexity) |
| Permission request timing | On first toggle of "Enable reminder" in HabitForm | Respects user intent. Not aggressive. | On app load (bad UX), on PWA install (too early) |
| Notification action | Open app to `/streaks/{habitId}` | User can immediately check in | Open dashboard (less targeted) |

## 6. Data Architecture

No new data models. Uses existing:
- `Habit.reminder.enabled: Boolean`
- `Habit.reminder.time: String` (HH:MM UTC)
- `Habit.frequency.dueDays: [String]`

The scheduling logic lives entirely in client-side code.

## 7. Security & Access Control

- Notification permission is browser-controlled
- No new API endpoints or Firestore rules needed
- Notification content is generated from local data only

## 8. Infrastructure & Deployment Overview

No infrastructure changes. The Service Worker (`sw.js`) already exists for PWA caching. Reminder logic will be added to it.

## 9. Open Questions / Risks

| # | Question | Status |
|---|----------|--------|
| 1 | Can `setTimeout` in the app survive for hours if the tab stays open? | Yes for foreground tabs. Background tabs get throttled. This is a known v1 limitation. |
| 2 | iOS Safari PWA support for notifications? | Supported from iOS 16.4+ but requires user add-to-homescreen. |
| 3 | Should we batch multiple habit reminders at the same time? | v1: show separate notifications. v2: consider digest. |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-26 | Documentation | Initial draft |
