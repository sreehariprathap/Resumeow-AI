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
import {
  AlertTriangle,
  Download,
  Clock,
  Database,
  Shield,
  RefreshCw,
  CheckCircle,
  Info
} from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { useAuth } from '@/lib/authContext';
import { toast } from 'sonner';
import type { Template, CustomPrompt } from '@/types';

interface BackupData {
  resumeTemplates: Template[];
  coverLetterTemplates: Template[];
  customPrompts: CustomPrompt[];
  userSettings: Record<string, unknown>;
  timestamp: string;
  userId: string;
}

interface DataConsistency {
  hasData: boolean;
  hasBackups: boolean;
  dataCount: number;
  backupCount: number;
}

interface DataRecoveryDialogProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DataRecoveryDialog: React.FC<DataRecoveryDialogProps> = ({
  trigger,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange
}) => {
  const { currentUser } = useAuth();
  const { getRecoveryOptions, recoverFromBackup } = useTemplates();
  const [isOpen, setIsOpen] = useState(false);
  const [recoveryData, setRecoveryData] = useState<{
    hasBackups: boolean;
    backups: BackupData[];
    consistency: DataConsistency | null;
  } | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Handle controlled vs uncontrolled state
  const dialogIsOpen = controlledIsOpen !== undefined ? controlledIsOpen : isOpen;
  const setDialogIsOpen = controlledOnOpenChange || setIsOpen;

  useEffect(() => {
    if (dialogIsOpen && currentUser) {
      setRecoveryData(getRecoveryOptions());
    }
  }, [dialogIsOpen, currentUser, getRecoveryOptions]);

  const handleRecoverFromBackup = async (backupTimestamp: string) => {
    setIsRecovering(true);
    try {
      const success = recoverFromBackup(backupTimestamp);
      if (success) {
        toast.success('Data successfully recovered from backup');
        setDialogIsOpen(false);
        // Refresh recovery data
        setTimeout(() => {
          setRecoveryData(getRecoveryOptions());
        }, 1000);
      } else {
        toast.error('Failed to recover data from backup');
      }
    } catch (error) {
      console.error('Recovery error:', error);
      toast.error('An error occurred during recovery');
    } finally {
      setIsRecovering(false);
    }
  };

  const formatBackupSize = (backup: BackupData): string => {
    const total = backup.resumeTemplates.length + 
                  backup.coverLetterTemplates.length + 
                  backup.customPrompts.length;
    return `${total} items`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than an hour ago';
    }
  };

  if (!currentUser) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Shield className="h-4 w-4 mr-2" />
      Data Recovery
    </Button>
  );

  return (
    <Dialog open={dialogIsOpen} onOpenChange={setDialogIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Recovery Center
          </DialogTitle>
          <DialogDescription>
            Manage and restore your templates and settings from automatic backups.
          </DialogDescription>
        </DialogHeader>

        {!recoveryData ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading recovery options...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Data Status */}
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Current Data Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Has Local Data:</span>
                  <Badge variant={recoveryData.consistency?.hasData ? "secondary" : "destructive"}>
                    {recoveryData.consistency?.hasData ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Available Backups:</span>
                  <Badge variant={recoveryData.hasBackups ? "secondary" : "outline"}>
                    {recoveryData.backups.length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Data Items:</span>
                  <span>{recoveryData.consistency?.dataCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Backup Items:</span>
                  <span>{recoveryData.consistency?.backupCount || 0}</span>
                </div>
              </div>
            </div>

            {/* Backup List */}
            <div className="rounded-lg border p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Available Backups
              </h3>
              
              {!recoveryData.hasBackups ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No backups available</p>
                  <p className="text-sm">Backups are created automatically when you make changes.</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {recoveryData.backups.map((backup, index) => (
                      <div
                        key={backup.timestamp}
                        className="flex items-center justify-between p-3 rounded border bg-card"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              Backup #{recoveryData.backups.length - index}
                            </span>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Latest
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-4">
                              <span>📅 {new Date(backup.timestamp).toLocaleString()}</span>
                              <span>📊 {formatBackupSize(backup)}</span>
                              <span>🕒 {formatTimestamp(backup.timestamp)}</span>
                            </div>
                            <div className="text-xs opacity-75">
                              Resume: {backup.resumeTemplates.length} • 
                              Cover Letters: {backup.coverLetterTemplates.length} • 
                              Custom Prompts: {backup.customPrompts.length}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRecoverFromBackup(backup.timestamp)}
                          disabled={isRecovering}
                          className="ml-3"
                        >
                          {isRecovering ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-1" />
                              Restore
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recovery Recommendations */}
            {recoveryData.consistency && (
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recommendations
                </h3>
                <div className="space-y-2 text-sm">
                  {!recoveryData.consistency.hasData && recoveryData.hasBackups && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-700 dark:text-amber-300">
                          Data Loss Detected
                        </p>
                        <p className="text-amber-600 dark:text-amber-400">
                          Your templates appear to be missing. Consider restoring from the latest backup.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {recoveryData.consistency.hasData && recoveryData.hasBackups && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">
                          Data Protected
                        </p>
                        <p className="text-green-600 dark:text-green-400">
                          Your data is safely backed up and can be restored if needed.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {!recoveryData.hasBackups && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">
                          No Backups Available
                        </p>
                        <p className="text-blue-600 dark:text-blue-400">
                          Backups will be created automatically as you use the app.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setDialogIsOpen(false)}
            disabled={isRecovering}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataRecoveryDialog;
