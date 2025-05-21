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
  
  // Function to save to localStorage
  const saveToLocalStorage = useCallback(() => {
    if (resumeTemplates.length > 0) {
      localStorage.setItem("resumeTemplates", JSON.stringify(resumeTemplates));
    }
    if (coverLetterTemplates.length > 0) {
      localStorage.setItem("coverLetterTemplates", JSON.stringify(coverLetterTemplates));
    }
    if (customPrompts.length > 0) {
      localStorage.setItem("customPrompts", JSON.stringify(customPrompts));
    }
  }, [resumeTemplates, coverLetterTemplates, customPrompts]);

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

  // Load data functions
  const loadResumeTemplatesFromLocalStorage = useCallback(() => {
    const savedResumeTemplates = localStorage.getItem("resumeTemplates");
    if (savedResumeTemplates) {
      setResumeTemplates(JSON.parse(savedResumeTemplates));
    } else {
      setResumeTemplates(DEFAULT_RESUME_TEMPLATES);
      localStorage.setItem("resumeTemplates", JSON.stringify(DEFAULT_RESUME_TEMPLATES));
    }
  }, []);

  const loadCoverLetterTemplatesFromLocalStorage = useCallback(() => {
    const savedCoverLetterTemplates = localStorage.getItem("coverLetterTemplates");
    if (savedCoverLetterTemplates) {
      setCoverLetterTemplates(JSON.parse(savedCoverLetterTemplates));
    } else {
      setCoverLetterTemplates(DEFAULT_COVER_LETTER_TEMPLATES);
      localStorage.setItem("coverLetterTemplates", JSON.stringify(DEFAULT_COVER_LETTER_TEMPLATES));
    }
  }, []);

  const loadCustomPromptsFromLocalStorage = useCallback(() => {
    const savedCustomPrompts = localStorage.getItem("customPrompts");
    if (savedCustomPrompts) {
      setCustomPrompts(JSON.parse(savedCustomPrompts));
    } else {
      setCustomPrompts(DEFAULT_CUSTOM_PROMPTS);
      localStorage.setItem("customPrompts", JSON.stringify(DEFAULT_CUSTOM_PROMPTS));
    }
  }, []);
  
  const loadFromLocalStorage = useCallback(() => {
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
  }, [loadResumeTemplatesFromLocalStorage, loadCoverLetterTemplatesFromLocalStorage, loadCustomPromptsFromLocalStorage]);

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
          }
        } else {
          // No user logged in, load from local storage
          loadFromLocalStorage();
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
    if (!initialLoadRef.current) return;
    
    // Save to localStorage first (always)
    saveToLocalStorage();
    
    // If user is logged in, save to Firebase with debounce
    if (currentUser) {
      const timer = setTimeout(() => {
        saveToFirebase();
      }, 500);
      return () => clearTimeout(timer);
    }
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
    const savedActivePromptId = localStorage.getItem(`activePrompt_${type}`);
    if (savedActivePromptId) {
      const foundPrompt = customPrompts.find(p => p.id === savedActivePromptId && p.type === type);
      if (foundPrompt) return foundPrompt;
    }
    // Return default if no active prompt is set
    return customPrompts.find(p => p.type === type) || 
           (type === 'resume' ? DEFAULT_CUSTOM_PROMPTS[0] : DEFAULT_CUSTOM_PROMPTS[1]);
  }, [customPrompts]);

  // Set the active prompt for a specific type
  const setActivePrompt = useCallback((type: PromptType, promptId: string) => {
    localStorage.setItem(`activePrompt_${type}`, promptId);
  }, []);

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
    setActivePrompt
  };
}
