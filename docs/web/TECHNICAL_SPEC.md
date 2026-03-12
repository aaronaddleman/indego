# Technical Spec — Indago Web Client (PWA)

## 1. Summary

This document specifies the Indago web client, a Progressive Web Application built with React, Vite, and TypeScript. It consumes the existing GraphQL API via Apollo Client, uses Firebase Auth for authentication, and Firestore client SDK for real-time sync. The app is hosted on Firebase Hosting as static files.

## 2. Goals & Non-Goals

### Goals
- Define the component architecture and routing structure
- Specify the data layer (Apollo Client + Firestore listeners)
- Define the PWA configuration (Service Worker, manifest, offline reads)
- Specify the design system (indigo theme, design tokens)
- Establish testing strategy
- Document the API schema change needed (`logCompletion`/`undoCompletion` → return `Habit!`)

### Non-Goals
- API implementation details (see API Technical Spec)
- iOS client implementation
- Offline mutation queuing (v2)
- CI/CD pipeline details (see Deployment Plan)

## 3. Design / Architecture

### Application Architecture

```
┌─────────────────────────────────────────────────┐
│                   App Shell                      │
│  ┌─────────────────────────────────────────┐    │
│  │           React Router                   │    │
│  │  ┌──────────────────────────────────┐   │    │
│  │  │            Pages                  │   │    │
│  │  │  /login  /dashboard  /habit/:id  │   │    │
│  │  │  /stats  /settings               │   │    │
│  │  └──────────┬───────────────────────┘   │    │
│  │             │                            │    │
│  │  ┌──────────▼───────────────────────┐   │    │
│  │  │         Components                │   │    │
│  │  │  HabitCard  Calendar  StatsChart  │   │    │
│  │  │  HabitForm  StreakBadge  NavBar   │   │    │
│  │  └──────────┬───────────────────────┘   │    │
│  └─────────────┤                            │    │
│                │                            │    │
│  ┌─────────────▼───────────────────────┐   │    │
│  │          Data Layer                  │   │    │
│  │                                      │   │    │
│  │  Apollo Client ←──→ GraphQL API      │   │    │
│  │  Firebase Auth ←──→ Firebase          │   │    │
│  │  Firestore SDK ←──→ Real-time sync   │   │    │
│  └──────────────────────────────────────┘   │    │
│                                              │    │
│  ┌──────────────────────────────────────┐   │    │
│  │        Service Worker (Workbox)       │   │    │
│  │  - App shell precaching               │   │    │
│  │  - Runtime caching (stale-while-rev)  │   │    │
│  │  - Notification scheduling            │   │    │
│  └──────────────────────────────────────┘   │    │
└──────────────────────────────────────────────┘
```

### Project Structure

```
web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── manifest.json
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── favicon.ico
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Router + providers
│   ├── vite-env.d.ts
│   ├── config/
│   │   ├── firebase.ts             # Firebase app init + auth + firestore
│   │   └── apollo.ts               # Apollo Client setup + cache config
│   ├── auth/
│   │   ├── AuthProvider.tsx         # Auth context + state management
│   │   ├── AuthGuard.tsx            # Route protection
│   │   └── useAuth.ts              # Auth hook
│   ├── graphql/
│   │   ├── queries.ts               # GraphQL query documents
│   │   ├── mutations.ts             # GraphQL mutation documents
│   │   └── types.ts                 # Generated TypeScript types
│   ├── hooks/
│   │   ├── useHabits.ts             # Habits list hook (Apollo + Firestore listener)
│   │   ├── useHabit.ts              # Single habit hook
│   │   ├── useStats.ts              # Stats hook
│   │   ├── useStreak.ts             # Client-side streak calculation
│   │   ├── useSync.ts               # Sync status hook
│   │   └── useNotifications.ts      # Browser notification hook
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── HabitDetailPage.tsx
│   │   ├── StatsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── NavBar.tsx
│   │   │   ├── SyncIndicator.tsx
│   │   │   └── PageShell.tsx
│   │   ├── habits/
│   │   │   ├── HabitCard.tsx
│   │   │   ├── HabitList.tsx
│   │   │   ├── HabitForm.tsx
│   │   │   └── CompletionToggle.tsx
│   │   ├── calendar/
│   │   │   ├── MonthView.tsx
│   │   │   ├── WeekView.tsx
│   │   │   └── CalendarTabs.tsx
│   │   ├── stats/
│   │   │   ├── StatsOverview.tsx
│   │   │   └── HabitStatsCard.tsx
│   │   └── common/
│   │       ├── StreakBadge.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── EmptyState.tsx
│   │       └── LoadingSpinner.tsx
│   └── styles/
│       ├── tokens.css               # Design tokens (colors, spacing, typography)
│       ├── global.css               # Reset + base styles
│       └── *.module.css             # Component-scoped styles (co-located)
├── sw/
│   └── notifications.ts            # Service Worker notification logic
└── tests/
    ├── setup.ts
    ├── components/
    └── hooks/
```

### Routing

| Route | Page | Auth Required | Description |
|-------|------|---------------|-------------|
| `/login` | LoginPage | No | Sign-in / sign-up |
| `/` | DashboardPage | Yes | Habits list with today's status |
| `/habit/:id` | HabitDetailPage | Yes | Single habit detail + calendar |
| `/stats` | StatsPage | Yes | Aggregate and per-habit stats |
| `/settings` | SettingsPage | Yes | User profile, sync info, sign out |

Unauthenticated users are redirected to `/login`. After sign-in, redirect to `/`.

### Firebase Hosting SPA Config

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|map)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      },
      {
        "source": "index.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      }
    ]
  }
}
```

## 4. Data Layer

### Apollo Client Configuration

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getAuth } from 'firebase/auth';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL,
});

const authLink = setContext(async (_, { headers }) => {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : '';
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Habit: { keyFields: ['id'] },
      User: { keyFields: ['id'] },
    },
  }),
});
```

### Cache Persistence

Apollo cache persisted to IndexedDB via `apollo3-cache-persist` for offline reads:

```typescript
import { persistCache, LocalForageWrapper } from 'apollo3-cache-persist';
import localforage from 'localforage';

await persistCache({
  cache,
  storage: new LocalForageWrapper(localforage),
});
```

### Firestore Real-Time Listener

Firestore listener established on app load for real-time sync. On snapshot changes, invalidate the Apollo cache to trigger refetch:

```typescript
import { collection, onSnapshot } from 'firebase/firestore';

function useHabitsSync(userId: string) {
  useEffect(() => {
    const habitsRef = collection(db, 'users', userId, 'habits');
    const unsubscribe = onSnapshot(habitsRef, () => {
      // Invalidate Apollo cache — triggers refetch of habits query
      client.refetchQueries({ include: ['GetHabits'] });
    });
    return unsubscribe;
  }, [userId]);
}
```

### GraphQL Operations

**Queries:**

```graphql
query GetHabits {
  habits {
    id
    name
    frequency { type daysPerWeek specificDays }
    reminder { enabled time }
    longestStreak
    completions { date completedAt }
    createdAt
    updatedAt
  }
}

query GetHabit($id: ID!) {
  habit(id: $id) {
    id
    name
    frequency { type daysPerWeek specificDays }
    reminder { enabled time }
    longestStreak
    completions { date completedAt }
    createdAt
    updatedAt
  }
}

query GetStats($dateRange: DateRangeInput!) {
  stats(dateRange: $dateRange) {
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

query GetMe {
  me { id email displayName createdAt }
}

query GetVersion {
  version { commit deployedAt }
}
```

**Mutations:**

```graphql
mutation UpsertUser($displayName: String!) {
  upsertUser(displayName: $displayName) {
    id email displayName createdAt
  }
}

mutation CreateHabit($input: CreateHabitInput!) {
  createHabit(input: $input) {
    id name frequency { type daysPerWeek specificDays }
    reminder { enabled time }
    longestStreak completions { date completedAt }
    createdAt updatedAt
  }
}

mutation UpdateHabit($id: ID!, $input: UpdateHabitInput!) {
  updateHabit(id: $id, input: $input) {
    id name frequency { type daysPerWeek specificDays }
    reminder { enabled time }
    longestStreak completions { date completedAt }
    createdAt updatedAt
  }
}

mutation DeleteHabit($id: ID!) {
  deleteHabit(id: $id)
}

# NOTE: API schema change required — these should return Habit! not Completion!/Boolean!
mutation LogCompletion($habitId: ID!, $date: Date!) {
  logCompletion(habitId: $habitId, date: $date) {
    id name longestStreak
    completions { date completedAt }
    updatedAt
  }
}

mutation UndoCompletion($habitId: ID!, $date: Date!) {
  undoCompletion(habitId: $habitId, date: $date) {
    id name longestStreak
    completions { date completedAt }
    updatedAt
  }
}
```

### API Schema Change Required

Before the web client ships, the API schema must be updated:

```graphql
# BEFORE (current)
logCompletion(habitId: ID!, date: Date!): Completion!
undoCompletion(habitId: ID!, date: Date!): Boolean!

# AFTER (required)
logCompletion(habitId: ID!, date: Date!): Habit!
undoCompletion(habitId: ID!, date: Date!): Habit!
```

This allows Apollo to automatically update its cache with the full habit (including recalculated completions list) after a completion toggle, avoiding an extra refetch.

## 5. Client-Side Streak Calculation

```typescript
interface Completion {
  date: string;        // "YYYY-MM-DD"
  completedAt: string; // ISO 8601 UTC
}

function calculateCurrentStreak(
  completions: Completion[],
  frequency: Frequency,
  today: string          // "YYYY-MM-DD" in user's local timezone
): number {
  const completedDates = new Set(completions.map(c => c.date));
  const expectedDates = getExpectedDates(frequency, today);

  let streak = 0;
  for (const date of expectedDates) {
    if (completedDates.has(date)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// Returns expected dates in reverse chronological order from today
function getExpectedDates(frequency: Frequency, today: string): string[] {
  // Implementation depends on frequency type:
  // DAILY: every day backwards from today
  // WEEKLY: N most recent days per week backwards
  // CUSTOM: only specific days of week backwards
}
```

When `currentStreak > habit.longestStreak`, write the new value directly to Firestore:

```typescript
import { doc, updateDoc } from 'firebase/firestore';

async function updateLongestStreak(userId: string, habitId: string, newStreak: number) {
  const habitRef = doc(db, 'users', userId, 'habits', habitId);
  await updateDoc(habitRef, { longestStreak: newStreak });
}
```

## 6. Design System

### Indigo Color Palette

```css
:root {
  /* Primary — Indigo */
  --color-primary-50: #eef2ff;
  --color-primary-100: #e0e7ff;
  --color-primary-200: #c7d2fe;
  --color-primary-300: #a5b4fc;
  --color-primary-400: #818cf8;
  --color-primary-500: #6366f1;    /* Primary */
  --color-primary-600: #4f46e5;    /* Primary hover */
  --color-primary-700: #4338ca;
  --color-primary-800: #3730a3;
  --color-primary-900: #312e81;

  /* Neutral */
  --color-neutral-50: #f9fafb;
  --color-neutral-100: #f3f4f6;
  --color-neutral-200: #e5e7eb;
  --color-neutral-300: #d1d5db;
  --color-neutral-400: #9ca3af;
  --color-neutral-500: #6b7280;
  --color-neutral-600: #4b5563;
  --color-neutral-700: #374151;
  --color-neutral-800: #1f2937;
  --color-neutral-900: #111827;

  /* Semantic */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;

  /* Border radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
}
```

### Component Styling Pattern

Each component has a co-located CSS Module:

```
components/habits/
├── HabitCard.tsx
└── HabitCard.module.css
```

```css
/* HabitCard.module.css */
.card {
  background: var(--color-neutral-50);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border-left: 4px solid var(--color-primary-500);
}

.card[data-completed="true"] {
  border-left-color: var(--color-success);
  opacity: 0.8;
}
```

### Responsive Breakpoints

```css
/* Mobile-first — no media query needed for mobile */
@media (min-width: 768px)  { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
```

## 7. PWA Configuration

### Web App Manifest

```json
{
  "name": "Indago — Habits Tracker",
  "short_name": "Indago",
  "description": "Track your habits, build streaks, stay consistent.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Vite PWA Plugin Config

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/us-central1-indego-bc76b\.cloudfunctions\.net\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
      manifest: false, // Use public/manifest.json
    }),
  ],
});
```

### Service Worker Notifications

```typescript
// sw/notifications.ts — runs in Service Worker context
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_REMINDER') {
    const { habitName, time } = event.data;
    // Schedule notification at the specified time
    scheduleNotification(habitName, time);
  }
});

function scheduleNotification(habitName: string, timeUTC: string) {
  // Convert UTC time to next occurrence
  // Use setTimeout or Notification API scheduling
  const notification = new Notification(`Time to: ${habitName}`, {
    body: 'Keep your streak going!',
    icon: '/icons/icon-192.png',
    tag: `reminder-${habitName}`,
  });
}
```

## 8. Error Handling

### GraphQL Errors

Apollo Client error handling via `onError` link:

```typescript
import { onError } from '@apollo/client/link/error';

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const code = err.extensions?.code;
      if (code === 'UNAUTHENTICATED') {
        // Sign out + redirect to login
        getAuth().signOut();
      }
    }
  }
  if (networkError) {
    // Update sync status to offline
    setSyncStatus('offline');
  }
});
```

### Optimistic Updates

For completion toggling, update the UI immediately before the server responds:

```typescript
const [logCompletion] = useMutation(LOG_COMPLETION, {
  optimisticResponse: {
    logCompletion: {
      __typename: 'Habit',
      id: habitId,
      completions: [...currentCompletions, { date: today, completedAt: new Date().toISOString() }],
      // ... other fields
    },
  },
});
```

## 9. Testing Strategy

### Tools
- **Unit/Component:** Vitest + React Testing Library
- **E2E:** Playwright
- **Accessibility:** axe-core (via @axe-core/react in dev, Playwright axe integration in CI)
- **Linting:** ESLint + Prettier

### Test Categories

**Component tests (Vitest + RTL):**
- Render states (loading, error, empty, populated)
- User interactions (completion toggle, form submission, navigation)
- Auth guard behavior (redirect when unauthenticated)

**Hook tests (Vitest):**
- `useStreak` — streak calculation for daily, weekly, custom frequencies
- `useSync` — sync status transitions
- `useAuth` — auth state management

**Integration tests (Vitest):**
- Apollo Client with mocked GraphQL responses
- Form validation flows

**E2E tests (Playwright):**
- Full auth flow: sign in → dashboard → create habit → complete → verify
- PWA installability check
- Offline mode: disconnect → verify cached data visible → reconnect

### Coverage Target
- Component + hook tests: 80%+
- E2E: critical paths (auth, CRUD, completion)

## 10. Performance Considerations

| Area | Target | Strategy |
|------|--------|----------|
| Initial load | FCP < 1.5s, TTI < 3s | Code splitting via React.lazy + Suspense per route |
| Bundle size | < 150KB gzipped | Tree-shaking, dynamic imports for Firebase/Apollo |
| Subsequent loads | < 500ms | Service Worker precaches app shell |
| API latency | < 500ms perceived | Optimistic updates for completions |
| Image assets | Minimal | SVG icons, no heavy images in v1 |
| Font loading | No FOUT | `font-display: swap` + preload Inter |

### Code Splitting

```typescript
// App.tsx — lazy-loaded routes
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const HabitDetailPage = lazy(() => import('./pages/HabitDetailPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
```

## 11. Dependencies

| Package | Purpose | Approx Size |
|---------|---------|-------------|
| react, react-dom | UI framework | ~40KB |
| react-router-dom | Client-side routing | ~12KB |
| @apollo/client | GraphQL client + cache | ~35KB |
| apollo3-cache-persist | Offline cache persistence | ~3KB |
| localforage | IndexedDB wrapper | ~8KB |
| firebase | Auth + Firestore SDK | ~30KB (tree-shaken) |
| vite-plugin-pwa | PWA + Service Worker | Build-time only |
| date-fns | Date manipulation | ~5KB (tree-shaken) |

Dev dependencies: vitest, @testing-library/react, playwright, eslint, prettier, typescript

## 12. Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | GraphQL codegen (graphql-codegen) for TypeScript types? | Open — recommended but not required for v1 |
| 2 | Inter font: self-hosted or Google Fonts CDN? | Open — leaning self-hosted for offline support |
| 3 | Animation library for micro-interactions (completion check, streak counter)? | Open — CSS transitions may suffice for v1 |

## 13. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-11 | Documentation | Initial draft |
