// filepath: d:\create-prompt-extension\prompter\src\hooks\usePromptGenerator.ts
// filepath: d:\create-prompt-extension\prompter\src\hooks\usePromptGenerator.ts
import type { PromptGeneratorOptions, PromptType, Template } from "@/types";
import { useTemplates } from "./useTemplates";

export function usePromptGenerator() {
  const { resumeTemplates, coverLetterTemplates } = useTemplates();
  
  // Helper to find a template by ID
  const findTemplateById = (type: PromptType, id: string): Template | undefined => {
    const templates = type === 'resume' ? resumeTemplates : coverLetterTemplates;
    return templates.find(template => template.id === id);
  };

  // Shared generator function for both resume and cover letter
  const generatePrompt = ({
    jobDescription,
    resumeContent,
    templateId,
    showResumeInput,
    optionalInstructions,
    promptType,
  }: PromptGeneratorOptions & { promptType: PromptType }): string => {
    const template = findTemplateById(promptType, templateId);
    
    if (!template) {
      return "Error: Template not found. Please select a valid template.";
    }
    
    let prompt = template.content.trim();

    // Replace placeholders in the template with actual content
    prompt = prompt.replace(/\{JOB_DESCRIPTION\}/gi, jobDescription.trim());

    // Only include resume content if showResumeInput is true and resumeContent is provided
    if (showResumeInput && resumeContent) {
      prompt = prompt.replace(/\{RESUME\}/gi, resumeContent.trim());
    } else {
      // Remove any {RESUME} placeholder if we're not showing resume input
      prompt = prompt.replace(/\{RESUME\}/gi, "");
    }

    // Add optional instructions if provided
    if (optionalInstructions && optionalInstructions.trim()) {
      prompt += `\n\nAdditional Instructions:\n${optionalInstructions.trim()}`;
    }

    return prompt;
  };

  // Specific functions that use the shared generator
  const generateResumePrompt = (options: PromptGeneratorOptions): string => {
    return generatePrompt({ ...options, promptType: 'resume' });
  };

  const generateCoverLetterPrompt = (options: PromptGeneratorOptions): string => {
    return generatePrompt({ ...options, promptType: 'coverLetter' });
  };

  return {
    generateResumePrompt,
    generateCoverLetterPrompt,
    generatePrompt,
  };
}
