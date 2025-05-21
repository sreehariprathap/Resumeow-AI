import { createContext, useState, useEffect, useContext } from "react";
import type { ReactNode } from "react";
import { auth, getGoogleRedirectResult } from "./firebase";
import type { User } from "firebase/auth";
import { toast } from "sonner";

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Handle authentication for browser extension
  useEffect(() => {
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
        console.error("Error checking redirect result:", error);
      }
    };

    // Set up the auth state listener for ongoing auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    // Check for redirect result on extension load/reload
    checkRedirectResult();

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    isLoading,
    isAuthenticated: !!currentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Additional hook to ensure user is authenticated or redirect
export const useRequireAuth = () => {
  const auth = useAuth();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Handle redirect or show login prompt
      console.log("Authentication required");
    }
  }, [auth.isLoading, auth.isAuthenticated]);
  
  return auth;
};
