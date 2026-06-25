/**
 * Unified AI Service Hook
 * 
 * This hook centralizes all AI LLM integrations across the application.
 * It provides a single interface for all AI generation calls with:
 * - Unified provider selection (OpenRouter/Gemini)
 * - Automatic retry logic with fallback providers
 * - Consistent error handling
 * - Toast notifications for failures
 */
import { useCallback } from 'react';
import { useAIProvider } from '@/lib/aiProviderContext';
import { toast } from 'sonner';

export interface ATSScore {
  overall: number;
  keywordMatch: number;
  skillsAlignment: number;
  experienceMatch: number;
  formatCompliance: number;
  feedback: string[];
  missingKeywords: string[];
  recommendations: string[];
}

export interface ATSSuggestion {
  id: string;
  category: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  selected: boolean;
}

export interface CombinedATSResult {
  atsScore: ATSScore;
  suggestions: ATSSuggestion[];
}

export function useAIService() {
  const { makeAICall, makeAICallWithModel, deepseekApiKey, openRouterApiKey, geminiApiKey, selectedModel } = useAIProvider();

  // Task-specific DeepSeek models — writing uses pro, analysis uses flash
  const DEEPSEEK_WRITING_MODEL = 'deepseek-v4-pro';
  const DEEPSEEK_ANALYSIS_MODEL = 'deepseek-v4-flash';

  // Route to a task-specific model when DeepSeek key is available, else fall back to user's selected model
  const callForWriting = useCallback((prompt: string) => {
    if (deepseekApiKey) return makeAICallWithModel(prompt, DEEPSEEK_WRITING_MODEL);
    return makeAICall(prompt);
  }, [deepseekApiKey, makeAICall, makeAICallWithModel]);

  const callForAnalysis = useCallback((prompt: string) => {
    if (deepseekApiKey) return makeAICallWithModel(prompt, DEEPSEEK_ANALYSIS_MODEL);
    return makeAICall(prompt);
  }, [deepseekApiKey, makeAICall, makeAICallWithModel]);

  const hasAvailableProviders = useCallback(() => {
    return !!(deepseekApiKey || openRouterApiKey || geminiApiKey);
  }, [deepseekApiKey, openRouterApiKey, geminiApiKey]);

  const handleAIError = (error: unknown) => {
    const msg = error instanceof Error ? error.message : 'Unknown AI service error';
    console.error('AI Service Error:', msg);
    if (msg.includes('API key')) {
      toast.error('API key issue. Please check your settings and try again.');
    } else if (msg.includes('Both AI providers failed')) {
      toast.error('All AI providers failed. Please try again later.');
    } else {
      toast.error('AI service temporarily unavailable. Please try again.');
    }
    throw error;
  };

  // Enhanced makeAICall with better error handling
  const makeAICallWithRetry = useCallback(async (prompt: string): Promise<string> => {
    if (!hasAvailableProviders()) {
      const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      return await makeAICall(prompt);
    } catch (error) {
      handleAIError(error);
      throw error;
    }
  }, [makeAICall, hasAvailableProviders]);

  // Writing tasks → deepseek-v4-pro; Analysis tasks → deepseek-v4-flash
  const makeWritingCall = useCallback(async (prompt: string): Promise<string> => {
    if (!hasAvailableProviders()) {
      const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      return await callForWriting(prompt);
    } catch (error) {
      handleAIError(error);
      throw error;
    }
  }, [callForWriting, hasAvailableProviders]);

  const makeAnalysisCall = useCallback(async (prompt: string): Promise<string> => {
    if (!hasAvailableProviders()) {
      const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      return await callForAnalysis(prompt);
    } catch (error) {
      handleAIError(error);
      throw error;
    }
  }, [callForAnalysis, hasAvailableProviders]);

  // Generate LaTeX Resume
  const generateResumeLatex = useCallback(async (prompt: string): Promise<string> => {
    const enhancedPrompt = `
${prompt}

Return only the complete LaTeX code that can be compiled. Include all necessary LaTeX packages and document structure.
Do not include explanations, just return the LaTeX code.
`;

    try {
      const response = await makeWritingCall(enhancedPrompt);
      
      if (!response) {
        throw new Error('No response received from AI service');
      }

      // Clean the response of any markdown formatting
      let cleanedLatex = response;
      cleanedLatex = cleanedLatex.replace(/^```(?:latex)?/m, '');
      cleanedLatex = cleanedLatex.replace(/```$/m, '');
      cleanedLatex = cleanedLatex.trim();

      toast.success('LaTeX resume generated successfully!');
      return cleanedLatex;
    } catch (error) {
      console.error('Error generating LaTeX resume:', error);
      throw error;
    }
  }, [makeWritingCall]);

  // Generate Cover Letter
  const generateCoverLetter = useCallback(async (prompt: string, isLatex: boolean = false): Promise<string> => {
    const enhancedPrompt = isLatex
      ? `${prompt}\n\nReturn only the complete LaTeX code that can be compiled. Include all necessary LaTeX packages and document structure. Do not include explanations, just return the LaTeX code.`
      : `${prompt}\n\nReturn a well-formatted professional cover letter. Do not include explanations, just return the cover letter content.`;

    try {
      const response = await makeWritingCall(enhancedPrompt);
      
      if (!response) {
        throw new Error('No response received from AI service');
      }

      // Clean the response of any markdown formatting
      let cleanedContent = response;
      if (isLatex) {
        cleanedContent = cleanedContent.replace(/^```(?:latex)?/m, '');
        cleanedContent = cleanedContent.replace(/```$/m, '');
      }
      cleanedContent = cleanedContent.trim();

      toast.success(`Cover letter ${isLatex ? 'LaTeX' : ''} generated successfully!`);
      return cleanedContent;
    } catch (error) {
      console.error('Error generating cover letter:', error);
      throw error;
    }
  }, [makeWritingCall]);

  // Analyze ATS Score
  const analyzeATSScore = useCallback(async (jobDescription: string, resumeContent: string): Promise<ATSScore> => {
    const prompt = `
Analyze this resume against the job description and provide an ATS (Applicant Tracking System) compatibility score.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeContent}

Please analyze and return a JSON response with the following structure:
{
  "overall": <number 0-100>,
  "keywordMatch": <number 0-100>,
  "skillsAlignment": <number 0-100>,
  "experienceMatch": <number 0-100>,
  "formatCompliance": <number 0-100>,
  "feedback": [<array of specific feedback points>],
  "missingKeywords": [<array of important keywords missing from resume>],
  "recommendations": [<array of actionable recommendations to improve ATS score>]
}

Consider:
- Keyword density and relevance
- Skills mentioned in job description vs resume
- Experience level and requirements match
- ATS-friendly formatting
- Industry-specific terminology
- Required qualifications coverage

Provide specific, actionable feedback. Return only valid JSON.
`;

    try {
      const response = await makeAnalysisCall(prompt);
      
      if (!response) {
        throw new Error('No response received from AI service');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const atsScore = JSON.parse(jsonMatch[0]);
        return atsScore;
      } else {
        throw new Error('Invalid JSON response from AI service');
      }
    } catch (error) {
      console.error('Error analyzing ATS score:', error);
      throw error;
    }
  }, [makeAnalysisCall]);

  // Combined ATS Analysis (Score + Suggestions)
  const performCombinedATSAnalysis = useCallback(async (jobDescription: string, resumeContent: string): Promise<CombinedATSResult> => {
    const prompt = `
Analyze this resume against the job description and provide both ATS (Applicant Tracking System) compatibility scoring AND specific improvement suggestions in a single comprehensive analysis.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeContent}

Please analyze and return a JSON response with the following structure:
{
  "atsScore": {
    "overall": <number 0-100>,
    "keywordMatch": <number 0-100>,
    "skillsAlignment": <number 0-100>,
    "experienceMatch": <number 0-100>,
    "formatCompliance": <number 0-100>,
    "feedback": [<array of specific feedback points>],
    "missingKeywords": [<array of important keywords missing from resume>],
    "recommendations": [<array of actionable recommendations to improve ATS score>]
  },
  "suggestions": [
    {
      "id": "<unique_id>",
      "category": "<category_name>",
      "suggestion": "<specific actionable suggestion>",
      "impact": "<high|medium|low>"
    }
  ]
}

FOR ATS SCORE ANALYSIS:
Consider:
- Keyword density and relevance
- Skills mentioned in job description vs resume
- Experience level and requirements match
- ATS-friendly formatting
- Industry-specific terminology
- Required qualifications coverage

Focus particularly on identifying ALL missing keywords from the job description that should be in the resume.

FOR SUGGESTIONS:
Categories should include:
- Keywords & Terminology
- Skills & Technologies  
- Experience Descriptions
- Formatting & Structure
- Industry Standards
- Qualifications & Certifications

Focus on:
1. Missing keywords from job description
2. Skills that should be emphasized or added (ALWAYS include a suggestion about incorporating key skills naturally)
3. Experience descriptions that could be improved
4. Format improvements for ATS scanning
5. Industry-specific terminology alignment
6. Qualification gaps that could be addressed

IMPORTANT: Always include at least one suggestion about adding key skills from the job description naturally throughout the resume.

Provide 5-10 actionable suggestions. Each suggestion should be specific and implementable. Return only valid JSON.
`;

    try {
      const response = await makeAnalysisCall(prompt);
      
      if (!response) {
        throw new Error('No response received from AI service');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
          // Process suggestions to ensure they have required fields
        let suggestionsWithSelection = result.suggestions.map((suggestion: Partial<ATSSuggestion>, index: number) => ({
          ...suggestion,
          id: suggestion.id || `suggestion-${index}`,
          selected: true // All suggestions are selected by default
        }));

        // Always ensure there's a suggestion about adding key skills naturally
        const hasKeySkillsSuggestion = suggestionsWithSelection.some((s: ATSSuggestion) => 
          s.suggestion.toLowerCase().includes('key skills') || 
          s.suggestion.toLowerCase().includes('essential skills') ||
          s.suggestion.toLowerCase().includes('incorporate') && s.suggestion.toLowerCase().includes('skills') ||
          (s.category.toLowerCase() === 'skills & technologies' && s.suggestion.toLowerCase().includes('add'))
        );

        if (!hasKeySkillsSuggestion) {
          // Extract some skills from job description for a more specific suggestion
          const skillKeywords = jobDescription.toLowerCase().match(/\b(?:python|javascript|react|node\.js|sql|aws|docker|kubernetes|git|agile|scrum|java|c\+\+|html|css|machine learning|data analysis|project management|leadership|communication|teamwork|problem solving|analytical|technical|programming|development|software|database|cloud|api|framework|library|testing|debugging|optimization)\b/gi) || [];
          const uniqueSkills = [...new Set(skillKeywords)].slice(0, 5);
          
          const skillsText = uniqueSkills.length > 0 
            ? `key skills (such as ${uniqueSkills.join(', ')}) ` 
            : 'key skills ';
          
          const keySkillsSuggestion: ATSSuggestion = {
            id: 'key-skills-natural',
            category: 'Skills & Technologies',
            suggestion: `Add all ${skillsText}from the job description naturally throughout your resume, particularly in the skills section, experience descriptions, and summary to improve keyword matching and ATS compatibility.`,
            impact: 'high' as const,
            selected: true
          };
          suggestionsWithSelection = [keySkillsSuggestion, ...suggestionsWithSelection];
        }

        return {
          atsScore: result.atsScore,
          suggestions: suggestionsWithSelection
        };
      } else {
        throw new Error('Invalid JSON response from AI service');
      }
    } catch (error) {
      console.error('Error performing combined ATS analysis:', error);
      throw error;
    }
  }, [makeAnalysisCall]);

  return {
    // Provider info
    selectedModel,
    hasAvailableProviders,
    
    // Core AI functions
    generateResumeLatex,
    generateCoverLetter,
    analyzeATSScore,
    performCombinedATSAnalysis,
    
    // Raw AI call if needed
    makeAICall: makeAICallWithRetry
  };
}
