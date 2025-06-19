import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Cloud, 
  CloudOff, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Shield,
  Bug 
} from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useAuth } from '@/lib/authContext';
import { DataRecoveryDialog } from './DataRecoveryDialog';
import { DebuggingDashboard } from './DebuggingDashboard';

export const SyncStatusIndicator: React.FC = () => {
  const { currentUser } = useAuth();
  const { syncStatus, testFirebaseConnection } = useSyncStatus();

  if (!currentUser) {
    return (
      <Badge variant="secondary" className="text-xs">
        <CloudOff className="h-3 w-3 mr-1" />
        Not signed in
      </Badge>
    );
  }

  const handleRetrySync = async () => {
    await testFirebaseConnection();
  };

  if (!syncStatus.isOnline) {
    return (
      <Badge variant="destructive" className="text-xs">
        <WifiOff className="h-3 w-3 mr-1" />
        Offline
      </Badge>
    );
  }

  if (syncStatus.syncError) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Sync Error
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetrySync}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (!syncStatus.isFirebaseConnected) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <CloudOff className="h-3 w-3 mr-1" />
          Connecting...
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetrySync}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (syncStatus.pendingChanges > 0) {
    return (
      <Badge variant="secondary" className="text-xs">
        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        Syncing ({syncStatus.pendingChanges})
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
      <CheckCircle className="h-3 w-3 mr-1" />
      Synced
      {syncStatus.lastSyncTime && (
        <span className="ml-1 text-xs opacity-70">
          {syncStatus.lastSyncTime.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      )}
    </Badge>
  );
};

export const SyncStatusDetails: React.FC = () => {
  const { currentUser } = useAuth();
  const { syncStatus } = useSyncStatus();

  if (!currentUser) return null;

  return (
    <div className="text-xs text-muted-foreground space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {syncStatus.isOnline ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
          <span>Network: {syncStatus.isOnline ? 'Online' : 'Offline'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {syncStatus.isFirebaseConnected ? (
            <Cloud className="h-3 w-3 text-green-500" />
          ) : (
            <CloudOff className="h-3 w-3 text-red-500" />
          )}
          <span>
            Cloud: {syncStatus.isFirebaseConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {syncStatus.lastSyncTime && (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>
              Last sync: {syncStatus.lastSyncTime.toLocaleString()}
            </span>
          </div>
        )}

        {syncStatus.syncError && (
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-3 w-3" />
            <span>Error: {syncStatus.syncError}</span>
          </div>
        )}

        {syncStatus.pendingChanges > 0 && (
          <div className="flex items-center gap-2 text-amber-500">
            <RefreshCw className="h-3 w-3" />
            <span>Pending changes: {syncStatus.pendingChanges}</span>
          </div>
        )}
      </div>      {/* Data Recovery Section */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Data Protection</span>
          <div className="flex gap-1">
            <DataRecoveryDialog 
              trigger={
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Recovery
                </Button>
              }
            />
            <DebuggingDashboard 
              trigger={
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                  <Bug className="h-3 w-3 mr-1" />
                  Debug
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
