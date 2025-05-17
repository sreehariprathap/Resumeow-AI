import type { PromptType, Template } from "@/types";
import { useEffect, useState } from "react";

// Default templates to show for first-time users
const DEFAULT_RESUME_TEMPLATES: Template[] = [
  {
    id: "default-resume-1",
    name: "Standard Resume Template",
    content: "Based on the following job description:\n\n{JOB_DESCRIPTION}\n\nPlease tailor my resume to highlight relevant skills and experience:\n\n{RESUME}"
  },
  {
    id: "default-resume-2",
    name: "ATS-Optimized Resume",
    content: "Using this job posting:\n\n{JOB_DESCRIPTION}\n\nRewrite my resume to be ATS-friendly while highlighting my most relevant qualifications:\n\n{RESUME}"
  }
];

const DEFAULT_COVER_LETTER_TEMPLATES: Template[] = [
  {
    id: "default-cover-1",
    name: "Professional Cover Letter",
    content: "Write a professional cover letter for this job description:\n\n{JOB_DESCRIPTION}\n\nBased on my resume:\n\n{RESUME}\n\nKeep it concise, formal, and highlight my most relevant experience."
  },
  {
    id: "default-cover-2",
    name: "Creative Cover Letter",
    content: "Create an engaging and unique cover letter for this position:\n\n{JOB_DESCRIPTION}\n\nUsing details from my background:\n\n{RESUME}\n\nMake it stand out while remaining professional."
  }
];

export function useTemplates() {
  const [resumeTemplates, setResumeTemplates] = useState<Template[]>(DEFAULT_RESUME_TEMPLATES);
  const [coverLetterTemplates, setCoverLetterTemplates] = useState<Template[]>(DEFAULT_COVER_LETTER_TEMPLATES);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load templates from localStorage on mount
  useEffect(() => {
    try {
      const resumeData = localStorage.getItem("resumeTemplates");
      const coverData = localStorage.getItem("coverLetterTemplates");

      if (resumeData) {
        const parsed = JSON.parse(resumeData);
        setResumeTemplates(Array.isArray(parsed) ? parsed : DEFAULT_RESUME_TEMPLATES);
      }
      
      if (coverData) {
        const parsed = JSON.parse(coverData);
        setCoverLetterTemplates(Array.isArray(parsed) ? parsed : DEFAULT_COVER_LETTER_TEMPLATES);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      // Fall back to defaults if there's an error
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save resume templates to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem("resumeTemplates", JSON.stringify(resumeTemplates));
      } catch (error) {
        console.error("Error saving resume templates:", error);
      }
    }
  }, [resumeTemplates, isInitialized]);

  // Save cover letter templates to localStorage whenever they change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem("coverLetterTemplates", JSON.stringify(coverLetterTemplates));
      } catch (error) {
        console.error("Error saving cover letter templates:", error);
      }
    }
  }, [coverLetterTemplates, isInitialized]);

  const addTemplate = (type: PromptType, template: Template) => {
    if (type === "resume") {
      setResumeTemplates((prev) => [...prev, template]);
    } else {
      setCoverLetterTemplates((prev) => [...prev, template]);
    }
  };
  const removeTemplate = (type: PromptType, templateId: string) => {
    if (type === "resume") {
      setResumeTemplates((prev) => prev.filter(t => t.id !== templateId));
    } else {
      setCoverLetterTemplates((prev) => prev.filter(t => t.id !== templateId));
    }
  };

  // Get the list of templates based on prompt type
  const getTemplates = (type: PromptType): Template[] => {
    return type === "resume" ? resumeTemplates : coverLetterTemplates;
  };

  // Get a specific template by ID
  const getTemplateById = (type: PromptType, id: string): Template | undefined => {
    return getTemplates(type).find(t => t.id === id);
  };

  return {
    resumeTemplates,
    coverLetterTemplates,
    addTemplate,
    removeTemplate,
    getTemplates,
    getTemplateById
  };
}
