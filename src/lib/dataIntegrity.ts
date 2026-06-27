// Data integrity, validation, and backup utilities
import type { Template, CustomPrompt } from "@/types";
import { toast } from "sonner";

export interface DataIntegrityReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateTemplateData = (data: unknown): data is Template[] => {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    item.id.length > 0 &&
    item.name.length > 0
  );
};

export const validateCustomPrompts = (data: unknown): data is CustomPrompt[] => {
  if (!Array.isArray(data)) {
    return false;
  }

  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.name === 'string' &&
    typeof item.content === 'string' &&
    (item.type === 'resume' || item.type === 'coverLetter') &&
    item.id.length > 0 &&
    item.name.length > 0 &&
    item.content.length > 0
  );
};

export const validateApiKey = (key: string): boolean => {
  return typeof key === 'string' && key.trim().length > 0;
};

export const checkDataIntegrity = (userData: Record<string, unknown>): DataIntegrityReport => {
  const report: DataIntegrityReport = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (userData.resumeTemplates && !validateTemplateData(userData.resumeTemplates)) {
    report.isValid = false;
    report.errors.push("Invalid resume templates data structure");
  }

  if (userData.coverLetterTemplates && !validateTemplateData(userData.coverLetterTemplates)) {
    report.isValid = false;
    report.errors.push("Invalid cover letter templates data structure");
  }

  if (userData.customPrompts && !validateCustomPrompts(userData.customPrompts)) {
    report.isValid = false;
    report.errors.push("Invalid custom prompts data structure");
  }

  if (userData.openRouterApiKey && !validateApiKey(userData.openRouterApiKey as string)) {
    report.warnings.push("Invalid OpenRouter API key format");
  }

  if (userData.googleApiKey && !validateApiKey(userData.googleApiKey as string)) {
    report.warnings.push("Invalid Google API key format");
  }

  if (userData.resumeTemplates && Array.isArray(userData.resumeTemplates) && userData.resumeTemplates.length === 0) {
    report.warnings.push("Resume templates array is empty");
  }

  if (userData.coverLetterTemplates && Array.isArray(userData.coverLetterTemplates) && userData.coverLetterTemplates.length === 0) {
    report.warnings.push("Cover letter templates array is empty");
  }

  return report;
};

export const repairData = (userData: Record<string, unknown>, defaults: {
  resumeTemplates: Template[];
  coverLetterTemplates: Template[];
  customPrompts: CustomPrompt[];
}): Record<string, unknown> => {
  const repairedData = { ...userData };

  if (!validateTemplateData(repairedData.resumeTemplates)) {
    console.warn("Repairing resume templates with defaults");
    repairedData.resumeTemplates = defaults.resumeTemplates;
  }

  if (!validateTemplateData(repairedData.coverLetterTemplates)) {
    console.warn("Repairing cover letter templates with defaults");
    repairedData.coverLetterTemplates = defaults.coverLetterTemplates;
  }

  if (!validateCustomPrompts(repairedData.customPrompts)) {
    console.warn("Repairing custom prompts with defaults");
    repairedData.customPrompts = defaults.customPrompts;
  }

  if (repairedData.openRouterApiKey && !validateApiKey(repairedData.openRouterApiKey as string)) {
    delete repairedData.openRouterApiKey;
  }

  if (repairedData.googleApiKey && !validateApiKey(repairedData.googleApiKey as string)) {
    delete repairedData.googleApiKey;
  }

  return repairedData;
};

export const showDataIntegrityToast = (report: DataIntegrityReport) => {
  if (!report.isValid) {
    toast.error(`Data integrity issues found: ${report.errors.join(', ')}`);
  } else if (report.warnings.length > 0) {
    toast.warning(`Data warnings: ${report.warnings.join(', ')}`);
  }
};

// --- Backup / Recovery (consolidated from dataRecovery.ts) ---

interface BackupData {
  resumeTemplates: Template[];
  coverLetterTemplates: Template[];
  customPrompts: CustomPrompt[];
  userSettings: Record<string, unknown>;
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
    userSettings?: Record<string, unknown>;
  }
): void => {
  try {
    const backup: BackupData = {
      ...data,
      userSettings: data.userSettings ?? {},
      timestamp: new Date().toISOString(),
      userId,
    };
    const backupKey = `${BACKUP_KEY_PREFIX}${userId}_${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));
    cleanupOldBackups(userId);
  } catch (error) {
    console.error('[backup] Failed to create emergency backup:', error);
  }
};

export const getAvailableBackups = (userId: string): BackupData[] => {
  const backups: BackupData[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${BACKUP_KEY_PREFIX}${userId}_`)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try { backups.push(JSON.parse(raw) as BackupData); } catch { /* skip corrupt */ }
        }
      }
    }
  } catch (error) {
    console.error('[backup] Error reading backups:', error);
  }
  return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const restoreFromBackup = (backup: BackupData): boolean => {
  try {
    const userKey = `user_${backup.userId}`;
    if (backup.resumeTemplates.length > 0) {
      localStorage.setItem(`${userKey}_resumeTemplates`, JSON.stringify(backup.resumeTemplates));
    }
    if (backup.coverLetterTemplates.length > 0) {
      localStorage.setItem(`${userKey}_coverLetterTemplates`, JSON.stringify(backup.coverLetterTemplates));
    }
    if (backup.customPrompts.length > 0) {
      localStorage.setItem(`${userKey}_customPrompts`, JSON.stringify(backup.customPrompts));
    }
    if (Object.keys(backup.userSettings).length > 0) {
      Object.entries(backup.userSettings).forEach(([key, value]) => {
        if (typeof value === 'string') localStorage.setItem(`${userKey}_${key}`, value);
      });
    }
    toast.success(`Data restored from backup (${new Date(backup.timestamp).toLocaleString()})`);
    return true;
  } catch (error) {
    console.error('[backup] Error restoring:', error);
    toast.error('Failed to restore backup');
    return false;
  }
};

export const autoRecoverLostData = (userId: string): boolean => {
  const backups = getAvailableBackups(userId);
  if (backups.length === 0) return false;
  const success = restoreFromBackup(backups[0]);
  if (success) toast.info('Data automatically recovered from backup');
  return success;
};

export const cleanupOldBackups = (userId: string): void => {
  try {
    const backups = getAvailableBackups(userId);
    if (backups.length > MAX_BACKUPS) {
      backups.slice(MAX_BACKUPS).forEach(backup => {
        const key = `${BACKUP_KEY_PREFIX}${userId}_${new Date(backup.timestamp).getTime()}`;
        localStorage.removeItem(key);
      });
    }
  } catch (error) {
    console.error('[backup] Error during cleanup:', error);
  }
};

export const checkDataConsistency = (userId: string): {
  hasData: boolean;
  hasBackups: boolean;
  dataCount: number;
  backupCount: number;
} => {
  const userKey = `user_${userId}`;
  const keys = ['resumeTemplates', 'coverLetterTemplates', 'customPrompts'];
  const dataCount = keys.filter(k => localStorage.getItem(`${userKey}_${k}`) !== null).length;
  const backups = getAvailableBackups(userId);
  return { hasData: dataCount > 0, hasBackups: backups.length > 0, dataCount, backupCount: backups.length };
};
