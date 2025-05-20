import type { PromptGeneratorOptions, Template } from "@/types";
import { useTemplates } from "./useTemplates";

export function usePromptGenerator() {
  const { resumeTemplates, coverLetterTemplates, getActivePrompt } = useTemplates();
  
  // Helper to find a template by ID and type
  const findTemplateById = (id: string, type: 'resume' | 'coverLetter'): Template | undefined => {
    if (type === 'resume') {
      return resumeTemplates.find(template => template.id === id);
    } else {
      return coverLetterTemplates.find(template => template.id === id);
    }
  };
  
  // Generator function for resume prompts
  const generateResumePrompt = ({
    jobDescription,
    resumeContent,
    templateId,
    showResumeInput,
    optionalInstructions,
  }: PromptGeneratorOptions): string => {
    // Skip invalid template IDs
    if (!templateId || templateId === "no-selection") {
      return "Error: Please select a valid template.";
    }
    
    const template = findTemplateById(templateId, 'resume');
    if (!template) {
      return "Error: Template not found. Please select a valid template.";
    }
    
    // Get the active custom prompt
    const customPrompt = getActivePrompt('resume');
    
    let prompt = customPrompt.content;
    
    // Replace placeholders
    if (customPrompt.placeholders.jobDescriptionPosition) {
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.jobDescriptionPosition, 'g'), 
        jobDescription.trim()
      );
    }
    
    if (showResumeInput && resumeContent && customPrompt.placeholders.resumePosition) {
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.resumePosition, 'g'), 
        resumeContent.trim()
      );
    } else if (customPrompt.placeholders.resumePosition) {
      // Remove resume placeholder if no resume is provided
      prompt = prompt.replace(
        new RegExp(`\\n*[^{]*${customPrompt.placeholders.resumePosition}[^}]*\\n*`, 'g'), 
        ""
      );
    }
    
    // Add optional instructions if provided
    if (optionalInstructions && customPrompt.placeholders.optionalInstructionsPosition) {
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.optionalInstructionsPosition, 'g'),
        optionalInstructions.trim()
      );
    } else if (customPrompt.placeholders.optionalInstructionsPosition) {
      // Remove optional instructions placeholder if none provided
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.optionalInstructionsPosition, 'g'),
        ""
      );
    }
    
    return prompt;
  };

  // Generator function for cover letter prompts
  const generateCoverLetterPrompt = ({
    jobDescription,
    resumeContent,
    templateId,
    showResumeInput,
    optionalInstructions,
    coverLetterTemplate
  }: PromptGeneratorOptions): string => {
    // Skip invalid template IDs
    if (!templateId || templateId === "no-selection") {
      return "Error: Please select a valid template.";
    }
    
    const template = findTemplateById(templateId, 'coverLetter');
    if (!template) {
      return "Error: Template not found. Please select a valid template.";
    }
    
    // Get the active custom prompt
    const customPrompt = getActivePrompt('coverLetter');
    
    let prompt = customPrompt.content;
    
    // Replace placeholders
    if (customPrompt.placeholders.jobDescriptionPosition) {
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.jobDescriptionPosition, 'g'), 
        jobDescription.trim()
      );
    }
    
    if (showResumeInput && resumeContent && customPrompt.placeholders.resumePosition) {
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.resumePosition, 'g'), 
        resumeContent.trim()
      );
    } else if (customPrompt.placeholders.resumePosition) {
      // Remove resume placeholder if no resume is provided
      prompt = prompt.replace(
        new RegExp(`\\n*[^{]*${customPrompt.placeholders.resumePosition}[^}]*\\n*`, 'g'), 
        ""
      );
    }
    
    // Add cover letter template if provided
    if (coverLetterTemplate && customPrompt.placeholders.coverLetterTemplatePosition) {
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.coverLetterTemplatePosition, 'g'),
        coverLetterTemplate.trim()
      );
    } else if (template.coverLetterTemplate && customPrompt.placeholders.coverLetterTemplatePosition) {
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.coverLetterTemplatePosition, 'g'),
        template.coverLetterTemplate.trim()
      );
    } else if (customPrompt.placeholders.coverLetterTemplatePosition) {
      // Remove cover letter template placeholder if none provided
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.coverLetterTemplatePosition, 'g'),
        ""
      );
    }
    
    // Add optional instructions if provided
    if (optionalInstructions && customPrompt.placeholders.optionalInstructionsPosition) {
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.optionalInstructionsPosition, 'g'),
        optionalInstructions.trim()
      );
    } else if (customPrompt.placeholders.optionalInstructionsPosition) {
      // Remove optional instructions placeholder if none provided
      prompt = prompt.replace(
        new RegExp(customPrompt.placeholders.optionalInstructionsPosition, 'g'),
        ""
      );
    }
    
    return prompt;
  };

  return {
    generateResumePrompt,
    generateCoverLetterPrompt
  };
}
