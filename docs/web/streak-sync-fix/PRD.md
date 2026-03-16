# Product Requirements Document (PRD) — Streak Sync Fix

## 1. Overview

- **Feature Name:** Streak Sync Fix
- **Problem Statement:** Longest streak doesn't update after backfilling completions on the history page. The sync hook compared against stale Apollo cache data.
- **Goals:**
  - Backfilled completions in history page reflect in longest streak
  - No unnecessary Firestore operations
- **Non-Goals:**
  - Changes to streak calculation logic
  - API changes

## 2. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| SSF-1 | User | Backfill past completions and see my longest streak update | My streak history is accurate |

## 3. Requirements

- `useLongestStreakSync` tracks last written value locally via ref
- Writes to Firestore only when computed value differs from last written
- Firestore transaction still ensures safe concurrent writes
- Detail page displays computed longest (not stale Apollo cache value)

## 4. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Discovery/Iteration | Initial draft |
