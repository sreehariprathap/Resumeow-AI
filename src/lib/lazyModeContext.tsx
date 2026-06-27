import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './authContext';
import { getLazyModeSettings, saveLazyModeSettings, type LazyModeSettings } from './firebaseWeb';

export const DEFAULT_LAZY_PROMPT =
  'You are an expert resume writer and career coach with 15 years of experience at top recruiting firms (McKinsey, Google, Goldman Sachs). Your goal is to craft resumes that are both ATS-optimized and compelling to human readers. Always use strong action verbs, quantify impact where possible, and tailor language to match the target role.';

const DEFAULT_SETTINGS: LazyModeSettings = {
  enabled: false,
  defaultPrompt: DEFAULT_LAZY_PROMPT,
  defaultResumeProfileId: 'default',
  autoGenerate: true,
  savedAt: 0,
};

interface LazyModeContextType {
  isLazyMode: boolean;
  settings: LazyModeSettings;
  isSettingsOpen: boolean;
  isLoading: boolean;
  toggleLazyMode: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  saveSettings: (s: Partial<LazyModeSettings>) => Promise<void>;
}

const LazyModeContext = createContext<LazyModeContextType | null>(null);

export function LazyModeProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<LazyModeSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setSettings(DEFAULT_SETTINGS);
      setHasLoadedOnce(false);
      return;
    }
    setIsLoading(true);
    getLazyModeSettings(currentUser.uid)
      .then((s) => {
        if (s) setSettings(s);
        setHasLoadedOnce(true);
      })
      .finally(() => setIsLoading(false));
  }, [currentUser]);

  const saveSettings = useCallback(async (partial: Partial<LazyModeSettings>) => {
    if (!currentUser) return;
    const next: LazyModeSettings = { ...settings, ...partial, savedAt: Date.now() };
    setSettings(next);
    await saveLazyModeSettings(currentUser.uid, next);
  }, [currentUser, settings]);

  const toggleLazyMode = useCallback(() => {
    const willEnable = !settings.enabled;
    if (willEnable && !hasLoadedOnce) {
      setIsSettingsOpen(true);
    } else if (willEnable && settings.savedAt === 0) {
      setIsSettingsOpen(true);
    }
    void saveSettings({ enabled: willEnable });
  }, [settings, hasLoadedOnce, saveSettings]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  return (
    <LazyModeContext.Provider value={{
      isLazyMode: settings.enabled,
      settings,
      isSettingsOpen,
      isLoading,
      toggleLazyMode,
      openSettings,
      closeSettings,
      saveSettings,
    }}>
      {children}
    </LazyModeContext.Provider>
  );
}

export function useLazyMode() {
  const ctx = useContext(LazyModeContext);
  if (!ctx) throw new Error('useLazyMode must be used within LazyModeProvider');
  return ctx;
}
