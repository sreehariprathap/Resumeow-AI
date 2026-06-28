/*
 * LLM Task Configuration
 *
 * BILLING & USAGE GUIDE — read before changing values:
 *
 *  model        – Primary cost driver. deepseek-v4-pro costs ~10x more per token than
 *                 deepseek-v4-flash. Only use Pro for tasks that require nuanced writing
 *                 or complex structured output.
 *
 *  provider     – DeepSeek is the cheapest direct provider. OpenRouter adds a markup on
 *                 top of the underlying model cost. Gemini Flash is competitively priced
 *                 for analysis tasks.
 *
 *  temperature  – No direct cost impact. Higher values (0.7–1.0) produce more varied,
 *                 creative output but less predictable JSON. Keep at 0 for JSON-only
 *                 tasks to reduce parse failures (and thus retry costs).
 *
 *  thinking     – Enables chain-of-thought reasoning on deepseek-v4-pro. Reasoning
 *                 tokens are billed separately and can be 2–5x the output token count.
 *                 Only enable for the highest-stakes generation tasks (LaTeX resume).
 *                 Has no effect and will warn if set on a non-deepseek provider.
 *
 *  maxTokens    – Caps output length. Directly limits the maximum charge per call.
 *                 Set conservatively for extraction tasks; leave higher for full
 *                 document generation. Too low risks truncated LaTeX that won't compile.
 *
 *  concurrency  – Max parallel calls for this task. Each parallel call is a separate
 *                 billed request — N concurrency = N× cost at that moment. Keep at 1
 *                 unless the task is explicitly batch-oriented.
 *
 *  systemPrompt – Injected as input tokens on every call for this task. Counts toward
 *                 input billing. Keep it short; long system prompts on high-frequency
 *                 tasks compound quickly.
 *
 *  fallbackModel – Only billed when the primary model fails. Typically a cheaper/faster
 *                  model. The existing provider fallback logic in aiProviderContext.tsx
 *                  handles the actual retry; this field feeds it the model ID to use.
 */

import type { AIProvider } from '@/lib/aiProviderContext';

export interface LLMTaskConfig {
  model: string;
  provider: AIProvider;
  temperature?: number;
  thinking?: boolean;
  maxTokens?: number;
  concurrency?: number;
  systemPrompt?: string;
  fallbackModel?: string;
}

export type LLMTaskKey =
  | 'resumeLatex'
  | 'coverLetter'
  | 'atsAnalysis'
  | 'combinedATS'
  | 'extractJobDetails'
  | 'jobFit'
  | 'resumeParse'
  | 'lazyPipelineJD'
  | 'lazyPipelineLatex'
  | 'resumeScore'
  | 'jdMatcher'
  | 'bioSummary';

export const llmConfig: {
  defaults: Required<LLMTaskConfig>;
  tasks: Partial<Record<LLMTaskKey, Partial<LLMTaskConfig>>>;
} = {
  defaults: {
    model: 'deepseek-v4-flash',
    provider: 'deepseek',
    temperature: 0.3,
    thinking: false,
    maxTokens: 8192,
    concurrency: 1,
    systemPrompt: '',
    fallbackModel: '',
  },

  tasks: {
    // Heavy writing — highest quality, thinking enabled. Most expensive task.
    resumeLatex: {
      model: 'deepseek-v4-pro',
      thinking: true,
      maxTokens: 16384,
    },

    // Writing — Pro model for fluent prose, higher temperature for natural tone.
    coverLetter: {
      model: 'deepseek-v4-pro',
      temperature: 0.7,
      maxTokens: 4096,
    },

    // Structured JSON extraction — Flash is sufficient, keep temperature low.
    atsAnalysis: {
      temperature: 0,
    },

    // Structured JSON — same as atsAnalysis.
    combinedATS: {
      temperature: 0,
    },

    // Lightweight extraction — Flash, minimal tokens needed.
    extractJobDetails: {
      temperature: 0,
      maxTokens: 1024,
    },

    // Structured JSON analysis.
    jobFit: {
      temperature: 0,
    },

    // Resume text → profile JSON extraction.
    resumeParse: {
      temperature: 0,
      maxTokens: 4096,
    },

    // Complex structured output — Pro for reliability on long JD analysis.
    lazyPipelineJD: {
      model: 'deepseek-v4-pro',
      temperature: 0,
      maxTokens: 8192,
    },

    // Full LaTeX generation inside pipeline — same as resumeLatex.
    lazyPipelineLatex: {
      model: 'deepseek-v4-pro',
      thinking: true,
      maxTokens: 16384,
    },

    // Resume scoring analysis — Flash sufficient.
    resumeScore: {
      temperature: 0,
    },

    // JD matching analysis — Flash for structured output.
    jdMatcher: {
      temperature: 0,
    },

    // Onboarding bio summary — very short output, Flash is fine.
    bioSummary: {
      maxTokens: 512,
    },
  },
};
