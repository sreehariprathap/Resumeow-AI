// Firebase config and initialization for Chrome Extension
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithCredential,
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
// Using environment variables to keep sensitive information secure
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

// Set persistence to local to ensure the user stays logged in
// This is important for browser extensions
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
});

// Helper to detect if running in a Chrome Extension context
export const isExtensionContext = (): boolean => {
  const isExtension = typeof window !== 'undefined' && 
         typeof window.chrome !== 'undefined' && 
         typeof window.chrome.runtime !== 'undefined' && 
         typeof window.chrome.runtime.id === 'string';
  
  console.log("Environment check - isExtensionContext:", isExtension);
  
  // Check if Chrome identity API is available
  if (isExtension && window.chrome?.identity) {
    console.log("Chrome identity API available: true");
  } else if (isExtension) {
    console.log("Warning: In extension context but identity API is not available");
    console.log("Chrome identity API available:", typeof window.chrome?.identity !== 'undefined');
  }
  
  return isExtension;
};

/**
 * Extension-specific authentication using chrome.identity API
 * This avoids CSP issues by using the extension's identity API
 */
const signInWithChromeIdentity = async (): Promise<User | null> => {
  // Safety check - ensure we're in extension context with identity API
  if (!isExtensionContext() || !window.chrome?.identity) {
    console.error("Not in extension context or identity API not available");
    throw new Error("Chrome identity API not available");
  }

  // Create a local reference to chrome to avoid TypeScript errors
  const chrome = window.chrome;
  
  return new Promise((resolve, reject) => {
    try {
      // Get OAuth token from Chrome's identity API
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        // Handle any errors from the Chrome API
        if (chrome.runtime.lastError) {
          console.error("Chrome identity error:", chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message || "Chrome identity error"));
          return;
        }
        
        if (!token) {
          console.error("No token received from Chrome identity API");
          reject(new Error("Failed to get auth token"));
          return;
        }

        try {
          console.log("Received token from Chrome identity API, signing in to Firebase");
          
          // Create a Firebase credential using the token
          const credential = GoogleAuthProvider.credential(null, token);
          
          // Sign in to Firebase with the credential
          const userCredential = await signInWithCredential(auth, credential);
          console.log("Successfully signed in with Chrome identity");
          resolve(userCredential.user);
        } catch (error) {
          console.error("Error signing in with Chrome identity credential:", error);
          reject(error);
        }
      });
    } catch (error) {
      console.error("Error in Chrome identity flow:", error);
      reject(error);
    }
  });
};

/**
 * Authenticate with Google - uses Chrome identity API in extension context
 * and falls back to Firebase popup for non-extension contexts
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  console.log("Starting Google sign-in process");
  try {
    // If in Chrome extension context and identity API is available
    if (isExtensionContext() && window.chrome?.identity) {
      console.log("Using Chrome extension identity API for authentication");
      return await signInWithChromeIdentity();
    } 
    // For non-extension contexts or if identity API isn't available
    else {
      console.log("Using Firebase popup authentication (non-extension context)");
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error) {
    console.error("Authentication failed:", error);
    throw error;
  }
};

/**
 * No-op function to maintain compatibility with redirect-based auth
 * Not needed with Chrome identity API but kept for interface compatibility
 */
export const getGoogleRedirectResult = async (): Promise<User | null> => {
  console.log("getGoogleRedirectResult called - no action needed with Chrome identity API");
  return null;
};

/**
 * Log out the current user
 */
export const logOut = async (): Promise<void> => {
  try {    // If in extension context, also revoke the Chrome token
    if (isExtensionContext() && window.chrome?.identity) {
      // Get current token
      const chrome = window.chrome;
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          // Revoke token
          const xhr = new XMLHttpRequest();
          xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' + token);
          xhr.send();
          
          // Remove token from Chrome's cache
          chrome.identity.removeCachedAuthToken({ token }, () => {
            console.log('Chrome identity token revoked and removed from cache');
          });
        }
      });
    }
    
    // Sign out of Firebase
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
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
 * Register a new user with email and password
 */
export const registerWithEmailAndPassword = async (
  email: string,
  password: string,
  displayName?: string
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // If displayName is provided, update the user profile
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    return userCredential.user;
  } catch (error) {
    console.error("Error registering new user:", error);
    throw error;
  }
};

/**
 * Sign in a user with email and password
 */
export const signInWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email/password:", error);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

export { auth, db };
