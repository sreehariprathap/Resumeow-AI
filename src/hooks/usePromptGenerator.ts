import type { PromptGeneratorOptions, Template, CustomPrompt, PromptType } from "@/types";
import { toast } from "sonner";

interface PromptGeneratorDeps {
  resumeTemplates: Template[];
  coverLetterTemplates: Template[];
  getActivePrompt: (type: PromptType) => CustomPrompt;
}

export function usePromptGenerator({ resumeTemplates, coverLetterTemplates, getActivePrompt }: PromptGeneratorDeps) {
  
  // Helper to find a template by ID and type
  const findTemplateById = (id: string, type: 'resume' | 'coverLetter'): Template | undefined => {
    if (type === 'resume') {
      return resumeTemplates.find(template => template.id === id);
    } else {
      return coverLetterTemplates.find(template => template.id === id);
    }
  };  // Generator function for resume prompts
  const generateResumePrompt = ({
    jobDescription,
    resumeContent,
    templateId,
    showResumeInput,
    optionalInstructions,
  }: PromptGeneratorOptions): string => {
    // Skip invalid template IDs
    if (!templateId || templateId === "no-selection") {
      toast.error("Please select a valid template.");
      return "Error: Please select a valid template.";
    }
    
    const template = findTemplateById(templateId, 'resume');
    if (!template) {
      toast.error("Template not found. Please select a valid template.");
      return "Error: Template not found. Please select a valid template.";
    }
    
    // Get the active custom prompt
    const customPrompt = getActivePrompt('resume');
    
    let prompt = customPrompt.content;
    
    // Replace placeholders
    if (customPrompt.placeholders.jobDescriptionPosition) {
      const escapedJobDescPosition = customPrompt.placeholders.jobDescriptionPosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedJobDescPosition, 'g'), 
        jobDescription.trim()
      );
    }
    
    if (showResumeInput && resumeContent && customPrompt.placeholders.resumePosition) {
      const escapedResumePosition = customPrompt.placeholders.resumePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedResumePosition, 'g'), 
        resumeContent.trim()
      );
    } else if (customPrompt.placeholders.resumePosition) {
      // Remove resume placeholder if no resume is provided
      const escapedResumePosition = customPrompt.placeholders.resumePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedResumePosition, 'g'), 
        ""
      );
    }
    
    // Add optional instructions if provided
    if (optionalInstructions && customPrompt.placeholders.optionalInstructionsPosition) {
      const escapedOptInstrPosition = customPrompt.placeholders.optionalInstructionsPosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedOptInstrPosition, 'g'),
        optionalInstructions.trim()
      );
    } else if (customPrompt.placeholders.optionalInstructionsPosition) {
      // Remove optional instructions placeholder if none provided
      const escapedOptInstrPosition = customPrompt.placeholders.optionalInstructionsPosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedOptInstrPosition, 'g'),
        ""
      );
    }
    
    return prompt;
  };  // Generator function for cover letter prompts
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
      toast.error("Please select a valid template.");
      return "Error: Please select a valid template.";
    }
    
    const template = findTemplateById(templateId, 'coverLetter');
    if (!template) {
      toast.error("Template not found. Please select a valid template.");
      return "Error: Template not found. Please select a valid template.";
    }
    
    // Get the active custom prompt
    const customPrompt = getActivePrompt('coverLetter');
    
    let prompt = customPrompt.content;
    
    // Replace placeholders
    if (customPrompt.placeholders.jobDescriptionPosition) {
      const escapedJobDescPosition = customPrompt.placeholders.jobDescriptionPosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedJobDescPosition, 'g'), 
        jobDescription.trim()
      );
    }
    
    if (showResumeInput && resumeContent && customPrompt.placeholders.resumePosition) {
      const escapedResumePosition = customPrompt.placeholders.resumePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedResumePosition, 'g'), 
        resumeContent.trim()
      );
    } else if (customPrompt.placeholders.resumePosition) {
      // Remove resume placeholder if no resume is provided
      const escapedResumePosition = customPrompt.placeholders.resumePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedResumePosition, 'g'), 
        ""
      );
    }
    
    // Add cover letter template if provided
    if (coverLetterTemplate && customPrompt.placeholders.coverLetterTemplatePosition) {
      const escapedCoverLetterTemplatePosition = customPrompt.placeholders.coverLetterTemplatePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedCoverLetterTemplatePosition, 'g'),
        coverLetterTemplate.trim()
      );
    } else if (template.coverLetterTemplate && customPrompt.placeholders.coverLetterTemplatePosition) {
      const escapedCoverLetterTemplatePosition = customPrompt.placeholders.coverLetterTemplatePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedCoverLetterTemplatePosition, 'g'),
        template.coverLetterTemplate.trim()
      );
    } else if (customPrompt.placeholders.coverLetterTemplatePosition) {
      // Remove cover letter template placeholder if none provided
      const escapedCoverLetterTemplatePosition = customPrompt.placeholders.coverLetterTemplatePosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedCoverLetterTemplatePosition, 'g'),
        ""
      );
    }
    
    // Add optional instructions if provided
    if (optionalInstructions && customPrompt.placeholders.optionalInstructionsPosition) {
      const escapedOptInstrPosition = customPrompt.placeholders.optionalInstructionsPosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedOptInstrPosition, 'g'),
        optionalInstructions.trim()
      );
    } else if (customPrompt.placeholders.optionalInstructionsPosition) {
      // Remove optional instructions placeholder if none provided
      const escapedOptInstrPosition = customPrompt.placeholders.optionalInstructionsPosition.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompt = prompt.replace(
        new RegExp(escapedOptInstrPosition, 'g'),
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
