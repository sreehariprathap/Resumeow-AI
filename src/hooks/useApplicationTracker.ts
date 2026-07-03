import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { saveUserData, getUserData } from '@/lib/firebaseWeb';
import type { TrackedApplication, ApplicationStatus } from '@/types/tracker';

const LOCAL_KEY = (uid: string) => `user_${uid}_tracker`;

export function useApplicationTracker() {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the latest not-yet-written-to-Firestore snapshot, so it can be flushed
  // immediately if the tab is hidden/closed before the debounce timer fires.
  const pendingRef = useRef<{ uid: string; apps: TrackedApplication[] } | null>(null);

  // Load from Firebase on login
  useEffect(() => {
    if (!currentUser) {
      setApplications([]);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getUserData(currentUser.uid, 'tracker');
        if (data?.applications && Array.isArray(data.applications)) {
          setApplications(data.applications as TrackedApplication[]);
        } else {
          // Try localStorage fallback
          try {
            const raw = localStorage.getItem(LOCAL_KEY(currentUser.uid));
            if (raw) setApplications(JSON.parse(raw));
          } catch { /* ignore */ }
        }
      } catch {
        try {
          const raw = localStorage.getItem(LOCAL_KEY(currentUser.uid));
          if (raw) setApplications(JSON.parse(raw));
        } catch { /* ignore */ }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentUser]);

  // Writes whatever is currently pending, right now (no debounce). Safe to call
  // even if nothing is pending. Used both by the debounce timer itself and by
  // the flush-on-hide/unload guard below.
  const flushPending = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    saveUserData(pending.uid, 'tracker', { applications: pending.apps, updatedAt: new Date().toISOString() })
      .catch(() => { /* non-critical */ });
  }, []);

  const persist = useCallback((apps: TrackedApplication[]) => {
    if (!currentUser) return;
    // Write localStorage immediately
    try {
      localStorage.setItem(LOCAL_KEY(currentUser.uid), JSON.stringify(apps));
    } catch { /* ignore */ }
    // Debounce Firebase write, but keep the latest snapshot flushable on demand
    // in case the tab is hidden/closed before the debounce timer fires.
    pendingRef.current = { uid: currentUser.uid, apps };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(flushPending, 1500);
  }, [currentUser, flushPending]);

  // Flush the pending write as soon as the tab is backgrounded/closed, instead
  // of losing it to the debounce window. visibilitychange fires reliably on
  // tab close, refresh, and backgrounding (incl. mobile); beforeunload/pagehide
  // are extra safety nets for browsers that don't fire visibilitychange first.
  useEffect(() => {
    const handleHide = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };
    document.addEventListener('visibilitychange', handleHide);
    window.addEventListener('pagehide', flushPending);
    window.addEventListener('beforeunload', flushPending);
    return () => {
      document.removeEventListener('visibilitychange', handleHide);
      window.removeEventListener('pagehide', flushPending);
      window.removeEventListener('beforeunload', flushPending);
    };
  }, [flushPending]);

  const addApplication = useCallback((
    entry: Omit<TrackedApplication, 'id' | 'createdAt' | 'status'>
  ): string => {
    const id = `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const app: TrackedApplication = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
      status: 'tracked',
    };
    setApplications(prev => {
      const updated = [app, ...prev];
      persist(updated);
      return updated;
    });
    return id;
  }, [persist]);

  const updateStatus = useCallback((id: string, status: ApplicationStatus) => {
    setApplications(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, status } : a);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const updateScores = useCallback((id: string, atsScore?: number, jobFitScore?: number) => {
    setApplications(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, atsScore, jobFitScore } : a);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const deleteApplication = useCallback((id: string) => {
    setApplications(prev => {
      const updated = prev.filter(a => a.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  return { applications, isLoading, addApplication, updateStatus, updateScores, deleteApplication };
}
