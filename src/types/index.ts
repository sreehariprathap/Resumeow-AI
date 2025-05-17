export type PromptType = 'resume' | 'coverLetter';

export interface Template {
  id: string;
  name: string;
  content: string;
}

export interface PromptGeneratorOptions {
  jobDescription: string;
  resumeContent?: string;
  templateId: string; 
  showResumeInput: boolean;
  optionalInstructions?: string;
}
