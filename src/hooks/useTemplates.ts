import type { PromptType, Template, CustomPrompt } from "@/types";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/authContext";
import { saveUserData, getUserData } from "@/lib/firebaseWeb";
import { 
  checkDataIntegrity, 
  repairData, 
  validateTemplateData, 
  validateCustomPrompts,
  showDataIntegrityToast 
} from "@/lib/dataIntegrity";
import { useSyncStatus } from "./useSyncStatus";
import { createEmergencyBackup, autoRecoverLostData, checkDataConsistency, getAvailableBackups, restoreFromBackup } from "@/lib/dataRecovery";
import { 
  logFirebaseOperation, 
  logLocalStorageOperation, 
  logDataIntegrityIssue, 
  logBackupOperation,
  showUserFriendlyError,
  showUserFriendlyWarning,
  showUserFriendlyInfo
} from "@/lib/dataPersistenceLogger";

// Default templates to show for first-time users
const DEFAULT_RESUME_TEMPLATES: Template[] = [
  {
    id: "default-resume-1",
    name: "Standard Resume",
    content: "Based on the following job description:\n\n{JOB_DESCRIPTION}\n\nPlease tailor my resume to highlight relevant skills and experience:\n\n{RESUME}",
    resumeLatex: "% Sample LaTeX Resume\n\\documentclass{article}\n\\begin{document}\n\\section{Education}\n\\section{Experience}\n\\section{Skills}\n\\end{document}"
  },
  {
    id: "default-resume-2",
    name: "ATS-Optimized Resume",
    content: "Using this job posting:\n\n{JOB_DESCRIPTION}\n\nRewrite my resume to be ATS-friendly while highlighting my most relevant qualifications:\n\n{RESUME}",
    resumeLatex: "% Sample LaTeX Resume\n\\documentclass{article}\n\\begin{document}\n\\section{Education}\n\\section{Experience}\n\\section{Skills}\n\\end{document}"
  }
];

const DEFAULT_COVER_LETTER_TEMPLATES: Template[] = [
  {
    id: "default-cover-letter-1",
    name: "Standard Cover Letter",
    content: "Based on the following job description:\n\n{JOB_DESCRIPTION}\n\nPlease write a cover letter that matches my resume:\n\n{RESUME}\n\nUse this template as a reference:\n\n{COVER_LETTER_TEMPLATE}",
    coverLetterTemplate: "Dear Hiring Manager,\n\nI am writing to express my interest in the [Position] role at [Company].\n\n[Body Paragraphs]\n\nThank you for considering my application. I look forward to the opportunity to discuss how my skills and experience align with your needs.\n\nSincerely,\n[Your Name]"
  }
];

// Default custom prompts
const DEFAULT_CUSTOM_PROMPTS: CustomPrompt[] = [
  {
    id: "default-resume-prompt",
    type: "resume",
    name: "Default Resume Prompt",
    content: "Based on this job description:\n\n{JOB_DESCRIPTION}\n\nPlease tailor my resume:\n\n{RESUME}\n\n{OPTIONAL_INSTRUCTIONS}",
    placeholders: {
      resumePosition: "{RESUME}",
      jobDescriptionPosition: "{JOB_DESCRIPTION}",
      optionalInstructionsPosition: "{OPTIONAL_INSTRUCTIONS}"
    }
  },
  {
    id: "default-cover-letter-prompt",
    type: "coverLetter",
    name: "Default Cover Letter Prompt",
    content: "Based on this job description:\n\n{JOB_DESCRIPTION}\n\nAnd my resume:\n\n{RESUME}\n\nWrite a cover letter using this template:\n\n{COVER_LETTER_TEMPLATE}\n\n{OPTIONAL_INSTRUCTIONS}",
    placeholders: {
      resumePosition: "{RESUME}",
      jobDescriptionPosition: "{JOB_DESCRIPTION}",
      optionalInstructionsPosition: "{OPTIONAL_INSTRUCTIONS}",
      coverLetterTemplatePosition: "{COVER_LETTER_TEMPLATE}"
    }
  }
];

export function useTemplates() {
  const { currentUser } = useAuth();
  const { markSyncSuccess, markSyncError, incrementPendingChanges } = useSyncStatus();
  const [resumeTemplates, setResumeTemplates] = useState<Template[]>([]);
  const [coverLetterTemplates, setCoverLetterTemplates] = useState<Template[]>([]);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  
  // Use refs to track if initial data has been loaded
  const initialLoadRef = useRef(false);
  const prevUserRef = useRef<string | null>(null);
  const pendingSaveRef = useRef(false);    // Function to save to localStorage with user isolation
  const saveToLocalStorage = useCallback(() => {
    if (!currentUser) return; // Only save to localStorage if user is logged in
    
    try {
      const userKey = `user_${currentUser.uid}`;
      if (resumeTemplates.length > 0) {
        localStorage.setItem(`${userKey}_resumeTemplates`, JSON.stringify(resumeTemplates));
        logLocalStorageOperation('save', true, currentUser.uid, 'resumeTemplates');
      }
      if (coverLetterTemplates.length > 0) {
        localStorage.setItem(`${userKey}_coverLetterTemplates`, JSON.stringify(coverLetterTemplates));
        logLocalStorageOperation('save', true, currentUser.uid, 'coverLetterTemplates');
      }
      if (customPrompts.length > 0) {
        localStorage.setItem(`${userKey}_customPrompts`, JSON.stringify(customPrompts));
        logLocalStorageOperation('save', true, currentUser.uid, 'customPrompts');
      }
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      logLocalStorageOperation('save', false, currentUser.uid, 'templates', error as Error);
    }
  }, [currentUser, resumeTemplates, coverLetterTemplates, customPrompts]);// Save to Firebase if user is logged in with retry logic
  const saveToFirebase = useCallback(async (retryCount = 0) => {
    if (!currentUser || pendingSaveRef.current) return;
    
    pendingSaveRef.current = true;
    incrementPendingChanges();
    
    try {
      const templatesData = {
        resumeTemplates,
        coverLetterTemplates,
        customPrompts,
        updatedAt: new Date().toISOString(),
        version: 1 // Add version for future compatibility
      };
      
      await saveUserData(currentUser.uid, "templates", templatesData);
      console.log("Templates successfully saved to Firebase");
      
      logFirebaseOperation('save', true, currentUser.uid, 'templates');
      markSyncSuccess();
    } catch (error) {
      console.error("Error saving templates to Firebase:", error);
      
      logFirebaseOperation('save', false, currentUser.uid, 'templates', error as Error, retryCount);
      markSyncError(error instanceof Error ? error.message : "Unknown sync error");
      
      // Retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          saveToFirebase(retryCount + 1);
        }, delay);
      } else {
        console.error("Failed to save templates after 3 retries");
        showUserFriendlyWarning(
          "Sync Failed",
          "Your templates are saved locally but couldn't sync to the cloud. They'll sync when connection is restored.",
          "sync"
        );
      }
    } finally {
      pendingSaveRef.current = false;
    }
  }, [currentUser, resumeTemplates, coverLetterTemplates, customPrompts, incrementPendingChanges, markSyncSuccess, markSyncError]);
  // Load data functions with user isolation
  const loadResumeTemplatesFromLocalStorage = useCallback(() => {
    if (!currentUser) {
      setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
      return;
    }
    
    const userKey = `user_${currentUser.uid}`;
    const savedResumeTemplates = localStorage.getItem(`${userKey}_resumeTemplates`);
    if (savedResumeTemplates) {
      setResumeTemplates(JSON.parse(savedResumeTemplates));
    } else {
      setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
      localStorage.setItem(`${userKey}_resumeTemplates`, JSON.stringify(DEFAULT_RESUME_TEMPLATES));
    }
  }, [currentUser]);

  const loadCoverLetterTemplatesFromLocalStorage = useCallback(() => {
    if (!currentUser) {
      setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
      return;
    }
    
    const userKey = `user_${currentUser.uid}`;
    const savedCoverLetterTemplates = localStorage.getItem(`${userKey}_coverLetterTemplates`);
    if (savedCoverLetterTemplates) {
      setCoverLetterTemplates(JSON.parse(savedCoverLetterTemplates));
    } else {
      setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
      localStorage.setItem(`${userKey}_coverLetterTemplates`, JSON.stringify(DEFAULT_COVER_LETTER_TEMPLATES));
    }
  }, [currentUser]);

  const loadCustomPromptsFromLocalStorage = useCallback(() => {
    if (!currentUser) {
      setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
      return;
    }
    
    const userKey = `user_${currentUser.uid}`;
    const savedCustomPrompts = localStorage.getItem(`${userKey}_customPrompts`);
    if (savedCustomPrompts) {
      setCustomPrompts(JSON.parse(savedCustomPrompts));
    } else {
      setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
      localStorage.setItem(`${userKey}_customPrompts`, JSON.stringify(DEFAULT_CUSTOM_PROMPTS));
    }
  }, [currentUser]);
    const loadFromLocalStorage = useCallback(() => {
    if (!currentUser) {
      // For non-logged-in users, always use defaults and don't persist
      setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
      setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
      setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
      return;
    }
    
    try {
      loadResumeTemplatesFromLocalStorage();
      loadCoverLetterTemplatesFromLocalStorage();
      loadCustomPromptsFromLocalStorage();
    } catch (error) {
      console.error("Error loading templates from localStorage:", error);
      // Fallback to defaults if there's an error
      setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
      setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
      setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
    }
  }, [currentUser, loadResumeTemplatesFromLocalStorage, loadCoverLetterTemplatesFromLocalStorage, loadCustomPromptsFromLocalStorage]);

  // Load data on initial mount and when user changes
  useEffect(() => {
    // Skip if the user hasn't changed (except on initial load)
    if (initialLoadRef.current && prevUserRef.current === (currentUser?.uid || null)) {
      return;
    }
    
    // Update refs
    initialLoadRef.current = true;
    prevUserRef.current = currentUser?.uid || null;
      const loadTemplates = async () => {
      try {
        if (currentUser) {
          console.log("Loading templates for user:", currentUser.uid);
          
          try {
            // Try to load from Firebase first
            const userData = await getUserData(currentUser.uid, "templates");
              if (userData && userData.resumeTemplates && userData.coverLetterTemplates && userData.customPrompts) {
              console.log("Loading templates from Firebase");
              
              // Validate data integrity
              const integrityReport = checkDataIntegrity(userData);
                if (!integrityReport.isValid) {
                console.warn("Data integrity issues found, attempting repair");
                logDataIntegrityIssue(currentUser.uid, 'invalid_data', 'Data integrity validation failed', integrityReport as unknown as Record<string, unknown>);
                
                const repairedData = repairData(userData, {
                  resumeTemplates: DEFAULT_RESUME_TEMPLATES,
                  coverLetterTemplates: DEFAULT_COVER_LETTER_TEMPLATES,
                  customPrompts: DEFAULT_CUSTOM_PROMPTS
                });
                
                // Use repaired data
                if (validateTemplateData(repairedData.resumeTemplates)) {
                  setResumeTemplates(repairedData.resumeTemplates);
                } else {
                  console.warn("Resume templates still invalid after repair, using defaults");
                  logDataIntegrityIssue(currentUser.uid, 'repair_failed', 'Resume templates invalid after repair');
                  setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
                }
                
                if (validateTemplateData(repairedData.coverLetterTemplates)) {
                  setCoverLetterTemplates(repairedData.coverLetterTemplates);
                } else {
                  console.warn("Cover letter templates still invalid after repair, using defaults");
                  logDataIntegrityIssue(currentUser.uid, 'repair_failed', 'Cover letter templates invalid after repair');
                  setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
                }
                
                if (validateCustomPrompts(repairedData.customPrompts)) {
                  setCustomPrompts(repairedData.customPrompts);
                } else {
                  console.warn("Custom prompts still invalid after repair, using defaults");
                  logDataIntegrityIssue(currentUser.uid, 'repair_failed', 'Custom prompts invalid after repair');
                  setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
                }
                
                showDataIntegrityToast(integrityReport);
                
                // Save repaired data back to Firebase
                setTimeout(() => saveToFirebase(), 2000);
              }else {
                // Data is valid, load normally
                if (validateTemplateData(userData.resumeTemplates)) {
                  setResumeTemplates(userData.resumeTemplates as Template[]);
                } else {
                  console.warn("Invalid resume templates data from Firebase");
                  loadResumeTemplatesFromLocalStorage();
                }
                
                if (validateTemplateData(userData.coverLetterTemplates)) {
                  setCoverLetterTemplates(userData.coverLetterTemplates as Template[]);
                } else {
                  console.warn("Invalid cover letter templates data from Firebase");
                  loadCoverLetterTemplatesFromLocalStorage();
                }
                
                if (validateCustomPrompts(userData.customPrompts)) {
                  setCustomPrompts(userData.customPrompts as CustomPrompt[]);
                } else {
                  console.warn("Invalid custom prompts data from Firebase");
                  loadCustomPromptsFromLocalStorage();
                }
                
                // Show warnings if any
                if (integrityReport.warnings.length > 0) {
                  showDataIntegrityToast(integrityReport);
                }
              }
              
              // Sync any missing data to Firebase
              if (!userData.resumeTemplates || !userData.coverLetterTemplates || !userData.customPrompts) {
                setTimeout(() => saveToFirebase(), 1000);
              }            } else {
              console.log("No complete template data in Firebase, loading from localStorage");
              
              // Check data consistency before loading
              const consistency = checkDataConsistency(currentUser.uid);
                if (!consistency.hasData && consistency.hasBackups) {
                console.log("No current data found but backups available, attempting auto-recovery");
                logBackupOperation('restore', false, currentUser.uid, { reason: 'auto_recovery_attempt', consistency });
                
                const recovered = autoRecoverLostData(currentUser.uid);
                if (recovered) {
                  logBackupOperation('restore', true, currentUser.uid, { reason: 'auto_recovery_success' });
                  showUserFriendlyInfo(
                    "Data Recovered",
                    "Your templates were automatically restored from a recent backup.",
                    "recovery"
                  );
                  // Reload after recovery
                  loadFromLocalStorage();
                  setTimeout(() => saveToFirebase(), 1000);
                  return;
                } else {
                  logBackupOperation('restore', false, currentUser.uid, { reason: 'auto_recovery_failed' });
                }
              }
              
              // Load from localStorage and sync to Firebase
              loadFromLocalStorage();
              setTimeout(() => saveToFirebase(), 1000);
            }
          } catch (firebaseError) {
            console.error("Error loading from Firebase, falling back to localStorage:", firebaseError);
            // Firebase failed, load from localStorage
            loadFromLocalStorage();
          }
        } else {
          // No user logged in, use defaults only
          console.log("No user logged in, using default templates");
          setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
          setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
          setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
        }
      } catch (error) {
        console.error("Error in template loading:", error);
        // Ultimate fallback to defaults
        setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
        setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
        setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
      }
    };

    loadTemplates();
  }, [currentUser, loadFromLocalStorage, loadResumeTemplatesFromLocalStorage, 
      loadCoverLetterTemplatesFromLocalStorage, loadCustomPromptsFromLocalStorage, saveToFirebase]);  // Combined effect for saving changes
  useEffect(() => {
    // Skip the first render and only run this effect when initialLoadRef is true
    if (!initialLoadRef.current || !currentUser) return;
    
    // Create emergency backup before saving changes
    try {
      createEmergencyBackup(currentUser.uid, {
        resumeTemplates,
        coverLetterTemplates,
        customPrompts
      });
      logBackupOperation('create', true, currentUser.uid, { 
        templateCount: resumeTemplates.length + coverLetterTemplates.length + customPrompts.length 
      });
    } catch (error) {
      console.error("Failed to create emergency backup:", error);
      logBackupOperation('create', false, currentUser.uid, { error: (error as Error).message });
    }
    
    // Save to localStorage first (with user isolation)
    saveToLocalStorage();
    
    // Save to Firebase with debounce
    const timer = setTimeout(() => {
      saveToFirebase();
    }, 500);
    return () => clearTimeout(timer);
  }, [resumeTemplates, coverLetterTemplates, customPrompts, currentUser, saveToLocalStorage, saveToFirebase]);
  // Add a new template
  const addTemplate = useCallback((type: PromptType, template: Template) => {
    if (type === "resume") {
      setResumeTemplates(prev => [...prev, template]);
    } else if (type === "coverLetter") {
      setCoverLetterTemplates(prev => [...prev, template]);
    }
  }, []);

  // Delete a template
  const deleteTemplate = useCallback((type: PromptType, templateId: string) => {
    if (type === "resume") {
      setResumeTemplates(prev => prev.filter(t => t.id !== templateId));
    } else if (type === "coverLetter") {
      setCoverLetterTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  }, []);

  // Update a template
  const updateTemplate = useCallback((type: PromptType, templateId: string, updatedTemplate: Partial<Template>) => {
    if (type === "resume") {
      setResumeTemplates(prev => 
        prev.map(t => t.id === templateId ? { ...t, ...updatedTemplate } : t)
      );
    } else if (type === "coverLetter") {
      setCoverLetterTemplates(prev => 
        prev.map(t => t.id === templateId ? { ...t, ...updatedTemplate } : t)
      );
    }
  }, []);

  // Add a custom prompt
  const addCustomPrompt = useCallback((prompt: CustomPrompt) => {
    setCustomPrompts(prev => [...prev, prompt]);
  }, []);

  // Update a custom prompt
  const updateCustomPrompt = useCallback((promptId: string, newPrompt: CustomPrompt) => {
    setCustomPrompts(prev => 
      prev.map(p => p.id === promptId ? newPrompt : p)
    );
  }, []);

  // Delete a custom prompt
  const deleteCustomPrompt = useCallback((promptId: string) => {
    setCustomPrompts(prev => prev.filter(p => p.id !== promptId));
  }, []);
  // Get the active prompt for a specific type
  const getActivePrompt = useCallback((type: PromptType): CustomPrompt => {
    if (!currentUser) {
      // For non-logged-in users, return default prompts
      return type === 'resume' ? DEFAULT_CUSTOM_PROMPTS[0] : DEFAULT_CUSTOM_PROMPTS[1];
    }
    
    const userKey = `user_${currentUser.uid}`;
    const savedActivePromptId = localStorage.getItem(`${userKey}_activePrompt_${type}`);
    if (savedActivePromptId) {
      const foundPrompt = customPrompts.find(p => p.id === savedActivePromptId && p.type === type);
      if (foundPrompt) return foundPrompt;
    }
    // Return default if no active prompt is set
    return customPrompts.find(p => p.type === type) || 
           (type === 'resume' ? DEFAULT_CUSTOM_PROMPTS[0] : DEFAULT_CUSTOM_PROMPTS[1]);
  }, [currentUser, customPrompts]);

  // Set the active prompt for a specific type
  const setActivePrompt = useCallback((type: PromptType, promptId: string) => {
    if (!currentUser) return; // Don't persist for non-logged-in users
    
    const userKey = `user_${currentUser.uid}`;
    localStorage.setItem(`${userKey}_activePrompt_${type}`, promptId);
  }, [currentUser]);  // Reset to default templates and clear storage
  const resetTemplates = useCallback(() => {
    setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
    setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
    setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
    
    if (currentUser) {
      const userKey = `user_${currentUser.uid}`;
      // Clear user's saved data with user-isolated keys
      localStorage.removeItem(`${userKey}_resumeTemplates`);
      localStorage.removeItem(`${userKey}_coverLetterTemplates`);
      localStorage.removeItem(`${userKey}_customPrompts`);
      localStorage.removeItem(`${userKey}_activePrompt_resume`);
      localStorage.removeItem(`${userKey}_activePrompt_coverLetter`);
      localStorage.removeItem(`${userKey}_selectedTemplateId`);
      localStorage.removeItem(`${userKey}_selectedCoverLetterTemplateId`);
      
      // Add back defaults to localStorage with user isolation
      localStorage.setItem(`${userKey}_resumeTemplates`, JSON.stringify(DEFAULT_RESUME_TEMPLATES));
      localStorage.setItem(`${userKey}_coverLetterTemplates`, JSON.stringify(DEFAULT_COVER_LETTER_TEMPLATES));
      localStorage.setItem(`${userKey}_customPrompts`, JSON.stringify(DEFAULT_CUSTOM_PROMPTS));
    }
    
    // Also clear any legacy non-user-isolated keys to clean up old data
    localStorage.removeItem("resumeTemplates");
    localStorage.removeItem("coverLetterTemplates");
    localStorage.removeItem("customPrompts");
    localStorage.removeItem("activePrompt_resume");
    localStorage.removeItem("activePrompt_coverLetter");
    localStorage.removeItem("selectedTemplateId");
    localStorage.removeItem("selectedCoverLetterTemplateId");
  }, [currentUser]);
  // Get recovery options for the user
  const getRecoveryOptions = useCallback(() => {
    if (!currentUser) return { hasBackups: false, backups: [], consistency: null };
    
    const consistency = checkDataConsistency(currentUser.uid);
    const backups = getAvailableBackups(currentUser.uid);
    
    return {
      hasBackups: backups.length > 0,
      backups,
      consistency
    };
  }, [currentUser]);
  // Manual data recovery
  const recoverFromBackup = useCallback((backupTimestamp: string) => {
    if (!currentUser) return false;
    
    try {
      const backups = getAvailableBackups(currentUser.uid);
      const backup = backups.find(b => b.timestamp === backupTimestamp);
      
      if (backup) {
        const success = restoreFromBackup(backup);
        if (success) {
          logBackupOperation('restore', true, currentUser.uid, { 
            backupTimestamp, 
            reason: 'manual_recovery' 
          });
          showUserFriendlyInfo(
            "Backup Restored",
            `Data successfully restored from backup created on ${new Date(backupTimestamp).toLocaleString()}`,
            "recovery"
          );
          // Reload the templates after recovery
          setTimeout(() => {
            loadFromLocalStorage();
            saveToFirebase();
          }, 500);
        } else {
          logBackupOperation('restore', false, currentUser.uid, { 
            backupTimestamp, 
            reason: 'manual_recovery_failed' 
          });
          showUserFriendlyError(
            "Recovery Failed",
            "Failed to restore data from the selected backup. Please try a different backup.",
            "recovery"
          );
        }
        return success;
      } else {
        logBackupOperation('restore', false, currentUser.uid, { 
          backupTimestamp, 
          reason: 'backup_not_found' 
        });
        showUserFriendlyError(
          "Backup Not Found",
          "The selected backup could not be found.",
          "recovery"
        );
      }
    } catch (error) {
      logBackupOperation('restore', false, currentUser.uid, { 
        backupTimestamp, 
        error: (error as Error).message 
      });
      showUserFriendlyError(
        "Recovery Error",
        "An error occurred while restoring the backup.",
        "recovery"
      );
    }
    return false;
  }, [currentUser, loadFromLocalStorage, saveToFirebase]);
  return {
    resumeTemplates,
    coverLetterTemplates,
    customPrompts,
    addTemplate,
    deleteTemplate,
    updateTemplate,
    addCustomPrompt,
    updateCustomPrompt,
    deleteCustomPrompt,
    getActivePrompt,
    setActivePrompt,
    resetTemplates,
    getRecoveryOptions,
    recoverFromBackup
  };
}
