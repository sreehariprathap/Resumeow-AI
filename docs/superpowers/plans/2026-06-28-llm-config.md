# LLM Config System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a single typed `llm.config.ts` that maps every AI task to its model, provider, and optional parameters (temperature, thinking, maxTokens, concurrency, systemPrompt, fallbackModel), replacing all hardcoded model constants scattered across the codebase.

**Architecture:** A pure config object (`src/config/llm.config.ts`) is read by a pure resolver (`src/lib/llmConfigResolver.ts`) that merges task overrides onto defaults and dispatches to the existing `makeAICallWithModel` / `makeAICallWithThinking` primitives in `aiProviderContext.tsx`. `useAIService.ts` exposes a bound `callForTask` so components and pages stop importing from `useAIProvider` directly.

**Tech Stack:** TypeScript, React hooks, existing OpenAI SDK wiring in `aiProviderContext.tsx`, Jest for unit tests.

## Global Constraints

- TypeScript strict mode — no `any` unless wrapping an untyped SDK call that already uses `any`
- No changes to `mobile/lib/ai.ts` or `extension/src/shared/gemini.ts` — out of scope
- No changes to `aiProviderContext.tsx` provider logic, key management, or token deduction
- `makeAICallWithModel` and `makeAICallWithThinking` remain the only low-level dispatch primitives
- All new files live in `src/config/` or `src/lib/`
- Test runner: `npx jest` (config at `jest.config.js`)

---

### Task 1: Create `llm.config.ts` and `llmConfigResolver.ts`

**Files:**
- Create: `src/config/llm.config.ts`
- Create: `src/lib/llmConfigResolver.ts`
- Create: `src/lib/__tests__/llmConfigResolver.test.ts`

**Interfaces:**
- Produces:
  - `LLMTaskKey` — union string literal type of all 12 task names
  - `LLMTaskConfig` — interface with `model`, `provider`, optional params
  - `llmConfig` — exported config object with `defaults` and `tasks`
  - `getTaskConfig(task: LLMTaskKey): Required<LLMTaskConfig>` — pure merge function
  - `callForTask(task: LLMTaskKey, prompt: string, makeAICallWithModel: (prompt: string, modelId: string) => Promise<string>, makeAICallWithThinking: (prompt: string) => Promise<string>): Promise<string>` — dispatch function

---

- [ ] **Step 1: Write the failing tests for `getTaskConfig`**

Create `src/lib/__tests__/llmConfigResolver.test.ts`:

```ts
import { getTaskConfig } from '../llmConfigResolver';
import { llmConfig } from '../../config/llm.config';

describe('getTaskConfig', () => {
  it('returns defaults for a task not in tasks map', () => {
    // Temporarily override tasks to empty for this test
    const original = { ...llmConfig.tasks };
    (llmConfig.tasks as Record<string, unknown>) = {};
    const config = getTaskConfig('resumeLatex');
    expect(config.model).toBe(llmConfig.defaults.model);
    expect(config.provider).toBe(llmConfig.defaults.provider);
    (llmConfig.tasks as Record<string, unknown>) = original;
  });

  it('merges task override onto defaults', () => {
    const config = getTaskConfig('resumeLatex');
    // resumeLatex is configured with deepseek-v4-pro and thinking: true
    expect(config.model).toBe('deepseek-v4-pro');
    expect(config.thinking).toBe(true);
    // concurrency not overridden — should equal defaults
    expect(config.concurrency).toBe(llmConfig.defaults.concurrency);
  });

  it('returns full Required<LLMTaskConfig> with no undefined fields', () => {
    const config = getTaskConfig('bioSummary');
    const requiredKeys: (keyof typeof config)[] = [
      'model', 'provider', 'temperature', 'thinking',
      'maxTokens', 'concurrency', 'systemPrompt', 'fallbackModel'
    ];
    for (const key of requiredKeys) {
      expect(config[key]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest src/lib/__tests__/llmConfigResolver.test.ts --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `src/config/llm.config.ts`**

```ts
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
```

- [ ] **Step 4: Create `src/lib/llmConfigResolver.ts`**

```ts
import { llmConfig, type LLMTaskKey, type LLMTaskConfig } from '@/config/llm.config';

export function getTaskConfig(task: LLMTaskKey): Required<LLMTaskConfig> {
  const override = llmConfig.tasks[task] ?? {};
  return { ...llmConfig.defaults, ...override };
}

export async function callForTask(
  task: LLMTaskKey,
  prompt: string,
  makeAICallWithModel: (prompt: string, modelId: string) => Promise<string>,
  makeAICallWithThinking: (prompt: string) => Promise<string>
): Promise<string> {
  const config = getTaskConfig(task);

  if (config.thinking) {
    if (config.provider !== 'deepseek') {
      console.warn(
        `[llmConfig] thinking:true set for task "${task}" but provider is "${config.provider}". ` +
        `Falling back to standard call — thinking is only supported on deepseek.`
      );
      return makeAICallWithModel(prompt, config.model);
    }
    return makeAICallWithThinking(prompt);
  }

  return makeAICallWithModel(prompt, config.model);
}
```

- [ ] **Step 5: Run tests — expect them to pass**

```bash
npx jest src/lib/__tests__/llmConfigResolver.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/config/llm.config.ts src/lib/llmConfigResolver.ts src/lib/__tests__/llmConfigResolver.test.ts
git commit -m "feat: add LLM task config and resolver"
```

---

### Task 2: Wire `useAIService.ts` to config

**Files:**
- Modify: `src/hooks/useAIService.ts`

**Interfaces:**
- Consumes: `callForTask` from `src/lib/llmConfigResolver.ts`, `LLMTaskKey` from `src/config/llm.config.ts`
- Produces (added to return value):
  - `callForTask(task: LLMTaskKey, prompt: string): Promise<string>` — bound version, token-checked, error-handled

---

- [ ] **Step 1: Open `src/hooks/useAIService.ts` and make the following changes**

Replace the import block at the top — add:
```ts
import { callForTask as resolveAndCall, type LLMTaskKey } from '@/lib/llmConfigResolver';
```

- [ ] **Step 2: Remove the two hardcoded model constants and the two `callFor*` helpers**

Delete these lines (lines 97–109):
```ts
const DEEPSEEK_WRITING_MODEL = 'deepseek-v4-pro';
const DEEPSEEK_ANALYSIS_MODEL = 'deepseek-v4-flash';

const callForWriting = useCallback((prompt: string) => {
  if (!isUserApiKeyEnabled || deepseekApiKey) return makeAICallWithModel(prompt, DEEPSEEK_WRITING_MODEL);
  return makeAICall(prompt);
}, [isUserApiKeyEnabled, deepseekApiKey, makeAICall, makeAICallWithModel]);

const callForAnalysis = useCallback((prompt: string) => {
  if (!isUserApiKeyEnabled || deepseekApiKey) return makeAICallWithModel(prompt, DEEPSEEK_ANALYSIS_MODEL);
  return makeAICall(prompt);
}, [isUserApiKeyEnabled, deepseekApiKey, makeAICall, makeAICallWithModel]);
```

- [ ] **Step 3: Add the bound `callForTask` hook function after `makeAnalysisCall`**

Insert after the `makeAnalysisCall` definition:

```ts
const callForTaskBound = useCallback(async (task: LLMTaskKey, prompt: string): Promise<string> => {
  await checkTokens();
  prompt = truncatePrompt(prompt);
  if (!hasAvailableProviders()) {
    const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    const response = await resolveAndCall(task, prompt, makeAICallWithModel, makeAICallWithThinking);
    bill(response.length, task);
    return response;
  } catch (error) {
    handleAIError(error);
    throw error;
  }
}, [makeAICallWithModel, makeAICallWithThinking, hasAvailableProviders, checkTokens, bill]);
```

- [ ] **Step 4: Replace `callForWriting` / `callForAnalysis` usages in named functions**

**`makeWritingCall`** — replace `callForWriting(prompt)` with `resolveAndCall('coverLetter', prompt, makeAICallWithModel, makeAICallWithThinking)`:

```ts
const makeWritingCall = useCallback(async (prompt: string): Promise<string> => {
  await checkTokens();
  prompt = truncatePrompt(prompt);
  if (!hasAvailableProviders()) {
    const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    const response = await resolveAndCall('coverLetter', prompt, makeAICallWithModel, makeAICallWithThinking);
    bill(response.length, 'writing');
    return response;
  } catch (error) {
    handleAIError(error);
    throw error;
  }
}, [makeAICallWithModel, makeAICallWithThinking, hasAvailableProviders, checkTokens, bill]);
```

**`makeAnalysisCall`** — replace `callForAnalysis(prompt)` with `resolveAndCall('atsAnalysis', ...)`:

```ts
const makeAnalysisCall = useCallback(async (prompt: string): Promise<string> => {
  await checkTokens();
  prompt = truncatePrompt(prompt);
  if (!hasAvailableProviders()) {
    const errorMessage = 'No AI providers available. Please configure API keys in Settings.';
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    const response = await resolveAndCall('atsAnalysis', prompt, makeAICallWithModel, makeAICallWithThinking);
    bill(response.length, 'analysis');
    return response;
  } catch (error) {
    handleAIError(error);
    throw error;
  }
}, [makeAICallWithModel, makeAICallWithThinking, hasAvailableProviders, checkTokens, bill]);
```

**`generateResumeLatex`** — replace `makeAICallWithThinking(...)` with `callForTaskBound('resumeLatex', ...)`:

```ts
const generateResumeLatex = useCallback(async (prompt: string): Promise<string> => {
  await checkTokens();
  const enhancedPrompt = `
${prompt}

Return only the complete LaTeX code that can be compiled. Include all necessary LaTeX packages and document structure.
Do not include explanations, just return the LaTeX code.
`;

  try {
    const response = await callForTaskBound('resumeLatex', truncatePrompt(enhancedPrompt));

    if (!response) {
      throw new Error('No response received from AI service');
    }

    bill(response.length, 'resume_latex');
    const cleanedLatex = cleanLatexResponse(response);
    toast.success('LaTeX resume generated successfully!');
    return cleanedLatex;
  } catch (error) {
    console.error('Error generating LaTeX resume:', error);
    throw error;
  }
}, [callForTaskBound, checkTokens, bill]);
```

**`analyzeATSScore`** — replace `makeAnalysisCall(prompt)` with `callForTaskBound('atsAnalysis', prompt)` (inside the existing function body — just change the one call site).

**`performCombinedATSAnalysis`** — replace `makeAnalysisCall(prompt)` with `callForTaskBound('combinedATS', prompt)`.

**`extractJobDetails`** — replace `makeAnalysisCall(prompt)` with `callForTaskBound('extractJobDetails', prompt)`.

**`analyzeJobFit`** — replace `makeAnalysisCall(prompt)` with `callForTaskBound('jobFit', prompt)`.

- [ ] **Step 5: Add `callForTask` to the return object**

In the `return { ... }` block at the bottom of the hook, add:

```ts
callForTask: callForTaskBound,
```

- [ ] **Step 6: Build check — confirm no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors. Fix any type errors before proceeding.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useAIService.ts
git commit -m "feat: wire useAIService named functions to llm.config task keys"
```

---

### Task 3: Update direct `makeAICall` callers in pages and components

These files currently import `makeAICall` from `useAIProvider` directly, bypassing `useAIService`. Switch them to `useAIService.callForTask`.

**Files:**
- Modify: `src/pages/ResumeScoringPage.tsx`
- Modify: `src/components/onboarding/steps/ExtrasStep.tsx`
- Modify: `src/components/OnboardingWizard.tsx`
- Modify: `src/pages/ResumeGeneratorPage.tsx`

**Interfaces:**
- Consumes: `callForTask(task: LLMTaskKey, prompt: string): Promise<string>` from `useAIService`
- Consumes: `LLMTaskKey` from `src/config/llm.config.ts`

---

- [ ] **Step 1: Update `ResumeScoringPage.tsx`**

Current (line 16, 125):
```ts
import { useAIProvider } from '@/lib/aiProviderContext';
// ...
const { makeAICall } = useAIProvider();
// ...
const raw = await makeAICall(prompt);
```

Replace with:
```ts
import { useAIService } from '@/hooks/useAIService';
// ...
const { callForTask } = useAIService();
// ...
const raw = await callForTask('resumeScore', prompt);
```

Remove the `useAIProvider` import if it's no longer used in that file after this change.

- [ ] **Step 2: Update `ExtrasStep.tsx`**

Current (line 52, 74):
```ts
const { makeAICall } = useAIProvider();
// ...
const summary = await makeAICall(prompt);
```

Replace with:
```ts
const { callForTask } = useAIService();
// ...
const summary = await callForTask('bioSummary', prompt);
```

Add import at top if not already present:
```ts
import { useAIService } from '@/hooks/useAIService';
```

- [ ] **Step 3: Update `OnboardingWizard.tsx`**

Current (line 55, 156):
```ts
const { makeAICall } = useAIProvider();
// ...
const latex = await generateLatexResume(profile as ResumeProfile, makeAICall, templateTex);
```

Replace with:
```ts
const { callForTask } = useAIService();
// ...
const latex = await generateLatexResume(
  profile as ResumeProfile,
  (prompt) => callForTask('resumeLatex', prompt),
  templateTex
);
```

Add import at top if not already present:
```ts
import { useAIService } from '@/hooks/useAIService';
```

- [ ] **Step 4: Update `ResumeGeneratorPage.tsx`**

Current (line 29, 101, 123):
```ts
const { makeAICall } = useAIProvider();
// ...
const newLatex = await generateLatexResume(profile, makeAICall, templateTex);
// ...
const parsedData = await parseResumeWithAI(text, makeAICall);
```

Replace with:
```ts
const { callForTask } = useAIService();
// ...
const newLatex = await generateLatexResume(
  profile,
  (prompt) => callForTask('resumeLatex', prompt),
  templateTex
);
// ...
const parsedData = await parseResumeWithAI(
  text,
  (prompt) => callForTask('resumeParse', prompt)
);
```

Add import at top:
```ts
import { useAIService } from '@/hooks/useAIService';
```

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ResumeScoringPage.tsx src/components/onboarding/steps/ExtrasStep.tsx src/components/OnboardingWizard.tsx src/pages/ResumeGeneratorPage.tsx
git commit -m "feat: replace direct makeAICall usages with config-driven callForTask"
```

---

### Task 4: Update `lazyModePipeline.ts` and its caller

The lazy mode pipeline is a standalone async function (not a hook), so it accepts `makeAICall` as a parameter. We need to pass task-specific callers from the hook site.

**Files:**
- Modify: `src/lib/lazyModePipeline.ts`
- Modify: `src/pages/LazyModePage.tsx`

**Interfaces:**
- Consumes: `callForTask(task: LLMTaskKey, prompt: string): Promise<string>` from `useAIService` (in `LazyModePage`)

---

- [ ] **Step 1: Update `lazyModePipeline.ts` function signature**

Current signature (line 109):
```ts
export const runLazyModePipeline = async (
  resumeProfile: ResumeProfile,
  settings: LazyModeSettings,
  makeAICall: (prompt: string) => Promise<string>,
  callbacks: PipelineCallbacks
): Promise<PipelineResult>
```

Replace with:
```ts
export const runLazyModePipeline = async (
  resumeProfile: ResumeProfile,
  settings: LazyModeSettings,
  makeAICallForJD: (prompt: string) => Promise<string>,
  makeAICallForLatex: (prompt: string) => Promise<string>,
  callbacks: PipelineCallbacks
): Promise<PipelineResult>
```

- [ ] **Step 2: Update the two `makeAICall` usages inside `runLazyModePipeline`**

Line 149 — JD analysis step:
```ts
const raw = await makeAICallForJD(analysisPrompt);
```

Line 179 — LaTeX generation step:
```ts
latex = await generateLatexResume(enhancedProfile, makeAICallForLatex);
```

- [ ] **Step 3: Update `LazyModePage.tsx` to pass task-specific callers**

Current (line 27, 76):
```ts
const { makeAICall } = useAIProvider();
// ...
makeAICall,
```

Replace with:
```ts
const { callForTask } = useAIService();
// ...
(prompt) => callForTask('lazyPipelineJD', prompt),
(prompt) => callForTask('lazyPipelineLatex', prompt),
```

Add import at top:
```ts
import { useAIService } from '@/hooks/useAIService';
```

Remove `useAIProvider` import if no longer used.

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Smoke test — confirm lazy mode pipeline call still compiles and the arg order matches**

Grep to verify the call site passes args in the right order:
```bash
grep -n "runLazyModePipeline" src/pages/LazyModePage.tsx
```

Expected: one call site with `makeAICallForJD` bound arg first, `makeAICallForLatex` second.

- [ ] **Step 6: Commit**

```bash
git add src/lib/lazyModePipeline.ts src/pages/LazyModePage.tsx
git commit -m "feat: split lazyModePipeline into per-task AI callers (JD vs LaTeX)"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `src/config/llm.config.ts` created with all 12 task keys and billing comment — Task 1
- ✅ `getTaskConfig` merges defaults + overrides — Task 1
- ✅ `callForTask` dispatches thinking vs standard — Task 1
- ✅ `useAIService` named functions use config — Task 2
- ✅ `callForTask` exposed from `useAIService` — Task 2
- ✅ `ResumeScoringPage` → `callForTask('resumeScore', ...)` — Task 3
- ✅ `ExtrasStep` → `callForTask('bioSummary', ...)` — Task 3
- ✅ `OnboardingWizard` → `callForTask('resumeLatex', ...)` — Task 3
- ✅ `ResumeGeneratorPage` → `callForTask('resumeLatex', ...)` and `callForTask('resumeParse', ...)` — Task 3
- ✅ `lazyModePipeline` JD step → `lazyPipelineJD`, LaTeX step → `lazyPipelineLatex` — Task 4
- ✅ Mobile and extension excluded — not in any task
- ✅ `aiProviderContext.tsx` unchanged — not modified in any task

**Type consistency:**
- `callForTask` in resolver: `(task: LLMTaskKey, prompt, makeAICallWithModel, makeAICallWithThinking)` — 4 args
- `callForTaskBound` in `useAIService`: `(task: LLMTaskKey, prompt)` — 2 args (model/thinking bound internally) ✅
- `LLMTaskKey` defined in `llm.config.ts`, imported in `llmConfigResolver.ts` and used in `useAIService.ts` ✅
- `generateLatexResume` signature unchanged — callers pass `(prompt) => callForTask(...)` lambda ✅
- `parseResumeWithAI` signature unchanged — same lambda pattern ✅
- `runLazyModePipeline` signature changed from 1 `makeAICall` to 2 (`makeAICallForJD`, `makeAICallForLatex`) — Task 4 caller updated to match ✅
