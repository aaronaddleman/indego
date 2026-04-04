# GraphQL API Examples

Base URL: `https://us-central1-indego-bc76b.cloudfunctions.net/graphql`

All queries/mutations (except `version`) require an `Authorization: Bearer <token>` header.

---

## Habits

### List all habits
```graphql
query {
  habits {
    id
    name
    frequency { type dueDays }
    reminder { enabled time }
    longestStreak
    completions { date completedAt }
    createdAt
  }
}
```

### Get a single habit
```graphql
query {
  habit(id: "HABIT_ID") {
    id
    name
    frequency { type dueDays }
    completions { date completedAt }
  }
}
```

### Create a habit
```graphql
mutation {
  createHabit(input: {
    name: "Meditate"
    frequency: { type: DAILY }
    reminder: { enabled: true, time: "14:00" }
  }) {
    id
    name
  }
}
```

### Create a weekly habit
```graphql
mutation {
  createHabit(input: {
    name: "Go to gym"
    frequency: { type: WEEKLY, daysOfWeek: ["monday", "wednesday", "friday"] }
  }) {
    id
    name
    frequency { type dueDays }
  }
}
```

### Update a habit
```graphql
mutation {
  updateHabit(id: "HABIT_ID", input: {
    name: "Meditate 10 min"
    reminder: { enabled: true, time: "07:00" }
  }) {
    id
    name
    reminder { enabled time }
  }
}
```

### Delete a habit
```graphql
mutation {
  deleteHabit(id: "HABIT_ID")
}
```

### Log a completion
```graphql
mutation {
  logCompletion(habitId: "HABIT_ID", date: "2026-04-04") {
    id
    completions { date completedAt }
  }
}
```

### Undo a completion
```graphql
mutation {
  undoCompletion(habitId: "HABIT_ID", date: "2026-04-04") {
    id
    completions { date completedAt }
  }
}
```

---

## Tasks

### Create a task (goes to Inbox by default)
```graphql
mutation {
  createTask(input: {
    title: "Buy groceries"
  }) {
    id
    title
    listId
    priority
    completed
  }
}
```

### Create a task with all fields
```graphql
mutation {
  createTask(input: {
    title: "Write blog post"
    description: "# Draft\n\n- intro\n- main points\n- conclusion"
    priority: P2
    dueDate: "2026-04-10"
    listId: "LIST_ID"
  }) {
    id
    title
    description
    priority
    dueDate
    listId
  }
}
```

### Create a subtask
```graphql
mutation {
  createTask(input: {
    title: "Buy milk"
    parentId: "PARENT_TASK_ID"
  }) {
    id
    title
    parentId
  }
}
```

### List all tasks
```graphql
query {
  tasks {
    id
    title
    description
    listId
    parentId
    priority
    dueDate
    completed
    sortOrder
  }
}
```

### List tasks in a specific list
```graphql
query {
  tasks(listId: "LIST_ID") {
    id
    title
    priority
    completed
  }
}
```

### List only incomplete tasks
```graphql
query {
  tasks(completed: false) {
    id
    title
    priority
    dueDate
  }
}
```

### Get a single task
```graphql
query {
  task(id: "TASK_ID") {
    id
    title
    description
    priority
    dueDate
    completed
    parentId
    listId
  }
}
```

### Update a task
```graphql
mutation {
  updateTask(id: "TASK_ID", input: {
    title: "Buy groceries and snacks"
    priority: P1
    dueDate: "2026-04-05"
  }) {
    id
    title
    priority
    dueDate
  }
}
```

### Complete a task (cascades to subtasks)
```graphql
mutation {
  completeTask(id: "TASK_ID") {
    id
    title
    completed
    completedAt
  }
}
```

### Uncomplete a task (single task only)
```graphql
mutation {
  uncompleteTask(id: "TASK_ID") {
    id
    completed
  }
}
```

### Reorder a task
```graphql
mutation {
  reorderTask(id: "TASK_ID", sortOrder: 2.5) {
    id
    sortOrder
  }
}
```

### Delete a task (cascades to subtasks)
```graphql
mutation {
  deleteTask(id: "TASK_ID")
}
```

### Move a task to a different list
```graphql
mutation {
  updateTask(id: "TASK_ID", input: {
    listId: "NEW_LIST_ID"
  }) {
    id
    listId
  }
}
```

---

## Lists

### List all lists
```graphql
query {
  taskLists {
    id
    name
    isInbox
    sortPreference
    taskCount
  }
}
```

### Create a list
```graphql
mutation {
  createTaskList(name: "Work Projects") {
    id
    name
    isInbox
    taskCount
  }
}
```

### Update a list
```graphql
mutation {
  updateTaskList(id: "LIST_ID", name: "Personal Projects", sortPreference: DUE_DATE) {
    id
    name
    sortPreference
  }
}
```

### Delete a list (tasks move to Inbox)
```graphql
mutation {
  deleteTaskList(id: "LIST_ID")
}
```

---

## Stats

### Get habit stats for a date range
```graphql
query {
  stats(dateRange: { startDate: "2026-03-01", endDate: "2026-04-04" }) {
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

---

## User & Admin

### Get current user
```graphql
query {
  me {
    id
    email
    displayName
    createdAt
  }
}
```

### API version
```graphql
query {
  version {
    commit
    deployedAt
  }
}
```

### List allowed emails (admin only)
```graphql
query {
  allowedEmails {
    email
    isAdmin
  }
}
```

### Add allowed email (admin only)
```graphql
mutation {
  addAllowedEmail(email: "new@example.com") {
    email
    isAdmin
  }
}
```

### Set admin status (admin only)
```graphql
mutation {
  setAdminStatus(email: "user@example.com", isAdmin: true) {
    email
    isAdmin
  }
}
```
