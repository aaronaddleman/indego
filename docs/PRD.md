# Product Requirements Document (PRD)

## 1. Overview

- **Product Name:** Indago — Habits Tracker
- **Problem Statement:** People struggle to build and maintain habits because they lack a simple, cross-device system that tracks progress, maintains accountability through streaks, and reminds them at the right time.
- **Goals:**
  - Let users create and manage habits with flexible scheduling
  - Calculate streaks client-side to motivate consistency
  - Sync reminder schedules across devices; each client delivers local notifications
  - Sync seamlessly between iOS and web so context is never lost
- **Non-Goals:**
  - Social features (sharing, leaderboards, accountability partners) — not in v1
  - Gamification beyond streaks (badges, points, rewards) — not in v1
  - Habit suggestions or AI-powered recommendations — not in v1
  - Apple Watch / wearable support — not in v1

## 2. Background & Context

Habit tracking is a well-established productivity category, but most apps are either too simple (no sync, no reminders) or too complex (overwhelming UI, unnecessary social features). Indago aims to be a focused, reliable habit tracker that works across devices with minimal friction.

The project starts as a backend API to establish the data model and business logic, with iOS and web clients to follow.

## 3. User Stories / Jobs to Be Done

### Users
- **Primary:** Individuals who want to build or break habits (fitness, reading, meditation, etc.)

### User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-1 | User | Create a habit with a name and frequency | I can define what I want to track |
| US-2 | User | Mark a habit as done for today | My progress is recorded |
| US-3 | User | See my current streak for each habit | I stay motivated to maintain consistency |
| US-4 | User | Set a reminder time for a habit | I get a push notification when it's time |
| US-5 | User | Edit or delete a habit | I can adjust my habits as my goals change |
| US-6 | User | View all my habits and their status for today | I get a quick overview of what's done and what's left |
| US-7 | User | See stats on my habit history | I can understand my long-term patterns |
| US-8 | User | Access my habits from my phone and browser | My data is always in sync regardless of device |
| US-9 | User | Sign up and log in securely | My data is private and tied to my account |
| US-10 | User | Undo a completion if I logged it by mistake | My streak data stays accurate |

## 4. Requirements

### Functional Requirements

#### 4.1 Authentication
- Sign up with email/password, Apple Sign-In, or Google Sign-In
- Log in / log out
- Password reset via email

#### 4.2 Habit Management
- **Create habit:** name (required), frequency (daily, N times per week, specific days), reminder (optional — time + timezone)
- **Edit habit:** update any field
- **Delete habit:** soft-delete or hard-delete with confirmation (hard-delete for v1)
- **List habits:** return all habits for the authenticated user with completion history (clients compute today's status and streaks locally)

#### 4.3 Completion Tracking
- **Log completion:** mark a habit as done for a given date (defaults to today). Uses date as document ID for natural deduplication — logging the same date twice is an idempotent overwrite.
- **Undo completion:** remove a completion entry for a given date (delete by date ID)
- **Completion history:** query completions for a habit within a date range

#### 4.4 Streaks (client-side with server-persisted longest)
- **Current streak:** calculated client-side by comparing completion history against the habit's frequency and the current date
- **Longest streak:** highest current streak ever achieved, persisted on the habit document as a high-water mark. Clients update this when a new record is set. Survives app reinstall / new device without recomputation.
- Streaks are derived data — the server stores completions, clients compute current streaks
- Missing a scheduled period resets the current streak to 0
- "Today" is determined by the user's selected timezone (stored on user profile)

#### 4.5 Reminders (client-side with server-synced schedules)
- Per-habit reminder with a specific time and timezone, stored on the server
- Each client subscribes to reminder schedule changes via Firestore real-time listeners
- Each client independently schedules local notifications (iOS: UNUserNotificationCenter, Web: Service Worker / Notification API)
- User can enable/disable reminders per habit
- When one client updates a reminder, all connected clients receive the change and reschedule
- Offline clients continue firing the last-synced schedule until reconnected
- Reminder content: habit name + motivational nudge (e.g., "Time to: Read for 30 minutes")

#### 4.6 Sync Status
- Clients display a last-synced timestamp or offline indicator so users know data freshness
- Example: "Last synced: 5 min ago" or "Offline — changes will sync when reconnected"

#### 4.7 Stats & Analytics (v1 — basic, server-side)
- Completion rate per habit (completions / expected completions over a date range)
- Current and longest streak per habit
- Total completions per habit
- Computed server-side to support cross-device queries over full history

#### 4.8 Timezone
- User selects a timezone on their profile (defaults to device timezone on signup)
- "Today" boundary for completions and streaks is based on this timezone
- v1: timezone is manually set. Future: automatic timezone detection when traveling.

### Non-Functional Requirements

- **UX:** API responses should feel instant (< 500ms). Real-time sync so changes appear on other devices within seconds.
- **Accessibility:** Not applicable to API layer; will be addressed in client PRDs.
- **Performance:** Support up to 100 habits per user, up to 365 days of completion history per habit without degradation.

## 5. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| API reliability | 99.9% uptime | Firebase monitoring |
| API latency | < 500ms p95 | Cloud Functions logs |
| Streak accuracy | 100% match with completion history | Automated tests |
| Sync latency | < 3 seconds cross-device | Manual testing in v1 |

## 6. Out of Scope

- Social/community features
- Gamification (badges, points, levels)
- Habit templates or suggestions
- Apple Watch / wearable support
- Web or iOS client implementation (separate projects)
- Admin dashboard
- Data export/import

## 7. Dependencies & Risks

| # | Dependency / Risk | Impact | Mitigation |
|---|-------------------|--------|-----------|
| 1 | Firebase Auth availability | Users can't log in | Firebase SLA 99.95%; no mitigation needed for v1 |
| 2 | Cloud Functions cold starts | Slow first request | Accepted — use min instances in production |
| 3 | Python → Java/Scala migration | Engineering effort | Layered architecture minimizes blast radius |
| 4 | Firestore per-read pricing | Cost at scale | Paginate completion queries |
| 5 | Offline clients firing stale reminder schedules | Slightly wrong reminder times | Accepted — better than no reminder |

## 8. Timeline / Milestones

| Milestone | Description |
|-----------|------------|
| M1 | ARD + PRD approved (Gate 1) |
| M2 | Technical Spec + Deployment Plan complete (Gate 2) |
| M3 | API MVP: Auth + Habit CRUD + Completions |
| M4 | Reminder schedule sync endpoints |
| M5 | Stats endpoints |
| M6 | iOS client (separate project) |
| M7 | Web client (separate project) |

## 9. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | Should deleted habits be soft-deleted (recoverable) or hard-deleted? Going with hard-delete for v1 | Decided |
| 2 | Max number of habits per user? Defaulting to 100 for v1 | Decided |
| 3 | Should completion history be retained indefinitely or pruned after N days? | Open |
| 4 | Do we need rate limiting on the API in v1? | Open |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-11 | Discovery/Iteration | Initial draft |
| 2026-03-11 | Iteration | Moved streaks to client-side, reminders to client-side local notifications with server-synced schedules, removed FCM dependency |
| 2026-03-11 | Iteration | Added longestStreak persistence, date-as-doc-ID dedup, sync status indicator, server-side stats, user timezone for date boundaries |
