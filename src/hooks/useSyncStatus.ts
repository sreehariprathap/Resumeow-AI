// Connection and sync status monitoring
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { getUserData } from '@/lib/firebaseWeb';
import { toast } from 'sonner';

export interface SyncStatus {
  isOnline: boolean;
  isFirebaseConnected: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncError: string | null;
}

export const useSyncStatus = () => {
  const { currentUser } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isFirebaseConnected: false,
    lastSyncTime: null,
    pendingChanges: 0,
    syncError: null
  });

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true, syncError: null }));
      toast.success("Connection restored");
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
      toast.warning("You're offline. Changes will sync when connection is restored.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Test Firebase connectivity
  const testFirebaseConnection = useCallback(async () => {
    if (!currentUser) {
      setSyncStatus(prev => ({ ...prev, isFirebaseConnected: false }));
      return false;
    }

    try {
      // Try a simple read operation
      await getUserData(currentUser.uid, "connection_test");
      setSyncStatus(prev => ({ 
        ...prev, 
        isFirebaseConnected: true, 
        syncError: null,
        lastSyncTime: new Date()
      }));
      return true;
    } catch (error) {
      console.error("Firebase connection test failed:", error);
      setSyncStatus(prev => ({ 
        ...prev, 
        isFirebaseConnected: false,
        syncError: error instanceof Error ? error.message : "Unknown error"
      }));
      return false;
    }
  }, [currentUser]);

  // Periodic connectivity check
  useEffect(() => {
    if (!currentUser) return;

    const checkConnection = async () => {
      await testFirebaseConnection();
    };

    // Check immediately
    checkConnection();

    // Then check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [currentUser, testFirebaseConnection]);

  const updateSyncStatus = useCallback((updates: Partial<SyncStatus>) => {
    setSyncStatus(prev => ({ ...prev, ...updates }));
  }, []);

  const markSyncSuccess = useCallback(() => {
    setSyncStatus(prev => ({
      ...prev,
      lastSyncTime: new Date(),
      syncError: null,
      pendingChanges: Math.max(0, prev.pendingChanges - 1)
    }));
  }, []);

  const markSyncError = useCallback((error: string) => {
    setSyncStatus(prev => ({
      ...prev,
      syncError: error,
      pendingChanges: prev.pendingChanges + 1
    }));
  }, []);

  const incrementPendingChanges = useCallback(() => {
    setSyncStatus(prev => ({
      ...prev,
      pendingChanges: prev.pendingChanges + 1
    }));
  }, []);

  return {
    syncStatus,
    updateSyncStatus,
    markSyncSuccess,
    markSyncError,
    incrementPendingChanges,
    testFirebaseConnection
  };
};
