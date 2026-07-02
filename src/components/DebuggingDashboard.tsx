import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Bug,
  AlertTriangle,
  CheckCircle,
  Activity,
  Database,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useTemplates } from '@/hooks/useTemplates';

interface SystemInfo {
  userAgent: string;
  timestamp: string;
  localStorage: {
    available: boolean;
    usage: { used: number; total: number };
  };
  recoveryOptions: {
    hasBackups: boolean;
    backups: Array<{ timestamp: string }>;
    consistency: {
      hasData: boolean;
      hasBackups: boolean;
      dataCount: number;
      backupCount: number;
    } | null;
  } | null;
  currentUser: {
    uid: string;
    email: string | null;
  } | null;
}

interface DebuggingDashboardProps {
  trigger?: React.ReactNode;
}

export const DebuggingDashboard: React.FC<DebuggingDashboardProps> = ({ trigger }) => {
  const { currentUser } = useAuth();
  const { syncStatus } = useSyncStatus();
  const { getRecoveryOptions } = useTemplates();
  const [isOpen, setIsOpen] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      const recoveryOptions = currentUser ? getRecoveryOptions() : null;
      setSystemInfo({
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        localStorage: {
          available: typeof localStorage !== 'undefined',
          usage: getLocalStorageUsage(),
        },
        recoveryOptions,
        currentUser: currentUser ? { uid: currentUser.uid, email: currentUser.email } : null,
      });
    }
  }, [isOpen, currentUser, getRecoveryOptions]);

  const getLocalStorageUsage = (): { used: number; total: number } => {
    try {
      let used = 0;
      for (const key of Object.keys(localStorage)) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          used += localStorage[key].length;
        }
      }
      return { used, total: 5 * 1024 * 1024 };
    } catch {
      return { used: 0, total: 0 };
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Bug className="h-4 w-4 mr-2" />
      Debug
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Data Persistence Debugging Dashboard
          </DialogTitle>
          <DialogDescription>
            Monitor system status and troubleshoot data persistence issues.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Status
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Sync Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Online:</span>
                    <Badge variant={syncStatus.isOnline ? "secondary" : "destructive"}>
                      {syncStatus.isOnline ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Firebase:</span>
                    <Badge variant={syncStatus.isFirebaseConnected ? "secondary" : "destructive"}>
                      {syncStatus.isFirebaseConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <Badge variant={syncStatus.pendingChanges > 0 ? "secondary" : "outline"}>
                      {syncStatus.pendingChanges}
                    </Badge>
                  </div>
                  {syncStatus.lastSyncTime && (
                    <div className="flex justify-between">
                      <span>Last Sync:</span>
                      <span className="text-xs">{syncStatus.lastSyncTime.toLocaleTimeString()}</span>
                    </div>
                  )}
                  {syncStatus.syncError && (
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400 text-xs">
                      {syncStatus.syncError}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Data Protection
                </h3>
                {systemInfo?.recoveryOptions ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Local Data:</span>
                      <Badge variant={systemInfo.recoveryOptions.consistency?.hasData ? "secondary" : "destructive"}>
                        {systemInfo.recoveryOptions.consistency?.hasData ? "Available" : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Backups:</span>
                      <Badge variant={systemInfo.recoveryOptions.hasBackups ? "secondary" : "outline"}>
                        {systemInfo.recoveryOptions.backups?.length || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Items:</span>
                      <span>{systemInfo.recoveryOptions.consistency?.dataCount || 0}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No user logged in</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border p-4 text-sm text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>Debug logs are written to the browser console. Open DevTools → Console to view them.</p>
            </div>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <h3 className="font-medium">System Information</h3>
            {systemInfo && (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">Browser Environment</h4>
                  <div className="space-y-1">
                    <div><strong>User Agent:</strong> <span className="text-xs font-mono">{systemInfo.userAgent}</span></div>
                    <div><strong>Timestamp:</strong> {systemInfo.timestamp}</div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-2">Storage</h4>
                  <div className="space-y-1">
                    <div><strong>LocalStorage Available:</strong> {systemInfo.localStorage.available ? 'Yes' : 'No'}</div>
                    <div><strong>Storage Usage:</strong> {formatBytes(systemInfo.localStorage.usage.used)} / {formatBytes(systemInfo.localStorage.usage.total)}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min((systemInfo.localStorage.usage.used / systemInfo.localStorage.usage.total) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {systemInfo.currentUser && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">User Session</h4>
                    <div className="space-y-1">
                      <div><strong>User ID:</strong> <span className="font-mono text-xs">{systemInfo.currentUser.uid}</span></div>
                      <div><strong>Email:</strong> {systemInfo.currentUser.email}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DebuggingDashboard;
