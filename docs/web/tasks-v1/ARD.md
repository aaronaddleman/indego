# Architecture Requirements Document (ARD) — Tasks & Lists

## 1. Overview

- **Project Name:** Tasks & Lists
- **Purpose:** Add project/task management alongside habits. Tasks are one-time work items with titles, markdown descriptions, due dates, priorities, subtask nesting, and organization into lists.
- **Scope:** API (new GraphQL types + Firestore collection) and Web client (new views, nav restructure)
- **Goals:**
  - Tasks as a first-class entity alongside habits
  - Unlimited subtask nesting
  - Lists (default Inbox + user-created)
  - Priority levels P1-P4
  - Markdown descriptions for rich notes
  - User-selectable sorting (due date, priority, manual)

## 2. System Context

Tasks live in the same system as habits:
- Same GraphQL API (Cloud Run)
- Same Firestore database (new `tasks` and `lists` collections)
- Same Firebase Auth
- Same web client (new views under a restructured nav)

### Navigation Restructure

```
Current:  [Today] [History] [Streaks] [Settings]

New:      [Habits] [Tasks] [Settings]
              |
          [Today] [History] [Streaks]  (sub-tabs within Habits)
```

## 3. Functional Requirements

### Tasks

| ID | Requirement |
|----|-------------|
| T-1 | Create a task with title (required), description (markdown, optional), due date (optional), priority (P1-P4, default P4) |
| T-2 | Complete/uncomplete a task (toggle) |
| T-3 | Edit task title, description, due date, priority, list assignment |
| T-4 | Delete a task (cascades to subtasks) |
| T-5 | Nest tasks — any task can have subtasks, unlimited depth |
| T-6 | Move a task between lists |
| T-7 | Reorder tasks within a list (manual sort) |

### Lists

| ID | Requirement |
|----|-------------|
| L-1 | Default "Inbox" list exists for every user (cannot be deleted) |
| L-2 | Create custom lists with a name |
| L-3 | Rename a list |
| L-4 | Delete a list (tasks move to Inbox) |

### Sorting & Filtering

| ID | Requirement |
|----|-------------|
| S-1 | Sort by: due date, priority, manual order, created date |
| S-2 | User's sort preference persists per list |
| S-3 | Show completed tasks (toggle to hide/show) |

### Description

| ID | Requirement |
|----|-------------|
| D-1 | Task description supports Markdown rendering |
| D-2 | Edit description in a textarea with preview |

## 4. Non-Functional Requirements

- **Performance:** Task list loads in <500ms for up to 500 tasks
- **Offline:** Tasks viewable offline via Apollo cache (same as habits)
- **Sync:** Real-time via Apollo refetch (same pattern as habits)

## 5. Architecture Decisions

| Decision | Choice | Rationale | Alternatives Rejected |
|----------|--------|-----------|----------------------|
| Data store | Separate `tasks` and `lists` Firestore collections | Tasks have fundamentally different schema from habits. Separate collections allow independent queries and indexes. | Subcollection under users (harder to query), same collection as habits (schema mismatch) |
| Nesting model | `parentId` field on task document. No recursive GQL type — flat list returned, client builds tree. | Simple, flexible, supports unlimited depth. Avoids GQL recursive query depth problem. | Subcollections per level (hard to query across levels), materialized path (complex), recursive GQL `subtasks` field (can't query unlimited depth) |
| Sort order | `sortOrder` float field on task document | Allows insertion between items without renumbering. Fractional indexing. | Integer index (requires renumbering on insert), linked list (complex queries) |
| Markdown | Client-side rendering only | Description stored as raw markdown string. Rendered in browser. No server processing needed. | Server-side rendering (unnecessary), WYSIWYG editor (heavy dependency) |
| Lists | Separate `lists` collection with user-scoped documents | Clean separation. Inbox created on first task access. | List as a field on task only (no list metadata), hardcoded lists (not extensible) |
| Priority | P1 (highest) to P4 (lowest/default) | Simple, familiar (Asana/Linear style). Stored as integer 1-4. | None/Low/Medium/High (same thing, more verbose), numeric 1-10 (too granular) |
| Navigation | Top-level Habits/Tasks/Settings with sub-tabs | Clean separation of concerns. Habits keep their existing sub-nav. | Single merged view (confusing), 5+ bottom tabs (too crowded) |

## 6. Data Architecture

### Firestore: `tasks` Collection

```
tasks/{taskId}
  userId: string          # Owner
  title: string           # Required
  description: string     # Markdown, optional
  listId: string          # Reference to lists collection, default "inbox"
  parentId: string | null # null = top-level task, otherwise parent task ID
  priority: number        # 1-4 (P1=highest, P4=default)
  dueDate: string | null  # "YYYY-MM-DD" or null
  completed: boolean      # false by default
  completedAt: timestamp | null
  sortOrder: number       # Fractional index for manual ordering
  createdAt: timestamp
  updatedAt: timestamp
```

### Firestore: `lists` Collection

```
lists/{listId}
  userId: string
  name: string            # "Inbox" for default, user-defined otherwise
  isInbox: boolean        # true for the auto-created default list
  sortPreference: string  # "manual" | "dueDate" | "priority" | "createdAt"
  createdAt: timestamp
  updatedAt: timestamp
```

### GraphQL Schema Additions

```graphql
enum TaskPriority { P1 P2 P3 P4 }
enum SortPreference { MANUAL DUE_DATE PRIORITY CREATED_AT }

type Task {
  id: ID!
  title: String!
  description: String        # Raw Markdown, rendered client-side
  listId: ID!
  parentId: ID               # null = top-level task. Client builds tree from flat list.
  priority: TaskPriority!
  dueDate: Date
  completed: Boolean!
  completedAt: DateTime
  sortOrder: Float!           # Fractional index for manual ordering
  createdAt: DateTime!
  updatedAt: DateTime!
}

type TaskList {
  id: ID!
  name: String!
  isInbox: Boolean!
  sortPreference: SortPreference!
  taskCount: Int!             # Avoids separate count query
  createdAt: DateTime!
}

# ─── Queries (flat lists — client builds tree from parentId) ───

type Query {
  """Get all tasks, optionally filtered by list and completion status"""
  tasks(listId: ID, completed: Boolean): [Task!]!

  """Get a single task by ID"""
  task(id: ID!): Task

  """Get all lists for the authenticated user"""
  taskLists: [TaskList!]!
}

# ─── Mutations ───

input CreateTaskInput {
  title: String!
  description: String
  listId: ID                  # Defaults to user's Inbox
  parentId: ID                # null = top-level task
  priority: TaskPriority
  dueDate: Date
}

input UpdateTaskInput {
  title: String
  description: String
  listId: ID
  parentId: ID
  priority: TaskPriority
  dueDate: Date
}

type Mutation {
  """Create a new task"""
  createTask(input: CreateTaskInput!): Task!

  """Update an existing task"""
  updateTask(id: ID!, input: UpdateTaskInput!): Task!

  """Delete a task and all its subtasks"""
  deleteTask(id: ID!): Boolean!

  """Complete a task and all its subtasks. Returns all affected tasks."""
  completeTask(id: ID!): [Task!]!

  """Uncomplete a single task (does not affect subtasks)"""
  uncompleteTask(id: ID!): Task!

  """Reorder a task within its list (fractional sort index)"""
  reorderTask(id: ID!, sortOrder: Float!): Task!

  """Create a new list"""
  createTaskList(name: String!): TaskList!

  """Update a list's name or sort preference"""
  updateTaskList(id: ID!, name: String, sortPreference: SortPreference): TaskList!

  """Delete a list — orphaned tasks move to Inbox"""
  deleteTaskList(id: ID!): Boolean!
}
```

#### GQL Design Rationale

| Decision | Rationale |
|----------|-----------|
| No recursive `subtasks` field on Task type | GQL can't query unlimited depth. Flat list + `parentId` lets the client build the tree to any depth. |
| `completeTask` returns `[Task!]!` | Single mutation completes parent + all descendants, returns all affected tasks so Apollo cache updates in one round-trip. |
| `uncompleteTask` returns single `Task!` | Uncompleting only affects the target task, not its children. |
| `reorderTask` is a separate mutation | Keeps `updateTask` clean. Reorder is a positional operation, not a field update. |
| `taskCount` on TaskList | Avoids N+1 count queries when rendering the list sidebar. Server computes from index. |
| `tasks` query has `completed` filter | Server-side filtering is more efficient than fetching all and filtering client-side. |
| Sort order applied client-side | The `tasks` query returns by `sortOrder`. Client re-sorts if user picks a different sort preference. Avoids a server round-trip on sort change. |

## 7. Security & Access Control

- Same auth model as habits — all operations scoped to authenticated user
- Firestore rules: users can only read/write their own tasks and lists
- No sharing in v1 (v4.0 Teams & RBAC milestone)

## 8. Infrastructure & Deployment Overview

- No new infrastructure — same Cloud Run API, same Firestore, same Firebase Hosting
- New Firestore indexes for tasks collection (userId + listId + sortOrder)
- Schema.graphql updated with new types
- API: new task/list resolvers, services, repositories (same layered pattern)

## 9. Open Questions / Risks

| # | Question | Status |
|---|----------|--------|
| 1 | Should completed subtasks auto-complete when parent is completed? | Yes — `completeTask` mutation cascades to all descendants |
| 2 | Max nesting depth for performance? | No hard limit, but UI indentation caps at ~4 levels visually |
| 3 | Markdown library for web client? | `react-markdown` (lightweight, widely used) |
| 4 | Should `tasks` query support pagination? | Not in v1 — fetch all tasks per list. Add cursor pagination if lists exceed ~500 tasks. |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-28 | Documentation | Initial draft |
