import { createContext, useState, useEffect, useContext } from "react";
import type { ReactNode } from "react";
import {
  auth,
  getGoogleRedirectResult,
  signInWithGoogle,
  signInWithEmailAndPassword,
  registerWithEmailAndPassword,
  sendPasswordReset,
  logOut,
  getUserProfile,
} from "./firebaseWeb";
import type { User } from "firebase/auth";
import { toast } from "sonner";
import { log } from "./logger";

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<User | null>;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  isAuthenticated: false,
  loginWithGoogle: async () => null,
  loginWithEmail: async () => { throw new Error("Not implemented"); },
  registerWithEmail: async () => { throw new Error("Not implemented"); },
  resetPassword: async () => { throw new Error("Not implemented"); },
  logout: async () => { throw new Error("Not implemented"); },
});

// Helper function to clean up old localStorage data
const cleanupOldLocalStorageData = () => {
  // Remove old non-user-isolated keys that might contain cross-user data
  const oldKeys = [
    'resumeTemplates',
    'coverLetterTemplates', 
    'customPrompts',
    'activePrompt_resume',
    'activePrompt_coverLetter',
    'selectedTemplateId',
    'selectedCoverLetterTemplateId',
    'userPreferredModel'
  ];
  
  oldKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      log.info(`Cleaning up old localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
    // Handle authentication for browser extension
  useEffect(() => {
    // Clean up old localStorage data on app start
    cleanupOldLocalStorageData();
    
    // For browser extensions, we need to check for redirect results immediately
    // and also handle authentication state properly
    const checkRedirectResult = async () => {
      try {
        const user = await getGoogleRedirectResult();
        if (user) {
          setCurrentUser(user);
          toast.success("Successfully signed in!");
        }
      } catch (error) {
        log.error("Error checking redirect result:", error);
      }
    };

    // Set up the auth state listener for ongoing auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoading(false);
      if (user) {
        log.info('auth: state changed — user signed in', { uid: user.uid, email: user.email, displayName: user.displayName });
        void getUserProfile(user.uid)
          .then((profile) => {
            log.info('auth: profile loaded', { uid: user.uid, email: user.email, isAdmin: profile?.isAdmin, plan: profile?.plan, tokensRemaining: profile?.tokensRemaining });
          })
          .catch((err: unknown) => {
            log.warn('auth: could not fetch profile on login', { uid: user.uid, error: err instanceof Error ? err.message : String(err) });
          });
      } else {
        log.info('auth: state changed — user signed out');
      }
    });

    // Check for redirect result on extension load/reload
    checkRedirectResult();

    return () => unsubscribe();
  }, []);

  // Authentication methods
  const loginWithGoogle = async () => {
    return await signInWithGoogle();
  };

  const loginWithEmail = async (email: string, password: string) => {
    return await signInWithEmailAndPassword(email, password);
  };

  const registerWithEmail = async (email: string, password: string, displayName?: string) => {
    return await registerWithEmailAndPassword(email, password, displayName);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordReset(email);
  };  const logout = async () => {
    log.info('auth: logout initiated', { uid: currentUser?.uid, email: currentUser?.email });
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('user_') && !key.startsWith('emergency_backup_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    await logOut();
    log.info('auth: logout complete');
  };

  const value = {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
