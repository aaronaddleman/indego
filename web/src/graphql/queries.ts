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

export const GET_HABITS = gql`
  ${HABIT_FIELDS}
  query GetHabits {
    habits { ...HabitFields }
  }
`;

export const GET_HABIT = gql`
  ${HABIT_FIELDS}
  query GetHabit($id: ID!) {
    habit(id: $id) { ...HabitFields }
  }
`;

export const GET_ME = gql`
  query GetMe {
    me { id email displayName createdAt }
  }
`;

export const GET_STATS = gql`
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
`;

export const GET_VERSION = gql`
  query GetVersion {
    version { commit deployedAt }
  }
`;

export const GET_ALLOWED_EMAILS = gql`
  query GetAllowedEmails {
    allowedEmails {
      email
      isAdmin
    }
  }
`;
