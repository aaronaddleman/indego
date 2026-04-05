import { gql } from '@apollo/client';

const HABIT_FIELDS = gql`
  fragment HabitFields on Habit {
    id
    name
    frequency { type daysOfWeek dueDays daysPerWeek specificDays }
    reminder { enabled time }
    longestStreak
    completions { date completedAt }
    createdAt
    updatedAt
  }
`;

export const UPSERT_USER = gql`
  mutation UpsertUser($displayName: String!) {
    upsertUser(displayName: $displayName) {
      id email displayName createdAt
    }
  }
`;

export const CREATE_HABIT = gql`
  ${HABIT_FIELDS}
  mutation CreateHabit($input: CreateHabitInput!) {
    createHabit(input: $input) { ...HabitFields }
  }
`;

export const UPDATE_HABIT = gql`
  ${HABIT_FIELDS}
  mutation UpdateHabit($id: ID!, $input: UpdateHabitInput!) {
    updateHabit(id: $id, input: $input) { ...HabitFields }
  }
`;

export const DELETE_HABIT = gql`
  mutation DeleteHabit($id: ID!) {
    deleteHabit(id: $id)
  }
`;

export const LOG_COMPLETION = gql`
  ${HABIT_FIELDS}
  mutation LogCompletion($habitId: ID!, $date: Date!) {
    logCompletion(habitId: $habitId, date: $date) { ...HabitFields }
  }
`;

export const UNDO_COMPLETION = gql`
  ${HABIT_FIELDS}
  mutation UndoCompletion($habitId: ID!, $date: Date!) {
    undoCompletion(habitId: $habitId, date: $date) { ...HabitFields }
  }
`;

export const ADD_ALLOWED_EMAIL = gql`
  mutation AddAllowedEmail($email: String!) {
    addAllowedEmail(email: $email) {
      email
      isAdmin
    }
  }
`;

export const REMOVE_ALLOWED_EMAIL = gql`
  mutation RemoveAllowedEmail($email: String!) {
    removeAllowedEmail(email: $email)
  }
`;

export const SET_ADMIN_STATUS = gql`
  mutation SetAdminStatus($email: String!, $isAdmin: Boolean!) {
    setAdminStatus(email: $email, isAdmin: $isAdmin) {
      email
      isAdmin
    }
  }
`;

// ─── Tasks ────────────────────────────────────────────────────────────────

const TASK_FIELDS = gql`
  fragment TaskMutationFields on Task {
    id
    title
    description
    listId
    parentId
    priority
    dueDate
    completed
    completedAt
    sortOrder
    createdAt
    updatedAt
  }
`;

export const CREATE_TASK = gql`
  ${TASK_FIELDS}
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) { ...TaskMutationFields }
  }
`;

export const UPDATE_TASK = gql`
  ${TASK_FIELDS}
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) { ...TaskMutationFields }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const COMPLETE_TASK = gql`
  ${TASK_FIELDS}
  mutation CompleteTask($id: ID!) {
    completeTask(id: $id) { ...TaskMutationFields }
  }
`;

export const UNCOMPLETE_TASK = gql`
  ${TASK_FIELDS}
  mutation UncompleteTask($id: ID!) {
    uncompleteTask(id: $id) { ...TaskMutationFields }
  }
`;

export const REORDER_TASK = gql`
  ${TASK_FIELDS}
  mutation ReorderTask($id: ID!, $sortOrder: Float!) {
    reorderTask(id: $id, sortOrder: $sortOrder) { ...TaskMutationFields }
  }
`;

// ─── Task Lists ───────────────────────────────────────────────────────────

export const CREATE_TASK_LIST = gql`
  mutation CreateTaskList($name: String!) {
    createTaskList(name: $name) {
      id name isInbox sortPreference taskCount createdAt
    }
  }
`;

export const UPDATE_TASK_LIST = gql`
  mutation UpdateTaskList($id: ID!, $name: String, $sortPreference: SortPreference) {
    updateTaskList(id: $id, name: $name, sortPreference: $sortPreference) {
      id name isInbox sortPreference taskCount createdAt
    }
  }
`;

export const DELETE_TASK_LIST = gql`
  mutation DeleteTaskList($id: ID!) {
    deleteTaskList(id: $id)
  }
`;
