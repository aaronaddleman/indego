# Indago Habits API — User Documentation

## What's New

Indago is a habit tracking API that powers iOS and web clients. It provides:

- **Habit management** — Create, edit, and delete habits with flexible scheduling (daily, N times per week, or specific days)
- **Completion tracking** — Log and undo habit completions by date
- **Streak support** — Longest streak stored server-side; current streak computed by clients
- **Reminder schedule sync** — Store reminder schedules centrally; clients handle local notification delivery
- **Cross-device sync** — Real-time sync via Firestore listeners
- **Stats & analytics** — Server-side completion rates and streak data across full history
- **Multi-provider auth** — Email/password, Apple Sign-In, Google Sign-In via Firebase Auth

## How to Use

### Authentication

All API requests require a Firebase Auth ID token in the `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

Obtain a token by authenticating with Firebase Auth (email/password, Apple, or Google) on the client.

### GraphQL Endpoint

```
POST https://<region>-<project-id>.cloudfunctions.net/graphql
Content-Type: application/json
Authorization: Bearer <token>

{
  "query": "{ habits { id name } }"
}
```

### Quick Start

1. **Create your user profile** (first login):
```graphql
mutation {
  upsertUser(displayName: "Aaron") {
    id
    displayName
  }
}
```

2. **Create a habit**:
```graphql
mutation {
  createHabit(input: {
    name: "Meditate"
    frequency: { type: DAILY }
    reminder: { enabled: true, time: "12:00" }
  }) {
    id
    name
  }
}
```

3. **Log a completion**:
```graphql
mutation {
  logCompletion(habitId: "<habit_id>", date: "2026-03-11") {
    date
    completedAt
  }
}
```

4. **View your habits**:
```graphql
query {
  habits {
    id
    name
    frequency { type }
    longestStreak
    completions {
      date
      completedAt
    }
  }
}
```

5. **Check your stats**:
```graphql
query {
  stats(dateRange: { startDate: "2026-01-01", endDate: "2026-03-11" }) {
    totalHabits
    totalCompletions
    habitStats {
      habitName
      completionRate
      longestStreak
    }
  }
}
```

## Known Issues / Limitations

- **Cold starts:** First request after idle period may take 1-3 seconds (Python Cloud Functions). Mitigated with `min_instances=1` in production.
- **Offline conflict resolution:** If two devices log completions for different dates while offline, last-write-wins applies. Acceptable for v1.
- **Timezone:** All dates stored as UTC. Clients convert to the device's local timezone for display and scheduling.
- **Rate limiting:** Not implemented in v1.
- **Completion history retention:** Currently retained indefinitely. Pruning strategy TBD.

---

# Changelog

## [0.1.0] — 2026-03-11

### Added
- GraphQL API with Firebase Auth (email/password, Apple Sign-In, Google Sign-In)
- Habit CRUD (create, read, update, delete — hard delete)
- Completion tracking as map on habit document (date string → UTC timestamp) with natural deduplication
- Longest streak persistence (high-water mark, written directly by clients via Firestore)
- Reminder schedule storage (UTC) and sync via Firestore real-time listeners; clients handle local notification delivery
- Server-side stats: completion rate, total completions, longest streak per habit
- All dates/timestamps stored as UTC — server is timezone-agnostic, clients handle conversion
- Firestore security rules for per-user data isolation
- Layered architecture (Transport → Service → Repository) for future Java/Scala migration
- Docker support for local development (Firebase Emulators) and CI/CD
