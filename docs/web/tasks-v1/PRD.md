# Product Requirements Document (PRD) — Tasks & Lists

## 1. Overview

- **Feature Name:** Tasks & Lists
- **Problem Statement:** Users need a way to track one-time work items, project steps, and notes alongside their habits. Currently Indago only supports recurring habits — there's no place for "buy groceries", "write blog post", or project planning.
- **Goals:**
  - Tasks as a first-class feature alongside habits
  - Organize tasks into lists (Inbox + custom)
  - Rich descriptions with Markdown
  - Subtask nesting for breaking down work
  - Priority and due dates for planning
- **Non-Goals:**
  - Task sharing/collaboration (v4.0)
  - Recurring tasks (overlap with habits — keep separate)
  - File attachments
  - Time tracking

## 2. Background & Context

Indago is a habit tracker. Users have asked for a way to manage one-off tasks and project work within the same app. Rather than building a separate app, tasks complement habits — habits are "who you want to be", tasks are "what you need to do."

The nav restructures from 4 flat tabs to a Habits/Tasks/Settings top-level with sub-navigation within Habits.

## 3. User Stories

### Task Management

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| TS-1 | User | Create a task with a title | I can capture something I need to do |
| TS-2 | User | Add a markdown description to a task | I can include details, links, and notes |
| TS-3 | User | Set a due date on a task | I know when it needs to be done |
| TS-4 | User | Set priority P1-P4 | I can focus on what matters most |
| TS-5 | User | Mark a task complete | I can track my progress |
| TS-6 | User | Add subtasks to a task | I can break down complex work |
| TS-7 | User | Delete a task | I can remove things I no longer need |
| TS-8 | User | Edit any field on a task | I can update details as they change |

### Lists

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| TS-9 | User | See all new tasks in an Inbox | I have a default place for quick capture |
| TS-10 | User | Create custom lists | I can organize tasks by project or context |
| TS-11 | User | Move tasks between lists | I can reorganize as priorities shift |
| TS-12 | User | Delete a list and have tasks return to Inbox | I can clean up without losing tasks |

### Sorting & View

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| TS-13 | User | Sort tasks by due date, priority, or manual order | I can view tasks the way that works for me |
| TS-14 | User | Hide/show completed tasks | I can focus on what's left or review what's done |
| TS-15 | User | Reorder tasks manually | I can arrange tasks in the order I want to work on them |

### Navigation

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| TS-16 | User | Switch between Habits and Tasks views | I can manage both in one app |
| TS-17 | User | Access Settings from either view | Settings is always reachable |

## 4. Requirements

### Functional Requirements

| # | Requirement | Priority |
|---|-------------|----------|
| F-1 | CRUD for tasks (title, description, due date, priority) | Must |
| F-2 | Complete/uncomplete toggle | Must |
| F-3 | Subtask nesting (unlimited depth) | Must |
| F-4 | Default Inbox list | Must |
| F-5 | Custom list CRUD | Must |
| F-6 | Move tasks between lists | Must |
| F-7 | Sort by due date, priority, manual, created date | Must |
| F-8 | Persist sort preference per list | Should |
| F-9 | Hide/show completed tasks | Should |
| F-10 | Markdown rendering in description | Must |
| F-11 | Completing parent completes all subtasks | Should |
| F-12 | Manual reordering (drag or move up/down) | Should |

### Non-Functional Requirements

- **UX:** Task creation should be as fast as typing a title and hitting enter
- **Performance:** List of 100+ tasks renders smoothly
- **Offline:** Tasks viewable offline (Apollo cache)
- **Themes:** All task views respect the theme system

## 5. Success Metrics

- Users can create, organize, and complete tasks
- Sub-navigation between Habits and Tasks feels natural
- Task views render correctly in all 7 themes

## 6. Out of Scope

- Recurring tasks (use habits instead)
- Task sharing / collaboration (v4.0 Teams)
- File attachments
- Time tracking / estimates
- Calendar view of tasks
- Task reminders (future — leverage reminders v2 infrastructure)

## 7. Dependencies & Risks

| Dependency/Risk | Mitigation |
|----------------|------------|
| Nav restructure affects all existing pages | Implement nav change first, verify habits still work, then add tasks |
| Markdown rendering adds bundle size | Use lightweight `react-markdown` (~15KB gzipped) |
| Unlimited nesting could cause performance issues | Cap visual indentation at 4 levels, lazy-load deeply nested subtasks if needed |
| Sort order with fractional indexing | Use midpoint calculation, rebalance if values get too close |

## 8. Timeline / Milestones

### Phase 1: API + Data Model
- GraphQL schema additions
- Task and List resolvers, services, repositories
- Firestore rules and indexes

### Phase 2: Navigation Restructure
- Top-level Habits/Tasks/Settings nav
- Sub-tabs within Habits (Today/History/Streaks)
- Verify all existing flows still work

### Phase 3: Task Views
- Task list view with list selector
- Task creation (quick add + full form)
- Task detail with markdown description
- Complete/uncomplete toggle
- Priority badges and due date display

### Phase 4: Subtasks & Organization
- Subtask nesting UI
- Move tasks between lists
- Sort controls
- Hide/show completed

## 9. Open Questions

| # | Question | Resolution |
|---|----------|------------|
| 1 | Should completing a parent auto-complete subtasks? | Yes |
| 2 | Should uncompleting a parent uncomplete subtasks? | No — leave them as-is |
| 3 | Quick add: enter key creates task, or explicit button? | Both — enter key and button |

## 10. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-28 | Documentation | Initial draft |
