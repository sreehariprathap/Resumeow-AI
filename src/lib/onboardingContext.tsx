import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getUserData, saveUserData } from './firebaseWeb';

interface OnboardingContextType {
  showOnboarding: boolean;
  isFirstLogin: boolean;
  hasCompletedOnboarding: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  isLoading: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { currentUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check onboarding status when user changes
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (currentUser) {
        try {
          // Check if user has completed onboarding
          const userData = await getUserData(currentUser.uid, "onboarding");
          const hasCompleted = userData?.completed === true;
          
          setHasCompletedOnboarding(hasCompleted);
          
          // Check if this is a first-time login
          // If no onboarding data exists, it's likely a first login
          const isNewUser = !userData || !userData.completed;
          setIsFirstLogin(isNewUser);
          
          // Show onboarding for new users who haven't completed it
          if (isNewUser && !hasCompleted) {
            setShowOnboarding(true);
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
          // On error, treat as new user to be safe
          setIsFirstLogin(true);
          setShowOnboarding(true);
        }
      } else {
        // User not logged in
        setHasCompletedOnboarding(false);
        setIsFirstLogin(false);
        setShowOnboarding(false);
      }
      
      setIsLoading(false);
    };

    checkOnboardingStatus();
  }, [currentUser]);

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  const completeOnboarding = async () => {
    if (currentUser) {
      try {
        // Save onboarding completion to Firebase
        await saveUserData(currentUser.uid, "onboarding", {
          completed: true,
          completedAt: new Date().toISOString(),
          version: "1.0" // Track onboarding version for future updates
        });
        
        setHasCompletedOnboarding(true);
        setShowOnboarding(false);
        setIsFirstLogin(false);
      } catch (error) {
        console.error("Error saving onboarding completion:", error);
        // Still hide onboarding even if save fails
        setShowOnboarding(false);
      }
    }
  };

  const skipOnboarding = async () => {
    if (currentUser) {
      try {
        // Save that user skipped onboarding
        await saveUserData(currentUser.uid, "onboarding", {
          completed: true,
          skipped: true,
          skippedAt: new Date().toISOString(),
          version: "1.0"
        });
        
        setHasCompletedOnboarding(true);
        setShowOnboarding(false);
        setIsFirstLogin(false);
      } catch (error) {
        console.error("Error saving onboarding skip:", error);
        // Still hide onboarding even if save fails
        setShowOnboarding(false);
      }
    }
  };

  const value: OnboardingContextType = {
    showOnboarding,
    isFirstLogin,
    hasCompletedOnboarding,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    isLoading
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
