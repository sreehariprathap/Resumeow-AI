// filepath: d:\create-prompt-extension\prompter\src\hooks\usePromptGenerator.ts
export function usePromptGenerator() {
  const generateResumePrompt = ({
    jobDescription,
    resumeContent,
    resumeTemplate,
    showResumeInput,
    optionalInstructions,
  }: {
    jobDescription: string;
    resumeContent?: string;
    resumeTemplate: string;
    showResumeInput: boolean;
    optionalInstructions?: string;
  }): string => {
    let prompt = resumeTemplate.trim();

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

  const generateCoverLetterPrompt = ({
    jobDescription,
    resumeContent,
    coverTemplate,
    showResumeInput,
    optionalInstructions,
  }: {
    jobDescription: string;
    resumeContent?: string;
    coverTemplate: string;
    showResumeInput: boolean;
    optionalInstructions?: string;
  }): string => {
    let prompt = coverTemplate.trim();

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

  return {
    generateResumePrompt,
    generateCoverLetterPrompt,
  };
}
