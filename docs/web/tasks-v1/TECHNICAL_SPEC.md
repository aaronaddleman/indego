# Technical Spec — Tasks & Lists

## 1. Summary

Add task management to Indago: CRUD for tasks with markdown descriptions, priority, due dates, unlimited subtask nesting, and user-created lists. Restructure navigation from flat 4-tab to Habits/Tasks/Settings top-level with sub-tabs within Habits.

## 2. Goals & Non-Goals

**Goals:**
- Full task CRUD via GraphQL
- Subtask nesting with flat `parentId` model
- Lists (Inbox + custom)
- Markdown description rendering
- Priority P1-P4, due dates, sort preferences
- Navigation restructure

**Non-Goals:**
- Recurring tasks, sharing, attachments, time tracking
- Pagination (v1 fetches all tasks per list)
- Drag-and-drop reordering (v1 uses move up/down buttons)

## 3. Design / Architecture

### 4 Implementation Phases

#### Phase 1: API + Data Model
New Firestore collections, GraphQL schema, resolvers, services, repositories.

#### Phase 2: Navigation Restructure
Top-level Habits/Tasks/Settings. Sub-tabs within Habits.

#### Phase 3: Task Views
List view, task creation, task detail with markdown, completion toggle.

#### Phase 4: Subtasks & Organization
Nesting UI, move between lists, sort controls, hide completed.

---

### Phase 1: API + Data Model

#### Schema Changes

Add to `api/functions/schema.graphql`:

```graphql
enum TaskPriority { P1 P2 P3 P4 }
enum SortPreference { MANUAL DUE_DATE PRIORITY CREATED_AT }

type Task {
  id: ID!
  title: String!
  description: String
  listId: ID!
  parentId: ID
  priority: TaskPriority!
  dueDate: Date
  completed: Boolean!
  completedAt: DateTime
  sortOrder: Float!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type TaskList {
  id: ID!
  name: String!
  isInbox: Boolean!
  sortPreference: SortPreference!
  taskCount: Int!
  createdAt: DateTime!
}

input CreateTaskInput {
  title: String!
  description: String
  listId: ID
  parentId: ID
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
```

Add to Query type:
```graphql
tasks(listId: ID, completed: Boolean): [Task!]!
task(id: ID!): Task
taskLists: [TaskList!]!
```

Add to Mutation type:
```graphql
createTask(input: CreateTaskInput!): Task!
updateTask(id: ID!, input: UpdateTaskInput!): Task!
deleteTask(id: ID!): Boolean!
completeTask(id: ID!): [Task!]!
uncompleteTask(id: ID!): Task!
reorderTask(id: ID!, sortOrder: Float!): Task!
createTaskList(name: String!): TaskList!
updateTaskList(id: ID!, name: String, sortPreference: SortPreference): TaskList!
deleteTaskList(id: ID!): Boolean!
```

#### API Files (Layered Architecture)

| File | Action | Description |
|------|--------|-------------|
| `api/functions/schema.graphql` | Modify | Add enums, types, inputs, queries, mutations |
| `api/functions/app/repositories/task_repo.py` | Create | Firestore CRUD for tasks collection |
| `api/functions/app/repositories/list_repo.py` | Create | Firestore CRUD for lists collection |
| `api/functions/app/services/task_service.py` | Create | Business logic: create with defaults, cascade complete, cascade delete, reorder |
| `api/functions/app/services/list_service.py` | Create | Business logic: ensure inbox, delete moves tasks |
| `api/functions/app/resolvers/task_resolvers.py` | Create | GraphQL resolvers for task queries/mutations |
| `api/functions/app/resolvers/list_resolvers.py` | Create | GraphQL resolvers for list queries/mutations |
| `api/functions/main.py` | Modify | Register new resolvers |
| `api/functions/tests/test_tasks.py` | Create | Task CRUD, completion cascade, subtask delete |
| `api/functions/tests/test_lists.py` | Create | List CRUD, inbox auto-create, delete moves tasks |

#### Firestore Rules

```
match /tasks/{taskId} {
  allow read, write: if request.auth != null
    && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null
    && request.auth.uid == request.resource.data.userId;
}

match /lists/{listId} {
  allow read, write: if request.auth != null
    && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null
    && request.auth.uid == request.resource.data.userId;
}
```

#### Firestore Indexes

```
tasks: userId ASC, listId ASC, sortOrder ASC
tasks: userId ASC, listId ASC, completed ASC, sortOrder ASC
tasks: userId ASC, parentId ASC
lists: userId ASC, createdAt ASC
```

#### Key Business Logic

**Inbox auto-creation:**
```python
def ensure_inbox(user_id):
    existing = list_repo.get_inbox(user_id)
    if not existing:
        return list_repo.create(user_id, "Inbox", is_inbox=True)
    return existing
```

**Cascade complete:**
```python
def complete_task(user_id, task_id):
    task = task_repo.get(user_id, task_id)
    descendants = task_repo.get_descendants(user_id, task_id)
    now = datetime.utcnow()
    all_tasks = [task] + descendants
    for t in all_tasks:
        task_repo.update(user_id, t["id"], completed=True, completedAt=now)
    return all_tasks
```

**Cascade delete:**
```python
def delete_task(user_id, task_id):
    descendants = task_repo.get_descendants(user_id, task_id)
    for t in descendants:
        task_repo.delete(user_id, t["id"])
    task_repo.delete(user_id, task_id)
```

**Get descendants (for cascade operations):**
```python
def get_descendants(user_id, parent_id):
    """Recursively find all descendants of a task."""
    children = list(tasks_ref(user_id).where("parentId", "==", parent_id).stream())
    result = []
    for child in children:
        data = child.to_dict()
        data["id"] = child.id
        result.append(data)
        result.extend(get_descendants(user_id, child.id))
    return result
```

**Fractional sort order:**
```python
def compute_sort_order(before: float | None, after: float | None) -> float:
    if before is None and after is None:
        return 1.0
    if before is None:
        return after - 1.0
    if after is None:
        return before + 1.0
    return (before + after) / 2.0
```

---

### Phase 2: Navigation Restructure

#### New Navigation Layout

```
Top bar:    [Habits]  [Tasks]  [Settings]
                |
Sub-tabs:   [Today] [History] [Streaks]
```

#### Web Files Changed

| File | Action | Description |
|------|--------|-------------|
| `web/src/components/layout/TopNav.tsx` | Create | Top-level Habits/Tasks/Settings navigation |
| `web/src/components/layout/TopNav.module.css` | Create | Styling |
| `web/src/components/layout/HabitSubNav.tsx` | Create | Today/History/Streaks sub-tabs within Habits |
| `web/src/components/layout/HabitSubNav.module.css` | Create | Styling |
| `web/src/components/layout/BottomNav.tsx` | Delete | Replaced by TopNav |
| `web/src/components/layout/PageShell.tsx` | Modify | Use TopNav + optional HabitSubNav |
| `web/src/App.tsx` | Modify | Restructure routes: /habits/*, /tasks/*, /settings |

#### Route Structure

```
/                    → redirect to /habits
/habits              → Today (dashboard)
/habits/history      → History page
/habits/streaks      → Streaks list
/habits/streaks/:id  → Streak detail
/tasks               → Task list (Inbox)
/tasks/:id           → Task detail
/settings            → Settings page
```

---

### Phase 3: Task Views

#### Web Files

| File | Action | Description |
|------|--------|-------------|
| `web/src/pages/TasksPage.tsx` | Create | Main task list view with list selector sidebar |
| `web/src/pages/TasksPage.module.css` | Create | Styling |
| `web/src/pages/TaskDetailPage.tsx` | Create | Task detail with markdown rendering |
| `web/src/pages/TaskDetailPage.module.css` | Create | Styling |
| `web/src/components/tasks/TaskCard.tsx` | Create | Task row: checkbox, title, priority badge, due date |
| `web/src/components/tasks/TaskCard.module.css` | Create | Styling |
| `web/src/components/tasks/TaskForm.tsx` | Create | Create/edit form: title, description (markdown textarea), priority, due date, list |
| `web/src/components/tasks/TaskForm.module.css` | Create | Styling |
| `web/src/components/tasks/QuickAdd.tsx` | Create | Inline text input for fast task creation |
| `web/src/components/tasks/QuickAdd.module.css` | Create | Styling |
| `web/src/components/tasks/ListSelector.tsx` | Create | List picker: Inbox + custom lists |
| `web/src/components/tasks/ListSelector.module.css` | Create | Styling |
| `web/src/components/tasks/PriorityBadge.tsx` | Create | P1-P4 color-coded badge |
| `web/src/components/tasks/PriorityBadge.module.css` | Create | Styling |
| `web/src/graphql/queries.ts` | Modify | Add GET_TASKS, GET_TASK, GET_TASK_LISTS |
| `web/src/graphql/mutations.ts` | Modify | Add task and list mutations |

#### Priority Colors (using semantic tokens)

| Priority | Color | Meaning |
|----------|-------|---------|
| P1 | `--color-danger` | Critical / urgent |
| P2 | `--color-energy` | High / important |
| P3 | `--color-accent` | Medium / normal |
| P4 | `--color-on-surface-muted` | Low / someday |

#### Markdown Rendering

Install `react-markdown` (~15KB gzipped). Render in TaskDetailPage:

```tsx
import ReactMarkdown from 'react-markdown';

<div className={styles.description}>
  <ReactMarkdown>{task.description}</ReactMarkdown>
</div>
```

---

### Phase 4: Subtasks & Organization

#### Nesting UI

Client builds tree from flat `parentId` references:

```typescript
function buildTree(tasks: Task[]): TaskNode[] {
  const map = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const parentId = task.parentId ?? null;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId)!.push(task);
  }
  function build(parentId: string | null): TaskNode[] {
    return (map.get(parentId) ?? []).map(task => ({
      ...task,
      children: build(task.id),
    }));
  }
  return build(null);
}
```

Visual indentation capped at 4 levels (64px max indent). Deeper tasks still nest logically but don't indent further.

#### Sort Controls

Dropdown in list header: "Sort by: Manual | Due Date | Priority | Created"

Client-side re-sort from cached data (no server round-trip):
```typescript
function sortTasks(tasks: Task[], pref: SortPreference): Task[] {
  switch (pref) {
    case 'MANUAL': return [...tasks].sort((a, b) => a.sortOrder - b.sortOrder);
    case 'DUE_DATE': return [...tasks].sort((a, b) => (a.dueDate ?? '9999') > (b.dueDate ?? '9999') ? 1 : -1);
    case 'PRIORITY': return [...tasks].sort((a, b) => a.priority - b.priority);
    case 'CREATED_AT': return [...tasks].sort((a, b) => a.createdAt > b.createdAt ? 1 : -1);
  }
}
```

#### Additional Web Files (Phase 4)

| File | Action | Description |
|------|--------|-------------|
| `web/src/components/tasks/SubtaskList.tsx` | Create | Indented subtask rendering with add subtask |
| `web/src/components/tasks/SortControl.tsx` | Create | Sort preference dropdown |
| `web/src/components/tasks/MoveToList.tsx` | Create | List picker for moving tasks |

## 4. API Contracts

See GraphQL schema in Phase 1 section above.

## 5. Data Models

See Firestore schemas in ARD section 6.

## 6. Error Handling & Edge Cases

| Case | Behavior |
|------|----------|
| Create task without listId | Server creates/finds Inbox, assigns task there |
| Delete list with tasks | Tasks move to Inbox before list is deleted |
| Delete task with subtasks | All descendants deleted recursively |
| Complete task with subtasks | All descendants completed, all returned |
| Uncomplete task | Only target task uncompleted, subtasks unchanged |
| Reorder to same position | No-op |
| Task references deleted parent | Orphaned tasks treated as top-level (parentId doesn't match any task) |
| Empty title | Validation error from API |

## 7. Testing Strategy

### API Tests
- Task CRUD (create, read, update, delete)
- Subtask cascade: complete parent → children completed
- Subtask cascade: delete parent → children deleted
- List CRUD with Inbox auto-creation
- Delete list → tasks move to Inbox
- Auth: can't access other user's tasks
- Reorder: sort order updates correctly

### Web Tests (manual via puppeteer)
- Create task via quick add
- Create task via full form with description, priority, due date
- Complete/uncomplete task
- Add subtask
- Switch lists
- Sort by each option
- Markdown renders correctly
- All themes display correctly

## 8. Performance Considerations

- **Fetch all tasks per list** — acceptable for v1 (target <500 tasks per list)
- **Cascade operations** — get_descendants does recursive Firestore queries. For deeply nested trees, this could be slow. Cap at ~100 descendants per operation.
- **taskCount** — maintained as a denormalized field, updated on create/delete. Avoids count queries.
- **Fractional sort order** — may need rebalancing if many insertions cluster values. Not a v1 concern.

## 9. Open Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Install `react-markdown` as dependency | Yes — add to package.json |
| 2 | Should task detail be a separate page or modal? | Separate page (`/tasks/:id`) for deep linking |
| 3 | Mobile nav: bottom bar or top bar? | Keep bottom for mobile (Habits/Tasks/Settings), sub-tabs as horizontal scroll within each section |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-28 | Documentation | Initial draft |
