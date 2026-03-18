import { gql } from '@apollo/client';

const HABIT_FIELDS = gql`
  fragment HabitFields on Habit {
    id
    name
    frequency { type daysPerWeek specificDays }
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
