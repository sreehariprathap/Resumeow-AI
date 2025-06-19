// Emergency data recovery utilities
import { toast } from 'sonner';
import type { Template, CustomPrompt } from '@/types';

interface BackupData {
  resumeTemplates: Template[];
  coverLetterTemplates: Template[];
  customPrompts: CustomPrompt[];
  userSettings: Record<string, any>;
  timestamp: string;
  userId: string;
}

const BACKUP_KEY_PREFIX = 'emergency_backup_';
const MAX_BACKUPS = 5;

export const createEmergencyBackup = (
  userId: string,
  data: {
    resumeTemplates: Template[];
    coverLetterTemplates: Template[];
    customPrompts: CustomPrompt[];
    userSettings?: Record<string, any>;
  }
): void => {
  try {
    const backup: BackupData = {
      ...data,
      userSettings: data.userSettings || {},
      timestamp: new Date().toISOString(),
      userId
    };

    const backupKey = `${BACKUP_KEY_PREFIX}${userId}_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));

    // Clean up old backups
    cleanupOldBackups(userId);
    
    console.log('Emergency backup created:', backupKey);
  } catch (error) {
    console.error('Failed to create emergency backup:', error);
  }
};

export const getAvailableBackups = (userId: string): BackupData[] => {
  const backups: BackupData[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${BACKUP_KEY_PREFIX}${userId}_`)) {
        const backupData = localStorage.getItem(key);
        if (backupData) {
          try {
            const backup = JSON.parse(backupData) as BackupData;
            backups.push(backup);
          } catch (error) {
            console.error('Invalid backup data:', key, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading backups:', error);
  }

  // Sort by timestamp, newest first
  return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const restoreFromBackup = (backup: BackupData): boolean => {
  try {
    const userKey = `user_${backup.userId}`;
    
    // Restore templates
    if (backup.resumeTemplates && backup.resumeTemplates.length > 0) {
      localStorage.setItem(`${userKey}_resumeTemplates`, JSON.stringify(backup.resumeTemplates));
    }
    
    if (backup.coverLetterTemplates && backup.coverLetterTemplates.length > 0) {
      localStorage.setItem(`${userKey}_coverLetterTemplates`, JSON.stringify(backup.coverLetterTemplates));
    }
    
    if (backup.customPrompts && backup.customPrompts.length > 0) {
      localStorage.setItem(`${userKey}_customPrompts`, JSON.stringify(backup.customPrompts));
    }

    // Restore settings if available
    if (backup.userSettings && Object.keys(backup.userSettings).length > 0) {
      Object.entries(backup.userSettings).forEach(([key, value]) => {
        if (typeof value === 'string') {
          localStorage.setItem(`${userKey}_${key}`, value);
        }
      });
    }

    toast.success(`Data restored from backup (${new Date(backup.timestamp).toLocaleString()})`);
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    toast.error('Failed to restore backup');
    return false;
  }
};

export const autoRecoverLostData = (userId: string): boolean => {
  const backups = getAvailableBackups(userId);
  
  if (backups.length > 0) {
    const latestBackup = backups[0];
    console.log('Auto-recovering from latest backup:', latestBackup.timestamp);
    
    const success = restoreFromBackup(latestBackup);
    if (success) {
      toast.info('Data automatically recovered from backup');
    }
    return success;
  }
  
  return false;
};

export const cleanupOldBackups = (userId: string): void => {
  try {
    const backups = getAvailableBackups(userId);
    
    // Remove excess backups (keep only MAX_BACKUPS)
    if (backups.length > MAX_BACKUPS) {
      const toRemove = backups.slice(MAX_BACKUPS);
      
      toRemove.forEach(backup => {
        const backupKey = `${BACKUP_KEY_PREFIX}${userId}_${new Date(backup.timestamp).getTime()}`;
        localStorage.removeItem(backupKey);
      });
      
      console.log(`Cleaned up ${toRemove.length} old backups`);
    }
  } catch (error) {
    console.error('Error cleaning up backups:', error);
  }
};

export const checkDataConsistency = (userId: string): {
  hasData: boolean;
  hasBackups: boolean;
  dataCount: number;
  backupCount: number;
} => {
  const userKey = `user_${userId}`;
  
  const resumeTemplates = localStorage.getItem(`${userKey}_resumeTemplates`);
  const coverLetterTemplates = localStorage.getItem(`${userKey}_coverLetterTemplates`);
  const customPrompts = localStorage.getItem(`${userKey}_customPrompts`);
  
  let dataCount = 0;
  if (resumeTemplates) dataCount++;
  if (coverLetterTemplates) dataCount++;
  if (customPrompts) dataCount++;
  
  const backups = getAvailableBackups(userId);
  
  return {
    hasData: dataCount > 0,
    hasBackups: backups.length > 0,
    dataCount,
    backupCount: backups.length
  };
};

export const showRecoveryDialog = (userId: string): void => {
  const backups = getAvailableBackups(userId);
  
  if (backups.length === 0) {
    toast.error('No backups available for recovery');
    return;
  }

  // For now, just auto-restore the latest backup
  // In a full implementation, you'd show a dialog with backup options
  const latest = backups[0];
  restoreFromBackup(latest);
};
