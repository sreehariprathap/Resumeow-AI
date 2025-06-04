import type { PromptType, Template, CustomPrompt } from "@/types";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/authContext";
import { saveUserData, getUserData } from "@/lib/firebaseWeb";

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
  const [resumeTemplates, setResumeTemplates] = useState<Template[]>([]);
  const [coverLetterTemplates, setCoverLetterTemplates] = useState<Template[]>([]);
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  
  // Use refs to track if initial data has been loaded
  const initialLoadRef = useRef(false);
  const prevUserRef = useRef<string | null>(null);
  const pendingSaveRef = useRef(false);
    // Function to save to localStorage with user isolation
  const saveToLocalStorage = useCallback(() => {
    if (!currentUser) return; // Only save to localStorage if user is logged in
    
    const userKey = `user_${currentUser.uid}`;
    if (resumeTemplates.length > 0) {
      localStorage.setItem(`${userKey}_resumeTemplates`, JSON.stringify(resumeTemplates));
    }
    if (coverLetterTemplates.length > 0) {
      localStorage.setItem(`${userKey}_coverLetterTemplates`, JSON.stringify(coverLetterTemplates));
    }
    if (customPrompts.length > 0) {
      localStorage.setItem(`${userKey}_customPrompts`, JSON.stringify(customPrompts));
    }
  }, [currentUser, resumeTemplates, coverLetterTemplates, customPrompts]);

  // Save to Firebase if user is logged in
  const saveToFirebase = useCallback(async () => {
    if (!currentUser || pendingSaveRef.current) return;
    
    pendingSaveRef.current = true;
    
    try {
      const templatesData = {
        resumeTemplates,
        coverLetterTemplates,
        customPrompts,
        updatedAt: new Date().toISOString()
      };
      
      await saveUserData(currentUser.uid, "templates", templatesData);
    } catch (error) {
      console.error("Error saving templates to Firebase:", error);
    } finally {
      pendingSaveRef.current = false;
    }
  }, [currentUser, resumeTemplates, coverLetterTemplates, customPrompts]);
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
          // Try to load from Firebase if user is logged in
          const userData = await getUserData(currentUser.uid, "templates");
          
          if (userData) {
            let shouldSaveToFirebase = false;
            
            // Load resume templates from Firebase
            if (userData.resumeTemplates) {
              setResumeTemplates(userData.resumeTemplates as Template[]);
            } else {
              loadResumeTemplatesFromLocalStorage();
              shouldSaveToFirebase = true;
            }
            
            // Load cover letter templates from Firebase
            if (userData.coverLetterTemplates) {
              setCoverLetterTemplates(userData.coverLetterTemplates as Template[]);
            } else {
              loadCoverLetterTemplatesFromLocalStorage();
              shouldSaveToFirebase = true;
            }
            
            // Load custom prompts from Firebase
            if (userData.customPrompts) {
              setCustomPrompts(userData.customPrompts as CustomPrompt[]);
            } else {
              loadCustomPromptsFromLocalStorage();
              shouldSaveToFirebase = true;
            }
            
            // If we loaded any data from localStorage, save it to Firebase
            if (shouldSaveToFirebase) {
              // Wait for state updates to be applied
              setTimeout(() => saveToFirebase(), 100);
            }
          } else {
            // First time Firebase user, load from local storage
            loadFromLocalStorage();
            
            // Save to Firebase after state updates
            setTimeout(() => saveToFirebase(), 100);
          }        } else {
          // No user logged in, load defaults only (no localStorage for anonymous users)
          setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
          setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
          setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
        }
      } catch (error) {
        console.error("Error loading templates:", error);
        // Fallback to local storage
        loadFromLocalStorage();
      }
    };

    loadTemplates();
  }, [currentUser, loadFromLocalStorage, loadResumeTemplatesFromLocalStorage, 
      loadCoverLetterTemplatesFromLocalStorage, loadCustomPromptsFromLocalStorage, saveToFirebase]);
  // Combined effect for saving changes
  useEffect(() => {
    // Skip the first render and only run this effect when initialLoadRef is true
    if (!initialLoadRef.current || !currentUser) return;
    
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
  }, [currentUser]);
  // Reset to default templates and clear storage
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

  return {
    resumeTemplates,
    coverLetterTemplates,
    customPrompts,
    addTemplate,
    deleteTemplate,
    addCustomPrompt,
    updateCustomPrompt,
    deleteCustomPrompt,
    getActivePrompt,
    setActivePrompt,
    resetTemplates
  };
}
