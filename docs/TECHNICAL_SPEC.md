# Technical Spec — Indago Habits API

## 1. Summary

This document specifies the GraphQL API for the Indago Habits Tracker, built with Python (Ariadne) on Cloud Functions for Firebase, backed by Firestore and Firebase Auth. The API provides habit CRUD, completion tracking, and server-side stats. Streaks and reminders are computed/scheduled client-side; the server stores the underlying data.

## 2. Goals & Non-Goals

### Goals
- Define the complete GraphQL schema (types, queries, mutations)
- Specify the layered architecture (Transport → Service → Repository)
- Define error handling, auth flow, and data validation
- Establish testing strategy

### Non-Goals
- Client implementation details (iOS, web)
- Deployment procedures (see DEPLOYMENT_PLAN.md)
- CI/CD pipeline configuration

## 3. Design / Architecture

### Layered Architecture

```
┌─────────────────────────────────┐
│         Transport Layer          │
│  (Ariadne GraphQL resolvers)     │
│  - Parses requests               │
│  - Auth middleware                │
│  - Calls service layer           │
│  - Formats responses             │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│          Service Layer           │
│  - Business logic                │
│  - Validation rules              │
│  - Stats computation             │
│  - Orchestrates repository calls │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│        Repository Layer          │
│  - Firestore CRUD operations     │
│  - Data serialization            │
│  - Query construction            │
└─────────────────────────────────┘
```

### Project Structure

```
├── Dockerfile                     # Build/test/deploy image (Python 3.12 + Node 20 + Firebase CLI)
├── docker-compose.yml             # Local dev: Firebase emulators + functions
├── .dockerignore
├── firebase.json                  # Firebase emulator + hosting + functions config
├── firestore.rules
├── .firebaserc
├── functions/
│   ├── main.py                    # Cloud Function entry point
│   ├── requirements.txt
│   ├── schema.graphql             # GraphQL schema (source of truth)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── auth.py                # Firebase Auth middleware
│   │   ├── transport/
│   │   │   ├── __init__.py
│   │   │   ├── resolvers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user.py
│   │   │   │   ├── habit.py
│   │   │   │   └── stats.py
│   │   │   └── scalars.py         # Custom scalar types (DateTime, Date)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── user_service.py
│   │   │   ├── habit_service.py
│   │   │   └── stats_service.py
│   │   └── repositories/
│   │       ├── __init__.py
│   │       ├── user_repo.py
│   │       └── habit_repo.py
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py            # Shared fixtures (Firestore emulator, auth mocks)
│       ├── test_user.py
│       ├── test_habit.py
│       └── test_stats.py
```

### Docker Configuration

**Dockerfile** — single image for building, testing, and deploying:

```dockerfile
FROM python:3.12-slim

# Install Node.js 20 + Firebase CLI
RUN apt-get update && apt-get install -y curl openjdk-21-jre-headless && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g firebase-tools && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY functions/requirements.txt functions/requirements.txt
RUN pip install --no-cache-dir -r functions/requirements.txt

# Copy project
COPY . .

# Default: run tests
CMD ["pytest", "functions/tests/"]
```

**docker-compose.yml** — local development environment:

```yaml
services:
  emulators:
    build: .
    command: firebase emulators:start --project demo-indago
    ports:
      - "4000:4000"   # Emulator UI
      - "5001:5001"   # Cloud Functions
      - "8080:8080"   # Firestore
      - "9099:9099"   # Auth
    volumes:
      - ./functions:/app/functions    # Hot reload
      - ./firebase.json:/app/firebase.json
      - ./firestore.rules:/app/firestore.rules
    environment:
      - GCLOUD_PROJECT=demo-indago
      - FIRESTORE_EMULATOR_HOST=localhost:8080
      - FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

  test:
    build: .
    command: >
      firebase emulators:exec
        "pytest functions/tests/ -v"
        --project demo-indago
    environment:
      - FIRESTORE_EMULATOR_HOST=localhost:8080
      - FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
    profiles: ["test"]
```

**.dockerignore:**

```
.git
__pycache__
*.pyc
.env
.venv
node_modules
```

### Local Development with Docker

```bash
# Start emulators (Firestore + Auth + Functions) with hot reload
docker compose up emulators

# Run tests in isolated container
docker compose run --rm test

# Deploy from container (pass Firebase token)
docker compose run --rm -e FIREBASE_TOKEN=$FIREBASE_TOKEN emulators \
  firebase deploy --only functions,firestore:rules --project staging
```

### Firebase Configuration

**firebase.json:**

```json
{
  "functions": {
    "source": "functions",
    "runtime": "python312",
    "codebase": "default"
  },
  "firestore": {
    "rules": "firestore.rules"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

### Auth Flow

1. Client sends GraphQL request with `Authorization: Bearer <firebase_id_token>` header
2. Auth middleware (`app/auth.py`) verifies token using Firebase Admin SDK
3. On success: extracts `uid` and injects into resolver context as `context["user_id"]`
4. On failure: returns `UNAUTHENTICATED` error before reaching resolvers

## 4. API Contracts

### GraphQL Schema

```graphql
# ─── Scalars ───

scalar DateTime
scalar Date

# ─── Enums ───

enum FrequencyType {
  DAILY
  WEEKLY
  CUSTOM
}

# ─── Input Types ───

input FrequencyInput {
  type: FrequencyType!
  daysPerWeek: Int
  specificDays: [String!]
}

input ReminderInput {
  enabled: Boolean!
  time: String        # "HH:MM" in UTC, required if enabled=true
}

input CreateHabitInput {
  name: String!
  frequency: FrequencyInput!
  reminder: ReminderInput
}

input UpdateHabitInput {
  name: String
  frequency: FrequencyInput
  reminder: ReminderInput
}

input DateRangeInput {
  startDate: Date!
  endDate: Date!
}

# ─── Types ───

type User {
  id: ID!
  displayName: String!
  email: String!
  createdAt: DateTime!
}

type Frequency {
  type: FrequencyType!
  daysPerWeek: Int
  specificDays: [String!]
}

type Reminder {
  enabled: Boolean!
  time: String          # "HH:MM" in UTC
}

type Completion {
  date: Date!
  completedAt: DateTime!
}

type Habit {
  id: ID!
  name: String!
  frequency: Frequency!
  reminder: Reminder!
  longestStreak: Int!
  completions: [Completion!]!     # Derived from completions map on habit document
  createdAt: DateTime!
  updatedAt: DateTime!
}

type HabitStats {
  habitId: ID!
  habitName: String!
  totalCompletions: Int!
  longestStreak: Int!
  completionRate: Float!        # 0.0 - 1.0
}

type UserStats {
  totalHabits: Int!
  totalCompletions: Int!
  habitStats: [HabitStats!]!
}

# ─── Queries ───

type Query {
  """Get the current authenticated user's profile"""
  me: User!

  """Get all habits for the authenticated user"""
  habits: [Habit!]!

  """Get a single habit by ID"""
  habit(id: ID!): Habit

  """Get stats for the authenticated user"""
  stats(dateRange: DateRangeInput!): UserStats!
}

# ─── Mutations ───

type Mutation {
  """Create or update the user profile (called on first login)"""
  upsertUser(displayName: String!): User!

  """Create a new habit"""
  createHabit(input: CreateHabitInput!): Habit!

  """Update an existing habit"""
  updateHabit(id: ID!, input: UpdateHabitInput!): Habit!

  """Delete a habit (hard delete)"""
  deleteHabit(id: ID!): Boolean!

  """Log a completion for a habit on a given date (idempotent). Date is a map key on the habit document."""
  logCompletion(habitId: ID!, date: Date!): Completion!

  """Remove a completion for a habit on a given date (removes map key)"""
  undoCompletion(habitId: ID!, date: Date!): Boolean!
}
```

### Example Queries

**Create a habit:**
```graphql
mutation {
  createHabit(input: {
    name: "Read for 30 minutes"
    frequency: { type: DAILY }
    reminder: { enabled: true, time: "13:00" }
  }) {
    id
    name
    frequency { type }
    reminder { enabled, time }
  }
}
```

**Log a completion:**
```graphql
mutation {
  logCompletion(habitId: "abc123", date: "2026-03-11") {
    date
    completedAt
  }
}
```

**Get all habits with completions:**
```graphql
query {
  habits {
    id
    name
    frequency { type, daysPerWeek, specificDays }
    reminder { enabled, time }
    longestStreak
    completions {
      date
      completedAt
    }
  }
}
```

**Get stats:**
```graphql
query {
  stats(dateRange: { startDate: "2026-01-01", endDate: "2026-03-11" }) {
    totalHabits
    totalCompletions
    habitStats {
      habitId
      habitName
      totalCompletions
      longestStreak
      completionRate
    }
  }
}
```

## 5. Data Models

### Firestore Collections (reference — see ARD for full detail)

| Collection Path | Document ID | Key Fields |
|----------------|-------------|-----------|
| `users/{userId}` | Firebase Auth UID | displayName, email, createdAt |
| `users/{userId}/habits/{habitId}` | Auto-generated | name, frequency, reminder, longestStreak, completions (map), createdAt, updatedAt |

Completions are stored as a map on the habit document (`date string → UTC timestamp`), not as a subcollection. This provides single-read access and natural deduplication.

### Python Data Classes (Service Layer)

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

class FrequencyType(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    CUSTOM = "custom"

@dataclass
class Frequency:
    type: FrequencyType
    days_per_week: Optional[int] = None
    specific_days: Optional[list[str]] = None

@dataclass
class Reminder:
    enabled: bool
    time: Optional[str] = None       # "HH:MM" in UTC

@dataclass
class Habit:
    id: str
    name: str
    frequency: Frequency
    reminder: Reminder
    longest_streak: int
    completions: dict[str, str]      # date string → UTC timestamp string
    created_at: datetime
    updated_at: datetime

@dataclass
class User:
    id: str
    display_name: str
    email: str
    created_at: datetime
```

## 6. Error Handling & Edge Cases

### Error Response Format

All errors follow the standard GraphQL error format with an `extensions` field for machine-readable codes:

```json
{
  "errors": [
    {
      "message": "Habit not found",
      "path": ["habit"],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ]
}
```

### Error Codes

| Code | HTTP-equivalent | When |
|------|----------------|------|
| `UNAUTHENTICATED` | 401 | Missing or invalid Firebase ID token |
| `NOT_FOUND` | 404 | Habit or completion doesn't exist, or belongs to another user |
| `VALIDATION_ERROR` | 400 | Invalid input (e.g., missing required fields, invalid frequency config) |
| `ALREADY_EXISTS` | 409 | N/A for v1 (completions are idempotent overwrites) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Edge Cases

| Case | Behavior |
|------|----------|
| Log completion for future date | Rejected — `VALIDATION_ERROR` |
| Log completion for same date twice | Idempotent overwrite — same map key is overwritten, returns success |
| Undo completion that doesn't exist | Returns `true` (idempotent) — deleting a non-existent map key is a no-op |
| Delete habit | Hard delete — single document deletion (completions are embedded in the habit document) |
| `daysPerWeek` provided for DAILY frequency | Ignored — only used for WEEKLY |
| `specificDays` provided for non-CUSTOM frequency | Ignored |
| Reminder `enabled=true` without `time` | `VALIDATION_ERROR` |
| `longestStreak` update by client with value lower than current | Client-side responsibility — clients only write when new streak exceeds stored value |

## 7. Testing Strategy

### Test Pyramid

```
         ┌──────────┐
         │   E2E    │   Few — deployed function + real Firestore
         ├──────────┤
         │ Service  │   Many — business logic with mocked repos
         ├──────────┤
         │  Repo    │   Medium — Firestore emulator
         └──────────┘
```

### Tools
- **Framework:** pytest
- **Firestore:** Firebase Emulator Suite (local)
- **Auth mocks:** Mocked Firebase Admin SDK `verify_id_token`
- **Coverage:** pytest-cov, target 90%+

### Test Categories

**Repository tests (Firestore emulator):**
- CRUD operations for users, habits
- Completion map operations (set key, delete key, idempotent overwrite)
- Habit deletion (single document)

**Service tests (mocked repos):**
- Validation rules (future dates rejected, required fields)
- Stats computation (completion rate calculation)
- Longest streak high-water mark logic (only increases, never decreases)
- Edge cases (empty completion history, single completion)

**Transport/resolver tests:**
- Auth middleware (valid token, invalid token, missing token)
- Input validation (GraphQL type checking)
- Error formatting

**E2E tests (deployed to emulator):**
- Full flow: create user → create habit → log completions → query stats
- Concurrent completion logging (dedup)

## 8. Performance Considerations

| Area | Concern | Mitigation |
|------|---------|-----------|
| Cold starts | Python Cloud Functions ~1-3s cold start | Use `min_instances=1` in production |
| Stats computation | Scanning completions map for all habits | 1 read per habit (completions embedded in document). Compute per-habit, fan out. |
| Habit document size | Completions map grows over time | ~40 bytes per entry supports ~25,000 completions (~68 years daily) within Firestore's 1MB limit |
| Habit deletion | Single document delete — no cascading needed | No concern — completions are embedded in the habit document |

## 9. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | Should `logCompletion` default `date` to server-side "today"? | Decided: client always sends date (client knows user's current timezone context) |
| 2 | Rate limiting strategy — per-user or global? | Deferred to v2 |
| 3 | Should `deleteHabit` return the deleted habit or just a boolean? | Decided: boolean for simplicity |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-11 | Documentation | Initial draft |
| 2026-03-11 | Documentation | Added Docker support: Dockerfile, docker-compose.yml, project structure updated with root-level Docker files |
| 2026-03-11 | Documentation | All dates UTC (server timezone-agnostic), completions as map on habit doc (eliminated subcollection + completion_repo + completion_service + completion resolver), removed `updateLongestStreak` mutation (clients write directly), removed timezone fields from schema, added firebase.json config |
