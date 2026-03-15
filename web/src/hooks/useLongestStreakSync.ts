import { useEffect } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';

async function writeLongestStreak(
  userId: string,
  habitId: string,
  newLongest: number
): Promise<void> {
  const habitRef = doc(db, 'users', userId, 'habits', habitId);

  await runTransaction(db, async (transaction) => {
    const habitDoc = await transaction.get(habitRef);
    if (!habitDoc.exists()) return;

    const currentLongest = habitDoc.data().longestStreak ?? 0;
    if (newLongest !== currentLongest) {
      transaction.update(habitRef, { longestStreak: newLongest });
    }
  });
}

/**
 * Sync computed longest streak to Firestore via transaction.
 * Only writes if the computed value differs from stored value.
 */
export function useLongestStreakSync(
  habitId: string | undefined,
  computedLongest: number,
  storedLongest: number
): void {
  const { user } = useAuth();

  useEffect(() => {
    if (!habitId || !user?.uid) return;
    if (computedLongest !== storedLongest) {
      void writeLongestStreak(user.uid, habitId, computedLongest);
    }
  }, [habitId, computedLongest, storedLongest, user?.uid]);
}

/**
 * Write longest streak to Firestore (standalone, for deferred writes).
 */
export { writeLongestStreak };
