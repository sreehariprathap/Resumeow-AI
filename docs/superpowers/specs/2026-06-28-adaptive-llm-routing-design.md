# Adaptive LLM Routing — Design Spec
**Date:** 2026-06-28
**Status:** Approved

---

## Problem

The current LLM routing system has two hard failures when a user switches from a DeepSeek key to an OpenRouter key:

1. `makeAICallWithModel` resolves provider by looking up the model ID in `AVAILABLE_MODELS`. Any model ID not in that list defaults silently to `provider: 'deepseek'` — breaking all calls when no DeepSeek key is present.
2. `makeAICallWithThinking` is hardcoded to DeepSeek's API. Thinking-capable tasks fail completely under any other provider.
3. `llm.config.ts` tasks hardcode `model` and `provider` — switching providers requires editing 12 task entries.

---

## Goal

A single `activeProvider` setting (deepseek / openrouter / gemini) that routes all 12 task calls through the correct provider and model automatically. Changing providers = one setting change. Nothing breaks.

**Out of scope (future spec):** Tier enforcement (free/pro/max caps on capability level).

---

## Architecture Overview

```
User sets activeProvider (deepseek | openrouter | gemini)
        ↓
llm.config.ts → task.capability ('flash' | 'pro' | 'thinking')
        ↓
llmConfigResolver.getTaskConfig(task, activeProvider)
  → providerCapabilityMap[activeProvider][capability] → modelId
        ↓
callForTask dispatches:
  deepseek + thinking  → makeAICallWithThinking (special API flag)
  other + thinking     → makeAICallWithModel(modelId, provider)
  any + flash/pro      → makeAICallWithModel(modelId, provider)
```

---

## Section 1: Config Shape (`src/config/llm.config.ts`)

### New: `providerCapabilityMap`

Developer-owned mapping of provider → capability → model ID. Edit this when you want to change which OpenRouter model handles `pro` tasks, etc.

```ts
providerCapabilityMap: {
  deepseek: {
    flash:    'deepseek-v4-flash',
    pro:      'deepseek-v4-pro',
    thinking: 'deepseek-v4-pro',   // uses extra_body thinking flag, not a different model
  },
  openrouter: {
    flash:    'google/gemini-2.0-flash-exp:free',
    pro:      'anthropic/claude-sonnet-4-5',
    thinking: 'anthropic/claude-3-7-sonnet:thinking',
  },
  gemini: {
    flash:    'gemini-2.0-flash',
    pro:      'gemini-1.5-pro',
    thinking: 'gemini-2.0-flash-thinking-exp',
  },
}
```

### Changed: Task entries

Tasks replace `model` + `provider` with a single `capability` field:

```ts
// Before
resumeLatex: { model: 'deepseek-v4-pro', provider: 'deepseek', thinking: true, maxTokens: 16384 }

// After
resumeLatex: { capability: 'thinking', maxTokens: 16384 }
```

All 12 task capability assignments:

| Task | Capability | Rationale |
|---|---|---|
| `resumeLatex` | `thinking` | Highest quality structured output |
| `coverLetter` | `pro` | Fluent prose, needs quality |
| `atsAnalysis` | `flash` | Structured JSON, Flash sufficient |
| `combinedATS` | `flash` | Structured JSON |
| `extractJobDetails` | `flash` | Lightweight extraction |
| `jobFit` | `flash` | Structured JSON |
| `resumeParse` | `flash` | Extraction |
| `lazyPipelineJD` | `pro` | Complex structured output |
| `lazyPipelineLatex` | `thinking` | Full LaTeX generation |
| `resumeScore` | `flash` | Analysis |
| `jdMatcher` | `flash` | Analysis |
| `bioSummary` | `flash` | Very lightweight |

### Changed: `LLMTaskConfig` type

```ts
export type LLMCapability = 'flash' | 'pro' | 'thinking';

export interface LLMTaskConfig {
  capability?: LLMCapability;   // replaces model + provider + thinking
  temperature?: number;
  maxTokens?: number;
  concurrency?: number;
  systemPrompt?: string;
  fallbackModel?: string;
}
```

`defaults.capability = 'flash'`. The `model`, `provider`, and `thinking` fields are removed from `LLMTaskConfig` — they are now derived from `providerCapabilityMap` at call time.

---

## Section 2: Active Provider (`src/lib/aiProviderContext.tsx`)

### New state: `activeProvider`

```ts
activeProvider: AIProvider   // 'deepseek' | 'openrouter' | 'gemini'
setActiveProvider: (p: AIProvider) => void
```

Persisted to Firebase (`activeProvider` field in `settings` doc) and `localStorage` (same pattern as the retired `userPreferredModel`).

### Auto-detection fallback (when no saved preference)

Priority order when the user has never explicitly set a provider:
1. DeepSeek key present → `deepseek`
2. OpenRouter key present → `openrouter`
3. Gemini key present → `gemini`
4. Managed mode (env key) → `deepseek`

### Retired

- `selectedModel` / `userPreferredModel` state — removed
- `setSelectedModel` / `setUserPreferredModel` — removed
- `AVAILABLE_MODELS` array — removed (no longer needed for routing)
- Firebase fields `selectedAIModel` / `userPreferredModel` — no longer written (backward-compatible reads can be ignored)

### Changed: `makeAICallWithModel`

Signature gains explicit `provider` parameter:

```ts
// Before
makeAICallWithModel(prompt: string, modelId: string): Promise<string>

// After
makeAICallWithModel(prompt: string, modelId: string, provider: AIProvider): Promise<string>
```

Internally constructs `AIModel = { id: modelId, name: modelId, provider }` and passes to `callAI`. The `AVAILABLE_MODELS.find()` lookup and the `provider: 'deepseek'` silent default are removed.

### Unchanged

- `makeAICallWithThinking` — stays DeepSeek-only (uses `extra_body: { thinking: { type: 'enabled' } }`)
- `makeAICall` — unchanged (uses `selectedModel`... wait — see note below)
- `callAI` internal function — unchanged
- All API key state and setters — unchanged
- Token deduction — unchanged
- Fallback logic in `makeAICall` — updated to use `activeProvider` instead of `selectedModel`

> **Note on `makeAICall`:** This is the generic user-model call used by `makeAICallWithRetry`. It currently uses `selectedModel`. After this change it uses `activeProvider` + `flash` capability to resolve the model. `makeAICall` becomes: resolve `providerCapabilityMap[activeProvider].flash` → call `callAI`.

---

## Section 3: Resolver (`src/lib/llmConfigResolver.ts`)

### Changed: `getTaskConfig`

```ts
// Before
getTaskConfig(task: LLMTaskKey): Required<LLMTaskConfig>

// After
getTaskConfig(task: LLMTaskKey, activeProvider: AIProvider): ResolvedTaskConfig
```

Where `ResolvedTaskConfig` is:
```ts
interface ResolvedTaskConfig {
  model: string;           // resolved from providerCapabilityMap
  provider: AIProvider;    // = activeProvider
  capability: LLMCapability;
  useThinkingAPI: boolean; // true only for deepseek + thinking
  temperature: number;
  maxTokens: number;
  concurrency: number;
  systemPrompt: string;
}
```

### Changed: `callForTask`

```ts
callForTask(
  task: LLMTaskKey,
  prompt: string,
  activeProvider: AIProvider,
  makeAICallWithModel: (prompt: string, modelId: string, provider: AIProvider) => Promise<string>,
  makeAICallWithThinking: (prompt: string) => Promise<string>
): Promise<string>
```

Dispatch logic:
```ts
const { model, useThinkingAPI } = getTaskConfig(task, activeProvider);
if (useThinkingAPI) return makeAICallWithThinking(prompt);
return makeAICallWithModel(prompt, model, activeProvider);
```

`useThinkingAPI` is `true` only when `activeProvider === 'deepseek'` and `capability === 'thinking'`.

---

## Section 4: `useAIService.ts`

`callForTaskBound` is updated to capture `activeProvider` from `useAIProvider()` and pass it into `resolveAndCall`:

```ts
const { makeAICallWithModel, makeAICallWithThinking, activeProvider } = useAIProvider();

const callForTaskBound = useCallback(async (task: LLMTaskKey, prompt: string) => {
  // ... token check, truncate, provider check ...
  return resolveAndCall(task, prompt, activeProvider, makeAICallWithModel, makeAICallWithThinking);
}, [makeAICallWithModel, makeAICallWithThinking, activeProvider, hasAvailableProviders, checkTokens, bill]);
```

No other changes to `useAIService.ts`.

---

## Section 5: Settings UI

### `AIProviderSelector.tsx` / `SettingsDialog.tsx`

**Remove:** Model dropdown (deepseek-v4-pro / deepseek-v4-flash / deepseek R1 via OpenRouter / Gemini 2.0 Flash).

**Add:** Provider selector — radio group or segmented control:
- DeepSeek (requires DeepSeek API key)
- OpenRouter (requires OpenRouter API key)
- Gemini (requires Gemini API key)

Selected provider is highlighted. If the key for the selected provider is not entered, show an inline warning.

**Add:** Capability model display (read-only, for transparency). Under the active provider, show:
```
Flash tasks:    google/gemini-2.0-flash-exp:free
Pro tasks:      anthropic/claude-sonnet-4-5
Thinking tasks: anthropic/claude-3-7-sonnet:thinking
```
These values are pulled from `providerCapabilityMap` in `llm.config.ts` — not editable in UI.

---

## Error Handling

- If `activeProvider` is set but its key is missing: `callForTaskBound` throws "No API key configured for [provider]. Add it in Settings." — same toast pattern as today.
- If `providerCapabilityMap` is missing an entry for `activeProvider` + `capability`: resolver throws at config load time (caught in dev, not silently swallowed).
- Fallback logic in `makeAICall` (generic call) updated: tries `activeProvider` first, then any other provider that has a key configured.

---

## Migration / Backward Compatibility

- Existing Firebase records with `selectedAIModel` / `userPreferredModel` are ignored on load (no crash, just not used).
- `activeProvider` defaults via auto-detection if no saved value — no user action required on first load.
- `AVAILABLE_MODELS` export is removed — if any component imports it, TypeScript will catch it at build time.

---

## Non-Goals

- Tier enforcement (free/pro/max capability caps) — future spec
- Per-task provider override (all tasks use the same `activeProvider`)
- UI for editing `providerCapabilityMap` — dev-only config file
- Mobile (`mobile/lib/ai.ts`) and extension (`extension/src/shared/gemini.ts`) — separate bundles, out of scope
