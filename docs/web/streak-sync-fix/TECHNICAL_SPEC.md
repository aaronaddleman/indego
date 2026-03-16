# Technical Spec — Streak Sync Fix

## 1. Summary

Fix `useLongestStreakSync` to use a local ref for tracking last written value instead of comparing against stale Apollo cache.

## 2. Implementation

### useLongestStreakSync.ts (modified)

**Before:**
```typescript
export function useLongestStreakSync(
  habitId: string | undefined,
  computedLongest: number,
  storedLongest: number       // ← from Apollo cache, stale after Firestore write
): void {
  useEffect(() => {
    if (computedLongest !== storedLongest) {  // ← stale comparison
      void writeLongestStreak(user.uid, habitId, computedLongest);
    }
  }, [computedLongest, storedLongest]);
}
```

**After:**
```typescript
export function useLongestStreakSync(
  habitId: string | undefined,
  computedLongest: number
): void {
  const lastWrittenRef = useRef<number | null>(null);

  useEffect(() => {
    if (!habitId || !user?.uid) return;
    if (computedLongest === lastWrittenRef.current) return;
    lastWrittenRef.current = computedLongest;
    void writeLongestStreak(user.uid, habitId, computedLongest);
  }, [habitId, computedLongest, user?.uid]);
}
```

**Why this works:**
- First load: `lastWrittenRef` is null → always writes (backfill)
- Same value on re-render → skips (no Firestore call)
- Value changes (completion toggle, navigation from history) → writes
- Firestore transaction still checks actual stored value for concurrent safety

### HabitDetailPage.tsx (modified)

Remove `storedLongest` argument:
```typescript
// Before
useLongestStreakSync(habit?.id, streaks.longest, habit?.longestStreak ?? 0);

// After
useLongestStreakSync(habit?.id, streaks.longest);
```

## 3. Files Changed

| Action | File |
|--------|------|
| **Modify** | `web/src/hooks/useLongestStreakSync.ts` |
| **Modify** | `web/src/pages/HabitDetailPage.tsx` |

## 4. Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-16 | Documentation | Initial draft |
