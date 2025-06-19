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
  Download,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  Activity,
  Database,
  Settings,
  RefreshCw
} from 'lucide-react';
import { dataPersistenceLogger, LogLevel, type LogEntry } from '@/lib/dataPersistenceLogger';
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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [criticalLogs, setCriticalLogs] = useState<LogEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Refresh logs when dialog opens
      setLogs(dataPersistenceLogger.getRecentLogs(100));
      setCriticalLogs(dataPersistenceLogger.getCriticalLogs());
      
      // Gather system information
      const recoveryOptions = currentUser ? getRecoveryOptions() : null;
      setSystemInfo({
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        localStorage: {
          available: typeof localStorage !== 'undefined',
          usage: getLocalStorageUsage()
        },
        recoveryOptions,
        currentUser: currentUser ? {
          uid: currentUser.uid,
          email: currentUser.email
        } : null
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
      // Most browsers limit localStorage to 5-10MB
      return { used, total: 5 * 1024 * 1024 };
    } catch {
      return { used: 0, total: 0 };
    }
  };

  const exportLogs = () => {
    const logData = dataPersistenceLogger.exportLogs();
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-persistence-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    dataPersistenceLogger.clearLogs();
    setLogs([]);
    setCriticalLogs([]);
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return 'text-gray-500';
      case LogLevel.INFO:
        return 'text-blue-600';
      case LogLevel.WARN:
        return 'text-amber-600';
      case LogLevel.ERROR:
        return 'text-red-600';
      case LogLevel.CRITICAL:
        return 'text-red-800 font-bold';
      default:
        return 'text-gray-600';
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return <Bug className="h-3 w-3" />;
      case LogLevel.INFO:
        return <Info className="h-3 w-3" />;
      case LogLevel.WARN:
        return <AlertTriangle className="h-3 w-3" />;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
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
            Monitor system status, view logs, and troubleshoot data persistence issues.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Status
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="critical" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Critical ({criticalLogs.length})
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Sync Status */}
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Sync Status
                </h3>
                <div className="space-y-2 text-sm">                  <div className="flex justify-between">
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

              {/* Data Protection */}
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Data Protection
                </h3>
                {systemInfo?.recoveryOptions ? (
                  <div className="space-y-2 text-sm">                    <div className="flex justify-between">
                      <span>Local Data:</span>
                      <Badge variant={systemInfo.recoveryOptions?.consistency?.hasData ? "secondary" : "destructive"}>
                        {systemInfo.recoveryOptions?.consistency?.hasData ? "Available" : "Missing"}
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
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Recent Activity Logs</h3>              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setLogs(dataPersistenceLogger.getRecentLogs(100))}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={exportLogs}>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={clearLogs}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>            <div className="h-80 rounded border p-2 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No logs available</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs p-2 rounded border-l-2 border-l-gray-300">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={getLevelColor(log.level)}>
                            {getLevelIcon(log.level)}
                          </span>
                          <span className="font-mono text-gray-500">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.category}
                          </Badge>
                        </div>
                        <span className={`font-medium ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{log.message}</p>
                      {log.data && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            Show details
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="critical" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Critical Issues & Errors
              </h3>
              <Button variant="outline" size="sm" onClick={() => setCriticalLogs(dataPersistenceLogger.getCriticalLogs())}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>            <div className="h-80 rounded border p-2 overflow-y-auto">
              {criticalLogs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                  <p className="text-muted-foreground">No critical issues found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {criticalLogs.map((log, index) => (
                    <div key={index} className="p-3 rounded border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-700 dark:text-red-300">
                            {log.level.toUpperCase()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {log.category}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-red-600 dark:text-red-400 text-sm">{log.message}</p>
                      {log.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-red-600 hover:text-red-800 text-sm">
                            Show error details
                          </summary>
                          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                    <div><strong>LocalStorage Available:</strong> {systemInfo.localStorage.available ? 'Yes' : 'No'}</div>                    <div><strong>Storage Usage:</strong> {formatBytes(systemInfo.localStorage.usage.used)} / {formatBytes(systemInfo.localStorage.usage.total)}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((systemInfo.localStorage.usage.used / systemInfo.localStorage.usage.total) * 100, 100)}%` }}
                      ></div>
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

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DebuggingDashboard;
