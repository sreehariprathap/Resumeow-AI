export type PromptType = 'resume' | 'coverLetter';

export interface Template {
  id: string;
  name: string;
  content?: string;
  resumeLatex?: string;
  coverLetterTemplate?: string;
}

export interface PromptGeneratorOptions {
  jobDescription: string;
  resumeContent: string;
  templateId: string; 
  showResumeInput: boolean;
  optionalInstructions?: string;
  coverLetterTemplate?: string;
}

export interface CustomPrompt {
  id: string;
  type: PromptType;
  name: string;
  content: string;
  placeholders: {
    resumePosition: string;
    jobDescriptionPosition: string;
    optionalInstructionsPosition?: string;
    coverLetterTemplatePosition?: string;
  };
}
