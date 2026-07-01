/*
 * LLM Task Configuration — Single Source of Truth
 *
 * HOW IT WORKS
 * ────────────
 * 1. Edit MODELS below to add/rename model IDs for any provider.
 * 2. Each task in `llmConfig.tasks` directly specifies the exact `model` + `provider`
 *    it should use. No global switch. No indirection. What you write here is what runs.
 *
 * MIXING PROVIDERS PER TASK
 * ─────────────────────────
 * You can freely mix providers per task:
 *
 *   resumeLatex:  { model: MODELS.gemini.flash, provider: 'gemini' }
 *   coverLetter:  { model: MODELS.deepseek.pro, provider: 'deepseek' }
 *   atsAnalysis:  { model: MODELS.gemini.flash, provider: 'gemini' }
 *
 * Server-side keys are set in .env:
 *   VITE_DEEPSEEK_API_KEY=...   ← used for any task with provider: 'deepseek'
 *   VITE_GEMINI_API_KEY=...     ← used for any task with provider: 'gemini'
 *   VITE_USE_USER_API_KEY=false ← managed mode (server keys); true = user provides keys
 *
 * FIELD REFERENCE
 * ───────────────
 *  model        – Actual API model ID string sent to the provider.
 *  provider     – Which provider handles this task ('deepseek' | 'gemini' | 'openrouter').
 *  temperature  – 0 for JSON tasks (deterministic), 0.7+ for creative writing.
 *  thinking     – Enables extended chain-of-thought on DeepSeek Pro or Gemini 2.5.
 *                 Reasoning tokens are billed separately (2–5× output token cost).
 *                 Only enable for the highest-stakes generation tasks.
 *  maxTokens    – Caps output length. Too low risks truncated LaTeX that won't compile.
 *  concurrency  – Max parallel calls for this task (rarely needs changing).
 *  systemPrompt – Injected as input tokens on every call. Keep short.
 */

import type { AIProvider } from '@/lib/aiProviderContext';

// ─── Model Registry ───────────────────────────────────────────────────────────
// All model IDs live here. Reference these in task configs below.
// Change a model ID here to upgrade/downgrade it everywhere at once.
export const MODELS = {
  gemini: {
    flash: 'gemini-3.5-flash',   // Fast, cost-effective — good for analysis & extraction
    pro:   'gemini-3.0-pro',     // Highest quality — use for complex writing & reasoning
  },
  deepseek: {
    flash: 'deepseek-v4-flash',  // Fast & cheap — equivalent to Gemini Flash tier
    pro:   'deepseek-v4-pro',    // Best DeepSeek quality — supports extended thinking
  },
  openrouter: {
    deepseekR1Free: 'deepseek/deepseek-r1:free',  // Free tier via OpenRouter
  },
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LLMTaskConfig {
  /** Actual model ID string sent to the provider's API. Use MODELS.* constants above. */
  model: string;
  /** Which provider handles this task. */
  provider: AIProvider;
  /** Sampling temperature. 0 = deterministic (JSON tasks), 0.7+ = creative (writing). */
  temperature?: number;
  /**
   * Enable extended chain-of-thought reasoning.
   * Supported on: deepseek-v4-pro (DeepSeek native thinking) and Gemini 2.5 models.
   * Reasoning tokens are billed at 2–5× regular output rate. Use sparingly.
   */
  thinking?: boolean;
  /** Max output tokens. Caps cost per call. Set conservatively for extraction tasks. */
  maxTokens?: number;
  /** Max parallel calls for this task. Each parallel call is a separate billed request. */
  concurrency?: number;
  /** System prompt injected on every call. Counts as input tokens — keep short. */
  systemPrompt?: string;
  /**
   * Per-tier model overrides. When a user's plan matches a key here, these fields
   * replace the task-level values for that call (shallow merge).
   *
   * Free tier:  task-level defaults apply — no tierOverrides needed.
   * Pro tier:   uses tierOverrides.pro if present, otherwise task-level defaults.
   * Admin tier: treated identically to pro unless tierOverrides.admin is set.
   *
   * Example:
   *   resumeLatex: {
   *     model: MODELS.gemini.flash,  // free
   *     provider: 'gemini',
   *     tierOverrides: {
   *       pro: { model: MODELS.deepseek.pro, provider: 'deepseek', thinking: true }
   *     }
   *   }
   *
   * See src/config/llm.config.md for the full configuration guide.
   */
  tierOverrides?: Partial<Record<'free' | 'pro' | 'admin', Partial<Omit<LLMTaskConfig, 'tierOverrides'>>>>;
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

// ─── Config ───────────────────────────────────────────────────────────────────

export const llmConfig: {
  defaults: Required<LLMTaskConfig>;
  tasks: Partial<Record<LLMTaskKey, Partial<LLMTaskConfig>>>;
} = {

  // Fallback values applied to any field not set by a task override.
  defaults: {
    model:        MODELS.gemini.flash,
    provider:     'gemini',
    temperature:  0.3,
    thinking:     false,
    maxTokens:    8192,
    concurrency:  1,
    systemPrompt: '',
  },

  tasks: {
    // ── Heavy generation ────────────────────────────────────────────────────
    // LaTeX resume — full document, highest quality + thinking enabled.
    resumeLatex: {
      model:     MODELS.gemini.flash,
      provider:  'gemini',
      thinking:  false,
      maxTokens: 16384,
    },

    // Cover letter — fluent prose, higher temperature for natural tone.
    coverLetter: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0.7,
      maxTokens:   4096,
    },

    // ── Structured JSON extraction ───────────────────────────────────────────
    // ATS score — JSON output, temperature 0 for deterministic parsing.
    atsAnalysis: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0,
    },

    // Combined ATS score + suggestions in one call.
    combinedATS: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0,
    },

    // Lightweight JD extraction — minimal tokens needed.
    extractJobDetails: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0,
      maxTokens:   1024,
    },

    // Job fit scoring — JSON, strict structured output.
    jobFit: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0,
    },

    // Resume text → profile JSON.
    resumeParse: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0,
      maxTokens:   4096,
    },

    // ── Lazy pipeline ────────────────────────────────────────────────────────
    // JD analysis step — structured, long context.
    lazyPipelineJD: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0,
      maxTokens:   8192,
    },

    // LaTeX generation step inside the lazy pipeline.
    lazyPipelineLatex: {
      model:     MODELS.gemini.flash,
      provider:  'gemini',
      thinking:  true,
      maxTokens: 16384,
    },

    // ── Analysis ─────────────────────────────────────────────────────────────
    resumeScore: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0,
    },

    jdMatcher: {
      model:       MODELS.gemini.flash,
      provider:    'gemini',
      temperature: 0,
    },

    // ── Short output ─────────────────────────────────────────────────────────
    bioSummary: {
      model:     MODELS.gemini.flash,
      provider:  'gemini',
      maxTokens: 512,
    },
  },
};
