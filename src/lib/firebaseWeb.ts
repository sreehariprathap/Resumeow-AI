// Firebase config and initialization for Web App
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import type { User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, increment, query, orderBy, addDoc, where, writeBatch } from "firebase/firestore";
import type { ResumeProfile } from "@/types/resumeProfile";
import { computeMissingDefaults, RESUME_PROFILE_DEFAULTS } from "./profileSeeding";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Set persistence to local to keep the user logged in
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
});

// Simple function that always returns false since we're no longer in extension context
export const isExtensionContext = (): boolean => {
  return false; // We are now a web app, not an extension
};

/**
 * Authenticate with Google using Firebase popup for web apps
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  console.log("Starting Google sign-in process with popup");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Authentication failed:", error);
    throw error;
  }
};

/**
 * Get redirect result - implemented for interface compatibility
 * with the original code, but uses standard Firebase web auth
 */
export const getGoogleRedirectResult = async (): Promise<User | null> => {
  // For web app, we're using popup authentication, so this is a no-op
  return null;
};

/**
 * Log out the current user
 */
export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * Get the current Firebase user
 */
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

/**
 * Save user data to Firestore
 */
export const saveUserData = async (
  userId: string, 
  dataType: string, 
  data: Record<string, unknown>
) => {
  try {
    await setDoc(doc(db, "users", userId, dataType, "data"), data);
    return true;
  } catch (error) {
    console.error(`Error saving ${dataType}:`, error);
    throw error;
  }
};

/**
 * Get user data from Firestore
 */
export const getUserData = async (
  userId: string, 
  dataType: string
) => {
  try {
    const docRef = doc(db, "users", userId, dataType, "data");
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error getting ${dataType}:`, error);
    throw error;
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email and password:", error);
    throw error;
  }
};

/**
 * Register a new user with email and password
 */
export const registerWithEmailAndPassword = async (
  email: string,
  password: string,
  displayName?: string
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update the user's display name if provided
    if (displayName && user) {
      await updateProfile(user, { displayName });
      
      // Create a user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email,
        displayName: displayName || email.split('@')[0],
        createdAt: new Date().toISOString(),
      });
    }
    
    return user;
  } catch (error) {
    console.error("Error registering with email and password:", error);
    throw error;
  }
};

/**
 * Send a password reset email
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Export Firebase instances for use in other parts of the app
export { auth, db };

// Firestore Security Rules needed:
// userProfiles:
//   - read: request.auth.uid == resource.data.uid (own doc)
//   - read: get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.isAdmin == true (admin read all)
//   - write: get(...).data.isAdmin == true (admin only writes)
//   - create: request.auth.uid == request.resource.data.uid (own creation)

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

// --- Token system ---

const FREE_TOKENS = 100;

/**
 * Called on every login. Acts as a self-healing seeder:
 *  1. Creates the userProfiles doc on first login.
 *  2. Backfills any token-doc fields added after the user signed up.
 *  3. Backfills the newer ResumeProfile fields onto an existing onboarding doc.
 *
 * Each step is non-fatal: if Firestore rules deny the token-doc write (e.g.
 * userProfiles updates are admin-only), login and the resumeProfile backfill
 * still proceed.
 */
export const initUserProfile = async (
  uid: string,
  email: string,
  displayName: string
): Promise<void> => {
  const profileRef = doc(db, 'userProfiles', uid);
  let snap: Awaited<ReturnType<typeof getDoc>>;
  try {
    snap = await getDoc(profileRef);
  } catch (error) {
    console.warn('[auth] userProfiles read denied (token not ready?)', error);
    return;
  }
  if (!snap.exists()) {
    try {
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
    } catch (error) {
      console.error('[auth] userProfiles create denied — check Firestore rules allow create for own uid', error);
      return;
    }
  } else {
    try {
      const existing = snap.data() as Partial<UserProfile>;
      const patch = computeMissingDefaults<UserProfile>(existing, {
        uid,
        email: email || (existing.email ?? ''),
        displayName: displayName || existing.displayName || email.split('@')[0],
        plan: 'free',
        tokensAllocated: FREE_TOKENS,
        tokensUsed: 0,
        tokensRemaining: FREE_TOKENS,
        isAdmin: false,
        createdAt: Date.now(),
      });
      await updateDoc(profileRef, { ...patch, lastActiveAt: Date.now() });
    } catch (error) {
      console.error('Token profile backfill skipped:', error);
    }
  }

  await backfillResumeProfile(uid);
};

/**
 * Fill in the newer ResumeProfile collection fields on a user's existing
 * onboarding document. Does nothing for users who never onboarded — onboarding
 * is responsible for creating the doc in the first place.
 */
export const backfillResumeProfile = async (uid: string): Promise<void> => {
  try {
    const existing = await getUserData(uid, 'resumeProfile');
    if (!existing) return;
    const patch = computeMissingDefaults<ResumeProfile>(
      existing as Partial<ResumeProfile>,
      RESUME_PROFILE_DEFAULTS,
    );
    if (Object.keys(patch).length === 0) return;
    await saveUserData(uid, 'resumeProfile', { ...existing, ...patch });
  } catch (error) {
    console.error('Resume profile backfill skipped:', error);
  }
};

/** Fetch the current user's profile */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'userProfiles', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

/** Deduct tokens atomically. Returns false if insufficient balance. */
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

/** Admin: get all user profiles ordered by createdAt */
export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  const q = query(collection(db, 'userProfiles'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as UserProfile);
};

// --- Saved Resumes ---

export interface SavedResume {
  id: string;          // Firestore doc ID
  name: string;        // User-given name (e.g. "Google SWE", "Meta PM")
  latex: string;       // Full LaTeX source
  templateId: string;  // e.g. 'johnsnow', 'sreehari', 'custom'
  templateLabel: string;
  createdAt: number;
  updatedAt: number;
}

/** Fetch all saved resumes for a user, newest first */
export const getSavedResumes = async (uid: string): Promise<SavedResume[]> => {
  const col = collection(db, 'users', uid, 'resumes');
  const q = query(col, orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedResume));
};

/** Save a new resume, returns the new Firestore doc ID */
export const saveResume = async (
  uid: string,
  resume: Omit<SavedResume, 'id'>
): Promise<string> => {
  const col = collection(db, 'users', uid, 'resumes');
  const ref = await addDoc(col, resume);
  return ref.id;
};

/** Update the LaTeX source (and updatedAt) of an existing resume */
export const updateResumeLatex = async (
  uid: string,
  resumeId: string,
  latex: string,
  name?: string
): Promise<void> => {
  const ref = doc(db, 'users', uid, 'resumes', resumeId);
  const patch: Record<string, unknown> = { latex, updatedAt: Date.now() };
  if (name !== undefined) patch.name = name;
  await updateDoc(ref, patch);
};

/** Delete a saved resume */
export const deleteResume = async (uid: string, resumeId: string): Promise<void> => {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'users', uid, 'resumes', resumeId));
};



export interface LazyModeSettings {
  enabled: boolean;
  defaultPrompt: string;
  defaultResumeProfileId: string;
  autoGenerate: boolean;
  savedAt: number;
}

export const getLazyModeSettings = async (uid: string): Promise<LazyModeSettings | null> => {
  try {
    const docRef = doc(db, 'users', uid, 'lazyMode', 'data');
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as LazyModeSettings) : null;
  } catch (error) {
    console.error('Error getting lazy mode settings:', error);
    return null;
  }
};

export const saveLazyModeSettings = async (uid: string, settings: LazyModeSettings): Promise<void> => {
  const docRef = doc(db, 'users', uid, 'lazyMode', 'data');
  await setDoc(docRef, settings);
};

/** Admin: update a user's token allocation */
export const adminUpdateUserTokens = async (
  uid: string,
  tokensAllocated: number,
  plan: 'free' | 'pro' | 'admin'
): Promise<void> => {
  const profileRef = doc(db, 'userProfiles', uid);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) return;
  const profile = snap.data() as UserProfile;
  const newRemaining = Math.max(0, tokensAllocated - profile.tokensUsed);
  await updateDoc(profileRef, {
    tokensAllocated,
    tokensRemaining: newRemaining,
    plan,
    isAdmin: plan === 'admin',
  });
};

/** Admin: update a user's display name, token allocation, and/or plan */
export const adminUpdateUserProfile = async (
  uid: string,
  updates: {
    displayName?: string;
    tokensAllocated?: number;
    plan?: 'free' | 'pro' | 'admin';
  }
): Promise<void> => {
  const profileRef = doc(db, 'userProfiles', uid);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) return;

  const patch: Record<string, unknown> = {};

  if (updates.displayName !== undefined) {
    patch.displayName = updates.displayName;
  }

  if (updates.tokensAllocated !== undefined) {
    const profile = snap.data() as UserProfile;
    const newRemaining = Math.max(0, updates.tokensAllocated - profile.tokensUsed);
    patch.tokensAllocated = updates.tokensAllocated;
    patch.tokensRemaining = newRemaining;
  }

  if (updates.plan !== undefined) {
    patch.plan = updates.plan;
    patch.isAdmin = updates.plan === 'admin';
  }

  if (Object.keys(patch).length === 0) return;
  await updateDoc(profileRef, patch);
};


// --- Token Requests ---

export interface TokenRequest {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  requestedTokens: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export const createTokenRequest = async (
  uid: string,
  email: string,
  displayName: string,
  requestedTokens: number,
  reason: string
): Promise<void> => {
  await addDoc(collection(db, 'tokenRequests'), {
    uid,
    email,
    displayName,
    requestedTokens,
    reason,
    status: 'pending',
    createdAt: Date.now(),
  } satisfies Omit<TokenRequest, 'id'>);
};

export const getTokenRequests = async (statusFilter?: 'pending' | 'approved' | 'rejected'): Promise<TokenRequest[]> => {
  const col = collection(db, 'tokenRequests');
  const q = statusFilter
    ? query(col, where('status', '==', statusFilter), orderBy('createdAt', 'desc'))
    : query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as TokenRequest));
};

export const resolveTokenRequest = async (
  requestId: string,
  approved: boolean,
  tokensToAdd: number,
  resolvedByEmail: string
): Promise<void> => {
  const reqRef = doc(db, 'tokenRequests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return;
  const req = reqSnap.data() as TokenRequest;

  await updateDoc(reqRef, {
    status: approved ? 'approved' : 'rejected',
    resolvedAt: Date.now(),
    resolvedBy: resolvedByEmail,
  });

  if (approved && tokensToAdd > 0) {
    const profileRef = doc(db, 'userProfiles', req.uid);
    await updateDoc(profileRef, {
      tokensAllocated: increment(tokensToAdd),
      tokensRemaining: increment(tokensToAdd),
    });
  }
};

// --- Profile update (display fields only) ---

export const updateUserDisplayProfile = async (
  uid: string,
  fields: { displayName?: string }
): Promise<void> => {
  const profileRef = doc(db, 'userProfiles', uid);
  await updateDoc(profileRef, { ...fields, lastActiveAt: Date.now() });
};

// --- Data Export / Import Utilities ---

export const exportUserData = async (uid: string) => {
  if (!uid) throw new Error("No user ID provided");
  
  const data: Record<string, any> = {
    profile: await getUserData(uid, 'resumeProfile').catch(() => null),
    settings: await getUserData(uid, 'settings').catch(() => null),
    templates: await getUserData(uid, 'templates').catch(() => null),
    saved_resumes: await getSavedResumes(uid).catch(() => []),
  };
  
  return data;
};

export const importUserData = async (uid: string, importData: any) => {
  if (!uid) throw new Error("No user ID provided");
  
  // Basic validation
  if (!importData || typeof importData !== 'object') {
    throw new Error("Invalid import data format");
  }

  const batch = writeBatch(db);
  const userDocRef = doc(db, 'users', uid);

  // Overwrite specific documents if they exist in the import
  if (importData.profile) {
    batch.set(doc(collection(userDocRef, 'resumeProfile'), 'data'), importData.profile);
  }
  if (importData.settings) {
    batch.set(doc(collection(userDocRef, 'settings'), 'data'), importData.settings);
  }
  if (importData.templates) {
    batch.set(doc(collection(userDocRef, 'templates'), 'data'), importData.templates);
  }

  // Write imported resumes
  if (Array.isArray(importData.saved_resumes)) {
    const resumesRef = collection(userDocRef, 'resumes');
    importData.saved_resumes.forEach((resume: any) => {
      if (resume.id) {
        // Copy the resume data without modifying the ID field directly on the ref, 
        // but we'll use the id as the doc name to preserve it.
        const { id, ...resumeData } = resume;
        batch.set(doc(resumesRef, id), resumeData);
      }
    });
  }

  await batch.commit();
};
