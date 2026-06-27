import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  plan: 'free' | 'pro' | 'admin';
  tokensAllocated: number;
  tokensUsed: number;
  tokensRemaining: number;
  isAdmin: boolean;
  createdAt: number;
  lastActiveAt: number;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'userProfiles', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

export const deductTokens = async (uid: string, amount: number): Promise<boolean> => {
  const profileRef = doc(db, 'userProfiles', uid);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) return false;
  const profile = snap.data() as UserProfile;
  if (profile.tokensRemaining < amount) return false;
  await updateDoc(profileRef, {
    tokensUsed: increment(amount),
    tokensRemaining: increment(-amount),
    lastActiveAt: Date.now(),
  });
  return true;
};

const FREE_TOKENS = 100;

/** Fill keys that are missing (undefined/null) on `existing` from `defaults`. */
function computeMissingDefaults<T extends object>(
  existing: Partial<T>,
  defaults: Partial<T>
): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const current = existing[key];
    if (current === undefined || current === null) {
      patch[key] = defaults[key];
    }
  }
  return patch;
}

/**
 * Called on every login. Creates the profile on first login, and self-heals
 * existing profiles by backfilling any token-doc fields added after signup.
 */
export const initUserProfile = async (
  uid: string,
  email: string,
  displayName: string
): Promise<void> => {
  const profileRef = doc(db, 'userProfiles', uid);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) {
    await setDoc(profileRef, {
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      plan: 'free',
      tokensAllocated: FREE_TOKENS,
      tokensUsed: 0,
      tokensRemaining: FREE_TOKENS,
      isAdmin: false,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });
  } else {
    const existing = snap.data() as Partial<UserProfile>;
    const patch = computeMissingDefaults<UserProfile>(existing, {
      uid,
      email: email || existing.email,
      displayName: displayName || existing.displayName || email.split('@')[0],
      plan: 'free',
      tokensAllocated: FREE_TOKENS,
      tokensUsed: 0,
      tokensRemaining: FREE_TOKENS,
      isAdmin: false,
      createdAt: Date.now(),
    });
    await updateDoc(profileRef, { ...patch, lastActiveAt: Date.now() });
  }
};
