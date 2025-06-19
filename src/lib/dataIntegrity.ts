// Data integrity and recovery utilities
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

export const checkDataIntegrity = (userData: any): DataIntegrityReport => {
  const report: DataIntegrityReport = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check templates
  if (userData.resumeTemplates && !validateTemplateData(userData.resumeTemplates)) {
    report.isValid = false;
    report.errors.push("Invalid resume templates data structure");
  }

  if (userData.coverLetterTemplates && !validateTemplateData(userData.coverLetterTemplates)) {
    report.isValid = false;
    report.errors.push("Invalid cover letter templates data structure");
  }

  // Check custom prompts
  if (userData.customPrompts && !validateCustomPrompts(userData.customPrompts)) {
    report.isValid = false;
    report.errors.push("Invalid custom prompts data structure");
  }

  // Check API keys
  if (userData.openRouterApiKey && !validateApiKey(userData.openRouterApiKey)) {
    report.warnings.push("Invalid OpenRouter API key format");
  }

  if (userData.googleApiKey && !validateApiKey(userData.googleApiKey)) {
    report.warnings.push("Invalid Google API key format");
  }

  // Check for empty arrays
  if (userData.resumeTemplates && Array.isArray(userData.resumeTemplates) && userData.resumeTemplates.length === 0) {
    report.warnings.push("Resume templates array is empty");
  }

  if (userData.coverLetterTemplates && Array.isArray(userData.coverLetterTemplates) && userData.coverLetterTemplates.length === 0) {
    report.warnings.push("Cover letter templates array is empty");
  }

  return report;
};

export const repairData = (userData: any, defaults: {
  resumeTemplates: Template[];
  coverLetterTemplates: Template[];
  customPrompts: CustomPrompt[];
}): any => {
  const repairedData = { ...userData };

  // Repair templates
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

  // Clean up API keys
  if (repairedData.openRouterApiKey && !validateApiKey(repairedData.openRouterApiKey)) {
    delete repairedData.openRouterApiKey;
  }

  if (repairedData.googleApiKey && !validateApiKey(repairedData.googleApiKey)) {
    delete repairedData.googleApiKey;
  }

  return repairedData;
};

export const createDataBackup = (data: any): string => {
  try {
    return JSON.stringify({
      ...data,
      backupTimestamp: new Date().toISOString(),
      version: 1
    });
  } catch (error) {
    console.error("Error creating data backup:", error);
    throw new Error("Failed to create data backup");
  }
};

export const restoreDataFromBackup = (backupString: string): any => {
  try {
    const backup = JSON.parse(backupString);
    
    // Validate backup format
    if (!backup.backupTimestamp || !backup.version) {
      throw new Error("Invalid backup format");
    }

    return backup;
  } catch (error) {
    console.error("Error restoring data from backup:", error);
    throw new Error("Failed to restore data from backup");
  }
};

export const showDataIntegrityToast = (report: DataIntegrityReport) => {
  if (!report.isValid) {
    toast.error(`Data integrity issues found: ${report.errors.join(', ')}`);
  } else if (report.warnings.length > 0) {
    toast.warning(`Data warnings: ${report.warnings.join(', ')}`);
  }
};
