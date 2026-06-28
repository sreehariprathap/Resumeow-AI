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
import { useTokens } from '@/lib/tokenContext';
import { toast } from 'sonner';
import { cleanLatexResponse } from '@/lib/latexUtils';
import { ensureKeySkillsSuggestion } from '@/lib/atsAnalysisUtils';

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

export interface ExtractedJobDetails {
  company: string;
  role: string;
  location: string;
  skills: string[]; // top 10 skills/keywords from JD
}

export interface JobFitRequirement {
  requirement: string;
  met: boolean;
  reason: string;
}

export interface JobFitResult {
  fitScore: number;
  label: 'Great Match' | 'Decent Match' | 'Tough Match' | 'Not a Fit';
  mandatoryRequirements: JobFitRequirement[];
  summary: string;
}

export function useAIService(opts?: { onInsufficientTokens?: () => void; skipTokenCheck?: boolean }) {
  const { makeAICall, makeAICallWithModel, makeAICallWithThinking, deepseekApiKey, openRouterApiKey, geminiApiKey, selectedModel, isUserApiKeyEnabled } = useAIProvider();
  const { assertSufficientBalance, deductTokens } = useTokens();

  const checkTokens = useCallback(async () => {
    if (opts?.skipTokenCheck) return;
    try {
      await assertSufficientBalance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INSUFFICIENT_TOKENS') {
        toast.error('You have no tokens left. Request more to continue using AI features.', {
          action: opts?.onInsufficientTokens
            ? { label: 'Request Tokens', onClick: opts.onInsufficientTokens }
            : undefined,
        });
        throw err;
      }
      throw err;
    }
  }, [assertSufficientBalance, opts]);

  // Deduct based on output character count: 1 token per 750 chars (min 1)
  // Fire-and-forget — a deduction failure never blocks the caller
  const bill = useCallback((outputChars: number) => {
    if (opts?.skipTokenCheck) return;
    void deductTokens(outputChars);
  }, [deductTokens, opts]);

  const DEEPSEEK_WRITING_MODEL = 'deepseek-v4-pro';
  const DEEPSEEK_ANALYSIS_MODEL = 'deepseek-v4-flash';

  // In managed mode the env key is always present — route to task-specific models directly
  const callForWriting = useCallback((prompt: string) => {
    if (!isUserApiKeyEnabled || deepseekApiKey) return makeAICallWithModel(prompt, DEEPSEEK_WRITING_MODEL);
    return makeAICall(prompt);
  }, [isUserApiKeyEnabled, deepseekApiKey, makeAICall, makeAICallWithModel]);

  const callForAnalysis = useCallback((prompt: string) => {
    if (!isUserApiKeyEnabled || deepseekApiKey) return makeAICallWithModel(prompt, DEEPSEEK_ANALYSIS_MODEL);
    return makeAICall(prompt);
  }, [isUserApiKeyEnabled, deepseekApiKey, makeAICall, makeAICallWithModel]);

  const hasAvailableProviders = useCallback(() => {
    // Managed mode: env key is always available
    if (!isUserApiKeyEnabled) return true;
    return !!(deepseekApiKey || openRouterApiKey || geminiApiKey);
  }, [isUserApiKeyEnabled, deepseekApiKey, openRouterApiKey, geminiApiKey]);

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
    await checkTokens();
    if (!hasAvailableProviders()) {
      const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      const response = await makeAICall(prompt);
      bill(response.length);
      return response;
    } catch (error) {
      handleAIError(error);
      throw error;
    }
  }, [makeAICall, hasAvailableProviders, checkTokens, bill]);

  // Writing tasks → deepseek-v4-pro; Analysis tasks → deepseek-v4-flash
  const truncatePrompt = (prompt: string, maxChars = 50000): string =>
    prompt.length > maxChars ? prompt.slice(0, maxChars) + '\n[Content truncated to fit API limits]' : prompt;

  const makeWritingCall = useCallback(async (prompt: string): Promise<string> => {
    await checkTokens();
    prompt = truncatePrompt(prompt);
    if (!hasAvailableProviders()) {
      const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      const response = await callForWriting(prompt);
      bill(response.length);
      return response;
    } catch (error) {
      handleAIError(error);
      throw error;
    }
  }, [callForWriting, hasAvailableProviders, checkTokens, bill]);

  const makeAnalysisCall = useCallback(async (prompt: string): Promise<string> => {
    await checkTokens();
    prompt = truncatePrompt(prompt);
    if (!hasAvailableProviders()) {
      const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    try {
      const response = await callForAnalysis(prompt);
      bill(response.length);
      return response;
    } catch (error) {
      handleAIError(error);
      throw error;
    }
  }, [callForAnalysis, hasAvailableProviders, checkTokens, bill]);

  // Generate LaTeX Resume — uses thinking mode (deepseek-v4-pro) for highest quality output
  const generateResumeLatex = useCallback(async (prompt: string): Promise<string> => {
    await checkTokens();
    const enhancedPrompt = `
${prompt}

Return only the complete LaTeX code that can be compiled. Include all necessary LaTeX packages and document structure.
Do not include explanations, just return the LaTeX code.
`;

    try {
      const response = await makeAICallWithThinking(truncatePrompt(enhancedPrompt));

      if (!response) {
        throw new Error('No response received from AI service');
      }

      bill(response.length);
      const cleanedLatex = cleanLatexResponse(response);
      toast.success('LaTeX resume generated successfully!');
      return cleanedLatex;
    } catch (error) {
      console.error('Error generating LaTeX resume:', error);
      throw error;
    }
  }, [makeWritingCall, makeAICallWithThinking, checkTokens, bill]);

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

      const cleanedContent = isLatex ? cleanLatexResponse(response) : response.trim();

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

        suggestionsWithSelection = ensureKeySkillsSuggestion(suggestionsWithSelection, jobDescription);

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

  // Extract company, role, location and top skills from a job description
  const extractJobDetails = useCallback(async (jobDescription: string): Promise<ExtractedJobDetails> => {
    const prompt = `Extract key details from this job description. Return ONLY valid JSON, no explanation.

JOB DESCRIPTION:
${jobDescription.slice(0, 8000)}

Return exactly this JSON shape:
{
  "company": "<company name or 'Unknown' if not found>",
  "role": "<job title>",
  "location": "<city/country or 'Remote' or 'Unknown'>",
  "skills": ["<skill1>", "<skill2>", "...up to 10 most important skills/technologies/certifications mentioned>"]
}`;

    const response = await makeAnalysisCall(prompt);
    const match = response.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    return JSON.parse(match[0]) as ExtractedJobDetails;
  }, [makeAnalysisCall]);

  // Analyze mandatory job requirements — certifications, languages, licenses, etc.
  const analyzeJobFit = useCallback(async (jobDescription: string, resumeContent: string): Promise<JobFitResult> => {
    const prompt = truncatePrompt(`You are a strict hiring gatekeeper. Analyze this job description for MANDATORY, non-negotiable requirements that would cause immediate rejection if missing. Then check the resume against each one.

Mandatory requirements include:
- Language requirements (bilingual, French/English, etc.)
- Specific certifications (CPA, CFA, PMP, Series 7, mutual fund license, etc.)
- Specific licenses or registrations
- Security clearances
- Minimum years of experience when explicitly stated as required
- Specific degrees when explicitly required (not preferred)
- Specific legal or regulatory requirements

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeContent}

Return ONLY valid JSON in this exact shape:
{
  "fitScore": <integer 0-100>,
  "label": "<one of: Great Match|Decent Match|Tough Match|Not a Fit>",
  "mandatoryRequirements": [
    {
      "requirement": "<exact requirement from job description>",
      "met": <true|false>,
      "reason": "<one sentence explanation>"
    }
  ],
  "summary": "<2 sentence plain-English verdict on whether the candidate should apply>"
}

Score guidelines (base on mandatory requirements only):
- 90-100: All mandatory requirements clearly met
- 60-89: Most met, one minor gap that could be addressed
- 30-59: Multiple unmet mandatory requirements
- 0-29: Critical deal-breaker requirement(s) missing — near-certain rejection

If the job description has NO explicit mandatory requirements beyond general experience, set fitScore to 75 and label to "Decent Match".
`);

    const response = await makeAnalysisCall(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid response from AI');
    return JSON.parse(jsonMatch[0]) as JobFitResult;
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
    makeAICall: makeAICallWithRetry,
    analyzeJobFit,
    extractJobDetails,
  };
}
