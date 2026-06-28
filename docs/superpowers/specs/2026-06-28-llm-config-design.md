# LLM Config System — Design Spec
**Date:** 2026-06-28  
**Status:** Approved

---

## Problem

LLM model assignments are currently hardcoded as constants inside `useAIService.ts` and `aiProviderContext.tsx`. There is no single place to:
- Swap which model handles which task
- Tune per-task parameters (temperature, thinking, concurrency, maxTokens)
- Assign smaller/cheaper models to lightweight tasks and larger/thinking models to high-stakes tasks

This makes cost optimisation and model experimentation require grep-and-replace across multiple files.

---

## Goal

A single typed TypeScript config file (`src/config/llm.config.ts`) that is the one place a developer edits to control which model runs for each named task, with full optional per-task parameter overrides.

**Out of scope:** Mobile (`mobile/lib/ai.ts`) and extension (`extension/src/shared/gemini.ts`) — separate bundles with their own hardcoded models.

---

## Config File Shape

```ts
// src/config/llm.config.ts

interface LLMTaskConfig {
  model: string;
  provider: AIProvider;           // 'deepseek' | 'openrouter' | 'gemini'
  temperature?: number;           // 0–1
  thinking?: boolean;             // chain-of-thought (deepseek-v4-pro only)
  maxTokens?: number;
  concurrency?: number;
  systemPrompt?: string;
  fallbackModel?: string;         // model ID to try if primary fails
}

export const llmConfig: {
  defaults: Required<LLMTaskConfig>;
  tasks: Partial<Record<LLMTaskKey, Partial<LLMTaskConfig>>>;
}
```

A helper `getTaskConfig(task: LLMTaskKey): Required<LLMTaskConfig>` merges `defaults` with the task override (task wins on conflicts).

---

## Billing & Parameter Impact (comment in file)

Each parameter directly affects API cost and application behaviour:

| Parameter | Billing impact | App impact |
|---|---|---|
| `model` | Primary cost driver. Pro > Flash by ~10x. Thinking mode adds reasoning tokens on top. | Quality, latency |
| `provider` | DeepSeek cheapest. OpenRouter adds markup. Gemini Flash competitive for analysis. | Key routing |
| `temperature` | No direct cost impact. Higher = more varied output. | Output creativity |
| `thinking` | Significant cost increase — reasoning tokens billed separately and can be 2–5x the output. Only enable for highest-stakes tasks. | Quality for complex structured output |
| `maxTokens` | Caps output length — directly limits maximum charge per call. | Truncation risk if set too low |
| `concurrency` | Running N calls in parallel multiplies cost by N instantly. Keep at 1 unless batch operations require it. | Throughput vs spend |
| `systemPrompt` | Counts as input tokens on every call for that task. Keep short. | Behaviour steering |
| `fallbackModel` | Only billed if primary fails — usually a cheaper model. | Resilience |

---

## Task Map

| Task key | Call site | Proposed model | Notes |
|---|---|---|---|
| `resumeLatex` | `useAIService.generateResumeLatex` | deepseek-v4-pro | thinking: true — highest quality needed |
| `coverLetter` | `useAIService.generateCoverLetter` | deepseek-v4-pro | temperature: 0.7 for natural prose |
| `atsAnalysis` | `useAIService.analyzeATSScore` | deepseek-v4-flash | structured JSON, no thinking needed |
| `combinedATS` | `useAIService.performCombinedATSAnalysis` | deepseek-v4-flash | structured JSON |
| `extractJobDetails` | `useAIService.extractJobDetails` | deepseek-v4-flash | lightweight extraction |
| `jobFit` | `useAIService.analyzeJobFit` | deepseek-v4-flash | structured JSON |
| `resumeParse` | `resumeParser.parseResumeWithAI` | deepseek-v4-flash | lightweight extraction |
| `lazyPipelineJD` | `lazyModePipeline` JD analysis step | deepseek-v4-pro | complex structured output |
| `lazyPipelineLatex` | `lazyModePipeline` LaTeX gen step | deepseek-v4-pro | thinking: true |
| `resumeScore` | `ResumeScoringPage` | deepseek-v4-flash | analysis |
| `jdMatcher` | `JDMatcherPage` | deepseek-v4-flash | analysis + LaTeX gen uses resumeLatex config |
| `bioSummary` | `ExtrasStep` onboarding bio | deepseek-v4-flash | very lightweight |

---

## Wire-Up Plan

### 1. New file: `src/config/llm.config.ts`
- Exports `llmConfig` object and `LLMTaskKey` type
- Contains the billing comment block at the top

### 2. New helper: `src/lib/llmConfigResolver.ts`
- `getTaskConfig(task: LLMTaskKey): Required<LLMTaskConfig>` — merges defaults + task overrides
- `callForTask(task: LLMTaskKey, prompt: string, makeAICallWithModel, makeAICallWithThinking): Promise<string>` — resolves config and dispatches to correct provider function

### 3. Modify `useAIService.ts`
- Remove `DEEPSEEK_WRITING_MODEL`, `DEEPSEEK_ANALYSIS_MODEL` constants
- Remove `callForWriting`, `callForAnalysis` helpers
- Each named function calls `callForTask('resumeLatex', prompt, ...)` with its task key
- `generateResumeLatex` → task `resumeLatex`
- `generateCoverLetter` → task `coverLetter`
- `analyzeATSScore` → task `atsAnalysis`
- `performCombinedATSAnalysis` → task `combinedATS`
- `extractJobDetails` → task `extractJobDetails`
- `analyzeJobFit` → task `jobFit`

### 4. Modify call sites that pass `makeAICall` directly
- `resumeParser.ts` (`parseResumeWithAI`) — receives `makeAICall` param from caller; caller swaps to `callForTask('resumeParse', ...)`
- `resumeGenerator.ts` (`generateLatexResume`) — same pattern
- `lazyModePipeline.ts` — JD step uses `callForTask('lazyPipelineJD', ...)`, LaTeX step uses `callForTask('lazyPipelineLatex', ...)`
- `ResumeScoringPage.tsx` — swap `makeAICall` to `callForTask('resumeScore', ...)`
- `ExtrasStep.tsx` — swap `makeAICall` to `callForTask('bioSummary', ...)`
- `OnboardingWizard.tsx` — LaTeX gen uses `resumeLatex` task config
- `ResumeGeneratorPage.tsx` — LaTeX gen uses `resumeLatex` task config

### 5. `aiProviderContext.tsx`
- No changes to provider logic or key management
- `makeAICallWithModel` and `makeAICallWithThinking` stay as primitives; the config resolver calls them

---

## Error Handling

- If a task key is not found in `tasks`, `getTaskConfig` silently falls back to `defaults` — no crash
- If `thinking: true` is set but provider is not `deepseek`, `callForTask` warns in console and falls back to standard call
- `fallbackModel` in config maps to the existing fallback logic in `makeAICall` — no new fallback infrastructure needed

---

## Testing Considerations

- `getTaskConfig` is a pure function — unit testable with no mocks
- Existing AI service tests remain valid; the functions they test now resolve model via config, so changing `llmConfig` in tests lets you assert different behaviour

---

## Non-Goals

- No UI for editing the config — it is a developer file
- No runtime hot-reload — redeploy required for changes
- No mobile or extension changes
