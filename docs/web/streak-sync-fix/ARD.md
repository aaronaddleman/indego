# Architecture Requirements Document (ARD) — Streak Sync Fix

## 1. Overview

- **Project Name:** Streak Sync Fix
- **Purpose:** Fix longest streak not updating after backfilling completions on the history page.
- **Goals:**
  - Longest streak updates correctly when returning from history page after backfilling
  - Avoid unnecessary Firestore reads/writes using local ref tracking
- **Scope:** Web client only. 2 files modified.

## 2. System Context

### Problem

`useLongestStreakSync` compared `computedLongest` against `storedLongest` from Apollo cache (`habit.longestStreak`). But Apollo cache doesn't know about Firestore transaction writes, so `storedLongest` was always stale after a write — preventing subsequent updates.

### Fix

Remove `storedLongest` parameter. Track the last written value in a local `useRef` instead of relying on Apollo cache. The Firestore transaction still handles concurrent client safety.

## 3. Architecture Decisions

### AD-SSF1: Local ref for last written value
- **Decision:** Use `useRef` to track the last value written to Firestore, skip writes when unchanged.
- **Rationale:** Avoids stale Apollo cache problem. Avoids unnecessary Firestore reads. The transaction still protects against concurrent clients.

## 4. Open Questions / Risks

None.

## 5. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Discovery/Iteration | Initial draft |
