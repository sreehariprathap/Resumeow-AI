import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getUserData, saveUserData } from './firebaseWeb';
import type { ResumeProfile } from '@/types/resumeProfile';

interface OnboardingContextType {
  showOnboarding: boolean;
  isFirstLogin: boolean;
  hasCompletedOnboarding: boolean;
  resumeProfile: Partial<ResumeProfile> | null;
  initialStep: number;
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
  const [resumeProfile, setResumeProfile] = useState<Partial<ResumeProfile> | null>(null);
  const [initialStep, setInitialStep] = useState(0);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (currentUser) {
        try {
          const profileData = await getUserData(currentUser.uid, 'resumeProfile');

          if (profileData && (profileData as Partial<ResumeProfile>).completedAt) {
            // Profile complete — onboarding done
            setResumeProfile(profileData as Partial<ResumeProfile>);
            setHasCompletedOnboarding(true);
            setIsFirstLogin(false);
            setShowOnboarding(false);
          } else if (profileData) {
            // Profile started but not finished — resume from saved step
            const saved = profileData as Partial<ResumeProfile>;
            setResumeProfile(saved);
            setInitialStep(saved.currentStep ?? 1);
            setHasCompletedOnboarding(false);
            setIsFirstLogin(false);
            setShowOnboarding(true);
          } else {
            // No profile at all — new user
            setResumeProfile(null);
            setInitialStep(0);
            setHasCompletedOnboarding(false);
            setIsFirstLogin(true);
            setShowOnboarding(true);
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          setIsFirstLogin(true);
          setShowOnboarding(true);
        }
      } else {
        setHasCompletedOnboarding(false);
        setIsFirstLogin(false);
        setShowOnboarding(false);
        setResumeProfile(null);
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
        await saveUserData(currentUser.uid, 'onboarding', {
          completed: true,
          completedAt: new Date().toISOString(),
          version: '2.0',
        });
        setHasCompletedOnboarding(true);
        setShowOnboarding(false);
        setIsFirstLogin(false);
      } catch (error) {
        console.error('Error saving onboarding completion:', error);
        setShowOnboarding(false);
      }
    }
  };

  const skipOnboarding = async () => {
    if (currentUser) {
      try {
        await saveUserData(currentUser.uid, 'onboarding', {
          completed: true,
          skipped: true,
          skippedAt: new Date().toISOString(),
          version: '2.0',
        });
        setHasCompletedOnboarding(true);
        setShowOnboarding(false);
        setIsFirstLogin(false);
      } catch (error) {
        console.error('Error saving onboarding skip:', error);
        setShowOnboarding(false);
      }
    }
  };

  const value: OnboardingContextType = {
    showOnboarding,
    isFirstLogin,
    hasCompletedOnboarding,
    resumeProfile,
    initialStep,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    isLoading,
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
