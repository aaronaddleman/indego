# Product Requirements Document (PRD) — Client-Side Reminders v1

## 1. Overview

- **Feature Name:** Habit Reminders — Client-Side Notifications
- **Problem Statement:** Users set reminder times on their habits but nothing actually fires. The reminder data is stored but unused. Users forget to complete habits because there's no nudge.
- **Goals:**
  - Deliver a local push notification at the scheduled time for each habit
  - Only remind on days the habit is due
  - Friendly, encouraging tone: "Ready to [habit name]?"
  - Tapping opens the habit's streak detail page for immediate check-in
- **Non-Goals:**
  - Server-side push (v2)
  - Email fallback (v2)
  - Snooze/dismiss actions on the notification (future)
  - Notification sound customization (issue #49)

## 2. Background & Context

The API already supports `reminder { enabled, time }` per habit. The HabitForm has a toggle and time picker. Users can set reminders, but they do nothing. This is the #1 missing feature — the data is there, the delivery mechanism isn't.

Client-side notifications via the Service Worker are the cheapest and fastest path to delivering value. Known limitation: unreliable if the user doesn't open the app for extended periods. Server-side fallback is planned in milestone "Reminders v2."

## 3. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| RM-1 | User | Get a notification at my scheduled time reminding me to do my habit | I don't forget to complete it |
| RM-2 | User | Only get reminders on days the habit is due | I'm not annoyed by irrelevant notifications |
| RM-3 | User | Tap the notification and go straight to the habit | I can check in immediately |
| RM-4 | User | Be asked for notification permission only when I enable a reminder | I'm not surprised by a permission prompt on first visit |
| RM-5 | User | See a message if I denied notification permission | I know how to fix it if I change my mind |
| RM-6 | User | Have my reminders survive app restart | I don't need to do anything after setting up once |

## 4. Requirements

### Functional Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| F-1 | Schedule local notification for each habit with reminder enabled | Must |
| F-2 | Respect habit frequency — skip days the habit isn't due | Must |
| F-3 | Notification text: "Ready to [habit name]?" | Must |
| F-4 | Tapping notification opens `/streaks/{habitId}` | Must |
| F-5 | Request permission on first reminder enable | Must |
| F-6 | Show inline warning if permission denied | Must |
| F-7 | Reschedule all reminders on app load | Must |
| F-8 | Cancel notifications when reminder is disabled or habit deleted | Must |
| F-9 | Don't fire if habit already completed today | Should |

### Non-Functional Requirements

- **UX:** Permission request is contextual (inside HabitForm), not on app load
- **Performance:** Scheduling is lightweight — just computing time deltas, no polling
- **Accessibility:** Notification uses OS-native presentation
- **Degradation:** If browser doesn't support notifications, reminder toggle still works (data is saved for future server-side delivery in v2)

## 5. Success Metrics

- Users with reminders enabled receive notifications at the correct time
- Notification tap-through opens the correct habit
- No notifications fire on non-due days
- No notifications fire for already-completed habits

## 6. Out of Scope

- Server-side push notifications (v2 milestone)
- Email fallback (v2 milestone, issue #60)
- Notification sound selection (issue #49)
- Snooze/dismiss actions
- Notification grouping/batching
- Rich notification content (images, progress)

## 7. Dependencies & Risks

| Dependency/Risk | Mitigation |
|----------------|------------|
| Browser may kill Service Worker | Re-schedule on every app load |
| iOS Safari requires add-to-homescreen for notifications | Document this for users; works on Android/desktop without install |
| User denies permission | Show inline guidance to re-enable in browser settings |
| Background tab throttling | Notifications may be slightly delayed. Acceptable for v1. |

## 8. Timeline / Milestones

- **v1 (this work):** Client-side only, covers web
- **v2 (future):** Server-side fallback with push + email, covers web + iOS

## 9. Open Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Should completed habits suppress the notification? | Yes (F-9), check completion status before firing |
| 2 | What happens if multiple habits have the same reminder time? | Fire separate notifications for each |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-26 | Documentation | Initial draft |
