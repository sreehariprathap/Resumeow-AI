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
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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
